/**
 * screenshots.js — Screenshot automatici per docs e landing page
 * 
 * Cattura screenshot delle pagine principali dell'app YFM
 * per aggiornare documentazione e landing page.
 * 
 * Uso:
 *   node screenshots.js              → produzione, tutte le pagine
 *   node screenshots.js --page login → solo login
 *   YFM_URL=http://localhost:5173 node screenshots.js → locale
 * 
 * Output: backend/scripts/puppeteer/output/screenshots/
 */

const puppeteer = require('/Users/Raffaele/.npm/_npx/55158e48eb5c59f7/node_modules/puppeteer');
const config = require('./config');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const BASE_URL = config.BASE_URL;
const OUT_DIR = config.SCREENSHOTS_DIR;
const TIMEOUT = config.TIMEOUT;

// Argomento opzionale --page
const args = process.argv.slice(2);
const pageFilter = args.includes('--page') ? args[args.indexOf('--page') + 1] : null;

fs.mkdirSync(OUT_DIR, { recursive: true });

async function login(page, role = 'allenatore') {
  const creds = config.CREDENTIALS[role];
  await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle2', timeout: TIMEOUT });
  await page.type('input[type="email"]', creds.email);
  await page.type('input[type="password"]', creds.password);
  await page.click('button[type="submit"], .btn-primary');
  // Attendi che la sidebar sia visibile (indica login completato)
  await page.waitForSelector('.sidebar, #sidebar, [data-page]', { timeout: TIMEOUT }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
}

async function navigateTo(page, hash, waitForSelector) {
  await page.evaluate((h) => { window.location.hash = h; }, hash);
  await new Promise(r => setTimeout(r, 500));
  if (waitForSelector) {
    await page.waitForSelector(waitForSelector, { timeout: 8000 }).catch(() => {});
  }
  // Attendi che eventuali spinner spariscano
  await page.waitForFunction(
    () => !document.querySelector('.loading-overlay, .spinner, [data-loading="true"]'),
    { timeout: 8000 }
  ).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
}

async function shot(page, filename, options = {}) {
  const fullPath = path.join(OUT_DIR, filename);
  await page.screenshot({ path: fullPath, fullPage: options.fullPage || false });
  console.log(`📸 ${filename}`);
  return fullPath;
}

// ─── Definizione pagine da catturare ───────────────────────────────────────

const PAGES = [

  {
    id: 'login',
    name: 'Login',
    async capture(browser) {
      const page = await browser.newPage();
      await page.setViewport(config.VIEWPORT);
      await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle2', timeout: TIMEOUT });
      await new Promise(r => setTimeout(r, 1000));
      await shot(page, 'login.png');
      await page.close();
    }
  },

  {
    id: 'dashboard',
    name: 'Dashboard',
    async capture(browser) {
      const page = await browser.newPage();
      await page.setViewport(config.VIEWPORT);
      await login(page, 'allenatore');
      await shot(page, 'dashboard-desktop.png');
      await page.setViewport(config.VIEWPORT_MOBILE);
      await new Promise(r => setTimeout(r, 500));
      await shot(page, 'dashboard-mobile.png');
      await page.close();
    }
  },

  {
    id: 'roster',
    name: 'Rosa giocatori',
    async capture(browser) {
      const page = await browser.newPage();
      await page.setViewport(config.VIEWPORT);
      await login(page, 'allenatore');
      await navigateTo(page, '/roster', '.player-card, .roster-table, table, .card');
      await shot(page, 'roster.png');
      await page.close();
    }
  },

  {
    id: 'calendar',
    name: 'Calendario partite',
    async capture(browser) {
      const page = await browser.newPage();
      await page.setViewport(config.VIEWPORT);
      await login(page, 'allenatore');
      await navigateTo(page, '/calendar', '.match-card, .calendar-list, table, .card');
      await shot(page, 'calendar.png');
      await page.close();
    }
  },

  {
    id: 'stats',
    name: 'Statistiche',
    async capture(browser) {
      const page = await browser.newPage();
      await page.setViewport(config.VIEWPORT);
      await login(page, 'allenatore');
      await navigateTo(page, '/stats', '.card, table');
      await shot(page, 'stats.png');
      await page.close();
    }
  },

  {
    id: 'fees',
    name: 'Quote (admin)',
    async capture(browser) {
      const page = await browser.newPage();
      await page.setViewport(config.VIEWPORT);
      await login(page, 'admin');
      await navigateTo(page, '/fees', '.card, table');
      await shot(page, 'fees-admin.png');
      await page.close();
    }
  },

  {
    id: 'guest',
    name: 'Home guest famiglia (mobile)',
    async capture(browser) {
      const page = await browser.newPage();
      await page.setViewport(config.VIEWPORT_MOBILE);

      const tokensJson = execSync(`curl -s "https://csxdlxbhcnyfppojwwzy.supabase.co/rest/v1/guest_token?select=token,tipo&tipo=eq.famiglia&limit=1" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeGRseGJoY255ZnBwb2p3d3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NTEzMTMsImV4cCI6MjA5NzMyNzMxM30.KTL6Z_Mwo_QzNidWt95YLqc7ZvdbfxyQdzxCT5uNRIw" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeGRseGJoY255ZnBwb2p3d3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc1MTMxMywiZXhwIjoyMDk3MzI3MzEzfQ.HZXGk1Xfz0EvSqewAoSCcgZ6gIQYLOP-54mE3YVHgBo"`).toString();
      const tokens = JSON.parse(tokensJson);
      if (!tokens.length) { console.log('⚠️  Nessun token guest trovato'); await page.close(); return; }

      const token = tokens[0].token;
      await page.goto(`${BASE_URL}/#/guest/${token}`, { waitUntil: 'networkidle2', timeout: TIMEOUT });
      // Attendi che la pagina guest sia caricata (non il login)
      await page.waitForFunction(
        () => !document.querySelector('input[type="email"]') && document.querySelector('#pageContent, .guest-home, .card'),
        { timeout: TIMEOUT }
      ).catch(() => {});
      await new Promise(r => setTimeout(r, 3000));
      // Debug: logga l'URL corrente e il titolo
      const url = page.url();
      const title = await page.title();
      console.log(`  URL: ${url} | Title: ${title}`);
      await shot(page, 'guest-home-mobile.png', { fullPage: true });
      await page.close();
    }
  },

  {
    id: 'guest-fees',
    name: 'Quote guest (mobile)',
    async capture(browser) {
      const page = await browser.newPage();
      await page.setViewport(config.VIEWPORT_MOBILE);

      const tokensJson = execSync(`curl -s "https://csxdlxbhcnyfppojwwzy.supabase.co/rest/v1/guest_token?select=token,tipo&tipo=eq.famiglia&limit=1" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeGRseGJoY255ZnBwb2p3d3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NTEzMTMsImV4cCI6MjA5NzMyNzMxM30.KTL6Z_Mwo_QzNidWt95YLqc7ZvdbfxyQdzxCT5uNRIw" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeGRseGJoY255ZnBwb2p3d3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc1MTMxMywiZXhwIjoyMDk3MzI3MzEzfQ.HZXGk1Xfz0EvSqewAoSCcgZ6gIQYLOP-54mE3YVHgBo"`).toString();
      const tokens = JSON.parse(tokensJson);
      if (!tokens.length) { console.log('⚠️  Nessun token guest trovato'); await page.close(); return; }

      const token = tokens[0].token;
      await page.goto(`${BASE_URL}/#/guest/${token}`, { waitUntil: 'networkidle2', timeout: TIMEOUT });
      await page.waitForFunction(
        () => !document.querySelector('input[type="email"]') && document.querySelector('#pageContent, .card'),
        { timeout: TIMEOUT }
      ).catch(() => {});
      await new Promise(r => setTimeout(r, 2000));
      // Naviga a Quote via hash
      await page.evaluate(() => { window.location.hash = '/guestFees'; });
      await new Promise(r => setTimeout(r, 2500));
      await shot(page, 'guest-fees-mobile.png', { fullPage: true });
      await page.close();
    }
  },

];

// ─── Main ──────────────────────────────────────────────────────────────────

(async () => {
  const pagesToRun = pageFilter
    ? PAGES.filter(p => p.id === pageFilter)
    : PAGES;

  if (!pagesToRun.length) {
    console.error(`❌ Pagina "${pageFilter}" non trovata. Disponibili: ${PAGES.map(p => p.id).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n📸 YFM Screenshots — ${BASE_URL}`);
  console.log(`   Output: ${OUT_DIR}`);
  console.log('='.repeat(50));

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (const p of pagesToRun) {
      console.log(`\n▶ ${p.name}`);
      await p.capture(browser).catch(e => console.log(`  ⚠️  Errore: ${e.message}`));
    }
  } finally {
    await browser.close();
  }

  console.log('\n✅ Screenshot completati!');
  console.log(`   Salvati in: ${OUT_DIR}`);
})();
