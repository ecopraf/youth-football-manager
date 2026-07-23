/**
 * Parser PDF Calendario SGS/LND
 * Estrae partite e campi da gioco da calendari federali
 */
const pdfParse = require('pdf-parse');

const HEADER_REGEX = /\*\s+((?:UNDER|GIOVANISSIMI|ALLIEVI)[^*]+?)\s+GIRONE:\s*([A-Z]{1,2})(?:\s+\w+)?\s*\*/g;
// Formato Veneto/Comitato Regionale: riga senza * (es. "JUNIORES UNDER 19 ELITE GIRONE:   A")
const HEADER_REGEX_CR = /^\s*((?:JUNIORES\s+)?(?:UNDER|GIOVANISSIMI|ALLIEVI)[^\n]+?)\s+GIRONE:\s*([A-Z]{1,2})\s*$/gm;
// Formato Emilia Romagna: categoria e girone su due righe consecutive
// es. "UNDER  14 PRO \nGIRONE UNICO " oppure "UNDER  17 REGIONALE \nGIRONE B (modificato...)  "
const HEADER_REGEX_ER = /((?:JUNIORES\s+)?(?:UNDER|GIOVANISSIMI|ALLIEVI)\s+[^\n]+?)\s*\n\s*GIRONE\s+(UNICO|[A-Z])(?:\s|\n|$)/g;
// Formato ER inline: categoria e girone sulla stessa riga (es. "UNDER  15 REGIONALE GIRONE C")
const HEADER_REGEX_ER_INLINE = /^\s*((?:JUNIORES\s+)?(?:UNDER|GIOVANISSIMI|ALLIEVI)\s+\S+(?:\s+\S+)*)\s+GIRONE\s+(UNICO|[A-Z])\s*$/;

// Mappa parole senza accento → con accento (dal PDF SGS arrivano senza)
const ACCENT_MAP = { 'Citta': 'Città', 'Virtus': 'Virtus', 'Universita': 'Università' };

// Normalizza nome squadra da MAIUSCOLO a Title Case, rimuovendo suffissi legali
// Rimuove suffissi legali dal nome squadra (S.R.L., A.S.D., S.S.D., ecc.)
function stripLegalSuffix(name) {
  return name.replace(/\s*\b(S\.?S\.?D\.?|S\.?R\.?L\.?|A\.?S\.?D\.?|A\.?R\.?L\.?|S\.?S\.?|A\.?C\.?|F\.?C\.?)\s*\.?\s*$/gi, '').trim();
}

function normalizeTeamName(name) {
  // Rimuovi suffissi legali
  let clean = name.replace(/\b(S\.?S\.?D\.?|S\.?R\.?L\.?|A\.?S\.?D\.?|A\.?R\.?L\.?|S\.?S\.?|A\.?C\.?|F\.?C\.?)\b\.?/gi, '').trim();
  // Rimuovi punti e spazi multipli residui
  clean = clean.replace(/\s+/g, ' ').trim();
  // Title Case
  clean = clean.split(' ').map(w => {
    if (w.length <= 2) return w.toUpperCase(); // C.S., FC, etc.
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
  // Ripristina accenti mancanti dal PDF
  for (const [plain, accented] of Object.entries(ACCENT_MAP)) {
    clean = clean.replace(new RegExp(`\\b${plain}\\b`, 'g'), accented);
  }
  return clean;
}

/**
 * Estrae tutti gli header (categoria + girone) dal testo, supportando entrambi i formati.
 */
function extractHeaders(text) {
  const headers = [];
  let m;
  // Formato standard SGS (con *)
  while ((m = HEADER_REGEX.exec(text)) !== null) {
    headers.push({ idx: m.index, cat: m[1].trim().replace(/\s+/g, ' '), girone: m[2].trim() });
  }
  HEADER_REGEX.lastIndex = 0;
  if (headers.length > 0) return headers;
  // Formato Comitato Regionale inline (es. Veneto: "JUNIORES UNDER 19 ELITE GIRONE:   A")
  while ((m = HEADER_REGEX_CR.exec(text)) !== null) {
    headers.push({ idx: m.index, cat: m[1].trim().replace(/\s+/g, ' '), girone: m[2].trim() });
  }
  HEADER_REGEX_CR.lastIndex = 0;
  if (headers.length > 0) return headers;
  // Formato Emilia Romagna — inline (es. "UNDER 15 REGIONALE GIRONE C") processato riga per riga
  const inlineCatGironi = new Set();
  let lineStart = 0;
  for (const line of text.split('\n')) {
    const t = line.trim();
    const mi = HEADER_REGEX_ER_INLINE.exec(t);
    if (mi) {
      const cat = mi[1].trim().replace(/\s+/g, ' ');
      const girone = mi[2].trim();
      headers.push({ idx: lineStart, cat, girone });
      inlineCatGironi.add(`${cat}|${girone}`);
    }
    HEADER_REGEX_ER_INLINE.lastIndex = 0;
    lineStart += line.length + 1;
  }
  // Formato ER due righe — salta coppie cat+girone già coperte dall'inline
  while ((m = HEADER_REGEX_ER.exec(text)) !== null) {
    const cat = m[1].trim().replace(/\s+/g, ' ');
    const girone = m[2].trim() === 'UNICO' ? 'UNICO' : m[2].trim();
    if (inlineCatGironi.has(`${cat}|${girone}`)) continue;
    headers.push({ idx: m.index, cat, girone });
  }
  HEADER_REGEX_ER.lastIndex = 0;
  headers.sort((a, b) => a.idx - b.idx);
  return headers;
}

/**
 * Step 1: Trova tutte le categorie/gironi in cui appare la squadra cercata
 */
async function findTeamInPdf(pdfBuffer, searchName) {
  const data = await pdfParse(pdfBuffer);
  const text = data.text;
  const searchUpper = searchName.toUpperCase().trim();
  
  const headers = extractHeaders(text);
  const results = [];
  const allTeamNames = new Set();
  
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].idx;
    const end = i + 1 < headers.length ? headers[i + 1].idx : text.length;
    const section = text.substring(start, end);
    
    // Cerca la squadra nelle partite di questa sezione
    let found = false;
    const matchRegex = /([A-Z][A-Z0-9\s.''()\-\/]{3,}?)\s{2,}-\s{1,2}([A-Z][A-Z0-9\s.''()\-\/]{3,}?)\s{2,}[|I]/g;
    let mm;
    while ((mm = matchRegex.exec(section)) !== null) {
      const t1 = mm[1].trim();
      const t2 = mm[2].trim();
      if (t1.toUpperCase().includes(searchUpper) || t2.toUpperCase().includes(searchUpper)) {
        found = true;
      }
      if (t1.toUpperCase().includes(searchUpper.substring(0, 6))) allTeamNames.add(t1);
      if (t2.toUpperCase().includes(searchUpper.substring(0, 6))) allTeamNames.add(t2);
    }
    
    if (found) {
      const { cat, girone } = headers[i];
      if (!results.find(r => r.categoria === cat && r.girone === girone)) {
        results.push({ categoria: cat, girone });
      }
    }
  }
  
  const cleanSuggestions = [...allTeamNames]
    .filter(t => t.length > 3 && /^[A-Z]/.test(t) && !/[\n|]/.test(t) && !t.startsWith('I ') && !t.startsWith('I  '))
    .slice(0, 10);
  return { 
    categorie: results, 
    suggestions: cleanSuggestions,
    exactMatch: results.length > 0
  };
}

/**
 * Step 2: Estrae il calendario completo per una specifica categoria/girone
 */
async function extractCalendar(pdfBuffer, searchName, categoriaTarget, gironeTarget) {
  const data = await pdfParse(pdfBuffer);
  const text = data.text;
  const searchUpper = searchName.toUpperCase().trim();
  
  const headers = extractHeaders(text);
  
  let calendarText = null;
  let campiText = null;
  
  for (let i = 0; i < headers.length; i++) {
    const { cat, girone } = headers[i];
    if (cat !== categoriaTarget || girone !== gironeTarget) continue;
    
    const start = headers[i].idx;
    const end = i + 1 < headers.length ? headers[i + 1].idx : text.length;
    const section = text.substring(start, end);
    
    // La sezione può contenere sia calendario che campi
    const campiIdx = section.indexOf('E L E N C O     C A M P I');
    if (campiIdx > -1) {
      calendarText = section.substring(0, campiIdx);
      campiText = section.substring(campiIdx);
    } else {
      calendarText = section;
    }
    break;
  }
  
  const partite = calendarText ? parseMatches(calendarText, searchUpper) : [];
  const campi = campiText ? parseVenues(campiText) : {};
  
  // Arricchisci trasferte con indirizzo
  for (const p of partite) {
    if (p.luogo === 'Trasferta') {
      const avvUpper = p.avversario.toUpperCase();
      for (const [teamName, info] of Object.entries(campi)) {
        if (teamName.toUpperCase() === avvUpper || 
            avvUpper.includes(teamName.toUpperCase().substring(0, 10)) || 
            teamName.toUpperCase().includes(avvUpper.substring(0, 10))) {
          p.indirizzo_campo = `${info.nome} - ${info.indirizzo}, ${info.localita}`;
          break;
        }
      }
    }
  }
  
  return { partite, campi, categoria: categoriaTarget, girone: gironeTarget };
}

/**
 * Parsa le partite dalla sezione calendario (3 colonne per riga)
 * Struttura: 3 colonne affiancate, ogni colonna = 1 giornata (andata+ritorno)
 * Riga 1: | ANDATA: data | | RITORNO: data |   | ANDATA: data | | RITORNO: data | ...
 * Riga 2: | ORE: hh:mm | N GIORNATA | ORE: hh:mm |   | ORE: hh:mm | N GIORNATA | ORE: hh:mm | ...
 * Righe 3+: | SQUADRA_A - SQUADRA_B |   | SQUADRA_C - SQUADRA_D | ...
 */
function parseMatches(sectionText, teamName) {
  const partite = [];
  const lines = sectionText.split('\n');
  
  // Stato corrente per ogni colonna (3 colonne)
  let currentBlocks = [null, null, null]; // {dataAndata, oraAndata, dataRitorno, oraRitorno, giornata}
  
  for (const line of lines) {
    // Cerca header date (può avere 1-3 date sulla stessa riga) — supporta sia | che I come bordo
    const dateMatches = [...line.matchAll(/ANDATA:\s+(\d{1,2}\/\d{1,2}\/\d{2})\s*[|!][^|!]*[|!]\s*RITORNO:\s+(\d{1,2}\/\d{1,2}\/\d{2})/g)];
    if (dateMatches.length > 0) {
      currentBlocks = [null, null, null];
      for (let c = 0; c < dateMatches.length; c++) {
        currentBlocks[c] = { dataAndata: dateMatches[c][1], dataRitorno: dateMatches[c][2] };
      }
      continue;
    }
    
    // Cerca orari e giornata
    const oraMatches = [...line.matchAll(/ORE[.]*:\s*(\d{1,2}:\d{2})\s*[|!]\s*(\d+)\s*G\s*I\s*O\s*R\s*N\s*A\s*T\s*A\s*[|!]\s*ORE[.]*:\s*(\d{1,2}:\d{2})/g)];
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
    
    // Cerca partite (possono essere 1-3 per riga, separate da |   | oppure I   I)
    const matchMatches = [...line.matchAll(/[|I]\s*([A-Z][A-Z0-9\s.''()\-\/]{3,}?)\s{2,}-\s{1,2}([A-Z][A-Z0-9\s.''()\-\/]{3,}?)\s{2,}[|I]/g)];
    // Il secondo gruppo usa {3,}? lazy con stop su \s{2,}[|I] per catturare il nome completo
    if (matchMatches.length > 0) {
      for (let c = 0; c < matchMatches.length; c++) {
        const block = currentBlocks[c];
        if (!block || !block.giornata) continue;
        
        const casa = matchMatches[c][1].trim();
        const ospite = matchMatches[c][2].trim();
        
        if (casa.toUpperCase().includes(teamName) || ospite.toUpperCase().includes(teamName)) {
          const isCasa = casa.toUpperCase().includes(teamName);
          const avversario = normalizeTeamName(isCasa ? ospite : casa);
          
          // Partita di andata
          partite.push({
            giornata: block.giornata,
            data: parseDate(block.dataAndata, block.oraAndata),
            avversario,
            luogo: isCasa ? 'Casa' : 'Trasferta',
            competizione: 'Campionato'
          });
          
          // Partita di ritorno (casa/trasferta invertita)
          partite.push({
            giornata: block.giornata + 15,
            data: parseDate(block.dataRitorno, block.oraRitorno),
            avversario,
            luogo: isCasa ? 'Trasferta' : 'Casa',
            competizione: 'Campionato'
          });
        }
      }
    }
  }
  
  // Deduplica, ordina e rinumera
  const seen = new Set();
  const unique = [];
  for (const p of partite) {
    const key = `${p.avversario}|${p.luogo}|${p.data.substring(0,10)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  }
  
  unique.sort((a, b) => new Date(a.data) - new Date(b.data));
  unique.forEach((p, idx) => { p.giornata = idx + 1; });
  
  return unique;
}

/**
 * Parsa la tabella campi da gioco
 */
function parseVenues(sectionText) {
  const campi = {};
  const lines = sectionText.split('\n');
  
  for (const line of lines) {
    // Pattern: "| SQUADRA  |  NNN | NOME_CAMPO  (TIPO)  LOCALITA  | HH:MM | INDIRIZZO  |"
    const venueMatch = line.match(/[|I]\s*([A-Z][A-Z0-9\s.''()\-\/]{3,}?)\s{2,}[|I]\s*\d+\s*[|I]\s*(.+?)\s{2,}(.+?)\s*[|I]\s*(\d{1,2}:\d{2})\s*[|I]\s*(.+?)\s*[|I]/);
    if (venueMatch) {
      const teamName = venueMatch[1].trim();
      const nomeCampo = venueMatch[2].trim();
      const localita = venueMatch[3].trim();
      const ora = venueMatch[4].trim();
      const indirizzo = venueMatch[5].trim();
      
      if (teamName.length > 3 && indirizzo.length > 3) {
        campi[teamName] = { nome: nomeCampo, localita, ora, indirizzo };
      }
    }
  }
  
  return campi;
}

/**
 * Converte data "5/10/25" + ora "15:30" in ISO string
 */
function parseDate(dateStr, timeStr) {
  const parts = dateStr.trim().split('/');
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const year = 2000 + parseInt(parts[2]);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes).toISOString();
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSER CAMPANIA — formato lineare (nessuna tabella a colonne)
// Header: "CAMPIONATO DI UNDER 15 GIRONE -A-"
// Giornata: "4a GIORNATA" + "A. 19/10/2025R. 11/01/2026"
// Partite: due squadre concatenate sulla stessa riga (es. "AVELLINO 1912AZZURRI")
// ─────────────────────────────────────────────────────────────────────────────

const CAMPANIA_HEADER_RE = /CAMPIONATO\s+DI\s+(UNDER\s+\d+)\s*GIRONE\s+-([A-Z])-/i;
const CAMPANIA_GIORNATA_RE = /(\d+)a\s+GIORNATA/i;
const CAMPANIA_DATE_RE = /A\.\s*(\d{1,2}\/\d{1,2}\/\d{4})R\.\s*(\d{1,2}\/\d{1,2}\/\d{4})/;

/**
 * Rileva se il PDF è in formato Campania (lineare, senza tabelle a colonne).
 * Criteri discriminanti rispetto al formato standard SGS:
 * - Date andata/ritorno concatenate sulla stessa riga: "A. DD/MM/YYYYR. DD/MM/YYYY"
 * - Giornate in formato "Na GIORNATA" (non "N G I O R N A T A" spaziato)
 * - Assenza di bordi tabella (nessun | o I come separatore di colonna)
 */
function isCampaniaFormat(text) {
  const hasLinearDates = CAMPANIA_DATE_RE.test(text);
  const hasSpacedGiornata = /\d\s+G\s+I\s+O\s+R\s+N\s+A\s+T\s+A/.test(text); // formato standard
  return hasLinearDates && !hasSpacedGiornata;
}

/**
 * Estrae tutte le squadre del girone dal testo Campania.
 * Le squadre si ricavano raccogliendo tutti i nomi unici che compaiono nelle righe-partita.
 */
/**
 * Raccoglie le righe-partita grezze (non ancora splittate) dal testo Campania.
 */
function collectCampaniaRawLines(text) {
  const raw = [];
  const lines = text.split('\n');
  let inGiornata = false;
  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;
    if (CAMPANIA_GIORNATA_RE.test(l)) { inGiornata = true; continue; }
    if (CAMPANIA_DATE_RE.test(l)) continue;
    if (/^Riposa\s*:/i.test(l)) continue;
    if (inGiornata && /^[A-Z]/.test(l)) raw.push(l);
  }
  return raw;
}

/**
 * Separa una riga "SQUADRA_ACASASQUADRA_BOSPITE" nelle due squadre.
 * Il punto di split è dove una parola finisce (lettera/cifra/punto) e inizia
 * subito una nuova parola maiuscola senza spazio intermedio.
 * Con lista nota: usa prefix-match ordinato per lunghezza (più preciso).
 */
function splitCampaniaPair(line, knownTeams) {
  if (knownTeams && knownTeams.length > 0) {
    const sorted = [...knownTeams].sort((a, b) => b.length - a.length);
    const lineUp = line.toUpperCase();
    for (const t of sorted) {
      const tUp = t.toUpperCase();
      if (lineUp.startsWith(tUp) && lineUp.length > tUp.length) {
        const rest = line.substring(t.length).trim();
        if (rest.length > 3) return [t, rest];
      }
    }
    return null;
  }
  // Senza lista: trova il punto di split dove una parola finisce e un'altra inizia senza spazio.
  // Priorità: split dopo "." o ")" seguito da maiuscola (es. "S.R.L.AZZURRI", "ASD)BOYS")
  // Fallback: split dove una sequenza di maiuscole/cifre/spazi finisce e ricomincia (es. "ORTESEBOYS")
  
  // Tentativo 1: split dopo punto/parentesi seguiti da maiuscola
  const dotSplits = [];
  for (let i = 4; i < line.length - 4; i++) {
    if (/[.)]/.test(line[i - 1]) && /[A-Z]/.test(line[i])) {
      dotSplits.push(i);
    }
  }
  for (const idx of dotSplits) {
    const left = line.substring(0, idx).trim();
    const right = line.substring(idx).trim();
    if (left.length >= 4 && right.length >= 4) return [left, right];
  }
  
  // Tentativo 2: split dove una lettera minuscola/cifra è seguita da maiuscola (non c'è in questo formato)
  // oppure dove due parole maiuscole si toccano: fine di una parola (spazio prima) + inizio nuova
  // Cerca: " [A-Z]" che sia preceduto da almeno 4 char e seguito da almeno 4 char
  // ma solo se il char PRIMA dello spazio non è già uno spazio (cioè fine di una parola)
  for (let i = 5; i < line.length - 4; i++) {
    if (line[i - 1] !== ' ' && /[A-Z]/.test(line[i]) && line[i - 2] === ' ') {
      // Siamo all'inizio di una parola dopo uno spazio — non è un split
      continue;
    }
    // Split dove lettera è seguita da lettera senza spazio, e la lettera precedente chiude una parola
    if (/[A-Z]/.test(line[i]) && /[A-Z]/.test(line[i-1]) && i > 4) {
      // Verifica che sia un confine: la parola a sinistra finisce qui
      // Euristica: se i char precedenti formano una parola di senso (>= 3 char senza spazio)
      const leftWord = line.substring(0, i).split(' ').pop();
      if (leftWord && leftWord.length >= 3) {
        const left = line.substring(0, i).trim();
        const right = line.substring(i).trim();
        if (left.length >= 4 && right.length >= 4) return [left, right];
      }
    }
  }
  return null;
}

function extractCampaniaTeams(text) {
  const rawLines = collectCampaniaRawLines(text);
  // Prima passata senza lista: split grezzo per raccogliere candidati
  const candidates = new Set();
  for (const l of rawLines) {
    const pair = splitCampaniaPair(l);
    if (pair) { candidates.add(pair[0]); candidates.add(pair[1]); }
  }
  // Seconda passata con lista: split preciso
  const teams = new Set();
  for (const l of rawLines) {
    const pair = splitCampaniaPair(l, [...candidates]);
    if (pair) { teams.add(pair[0]); teams.add(pair[1]); }
    else {
      // fallback: aggiungi i candidati grezzi
      const pair2 = splitCampaniaPair(l);
      if (pair2) { teams.add(pair2[0]); teams.add(pair2[1]); }
    }
  }
  return [...teams].filter(t => t.length > 3);
}

/**
 * Converte data "19/10/2025" in ISO string con ora default 15:00
 */
function parseCampaniaDate(dateStr) {
  const [day, month, year] = dateStr.trim().split('/').map(Number);
  return new Date(year, month - 1, day, 15, 0).toISOString();
}

/**
 * Step 1 Campania: trova categoria/girone nel PDF
 */
async function findTeamInCampaniaPdf(pdfBuffer, searchName) {
  const data = await pdfParse(pdfBuffer);
  const text = data.text;
  const searchUpper = searchName.toUpperCase().trim();

  const headerMatch = text.match(CAMPANIA_HEADER_RE);
  if (!headerMatch) return { categorie: [], suggestions: [], exactMatch: false };

  const categoria = headerMatch[1].trim().toUpperCase().replace(/\s+/g, ' ');
  const girone = headerMatch[2].trim();

  // Raccoglie tutte le squadre per suggestions
  const allTeams = extractCampaniaTeams(text);
  const found = allTeams.some(t => t.toUpperCase().includes(searchUpper));

  return {
    categorie: found ? [{ categoria, girone }] : [],
    suggestions: allTeams.filter(t => t.length > 5 && !/[a-z]/.test(t.substring(0,3)) && !t.endsWith('.')).slice(0, 10),
    exactMatch: found,
    _format: 'campania'
  };
}

/**
 * Step 2 Campania: estrae il calendario per la squadra cercata
 */
async function extractCampaniaCalendar(pdfBuffer, searchName) {
  const data = await pdfParse(pdfBuffer);
  const text = data.text;
  const searchUpper = searchName.toUpperCase().trim();

  const headerMatch = text.match(CAMPANIA_HEADER_RE);
  const categoria = headerMatch ? headerMatch[1].trim().toUpperCase().replace(/\s+/g, ' ') : 'UNDER';
  const girone = headerMatch ? headerMatch[2].trim() : '?';

  // Trova il nome completo della squadra cercata.
  // Raccoglie tutti i prefissi delle righe dove il nome cercato è in testa,
  // poi prende il più lungo che appare in almeno 2 righe (o il più corto se unico).
  // Ogni riga ha formato "NOME_CASANOME_OSPITE" senza separatore.
  // Il nome completo è il prefisso che si ripete identico in più giornate.
  const casaLines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.toUpperCase().startsWith(searchUpper) && !CAMPANIA_GIORNATA_RE.test(l) && !CAMPANIA_DATE_RE.test(l) && !/^Riposa/i.test(l));

  // Trova il nome completo: è il prefisso comune a tutte le righe casa
  // (tutte iniziano con lo stesso nome squadra, poi hanno avversari diversi)
  let fullName = searchName;
  if (casaLines.length >= 2) {
    // Prendi la riga più corta come riferimento (meno caratteri da confrontare)
    const ref = casaLines.reduce((a, b) => a.length <= b.length ? a : b);
    // Il nome finisce dove le righe divergono
    let commonLen = 0;
    for (let i = 0; i < ref.length; i++) {
      if (casaLines.every(l => l[i] === ref[i])) commonLen = i + 1;
      else break;
    }
    if (commonLen > searchUpper.length) fullName = ref.substring(0, commonLen).trim();
  } else if (casaLines.length === 1) {
    // Una sola riga casa: usa split grezzo sul primo confine dopo il nome cercato
    const l = casaLines[0];
    // Cerca il primo punto di split: cifra seguita da maiuscola, o spazio-fine-parola seguito da maiuscola incollata
    for (let i = searchUpper.length; i < l.length - 1; i++) {
      if (/\d/.test(l[i]) && /[A-Z]/.test(l[i + 1])) { fullName = l.substring(0, i).trim(); break; }
      if (l[i] === ' ' && /[A-Z]/.test(l[i + 1]) && i > searchUpper.length + 2) {
        // Controlla se la parola successiva è incollata (non fa parte del nome)
        // euristica: se la parola precedente è già lunga abbastanza
        const words = l.substring(0, i).split(' ');
        if (words.length >= 2) { fullName = l.substring(0, i).trim(); break; }
      }
    }
  }
  const fullNameUpper = fullName.toUpperCase();
  const fullNameLen = fullName.length;

  const partite = [];
  const lines = text.split('\n');
  let currentGiornata = null;
  let currentDataAndata = null;
  let currentDataRitorno = null;

  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;

    const giornataMatch = l.match(CAMPANIA_GIORNATA_RE);
    if (giornataMatch) { currentGiornata = parseInt(giornataMatch[1]); continue; }

    const dateMatch = l.match(CAMPANIA_DATE_RE);
    if (dateMatch) { currentDataAndata = dateMatch[1]; currentDataRitorno = dateMatch[2]; continue; }

    if (/^Riposa\s*:/i.test(l) || !currentGiornata || !currentDataAndata) continue;

    const lineUp = l.toUpperCase();
    if (!lineUp.includes(fullNameUpper)) continue;

    let isCasa, avversarioRaw;
    if (lineUp.startsWith(fullNameUpper)) {
      // Squadra cercata è in casa: il resto della riga è l'avversario
      isCasa = true;
      avversarioRaw = l.substring(fullNameLen).trim();
    } else {
      // Squadra cercata è ospite: tutto prima del suo nome è l'avversario
      const idx = lineUp.indexOf(fullNameUpper);
      isCasa = false;
      avversarioRaw = l.substring(0, idx).trim();
    }

    if (!avversarioRaw || avversarioRaw.length < 2) continue;
    const avversario = normalizeTeamName(stripLegalSuffix(avversarioRaw));

    partite.push({ giornata: currentGiornata, data: parseCampaniaDate(currentDataAndata), avversario, luogo: isCasa ? 'Casa' : 'Trasferta', competizione: 'Campionato' });
    partite.push({ giornata: currentGiornata + 100, data: parseCampaniaDate(currentDataRitorno), avversario, luogo: isCasa ? 'Trasferta' : 'Casa', competizione: 'Campionato' });
  }

  partite.sort((a, b) => new Date(a.data) - new Date(b.data));
  partite.forEach((p, i) => { p.giornata = i + 1; });

  return { partite, campi: {}, categoria, girone };
}

module.exports = { findTeamInPdf, extractCalendar, isCampaniaFormat, findTeamInCampaniaPdf, extractCampaniaCalendar };
