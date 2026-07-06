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

      let imported = 0, skipped = 0;
      for (const p of players) {
        const { data: existing } = await supabase.from('player').select('id').ilike('cognome', p.cognome).ilike('nome', p.nome).eq('data_nascita', p.data_nascita).maybeSingle();

        let playerId;
        if (existing) {
          playerId = existing.id;
          const { data: tp } = await supabase.from('team_player').select('id').eq('team_id', teamId).eq('player_id', playerId).maybeSingle();
          if (tp) { skipped++; continue; }
        } else {
          const { data: newP, error } = await supabase.from('player').insert({
            nome: p.nome, cognome: p.cognome, data_nascita: p.data_nascita,
            matricola_figc: p.matricola || null, sesso: 'M'
          }).select().single();
          if (error) { skipped++; continue; }
          playerId = newP.id;
        }

        await supabase.from('team_player').insert({
          team_id: teamId, player_id: playerId, stato: 'Attivo',
          data_assegnazione: new Date().toISOString().split('T')[0]
        });
        imported++;
      }

      res.json({ success: true, imported, skipped });
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
        let query = supabase.from('player').select('id').ilike('cognome', p.cognome).ilike('nome', p.nome);
        if (p.data_nascita) query = query.eq('data_nascita', p.data_nascita);
        let { data: existing } = await query.maybeSingle();

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
            if (p.ruolo) await supabase.from('team_player').update({ ruolo_preferito: p.ruolo }).eq('id', tp.id).is('ruolo_preferito', null);
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
      if (!text || text.length < 50) return res.status(400).json({ error: 'Testo troppo corto' });

      const prefixes = ['de', 'di', 'del', 'della', 'dello', 'degli', 'dei', "d'", 'lo', 'la', 'le', 'li', 'el', 'al', 'van', 'von'];
      const players = [];
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);

      // Pattern TC text: "Cognome Nome    DD-MM-YYYY    POS"
      // Or: lines with name, birthdate pattern, and position code
      const dateRegex = /\d{2}-\d{2}-\d{4}/;
      const posRegex = /\b(POR|DIF|CEN|ATT)\b/i;

      for (const line of lines) {
        const dateMatch = line.match(dateRegex);
        const posMatch = line.match(posRegex);
        if (!dateMatch && !posMatch) continue;

        // Extract name (everything before the date or position)
        let namePart = line;
        if (dateMatch) namePart = line.substring(0, line.indexOf(dateMatch[0])).trim();
        else if (posMatch) namePart = line.substring(0, line.indexOf(posMatch[0])).trim();

        // Clean up name - remove numbers, extra spaces
        namePart = namePart.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
        if (namePart.length < 3) continue;

        const parts = namePart.split(' ').filter(p => p.length > 0);
        if (parts.length < 2) continue;

        let cognome, nome;
        if (parts.length >= 3 && prefixes.includes(parts[0].toLowerCase())) {
          cognome = parts[0] + ' ' + parts[1]; nome = parts.slice(2).join(' ');
        } else { cognome = parts[0]; nome = parts.slice(1).join(' '); }

        let dataNascita = null;
        if (dateMatch) {
          const [dd, mm, yyyy] = dateMatch[0].split('-');
          dataNascita = `${yyyy}-${mm}-${dd}`;
        }

        const ruoloMap = { 'POR': 'Portiere', 'DIF': 'Difensore', 'CEN': 'Centrocampista', 'ATT': 'Attaccante' };
        const ruolo = posMatch ? (ruoloMap[posMatch[0].toUpperCase()] || null) : null;

        players.push({ cognome, nome, data_nascita: dataNascita, ruolo });
      }

      if (!players.length) return res.status(400).json({ error: 'Nessun giocatore trovato. Assicurati di copiare la tabella giocatori dalla pagina Rosa.' });
      res.json({ success: true, teamName: 'Import manuale', players });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createRosterRouter;
