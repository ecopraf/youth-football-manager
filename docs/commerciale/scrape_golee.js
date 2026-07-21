// scrape_golee.js — scraper golee.it/clubs per provincia RM
// Estrae email da pagine club, confronta con CSV, produce golee_diff.json
// Lezioni apprese:
//   - usare domcontentloaded + 3s wait (networkidle2 causa timeout su molte pagine)
//   - filtrare .pec., golee, lnd.it dalle email trovate
//   - se un club ha già email diversa nel CSV → aggiungere come nuova riga (non sovrascrivere)
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, 'societa_lazio.csv');
const OUT_PATH = path.join(__dirname, 'golee_results.json');

function readCSV() {
  const lines = fs.readFileSync(CSV_PATH, 'utf8').split('\n').filter(l => l.trim());
  return lines.slice(1).map(l => {
    const parts = l.split(',');
    return { nome: parts[0]?.trim(), email: parts[1]?.trim() };
  });
}

function normalizeName(n) {
  return (n || '').toLowerCase()
    .replace(/a\.?s\.?d\.?|s\.?s\.?d\.?|a\.?c\.?|f\.?c\.?|u\.?s\.?d\.?|asd|ssd|calcio|football|club|roma|sport|polisportiva/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

async function run() {
  const csvRows = readCSV();
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Raccogli tutti i link
  await page.goto('https://golee.it/clubs/?sports=Calcio&provinces=RM', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const clubLinks = await page.evaluate(() =>
    [...new Set([...document.querySelectorAll('a[href^="/clubs/"]')]
      .map(a => a.href)
      .filter(h => { try { return new URL(h).pathname.split('/').filter(Boolean).length === 2; } catch { return false; } })
    )]
  );

  console.log(`Trovati ${clubLinks.length} club. Inizio scraping...\n`);

  const results = [];
  const nuovi = [];
  const aggiornamenti = [];

  for (let i = 0; i < clubLinks.length; i++) {
    const link = clubLinks[i];
    try {
      // domcontentloaded + 3s wait: più affidabile di networkidle2 su golee
      await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise(r => setTimeout(r, 3000));

      const data = await page.evaluate(() => {
        const name = document.querySelector('h1')?.innerText?.trim() || '';
        const emailEl = document.querySelector('a[href^="mailto:"]');
        let email = emailEl ? emailEl.href.replace('mailto:', '').trim() : '';
        if (!email) {
          const match = document.body.innerText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g);
          // Escludi PEC, golee, LND — email di sistema non utili
          const filtered = (match || []).filter(e =>
            !e.includes('pec.') && !e.includes('golee') && !e.includes('lnd.it')
          );
          email = filtered[0] || '';
        }
        return { name, email };
      });

      const prefix = `[${i+1}/${clubLinks.length}]`;

      if (data.email) {
        results.push({ name: data.name, email: data.email });
        fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));

        // Confronta con CSV
        const gNorm = normalizeName(data.name);
        const match = csvRows.find(r => {
          const rNorm = normalizeName(r.nome);
          return rNorm === gNorm || rNorm.includes(gNorm) || gNorm.includes(rNorm);
        });

        if (!match) {
          nuovi.push({ name: data.name, email: data.email });
          console.log(`${prefix} 🆕 ${data.name} → ${data.email}`);
        } else if (!match.email || match.email === 'N/D' || match.email === '') {
          nuovi.push({ name: data.name, email: data.email, csv_nome: match.nome });
          console.log(`${prefix} ➕ ${data.name} → ${data.email} (aggiunge email mancante)`);
        } else if (match.email.toLowerCase() !== data.email.toLowerCase()) {
          // Email diversa: aggiungere come nuova riga (non sovrascrivere — entrambe potrebbero essere valide)
          aggiornamenti.push({ csv_nome: match.nome, csv_email: match.email, golee_nome: data.name, golee_email: data.email });
          console.log(`${prefix} 🔄 ${data.name}: CSV="${match.email}" → Golee="${data.email}" (valutare se aggiungere come riga separata)`);
        } else {
          console.log(`${prefix} ✅ ${data.name} → ${data.email} (già nel CSV)`);
        }
      } else {
        console.log(`[${i+1}/${clubLinks.length}] — ${data.name || link} (nessuna email)`);
      }
    } catch (e) {
      console.log(`[${i+1}/${clubLinks.length}] ⚠️  Errore: ${link}`);
    }
  }

  await browser.close();

  console.log('\n\n=== RIEPILOGO ===');
  console.log(`🆕 Nuovi/email mancanti: ${nuovi.length}`);
  nuovi.forEach(n => console.log(`  + ${n.name} → ${n.email}`));
  console.log(`\n🔄 Email diverse da aggiornare: ${aggiornamenti.length}`);
  aggiornamenti.forEach(a => console.log(`  ~ ${a.csv_nome}: "${a.csv_email}" → "${a.golee_email}"`));

  fs.writeFileSync(path.join(__dirname, 'golee_diff.json'), JSON.stringify({ nuovi, aggiornamenti }, null, 2));
  console.log('\n💾 Diff salvata in golee_diff.json');
}

run().catch(e => { console.error(e); process.exit(1); });
