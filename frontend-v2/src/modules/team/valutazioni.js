import { apiFetch } from '../../services/api.js';
import { showLoading, hideLoading } from '../../utils/ui.js';

export async function openValutazioni(mid) {
  const match = window.YFM.allMatches?.find(m => m.id === mid) || {};
  
  let formazione = [];
  
  try {
    const res = await apiFetch('/partite/' + mid + '/formazione');
    formazione = Array.isArray(res) ? res : [];
  } catch(e) {}
  
  if (formazione.length === 0) {
    try {
      const convRes = await apiFetch('/partite/' + mid + '/convocazioni');
      const convocati = (convRes.convocazioni || []).filter(c => c.presente);
      if (convocati.length > 0) {
        const rosaRes = await apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori').catch(() => []);
        const rosaMap = {};
        (rosaRes || []).forEach(g => { rosaMap[g.id] = g; });
        formazione = convocati.map(c => {
          const g = rosaMap[c.calciatoreId] || {};
          return { id: c.calciatoreId, calciatore_id: c.calciatoreId, nome: g.nome || '', cognome: g.cognome || '', posizione: 'Convocato' };
        });
      }
    } catch(e) {}
  }
  
  let valutazioniMap = {};
  try {
    const valRes = await apiFetch('/partite/' + mid + '/valutazioni');
    (valRes.valutazioni || []).forEach(v => { valutazioniMap[v.calciatore_id] = v; });
  } catch(e) {}
  
  formazione.sort((a, b) => (a.cognome || '').localeCompare(b.cognome || ''));
  
  const content = '<div id="valInner"></div>';
  const modal = createModal('⭐ Valutazioni - ' + match.avversario, content, '<button class="btn btn-secondary" id="modalCancel">Chiudi</button><button class="btn btn-primary" id="saveBtn">💾 Salva</button>', '700px');
  
  renderValutazioni(formazione, valutazioniMap);
  
  document.getElementById('saveBtn').addEventListener('click', () => saveValutazioni(mid, modal));
}

function renderValutazioni(formazione, valutazioniMap) {
  const container = document.getElementById('valInner');
  
  let html = '<style>';
  html += '.val{max-height:60vh;overflow-y:auto;padding:8px;}';
  html += '.val-card{display:flex;align-items:center;justify-content:space-between;padding:12px;background:white;border-radius:10px;margin-bottom:8px;border:1px solid #eee;}';
  html += '.val-card:hover{border-color:#667eea;}';
  html += '.val-nome{font-weight:600;font-size:14px;}';
  html += '.val-pos{font-size:11px;color:#888;margin-top:2px;}';
  html += '.val-select{padding:10px 16px;border:2px solid #667eea;border-radius:10px;background:white;font-weight:bold;color:#667eea;font-size:18px;min-width:80px;text-align:center;}';
  html += '.val-note{width:100%;padding:6px 8px;border:1px solid #eee;border-radius:6px;font-size:12px;margin-top:6px;}';
  html += '.avg-box{text-align:center;padding:20px;background:linear-gradient(135deg,#667eea20,#764ba220);border-radius:12px;margin-bottom:16px;border:2px solid #667eea40;}';
  html += '.avg-num{font-size:48px;font-weight:bold;color:#667eea;}';
  html += '.avg-label{font-size:12px;color:#888;}';
  html += '.empty{padding:40px;text-align:center;color:#888;font-size:14px;}';
  html += '</style>';
  
  html += '<div class="val">';
  
  // Media voti
  const voti = Object.values(valutazioniMap).map(v => v.voto).filter(v => v);
  const avg = voti.length > 0 ? (voti.reduce((a, b) => a + b, 0) / voti.length).toFixed(1) : '-';
  
  html += '<div class="avg-box">';
  html += '<div class="avg-num">' + avg + '</div>';
  html += '<div class="avg-label">' + voti.length + ' voti assegnati</div>';
  html += '</div>';
  
  if (formazione.length === 0) {
    html += '<div class="empty">Nessun giocatore presente</div>';
  } else {
    formazione.forEach(g => {
      const ex = valutazioniMap[g.id] || {};
      const pc = g.posizione === 'Titolare' ? '#27AE60' : g.posizione === 'Panchina' ? '#F39C12' : '#3498DB';
      
      html += '<div class="val-card">';
      html += '<div style="flex:1;">';
      html += '<div class="val-nome">' + (g.cognome || '').toUpperCase() + ' ' + (g.nome || '') + '</div>';
      html += '<div class="val-pos" style="color:' + pc + ';">' + (g.posizione || 'Convocato') + '</div>';
      html += '<input type="text" class="val-note" placeholder="Note..." value="' + (ex.nota_allenatore || '') + '" data-nid="' + g.id + '">';
      html += '</div>';
      html += '<select class="val-select" data-vid="' + g.id + '">';
      html += '<option value="">-</option>';
      for (let v = 4; v <= 10; v += 0.5) {
        html += '<option value="' + v + '"' + (ex.voto == v ? ' selected' : '') + '>' + v.toString().replace('.', ',') + '</option>';
      }
      html += '</select>';
      html += '</div>';
    });
  }
  
  html += '</div>';
  container.innerHTML = html;
  
  // Aggiorna media quando cambia un voto
  container.querySelectorAll('.val-select').forEach(sel => {
    sel.addEventListener('change', updateAvg);
  });
}

function updateAvg() {
  let sum = 0, count = 0;
  document.querySelectorAll('.val-select').forEach(sel => {
    const v = parseFloat(sel.value);
    if (v) { sum += v; count++; }
  });
  const avg = count > 0 ? (sum / count).toFixed(1) : '-';
  const avgDiv = document.querySelector('.avg-num');
  const labelDiv = document.querySelector('.avg-label');
  if (avgDiv) avgDiv.textContent = avg;
  if (labelDiv) labelDiv.textContent = count + ' voti assegnati';
}

async function saveValutazioni(mid, modal) {
  showLoading();
  const errors = [];
  
  try {
    const valutazioni = [];
    document.querySelectorAll('.val-select').forEach(sel => {
      const pid = sel.dataset.vid;
      const voto = sel.value;
      const nota = document.querySelector('[data-nid="' + pid + '"]')?.value;
      if (voto) {
        valutazioni.push({ calciatore_id: pid, voto: parseFloat(voto), nota_allenatore: nota || null });
      }
    });
    
    if (valutazioni.length > 0) {
      await apiFetch('/partite/' + mid + '/valutazioni', {
        method: 'POST',
        body: JSON.stringify({ valutazioni })
      }).catch(err => errors.push('Valutazioni: ' + err.message));
    }
    
    hideLoading();
    
    if (errors.length > 0) {
      alert('⚠️ Errori: ' + errors.join(', '));
    } else {
      modal.close();
      alert('✅ Valutazioni salvate!');
    }
  } catch (err) {
    hideLoading();
    alert('Errore: ' + err.message);
  }
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
  const cancelBtn = document.getElementById('modalCancel');
  if (cancelBtn) cancelBtn.addEventListener('click', close);
  return { modal, closeModal: close, close };
}
