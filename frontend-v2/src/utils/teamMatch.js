// Matching nomi squadra GR (gestisce abbreviazioni: Pol., C., Atl., ecc.)
const ABBR = { 'pol': 'polisportiva', 'polisport': 'polisportiva', 'atl': 'atletico', 'din': 'dinamo', 'sp': 'sporting', 'sport': 'sporting', 'virt': 'virtus', 'acc': 'accademia', 'c': 'citta', 'cit': 'citta', 'ol': 'olimpia', 'olim': 'olimpia' };
const GEN = ['polisportiva', 'atletico', 'atletica', 'calcio', 'football', 'club', 'sporting', 'dinamo', 'virtus', 'real', 'accademia', 'giovani', 'citta', 'olimpia', 'di', 'del', 'dei', 'la', 'le'];

function coreName(name) {
  let n = name.toLowerCase().replace(/\b(s\.?s\.?d\.?|s\.?r\.?l\.?|a\.?s\.?d\.?|a\.?r\.?l\.?|s\.?s\.?|a\.?c\.?|f\.?c\.?)\b\.?/gi, '')
    .replace(/à/g,'a').replace(/è/g,'e').replace(/é/g,'e').replace(/ì/g,'i').replace(/ò/g,'o').replace(/ù/g,'u')
    .replace(/\./g,' ').replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();
  const w = n.split(' ').map(x => ABBR[x] || x);
  const c = w.filter(x => !GEN.includes(x) && x.length > 1);
  return c.length > 0 ? c.join(' ') : w.join(' ');
}

export function isOurTeam(grName, teamName) {
  const a = grName.toLowerCase(), b = teamName.toLowerCase();
  if (a.includes(b) || b.includes(a)) return true;
  const ca = coreName(grName), cb = coreName(teamName);
  return ca === cb || ca.includes(cb) || cb.includes(ca);
}
