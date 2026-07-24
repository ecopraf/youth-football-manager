const https = require('https');
const fs = require('fs');

const cookie = fs.readFileSync('./tc_cookie.txt', 'utf8').trim();
const tckk = 'd4bef4723a009198ba7c5ae9834fe6dace0fb921';

function get(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.tuttocampo.it/2025-26/Campania/GiovanissimiProvincialiU14/GironeASalerno/Risultati'
      }
    };
    https.get(url, opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

(async () => {
  // Test 1: stagione corrente (default)
  const url1 = `https://www.tuttocampo.it/Web/Views/Results/ResultsView.php?tckk=${tckk}&v=1&category_id=CP.GX.A.SA&match_day_id=1`;
  const r1 = await get(url1);
  const logos1 = r1.match(/Teams\/40\/\d+\.png/g) || [];
  console.log('Default season logos:', logos1.length, logos1.slice(0,3));
  console.log('First 200 chars:', r1.substring(0, 200));

  // Test 2: prova Classifica invece di Risultati
  const url2 = `https://www.tuttocampo.it/Web/Views/Standings/StandingsView.php?tckk=${tckk}&v=1&category_id=CP.GX.A.SA`;
  const r2 = await get(url2);
  const logos2 = r2.match(/Teams\/40\/\d+\.png/g) || [];
  console.log('\nStandings logos:', logos2.length, logos2.slice(0,5));
  console.log('First 200 chars:', r2.substring(0, 200));
})();
