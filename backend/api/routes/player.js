/**
 * Player routes — CRUD giocatori, stats, scadenze, move
 */
const express = require('express');

function createPlayerRouter({ supabase, authMiddleware, requirePermission }) {
  const router = express.Router();

  // GET /api/squadre/:squadraId/calciatori
  router.get('/api/squadre/:squadraId/calciatori', authMiddleware, async (req, res) => {
    try {
      const { data } = await supabase.from('team_player')
        .select('calciatore:player_id(*), numero_maglia, ruolo_preferito, stato')
        .eq('team_id', req.params.squadraId);
      res.json((data || []).map(r => ({
        id: r.calciatore.id, nome: r.calciatore.nome, cognome: r.calciatore.cognome,
        data_nascita: r.calciatore.data_nascita, telefono: r.calciatore.telefono,
        data_visita_medica: r.calciatore.data_visita_medica, scadenza_visita_medica: r.calciatore.scadenza_visita_medica,
        matricola_figc: r.calciatore.matricola_figc, tipo_documento: r.calciatore.tipo_documento,
        numero_documento: r.calciatore.numero_documento, rilasciato_da: r.calciatore.rilasciato_da,
        numero_maglia: r.numero_maglia, ruolo: r.ruolo_preferito, stato: r.stato
      })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/squadre/:squadraId/calciatori
  router.post('/api/squadre/:squadraId/calciatori', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
    try {
      const c = req.body;
      const toDate = (val) => val && val.trim() ? val.trim() : null;

      const { data: cal, error } = await supabase.from('player').insert({
        nome: c.nome, cognome: c.cognome, data_nascita: c.data_nascita, sesso: c.sesso || 'M',
        telefono: c.telefono || null, email: c.email || null, foto_url: c.foto_url || null,
        ruolo_principale: c.ruolo || c.ruolo_principale, piede_preferito: c.piede_preferito || null,
        altezza: c.altezza || null, peso: c.peso || null, note: c.note || null,
        luogo_nascita: c.luogo_nascita || null, nazionalita: c.nazionalita || null,
        residenza: c.residenza || null, matricola_figc: c.matricola_figc || null,
        tipo_documento: c.tipo_documento || null, numero_documento: c.numero_documento || null,
        rilasciato_da: c.rilasciato_da || null, data_visita_medica: toDate(c.data_visita_medica),
        scadenza_visita_medica: toDate(c.scadenza_visita_medica),
        tesserato_dal: toDate(c.tesserato_dal), tesserato_fino_al: toDate(c.tesserato_fino_al)
      }).select().single();
      if (error) return res.status(500).json({ error: error.message });

      await supabase.from('team_player').insert({
        team_id: req.params.squadraId, player_id: cal.id,
        numero_maglia: c.numero_maglia, ruolo_preferito: c.ruolo || c.ruolo_principale,
        stato: c.stato || 'Attivo', data_assegnazione: new Date().toISOString().split('T')[0]
      });

      res.status(201).json(cal);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/squadre/:squadraId/scadenze-mediche
  router.get('/api/squadre/:squadraId/scadenze-mediche', authMiddleware, async (req, res) => {
    try {
      const { data: rosa } = await supabase.from('team_player')
        .select('calciatore:player_id(id, nome, cognome, scadenza_visita_medica)')
        .eq('team_id', req.params.squadraId);

      const oggi = new Date();
      const scadenze = (rosa || [])
        .filter(r => r.calciatore?.scadenza_visita_medica)
        .map(r => {
          const scadenza = new Date(r.calciatore.scadenza_visita_medica);
          const giorni_rimanenti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
          return { id: r.calciatore.id, nome: r.calciatore.nome, cognome: r.calciatore.cognome, scadenza: r.calciatore.scadenza_visita_medica, giorni_rimanenti };
        })
        .filter(s => s.giorni_rimanenti <= 30)
        .sort((a, b) => a.giorni_rimanenti - b.giorni_rimanenti);

      res.json(scadenze);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/calciatori/:id
  router.get('/api/calciatori/:id', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabase.from('player').select('*').eq('id', req.params.id).single();
      if (error || !data) return res.status(404).json({ error: 'Giocatore non trovato' });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // PUT /api/calciatori/:id
  router.put('/api/calciatori/:id', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
    try {
      const c = req.body;
      const toDate = (val) => val && val.trim() ? val.trim() : null;

      const { data, error } = await supabase.from('player').update({
        nome: c.nome, cognome: c.cognome, data_nascita: c.data_nascita,
        telefono: c.telefono || null, email: c.email || null,
        ruolo_principale: c.ruolo || c.ruolo_principale || null,
        piede_preferito: c.piede_preferito || null, altezza: c.altezza || null, peso: c.peso || null,
        matricola_figc: c.matricola_figc || null, tipo_documento: c.tipo_documento || null,
        numero_documento: c.numero_documento || null, rilasciato_da: c.rilasciato_da || null,
        data_visita_medica: toDate(c.data_visita_medica), scadenza_visita_medica: toDate(c.scadenza_visita_medica),
        luogo_nascita: c.luogo_nascita || null, nazionalita: c.nazionalita || null,
        residenza: c.residenza || null, note: c.note || null
      }).eq('id', req.params.id).select().single();
      if (error) return res.status(400).json({ error: error.message });

      if (c.numero_maglia || c.ruolo || c.stato) {
        await supabase.from('team_player').update({
          numero_maglia: c.numero_maglia || null, ruolo_preferito: c.ruolo || null, stato: c.stato || null
        }).eq('player_id', req.params.id);
      }

      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/calciatori/:id/stats-current
  router.get('/api/calciatori/:id/stats-current', authMiddleware, async (req, res) => {
    try {
      const { data: rose } = await supabase.from('team_player').select('team_id').eq('player_id', req.params.id);
      if (!rose || rose.length === 0) return res.json({ gol: 0, assist: 0, presenze: 0, partite: 0 });
      const sqIds = rose.map(r => r.team_id);
      const { data: partite } = await supabase.from('match').select('id').in('team_id', sqIds).eq('stato', 'Terminata');
      if (!partite || partite.length === 0) return res.json({ gol: 0, assist: 0, presenze: 0, partite: 0 });
      const partitaIds = partite.map(p => p.id);
      const { data: eventi } = await supabase.from('match_event').select('tipo_evento').eq('player_id', req.params.id).in('match_id', partitaIds);
      const { data: convocazioni } = await supabase.from('convocation').select('presente').eq('player_id', req.params.id).in('match_id', partitaIds);
      res.json({ gol: (eventi || []).filter(e => e.tipo_evento === 'GOAL').length, assist: (eventi || []).filter(e => e.tipo_evento === 'ASSIST').length, presenze: (convocazioni || []).filter(c => c.presente).length, partite: partite.length });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // POST /api/calciatori/:id/move
  router.post('/api/calciatori/:id/move', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
    try {
      const { fromSquadraId, toSquadraId } = req.body;
      const { error } = await supabase.from('team_player').update({ team_id: toSquadraId }).eq('player_id', req.params.id).eq('team_id', fromSquadraId);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createPlayerRouter;
