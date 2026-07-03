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
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

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
      if (!pageHtml || pageHtml.length < 500) return res.status(503).json({ error: 'Tuttocampo non raggiungibile (protezione anti-bot). Riprova tra 1-2 minuti oppure verifica che l\'URL sia corretto.' });

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

  return router;
}

module.exports = createRosterRouter;
