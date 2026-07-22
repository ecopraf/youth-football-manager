import { apiFetch } from '../../services/api.js';

export default async function printReport() {
  const container = document.getElementById('pageContent');
  const matchId = window.YFM.pageParams?.id;
  if (!matchId) { container.innerHTML = '<p>ID partita mancante</p>'; return; }

  container.innerHTML = '<div class="print-page"><div class="loading"><div class="spinner"></div>Caricamento...</div></div>';

  try {
    const report = await apiFetch('/partite/' + matchId + '/report');
    const wsLogo = window.YFM.getWorkspaceLogo();
    const dt = report.partita?.dataOra ? new Date(report.partita.dataOra) : new Date();
    const gc = report.score?.golCasa || 0;
    const go = report.score?.golOspiti || 0;
    const risultato = gc > go ? 'VITTORIA' : gc < go ? 'SCONFITTA' : 'PAREGGIO';
    const risColor = gc > go ? '#27AE60' : gc < go ? '#E74C3C' : '#F39C12';

    const eventiHtml = (() => {
      const evts = (report.eventi || []).filter(e => e.tipo !== 'ASSIST');
      if (!evts.length) return '<div class="pr-evento" style="color:#888;">Nessun evento registrato</div>';
      // Match assists to goals
      const assists = (report.eventi || []).filter(e => e.tipo === 'ASSIST');
      const goalMap = {};
      evts.filter(e => e.tipo === 'GOAL').forEach(g => { goalMap[g.minuto] = g; });
      assists.forEach(a => { if (goalMap[a.minuto]) goalMap[a.minuto].assist = a.principale; });

      const mid = Math.ceil(evts.length / 2);
      const col1 = evts.slice(0, mid);
      const col2 = evts.slice(mid);
      const renderEvt = e => {
        const cfg = { GOAL: '⚽ Gol', SUBITO: '🥅 Gol subito', YELLOW: '🟨 Ammonizione', RED: '🟥 Espulsione', SUB: '🔄 Sostituzione', AUTOGOL: '⚽🔴 Autogol', IN: '➡️ Entra', OUT: '⬅️ Esce' };
        const label = cfg[e.tipo] || e.tipo;
        const assistTxt = e.assist ? ` <span style="color:#666;font-size:10px;">(🅰️ ${e.assist})</span>` : '';
        return `<div class="pr-evento"><span class="pr-evt-min">${e.minuto || '-'}'</span> <span class="pr-evt-label">${label}</span> — ${e.principale}${assistTxt}</div>`;
      };
      return `<div class="pr-eventi-grid">${col1.map(renderEvt).join('')}</div><div class="pr-eventi-grid">${col2.map(renderEvt).join('')}</div>`;
    })();

    const titolari = (report.giocatori || []).filter(g => g.ruolo === 'T').sort((a, b) => (a.cognome || '').localeCompare(b.cognome || ''));
    const riserve = (report.giocatori || []).filter(g => g.ruolo !== 'T').sort((a, b) => (a.cognome || '').localeCompare(b.cognome || ''));

    const renderPlayerRow = g => {
      const badges = [];
      if (g.gol) badges.push('⚽'.repeat(g.gol));
      if (g.assist) badges.push('🅰️'.repeat(g.assist));
      if (g.ammonizioni) badges.push('🟡'.repeat(g.ammonizioni));
      if (g.espulsioni) badges.push('🔴'.repeat(g.espulsioni));
      return `<tr><td>${g.numeroMaglia || '-'}</td><td>${(g.cognome || '').toUpperCase()} ${g.nome || ''}</td><td>${badges.join(' ') || '-'}</td></tr>`;
    };

    const titolariHtml = titolari.map(renderPlayerRow).join('');
    const riserveHtml = riserve.map(renderPlayerRow).join('');

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
            <div class="pr-title">
              <div class="pr-t1">REPORT PARTITA</div>
              <div class="pr-t2">${report.societa || ''} vs ${report.partita?.avversario || 'TBD'}</div>
              <div class="pr-t3">${dt.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • ${report.partita?.competizione || 'Amichevole'}${report.partita?.giornata ? ' G.' + report.partita.giornata : ''}</div>
            </div>
          </div>
          <div class="pr-score">
            <div class="pr-score-num">${gc} - ${go}</div>
            <div class="pr-score-label" style="color:${risColor}">${risultato}</div>
          </div>
          <div class="pr-section">
            <div class="pr-section-title">📋 Cronologia</div>
            <div class="pr-eventi-wrap">${eventiHtml}</div>
          </div>
          <div class="pr-section">
            <div class="pr-players-grid">
              <div class="pr-players-col">
                <div class="pr-section-title">⚽ Titolari (${titolari.length})</div>
                <table class="pr-table"><thead><tr><th>#</th><th>Nome</th><th>Note</th></tr></thead><tbody>${titolariHtml}</tbody></table>
              </div>
              <div class="pr-players-col">
                <div class="pr-section-title">🔄 Riserve (${riserve.length})</div>
                <table class="pr-table"><thead><tr><th>#</th><th>Nome</th><th>Note</th></tr></thead><tbody>${riserveHtml}</tbody></table>
              </div>
            </div>
          </div>
          ${report.partita?.note ? `<div class="pr-section"><div class="pr-section-title">📝 Note</div><p style="font-size:12px;">${report.partita.note}</p></div>` : ''}
          <div class="pr-footer">
            <span>Allenatore: ${report.allenatore || '-'}</span>
            <span>Dirigente: ${report.dirigente || '-'}</span>
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
.print-doc { background: white; padding: 20mm 15mm; border: 1px solid #ddd; border-radius: 4px; }
.pr-header { display: flex; align-items: center; gap: 16px; margin-bottom: 6mm; padding-bottom: 4mm; border-bottom: 2px solid #667eea; }
.pr-logo { height: 50px; object-fit: contain; }
.pr-title { flex: 1; }
.pr-t1 { font-size: 20px; font-weight: bold; color: #667eea; }
.pr-t2 { font-size: 15px; font-weight: 600; margin-top: 2px; }
.pr-t3 { font-size: 12px; color: #666; margin-top: 2px; }
.pr-score { text-align: center; margin: 3mm 0; }
.pr-score-num { font-size: 32px; font-weight: 800; }
.pr-score-label { font-size: 13px; font-weight: 700; margin-top: 1px; }
.pr-section { margin-bottom: 4mm; }
.pr-section-title { font-size: 12px; font-weight: 700; margin-bottom: 2mm; }
.pr-evento { padding: 2px 0; font-size: 11px; }
.pr-evt-min { font-weight: 700; color: #667eea; min-width: 24px; display: inline-block; }
.pr-evt-label { font-weight: 600; font-size: 10px; }
.pr-eventi-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.pr-eventi-grid { display: flex; flex-direction: column; }
.pr-players-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pr-players-col { min-width: 0; }
.pr-table { width: 100%; border-collapse: collapse; }
.pr-table th, .pr-table td { border: 1px solid #eee; padding: 3px 6px; font-size: 11px; }
.pr-table th { background: #f8f9fa; font-size: 10px; text-align: left; }
.pr-footer { display: flex; justify-content: space-between; margin-top: 4mm; padding-top: 2mm; border-top: 1px solid #eee; font-size: 11px; color: #666; }
@media print {
  .print-toolbar { display: none !important; }
  .sidebar, .header { display: none !important; }
  .main { margin: 0 !important; padding: 0 !important; }
  .content { padding: 0 !important; }
  .layout { display: block !important; }
  .print-page { padding: 0; max-width: none; }
  .print-doc { border: none; padding: 0 !important; }
  .pr-header { margin-bottom: 2mm; padding-bottom: 1mm; }
  @page { size: A4 portrait; margin: 8mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body, .print-doc { font-size: 10px !important; }
  .pr-t1 { font-size: 14px !important; }
  .pr-t2 { font-size: 11px !important; }
  .pr-t3 { font-size: 9px !important; }
  .pr-score-num { font-size: 20px !important; }
  .pr-score-label { font-size: 10px !important; }
  .pr-section { margin-bottom: 2mm !important; }
  .pr-section-title { font-size: 10px !important; }
  .pr-table th, .pr-table td { font-size: 9px !important; padding: 2px 3px !important; }
  .pr-evento { font-size: 9px !important; }
  .pr-footer { font-size: 9px !important; margin-top: 2mm !important; }
  .pr-score { margin: 2mm 0 !important; }
  .pr-players-grid { grid-template-columns: 1fr 1fr !important; }
  .pr-eventi-wrap { grid-template-columns: 1fr 1fr !important; }
  .pr-section, .pr-footer { page-break-inside: avoid; }
}
@media (max-width: 500px) {
  .pr-players-grid { grid-template-columns: 1fr; }
  .pr-eventi-wrap { grid-template-columns: 1fr; }
  .print-doc { padding: 4mm; }
}
`;
}
