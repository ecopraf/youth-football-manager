const express = require('express');

module.exports = function createNotificationRouter({ supabase, authMiddleware }) {
  const router = express.Router();

  // GET /api/notifications — lista notifiche per l'utente corrente
  router.get('/api/notifications', authMiddleware, async (req, res) => {
    try {
      const user = req.user;
      const wsId = user.workspace_id;
      if (!wsId) return res.json([]);

      // Filtro temporale (default 7 giorni)
      const days = parseInt(req.query.days) || 7;
      let query = supabase.from('notification').select('*')
        .eq('workspace_id', wsId)
        .order('created_at', { ascending: false });

      if (days > 0 && days < 9999) {
        const since = new Date(Date.now() - days * 86400000).toISOString();
        query = query.gte('created_at', since);
      }
      query = query.limit(100);

      const { data, error } = await query;
      if (error) return res.status(400).json({ error: error.message });

      // Admin e allenatore vedono tutte le notifiche del workspace
      const ruolo = user.ruolo;
      if (ruolo === 'admin' || ruolo === 'allenatore' || user.is_superadmin) {
        return res.json(data || []);
      }

      // Staff: filtra per destinatario_user_id o destinatario_profilo o created_by
      const profilo = user.permessi?.profilo || ruolo;
      const filtered = (data || []).filter(n => {
        if (n.created_by === user.id) return true;
        if (n.destinatario_user_id === user.id) return true;
        if (n.destinatario_profilo && (n.destinatario_profilo.includes(profilo) || n.destinatario_profilo.includes(ruolo))) return true;
        return false;
      });

      res.json(filtered);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/notifications/unread — conteggio non lette
  router.get('/api/notifications/unread', authMiddleware, async (req, res) => {
    try {
      const user = req.user;
      const wsId = user.workspace_id;
      if (!wsId) return res.json({ unread: 0 });

      const { data, error } = await supabase.from('notification').select('id, destinatario_user_id, destinatario_profilo, created_by')
        .eq('workspace_id', wsId)
        .eq('letto', false);
      if (error) return res.status(400).json({ error: error.message });

      const ruolo = user.ruolo;
      // Admin/allenatore: conta tutte le non lette
      if (ruolo === 'admin' || ruolo === 'allenatore' || user.is_superadmin) {
        return res.json({ unread: (data || []).length });
      }

      // Staff: filtra per destinatario (escludi created_by dal conteggio unread)
      const profilo = user.permessi?.profilo || ruolo;
      const count = (data || []).filter(n => {
        if (n.created_by === user.id) return false;
        if (n.destinatario_user_id === user.id) return true;
        if (n.destinatario_profilo && (n.destinatario_profilo.includes(profilo) || n.destinatario_profilo.includes(ruolo))) return true;
        return false;
      }).length;

      res.json({ unread: count });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // PUT /api/notifications/:id/read — segna come letta (staff)
  router.put('/api/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
      const { error } = await supabase.from('notification').update({ letto: true }).eq('id', req.params.id);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // PUT /api/notifications/guest-read — segna come lette per un guest token (batch)
  router.put('/api/notifications/guest-read', authMiddleware, async (req, res) => {
    try {
      const { ids, guest_token } = req.body;
      if (!ids || !ids.length || !guest_token) return res.status(400).json({ error: 'ids e guest_token richiesti' });

      // Per ogni notifica, merge guest_token nel campo letto_da
      const now = new Date().toISOString();
      const { error } = await supabase.rpc('notification_mark_read_guest', {
        p_ids: ids,
        p_token: guest_token,
        p_timestamp: now
      });

      // Fallback se la funzione RPC non esiste: update manuale
      if (error) {
        for (const id of ids.slice(0, 20)) {
          const { data: notif } = await supabase.from('notification').select('letto_da').eq('id', id).single();
          const lettoDa = notif?.letto_da || {};
          lettoDa[guest_token] = now;
          await supabase.from('notification').update({ letto_da: lettoDa }).eq('id', id);
        }
      }

      res.json({ success: true, marked: ids.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // PUT /api/notifications/read-all — segna tutte come lette
  router.put('/api/notifications/read-all', authMiddleware, async (req, res) => {
    try {
      const user = req.user;
      const wsId = user.workspace_id;
      const { error } = await supabase.from('notification').update({ letto: true })
        .eq('workspace_id', wsId).eq('letto', false);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/notifications/:id/receipts — conferme di lettura atleti
  router.get('/api/notifications/:id/receipts', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { data: notif, error } = await supabase.from('notification')
        .select('id, team_id, letto_da, destinatario_tipo, destinatario_player_id').eq('id', id).single();
      if (error || !notif) return res.status(404).json({ error: 'Notifica non trovata' });

      if (!notif.destinatario_tipo || !notif.destinatario_tipo.includes('atleta')) {
        return res.json({ receipts: [], total: 0, read: 0 });
      }

      const { data: team } = await supabase.from('team').select('category_id').eq('id', notif.team_id).single();
      const catId = team?.category_id;
      if (!catId) return res.json({ receipts: [], total: 0, read: 0 });

      let tokenQuery = supabase.from('guest_token')
        .select('token, player_id, player:player_id(nome, cognome)')
        .eq('tipo', 'atleta')
        .contains('squadre_accesso', [catId]);

      // Se la notifica ha un destinatario specifico, filtra solo quel player
      if (notif.destinatario_player_id) {
        tokenQuery = tokenQuery.eq('player_id', notif.destinatario_player_id);
      }

      const { data: tokens } = await tokenQuery;

      const lettoDa = notif.letto_da || {};
      const receipts = (tokens || []).map(t => ({
        player_id: t.player_id,
        nome: t.player?.nome || '',
        cognome: t.player?.cognome || '',
        letto: !!lettoDa[t.token],
        letto_at: lettoDa[t.token] || null
      }));

      // Ordina: non letti prima, poi per cognome
      receipts.sort((a, b) => {
        if (a.letto !== b.letto) return a.letto ? 1 : -1;
        return a.cognome.localeCompare(b.cognome);
      });

      res.json({
        receipts,
        total: receipts.length,
        read: receipts.filter(r => r.letto).length
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/notifications — crea comunicazione
  router.post('/api/notifications', authMiddleware, async (req, res) => {
    try {
      const { team_id, titolo, messaggio, priorita, destinatario_tipo } = req.body;
      if (!team_id || !titolo) return res.status(400).json({ error: 'team_id e titolo richiesti' });

      // Resolve workspace_id from team
      const { data: team } = await supabase.from('team').select('id, category_id, season:season_id(workspace_id)').eq('id', team_id).single();
      if (!team) return res.status(404).json({ error: 'Team non trovato' });
      const workspace_id = team.season?.workspace_id;

      const { data, error } = await supabase.from('notification').insert({
        workspace_id,
        team_id,
        tipo: 'avviso',
        titolo,
        messaggio: messaggio || null,
        priorita: priorita || 'info',
        destinatario_tipo: destinatario_tipo || [],
        destinatario_profilo: ['allenatore', 'admin'],
        created_by: (req.user.id && req.user.id !== 'superadmin') ? req.user.id : null,
        letto: false
      }).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.status(201).json({ success: true, notification: data });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/notifications/team/:teamId — notifiche per guest (filtrate per destinatario_tipo)
  router.get('/api/notifications/team/:teamId', authMiddleware, async (req, res) => {
    try {
      const { teamId } = req.params;
      const tipoFilter = req.query.destinatario_tipo; // 'atleta' o 'genitore'

      const { data, error } = await supabase.from('notification').select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) return res.status(400).json({ error: error.message });

      // Filtra per destinatario_tipo se specificato
      let filtered = data || [];
      if (tipoFilter) {
        filtered = filtered.filter(n => {
          if (!n.destinatario_tipo || n.destinatario_tipo.length === 0) return true;
          return n.destinatario_tipo.includes(tipoFilter);
        });
      }
      // Filtra per player_id: usa req.user.player_id (dal JWT guest) o query param
      const playerId = req.user.player_id || req.query.player_id;
      if (playerId) {
        filtered = filtered.filter(n => !n.destinatario_player_id || n.destinatario_player_id === playerId);
      }
      res.json(filtered);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // PUT /api/notifications/:id — modifica comunicazione
  router.put('/api/notifications/:id', authMiddleware, async (req, res) => {
    try {
      const { titolo, messaggio, priorita } = req.body;
      const update = {};
      if (titolo !== undefined) update.titolo = titolo;
      if (messaggio !== undefined) update.messaggio = messaggio;
      if (priorita !== undefined) update.priorita = priorita;
      if (Object.keys(update).length === 0) return res.status(400).json({ error: 'Nessun campo da aggiornare' });

      const { error } = await supabase.from('notification').update(update).eq('id', req.params.id);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // DELETE /api/notifications/:id — elimina singola comunicazione
  router.delete('/api/notifications/:id', authMiddleware, async (req, res) => {
    try {
      const { error } = await supabase.from('notification').delete().eq('id', req.params.id);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/notifications/reply — rispondi a un'assenza/indisponibilità (messaggio diretto all'atleta)
  router.post('/api/notifications/reply', authMiddleware, async (req, res) => {
    try {
      const { player_id, team_id, messaggio } = req.body;
      if (!player_id || !team_id || !messaggio) return res.status(400).json({ error: 'player_id, team_id e messaggio richiesti' });

      // Resolve workspace_id
      const { data: team } = await supabase.from('team').select('category_id, season:season_id(workspace_id)').eq('id', team_id).single();
      if (!team) return res.status(404).json({ error: 'Team non trovato' });
      const workspace_id = team.season?.workspace_id;

      // Nome mittente
      const user = req.user;
      const mittente = user.nome ? `${user.nome} ${user.cognome || ''}`.trim() : 'Staff';

      const { data, error } = await supabase.from('notification').insert({
        workspace_id,
        team_id,
        tipo: 'avviso',
        titolo: `💬 Messaggio da ${mittente}`,
        messaggio,
        priorita: 'info',
        destinatario_tipo: ['atleta'],
        destinatario_profilo: null,
        riferimento_id: player_id,
        created_by: (user.id && user.id !== 'superadmin') ? user.id : null,
        letto: false
      }).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.status(201).json({ success: true, notification: data });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // DELETE /api/notifications-batch — elimina multiple comunicazioni
  router.delete('/api/notifications-batch', authMiddleware, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !ids.length) return res.status(400).json({ error: 'ids richiesti' });
      const { error } = await supabase.from('notification').delete().in('id', ids);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, deleted: ids.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/notifications/sollecito-certificato — sollecito certificato medico
  router.post('/api/notifications/sollecito-certificato', authMiddleware, async (req, res) => {
    try {
      const { player_ids, team_id } = req.body;
      if (!player_ids?.length || !team_id) return res.status(400).json({ error: 'player_ids e team_id richiesti' });

      const { data: team } = await supabase.from('team').select('season:season_id(workspace_id)').eq('id', team_id).single();
      const workspace_id = team?.season?.workspace_id;

      const { data: players } = await supabase.from('player').select('id, nome, cognome, data_visita_medica').in('id', player_ids);

      const oggi = new Date();
      const notifs = (players || []).map(p => {
        const scadenza = p.data_visita_medica ? new Date(new Date(p.data_visita_medica).setFullYear(new Date(p.data_visita_medica).getFullYear() + 1)) : null;
        const scaduto = scadenza && scadenza < oggi;
        const dtLabel = scadenza ? scadenza.toLocaleDateString('it-IT') : null;
        const msg = scaduto
          ? `Il certificato medico risulta scaduto${dtLabel ? ' dal ' + dtLabel : ''}. Si prega di rinnovarlo al pi\u00f9 presto per poter continuare l'attivit\u00e0 sportiva.`
          : dtLabel
            ? `Il certificato medico scade il ${dtLabel}. Si prega di provvedere al rinnovo prima della scadenza.`
            : `Manca il certificato medico. Si prega di consegnarlo per poter svolgere l'attivit\u00e0 sportiva.`;
        return {
          workspace_id, team_id, tipo: 'avviso',
          titolo: '🏥 Certificato medico',
          messaggio: msg,
          destinatario_tipo: ['atleta', 'genitore'],
          destinatario_player_id: p.id,
          created_by: req.user.id, letto: false
        };
      });

      if (!notifs.length) return res.json({ success: true, created: 0 });
      const { error } = await supabase.from('notification').insert(notifs);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, created: notifs.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  return router;
};
