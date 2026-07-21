// scrape_golee_regione.js — scraper golee.it per regione italiana
//
// Uso:
//   node scrape_golee_regione.js campania                        → Calcio, province campane
//   node scrape_golee_regione.js italia                         → Calcio, tutta Italia
//   node scrape_golee_regione.js campania --sport "Calcio a 5"  → Calcio a 5, Campania
//   node scrape_golee_regione.js italia --sport "Calcio a 7"    → Calcio a 7, tutta Italia
//   node scrape_golee_regione.js --list                         → mostra regioni disponibili
//
// Output:
//   societa_<regione>.csv   — pronto per: node send_emails.js societa_<regione>.csv
//   golee_<regione>.json    — tutti i club trovati con email
//
// Province rilevate automaticamente dal sito golee.it (nessun input manuale necessario)

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Mappa regione → codici provincia (fonte: dropdown golee.it)
const REGIONI = {
  abruzzo:          ['AQ', 'CH', 'PE', 'TE', 'VAS'],
  basilicata:       ['MT', 'PZ'],
  calabria:         ['CS', 'CZ', 'KR', 'RC', 'VV'],
  campania:         ['AV', 'BN', 'CE', 'NA', 'SA'],
  'emilia-romagna': ['BO', 'FC', 'FE', 'MO', 'PC', 'PR', 'RA', 'RE', 'RN'],
  'friuli':         ['GO', 'PN', 'PM', 'TOL', 'TS', 'UD'],
  lazio:            ['FR', 'LT', 'RI', 'RM', 'VT'],
  liguria:          ['CHI', 'GE', 'IM', 'SP', 'SV'],
  lombardia:        ['BG', 'BS', 'CO', 'CR', 'LC', 'LEG', 'LO', 'MB', 'MI', 'MN', 'PV', 'SO', 'VA'],
  marche:           ['AN', 'AP', 'FM', 'MC', 'PU'],
  molise:           ['CB', 'IS'],
  piemonte:         ['AL', 'AT', 'BI', 'CN', 'IVR', 'NO', 'PIN', 'TO', 'VB', 'VC'],
  puglia:           ['BA', 'BR', 'BT', 'FG', 'LE', 'TA'],
  sardegna:         ['CA', 'CI', 'NU', 'OG', 'OR', 'OT', 'SS', 'SU', 'VS'],
  sicilia:          ['AG', 'CL', 'CT', 'EN', 'ME', 'PA', 'RG', 'SR', 'TP'],
  toscana:          ['AR', 'FI', 'GR', 'LI', 'LU', 'MS', 'PI', 'PO', 'PT', 'SI'],
  'trentino':       ['BZ', 'TN'],
  umbria:           ['CDS', 'FOL', 'GUB', 'ORV', 'PG', 'TR'],
  'valle-d-aosta':  ['AO'],
  veneto:           ['BAS', 'BL', 'PD', 'RO', 'SDP', 'TV', 'VE', 'VR', 'VI'],
};

const sportArgIdx = process.argv.indexOf('--sport');
const SPORT = sportArgIdx !== -1 ? process.argv[sportArgIdx + 1] : 'Calcio';
const SPORT_SLUG = SPORT.toLowerCase().replace(/\s+/g, '_');

const ARG = process.argv.find((a, i) => i >= 2 && !a.startsWith('--') && i !== sportArgIdx + 1)?.toLowerCase();

if (!ARG || ARG === '--help') {
  console.log('Uso: node scrape_golee_regione.js <regione|italia|--list>');
  console.log('  es: node scrape_golee_regione.js campania');
  console.log('  es: node scrape_golee_regione.js italia');
  process.exit(0);
}

if (ARG === '--list') {
  console.log('Regioni disponibili:');
  Object.entries(REGIONI).forEach(([r, p]) => console.log(`  ${r.padEnd(20)} ${p.join(', ')}`));
  process.exit(0);
}

let REGIONE, PROVINCE;
if (ARG === 'italia') {
  REGIONE = 'italia';
  PROVINCE = Object.values(REGIONI).flat();
} else {
  REGIONE = ARG;
  PROVINCE = REGIONI[ARG];
  if (!PROVINCE) {
    console.error(`Regione "${ARG}" non trovata. Usa --list per vedere le opzioni.`);
    process.exit(1);
  }
}

const fileSuffix = SPORT_SLUG === 'calcio' ? '' : `_${SPORT_SLUG}`;
const CSV_OUT  = path.join(__dirname, `societa_${REGIONE}${fileSuffix}.csv`);
const JSON_OUT = path.join(__dirname, `golee_${REGIONE}${fileSuffix}.json`);
const CSV_HEADER = 'nome_societa,email,scheda_tc,stato,data_contatto,note';

function normalizeName(n) {
  return (n || '').toLowerCase()
    .replace(/a\.?s\.?d\.?|s\.?s\.?d\.?|a\.?c\.?|f\.?c\.?|u\.?s\.?d\.?|asd|ssd|calcio|football|club|sport|polisportiva/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function appendCsvRow(nome, email) {
  // Escape virgole nel nome
  const nomeSafe = nome.includes(',') ? `"${nome}"` : nome;
  fs.appendFileSync(CSV_OUT, `${nomeSafe},${email},,Da contattare,,\n`, 'utf8');
}

async function scrapeProvince(page, provincia, seen) {
  const url = `https://golee.it/clubs/?sports=${encodeURIComponent(SPORT)}&provinces=${provincia}`;
  console.log(`\n📍 ${provincia} — ${url}`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
  } catch {
    console.log(`  ⚠️  Timeout lista ${provincia}, salto`);
    return [];
  }

  const clubLinks = await page.evaluate(() =>
    [...new Set([...document.querySelectorAll('a[href^="/clubs/"]')]
      .map(a => a.href)
      .filter(h => { try { return new URL(h).pathname.split('/').filter(Boolean).length === 2; } catch { return false; } })
    )]
  );

  console.log(`  ${clubLinks.length} club trovati`);
  const found = [];

  for (let i = 0; i < clubLinks.length; i++) {
    const link = clubLinks[i];
    const prefix = `  [${i+1}/${clubLinks.length}]`;

    try {
      await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise(r => setTimeout(r, 3000));

      const data = await page.evaluate(() => {
        const name = document.querySelector('h1')?.innerText?.trim() || '';
        const emailEl = document.querySelector('a[href^="mailto:"]');
        let email = emailEl ? emailEl.href.replace('mailto:', '').trim() : '';
        if (!email) {
          const matches = document.body.innerText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g);
          email = (matches || []).filter(e =>
            !e.includes('pec.') && !e.includes('golee') && !e.includes('lnd.it')
          )[0] || '';
        }
        return { name, email };
      });

      if (!data.name) { console.log(`${prefix} — (nessun nome)`); continue; }

      const key = normalizeName(data.name);
      if (seen.has(key)) {
        console.log(`${prefix} ♻️  ${data.name} (duplicato)`);
        continue;
      }
      seen.add(key);

      if (data.email) {
        found.push({ name: data.name, email: data.email, provincia });
        appendCsvRow(data.name, data.email);
        console.log(`${prefix} ✅ ${data.name} → ${data.email}`);
      } else {
        console.log(`${prefix} — ${data.name} (nessuna email)`);
      }
    } catch {
      console.log(`${prefix} ⚠️  Errore: ${link}`);
    }
  }

  return found;
}

async function run() {
  console.log(`🏁 Regione: ${REGIONE.toUpperCase()} | Sport: ${SPORT}`);
  console.log(`📋 Province (${PROVINCE.length}): ${PROVINCE.join(', ')}`);
  console.log(`📄 Output: ${CSV_OUT}\n`);

  fs.writeFileSync(CSV_OUT, CSV_HEADER + '\n', 'utf8');

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const allResults = [];
  const seen = new Set();

  for (const provincia of PROVINCE) {
    const found = await scrapeProvince(page, provincia, seen);
    allResults.push(...found);
  }

  await browser.close();
  fs.writeFileSync(JSON_OUT, JSON.stringify(allResults, null, 2));

  console.log('\n\n=== RIEPILOGO ===');
  console.log(`📍 Province: ${PROVINCE.join(', ')}`);
  console.log(`✅ Club con email: ${allResults.length}`);
  console.log(`📄 CSV: ${CSV_OUT}`);
  console.log(`💾 JSON: ${JSON_OUT}`);
  console.log(`\n▶️  Prossimo step: node send_emails.js societa_${REGIONE}${fileSuffix}.csv`);
}

run().catch(e => { console.error(e); process.exit(1); });
