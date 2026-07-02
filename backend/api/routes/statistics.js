/**
 * Statistics routes — statistiche squadra e giocatori
 */
const express = require('express');

function createStatisticsRouter({ supabase, authMiddleware }) {
  const router = express.Router();

  // GET /api/squadre/:id/statistiche-complete
  router.get('/api/squadre/:id/statistiche-complete', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { data: partite } = await supabase.from('match').select('id, gol_casa, gol_ospite, data_ora, avversario, luogo, competition:competition_id(nome), giornata').eq('team_id', id).or('stato.eq.Terminata,archiviata.eq.true').order('data_ora', { ascending: false });

      let vinte = 0, pareggiate = 0, perse = 0, golFatti = 0, golSubiti = 0;
      const risultati = [];

      (partite || []).forEach(p => {
        const gc = p.gol_casa || 0, go = p.gol_ospite || 0;
        golFatti += gc; golSubiti += go;
        if (gc > go) vinte++; else if (gc === go) pareggiate++; else perse++;
        risultati.push({ id: p.id, dataOra: p.data_ora, avversario: p.avversario, luogo: p.luogo, competizione: p.competition?.nome || null, golFatti: gc, golSubiti: go });
      });

      const partiteGiocate = (partite || []).length;
      res.json({ punti: vinte * 3 + pareggiate, partiteGiocate, vittorie: vinte, pareggi: pareggiate, sconfitte: perse, golFatti, golSubiti, differenzaReti: golFatti - golSubiti, risultati });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/squadre/:id/top-players
  router.get('/api/squadre/:id/top-players', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { data: players } = await supabase.from('team_player').select('id, player:player_id(id, nome, cognome), numero_maglia').eq('team_id', id);
      if (!players || players.length === 0) return res.json({ marcatori: [], assistmen: [], presenze: [] });

      const { data: matches } = await supabase.from('match').select('id').eq('team_id', id).eq('stato', 'Terminata');
      const matchIds = (matches || []).map(m => m.id);
      if (matchIds.length === 0) return res.json({ marcatori: [], assistmen: [], presenze: [] });

      const { data: events } = await supabase.from('match_event').select('tipo_evento, player_id').in('match_id', matchIds);
      const golCount = {}, assistCount = {};
      (events || []).forEach(e => {
        if (e.tipo_evento === 'GOAL') golCount[e.player_id] = (golCount[e.player_id] || 0) + 1;
        if (e.tipo_evento === 'ASSIST') assistCount[e.player_id] = (assistCount[e.player_id] || 0) + 1;
      });

      const marcatori = players.filter(p => golCount[p.player?.id]).map(p => ({ id: p.player.id, nome: p.player.cognome + ' ' + p.player.nome, gol: golCount[p.player.id] })).sort((a, b) => b.gol - a.gol).slice(0, 5);
      const assistmen = players.filter(p => assistCount[p.player?.id]).map(p => ({ id: p.player.id, nome: p.player.cognome + ' ' + p.player.nome, assist: assistCount[p.player.id] })).sort((a, b) => b.assist - a.assist).slice(0, 5);

      const { data: convs } = await supabase.from('convocation').select('team_player_id').in('match_id', matchIds).eq('presente', true);
      const presCount = {};
      (convs || []).forEach(c => { presCount[c.team_player_id] = (presCount[c.team_player_id] || 0) + 1; });
      const presenze = players.filter(p => presCount[p.id]).map(p => ({ id: p.player?.id, nome: p.player?.cognome + ' ' + p.player?.nome, presenze: presCount[p.id] })).sort((a, b) => b.presenze - a.presenze).slice(0, 5);

      res.json({ marcatori, assistmen, presenze });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/squadre/:id/valutazioni-top
  router.get('/api/squadre/:id/valutazioni-top', authMiddleware, async (req, res) => {
    try {
      const { data: teamPlayers } = await supabase.from('team_player').select('id').eq('team_id', req.params.id);
      const teamPlayerIds = teamPlayers?.map(tp => tp.id) || [];
      if (teamPlayerIds.length === 0) return res.json([]);

      const { data: stats } = await supabase.from('match_statistics').select(`*, team_player:team_player_id(id, player:player_id(id, nome, cognome), numero_maglia)`).in('team_player_id', teamPlayerIds).order('minuti_giocati', { ascending: false }).limit(10);
      res.json(stats || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/squadre/:squadraId/stats-giocatori
  router.get('/api/squadre/:squadraId/stats-giocatori', authMiddleware, async (req, res) => {
    try {
      const teamId = req.params.squadraId;
      const { data: tps } = await supabase.from('team_player').select('id, player_id, ruolo_preferito, player:player_id(id, nome, cognome)').eq('team_id', teamId);
      const { data: matches } = await supabase.from('match').select('id').eq('team_id', teamId).eq('stato', 'Terminata');
      const matchIds = (matches || []).map(m => m.id);

      let formazioni = [], eventi = [];
      if (matchIds.length > 0) {
        const { data: f } = await supabase.from('match_formation').select('match_id, team_player_id, is_starter').in('match_id', matchIds);
        formazioni = f || [];
        const { data: e } = await supabase.from('match_event').select('tipo_evento, player_id').in('match_id', matchIds);
        eventi = e || [];
      }

      const tpToPlayer = {}, playerStats = {};
      (tps || []).forEach(tp => {
        tpToPlayer[tp.id] = tp.player_id;
        const p = tp.player;
        if (p) playerStats[p.id] = { id: p.id, nome: p.nome, cognome: p.cognome, ruolo: tp.ruolo_preferito || '', presenze: 0, gol: 0, assist: 0, ammonizioni: 0, espulsioni: 0 };
      });

      formazioni.filter(f => f.is_starter).forEach(f => {
        const pid = tpToPlayer[f.team_player_id];
        if (pid && playerStats[pid]) playerStats[pid].presenze++;
      });

      // Fallback: partite senza formazione → usa convocazioni
      const matchesWithFormation = new Set(formazioni.map(f => f.match_id));
      const matchesWithoutFormation = matchIds.filter(mid => !matchesWithFormation.has(mid));
      if (matchesWithoutFormation.length > 0) {
        const { data: convs } = await supabase.from('convocation').select('match_id, team_player_id, presente').in('match_id', matchesWithoutFormation).eq('presente', true);
        (convs || []).forEach(cv => {
          const pid = tpToPlayer[cv.team_player_id];
          if (pid && playerStats[pid]) playerStats[pid].presenze++;
        });
      }

      eventi.forEach(e => {
        if (!e.player_id || !playerStats[e.player_id]) return;
        if (e.tipo_evento === 'GOAL') playerStats[e.player_id].gol++;
        if (e.tipo_evento === 'ASSIST') playerStats[e.player_id].assist++;
        if (e.tipo_evento === 'YELLOW') playerStats[e.player_id].ammonizioni++;
        if (e.tipo_evento === 'RED') playerStats[e.player_id].espulsioni++;
      });

      res.json({ stats: Object.values(playerStats), partiteGiocate: matchIds.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createStatisticsRouter;
