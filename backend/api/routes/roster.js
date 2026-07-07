/**
 * Roster routes — import rosa da XLS e Tuttocampo
 */
const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const cheerio = require('cheerio');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const { tcLogin, tcFetchPage, tcFetchAjax } = require('../helpers/tuttocampo');

function createRosterRouter({ supabase, authMiddleware, requirePermission }) {
  const router = express.Router();

  // POST /api/roster/parse-xls
  router.post('/api/roster/parse-xls', authMiddleware, requirePermission('rosa', 'write'), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'File richiesto' });

      // Validazione formato file
      const ext = (req.file.originalname || '').toLowerCase();
      if (!ext.endsWith('.xlsx') && !ext.endsWith('.xls')) {
        return res.status(400).json({ error: 'Formato file non valido. Richiesto file Excel (.xlsx o .xls).' });
      }

      let wb;
      try {
        wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      } catch (e) {
        return res.status(400).json({ error: 'Il file non è un documento Excel valido. Assicurati di caricare il tabulato atleti FIGC in formato .xlsx.' });
      }

      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        return res.status(400).json({ error: 'Il file Excel è vuoto (nessun foglio trovato).' });
      }

      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

      // Validazione struttura: il tabulato FIGC ha almeno 7 colonne e la riga header contiene parole chiave
      if (!rows || rows.length < 2) {
        return res.status(400).json({ error: 'Il file non contiene dati sufficienti. Il tabulato FIGC deve avere almeno una riga di intestazione e una riga dati.' });
      }

      const header = (rows[0] || []).map(h => String(h || '').toLowerCase());
      const figcKeywords = ['matricola', 'cognome', 'nome', 'nascita', 'disciplina', 'fiscale', 'codice'];
      const matchedKeywords = figcKeywords.filter(kw => header.some(h => h.includes(kw)));

      // Se nessuna keyword FIGC trovata nell'header, verifica struttura colonne (almeno 5 colonne con dati)
      if (matchedKeywords.length === 0) {
        const firstDataRow = rows[1] || [];
        const hasEnoughCols = firstDataRow.filter(c => c != null && String(c).trim() !== '').length >= 4;
        const hasNameLike = firstDataRow.some(c => typeof c === 'string' && c.trim().length > 3 && /[A-Z]/.test(c));
        if (!hasEnoughCols || !hasNameLike) {
          return res.status(400).json({ error: 'Il formato del file non corrisponde al tabulato atleti FIGC. Colonne attese: Matricola, Nome Completo, Disciplina, Data Nascita, ..., Codice Fiscale. Verifica di aver selezionato il file corretto.' });
        }
      }

      const PREFIXES = ['DE','DI','DEL','DELLA','DELLO','DEGLI','DELLE','DA','LO','LA','LI','LE','D','MC','MAC'];
      function splitNameByCF(fullName, cf) {
        const parts = fullName.split(' ');
        if (cf && cf.length >= 6) {
          const cfCognome = cf.substring(0, 3).toUpperCase();
          for (let i = 1; i < parts.length; i++) {
            const candidate = parts.slice(0, i).join('');
            const cons = candidate.replace(/[^BCDFGHJKLMNPQRSTVWXYZ]/gi, '');
            let check = cons.length >= 3 ? cons.substring(0, 3).toUpperCase() : (cons + candidate.replace(/[^AEIOU]/gi, '')).substring(0, 3).toUpperCase();
            if (check === cfCognome) {
              if (PREFIXES.includes(parts.slice(0, i).join(' ').toUpperCase())) continue;
              return { cognome: parts.slice(0, i).join(' '), nome: parts.slice(i).join(' ') };
            }
          }
        }
        if (PREFIXES.includes(parts[0].toUpperCase()) && parts.length > 2) {
          return { cognome: parts.slice(0, 2).join(' '), nome: parts.slice(2).join(' ') };
        }
        return { cognome: parts[0], nome: parts.slice(1).join(' ') };
      }

      const players = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[1]) continue;
        const fullName = String(row[1]).trim();
        const cf = row[6] ? String(row[6]).trim() : null;
        const { cognome: rawCognome, nome: rawNome } = splitNameByCF(fullName, cf);

        let dataNascita = null, annoNascita = null;
        if (row[3]) {
          if (typeof row[3] === 'number') {
            const d = new Date((row[3] - 25569) * 86400 * 1000);
            dataNascita = d.toISOString().split('T')[0];
            annoNascita = d.getFullYear();
          } else {
            dataNascita = String(row[3]);
            annoNascita = parseInt(dataNascita.substring(0, 4));
          }
        }

        players.push({
          matricola: row[0] ? String(row[0]) : null,
          cognome: rawCognome.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
          nome: rawNome.split(' ').map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()).join(' '),
          disciplina: row[2] || null, data_nascita: dataNascita, anno_nascita: annoNascita,
          codice_fiscale: row[6] || null, status: row[7] || null
        });
      }

      const byYear = {};
      players.forEach(p => { const y = p.anno_nascita || 'sconosciuto'; if (!byYear[y]) byYear[y] = []; byYear[y].push(p); });

      // Validazione post-parsing: verifica che i dati abbiano senso
      if (players.length === 0) {
        return res.status(400).json({ error: 'Nessun giocatore trovato nel file. Verifica che il formato corrisponda al tabulato atleti FIGC (colonne: Matricola, Nome, Disciplina, Data Nascita, ...).' });
      }
      const playersWithName = players.filter(p => p.cognome && p.cognome.length > 1);
      if (playersWithName.length < players.length * 0.5) {
        return res.status(400).json({ error: 'Il file non sembra contenere dati validi. La maggior parte delle righe non ha un nome riconoscibile. Verifica di aver caricato il tabulato atleti FIGC corretto.' });
      }

      res.json({ success: true, players, byYear, total: players.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/roster/import-xls
  router.post('/api/roster/import-xls', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
    try {
      const { players, teamId } = req.body;
      if (!players || !players.length || !teamId) return res.status(400).json({ error: 'players e teamId richiesti' });

      let imported = 0, skipped = 0, updated = 0;
      const results = [];

      for (const p of players) {
        let existing = null;
        let matchType = null;

        // 1. Match by Codice Fiscale (gold standard)
        if (p.codice_fiscale) {
          const { data } = await supabase.from('player').select('id').eq('codice_fiscale', p.codice_fiscale.toUpperCase()).maybeSingle();
          if (data) { existing = data; matchType = 'cf'; }
        }

        // 2. Match by Matricola FIGC
        if (!existing && p.matricola) {
          const { data } = await supabase.from('player').select('id').eq('matricola_figc', p.matricola).maybeSingle();
          if (data) { existing = data; matchType = 'matricola'; }
        }

        // 3. Match by Nome + Cognome + Data Nascita (solo se non ha CF né matricola)
        if (!existing && !p.codice_fiscale && !p.matricola && p.data_nascita) {
          const { data } = await supabase.from('player').select('id').ilike('cognome', p.cognome).ilike('nome', p.nome).eq('data_nascita', p.data_nascita).maybeSingle();
          if (data) { existing = data; matchType = 'nome_dn'; }
        }

        let playerId;
        if (existing) {
          playerId = existing.id;
          // Update dati mancanti (CF, matricola) — solo se il record non ne ha già uno diverso
          const updates = {};
          if (p.codice_fiscale && matchType !== 'cf') {
            const { data: curr } = await supabase.from('player').select('codice_fiscale').eq('id', playerId).single();
            if (!curr.codice_fiscale) updates.codice_fiscale = p.codice_fiscale.toUpperCase();
          }
          if (p.matricola && matchType !== 'matricola') {
            const { data: curr } = await supabase.from('player').select('matricola_figc').eq('id', playerId).single();
            if (!curr.matricola_figc) updates.matricola_figc = p.matricola;
          }
          if (Object.keys(updates).length > 0) {
            await supabase.from('player').update(updates).eq('id', playerId);
            updated++;
          }
          // Check if already in team
          const { data: tp } = await supabase.from('team_player').select('id').eq('team_id', teamId).eq('player_id', playerId).maybeSingle();
          if (tp) { skipped++; results.push({ ...p, status: 'skipped', matchType }); continue; }
        } else {
          const { data: newP, error } = await supabase.from('player').insert({
            nome: p.nome, cognome: p.cognome, data_nascita: p.data_nascita,
            matricola_figc: p.matricola || null,
            codice_fiscale: p.codice_fiscale ? p.codice_fiscale.toUpperCase() : null,
            sesso: 'M'
          }).select().single();
          if (error) { skipped++; results.push({ ...p, status: 'error', error: error.message }); continue; }
          playerId = newP.id;
        }

        await supabase.from('team_player').insert({
          team_id: teamId, player_id: playerId, stato: 'Attivo',
          data_assegnazione: new Date().toISOString().split('T')[0]
        });
        imported++;
        results.push({ ...p, status: 'imported', matchType });
      }

      res.json({ success: true, imported, skipped, updated, results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/roster/scrape-tuttocampo
  router.post('/api/roster/scrape-tuttocampo', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || !url.includes('tuttocampo.it')) return res.status(400).json({ error: 'URL Tuttocampo richiesto' });

      const cookies = await tcLogin();
      const pageHtml = await tcFetchPage(url, cookies);
      if (!pageHtml || pageHtml.length < 500) return res.status(503).json({ error: 'Tuttocampo non raggiungibile (protezione anti-bot). Riprova tra 1-2 minuti oppure verifica che l\'URL sia corretto.', debug: { htmlLen: pageHtml?.length || 0, proxy: !!process.env.PROXY_TC_URL } });

      const tckkMatch = pageHtml.match(/tckk='([^']+)'/);
      const ttMatch = pageHtml.match(/var tt='([^']+)'/);
      const hhMatch = pageHtml.match(/var hh='([^']+)'/);
      const teamIdMatch = pageHtml.match(/var teamID=(\d+)/);
      const teamNameMatch = pageHtml.match(/var teamName='([^']+)'/);

      if (!tckkMatch || !ttMatch || !hhMatch || !teamIdMatch) return res.status(400).json({ error: 'Impossibile estrarre i token dalla pagina. Verifica URL.' });

      const tckk = tckkMatch[1], tt = ttMatch[1], hh = hhMatch[1], teamId = teamIdMatch[1];
      const teamName = teamNameMatch ? teamNameMatch[1] : 'Sconosciuta';

      const rosterUrl = `https://www.tuttocampo.it/Web/Views/TeamPlayers/TeamPlayers.php?tckk=${tckk}&id=${teamId}&tt=${tt}&hh=${hh}`;
      const rosterHtml = await tcFetchAjax(rosterUrl, cookies, url);

      const $ = cheerio.load(rosterHtml);
      const players = [];
      const prefixes = ['de', 'di', 'del', 'della', 'dello', 'degli', 'dei', "d'", 'lo', 'la', 'le', 'li', 'el', 'al', 'van', 'von'];

      $('table.team-players tbody tr').each((i, row) => {
        const nameEl = $(row).find('td.player a[data-player-id]');
        if (!nameEl.length) return;
        const fullName = nameEl.text().trim();
        const birthdate = $(row).find('td.birthdate').text().trim();
        const ruolo = $(row).find('td').eq(3).text().trim();
        if (!fullName) return;

        const parts = fullName.split(' ');
        let cognome = '', nome = '';
        if (parts.length >= 2) {
          if (parts.length >= 3 && prefixes.includes(parts[0].toLowerCase())) {
            cognome = parts[0] + ' ' + parts[1]; nome = parts.slice(2).join(' ');
          } else { cognome = parts[0]; nome = parts.slice(1).join(' '); }
        } else { cognome = fullName; }

        let dataNascita = null;
        if (birthdate && birthdate !== '-') {
          const [dd, mm, yyyy] = birthdate.split('-');
          if (dd && mm && yyyy) dataNascita = `${yyyy}-${mm}-${dd}`;
        }

        const ruoloMap = { 'POR': 'Portiere', 'DIF': 'Difensore', 'CEN': 'Centrocampista', 'ATT': 'Attaccante' };
        players.push({ cognome, nome, data_nascita: dataNascita, ruolo: ruoloMap[ruolo] || null });
      });

      if (!players.length) return res.status(400).json({ error: 'Nessun giocatore trovato. La pagina potrebbe non contenere dati.' });
      res.json({ success: true, teamName, players });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/roster/import-tuttocampo
  router.post('/api/roster/import-tuttocampo', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
    try {
      const { players, teamId } = req.body;
      if (!players || !players.length || !teamId) return res.status(400).json({ error: 'players e teamId richiesti' });

      let imported = 0, skipped = 0;
      const { data: existingPlayers } = await supabase.from('team_player')
        .select('id, player_id, player:player_id(id, nome, cognome, data_nascita, ruolo_principale)')
        .eq('team_id', teamId);
      const rosterPlayers = existingPlayers || [];

      for (const p of players) {
        let existing = null;

        // 1. Match by Nome + Cognome + Data Nascita (exact)
        if (p.data_nascita) {
          const { data } = await supabase.from('player').select('id').ilike('cognome', p.cognome).ilike('nome', p.nome).eq('data_nascita', p.data_nascita).maybeSingle();
          if (data) existing = data;
        }

        // 2. Match by Nome + Cognome (senza data)
        if (!existing) {
          const { data } = await supabase.from('player').select('id').ilike('cognome', p.cognome).ilike('nome', p.nome).maybeSingle();
          if (data) existing = data;
        }

        // 3. Fuzzy match nel roster corrente
        if (!existing && rosterPlayers.length > 0) {
          const cogLower = p.cognome.toLowerCase(), nomeLower = p.nome.toLowerCase();
          const match = rosterPlayers.find(r => {
            const rc = r.player?.cognome?.toLowerCase() || '', rn = r.player?.nome?.toLowerCase() || '';
            return (rc === cogLower || rc.includes(cogLower) || cogLower.includes(rc)) &&
                   (rn === nomeLower || rn.includes(nomeLower) || nomeLower.includes(rn));
          });
          if (match) existing = { id: match.player_id };
        }

        let playerId;
        if (existing) {
          playerId = existing.id;
          if (p.ruolo) await supabase.from('player').update({ ruolo_principale: p.ruolo }).eq('id', playerId).is('ruolo_principale', null);
          const { data: tp } = await supabase.from('team_player').select('id').eq('team_id', teamId).eq('player_id', playerId).maybeSingle();
          if (tp) {
            const updates = {};
            if (p.numero_maglia && p.numero_maglia > 0) updates.numero_maglia = p.numero_maglia;
            if (p.ruolo) updates.ruolo_preferito = p.ruolo;
            if (Object.keys(updates).length > 0) await supabase.from('team_player').update(updates).eq('id', tp.id);
            skipped++; continue;
          }
        } else {
          const { data: newP, error } = await supabase.from('player').insert({
            nome: p.nome, cognome: p.cognome, data_nascita: p.data_nascita || null,
            ruolo_principale: p.ruolo || null, sesso: 'M'
          }).select().single();
          if (error) { skipped++; continue; }
          playerId = newP.id;
        }

        await supabase.from('team_player').insert({
          team_id: teamId, player_id: playerId, stato: 'Attivo', ruolo_preferito: p.ruolo || null,
          numero_maglia: p.numero_maglia || null,
          data_assegnazione: new Date().toISOString().split('T')[0]
        });
        imported++;
      }

      res.json({ success: true, imported, skipped });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/roster/parse-html-tuttocampo — fallback manuale: l'utente incolla l'HTML
  router.post('/api/roster/parse-html-tuttocampo', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
    try {
      const { html } = req.body;
      if (!html || html.length < 500) return res.status(400).json({ error: 'HTML non valido o troppo corto' });

      const $ = cheerio.load(html);
      const players = [];
      const prefixes = ['de', 'di', 'del', 'della', 'dello', 'degli', 'dei', "d'", 'lo', 'la', 'le', 'li', 'el', 'al', 'van', 'von'];

      $('table.team-players tbody tr').each((i, row) => {
        const nameEl = $(row).find('td.player a[data-player-id]');
        if (!nameEl.length) return;
        const fullName = nameEl.text().trim();
        const birthdate = $(row).find('td.birthdate').text().trim();
        const ruolo = $(row).find('td').eq(3).text().trim();
        if (!fullName) return;

        const parts = fullName.split(' ');
        let cognome = '', nome = '';
        if (parts.length >= 2) {
          if (parts.length >= 3 && prefixes.includes(parts[0].toLowerCase())) {
            cognome = parts[0] + ' ' + parts[1]; nome = parts.slice(2).join(' ');
          } else { cognome = parts[0]; nome = parts.slice(1).join(' '); }
        } else { cognome = fullName; }

        let dataNascita = null;
        if (birthdate && birthdate !== '-') {
          const [dd, mm, yyyy] = birthdate.split('-');
          if (dd && mm && yyyy) dataNascita = `${yyyy}-${mm}-${dd}`;
        }

        const ruoloMap = { 'POR': 'Portiere', 'DIF': 'Difensore', 'CEN': 'Centrocampista', 'ATT': 'Attaccante' };
        players.push({ cognome, nome, data_nascita: dataNascita, ruolo: ruoloMap[ruolo] || null });
      });

      if (!players.length) return res.status(400).json({ error: 'Nessun giocatore trovato nell\'HTML. Assicurati di copiare il sorgente della pagina Rosa.' });
      res.json({ success: true, teamName: 'Import manuale', players });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/roster/parse-text-tuttocampo — fallback: l'utente incolla il testo copiato dalla pagina
  router.post('/api/roster/parse-text-tuttocampo', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || text.length < 30) return res.status(400).json({ error: 'Testo troppo corto' });

      const prefixes = ['de', 'di', 'del', 'della', 'dello', 'degli', 'dei', "d'", 'lo', 'la', 'le', 'li', 'el', 'al', 'van', 'von'];
      const players = [];
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);

      const dateRegex = /\d{2}-\d{2}-\d{4}/;
      const posRegex = /\b(POR|DIF|CEN|ATT)\b/i;
      const ruoloMap = { 'POR': 'Portiere', 'DIF': 'Difensore', 'CEN': 'Centrocampista', 'ATT': 'Attaccante' };

      for (const line of lines) {
        // Skip header lines
        if (/^(GIOCATORE|NOME|COGNOME)/i.test(line)) continue;

        const cols = line.split('\t');

        // Tab-separated format: Nome\tNome(num)\tData\tRuolo\tGol\tPres\tGialli\tRossi
        if (cols.length >= 4) {
          // First column is always the clean name
          let namePart = cols[0].replace(/\(\d+\)/g, '').replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
          if (namePart.length < 3) continue;

          const parts = namePart.split(' ').filter(p => p.length > 0);
          if (parts.length < 2) continue;

          let cognome, nome;
          if (parts.length >= 3 && prefixes.includes(parts[0].toLowerCase())) {
            cognome = parts[0] + ' ' + parts[1]; nome = parts.slice(2).join(' ');
          } else { cognome = parts[0]; nome = parts.slice(1).join(' '); }

          // Find date and position in remaining columns
          let dataNascita = null, ruolo = null, numero_maglia = null;
          let gol = null, presenze = null, ammonizioni = null, espulsioni = null;

          // Extract numero maglia from second column (e.g. "Cognome Nome(6)")
          const numMatch = cols.length > 1 ? cols[1].match(/\((\d+)\)/) : null;
          if (numMatch) numero_maglia = parseInt(numMatch[1]);

          for (let i = 1; i < cols.length; i++) {
            const col = cols[i].trim();
            if (!col || col === '-') continue;
            const dm = col.match(dateRegex);
            if (dm) { const [dd, mm, yyyy] = dm[0].split('-'); dataNascita = `${yyyy}-${mm}-${dd}`; continue; }
            const pm = col.match(posRegex);
            if (pm) { ruolo = ruoloMap[pm[0].toUpperCase()] || null; continue; }
          }

          // Stats: after ruolo column, expect Gol, Pres, Gialli, Rossi (numeric)
          // Find the position column index
          let posIdx = -1;
          for (let i = 1; i < cols.length; i++) {
            if (posRegex.test(cols[i].trim())) { posIdx = i; break; }
          }
          if (posIdx >= 0 && posIdx + 4 < cols.length) {
            const g = parseInt(cols[posIdx + 1]); if (!isNaN(g)) gol = g;
            const p = parseInt(cols[posIdx + 2]); if (!isNaN(p)) presenze = p;
            const a = parseInt(cols[posIdx + 3]); if (!isNaN(a)) ammonizioni = a;
            const e = parseInt(cols[posIdx + 4]); if (!isNaN(e)) espulsioni = e;
          }

          const player = { cognome, nome, data_nascita: dataNascita, ruolo };
          if (numero_maglia) player.numero_maglia = numero_maglia;
          if (gol !== null) player.gol = gol;
          if (presenze !== null) player.presenze = presenze;
          if (ammonizioni !== null) player.ammonizioni = ammonizioni;
          if (espulsioni !== null) player.espulsioni = espulsioni;
          players.push(player);
          continue;
        }

        // Fallback: space-separated format
        const dateMatch = line.match(dateRegex);
        const posMatch = line.match(posRegex);
        if (!dateMatch && !posMatch) continue;

        let namePart = line;
        if (dateMatch) namePart = line.substring(0, line.indexOf(dateMatch[0])).trim();
        else if (posMatch) namePart = line.substring(0, line.indexOf(posMatch[0])).trim();

        namePart = namePart.replace(/\(\d+\)/g, '').replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
        if (namePart.length < 3) continue;

        const parts = namePart.split(' ').filter(p => p.length > 0);
        if (parts.length < 2) continue;

        let cognome, nome;
        if (parts.length >= 3 && prefixes.includes(parts[0].toLowerCase())) {
          cognome = parts[0] + ' ' + parts[1]; nome = parts.slice(2).join(' ');
        } else { cognome = parts[0]; nome = parts.slice(1).join(' '); }

        let dataNascita = null;
        if (dateMatch) { const [dd, mm, yyyy] = dateMatch[0].split('-'); dataNascita = `${yyyy}-${mm}-${dd}`; }
        const ruolo = posMatch ? (ruoloMap[posMatch[0].toUpperCase()] || null) : null;
        players.push({ cognome, nome, data_nascita: dataNascita, ruolo });
      }

      if (!players.length) return res.status(400).json({ error: 'Nessun giocatore trovato. Assicurati di copiare la tabella giocatori dalla pagina Rosa.' });
      const hasStats = players.some(p => p.gol !== undefined || p.presenze !== undefined);
      res.json({ success: true, teamName: 'Import manuale', players, hasStats });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createRosterRouter;
