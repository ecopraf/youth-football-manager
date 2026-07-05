/**
 * Chart helpers — Canvas-based charts (zero dependencies)
 */

const RUOLO_COLORS = {
  portiere: '#d97706',
  difensore: '#2563eb',
  centrocampista: '#16a34a',
  attaccante: '#dc2626'
};

function getRuoloColor(ruolo) {
  const r = (ruolo || '').toLowerCase();
  return RUOLO_COLORS[r] || '#667eea';
}

/**
 * Bar chart verticale
 * @param {HTMLCanvasElement} canvas
 * @param {Array} data - [{label, value, color?}]
 * @param {Object} opts - {title, colorByRuolo?, ruoli?, maxBarWidth?}
 */
export function drawBarChart(canvas, data, opts = {}) {
  if (!canvas || !data.length) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const padding = { top: 30, bottom: 60, left: 40, right: 10 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW = Math.min(opts.maxBarWidth || 30, (chartW / data.length) * 0.7);
  const gap = (chartW - barW * data.length) / (data.length + 1);

  // Background
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (chartH / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();
    // Y-axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    const val = Math.round(maxVal - (maxVal / gridLines) * i);
    ctx.fillText(val, padding.left - 5, y + 3);
  }

  // Bars
  data.forEach((d, i) => {
    const x = padding.left + gap + i * (barW + gap);
    const barH = (d.value / maxVal) * chartH;
    const y = padding.top + chartH - barH;

    const color = d.color || (opts.colorByRuolo && opts.ruoli ? getRuoloColor(opts.ruoli[i]) : '#667eea');
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
    ctx.fill();

    // Value on top
    if (d.value > 0) {
      ctx.fillStyle = color;
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(d.value, x + barW / 2, y - 4);
    }

    // Label
    ctx.save();
    ctx.translate(x + barW / 2, padding.top + chartH + 8);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    const label = d.label.length > 10 ? d.label.slice(0, 10) : d.label;
    ctx.fillText(label, 0, 0);
    ctx.restore();
  });

  // Title
  if (opts.title) {
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(opts.title, w / 2, 16);
  }
}

/**
 * Donut chart
 * @param {HTMLCanvasElement} canvas
 * @param {Array} data - [{label, value, color}]
 * @param {Object} opts - {title?}
 */
export function drawDonutChart(canvas, data, opts = {}) {
  if (!canvas || !data.length) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return;

  const cx = w / 2;
  const cy = h / 2 + 10;
  const radius = Math.min(w, h) / 2 - 30;
  const innerRadius = radius * 0.55;

  let startAngle = -Math.PI / 2;
  data.forEach(d => {
    const sliceAngle = (d.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.arc(cx, cy, innerRadius, startAngle + sliceAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = d.color;
    ctx.fill();
    startAngle += sliceAngle;
  });

  // Center text
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 20px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(total, cx, cy + 6);
  ctx.font = '11px system-ui';
  ctx.fillStyle = '#64748b';
  ctx.fillText('partite', cx, cy + 22);

  // Legend
  const legendY = h - 18;
  let legendX = cx - (data.length * 60) / 2;
  data.forEach(d => {
    ctx.fillStyle = d.color;
    ctx.fillRect(legendX, legendY - 8, 10, 10);
    ctx.fillStyle = '#334155';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`${d.label} ${d.value}`, legendX + 14, legendY);
    legendX += 70;
  });

  // Title
  if (opts.title) {
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(opts.title, w / 2, 16);
  }
}

/**
 * Line chart (dual lines)
 * @param {HTMLCanvasElement} canvas
 * @param {Array} data - [{label, value1, value2}]
 * @param {Object} opts - {title?, color1?, color2?, legend1?, legend2?}
 */
export function drawLineChart(canvas, data, opts = {}) {
  if (!canvas || !data.length) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);

  const padding = { top: 30, bottom: 40, left: 35, right: 10 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const maxVal = Math.max(...data.map(d => Math.max(d.value1 || 0, d.value2 || 0)), 1);
  const color1 = opts.color1 || '#27AE60';
  const color2 = opts.color2 || '#E74C3C';

  // Grid
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxVal - (maxVal / 4) * i), padding.left - 5, y + 3);
  }

  const stepX = chartW / Math.max(data.length - 1, 1);

  function drawLine(key, color) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    data.forEach((d, i) => {
      const x = padding.left + i * stepX;
      const y = padding.top + chartH - ((d[key] || 0) / maxVal) * chartH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    // Dots
    data.forEach((d, i) => {
      const x = padding.left + i * stepX;
      const y = padding.top + chartH - ((d[key] || 0) / maxVal) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }

  drawLine('value1', color1);
  drawLine('value2', color2);

  // X labels (every N)
  const labelEvery = Math.max(1, Math.floor(data.length / 10));
  ctx.fillStyle = '#64748b';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'center';
  data.forEach((d, i) => {
    if (i % labelEvery === 0) {
      const x = padding.left + i * stepX;
      ctx.fillText(d.label, x, padding.top + chartH + 16);
    }
  });

  // Legend
  const ly = h - 8;
  ctx.fillStyle = color1;
  ctx.fillRect(w / 2 - 80, ly - 8, 10, 10);
  ctx.fillStyle = '#334155';
  ctx.font = '11px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(opts.legend1 || 'Fatti', w / 2 - 66, ly);
  ctx.fillStyle = color2;
  ctx.fillRect(w / 2 + 10, ly - 8, 10, 10);
  ctx.fillStyle = '#334155';
  ctx.fillText(opts.legend2 || 'Subiti', w / 2 + 24, ly);

  // Title
  if (opts.title) {
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(opts.title, w / 2, 16);
  }
}
