/**
 * trainingCalendar.js - Calendario mensile visuale per allenamenti
 */

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;
let onDateSelect = null;

export function getSelectedDate() { return selectedDate; }
export function setOnDateSelect(callback) { onDateSelect = callback; }

export function renderCalendar(config, presenze) {
  const giorniConfigurati = (config || []).map(c => c.giorno_settimana);
  const oggi = new Date();
  const oggiStr = oggi.toISOString().split('T')[0];

  // Date con presenze registrate
  const dateConPresenze = new Set();
  (presenze || []).forEach(p => { if (p.data) dateConPresenze.add(p.data); });

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
    .cal-day.is-today { border:2px solid #667eea; font-weight:700; color:#667eea; }
    .cal-day.is-selected { background:#667eea !important; color:white !important; border-radius:8px; }
    .cal-day.is-selected .cal-dot { background:white !important; }
    .cal-dot { width:6px; height:6px; border-radius:50%; margin-top:2px; }
    .cal-dot.programmed { background:#86efac; border:1px solid #22c55e; }
    .cal-dot.registered { background:#22c55e; }
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
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const isToday = dateStr === oggiStr;
    const isSelected = dateStr === selectedDate;
    const isProgrammed = giorniConfigurati.includes(dayOfWeek);
    const hasPresenze = dateConPresenze.has(dateStr);

    let classes = 'cal-day';
    if (isToday) classes += ' is-today';
    if (isSelected) classes += ' is-selected';
    if (hasPresenze) classes += ' has-presenze';
    else if (isProgrammed) classes += ' has-training';

    let dotHtml = '';
    if (hasPresenze) dotHtml = '<span class="cal-dot registered"></span>';
    else if (isProgrammed) dotHtml = '<span class="cal-dot programmed"></span>';

    const clickable = isProgrammed || hasPresenze;
    const dataAttr = clickable ? `data-date="${dateStr}"` : '';

    html += `<div class="${classes}" ${dataAttr}>${day}${dotHtml}</div>`;
  }

  html += '</div>';
  html += `<div style="display:flex;gap:16px;margin-top:10px;font-size:11px;color:#6c757d;flex-wrap:wrap;">
    <span><span class="cal-dot registered" style="display:inline-block;vertical-align:middle;margin-right:4px;"></span> Presenze registrate</span>
    <span><span class="cal-dot programmed" style="display:inline-block;vertical-align:middle;margin-right:4px;"></span> Programmato</span>
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
  const oggiStr = oggi.toISOString().split('T')[0];
  const giorniConfigurati = (config || []).map(c => c.giorno_settimana);
  if (giorniConfigurati.includes(oggi.getDay())) selectedDate = oggiStr;
  return selectedDate;
}
