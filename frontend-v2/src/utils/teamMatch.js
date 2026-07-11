// Matching nomi squadra GR (gestisce abbreviazioni: Pol., C., Atl., ecc.)
const ABBR = { 'pol': 'polisportiva', 'polisport': 'polisportiva', 'atl': 'atletico', 'din': 'dinamo', 'sp': 'sporting', 'sport': 'sporting', 'virt': 'virtus', 'acc': 'accademia', 'c': 'citta', 'cit': 'citta', 'ol': 'olimpia', 'olim': 'olimpia' };
const GEN = ['polisportiva', 'atletico', 'atletica', 'calcio', 'football', 'club', 'sporting', 'dinamo', 'virtus', 'real', 'accademia', 'giovani', 'citta', 'olimpia', 'di', 'del', 'dei', 'la', 'le'];

function coreName(name) {
  let n = name.toLowerCase().replace(/\b(s\.?s\.?d\.?|s\.?r\.?l\.?|a\.?s\.?d\.?|a\.?r\.?l\.?|s\.?s\.?|a\.?c\.?|f\.?c\.?)\b\.?/gi, '')
    .replace(/à/g,'a').replace(/è/g,'e').replace(/é/g,'e').replace(/ì/g,'i').replace(/ò/g,'o').replace(/ù/g,'u')
    .replace(/\./g,' ').replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();
  const w = n.split(' ').map(x => ABBR[x] || x);
  const c = w.filter(x => !GEN.includes(x) && x.length > 1);
  // Se rimane solo 1 parola ma l'input ne aveva 2+, preserva anche le generiche significative
  // per evitare che "Accademia Atl. Lodigiani" e "Lodigiani" collassino allo stesso core
  if (c.length === 1 && w.length >= 2) {
    const meaningful = w.filter(x => x.length > 2);
    if (meaningful.length > 1) return meaningful.join(' ');
  }
  return c.length > 0 ? c.join(' ') : w.join(' ');
}

export function isOurTeam(grName, teamName) {
  const a = grName.toLowerCase(), b = teamName.toLowerCase();
  if (a === b) return true;
  const ca = coreName(grName), cb = coreName(teamName);
  if (ca === cb) return true;
  // Word-level: all words of the shorter must appear in the longer
  const wa = ca.split(' '), wb = cb.split(' ');
  if (wa.length >= 1 && wb.length >= 1) {
    const [shorter, longer] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
    // The shorter must have at least half the words of the longer to match
    if (shorter.length >= longer.length / 2 || shorter.length === longer.length) {
      if (shorter.every(w => longer.includes(w))) return true;
    }
  }
  return false;
}
