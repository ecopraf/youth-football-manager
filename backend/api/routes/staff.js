/**
 * Staff routes — staff-completo per distinta
 */
const express = require('express');

function createStaffRouter({ supabase, authMiddleware }) {
  const router = express.Router();

  // GET /api/squadre/:squadraId/staff-completo
  router.get('/api/squadre/:squadraId/staff-completo', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabase.from('team_staff')
        .select('ruolo_squadra, staff:staff_id(id, nome, cognome, ruolo, qualifiche, documento, taglia, da_ordinare_kit)')
        .eq('team_id', req.params.squadraId);
      if (error) return res.status(400).json({ error: error.message });
      const result = (data || []).map(ts => {
        const s = ts.staff || {};
        const q = s.qualifiche || {};
        return {
          id: s.id,
          nome: s.nome,
          cognome: s.cognome,
          ruolo_squadra: ts.ruolo_squadra,
          taglia: s.taglia || null,
          da_ordinare_kit: s.da_ordinare_kit || false,
          matricola: q.matricola || '',
          tessera: q.tessera_figc || q.tessera_lnd || '',
          tipo_tessera: q.tipo_tessera || ''
        };
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/workspaces/:workspaceId/organigramma
  const RUOLI_ISTITUZIONALI = ['Presidente', 'Vice Presidente', 'Direttore Generale', 'Direttore Sportivo', 'Direttore Tecnico', 'Osservatore'];
  router.get('/api/workspaces/:workspaceId/organigramma', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabase.from('staff')
        .select('id, nome, cognome, ruolo, telefono, email')
        .eq('workspace_id', req.params.workspaceId)
        .in('ruolo', RUOLI_ISTITUZIONALI)
        .order('cognome');
      if (error) return res.status(400).json({ error: error.message });
      res.json(data || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createStaffRouter;
