/**
 * Gazzetta Regionale Routes — classifica, calendario, marcatori, loghi
 */
const express = require('express');
const { parseGrUrl, fetchClassifica, fetchCalendario, fetchMarcatori, extractLogos, fetchLevels, fetchChampionships, fetchGroups } = require('../helpers/gazzettaRegionale');
const { normalizeTeamName } = require('../helpers/importUtils');
const path = require('path');
const fs = require('fs');

module.exports = function createGazzettaRegionaleRouter({ supabase, authMiddleware }) {
  const router = express.Router();

  // GET /api/gr/levels — lista livelli (Giovanili, Dilettanti...)
  router.get('/api/gr/levels', authMiddleware, async (req, res) => {
    try { res.json(await fetchLevels()); } catch (e) { res.json([]); }
  });

  // GET /api/gr/championships/:levelId — lista campionati per livello
  router.get('/api/gr/championships/:levelId', authMiddleware, async (req, res) => {
    try { res.json(await fetchChampionships(req.params.levelId)); } catch (e) { res.json([]); }
  });

  // GET /api/gr/groups/:levelId/:championshipId — lista gironi
  router.get('/api/gr/groups/:levelId/:championshipId', authMiddleware, async (req, res) => {
    try { res.json(await fetchGroups(req.params.levelId, req.params.championshipId)); } catch (e) { res.json([]); }
  });

  // GET /api/gr/preview/:levelId/:championshipId/:groupId — anteprima classifica per conferma
  router.get('/api/gr/preview/:levelId/:championshipId/:groupId', authMiddleware, async (req, res) => {
    try {
      const { levelId, championshipId, groupId } = req.params;
      const result = await fetchClassifica(levelId, championshipId, groupId);
      res.json(result);
    } catch (e) { res.json({ classifica: [], error: e.message }); }
  });

  // POST /api/gr/configure — salva URL GR per il team
  router.post('/api/gr/configure', authMiddleware, async (req, res) => {
    try {
      const { teamId, url } = req.body;
      if (!teamId || !url) return res.status(400).json({ error: 'teamId e url richiesti' });
      const parsed = parseGrUrl(url);
      if (!parsed) return res.status(400).json({ error: 'URL non valido. Formato: .../1/55/2325' });

      const apiUrl = `https://v2.apiweb.gazzettaregionale.it/classifiche/levels/${parsed.level}/${parsed.championship}/${parsed.group}/classifica`;
      const { error } = await supabase.from('team').update({ classifica_url: apiUrl }).eq('id', teamId);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, parsed });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/gr/classifica/:teamId — classifica live
  router.get('/api/gr/classifica/:teamId', authMiddleware, async (req, res) => {
    try {
      const { data: team } = await supabase.from('team').select('classifica_url, nome').eq('id', req.params.teamId).single();
      if (!team || !team.classifica_url) return res.json({ classifica: null });
      const parsed = parseGrUrl(team.classifica_url);
      if (!parsed) return res.json({ classifica: null });
      const result = await fetchClassifica(parsed.level, parsed.championship, parsed.group);
      res.json({ ...result, teamName: team.nome });
    } catch (err) {
      res.json({ classifica: null, error: err.message });
    }
  });

  // GET /api/gr/calendario/:teamId — calendario completo
  router.get('/api/gr/calendario/:teamId', authMiddleware, async (req, res) => {
    try {
      const { data: team } = await supabase.from('team').select('classifica_url, nome').eq('id', req.params.teamId).single();
      if (!team || !team.classifica_url) return res.json({ matches: [] });
      const parsed = parseGrUrl(team.classifica_url);
      if (!parsed) return res.json({ matches: [] });
      const result = await fetchCalendario(parsed.level, parsed.championship, parsed.group);
      res.json({ ...result, teamName: team.nome });
    } catch (err) {
      res.json({ matches: [], error: err.message });
    }
  });

  // GET /api/gr/marcatori/:teamId — classifica marcatori
  router.get('/api/gr/marcatori/:teamId', authMiddleware, async (req, res) => {
    try {
      const { data: team } = await supabase.from('team').select('classifica_url, nome').eq('id', req.params.teamId).single();
      if (!team || !team.classifica_url) return res.json({ marcatori: [] });
      const parsed = parseGrUrl(team.classifica_url);
      if (!parsed) return res.json({ marcatori: [] });
      const result = await fetchMarcatori(parsed.level, parsed.championship, parsed.group);
      res.json({ ...result, teamName: team.nome });
    } catch (err) {
      res.json({ marcatori: [], error: err.message });
    }
  });

  // POST /api/gr/import-loghi/:teamId — scarica e salva loghi dal calendario GR
  router.post('/api/gr/import-loghi/:teamId', authMiddleware, async (req, res) => {
    try {
      const { data: team } = await supabase.from('team').select('classifica_url, nome').eq('id', req.params.teamId).single();
      if (!team || !team.classifica_url) return res.status(400).json({ error: 'Configura prima URL GR' });
      const parsed = parseGrUrl(team.classifica_url);
      if (!parsed) return res.status(400).json({ error: 'URL non valido' });

      const calData = await fetchCalendario(parsed.level, parsed.championship, parsed.group);
      const logos = extractLogos(calData);

      const logosDir = path.join(__dirname, '..', '..', '..', 'frontend-v2', 'public', 'logos');
      if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });

      let imported = 0, skipped = 0, errors = 0;
      for (const logo of logos) {
        const nomeNorm = normalizeTeamName(logo.nome);
        const fileName = nomeNorm + '.png';
        const filePath = path.join(logosDir, fileName);

        // Skip se già esiste
        if (fs.existsSync(filePath)) { skipped++; continue; }

        try {
          const resp = await fetch(logo.url);
          if (!resp.ok) { errors++; continue; }
          const buffer = Buffer.from(await resp.arrayBuffer());
          fs.writeFileSync(filePath, buffer);

          // Upsert in team_logo
          await supabase.from('team_logo').upsert({
            nome: logo.nome,
            nome_normalizzato: nomeNorm,
            logo_path: '/logos/' + fileName
          }, { onConflict: 'nome_normalizzato' });

          imported++;
        } catch (e) {
          errors++;
        }
      }

      res.json({ success: true, imported, skipped, errors, total: logos.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/gr/import-calendario/:teamId — importa partite dal calendario GR
  router.post('/api/gr/import-calendario/:teamId', authMiddleware, async (req, res) => {
    try {
      const teamId = req.params.teamId;
      const { mode } = req.body || {}; // 'all' or 'results'
      const { data: team } = await supabase.from('team').select('classifica_url, nome, season_id').eq('id', teamId).single();
      if (!team || !team.classifica_url) return res.status(400).json({ error: 'Configura prima URL GR' });
      const parsed = parseGrUrl(team.classifica_url);
      if (!parsed) return res.status(400).json({ error: 'URL non valido' });

      const calData = await fetchCalendario(parsed.level, parsed.championship, parsed.group);
      const teamNameLower = team.nome.toLowerCase();

      // Filtra solo partite della nostra squadra
      const ourMatches = calData.matches.filter(m =>
        m.casa.toLowerCase().includes(teamNameLower) || teamNameLower.includes(m.casa.toLowerCase()) ||
        m.ospite.toLowerCase().includes(teamNameLower) || teamNameLower.includes(m.ospite.toLowerCase())
      );

      if (ourMatches.length === 0) return res.json({ success: true, imported: 0, updated: 0, skipped: 0, total: 0, message: 'Nessuna partita trovata per ' + team.nome });

      // Fetch existing matches
      const { data: existing } = await supabase.from('match').select('id, giornata, avversario, gol_casa, gol_ospite').eq('team_id', teamId);

      // Fuzzy match helper
      function fuzzyMatch(a, b) {
        if (!a || !b) return false;
        const na = a.toLowerCase().replace(/[^a-z0-9]/g, '');
        const nb = b.toLowerCase().replace(/[^a-z0-9]/g, '');
        return na === nb || na.includes(nb) || nb.includes(na);
      }

      function findExisting(giornata, avversario) {
        return (existing || []).find(e =>
          String(e.giornata) === String(giornata) && fuzzyMatch(e.avversario, avversario)
        );
      }

      let imported = 0, skipped = 0, updated = 0;
      for (const m of ourMatches) {
        const isCasa = m.casa.toLowerCase().includes(teamNameLower) || teamNameLower.includes(m.casa.toLowerCase());
        const avversario = isCasa ? m.ospite : m.casa;
        const luogo = isCasa ? 'Casa' : 'Trasferta';

        const ex = findExisting(m.giornata, avversario);

        if (mode === 'results') {
          // Solo aggiorna risultati di partite esistenti
          if (ex && m.gol_casa !== null && m.gol_casa !== undefined && m.stato === '5') {
            const golCasa = isCasa ? m.gol_casa : m.gol_ospite;
            const golOspite = isCasa ? m.gol_ospite : m.gol_casa;
            if (ex.gol_casa === null || ex.gol_casa === undefined) {
              await supabase.from('match').update({ gol_casa: golCasa, gol_ospite: golOspite, stato: 'Terminata' }).eq('id', ex.id);
              updated++;
            } else { skipped++; }
          } else { skipped++; }
        } else {
          // Import completo: skip se esiste gi\u00e0
          if (ex) { skipped++; continue; }

          const [dd, mm, yyyy] = m.data.split('-');
          const dataOra = `${yyyy}-${mm}-${dd}T${m.ora || '00:00'}:00`;
          const golCasa = isCasa ? m.gol_casa : m.gol_ospite;
          const golOspite = isCasa ? m.gol_ospite : m.gol_casa;

          const matchData = {
            team_id: teamId,
            avversario,
            luogo,
            data_ora: dataOra,
            giornata: m.giornata,
            gol_casa: (m.gol_casa !== null && m.stato === '5') ? golCasa : null,
            gol_ospite: (m.gol_casa !== null && m.stato === '5') ? golOspite : null,
            stato: (m.gol_casa !== null && m.stato === '5') ? 'Terminata' : null
          };

          const { error } = await supabase.from('match').insert(matchData);
          if (!error) imported++;
        }
      }

      res.json({ success: true, imported, updated, skipped, total: ourMatches.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
