/**
 * Tuttocampo helpers — login, request, fetch page/ajax
 */
const https = require('https');

const TC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function tcRequest(url, options = {}) {
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
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          resolve({ data, cookies, redirect: res.headers.location, status: res.statusCode });
        } else {
          resolve({ data, cookies, status: res.statusCode });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function tcLogin() {
  const user = process.env.TC_USERNAME || 'youthfootball';
  const pass = process.env.TC_PASSWORD || 'manager';
  const home = await tcRequest('https://www.tuttocampo.it/Homepage');
  const initCookies = home.cookies.map(c => c.split(';')[0]).join('; ');
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
  const res = await tcRequest(url, { headers: { 'Cookie': cookies } });
  return res.data;
}

async function tcFetchAjax(url, cookies, referer) {
  const res = await tcRequest(url, {
    headers: { 'Cookie': cookies, 'X-Requested-With': 'XMLHttpRequest', 'Referer': referer }
  });
  return res.data;
}

module.exports = { TC_UA, tcRequest, tcLogin, tcFetchPage, tcFetchAjax };
