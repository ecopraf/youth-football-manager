/**
 * Scraper loghi generico per regione
 * Usage: node scrape_logos_regione.js <Regione>
 * Es:   node scrape_logos_regione.js Lombardia
 *       node scrape_logos_regione.js Lombardia --force
 *
 * Auto-discovery gironi visitando le pagine indice categoria.
 * Output in logos/{regione_lowercase}/
 */

const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const REGIONE = args[0];
if (!REGIONE) { console.error('Usage: node scrape_logos_regione.js <Regione>'); process.exit(1); }

const FORCE = process.argv.includes('--force');
const OUT_DIR = path.join(__dirname, 'logos', REGIONE.toLowerCase());
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Categorie giovanili standard — nomi più comuni su TC per regione
// Lo script prova tutte e tiene solo quelle che esistono (auto-discovery)
const CATEGORIE_TEMPLATE = [
  'JunioresEliteU19',
  'JunioresRegionaliU19',
  'JunioresProvincialiU19',
  'Under18Regionali',
  'Under18Provinciali',
  'AllieviEliteU17',
  'AllieviRegionaliU17',
  'AllieviProvincialiU17',
  'AllieviRegionaliU16',
  'AllieviProvincialiU16',
  'GiovanissimiEliteU15',
  'GiovanissimiRegionaliU15',
  'GiovanissimiProvincialiU15',
  'GiovanissimiRegionaliU14',
  'GiovanissimiProvincialiU14',
  'GiovanissimiProvincialiU149',
];

function downloadLogo(url, dest) {
  return new Promise((resolve) => {
    if (!FORCE && fs.existsSync(dest)) { resolve('skip'); return; }
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 404) {
        file.close(); try { fs.unlinkSync(dest); } catch {}
        const url120 = url.replace('/Teams/200/', '/Teams/120/');
        const file2 = fs.createWriteStream(dest);
        https.get(url120, (res2) => {
          if (res2.statusCode !== 200) { file2.close(); try { fs.unlinkSync(dest); } catch {} resolve('err'); return; }
          res2.pipe(file2);
          file2.on('finish', () => { file2.close(); resolve('ok_120'); });
        }).on('error', () => { try { fs.unlinkSync(dest); } catch {} resolve('err'); });
        return;
      }
      if (res.statusCode !== 200) { file.close(); try { fs.unlinkSync(dest); } catch {} resolve('err'); return; }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve('ok'); });
    }).on('error', () => { try { fs.unlinkSync(dest); } catch {} resolve('err'); });
  });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=1280,800']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.chrome = { runtime: {} };
  });
  await page.goto('https://www.tuttocampo.it', { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  // Auto-discovery gironi
  console.log(`🔍 Discovery gironi ${REGIONE}...\n`);
  const GIRONI = [];

  for (const cat of CATEGORIE_TEMPLATE) {
    const catUrl = `https://www.tuttocampo.it/${REGIONE}/${cat}`;
    try {
      await page.goto(catUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      const links = await page.evaluate((catUrl) => {
        return [...document.querySelectorAll('a[href*="/Risultati"]')]
          .map(a => a.href)
          .filter(h => h.startsWith(catUrl));
      }, catUrl);
      const unique = [...new Set(links)];
      if (unique.length > 0) {
        console.log(`  ✅ ${cat}: ${unique.length} gironi`);
        GIRONI.push(...unique);
      }
    } catch {
      // categoria non esistente per questa regione, skip silenzioso
    }
    await new Promise(r => setTimeout(r, 500));
  }

  if (GIRONI.length === 0) {
    console.log('❌ Nessun girone trovato. Verifica il nome della regione.');
    await browser.close();
    process.exit(1);
  }

  console.log(`\n🚀 Scraping ${GIRONI.length} gironi ${REGIONE}...\n`);

  const downloaded = new Map();
  let totalNew = 0;

  for (let i = 0; i < GIRONI.length; i++) {
    const url = GIRONI[i];
    const label = url.replace(`https://www.tuttocampo.it/${REGIONE}/`, '').replace('/Risultati', '');
    process.stdout.write(`[${i+1}/${GIRONI.length}] ${label} ... `);

    let logos = [];
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
      logos = await page.evaluate(() => {
        const seen = new Map();
        document.querySelectorAll('img[alt]').forEach(el => {
          if (!el.alt.startsWith('logo ') || !el.dataset.src || !el.dataset.src.includes('Teams')) return;
          const m = el.dataset.src.match(/Teams\/\d+\/(\d+)\.png/);
          if (m && !seen.has(m[1])) seen.set(m[1], { src: el.dataset.src, name: el.alt.replace(/^logo\s+/i, '').trim() });
        });
        return [...seen.values()];
      });
    } catch { console.log('timeout'); continue; }

    let pageNew = 0;
    for (const logo of logos) {
      const match = logo.src.match(/Teams\/\d+\/(\d+)\.png/);
      if (!match) continue;
      const teamId = match[1];
      if (downloaded.has(teamId)) continue;
      const safeName = logo.name.replace(/[^a-zA-Z0-9À-ÿ\s\-']/g, '').replace(/\s+/g, '_').substring(0, 60);
      const dest = path.join(OUT_DIR, `${teamId}_${safeName}.png`);
      const result = await downloadLogo(logo.src.split('?')[0].replace(/\/Teams\/\d+\//, '/Teams/200/'), dest);
      if (result === 'ok' || result === 'ok_120') { downloaded.set(teamId, logo.name); totalNew++; pageNew++; }
      else if (result === 'skip') downloaded.set(teamId, logo.name);
    }

    console.log(logos.length > 0 ? `${logos.length} loghi, +${pageNew} nuovi (tot: ${totalNew})` : 'nessun logo');
    await new Promise(r => setTimeout(r, 800));
  }

  await browser.close();

  const index = {};
  for (const [id, name] of downloaded) index[id] = name;
  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2));

  console.log(`\n✅ Completato: ${totalNew} loghi scaricati, ${downloaded.size} totali`);
  console.log(`📁 ${OUT_DIR}`);
})();
