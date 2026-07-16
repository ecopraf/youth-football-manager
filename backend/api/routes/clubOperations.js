module.exports = function createClubOpsRouter({ supabase, authMiddleware }) {
  const express = require('express');
  const router = express.Router();

  // GET /api/club-operations/summary — aggregato per dashboard segreteria
  router.get('/api/club-operations/summary', authMiddleware, async (req, res) => {
    const { team_id, season_id, workspace_id } = req.query;
    if (!team_id || !season_id) return res.status(400).json({ error: 'team_id e season_id richiesti' });

    const oggi = new Date().toISOString().split('T')[0];

    const [feesRes, kitStockRes, kitAssignsRes, chkRes, playersRes] = await Promise.all([
      supabase.from('fee').select('id, importo_totale, importo_pagato, stato, fee_installment(id, stato, scadenza)')
        .eq('team_id', team_id).eq('season_id', season_id),
      supabase.from('kit_stock').select('id, stato, template_id').eq('workspace_id', workspace_id),
      supabase.from('kit_assignment').select('id, player_id, kit_stock_id').eq('team_id', team_id).eq('season_id', season_id),
      supabase.from('registration_checklist').select('id, completamento_pct').eq('team_id', team_id).eq('season_id', season_id),
      supabase.from('team_player').select('player_id, player:player_id(data_visita_medica)').eq('team_id', team_id).in('stato', ['Attivo', 'Infortunato'])
    ]);

    const fees = feesRes.data || [];
    const kitStock = kitStockRes.data || [];
    const kitAssigns = kitAssignsRes.data || [];
    const checklists = chkRes.data || [];
    const players = playersRes.data || [];

    // Quote
    const quotePendenti = fees.filter(f => f.stato !== 'pagata').length;
    const rateScadute = fees.reduce((s, f) => s + (f.fee_installment || []).filter(i => i.stato !== 'pagata' && i.scadenza && i.scadenza.slice(0, 10) < oggi).length, 0);
    const totale = fees.reduce((s, f) => s + parseFloat(f.importo_totale || 0), 0);
    const incassato = fees.reduce((s, f) => s + parseFloat(f.importo_pagato || 0), 0);

    // Kit
    const kitDisponibili = kitStock.filter(s => s.stato === 'disponibile').length;
    const playersWithKit = new Set(kitAssigns.map(a => a.player_id)).size;

    // Checklist
    const chkIncompleti = checklists.filter(c => c.completamento_pct < 100).length;
    const chkAvg = checklists.length ? Math.round(checklists.reduce((s, c) => s + c.completamento_pct, 0) / checklists.length) : 0;

    // Certificati
    const certScaduti = players.filter(p => p.player?.data_visita_medica && p.player.data_visita_medica < oggi).length;
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const certInScadenza = players.filter(p => p.player?.data_visita_medica && p.player.data_visita_medica >= oggi && p.player.data_visita_medica <= in30).length;

    res.json({
      quote: { pendenti: quotePendenti, rate_scadute: rateScadute, totale, incassato },
      kit: { disponibili: kitDisponibili, giocatori_con_kit: playersWithKit, totale_giocatori: players.length },
      checklist: { incompleti: chkIncompleti, totale: checklists.length, media_pct: chkAvg },
      certificati: { scaduti: certScaduti, in_scadenza: certInScadenza }
    });
  });

  return router;
};
