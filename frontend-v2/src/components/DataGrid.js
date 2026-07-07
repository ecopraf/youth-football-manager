/**
 * DataGrid — Componente tabella riutilizzabile responsive
 * 
 * Desktop (>500px): <table> con table-layout:fixed e colonne proporzionali
 * Mobile (≤500px): card stile SofaScore
 * 
 * columns: [{ key, label, labelShort?, width?, align?, color?, bold?, render?,
 *             primary?, secondary?, meta?, mobileIcon?, mobilePrefix? }]
 *   - primary: titolo card (es. avversario)
 *   - secondary: riga meta sinistra con icona 📅 (es. data)
 *   - meta: riga meta destra (es. minuti)
 *   - mobileIcon: icona custom per la stat su mobile (es. '⚽')
 *   - mobilePrefix: icona/testo prima del valore nella meta row (es. '🏟️')
 * 
 * options.mobileLayout: 'inline' → no titolo, tutto su una riga meta
 */

let cssInjected = false;
function injectCSS() {
  if (cssInjected) return;
  cssInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .dg-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
    .dg-table { width:100%; border-collapse:collapse; font-size:13px; table-layout:fixed; }
    .dg-table th { padding:8px 6px; background:#F8F9FA; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .dg-table td { padding:8px 6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-variant-numeric:tabular-nums; }
    .dg-table tfoot td { padding:8px 6px; background:#f0f4ff; font-weight:700; border-top:2px solid #667eea; font-variant-numeric:tabular-nums; }
    .dg-cards { display:none; }
    @media (max-width:500px) {
      .dg-wrap .dg-table { display:none; }
      .dg-cards { display:flex; flex-direction:column; }
      .dg-card { padding:10px 14px; border-bottom:1px solid #f0f0f0; }
      .dg-card:last-child { border-bottom:none; }
      .dg-card-title { font-weight:700; font-size:13px; margin-bottom:2px; }
      .dg-card-meta { display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#666; margin-bottom:4px; }
      .dg-card-stats { display:flex; gap:14px; font-size:12px; font-variant-numeric:tabular-nums; }
      .dg-card-stat { display:inline-flex; align-items:center; gap:2px; }
      .dg-card-footer { padding:10px 14px; background:#f0f4ff; border-top:2px solid #667eea; border-radius:0 0 8px 8px; }
      .dg-card-footer .dg-card-title { font-size:12px; color:#667eea; margin-bottom:4px; }
      .dg-card-footer .dg-card-stats { font-weight:700; }
    }
  `;
  document.head.appendChild(style);
}

export function DataGrid({ columns, rows, footer, container, className, mobileLayout }) {
  injectCSS();

  const primaryCol = columns.find(c => c.primary) || columns[0];
  const secondaryCol = columns.find(c => c.secondary) || columns[1];
  const metaCol = columns.find(c => c.meta);
  const statCols = columns.filter(c => c !== primaryCol && c !== secondaryCol && c !== metaCol);

  // --- TABLE (desktop) ---
  const totalFr = columns.reduce((sum, c) => sum + parseFr(c.width), 0);
  const colWidths = columns.map(c => ((parseFr(c.width) / totalFr) * 100).toFixed(1) + '%');
  const colgroup = '<colgroup>' + colWidths.map(w => `<col style="width:${w}">`).join('') + '</colgroup>';

  const thead = '<thead><tr>' + columns.map(c => {
    const align = c.align || 'center';
    const label = c.label || c.key;
    return `<th style="text-align:${align};">${label}</th>`;
  }).join('') + '</tr></thead>';

  const tbody = '<tbody>' + rows.map(row => {
    return '<tr>' + columns.map(c => {
      const val = row[c.key] ?? '';
      const align = c.align || 'center';
      const color = c.color ? `color:${c.color};` : '';
      const bold = c.bold ? 'font-weight:600;' : '';
      const content = c.render ? c.render(val, row) : val;
      return `<td style="text-align:${align};${color}${bold}">${content}</td>`;
    }).join('') + '</tr>';
  }).join('') + '</tbody>';

  let tfoot = '';
  if (footer) {
    tfoot = '<tfoot><tr>' + columns.map(c => {
      const val = footer[c.key] ?? '';
      const align = c.align || 'center';
      const color = c.color ? `color:${c.color};` : '';
      return `<td style="text-align:${align};${color}">${val}</td>`;
    }).join('') + '</tr></tfoot>';
  }

  const tableHtml = `<table class="dg-table ${className || ''}">${colgroup}${thead}${tbody}${tfoot}</table>`;

  // --- CARDS (mobile, layout SofaScore) ---
  const metaSuffix = (col) => col.metaSuffix !== undefined ? col.metaSuffix : "'";
  const metaPrefix = (col) => col.metaPrefix || col.mobilePrefix || '🕐';

  const cardsHtml = rows.map(row => {
    const title = row[primaryCol.key] ?? '';
    const sub = row[secondaryCol.key] ?? '';
    const metaVal = metaCol ? (row[metaCol.key] ?? '') : '';
    const stats = statCols.map(c => {
      const val = row[c.key] ?? '';
      const color = c.color ? `color:${c.color};` : '';
      const icon = c.mobileIcon || c.labelShort || c.label;
      return `<span class="dg-card-stat" style="${color}">${icon} <strong>${val}</strong></span>`;
    }).join('');
    const metaHtml = metaCol ? `<span>${metaPrefix(metaCol)} ${metaVal}${metaSuffix(metaCol)}</span>` : '';

    if (mobileLayout === 'inline') {
      // Tutto su una riga meta + stats sotto
      const secPrefix = secondaryCol.mobilePrefix || '📅';
      const priPrefix = primaryCol.mobilePrefix || '🏟️';
      return `<div class="dg-card"><div class="dg-card-meta"><span>${secPrefix} ${sub}  ${priPrefix} ${title}</span>${metaHtml}</div><div class="dg-card-stats">${stats}</div></div>`;
    }
    return `<div class="dg-card"><div class="dg-card-title">${title}</div><div class="dg-card-meta"><span>📅 ${sub}</span>${metaHtml}</div><div class="dg-card-stats">${stats}</div></div>`;
  }).join('');

  let footerCardHtml = '';
  if (footer) {
    const stats = statCols.map(c => {
      const val = footer[c.key] ?? '';
      const color = c.color ? `color:${c.color};` : '';
      const icon = c.mobileIcon || c.labelShort || c.label;
      return `<span class="dg-card-stat" style="${color}">${icon} <strong>${val}</strong></span>`;
    }).join('');
    const metaVal = metaCol ? (footer[metaCol.key] ?? '') : '';
    const metaHtml = metaCol && metaVal ? `<span>${metaPrefix(metaCol)} ${metaVal}${metaSuffix(metaCol)}</span>` : '';
    if (mobileLayout === 'inline') {
      footerCardHtml = `<div class="dg-card dg-card-footer"><div class="dg-card-meta"><span style="font-weight:700;color:#667eea;">TOTALE</span>${metaHtml}</div><div class="dg-card-stats">${stats}</div></div>`;
    } else {
      footerCardHtml = `<div class="dg-card dg-card-footer"><div class="dg-card-title">${footer[primaryCol.key] || 'TOTALE'}</div>${metaHtml ? `<div class="dg-card-meta">${metaHtml}</div>` : ''}<div class="dg-card-stats">${stats}</div></div>`;
    }
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'dg-wrap';
  wrapper.innerHTML = tableHtml + `<div class="dg-cards">${cardsHtml}${footerCardHtml}</div>`;

  if (container) container.appendChild(wrapper);
  return wrapper;
}

function parseFr(w) {
  if (!w) return 1;
  const n = parseFloat(w);
  return isNaN(n) ? 1 : n;
}
