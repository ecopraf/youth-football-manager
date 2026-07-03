/**
 * Tournament Routes - CRUD tornei
 */
const express = require('express');

function createTournamentRouter({ supabase, authMiddleware, requirePermission }) {
  const router = express.Router();

  // GET /api/tornei - lista tornei del workspace
  router.get('/api/tornei', authMiddleware, async (req, res) => {
    try {
      const wsId = req.query.workspace_id || req.user.workspace_id;
      const { data, error } = await supabase
        .from('tournament')
        .select('*')
        .eq('workspace_id', wsId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data || []);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/tornei/:id
  router.get('/api/tornei/:id', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('tournament')
        .select('*')
        .eq('id', req.params.id)
        .single();
      if (error) throw error;
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/tornei
  router.post('/api/tornei', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
    try {
      const { nome, data_inizio, data_fine, sede, modalita, regolamento, squadre, team_id } = req.body;
      const wsId = req.body.workspace_id || req.user.workspace_id;
      const { data, error } = await supabase
        .from('tournament')
        .insert({
          workspace_id: wsId,
          team_id: team_id || null,
          nome,
          data_inizio: data_inizio || null,
          data_fine: data_fine || null,
          sede: sede || null,
          modalita: modalita || 'girone',
          regolamento: regolamento || {},
          squadre: squadre || [],
          stato: 'bozza'
        })
        .select()
        .single();
      if (error) throw error;
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // PUT /api/tornei/:id
  router.put('/api/tornei/:id', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
    try {
      const updates = {};
      const fields = ['nome', 'data_inizio', 'data_fine', 'sede', 'modalita', 'regolamento', 'squadre', 'stato', 'calendario'];
      fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
      const { data, error } = await supabase
        .from('tournament')
        .update(updates)
        .eq('id', req.params.id)
        .select()
        .single();
      if (error) throw error;
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE /api/tornei/:id
  router.delete('/api/tornei/:id', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
    try {
      const { error } = await supabase.from('tournament').delete().eq('id', req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = createTournamentRouter;
