import { apiFetch } from '../../services/api.js';

export default async function printRosa() {
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

    const rows = players.map((p, i) => {
      const dn = p.data_nascita ? new Date(p.data_nascita).toLocaleDateString('it-IT') : '-';
      return `<tr>
        <td>${i + 1}</td>
        <td>${p.numero_maglia || '-'}</td>
        <td class="pr-name">${(p.cognome || '').toUpperCase()} ${p.nome || ''}</td>
        <td>${dn}</td>
        <td>${p.ruolo || '-'}</td>
        <td>${p.matricola_figc || '-'}</td>
        <td>${p.stato || 'Attivo'}</td>
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
          <div class="pr-header">
            ${wsLogo ? `<img src="${wsLogo}" alt="" class="pr-logo">` : ''}
            <div>
              <div class="pr-t1">ELENCO TESSERATI</div>
              <div class="pr-t2">${wsName} — ${catNome}</div>
              <div class="pr-t3">${players.length} giocatori</div>
            </div>
          </div>
          <table class="pr-table">
            <thead><tr><th>#</th><th>N°</th><th>Cognome e Nome</th><th>Data Nascita</th><th>Ruolo</th><th>Matricola FIGC</th><th>Stato</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
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
.pr-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8mm; padding-bottom: 4mm; border-bottom: 2px solid #667eea; }
.pr-logo { height: 50px; object-fit: contain; }
.pr-t1 { font-size: 18px; font-weight: bold; color: #667eea; }
.pr-t2 { font-size: 13px; font-weight: 600; }
.pr-t3 { font-size: 11px; color: #666; }
.pr-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.pr-table th, .pr-table td { border: 1px solid #ddd; padding: 5px 8px; }
.pr-table th { background: #f8f9fa; font-size: 10px; text-align: left; }
.pr-name { font-weight: 600; }
@media print {
  .print-toolbar { display: none !important; }
  .sidebar, .header { display: none !important; }
  .main { margin: 0 !important; padding: 0 !important; }
  .content { padding: 0 !important; }
  .layout { display: block !important; }
  .print-page { padding: 0; max-width: none; }
  .print-doc { border: none; padding: 0; }
  @page { size: A4 portrait; margin: 15mm; }
}
`;
}
