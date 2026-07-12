/**
 * Gazzetta Regionale Routes — classifica, calendario, marcatori, loghi
 */
const express = require('express');
const { parseGrUrl, fetchClassifica, fetchCalendario, fetchMarcatori, extractLogos, fetchLevels, fetchChampionships, fetchGroups } = require('../helpers/gazzettaRegionale');
const { normalizeTeamName, matchTeamNameGR } = require('../helpers/importUtils');
const path = require('path');
const fs = require('fs');

module.exports = function createGazzettaRegionaleRouter({ supabase, authMiddleware }) {

  // Helper: trova partita nel DB per giornata+avversario (priorità giornata, fallback avversario)
  function findDbMatch(dbMatches, giornata, avversario) {
    if (!dbMatches || !dbMatches.length) return null;
    const avvLow = avversario.toLowerCase().slice(0, 6);
    // Priorità 1: giornata esatta + avversario match
    const exact = dbMatches.find(m =>
      m.giornata === giornata && m.avversario?.toLowerCase().includes(avvLow)
    );
    if (exact) return exact;
    // Priorità 2: solo giornata esatta
    const byGiornata = dbMatches.find(m => m.giornata === giornata);
    if (byGiornata) return byGiornata;
    // Priorità 3: solo avversario (unico match con quel nome)
    const byAvv = dbMatches.filter(m => m.avversario?.toLowerCase().includes(avvLow));
    if (byAvv.length === 1) return byAvv[0];
    return null;
  }
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

  // POST /api/gr/configure — salva URL GR per il team (url=null per reset)
  router.post('/api/gr/configure', authMiddleware, async (req, res) => {
    try {
      const { teamId, url, girone } = req.body;
      if (!teamId) return res.status(400).json({ error: 'teamId richiesto' });

      // Reset: url esplicitamente null
      if (url === null) {
        const { error } = await supabase.from('team').update({ classifica_url: null }).eq('id', teamId);
        if (error) return res.status(400).json({ error: error.message });
        const { data: team } = await supabase.from('team').select('category_id').eq('id', teamId).single();
        if (team?.category_id) {
          await supabase.from('category').update({ girone: null }).eq('id', team.category_id);
        }
        return res.json({ success: true, reset: true });
      }

      if (!url) return res.status(400).json({ error: 'teamId e url richiesti' });
      const parsed = parseGrUrl(url);
      if (!parsed) return res.status(400).json({ error: 'URL non valido. Formato: .../1/55/2325' });

      const apiUrl = `https://v2.apiweb.gazzettaregionale.it/classifiche/levels/${parsed.level}/${parsed.championship}/${parsed.group}/classifica`;
      const { error } = await supabase.from('team').update({ classifica_url: apiUrl }).eq('id', teamId);
      if (error) return res.status(400).json({ error: error.message });

      // Salva girone nella category del team
      if (girone) {
        const { data: team } = await supabase.from('team').select('category_id').eq('id', teamId).single();
        if (team?.category_id) {
          await supabase.from('category').update({ girone }).eq('id', team.category_id);
        }
      }

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
        const nomeNorm = normalizeLogoName(logo.nome);
        if (!nomeNorm) { errors++; continue; }
        const fileName = nomeNorm + '.png';
        const filePath = path.join(logosDir, fileName);

        // Skip se file già esiste O se hash identico a file esistente
        if (fs.existsSync(filePath)) { skipped++; continue; }

        try {
          const resp = await fetch(logo.url);
          if (!resp.ok) { errors++; continue; }
          const buffer = Buffer.from(await resp.arrayBuffer());
          if (buffer.length < 100) { errors++; continue; }

          // Check duplicato binario: confronta hash con file esistenti stessa dimensione
          const crypto = require('crypto');
          const newHash = crypto.createHash('md5').update(buffer).digest('hex');
          const existingFiles = fs.readdirSync(logosDir).filter(f => f.endsWith('.png'));
          const isDupe = existingFiles.some(f => {
            const fp = path.join(logosDir, f);
            const stat = fs.statSync(fp);
            if (Math.abs(stat.size - buffer.length) > 50) return false;
            return crypto.createHash('md5').update(fs.readFileSync(fp)).digest('hex') === newHash;
          });
          if (isDupe) { skipped++; continue; }

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
      const { data: team } = await supabase.from('team').select('classifica_url, nome, season_id, season:season_id(workspace_id)').eq('id', teamId).single();
      if (!team || !team.classifica_url) return res.status(400).json({ error: 'Configura prima URL GR' });
      // GR = sempre campionato ufficiale
      const grTipoComp = 'Campionato';
      const parsed = parseGrUrl(team.classifica_url);
      if (!parsed) return res.status(400).json({ error: 'URL non valido' });

      const calData = await fetchCalendario(parsed.level, parsed.championship, parsed.group);
      // Filtra solo partite della nostra squadra (matching fuzzy con abbreviazioni)
      const ourMatches = calData.matches.filter(m =>
        matchTeamNameGR(team.nome, m.casa) || matchTeamNameGR(team.nome, m.ospite)
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
        const isCasa = matchTeamNameGR(team.nome, m.casa);
        const avversario = isCasa ? m.ospite : m.casa;
        const luogo = isCasa ? 'Casa' : 'Trasferta';

        const ex = findExisting(m.giornata, avversario);

        if (mode === 'results') {
          // Aggiorna risultati di partite esistenti (merge: aggiorna se diverso o mancante)
          if (ex && m.gol_casa !== null && m.gol_casa !== undefined && m.stato === '5') {
            const golCasa = isCasa ? m.gol_casa : m.gol_ospite;
            const golOspite = isCasa ? m.gol_ospite : m.gol_casa;
            if (ex.gol_casa === null || ex.gol_casa !== golCasa || ex.gol_ospite !== golOspite) {
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
            stato: (m.gol_casa !== null && m.stato === '5') ? 'Terminata' : null,
            tipo_competizione: grTipoComp
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

  // === WIZARD LOGHI (solo superadmin, locale) ===

  const LOGOS_DIR = path.join(__dirname, '..', '..', '..', 'frontend-v2', 'public', 'logos');
  const PENDING_DIR = path.join(LOGOS_DIR, '.pending');
  const DELAY_MS = 250;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function normalizeLogoName(name) {
    return name.toLowerCase()
      .replace(/\b(s\.?s\.?d\.?|s\.?r\.?l\.?|a\.?s\.?d\.?|a\.?r\.?l\.?|s\.?s\.?|a\.?c\.?|f\.?c\.?)\b\.?/gi, '')
      .replace(/[^a-z0-9\u00e0-\u00fa]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // POST /api/gr/logos-wizard — scan levels/groups, scarica nuovi, rileva aggiornamenti
  router.post('/api/gr/logos-wizard', authMiddleware, async (req, res) => {
    if (!req.user.is_superadmin) return res.status(403).json({ error: 'Solo superadmin' });

    const { levels = [1], championshipIds } = req.body || {};
    if (!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR, { recursive: true });
    if (!fs.existsSync(PENDING_DIR)) fs.mkdirSync(PENDING_DIR, { recursive: true });

    let newImported = 0, unchanged = 0, pendingUpdates = 0, errors = 0, groupsScanned = 0;
    const updates = [];

    try {
      for (const levelId of levels) {
        let championships = await fetchChampionships(levelId);
        if (!Array.isArray(championships)) continue;

        // Filtra per championshipIds se forniti
        if (Array.isArray(championshipIds) && championshipIds.length > 0) {
          championships = championships.filter(c => championshipIds.includes(String(c.id)));
        }

        for (const champ of championships) {
          await sleep(DELAY_MS);
          const groups = await fetchGroups(levelId, champ.id);
          if (!Array.isArray(groups)) continue;

          for (const group of groups) {
            await sleep(DELAY_MS);
            groupsScanned++;
            const source = `${champ.text} - Gir. ${group.text}`;

            let calData;
            try { calData = await fetchCalendario(levelId, champ.id, group.id); } catch { continue; }
            const logos = extractLogos(calData);
            if (logos.length === 0) continue;

            for (const logo of logos) {
              const nomeNorm = normalizeLogoName(logo.nome);
              if (!nomeNorm) { errors++; continue; }
              const fileName = nomeNorm + '.png';
              const filePath = path.join(LOGOS_DIR, fileName);

              try {
                const resp = await fetch(logo.url);
                if (!resp.ok) { errors++; continue; }
                const buffer = Buffer.from(await resp.arrayBuffer());
                if (buffer.length < 100) { errors++; continue; }

                if (!fs.existsSync(filePath)) {
                  // Nuovo: salva direttamente
                  fs.writeFileSync(filePath, buffer);
                  await supabase.from('team_logo').upsert({
                    nome: logo.nome, nome_normalizzato: nomeNorm, logo_path: '/logos/' + fileName
                  }, { onConflict: 'nome_normalizzato' });
                  newImported++;
                } else {
                  // Esistente: confronta dimensione
                  const existingSize = fs.statSync(filePath).size;
                  if (Math.abs(existingSize - buffer.length) > 50) {
                    // Diverso → salva in pending
                    fs.writeFileSync(path.join(PENDING_DIR, fileName), buffer);
                    if (!updates.find(u => u.fileName === fileName)) {
                      updates.push({
                        nome: logo.nome, fileName, nomeNorm,
                        oldSize: existingSize, newSize: buffer.length,
                        oldPath: '/logos/' + fileName,
                        newPath: '/logos/.pending/' + fileName,
                        source
                      });
                    }
                    pendingUpdates++;
                  } else {
                    unchanged++;
                  }
                }
              } catch { errors++; }
            }
          }
        }
      }

      res.json({
        success: true, groupsScanned, newImported, unchanged, pendingUpdates: updates.length, errors,
        updates, // lista loghi con differenze per confronto UI
        totalLogos: fs.readdirSync(LOGOS_DIR).filter(f => f.endsWith('.png')).length
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/gr/logos-confirm — conferma/rifiuta aggiornamenti pending
  router.post('/api/gr/logos-confirm', authMiddleware, async (req, res) => {
    if (!req.user.is_superadmin) return res.status(403).json({ error: 'Solo superadmin' });

    const { decisions } = req.body; // [{fileName, action: 'accept'|'reject'}]
    if (!Array.isArray(decisions)) return res.status(400).json({ error: 'decisions array richiesto' });

    let accepted = 0, rejected = 0;
    for (const { fileName, action, nomeNorm, nome } of decisions) {
      const pendingPath = path.join(PENDING_DIR, fileName);
      const finalPath = path.join(LOGOS_DIR, fileName);

      if (!fs.existsSync(pendingPath)) continue;

      if (action === 'accept') {
        fs.copyFileSync(pendingPath, finalPath);
        fs.unlinkSync(pendingPath);
        if (nomeNorm) {
          await supabase.from('team_logo').upsert({
            nome: nome || fileName.replace('.png', ''), nome_normalizzato: nomeNorm, logo_path: '/logos/' + fileName
          }, { onConflict: 'nome_normalizzato' });
        }
        accepted++;
      } else {
        fs.unlinkSync(pendingPath);
        rejected++;
      }
    }

    // Pulisci pending dir se vuota
    const remaining = fs.existsSync(PENDING_DIR) ? fs.readdirSync(PENDING_DIR).length : 0;
    if (remaining === 0 && fs.existsSync(PENDING_DIR)) fs.rmdirSync(PENDING_DIR);

    res.json({ success: true, accepted, rejected, remaining });
  });

  // GET /api/gr/logos-pending — lista pending per UI
  router.get('/api/gr/logos-pending', authMiddleware, async (req, res) => {
    if (!req.user.is_superadmin) return res.status(403).json({ error: 'Solo superadmin' });
    if (!fs.existsSync(PENDING_DIR)) return res.json({ updates: [] });

    const files = fs.readdirSync(PENDING_DIR).filter(f => f.endsWith('.png'));
    const updates = files.map(fileName => {
      const finalPath = path.join(LOGOS_DIR, fileName);
      const pendingPath = path.join(PENDING_DIR, fileName);
      return {
        fileName,
        nomeNorm: fileName.replace('.png', ''),
        oldSize: fs.existsSync(finalPath) ? fs.statSync(finalPath).size : 0,
        newSize: fs.statSync(pendingPath).size,
        oldPath: '/logos/' + fileName,
        newPath: '/logos/.pending/' + fileName
      };
    });
    res.json({ updates });
  });

  // === IMPORT MARCATORI DA GR ===

  // Helper: parse goals from GR match HTML
  function parseGoalsFromHtml(html, extractHome) {
    const parts = html.split('vc_container_goal');
    const targetHtml = extractHome ? (parts[1] || '') : (parts[2] || '');
    const goalRe = /vc_goal_player">([^<]+)<\/span>\s*<span class="vc_goal_minute">(\d+)'/g;
    const goals = [];
    let m;
    while ((m = goalRe.exec(targetHtml)) !== null) {
      goals.push({ player: m[1].trim(), minute: parseInt(m[2]) });
    }
    return goals;
  }

  // GET /api/gr/match-events/preview — anteprima marcatori per le partite del team
  router.get('/api/gr/match-events/preview', authMiddleware, async (req, res) => {
    try {
      const teamId = req.query.teamId;
      if (!teamId) return res.status(400).json({ error: 'teamId richiesto' });

      const { data: team } = await supabase.from('team').select('classifica_url').eq('id', teamId).single();
      if (!team?.classifica_url) return res.status(400).json({ error: 'URL girone GR non configurato' });

      const parsed = parseGrUrl(team.classifica_url);
      if (!parsed) return res.status(400).json({ error: 'URL girone non valido' });

      // Fetch calendario GR
      const { matches: grMatches } = await fetchCalendario(parsed.level, parsed.championship, parsed.group);

      // Fetch partite del team nel DB
      const { data: dbMatches } = await supabase.from('match').select('id, avversario, giornata, luogo, gol_casa, gol_ospite').eq('team_id', teamId);

      // Fetch rosa per matching cognomi
      const { data: roster } = await supabase.from('team_player')
        .select('id, player:player_id(id, nome, cognome)').eq('team_id', teamId);

      // Fetch nome squadra (priorità: team.nome che corrisponde al nome GR)
      const { data: ws } = await supabase.from('team')
        .select('nome, season:season_id(workspace:workspace_id(nome))').eq('id', teamId).single();
      const teamName = ws?.nome || ws?.season?.workspace?.nome || '';

      // Filtra partite nostre
      const ourMatches = grMatches.filter(m => {
        if (m.gol_casa === null && m.gol_ospite === null) return false;
        return matchTeamNameGR(teamName, m.casa) || matchTeamNameGR(teamName, m.ospite);
      });

      // Parallelizza scraping: 5 alla volta
      const results = [];
      for (let i = 0; i < ourMatches.length; i += 5) {
        const batch = ourMatches.slice(i, i + 5);
        const batchResults = await Promise.all(batch.map(async (grMatch) => {
          const isHome = matchTeamNameGR(teamName, grMatch.casa);
          const avversario = isHome ? grMatch.ospite : grMatch.casa;
          const luogo = isHome ? 'Casa' : 'Trasferta';
          const risultato = isHome ? `${grMatch.gol_casa}-${grMatch.gol_ospite}` : `${grMatch.gol_ospite}-${grMatch.gol_casa}`;

          let goals = [];
          try {
            const htmlResp = await fetch(`https://v2.apiweb.gazzettaregionale.it/live/home/${grMatch.id}`);
            if (htmlResp.ok) goals = parseGoalsFromHtml(await htmlResp.text(), isHome);
          } catch (e) { /* skip */ }
          if (goals.length === 0) return null;

          const dbMatch = findDbMatch(dbMatches, grMatch.giornata, avversario);
          let already_imported = false;
          if (dbMatch) {
            const { count: dbCount } = await supabase.from('match_event').select('id', { count: 'exact', head: true })
              .eq('match_id', dbMatch.id).eq('tipo_evento', 'GOAL');
            // Marca come importata solo se il numero di gol nel DB >= quelli da GR
            already_imported = (dbCount || 0) >= goals.length && goals.length > 0;
          }
          return { gr_match_id: grMatch.id, giornata: grMatch.giornata, avversario, luogo, risultato, goals, already_imported, db_match_id: dbMatch?.id || null };
        }));
        results.push(...batchResults.filter(Boolean));
      }

      res.json({ matches: results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/gr/match-events/import — importa marcatori nelle partite
  router.post('/api/gr/match-events/import', authMiddleware, async (req, res) => {
    try {
      const { teamId, matches: grMatchIds } = req.body;
      if (!teamId || !grMatchIds?.length) return res.status(400).json({ error: 'teamId e matches richiesti' });

      const { data: team } = await supabase.from('team').select('classifica_url').eq('id', teamId).single();
      const parsed = parseGrUrl(team.classifica_url);
      const { matches: grMatches } = await fetchCalendario(parsed.level, parsed.championship, parsed.group);

      const { data: dbMatches } = await supabase.from('match').select('id, avversario, giornata, gol_casa, gol_ospite, luogo').eq('team_id', teamId);
      const { data: roster } = await supabase.from('team_player')
        .select('id, player:player_id(id, nome, cognome)').eq('team_id', teamId);

      const { data: ws } = await supabase.from('team')
        .select('nome, season:season_id(workspace:workspace_id(nome))').eq('id', teamId).single();
      const teamName = ws?.nome || ws?.season?.workspace?.nome || '';

      let imported = 0, skipped = 0;
      const skipReasons = { no_gr_match: 0, no_db_match: 0, already_imported: 0, no_player: 0 };
      const unmatchedPlayers = [];

      for (const grId of grMatchIds) {
        const grMatch = grMatches.find(m => m.id === grId || m.id === String(grId));
        if (!grMatch) { skipped++; skipReasons.no_gr_match++; continue; }

        const isHome = matchTeamNameGR(teamName, grMatch.casa);
        const avversario = isHome ? grMatch.ospite : grMatch.casa;

        // Trova la partita nel DB
        const dbMatch = findDbMatch(dbMatches, grMatch.giornata, avversario);
        if (!dbMatch) { skipped++; skipReasons.no_db_match++; continue; }

        // Scrape gol
        let goals = [];
        try {
          const htmlResp = await fetch(`https://v2.apiweb.gazzettaregionale.it/live/home/${grId}`);
          if (htmlResp.ok) goals = parseGoalsFromHtml(await htmlResp.text(), isHome);
        } catch (e) { /* skip */ }
        if (goals.length === 0) continue;

        // Fetch eventi esistenti per merge (non skippare tutta la partita)
        const { data: existingEvents } = await supabase.from('match_event')
          .select('player_id, minuto').eq('match_id', dbMatch.id).eq('tipo_evento', 'GOAL');

        for (const goal of goals) {
          // Match cognome con rosa
          const player = (roster || []).find(r =>
            r.player.cognome.toLowerCase() === goal.player.toLowerCase() ||
            r.player.cognome.toLowerCase().startsWith(goal.player.toLowerCase()) ||
            goal.player.toLowerCase().startsWith(r.player.cognome.toLowerCase())
          );
          if (!player) { skipped++; skipReasons.no_player++; unmatchedPlayers.push(goal.player); continue; }

          // Skip se già presente (stesso player + stesso minuto)
          const alreadyExists = (existingEvents || []).some(e =>
            e.player_id === player.player.id && e.minuto === (goal.minute || null)
          );
          if (alreadyExists) { skipped++; skipReasons.already_imported++; continue; }

          await supabase.from('match_event').insert({
            match_id: dbMatch.id,
            tipo_evento: 'GOAL',
            minuto: goal.minute || null,
            player_id: player.player.id
          });
          imported++;
        }
      }

      res.json({ success: true, imported, skipped, skipReasons, unmatchedPlayers: [...new Set(unmatchedPlayers)] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
