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
      const { data } = await supabase.from('match').select('*').eq('team_id', req.params.squadraId).order('data_ora', { ascending: false });
      const result = (data || []).map(m => ({ ...m, competizione: m.tipo_competizione || null }));
      res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/api/squadre/:squadraId/partite-future', authMiddleware, async (req, res) => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const { data } = await supabase.from('match').select('*').eq('team_id', req.params.squadraId).gte('data_ora', todayStart).order('data_ora', { ascending: true }).limit(5);
      // Logo lookup for opponents
      const { data: logos } = await supabase.from('team_logo').select('nome, nome_normalizzato, logo_path');
      const findLogo = (avv) => {
        if (!avv || !logos) return null;
        const lower = avv.toLowerCase().trim();
        const stripAccents = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const compact = stripAccents(lower).replace(/[^a-z0-9]/g, '');
        // Pass 1: exact match
        for (const l of logos) {
          const lCompact = stripAccents(l.nome_normalizzato || '').replace(/[^a-z0-9]/g, '');
          if (l.nome.toLowerCase() === lower || compact === lCompact) return l.logo_path;
        }
        // Pass 2: substring match — prefer longest (most specific)
        let best = null, bestLen = 0;
        for (const l of logos) {
          const lCompact = stripAccents(l.nome_normalizzato || '').replace(/[^a-z0-9]/g, '');
          if (compact.includes(lCompact) || lCompact.includes(compact)) {
            if (lCompact.length > bestLen) { best = l.logo_path; bestLen = lCompact.length; }
          }
        }
        return best;
      };
      const result = (data || []).map(m => ({ ...m, competizione: m.tipo_competizione || null, tipoCompetizione: m.tipo_competizione || null, logo: findLogo(m.avversario) }));
      res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/api/squadre/:squadraId/partite', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
    try {
      const p = req.body;
      const { data } = await supabase.from('match').insert({ team_id: req.params.squadraId, data_ora: p.dataOra, avversario: p.avversario, luogo: p.luogo, tipo_competizione: p.tipoCompetizione || null, giornata: p.giornata }).select().single();
      res.status(201).json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/api/partite/:id', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
    try {
      const p = req.body;
      const updateData = { data_ora: p.dataOra, avversario: p.avversario, luogo: p.luogo, giornata: p.giornata };
      if (p.tipoCompetizione !== undefined) updateData.tipo_competizione = p.tipoCompetizione || null;
      if (p.noteAvversario !== undefined) updateData.note_avversario = p.noteAvversario;
      if (p.golCasa !== undefined) updateData.gol_casa = p.golCasa;
      if (p.golOspite !== undefined) updateData.gol_ospite = p.golOspite;
      if (p.stato !== undefined) updateData.stato = p.stato;
      // Save modulo_finale in formazione_meta if provided
      if (p.modulo_finale) {
        const { data: curr } = await supabase.from('match').select('formazione_meta').eq('id', req.params.id).single();
        const meta = curr?.formazione_meta || {};
        meta.modulo_finale = p.modulo_finale;
        updateData.formazione_meta = meta;
      }
      await supabase.from('match').update(updateData).eq('id', req.params.id);

      // Auto-calculate minutes when match is set to Terminata
      if (p.stato === 'Terminata') {
        try { await calcAndSaveMinutes(req.params.id, supabase); } catch(e) { /* non-blocking */ }
      }

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

  router.put('/api/partite/:id/note', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
    try {
      const { note } = req.body;
      const { error } = await supabase.from('match').update({ note }).eq('id', req.params.id);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── LIVE MATCH ──
  router.put('/api/partite/:id/live-action', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
    try {
      const { action } = req.body; // start_1t, end_1t, start_2t, end_match
      const valid = ['start_1t', 'end_1t', 'start_2t', 'end_match'];
      if (!valid.includes(action)) return res.status(400).json({ error: 'Azione non valida' });
      const { data: m } = await supabase.from('match').select('live_meta').eq('id', req.params.id).single();
      const meta = m?.live_meta || {};
      const now = new Date().toISOString();
      meta[action] = now;
      if (action === 'start_1t') meta.stato = '1t';
      else if (action === 'end_1t') meta.stato = 'intervallo';
      else if (action === 'start_2t') meta.stato = '2t';
      else if (action === 'end_match') meta.stato = 'fine';
      const updateData = { live_meta: meta };
      if (action === 'end_match') updateData.stato = 'Terminata';
      await supabase.from('match').update(updateData).eq('id', req.params.id);
      res.json({ success: true, live_meta: meta });
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
      // Trigger notifica per segreteria (non-blocking)
      const convocatiCount = inserts.filter(i => i.presente).length;
      if (convocatiCount > 0) {
        try {
          const { data: match } = await supabase.from('match').select('avversario, data_ora, team_id').eq('id', req.params.matchId).single();
          if (match) {
            const { data: team } = await supabase.from('team').select('category_id, category:category_id(workspace_id)').eq('id', match.team_id).single();
            const wsId = team?.category?.workspace_id;
            if (wsId) {
              const dataStr = new Date(match.data_ora).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
              await supabase.from('notification').insert({
                workspace_id: wsId,
                team_id: match.team_id,
                tipo: 'convocazione',
                titolo: '📋 Convocazione pronta',
                messaggio: `${convocatiCount} convocati per ${match.avversario || 'partita'} (${dataStr})`,
                riferimento_id: req.params.matchId,
                destinatario_profilo: ['segreteria', 'dirigente', 'osservatore'],
                created_by: req.user.id
              });
            }
          }
        } catch(e) { /* silent */ }
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

  // GET ultima formazione INIZIALE schierata per la squadra
  router.get('/api/squadre/:teamId/ultima-formazione', authMiddleware, async (req, res) => {
    try {
      const { data: lastMatch } = await supabase.from('match').select('id, formazione_meta')
        .eq('team_id', req.params.teamId).eq('stato', 'Terminata')
        .order('data_ora', { ascending: false }).limit(1).single();
      if (!lastMatch) return res.json({ formazione: [], meta: {} });
      const { data } = await supabase.from('match_formation').select('*, team_player:team_player_id(player_id)')
        .eq('match_id', lastMatch.id).eq('is_starter', true);
      const result = (data || []).map(f => ({
        ...f, calciatoreId: f.team_player?.player_id || f.team_player_id,
        posizione: 'Titolare', numeroMaglia: f.numero_maglia
      }));
      const meta = lastMatch.formazione_meta || {};
      res.json({ formazione: result, meta: { modulo: meta.modulo || '4-3-3', positions: meta.positions || {} } });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/api/partite/:matchId/formazione', authMiddleware, requirePermission('formazione', 'write'), async (req, res) => {
    try {
      const { formazione, modulo, positions } = req.body;
      if (!formazione || !Array.isArray(formazione)) return res.status(400).json({ error: 'Dati mancanti' });

      // Check if match is live — block formation rewrite
      const { data: matchCheck } = await supabase.from('match').select('live_meta, formazione_meta').eq('id', req.params.matchId).single();
      const isLive = !!(matchCheck?.live_meta?.stato);
      if (isLive) {
        // Partita live: solo aggiornamento modulo_finale, non toccare match_formation
        if (modulo) {
          const existingMeta = matchCheck.formazione_meta || {};
          const newMeta = { ...existingMeta, modulo_finale: modulo, positions: positions || existingMeta.positions || {} };
          await supabase.from('match').update({ formazione_meta: newMeta }).eq('id', req.params.matchId);
        }
        return res.json({ success: true, saved: 0, locked: true });
      }

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
        const newMeta = { modulo: modulo || '4-3-3', positions: positions || {} };
        await supabase.from('match').update({ formazione_meta: newMeta }).eq('id', req.params.matchId);
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
      const { data: match } = await supabase.from('match').select('*').eq('id', req.params.matchId).single();
      if (match) {
        match.competizione = match.tipo_competizione || null;
        // Logo lookup
        const { data: logos } = await supabase.from('team_logo').select('nome, nome_normalizzato, logo_path');
        if (logos && match.avversario) {
          const lower = match.avversario.toLowerCase().trim();
          const stripAccents = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const compact = stripAccents(lower).replace(/[^a-z0-9]/g, '');
          const norm = lower.replace(/[^a-z0-9\u00e0-\u00fa]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
          const coreAvv = coreTeamName(match.avversario);
          match.logo = null;
          // Pass 1: exact/compact match (high confidence)
          for (const l of logos) {
            const lLower = l.nome.toLowerCase();
            const lCompact = stripAccents(l.nome_normalizzato).replace(/[^a-z0-9]/g, '');
            if (lLower === lower || l.nome_normalizzato === norm || compact === lCompact) {
              match.logo = l.logo_path; break;
            }
          }
          // Pass 2: partial includes (medium confidence) — prefer longest match
          if (!match.logo) {
            let best = null, bestLen = 0;
            for (const l of logos) {
              const lLower = l.nome.toLowerCase();
              const lCompact = stripAccents(l.nome_normalizzato).replace(/[^a-z0-9]/g, '');
              if (compact.includes(lCompact) || lCompact.includes(compact) || lower.includes(lLower) || lLower.includes(lower)) {
                if (lCompact.length > bestLen) { best = l.logo_path; bestLen = lCompact.length; }
              }
            }
            if (best) match.logo = best;
          }
          // Pass 3: core name fallback (low confidence, only if no ambiguity)
          if (!match.logo) {
            for (const l of logos) {
              const coreLogo = coreTeamName(l.nome);
              if (coreAvv && coreLogo && coreAvv === coreLogo) {
                match.logo = l.logo_path; break;
              }
            }
          }
        }
      }
      const { data: eventi } = await supabase.from('match_event').select('*, player:player_id(nome, cognome), player_secondary:player_id_secondario(nome, cognome)').eq('match_id', req.params.matchId).order('minuto');
      const eventiMapped = (eventi || []).map(e => ({
        ...e,
        player_name: e.player ? e.player.cognome + ' ' + (e.player.nome ? e.player.nome.charAt(0) + '.' : '') : '',
        player_name_secondary: e.player_secondary ? e.player_secondary.cognome + ' ' + (e.player_secondary.nome ? e.player_secondary.nome.charAt(0) + '.' : '') : '',
        autogol: e.note === 'autogol',
        rigore: e.note === 'rigore'
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
        const inserts = [];
        eventi.forEach(e => {
          inserts.push({
            match_id: req.params.matchId, tipo_evento: e.tipo, minuto: parseInt(e.minuto) || null,
            player_id: e.principale_id || null,
            player_id_secondario: e.tipo === 'SUB' ? (e.assist_id || null) : null,
            note: e.autogol ? 'autogol' : (e.rigore ? 'rigore' : null)
          });
          // Se GOAL con assist, crea evento ASSIST separato
          if (e.tipo === 'GOAL' && e.assist_id) {
            inserts.push({
              match_id: req.params.matchId, tipo_evento: 'ASSIST', minuto: parseInt(e.minuto) || null,
              player_id: e.assist_id, player_id_secondario: null, note: null
            });
          }
        });
        const { error } = await supabase.from('match_event').insert(inserts);
        if (error) return res.status(400).json({ error: error.message });
      }
      // Recalculate minutes if match is already Terminata
      const { data: mCheck } = await supabase.from('match').select('stato').eq('id', req.params.matchId).single();
      if (mCheck?.stato === 'Terminata') {
        try { await calcAndSaveMinutes(req.params.matchId, supabase); } catch(e) { /* non-blocking */ }
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
        .select('*, team_player:team_player_id(player_id, player:player_id(nome, cognome, data_nascita, ruolo_principale, matricola_figc, tipo_documento, numero_documento, rilasciato_da))')
        .eq('match_id', req.params.matchId)
        .order('is_starter', { ascending: false })
        .order('ordine');
      if (formazione && formazione.length > 0) {
        const result = formazione.map(f => ({
          id: f.team_player?.player_id || f.team_player_id,
          calciatoreId: f.team_player?.player_id || f.team_player_id,
          nome: f.team_player?.player?.nome || '',
          cognome: f.team_player?.player?.cognome || '',
          ruolo_principale: f.team_player?.player?.ruolo_principale || null,
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
        const { error } = await supabase.from('match').insert({
          team_id: req.params.squadraId, data_ora: dataOra, avversario: avversario || 'Avversario',
          luogo: luogo || 'Casa', tipo_competizione: competizione || null, giornata: parseInt(giornata) || null
        });
        if (!error) inserite++;
      }
      res.json({ success: true, inserite });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  return router;
};

// Helper: calculate and save minutes played for each player in formation
async function calcAndSaveMinutes(matchId, supabase) {
  const { data: matchData } = await supabase.from('match').select('team_id, live_meta').eq('id', matchId).single();
  if (!matchData) return;

  // Determine match duration from category
  const { data: team } = await supabase.from('team').select('category_id, category:category_id(nome)').eq('id', matchData.team_id).single();
  const cat = (team?.category?.nome || '').toLowerCase();
  let halfDuration = 45;
  if (cat.includes('14') || cat.includes('15')) halfDuration = 35;
  else if (cat.includes('16')) halfDuration = 40;
  const totalMinutes = halfDuration * 2;

  // Get formation
  const { data: formation } = await supabase.from('match_formation').select('team_player_id, is_starter').eq('match_id', matchId);
  if (!formation || formation.length === 0) return;

  // Get SUB events
  const { data: events } = await supabase.from('match_event').select('tipo_evento, minuto, player_id, player_id_secondario').eq('match_id', matchId).eq('tipo_evento', 'SUB');
  const subs = (events || []).filter(e => e.minuto);

  // Build player_id -> team_player_id map from formation
  const tpIds = formation.map(f => f.team_player_id);
  const { data: tpData } = await supabase.from('team_player').select('id, player_id').in('id', tpIds);
  const tpToPlayer = {};
  const playerToTp = {};
  (tpData || []).forEach(tp => { tpToPlayer[tp.id] = tp.player_id; playerToTp[tp.player_id] = tp.id; });

  // Calculate minutes for each player
  const minutes = {};
  formation.forEach(f => {
    minutes[f.team_player_id] = f.is_starter ? totalMinutes : 0;
  });

  // Process substitutions
  subs.forEach(s => {
    const min = parseInt(s.minuto) || 0;
    // player_id = player going OUT, player_id_secondario = player coming IN
    const outTp = playerToTp[s.player_id];
    const inTp = playerToTp[s.player_id_secondario];
    if (outTp && minutes[outTp] !== undefined) {
      minutes[outTp] = min; // played from 0 to min
    }
    if (inTp && minutes[inTp] !== undefined) {
      minutes[inTp] = totalMinutes - min; // played from min to end
    } else if (inTp) {
      minutes[inTp] = totalMinutes - min;
    }
  });

  // Upsert match_statistics
  await supabase.from('match_statistics').delete().eq('match_id', matchId);
  const rows = Object.entries(minutes).filter(([, m]) => m > 0).map(([tpId, m]) => ({
    match_id: matchId, team_player_id: tpId, minuti_giocati: m
  }));
  if (rows.length > 0) {
    await supabase.from('match_statistics').insert(rows);
  }
}
