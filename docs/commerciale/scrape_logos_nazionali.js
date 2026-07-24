const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'logos', 'nazionali');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const FORCE = process.argv.includes('--force');

const CATEGORIE = [
  'https://www.tuttocampo.it/Italia/GiovanissimiProfessionistiU13',
  'https://www.tuttocampo.it/Italia/GiovanissimiProfessionistiU14',
  'https://www.tuttocampo.it/Italia/GiovanissimiNazionaliU15',
  'https://www.tuttocampo.it/Italia/AllieviNazionaliU16',
  'https://www.tuttocampo.it/Italia/AllieviNazionaliU17',
  'https://www.tuttocampo.it/Italia/Under18',
  'https://www.tuttocampo.it/Italia/JunioresNazionaliU19',
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

  // Auto-discovery gironi da ogni pagina categoria
  const GIRONI = [];
  console.log('🔍 Discovery gironi...\n');
  for (const catUrl of CATEGORIE) {
    const catName = catUrl.split('/').pop();
    try {
      await page.goto(catUrl, { waitUntil: 'networkidle2', timeout: 20000 });
      const links = await page.evaluate((catUrl) => {
        return [...document.querySelectorAll('a[href*="/Risultati"]')]
          .map(a => a.href)
          .filter(h => h.startsWith(catUrl));
      }, catUrl);
      const unique = [...new Set(links)];
      console.log(`  ${catName}: ${unique.length} gironi`);
      GIRONI.push(...unique);
    } catch {
      console.log(`  ${catName}: timeout`);
    }
    await new Promise(r => setTimeout(r, 800));
  }

  console.log(`\n🚀 Scraping ${GIRONI.length} gironi nazionali...\n`);

  const downloaded = new Map();
  let totalNew = 0;

  for (let i = 0; i < GIRONI.length; i++) {
    const url = GIRONI[i];
    const label = url.replace('https://www.tuttocampo.it/Italia/', '').replace('/Risultati', '');
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
