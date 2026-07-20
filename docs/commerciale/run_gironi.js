/**
 * run_gironi.js — processa un girone alla volta, committa CSV dopo ogni girone
 * Si ferma solo se trova anomalie (nomi non laziali, redirect strani)
 */

const puppeteer = require('./node_modules/puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// Parole anomale nei nomi — causa stop
const ANOMALY_WORDS = [
  'bologna','palermo','napoli','milano','torino','genova','firenze','venezia',
  'bari','catania','cagliari','verona','brescia','parma','modena','padova',
  'vicenza','trieste','perugia','ancona','pescara','lecce','cosenza','salerno',
  'foggia','sassari','rapid','rinascita','dinamo','audace',
];

const TC_USER = 'infinitipiani';
const TC_PASS = 'paralleli';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function normalizeKey(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, ''); }

function loadStatus() {
  if (fs.existsSync(STATUS_FILE)) return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
  return {};
}

function saveStatus(status) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

function loadExisting() {
  const existing = new Set();
  if (fs.existsSync(OUTPUT_CSV)) {
    fs.readFileSync(OUTPUT_CSV, 'utf8').split('\n').slice(1).forEach(line => {
      const name = line.split(',')[0]?.replace(/^\"|\"$/g, '').trim();
      if (name) existing.add(normalizeKey(name));
    });
  }
  return existing;
}

function saveRow(row) {
  const esc = v => (!v ? '' : (v.includes(',') || v.includes('"') || v.includes('\n')) ? '"' + v.replace(/"/g, '""') + '"' : v);
  const header = 'nome_societa,email,scheda_tc,stato,data_contatto,note';
  let lines = [];
  if (fs.existsSync(OUTPUT_CSV)) {
    lines = fs.readFileSync(OUTPUT_CSV, 'utf8').split('\n').slice(1).filter(l => l.trim());
  }
  lines.push([row.nome_societa, row.email, row.scheda_tc, row.stato, '', ''].map(esc).join(','));
  lines.sort((a, b) => a.split(',')[0].localeCompare(b.split(',')[0], 'it', { sensitivity: 'base' }));
  fs.writeFileSync(OUTPUT_CSV, [header, ...lines].join('\n') + '\n', 'utf8');
}

function commitCSV(girone) {
  try {
    const repoRoot = path.join(__dirname, '../../..');
    execSync(`git -C "${repoRoot}" add docs/commerciale/societa_lazio.csv docs/commerciale/gironi_status.json`, { stdio: 'pipe' });
    execSync(`git -C "${repoRoot}" commit -m "scraper: completato girone ${girone}"`, { stdio: 'pipe' });
    console.log(`  💾 Commit effettuato`);
  } catch (e) {
    console.log(`  ⚠️  Commit fallito (nessuna modifica?)`);
  }
}

function extractDetails(html) {
  const emailCellM = html.match(/<td>Email<\/td>\s*<td>\s*([^<\s]+@[^<\s]+)\s*<\/td>/i);
  if (emailCellM) {
    const e = emailCellM[1].toLowerCase();
    if (!e.includes('tuttocampo')) return e;
  }
  const emailRe = /([a-zA-Z0-9._%+\-]+@(?!tuttocampo|google|example)[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g;
  const badDomains = ['tuttocampo','facebook','instagram','tiktok','youtube','google','scorecardresearch','flashb','viously','fastcmp','cdn.','pagead','doubleclick'];
  let m;
  while ((m = emailRe.exec(html)) !== null) {
    const e = m[1].toLowerCase();
    if (!badDomains.some(d => e.includes(d))) return e;
  }
  return '';
}

function extractTeamLinks(html, campionato) {
  const re = /href="(https:\/\/www\.tuttocampo\.it\/2025-26\/Lazio\/[^"]+\/Squadra\/[^"]+\/\d+\/Scheda)"/g;
  const links = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[1].includes(campionato)) links.add(m[1]);
  }
  return [...links];
}

async function login(page) {
  await page.goto('https://www.tuttocampo.it/Web/Login.php', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(async (user, pass) => {
    await fetch('/Web/Views/Login/LoginModal.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}&remind_me=remind_me&destination_page=/Homepage&submit_login=Accedi`
    });
  }, TC_USER, TC_PASS);
  await sleep(1000);
}

async function processGirone(page, gironeSlug, existing) {
  const [campionato, girone] = gironeSlug.split('/');
  const url = `https://www.tuttocampo.it/2025-26/Lazio/${campionato}/${girone}/Classifica`;

  console.log(`\n📋 ${gironeSlug}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(1000);
  } catch (e) {
    console.log('  ⚠️ timeout pagina girone');
    return { ok: false, newCount: 0 };
  }

  let pageHtml = await page.content();
  let tckk = pageHtml.match(/tckk='([^']+)'/)?.[ 1];

  if (!tckk) {
    try {
      await page.goto(url.replace('/Classifica', '/Squadre'), { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(800);
      tckk = (await page.content()).match(/tckk='([^']+)'/)?.[ 1];
      pageHtml = await page.content();
    } catch (_) {}
  }

  if (!tckk) {
    console.log('  ⚠️ no tckk, skip');
    return { ok: true, newCount: 0 };
  }

  await sleep(DELAY_MS);
  let teamsHtml = '';
  try {
    teamsHtml = await page.evaluate(async (t) => {
      const r = await fetch(`/Web/Views/Teams/TeamsList.php?tckk=${t}`);
      return r.text();
    }, tckk);
  } catch (e) {
    console.log('  ⚠️ errore TeamsList');
    return { ok: false, newCount: 0 };
  }

  const links = extractTeamLinks(teamsHtml, campionato);
  console.log(`  ${links.length} squadre trovate`);

  let newCount = 0;

  for (const schedaUrl of links) {
    await sleep(DELAY_MS);

    try {
      await page.goto(schedaUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(600);
    } catch (e) {
      process.stdout.write('  ⏳ timeout scheda, skip\n');
      continue;
    }

    // Nome SEMPRE dall'URL
    const nameRaw = schedaUrl.split('/Squadra/')[1]?.split('/')[0] || '';
    const name = nameRaw
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/([a-zA-Z])(\d)/g, '$1 $2')
      .replace(/(\d)([a-zA-Z])/g, '$1 $2')
      .trim();

    // ⚠️ ANOMALIA: nome contiene parole non laziali → stop
    const nameLower = name.toLowerCase();
    if (ANOMALY_WORDS.some(w => nameLower.includes(w))) {
      console.log(`\n🚨 ANOMALIA: "${name}" — URL: ${schedaUrl}`);
      console.log('   TC sta reindirizzando a squadre di altre regioni. Stop girone.');
      return { ok: false, newCount, anomaly: name };
    }

    const key = normalizeKey(name);
    if (existing.has(key)) {
      process.stdout.write(`  ✓ ${name}\n`);
      continue;
    }

    const schedaHtml = await page.content();
    // NON usare TeamDetailsView — restituisce dati fake di squadre di altre regioni
    const email = extractDetails(schedaHtml);
    const emailDisplay = email ? `\x1b[32m${email}\x1b[0m` : '—';
    console.log(`  + ${name} | ${emailDisplay}`);

    saveRow({ nome_societa: name, email, scheda_tc: schedaUrl.trim() + ' ', stato: 'Da contattare' });
    existing.add(key);
    newCount++;
  }

  return { ok: true, newCount };
}

async function main() {
  const status = loadStatus();
  const gironiDaFare = GIRONI.filter(g => status[g] !== 'done');
  console.log(`📊 ${GIRONI.length - gironiDaFare.length}/${GIRONI.length} gironi già completati`);
  console.log(`🔄 ${gironiDaFare.length} gironi da processare\n`);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'it-IT,it;q=0.9' });

  await page.goto('https://www.tuttocampo.it/', { waitUntil: 'networkidle2', timeout: 30000 });
  await login(page);
  console.log('✅ Login effettuato\n');

  let totalNew = 0;

  for (const gironeSlug of gironiDaFare) {
    const existing = loadExisting(); // ricarica ad ogni girone (CSV aggiornato)
    const result = await processGirone(page, gironeSlug, existing);

    if (result.anomaly) {
      // Anomalia rilevata — salva stato e termina
      await browser.close();
      console.log(`\n⛔ Fermato per anomalia. Girone ${gironeSlug} NON marcato come done.`);
      console.log(`   Totale nuove società aggiunte prima dello stop: ${totalNew}`);
      process.exit(1);
    }

    if (result.ok) {
      status[gironeSlug] = 'done';
      saveStatus(status);
      totalNew += result.newCount;
      if (result.newCount > 0) commitCSV(gironeSlug);
      else console.log(`  ✅ Nessuna nuova società`);
    } else {
      console.log(`  ⚠️ Girone saltato, riproverà al prossimo run`);
    }
  }

  await browser.close();
  console.log(`\n✅ Completato! ${totalNew} nuove società aggiunte`);
  console.log(`📊 Gironi completati: ${Object.values(status).filter(v => v === 'done').length}/${GIRONI.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
