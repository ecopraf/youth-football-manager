export function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function formatDateShort(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('it-IT');
}

export function formatDateCompact(d) {
  if (!d) return '';
  const date = new Date(d);
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
  return new Date(d).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

export function formatTime(t) {
  if (!t) return '';
  // Se è un ISO datetime, estrai ore:minuti
  if (t.includes('T')) {
    const date = new Date(t);
    return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
  }
  return t.slice(0, 5);
}

export function getAvatarColor(n) {
  const C = ['#1A365D','#2ECC71','#E74C3C','#F39C12','#2980B9','#8E44AD','#16A085','#D35400'];
  let h = 0;
  for (let i = 0; i < (n || '').length; i++) h = n.charCodeAt(i) + ((h << 5) - h);
  return C[Math.abs(h) % C.length];
}
