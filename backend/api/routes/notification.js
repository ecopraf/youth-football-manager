const express = require('express');

module.exports = function createNotificationRouter({ supabase, authMiddleware }) {
  const router = express.Router();

  // GET /api/notifications — lista notifiche per l'utente corrente
  router.get('/api/notifications', authMiddleware, async (req, res) => {
    try {
      const user = req.user;
      const wsId = user.workspace_id;
      if (!wsId) return res.json([]);
      const profilo = user.permessi?.profilo || user.ruolo;

      let query = supabase.from('notification').select('*')
        .eq('workspace_id', wsId)
        .order('created_at', { ascending: false })
        .limit(50);

      // Filtra: destinate a questo utente specifico O al suo profilo
      const { data, error } = await query;
      if (error) return res.status(400).json({ error: error.message });

      // Filtra in memoria per destinatario
      const filtered = (data || []).filter(n => {
        if (n.destinatario_user_id === user.id) return true;
        if (n.destinatario_profilo && n.destinatario_profilo.includes(profilo)) return true;
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
      const profilo = user.permessi?.profilo || user.ruolo;

      const { data, error } = await supabase.from('notification').select('id, destinatario_user_id, destinatario_profilo')
        .eq('workspace_id', wsId)
        .eq('letto', false);
      if (error) return res.status(400).json({ error: error.message });

      const count = (data || []).filter(n => {
        if (n.destinatario_user_id === user.id) return true;
        if (n.destinatario_profilo && n.destinatario_profilo.includes(profilo)) return true;
        return false;
      }).length;

      res.json({ unread: count });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // PUT /api/notifications/:id/read — segna come letta
  router.put('/api/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
      const { error } = await supabase.from('notification').update({ letto: true }).eq('id', req.params.id);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
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

  return router;
};
