/**
 * Import formation from Tuttocampo match detail page
 */
const { tcRequest, tcLogin } = require('./tuttocampo');
const { parseMinuto } = require('./importUtils');

async function importFormationFromTC(matchId, matchUrl, teamId, teamName, supabase, tcCookies) {
  const cookies = tcCookies || await tcLogin();
  
  // Fix corrupted URLs (double prefix)
  let url = matchUrl;
  if (url.includes('tuttocampo.ithttps://')) {
    url = 'https://www.tuttocampo.it' + url.split('tuttocampo.it').pop();
  }
  
  // Step 1: Fetch match page for tckk, match_id, roundID
  const pageResp = await tcRequest(url, { headers: { 'Cookie': cookies } });
  const pageHtml = pageResp.data;
  if (!pageHtml || pageHtml.length < 500) return 0;
  const tckk = pageHtml.match(/var tckk='([^']+)'/)?.[1];
  const tcMatchId = pageHtml.match(/match_id="([^"]+)"/)?.[1];
  const roundID = pageHtml.match(/roundID='([^']+)'/)?.[1];
  if (!tckk || !tcMatchId || !roundID) return 0;
  
  // Step 2: Fetch formations AJAX
  const formResp = await tcRequest('https://www.tuttocampo.it/Web/Views/MatchFormations/MatchFormations.php?tckk=' + tckk, {
    method: 'POST',
    headers: {
      'Cookie': cookies,
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': matchUrl
    },
    body: `match_id=${encodeURIComponent(tcMatchId)}&category_id=${encodeURIComponent(roundID)}`
  });
  const formHtml = formResp.data;
  if (!formHtml || formHtml.length < 500) return 0;
  
  // Step 3: Parse formation text block
  const summaryMatch = formHtml.match(/<div>[\s\S]*?<strong>MARCATORI:<\/strong>([\s\S]*?)<\/div>/);
  if (!summaryMatch) return 0;
  const block = summaryMatch[1];
  
  const searchName = teamName.toLowerCase();
  const teamRegex = new RegExp(
    "<a[^>]*>([^<]*)</a>\\s*(?:\\(([^)]+)\\))?:\\s*</strong>\\s*([^<]+)<br/?>\\s*<strong>A disposizione:</strong>\\s*([^<]+)",
    'gi'
  );
  
  let ourStarters = [], ourSubs = [], modulo = '';
  let match;
  while ((match = teamRegex.exec(block)) !== null) {
    const foundName = match[1].trim().toLowerCase();
    if (foundName.includes(searchName) || searchName.includes(foundName)) {
      modulo = match[2] || '';
      ourStarters = match[3].split(',').map(s => s.trim()).filter(Boolean);
      ourSubs = match[4].split(',').map(s => s.trim()).filter(Boolean);
      break;
    }
  }
  
  if (ourStarters.length === 0) return 0;
  
  // Step 4: Get roster for fuzzy match
  const { data: roster } = await supabase
    .from('team_player')
    .select('id, player_id, player:player_id(nome, cognome)')
    .eq('team_id', teamId);
  if (!roster || roster.length === 0) return 0;
  
  function matchPlayer(displayName) {
    const clean = displayName.replace(/\([^)]*\)/g, '').trim();
    const parts = clean.split(/\.\s*/);
    const cognome = parts.length > 1 ? parts.slice(1).join('.').trim() : clean;
    const cognomeLower = cognome.toLowerCase();
    
    let found = roster.find(r => r.player?.cognome?.toLowerCase() === cognomeLower);
    if (!found) found = roster.find(r => r.player?.cognome?.toLowerCase().includes(cognomeLower) || cognomeLower.includes(r.player?.cognome?.toLowerCase() || '___'));
    return found;
  }
  
  // Step 5: Build convocations and formations
  const convocations = [];
  const formations = [];
  
  for (let i = 0; i < ourStarters.length; i++) {
    const tp = matchPlayer(ourStarters[i]);
    if (tp) {
      convocations.push({ match_id: matchId, team_player_id: tp.id, presente: true });
      formations.push({ match_id: matchId, team_player_id: tp.id, posizione: i + 1, numero_maglia: i + 1, is_starter: true, ordine: i + 1 });
    }
  }
  for (let i = 0; i < ourSubs.length; i++) {
    const tp = matchPlayer(ourSubs[i]);
    if (tp) {
      convocations.push({ match_id: matchId, team_player_id: tp.id, presente: true });
      formations.push({ match_id: matchId, team_player_id: tp.id, posizione: 12 + i, numero_maglia: 12 + i, is_starter: false, ordine: 12 + i });
    }
  }
  
  if (convocations.length === 0) return 0;
  
  // Step 6: Save to DB (delete existing first)
  await supabase.from('convocation').delete().eq('match_id', matchId);
  await supabase.from('match_formation').delete().eq('match_id', matchId);
  
  await supabase.from('convocation').insert(convocations);
  await supabase.from('match_formation').insert(formations);
  
  if (modulo) {
    await supabase.from('match').update({ formazione_meta: { modulo, positions: {} } }).eq('id', matchId);
  }
  
  // Step 7: Parse substitution events
  const subEvents = [];
  for (const name of ourStarters) {
    const subMatch = name.match(/(.+?)\s*\(↓\s*([^)]*)??\)/);
    if (subMatch) {
      const tp = matchPlayer(subMatch[1]);
      const minuto = parseMinuto(subMatch[2] || '');
      if (tp) subEvents.push({ match_id: matchId, tipo_evento: 'SUBSTITUTION_OUT', player_id: tp.player_id, minuto });
    }
  }
  for (const name of ourSubs) {
    const subMatch = name.match(/(.+?)\s*\(↑\s*([^)]*)??\)/);
    if (subMatch) {
      const tp = matchPlayer(subMatch[1]);
      const minuto = parseMinuto(subMatch[2] || '');
      if (tp) subEvents.push({ match_id: matchId, tipo_evento: 'SUBSTITUTION_IN', player_id: tp.player_id, minuto });
    }
  }
  
  if (subEvents.length > 0) {
    await supabase.from('match_event').insert(subEvents);
  }
  
  return convocations.length;
}

module.exports = { importFormationFromTC };
