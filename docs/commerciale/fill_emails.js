/**
 * fill_emails.js — ricontrolla le schede TC per le righe senza email
 * Usa Puppeteer per superare AWS WAF JavaScript challenge
 *
 * Uso: node docs/commerciale/fill_emails.js
 */

const puppeteer = require('./node_modules/puppeteer');
const fs = require('fs');
const path = require('path');

const CSV = path.join(__dirname, 'societa_lazio.csv');
const DELAY_MS = 1500;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TC_USER = 'infinitipiani';
const TC_PASS = 'paralleli';

async function login(page) {
  await page.goto('https://www.tuttocampo.it/Web/Login.php', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(async (user, pass) => {
    const body = `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}&remind_me=remind_me&destination_page=/Homepage&submit_login=Accedi`;
    await fetch('/Web/Views/Login/LoginModal.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
  }, TC_USER, TC_PASS);
  await new Promise(r => setTimeout(r, 1000));
}

function extractEmail(html) {
  if (/<td>Email<\/td>\s*<td>\s*-\s*<\/td>/.test(html)) return 'ABSENT';
  // Email nella cella dopo label
  const cellM = html.match(/<td>Email<\/td>\s*<td>\s*([^<\s]+@[^<\s]+)\s*<\/td>/i);
  if (cellM) {
    const e = cellM[1].toLowerCase();
    if (!e.includes('tuttocampo')) return e;
  }
  // Fallback regex generica
  const re = /([a-zA-Z0-9._%+\-]+@(?!tuttocampo|google|example|scorecardresearch)[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const e = m[1].toLowerCase();
    if (!e.includes('tuttocampo') && !e.includes('tiktok')) return e;
  }
  return '';
}

async function main() {
  const raw = fs.readFileSync(CSV, 'utf8');
  const lines = raw.split('\n');
  const header = lines[0];
  const rows = lines.slice(1).filter(l => l.trim());

  const toFill = rows.map((line, i) => {
    const cols = line.split(',');
    return { i, cols, email: cols[1]?.trim() };
  }).filter(r => !r.email || r.email === '');

  console.log(`📋 ${rows.length} società totali, ${toFill.length} senza email\n`);
  if (toFill.length === 0) { console.log('✅ Tutte le società hanno già email o N/D'); return; }

  console.log('🚀 Avvio browser Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'it-IT,it;q=0.9' });

  console.log('🌐 Carico homepage TC e faccio login...');
  await page.goto('https://www.tuttocampo.it/', { waitUntil: 'networkidle2', timeout: 30000 });
  await login(page);
  console.log('   ✅ Login effettuato');

  let updated = 0;

  for (const row of toFill) {
    const schedaUrl = row.cols[2]?.trim();
    const name = row.cols[0];

    if (!schedaUrl || !schedaUrl.startsWith('http')) {
      console.log(`  ⚠️  ${name} — nessun link scheda, skip`);
      continue;
    }

    await sleep(DELAY_MS);
    process.stdout.write(`  🔍 ${name} ... `);

    try {
      await page.goto(schedaUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(800);
    } catch (e) {
      console.log('⏳ timeout, skip');
      continue;
    }

    let html = await page.content();

    const email = extractEmail(html);

    if (email === 'ABSENT') {
      console.log('N/D (assente su TC)');
      row.cols[1] = 'N/D';
    } else if (email) {
      console.log(email);
      row.cols[1] = email;
      updated++;
    } else {
      console.log('— (non trovata, riproverà)');
    }

    // Salva dopo ogni riga
    const updatedRows = rows.map((l, i) => {
      const match = toFill.find(r => r.i === i);
      return match ? match.cols.join(',') : l;
    }).sort((a, b) => a.split(',')[0].localeCompare(b.split(',')[0], 'it', { sensitivity: 'base' }));
    fs.writeFileSync(CSV, [header, ...updatedRows].join('\n') + '\n');
  }

  await browser.close();
  console.log(`\n✅ Completato! ${updated} email trovate`);
}

main().catch(e => { console.error(e); process.exit(1); });
