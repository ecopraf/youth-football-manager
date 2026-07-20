/**
 * test_girone.js — testa UN solo girone senza scrivere sul CSV
 */
const puppeteer = require('./node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TC_USER = 'infinitipiani';
const TC_PASS = 'paralleli';
const TEST_GIRONE = 'GiovanissimiRegionaliU15/GironeCRegionali';
const DELAY_MS = 1500;

const ANOMALY_WORDS = [
  'bologna','palermo','napoli','milano','torino','genova','firenze','venezia',
  'bari','catania','cagliari','verona','brescia','parma','modena','padova',
];

function extractTeamLinks(html, campionato) {
  const re = /href="(https:\/\/www\.tuttocampo\.it\/2025-26\/Lazio\/[^"]+\/Squadra\/[^"]+\/\d+\/Scheda)"/g;
  const links = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[1].includes(campionato)) links.add(m[1]);
  }
  return [...links];
}

function extractEmail(html) {
  const emailCellM = html.match(/<td>Email<\/td>\s*<td>\s*([^<\s]+@[^<\s]+)\s*<\/td>/i);
  if (emailCellM) {
    const e = emailCellM[1].toLowerCase();
    if (!e.includes('tuttocampo')) return e;
  }
  const badDomains = ['tuttocampo','facebook','instagram','google','scorecardresearch','flashb','cdn.','pagead','doubleclick'];
  const emailRe = /([a-zA-Z0-9._%+\-]+@(?!tuttocampo|google|example)[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g;
  let m;
  while ((m = emailRe.exec(html)) !== null) {
    const e = m[1].toLowerCase();
    if (!badDomains.some(d => e.includes(d))) return e;
  }
  return '';
}

async function main() {
  const [campionato, girone] = TEST_GIRONE.split('/');
  const url = `https://www.tuttocampo.it/2025-26/Lazio/${campionato}/${girone}/Classifica`;

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'it-IT,it;q=0.9' });

  // Login
  await page.goto('https://www.tuttocampo.it/Web/Login.php', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(async (user, pass) => {
    await fetch('/Web/Views/Login/LoginModal.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}&remind_me=remind_me&destination_page=/Homepage&submit_login=Accedi`
    });
  }, TC_USER, TC_PASS);
  await sleep(1000);
  console.log('✅ Login OK\n');

  // Girone
  console.log(`📋 Test girone: ${TEST_GIRONE}`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1000);

  let pageHtml = await page.content();
  let tckk = pageHtml.match(/tckk='([^']+)'/)?.[ 1];

  if (!tckk) {
    await page.goto(url.replace('/Classifica', '/Squadre'), { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(800);
    pageHtml = await page.content();
    tckk = pageHtml.match(/tckk='([^']+)'/)?.[ 1];
  }

  if (!tckk) { console.log('❌ no tckk trovato'); await browser.close(); return; }
  console.log(`  tckk: ${tckk}`);

  await sleep(DELAY_MS);
  const teamsHtml = await page.evaluate(async (t) => {
    const r = await fetch(`/Web/Views/Teams/TeamsList.php?tckk=${t}`);
    return r.text();
  }, tckk);

  const links = extractTeamLinks(teamsHtml, campionato);
  console.log(`  ${links.length} squadre trovate\n`);

  for (const schedaUrl of links) {
    await sleep(DELAY_MS);
    await page.goto(schedaUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(600);

    const nameRaw = schedaUrl.split('/Squadra/')[1]?.split('/')[0] || '';
    const name = nameRaw
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/([a-zA-Z])(\d)/g, '$1 $2')
      .replace(/(\d)([a-zA-Z])/g, '$1 $2')
      .trim();

    const anomaly = ANOMALY_WORDS.some(w => name.toLowerCase().includes(w));
    const email = extractEmail(await page.content());

    console.log(`  ${anomaly ? '🚨 ANOMALIA' : '✅'} ${name} | ${email || '—'} | ${schedaUrl}`);
  }

  await browser.close();
  console.log('\n✅ Test completato (nessuna scrittura su CSV)');
}

main().catch(e => { console.error(e); process.exit(1); });
