/**
 * Import utilities — normalizzazione nomi, parsing eventi, log, loghi
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

// Mappa parole senza accento → con accento (dal PDF SGS arrivano senza)
const ACCENT_MAP = { 'Citta': 'Città', 'Universita': 'Università' };

// Normalizza nome squadra da MAIUSCOLO a Title Case, rimuovendo suffissi legali
function normalizeTeamName(name) {
  let clean = name.replace(/\b(S\.?S\.?D\.?|S\.?R\.?L\.?|A\.?S\.?D\.?|A\.?R\.?L\.?|S\.?S\.?|A\.?C\.?|F\.?C\.?)\b\.?/gi, '').trim();
  clean = clean.replace(/\s+/g, ' ').trim();
  clean = clean.split(' ').map(w => {
    if (w.length <= 2) return w.toUpperCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
  // Ripristina accenti mancanti dal PDF
  for (const [plain, accented] of Object.entries(ACCENT_MAP)) {
    clean = clean.replace(new RegExp(`\\b${plain}\\b`, 'g'), accented);
  }
  return clean;
}

// Normalizza per fuzzy match (lowercase, senza suffissi, senza punteggiatura)
function normalizeForMatch(name) {
  return name.toLowerCase()
    .replace(/\b(s\.?s\.?d\.?|s\.?r\.?l\.?|a\.?s\.?d\.?|a\.?r\.?l\.?|s\.?s\.?|a\.?c\.?|f\.?c\.?)\b/gi, '')
    .replace(/[^a-z\u00e0-\u00fa0-9\s]/g, '')
    .replace(/\s+/g, ' ').trim();
}

// Estrae il "core" del nome squadra per matching GR
// Rimuove prefissi legali + espande/rimuove abbreviazioni comuni calcio italiano
const ABBREVIATIONS = {
  'pol': 'polisportiva', 'polisport': 'polisportiva',
  'atl': 'atletico',
  'din': 'dinamo', 'sp': 'sporting', 'sport': 'sporting',
  'real': 'real', 'virt': 'virtus', 'acc': 'accademia',
  'gio': 'giovani', 'giov': 'giovani',
  'c': 'citta', 'cit': 'citta',
  'ol': 'olimpia', 'olim': 'olimpia',
  'prog': 'progresso', 'ind': 'indipendente',
  'mon': 'monterotondo', 'mont': 'monte'
};

function coreTeamName(name) {
  let n = name.toLowerCase()
    // Rimuovi suffissi legali
    .replace(/\b(s\.?s\.?d\.?|s\.?r\.?l\.?|a\.?s\.?d\.?|a\.?r\.?l\.?|s\.?s\.?|a\.?c\.?|f\.?c\.?)\b\.?/gi, '')
    // Normalizza accenti → senza accento per confronto
    .replace(/à/g, 'a').replace(/è/g, 'e').replace(/é/g, 'e').replace(/ì/g, 'i').replace(/ò/g, 'o').replace(/ù/g, 'u')
    // Rimuovi punteggiatura ma tieni le lettere singole (abbreviazioni GR)
    .replace(/\./g, ' ').replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ').trim();
  // Espandi abbreviazioni
  const words = n.split(' ');
  const expanded = words.map(w => ABBREVIATIONS[w] || w);
  // Rimuovi parole generiche per tenere solo il "core"
  const GENERIC = ['polisportiva', 'atletico', 'atletica', 'calcio', 'football', 'club', 'sporting', 'dinamo', 'virtus', 'real', 'accademia', 'giovani', 'citta', 'olimpia', 'di', 'del', 'dei', 'la', 'le'];
  const core = expanded.filter(w => !GENERIC.includes(w) && w.length > 1);
  // Se rimane solo 1 parola ma c'erano qualificatori, preservali per disambiguare
  const QUALIFIERS = ['polisportiva', 'atletico', 'atletica', 'accademia', 'citta', 'real', 'virtus', 'olimpia', 'sporting', 'dinamo'];
  if (core.length === 1 && expanded.length >= 2) {
    const qualifiers = expanded.filter(w => QUALIFIERS.includes(w));
    if (qualifiers.length > 0) return [...qualifiers, ...core].join(' ');
  }
  return core.length > 0 ? core.join(' ') : expanded.join(' ');
}

// Match GR: confronta i core names
function matchTeamNameGR(teamDbName, grName) {
  if (teamDbName.toLowerCase() === grName.toLowerCase()) return true;
  const coreDb = coreTeamName(teamDbName);
  const coreGr = coreTeamName(grName);
  if (coreDb === coreGr) return true;
  // Word-level matching: all words of the shorter must appear in the longer
  const wa = coreDb.split(' '), wb = coreGr.split(' ');
  const [shorter, longer] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  // Require shorter to have more than half the words of longer (strict)
  // Exception: single-word names only match other single-word names (already handled by coreDb === coreGr)
  if (shorter.length > 1 && shorter.every(w => longer.includes(w))) return true;
  // Single word shorter: only match if longer is also single word (exact, already checked above)
  return false;
}

// Parsing minuto da stringa tipo "30' st" → 75
function parseMinuto(str) {
  if (!str) return null;
  const m = str.match(/(\d+)'?\s*(st|pt)?/);
  if (!m) return null;
  const min = parseInt(m[1]);
  const tempo = m[2];
  if (tempo === 'st') return min + 45;
  return min;
}

// Parsing data testo SGS "dd/mm/yy" + "HH:MM" → ISO string
function parseDateText(dateStr, timeStr) {
  const parts = dateStr.trim().split('/');
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const year = 2000 + parseInt(parts[2]);
  const [hours, minutes] = (timeStr || '15:00').split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes).toISOString();
}

// Parsing eventi (marcatori, cartellini) da HTML Tuttocampo
function parseEventiFromHtml(html) {
  const eventi = [];

  const marcatoriSection = html.match(/(?:Marcatori|Reti|Goals?|Gol)[\s\S]{0,3000}/i);
  if (marcatoriSection) {
    const section = marcatoriSection[0];
    const linePattern = /(\d+)[\u2019'\'\\u0027]\s*([^<\n,;]+)/g;
    let lm;
    while ((lm = linePattern.exec(section)) !== null) {
      const minuto = parseInt(lm[1]);
      const nome = lm[2].trim().replace(/\s+/g, ' ');
      if (minuto > 0 && minuto <= 120 && nome.length > 2 && nome.length < 40) {
        if (!eventi.find(e => e.minuto === minuto && e.nome === nome)) {
          eventi.push({ tipo: 'GOAL', minuto, nome });
        }
      }
    }
  }

  if (eventi.length === 0) {
    const scorerBlocks = html.match(/class="[^"]*(?:scorer|goalscorer|goal-player|marcator)[^"]*"[^>]*>[\s\S]*?<\/(?:div|span|li|td)>/gi) || [];
    for (const block of scorerBlocks) {
      const content = block.replace(/<[^>]*>/g, ' ').trim();
      const parts = content.match(/(\d+)[\u2019'\'\\u0027]\s*(.+)/);
      if (parts) {
        const minuto = parseInt(parts[1]);
        const nome = parts[2].trim();
        if (minuto > 0 && minuto <= 120 && nome.length > 2 && !eventi.find(e => e.minuto === minuto && e.nome === nome)) {
          eventi.push({ tipo: 'GOAL', minuto, nome });
        }
      }
    }
  }

  const yellowSection = html.match(/(?:Ammonit[io]|Ammonizioni|Yellow)[\s\S]{0,2000}/i);
  if (yellowSection) {
    const yRe = /(\d+)[\u2019'\'\\u0027]\s*([A-Z\u00C0-\u00DA][a-z\u00E0-\u00FA]+(?:\s+[A-Z\u00C0-\u00DA][a-z\u00E0-\u00FA]*)*)/g;
    let ym;
    while ((ym = yRe.exec(yellowSection[0])) !== null) {
      const minuto = parseInt(ym[1]);
      if (minuto > 0 && minuto <= 120) {
        eventi.push({ tipo: 'YELLOW', minuto, nome: ym[2].trim() });
      }
    }
  }

  const redSection = html.match(/(?:Espuls[io]|Espulsioni|Red)[\s\S]{0,2000}/i);
  if (redSection) {
    const rRe = /(\d+)[\u2019'\'\\u0027]\s*([A-Z\u00C0-\u00DA][a-z\u00E0-\u00FA]+(?:\s+[A-Z\u00C0-\u00DA][a-z\u00E0-\u00FA]*)*)/g;
    let rm;
    while ((rm = rRe.exec(redSection[0])) !== null) {
      const minuto = parseInt(rm[1]);
      if (minuto > 0 && minuto <= 120) {
        eventi.push({ tipo: 'RED', minuto, nome: rm[2].trim() });
      }
    }
  }

  return eventi;
}

// Parse matches from calendar text section (SGS copia-incolla)
function parseMatchesFromText(sectionText, teamName) {
  const partite = [];
  const lines = sectionText.split('\n');
  let currentBlocks = [null, null, null];
  for (const line of lines) {
    const dateMatches = [...line.matchAll(/ANDATA:\s+(\d{1,2}\/\d{1,2}\/\d{2})\s*\|[^|]*\|\s*RITORNO:\s+(\d{1,2}\/\d{1,2}\/\d{2})/g)];
    if (dateMatches.length > 0) {
      currentBlocks = [null, null, null];
      for (let c = 0; c < dateMatches.length; c++) {
        currentBlocks[c] = { dataAndata: dateMatches[c][1], dataRitorno: dateMatches[c][2] };
      }
      continue;
    }
    const oraMatches = [...line.matchAll(/ORE[.]*:\s*(\d{1,2}:\d{2})\s*\|\s*(\d+)\s*G\s*I\s*O\s*R\s*N\s*A\s*T\s*A\s*\|\s*ORE[.]*:\s*(\d{1,2}:\d{2})/g)];
    if (oraMatches.length > 0) {
      for (let c = 0; c < oraMatches.length; c++) {
        if (currentBlocks[c]) {
          currentBlocks[c].oraAndata = oraMatches[c][1];
          currentBlocks[c].giornata = parseInt(oraMatches[c][2]);
          currentBlocks[c].oraRitorno = oraMatches[c][3];
        }
      }
      continue;
    }
    const matchMatches = [...line.matchAll(/\|\s*([A-Z][A-Z0-9\s.''()\-\/]{3,}?)\s{2,}-\s{1,2}([A-Z][A-Z0-9\s.''()\-\/]{3,}?)\s*\|/g)];
    if (matchMatches.length > 0) {
      for (let c = 0; c < matchMatches.length; c++) {
        const block = currentBlocks[c];
        if (!block || !block.giornata) continue;
        const casa = matchMatches[c][1].trim();
        const ospite = matchMatches[c][2].trim();
        if (casa.toUpperCase().includes(teamName) || ospite.toUpperCase().includes(teamName)) {
          const isCasa = casa.toUpperCase().includes(teamName);
          const avversario = normalizeTeamName(isCasa ? ospite : casa);
          partite.push({ giornata: block.giornata, data: parseDateText(block.dataAndata, block.oraAndata), avversario, luogo: isCasa ? 'Casa' : 'Trasferta', competizione: 'Campionato' });
          partite.push({ giornata: block.giornata + 15, data: parseDateText(block.dataRitorno, block.oraRitorno), avversario, luogo: isCasa ? 'Trasferta' : 'Casa', competizione: 'Campionato' });
        }
      }
    }
  }
  const seen = new Set();
  const unique = [];
  for (const p of partite) {
    const key = `${p.avversario}|${p.luogo}|${p.data.substring(0,10)}`;
    if (!seen.has(key)) { seen.add(key); unique.push(p); }
  }
  unique.sort((a, b) => new Date(a.data) - new Date(b.data));
  unique.forEach((p, idx) => { p.giornata = idx + 1; });
  return unique;
}

// Log import nel DB
async function logImport(supabase, { workspace_id, team_id, user_id, tipo, fonte, dettagli, record_importati, record_saltati, esito, errore }) {
  await supabase.from('import_log').insert({
    workspace_id: workspace_id || null,
    team_id: team_id || null,
    user_id: user_id || null,
    tipo, fonte,
    dettagli: dettagli || {},
    record_importati: record_importati || 0,
    record_saltati: record_saltati || 0,
    esito: esito || 'success',
    errore: errore || null
  });
}

// Normalizza nome per filename logo
function normalizeLogoName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\u00e0-\u00fa]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Download file da URL HTTPS
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    https.get({ hostname: urlObj.hostname, path: urlObj.pathname + urlObj.search, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Scrape loghi da HTML Tuttocampo e salva in DB + filesystem
async function scrapeLogosFromHtml(html, supabase) {
  if (!html || html.length < 500) return { downloaded: 0, skipped: 0 };

  const LOGOS_DIR = path.join(__dirname, '../../../frontend-v2/public/logos');
  if (!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR, { recursive: true });

  // Pattern: <img alt="logo NomeSquadra" data-src='https://b2-content.tuttocampo.it/Teams/40/ID.png?v=X'
  const logoRegex = /<img\s+alt="logo ([^"]+)"\s+data-src='([^']*Teams\/\d+\/(\d+)\.png[^']*)'/gi;
  const teams = [];
  let m;
  while ((m = logoRegex.exec(html)) !== null) {
    const nome = m[1].trim();
    const logoUrl = m[2].replace('/40/', '/80/');
    const tcTeamId = m[3];
    const normalized = normalizeLogoName(nome);
    if (!teams.find(t => t.normalized === normalized)) {
      teams.push({ nome, normalized, logoUrl, tcTeamId });
    }
  }

  if (teams.length === 0) return { downloaded: 0, skipped: 0 };

  let downloaded = 0, skipped = 0;
  for (const team of teams) {
    const filePath = path.join(LOGOS_DIR, team.normalized + '.png');
    if (fs.existsSync(filePath)) { skipped++; continue; }
    try {
      const buffer = await downloadFile(team.logoUrl);
      if (buffer.length > 100) {
        fs.writeFileSync(filePath, buffer);
        downloaded++;
      }
    } catch (e) { /* skip */ }
  }

  // Save to DB
  for (const team of teams) {
    const logoPath = '/logos/' + team.normalized + '.png';
    const filePath = path.join(LOGOS_DIR, team.normalized + '.png');
    if (!fs.existsSync(filePath)) continue;
    await supabase.from('team_logo').upsert(
      { nome: team.nome, nome_normalizzato: team.normalized, logo_path: logoPath, tc_team_id: team.tcTeamId },
      { onConflict: 'nome_normalizzato' }
    );
  }

  return { downloaded, skipped, total: teams.length };
}

module.exports = {
  normalizeTeamName, normalizeForMatch, coreTeamName, matchTeamNameGR, parseMinuto,
  parseDateText, parseEventiFromHtml, parseMatchesFromText, logImport,
  scrapeLogosFromHtml, normalizeLogoName, downloadFile
};
