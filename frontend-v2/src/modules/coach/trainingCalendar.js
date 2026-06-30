/**
 * trainingCalendar.js - Calendario mensile visuale per allenamenti
 */

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;
let onDateSelect = null;

export function getSelectedDate() { return selectedDate; }
export function setOnDateSelect(callback) { onDateSelect = callback; }

export function renderCalendar(config, presenze, matches) {
  const giorniConfigurati = (config || []).map(c => c.giorno_settimana);
  const oggi = new Date();
  // Data locale (non UTC)
  const oggiStr = oggi.getFullYear() + '-' + String(oggi.getMonth()+1).padStart(2,'0') + '-' + String(oggi.getDate()).padStart(2,'0');

  // Date con presenze registrate
  const dateConPresenze = new Set();
  (presenze || []).forEach(p => { if (p.data) dateConPresenze.add(p.data); });

  // Date con partite (usa split per evitare shift UTC)
  const datePartite = {};
  (matches || []).forEach(m => {
    if (m.data_ora) {
      const dateStr = m.data_ora.split('T')[0];
      datePartite[dateStr] = m;
    }
  });

  const primoGiorno = new Date(currentYear, currentMonth, 1);
  const ultimoGiorno = new Date(currentYear, currentMonth + 1, 0);
  const giorniMese = ultimoGiorno.getDate();
  let startDay = primoGiorno.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

  let html = `<style>
    .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; }
    .cal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
    .cal-header h3 { margin:0; font-size:16px; font-weight:600; color:#1a1a2e; }
    .cal-nav { background:none; border:1px solid #dee2e6; border-radius:8px; padding:6px 12px; cursor:pointer; font-size:16px; }
    .cal-nav:hover { background:#f0f4ff; border-color:#667eea; }
    .cal-day-label { text-align:center; font-size:11px; font-weight:600; color:#6c757d; padding:6px 0; }
    .cal-day { text-align:center; padding:8px 4px; border-radius:8px; cursor:default; font-size:13px; font-weight:500; position:relative; min-height:38px; display:flex; flex-direction:column; align-items:center; justify-content:center; }
    .cal-day.has-training { cursor:pointer; background:#f0fdf4; }
    .cal-day.has-training:hover { background:#dcfce7; }
    .cal-day.has-presenze { cursor:pointer; background:#d1fae5; }
    .cal-day.has-presenze:hover { background:#a7f3d0; }
    .cal-day.has-match { background:#fff7ed; cursor:default; border:1px solid #fed7aa; }
    .cal-match-info { font-size:8px; color:#c2410c; line-height:1.2; margin-top:2px; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:block; }
    .cal-day.is-today { border:2px solid #667eea; font-weight:700; color:#667eea; }
    .cal-day.is-selected { background:#667eea !important; color:white !important; border-radius:8px; }
    .cal-day.is-selected .cal-dot { background:white !important; }
    .cal-dot { width:6px; height:6px; border-radius:50%; margin-top:2px; }
    .cal-dot.programmed { background:#86efac; border:1px solid #22c55e; }
    .cal-dot.registered { background:#22c55e; }
    .cal-dot.match { background:#f97316; border:1px solid #ea580c; }
    @media (max-width:640px) { .cal-day { padding:6px 2px; font-size:12px; min-height:34px; } .cal-dot { width:5px; height:5px; } }
  </style>`;

  html += `<div class="cal-header">
    <button class="cal-nav" id="calPrev">◀</button>
    <h3>${mesi[currentMonth]} ${currentYear}</h3>
    <button class="cal-nav" id="calNext">▶</button>
  </div>`;

  const giorniLabel = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  html += '<div class="cal-grid">';
  giorniLabel.forEach(g => { html += `<div class="cal-day-label">${g}</div>`; });

  for (let i = 0; i < startDay; i++) html += '<div class="cal-day empty"></div>';

  for (let day = 1; day <= giorniMese; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dateStr = currentYear + '-' + String(currentMonth+1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
    const dayOfWeek = date.getDay();
    const isToday = dateStr === oggiStr;
    const isSelected = dateStr === selectedDate;
    const isProgrammed = giorniConfigurati.includes(dayOfWeek);
    const hasPresenze = dateConPresenze.has(dateStr);
    const hasMatch = !!datePartite[dateStr];

    let classes = 'cal-day';
    if (isToday) classes += ' is-today';
    if (isSelected) classes += ' is-selected';
    if (hasMatch) classes += ' has-match';
    else if (hasPresenze) classes += ' has-presenze';
    else if (isProgrammed) classes += ' has-training';

    let dotHtml = '';
    if (hasMatch) {
      const m = datePartite[dateStr];
      const luogoIcon = m.luogo === 'Casa' ? '🏠' : '✈️';
      const info = `${luogoIcon} ${m.avversario || 'Partita'}${m.giornata ? ' (G.' + m.giornata + ')' : ''}`;
      dotHtml = `<span class="cal-match-info">${info}</span>`;
    } else if (hasPresenze) {
      dotHtml = '<span class="cal-dot registered"></span>';
    } else if (isProgrammed) {
      dotHtml = '<span class="cal-dot programmed"></span>';
    }

    // Cliccabile se è un giorno programmato o ha presenze (NON nei giorni partita)
    const clickable = !hasMatch && (isProgrammed || hasPresenze);
    const dataAttr = clickable ? `data-date="${dateStr}"` : '';

    html += `<div class="${classes}" ${dataAttr}>${day}${dotHtml}</div>`;
  }

  html += '</div>';
  html += `<div style="display:flex;gap:16px;margin-top:10px;font-size:11px;color:#6c757d;flex-wrap:wrap;">
    <span><span class="cal-dot registered" style="display:inline-block;vertical-align:middle;margin-right:4px;"></span> Presenze registrate</span>
    <span><span class="cal-dot programmed" style="display:inline-block;vertical-align:middle;margin-right:4px;"></span> Programmato</span>
    <span><span style="display:inline-block;width:10px;height:10px;background:#fff7ed;border:1px solid #fed7aa;border-radius:3px;vertical-align:middle;margin-right:4px;"></span> Partita</span>
    <span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;border:2px solid #667eea;border-radius:4px;display:inline-block;"></span> Oggi</span>
  </div>`;

  return html;
}

export function attachCalendarListeners() {
  document.getElementById('calPrev')?.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    if (window._trainingRefreshCalendar) window._trainingRefreshCalendar();
  });
  document.getElementById('calNext')?.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    if (window._trainingRefreshCalendar) window._trainingRefreshCalendar();
  });
  document.querySelectorAll('.cal-day[data-date]').forEach(cell => {
    cell.addEventListener('click', () => {
      selectedDate = cell.dataset.date;
      document.querySelectorAll('.cal-day.is-selected').forEach(el => el.classList.remove('is-selected'));
      cell.classList.add('is-selected');
      if (onDateSelect) onDateSelect(selectedDate);
    });
  });
}

export function selectTodayIfTraining(config) {
  const oggi = new Date();
  const oggiStr = oggi.getFullYear() + '-' + String(oggi.getMonth()+1).padStart(2,'0') + '-' + String(oggi.getDate()).padStart(2,'0');
  const giorniConfigurati = (config || []).map(c => c.giorno_settimana);
  if (giorniConfigurati.includes(oggi.getDay())) {
    selectedDate = oggiStr;
  }
  currentMonth = oggi.getMonth();
  currentYear = oggi.getFullYear();
  return selectedDate;
}
