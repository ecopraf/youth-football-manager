import { apiFetch } from '../../services/api';
import { getAvatarColor } from '../../utils/formatters';
import { showLoading, hideLoading } from '../../utils/ui';

const RUOLO_ACR = { 'Portiere': 'POR', 'Difensore': 'DIF', 'Centrocampista': 'CEN', 'Attaccante': 'ATT' };

export async function openFormazioneForm(mid) {
  const match = window.YFM.allMatches?.find(m => m.id === mid) || {};
  const isArchiviata = match.archiviata === true || match.archiviata === 'true';
  
  let convocazioni = [], formazioneEsistente = [], giocatori = [];
  
  [convocazioni, formazioneEsistente, giocatori] = await Promise.all([
    apiFetch('/partite/' + mid + '/convocazioni').catch(() => []),
    apiFetch('/partite/' + mid + '/formazione').catch(() => []),
    apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori').catch(() => [])
  ]);

  const convocatiIds = convocazioni.filter(c => c.presente === true).map(c => c.calciatoreId);
  const ruoloOrder = ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante'];
  const giocatoriConvocati = giocatori.filter(g => convocatiIds.includes(g.id)).sort((a, b) => {
    const ra = ruoloOrder.indexOf(a.ruolo), rb = ruoloOrder.indexOf(b.ruolo);
    if (ra !== rb) return ra - rb;
    return a.cognome.localeCompare(b.cognome);
  });

  const formMap = {};
  (formazioneEsistente || []).forEach(f => { formMap[f.calciatoreId] = f; });

  if (isArchiviata) {
    renderFormazioneReadOnly(match, giocatoriConvocati, formMap, isArchiviata);
  } else {
    renderFormazioneEdit(mid, match, giocatoriConvocati, formMap);
  }
}

// ==================== VISTA SOLA LETTURA (ARCHIVIATE) ====================
function renderFormazioneReadOnly(match, giocatori, formMap, isArchiviata) {
  const titolari = [], riserve = [];
  giocatori.forEach(g => {
    const f = formMap[g.id];
    if (f?.posizione === 'Titolare') titolari.push(g);
    else if (f?.posizione === 'Panchina') riserve.push(g);
  });

  let html = '<style>';
  html += '.fro{padding:16px;}';
  html += '.fro-header{text-align:center;padding:16px;background:#f8f9fa;border-radius:12px;margin-bottom:20px;}';
  html += '.fro-header h3{margin:0 0 4px;font-size:18px;}';
  html += '.fro-header p{margin:0;font-size:13px;color:#888;}';
  html += '.fro-section{margin-bottom:20px;}';
  html += '.fro-section h4{margin:0 0 12px;font-size:14px;color:#333;display:flex;align-items:center;gap:8px;}';
  html += '.fro-count{background:#667eea;color:white;padding:2px 8px;border-radius:10px;font-size:11px;}';
  html += '.fro-list{display:flex;flex-wrap:wrap;gap:8px;}';
  html += '.fro-player{display:flex;align-items:center;gap:10px;padding:10px 14px;background:white;border-radius:10px;border:1px solid #eee;min-width:180px;}';
  html += '.fro-player:hover{border-color:#667eea;}';
  html += '.fro-num{width:32px;height:32px;background:#667eea;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;}';
  html += '.fro-name{font-weight:600;font-size:13px;}';
  html += '.fro-role{font-size:11px;color:#888;}';
  html += '.fro-empty{text-align:center;padding:40px;color:#888;font-size:14px;}';
  html += '.fro-archived{background:#8B7355;color:white;padding:8px 16px;border-radius:10px;margin-bottom:20px;display:inline-block;font-weight:600;}';
  html += '</style>';

  html += '<div class="fro">';
  if (isArchiviata) {
    html += '<div style="text-align:center;"><span class="fro-archived">📦 Partita Archiviata</span></div>';
  }
  html += '<div class="fro-header">';
  html += '<h3>👥 Formazione Schierata</h3>';
  html += '<p>' + window.YFM.getSocietaName() + ' vs ' + match.avversario + '</p>';
  html += '</div>';

  // TITOLARI
  html += '<div class="fro-section">';
  html += '<h4>⚽ Titolari <span class="fro-count">' + titolari.length + '</span></h4>';
  if (titolari.length === 0) {
    html += '<div class="fro-empty">Nessun titolare registrato</div>';
  } else {
    html += '<div class="fro-list">';
    titolari.forEach(g => {
      const f = formMap[g.id];
      const num = f?.numeroMaglia || g.numeroMaglia || '-';
      const acr = RUOLO_ACR[g.ruolo] || g.ruolo?.substring(0, 3) || '';
      html += '<div class="fro-player">';
      html += '<div class="fro-num">' + num + '</div>';
      html += '<div>';
      html += '<div class="fro-name">' + g.cognome + ' ' + g.nome + '</div>';
      html += '<div class="fro-role">' + acr + '</div>';
      html += '</div></div>';
    });
    html += '</div>';
  }
  html += '</div>';

  // RISERVE
  html += '<div class="fro-section">';
  html += '<h4>🪑 Panchina <span class="fro-count">' + riserve.length + '</span></h4>';
  if (riserve.length === 0) {
    html += '<div class="fro-empty">Nessuna riserva</div>';
  } else {
    html += '<div class="fro-list">';
    riserve.forEach(g => {
      const f = formMap[g.id];
      const num = f?.numeroMaglia || g.numeroMaglia || '-';
      const acr = RUOLO_ACR[g.ruolo] || g.ruolo?.substring(0, 3) || '';
      html += '<div class="fro-player">';
      html += '<div class="fro-num" style="background:#999;">' + num + '</div>';
      html += '<div>';
      html += '<div class="fro-name">' + g.cognome + ' ' + g.nome + '</div>';
      html += '<div class="fro-role">' + acr + '</div>';
      html += '</div></div>';
    });
    html += '</div>';
  }
  html += '</div>';

  html += '</div>';

  const footer = '<button class="btn btn-secondary" id="modalCancelBtn">Chiudi</button>';
  const modal = createModal('👥 Formazione - ' + match.avversario, html, footer, '800px');
  
  document.getElementById('modalCancelBtn').addEventListener('click', () => modal.close());
}

// ==================== FORM EDITABILE (FUTURE) ====================
function renderFormazioneEdit(mid, match, giocatoriConvocati, formMap) {
  let html = '<p style="margin-bottom:16px;"><strong>Formazione - ' + window.YFM.getSocietaName() + ' vs ' + match.avversario + '</strong></p>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">';

  // Titolari
  html += '<div><h4 style="margin-bottom:8px;">Titolari <span id="cntTitolari" style="font-size:12px;color:var(--gray);"></span></h4>';
  giocatoriConvocati.forEach(g => {
    const f = formMap[g.id];
    const checked = f && f.posizione === 'Titolare' ? ' checked' : '';
    html += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;"><input type="checkbox"' + checked + ' data-pid="' + g.id + '" class="form-check-tit" style="accent-color:var(--green);"><span style="flex:1;">' + g.nome + ' ' + g.cognome + ' <span style="color:var(--gray);font-size:12px;">(' + g.ruolo + ')</span></span><input type="number" value="' + (f ? f.numeroMaglia : (g.numeroMaglia || g.numero_maglia || 99)) + '" data-pid="' + g.id + '" class="form-num-tit" style="width:50px;padding:4px;" placeholder="N."></div>';
  });
  html += '</div>';

  // Panchina
  html += '<div><h4 style="margin-bottom:8px;">Panchina <span id="cntRiserve" style="font-size:12px;color:var(--gray);"></span></h4>';
  giocatoriConvocati.forEach(g => {
    const f = formMap[g.id];
    const checked = f && f.posizione === 'Panchina' ? ' checked' : '';
    html += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;"><input type="checkbox"' + checked + ' data-pid="' + g.id + '" class="form-check-pan" style="accent-color:var(--orange);"><span style="flex:1;">' + g.nome + ' ' + g.cognome + ' <span style="color:var(--gray);font-size:12px;">(' + g.ruolo + ')</span></span><input type="number" value="' + (f ? f.numeroMaglia : (g.numeroMaglia || g.numero_maglia || 99)) + '" data-pid="' + g.id + '" class="form-num-pan" style="width:50px;padding:4px;" placeholder="N."></div>';
  });
  html += '</div></div>';

  const footer = '<button class="btn btn-secondary" id="modalCancelBtn">Annulla</button><button class="btn btn-primary" id="saveFormBtn">💾 Salva Formazione</button>';
  const modal = createModal('👥 Formazione', html, footer, '800px');

  // Mutua esclusione e contatori
  const updateCounters = () => {
    const titChecked = document.querySelectorAll('#currentModal .form-check-tit:checked').length;
    const panChecked = document.querySelectorAll('#currentModal .form-check-pan:checked').length;
    document.getElementById('cntTitolari').textContent = titChecked + '/11 titolari';
    document.getElementById('cntRiserve').textContent = panChecked + ' riserve';
    const saveBtn = document.getElementById('saveFormBtn');
    if (saveBtn) {
      saveBtn.disabled = titChecked !== 11;
      saveBtn.style.opacity = titChecked === 11 ? '1' : '0.5';
    }
    document.querySelectorAll('#currentModal .form-check-tit:not(:checked)').forEach(cb => { cb.disabled = titChecked >= 11; });
  };

  document.querySelectorAll('#currentModal .form-check-tit').forEach(cbTit => {
    cbTit.addEventListener('change', () => {
      if (cbTit.checked) {
        const pan = document.querySelector('#currentModal .form-check-pan[data-pid="' + cbTit.dataset.pid + '"]');
        if (pan) pan.checked = false;
      } else {
        const pan = document.querySelector('#currentModal .form-check-pan[data-pid="' + cbTit.dataset.pid + '"]');
        if (pan) pan.checked = true;
      }
      updateCounters();
    });
  });

  document.querySelectorAll('#currentModal .form-check-pan').forEach(cbPan => {
    cbPan.addEventListener('change', () => {
      if (cbPan.checked) {
        const tit = document.querySelector('#currentModal .form-check-tit[data-pid="' + cbPan.dataset.pid + '"]');
        if (tit) tit.checked = false;
      }
      updateCounters();
    });
  });

  updateCounters();

  document.getElementById('saveFormBtn').addEventListener('click', async () => {
    const titolariIds = [];
    const riserveIds = [];
    
    document.querySelectorAll('#currentModal .form-check-tit:checked').forEach(cb => {
      titolariIds.push(cb.dataset.pid);
    });
    document.querySelectorAll('#currentModal .form-check-pan:checked').forEach(cb => {
      riserveIds.push(cb.dataset.pid);
    });

    const assegnati = new Set([...titolariIds, ...riserveIds]);
    const nonAssegnati = giocatoriConvocati.filter(g => !assegnati.has(g.id));
    if (nonAssegnati.length > 0 && !confirm('Ci sono ' + nonAssegnati.length + ' convocati non assegnati. Procedere?')) return;

    showLoading();
    try {
      const formazione = [];
      document.querySelectorAll('#currentModal .form-check-tit:checked').forEach(cb => {
        const pid = cb.dataset.pid;
        const numInput = document.querySelector('#currentModal .form-num-tit[data-pid="' + pid + '"]');
        formazione.push({ calciatoreId: pid, numeroMaglia: parseInt(numInput?.value) || giocatoriConvocati.find(g => g.id === pid)?.numeroMaglia || 99, posizione: 'Titolare', capitano: false, viceCapitano: false });
      });
      document.querySelectorAll('#currentModal .form-check-pan:checked').forEach(cb => {
        const pid = cb.dataset.pid;
        const numInput = document.querySelector('#currentModal .form-num-pan[data-pid="' + pid + '"]');
        formazione.push({ calciatoreId: pid, numeroMaglia: parseInt(numInput?.value) || giocatoriConvocati.find(g => g.id === pid)?.numeroMaglia || 99, posizione: 'Panchina', capitano: false, viceCapitano: false });
      });

      await apiFetch('/partite/' + mid + '/formazione', { method: 'PUT', body: JSON.stringify({ formazione }) });
      hideLoading();
      modal.close();
      alert('✅ Formazione salvata! La distinta è aggiornata.');
    } catch (e) {
      hideLoading();
      alert('Errore: ' + e.message);
    }
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
  const cancelBtn = document.getElementById('modalCancelBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', close);
  return { modal, closeModal: close, close };
}
