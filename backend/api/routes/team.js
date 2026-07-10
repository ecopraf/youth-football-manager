/**
 * Team Routes — stagioni, squadre CRUD (con cascade delete)
 */
const express = require('express');

module.exports = function createTeamRouter({ supabase, authMiddleware }) {
  const router = express.Router();

  // ── STAGIONI ──
  router.get('/api/stagioni', authMiddleware, async (req, res) => {
    try {
      const workspaceId = req.query.workspace_id;
      let query = supabase.from('season').select('*').order('data_inizio', { ascending: false });
      if (workspaceId) query = query.eq('workspace_id', workspaceId);
      const { data, error } = await query;
      if (error) return res.status(400).json({ error: error.message });
      res.json(data || []);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.get('/api/stagioni/:id/squadre', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase.from('team')
        .select('*, category:category_id(id, nome, tipo_campionato, girone, anno_da, anno_a)')
        .eq('season_id', id).order('nome');
      if (error) return res.status(400).json({ error: error.message });

      let filteredData = data || [];
      if (!req.user.is_superadmin && req.user.ruolo !== 'admin' && req.user.squadre_accesso && req.user.squadre_accesso.length > 0) {
        filteredData = filteredData.filter(t => !t.category_id || req.user.squadre_accesso.includes(t.category_id));
      }

      for (const team of filteredData) {
        const { data: staffAssign } = await supabase.from('team_staff').select('ruolo_squadra, staff:staff_id(nome, cognome)').eq('team_id', team.id);
        team._staff_count = (staffAssign || []).length;
        team._staff = (staffAssign || []).map(sa => ({ nome: sa.staff ? sa.staff.nome + ' ' + sa.staff.cognome : '', ruolo: sa.ruolo_squadra || '' })).filter(s => s.nome);
        // Rosa count (non svincolati)
        const { count: rosaCount } = await supabase.from('team_player').select('id', { count: 'exact', head: true }).eq('team_id', team.id).neq('stato', 'Svincolato');
        team._rosa_count = rosaCount || 0;
        if (staffAssign && staffAssign.length > 0) {
          staffAssign.forEach(sa => {
            const nome = sa.staff ? sa.staff.nome + ' ' + sa.staff.cognome : '';
            const ruolo = (sa.ruolo_squadra || '').toLowerCase();
            if ((ruolo.includes('allenatore') || ruolo.includes('capo allenatore')) && !ruolo.includes('portieri')) team.allenatore = team.allenatore || nome;
            else if (ruolo.includes('portieri')) team.allenatore_portieri = team.allenatore_portieri || nome;
            else if (ruolo === 'dirigente') {
              if (!team.dirigente) team.dirigente = nome;
              else if (!team.dirigente2) team.dirigente2 = nome;
            }
            else if (ruolo.includes('preparatore')) team.preparatore_atletico = team.preparatore_atletico || nome;
          });
        }
      }
      res.json(filteredData);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.put('/api/stagioni/:id', authMiddleware, async (req, res) => {
    try {
      const { nome, data_inizio, data_fine, attiva } = req.body;
      const update = {};
      if (nome !== undefined) update.nome = nome;
      if (data_inizio !== undefined) update.data_inizio = data_inizio;
      if (data_fine !== undefined) update.data_fine = data_fine;
      if (attiva !== undefined) {
        update.attiva = attiva;
        // Se si attiva una stagione, disattiva le altre dello stesso workspace
        if (attiva === true) {
          const { data: thisSeason } = await supabase.from('season').select('workspace_id').eq('id', req.params.id).single();
          if (thisSeason) {
            await supabase.from('season').update({ attiva: false }).eq('workspace_id', thisSeason.workspace_id).neq('id', req.params.id);
          }
        }
      }
      const { data, error } = await supabase.from('season').update(update).eq('id', req.params.id).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.post('/api/categorie/:catId/team', authMiddleware, async (req, res) => {
    try {
      const { season_id, nome } = req.body;
      if (!season_id) return res.status(400).json({ error: 'season_id richiesto' });
      const { data: cat } = await supabase.from('category').select('nome').eq('id', req.params.catId).single();
      const teamName = nome || cat?.nome || 'Squadra';
      const { data: existing } = await supabase.from('team').select('id').eq('season_id', season_id).eq('category_id', req.params.catId);
      if (existing && existing.length > 0) return res.status(400).json({ error: 'Team già esistente per questa categoria e stagione' });
      const { data, error } = await supabase.from('team').insert({ season_id, category_id: req.params.catId, nome: teamName }).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.status(201).json(data);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.delete('/api/stagioni/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      // Cascade: elimina tutti i dati associati ai team della stagione
      const { data: teams } = await supabase.from('team').select('id').eq('season_id', id);
      if (teams && teams.length > 0) {
        const teamIds = teams.map(t => t.id);
        // Elimina dati figli dei team
        await supabase.from('match_event').delete().in('match_id',
          (await supabase.from('match').select('id').in('team_id', teamIds)).data?.map(m => m.id) || []);
        await supabase.from('match_formation').delete().in('match_id',
          (await supabase.from('match').select('id').in('team_id', teamIds)).data?.map(m => m.id) || []);
        await supabase.from('match_statistics').delete().in('match_id',
          (await supabase.from('match').select('id').in('team_id', teamIds)).data?.map(m => m.id) || []);
        await supabase.from('convocation').delete().in('match_id',
          (await supabase.from('match').select('id').in('team_id', teamIds)).data?.map(m => m.id) || []);
        await supabase.from('match').delete().in('team_id', teamIds);
        await supabase.from('training_attendance').delete().in('training_id',
          (await supabase.from('training').select('id').in('team_id', teamIds)).data?.map(t => t.id) || []);
        await supabase.from('training').delete().in('team_id', teamIds);
        await supabase.from('training_config').delete().in('team_id', teamIds);
        await supabase.from('team_player').delete().in('team_id', teamIds);
        await supabase.from('team_staff').delete().in('team_id', teamIds);
        await supabase.from('team').delete().in('id', teamIds);
      }
      const { error } = await supabase.from('season').delete().eq('id', id);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Errore server' });
    }
  });

  // ── SQUADRE ──
  router.get('/api/squadre', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabase.from('team').select('*').order('nome');
      if (error) return res.status(400).json({ error: error.message });
      res.json(data || []);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.post('/api/squadre', authMiddleware, async (req, res) => {
    try {
      const { nome, categoria, allenatore, dirigente, season_id } = req.body;
      if (!nome) return res.status(400).json({ error: 'Nome richiesto' });
      const { data, error } = await supabase.from('team').insert({ nome, categoria, allenatore, dirigente, season_id }).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.status(201).json(data);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.get('/api/squadre/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase.from('team').select('*').eq('id', id).single();
      if (error || !data) return res.status(404).json({ error: 'Squadra non trovata' });

      const { data: staffAssign } = await supabase.from('team_staff').select('ruolo_squadra, staff:staff_id(nome, cognome)').eq('team_id', id);
      data._staff = (staffAssign || []).map(sa => ({ nome: sa.staff ? sa.staff.nome + ' ' + sa.staff.cognome : '', ruolo: sa.ruolo_squadra || '' })).filter(s => s.nome);
      if (staffAssign && staffAssign.length > 0) {
        staffAssign.forEach(sa => {
          const nome = sa.staff ? sa.staff.nome + ' ' + sa.staff.cognome : '';
          const ruolo = (sa.ruolo_squadra || '').toLowerCase();
          if (ruolo.includes('capo allenatore') || ruolo.includes('allenatore') && !ruolo.includes('portieri')) data.allenatore = data.allenatore || nome;
          if (ruolo.includes('dirigente')) data.dirigente = data.dirigente || nome;
          if (ruolo.includes('preparatore')) data.preparatore_atletico = data.preparatore_atletico || nome;
          if (ruolo.includes('portieri')) data.allenatore_portieri = data.allenatore_portieri || nome;
        });
      }
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.put('/api/squadre/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, categoria, allenatore, dirigente, dirigente2, preparatore_atletico, allenatore_portieri, matricola_dirigente, tessera_lnd_dirigente, tessera_figc_allenatore, classifica_url } = req.body;
      const updateData = { nome, categoria, allenatore, dirigente, dirigente2, preparatore_atletico, allenatore_portieri, matricola_dirigente, tessera_lnd_dirigente, tessera_figc_allenatore };
      if (classifica_url !== undefined) updateData.classifica_url = classifica_url;
      const { error } = await supabase.from('team').update(updateData).eq('id', id);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  router.delete('/api/squadre/:id', authMiddleware, async (req, res) => {
    try {
      const sid = req.params.id;
      const { data: partite } = await supabase.from('match').select('id').eq('team_id', sid);
      for (const p of (partite || [])) {
        await supabase.from('match_formation').delete().eq('match_id', p.id);
        await supabase.from('convocation').delete().eq('match_id', p.id);
        await supabase.from('match_event').delete().eq('match_id', p.id);
      }
      await supabase.from('match').delete().eq('team_id', sid);
      const { data: trainings } = await supabase.from('training').select('id').eq('team_id', sid);
      for (const t of (trainings || [])) {
        await supabase.from('training_attendance').delete().eq('training_id', t.id);
      }
      await supabase.from('training').delete().eq('team_id', sid);
      await supabase.from('team_player').delete().eq('team_id', sid);
      await supabase.from('team').delete().eq('id', sid);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
    }
  });

  return router;
};
