const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'logos', 'lazio');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const FORCE = process.argv.includes('--force');

const GIRONI = [
  // Juniores U19 Elite + Regionali + Provinciali
  'https://www.tuttocampo.it/Lazio/JunioresEliteU19/GironeA/Risultati',
  'https://www.tuttocampo.it/Lazio/JunioresEliteU19/GironeB/Risultati',
  'https://www.tuttocampo.it/Lazio/JunioresRegionaliBU19/GironeARegionaliFasciaB/Risultati',
  'https://www.tuttocampo.it/Lazio/JunioresRegionaliBU19/GironeBRegionaliB/Risultati',
  'https://www.tuttocampo.it/Lazio/JunioresRegionaliBU19/GironeCRegionaliB/Risultati',
  'https://www.tuttocampo.it/Lazio/JunioresRegionaliBU19/GironeDRegionaliB/Risultati',
  'https://www.tuttocampo.it/Lazio/JunioresRegionaliBU19/GironeE/Risultati',
  'https://www.tuttocampo.it/Lazio/JunioresRegionaliBU19/GironeF/Risultati',
  'https://www.tuttocampo.it/Lazio/JunioresProvincialiU19/GironeAProvincialiFrosinone/Risultati',
  'https://www.tuttocampo.it/Lazio/JunioresProvincialiU19/GironeAProvincialiLatina/Risultati',
  'https://www.tuttocampo.it/Lazio/JunioresProvincialiU19/GironeARieti/Risultati',
  'https://www.tuttocampo.it/Lazio/JunioresProvincialiU19/GironeARomaProvinciali/Risultati',
  'https://www.tuttocampo.it/Lazio/JunioresProvincialiU19/GironeBRomaProvinciali/Risultati',
  'https://www.tuttocampo.it/Lazio/JunioresProvincialiU19/GironeCRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/JunioresProvincialiU19/GironeDRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/JunioresProvincialiU19/GironeAProvincialiViterbo/Risultati',
  // U18
  'https://www.tuttocampo.it/Lazio/Under18Regionali/GironeA/Risultati',
  'https://www.tuttocampo.it/Lazio/Under18Regionali/GironeB/Risultati',
  'https://www.tuttocampo.it/Lazio/Under18Regionali/GironeC/Risultati',
  'https://www.tuttocampo.it/Lazio/Under18Regionali/GironeD/Risultati',
  'https://www.tuttocampo.it/Lazio/Under18Regionali/GironeE/Risultati',
  'https://www.tuttocampo.it/Lazio/Under18Regionali/GironeF/Risultati',
  'https://www.tuttocampo.it/Lazio/Under18Regionali/GironeG/Risultati',
  // U17 Elite + Regionali + Provinciali
  'https://www.tuttocampo.it/Lazio/AllieviEliteU17/GironeAEccellenza/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviEliteU17/GironeBEccellenza/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviRegionaliU17/GironeARegionali/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviRegionaliU17/GironeBRegionali/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviRegionaliU17/GironeCRegionali/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviRegionaliU17/GironeDRegionali/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviRegionaliU17/GironeE/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviProvincialiU17/GironeAProvincialiFrosinone/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviProvincialiU17/GironeAProvincialiLatina/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviProvincialiU17/GironeAProvincialiRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviProvincialiU17/GironeBProvincialiRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviProvincialiU17/GironeCRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviProvincialiU17/GironeDRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviProvincialiU17/GironeERoma/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviProvincialiU17/GironeFRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviProvincialiU17/GironeCProvincialiRoma/Risultati',
  // U16 Elite + Regionali + Provinciali
  'https://www.tuttocampo.it/Lazio/AllieviRegionaliU16/GironeAEccellenza/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviRegionaliU16/GironeB/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviRegionaliU16/GironeARegionali/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviRegionaliU16/GironeBRegionali/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviRegionaliU16/GironeCRegionali/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviRegionaliU16/GironeDRegionali/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviRegionaliU16/GironeE/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviProvincialiU16/GironeAFrosinone/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviProvincialiU16/GironeUnicoLatina/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviProvincialiU16/GironeBLatina/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviProvincialiU16/GironeAProvincialiFasciaBRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviProvincialiU16/GironeBProvincialiFasciaBRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviProvincialiU16/GironeCProvincialiFasciaBRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviProvincialiU16/GironeDProvincialiFasciaBRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviProvincialiU16/GironeEFasciaBRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviProvincialiU16/GironeFRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviProvincialiU16/GironeGRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/AllieviProvincialiU16/GironeUnicoViterbo/Risultati',
  // U15 Elite + Regionali + Provinciali
  'https://www.tuttocampo.it/Lazio/GiovanissimiEliteU15/GironeAEccellenza/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiEliteU15/GironeBEccellenza/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiRegionaliU15/GironeARegionali/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiRegionaliU15/GironeBRegionali/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiRegionaliU15/GironeCRegionali/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiRegionaliU15/GironeDRegionaliRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiRegionaliU15/GironeE/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU15/GironeAProvincialiFrosinone/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU15/GironeBFrosinone/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU15/GironeALatina/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU15/GironeBProvincialiLatina/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU15/GironeAProvincialiRieti/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU15/GironeAProvincialiRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU15/GironeBProvincialiRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU15/GironeCProvincialiRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU15/GironeHRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU15/GironeEProvincialiRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU15/GironeFProvincialiRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU15/GironeGProvincialiRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU15/GironeUnicoGiovanissimiViterbo/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU15/GironeBViterbo/Risultati',
  // U14 Elite + Regionali + Provinciali
  'https://www.tuttocampo.it/Lazio/GiovanissimiRegionaliU14/GironeAEccellenza/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiRegionaliU14/GironeB/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiRegionaliU14/GironeARegionali/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiRegionaliU14/GironeBRegionali/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiRegionaliU14/GironeCRegionali/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiRegionaliU14/GironeDRegionali/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiRegionaliU14/GironeE/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU14/GironeAProvincialiFasciaBFrosinone/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU14/GironeAProvincialiFasciaBLatina/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU14/GironeBProvincialiFasciaBLatina/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU14/GironeARieti/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU14/GironeAProvincialiFasciaBRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU14/GironeBProvincialiFasciaBRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU14/GironeCProvincialiFasciaBRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU14/GironeDProvincialiFasciaBRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU14/GironeEProvincialiFasciaBRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU14/GironeFProvincialiFasciaBRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU14/GironeGProvincialiFasciaBRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU14/GironeHProvincialiFasciaBRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU14/GironeIRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU14/GironeLRoma/Risultati',
  'https://www.tuttocampo.it/Lazio/GiovanissimiProvincialiU14/GironeUnicoViterbo/Risultati',
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
  await page.goto('https://www.tuttocampo.it', { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  console.log(`🚀 Scraping ${GIRONI.length} gironi Lazio...\n`);

  for (let i = 0; i < GIRONI.length; i++) {
    const url = GIRONI[i];
    const label = url.replace('https://www.tuttocampo.it/Lazio/', '').replace('/Risultati', '');
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
