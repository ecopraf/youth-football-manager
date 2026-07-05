/**
 * Match Routes - partite CRUD, archivia/sblocca, convocazioni, formazione, eventi, distinta
 */
const express = require('express');
const { coreTeamName } = require('../helpers/importUtils');

module.exports = function createMatchRouter({ supabase, authMiddleware, requirePermission }) {
  const router = express.Router();

  // ── PARTITE CRUD ──
  router.get('/api/squadre/:squadraId/partite', authMiddleware, async (req, res) => {
    try {
      const { data } = await supabase.from('match').select('*, competition:competition_id(id, nome)').eq('team_id', req.params.squadraId).order('data_ora', { ascending: false });
      const result = (data || []).map(m => ({ ...m, competizione: m.competition?.nome || null }));
      res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/api/squadre/:squadraId/partite-future', authMiddleware, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const { data } = await supabase.from('match').select('*, competition:competition_id(id, nome)').eq('team_id', req.params.squadraId).gte('data_ora', now).order('data_ora', { ascending: true }).limit(5);
      const result = (data || []).map(m => ({ ...m, competizione: m.competition?.nome || null }));
      res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/api/squadre/:squadraId/partite', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
    try {
      const p = req.body;
      let competition_id = null;
      if (p.competizione) {
        const { data: comp } = await supabase.from('competition').select('id').ilike('nome', '%' + p.competizione + '%').limit(1).single();
        if (comp) competition_id = comp.id;
      }
      const { data } = await supabase.from('match').insert({ team_id: req.params.squadraId, data_ora: p.dataOra, avversario: p.avversario, luogo: p.luogo, competition_id, giornata: p.giornata }).select().single();
      res.status(201).json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/api/partite/:id', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
    try {
      const p = req.body;
      let competition_id = undefined;
      if (p.competizione) {
        const { data: comp } = await supabase.from('competition').select('id').ilike('nome', '%' + p.competizione + '%').limit(1).single();
        competition_id = comp ? comp.id : null;
      }
      const updateData = { data_ora: p.dataOra, avversario: p.avversario, luogo: p.luogo, giornata: p.giornata };
      if (competition_id !== undefined) updateData.competition_id = competition_id;
      if (p.noteAvversario !== undefined) updateData.note_avversario = p.noteAvversario;
      if (p.golCasa !== undefined) updateData.gol_casa = p.golCasa;
      if (p.golOspite !== undefined) updateData.gol_ospite = p.golOspite;
      if (p.stato !== undefined) updateData.stato = p.stato;
      await supabase.from('match').update(updateData).eq('id', req.params.id);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/api/partite/:id', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
    try {
      await supabase.from('match_event').delete().eq('match_id', req.params.id);
      await supabase.from('match_formation').delete().eq('match_id', req.params.id);
      await supabase.from('match_statistics').delete().eq('match_id', req.params.id);
      await supabase.from('convocation').delete().eq('match_id', req.params.id);
      await supabase.from('match').delete().eq('id', req.params.id);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/api/squadre/:squadraId/partite-all', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
    try {
      const { data: partite } = await supabase.from('match').select('id').eq('team_id', req.params.squadraId);
      const ids = (partite || []).map(p => p.id);
      if (ids.length > 0) {
        await supabase.from('match_event').delete().in('match_id', ids);
        await supabase.from('match_formation').delete().in('match_id', ids);
        await supabase.from('match_statistics').delete().in('match_id', ids);
        await supabase.from('convocation').delete().in('match_id', ids);
        await supabase.from('match').delete().in('id', ids);
      }
      res.json({ success: true, eliminate: ids.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── ARCHIVIA / SBLOCCA ──
  router.put('/api/partite/:id/archivia', authMiddleware, async (req, res) => {
    try {
      const { error } = await supabase.from('match').update({ archiviata: true }).eq('id', req.params.id);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/api/partite/:id/sblocca', authMiddleware, async (req, res) => {
    try {
      const { error } = await supabase.from('match').update({ archiviata: false }).eq('id', req.params.id);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── CONVOCAZIONI ──
  router.get('/api/partite/:matchId/convocazioni', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabase.from('convocation').select('*, team_player:team_player_id(player_id)').eq('match_id', req.params.matchId);
      if (error) return res.status(400).json({ error: error.message });
      const result = (data || []).map(c => ({ ...c, calciatoreId: c.team_player?.player_id || c.team_player_id }));
      res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/api/squadre/:squadraId/partite/:matchId/convocati', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabase.from('convocation').select('*, team_player:team_player_id(player_id)').eq('match_id', req.params.matchId).eq('presente', true);
      if (error) return res.status(400).json({ error: error.message });
      const result = (data || []).map(c => ({ ...c, calciatoreId: c.team_player?.player_id || c.team_player_id }));
      res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/api/partite/:matchId/convocazioni', authMiddleware, requirePermission('formazione', 'write'), async (req, res) => {
    try {
      const { calciatoreId, presente } = req.body;
      const { data: tp } = await supabase.from('team_player').select('id').eq('player_id', calciatoreId).limit(1).single();
      if (!tp) return res.status(400).json({ error: 'Giocatore non trovato nella rosa' });
      const { data: existing } = await supabase.from('convocation').select('id').eq('match_id', req.params.matchId).eq('team_player_id', tp.id).single();
      if (existing) {
        const { data, error } = await supabase.from('convocation').update({ presente }).eq('id', existing.id).select().single();
        if (error) return res.status(400).json({ error: error.message });
        res.json(data);
      } else {
        const { data, error } = await supabase.from('convocation').insert({ match_id: req.params.matchId, team_player_id: tp.id, presente }).select().single();
        if (error) return res.status(400).json({ error: error.message });
        res.json(data);
      }
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/api/partite/:matchId/convocazioni-batch', authMiddleware, requirePermission('formazione', 'write'), async (req, res) => {
    try {
      const { convocazioni } = req.body;
      if (!convocazioni || !Array.isArray(convocazioni)) return res.status(400).json({ error: 'Dati mancanti' });
      const playerIds = convocazioni.map(c => c.calciatoreId);
      const { data: tps } = await supabase.from('team_player').select('id, player_id').in('player_id', playerIds);
      const playerToTp = {};
      (tps || []).forEach(tp => { playerToTp[tp.player_id] = tp.id; });
      await supabase.from('convocation').delete().eq('match_id', req.params.matchId);
      const inserts = convocazioni.filter(c => playerToTp[c.calciatoreId]).map(c => ({
        match_id: req.params.matchId, team_player_id: playerToTp[c.calciatoreId], presente: c.presente
      }));
      if (inserts.length > 0) {
        const { error } = await supabase.from('convocation').insert(inserts);
        if (error) return res.status(400).json({ error: error.message });
      }
      res.json({ success: true, saved: inserts.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── FORMAZIONE ──
  router.get('/api/squadre/:squadraId/partite/:matchId/formazione', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabase.from('match_formation').select('*').eq('match_id', req.params.matchId);
      if (error) return res.status(400).json({ error: error.message });
      res.json(data || []);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/api/partite/:matchId/formazione', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabase.from('match_formation').select('*, team_player:team_player_id(player_id)').eq('match_id', req.params.matchId);
      if (error) return res.status(400).json({ error: error.message });
      const result = (data || []).map(f => ({
        ...f, calciatoreId: f.team_player?.player_id || f.team_player_id,
        posizione: f.is_starter ? 'Titolare' : 'Panchina', numeroMaglia: f.numero_maglia
      }));
      let meta = { modulo: '4-3-3', positions: {} };
      const { data: matchData } = await supabase.from('match').select('formazione_meta').eq('id', req.params.matchId).single();
      if (matchData?.formazione_meta) meta = matchData.formazione_meta;
      res.json({ formazione: result, meta });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/api/partite/:matchId/formazione', authMiddleware, requirePermission('formazione', 'write'), async (req, res) => {
    try {
      const { formazione, modulo, positions } = req.body;
      if (!formazione || !Array.isArray(formazione)) return res.status(400).json({ error: 'Dati mancanti' });
      const playerIds = formazione.map(f => f.calciatoreId);
      const { data: tps } = await supabase.from('team_player').select('id, player_id').in('player_id', playerIds);
      const playerToTp = {};
      (tps || []).forEach(tp => { playerToTp[tp.player_id] = tp.id; });
      await supabase.from('match_formation').delete().eq('match_id', req.params.matchId);
      const inserts = formazione.filter(f => playerToTp[f.calciatoreId]).map((f, i) => ({
        match_id: req.params.matchId, team_player_id: playerToTp[f.calciatoreId],
        posizione: f.posizione === 'Titolare' ? 'Titolare' : 'Panchina',
        numero_maglia: f.numeroMaglia || null, is_starter: f.posizione === 'Titolare',
        is_captain: f.capitano || false, is_vice_captain: f.viceCapitano || false, ordine: i
      }));
      if (inserts.length > 0) {
        const { error } = await supabase.from('match_formation').insert(inserts);
        if (error) return res.status(400).json({ error: error.message });
      }
      if (modulo || positions) {
        await supabase.from('match').update({ formazione_meta: { modulo: modulo || '4-3-3', positions: positions || {} } }).eq('id', req.params.matchId);
      }
      res.json({ success: true, saved: inserts.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── EVENTI PARTITA ──
  router.get('/api/squadre/:squadraId/partite/:matchId/eventi', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabase.from('match_event').select('*').eq('match_id', req.params.matchId).order('minuto');
      if (error) return res.status(400).json({ error: error.message });
      res.json(data || []);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/api/partite/:matchId/dettaglio', authMiddleware, async (req, res) => {
    try {
      const { data: match } = await supabase.from('match').select('*, competition:competition_id(nome)').eq('id', req.params.matchId).single();
      if (match) {
        match.competizione = match.competition?.nome || null;
        // Logo lookup
        const { data: logos } = await supabase.from('team_logo').select('nome, nome_normalizzato, logo_path');
        if (logos && match.avversario) {
          const lower = match.avversario.toLowerCase().trim();
          const stripAccents = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const compact = stripAccents(lower).replace(/[^a-z0-9]/g, '');
          const norm = lower.replace(/[^a-z0-9\u00e0-\u00fa]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
          const coreAvv = coreTeamName(match.avversario);
          match.logo = null;
          for (const l of logos) {
            const lLower = l.nome.toLowerCase();
            const lCompact = stripAccents(l.nome_normalizzato).replace(/[^a-z0-9]/g, '');
            if (lLower === lower || l.nome_normalizzato === norm || compact === lCompact || compact.includes(lCompact) || lCompact.includes(compact) || lower.includes(lLower) || lLower.includes(lower)) {
              match.logo = l.logo_path; break;
            }
            // Fallback: core name matching (handles abbreviations like Pol., C., Atl.)
            const coreLogo = coreTeamName(l.nome);
            if (coreAvv && coreLogo && (coreAvv === coreLogo || coreAvv.includes(coreLogo) || coreLogo.includes(coreAvv))) {
              match.logo = l.logo_path; break;
            }
          }
        }
      }
      const { data: eventi } = await supabase.from('match_event').select('*, player:player_id(nome, cognome)').eq('match_id', req.params.matchId).order('minuto');
      const eventiMapped = (eventi || []).map(e => ({
        ...e, player_name: e.player ? e.player.cognome + ' ' + (e.player.nome ? e.player.nome.charAt(0) + '.' : '') : ''
      }));
      res.json({ match, eventi: eventiMapped });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/api/partite/:matchId/eventi-batch', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
    try {
      const { error } = await supabase.from('match_event').delete().eq('match_id', req.params.matchId);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/api/partite/:matchId/eventi-batch', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
    try {
      const { eventi } = req.body;
      if (!eventi || !Array.isArray(eventi)) return res.status(400).json({ error: 'Dati mancanti' });
      await supabase.from('match_event').delete().eq('match_id', req.params.matchId);
      if (eventi.length > 0) {
        const inserts = eventi.map(e => ({
          match_id: req.params.matchId, tipo_evento: e.tipo, minuto: parseInt(e.minuto), player_id: e.principale_id || null
        }));
        const { error } = await supabase.from('match_event').insert(inserts);
        if (error) return res.status(400).json({ error: error.message });
      }
      res.json({ success: true, saved: eventi.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/api/partite/:matchId/evento-item', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
    try {
      const { tipo, minuto, calciatorePrincipaleId } = req.body;
      const insertData = { match_id: req.params.matchId, tipo_evento: tipo, minuto };
      if (calciatorePrincipaleId) insertData.player_id = calciatorePrincipaleId;
      const { data, error } = await supabase.from('match_event').insert(insertData).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── DISTINTA ──
  router.get('/api/squadre/:squadraId/partite/:matchId/distinta', authMiddleware, async (req, res) => {
    try {
      const { data: formazione } = await supabase.from('match_formation')
        .select('*, team_player:team_player_id(player_id, player:player_id(nome, cognome, data_nascita, matricola_figc, tipo_documento, numero_documento, rilasciato_da))')
        .eq('match_id', req.params.matchId)
        .order('is_starter', { ascending: false })
        .order('ordine');
      if (formazione && formazione.length > 0) {
        const result = formazione.map(f => ({
          id: f.team_player?.player_id || f.team_player_id,
          calciatoreId: f.team_player?.player_id || f.team_player_id,
          nome: f.team_player?.player?.nome || '',
          cognome: f.team_player?.player?.cognome || '',
          dataNascita: f.team_player?.player?.data_nascita || null,
          matricolaFigc: f.team_player?.player?.matricola_figc || null,
          tipoDocumento: f.team_player?.player?.tipo_documento || null,
          numeroDocumento: f.team_player?.player?.numero_documento || null,
          rilasciatoDa: f.team_player?.player?.rilasciato_da || null,
          numeroMaglia: f.numero_maglia,
          posizione: f.is_starter ? 'Titolare' : 'Panchina',
          capitano: f.is_captain, viceCapitano: f.is_vice_captain
        }));
        return res.json(result);
      }
      res.json([]);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── IMPORT CALENDARIO CSV ──
  router.post('/api/squadre/:squadraId/importa-calendario', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
    try {
      const { csvData } = req.body;
      if (!csvData || !Array.isArray(csvData)) return res.status(400).json({ error: 'Dati CSV mancanti' });
      let inserite = 0;
      for (const row of csvData) {
        if (row.length < 3) continue;
        const [data, ora, avversario, luogo, competizione, giornata] = row;
        const dataOra = new Date(`${data}T${ora || '15:00'}:00`).toISOString();
        let comp_id = null;
        if (competizione) {
          const { data: comp } = await supabase.from('competition').select('id').ilike('nome', '%' + competizione + '%').limit(1).single();
          if (comp) comp_id = comp.id;
        }
        const { error } = await supabase.from('match').insert({
          team_id: req.params.squadraId, data_ora: dataOra, avversario: avversario || 'Avversario',
          luogo: luogo || 'Casa', competition_id: comp_id, giornata: parseInt(giornata) || null
        });
        if (!error) inserite++;
      }
      res.json({ success: true, inserite });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  return router;
};
