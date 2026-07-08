import { apiFetch } from '../../services/api';
import { invalidateDashboardCache } from '../team/dashboard.js';
import { drawBarChart, drawDonutChart, drawLineChart } from '../../utils/charts.js';

const CACHE_TTL = 2 * 60 * 1000;
let statsCache = null;

export function invalidateStatsCache() { statsCache = null; }

export default async function loadStats(filterTipo) {
  const c = document.getElementById('pageContent');
  c.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';

  try {
    const squadraId = window.YFM.squadraId;
    const tipo = filterTipo || 'ufficiali';
    const cacheKey = squadraId + '_' + tipo;
    if (statsCache && statsCache.id === cacheKey && Date.now() - statsCache.ts < CACHE_TTL) {
      var { stats, partiteGiocate } = statsCache.data;
    } else {
      var { stats, partiteGiocate } = await apiFetch('/squadre/' + squadraId + '/stats-giocatori?tipo=' + tipo);
      statsCache = { id: cacheKey, data: { stats, partiteGiocate }, ts: Date.now() };
    }

    const statsArr = (stats || []).sort((a, b) => a.cognome.localeCompare(b.cognome));

    const totGol = statsArr.reduce((s, p) => s + (p.gol || 0), 0);
    const totAmm = statsArr.reduce((s, p) => s + (p.ammonizioni || 0), 0);
    const totEsp = statsArr.reduce((s, p) => s + (p.espulsioni || 0), 0);
    const diffidati = statsArr.filter(p => p.ammonizioni > 0 && p.ammonizioni % 5 === 4);

    let html = `<style>
      .stats-table { width:100%; border-collapse:collapse; font-size:13px; }
      .stats-table th { padding:8px 6px; text-align:center; background:#f8f9fa; font-size:11px; color:#64748b; font-weight:600; border-bottom:2px solid #e2e8f0; cursor:pointer; user-select:none; white-space:nowrap; }
      .stats-table th:first-child, .stats-table th:nth-child(2) { text-align:left; }
      .stats-table th:hover { background:#eef2ff; }
      .stats-table th.sorted-asc::after { content:' ▲'; font-size:9px; }
      .stats-table th.sorted-desc::after { content:' ▼'; font-size:9px; }
      .stats-table td { padding:7px 6px; text-align:center; border-bottom:1px solid #f1f5f9; }
      .stats-table td:first-child, .stats-table td:nth-child(2) { text-align:left; }
      .stats-table tr:hover { background:#f8faff; }
      .stats-ruolo { font-size:10px; padding:2px 6px; border-radius:8px; font-weight:500; }
      .stats-ruolo.portiere { background:#f59e0b20; color:#d97706; }
      .stats-ruolo.difensore { background:#3b82f620; color:#2563eb; }
      .stats-ruolo.centrocampista { background:#22c55e20; color:#16a34a; }
      .stats-ruolo.attaccante { background:#ef444420; color:#dc2626; }
    </style>
    <h1 class="page-title">Dati & Statistiche</h1>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
      <p class="page-subtitle" style="margin:0;">Riepilogo stagionale</p>
      <select id="statsFilterTipo" style="padding:6px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;background:white;">
        <option value="tutte">Tutte le partite</option>
        <option value="ufficiali" selected>Solo ufficiali</option>
        <option value="campionato">Campionato</option>
        <option value="coppa">Coppa</option>
        <option value="amichevoli">Amichevoli/Tornei</option>
      </select>
    </div>
    <div class="widgets" style="margin-bottom:20px;">
      <div class="card widget"><div class="widget-value" style="color:#667eea;">${partiteGiocate || 0}</div><div class="widget-label">Partite</div></div>
      <div class="card widget"><div class="widget-value" style="color:#27AE60;">${totGol}</div><div class="widget-label">⚽ Gol</div></div>
      <div class="card widget"><div class="widget-value" style="color:#F39C12;">${totAmm}</div><div class="widget-label">🟨 Amm.</div></div>
      <div class="card widget"><div class="widget-value" style="color:#E74C3C;">${totEsp}</div><div class="widget-label">🟥 Esp.</div></div>
    </div>
    ${diffidati.length > 0 ? `<div class="card" data-help="stats.diffidati" style="margin-bottom:16px;border-left:4px solid #F39C12;padding:14px 16px;">
      <h3 style="margin:0 0 8px 0;font-size:14px;color:#F39C12;">⚠️ Diffidati</h3>
      ${diffidati.map(p => `<div style="font-size:13px;margin-bottom:4px;">• <strong>${p.cognome} ${p.nome}</strong> — ${p.ammonizioni} 🟨 (prossimo giallo = squalifica)</div>`).join('')}
    </div>` : ''}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:20px;">
      <div class="card" style="padding:12px;"><canvas id="chartDonut" style="width:100%;height:200px;"></canvas></div>
      <div class="card" style="padding:12px;"><canvas id="chartLine" style="width:100%;height:200px;"></canvas></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:20px;">
      <div class="card" style="padding:12px;"><canvas id="chartTitolare" style="width:100%;height:220px;"></canvas></div>
      <div class="card" style="padding:12px;"><canvas id="chartMinuti" style="width:100%;height:220px;"></canvas></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:20px;">
      <div class="card" style="padding:12px;"><canvas id="chartGol" style="width:100%;height:220px;"></canvas></div>
      <div class="card" style="padding:12px;"><canvas id="chartAssist" style="width:100%;height:220px;"></canvas></div>
    </div>
    <div class="card">
      <h3 class="section-title">📊 Statistiche Giocatori</h3>
      <div style="overflow-x:auto;">
        <table class="stats-table" id="statsTable" data-help="stats.tabella">
          <thead><tr>
            <th data-col="cognome" class="sorted-asc">Giocatore</th>
            <th data-col="ruolo">Ruolo</th>
            <th data-col="presenze">Pres.</th>
            <th data-col="minuti">Min</th>
            <th data-col="gol">⚽</th>
            <th data-col="assist">🅰️</th>
            <th data-col="ammonizioni">🟨</th>
            <th data-col="espulsioni">🟥</th>
          </tr></thead>
          <tbody id="statsBody">${renderRows(statsArr)}</tbody>
        </table>
      </div>
    </div>`;

    c.innerHTML = html;

    // Sorting
    let sortCol = 'cognome';
    let sortDir = 'asc';
    document.querySelectorAll('#statsTable th[data-col]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else { sortCol = col; sortDir = col === 'cognome' || col === 'ruolo' ? 'asc' : 'desc'; }
        document.querySelectorAll('#statsTable th').forEach(h => h.classList.remove('sorted-asc', 'sorted-desc'));
        th.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
        const sorted = [...statsArr].sort((a, b) => {
          let va = a[col], vb = b[col];
          if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
          return sortDir === 'asc' ? va - vb : vb - va;
        });
        document.getElementById('statsBody').innerHTML = renderRows(sorted);
      });
    });

    // Filter dropdown
    document.getElementById('statsFilterTipo')?.addEventListener('change', (e) => {
      loadStats(e.target.value);
    });
    // Restore selected value
    const sel = document.getElementById('statsFilterTipo');
    if (sel) sel.value = tipo;

    // Draw charts
    renderCharts(statsArr, squadraId, tipo);
  } catch (err) {
    c.innerHTML = '<div class="error-box">Errore: ' + err.message + '</div>';
  }
}

function renderRows(arr) {
  return arr.map(p => {
    const ruoloClass = (p.ruolo || '').toLowerCase().replace(/\s/g, '');
    return `<tr>
      <td style="font-weight:500;">${p.cognome} ${p.nome}</td>
      <td><span class="stats-ruolo ${ruoloClass}">${p.ruolo || '-'}</span></td>
      <td>${p.presenze || '-'}</td>
      <td>${p.minuti || '-'}</td>
      <td style="font-weight:${p.gol ? '700' : '400'};color:${p.gol ? '#27AE60' : '#ccc'};">${p.gol || '-'}</td>
      <td style="font-weight:${p.assist ? '700' : '400'};color:${p.assist ? '#3498DB' : '#ccc'};">${p.assist || '-'}</td>
      <td style="color:${p.ammonizioni ? '#F39C12' : '#ccc'};">${p.ammonizioni || '-'}</td>
      <td style="color:${p.espulsioni ? '#E74C3C' : '#ccc'};">${p.espulsioni || '-'}</td>
    </tr>`;
  }).join('');
}

async function renderCharts(statsArr, squadraId, tipo) {
  // Bar charts from statsArr
  const sorted = [...statsArr].sort((a, b) => a.cognome.localeCompare(b.cognome));
  const labels = sorted.map(p => p.cognome);
  const ruoli = sorted.map(p => p.ruolo);

  drawBarChart(document.getElementById('chartTitolare'), sorted.map(p => ({ label: p.cognome, value: p.titolare || 0 })), { title: 'Presenze Titolare', colorByRuolo: true, ruoli });
  drawBarChart(document.getElementById('chartMinuti'), sorted.map(p => ({ label: p.cognome, value: p.minuti || 0 })), { title: 'Minuti Giocati', colorByRuolo: true, ruoli });
  drawBarChart(document.getElementById('chartGol'), sorted.map(p => ({ label: p.cognome, value: p.gol || 0, color: '#27AE60' })), { title: 'Goal Fatti' });
  drawBarChart(document.getElementById('chartAssist'), sorted.map(p => ({ label: p.cognome, value: p.assist || 0, color: '#3498DB' })), { title: 'Assist' });

  // Donut + Line from stats-charts endpoint
  try {
    const charts = await apiFetch('/squadre/' + squadraId + '/stats-charts?tipo=' + tipo);
    if (charts.risultati) {
      drawDonutChart(document.getElementById('chartDonut'), [
        { label: 'V', value: charts.risultati.vittorie, color: '#27AE60' },
        { label: 'P', value: charts.risultati.pareggi, color: '#F39C12' },
        { label: 'S', value: charts.risultati.sconfitte, color: '#E74C3C' }
      ], { title: 'Risultati' });
    }
    if (charts.perGiornata && charts.perGiornata.length) {
      drawLineChart(document.getElementById('chartLine'), charts.perGiornata.map(g => ({
        label: 'G' + g.giornata, value1: g.golFatti, value2: g.golSubiti
      })), { title: 'Gol per Giornata', legend1: 'Fatti', legend2: 'Subiti' });
    }
  } catch (e) { /* charts non bloccanti */ }
}
