/**
 * Absence Notification Routes — segnalazione assenze atleti
 */
const express = require('express');

module.exports = function createAbsenceRouter({ supabase, authMiddleware }) {
  const router = express.Router();

  const MOTIVI = ['Infortunio', 'Malattia', 'Impegni scolastici', 'Motivi familiari', 'Altro'];

  // POST /api/absence — atleta segnala assenza (guest con player_id)
  router.post('/api/absence', authMiddleware, async (req, res) => {
    try {
      const { player_id, team_id, training_id, data_allenamento, motivo, messaggio } = req.body;

      // Verifica: deve essere guest atleta con player_id oppure utente autenticato
      const pid = player_id || req.user.player_id;
      if (!pid) return res.status(400).json({ error: 'player_id richiesto' });
      if (!team_id || !data_allenamento || !motivo) return res.status(400).json({ error: 'Campi obbligatori: team_id, data_allenamento, motivo' });
      if (!MOTIVI.includes(motivo)) return res.status(400).json({ error: 'Motivo non valido' });

      const { data, error } = await supabase.from('absence_notification').insert({
        player_id: pid, team_id, training_id: training_id || null,
        data_allenamento, motivo, messaggio: messaggio || null
      }).select().single();

      if (error) return res.status(400).json({ error: error.message });
      res.status(201).json({ success: true, notification: data });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/absence/team/:teamId — lista notifiche per il mister (non lette prima)
  router.get('/api/absence/team/:teamId', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabase.from('absence_notification')
        .select('*, player:player_id(nome, cognome)')
        .eq('team_id', req.params.teamId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) return res.status(400).json({ error: error.message });
      res.json(data || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/absence/unread/:teamId — conteggio non lette + totali settimana (per badge)
  router.get('/api/absence/unread/:teamId', authMiddleware, async (req, res) => {
    try {
      const teamId = req.params.teamId;
      // Non lette
      const { count: unread, error } = await supabase.from('absence_notification')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('letto', false);
      if (error) return res.status(400).json({ error: error.message });

      // Totali settimana corrente (lun-dom)
      const now = new Date();
      const day = now.getDay(); // 0=dom
      const diffToMon = day === 0 ? 6 : day - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMon);
      monday.setHours(0, 0, 0, 0);

      const { count: weekTotal } = await supabase.from('absence_notification')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .gte('created_at', monday.toISOString());

      res.json({ unread: unread || 0, weekTotal: weekTotal || 0 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/absence/:id/read — segna come letta
  router.put('/api/absence/:id/read', authMiddleware, async (req, res) => {
    try {
      const { error } = await supabase.from('absence_notification')
        .update({ letto: true }).eq('id', req.params.id);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/absence/read-all/:teamId — segna tutte come lette
  router.put('/api/absence/read-all/:teamId', authMiddleware, async (req, res) => {
    try {
      const { error } = await supabase.from('absence_notification')
        .update({ letto: true }).eq('team_id', req.params.teamId).eq('letto', false);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/absence/player/:playerId — storico assenze di un atleta (per guest view)
  router.get('/api/absence/player/:playerId', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabase.from('absence_notification')
        .select('*')
        .eq('player_id', req.params.playerId)
        .order('data_allenamento', { ascending: false })
        .limit(20);

      if (error) return res.status(400).json({ error: error.message });
      res.json(data || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/absence/motivi — lista motivi disponibili
  router.get('/api/absence/motivi', (req, res) => {
    res.json(MOTIVI);
  });

  return router;
};
