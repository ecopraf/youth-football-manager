import { apiFetch } from '../../services/api.js';

export default async function printConvocazione() {
  const container = document.getElementById('pageContent');
  const matchId = window.YFM.pageParams?.id;
  if (!matchId) { container.innerHTML = '<p>ID partita mancante</p>'; return; }

  container.innerHTML = '<div class="print-page"><div class="loading"><div class="spinner"></div>Caricamento...</div></div>';

  try {
    const squadraId = window.YFM.squadraId;
    const [convResp, rosa, match] = await Promise.all([
      apiFetch('/partite/' + matchId + '/convocazioni').catch(() => []),
      apiFetch('/squadre/' + squadraId + '/calciatori').catch(() => []),
      apiFetch('/partite/' + matchId).catch(() => null)
    ]);

    const convocati = (Array.isArray(convResp) ? convResp : (convResp?.convocazioni || []))
      .filter(c => c.presente === true);
    const rosaMap = {};
    (rosa || []).forEach(g => { rosaMap[g.id] = g; });
    const list = convocati.map(c => {
      const g = rosaMap[c.calciatoreId] || {};
      return { nome: g.nome || '', cognome: g.cognome || '', ruolo: g.ruolo || '' };
    }).sort((a, b) => a.cognome.localeCompare(b.cognome));

    const dt = match?.data_ora ? new Date(match.data_ora) : new Date();
    const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const ritrovo = new Date(dt.getTime() - 75 * 60000);
    const wsLogo = window.YFM.getWorkspaceLogo();
    const wsName = window.YFM.getSocietaName();
    const squadra = window.YFM.getSquadra ? window.YFM.getSquadra() : {};
    const catNome = squadra.category?.nome || '';
    const comp = match?.tipo_competizione || '';
    const girone = squadra.category?.girone || '';
    let titolo2 = catNome + (comp === 'Campionato' ? ' Campionato' : comp === 'Coppa' ? ' Coppa' : ' Amichevole');
    if (comp === 'Campionato' && girone) titolo2 += ' - Girone ' + girone;
    if (comp === 'Campionato' && match?.giornata) titolo2 += ' — Giornata ' + match.giornata;

    const fac = window.YFM.facility;
    const campoCasa = fac ? [fac.nome, fac.indirizzo, fac.citta].filter(Boolean).join(' - ') : '';
    const campoInfo = match?.luogo === 'Trasferta' ? (match.indirizzo_campo || 'Trasferta') : (campoCasa || 'Casa');

    let rows = '';
    const maxRows = Math.max(list.length, 20);
    for (let i = 0; i < maxRows; i++) {
      if (i < list.length) {
        const p = list[i];
        rows += `<tr><td>${i + 1}</td><td>${p.cognome.toUpperCase()}</td><td>${p.nome}</td><td>${p.ruolo === 'Portiere' ? 'P' : ''}</td></tr>`;
      } else {
        rows += `<tr><td>${i + 1}</td><td></td><td></td><td></td></tr>`;
      }
    }

    container.innerHTML = `
      <div class="print-page">
        <div class="print-toolbar">
          <button id="printBackBtn" class="btn btn-secondary">← Torna</button>
          <button id="printShareBtn" class="btn btn-secondary">📤</button>
          <button id="printPrintBtn" class="btn btn-primary">🖨 Stampa</button>
        </div>
        <div class="print-doc" id="printDoc">
          <div class="print-header">
            <div class="print-logo">${wsLogo ? `<img src="${wsLogo}" alt="">` : ''}</div>
            <div class="print-title">
              <div class="t1">CONVOCAZIONE</div>
              <div class="t2">${titolo2}</div>
            </div>
            <div class="print-logo"><img src="/img/logo-lnd.png" alt="" onerror="this.style.display='none'"></div>
          </div>
          <div class="print-info">
            Partita: <strong>${wsName.toUpperCase()} - ${(match?.avversario || 'TBD').toUpperCase()}</strong><br>
            Campo: <strong>${campoInfo}</strong><br>
            Alle ore: <strong>${dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</strong> del giorno: <strong>${giorni[dt.getDay()]} ${dt.toLocaleDateString('it-IT')}</strong><br>
            Ritrovo alle ore: <strong>${ritrovo.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</strong> al Campo di Giuoco
          </div>
          <table class="print-table">
            <thead><tr><th>N.</th><th>Cognome</th><th>Nome</th><th>P</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="print-note">Eventuali assenze vanno comunicate tempestivamente. Si raccomanda il rispetto dell'orario di convocazione.</div>
          <div class="print-firma">Il Mister</div>
        </div>
      </div>
      <style>${getPrintStyles()}</style>
    `;

    // PDF filename
    const dataStr = dt.toLocaleDateString('it-IT').replace(/\//g, '-');
    document.title = `Convocazione_${(match?.avversario || 'TBD').replace(/\s+/g, '_')}_${dataStr}`;

    document.getElementById('printBackBtn').addEventListener('click', () => window.YFM.navigateTo('printCenter'));
    document.getElementById('printPrintBtn').addEventListener('click', () => window.print());
    document.getElementById('printShareBtn').addEventListener('click', sharePage);
  } catch (e) {
    container.innerHTML = `<div class="print-page"><div class="error-box">Errore: ${e.message}</div></div>`;
  }
}

function sharePage() {
  const url = window.location.href;
  if (navigator.share) {
    navigator.share({ title: document.title || 'Documento', url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url).then(() => {
      if (window.showToast) window.showToast('Link copiato!', 'success');
    }).catch(() => {});
  }
}

function getPrintStyles() {
  return `
.print-page { max-width: 210mm; margin: 0 auto; padding: 16px; }
.print-toolbar { display: flex; gap: 10px; margin-bottom: 16px; }
.print-doc { background: white; padding: 20mm 15mm; border: 1px solid #ddd; border-radius: 4px; }
.print-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6mm; }
.print-logo img { height: 60px; object-fit: contain; }
.print-title { flex: 1; text-align: center; }
.print-title .t1 { font-size: 22px; font-weight: bold; margin-bottom: 2mm; }
.print-title .t2 { font-size: 14px; font-weight: bold; }
.print-info { font-size: 13px; line-height: 1.8; margin-bottom: 5mm; }
.print-table { width: 100%; border-collapse: collapse; margin-bottom: 4mm; }
.print-table th, .print-table td { border: 1px solid #000; padding: 4px 8px; font-size: 12px; }
.print-table th { background: #f0f0f0; font-size: 11px; }
.print-table td:first-child { text-align: center; width: 8%; }
.print-table td:last-child { text-align: center; width: 8%; }
.print-tel { font-size: 10px; color: #333; }
.print-staff { font-size: 11px; margin-top: 4mm; padding: 6px 10px; background: #f8f9fa; border-radius: 6px; line-height: 1.6; }
.print-note { font-weight: bold; font-style: italic; font-size: 11px; text-align: center; color: #E74C3C; margin-top: 3mm; }
.print-firma { margin-top: 8mm; text-align: right; font-size: 14px; font-weight: bold; }
@media print {
  .print-toolbar { display: none !important; }
  .sidebar, .header { display: none !important; }
  .main { margin: 0 !important; padding: 0 !important; }
  .content { padding: 0 !important; }
  .layout { display: block !important; }
  .print-page { padding: 0; max-width: none; }
  .print-doc { border: none; padding: 0; box-shadow: none; }
  @page { size: A4 portrait; margin: 15mm; }
}
@media (max-width: 500px) {
  .print-doc { padding: 10px; }
  .print-table td, .print-table th { padding: 3px 4px; font-size: 11px; }
}
`;
}
