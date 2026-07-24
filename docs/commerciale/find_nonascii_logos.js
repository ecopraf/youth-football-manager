/**
 * Trova tutti i file con caratteri non-ASCII nelle cartelle logos/
 * e crea failed_uploads.json per il retry
 * Usage: node find_nonascii_logos.js
 */

const fs = require('fs');
const path = require('path');

const LOGOS_DIR = path.join(__dirname, 'logos');
const FAILED_FILE = path.join(__dirname, 'failed_uploads.json');

const REGIONI = [
  'abruzzo', 'altoadige', 'basilicata', 'calabria', 'campania',
  'emiliaromagna', 'friuliveneziagiulia', 'lazio', 'liguria', 'lombardia',
  'marche', 'molise', 'nazionali', 'piemonte', 'puglia',
  'sardegna', 'sicilia', 'toscana', 'trentino', 'umbria', 'veneto'
];

function hasNonAscii(str) {
  return /[^\x00-\x7F]/.test(str);
}

const failed = [];

for (const reg of REGIONI) {
  const DIR = path.join(LOGOS_DIR, reg);
  if (!fs.existsSync(DIR)) continue;
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.png') && hasNonAscii(f));
  for (const filename of files) {
    failed.push({ regione: reg, filename });
    console.log(`  ${reg}/${filename}`);
  }
}

if (failed.length === 0) {
  console.log('✅ Nessun file con caratteri non-ASCII trovato.');
} else {
  fs.writeFileSync(FAILED_FILE, JSON.stringify(failed, null, 2));
  console.log(`\n⚠️  ${failed.length} file non-ASCII trovati → failed_uploads.json`);
  console.log(`   Rilancia con: node upload_logos_supabase.js --retry`);
}
