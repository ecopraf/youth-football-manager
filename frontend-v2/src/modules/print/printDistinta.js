import { apiFetch } from '../../services/api.js';
import { formatDateShort } from '../../utils/formatters.js';

export default async function printDistinta() {
  const container = document.getElementById('pageContent');
  const matchId = window.YFM.pageParams?.id;
  if (!matchId) { container.innerHTML = '<p>ID partita mancante</p>'; return; }

  container.innerHTML = '<div class="print-page"><div class="loading"><div class="spinner"></div>Caricamento...</div></div>';

  try {
    const squadraId = window.YFM.squadraId;
    const [data, meta] = await Promise.all([
      apiFetch('/squadre/' + squadraId + '/partite/' + matchId + '/distinta').catch(() => null),
      apiFetch('/partite/' + matchId + '/distinta-meta').catch(() => ({}))
    ]);

    let formazione = [];
    let partita = null;
    let staff = {};

    if (data && !Array.isArray(data) && data.formazione) {
      formazione = data.formazione || [];
      partita = data.partita;
      staff = data.staff || {};
    } else if (Array.isArray(data)) {
      formazione = data;
    }

    if (!partita) {
      const match = window.YFM.allMatches?.find(m => m.id === matchId);
      partita = match ? { avversario: match.avversario, dataOra: match.data_ora, competizione: match.tipo_competizione || '', giornata: match.giornata, luogo: match.luogo, indirizzo_campo: match.indirizzo_campo } : { avversario: 'TBD', dataOra: new Date().toISOString() };
    }

    if (formazione.length === 0) {
      const [convResp, rosa] = await Promise.all([
        apiFetch('/partite/' + matchId + '/convocazioni').catch(() => []),
        apiFetch('/squadre/' + squadraId + '/calciatori').catch(() => [])
      ]);
      const convIds = new Set((Array.isArray(convResp) ? convResp : []).filter(c => c.presente).map(c => c.calciatoreId));
      formazione = rosa.filter(g => convIds.has(g.id)).map(g => ({
        nome: g.nome, cognome: g.cognome, numeroMaglia: null,
        dataNascita: g.data_nascita, matricolaFigc: g.matricola_figc,
        tipoDocumento: g.tipo_documento, numeroDocumento: g.numero_documento,
        rilasciatoDa: g.rilasciato_da, ruolo_principale: g.ruolo,
        capitano: g.capitano, viceCapitano: g.vice_capitano, posizione: 'Titolare'
      }));
    }

    // Logica numeri distinta:
    // - Tutti (titolari+riserve) con numero dal mister → ordina titolari per numero (cerchiati), riserve per numero
    // - Solo tutti i titolari con numero → titolari per numero (cerchiati), riserve alfabetiche senza numero
    // - Manca anche un titolare senza numero → tutto alfabetico, nessun numero
    const titolari = formazione.filter(f => f.posizione === 'Titolare');
    const riserve = formazione.filter(f => f.posizione !== 'Titolare');
    const tuttiConNumero = formazione.length > 0 && formazione.every(f => f.numeroMaglia);
    const tuttiTitolariConNumero = titolari.length > 0 && titolari.every(f => f.numeroMaglia);

    let sorted;
    if (tuttiConNumero) {
      // Caso ideale: mister ha assegnato numeri a tutti
      sorted = formazione.sort((a, b) => {
        const aT = a.posizione === 'Titolare' ? 0 : 1;
        const bT = b.posizione === 'Titolare' ? 0 : 1;
        if (aT !== bT) return aT - bT;
        return a.numeroMaglia - b.numeroMaglia;
      });
    } else if (tuttiTitolariConNumero) {
      // Solo titolari con numero: riserve senza
      riserve.forEach(f => { f.numeroMaglia = null; });
      sorted = formazione.sort((a, b) => {
        const aT = a.posizione === 'Titolare' ? 0 : 1;
        const bT = b.posizione === 'Titolare' ? 0 : 1;
        if (aT !== bT) return aT - bT;
        if (aT === 0) return a.numeroMaglia - b.numeroMaglia;
        return (a.cognome || '').localeCompare(b.cognome || '') || (a.nome || '').localeCompare(b.nome || '');
      });
    } else {
      // Numeri incompleti: tutto alfabetico senza numeri
      formazione.forEach(f => { f.numeroMaglia = null; });
      sorted = formazione.sort((a, b) => (a.cognome || '').localeCompare(b.cognome || '') || (a.nome || '').localeCompare(b.nome || ''));
    }

    const dt = new Date(partita.dataOra || partita.data_ora);
    const wsName = window.YFM.getSocietaName();
    const wsLogo = window.YFM.getWorkspaceLogo();
    const fac = window.YFM.facility;
    const campoCasa = fac ? [fac.nome, fac.indirizzo, fac.citta].filter(Boolean).join(' - ') : '';
    const campoInfo = partita.luogo === 'Trasferta' ? (partita.indirizzo_campo || 'Trasferta') : (campoCasa || 'Casa');

    const variante = (partita.competizione || partita.tipo_competizione || '').startsWith('Torneo') ? 'torneo' : 'standard';

    if (variante === 'torneo') {
      container.innerHTML = renderTorneo(sorted, partita, dt, wsName, wsLogo);
    } else {
      container.innerHTML = renderFIGC(sorted, partita, dt, wsName, wsLogo, campoInfo, meta, staff);
    }

    // PDF filename
    const dataStr = dt.toLocaleDateString('it-IT').replace(/\//g, '-');
    const giornataStr = partita.giornata ? `_G${partita.giornata}` : '';
    document.title = `Distinta_${(partita.avversario || 'TBD').replace(/\s+/g, '_')}_${dataStr}${giornataStr}`;

    document.getElementById('printBackBtn').addEventListener('click', () => window.YFM.navigateTo('printCenter'));
    document.getElementById('printPrintBtn').addEventListener('click', () => window.print());
    document.getElementById('printShareBtn').addEventListener('click', () => { if (navigator.share) { navigator.share({ title: 'Documento', url: window.location.href }).catch(() => {}); } else { navigator.clipboard.writeText(window.location.href).then(() => { if (window.showToast) window.showToast('Link copiato!', 'success'); }).catch(() => {}); } });
  } catch (e) {
    container.innerHTML = `<div class="print-page"><div class="error-box">Errore: ${e.message}</div><button class="btn btn-secondary" onclick="history.back()">← Torna</button></div>`;
  }
}

function renderFIGC(sorted, partita, dt, wsName, wsLogo, campoInfo, meta, staff) {
  let rows = '';
  for (let i = 0; i < 24; i++) {
    if (i < sorted.length) {
      const f = sorted[i];
      const isTit = f.posizione === 'Titolare';
      const numCell = f.numeroMaglia ? (isTit ? `<span class="nc">${f.numeroMaglia}</span>` : f.numeroMaglia) : '';
      const cls = f.capitano ? ' class="cap"' : f.viceCapitano ? ' class="vice"' : '';
      rows += `<tr${cls}><td class="idx">${i + 1}</td><td>${numCell}</td><td>${f.dataNascita ? formatDateShort(f.dataNascita) : '-'}</td><td class="name">${(f.cognome || '').toUpperCase()} ${(f.nome || '').toUpperCase()}${f.ruolo_principale === 'Portiere' ? ' (P)' : ''}</td><td>${f.capitano ? 'C' : f.viceCapitano ? 'V' : ''}</td><td>${f.matricolaFigc || '-'}</td><td>Tess.</td><td>${f.numeroDocumento || '-'}</td><td>${f.rilasciatoDa || 'FIGC'}</td><td></td><td></td></tr>`;
    } else {
      rows += `<tr><td class="idx">${i + 1}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
    }
  }

  const s = staff;
  const staffRows = [
    ['Dirigente accompagnatore', s.dirigente, s.matricola_dirigente, s.tessera_lnd_dirigente],
    ['Allenatore', s.allenatore, s.matricola_allenatore, s.tessera_figc_allenatore],
    ['Allenatore in seconda', s.allenatore2, s.matricola_allenatore2, s.tessera_figc_allenatore2],
    ['Preparatore atletico', s.preparatore_atletico, s.matricola_preparatore, s.tessera_lnd_preparatore],
    ['Preparatore portieri', s.allenatore_portieri, s.matricola_prep_portieri, s.tessera_lnd_prep_portieri]
  ].map(([label, nome, matr, tess]) =>
    `<tr><td>${label}: <strong>${nome || ''}</strong></td><td>${matr ? 'Matr. ' + matr : ''} ${tess ? 'Tess. ' + tess : ''}</td></tr>`
  ).join('');

  return `
    <div class="print-page">
      <div class="print-toolbar">
        <button id="printBackBtn" class="btn btn-secondary">← Torna</button>
        <button id="printShareBtn" class="btn btn-secondary">📤</button>
          <button id="printPrintBtn" class="btn btn-primary">🖨 Stampa</button>
      </div>
      <div class="print-doc">
        <div class="dist-header">
          <img src="/img/logo-lnd.png" alt="" class="dist-logo" onerror="this.style.display='none'">
          <div class="dist-center">
            <div style="font-size:10px;">Distinta n° ________</div>
            <strong>F.I.G.C. - LEGA NAZIONALE DILETTANTI</strong><br>
            <strong>${wsName}</strong>
          </div>
          ${wsLogo ? `<img src="${wsLogo}" alt="" class="dist-logo">` : '<div class="dist-logo"></div>'}
        </div>
        <div class="dist-info">
          Distinta dei giocatori partecipanti alla gara <strong>${wsName} - ${partita.avversario}</strong><br>
          da disputare il <strong>${dt.toLocaleDateString('it-IT')}</strong> ore <strong>${dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</strong>${partita.giornata ? ' (Giornata ' + partita.giornata + ')' : ''}<br>
          presso <strong>${campoInfo}</strong>
        </div>
        <table class="dist-table">
          <thead><tr><th></th><th>N°</th><th>Data nascita</th><th>Cognome e nome</th><th>Cap.</th><th>Matricola</th><th colspan="3">Documento</th><th>Esp.</th><th>Amm.</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <table class="dist-staff">
          <tr><td>Assistente Arbitro: <strong>${meta?.assistente_arbitro || '________'}</strong></td><td>${meta?.matricola_assistente ? 'Matr. ' + meta.matricola_assistente : ''} ${meta?.tessera_assistente ? 'Tess. ' + meta.tessera_assistente : ''}</td></tr>
          ${staffRows}
        </table>
        <div class="dist-firme">
          <div>V° L'ARBITRO<br><br>___________________</div>
          <div>IL DIRIGENTE ACCOMPAGNATORE<br><br>___________________</div>
        </div>
      </div>
    </div>
    <style>${getStyles()}</style>
  `;
}

function renderTorneo(sorted, partita, dt, wsName, wsLogo) {
  const rows = sorted.map((f, i) =>
    `<tr><td>${i + 1}</td><td>${f.numeroMaglia || ''}</td><td>${(f.cognome || '').toUpperCase()} ${(f.nome || '').toUpperCase()}</td><td>${f.dataNascita ? formatDateShort(f.dataNascita) : '-'}</td></tr>`
  ).join('');

  return `
    <div class="print-page">
      <div class="print-toolbar">
        <button id="printBackBtn" class="btn btn-secondary">← Torna</button>
        <button id="printShareBtn" class="btn btn-secondary">📤</button>
          <button id="printPrintBtn" class="btn btn-primary">🖨 Stampa</button>
      </div>
      <div class="print-doc">
        <div class="dist-header">
          ${wsLogo ? `<img src="${wsLogo}" alt="" class="dist-logo">` : ''}
          <div class="dist-center">
            <strong style="font-size:14px;">DISTINTA TORNEO</strong><br>
            <strong>${wsName}</strong>
          </div>
        </div>
        <div class="dist-info">
          <strong>${wsName} vs ${partita.avversario || 'TBD'}</strong><br>
          ${dt.toLocaleDateString('it-IT')} ore ${dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <table class="dist-table">
          <thead><tr><th>#</th><th>N°</th><th>Cognome e Nome</th><th>Data nascita</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="dist-firme" style="margin-top:16px;">
          <div>Firma Allenatore<br><br>___________________</div>
        </div>
      </div>
    </div>
    <style>${getStyles()}</style>
  `;
}

function getStyles() {
  return `
.print-page { max-width: 210mm; margin: 0 auto; padding: 16px; }
.print-toolbar { display: flex; gap: 10px; margin-bottom: 16px; }
.print-doc { background: white; padding: 12mm 10mm; border: 1px solid #ddd; border-radius: 4px; font-size: 10px; line-height: 1.4; }
.dist-header { display: flex; align-items: center; margin-bottom: 6px; }
.dist-logo { height: 70px; object-fit: contain; }
.dist-center { flex: 1; text-align: center; font-size: 11px; }
.dist-info { border: 1px solid #000; padding: 8px 10px; margin: 6px 0; font-size: 10px; line-height: 1.7; }
.dist-table { width: 100%; border-collapse: collapse; margin: 6px 0; }
.dist-table th, .dist-table td { border: 1px solid #000; padding: 3px 5px; font-size: 9px; text-align: center; }
.dist-table .name { text-align: left; }
.dist-table .idx { border: none; font-size: 8px; }
.cap { background: #FFF9C4; }
.vice { background: #E8F5E9; }
.nc { font-weight: 700; border: 1.5px solid #000; border-radius: 50%; width: 14px; height: 14px; line-height: 14px; display: inline-block; text-align: center; font-size: 9px; }
.dist-staff { width: 100%; border-collapse: collapse; margin-top: 6px; }
.dist-staff td { border: 1px solid #000; padding: 3px 6px; font-size: 9px; }
.dist-firme { display: flex; justify-content: space-between; margin-top: 12px; font-size: 9px; }
@media print {
  .print-toolbar { display: none !important; }
  .sidebar, .header { display: none !important; }
  .main { margin: 0 !important; padding: 0 !important; }
  .content { padding: 0 !important; }
  .layout { display: block !important; }
  .print-page { padding: 0; max-width: none; }
  .print-doc { border: none; padding: 0; }
  @page { size: A4 portrait; margin: 6mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body, .print-doc { font-size: 8px !important; line-height: 1.3 !important; }
  .print-doc { padding: 0 !important; }
  .dist-table th, .dist-table td { font-size: 7px !important; padding: 1px 3px !important; }
  .dist-firme { font-size: 7px !important; margin-top: 6px !important; page-break-inside: avoid; }
  .dist-info { font-size: 8px !important; padding: 4px 6px !important; line-height: 1.5 !important; }
  .dist-staff td { font-size: 7px !important; padding: 1px 3px !important; }
  .dist-header { margin-bottom: 4px !important; }
  .dist-center { font-size: 9px !important; }
  .nc { width: 12px !important; height: 12px !important; line-height: 12px !important; font-size: 8px !important; }
}
`;
}
