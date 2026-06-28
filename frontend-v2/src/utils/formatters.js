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

export function formatBirthDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

export function formatTime(t) {
  if (!t) return '';
  return t.slice(0, 5);
}

export function getAvatarColor(n) {
  const C = ['#1A365D','#2ECC71','#E74C3C','#F39C12','#2980B9','#8E44AD','#16A085','#D35400'];
  let h = 0;
  for (let i = 0; i < (n || '').length; i++) h = n.charCodeAt(i) + ((h << 5) - h);
  return C[Math.abs(h) % C.length];
}
