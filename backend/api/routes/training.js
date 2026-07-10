/**
 * Training Routes - config, presenze, summary, programma, templates, materiale
 */
const express = require('express');

module.exports = function createTrainingRouter({ supabase, authMiddleware, requirePermission }) {
  const router = express.Router();

  // ── CONFIG (settimana tipo) ──
  router.get('/api/squadre/:squadraId/allenamenti/config', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabase.from('training_config').select('*').eq('team_id', req.params.squadraId).order('giorno_settimana');
      if (error) return res.status(400).json({ error: error.message });
      res.json(data || []);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/api/squadre/:squadraId/allenamenti/config', authMiddleware, requirePermission('allenamenti', 'write'), async (req, res) => {
    try {
      const { giorno_settimana, ora_inizio, ora_fine, luogo } = req.body;
      const { data, error } = await supabase.from('training_config').insert({
        team_id: req.params.squadraId, giorno_settimana, ora_inizio, ora_fine, luogo
      }).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/api/allenamenti/config/:id', authMiddleware, requirePermission('allenamenti', 'write'), async (req, res) => {
    try {
      const { giorno_settimana, ora_inizio, ora_fine, luogo } = req.body;
      const { data, error } = await supabase.from('training_config').update({
        giorno_settimana, ora_inizio, ora_fine, luogo
      }).eq('id', req.params.id).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/api/allenamenti/config/:id', authMiddleware, requirePermission('allenamenti', 'write'), async (req, res) => {
    try {
      // Fetch config prima di eliminarla (per sapere team_id e giorno)
      const { data: config } = await supabase.from('training_config').select('team_id, giorno_settimana').eq('id', req.params.id).single();
      
      const { error } = await supabase.from('training_config').delete().eq('id', req.params.id);
      if (error) return res.status(400).json({ error: error.message });

      // Elimina allenamenti futuri di quel giorno che non hanno presenze registrate
      let deleted = 0;
      if (config) {
        const now = new Date().toISOString();
        const { data: futureTrainings } = await supabase.from('training')
          .select('id, data_ora')
          .eq('team_id', config.team_id)
          .gte('data_ora', now);
        
        // Filtra solo quelli del giorno della settimana rimosso
        const toCheck = (futureTrainings || []).filter(t => new Date(t.data_ora).getDay() === config.giorno_settimana);
        if (toCheck.length > 0) {
          const ids = toCheck.map(t => t.id);
          // Verifica quali hanno presenze registrate
          const { data: withAttendance } = await supabase.from('training_attendance')
            .select('training_id').in('training_id', ids);
          const hasAttendance = new Set((withAttendance || []).map(a => a.training_id));
          const toDelete = ids.filter(id => !hasAttendance.has(id));
          if (toDelete.length > 0) {
            await supabase.from('training').delete().in('id', toDelete);
            deleted = toDelete.length;
          }
        }
      }

      res.json({ success: true, deleted_trainings: deleted });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── PRESENZE ──
  // GET /api/squadre/:squadraId/allenamenti/annullati — date allenamenti annullati
  router.get('/api/squadre/:squadraId/allenamenti/annullati', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabase.from('training')
        .select('id, data_ora')
        .eq('team_id', req.params.squadraId)
        .eq('annullato', true);
      if (error) return res.status(400).json({ error: error.message });
      // Restituisci solo le date (YYYY-MM-DD)
      const dates = (data || []).map(t => t.data_ora.substring(0, 10));
      res.json(dates);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/api/squadre/:squadraId/allenamenti/presenze', authMiddleware, async (req, res) => {
    try {
      const { mese } = req.query; // optional: YYYY-MM filter
      let trainingsQuery = supabase.from('training').select('id, data_ora').eq('team_id', req.params.squadraId);
      if (mese) {
        trainingsQuery = trainingsQuery.gte('data_ora', mese + '-01T00:00:00').lte('data_ora', mese + '-31T23:59:59');
      }
      const { data: trainings } = await trainingsQuery;
      const trainingIds = (trainings || []).map(t => t.id);
      if (trainingIds.length === 0) return res.json([]);
      let data = [];
      for (let i = 0; i < trainingIds.length; i += 20) {
        const batch = trainingIds.slice(i, i + 20);
        const { data: batchData, error } = await supabase.from('training_attendance').select('id, training_id, team_player_id, presente, motivi_assenza, note').in('training_id', batch).range(0, 9999);
        if (error) return res.status(400).json({ error: error.message });
        if (batchData) data.push(...batchData);
      }
      // Build training date map to avoid joining
      const trainingDateMap = {};
      (trainings || []).forEach(t => { trainingDateMap[t.id] = new Date(t.data_ora).toLocaleDateString('sv-SE'); });
      const tpIds = [...new Set((data || []).map(d => d.team_player_id))];
      let tpMap = {};
      if (tpIds.length > 0) {
        const { data: tps } = await supabase.from('team_player').select('id, player_id').in('id', tpIds);
        (tps || []).forEach(tp => { tpMap[tp.id] = tp.player_id; });
      }
      const result = (data || []).map(d => ({
        id: d.id,
        calciatore_id: tpMap[d.team_player_id] || d.team_player_id,
        data: trainingDateMap[d.training_id] || null,
        presente: d.presente,
        motivo_assenza: d.motivi_assenza,
        note: d.note,
        team_id: req.params.squadraId
      }));
      res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/api/squadre/:squadraId/allenamenti/presenze-batch', authMiddleware, requirePermission('allenamenti', 'write'), async (req, res) => {
    try {
      const { data: presenzeList, date } = req.body;
      if (!presenzeList || !date) return res.status(400).json({ error: 'Dati mancanti' });
      const dataInizio = date + 'T00:00:00';
      const dataFine = date + 'T23:59:59';
      let { data: training } = await supabase.from('training').select('id').eq('team_id', req.params.squadraId).gte('data_ora', dataInizio).lte('data_ora', dataFine).limit(1).single();
      if (!training) {
        const { data: newTraining, error: tErr } = await supabase.from('training').insert({
          team_id: req.params.squadraId, data_ora: date + 'T17:00:00', durata_minuti: 90, tipo: 'Allenamento'
        }).select().single();
        if (tErr) return res.status(400).json({ error: tErr.message });
        training = newTraining;
      }
      const playerIds = presenzeList.map(p => p.calciatoreId);
      const { data: tps } = await supabase.from('team_player').select('id, player_id').eq('team_id', req.params.squadraId).in('player_id', playerIds);
      const playerToTp = {};
      (tps || []).forEach(tp => { playerToTp[tp.player_id] = tp.id; });
      const upserts = presenzeList.map(p => ({
        training_id: training.id,
        team_player_id: playerToTp[p.calciatoreId],
        presente: p.presente,
        motivi_assenza: !p.presente ? (p.note || 'Assente') : null
      })).filter(u => u.team_player_id);
      await supabase.from('training_attendance').delete().eq('training_id', training.id);
      if (upserts.length > 0) {
        const { error } = await supabase.from('training_attendance').insert(upserts);
        if (error) return res.status(400).json({ error: error.message });
      }
      res.json({ success: true, saved: upserts.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/api/squadre/:squadraId/allenamenti/presenze', authMiddleware, requirePermission('allenamenti', 'write'), async (req, res) => {
    try {
      const { calciatoreId, data, presente, note } = req.body;
      const { data: tp } = await supabase.from('team_player').select('id').eq('player_id', calciatoreId).eq('team_id', req.params.squadraId).single();
      if (!tp) return res.status(400).json({ error: 'Giocatore non in rosa' });
      const dataInizio = data + 'T00:00:00';
      const dataFine = data + 'T23:59:59';
      let { data: training } = await supabase.from('training').select('id').eq('team_id', req.params.squadraId).gte('data_ora', dataInizio).lte('data_ora', dataFine).limit(1).single();
      if (!training) {
        const { data: newTraining, error: tErr } = await supabase.from('training').insert({
          team_id: req.params.squadraId, data_ora: data + 'T17:00:00', durata_minuti: 90, tipo: 'Allenamento'
        }).select().single();
        if (tErr) return res.status(400).json({ error: tErr.message });
        training = newTraining;
      }
      const { data: existing } = await supabase.from('training_attendance').select('id').eq('training_id', training.id).eq('team_player_id', tp.id).single();
      if (existing) {
        const { data: updated, error } = await supabase.from('training_attendance').update({ presente, motivi_assenza: !presente ? (note || 'Assente') : null }).eq('id', existing.id).select().single();
        if (error) return res.status(400).json({ error: error.message });
        res.json(updated);
      } else {
        const { data: inserted, error } = await supabase.from('training_attendance').insert({
          training_id: training.id, team_player_id: tp.id, presente, motivi_assenza: !presente ? (note || 'Assente') : null
        }).select().single();
        if (error) return res.status(400).json({ error: error.message });
        res.json(inserted);
      }
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── SUMMARY ──
  router.get('/api/squadre/:squadraId/allenamenti/summary', authMiddleware, async (req, res) => {
    try {
      const { data: teamPlayers } = await supabase.from('team_player').select('id, player_id, calciatore:player_id(id, nome, cognome)').eq('team_id', req.params.squadraId);
      const { data: trainings } = await supabase.from('training').select('id, data_ora').eq('team_id', req.params.squadraId).order('data_ora');
      const trainingIds = (trainings || []).map(t => t.id);
      let presenze = [];
      if (trainingIds.length > 0) {
        for (let i = 0; i < trainingIds.length; i += 20) {
          const batch = trainingIds.slice(i, i + 20);
          const { data: batchData } = await supabase.from('training_attendance').select('team_player_id, presente, training_id, motivi_assenza').in('training_id', batch).range(0, 9999);
          if (batchData) presenze.push(...batchData);
        }
      }

      const summary = {};
      const motiviTotali = {};
      // Single pass: build per-player stats from presenze (already has presente flag)
      const playerPresMap = {}; // tp_id -> {totali, presenti, assenti}
      presenze.forEach(p => {
        if (!playerPresMap[p.team_player_id]) playerPresMap[p.team_player_id] = { totali: 0, presenti: 0, assenti: 0 };
        playerPresMap[p.team_player_id].totali++;
        if (p.presente) playerPresMap[p.team_player_id].presenti++;
        else playerPresMap[p.team_player_id].assenti++;
      });
      // Motivi from same presenze data (absences only)
      presenze.filter(p => !p.presente).forEach(p => {
        const k = p.motivi_assenza || 'Non comunicato';
        motiviTotali[k] = (motiviTotali[k] || 0) + 1;
      });
      (teamPlayers || []).forEach(tp => {
        const g = tp.calciatore;
        if (!g) return;
        const ps = playerPresMap[tp.id] || { totali: 0, presenti: 0, assenti: 0 };
        const playerAbs = presenze.filter(p => p.team_player_id === tp.id && !p.presente);
        const motivi = {};
        playerAbs.forEach(p => { const k = p.motivi_assenza || 'Non comunicato'; motivi[k] = (motivi[k] || 0) + 1; });
        summary[g.id] = { id: g.id, nome: g.nome, cognome: g.cognome, totali: ps.totali, presenti: ps.presenti, assenti: ps.assenti, assentiSett: 0, motivi };
      });

      // Determine if season is active (has trainings in last 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);
      const lastTraining = trainings && trainings.length > 0 ? new Date(trainings[trainings.length - 1].data_ora) : null;
      const isActive = lastTraining && lastTraining >= thirtyDaysAgo;

      let settimana;
      if (isActive) {
        const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
        const inizioSett = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1);
        const fineSett = new Date(inizioSett.getFullYear(), inizioSett.getMonth(), inizioSett.getDate() + 6, 23, 59, 59);
        const { data: weekT } = await supabase.from('training').select('id').eq('team_id', req.params.squadraId).gte('data_ora', inizioSett.toISOString()).lte('data_ora', fineSett.toISOString());
        const weekIds = (weekT || []).map(t => t.id);
        if (weekIds.length > 0) {
          const { data: weekAtt } = await supabase.from('training_attendance').select('team_player_id').in('training_id', weekIds).eq('presente', false);
          const tpToPlayer = {};
          (teamPlayers || []).forEach(tp => { tpToPlayer[tp.id] = tp.calciatore?.id; });
          (weekAtt || []).forEach(p => {
            const playerId = tpToPlayer[p.team_player_id];
            if (playerId && summary[playerId]) summary[playerId].assentiSett++;
          });
        }
        settimana = { da: inizioSett.toISOString().split('T')[0], a: fineSett.toISOString().split('T')[0], attiva: true };
      } else {
        // Stagione passata: mostra range totale
        const da = trainings && trainings.length > 0 ? trainings[0].data_ora.split('T')[0] : null;
        const a = trainings && trainings.length > 0 ? trainings[trainings.length - 1].data_ora.split('T')[0] : null;
        settimana = { da, a, attiva: false };
      }
      res.json({ summary, settimana, motiviTotali });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── MATERIALE ──
  router.get('/api/squadre/:squadraId/allenamenti/materiale', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabase.from('training_material').select('*').eq('team_id', req.params.squadraId).order('created_at', { ascending: false });
      if (error) return res.json([]);
      res.json(data || []);
    } catch (err) { res.json([]); }
  });

  router.post('/api/squadre/:squadraId/allenamenti/materiale', authMiddleware, async (req, res) => {
    try {
      const { titolo, descrizione, tipo, url } = req.body;
      const { data, error } = await supabase.from('training_material').insert({
        team_id: req.params.squadraId, titolo, descrizione, tipo, url
      }).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/api/allenamenti/materiale/:id', authMiddleware, async (req, res) => {
    try {
      const { error } = await supabase.from('training_material').delete().eq('id', req.params.id);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── PROGRAMMA SEDUTA ──
  router.get('/api/training/:trainingId/programma', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabase.from('training').select('id, note, tipo, durata_minuti').eq('id', req.params.trainingId).single();
      if (error || !data) return res.json({ programma: null });
      let programma = null;
      if (data.note && data.note.startsWith('JSON::')) {
        try { programma = JSON.parse(data.note.substring(6)); } catch(e) {}
      }
      res.json({ programma, tipo: data.tipo, durata_minuti: data.durata_minuti });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.put('/api/training/:trainingId/programma', authMiddleware, requirePermission('allenamenti', 'write'), async (req, res) => {
    try {
      const { programma } = req.body;
      const noteValue = programma ? 'JSON::' + JSON.stringify(programma) : null;
      const updateData = { note: noteValue };
      if (programma?.tipo) updateData.tipo = programma.tipo;
      if (programma?.fasi) {
        const durata = programma.fasi.reduce((s, f) => s + (f.durata || 0), 0);
        if (durata > 0) updateData.durata_minuti = durata;
      }
      const { error } = await supabase.from('training').update(updateData).eq('id', req.params.trainingId);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── TRAINING BY DATE ──
  router.get('/api/squadre/:squadraId/training-by-date/:date', authMiddleware, async (req, res) => {
    try {
      const { squadraId, date } = req.params;
      const { data } = await supabase.from('training').select('*').eq('team_id', squadraId).gte('data_ora', date + 'T00:00:00').lte('data_ora', date + 'T23:59:59').limit(1).single();
      if (data) {
        let programma = null;
        if (data.note && data.note.startsWith('JSON::')) {
          try { programma = JSON.parse(data.note.substring(6)); } catch(e) {}
        }
        res.json({ training: data, programma });
      } else {
        res.json({ training: null, programma: null });
      }
    } catch (err) { res.json({ training: null, programma: null }); }
  });

  router.post('/api/squadre/:squadraId/training-by-date', authMiddleware, requirePermission('allenamenti', 'write'), async (req, res) => {
    try {
      const { date, programma, ora_inizio, ora_fine, luogo } = req.body;
      const noteValue = programma ? 'JSON::' + JSON.stringify(programma) : null;
      const durata = programma?.fasi ? programma.fasi.reduce((s, f) => s + (f.durata || 0), 0) : 90;
      const timeStr = ora_inizio || '17:00';
      // Check if training already exists for this date
      const { data: existing } = await supabase.from('training').select('id').eq('team_id', req.params.squadraId).gte('data_ora', date + 'T00:00:00').lte('data_ora', date + 'T23:59:59').limit(1).single();
      let data, error;
      if (existing) {
        const upd = { durata_minuti: durata, tipo: programma?.tipo || 'Allenamento', note: noteValue };
        if (ora_inizio) upd.data_ora = date + 'T' + timeStr + ':00';
        if (luogo) upd.descrizione = luogo;
        ({ data, error } = await supabase.from('training').update(upd).eq('id', existing.id).select().single());
      } else {
        ({ data, error } = await supabase.from('training').insert({
          team_id: req.params.squadraId, data_ora: date + 'T' + timeStr + ':00', durata_minuti: durata, tipo: programma?.tipo || 'Allenamento', note: noteValue, descrizione: luogo || null
        }).select().single());
      }
      if (error) return res.status(400).json({ error: error.message });
      res.json({ training: data });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── TEMPLATES ──
  router.get('/api/squadre/:squadraId/training-templates', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabase.from('training_template').select('*').eq('team_id', req.params.squadraId).order('created_at', { ascending: false });
      if (error) return res.status(400).json({ error: error.message });
      res.json(data || []);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/api/squadre/:squadraId/training-templates', authMiddleware, requirePermission('allenamenti', 'write'), async (req, res) => {
    try {
      const { nome, programma } = req.body;
      if (!nome || !programma) return res.status(400).json({ error: 'Nome e programma richiesti' });
      const { data, error } = await supabase.from('training_template').insert({
        team_id: req.params.squadraId, nome, programma, created_by: req.user.id
      }).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.status(201).json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/api/training-templates/:id', authMiddleware, requirePermission('allenamenti', 'write'), async (req, res) => {
    try {
      const { error } = await supabase.from('training_template').delete().eq('id', req.params.id);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/squadre/:squadraId/allenamenti-futuri — prossimi allenamenti (reali + virtuali da config)
  router.get('/api/squadre/:squadraId/allenamenti-futuri', authMiddleware, async (req, res) => {
    try {
      const teamId = req.params.squadraId;
      const now = new Date();

      // 1. Allenamenti reali già nel DB
      const { data: realTrainings, error } = await supabase.from('training')
        .select('id, data_ora, durata_minuti, tipo, descrizione, note, annullato')
        .eq('team_id', teamId)
        .gte('data_ora', now.toISOString())
        .order('data_ora', { ascending: true })
        .limit(20);
      if (error) return res.status(400).json({ error: error.message });

      // 2. Training config (settimana tipo)
      const { data: configs } = await supabase.from('training_config')
        .select('giorno_settimana, ora_inizio, ora_fine, luogo').eq('team_id', teamId);

      // 3. Genera sessioni virtuali per le prossime 3 settimane dalla config
      const realDates = new Set((realTrainings || []).map(t => t.data_ora.substring(0, 10)));
      const virtual = [];
      if (configs && configs.length > 0) {
        for (let dayOffset = 0; dayOffset <= 21; dayOffset++) {
          const d = new Date(now);
          d.setDate(d.getDate() + dayOffset);
          const weekday = d.getDay();
          const config = configs.find(c => c.giorno_settimana === weekday);
          if (!config) continue;

          const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
          if (realDates.has(dateStr)) continue; // già esiste nel DB

          const [h, m] = (config.ora_inizio || '17:00').split(':');
          d.setHours(parseInt(h), parseInt(m), 0, 0);
          if (d <= now) continue; // già passato oggi

          virtual.push({
            id: `virtual_${dateStr}`,
            data_ora: d.toISOString(),
            durata_minuti: null,
            tipo: null,
            descrizione: null,
            luogo: config.luogo || null,
            virtuale: true
          });
        }
      }

      // 4. Unisci e ordina, aggiungi luogo ai reali dalla config
      const configMap = {};
      (configs || []).forEach(c => { configMap[c.giorno_settimana] = c.luogo; });
      const result = (realTrainings || []).map(t => {
        const day = new Date(t.data_ora).getDay();
        return { ...t, luogo: configMap[day] || null, virtuale: false };
      });

      const all = [...result, ...virtual].sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));
      res.json(all.slice(0, 20));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // PUT /api/training/:id/annulla — annulla allenamento + notifica automatica
  router.put('/api/training/:id/annulla', authMiddleware, requirePermission('allenamenti', 'write'), async (req, res) => {
    try {
      const { id } = req.params;

      // Fetch training per data e team
      const { data: training, error: fetchErr } = await supabase.from('training')
        .select('id, team_id, data_ora, annullato').eq('id', id).single();
      if (fetchErr || !training) return res.status(404).json({ error: 'Allenamento non trovato' });
      if (training.annullato) return res.json({ success: true, already: true });

      // Set annullato
      const { error } = await supabase.from('training').update({ annullato: true }).eq('id', id);
      if (error) return res.status(400).json({ error: error.message });

      // Genera notifica automatica
      const { data: team } = await supabase.from('team')
        .select('id, category_id, season:season_id(workspace_id)').eq('id', training.team_id).single();
      const workspace_id = team?.season?.workspace_id;

      if (workspace_id) {
        const dataAll = new Date(training.data_ora);
        const oggi = new Date();
        const isOggi = dataAll.toISOString().slice(0, 10) === oggi.toISOString().slice(0, 10);
        const dataStr = dataAll.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
        const titolo = '⚠️ Allenamento annullato';
        const messaggio = isOggi ? 'Allenamento odierno annullato' : `Allenamento del ${dataStr} annullato`;

        await supabase.from('notification').insert({
          workspace_id,
          team_id: training.team_id,
          tipo: 'avviso',
          titolo,
          messaggio,
          priorita: 'urgente',
          destinatario_tipo: ['atleta', 'genitore'],
          destinatario_profilo: ['allenatore', 'admin'],
          created_by: (req.user.id && req.user.id !== 'superadmin') ? req.user.id : null,
          letto: false
        });
      }

      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // PUT /api/training/:id/ripristina — ripristina allenamento annullato + notifica
  router.put('/api/training/:id/ripristina', authMiddleware, requirePermission('allenamenti', 'write'), async (req, res) => {
    try {
      const { id } = req.params;
      const { data: training } = await supabase.from('training').select('id, team_id, data_ora').eq('id', id).single();
      if (!training) return res.status(404).json({ error: 'Allenamento non trovato' });

      const { error } = await supabase.from('training').update({ annullato: false }).eq('id', id);
      if (error) return res.status(400).json({ error: error.message });

      // Notifica ripristino
      const { data: team } = await supabase.from('team')
        .select('id, season:season_id(workspace_id)').eq('id', training.team_id).single();
      const workspace_id = team?.season?.workspace_id;
      if (workspace_id) {
        const dataAll = new Date(training.data_ora);
        const oggi = new Date();
        const isOggi = dataAll.toISOString().slice(0, 10) === oggi.toISOString().slice(0, 10);
        const dataStr = dataAll.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
        await supabase.from('notification').insert({
          workspace_id,
          team_id: training.team_id,
          tipo: 'avviso',
          titolo: '✅ Allenamento confermato',
          messaggio: isOggi ? 'Allenamento odierno confermato' : `Allenamento del ${dataStr} confermato`,
          priorita: 'importante',
          destinatario_tipo: ['atleta', 'genitore'],
          destinatario_profilo: ['allenatore', 'admin'],
          created_by: (req.user.id && req.user.id !== 'superadmin') ? req.user.id : null,
          letto: false
        });
      }

      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/squadre/:teamId/assenze-settimana — assenze REALI registrate dal mister (training_attendance)
  router.get('/api/squadre/:teamId/assenze-settimana', authMiddleware, async (req, res) => {
    try {
      const now = new Date();
      const day = now.getDay();
      const diffToMon = day === 0 ? 6 : day - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMon);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      // Allenamenti della settimana per questa squadra
      const { data: weekTrainings } = await supabase.from('training')
        .select('id')
        .eq('team_id', req.params.teamId)
        .gte('data_ora', monday.toISOString())
        .lte('data_ora', sunday.toISOString());
      const weekIds = (weekTrainings || []).map(t => t.id);
      if (weekIds.length === 0) return res.json([]);

      // Assenze registrate (presente=false)
      const { data: absences } = await supabase.from('training_attendance')
        .select('team_player_id')
        .in('training_id', weekIds)
        .eq('presente', false);

      // Mappa team_player_id -> player_id
      const tpIds = [...new Set((absences || []).map(a => a.team_player_id))];
      if (tpIds.length === 0) return res.json([]);
      const { data: tps } = await supabase.from('team_player').select('id, player_id').in('id', tpIds);
      const tpMap = {};
      (tps || []).forEach(tp => { tpMap[tp.id] = tp.player_id; });

      // Restituisci array con player_id per ogni assenza
      const result = (absences || []).map(a => ({ player_id: tpMap[a.team_player_id] })).filter(r => r.player_id);
      res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  return router;
};
