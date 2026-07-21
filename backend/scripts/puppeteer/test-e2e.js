/**
 * test-e2e.js — Test E2E automatici con Puppeteer
 * 
 * Testa i flussi principali dell'app YFM:
 * - Login admin
 * - Navigazione dashboard
 * - Flusso guest famiglia
 * 
 * Uso:
 *   node test-e2e.js              → testa produzione
 *   YFM_URL=http://localhost:5173 node test-e2e.js → testa locale
 */

const puppeteer = require('/Users/Raffaele/.npm/_npx/55158e48eb5c59f7/node_modules/puppeteer');
const config = require('./config');
const path = require('path');
const fs = require('fs');

const BASE_URL = config.BASE_URL;
const TIMEOUT = config.TIMEOUT;

let passed = 0;
let failed = 0;
const results = [];

function log(msg, ok = true) {
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} ${msg}`);
  results.push({ msg, ok });
  if (ok) passed++; else failed++;
}

async function waitForSelector(page, selector, timeout = TIMEOUT) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

async function testLogin(browser) {
  console.log('\n📋 TEST: Login admin');
  const page = await browser.newPage();
  await page.setViewport(config.VIEWPORT);

  try {
    await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle2', timeout: TIMEOUT });

    // Verifica che la pagina di login sia caricata
    const loginForm = await waitForSelector(page, '#loginEmail, input[type="email"]');
    log('Pagina login caricata', loginForm);
    if (!loginForm) { await page.close(); return; }

    // Inserisce credenziali
    await page.type('input[type="email"]', config.CREDENTIALS.superadmin.email);
    await page.type('input[type="password"]', config.CREDENTIALS.superadmin.password);
    await page.click('button[type="submit"], .btn-primary');

    // Attende redirect alla dashboard
    await page.waitForNavigation({ timeout: TIMEOUT }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    const url = page.url();
    const loggedIn = !url.includes('login') && !url.includes('guest');
    log('Login superadmin riuscito', loggedIn);

    // Verifica sidebar visibile
    const sidebar = await waitForSelector(page, '.sidebar, #sidebar', 3000);
    log('Sidebar visibile dopo login', sidebar);

    // Screenshot
    await page.screenshot({ path: path.join(config.SCREENSHOTS_DIR, 'login-success.png') });
    log('Screenshot login salvato');

  } catch (e) {
    log(`Errore test login: ${e.message}`, false);
  } finally {
    await page.close();
  }
}

async function testDashboard(browser) {
  console.log('\n📋 TEST: Dashboard');
  const page = await browser.newPage();
  await page.setViewport(config.VIEWPORT);

  try {
    // Login
    await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle2', timeout: TIMEOUT });
    await page.type('input[type="email"]', config.CREDENTIALS.allenatore.email);
    await page.type('input[type="password"]', config.CREDENTIALS.allenatore.password);
    await page.click('button[type="submit"], .btn-primary');
    await new Promise(r => setTimeout(r, 3000));

    // Verifica dashboard caricata
    const pageContent = await waitForSelector(page, '#pageContent', 5000);
    log('pageContent presente', pageContent);

    const content = await page.$eval('#pageContent', el => el.innerText).catch(() => '');
    const hasDashboardContent = content.length > 50;
    log('Dashboard ha contenuto', hasDashboardContent);

    // Screenshot desktop
    await page.screenshot({ path: path.join(config.SCREENSHOTS_DIR, 'dashboard-desktop.png') });
    log('Screenshot dashboard desktop salvato');

    // Screenshot mobile
    await page.setViewport(config.VIEWPORT_MOBILE);
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(config.SCREENSHOTS_DIR, 'dashboard-mobile.png') });
    log('Screenshot dashboard mobile salvato');

  } catch (e) {
    log(`Errore test dashboard: ${e.message}`, false);
  } finally {
    await page.close();
  }
}

async function testGuestLink(browser) {
  console.log('\n📋 TEST: Flusso guest famiglia');
  const page = await browser.newPage();
  await page.setViewport(config.VIEWPORT_MOBILE);

  try {
    // Prima ottieni un token guest valido via API
    const apiUrl = BASE_URL.replace('5173', '3002').replace('youth-football-manager.vercel.app', 'youth-football-manager-backend.vercel.app');
    
    // Cerca un token guest nel DB tramite API
    const fetch = require('node:http');
    // Usa curl per ottenere un token guest
    const { execSync } = require('child_process');
    const tokensJson = execSync(`curl -s "https://csxdlxbhcnyfppojwwzy.supabase.co/rest/v1/guest_token?select=token,tipo&tipo=eq.famiglia&limit=1" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeGRseGJoY255ZnBwb2p3d3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NTEzMTMsImV4cCI6MjA5NzMyNzMxM30.KTL6Z_Mwo_QzNidWt95YLqc7ZvdbfxyQdzxCT5uNRIw" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeGRseGJoY255ZnBwb2p3d3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc1MTMxMywiZXhwIjoyMDk3MzI3MzEzfQ.HZXGk1Xfz0EvSqewAoSCcgZ6gIQYLOP-54mE3YVHgBo"`).toString();
    
    const tokens = JSON.parse(tokensJson);
    if (!tokens.length) { log('Nessun token guest trovato nel DB', false); await page.close(); return; }
    
    const token = tokens[0].token;
    log(`Token guest trovato: ${token.substring(0, 8)}...`);

    // Naviga al link guest
    const guestUrl = `${BASE_URL}/#/guest/${token}`;
    await page.goto(guestUrl, { waitUntil: 'networkidle2', timeout: TIMEOUT });
    await new Promise(r => setTimeout(r, 3000));

    // Verifica che la home atleta sia caricata
    const content = await page.$eval('#pageContent', el => el.innerText).catch(() => '');
    const hasGuestContent = content.length > 50;
    log('Home guest ha contenuto', hasGuestContent);

    // Verifica sidebar guest (non quella normale)
    const sidebar = await page.$eval('.sidebar-nav', el => el.innerText).catch(() => '');
    const isGuestSidebar = sidebar.includes('Home') && !sidebar.includes('Dashboard') && !sidebar.includes('Roster');
    log('Sidebar è quella guest', isGuestSidebar);

    // Screenshot home guest
    await page.screenshot({ path: path.join(config.SCREENSHOTS_DIR, 'guest-home.png') });
    log('Screenshot home guest salvato');

    // Clicca su Home e verifica che rimanga sulla pagina corretta
    const homeLink = await page.$('.sidebar-nav a');
    if (homeLink) {
      await homeLink.click();
      await new Promise(r => setTimeout(r, 2000));
      const contentAfter = await page.$eval('#pageContent', el => el.innerText).catch(() => '');
      const stillGuestContent = contentAfter.length > 50;
      log('Click Home mantiene contenuto guest', stillGuestContent);
    }

  } catch (e) {
    log(`Errore test guest: ${e.message}`, false);
  } finally {
    await page.close();
  }
}

async function testNavigation(browser) {
  console.log('\n📋 TEST: Navigazione pagine principali');
  const page = await browser.newPage();
  await page.setViewport(config.VIEWPORT);

  try {
    // Login
    await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle2', timeout: TIMEOUT });
    await page.type('input[type="email"]', config.CREDENTIALS.allenatore.email);
    await page.type('input[type="password"]', config.CREDENTIALS.allenatore.password);
    await page.click('button[type="submit"], .btn-primary');
    await new Promise(r => setTimeout(r, 3000));

    // Testa navigazione a pagine principali
    const pages = [
      { selector: '[data-page="roster"]',   name: 'Rosa' },
      { selector: '[data-page="calendar"]', name: 'Calendario' },
      { selector: '[data-page="stats"]',    name: 'Statistiche' },
    ];

    for (const p of pages) {
      const link = await page.$(p.selector);
      if (link) {
        await link.click();
        await new Promise(r => setTimeout(r, 2000));
        const content = await page.$eval('#pageContent', el => el.innerText).catch(() => '');
        log(`Navigazione a ${p.name} funziona`, content.length > 20);
      } else {
        log(`Link ${p.name} non trovato`, false);
      }
    }

  } catch (e) {
    log(`Errore test navigazione: ${e.message}`, false);
  } finally {
    await page.close();
  }
}

// Main
(async () => {
  console.log(`\n🚀 YFM E2E Tests — ${BASE_URL}`);
  console.log('='.repeat(50));

  // Assicura che la cartella output esista
  fs.mkdirSync(config.SCREENSHOTS_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    await testLogin(browser);
    await testDashboard(browser);
    await testGuestLink(browser);
    await testNavigation(browser);
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Risultati: ${passed} ✅  ${failed} ❌  (totale: ${passed + failed})`);
  
  if (failed > 0) {
    console.log('\n❌ Test falliti:');
    results.filter(r => !r.ok).forEach(r => console.log(`   - ${r.msg}`));
    process.exit(1);
  } else {
    console.log('\n✅ Tutti i test passati!');
  }
})();
