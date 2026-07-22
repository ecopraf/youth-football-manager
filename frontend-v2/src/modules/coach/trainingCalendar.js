/**
 * trainingCalendar.js - Calendario mensile condiviso per sotto-pagine allenamenti
 */

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;
let onDateSelect = null;

// Italian holidays (fixed + Easter-based)
function getHolidays(year) {
  const fixed = [`${year}-01-01`,`${year}-01-06`,`${year}-04-25`,`${year}-05-01`,`${year}-06-02`,`${year}-08-15`,`${year}-11-01`,`${year}-12-08`,`${year}-12-25`,`${year}-12-26`];
  // Easter (anonymous Gregorian algorithm)
  const a=year%19, b=Math.floor(year/100), c=year%100, d=Math.floor(b/4), e=b%4, f=Math.floor((b+8)/25), g=Math.floor((b-f+1)/3), h=(19*a+b-d-g+15)%30, i=Math.floor(c/4), k=c%4, l=(32+2*e+2*i-h-k)%7, m=Math.floor((a+11*h+22*l)/451), month=Math.floor((h+l-7*m+114)/31), day=((h+l-7*m+114)%31)+1;
  const easter = new Date(year, month-1, day);
  const easterMon = new Date(easter); easterMon.setDate(easter.getDate()+1);
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return new Set([...fixed, fmt(easter), fmt(easterMon)]);
}

export function getSelectedDate() { return selectedDate; }
export function setOnDateSelect(callback) { onDateSelect = callback; }

export function selectTodayIfTraining(config, presenze) {
  const oggi = new Date();
  const oggiStr = oggi.getFullYear() + '-' + String(oggi.getMonth()+1).padStart(2,'0') + '-' + String(oggi.getDate()).padStart(2,'0');
  const giorniConfigurati = (config || []).map(c => c.giorno_settimana);
  if (giorniConfigurati.includes(oggi.getDay())) selectedDate = oggiStr;
  // If no presenze exist for current month, jump to last month with data
  const dates = (presenze || []).map(p => p.data).filter(Boolean).sort();
  const hasCurrentMonth = dates.some(d => d.startsWith(oggi.getFullYear() + '-' + String(oggi.getMonth()+1).padStart(2,'0')));
  if (!hasCurrentMonth && dates.length > 0) {
    const lastDate = dates[dates.length - 1];
    const [y, m] = lastDate.split('-');
    currentMonth = parseInt(m) - 1;
    currentYear = parseInt(y);
    selectedDate = null;
  } else {
    currentMonth = oggi.getMonth();
    currentYear = oggi.getFullYear();
  }
  return selectedDate;
}

export function renderCalendar(config, presenze, matches, annullati, futuri) {
  const giorniConfigurati = (config || []).map(c => c.giorno_settimana);
  const oggi = new Date();
  const oggiStr = oggi.getFullYear() + '-' + String(oggi.getMonth()+1).padStart(2,'0') + '-' + String(oggi.getDate()).padStart(2,'0');

  const cancelledDates = new Set(annullati || []);

  // Date con sessioni reali (da allenamenti-futuri, non virtuali)
  const realSessionDates = new Set((futuri || []).filter(f => !f.virtuale).map(f => f.data_ora?.substring(0, 10)).filter(Boolean));

  const dateConPresenze = new Set();
  (presenze || []).forEach(p => { if (p.data) dateConPresenze.add(p.data); });

  const datePartite = {};
  (matches || []).forEach(m => { if (m.data_ora) datePartite[m.data_ora.split('T')[0]] = m; });

  const primoGiorno = new Date(currentYear, currentMonth, 1);
  const giorniMese = new Date(currentYear, currentMonth + 1, 0).getDate();
  let startDay = primoGiorno.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const mesi = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

  let html = `<style>
    .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
    .cal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
    .cal-header h3{margin:0;font-size:16px;font-weight:600;color:#1a1a2e}
    .cal-nav{background:none;border:1px solid #dee2e6;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:16px}
    .cal-nav:hover{background:#f0f4ff;border-color:#667eea}
    .cal-day-label{text-align:center;font-size:11px;font-weight:600;color:#6c757d;padding:6px 0}
    .cal-day{text-align:center;padding:8px 4px;border-radius:8px;cursor:default;font-size:13px;font-weight:500;position:relative;min-height:38px;height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}
    .cal-day.has-training{cursor:pointer;background:#f0fdf4}
    .cal-day.has-training:hover{background:#dcfce7}
    .cal-day.has-presenze{cursor:pointer;background:#d1fae5}
    .cal-day.has-presenze:hover{background:#a7f3d0}
    .cal-day.has-match{background:#fff7ed;cursor:default;border:1px solid #fed7aa;padding:4px 3px}
    .cal-match-info{font-size:9px;color:#c2410c;line-height:1.2;margin-top:1px;max-width:100%;overflow:hidden;display:block;text-overflow:ellipsis;white-space:nowrap;width:100%}
    .cal-day.is-holiday{background:#f3f4f6;color:#9ca3af;cursor:default}
    .cal-day.is-holiday .cal-holiday-icon{font-size:9px;line-height:1;margin-top:1px}
    .cal-day.is-cancelled{background:#fee2e2;color:#991b1b;cursor:pointer}
    .cal-day.is-today{border:2px solid #667eea;font-weight:700;color:#667eea}
    .cal-day.is-selected{background:#667eea !important;color:white !important;border-radius:8px}
    .cal-day.is-selected .cal-dot{background:white !important}
    .cal-dot{width:6px;height:6px;border-radius:50%;margin-top:2px}
    .cal-dot.programmed{background:#86efac;border:1px solid #22c55e}
    .cal-dot.registered{background:#22c55e}
    @media(max-width:640px){.cal-day{padding:4px 2px;font-size:12px;height:52px}.cal-dot{width:5px;height:5px}}
  </style>`;

  html += `<div class="cal-header"><button class="cal-nav" id="calPrev">◀</button><h3>${mesi[currentMonth]} ${currentYear}</h3><button class="cal-nav" id="calNext">▶</button></div>`;

  const giorniLabel = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
  html += '<div class="cal-grid">';
  giorniLabel.forEach(g => { html += `<div class="cal-day-label">${g}</div>`; });
  for (let i = 0; i < startDay; i++) html += '<div class="cal-day empty"></div>';

  const holidays = getHolidays(currentYear);

  for (let day = 1; day <= giorniMese; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dateStr = currentYear + '-' + String(currentMonth+1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
    const dayOfWeek = date.getDay();
    const isToday = dateStr === oggiStr;
    const isSelected = dateStr === selectedDate;
    const isHoliday = holidays.has(dateStr);
    const isProgrammed = giorniConfigurati.includes(dayOfWeek) || realSessionDates.has(dateStr);
    const hasPresenze = dateConPresenze.has(dateStr);
    const hasMatch = !!datePartite[dateStr];
    const isCancelled = cancelledDates.has(dateStr);

    let classes = 'cal-day';
    if (isToday) classes += ' is-today';
    if (isSelected) classes += ' is-selected';
    if (isCancelled) classes += ' is-cancelled';
    else if (hasMatch) classes += ' has-match';
    else if (isHoliday && !hasPresenze) classes += ' is-holiday';
    else if (hasPresenze) classes += ' has-presenze';
    else if (isProgrammed) classes += ' has-training';

    let dotHtml = '';
    if (isCancelled) {
      dotHtml = '<span style="font-size:9px;color:#E74C3C;">\u274c</span>';
    } else if (hasMatch) {
      const m = datePartite[dateStr];
      const luogoIcon = m.luogo === 'Casa' ? '🏠' : '✈️';
      dotHtml = `<span class="cal-match-info">${luogoIcon} ${m.avversario || 'Partita'}</span>`;
    } else if (isHoliday && !hasPresenze) {
      dotHtml = '<span class="cal-holiday-icon">🚫</span>';
    } else if (hasPresenze) {
      const dayPres = (presenze || []).filter(p => p.data === dateStr);
      const pCount = dayPres.filter(p => p.presente).length;
      const aCount = dayPres.filter(p => !p.presente).length;
      dotHtml = `<span style="font-size:9px;line-height:1;margin-top:1px;"><span style="color:#22c55e;font-weight:700;">${pCount}</span><span style="color:#ccc;">/</span><span style="color:#ef4444;font-weight:600;">${aCount}</span></span>`;
    } else if (isProgrammed) {
      dotHtml = '<span class="cal-dot programmed"></span>';
    }

    const clickable = !hasMatch && !isHoliday && (isProgrammed || hasPresenze || isCancelled);
    const dataAttr = clickable ? `data-date="${dateStr}"` : '';
    html += `<div class="${classes}" ${dataAttr}>${day}${dotHtml}</div>`;
  }

  html += '</div>';
  html += `<div style="display:flex;gap:16px;margin-top:10px;font-size:11px;color:#6c757d;flex-wrap:wrap;">
    <span><span class="cal-dot registered" style="display:inline-block;vertical-align:middle;margin-right:4px;"></span> Registrate</span>
    <span><span class="cal-dot programmed" style="display:inline-block;vertical-align:middle;margin-right:4px;"></span> Programmate</span>
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
