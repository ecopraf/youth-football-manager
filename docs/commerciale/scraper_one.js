/**
 * scraper_one.js — processa UN solo girone e si ferma
 * Uso: node scraper_one.js
 */

const puppeteer = require('./node_modules/puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_CSV = path.join(__dirname, 'societa_lazio.csv');
const STATUS_FILE = path.join(__dirname, 'gironi_status.json');
const DELAY_MS = 1500;

const GIRONI = [
  'GiovanissimiEliteU15/GironeAEccellenza','GiovanissimiEliteU15/GironeBEccellenza',
  'AllieviEliteU17/GironeAEccellenza','AllieviEliteU17/GironeBEccellenza',
  'JunioresEliteU19/GironeA','JunioresEliteU19/GironeB',
  'GiovanissimiRegionaliU15/GironeARegionali','GiovanissimiRegionaliU15/GironeBRegionali',
  'GiovanissimiRegionaliU15/GironeCRegionali','GiovanissimiRegionaliU15/GironeDRegionaliRoma','GiovanissimiRegionaliU15/GironeE',
  'GiovanissimiRegionaliU14/GironeARegionali','GiovanissimiRegionaliU14/GironeBRegionali',
  'GiovanissimiRegionaliU14/GironeCRegionali','GiovanissimiRegionaliU14/GironeDRegionali','GiovanissimiRegionaliU14/GironeE',
  'AllieviRegionaliU16/GironeARegionali','AllieviRegionaliU16/GironeBRegionali',
  'AllieviRegionaliU16/GironeCRegionali','AllieviRegionaliU16/GironeDRegionali','AllieviRegionaliU16/GironeE',
  'AllieviRegionaliU17/GironeARegionali','AllieviRegionaliU17/GironeBRegionali',
  'AllieviRegionaliU17/GironeCRegionali','AllieviRegionaliU17/GironeDRegionali','AllieviRegionaliU17/GironeE',
  'JunioresRegionaliBU19/GironeARegionaliFasciaB','JunioresRegionaliBU19/GironeBRegionaliB',
  'JunioresRegionaliBU19/GironeCRegionaliB','JunioresRegionaliBU19/GironeDRegionaliB','JunioresRegionaliBU19/GironeE',
  'GiovanissimiProvincialiU15/GironeAProvincialiRoma','GiovanissimiProvincialiU15/GironeBProvincialiRoma',
  'GiovanissimiProvincialiU15/GironeCProvincialiRoma','GiovanissimiProvincialiU15/GironeEProvincialiRoma',
  'GiovanissimiProvincialiU15/GironeFProvincialiRoma','GiovanissimiProvincialiU15/GironeGProvincialiRoma','GiovanissimiProvincialiU15/GironeHRoma',
  'GiovanissimiProvincialiU14/GironeAProvincialiFasciaBRoma','GiovanissimiProvincialiU14/GironeBProvincialiFasciaBRoma',
  'GiovanissimiProvincialiU14/GironeCProvincialiFasciaBRoma','GiovanissimiProvincialiU14/GironeDProvincialiFasciaBRoma',
  'GiovanissimiProvincialiU14/GironeEProvincialiFasciaBRoma','GiovanissimiProvincialiU14/GironeFProvincialiFasciaBRoma',
  'GiovanissimiProvincialiU14/GironeGProvincialiFasciaBRoma','GiovanissimiProvincialiU14/GironeHProvincialiFasciaBRoma',
  'GiovanissimiProvincialiU14/GironeIRoma','GiovanissimiProvincialiU14/GironeLRoma',
  'AllieviProvincialiU17/GironeAProvincialiRoma','AllieviProvincialiU17/GironeBProvincialiRoma',
  'AllieviProvincialiU17/GironeCProvincialiRoma','AllieviProvincialiU17/GironeDRoma',
  'AllieviProvincialiU17/GironeERoma','AllieviProvincialiU17/GironeFRoma',
  'AllieviProvincialiU16/GironeAProvincialiFasciaBRoma','AllieviProvincialiU16/GironeBProvincialiFasciaBRoma',
  'AllieviProvincialiU16/GironeCProvincialiFasciaBRoma','AllieviProvincialiU16/GironeDProvincialiFasciaBRoma',
  'AllieviProvincialiU16/GironeEFasciaBRoma','AllieviProvincialiU16/GironeFRoma','AllieviProvincialiU16/GironeGRoma',
  'JunioresProvincialiU19/GironeARomaProvinciali','JunioresProvincialiU19/GironeBRomaProvinciali',
  'JunioresProvincialiU19/GironeCRoma','JunioresProvincialiU19/GironeDRoma',
];

const TC_USER = 'youthfootball';
const TC_PASS = 'manager';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function normalizeKey(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, ''); }

function loadStatus() {
  if (fs.existsSync(STATUS_FILE)) return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
  return {};
}

function saveStatus(status) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

function saveRow(row) {
  const esc = v => (!v ? '' : (v.includes(',') || v.includes('"') || v.includes('\n')) ? '"' + v.replace(/"/g, '""') + '"' : v);
  const header = 'nome_societa,email,scheda_tc,stato,data_contatto,note';
  let lines = fs.existsSync(OUTPUT_CSV)
    ? fs.readFileSync(OUTPUT_CSV, 'utf8').split('\n').slice(1).filter(l => l.trim())
    : [];
  lines.push([row.nome_societa, row.email, row.scheda_tc, row.stato, '', ''].map(esc).join(','));
  lines.sort((a, b) => a.split(',')[0].localeCompare(b.split(',')[0], 'it', { sensitivity: 'base' }));
  fs.writeFileSync(OUTPUT_CSV, [header, ...lines].join('\n') + '\n', 'utf8');
}

async function login(page) {
  await page.goto('https://www.tuttocampo.it/Web/Login.php', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(async (u, p) => {
    await fetch('/Web/Views/Login/LoginModal.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${encodeURIComponent(u)}&password=${encodeURIComponent(p)}&remind_me=remind_me&destination_page=/Homepage&submit_login=Accedi`
    });
  }, TC_USER, TC_PASS);
  await sleep(1000);
}

function extractTeamLinks(html, campionato) {
  const re = /href="(https:\/\/www\.tuttocampo\.it\/2025-26\/Lazio\/[^"]+\/Squadra\/[^"]+\/\d+\/Scheda)"/g;
  const links = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[1].includes(campionato)) links.add(m[1]); // solo squadre del campionato corrente
  }
  return [...links];
}

function extractEmail(html) {
  const cellM = html.match(/<td>Email<\/td>\s*<td>\s*([^<\s]+@[^<\s]+)\s*<\/td>/i);
  if (cellM) { const e = cellM[1].toLowerCase(); if (!e.includes('tuttocampo')) return e; }
  const re = /([a-zA-Z0-9._%+\-]+@(?!tuttocampo|google|example)[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g;
  const bad = ['tuttocampo','facebook','tiktok','bologna','palermo','napoli','milano','torino','genova','firenze','verona','brescia','cagliari','bari','lecce','cosenza','sassari'];
  let em;
  while ((em = re.exec(html)) !== null) {
    const e = em[1].toLowerCase();
    if (!bad.some(d => e.includes(d))) return e;
  }
  return '';
}

async function main() {
  const status = loadStatus();
  const prossimo = GIRONI.find(g => status[g] !== 'done');

  if (!prossimo) { console.log('✅ Tutti i gironi completati!'); return; }

  const done = GIRONI.filter(g => status[g] === 'done').length;
  console.log(`📋 Girone ${done + 1}/${GIRONI.length}: ${prossimo}`);

  const existing = new Set();
  if (fs.existsSync(OUTPUT_CSV)) {
    fs.readFileSync(OUTPUT_CSV, 'utf8').split('\n').slice(1).forEach(line => {
      const name = line.split(',')[0]?.replace(/^"|"$/g, '').trim();
      if (name) existing.add(normalizeKey(name));
    });
  }
  console.log(`📂 ${existing.size} società già nel CSV\n`);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'it-IT,it;q=0.9' });

  await page.goto('https://www.tuttocampo.it/', { waitUntil: 'networkidle2', timeout: 30000 });
  await login(page);
  console.log('✅ Login effettuato\n');

  const [campionato, girone] = prossimo.split('/');
  const url = `https://www.tuttocampo.it/2025-26/Lazio/${campionato}/${girone}/Classifica`;

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1000);

  let pageHtml = await page.content();
  let tckk = pageHtml.match(/tckk='([^']+)'/)?.[ 1];
  if (!tckk) {
    await page.goto(url.replace('/Classifica', '/Squadre'), { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(800);
    tckk = (await page.content()).match(/tckk='([^']+)'/)?.[ 1];
  }
  if (!tckk) { console.log('⚠️ no tckk, skip'); status[prossimo] = 'error'; saveStatus(status); await browser.close(); return; }

  const teamsHtml = await page.evaluate(async (tckk) => {
    const r = await fetch(`/Web/Views/Teams/TeamsList.php?tckk=${tckk}`);
    return r.text();
  }, tckk);

  const links = extractTeamLinks(teamsHtml, campionato);
  console.log(`🔗 ${links.length} squadre trovate\n`);

  let added = 0;
  for (const schedaUrl of links) {
    await sleep(DELAY_MS);

    // Nome dall'URL — mai dalla pagina
    const nameRaw = schedaUrl.split('/Squadra/')[1]?.split('/')[0] || '';
    const name = nameRaw
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/([a-zA-Z])(\d)/g, '$1 $2')
      .replace(/(\d)([a-zA-Z])/g, '$1 $2')
      .trim();
    const key = normalizeKey(name);

    if (existing.has(key)) { console.log(`  ✓ ${name} (già presente)`); continue; }

    try {
      await page.goto(schedaUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(600);
    } catch (e) { console.log(`  ⚠️ ${name} — timeout`); continue; }

    const html = await page.content();
    const tckk2 = html.match(/tckk='([^']+)'/)?.[ 1];
    let detHtml = '';
    if (tckk2) {
      try {
        detHtml = await page.evaluate(async (t) => {
          const r = await fetch(`/Web/Views/TeamDetailsView/TeamDetailsView.php?tckk=${t}`);
          return r.text();
        }, tckk2);
      } catch (_) {}
    }

    const email = extractEmail(html + detHtml);
    console.log(`  + ${name} | ${email || '—'}`);
    saveRow({ nome_societa: name, email, scheda_tc: schedaUrl + ' ', stato: 'Da contattare' });
    existing.add(key);
    added++;
  }

  status[prossimo] = 'done';
  saveStatus(status);
  await browser.close();

  const remaining = GIRONI.filter(g => status[g] !== 'done').length;
  console.log(`\n✅ Girone completato! +${added} nuove società`);
  console.log(`📊 Gironi rimasti: ${remaining}/${GIRONI.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
