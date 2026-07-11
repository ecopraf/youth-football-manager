import { apiFetch } from '../../services/api.js';

export default async function printPresenze() {
  const container = document.getElementById('pageContent');
  const teamId = window.YFM.squadraId;
  if (!teamId) { container.innerHTML = '<p>Squadra non selezionata</p>'; return; }

  container.innerHTML = '<div class="print-page"><div class="loading"><div class="spinner"></div>Caricamento...</div></div>';

  try {
    const [rosa, presenze] = await Promise.all([
      apiFetch('/squadre/' + teamId + '/calciatori').catch(() => []),
      apiFetch('/squadre/' + teamId + '/allenamenti/presenze').catch(() => [])
    ]);

    const players = (rosa || []).filter(g => g.stato !== 'Svincolato').sort((a, b) => (a.cognome || '').localeCompare(b.cognome || ''));
    const wsName = window.YFM.getSocietaName();
    const wsLogo = window.YFM.getWorkspaceLogo();
    const squadra = window.YFM.getSquadra ? window.YFM.getSquadra() : {};
    const catNome = squadra.category?.nome || '';

    renderPage(container, players, presenze, wsName, wsLogo, catNome, null, null, []);
  } catch (e) {
    container.innerHTML = `<div class="print-page"><div class="error-box">Errore: ${e.message}</div><button class="btn btn-secondary" onclick="window.YFM.navigateTo('printCenter')">← Torna</button></div>`;
  }
}

function getWeeks(allPresenzeDates) {
  if (!allPresenzeDates.length) return [];
  const first = allPresenzeDates[0];
  const last = allPresenzeDates[allPresenzeDates.length - 1];
  const dateSet = new Set(allPresenzeDates);
  // Start from Monday of first week
  const start = new Date(first);
  const dayOfWeek = start.getDay() || 7; // Mon=1..Sun=7
  start.setDate(start.getDate() - (dayOfWeek - 1));
  const end = new Date(last);
  const weeks = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const wStart = cursor.toISOString().slice(0, 10);
    const wEnd = new Date(cursor.getTime() + 6 * 86400000).toISOString().slice(0, 10);
    // Count sessions in this week
    let count = 0;
    for (let d = new Date(cursor); d <= new Date(cursor.getTime() + 6 * 86400000); d.setDate(d.getDate() + 1)) {
      if (dateSet.has(d.toISOString().slice(0, 10))) count++;
    }
    weeks.push({ start: wStart, end: wEnd, sessions: count });
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
}

function renderPage(container, players, presenze, wsName, wsLogo, catNome, dateFrom, dateTo, selectedWeeks) {
  // All dates with data (unfiltered)
  const allPresenzeDates = [...new Set((presenze || []).filter(p => p.data).map(p => p.data))].sort();
  const weeks = getWeeks(allPresenzeDates);

  let filtered = (presenze || []).filter(p => p.data);
  if (dateFrom) filtered = filtered.filter(p => p.data >= dateFrom);
  if (dateTo) filtered = filtered.filter(p => p.data <= dateTo);

  const dateSet = new Set();
  const playerStats = {};
  const attendanceMap = {};
  filtered.forEach(p => {
    dateSet.add(p.data);
    if (!playerStats[p.calciatore_id]) playerStats[p.calciatore_id] = { presenti: 0, assenti: 0 };
    if (p.presente === true) playerStats[p.calciatore_id].presenti++;
    else if (p.presente === false) playerStats[p.calciatore_id].assenti++;
    if (!attendanceMap[p.data]) attendanceMap[p.data] = {};
    attendanceMap[p.data][p.calciatore_id] = p.presente;
  });

  const allDates = [...dateSet].sort();
  const totalSessions = allDates.length;
  const today = new Date().toLocaleDateString('it-IT');
  const hasPeriod = dateFrom || dateTo;
  const maxGrid = window.innerWidth <= 500 ? 15 : 34;
  const showGrid = hasPeriod && allDates.length <= maxGrid && allDates.length > 0;

  const periodLabel = hasPeriod ? formatDate(dateFrom) + ' → ' + formatDate(dateTo) : '';

  let tableHtml;
  if (showGrid) {
    tableHtml = renderGrid(players, allDates, attendanceMap, totalSessions, playerStats);
  } else {
    tableHtml = renderSummary(players, totalSessions, playerStats);
  }

  // Week strip
  const weekStripHtml = renderWeekStrip(weeks, selectedWeeks || [], allPresenzeDates);

  container.innerHTML = `
    <div class="print-page ${showGrid ? 'print-page-landscape' : ''}">
      <div class="print-toolbar">
        <button id="printBackBtn" class="btn btn-secondary">← Torna</button>
        <button id="printShareBtn" class="btn btn-secondary">📤</button>
        <button id="printPrintBtn" class="btn btn-primary">🖨 Stampa</button>
      </div>
      <div class="pp-week-strip no-print">
        <div class="pp-ws-label">Seleziona settimana (max 2):</div>
        <div class="pp-ws-scroll" id="ppWeekScroll">${weekStripHtml}</div>
        ${(selectedWeeks || []).length > 0 ? '<button class="btn btn-secondary btn-sm" id="ppResetBtn">✕ Reset</button>' : ''}
      </div>
      ${hasPeriod && allDates.length > maxGrid ? '<div class="pp-hint no-print">⚠️ Troppe sedute. Riduci il periodo selezionato.</div>' : ''}
      <div class="print-doc">
        <div class="pp-header">
          ${wsLogo ? `<img src="${wsLogo}" alt="" class="pp-logo">` : ''}
          <div>
            <div class="pp-t1">REGISTRO PRESENZE ALLENAMENTI</div>
            <div class="pp-t2">${wsName} — ${catNome}</div>
            <div class="pp-t3">${totalSessions} sedute • ${players.length} giocatori${periodLabel ? ' • ' + periodLabel : ''} • Aggiornato al ${today}</div>
          </div>
        </div>
        ${tableHtml}
      </div>
    </div>
    <style>${getStyles()}</style>
  `;

  // Toolbar events
  document.getElementById('printBackBtn').addEventListener('click', () => window.YFM.navigateTo('printCenter'));
  document.getElementById('printPrintBtn').addEventListener('click', () => {
    // If grid mode, inject landscape @page rule before printing
    if (showGrid) {
      const s = document.createElement('style');
      s.id = 'pp-print-landscape';
      s.textContent = '@page { size: A4 landscape; margin: 6mm; } .pp-header { margin-bottom: 1mm; padding-bottom: 1mm; } .pp-t1 { font-size: 12px; } .pp-t2 { font-size: 9px; } .pp-t3 { font-size: 8px; }';
      document.head.appendChild(s);
      window.print();
      document.getElementById('pp-print-landscape')?.remove();
    } else {
      const s = document.createElement('style');
      s.id = 'pp-print-portrait';
      s.textContent = '@page { size: A4 portrait; margin: 6mm; } .pp-header { margin-bottom: 1mm; padding-bottom: 1mm; } .pp-t1 { font-size: 12px; } .pp-t2 { font-size: 9px; } .pp-t3 { font-size: 8px; } .pp-summary td, .pp-summary th { padding: 2px 5px; } .pp-name { font-size: 10px; } .pp-num { font-size: 10px; } .pp-idx { font-size: 9px; } .pp-pct-cell span { font-size: 10px; } .pp-bar { width: 30px; height: 6px; }';
      document.head.appendChild(s);
      window.print();
      document.getElementById('pp-print-portrait')?.remove();
    }
  });
  document.getElementById('printShareBtn').addEventListener('click', () => { if (navigator.share) { navigator.share({ title: 'Documento', url: window.location.href }).catch(() => {}); } else { navigator.clipboard.writeText(window.location.href).then(() => { if (window.showToast) window.showToast('Link copiato!', 'success'); }).catch(() => {}); } });
  document.getElementById('ppResetBtn')?.addEventListener('click', () => {
    renderPage(container, players, presenze, wsName, wsLogo, catNome, null, null, []);
  });

  // Week chip click — desktop: free pick max 2 with range limit; mobile: contiguous only
  const isMobile = window.innerWidth <= 500;
  const allPresenzeDateSet = new Set(allPresenzeDates);

  // Calculate how many sessions exist between two week indices (inclusive)
  function countSessionsInRange(idxA, idxB) {
    const from = weeks[Math.min(idxA, idxB)].start;
    const to = weeks[Math.max(idxA, idxB)].end;
    let count = 0;
    for (const d of allPresenzeDates) {
      if (d >= from && d <= to) count++;
    }
    return count;
  }

  document.querySelectorAll('.pp-wc').forEach(chip => {
    chip.addEventListener('click', () => {
      const idx = parseInt(chip.dataset.idx);
      const week = weeks[idx];
      if (!week || week.sessions === 0) return;
      if (chip.classList.contains('pp-wc-disabled')) return;

      let sel = [...(selectedWeeks || [])];
      const existing = sel.indexOf(idx);

      if (existing >= 0) {
        // Deselect
        sel.splice(existing, 1);
      } else if (isMobile) {
        // Mobile: only contiguous
        if (sel.length === 0) {
          sel.push(idx);
        } else if (sel.length === 1 && Math.abs(idx - sel[0]) === 1) {
          sel.push(idx);
        } else {
          sel = [idx];
        }
      } else {
        // Desktop: free pick, max 2, but must stay ≤34 sessions
        if (sel.length === 0) {
          sel.push(idx);
        } else if (sel.length === 1) {
          if (countSessionsInRange(sel[0], idx) <= 34) {
            sel.push(idx);
          } else {
            sel = [idx];
          }
        } else {
          sel = [idx];
        }
      }

      sel.sort((a, b) => a - b);
      let from = null, to = null;
      if (sel.length > 0) {
        from = weeks[sel[0]].start;
        to = weeks[sel[sel.length - 1]].end;
      }
      renderPage(container, players, presenze, wsName, wsLogo, catNome, from, to, sel);
    });
  });

  // Auto-scroll to first selected or last week with data
  const scroll = document.getElementById('ppWeekScroll');
  if (scroll) {
    const target = scroll.querySelector('.pp-wc-sel') || scroll.querySelector('.pp-wc-has:last-of-type');
    if (target) target.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
}

function formatDate(d) {
  if (!d) return '...';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}`;
}

function renderWeekStrip(weeks, selectedWeeks, allPresenzeDates) {
  const months = {};
  weeks.forEach((w, i) => {
    const m = w.start.slice(0, 7);
    if (!months[m]) months[m] = [];
    months[m].push(i);
  });

  // Calculate reachable weeks when 1 is selected
  const reachableSet = new Set();
  if (selectedWeeks.length === 1) {
    const selIdx = selectedWeeks[0];
    const isMobile = window.innerWidth <= 500;
    if (isMobile) {
      // Mobile: only adjacent
      [selIdx - 1, selIdx + 1].forEach(adj => {
        if (adj >= 0 && adj < weeks.length && weeks[adj].sessions > 0) reachableSet.add(adj);
      });
    } else {
      // Desktop: any week where combined sessions ≤ 25
      for (let i = 0; i < weeks.length; i++) {
        if (i === selIdx) continue;
        if (weeks[i].sessions === 0) continue;
        const from = weeks[Math.min(selIdx, i)].start;
        const to = weeks[Math.max(selIdx, i)].end;
        let count = 0;
        for (const d of allPresenzeDates) {
          if (d >= from && d <= to) count++;
        }
        if (count <= 34) reachableSet.add(i);
      }
    }
  }

  const monthNames = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  let html = '';
  for (const [ym, idxs] of Object.entries(months)) {
    const mIdx = parseInt(ym.split('-')[1]) - 1;
    html += `<div class="pp-ws-month"><div class="pp-ws-mname">${monthNames[mIdx]}</div><div class="pp-ws-chips">`;
    for (const i of idxs) {
      const w = weeks[i];
      const isSel = selectedWeeks.includes(i);
      const hasData = w.sessions > 0;
      const isDisabled = selectedWeeks.length === 1 && !isSel && hasData && !reachableSet.has(i);
      let cls = 'pp-wc';
      if (!hasData) cls += ' pp-wc-empty';
      else if (isDisabled) cls += ' pp-wc-disabled';
      else cls += ' pp-wc-has';
      if (isSel) cls += ' pp-wc-sel';
      if (reachableSet.has(i)) cls += ' pp-wc-reach';
      const dayStart = w.start.slice(8, 10);
      const dayEnd = w.end.slice(8, 10);
      html += `<div class="${cls}" data-idx="${i}" title="${dayStart}-${dayEnd}: ${w.sessions} sedute"><span class="pp-wc-days">${dayStart}-${dayEnd}</span>${hasData ? `<span class="pp-wc-dot" style="background:${w.sessions >= 3 ? '#27AE60' : '#F39C12'}"></span>` : ''}</div>`;
    }
    html += '</div></div>';
  }
  return html;
}

function renderSummary(players, totalSessions, playerStats) {
  const rows = players.map((p, i) => {
    const stats = playerStats[p.id] || { presenti: 0, assenti: 0 };
    const pct = totalSessions > 0 ? Math.round(stats.presenti / totalSessions * 100) : 0;
    const barColor = pct >= 80 ? '#27AE60' : pct >= 50 ? '#F39C12' : '#E74C3C';
    return `<tr>
      <td class="pp-idx">${i + 1}</td>
      <td class="pp-name">${(p.cognome || '').toUpperCase()} ${p.nome || ''}</td>
      <td class="pp-num">${stats.presenti}</td>
      <td class="pp-num">${stats.assenti}</td>
      <td class="pp-pct-cell"><div class="pp-bar"><div class="pp-bar-fill" style="width:${pct}%;background:${barColor}"></div></div><span>${pct}%</span></td>
    </tr>`;
  }).join('');

  return `<table class="pp-table pp-summary">
    <thead><tr><th>#</th><th class="pp-name-h">Giocatore</th><th>✓</th><th>✗</th><th class="pp-pct-h">%</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderGrid(players, dates, attendanceMap, totalSessions, playerStats) {
  const headerCells = dates.map(d => {
    const parts = d.split('-');
    return `<th class="pp-date-cell">${parts[2]}/${parts[1]}</th>`;
  }).join('');

  const rows = players.map(p => {
    const cells = dates.map(d => {
      const val = attendanceMap[d]?.[p.id];
      if (val === true) return '<td class="pp-cell pp-yes">✓</td>';
      if (val === false) return '<td class="pp-cell pp-no">✗</td>';
      return '<td class="pp-cell">-</td>';
    }).join('');
    const stats = playerStats[p.id] || { presenti: 0 };
    const pct = totalSessions > 0 ? Math.round(stats.presenti / totalSessions * 100) : 0;
    return `<tr><td class="pp-name">${(p.cognome || '').toUpperCase()}</td>${cells}<td class="pp-num">${stats.presenti}/${totalSessions}</td><td class="pp-num">${pct}%</td></tr>`;
  }).join('');

  return `<div class="pp-table-wrap"><table class="pp-table pp-grid">
    <thead><tr><th class="pp-name-h">Giocatore</th>${headerCells}<th>Tot</th><th>%</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function getStyles() {
  return `
.print-page { max-width: 210mm; margin: 0 auto; padding: 16px; }
.print-page-landscape { max-width: 297mm; }
.print-toolbar { display: flex; gap: 10px; margin-bottom: 12px; }
.pp-week-strip { margin-bottom: 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pp-ws-label { font-size: 12px; font-weight: 600; color: #555; white-space: nowrap; }
.pp-ws-scroll { display: flex; gap: 12px; overflow-x: auto; padding: 6px 0; flex: 1; scroll-behavior: smooth; }
.pp-ws-month { display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }
.pp-ws-mname { font-size: 9px; font-weight: 700; color: #667eea; text-transform: uppercase; text-align: center; }
.pp-ws-chips { display: flex; gap: 3px; }
.pp-wc { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px 6px; border-radius: 6px; border: 1px solid #e0e0e0; cursor: pointer; min-width: 36px; transition: all 0.15s; }
.pp-wc-days { font-size: 9px; font-weight: 600; color: #333; }
.pp-wc-dot { width: 6px; height: 6px; border-radius: 50%; }
.pp-wc-empty { opacity: 0.35; cursor: default; }
.pp-wc-disabled { opacity: 0.3; cursor: not-allowed; border-style: dashed; }
.pp-wc-reach { border-color: #667eea; background: #f0f4ff; }
.pp-wc-has:hover { border-color: #667eea; background: #f0f4ff; }
.pp-wc-sel { background: #667eea !important; border-color: #667eea !important; }
.pp-wc-sel .pp-wc-days { color: white; }
.pp-wc-sel .pp-wc-dot { background: white !important; }
.btn-sm { padding: 6px 12px; font-size: 12px; }
.pp-hint { font-size: 12px; color: #F39C12; margin-bottom: 8px; }
.print-doc { background: white; padding: 15mm; border: 1px solid #ddd; border-radius: 4px; }
.pp-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8mm; padding-bottom: 4mm; border-bottom: 2px solid #667eea; }
.pp-logo { height: 40px; object-fit: contain; }
.pp-t1 { font-size: 16px; font-weight: bold; color: #667eea; }
.pp-t2 { font-size: 13px; font-weight: 600; }
.pp-t3 { font-size: 11px; color: #666; }
.pp-table { width: 100%; border-collapse: collapse; }
.pp-table th, .pp-table td { border: 1px solid #ddd; padding: 6px 8px; }
.pp-table th { background: #f8f9fa; font-size: 11px; text-align: center; }
.pp-name-h { text-align: left !important; }
.pp-pct-h { text-align: left !important; }
.pp-idx { text-align: center; width: 30px; color: #888; font-size: 11px; }
.pp-name { text-align: left; font-weight: 600; white-space: nowrap; font-size: 13px; }
.pp-num { text-align: center; font-weight: 600; font-size: 13px; width: 40px; }
.pp-summary .pp-table { font-size: 13px; }
.pp-pct-cell { text-align: left; white-space: nowrap; width: 90px; }
.pp-pct-cell span { font-weight: 700; font-size: 12px; margin-left: 4px; }
.pp-bar { display: inline-block; width: 36px; height: 8px; background: #eee; border-radius: 4px; vertical-align: middle; }
.pp-bar-fill { height: 100%; border-radius: 4px; }
.pp-table-wrap { overflow-x: auto; }
.pp-grid { font-size: 8px; }
.pp-grid th, .pp-grid td { padding: 2px 3px; }
.pp-grid .pp-name { font-size: 9px; min-width: 80px; }
.pp-date-cell { font-size: 7px; writing-mode: vertical-rl; text-orientation: mixed; padding: 3px 1px !important; }
.pp-cell { width: 18px; min-width: 18px; text-align: center; }
.pp-yes { color: #27AE60; font-weight: bold; }
.pp-no { color: #E74C3C; }
.no-print { }
@media print {
  .print-toolbar, .no-print { display: none !important; }
  .sidebar, .header { display: none !important; }
  .main { margin: 0 !important; padding: 0 !important; }
  .content { padding: 0 !important; }
  .layout { display: block !important; }
  .print-page { padding: 0; max-width: none; }
  .print-doc { border: none; padding: 0; }
  .pp-header { margin-bottom: 1mm !important; padding-bottom: 1mm !important; gap: 8px; }
  .pp-logo { height: 28px; }
  .pp-t1 { font-size: 13px !important; }
  .pp-t2 { font-size: 10px !important; }
  .pp-t3 { font-size: 9px !important; }
  .pp-bar-fill { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .pp-yes, .pp-no { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  @page { margin: 10mm; }
}
@media (max-width: 500px) {
  .print-doc { padding: 4mm; }
  .pp-header { gap: 8px; margin-bottom: 4mm; padding-bottom: 3mm; }
  .pp-t1 { font-size: 13px; }
  .pp-t2 { font-size: 11px; }
  .pp-t3 { font-size: 10px; }
  .pp-table td, .pp-table th { padding: 4px 4px; }
  .pp-idx { width: 22px; font-size: 10px; }
  .pp-name { font-size: 11px; white-space: normal; }
  .pp-num { font-size: 11px; width: 30px; }
  .pp-pct-cell { width: 70px; }
  .pp-pct-cell span { font-size: 11px; margin-left: 3px; }
  .pp-bar { width: 28px; height: 6px; }
  .pp-week-strip { flex-direction: column; align-items: flex-start; gap: 6px; }
  .pp-ws-scroll { max-width: 100%; -webkit-overflow-scrolling: touch; }
  .pp-wc { min-width: 32px; padding: 3px 4px; }
  .pp-wc-days { font-size: 8px; }
}
`;
}
