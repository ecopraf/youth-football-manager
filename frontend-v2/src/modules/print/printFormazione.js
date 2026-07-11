import { apiFetch } from '../../services/api.js';
import { PITCH_CSS, buildPitchSlotsFromState, convertApiFormation } from '../team/formazione.js';

export default async function printFormazione() {
  const container = document.getElementById('pageContent');
  const matchId = window.YFM.pageParams?.id;
  if (!matchId) { container.innerHTML = '<p>ID partita mancante</p>'; return; }

  container.innerHTML = '<div class="print-page"><div class="loading"><div class="spinner"></div>Caricamento...</div></div>';

  try {
    const squadraId = window.YFM.squadraId;
    const [formRes, rosa] = await Promise.all([
      apiFetch('/partite/' + matchId + '/formazione').catch(() => ({})),
      apiFetch('/squadre/' + squadraId + '/calciatori').catch(() => [])
    ]);

    const apiFormazione = Array.isArray(formRes) ? formRes : (formRes?.formazione || []);
    const match = formRes?.partita || null;
    const meta = formRes?.meta || {};

    if (apiFormazione.length === 0) {
      container.innerHTML = '<div class="print-page"><div class="error-box">Formazione non ancora compilata per questa partita.</div><button class="btn btn-secondary" onclick="window.YFM.navigateTo(\'printCenter\')">← Torna</button></div>';
      return;
    }

    // Convert API formation to internal format (same as Match Center)
    const formazione = convertApiFormation(apiFormazione, rosa, meta);
    const modulo = formazione?.modulo || meta?.modulo || '4-3-3';

    // Build assignments map (slot index → player id)
    const titolariIds = formazione ? [formazione.portiere, ...(formazione.difensori || []), ...(formazione.centrocampisti || []), ...(formazione.attaccanti || [])].filter(Boolean) : [];
    const assignments = {};
    titolariIds.forEach((id, i) => { assignments[i] = id; });

    // Jersey map
    const jerseyMap = {};
    apiFormazione.forEach(f => { if (f.numeroMaglia) jerseyMap[f.calciatoreId] = f.numeroMaglia; });

    // Riserve
    const riserveIds = formazione?.riserve || [];
    const riserve = riserveIds.map(id => rosa.find(p => p.id === id)).filter(Boolean);

    // Match info
    const wsName = window.YFM.getSocietaName();
    const wsLogo = window.YFM.getWorkspaceLogo();
    const dt = match?.data_ora ? new Date(match.data_ora) : new Date();
    const avversario = match?.avversario || 'TBD';
    const luogo = match?.luogo || '';
    const comp = match?.tipo_competizione || '';
    const giornata = match?.giornata || '';
    const oppLogo = match?.logo || null;

    let infoLine = dt.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    infoLine += ' • ore ' + dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    if (luogo) infoLine += ' • ' + luogo;
    let compLine = '';
    if (comp === 'Campionato') compLine = 'Campionato' + (giornata ? ' — Giornata ' + giornata : '');
    else if (comp === 'Coppa') compLine = 'Coppa';
    else if (comp && comp.startsWith('Torneo')) compLine = comp;
    else compLine = 'Amichevole';

    // Build pitch HTML using the same function as Match Center
    const pitchHtml = buildPitchSlotsFromState(modulo, assignments, rosa, formazione?.positions || {}, jerseyMap);

    container.innerHTML = `
      <style>${PITCH_CSS}</style>
      <div class="pf-print-page">
        <div class="print-toolbar">
          <button id="printBackBtn" class="btn btn-secondary">← Torna</button>
          <button id="printShareBtn" class="btn btn-secondary">📤</button>
          <button id="printPrintBtn" class="btn btn-primary">🖨 Stampa</button>
        </div>
        <div class="pf-doc">
          <div class="pf-match-bar">
            <div class="pf-team">
              ${wsLogo ? `<img src="${wsLogo}" alt="" class="pf-team-logo" onerror="this.style.display='none'">` : ''}
              <span class="pf-team-name">${wsName}</span>
            </div>
            <div class="pf-vs">
              <div class="pf-comp">${compLine}</div>
              <div class="pf-vs-text">vs</div>
            </div>
            <div class="pf-team">
              ${oppLogo ? `<img src="${oppLogo}" alt="" class="pf-team-logo" onerror="this.style.display='none'">` : '<span class="pf-team-logo-ph">🛡️</span>'}
              <span class="pf-team-name">${avversario}</span>
            </div>
          </div>
          <div class="pf-info">${infoLine}</div>

          <div class="pf-pitch-wrap">
            <div class="pf-modulo-label">${modulo}</div>
            <div class="pitch">${pitchHtml}</div>
          </div>

          ${riserve.length > 0 ? `
          <div class="pf-bench">
            <div class="pf-bench-title">🪑 Panchina (${riserve.length})</div>
            <div class="pf-bench-list">${riserve.map(g =>
              `<span class="pf-bench-player"><span class="pf-bench-num">${jerseyMap[g.id] || g.numero_maglia || '-'}</span>${(g.cognome || '').toUpperCase()}</span>`
            ).join('')}</div>
          </div>` : ''}
        </div>
      </div>
      <style>${getLocalStyles()}</style>
    `;

    document.getElementById('printBackBtn').addEventListener('click', () => window.YFM.navigateTo('printCenter'));
    document.getElementById('printPrintBtn').addEventListener('click', () => window.print());
    document.getElementById('printShareBtn').addEventListener('click', () => { if (navigator.share) { navigator.share({ title: 'Documento', url: window.location.href }).catch(() => {}); } else { navigator.clipboard.writeText(window.location.href).then(() => { if (window.showToast) window.showToast('Link copiato!', 'success'); }).catch(() => {}); } });
  } catch (e) {
    container.innerHTML = `<div class="print-page"><div class="error-box">Errore: ${e.message}</div></div>`;
  }
}

function getLocalStyles() {
  return `
.pf-print-page { max-width: 210mm; margin: 0 auto; padding: 16px; }
.print-toolbar { display: flex; gap: 10px; margin-bottom: 16px; }
.pf-doc { background: white; padding: 20mm 15mm; border: 1px solid #ddd; border-radius: 4px; }
.pf-match-bar { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 6mm; }
.pf-team { display: flex; align-items: center; gap: 8px; }
.pf-team-logo { width: 40px; height: 40px; border-radius: 50%; object-fit: contain; }
.pf-team-logo-ph { font-size: 32px; }
.pf-team-name { font-weight: 700; font-size: 16px; }
.pf-vs { text-align: center; min-width: 90px; }
.pf-comp { font-size: 11px; color: #667eea; font-weight: 600; text-transform: uppercase; }
.pf-vs-text { font-size: 14px; color: #888; font-weight: 500; }
.pf-info { text-align: center; font-size: 12px; color: #555; margin-bottom: 8mm; padding-bottom: 4mm; border-bottom: 1px solid #eee; }
.pf-pitch-wrap { position: relative; margin-bottom: 6mm; }
.pf-pitch-wrap .pitch { max-width: 420px; aspect-ratio: 3/4; margin: 0 auto; }
.pf-modulo-label { text-align: center; font-size: 14px; font-weight: 700; color: #333; margin-bottom: 4mm; }
.pf-bench { padding: 12px 16px; background: #f8f9fa; border-radius: 10px; }
.pf-bench-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
.pf-bench-list { display: flex; flex-wrap: wrap; gap: 8px; }
.pf-bench-player { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 600; padding: 4px 10px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; }
.pf-bench-num { font-size: 11px; font-weight: 800; color: #667eea; }
@media print {
  .print-toolbar { display: none !important; }
  .sidebar, .header { display: none !important; }
  .main { margin: 0 !important; padding: 0 !important; }
  .content { padding: 0 !important; }
  .layout { display: block !important; }
  .pf-print-page { padding: 0; max-width: none; }
  .pf-doc { border: none; padding: 10mm; box-shadow: none; }
  .pf-pitch-wrap .pitch { max-width: 380px; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .pitch-slot.occupied { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .pf-bench { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  @page { size: A4 portrait; margin: 12mm; }
}
@media (max-width: 500px) {
  .pf-match-bar { gap: 10px; flex-wrap: wrap; }
  .pf-team-logo { width: 30px; height: 30px; }
  .pf-team-name { font-size: 13px; }
  .pf-pitch-wrap .pitch { max-width: 300px; }
}
`;
}
