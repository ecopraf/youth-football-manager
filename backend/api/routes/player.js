/**
 * Player routes — CRUD giocatori, stats, scadenze, move
 */
const express = require('express');

function createPlayerRouter({ supabase, authMiddleware, requirePermission }) {
  const router = express.Router();

  // Normalizza nome: trim spazi multipli, prima lettera maiuscola ogni parola
  function normalizeName(str) {
    if (!str) return str;
    return str.trim().replace(/\s+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\b\w+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
  }

  // Valida anno nascita rispetto alla categoria del team
  async function validateBirthYear(dataNascita, teamId) {
    if (!dataNascita) return null; // non obbligatorio
    const year = parseInt(dataNascita.split('-')[0]);
    if (!year) return null;
    const { data: team } = await supabase.from('team').select('category:category_id(anno_da, anno_a, nome)').eq('id', teamId).single();
    if (!team?.category?.anno_da) return null;
    const annoDa = team.category.anno_da;
    // Il giocatore deve essere nato tra anno_da e anno_da+2 (margine aggregati)
    if (year < annoDa) {
      return `Anno di nascita ${year} non compatibile con ${team.category.nome} (anno rif. ${annoDa}+)`;
    }
    if (year > annoDa + 2) {
      return `Anno di nascita ${year} non compatibile con ${team.category.nome} (max ${annoDa + 2})`;
    }
    return null;
  }

  // GET /api/squadre/:squadraId/calciatori
  router.get('/api/squadre/:squadraId/calciatori', authMiddleware, async (req, res) => {
    try {
      const includiSvincolati = req.query.includi_svincolati === '1';
      let query = supabase.from('team_player')
        .select('calciatore:player_id(*), numero_maglia, ruolo_preferito, stato, aggregato')
        .eq('team_id', req.params.squadraId);
      if (!includiSvincolati) {
        query = query.neq('stato', 'Svincolato');
      }
      const { data } = await query;
      res.json((data || []).map(r => ({
        id: r.calciatore.id, nome: r.calciatore.nome, cognome: r.calciatore.cognome,
        data_nascita: r.calciatore.data_nascita, telefono: r.calciatore.telefono,
        data_visita_medica: r.calciatore.data_visita_medica, scadenza_visita_medica: r.calciatore.scadenza_visita_medica,
        matricola_figc: r.calciatore.matricola_figc, tipo_documento: r.calciatore.tipo_documento,
        numero_documento: r.calciatore.numero_documento, rilasciato_da: r.calciatore.rilasciato_da,
        numero_maglia: r.numero_maglia, ruolo: r.ruolo_preferito, stato: r.stato,
        aggregato: r.aggregato || false
      })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/squadre/:squadraId/calciatori
  router.post('/api/squadre/:squadraId/calciatori', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
    try {
      const c = req.body;
      c.nome = normalizeName(c.nome);
      c.cognome = normalizeName(c.cognome);
      const toDate = (val) => val && val.trim() ? val.trim() : null;

      // Validazione anno nascita
      const birthErr = await validateBirthYear(c.data_nascita, req.params.squadraId);
      if (birthErr) return res.status(400).json({ error: birthErr });

      const { data: cal, error } = await supabase.from('player').insert({
        nome: c.nome, cognome: c.cognome, data_nascita: c.data_nascita || null, sesso: c.sesso || 'M',
        telefono: c.telefono || null, email: c.email || null, foto_url: c.foto_url || null,
        ruolo_principale: c.ruolo || c.ruolo_principale || null, piede_preferito: c.piede_preferito || null,
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
      // Join team_player per numero_maglia e ruolo_preferito
      const squadraId = req.query.squadraId;
      if (squadraId) {
        const { data: tp } = await supabase.from('team_player').select('numero_maglia, ruolo_preferito, stato').eq('player_id', req.params.id).eq('team_id', squadraId).single();
        if (tp) { data.numero_maglia = tp.numero_maglia; data.ruolo = tp.ruolo_preferito; data.stato = tp.stato; }
      } else {
        const { data: tp } = await supabase.from('team_player').select('numero_maglia, ruolo_preferito, stato').eq('player_id', req.params.id).limit(1).single();
        if (tp) { data.numero_maglia = tp.numero_maglia; data.ruolo = tp.ruolo_preferito; data.stato = tp.stato; }
      }
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  // PUT /api/calciatori/:id
  router.put('/api/calciatori/:id', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
    try {
      const c = req.body;
      if (c.nome) c.nome = normalizeName(c.nome);
      if (c.cognome) c.cognome = normalizeName(c.cognome);
      const toDate = (val) => val && val.trim() ? val.trim() : null;

      // Validazione anno nascita se cambiata
      if (c.data_nascita) {
        const { data: tp } = await supabase.from('team_player').select('team_id').eq('player_id', req.params.id).limit(1).single();
        if (tp) {
          const birthErr = await validateBirthYear(c.data_nascita, tp.team_id);
          if (birthErr) return res.status(400).json({ error: birthErr });
        }
      }

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

      if (c.numero_maglia !== undefined || c.ruolo || c.stato) {
        await supabase.from('team_player').update({
          numero_maglia: c.numero_maglia != null ? c.numero_maglia : null,
          ruolo_preferito: c.ruolo || null,
          stato: c.stato || null
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

  // GET /api/squadre/:squadraId/svincolati-workspace
  // Trova tutti i player svincolati nel workspace che non sono già nel team corrente
  router.get('/api/squadre/:squadraId/svincolati-workspace', authMiddleware, async (req, res) => {
    try {
      // Trova il workspace del team corrente
      const { data: team } = await supabase.from('team').select('season:season_id(workspace_id)').eq('id', req.params.squadraId).single();
      if (!team) return res.status(404).json({ error: 'Squadra non trovata' });
      const workspaceId = team.season.workspace_id;

      // Tutti i team del workspace (tutte le stagioni)
      const { data: allSeasons } = await supabase.from('season').select('id').eq('workspace_id', workspaceId);
      const seasonIds = (allSeasons || []).map(s => s.id);
      const { data: allTeams } = await supabase.from('team').select('id').in('season_id', seasonIds);
      const teamIds = (allTeams || []).map(t => t.id);

      // Player svincolati in quei team
      const { data: svincolatiTp } = await supabase.from('team_player')
        .select('player_id, calciatore:player_id(id, nome, cognome, data_nascita), team:team_id(nome, category:category_id(nome)), stato')
        .in('team_id', teamIds)
        .eq('stato', 'Svincolato');

      // Player già nel team corrente (qualsiasi stato)
      const { data: currentTp } = await supabase.from('team_player').select('player_id').eq('team_id', req.params.squadraId);
      const currentPlayerIds = new Set((currentTp || []).map(tp => tp.player_id));

      // Filtra: solo quelli non già presenti nel team corrente
      const result = (svincolatiTp || [])
        .filter(tp => !currentPlayerIds.has(tp.player_id))
        .map(tp => ({
          id: tp.calciatore.id,
          nome: tp.calciatore.nome,
          cognome: tp.calciatore.cognome,
          data_nascita: tp.calciatore.data_nascita,
          ultima_squadra: tp.team?.category?.nome || tp.team?.nome || '-'
        }));

      // Deduplica per player_id
      const seen = new Set();
      const unique = result.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });

      res.json(unique);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/squadre/:squadraId/recupera
  router.post('/api/squadre/:squadraId/recupera', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
    try {
      const { playerIds } = req.body;
      if (!playerIds || !playerIds.length) return res.status(400).json({ error: 'Nessun giocatore selezionato' });

      // Validazione anno nascita per ogni giocatore
      for (const pid of playerIds) {
        const { data: player } = await supabase.from('player').select('data_nascita').eq('id', pid).single();
        if (player?.data_nascita) {
          const birthErr = await validateBirthYear(player.data_nascita, req.params.squadraId);
          if (birthErr) return res.status(400).json({ error: birthErr });
        }
      }

      // Crea nuovi team_player
      const inserts = playerIds.map(pid => ({
        team_id: req.params.squadraId,
        player_id: pid,
        stato: 'Attivo',
        data_assegnazione: new Date().toISOString().split('T')[0]
      }));
      const { error } = await supabase.from('team_player').insert(inserts);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, count: playerIds.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/squadre/:squadraId/aggrega
  // Aggrega giocatori da categorie inferiori a questa squadra
  router.post('/api/squadre/:squadraId/aggrega', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
    try {
      const { playerIds } = req.body;
      if (!playerIds || !playerIds.length) return res.status(400).json({ error: 'Nessun giocatore selezionato' });

      // Verifica categoria destinazione
      const { data: destTeam } = await supabase.from('team').select('category:category_id(anno_da, nome)').eq('id', req.params.squadraId).single();
      if (!destTeam?.category?.anno_da) return res.status(400).json({ error: 'Categoria destinazione non trovata' });

      // Validazione: il giocatore deve essere più giovane (anno nascita > anno_da della categoria)
      for (const pid of playerIds) {
        const { data: player } = await supabase.from('player').select('data_nascita, nome, cognome').eq('id', pid).single();
        if (!player?.data_nascita) continue;
        const year = parseInt(player.data_nascita.split('-')[0]);
        if (year <= destTeam.category.anno_da) {
          return res.status(400).json({ error: `${player.nome} ${player.cognome} (${year}) non pu\u00F2 essere aggregato a ${destTeam.category.nome} (${destTeam.category.anno_da}) - solo categorie superiori` });
        }
        // Verifica non sia gi\u00E0 nel team
        const { data: existing } = await supabase.from('team_player').select('id').eq('player_id', pid).eq('team_id', req.params.squadraId);
        if (existing && existing.length > 0) {
          return res.status(400).json({ error: `${player.nome} ${player.cognome} \u00E8 gi\u00E0 nella rosa` });
        }
      }

      // Crea team_player con aggregato=true, copiando ruolo dal team originale
      const inserts = [];
      for (const pid of playerIds) {
        const { data: origTp } = await supabase.from('team_player')
          .select('ruolo_preferito, numero_maglia')
          .eq('player_id', pid).eq('stato', 'Attivo').eq('aggregato', false).limit(1).single();
        inserts.push({
          team_id: req.params.squadraId,
          player_id: pid,
          stato: 'Attivo',
          aggregato: true,
          ruolo_preferito: origTp?.ruolo_preferito || null,
          numero_maglia: origTp?.numero_maglia || null,
          data_assegnazione: new Date().toISOString().split('T')[0]
        });
      }
      const { error } = await supabase.from('team_player').insert(inserts);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, count: playerIds.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/squadre/:squadraId/aggregabili
  // Lista giocatori del workspace che possono essere aggregati (pi\u00F9 giovani della categoria)
  router.get('/api/squadre/:squadraId/aggregabili', authMiddleware, async (req, res) => {
    try {
      const { data: destTeam } = await supabase.from('team')
        .select('category:category_id(anno_da, nome), season:season_id(id, workspace_id)')
        .eq('id', req.params.squadraId).single();
      if (!destTeam?.category?.anno_da) return res.json([]);

      // Tutti i team della stessa stagione
      const { data: sameSeasonTeams } = await supabase.from('team').select('id, category:category_id(nome)').eq('season_id', destTeam.season.id);
      const otherTeamIds = (sameSeasonTeams || []).filter(t => t.id !== req.params.squadraId).map(t => t.id);
      if (otherTeamIds.length === 0) return res.json([]);

      // Giocatori attivi in quei team
      const { data: candidates } = await supabase.from('team_player')
        .select('player_id, calciatore:player_id(id, nome, cognome, data_nascita), team:team_id(category:category_id(nome)), ruolo_preferito')
        .in('team_id', otherTeamIds)
        .eq('stato', 'Attivo')
        .eq('aggregato', false);

      // Gi\u00E0 nel team corrente
      const { data: currentTp } = await supabase.from('team_player').select('player_id').eq('team_id', req.params.squadraId);
      const currentIds = new Set((currentTp || []).map(tp => tp.player_id));

      // Filtra: solo pi\u00F9 giovani della categoria e non gi\u00E0 presenti
      const result = (candidates || [])
        .filter(tp => {
          if (currentIds.has(tp.player_id)) return false;
          if (!tp.calciatore?.data_nascita) return false;
          const year = parseInt(tp.calciatore.data_nascita.split('-')[0]);
          return year > destTeam.category.anno_da;
        })
        .map(tp => ({
          id: tp.calciatore.id,
          nome: tp.calciatore.nome,
          cognome: tp.calciatore.cognome,
          data_nascita: tp.calciatore.data_nascita,
          ruolo: tp.ruolo_preferito || '-',
          categoria_origine: tp.team?.category?.nome || '-'
        }));

      // Deduplica
      const seen = new Set();
      const unique = result.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
      res.json(unique);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/squadre/:squadraId/disaggrega
  // Rimuove giocatori aggregati dalla squadra (elimina il team_player con aggregato=true)
  router.post('/api/squadre/:squadraId/disaggrega', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
    try {
      const { playerIds } = req.body;
      if (!playerIds || !playerIds.length) return res.status(400).json({ error: 'Nessun giocatore selezionato' });
      const { error } = await supabase.from('team_player')
        .delete()
        .eq('team_id', req.params.squadraId)
        .eq('aggregato', true)
        .in('player_id', playerIds);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, count: playerIds.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/squadre/:squadraId/svincola
  router.post('/api/squadre/:squadraId/svincola', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
    try {
      const { playerIds } = req.body;
      if (!playerIds || !playerIds.length) return res.status(400).json({ error: 'Nessun giocatore selezionato' });
      const { error } = await supabase.from('team_player')
        .update({ stato: 'Svincolato' })
        .eq('team_id', req.params.squadraId)
        .in('player_id', playerIds);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, count: playerIds.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/squadre/:squadraId/riattiva
  router.post('/api/squadre/:squadraId/riattiva', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
    try {
      const { playerIds } = req.body;
      if (!playerIds || !playerIds.length) return res.status(400).json({ error: 'Nessun giocatore selezionato' });
      const { error } = await supabase.from('team_player')
        .update({ stato: 'Attivo' })
        .eq('team_id', req.params.squadraId)
        .in('player_id', playerIds);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, count: playerIds.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/squadre/:squadraId/calciatori/:id
  router.delete('/api/squadre/:squadraId/calciatori/:id', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
    try {
      const { squadraId, id } = req.params;
      // Rimuovi da team_player
      await supabase.from('team_player').delete().eq('player_id', id).eq('team_id', squadraId);
      // Se non è più in nessuna squadra, elimina il player
      const { data: remaining } = await supabase.from('team_player').select('id').eq('player_id', id);
      if (!remaining || remaining.length === 0) {
        await supabase.from('match_event').delete().eq('player_id', id);
        await supabase.from('convocation').delete().eq('player_id', id);
        await supabase.from('valutazione_partita').delete().eq('calciatore_id', id);
        await supabase.from('player').delete().eq('id', id);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/calciatori/:id/move
  router.post('/api/calciatori/:id/move', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
    try {
      const { fromSquadraId, toSquadraId } = req.body;
      // Validazione anno nascita rispetto alla categoria di destinazione
      const { data: player } = await supabase.from('player').select('data_nascita').eq('id', req.params.id).single();
      if (player?.data_nascita) {
        const birthErr = await validateBirthYear(player.data_nascita, toSquadraId);
        if (birthErr) return res.status(400).json({ error: birthErr });
      }
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
