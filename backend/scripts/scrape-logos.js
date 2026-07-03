/**
 * Scrape team logos from Tuttocampo calendar page
 * Usage: node scripts/scrape-logos.js <tuttocampo-calendario-url>
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { tcLogin, tcRequest } = require('../api/helpers/tuttocampo');
const { Pool } = require('pg');

const LOGOS_DIR = path.join(__dirname, '../../frontend-v2/public/logos');
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres.csxdlxbhcnyfppojwwzy:Yfm2026Secure!@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';

function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\u00e0-\u00fa]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

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

async function run() {
  const url = process.argv[2];
  if (!url) {
    console.log('Usage: node scripts/scrape-logos.js <tuttocampo-calendario-url>');
    process.exit(1);
  }

  if (!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR, { recursive: true });

  console.log('🔐 Login Tuttocampo...');
  const cookies = await tcLogin();

  console.log('📄 Fetching page:', url);
  const resp = await tcRequest(url, { headers: { 'Cookie': cookies } });
  const html = resp.data;

  // Parse: <img alt="logo NomeSquadra" data-src='https://b2-content.tuttocampo.it/Teams/40/ID.png?v=X'
  const logoRegex = /<img\s+alt="logo ([^"]+)"\s+data-src='([^']*Teams\/\d+\/(\d+)\.png[^']*)'/gi;
  const teams = [];
  let m;
  while ((m = logoRegex.exec(html)) !== null) {
    const nome = m[1].trim();
    const logoUrl = m[2].replace('/40/', '/80/');
    const tcTeamId = m[3];
    const normalized = normalizeName(nome);
    if (!teams.find(t => t.normalized === normalized)) {
      teams.push({ nome, normalized, logoUrl, tcTeamId });
    }
  }

  console.log(`\n🏟️  Trovate ${teams.length} squadre con logo\n`);

  let downloaded = 0, skipped = 0;
  for (const team of teams) {
    const filePath = path.join(LOGOS_DIR, team.normalized + '.png');
    if (fs.existsSync(filePath)) { skipped++; continue; }
    try {
      const buffer = await downloadFile(team.logoUrl);
      if (buffer.length > 100) {
        fs.writeFileSync(filePath, buffer);
        downloaded++;
        console.log(`  ✅ ${team.nome} → ${team.normalized}.png`);
      }
    } catch (e) {
      console.log(`  ❌ ${team.nome} — ${e.message}`);
    }
  }

  console.log(`\n📊 ${downloaded} scaricati, ${skipped} già presenti\n`);

  // Save to DB
  console.log('💾 Salvataggio in DB...');
  const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();
  try {
    let dbInserted = 0;
    for (const team of teams) {
      const logoPath = '/logos/' + team.normalized + '.png';
      const filePath = path.join(LOGOS_DIR, team.normalized + '.png');
      if (!fs.existsSync(filePath)) continue;
      await client.query(
        `INSERT INTO team_logo (nome, nome_normalizzato, logo_path, tc_team_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (nome_normalizzato) DO UPDATE SET logo_path = $3, tc_team_id = $4`,
        [team.nome, team.normalized, logoPath, team.tcTeamId]
      );
      dbInserted++;
    }
    console.log(`  ✅ ${dbInserted} record in team_logo`);
  } finally {
    client.release();
    await pool.end();
  }

  console.log('\n✨ Fatto! Committare i PNG in frontend-v2/public/logos/');
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
