const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'logos', 'campania');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);
const FORCE = process.argv.includes('--force');

// Lista completa gironi giovanili Campania (U14→Juniores) estratta manualmente
const GIRONI = [
  // Juniores U19
  'https://www.tuttocampo.it/Campania/JunioresRegionaliU19/GironeA/Risultati',
  'https://www.tuttocampo.it/Campania/JunioresRegionaliU19/GironeBJuniores/Risultati',
  'https://www.tuttocampo.it/Campania/JunioresRegionaliU19/GironeCJuniores/Risultati',
  'https://www.tuttocampo.it/Campania/JunioresRegionaliU19/GironeDJuniores/Risultati',
  'https://www.tuttocampo.it/Campania/JunioresRegionaliU19/GironeEJuniores/Risultati',
  'https://www.tuttocampo.it/Campania/JunioresRegionaliU19/GironeFJuniores/Risultati',
  'https://www.tuttocampo.it/Campania/JunioresRegionaliU19/GironeG/Risultati',
  'https://www.tuttocampo.it/Campania/JunioresRegionaliU19/GironeH/Risultati',
  'https://www.tuttocampo.it/Campania/JunioresRegionaliU19/GironeI/Risultati',
  // U18
  'https://www.tuttocampo.it/Campania/AllieviRegionaliU18/GironeA/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviRegionaliU18/GironeB/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviRegionaliU18/GironeC/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviRegionaliU18/GironeD/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviRegionaliU18/GironeE/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviRegionaliU18/GironeF/Risultati',
  // U17 Elite + Regionali + Provinciali
  'https://www.tuttocampo.it/Campania/AllieviEliteU17/GironeA/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviEliteU17/GironeB/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviRegionaliU17/GironeARegionali/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviRegionaliU17/GironeBRegionali/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviRegionaliU17/GironeCRegionali/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviRegionaliU17/GironeD/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU17/GironeAAvellino/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU17/GironeABenevento/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU17/GironeUnicoCaserta/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU17/GironeANapoli/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU17/GironeBNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU17/GironeCNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU17/GironeASalerno/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU17/GironeBSalerno/Risultati',
  // U16 Regionali + Provinciali
  'https://www.tuttocampo.it/Campania/AllieviRegionaliU16/GironeA/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviRegionaliU16/GironeB/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviRegionaliU16/GironeC/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviRegionaliU16/GironeD/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviRegionaliU16/GironeE/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviRegionaliU16/GironeF/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviRegionaliU16/GironeG/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviRegionaliU16/GironeH/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviRegionaliU16/GironeI/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU16/GironeAAvellino/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU16/GironeACaserta/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU16/GironeBCaserta/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU16/GironeANapoli/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU16/GironeBNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU16/GironeCNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU16/GironeDNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU16/GironeENapoli/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU16/GironeFNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU16/GironeGNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU16/GironeHNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU16/GironeA/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU16/GironeBSalerno/Risultati',
  'https://www.tuttocampo.it/Campania/AllieviProvincialiU16/GironeCSalerno/Risultati',
  // U15 Elite + Regionali + Provinciali
  'https://www.tuttocampo.it/Campania/GiovanissimiEliteU15/GironeA/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiEliteU15/GironeB/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiRegionaliU15/GironeARegionali/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiRegionaliU15/GironeB/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiRegionaliU15/GironeC/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiRegionaliU15/GironeD/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiRegionaliU15/GironeE/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiRegionaliU15/GironeF/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU15/GironeAAvellino/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU15/GironeBAvellino/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU15/GironeABenevento/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU15/GironeACaserta/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU15/GironeBCaserta/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU15/GironeANapoli/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU15/GironeBGiovanissimiNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU15/GironeCNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU15/GironeDNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU15/GironeENapoli/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU15/GironeAFasciaBNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU15/GironeCFasciaBNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU15/GironeASalerno/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU15/GironeBSalerno/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU15/GironeCSalerno/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU15/GironeDSalerno/Risultati',
  // U14 Regionali + Provinciali
  'https://www.tuttocampo.it/Campania/GiovanissimiRegionaliU14/GironeA/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiRegionaliU14/GironeB/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiRegionaliU14/GironeC/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiRegionaliU14/GironeD/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiRegionaliU14/GironeE/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiRegionaliU14/GironeF/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiRegionaliU14/GironeG/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU14/GironeAAvellino/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU14/GironeUnicoCaserta/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU14/GironeBCaserta/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU14/GironeANapoli/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU14/GironeBNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU14/GironeCNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU14/GironeDNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU14/GironeENapoli/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU14/GironeFNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU14/GironeGNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU14/GironeHNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU14/GironeINapoli/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU14/GironeASalerno/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU14/GironeBSalerno/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU14/GironeCSalerno/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU149/GironeANapoli/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU149/GironeBNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU149/GironeCNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU149/GironeDNapoli/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU149/GironeENapoli/Risultati',
  'https://www.tuttocampo.it/Campania/GiovanissimiProvincialiU149/GironeASalerno/Risultati',
];

const downloaded = new Map();
let totalNew = 0;

function downloadLogo(url, dest) {
  return new Promise((resolve) => {
    if (!FORCE && fs.existsSync(dest)) { resolve('skip'); return; }
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 404) {
        file.close(); try { fs.unlinkSync(dest); } catch {}
        // Fallback a 120px
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
  // Visita homepage per ottenere cookie WAF
  await page.goto('https://www.tuttocampo.it', { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  console.log(`🚀 Scraping ${GIRONI.length} gironi...\n`);

  for (let i = 0; i < GIRONI.length; i++) {
    const url = GIRONI[i];
    const label = url.replace('https://www.tuttocampo.it/Campania/', '').replace('/Risultati', '');
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
