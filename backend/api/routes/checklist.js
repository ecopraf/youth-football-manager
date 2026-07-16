const express = require('express');
const router = express.Router();

const DEFAULT_ITEMS = [
  { key: 'iscrizione', label: 'Iscrizione società' },
  { key: 'certificato', label: 'Certificato medico' },
  { key: 'gdpr', label: 'Consenso GDPR' },
  { key: 'quota', label: 'Quota stagionale' },
  { key: 'kit', label: 'Kit sportivo' },
  { key: 'foto', label: 'Foto tessera' },
  { key: 'tesseramento', label: 'Tesseramento FIGC' }
];

module.exports = function createChecklistRouter({ supabase, authMiddleware }) {

  // GET template checklist per workspace (items configurabili)
  router.get('/api/checklist-template', authMiddleware, async (req, res) => {
    const { workspace_id } = req.query;
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id richiesto' });
    const { data } = await supabase.from('workspace')
      .select('checklist_template').eq('id', workspace_id).single();
    res.json(data?.checklist_template || DEFAULT_ITEMS);
  });

  // PUT template checklist per workspace
  router.put('/api/checklist-template', authMiddleware, async (req, res) => {
    const { workspace_id, items } = req.body;
    if (!workspace_id || !Array.isArray(items)) return res.status(400).json({ error: 'workspace_id e items richiesti' });
    const { error } = await supabase.from('workspace')
      .update({ checklist_template: items }).eq('id', workspace_id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  });

  // GET checklist per team (tutti i giocatori)
  router.get('/api/checklist', authMiddleware, async (req, res) => {
    const { team_id, season_id } = req.query;
    if (!team_id || !season_id) return res.status(400).json({ error: 'team_id e season_id richiesti' });
    const { data, error } = await supabase.from('registration_checklist')
      .select('id, player_id, items, completamento_pct')
      .eq('team_id', team_id).eq('season_id', season_id);
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  });

  // GET checklist singolo giocatore
  router.get('/api/checklist/:playerId', authMiddleware, async (req, res) => {
    const { team_id, season_id } = req.query;
    if (!team_id || !season_id) return res.status(400).json({ error: 'team_id e season_id richiesti' });
    const { data } = await supabase.from('registration_checklist')
      .select('*').eq('player_id', req.params.playerId)
      .eq('team_id', team_id).eq('season_id', season_id).single();
    res.json(data || null);
  });

  // PUT aggiorna checklist giocatore (upsert)
  router.put('/api/checklist/:playerId', authMiddleware, async (req, res) => {
    const { team_id, season_id, items } = req.body;
    if (!team_id || !season_id || !Array.isArray(items)) return res.status(400).json({ error: 'Dati mancanti' });
    const completamento_pct = items.length ? Math.round(items.filter(i => i.done).length / items.length * 100) : 0;
    const { data, error } = await supabase.from('registration_checklist')
      .upsert({ player_id: req.params.playerId, team_id, season_id, items, completamento_pct, updated_at: new Date().toISOString() },
        { onConflict: 'player_id,team_id,season_id' }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  // POST genera checklist per tutta la squadra (batch)
  router.post('/api/checklist-generate', authMiddleware, async (req, res) => {
    const { team_id, season_id, workspace_id } = req.body;
    if (!team_id || !season_id) return res.status(400).json({ error: 'team_id e season_id richiesti' });
    // Fetch template
    const { data: ws } = await supabase.from('workspace')
      .select('checklist_template').eq('id', workspace_id).single();
    const templateItems = (ws?.checklist_template || DEFAULT_ITEMS).map(i => ({ ...i, done: false }));
    // Fetch roster
    const { data: players } = await supabase.from('team_player')
      .select('player_id').eq('team_id', team_id).in('stato', ['Attivo', 'Infortunato']);
    if (!players?.length) return res.json({ created: 0 });
    // Fetch existing
    const { data: existing } = await supabase.from('registration_checklist')
      .select('player_id').eq('team_id', team_id).eq('season_id', season_id);
    const existingIds = new Set((existing || []).map(e => e.player_id));
    const toInsert = players.filter(p => !existingIds.has(p.player_id))
      .map(p => ({ player_id: p.player_id, team_id, season_id, items: templateItems, completamento_pct: 0 }));
    if (!toInsert.length) return res.json({ created: 0 });
    const { data: inserted, error } = await supabase.from('registration_checklist').insert(toInsert).select('id');
    if (error) return res.status(400).json({ error: error.message });
    res.json({ created: (inserted || []).length });
  });

  return router;
};
