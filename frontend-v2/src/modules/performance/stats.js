import { apiFetch } from '../../services/api';

export default async function loadStats() {
  const c = document.getElementById('pageContent');
  c.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';

  try {
    const { stats, partiteGiocate } = await apiFetch('/squadre/' + window.YFM.squadraId + '/stats-giocatori');

    // Determina minutaggio per categoria
    const squadra = (window.YFM.allSquadre || []).find(s => s.id === window.YFM.squadraId);
    const categoria = (squadra?.category?.nome || squadra?.categoria || '').toLowerCase();
    let minPerMatch = 70;
    if (categoria.includes('17') || categoria.includes('18') || categoria.includes('19') || categoria.includes('20')) minPerMatch = 90;
    else if (categoria.includes('16')) minPerMatch = 80;

    const statsArr = (stats || []).sort((a, b) => a.cognome.localeCompare(b.cognome));

    const totGol = statsArr.reduce((s, p) => s + p.gol, 0);
    const totAmm = statsArr.reduce((s, p) => s + p.ammonizioni, 0);
    const totEsp = statsArr.reduce((s, p) => s + p.espulsioni, 0);
    const diffidati = statsArr.filter(p => p.ammonizioni >= 4);

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
    <p class="page-subtitle">Riepilogo stagionale • ${minPerMatch}' a partita</p>
    <div class="widgets" style="margin-bottom:20px;">
      <div class="card widget"><div class="widget-value" style="color:#667eea;">${partiteGiocate || 0}</div><div class="widget-label">Partite</div></div>
      <div class="card widget"><div class="widget-value" style="color:#27AE60;">${totGol}</div><div class="widget-label">⚽ Gol</div></div>
      <div class="card widget"><div class="widget-value" style="color:#F39C12;">${totAmm}</div><div class="widget-label">🟨 Amm.</div></div>
      <div class="card widget"><div class="widget-value" style="color:#E74C3C;">${totEsp}</div><div class="widget-label">🟥 Esp.</div></div>
    </div>
    ${diffidati.length > 0 ? `<div class="card" data-help="stats.diffidati" style="margin-bottom:16px;border-left:4px solid #F39C12;padding:14px 16px;">
      <h3 style="margin:0 0 8px 0;font-size:14px;color:#F39C12;">⚠️ Diffidati (4 ammonizioni)</h3>
      ${diffidati.map(p => `<div style="font-size:13px;margin-bottom:4px;">• <strong>${p.cognome} ${p.nome}</strong> — ${p.ammonizioni} 🟨 (prossimo giallo = squalifica)</div>`).join('')}
    </div>` : ''}
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
          <tbody id="statsBody">${renderRows(statsArr, minPerMatch)}</tbody>
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
          let va = col === 'minuti' ? a.presenze * minPerMatch : a[col];
          let vb = col === 'minuti' ? b.presenze * minPerMatch : b[col];
          if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
          return sortDir === 'asc' ? va - vb : vb - va;
        });
        document.getElementById('statsBody').innerHTML = renderRows(sorted, minPerMatch);
      });
    });
  } catch (err) {
    c.innerHTML = '<div class="error-box">Errore: ' + err.message + '</div>';
  }
}

function renderRows(arr, minPerMatch) {
  return arr.map(p => {
    const ruoloClass = (p.ruolo || '').toLowerCase().replace(/\s/g, '');
    const min = p.presenze * minPerMatch;
    return `<tr>
      <td style="font-weight:500;">${p.cognome} ${p.nome}</td>
      <td><span class="stats-ruolo ${ruoloClass}">${p.ruolo || '-'}</span></td>
      <td>${p.presenze || '-'}</td>
      <td>${min || '-'}</td>
      <td style="font-weight:${p.gol ? '700' : '400'};color:${p.gol ? '#27AE60' : '#ccc'};">${p.gol || '-'}</td>
      <td style="font-weight:${p.assist ? '700' : '400'};color:${p.assist ? '#3498DB' : '#ccc'};">${p.assist || '-'}</td>
      <td style="color:${p.ammonizioni ? '#F39C12' : '#ccc'};">${p.ammonizioni || '-'}</td>
      <td style="color:${p.espulsioni ? '#E74C3C' : '#ccc'};">${p.espulsioni || '-'}</td>
    </tr>`;
  }).join('');
}
