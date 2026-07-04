/**
 * Statistics routes — statistiche squadra e giocatori
 */
const express = require('express');
const { coreTeamName } = require('../helpers/importUtils');
function createStatisticsRouter({ supabase, authMiddleware }) {
  const router = express.Router();

  // GET /api/squadre/:id/statistiche-complete
  router.get('/api/squadre/:id/statistiche-complete', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { data: partite } = await supabase.from('match').select('id, gol_casa, gol_ospite, data_ora, avversario, luogo, competition:competition_id(nome), giornata').eq('team_id', id).or('stato.eq.Terminata,archiviata.eq.true').order('data_ora', { ascending: false });

      let vinte = 0, pareggiate = 0, perse = 0, golFatti = 0, golSubiti = 0;
      const risultati = [];

      // Fetch logos for matching
      const avversari = [...new Set((partite || []).map(p => p.avversario))];
      let logoMap = {};
      if (avversari.length > 0) {
        const { data: logos } = await supabase.from('team_logo').select('nome, nome_normalizzato, logo_path');
        if (logos) {
          logoMap = {};
          for (const logo of logos) {
            logoMap[logo.nome.toLowerCase()] = logo.logo_path;
            logoMap[logo.nome_normalizzato] = logo.logo_path;
          }
        }
      }

      function findLogo(avversario) {
        const lower = avversario.toLowerCase().trim();
        if (logoMap[lower]) return logoMap[lower];
        // Normalizzato con trattini
        const norm = lower.replace(/[^a-z0-9\u00e0-\u00fa]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (logoMap[norm]) return logoMap[norm];
        // Strip accents + compatto (senza separatori) per acronimi e varianti con accenti
        const stripAccents = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const compact = stripAccents(lower).replace(/[^a-z0-9]/g, '');
        for (const [key, path] of Object.entries(logoMap)) {
          const keyCompact = stripAccents(key).replace(/[^a-z0-9]/g, '');
          if (compact === keyCompact || compact.includes(keyCompact) || keyCompact.includes(compact)) return path;
        }
        // Fuzzy: cerca contenimento
        for (const [key, path] of Object.entries(logoMap)) {
          if (lower.includes(key) || key.includes(lower)) return path;
        }
        // Core name matching (abbreviazioni GR: Pol., C., Atl.)
        const coreAvv = coreTeamName(avversario);
        if (coreAvv) {
          for (const [key, path] of Object.entries(logoMap)) {
            const coreKey = coreTeamName(key);
            if (coreKey && (coreAvv === coreKey || coreAvv.includes(coreKey) || coreKey.includes(coreAvv))) return path;
          }
        }
        return null;
      }

      (partite || []).forEach(p => {
        const gc = p.gol_casa || 0, go = p.gol_ospite || 0;
        golFatti += gc; golSubiti += go;
        if (gc > go) vinte++; else if (gc === go) pareggiate++; else perse++;
        risultati.push({ id: p.id, dataOra: p.data_ora, avversario: p.avversario, luogo: p.luogo, competizione: p.competition?.nome || null, giornata: p.giornata || null, golFatti: gc, golSubiti: go, logo: findLogo(p.avversario) });
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

  // GET /api/squadre/:id/classifica — fetch live da Gazzetta Regionale
  router.get('/api/squadre/:id/classifica', authMiddleware, async (req, res) => {
    try {
      const { data: team } = await supabase.from('team').select('classifica_url, nome').eq('id', req.params.id).single();
      if (!team || !team.classifica_url) return res.json({ classifica: null });
      const { parseGrUrl, fetchClassifica } = require('../helpers/gazzettaRegionale');
      const parsed = parseGrUrl(team.classifica_url);
      if (!parsed) return res.json({ classifica: null });
      const result = await fetchClassifica(parsed.level, parsed.championship, parsed.group);
      res.json({ ...result, teamName: team.nome });
    } catch (err) {
      res.json({ classifica: null, error: err.message });
    }
  });

  // GET /api/squadre/:squadraId/stats-giocatori
  router.get('/api/squadre/:squadraId/stats-giocatori', authMiddleware, async (req, res) => {
    try {
      const teamId = req.params.squadraId;
      const { data: tps } = await supabase.from('team_player').select('id, player_id, ruolo_preferito, player:player_id(id, nome, cognome)').eq('team_id', teamId).neq('stato', 'Svincolato');
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

  // GET /api/partite/:matchId/report
  router.get('/api/partite/:matchId/report', authMiddleware, async (req, res) => {
    try {
      const { matchId } = req.params;
      const { data: match } = await supabase.from('match').select('*, competition:competition_id(nome), team:team_id(nome, season:season_id(workspace_id))').eq('id', matchId).single();
      if (!match) return res.status(404).json({ error: 'Partita non trovata' });

      // Workspace name
      const { data: ws } = await supabase.from('workspace').select('nome').eq('id', match.team?.season?.workspace_id).single();

      // Staff names from team_staff
      let allenatore = '', dirigente = '';
      const { data: teamStaff } = await supabase.from('team_staff').select('ruolo_squadra, staff:staff_id(nome, cognome)').eq('team_id', match.team_id);
      const allStaff = teamStaff || [];
      const coach = allStaff.find(ts => /allenatore/i.test(ts.ruolo_squadra));
      if (coach?.staff) allenatore = coach.staff.cognome + ' ' + coach.staff.nome;
      const dir = allStaff.find(ts => /dirigente/i.test(ts.ruolo_squadra));
      if (dir?.staff) dirigente = dir.staff.cognome + ' ' + dir.staff.nome;

      // Eventi
      const { data: events } = await supabase.from('match_event').select('tipo_evento, minuto, player_id').eq('match_id', matchId).order('minuto');
      // Player names
      const playerIds = [...new Set((events || []).map(e => e.player_id).filter(Boolean))];
      let playerMap = {};
      if (playerIds.length > 0) {
        const { data: players } = await supabase.from('player').select('id, nome, cognome').in('id', playerIds);
        (players || []).forEach(p => { playerMap[p.id] = p.cognome + ' ' + p.nome; });
      }

      // Match assist events to preceding goals
      const eventi = (events || []).map(e => ({
        tipo: e.tipo_evento,
        minuto: e.minuto,
        principale: playerMap[e.player_id] || 'Sconosciuto',
        secondario: null
      }));

      // Formazione
      const { data: formation } = await supabase.from('match_formation').select('team_player_id, is_starter, numero_maglia').eq('match_id', matchId);
      const tpIds = (formation || []).map(f => f.team_player_id);
      let giocatori = [];
      if (tpIds.length > 0) {
        const { data: tps } = await supabase.from('team_player').select('id, player:player_id(id, nome, cognome)').in('id', tpIds);
        const tpMap = {};
        (tps || []).forEach(tp => { tpMap[tp.id] = tp.player; });

        giocatori = (formation || []).map(f => {
          const p = tpMap[f.team_player_id];
          if (!p) return null;
          const pEvents = (events || []).filter(e => e.player_id === p.id);
          return {
            nome: p.nome || '', cognome: p.cognome || '',
            numeroMaglia: f.numero_maglia || '-',
            ruolo: f.is_starter ? 'T' : 'P',
            gol: pEvents.filter(e => e.tipo_evento === 'GOAL').length,
            assist: pEvents.filter(e => e.tipo_evento === 'ASSIST').length,
            ammonizioni: pEvents.filter(e => e.tipo_evento === 'YELLOW').length,
            espulsioni: pEvents.filter(e => e.tipo_evento === 'RED').length
          };
        }).filter(Boolean);
      } else {
        // Fallback: use convocations if no formation
        const { data: convs } = await supabase.from('convocation').select('team_player_id, presente').eq('match_id', matchId).eq('presente', true);
        if (convs && convs.length > 0) {
          const convTpIds = convs.map(c => c.team_player_id);
          const { data: tps } = await supabase.from('team_player').select('id, numero_maglia, player:player_id(id, nome, cognome)').in('id', convTpIds);
          giocatori = (tps || []).map(tp => {
            const p = tp.player;
            if (!p) return null;
            const pEvents = (events || []).filter(e => e.player_id === p.id);
            return {
              nome: p.nome || '', cognome: p.cognome || '',
              numeroMaglia: tp.numero_maglia || '-',
              ruolo: 'T',
              gol: pEvents.filter(e => e.tipo_evento === 'GOAL').length,
              assist: pEvents.filter(e => e.tipo_evento === 'ASSIST').length,
              ammonizioni: pEvents.filter(e => e.tipo_evento === 'YELLOW').length,
              espulsioni: pEvents.filter(e => e.tipo_evento === 'RED').length
            };
          }).filter(Boolean);
        }
      }

      const ammonizioni = (events || []).filter(e => e.tipo_evento === 'YELLOW').length;
      const espulsioni = (events || []).filter(e => e.tipo_evento === 'RED').length;

      res.json({
        societa: ws?.nome || '',
        allenatore,
        dirigente,
        partita: {
          avversario: match.avversario,
          dataOra: match.data_ora,
          competizione: match.competition?.nome || '',
          giornata: match.giornata,
          luogo: match.luogo,
          note: match.note
        },
        score: { golCasa: match.gol_casa || 0, golOspiti: match.gol_ospite || 0 },
        eventi,
        giocatori,
        ammonizioni,
        espulsioni
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/squadre/:squadraId/report-stagionale
  router.get('/api/squadre/:squadraId/report-stagionale', authMiddleware, async (req, res) => {
    try {
      const teamId = req.params.squadraId;
      const { data: team } = await supabase.from('team').select('nome, category:category_id(nome), season:season_id(nome, workspace_id)').eq('id', teamId).single();
      const { data: ws } = await supabase.from('workspace').select('nome').eq('id', team?.season?.workspace_id).single();

      const { data: partite } = await supabase.from('match').select('id, gol_casa, gol_ospite, data_ora, avversario, luogo, giornata, competition:competition_id(nome)').eq('team_id', teamId).or('stato.eq.Terminata,archiviata.eq.true').order('data_ora');

      // Loghi avversari
      const { data: logos } = await supabase.from('team_logo').select('nome, nome_normalizzato, logo_path');
      const logoMap = {};
      (logos || []).forEach(l => { logoMap[l.nome.toLowerCase()] = l.logo_path; if (l.nome_normalizzato) logoMap[l.nome_normalizzato] = l.logo_path; });
      function findLogo(avv) {
        const lower = (avv || '').toLowerCase().trim();
        if (logoMap[lower]) return logoMap[lower];
        const norm = lower.replace(/[^a-z0-9\u00e0-\u00fa]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (logoMap[norm]) return logoMap[norm];
        for (const [key, path] of Object.entries(logoMap)) { if (lower.includes(key) || key.includes(lower)) return path; }
        // Core name matching (abbreviazioni GR)
        const coreAvv = coreTeamName(avv || '');
        if (coreAvv) {
          for (const [key, path] of Object.entries(logoMap)) {
            const coreKey = coreTeamName(key);
            if (coreKey && (coreAvv === coreKey || coreAvv.includes(coreKey) || coreKey.includes(coreAvv))) return path;
          }
        }
        return null;
      }

      let v = 0, p = 0, s = 0, gf = 0, gs = 0;
      const partiteList = (partite || []).map(m => {
        const gc = m.gol_casa || 0, go = m.gol_ospite || 0;
        gf += gc; gs += go;
        if (gc > go) v++; else if (gc === go) p++; else s++;
        return { competizione: m.competition?.nome || 'Campionato', giornata: m.giornata, data: m.data_ora, avversario: m.avversario, luogo: m.luogo, golCasa: gc, golOspiti: go, logo: findLogo(m.avversario) };
      });

      // Top players
      const { data: tps } = await supabase.from('team_player').select('id, player:player_id(id, nome, cognome)').eq('team_id', teamId);
      const matchIds = (partite || []).map(m => m.id);
      let topMarcatori = [], topAssist = [], topPresenze = [];

      if (matchIds.length > 0) {
        const { data: events } = await supabase.from('match_event').select('tipo_evento, player_id').in('match_id', matchIds);
        const golCount = {}, assistCount = {};
        (events || []).forEach(e => {
          if (e.tipo_evento === 'GOAL') golCount[e.player_id] = (golCount[e.player_id] || 0) + 1;
          if (e.tipo_evento === 'ASSIST') assistCount[e.player_id] = (assistCount[e.player_id] || 0) + 1;
        });
        topMarcatori = (tps || []).filter(tp => golCount[tp.player?.id]).map(tp => ({ nome: tp.player.nome, cognome: tp.player.cognome, gol: golCount[tp.player.id] })).sort((a, b) => b.gol - a.gol).slice(0, 5);
        topAssist = (tps || []).filter(tp => assistCount[tp.player?.id]).map(tp => ({ nome: tp.player.nome, cognome: tp.player.cognome, assist: assistCount[tp.player.id] })).sort((a, b) => b.assist - a.assist).slice(0, 5);

        const { data: convs } = await supabase.from('convocation').select('team_player_id').in('match_id', matchIds).eq('presente', true);
        const presCount = {};
        (convs || []).forEach(c => { presCount[c.team_player_id] = (presCount[c.team_player_id] || 0) + 1; });
        topPresenze = (tps || []).filter(tp => presCount[tp.id]).map(tp => ({ nome: tp.player?.nome, cognome: tp.player?.cognome, presenze: presCount[tp.id] })).sort((a, b) => b.presenze - a.presenze).slice(0, 5);
      }

      const pg = (partite || []).length;
      res.json({
        societa: ws?.nome || '',
        squadra: { categoria: team?.category?.nome || team?.nome || '' },
        stagione: team?.season?.nome || '',
        punti: v * 3 + p,
        partiteGiocate: pg, vittorie: v, pareggi: p, sconfitte: s,
        golFatti: gf, golSubiti: gs, differenzaReti: gf - gs,
        topMarcatori, topAssist, topPresenze,
        partite: partiteList
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/calciatori/:playerId/report
  router.get('/api/calciatori/:playerId/report', authMiddleware, async (req, res) => {
    try {
      const { playerId } = req.params;
      const { data: player } = await supabase.from('player').select('*').eq('id', playerId).single();
      if (!player) return res.status(404).json({ error: 'Giocatore non trovato' });

      // Find all team_player records
      const { data: tps } = await supabase.from('team_player').select('id, team_id').eq('player_id', playerId);
      const teamIds = (tps || []).map(tp => tp.team_id);

      // All matches for those teams
      const { data: matches } = teamIds.length > 0
        ? await supabase.from('match').select('id, data_ora, avversario, giornata, competition:competition_id(nome)').in('team_id', teamIds).or('stato.eq.Terminata,archiviata.eq.true').order('data_ora')
        : { data: [] };
      const matchIds = (matches || []).map(m => m.id);

      // Events for this player
      let eventi = [];
      if (matchIds.length > 0) {
        const { data: evts } = await supabase.from('match_event').select('tipo_evento, minuto, match_id').eq('player_id', playerId).in('match_id', matchIds);
        eventi = evts || [];
      }

      // Presenze (convocazioni o formazioni)
      const tpIds = (tps || []).map(tp => tp.id);
      let presenze = 0;
      if (matchIds.length > 0 && tpIds.length > 0) {
        const { count } = await supabase.from('convocation').select('id', { count: 'exact', head: true }).in('team_player_id', tpIds).in('match_id', matchIds).eq('presente', true);
        presenze = count || 0;
      }

      const matchMap = {};
      (matches || []).forEach(m => { matchMap[m.id] = m; });

      const storico = eventi.map(e => {
        const m = matchMap[e.match_id];
        return {
          tipo: e.tipo_evento,
          minuto: e.minuto,
          competizione: m?.competition?.nome || '',
          giornata: m?.giornata || '',
          partita: m?.avversario || '',
          data: m?.data_ora || ''
        };
      });

      const gol = eventi.filter(e => e.tipo_evento === 'GOAL').length;
      const assist = eventi.filter(e => e.tipo_evento === 'ASSIST').length;
      const ammonizioni = eventi.filter(e => e.tipo_evento === 'YELLOW').length;
      const espulsioni = eventi.filter(e => e.tipo_evento === 'RED').length;

      res.json({
        giocatore: { nome: player.nome, cognome: player.cognome, data_nascita: player.data_nascita, nazionalita: player.nazionalita },
        stats: { partiteGiocate: presenze, gol, assist, ammonizioni, espulsioni },
        storico
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createStatisticsRouter;
