// Parse ISO-like datetime string without timezone conversion
// DB stores "2026-07-05T10:30:00" meaning local time (no TZ)
function parseLocal(d) {
  if (!d) return null;
  const s = String(d);
  // "2026-07-05T10:30:00" or "2026-07-05T10:30"
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // "2026-07-05" (date only)
  const d2 = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (d2) return new Date(+d2[1], +d2[2] - 1, +d2[3]);
  return new Date(d);
}

export function formatDate(d) {
  if (!d) return '';
  const date = parseLocal(d);
  return date.toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

export function formatDateShort(d) {
  if (!d) return '';
  const date = parseLocal(d);
  return date.toLocaleDateString('it-IT');
}

export function formatDateCompact(d) {
  if (!d) return '';
  const date = parseLocal(d);
  const giorni = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const mesi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  const giorno = giorni[date.getDay()];
  const num = date.getDate();
  const mese = mesi[date.getMonth()];
  const ore = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${giorno} ${num} ${mese} · ${ore}:${min}`;
}

export function formatBirthDate(d) {
  if (!d) return '';
  const date = parseLocal(d);
  return date.toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

export function formatTime(t) {
  if (!t) return '';
  if (t.includes('T')) {
    const m = t.match(/T(\d{2}):(\d{2})/);
    return m ? m[1] + ':' + m[2] : '';
  }
  return t.slice(0, 5);
}

export function getAvatarColor(n) {
  const C = ['#1A365D','#2ECC71','#E74C3C','#F39C12','#2980B9','#8E44AD','#16A085','#D35400'];
  let h = 0;
  for (let i = 0; i < (n || '').length; i++) h = n.charCodeAt(i) + ((h << 5) - h);
  return C[Math.abs(h) % C.length];
}
