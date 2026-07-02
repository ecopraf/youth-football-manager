/**
 * Import utilities — normalizzazione nomi, parsing eventi, log
 */

// Normalizza nome squadra da MAIUSCOLO a Title Case, rimuovendo suffissi legali
function normalizeTeamName(name) {
  let clean = name.replace(/\b(S\.?S\.?D\.?|S\.?R\.?L\.?|A\.?S\.?D\.?|A\.?R\.?L\.?|S\.?S\.?|A\.?C\.?|F\.?C\.?)\b\.?/gi, '').trim();
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean.split(' ').map(w => {
    if (w.length <= 2) return w.toUpperCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
}

// Normalizza per fuzzy match (lowercase, senza suffissi, senza punteggiatura)
function normalizeForMatch(name) {
  return name.toLowerCase()
    .replace(/\b(s\.?s\.?d\.?|s\.?r\.?l\.?|a\.?s\.?d\.?|a\.?r\.?l\.?|s\.?s\.?|a\.?c\.?|f\.?c\.?)\b/gi, '')
    .replace(/[^a-z\u00e0-\u00fa0-9\s]/g, '')
    .replace(/\s+/g, ' ').trim();
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

module.exports = {
  normalizeTeamName, normalizeForMatch, parseMinuto,
  parseDateText, parseEventiFromHtml, parseMatchesFromText, logImport
};
