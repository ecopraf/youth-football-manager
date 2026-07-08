/**
 * Dashboard routes — endpoint aggregato per ridurre round-trip
 */
const express = require('express');
const { coreTeamName } = require('../helpers/importUtils');

function createDashboardRouter({ supabase, authMiddleware }) {
  const router = express.Router();

  // GET /api/squadre/:id/dashboard?tipo=campionato
  // Unifica: statistiche-complete + top-players + partite-future + allenamenti-futuri + injuries
  router.get('/api/squadre/:id/dashboard', authMiddleware, async (req, res) => {
    try {
      const teamId = req.params.id;
      const tipo = req.query.tipo || 'campionato';
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      // ── PARALLEL FETCH: tutti i dati indipendenti in una sola volta ──
      const [
        { data: partiteRaw },
        { data: players },
        { data: partiteFuture },
        { data: realTrainings },
        { data: configs },
        { data: injuries },
        { data: logos }
      ] = await Promise.all([
        supabase.from('match').select('id, gol_casa, gol_ospite, data_ora, avversario, luogo, tipo_competizione, giornata')
          .eq('team_id', teamId).or('stato.eq.Terminata,archiviata.eq.true').order('data_ora', { ascending: false }),
        supabase.from('team_player').select('id, player_id, player:player_id(id, nome, cognome, scadenza_visita_medica), numero_maglia')
          .eq('team_id', teamId).eq('stato', 'Attivo'),
        supabase.from('match').select('id, data_ora, avversario, luogo, tipo_competizione, giornata')
          .eq('team_id', teamId).gte('data_ora', todayStart).order('data_ora', { ascending: true }).limit(5),
        supabase.from('training').select('id, data_ora, durata_minuti, tipo, descrizione, note')
          .eq('team_id', teamId).gte('data_ora', now.toISOString()).order('data_ora', { ascending: true }).limit(20),
        supabase.from('training_config').select('giorno_settimana, ora_inizio, ora_fine, luogo')
          .eq('team_id', teamId),
        supabase.from('injury').select('id, player_id, tipo, data_inizio, data_prevista_rientro, note, player:player_id(nome, cognome)')
          .eq('team_id', teamId).is('data_fine', null),
        supabase.from('team_logo').select('nome, nome_normalizzato, logo_path')
      ]);

      // ── LOGO MATCHING (riusato per stats + partite future) ──
      const logoMap = {};
      (logos || []).forEach(l => {
        logoMap[l.nome.toLowerCase()] = l.logo_path;
        if (l.nome_normalizzato) logoMap[l.nome_normalizzato] = l.logo_path;
      });

      function findLogo(avversario) {
        if (!avversario) return null;
        const lower = avversario.toLowerCase().trim();
        if (logoMap[lower]) return logoMap[lower];
        const norm = lower.replace(/[^a-z0-9\u00e0-\u00fa]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (logoMap[norm]) return logoMap[norm];
        const stripAccents = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const compact = stripAccents(lower).replace(/[^a-z0-9]/g, '');
        for (const [key, path] of Object.entries(logoMap)) {
          const keyCompact = stripAccents(key).replace(/[^a-z0-9]/g, '');
          if (compact === keyCompact || compact.includes(keyCompact) || keyCompact.includes(compact)) return path;
        }
        for (const [key, path] of Object.entries(logoMap)) {
          if (lower.includes(key) || key.includes(lower)) return path;
        }
        const coreAvv = coreTeamName(avversario);
        if (coreAvv) {
          for (const [key, path] of Object.entries(logoMap)) {
            const coreKey = coreTeamName(key);
            if (coreKey && (coreAvv === coreKey || coreAvv.includes(coreKey) || coreKey.includes(coreAvv))) return path;
          }
        }
        return null;
      }

      // ── 1. STATISTICHE COMPLETE (filtrate per tipo) ──
      let partite = partiteRaw || [];
      if (tipo === 'campionato') partite = partite.filter(p => p.tipo_competizione === 'Campionato');
      else if (tipo === 'ufficiali') partite = partite.filter(p => p.tipo_competizione === 'Campionato' || p.tipo_competizione === 'Coppa');
      else if (tipo === 'coppa') partite = partite.filter(p => p.tipo_competizione === 'Coppa');
      else if (tipo === 'amichevoli') partite = partite.filter(p => p.tipo_competizione === 'Amichevole' || p.tipo_competizione === 'Torneo' || !p.tipo_competizione);

      let vinte = 0, pareggiate = 0, perse = 0, golFatti = 0, golSubiti = 0;
      const risultati = [];
      partite.forEach(p => {
        const gc = p.gol_casa || 0, go = p.gol_ospite || 0;
        golFatti += gc; golSubiti += go;
        if (gc > go) vinte++; else if (gc === go) pareggiate++; else perse++;
        risultati.push({ id: p.id, dataOra: p.data_ora, avversario: p.avversario, luogo: p.luogo, competizione: p.tipo_competizione || null, tipoCompetizione: p.tipo_competizione || null, giornata: p.giornata || null, golFatti: gc, golSubiti: go, logo: findLogo(p.avversario) });
      });

      const stats = {
        punti: vinte * 3 + pareggiate, partiteGiocate: partite.length,
        vittorie: vinte, pareggi: pareggiate, sconfitte: perse,
        golFatti, golSubiti, differenzaReti: golFatti - golSubiti, risultati
      };

      // ── 2. TOP PLAYERS (gol, assist, presenze) ──
      let topPlayers = { marcatori: [], assistmen: [], presenze: [] };
      const matchIds = partite.map(p => p.id);
      if (matchIds.length > 0 && players && players.length > 0) {
        const tpIds = players.map(p => p.id);
        const [{ data: events }, { data: convs }, { data: statsData }] = await Promise.all([
          supabase.from('match_event').select('tipo_evento, player_id').in('match_id', matchIds),
          supabase.from('convocation').select('team_player_id').in('match_id', matchIds).eq('presente', true),
          supabase.from('match_statistics').select('team_player_id, minuti_giocati').in('team_player_id', tpIds).in('match_id', matchIds)
        ]);

        const golCount = {}, assistCount = {};
        (events || []).forEach(e => {
          if (e.tipo_evento === 'GOAL') golCount[e.player_id] = (golCount[e.player_id] || 0) + 1;
          if (e.tipo_evento === 'ASSIST') assistCount[e.player_id] = (assistCount[e.player_id] || 0) + 1;
        });
        const presCount = {};
        (convs || []).forEach(c => { presCount[c.team_player_id] = (presCount[c.team_player_id] || 0) + 1; });
        const minCount = {};
        (statsData || []).forEach(s => { minCount[s.team_player_id] = (minCount[s.team_player_id] || 0) + (s.minuti_giocati || 0); });

        topPlayers.marcatori = players.filter(p => golCount[p.player?.id]).map(p => ({ id: p.player.id, nome: p.player.cognome + ' ' + p.player.nome, gol: golCount[p.player.id], presenze: presCount[p.id] || 0 })).sort((a, b) => b.gol - a.gol).slice(0, 5);
        topPlayers.assistmen = players.filter(p => assistCount[p.player?.id]).map(p => ({ id: p.player.id, nome: p.player.cognome + ' ' + p.player.nome, assist: assistCount[p.player.id], presenze: presCount[p.id] || 0 })).sort((a, b) => b.assist - a.assist).slice(0, 5);
        topPlayers.presenze = players.filter(p => presCount[p.id]).map(p => ({ id: p.player?.id, nome: p.player?.cognome + ' ' + p.player?.nome, presenze: presCount[p.id], minuti: minCount[p.id] || 0 })).sort((a, b) => b.minuti - a.minuti || b.presenze - a.presenze).slice(0, 5);
      }

      // ── 3. PARTITE FUTURE (con logo) ──
      const prossimePartite = (partiteFuture || []).map(m => ({
        ...m, competizione: m.tipo_competizione || null, tipoCompetizione: m.tipo_competizione || null, logo: findLogo(m.avversario)
      }));

      // ── 4. ALLENAMENTI FUTURI (reali + virtuali da config) ──
      const realDates = new Set((realTrainings || []).map(t => t.data_ora.substring(0, 10)));
      const virtual = [];
      if (configs && configs.length > 0) {
        for (let dayOffset = 0; dayOffset <= 21; dayOffset++) {
          const d = new Date(now);
          d.setDate(d.getDate() + dayOffset);
          const weekday = d.getDay();
          const config = configs.find(c => c.giorno_settimana === weekday);
          if (!config) continue;
          const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
          if (realDates.has(dateStr)) continue;
          const [h, m] = (config.ora_inizio || '17:00').split(':');
          d.setHours(parseInt(h), parseInt(m), 0, 0);
          if (d <= now) continue;
          virtual.push({ id: `virtual_${dateStr}`, data_ora: d.toISOString(), durata_minuti: null, tipo: null, descrizione: null, luogo: config.luogo || null, virtuale: true });
        }
      }
      const configMap = {};
      (configs || []).forEach(c => { configMap[c.giorno_settimana] = c.luogo; });
      const allenamenti = [...(realTrainings || []).map(t => {
        const day = new Date(t.data_ora).getDay();
        return { ...t, luogo: configMap[day] || null, virtuale: false };
      }), ...virtual].sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora)).slice(0, 20);

      // ── 5. INFORTUNATI ATTIVI ──
      const infortunati = (injuries || []).map(i => ({
        id: i.id, player_id: i.player_id, nome: i.player?.nome, cognome: i.player?.cognome,
        tipo: i.tipo, data_inizio: i.data_inizio, data_prevista_rientro: i.data_prevista_rientro, note: i.note
      }));

      // ── 6. CERTIFICATI MEDICI (da dati già fetchati in players) ──
      const today = new Date();
      const in30gg = new Date(today);
      in30gg.setDate(in30gg.getDate() + 30);
      const todayStr = today.toISOString().substring(0, 10);
      const in30Str = in30gg.toISOString().substring(0, 10);

      let certificati = { scaduti: 0, inScadenza: 0, validi: 0, mancanti: 0, dettaglio: [] };
      (players || []).forEach(tp => {
        const p = tp.player;
        if (!p) return;
        if (!p.scadenza_visita_medica) {
          certificati.mancanti++;
        } else if (p.scadenza_visita_medica < todayStr) {
          certificati.scaduti++;
          certificati.dettaglio.push({ id: p.id, nome: p.nome, cognome: p.cognome, scadenza: p.scadenza_visita_medica, stato: 'scaduto' });
        } else if (p.scadenza_visita_medica <= in30Str) {
          certificati.inScadenza++;
          certificati.dettaglio.push({ id: p.id, nome: p.nome, cognome: p.cognome, scadenza: p.scadenza_visita_medica, stato: 'in_scadenza' });
        } else {
          certificati.validi++;
        }
      });

      // ── RISPOSTA AGGREGATA ──
      res.json({ stats, topPlayers, prossimePartite, allenamenti, infortunati, certificati });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createDashboardRouter;
