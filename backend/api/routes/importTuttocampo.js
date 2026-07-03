/**
 * Import Tuttocampo routes — calendario TC, confirm, eventi, formazioni batch
 */
const express = require('express');
const { tcRequest, tcLogin } = require('../helpers/tuttocampo');
const { normalizeForMatch, parseEventiFromHtml, logImport, scrapeLogosFromHtml } = require('../helpers/importUtils');
const { importFormationFromTC } = require('../helpers/importFormationTC');

function createImportTuttocampoRouter({ supabase, authMiddleware, requirePermission }) {
  const router = express.Router();

  // POST /api/calendario/import-tuttocampo
  router.post('/api/calendario/import-tuttocampo', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
    try {
      const { url, teamName, squadraId, importEvents } = req.body;
      if (!url || !teamName || !squadraId) return res.status(400).json({ error: 'URL, nome squadra e squadraId richiesti' });

      const urlMatch = url.match(/https:\/\/www\.tuttocampo\.it\/(\d{4}-\d{2})\/([^/]+)\/([^/]+)\/([^/]+)\/Calendario/);
      if (!urlMatch) return res.status(400).json({ error: 'URL non valido. Formato atteso: https://www.tuttocampo.it/ANNO/REGIONE/CATEGORIA/GIRONE/Calendario' });

      const [, anno, regione, categoria, girone] = urlMatch;
      const baseUrl = `https://www.tuttocampo.it/${anno}/${regione}/${categoria}/${girone}`;
      const cookies = await tcLogin();

      const mainResp = await tcRequest(baseUrl + '/Calendario', { headers: { 'Cookie': cookies } });
      const mainHtml = mainResp.data;
      if (!mainHtml || mainHtml.length < 1000) return res.status(503).json({ error: 'Tuttocampo non raggiungibile. Riprova tra qualche minuto.' });

      // Scrape loghi squadre dal HTML (non-blocking)
      let logoResult = null;
      if (req.body.importLogos !== false) {
        try { logoResult = await scrapeLogosFromHtml(mainHtml, supabase); } catch (e) { /* skip */ }
      }

      const matchesNumberMatch = mainHtml.match(/matchesNumber='(\d+)'/);
      const totalDays = matchesNumberMatch ? parseInt(matchesNumberMatch[1]) : 30;
      const roundIdMatch = mainHtml.match(/roundID='([^']+)'/);
      const roundID = roundIdMatch ? roundIdMatch[1] : '';
      if (!roundID) return res.status(400).json({ error: 'Impossibile determinare il girone.' });

      const partite = [];
      const searchLower = teamName.toLowerCase();

      for (let day = 1; day <= totalDays; day++) {
        try {
          const pageResp = await tcRequest(`${baseUrl}/Giornata${day}`, { headers: { 'Cookie': cookies } });
          const pageHtml = pageResp.data;
          if (!pageHtml) continue;
          const ttMatch = pageHtml.match(/var tt='(\d+)'/);
          if (!ttMatch) continue;
          const tckk = ttMatch[1];

          const ajaxResp = await tcRequest(`https://www.tuttocampo.it/Web/Views/Results/ResultsView.php?tckk=${tckk}`, {
            method: 'POST',
            headers: { 'Cookie': cookies, 'X-Requested-With': 'XMLHttpRequest', 'Referer': `${baseUrl}/Giornata${day}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `category_id=${roundID}&match_day=${day}&tournament_id=`
          });
          const html = ajaxResp.data;
          if (html.length < 200) continue;

          const dateMatch = html.match(/id="match_date">([^<]+)/);
          const dateStr = dateMatch ? dateMatch[1].trim() : '';

          const trRegex = /<tr class="match[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
          let tr;
          while ((tr = trRegex.exec(html)) !== null) {
            const block = tr[1];
            if (!block.toLowerCase().includes(searchLower)) continue;

            const hourMatch = block.match(/class="hour[^"]*"[^>]*>\s*([^<]+)/);
            const hour = hourMatch ? hourMatch[1].trim() : '15:00';
            const homeNameMatch = block.match(/class="team home[\s\S]*?class="team-name">\s*([^<]+)/);
            const home = homeNameMatch ? homeNameMatch[1].trim() : '?';
            const awayNameMatch = block.match(/class="team away[\s\S]*?class="team-name">\s*([^<]+)/);
            const away = awayNameMatch ? awayNameMatch[1].trim() : '?';
            const homeGoalMatch = block.match(/class="team home[\s\S]*?class="goal[^"]*"[^>]*>\s*(\d+)/);
            const awayGoalMatch = block.match(/class="team away[\s\S]*?class="goal[^"]*"[^>]*>\s*(\d+)/);
            const hg = homeGoalMatch ? parseInt(homeGoalMatch[1]) : null;
            const ag = awayGoalMatch ? parseInt(awayGoalMatch[1]) : null;

            const isHome = home.toLowerCase().includes(searchLower);
            const avversario = isHome ? away : home;
            const luogo = isHome ? 'Casa' : 'Trasferta';

            let dataOra = null;
            if (dateStr) {
              if (dateStr.includes('|')) {
                const parts = dateStr.split('|');
                if (parts.length === 3) { const [d, m, y] = parts; dataOra = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${hour}:00`; }
              } else if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) { const [d, m, y] = parts; const year = y.length === 2 ? '20' + y : y; dataOra = `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${hour}:00`; }
              } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
                dataOra = `${dateStr.substring(0,10)}T${hour}:00`;
              }
            }
            if (!dataOra) {
              const inlineDateMatch = block.match(/class="date[^"]*"[^>]*>\s*([^<]+)/);
              if (inlineDateMatch) {
                const inDate = inlineDateMatch[1].trim();
                if (inDate.includes('/')) {
                  const parts = inDate.split('/');
                  if (parts.length === 3) { const [d, m, y] = parts; const year = y.length === 2 ? '20' + y : y; dataOra = `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${hour}:00`; }
                }
              }
            }

            const detailLinkMatch = block.match(/href="([^"]*Partita[^"]*)"/i);
            const detailLink = detailLinkMatch ? detailLinkMatch[1] : null;

            let marcatori = [];
            if (importEvents && (hg !== null || ag !== null)) {
              const homeScorersMatch = block.match(/class="team home[\s\S]*?<ul class="scorers">([\s\S]*?)<\/ul>/);
              const awayScorersMatch = block.match(/class="team away[\s\S]*?<ul class="scorers">([\s\S]*?)<\/ul>/);
              const ourScorersHtml = isHome ? (homeScorersMatch ? homeScorersMatch[1] : '') : (awayScorersMatch ? awayScorersMatch[1] : '');
              const scorerRegex = /title="([^"]+)"/g;
              let sm;
              while ((sm = scorerRegex.exec(ourScorersHtml)) !== null) {
                marcatori.push({ tipo: 'GOAL', nome: sm[1].trim(), minuto: null });
              }
            }

            partite.push({
              giornata: day, dataOra, avversario, luogo,
              golCasa: isHome ? hg : ag, golOspite: isHome ? ag : hg,
              hasResult: hg !== null && ag !== null,
              detailLink: detailLink ? (detailLink.startsWith('http') ? detailLink : 'https://www.tuttocampo.it' + detailLink) : null,
              marcatori: marcatori.length > 0 ? marcatori : undefined
            });
          }
        } catch (e) { continue; }
      }

      if (partite.length === 0) return res.status(404).json({ error: `Squadra "${teamName}" non trovata nel girone.` });
      res.json({ success: true, info: { anno, regione, categoria, girone, giornate: totalDays }, partite, logos: logoResult });
    } catch (err) {
      res.status(500).json({ error: 'Errore scraping: ' + err.message });
    }
  });

  // POST /api/partite/:matchId/import-eventi-tuttocampo
  router.post('/api/partite/:matchId/import-eventi-tuttocampo', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
    try {
      const { url, html: rawHtml } = req.body;
      let html = rawHtml || '';
      if (!url && !html) return res.status(400).json({ error: 'URL o HTML richiesto' });

      if (url && !html) {
        const cookies = await tcLogin();
        const resp = await tcRequest(url, { headers: { 'Cookie': cookies } });
        html = resp.data;
        if (!html || html.length < 1000) return res.status(503).json({ error: 'Tuttocampo non raggiungibile.' });
      }
      if (!html || html.length < 500) return res.status(400).json({ error: 'HTML mancante o troppo corto' });

      const eventi = [];
      const scorerTitles = html.match(/class="scorers"[\s\S]*?<\/ul>/gi) || [];
      for (const block of scorerTitles) {
        const titleRegex = /title="([^"]+)"/g;
        let m;
        while ((m = titleRegex.exec(block)) !== null) {
          eventi.push({ tipo: 'GOAL', nome: m[1].trim(), minuto: null });
        }
      }
      if (eventi.length === 0) eventi.push(...parseEventiFromHtml(html));

      res.json({ success: true, eventi, htmlLength: html.length });
    } catch (err) {
      res.status(500).json({ error: 'Errore: ' + err.message });
    }
  });

  // POST /api/partite/:matchId/eventi-tuttocampo
  router.post('/api/partite/:matchId/eventi-tuttocampo', authMiddleware, requirePermission('partite', 'write'), async (req, res) => {
    try {
      const { matchId } = req.params;
      const { eventi, teamId } = req.body;
      if (!eventi || !Array.isArray(eventi) || eventi.length === 0) return res.status(400).json({ error: 'Nessun evento da importare' });

      const { data: roster } = await supabase.from('team_player').select('id, player_id, player:player_id(nome, cognome)').eq('team_id', teamId);

      function findPlayer(nome) {
        if (!nome || !roster) return null;
        const searchLower = nome.toLowerCase().trim();
        let found = roster.find(r => r.player && r.player.cognome.toLowerCase() === searchLower);
        if (found) return found.player_id;
        found = roster.find(r => r.player && searchLower.includes(r.player.cognome.toLowerCase()));
        if (found) return found.player_id;
        found = roster.find(r => r.player && r.player.cognome.toLowerCase().includes(searchLower));
        if (found) return found.player_id;
        return null;
      }

      const inserts = eventi.map(e => ({ match_id: matchId, tipo_evento: e.tipo || 'GOAL', minuto: e.minuto || null, player_id: findPlayer(e.nome) || null }));
      await supabase.from('match_event').delete().eq('match_id', matchId);
      if (inserts.length > 0) {
        const { error } = await supabase.from('match_event').insert(inserts);
        if (error) return res.status(400).json({ error: error.message });
      }

      const matched = inserts.filter(i => i.player_id).length;
      res.json({ success: true, imported: inserts.length, matched, unmatched: inserts.length - matched });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createImportTuttocampoRouter;
