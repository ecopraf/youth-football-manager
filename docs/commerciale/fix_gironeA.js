const https = require('https');
const fs = require('fs');

let cookies = '';

function req(options, body) {
  return new Promise((resolve, reject) => {
    const r = https.request(options, res => {
      const sc = res.headers['set-cookie'];
      if (sc) cookies = (cookies ? cookies + '; ' : '') + sc.map(c => c.split(';')[0]).join('; ');
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

function get(url) {
  const u = new URL(url);
  return req({ hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookies, 'Accept-Encoding': 'identity' } });
}

function post(url, data) {
  const u = new URL(url);
  return req({ hostname: u.hostname, path: u.pathname, method: 'POST',
    headers: { 'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data), 'Cookie': cookies, 'Accept-Encoding': 'identity' } }, data);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function extractEmails(html) {
  const re = /([a-zA-Z0-9._%+\-]+@(?!tuttocampo|google|example|scorecardresearch)[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g;
  const found = new Set();
  let m;
  while ((m = re.exec(html)) !== null) found.add(m[1].toLowerCase());
  return [...found];
}

async function main() {
  // Login
  await get('https://www.tuttocampo.it/2025-26/Lazio/Homepage');
  await post('https://www.tuttocampo.it/Web/Views/Login/LoginModal.php',
    'username=youthfootball&password=manager&remind_me=remind_me&destination_page=/Homepage&submit_login=Accedi');
  console.log('Login OK');
  await sleep(1000);

  // Fetch Girone A
  const page = await get('https://www.tuttocampo.it/2025-26/Lazio/GiovanissimiRegionaliU15/GironeARegionali/Classifica');
  const tckk = (page.body.match(/tckk='([^']+)'/) || [])[1];
  console.log('tckk:', tckk);
  if (!tckk) { console.log('no tckk'); process.exit(1); }

  await sleep(1000);
  const teams = await get(`https://www.tuttocampo.it/Web/Views/Teams/TeamsList.php?tckk=${tckk}`);
  const links = [...teams.body.matchAll(/href="(https:\/\/www\.tuttocampo\.it\/2025-26\/Lazio\/[^"]+\/Scheda)"/g)].map(m => m[1]);
  console.log(`${links.length} squadre trovate`);

  const results = [];

  for (const url of links) {
    await sleep(1500);
    const scheda = await get(url);
    const name = (scheda.body.match(/var teamName='([^']+)'/) || [])[1] || url.split('/Squadra/')[1]?.split('/')[0];
    const tckk2 = (scheda.body.match(/tckk='([^']+)'/) || [])[1];

    let detailHtml = '';
    if (tckk2) {
      await sleep(500);
      const det = await get(`https://www.tuttocampo.it/Web/Views/TeamDetailsView/TeamDetailsView.php?tckk=${tckk2}`);
      if (!det.body.includes('Errore imprevisto')) detailHtml = det.body;
    }

    const emails = extractEmails(scheda.body + detailHtml);
    const email = emails[0] || '';
    console.log(`  ${name} | ${email || '—'}`);
    results.push({ name, email, url });
  }

  // Aggiorna CSV: sostituisce le prime 16 righe (Girone A) con i dati corretti
  const csvPath = __dirname + '/societa_lazio.csv';
  const lines = fs.readFileSync(csvPath, 'utf8').split('\n');
  const header = lines[0];
  const rest = lines.slice(17).filter(l => l.trim()); // righe dalla 17 in poi (Girone D)

  const newRows = results.map(r => `${r.name},${r.email},${r.url} ,Da contattare,,`);
  fs.writeFileSync(csvPath, [header, ...newRows, ...rest].join('\n') + '\n');
  console.log('\nCSV aggiornato!');
}

main().catch(e => { console.error(e); process.exit(1); });
