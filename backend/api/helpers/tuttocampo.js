/**
 * Tuttocampo helpers — login, request, fetch page/ajax
 * Usa Cloudflare Worker come proxy se PROXY_TC_URL è configurato (per Vercel).
 * Fallback a richiesta diretta (per sviluppo locale).
 */
const https = require('https');

const TC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const PROXY_URL = process.env.PROXY_TC_URL || ''; // es: https://tc-proxy.xxx.workers.dev
const PROXY_SECRET = process.env.PROXY_TC_SECRET || 'yfm-tc-proxy-2026';

// --- Direct request (locale) ---
function tcRequestDirect(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname, path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: { 'User-Agent': TC_UA, ...(options.headers || {}) }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'] || [];
      res.on('data', c => data += c);
      res.on('end', () => {
        resolve({ data, cookies, redirect: res.headers.location || null, status: res.statusCode });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// --- Proxy request (via Cloudflare Worker) ---
async function tcRequestProxy(url, options = {}) {
  const payload = JSON.stringify({
    url,
    method: options.method || 'GET',
    headers: options.headers || {},
    postBody: options.body || null
  });
  try {
    const resp = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Secret': PROXY_SECRET
      },
      body: payload
    });
    const text = await resp.text();
    const json = JSON.parse(text);
    return {
      data: json.data || '',
      cookies: json.cookies || [],
      redirect: json.redirect || null,
      status: json.status || resp.status
    };
  } catch (err) {
    // Fallback to direct if proxy fails
    console.error('Proxy error, falling back to direct:', err.message);
    return tcRequestDirect(url, options);
  }
}

// --- Unified request: proxy if available, else direct ---
function tcRequest(url, options = {}) {
  if (PROXY_URL) return tcRequestProxy(url, options);
  return tcRequestDirect(url, options);
}

async function tcLogin() {
  const user = process.env.TC_USERNAME || 'youthfootball';
  const pass = process.env.TC_PASSWORD || 'manager';
  const home = await tcRequest('https://www.tuttocampo.it/Homepage');
  const initCookies = home.cookies.map(c => c.split(';')[0]).join('; ');
  if (!PROXY_URL) await delay(600);
  const body = `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}&submit_login=Accedi&destination_page=https://www.tuttocampo.it/Homepage`;
  const login = await tcRequest('https://www.tuttocampo.it/Web/Views/Login/LoginModal.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': initCookies },
    body
  });
  const allCookies = [...home.cookies, ...login.cookies].map(c => c.split(';')[0]).join('; ');
  return allCookies;
}

async function tcFetchPage(url, cookies) {
  if (!PROXY_URL) await delay(800);
  const res = await tcRequest(url, { headers: { 'Cookie': cookies } });
  if (!res.data || res.data.length < 200) {
    await delay(1500);
    const retry = await tcRequest(url, { headers: { 'Cookie': cookies } });
    return retry.data;
  }
  return res.data;
}

async function tcFetchAjax(url, cookies, referer) {
  if (!PROXY_URL) await delay(800);
  const res = await tcRequest(url, {
    headers: { 'Cookie': cookies, 'X-Requested-With': 'XMLHttpRequest', 'Referer': referer }
  });
  if (!res.data || res.data.length < 100) {
    await delay(1500);
    const retry = await tcRequest(url, {
      headers: { 'Cookie': cookies, 'X-Requested-With': 'XMLHttpRequest', 'Referer': referer }
    });
    return retry.data;
  }
  return res.data;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { TC_UA, tcRequest, tcLogin, tcFetchPage, tcFetchAjax };
