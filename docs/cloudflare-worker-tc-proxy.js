/**
 * Cloudflare Worker — TC Proxy
 * Proxy per Tuttocampo che bypassa il blocco IP datacenter.
 * Deploy su Cloudflare Workers (free tier: 100K req/giorno).
 *
 * ISTRUZIONI:
 * 1. Vai su https://dash.cloudflare.com → Workers & Pages → Create Worker
 * 2. Incolla questo codice nell'editor
 * 3. Deploy
 * 4. Copia l'URL del worker (es: https://tc-proxy.xxx.workers.dev)
 * 5. Configuralo nel backend come PROXY_URL
 */

const ALLOWED_ORIGINS = [
  'https://youth-football-manager-backend.vercel.app',
  'http://localhost:3001',
  'http://localhost:3002'
];

const SECRET = 'yfm-tc-proxy-2026';

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(request) });
    }

    // Verify secret
    const auth = request.headers.get('X-Proxy-Secret');
    if (auth !== SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders(request) });
    }

    try {
      const body = await request.json();
      const { url, method, headers, postBody } = body;

      if (!url || !url.includes('tuttocampo.it')) {
        return new Response(JSON.stringify({ error: 'Invalid URL' }), { status: 400, headers: corsHeaders(request) });
      }

      // Forward request to Tuttocampo
      const fetchOpts = {
        method: method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          ...(headers || {})
        },
        redirect: 'manual'
      };

      if (postBody) {
        fetchOpts.body = postBody;
      }

      const resp = await fetch(url, fetchOpts);
      const text = await resp.text();

      // Collect set-cookie headers
      const setCookies = resp.headers.getAll ? resp.headers.getAll('set-cookie') : [];
      // Fallback for workers that don't support getAll
      const cookieHeader = resp.headers.get('set-cookie') || '';

      return new Response(JSON.stringify({
        status: resp.status,
        data: text,
        cookies: setCookies.length ? setCookies : (cookieHeader ? [cookieHeader] : []),
        redirect: resp.headers.get('location') || null
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request) }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders(request) });
    }
  }
};

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Proxy-Secret'
  };
}
