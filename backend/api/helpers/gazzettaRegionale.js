/**
 * Gazzetta Regionale API helper
 * Parsa classifica, calendario e marcatori da v2.apiweb.gazzettaregionale.it
 */

// Estrae level/championship/group dall'URL utente
function parseGrUrl(url) {
  // Formati accettati:
  // https://v2.apiweb.gazzettaregionale.it/classifiche/classifica/1/55/2325
  // https://v2.apiweb.gazzettaregionale.it/classifiche/levels/1/55/2325/classifica
  // https://v2.apiweb.gazzettaregionale.it/calendari/calendario/1/55/2325
  // oppure direttamente: 1/55/2325
  const match = url.match(/(\d+)\/(\d+)\/(\d+)/);
  if (!match) return null;
  return { level: match[1], championship: match[2], group: match[3] };
}

const BASE_CLASSIFICA = 'https://v2.apiweb.gazzettaregionale.it/classifiche/levels';
const BASE_CALENDARIO = 'https://v2.apiweb.gazzettaregionale.it/calendari/levels';
const BASE_MARCATORI = 'https://v2.apiweb.gazzettaregionale.it/marcatori/levels';
const BASE_LEVELS = 'https://v2.apiweb.gazzettaregionale.it/classifiche/levels';

// Naviga la struttura GR: levels → championships → groups
async function fetchLevels() {
  const resp = await fetch(BASE_LEVELS, { headers: { 'Accept': 'application/json' } });
  return resp.ok ? resp.json() : [];
}

async function fetchChampionships(levelId) {
  const resp = await fetch(`${BASE_LEVELS}/${levelId}`, { headers: { 'Accept': 'application/json' } });
  return resp.ok ? resp.json() : [];
}

async function fetchGroups(levelId, championshipId) {
  const resp = await fetch(`${BASE_LEVELS}/${levelId}/${championshipId}`, { headers: { 'Accept': 'application/json' } });
  return resp.ok ? resp.json() : [];
}

async function fetchClassifica(level, championship, group) {
  const url = `${BASE_CLASSIFICA}/${level}/${championship}/${group}/classifica`;
  const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!resp.ok) throw new Error('API GR non raggiungibile');
  const data = await resp.json();
  const html = data.html || '';

  // Parse logos
  const logoRe = /src="(https:\/\/[^"]+)"[^>]*>\n\s*<span class="team_name">(.*?)<\/span>/g;
  const logoMap = {};
  let m;
  while ((m = logoRe.exec(html)) !== null) logoMap[m[2]] = m[1];

  // Parse standings rows
  const rowRe = /<td class="class-num">(.*?)<\/td>.*?<span class="team_name">(.*?)<\/span>.*?<td>(.*?)<\/td>.*?<td>(.*?)<\/td>.*?<td>(.*?)<\/td>.*?<td>(.*?)<\/td>.*?<td>(.*?)<\/td>.*?<td>(.*?)<\/td>.*?<td>(.*?)<\/td>/gs;
  const classifica = [];
  while ((m = rowRe.exec(html)) !== null) {
    classifica.push({
      pos: +m[1], nome: m[2], logo: logoMap[m[2]] || null,
      punti: +m[3], g: +m[4], v: +m[5], n: +m[6], p: +m[7], gf: +m[8], gs: +m[9]
    });
  }

  return { classifica, info: data.info || {}, lastRound: data.last_round, risultatiUltimaGiornata: data.data_risultati || [] };
}

async function fetchCalendario(level, championship, group) {
  const url = `${BASE_CALENDARIO}/${level}/${championship}/${group}/calendario`;
  const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!resp.ok) throw new Error('API GR non raggiungibile');
  const data = await resp.json();

  // matches_first = andata (array di array per giornata), matches_second = ritorno
  const allMatches = [];
  const rounds = [...(data.matches_first || []), ...(data.matches_second || [])];
  for (const round of rounds) {
    if (Array.isArray(round)) {
      for (const match of round) {
        allMatches.push({
          id: match.id,
          giornata: +match.round_number,
          casa: match.home_club_name,
          casa_id: match.home_id,
          casa_logo: match.home_logo || null,
          ospite: match.away_club_name,
          ospite_id: match.away_id,
          ospite_logo: match.away_logo || null,
          data: match.date_match,
          ora: match.time_match,
          gol_casa: match.home_points !== null ? +match.home_points : null,
          gol_ospite: match.away_points !== null ? +match.away_points : null,
          stato: match.idmatch_status
        });
      }
    }
  }

  return { matches: allMatches, info: data.info || {} };
}

async function fetchMarcatori(level, championship, group) {
  const url = `${BASE_MARCATORI}/${level}/${championship}/${group}/classifica`;
  const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!resp.ok) throw new Error('API GR non raggiungibile');
  const data = await resp.json();
  const html = data.html || '';

  const re = /<tr>\n\s*<td>(\d+)<\/td>\n\s*<td>([^<]+)<\/td>\n\s*<td class="name">.*?<span class="team_name">([^<]+)<\/span>/gs;
  const marcatori = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    marcatori.push({ gol: +m[1], nome: m[2].trim(), squadra: m[3].trim() });
  }

  return { marcatori, info: data.info || {} };
}

// Estrae tutti i loghi unici dal calendario
function extractLogos(calendarData) {
  const logos = {};
  for (const match of calendarData.matches) {
    if (match.casa_logo) logos[match.casa] = match.casa_logo;
    if (match.ospite_logo) logos[match.ospite] = match.ospite_logo;
  }
  return Object.entries(logos).map(([nome, url]) => ({ nome, url }));
}

module.exports = { parseGrUrl, fetchClassifica, fetchCalendario, fetchMarcatori, extractLogos, fetchLevels, fetchChampionships, fetchGroups };
