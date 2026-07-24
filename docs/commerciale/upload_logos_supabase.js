/**
 * Upload loghi club su Supabase Storage
 * Usage: node upload_logos_supabase.js <regione>
 *        node upload_logos_supabase.js --all
 * Es:   node upload_logos_supabase.js lazio
 *       node upload_logos_supabase.js --all
 *
 * Bucket: club-logos (public)
 * Path:   {regione}/{filename}
 * Aggiorna logos/{regione}/index.json con URL pubblici
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPABASE_URL = 'https://csxdlxbhcnyfppojwwzy.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeGRseGJoY255ZnBwb2p3d3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc1MTMxMywiZXhwIjoyMDk3MzI3MzEzfQ.HZXGk1Xfz0EvSqewAoSCcgZ6gIQYLOP-54mE3YVHgBo';
const BUCKET = 'club-logos';

const TUTTE_LE_REGIONI = [
  'abruzzo', 'altoadige', 'basilicata', 'calabria', 'campania',
  'emiliaromagna', 'friuliveneziagiulia', 'lazio', 'liguria', 'lombardia',
  'marche', 'molise', 'nazionali', 'piemonte', 'puglia',
  'sardegna', 'sicilia', 'toscana', 'trentino', 'umbria', 'veneto'
];

const ALL = process.argv.includes('--all');
const RETRY = process.argv.includes('--retry');
const regione = (ALL || RETRY) ? null : process.argv[2];
if (!ALL && !RETRY && !regione) { console.error('Usage: node upload_logos_supabase.js <regione>\n       node upload_logos_supabase.js --all\n       node upload_logos_supabase.js --retry'); process.exit(1); }

const LOGOS_DIR = path.join(__dirname, 'logos');
const FAILED_FILE = path.join(__dirname, 'failed_uploads.json');

function uploadFile(filename, reg, buffer) {
  return new Promise((resolve, reject) => {
    const storagePath = `${reg}/${encodeURIComponent(filename)}`;
    const url = new URL(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'image/png',
        'Content-Length': buffer.length,
        'x-upsert': 'true',
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) resolve('ok');
        else reject(new Error(`HTTP ${res.statusCode}: ${body}`));
      });
    });
    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

function toAsciiFilename(filename) {
  return filename
    .normalize('NFD')                        // decompone caratteri accentati
    .replace(/[\u0300-\u036f]/g, '')         // rimuove diacritici
    .replace(/[^a-zA-Z0-9._\-]/g, '_')      // sostituisce non-ASCII con _
    .replace(/_+/g, '_')                     // collassa underscore multipli
    .replace(/^_|_(?=\.)/g, '');            // rimuove _ iniziali e prima del punto
}


function buildUrl(reg, filename) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${reg}/${encodeURIComponent(filename)}`;
}

async function uploadRegione(reg, failed) {
  const DIR = path.join(LOGOS_DIR, reg);
  if (!fs.existsSync(DIR)) { console.log(`⚠️  ${reg}: directory non trovata, skip`); return { ok: 0, err: 0, skip: true }; }

  const indexPath = path.join(DIR, 'index.json');
  if (!fs.existsSync(indexPath)) { console.log(`⚠️  ${reg}: index.json mancante, skip`); return { ok: 0, err: 0, skip: true }; }
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.png'));
  console.log(`\n🚀 [${reg}] Upload ${files.length} loghi...`);

  let ok = 0, err = 0;
  const urlIndex = {};

  for (let i = 0; i < files.length; i++) {
    const originalFilename = files[i];
    const filename = toAsciiFilename(originalFilename);
    // Rinomina file locale se necessario
    if (filename !== originalFilename) {
      fs.renameSync(path.join(DIR, originalFilename), path.join(DIR, filename));
      console.log(`  🔤 Rinominato: ${originalFilename} → ${filename}`);
    }
    process.stdout.write(`  [${i+1}/${files.length}] ${filename.substring(0, 45)} ... `);
    try {
      const buffer = fs.readFileSync(path.join(DIR, filename));
      await uploadFile(filename, reg, buffer);
      ok++;
      console.log('✅');
    } catch (e) {
      err++;
      failed.push({ regione: reg, filename });
      console.log(`❌ ${e.message}`);
    }
    if ((i + 1) % 20 === 0) await new Promise(r => setTimeout(r, 500));
  }

  // Aggiorna index.json con URL pubblici
  for (const [nome, filename] of Object.entries(index)) {
    urlIndex[nome] = publicUrl(filename, reg);
  }
  fs.writeFileSync(indexPath, JSON.stringify(urlIndex, null, 2));

  console.log(`  ✅ ${reg}: ${ok} caricati, ${err} errori`);
  return { ok, err };
}

async function retryFailed() {
  if (!fs.existsSync(FAILED_FILE)) { console.log('Nessun file failed_uploads.json trovato.'); return; }
  const list = JSON.parse(fs.readFileSync(FAILED_FILE, 'utf8'));
  console.log(`🔄 Retry ${list.length} file falliti...\n`);
  let ok = 0, err = 0;
  const stillFailed = [];
  for (const { regione: reg, filename: originalFilename } of list) {
    const filename = toAsciiFilename(originalFilename);
    const localPath = path.join(LOGOS_DIR, reg, originalFilename);
    const newLocalPath = path.join(LOGOS_DIR, reg, filename);
    if (filename !== originalFilename && fs.existsSync(localPath)) {
      fs.renameSync(localPath, newLocalPath);
      console.log(`  🔤 Rinominato: ${originalFilename} → ${filename}`);
    }
    process.stdout.write(`  ${reg}/${filename.substring(0, 40)} ... `);
    try {
      const buffer = fs.readFileSync(newLocalPath);
      await uploadFile(filename, reg, buffer);
      ok++;
      console.log('✅');
    } catch (e) {
      err++;
      stillFailed.push({ regione: reg, filename });
      console.log(`❌ ${e.message}`);
    }
  }
  fs.writeFileSync(FAILED_FILE, JSON.stringify(stillFailed, null, 2));
  console.log(`\n✅ Retry completato: ${ok} ok, ${err} ancora falliti`);
  if (stillFailed.length === 0) fs.unlinkSync(FAILED_FILE);
}

(async () => {
  const failed = [];

  if (RETRY) {
    await retryFailed();
    return;
  }

  const regioni = ALL ? TUTTE_LE_REGIONI : [regione];
  let totOk = 0, totErr = 0;

  for (const reg of regioni) {
    const { ok, err } = await uploadRegione(reg, failed);
    totOk += ok;
    totErr += err;
  }

  if (failed.length > 0) {
    fs.writeFileSync(FAILED_FILE, JSON.stringify(failed, null, 2));
    console.log(`\n⚠️  ${failed.length} file falliti salvati in failed_uploads.json`);
    console.log(`   Rilancia con: node upload_logos_supabase.js --retry`);
  }

  if (ALL) console.log(`\n🎉 Completato: ${totOk} caricati, ${totErr} errori su ${regioni.length} regioni`);
  console.log(`🔗 Bucket: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`);
})();
