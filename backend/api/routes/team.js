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
        .select('*, category:category_id(id, nome, tipo_campionato, anno_da, anno_a)')
        .eq('season_id', id).order('nome');
      if (error) return res.status(400).json({ error: error.message });

      let filteredData = data || [];
      if (!req.user.is_superadmin && req.user.ruolo !== 'admin' && req.user.squadre_accesso && req.user.squadre_accesso.length > 0) {
        filteredData = filteredData.filter(t => !t.category_id || req.user.squadre_accesso.includes(t.category_id));
      }

      for (const team of filteredData) {
        const { data: staffAssign } = await supabase.from('team_staff').select('ruolo_squadra, staff:staff_id(nome, cognome)').eq('team_id', team.id);
        if (staffAssign && staffAssign.length > 0) {
          staffAssign.forEach(sa => {
            const nome = sa.staff ? sa.staff.nome + ' ' + sa.staff.cognome : '';
            const ruolo = (sa.ruolo_squadra || '').toLowerCase();
            if ((ruolo.includes('allenatore') || ruolo.includes('capo allenatore')) && !ruolo.includes('portieri')) team.allenatore = team.allenatore || nome;
            else if (ruolo.includes('portieri')) team.allenatore_portieri = team.allenatore_portieri || nome;
            else if (ruolo.includes('dirigente') || ruolo.includes('direttore')) {
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

  router.delete('/api/stagioni/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { data: teams } = await supabase.from('team').select('id').eq('season_id', id);
      if (teams && teams.length > 0) return res.status(400).json({ error: 'Elimina prima le squadre associate' });
      const { error } = await supabase.from('season').delete().eq('id', id);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Errore server' });
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
