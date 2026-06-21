import { apiFetch } from '../../services/api';
import { formatDateShort } from '../../utils/formatters';

export async function openDistinta(mid, staffOverrides) {
  const content = '<div id="distintaInner"><div class="loading"><div class="spinner"></div>Caricamento distinta...</div></div>';
  const footer = '<button class="btn btn-secondary" id="modalCancel">Chiudi</button>' +
    '<button class="btn btn-secondary" id="staffBtn">👥 Staff</button>' +
    '<button class="btn btn-primary" id="printBtn">🖨️ Stampa</button>';
  const modal = createModal('📄 Distinta Gara', content, footer, '980px');
  
  let curStaff = null;
  try {
    const data = await apiFetch('/partite/' + mid + '/distinta');
    curStaff = staffOverrides || data.staff || {};
    renderDistinta(data, curStaff);
  } catch (e) {
    document.getElementById('distintaInner').innerHTML = '<div class="error-box">Formazione non disponibile</div>';
  }
  
  document.getElementById('printBtn').addEventListener('click', () => {
    const el = document.getElementById('distintaInner');
    if (el) {
      const w = window.open('', '_blank', 'width=1000,height=800');
      w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Distinta</title><style>@page{margin:6mm;size:A4 portrait}body{font-family:Courier New,monospace;font-size:9px;margin:0;padding:6mm}.center{text-align:center}.distinta-table{width:100%;border-collapse:collapse;margin:8px 0}.distinta-table th,.distinta-table td{border:1px solid #333;padding:2px 4px;text-align:center;font-size:8px}th{background:#f0f0f0}.capitano{background:#FFF9C4}.vice{background:#E8F5E9}.staff-section td{font-size:7px}.firme{margin-top:12px;display:flex;justify-content:space-between;font-size:9px}.note-finali{font-size:6px;margin-top:4px;text-align:center}@media print{body{padding:0}}</style></head><body>' + el.innerHTML + '<script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)}<\/script></body></html>');
      w.document.close();
    }
  });
  
  document.getElementById('staffBtn').addEventListener('click', () => openStaffForm(mid, curStaff));
}

function renderDistinta(d, staff) {
  const c = document.getElementById('distintaInner');
  if (!c) return;
  
  const t = (d.formazione || []).sort((a, b) => (a.cognome || '').localeCompare(b.cognome || ''));
  const dt = new Date(d.partita.dataOra);
  const s = staff || {};
  const righe = [];
  
  for (let i = 0; i < 24; i++) {
    if (i < t.length) {
      const f = t[i];
      righe.push('<tr class="' + (f.capitano ? 'capitano' : f.viceCapitano ? 'vice' : '') + '">' +
        '<td style="border:none;font-size:7px;">' + (i + 1) + '</td>' +
        '<td>' + (f.numeroMaglia || '-') + '</td>' +
        '<td>' + (f.dataNascita ? formatDateShort(f.dataNascita) : '-') + '</td>' +
        '<td style="text-align:left;">' + (f.cognome || '').toUpperCase() + ' ' + (f.nome || '') + '</td>' +
        '<td>' + (f.capitano ? 'CAP' : f.viceCapitano ? 'V.CAP' : '') + '</td>' +
        '<td>' + (f.matricolaFigc || '-') + '</td>' +
        '<td>' + (f.tipoDocumento || '-') + '</td>' +
        '<td>' + (f.numeroDocumento || '-') + '</td>' +
        '<td>' + (f.rilasciatoDa || '-') + '</td>' +
        '<td></td><td></td></tr>');
    } else {
      righe.push('<tr><td style="border:none;font-size:7px;">' + (i + 1) + '</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>');
    }
  }
  
  const societa = window.YFM.getSocietaName ? window.YFM.getSocietaName() : (d.societa || 'ASD Albalonga');
  
  // Costruisci le righe dello staff – TUTTI i ruoli, anche se vuoti
  const staffRows = [
    { label: 'Dirigente accompagnatore', nome: s.dirigente, matricola: s.matricola_dirigente, tessera: s.tessera_lnd_dirigente, tipoTessera: 'Tessera LND' },
    { label: 'Dirigente addetto ufficiali di gara', nome: s.dirigente2, matricola: s.matricola_dirigente2, tessera: s.tessera_lnd_dirigente2, tipoTessera: 'Tessera LND' },
    { label: 'Medico sociale', nome: s.medico, matricola: s.matricola_medico, tessera: s.tessera_lnd_medico, tipoTessera: 'Tessera LND' },
    { label: 'Allenatore', nome: s.allenatore, matricola: s.matricola_allenatore, tessera: s.tessera_figc_allenatore, tipoTessera: 'Tessera FIGC' },
    { label: 'Allenatore in seconda', nome: s.allenatore2, matricola: s.matricola_allenatore2, tessera: s.tessera_figc_allenatore2, tipoTessera: 'Tessera FIGC' },
    { label: 'Massaggiatore', nome: s.massaggiatore, matricola: s.matricola_massaggiatore, tessera: s.tessera_lnd_massaggiatore, tipoTessera: 'Tessera LND' },
    { label: 'Preparatore Atletico', nome: s.preparatore_atletico, matricola: s.matricola_preparatore, tessera: s.tessera_lnd_preparatore, tipoTessera: 'Tessera LND' },
    { label: 'Preparatore Portieri', nome: s.allenatore_portieri, matricola: s.matricola_prep_portieri, tessera: s.tessera_lnd_prep_portieri, tipoTessera: 'Tessera LND' }
  ];

  let staffHtml = '';
  staffRows.forEach(r => {
    let credenziali = '';
    if (r.matricola) credenziali += 'Matr. N° ' + r.matricola;
    if (r.tessera) {
      credenziali += (credenziali ? ' - ' : '') + r.tipoTessera + ' N° ' + r.tessera;
    }
    staffHtml += '<tr><td colspan="7" style="text-align:left;">' + r.label + ': ' + (r.nome || '') + '</td><td colspan="4" style="text-align:right;">' + credenziali + '</td></tr>';
  });
  
  c.innerHTML = 
    '<div class="center"><strong>F.I.G.C. - LEGA NAZIONALE DILETTANTI</strong><br><strong>' + societa + '</strong></div>' +
    '<div style="border:1px solid #333;padding:8px;margin:8px 0;text-align:left;"><strong>Distinta dei giuocatori partecipanti alla gara</strong><br><strong>' + societa + ' - ' + d.partita.avversario + '</strong><br>del campionato <strong>' + d.partita.competizione + '</strong><br>da disputare il <strong>' + dt.toLocaleDateString('it-IT') + ' alle ore ' + dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + (d.partita.giornata ? ' (Giornata ' + d.partita.giornata + ')' : '') + '</strong><br>presso <strong>' + (d.partita.luogo === 'Casa' ? 'Campo di Casa' : 'Campo Trasferta') + '</strong></div>' +
    '<table class="distinta-table"><thead><tr><th></th><th>N.</th><th>Data Nascita</th><th>Cognome e Nome</th><th>Cap/V.Cap</th><th>Matricola FIGC</th><th colspan="3">Documento Identificazione</th><th>Esp.</th><th>Amm.</th></tr><tr><th></th><th></th><th></th><th></th><th></th><th></th><th>Tipo</th><th>Numero</th><th>Rilasciato</th><th></th><th></th></tr></thead><tbody>' + righe.join('') + '<tr><td></td><td colspan="2" style="text-align:left;font-weight:bold;">ASSISTENTE DELL\'ARBITRO</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr></tbody></table>' +
    '<table class="distinta-table staff-section"><tbody>' +
    '<tr><td colspan="11" style="text-align:left;font-weight:bold;background:#f0f0f0;">STAFF</td></tr>' +
    staffHtml +
    '<tr><td colspan="11"> </td></tr>' +
    '<tr><td colspan="11" style="text-align:left;">NOTE .......................................................................................</td></tr>' +
    '</tbody></table>' +
    '<div style="font-size:7px;text-align:left;margin-top:4px;">*obbligatorio per gare nazionali, facoltativo per gare organizzate in ambito regionale e dal settore per l&#39;attività Giovanile e Scolastica. Le persone qui sopra elencate possono essere ammessi solo se munite delle prescritte tessere valide per l&#39;annata in corso.</div>' +
    '<div style="font-size:7px;margin-top:4px;text-align:justify;">Il sottoscritto Dirigente dichiara che i giocatori sopraindicati sono regolarmente tesserati e partecipano alla gara sotto la responsabilità della Società di appartenenza.</div>' +
    '<div class="firme"><div>L\'ARBITRO<br><br>___________________</div><div>IL DIRIGENTE ACCOMPAGNATORE UFFICIALE<br><br>___________________</div></div>';
}

function openStaffForm(mid, cur) {
  const s = cur || {};
  const content = `
    <div class="form-grid">
      <div class="form-group"><label>Allenatore</label><input id="sfAll" value="${s.allenatore || ''}"></div>
      <div class="form-group"><label>Matr. Allenatore</label><input id="sfMatrAll" value="${s.matricola_allenatore || ''}"></div>
      <div class="form-group"><label>Tessera FIGC All.</label><input id="sfTessAll" value="${s.tessera_figc_allenatore || ''}"></div>
      <div class="form-group"><label>Dirigente Ufficiale</label><input id="sfDir" value="${s.dirigente || ''}"></div>
      <div class="form-group"><label>Matr. Dirigente</label><input id="sfMatr" value="${s.matricola_dirigente || ''}"></div>
      <div class="form-group"><label>Tessera LND Dir.</label><input id="sfTessLND" value="${s.tessera_lnd_dirigente || ''}"></div>
      <div class="form-group"><label>2° Dirigente</label><input id="sfDir2" value="${s.dirigente2 || ''}"></div>
      <div class="form-group"><label>Matr. 2° Dirigente</label><input id="sfMatrDir2" value="${s.matricola_dirigente2 || ''}"></div>
      <div class="form-group"><label>Tessera LND 2° Dir.</label><input id="sfTessDir2" value="${s.tessera_lnd_dirigente2 || ''}"></div>
      <div class="form-group"><label>Medico Sociale</label><input id="sfMed" value="${s.medico || ''}"></div>
      <div class="form-group"><label>Matr. Medico</label><input id="sfMatrMed" value="${s.matricola_medico || ''}"></div>
      <div class="form-group"><label>Tessera LND Medico</label><input id="sfTessMed" value="${s.tessera_lnd_medico || ''}"></div>
      <div class="form-group"><label>All. in Seconda</label><input id="sfAll2" value="${s.allenatore2 || ''}"></div>
      <div class="form-group"><label>Matr. All. in Seconda</label><input id="sfMatrAll2" value="${s.matricola_allenatore2 || ''}"></div>
      <div class="form-group"><label>Tessera FIGC All. 2</label><input id="sfTessAll2" value="${s.tessera_figc_allenatore2 || ''}"></div>
      <div class="form-group"><label>Massaggiatore</label><input id="sfMass" value="${s.massaggiatore || ''}"></div>
      <div class="form-group"><label>Matr. Massaggiatore</label><input id="sfMatrMass" value="${s.matricola_massaggiatore || ''}"></div>
      <div class="form-group"><label>Tessera LND Mass.</label><input id="sfTessMass" value="${s.tessera_lnd_massaggiatore || ''}"></div>
      <div class="form-group"><label>Prep. Atletico</label><input id="sfPrep" value="${s.preparatore_atletico || ''}"></div>
      <div class="form-group"><label>Matr. Prep. Atletico</label><input id="sfMatrPrep" value="${s.matricola_preparatore || ''}"></div>
      <div class="form-group"><label>Tessera LND Prep.</label><input id="sfTessPrep" value="${s.tessera_lnd_preparatore || ''}"></div>
      <div class="form-group"><label>Prep. Portieri</label><input id="sfPort" value="${s.allenatore_portieri || ''}"></div>
      <div class="form-group"><label>Matr. Prep. Portieri</label><input id="sfMatrPort" value="${s.matricola_prep_portieri || ''}"></div>
      <div class="form-group"><label>Tessera LND Prep. Port.</label><input id="sfTessPort" value="${s.tessera_lnd_prep_portieri || ''}"></div>
    </div>`;
  const footer = '<button class="btn btn-secondary" id="modalCancel">Annulla</button><button class="btn btn-primary" id="applyBtn">Applica</button>';
  const modal = createModal('👥 Staff Distinta', content, footer, '700px');
  document.getElementById('applyBtn').addEventListener('click', () => {
    const ns = {
      allenatore: document.getElementById('sfAll').value,
      matricola_allenatore: document.getElementById('sfMatrAll').value,
      tessera_figc_allenatore: document.getElementById('sfTessAll').value,
      dirigente: document.getElementById('sfDir').value,
      matricola_dirigente: document.getElementById('sfMatr').value,
      tessera_lnd_dirigente: document.getElementById('sfTessLND').value,
      dirigente2: document.getElementById('sfDir2').value,
      matricola_dirigente2: document.getElementById('sfMatrDir2').value,
      tessera_lnd_dirigente2: document.getElementById('sfTessDir2').value,
      medico: document.getElementById('sfMed').value,
      matricola_medico: document.getElementById('sfMatrMed').value,
      tessera_lnd_medico: document.getElementById('sfTessMed').value,
      allenatore2: document.getElementById('sfAll2').value,
      matricola_allenatore2: document.getElementById('sfMatrAll2').value,
      tessera_figc_allenatore2: document.getElementById('sfTessAll2').value,
      massaggiatore: document.getElementById('sfMass').value,
      matricola_massaggiatore: document.getElementById('sfMatrMass').value,
      tessera_lnd_massaggiatore: document.getElementById('sfTessMass').value,
      preparatore_atletico: document.getElementById('sfPrep').value,
      matricola_preparatore: document.getElementById('sfMatrPrep').value,
      tessera_lnd_preparatore: document.getElementById('sfTessPrep').value,
      allenatore_portieri: document.getElementById('sfPort').value,
      matricola_prep_portieri: document.getElementById('sfMatrPort').value,
      tessera_lnd_prep_portieri: document.getElementById('sfTessPort').value
    };
    modal.close();
    openDistinta(mid, ns);
  });
}

function createModal(title, content, footer, maxW = '600px') {
  const existing = document.getElementById('currentModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'currentModal';
  modal.innerHTML = '<div class="modal-content" style="max-width:' + maxW + ';"><div class="modal-header"><h2>' + title + '</h2><button class="modal-close-btn" id="modalCloseX">×</button></div><div class="modal-body">' + content + '</div>' + (footer ? '<div class="modal-footer">' + footer + '</div>' : '') + '</div>';
  document.body.appendChild(modal);
  const close = () => { const m = document.getElementById('currentModal'); if (m) m.remove(); };
  document.getElementById('modalCloseX').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  const cancelBtn = document.getElementById('modalCancel');
  if (cancelBtn) cancelBtn.addEventListener('click', close);
  return { modal, closeModal: close, close };
}
