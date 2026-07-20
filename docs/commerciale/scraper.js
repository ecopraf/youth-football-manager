/**
 * Tuttocampo Scraper — Società Giovanili Lazio
 * Usa Puppeteer per superare AWS WAF JavaScript challenge
 * Output: docs/commerciale/societa_lazio.csv
 *
 * Uso: node docs/commerciale/scraper.js
 */

const puppeteer = require('./node_modules/puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_CSV = path.join(__dirname, 'societa_lazio.csv');
const STATUS_FILE = path.join(__dirname, 'gironi_status.json');
const DELAY_MS = 2000;

const GIRONI = [
  // ── ELITE ────────────────────────────────────────────────────────────────
  'GiovanissimiEliteU15/GironeAEccellenza',
  'GiovanissimiEliteU15/GironeBEccellenza',
  'AllieviEliteU17/GironeAEccellenza',
  'AllieviEliteU17/GironeBEccellenza',
  'JunioresEliteU19/GironeA',
  'JunioresEliteU19/GironeB',
  // ── REGIONALI ────────────────────────────────────────────────────────────
  'GiovanissimiRegionaliU15/GironeARegionali',
  'GiovanissimiRegionaliU15/GironeBRegionali',
  'GiovanissimiRegionaliU15/GironeCRegionali',
  'GiovanissimiRegionaliU15/GironeDRegionaliRoma',
  'GiovanissimiRegionaliU15/GironeE',
  'GiovanissimiRegionaliU14/GironeARegionali',
  'GiovanissimiRegionaliU14/GironeBRegionali',
  'GiovanissimiRegionaliU14/GironeCRegionali',
  'GiovanissimiRegionaliU14/GironeDRegionali',
  'GiovanissimiRegionaliU14/GironeE',
  'AllieviRegionaliU16/GironeARegionali',
  'AllieviRegionaliU16/GironeBRegionali',
  'AllieviRegionaliU16/GironeCRegionali',
  'AllieviRegionaliU16/GironeDRegionali',
  'AllieviRegionaliU16/GironeE',
  'AllieviRegionaliU17/GironeARegionali',
  'AllieviRegionaliU17/GironeBRegionali',
  'AllieviRegionaliU17/GironeCRegionali',
  'AllieviRegionaliU17/GironeDRegionali',
  'AllieviRegionaliU17/GironeE',
  'JunioresRegionaliBU19/GironeARegionaliFasciaB',
  'JunioresRegionaliBU19/GironeBRegionaliB',
  'JunioresRegionaliBU19/GironeCRegionaliB',
  'JunioresRegionaliBU19/GironeDRegionaliB',
  'JunioresRegionaliBU19/GironeE',
  // ── PROVINCIALI ROMA ─────────────────────────────────────────────────────
  'GiovanissimiProvincialiU15/GironeAProvincialiRoma',
  'GiovanissimiProvincialiU15/GironeBProvincialiRoma',
  'GiovanissimiProvincialiU15/GironeCProvincialiRoma',
  'GiovanissimiProvincialiU15/GironeEProvincialiRoma',
  'GiovanissimiProvincialiU15/GironeFProvincialiRoma',
  'GiovanissimiProvincialiU15/GironeGProvincialiRoma',
  'GiovanissimiProvincialiU15/GironeHRoma',
  'GiovanissimiProvincialiU14/GironeAProvincialiFasciaBRoma',
  'GiovanissimiProvincialiU14/GironeBProvincialiFasciaBRoma',
  'GiovanissimiProvincialiU14/GironeCProvincialiFasciaBRoma',
  'GiovanissimiProvincialiU14/GironeDProvincialiFasciaBRoma',
  'GiovanissimiProvincialiU14/GironeEProvincialiFasciaBRoma',
  'GiovanissimiProvincialiU14/GironeFProvincialiFasciaBRoma',
  'GiovanissimiProvincialiU14/GironeGProvincialiFasciaBRoma',
  'GiovanissimiProvincialiU14/GironeHProvincialiFasciaBRoma',
  'GiovanissimiProvincialiU14/GironeIRoma',
  'GiovanissimiProvincialiU14/GironeLRoma',
  'AllieviProvincialiU17/GironeAProvincialiRoma',
  'AllieviProvincialiU17/GironeBProvincialiRoma',
  'AllieviProvincialiU17/GironeCProvincialiRoma',
  'AllieviProvincialiU17/GironeDRoma',
  'AllieviProvincialiU17/GironeERoma',
  'AllieviProvincialiU17/GironeFRoma',
  'AllieviProvincialiU16/GironeAProvincialiFasciaBRoma',
  'AllieviProvincialiU16/GironeBProvincialiFasciaBRoma',
  'AllieviProvincialiU16/GironeCProvincialiFasciaBRoma',
  'AllieviProvincialiU16/GironeDProvincialiFasciaBRoma',
  'AllieviProvincialiU16/GironeEFasciaBRoma',
  'AllieviProvincialiU16/GironeFRoma',
  'AllieviProvincialiU16/GironeGRoma',
  'JunioresProvincialiU19/GironeARomaProvinciali',
  'JunioresProvincialiU19/GironeBRomaProvinciali',
  'JunioresProvincialiU19/GironeCRoma',
  'JunioresProvincialiU19/GironeDRoma',
];

const EXCLUDE_DOMAINS = [
  'tuttocampo', 'facebook', 'instagram', 'twitter', 'tiktok', 'youtube',
  'google', 'apple', 'sharethis', 'scorecardresearch', 'flashb', 'viously',
  'fastcmp', 'b-static', 'b2-content', 'fonts.g', 'connect.facebook',
  'platform-api', 'cdn.', 'static.', 'pagead', 'doubleclick', 'googlesyndication',
];

const TC_USER = 'youthfootball';
const TC_PASS = 'manager';

const sleep = ms => new Promise(r => setTimeout(r, ms));

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
  let lines = [];
  if (fs.existsSync(OUTPUT_CSV)) {
    lines = fs.readFileSync(OUTPUT_CSV, 'utf8').split('\n').slice(1).filter(l => l.trim());
  }
  lines.push([row.nome_societa, row.email, row.scheda_tc, row.stato, '', ''].map(esc).join(','));
  lines.sort((a, b) => a.split(',')[0].localeCompare(b.split(',')[0], 'it', { sensitivity: 'base' }));
  fs.writeFileSync(OUTPUT_CSV, [header, ...lines].join('\n') + '\n', 'utf8');
}

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
  await sleep(1000);
}

function normalizeKey(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function extractTeamLinks(html) {
  const re = /href="(https:\/\/www\.tuttocampo\.it\/2025-26\/Lazio\/[^"]+\/Squadra\/[^"]+\/\d+\/Scheda)"/g;
  // Solo URL che contengono /Lazio/ — esclude squadre di altri campionati
  const links = new Set();
  let m;
  while ((m = re.exec(html)) !== null) links.add(m[1]);
  return [...links];
}

function extractDetails(html) {
  // Email: cerca prima nella cella dopo label "Email"
  const emailCellM = html.match(/<td>Email<\/td>\s*<td>\s*([^<\s]+@[^<\s]+)\s*<\/td>/i);
  if (emailCellM) {
    const e = emailCellM[1].toLowerCase();
    if (!e.includes('tuttocampo')) return { email: e };
  }
  // Fallback: regex generica
  const emailRe = /([a-zA-Z0-9._%+\-]+@(?!tuttocampo|google|example)[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g;
  let em;
  while ((em = emailRe.exec(html)) !== null) {
    const e = em[1].toLowerCase();
    if (!EXCLUDE_DOMAINS.some(d => e.includes(d))) return { email: e };
  }
  return { email: '' };
}

async function main() {
  const status = loadStatus();

  // Carica società già nel CSV (normalizzazione aggressiva per evitare duplicati)
  const existing = new Set();
  if (fs.existsSync(OUTPUT_CSV)) {
    fs.readFileSync(OUTPUT_CSV, 'utf8').split('\n').slice(1).forEach(line => {
      const name = line.split(',')[0]?.replace(/^"|"$/g, '').trim();
      if (name) existing.add(normalizeKey(name));
    });
    console.log(`📂 ${existing.size} società già nel CSV`);
  }

  const gironiDaFare = GIRONI.filter(g => status[g] !== 'done');
  console.log(`📋 ${gironiDaFare.length}/${GIRONI.length} gironi da analizzare (${GIRONI.length - gironiDaFare.length} già completati)\n`);

  console.log('🚀 Avvio browser Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'it-IT,it;q=0.9' });

  // Visita TC homepage per ottenere cookie WAF
  console.log('🌐 Carico homepage TC e faccio login...');
  await page.goto('https://www.tuttocampo.it/', { waitUntil: 'networkidle2', timeout: 30000 });
  await login(page);
  console.log('   ✅ Login effettuato');

  const rows = [];
  let totalNew = 0;

  for (const gironeSlug of gironiDaFare) {
    const [campionato, girone] = gironeSlug.split('/');
    const url = `https://www.tuttocampo.it/2025-26/Lazio/${campionato}/${girone}/Classifica`;

    process.stdout.write(`\n📋 ${campionato}/${girone} ... `);

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(1000);
    } catch (e) {
      console.log('⚠️ timeout, skip');
      status[gironeSlug] = 'error';
      saveStatus(status);
      continue;
    }

    const pageHtml = await page.content();
    let tckk = pageHtml.match(/tckk='([^']+)'/)?.[ 1];
    if (!tckk) {
      // Prova pagina Squadre come fallback
      try {
        const urlSquadre = url.replace('/Classifica', '/Squadre');
        await page.goto(urlSquadre, { waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(800);
        tckk = (await page.content()).match(/tckk='([^']+)'/)?.[ 1];
      } catch (_) {}
    }
    if (!tckk) { console.log('⚠️ no tckk, skip'); status[gironeSlug] = 'error'; saveStatus(status); continue; }

    await sleep(DELAY_MS);

    let teamsHtml = '';
    try {
      const res = await page.evaluate(async (tckk) => {
        const r = await fetch(`/Web/Views/Teams/TeamsList.php?tckk=${tckk}`);
        return r.text();
      }, tckk);
      teamsHtml = res;
    } catch (e) {
      console.log('⚠️ errore TeamsList');
      continue;
    }

    const links = extractTeamLinks(teamsHtml);
    console.log(`${links.length} squadre`);
    if (links.length === 0) {
      status[gironeSlug] = 'done';
      saveStatus(status);
      continue;
    }

    for (const schedaUrl of links) {
      // Verifica che la scheda appartenga al campionato del girone corrente
      if (!schedaUrl.includes(campionato)) {
        process.stdout.write(`  ⏭️  skip (campionato diverso)\n`);
        continue;
      }

      await sleep(DELAY_MS);

      try {
        await page.goto(schedaUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(800);
      } catch (e) {
        process.stdout.write('⚠️ ');
        continue;
      }

      const finalUrl = page.url();
      if (!finalUrl.includes('/Lazio/')) {
        process.stdout.write(`  ⚠️ redirect fuori Lazio, skip\n`);
        continue;
      }

      const schedaHtml = await page.content();
      // Nome SEMPRE dall'URL (affidabile) — la pagina può essere reindirizzata a squadre di altre regioni
      const nameFromUrl = schedaUrl.split('/Squadra/')[1]?.split('/')[0] || '';
      // Converti CamelCase in parole separate: "OstianticaCalcio1926" → "Ostiantica Calcio 1926"
      const name = nameFromUrl
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .replace(/([a-zA-Z])(\d)/g, '$1 $2')
        .replace(/(\d)([a-zA-Z])/g, '$1 $2')
        .trim();
      const key = normalizeKey(name);

      if (existing.has(key)) {
        process.stdout.write(`  ✓ ${name} (già presente)\n`);
        continue;
      }

      // Carica TeamDetailsView per email
      const tckk2M = schedaHtml.match(/tckk='([^']+)'/);
      let detailsHtml = '';
      if (tckk2M) {
        await sleep(400);
        try {
          detailsHtml = await page.evaluate(async (tckk2) => {
            const r = await fetch(`/Web/Views/TeamDetailsView/TeamDetailsView.php?tckk=${tckk2}`);
            return r.text();
          }, tckk2M[1]);
        } catch (_) {}
      }

      const det = extractDetails(schedaHtml + detailsHtml);
      process.stdout.write(`  + ${name} | ${det.email || '—'}\n`);

      const row = {
        nome_societa: name,
        email: det.email,
        scheda_tc: schedaUrl.trim() + ' ',
        stato: 'Da contattare',
      };
      rows.push(row);
      saveRow(row); // salvataggio progressivo
      existing.add(key);
      totalNew++
    }
    // Girone completato
    status[gironeSlug] = 'done';
    saveStatus(status);
  }

  await browser.close();
  console.log(`\n✅ Completato! ${totalNew} nuove società aggiunte → ${OUTPUT_CSV}`);
  console.log(`📊 Gironi completati: ${Object.values(status).filter(v => v === 'done').length}/${GIRONI.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
