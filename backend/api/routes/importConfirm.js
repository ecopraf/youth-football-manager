/**
 * Import Confirm routes — confirm-tuttocampo, import-formations-batch, matches-without-formation
 */
const express = require('express');
const { tcLogin } = require('../helpers/tuttocampo');
const { normalizeForMatch, logImport } = require('../helpers/importUtils');
const { importFormationFromTC } = require('../helpers/importFormationTC');

function createImportConfirmRouter({ supabase, authMiddleware, requirePermission }) {
  const router = express.Router();

  // POST /api/calendario/confirm-tuttocampo
  router.post('/api/calendario/confirm-tuttocampo', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
    try {
      const { squadraId, partite, importResults, archiveCompleted, competizione, importEvents, importFormations, teamName } = req.body;
      if (!squadraId || !partite || !partite.length) return res.status(400).json({ error: 'Dati mancanti' });

      let tipoComp = competizione || 'Amichevole';

      let roster = [];
      if (importEvents) {
        const { data: rosterData } = await supabase.from('team_player').select('id, player_id, player:player_id(nome, cognome)').eq('team_id', squadraId);
        roster = rosterData || [];
      }

      function findPlayer(nome) {
        if (!nome || roster.length === 0) return null;
        const searchLower = nome.toLowerCase().trim();
        const searchParts = searchLower.split(/\s+/);
        // 1. Exact cognome
        let found = roster.find(r => r.player && r.player.cognome.toLowerCase() === searchLower);
        if (found) return found.player_id;
        // 2. Cognome contenuto nel search o viceversa
        found = roster.find(r => r.player && (searchLower.includes(r.player.cognome.toLowerCase()) || r.player.cognome.toLowerCase().includes(searchLower)));
        if (found) return found.player_id;
        // 3. Multi-word: una parola matcha cognome + altra matcha nome (es. "Ercole Salazar" → cognome Salazar, nome Tristan Ercole)
        if (searchParts.length >= 2) {
          found = roster.find(r => r.player && searchParts.some(p => r.player.cognome.toLowerCase() === p) && searchParts.some(p => r.player.nome.toLowerCase().includes(p)));
          if (found) return found.player_id;
        }
        return null;
      }

      const { data: existingMatches } = await supabase.from('match').select('id, avversario, giornata, luogo').eq('team_id', squadraId);
      const existing = existingMatches || [];

      function findExistingMatch(p) {
        if (p.giornata) {
          const byGiornata = existing.find(m => m.giornata === p.giornata);
          if (byGiornata) return byGiornata;
        }
        const avvNorm = normalizeForMatch(p.avversario);
        return existing.find(m => {
          const mNorm = normalizeForMatch(m.avversario);
          return mNorm === avvNorm || mNorm.includes(avvNorm) || avvNorm.includes(mNorm);
        });
      }

      let inserite = 0, aggiornate = 0, eventiImportati = 0;

      for (const p of partite) {
        if (!p.avversario) continue;
        const existMatch = findExistingMatch(p);

        if (existMatch) {
          const updateData = {};
          if (importResults && p.golCasa !== null && p.golOspite !== null) {
            updateData.gol_casa = p.golCasa; updateData.gol_ospite = p.golOspite;
            updateData.stato = 'Terminata';
            if (archiveCompleted) updateData.archiviata = true;
          }
          if (p.detailLink) updateData.tc_match_url = p.detailLink;
          if (tipoComp) updateData.tipo_competizione = tipoComp;
          if (Object.keys(updateData).length > 0) await supabase.from('match').update(updateData).eq('id', existMatch.id);
          aggiornate++;

          if (importEvents && p.marcatori && p.marcatori.length > 0) {
            const eventInserts = p.marcatori.map(m => ({ match_id: existMatch.id, tipo_evento: m.tipo || 'GOAL', minuto: m.minuto || null, player_id: findPlayer(m.nome) || null })).filter(e => e.player_id);
            if (eventInserts.length > 0) {
              await supabase.from('match_event').delete().eq('match_id', existMatch.id).eq('tipo_evento', 'GOAL');
              const { error: evErr } = await supabase.from('match_event').insert(eventInserts);
              if (!evErr) eventiImportati += eventInserts.length;
            }
          }
          continue;
        }

        // INSERT nuova partita
        let dataOra = p.dataOra ? new Date(p.dataOra).toISOString() : null;
        if (!dataOra) {
          const prevMatch = partite.find(x => x.giornata === (p.giornata - 1) && x.dataOra);
          const nextMatch = partite.find(x => x.giornata === (p.giornata + 1) && x.dataOra);
          if (prevMatch) { const d = new Date(prevMatch.dataOra); d.setDate(d.getDate() + 7); dataOra = d.toISOString(); }
          else if (nextMatch) { const d = new Date(nextMatch.dataOra); d.setDate(d.getDate() - 7); dataOra = d.toISOString(); }
          else { dataOra = new Date('2026-01-01T15:00:00').toISOString(); }
        }

        const insertData = {
          team_id: squadraId, data_ora: dataOra, avversario: p.avversario,
          luogo: p.luogo || 'Casa', giornata: p.giornata || null,
          tipo_competizione: tipoComp, tc_match_url: p.detailLink || null
        };
        if (importResults && p.golCasa !== null && p.golOspite !== null) {
          insertData.gol_casa = p.golCasa; insertData.gol_ospite = p.golOspite;
          insertData.stato = 'Terminata';
          if (archiveCompleted) insertData.archiviata = true;
        }

        const { data: inserted, error } = await supabase.from('match').insert(insertData).select('id').single();
        if (!error && inserted) {
          inserite++;
          if (importEvents && p.marcatori && p.marcatori.length > 0 && inserted.id) {
            const eventInserts = p.marcatori.map(m => ({ match_id: inserted.id, tipo_evento: m.tipo || 'GOAL', minuto: m.minuto || null, player_id: findPlayer(m.nome) || null })).filter(e => e.player_id);
            if (eventInserts.length > 0) {
              const { error: evErr } = await supabase.from('match_event').insert(eventInserts);
              if (!evErr) eventiImportati += eventInserts.length;
            }
          }
        }
      }

      // Import formazioni se richiesto
      let formazioniImportate = 0;
      if (importFormations && inserite > 0) {
        const { data: insertedMatches } = await supabase.from('match').select('id, tc_match_url, avversario').eq('team_id', squadraId).not('tc_match_url', 'is', null).order('data_ora', { ascending: true });
        if (insertedMatches && insertedMatches.length > 0) {
          const tcCookies = await tcLogin();
          for (const m of insertedMatches) {
            try {
              const count = await importFormationFromTC(m.id, m.tc_match_url, squadraId, teamName, supabase, tcCookies);
              if (count > 0) formazioniImportate++;
            } catch (e) { /* skip */ }
          }
        }
      }

      const team = await supabase.from('team').select('season_id').eq('id', squadraId).single();
      const season = team.data ? await supabase.from('season').select('workspace_id').eq('id', team.data.season_id).single() : null;
      await logImport(supabase, {
        workspace_id: season?.data?.workspace_id, team_id: squadraId, user_id: req.user.id,
        tipo: 'calendario_tuttocampo', fonte: 'Tuttocampo',
        dettagli: { eventi: eventiImportati, formazioni: formazioniImportate },
        record_importati: inserite, record_saltati: 0
      });

      res.json({ success: true, inserite, aggiornate, eventiImportati, formazioniImportate });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/import-formations-batch
  router.post('/api/import-formations-batch', authMiddleware, requirePermission('formazione', 'write'), async (req, res) => {
    try {
      const { matchIds, teamId, teamName } = req.body;
      if (!matchIds || !matchIds.length || !teamId || !teamName) return res.status(400).json({ error: 'Dati mancanti' });

      const { data: matches, error } = await supabase.from('match').select('id, tc_match_url, avversario').in('id', matchIds).not('tc_match_url', 'is', null);
      if (error) return res.status(400).json({ error: error.message });

      let imported = 0;
      const results = [];
      const tcCookies = await tcLogin();
      if (!tcCookies) return res.status(503).json({ error: 'Tuttocampo non raggiungibile.' });

      for (const m of matches) {
        try {
          const count = await importFormationFromTC(m.id, m.tc_match_url, teamId, teamName, supabase, tcCookies);
          if (count > 0) imported++;
          results.push({ matchId: m.id, avversario: m.avversario, count, ok: true });
        } catch (e) {
          results.push({ matchId: m.id, avversario: m.avversario, error: e.message, ok: false });
        }
      }

      const team = await supabase.from('team').select('season_id').eq('id', teamId).single();
      const season = team.data ? await supabase.from('season').select('workspace_id').eq('id', team.data.season_id).single() : null;
      await logImport(supabase, {
        workspace_id: season?.data?.workspace_id, team_id: teamId, user_id: req.user.id,
        tipo: 'formazioni_tuttocampo', fonte: 'Tuttocampo batch',
        dettagli: { matchCount: matches.length, results },
        record_importati: imported, record_saltati: matches.length - imported
      });

      res.json({ imported, total: matches.length, results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/matches-without-formation
  router.get('/api/matches-without-formation', authMiddleware, async (req, res) => {
    try {
      const teamId = req.query.team_id;
      if (!teamId) return res.status(400).json({ error: 'team_id richiesto' });

      const { data: matches, error } = await supabase.from('match').select('id, avversario, data_ora, tc_match_url, giornata').eq('team_id', teamId).not('tc_match_url', 'is', null).order('data_ora', { ascending: false });
      if (error) return res.status(400).json({ error: error.message });

      const matchIds = matches.map(m => m.id);
      if (matchIds.length === 0) return res.json([]);

      const { data: formations } = await supabase.from('match_formation').select('match_id').in('match_id', matchIds);
      const hasFormation = new Set((formations || []).map(f => f.match_id));
      res.json(matches.map(m => ({ ...m, has_formation: hasFormation.has(m.id) })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createImportConfirmRouter;
