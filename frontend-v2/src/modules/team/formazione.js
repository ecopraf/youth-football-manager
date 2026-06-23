import { apiFetch } from '../../services/api.js';
import { showLoading, hideLoading } from '../../utils/ui.js';

const RUOLO_ACR = { 'Portiere': 'POR', 'Difensore': 'DIF', 'Centrocampista': 'CEN', 'Attaccante': 'ATT' };
const EVENTI_ICON = { 'GOAL': '⚽', 'YELLOW': '🟨', 'RED': '🟥', 'ASSIST': '🅰️', 'OUT': '➡️', 'IN': '⬅️' };

export async function openFormazioneForm(mid) {
  const match = window.YFM.allMatches.find(m => m.id === mid) || {};
  const isPast = new Date(match.data_ora) < new Date();
  
  const [convocazioni, formazioneEsistente, giocatori, eventiData, valutazioniData] = await Promise.all([
    apiFetch('/partite/' + mid + '/convocazioni').catch(() => []),
    apiFetch('/partite/' + mid + '/formazione').catch(() => []),
    apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori').catch(() => []),
    apiFetch('/partite/' + mid + '/dettaglio').catch(() => ({ eventi: [] })),
    apiFetch('/partite/' + mid + '/valutazioni').catch(() => ({ valutazioni: [] }))
  ]);
  
  const giocatoriMap = {};
  (giocatori || []).forEach(g => { giocatoriMap[g.id] = g; });
  
  const convocatiIds = (convocazioni.convocazioni || []).filter(c => c.presente).map(c => c.calciatoreId);
  
  const formMap = {};
  (formazioneEsistente || []).forEach(f => { formMap[f.calciatoreId] = f; });
  
  const eventiByPlayer = {};
  (eventiData.eventi || []).forEach(e => {
    const pid = e.principale_id || e.calciatore_principale_id;
    if (!eventiByPlayer[pid]) eventiByPlayer[pid] = [];
    eventiByPlayer[pid].push(e);
  });
  
  const valutazioniMap = {};
  (valutazioniData.valutazioni || []).forEach(v => { valutazioniMap[v.calciatore_id] = v; });
  
  const giocatoriConvocati = giocatori.filter(g => convocatiIds.includes(g.id)).sort((a, b) => {
    const order = ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante'];
    const ra = order.indexOf(a.ruolo), rb = order.indexOf(b.ruolo);
    if (ra !== rb) return ra - rb;
    return a.cognome.localeCompare(b.cognome);
  });
  
  if (isPast) {
    renderFormazioneArchiviata(mid, match, giocatoriConvocati, formMap, eventiByPlayer, valutazioniMap);
  } else {
    renderFormazioneEdit(mid, match, giocatoriConvocati, formMap);
  }
}

// ==================== FORMAZIONE FUTURA (EDIT - COME ERA PRIMA) ====================
function renderFormazioneEdit(mid, match, giocatori, formMap) {
  let html = '<p style="margin-bottom:16px;"><strong>Formazione - ' + window.YFM.getSocietaName() + ' vs ' + match.avversario + '</strong></p>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">';
  
  html += '<div><h4 style="margin-bottom:8px;">Titolari <span id="cntTitolari" style="font-size:12px;color:var(--gray);"></span></h4>';
  giocatori.forEach(g => {
    const f = formMap[g.id];
    const checked = f && f.posizione === 'Titolare' ? ' checked' : '';
    const ruolo = RUOLO_ACR[g.ruolo] || '';
    html += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;"><input type="checkbox"' + checked + ' data-pid="' + g.id + '" class="form-check-tit" style="accent-color:var(--green);"><span style="flex:1;">' + g.cognome + ' ' + g.nome + ' <span style="color:var(--gray);font-size:12px;">(' + ruolo + ')</span></span><input type="number" value="' + (f ? f.numeroMaglia : g.numeroMaglia) + '" data-pid="' + g.id + '" class="form-num-tit" style="width:50px;padding:4px;"></div>';
  });
  html += '</div>';
  
  html += '<div><h4 style="margin-bottom:8px;">Panchina <span id="cntRiserve" style="font-size:12px;color:var(--gray);"></span></h4>';
  giocatori.forEach(g => {
    const f = formMap[g.id];
    const checked = f && f.posizione === 'Panchina' ? ' checked' : '';
    const ruolo = RUOLO_ACR[g.ruolo] || '';
    html += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;"><input type="checkbox"' + checked + ' data-pid="' + g.id + '" class="form-check-pan" style="accent-color:var(--orange);"><span style="flex:1;">' + g.cognome + ' ' + g.nome + ' <span style="color:var(--gray);font-size:12px;">(' + ruolo + ')</span></span><input type="number" value="' + (f ? f.numeroMaglia : g.numeroMaglia) + '" data-pid="' + g.id + '" class="form-num-pan" style="width:50px;padding:4px;"></div>';
  });
  html += '</div></div>';
  
  const footer = '<button class="btn btn-secondary" id="modalCancel">Annulla</button><button class="btn btn-primary" id="saveFormBtn">💾 Salva Formazione</button>';
  const modal = createModal('👥 Formazione', '<div id="formEditInner">' + html + '</div>', footer, '800px');
  
  const updateCounters = () => {
    const titChecked = document.querySelectorAll('#currentModal .form-check-tit:checked').length;
    document.getElementById('cntTitolari').textContent = titChecked + '/11 titolari';
    const saveBtn = document.getElementById('saveFormBtn');
    if (saveBtn) saveBtn.disabled = titChecked !== 11;
  };
  
  document.querySelectorAll('#currentModal .form-check-tit').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        const pan = document.querySelector('#currentModal .form-check-pan[data-pid="' + cb.dataset.pid + '"]');
        if (pan) pan.checked = false;
      }
      updateCounters();
    });
  });
  
  document.querySelectorAll('#currentModal .form-check-pan').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        const tit = document.querySelector('#currentModal .form-check-tit[data-pid="' + cb.dataset.pid + '"]');
        if (tit) tit.checked = false;
      }
      updateCounters();
    });
  });
  
  updateCounters();
  
  document.getElementById('saveFormBtn').addEventListener('click', async () => {
    const formazione = [];
    document.querySelectorAll('#currentModal .form-check-tit:checked').forEach(cb => {
      const pid = cb.dataset.pid;
      const numInput = document.querySelector('#currentModal .form-num-tit[data-pid="' + pid + '"]');
      formazione.push({ calciatoreId: pid, numeroMaglia: parseInt(numInput?.value) || 99, posizione: 'Titolare' });
    });
    document.querySelectorAll('#currentModal .form-check-pan:checked').forEach(cb => {
      const pid = cb.dataset.pid;
      const numInput = document.querySelector('#currentModal .form-num-pan[data-pid="' + pid + '"]');
      formazione.push({ calciatoreId: pid, numeroMaglia: parseInt(numInput?.value) || 99, posizione: 'Panchina' });
    });
    
    if (!confirm('Salvare la formazione?')) return;
    showLoading();
    await apiFetch('/partite/' + mid + '/formazione', { method: 'PUT', body: JSON.stringify({ formazione }) });
    hideLoading();
    modal.close();
    alert('✅ Formazione salvata!');
  });
}

// ==================== FORMAZIONE ARCHIVIATA ====================
function renderFormazioneArchiviata(mid, match, giocatori, formMap, eventiByPlayer, valutazioniMap) {
  const titolari = [], riserve = [];
  giocatori.forEach(g => {
    const f = formMap[g.id];
    if (f?.posizione === 'Titolare') titolari.push({ ...g, formazione: f });
    else if (f?.posizione === 'Panchina') riserve.push({ ...g, formazione: f });
  });
  
  let html = '<style>';
  html += '.fa{max-height:75vh;overflow-y:auto;padding:8px;}';
  html += '.fa-title{text-align:center;padding:16px;background:#f8f9fa;border-radius:12px;margin-bottom:20px;}';
  html += '.fa-title h3{margin:0 0 8px;font-size:18px;}';
  html += '.fa-title p{margin:0;font-size:13px;color:#888;}';
  html += '.fa-field{position:relative;background:linear-gradient(180deg,#4CAF50 0%,#2E7D32 100%);border-radius:20px;padding:24px;min-height:400px;margin-bottom:24px;overflow:hidden;box-shadow:inset 0 0 30px rgba(0,0,0,0.2);}';
  html += '.fa-field::before{content:"";position:absolute;top:50%;left:0;right:0;height:3px;background:rgba(255,255,255,0.6);}';
  html += '.fa-field::after{content:"";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:100px;height:100px;border:3px solid rgba(255,255,255,0.6);border-radius:50%;}';
  html += '.fa-circle{position:absolute;width:20px;height:20px;border:2px solid rgba(255,255,255,0.6);border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%);}';
  html += '.fa-line{display:flex;justify-content:center;gap:10px;margin-bottom:24px;flex-wrap:wrap;}';
  html += '.fa-player{position:relative;display:flex;flex-direction:column;align-items:center;width:72px;}';
  html += '.fa-badge{position:absolute;top:-10px;right:-10px;display:flex;flex-wrap:wrap;gap:2px;max-width:48px;justify-content:flex-end;}';
  html += '.fa-badge span{font-size:13px;background:rgba(255,255,255,0.9);border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;}';
  html += '.fa-name{font-size:10px;color:white;text-align:center;background:rgba(0,0,0,0.6);padding:3px 6px;border-radius:6px;max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;}';
  html += '.fa-num{position:absolute;top:-6px;left:-6px;width:22px;height:22px;background:white;color:#333;border-radius:50%;font-size:11px;font-weight:bold;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.3);}';
  html += '.fa-role{font-size:9px;color:rgba(255,255,255,0.8);margin-top:2px;}';
  html += '.fa-val{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:white;border-radius:12px;margin-bottom:8px;border:1px solid #eee;}';
  html += '.fa-val:hover{border-color:#4CAF50;}';
  html += '.fa-val-name{flex:1;}';
  html += '.fa-val-nome{font-weight:600;font-size:14px;}';
  html += '.fa-val-role{font-size:11px;color:#888;margin-top:2px;}';
  html += '.fa-val-badge{margin:0 12px;font-size:16px;}';
  html += '.fa-val-voto{padding:10px 16px;background:#4CAF50;color:white;border:none;border-radius:10px;font-weight:bold;font-size:16px;min-width:70px;cursor:pointer;}';
  html += '.fa-section h4{margin:0 0 16px;font-size:16px;color:#333;}';
  html += '.fa-empty{text-align:center;padding:40px;color:#888;}';
  html += '</style>';
  
  html += '<div class="fa">';
  
  // HEADER (senza risultato)
  html += '<div class="fa-title">';
  html += '<h3>👥 Formazione Schierata</h3>';
  html += '<p>' + window.YFM.getSocietaName() + ' vs ' + match.avversario + ' | ' + match.competizione + '</p>';
  html += '</div>';
  
  // CAMPO
  html += '<div class="fa-field"><div class="fa-circle"></div>';
  
  const linee = { POR: [], DIF: [], CEN: [], ATT: [] };
  titolari.forEach(g => {
    const acr = RUOLO_ACR[g.ruolo] || 'ALT';
    if (linee[acr]) linee[acr].push(g);
  });
  
  if (linee.POR.length) html += '<div class="fa-line">' + linee.POR.map(g => renderPlayerField(g, eventiByPlayer)).join('') + '</div>';
  if (linee.DIF.length) html += '<div class="fa-line">' + linee.DIF.map(g => renderPlayerField(g, eventiByPlayer)).join('') + '</div>';
  if (linee.CEN.length) html += '<div class="fa-line">' + linee.CEN.map(g => renderPlayerField(g, eventiByPlayer)).join('') + '</div>';
  if (linee.ATT.length) html += '<div class="fa-line">' + linee.ATT.map(g => renderPlayerField(g, eventiByPlayer)).join('') + '</div>';
  
  html += '</div>';
  
  // VALUTAZIONI
  html += '<div class="fa-section">';
  html += '<h4>⭐ Valutazioni Giocatori</h4>';
  
  const tutti = [...titolari, ...riserve].sort((a, b) => (a.cognome || '').localeCompare(b.cognome || ''));
  
  if (tutti.length === 0) {
    html += '<div class="fa-empty">Nessun giocatore in formazione</div>';
  } else {
    html += '<div>';
    tutti.forEach(g => {
      const events = eventiByPlayer[g.id] || [];
      const val = valutazioniMap[g.id] || {};
      const exVoto = val.voto || 6;
      const acr = RUOLO_ACR[g.ruolo] || '';
      const nomeCorto = g.cognome + ' ' + (g.nome || '')[0] + '.';
      const badgeHtml = events.length ? '<span class="fa-val-badge">' + events.map(e => EVENTI_ICON[e.tipo] || '•').join('') + '</span>' : '';
      
      html += '<div class="fa-val">';
      html += '<div class="fa-val-name">';
      html += '<div class="fa-val-nome">' + nomeCorto + '</div>';
      html += '<div class="fa-val-role">' + acr + '</div>';
      html += '</div>';
      html += badgeHtml;
      html += '<select class="fa-val-voto" data-vid="' + g.id + '" style="background:#4CAF50;">';
      html += '<option value="">-</option>';
      for (let v = 4; v <= 10; v += 0.5) {
        html += '<option value="' + v + '"' + (exVoto == v ? ' selected' : '') + '>' + v.toString().replace('.', ',') + '</option>';
      }
      html += '</select></div>';
    });
    html += '</div>';
    
    html += '<button class="btn btn-primary" id="saveValBtn" style="margin-top:20px;width:100%;padding:14px;font-size:16px;">💾 Salva Valutazioni</button>';
  }
  html += '</div></div>';
  
  const footer = '<button class="btn btn-secondary" id="modalCancel">Chiudi</button>';
  const modal = createModal('👥 Formazione - ' + match.avversario, html, footer, '700px');
  
  const saveBtn = document.getElementById('saveValBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      showLoading();
      const valutazioni = [];
      document.querySelectorAll('.fa-val-voto').forEach(sel => {
        const pid = sel.dataset.vid;
        const voto = sel.value;
        if (voto) valutazioni.push({ calciatore_id: pid, voto: parseFloat(voto) });
      });
      
      if (valutazioni.length > 0) {
        await apiFetch('/partite/' + mid + '/valutazioni', {
          method: 'POST',
          body: JSON.stringify({ valutazioni })
        }).catch(err => console.error('Errore:', err));
      }
      
      hideLoading();
      alert('✅ Valutazioni salvate!');
    });
  }
}

function renderPlayerField(g, eventiByPlayer) {
  const events = eventiByPlayer[g.id] || [];
  const acr = RUOLO_ACR[g.ruolo] || '';
  const nomeCorto = (g.cognome || '').substring(0, 8);
  const num = g.formazione?.numeroMaglia || g.numeroMaglia || '';
  
  let badgeHtml = '';
  if (events.length) {
    badgeHtml = '<div class="fa-badge">';
    events.forEach(e => { badgeHtml += '<span>' + (EVENTI_ICON[e.tipo] || '•') + '</span>'; });
    badgeHtml += '</div>';
  }
  
  return '<div class="fa-player">' +
    '<div class="fa-num">' + num + '</div>' +
    badgeHtml +
    '<div class="fa-name">' + nomeCorto + '</div>' +
    '<div class="fa-role">' + acr + '</div>' +
    '</div>';
}

function createModal(title, content, footer, maxW) {
  const existing = document.getElementById('currentModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'currentModal';
  modal.innerHTML = '<div class="modal-content" style="max-width:' + (maxW || '600px') + ';"><div class="modal-header"><h2>' + title + '</h2><button class="modal-close-btn" id="modalCloseX">×</button></div><div class="modal-body">' + content + '</div>' + (footer ? '<div class="modal-footer">' + footer + '</div>' : '') + '</div>';
  document.body.appendChild(modal);
  const close = () => { const m = document.getElementById('currentModal'); if (m) m.remove(); };
  document.getElementById('modalCloseX').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  const cancelBtn = document.getElementById('modalCancel');
  if (cancelBtn) cancelBtn.addEventListener('click', close);
  return { modal, closeModal: close, close };
}
