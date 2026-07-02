/**
 * Parser PDF Calendario SGS/LND
 * Estrae partite e campi da gioco da calendari federali
 */
const pdfParse = require('pdf-parse');

const HEADER_REGEX = /\*\s+(UNDER\s+\d+\s+\w+\s+\w+)\s+GIRONE:\s*([A-Z](?:\s*BIS)?)\s*\*/g;

/**
 * Step 1: Trova tutte le categorie/gironi in cui appare la squadra cercata
 */
async function findTeamInPdf(pdfBuffer, searchName) {
  const data = await pdfParse(pdfBuffer);
  const text = data.text;
  const searchUpper = searchName.toUpperCase().trim();
  
  // Trova tutti gli header e le loro posizioni
  const headers = [];
  let m;
  while ((m = HEADER_REGEX.exec(text)) !== null) {
    headers.push({ idx: m.index, cat: m[1].trim().replace(/\s+/g, ' '), girone: m[2].trim().replace(/\s+/g, ' ') });
  }
  HEADER_REGEX.lastIndex = 0;
  
  const results = [];
  const allTeamNames = new Set();
  
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].idx;
    const end = i + 1 < headers.length ? headers[i + 1].idx : text.length;
    const section = text.substring(start, end);
    
    // Cerca la squadra nelle partite di questa sezione
    let found = false;
    const matchRegex = /([A-Z][A-Z0-9\s.''()\-\/]{3,}?)\s{2,}-\s{1,2}([A-Z][A-Z0-9\s.''()\-\/]{3,}?)\s*\|/g;
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
  
  return { 
    categorie: results, 
    suggestions: [...allTeamNames].slice(0, 10),
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
  
  // Trova header e sezioni
  const headers = [];
  let m;
  while ((m = HEADER_REGEX.exec(text)) !== null) {
    headers.push({ idx: m.index, cat: m[1].trim().replace(/\s+/g, ' '), girone: m[2].trim().replace(/\s+/g, ' ') });
  }
  HEADER_REGEX.lastIndex = 0;
  
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
    // Cerca header date (può avere 1-3 date sulla stessa riga)
    const dateMatches = [...line.matchAll(/ANDATA:\s+(\d{1,2}\/\d{1,2}\/\d{2})\s*\|[^|]*\|\s*RITORNO:\s+(\d{1,2}\/\d{1,2}\/\d{2})/g)];
    if (dateMatches.length > 0) {
      currentBlocks = [null, null, null];
      for (let c = 0; c < dateMatches.length; c++) {
        currentBlocks[c] = { dataAndata: dateMatches[c][1], dataRitorno: dateMatches[c][2] };
      }
      continue;
    }
    
    // Cerca orari e giornata
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
    
    // Cerca partite (possono essere 1-3 per riga, separate da |   |)
    const matchMatches = [...line.matchAll(/\|\s*([A-Z][A-Z0-9\s.''()\-\/]{3,}?)\s{2,}-\s{1,2}([A-Z][A-Z0-9\s.''()\-\/]{3,}?)\s*\|/g)];
    if (matchMatches.length > 0) {
      for (let c = 0; c < matchMatches.length; c++) {
        const block = currentBlocks[c];
        if (!block || !block.giornata) continue;
        
        const casa = matchMatches[c][1].trim();
        const ospite = matchMatches[c][2].trim();
        
        if (casa.toUpperCase().includes(teamName) || ospite.toUpperCase().includes(teamName)) {
          const isCasa = casa.toUpperCase().includes(teamName);
          const avversario = isCasa ? ospite : casa;
          
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
    const venueMatch = line.match(/\|\s*([A-Z][A-Z0-9\s.''()\-\/]{3,}?)\s{2,}\|\s*\d+\s*\|\s*(.+?)\s{2,}(.+?)\s*\|\s*(\d{1,2}:\d{2})\s*\|\s*(.+?)\s*\|/);
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

module.exports = { findTeamInPdf, extractCalendar };
