/**
 * clean_csv.js — pulizia CSV: rimuove duplicati, azzera email fake, rimuove non laziali
 */
const fs = require('fs');
const path = require('path');

const CSV = path.join(__dirname, 'societa_lazio.csv');

// Domini fake rilevati (squadre di altre città/regioni)
const FAKE_DOMAINS = [
  'atleticopalermo','olimpianapoli','dinamotorino','dinamoverona','dinamomilano',
  'dinamobologna','dinamoroma','dinamogenova','rapidmilano','rapidgenova',
  'rapidverona','rapidcagliari','rapidnapoli','rapidfirenze','rapidroma',
  'propalermo','proroma','procagliari','progenova','pronapoli','profirenze',
  'fortitudogenova','fortitudobologna','fortitudoverona','fortitudonapoli','fortitudoroma',
  'libertasnapoli','libertastorino','libertasgenova',
  'aurorabologna','auroracagliari','aurorapalermo','auroraroma','aurorafirenze',
  'auroraverona','auroranapoli',
  'stellabologna','stellapalermo','stellatorino','stellaroma',
  'vigortorino','vigorgenova','vigorcagliari','vigormilano','vigorroma',
  'virtuspalermo','virtusverona','virtustorino','virtuscagliari','virtusroma',
  'olimpiacagliari','olimpiapalermo',
  'sportingcagliari','sportingfirenze',
  'atleticogenova','atleticobologna','atleticoverona','atleticoroma',
  'rinascitabologna','rinascitamilano','rinascitatorino','rinascitaverona',
  'rinascitacagliari','rinascitanapoli',
  'realmilano','realgenova','realverona','realnapoli','realfirenze',
  'audacemilano','audacefirenze','audaceverona','audacenapoli',
  'propalermo','olimpiabologna',
  'vigorbologna','stellanapoli',
];

// Società da rimuovere completamente
const REMOVE_NAMES = ['leocon', 'lairone', 'l airone', 'la cantera', 'montello calcio'];

function normalizeKey(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, ''); }

function isFakeEmail(email) {
  if (!email || email === 'N/D') return false;
  const e = email.toLowerCase();
  return FAKE_DOMAINS.some(d => e.includes(d));
}

function parseCSV(raw) {
  const lines = raw.split('\n');
  const header = lines[0];
  const rows = lines.slice(1).filter(l => l.trim()).map(line => {
    // gestisce virgole dentro campi quotati
    const cols = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; }
      else if (line[i] === ',' && !inQ) { cols.push(cur); cur = ''; }
      else cur += line[i];
    }
    cols.push(cur);
    return cols;
  });
  return { header, rows };
}

const raw = fs.readFileSync(CSV, 'utf8');
const { header, rows } = parseCSV(raw);

console.log(`📋 Righe iniziali: ${rows.length}`);

// Step 1: rimuovi società non laziali
const afterRemove = rows.filter(cols => {
  const name = cols[0]?.trim().toLowerCase();
  return !REMOVE_NAMES.some(r => normalizeKey(name) === normalizeKey(r));
});
console.log(`🗑️  Dopo rimozione non laziali: ${afterRemove.length} (rimossi ${rows.length - afterRemove.length})`);

// Step 2: azzera email fake
let fakeCount = 0;
afterRemove.forEach(cols => {
  if (isFakeEmail(cols[1]?.trim())) {
    console.log(`  ❌ Email fake azzerata: ${cols[0]} → ${cols[1]}`);
    cols[1] = '';
    fakeCount++;
  }
});
console.log(`🧹 Email fake azzerate: ${fakeCount}`);

// Step 3: deduplicazione — per ogni nome normalizzato, tieni la riga con email reale
const map = new Map();
afterRemove.forEach(cols => {
  const key = normalizeKey(cols[0]?.trim());
  const email = cols[1]?.trim();
  if (!map.has(key)) {
    map.set(key, cols);
  } else {
    const existing = map.get(key);
    const existingEmail = existing[1]?.trim();
    // Preferisci la riga con email reale (non vuota, non N/D)
    if (email && email !== 'N/D' && (!existingEmail || existingEmail === 'N/D')) {
      map.set(key, cols);
    }
    // Se entrambe hanno email, tieni quella esistente (prima trovata)
  }
});

const deduped = [...map.values()];
console.log(`🔄 Dopo deduplicazione: ${deduped.length} (rimossi ${afterRemove.length - deduped.length} duplicati)`);

// Step 4: ordina alfabeticamente e salva
deduped.sort((a, b) => (a[0] || '').localeCompare(b[0] || '', 'it', { sensitivity: 'base' }));

const esc = v => (!v ? '' : (v.includes(',') || v.includes('"') || v.includes('\n')) ? '"' + v.replace(/"/g, '""') + '"' : v);
const output = [header, ...deduped.map(cols => cols.map(esc).join(','))].join('\n') + '\n';
fs.writeFileSync(CSV, output, 'utf8');

const withEmail = deduped.filter(c => c[1]?.trim() && c[1].trim() !== 'N/D').length;
const nd = deduped.filter(c => c[1]?.trim() === 'N/D').length;
const empty = deduped.filter(c => !c[1]?.trim()).length;

console.log(`\n✅ CSV salvato: ${deduped.length} società`);
console.log(`   📧 Con email: ${withEmail}`);
console.log(`   ❓ N/D: ${nd}`);
console.log(`   ⬜ Senza email: ${empty}`);
