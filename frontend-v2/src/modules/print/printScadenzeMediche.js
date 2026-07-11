import { apiFetch } from '../../services/api.js';

export default async function printScadenzeMediche() {
  const container = document.getElementById('pageContent');
  const teamId = window.YFM.squadraId;
  if (!teamId) { container.innerHTML = '<p>Squadra non selezionata</p>'; return; }

  container.innerHTML = '<div class="print-page"><div class="loading"><div class="spinner"></div>Caricamento...</div></div>';

  try {
    const rosa = await apiFetch('/squadre/' + teamId + '/calciatori').catch(() => []);
    const players = (rosa || []).filter(g => g.stato !== 'Svincolato').sort((a, b) => (a.cognome || '').localeCompare(b.cognome || ''));

    const wsName = window.YFM.getSocietaName();
    const wsLogo = window.YFM.getWorkspaceLogo();
    const squadra = window.YFM.getSquadra ? window.YFM.getSquadra() : {};
    const catNome = squadra.category?.nome || '';
    const oggi = new Date();

    const rows = players.map((p, i) => {
      const visita = p.data_visita_medica;
      let scadenza = '-';
      let giorniRim = '';
      let cls = '';
      if (visita) {
        const scadDate = new Date(visita);
        scadDate.setFullYear(scadDate.getFullYear() + 1);
        scadenza = scadDate.toLocaleDateString('it-IT');
        const diff = Math.ceil((scadDate - oggi) / (1000 * 60 * 60 * 24));
        if (diff < 0) { giorniRim = 'SCADUTA'; cls = 'ps-expired'; }
        else if (diff <= 30) { giorniRim = diff + 'gg'; cls = 'ps-warning'; }
        else { giorniRim = diff + 'gg'; cls = 'ps-ok'; }
      } else {
        cls = 'ps-missing';
        giorniRim = 'N/D';
      }
      return `<tr class="${cls}">
        <td>${i + 1}</td>
        <td class="ps-name">${(p.cognome || '').toUpperCase()} ${p.nome || ''}</td>
        <td>${visita ? new Date(visita).toLocaleDateString('it-IT') : '-'}</td>
        <td>${scadenza}</td>
        <td class="ps-days">${giorniRim}</td>
      </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="print-page">
        <div class="print-toolbar">
          <button id="printBackBtn" class="btn btn-secondary">← Torna</button>
          <button id="printShareBtn" class="btn btn-secondary">📤</button>
          <button id="printPrintBtn" class="btn btn-primary">🖨 Stampa</button>
        </div>
        <div class="print-doc">
          <div class="ps-header">
            ${wsLogo ? `<img src="${wsLogo}" alt="" class="ps-logo">` : ''}
            <div>
              <div class="ps-t1">SCADENZE VISITE MEDICHE</div>
              <div class="ps-t2">${wsName} — ${catNome}</div>
              <div class="ps-t3">Aggiornato al ${oggi.toLocaleDateString('it-IT')}</div>
            </div>
          </div>
          <table class="ps-table">
            <thead><tr><th>#</th><th>Cognome e Nome</th><th>Data Visita</th><th>Scadenza</th><th>Giorni</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="ps-legend">
            <span class="ps-leg-item ps-expired">■ Scaduta</span>
            <span class="ps-leg-item ps-warning">■ &lt;30 giorni</span>
            <span class="ps-leg-item ps-ok">■ In regola</span>
            <span class="ps-leg-item ps-missing">■ Non registrata</span>
          </div>
        </div>
      </div>
      <style>${getStyles()}</style>
    `;

    document.getElementById('printBackBtn').addEventListener('click', () => window.YFM.navigateTo('printCenter'));
    document.getElementById('printPrintBtn').addEventListener('click', () => window.print());
    document.getElementById('printShareBtn').addEventListener('click', () => { if (navigator.share) { navigator.share({ title: 'Documento', url: window.location.href }).catch(() => {}); } else { navigator.clipboard.writeText(window.location.href).then(() => { if (window.showToast) window.showToast('Link copiato!', 'success'); }).catch(() => {}); } });
  } catch (e) {
    container.innerHTML = `<div class="print-page"><div class="error-box">Errore: ${e.message}</div><button class="btn btn-secondary" onclick="history.back()">← Torna</button></div>`;
  }
}

function getStyles() {
  return `
.print-page { max-width: 210mm; margin: 0 auto; padding: 16px; }
.print-toolbar { display: flex; gap: 10px; margin-bottom: 16px; }
.print-doc { background: white; padding: 15mm; border: 1px solid #ddd; border-radius: 4px; }
.ps-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8mm; padding-bottom: 4mm; border-bottom: 2px solid #667eea; }
.ps-logo { height: 50px; object-fit: contain; }
.ps-t1 { font-size: 18px; font-weight: bold; color: #667eea; }
.ps-t2 { font-size: 13px; font-weight: 600; }
.ps-t3 { font-size: 11px; color: #666; }
.ps-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.ps-table th, .ps-table td { border: 1px solid #ddd; padding: 6px 10px; }
.ps-table th { background: #f8f9fa; font-size: 11px; text-align: left; }
.ps-name { font-weight: 600; }
.ps-days { font-weight: 700; text-align: center; }
tr.ps-expired td { background: #fee2e2; }
tr.ps-expired .ps-days { color: #dc2626; }
tr.ps-warning td { background: #fef3c7; }
tr.ps-warning .ps-days { color: #d97706; }
tr.ps-ok .ps-days { color: #16a34a; }
tr.ps-missing td { background: #f3f4f6; color: #888; }
.ps-legend { margin-top: 4mm; display: flex; gap: 16px; font-size: 10px; }
.ps-leg-item { display: flex; align-items: center; gap: 4px; }
.ps-leg-item.ps-expired { color: #dc2626; }
.ps-leg-item.ps-warning { color: #d97706; }
.ps-leg-item.ps-ok { color: #16a34a; }
.ps-leg-item.ps-missing { color: #888; }
@media print {
  .print-toolbar { display: none !important; }
  .sidebar, .header { display: none !important; }
  .main { margin: 0 !important; padding: 0 !important; }
  .content { padding: 0 !important; }
  .layout { display: block !important; }
  .print-page { padding: 0; max-width: none; }
  .print-doc { border: none; padding: 0; }
  @page { size: A4 portrait; margin: 15mm; }
  tr.ps-expired td, tr.ps-warning td { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}
@media (max-width: 500px) {
  .print-page { padding: 8px; max-width: 100%; }
  .print-doc { padding: 4mm; }
  .ps-header { gap: 8px; margin-bottom: 4mm; padding-bottom: 3mm; }
  .ps-logo { height: 36px; }
  .ps-t1 { font-size: 14px; }
  .ps-t2 { font-size: 11px; }
  .ps-t3 { font-size: 10px; }
  .ps-table { font-size: 10px; display: block; overflow-x: auto; }
  .ps-table th, .ps-table td { padding: 4px 6px; white-space: nowrap; }
  .ps-name { white-space: normal; }
  .ps-legend { flex-wrap: wrap; gap: 8px; }
}
`;
}
