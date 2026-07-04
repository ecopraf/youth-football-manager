/**
 * trainingSettings.js - Pagina "⚙️ Impostazioni" allenamenti
 * Settimana tipo + gestione template sedute
 */

import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';
import { formatTime } from '../../utils/formatters';
import { loadTrainingData } from './trainingData';

export default async function loadTrainingSettings() {
  const c = document.getElementById('pageContent');
  c.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';

  const trainingData = await loadTrainingData();
  if (!trainingData) return;

  const { config } = trainingData;
  const templates = await apiFetch('/squadre/' + window.YFM.squadraId + '/training-templates').catch(() => []);

  c.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <h1 class="page-title">⚙️ Impostazioni Allenamenti</h1>
    </div>
    ${renderConfig(config)}
    ${renderTemplates(templates)}
  `;

  attachConfigListeners(config);
  attachTemplateListeners(templates);
}

function renderConfig(config) {
  const giorni = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  let html = `<div class="card" data-help="settings.settimana" style="margin-bottom:16px;">
    <h3 class="section-title">📅 Settimana Tipo</h3>
    ${config.length === 0
      ? '<p style="color:var(--gray);">Nessun allenamento configurato.</p>'
      : config.map(c => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f0f0;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="background:#667eea;color:white;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:600;">${giorni[c.giorno_settimana]}</span>
            <span style="font-size:14px;">${formatTime(c.ora_inizio)}${c.ora_fine ? ' - ' + formatTime(c.ora_fine) : ''}</span>
            <span style="font-size:12px;color:#6c757d;">${c.luogo || ''}</span>
          </div>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-secondary btn-small btn-edit-config" data-tid="${c.id}" data-g="${c.giorno_settimana}" data-i="${c.ora_inizio}" data-f="${c.ora_fine}" data-l="${c.luogo || ''}">✏️</button>
            <button class="btn btn-secondary btn-small btn-del-config" data-tid="${c.id}">🗑️</button>
          </div>
        </div>`).join('')}
    <button class="btn btn-primary btn-small" id="btnAddConfig" data-help="settings.aggiungiGiorno" style="margin-top:12px;">+ Aggiungi giorno</button>
  </div>`;
  return html;
}

function renderTemplates(templates) {
  const TIPI_FASE = [
    { id: 'riscaldamento', label: 'Riscaldamento', icon: '🏃', color: '#f59e0b' },
    { id: 'tecnica', label: 'Tecnica', icon: '⚽', color: '#3b82f6' },
    { id: 'tattica', label: 'Tattica', icon: '🧠', color: '#8b5cf6' },
    { id: 'atletica', label: 'Atletica', icon: '💪', color: '#ef4444' },
    { id: 'partita', label: 'Partita', icon: '🏟️', color: '#22c55e' },
    { id: 'defaticamento', label: 'Defaticamento', icon: '🧘', color: '#6b7280' }
  ];
  const TIPO_COLORS = { 'Tattico': '#8b5cf6', 'Tecnico': '#3b82f6', 'Atletico': '#ef4444', 'Partita a tema': '#22c55e', 'Possesso palla': '#06b6d4', 'Difensivo': '#f59e0b', 'Misto': '#6b7280' };

  let html = `<div class="card" data-help="settings.templateList" style="margin-bottom:16px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h3 class="section-title" style="margin:0;">📋 Template Sedute</h3>
      <button class="btn btn-primary btn-small" id="btnNewTemplate">+ Nuovo Template</button>
    </div>`;
  if (templates.length === 0) {
    html += `<p style="color:#6c757d;font-size:13px;">Nessun template salvato.</p>`;
  } else {
    html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;">`;
    templates.forEach((t, idx) => {
      const prog = t.programma || {};
      const fasi = prog.fasi || [];
      const durataTotale = fasi.reduce((s, f) => s + (f.durata || 0), 0);
      const tipoColor = TIPO_COLORS[prog.tipo] || '#6b7280';

      html += `<div class="template-card" data-idx="${idx}" style="background:#f8f9fa;border:1px solid #eee;border-radius:10px;padding:10px;cursor:pointer;transition:all 0.2s;">`;
      html += `<div style="font-size:13px;font-weight:700;margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.nome}</div>`;
      html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap;">`;
      if (prog.tipo) html += `<span style="background:${tipoColor};color:white;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;">${prog.tipo}</span>`;
      html += `<span style="font-size:10px;color:#6c757d;">⏱️${durataTotale}' • ${fasi.length} fasi</span>`;
      html += `</div>`;
      if (fasi.length > 0) {
        html += `<div style="display:flex;flex-wrap:wrap;gap:3px;">`;
        fasi.forEach(f => {
          const faseInfo = TIPI_FASE.find(tf => tf.id === f.tipo) || TIPI_FASE[0];
          html += `<span style="background:${faseInfo.color}20;color:${faseInfo.color};padding:1px 5px;border-radius:8px;font-size:9px;font-weight:600;">${faseInfo.icon}${f.durata||0}'</span>`;
        });
        html += `</div>`;
      }
      html += `</div>`;
    });
    html += `</div>`;
  }
  html += `</div>`;
  return html;
}

function attachConfigListeners(config) {
  document.getElementById('btnAddConfig')?.addEventListener('click', () => openConfigForm(null, null, null, null, null));
  document.querySelectorAll('.btn-edit-config').forEach(b => {
    b.addEventListener('click', () => openConfigForm(b.dataset.tid, b.dataset.g, b.dataset.i, b.dataset.f, b.dataset.l));
  });
  document.querySelectorAll('.btn-del-config').forEach(b => {
    b.addEventListener('click', async () => {
      if (!b.dataset.tid || !confirm('Eliminare?')) return;
      await apiFetch('/allenamenti/config/' + b.dataset.tid, { method: 'DELETE' });
      loadTrainingSettings();
    });
  });
}

function attachTemplateListeners(templates) {
  // Click su card → apre modale dettaglio/modifica
  document.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.idx);
      openTemplateModal(templates[idx], templates);
    });
  });

  // Nuovo template
  document.getElementById('btnNewTemplate')?.addEventListener('click', () => {
    openTemplateModal(null, templates);
  });
}

const TIPI_SEDUTA = ['Tattico', 'Tecnico', 'Atletico', 'Partita a tema', 'Possesso palla', 'Difensivo', 'Misto'];
const TIPI_FASE_MODAL = [
  { id: 'riscaldamento', label: 'Riscaldamento', icon: '🏃', color: '#f59e0b' },
  { id: 'tecnica', label: 'Tecnica', icon: '⚽', color: '#3b82f6' },
  { id: 'tattica', label: 'Tattica', icon: '🧠', color: '#8b5cf6' },
  { id: 'atletica', label: 'Atletica', icon: '💪', color: '#ef4444' },
  { id: 'partita', label: 'Partita', icon: '🏟️', color: '#22c55e' },
  { id: 'defaticamento', label: 'Defaticamento', icon: '🧘', color: '#6b7280' }
];

let modalFasi = [];

function openTemplateModal(template, allTemplates) {
  const isNew = !template;
  const prog = template?.programma || {};
  modalFasi = prog.fasi ? JSON.parse(JSON.stringify(prog.fasi)) : [];
  const materialeUsato = prog.materiale || [];

  const MATERIALE_OPTIONS = [
    { id: 'coni', label: '🔶 Coni' }, { id: 'paletti', label: '🔷 Paletti' },
    { id: 'over', label: '🟠 Over' }, { id: 'casacche', label: '🟡 Casacche' },
    { id: 'porte_piccole', label: '⬜ Porte piccole' }, { id: 'scala_agilita', label: '🪜 Scala agilità' },
    { id: 'palloni', label: '⚽ Palloni' }, { id: 'elastici', label: '🟣 Elastici' }
  ];

  const existing = document.getElementById('currentModal');
  if (existing) existing.remove();

  let content = `<div style="max-height:70vh;overflow-y:auto;padding:4px;">`;
  content += `<div class="form-group" style="margin-bottom:12px;" data-help="template.nome"><label style="font-size:12px;font-weight:600;">Nome template</label><input id="tplNome" value="${template?.nome || ''}" placeholder="Es. Riscaldamento + Possesso" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;"></div>`;
  content += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">`;
  content += `<div class="form-group" style="margin:0;"><label style="font-size:12px;font-weight:600;">Tipo seduta</label><select id="tplTipo" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;"><option value="">-- Seleziona --</option>${TIPI_SEDUTA.map(t => `<option value="${t}" ${prog.tipo===t?'selected':''}>${t}</option>`).join('')}</select></div>`;
  content += `<div class="form-group" style="margin:0;"><label style="font-size:12px;font-weight:600;">Obiettivo</label><input id="tplObiettivo" value="${prog.obiettivo || ''}" placeholder="Es. Sviluppo gioco" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;"></div>`;
  content += `</div>`;
  // Fasi
  content += `<div style="margin-bottom:12px;" data-help="template.fasi"><label style="display:block;font-size:12px;font-weight:600;margin-bottom:8px;">Fasi della seduta</label><div id="tplFasiContainer">${modalFasi.length > 0 ? modalFasi.map((f,i) => renderTplFase(f,i)).join('') : '<p style="font-size:12px;color:#94a3b8;">Nessuna fase.</p>'}</div>`;
  content += `<div id="tplDurata" style="font-size:11px;color:#64748b;margin-top:6px;text-align:right;">Durata: <strong>${modalFasi.reduce((s,f)=>s+(f.durata||0),0)}</strong> min</div>`;
  content += `<button class="btn btn-secondary btn-small" id="btnTplAddFase" style="margin-top:6px;">+ Aggiungi Fase</button></div>`;
  // Materiale
  content += `<div class="form-group" style="margin-bottom:12px;" data-help="template.materiale"><label style="font-size:12px;font-weight:600;">Materiale</label><div id="tplMaterialeGrid" style="display:flex;flex-wrap:wrap;gap:6px;">${MATERIALE_OPTIONS.map(m => `<span class="tpl-mat-chip" data-mat="${m.id}" style="padding:4px 10px;border-radius:16px;font-size:11px;cursor:pointer;border:1px solid #e2e8f0;background:${materialeUsato.includes(m.id)?'#667eea':'white'};color:${materialeUsato.includes(m.id)?'white':'#333'};transition:all 0.15s;">${m.label}</span>`).join('')}</div></div>`;
  // Note
  content += `<div class="form-group"><label style="font-size:12px;font-weight:600;">Note</label><textarea id="tplNote" rows="2" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">${prog.note || ''}</textarea></div>`;
  content += `</div>`;

  const footer = `<button class="btn btn-secondary" id="tplCancel">Annulla</button>${!isNew ? '<button class="btn btn-danger btn-small" id="tplDelete" style="margin-left:auto;">🗑️ Elimina</button>' : ''}<button class="btn btn-primary" id="tplSave">💾 ${isNew ? 'Crea' : 'Salva'}</button>`;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay'; modal.id = 'currentModal';
  modal.innerHTML = `<div class="modal-content" style="max-width:600px;"><div class="modal-header"><h2>${isNew ? 'Nuovo' : 'Modifica'} Template</h2><button class="modal-close-btn" id="tplCloseX">×</button></div><div class="modal-body">${content}</div><div class="modal-footer" style="display:flex;gap:8px;">${footer}</div></div>`;
  document.body.appendChild(modal);

  const close = () => document.getElementById('currentModal')?.remove();
  document.getElementById('tplCloseX').addEventListener('click', close);
  document.getElementById('tplCancel').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  // Materiale chips toggle
  document.querySelectorAll('.tpl-mat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const isActive = chip.style.background === 'rgb(102, 126, 234)';
      chip.style.background = isActive ? 'white' : '#667eea';
      chip.style.color = isActive ? '#333' : 'white';
    });
  });

  // Fasi listeners
  document.getElementById('btnTplAddFase')?.addEventListener('click', () => openTplFaseForm(null));
  attachTplFasiListeners();

  // Delete
  document.getElementById('tplDelete')?.addEventListener('click', async () => {
    if (!await confirm('Eliminare questo template?')) return;
    showLoading();
    try {
      await apiFetch('/training-templates/' + template.id, { method: 'DELETE' });
      hideLoading(); close(); loadTrainingSettings();
    } catch(e) { hideLoading(); alert('Errore: ' + e.message); }
  });

  // Save
  document.getElementById('tplSave').addEventListener('click', async () => {
    const nome = document.getElementById('tplNome').value.trim();
    if (!nome) { alert('Inserisci un nome'); return; }
    const materiale = Array.from(document.querySelectorAll('.tpl-mat-chip')).filter(c => c.style.color === 'white').map(c => c.dataset.mat);
    const programma = {
      tipo: document.getElementById('tplTipo').value,
      obiettivo: document.getElementById('tplObiettivo').value,
      fasi: [...modalFasi],
      materiale,
      note: document.getElementById('tplNote').value
    };
    showLoading();
    try {
      if (isNew) {
        await apiFetch('/squadre/' + window.YFM.squadraId + '/training-templates', { method: 'POST', body: JSON.stringify({ nome, programma }) });
      } else {
        await apiFetch('/training-templates/' + template.id, { method: 'DELETE' });
        await apiFetch('/squadre/' + window.YFM.squadraId + '/training-templates', { method: 'POST', body: JSON.stringify({ nome, programma }) });
      }
      hideLoading(); close(); loadTrainingSettings();
    } catch(e) { hideLoading(); alert('Errore: ' + e.message); }
  });
}

function renderTplFase(fase, index) {
  const tipoInfo = TIPI_FASE_MODAL.find(t => t.id === fase.tipo) || TIPI_FASE_MODAL[0];
  return `<div style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:white;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:4px;">
    <span style="background:${tipoInfo.color}20;padding:2px 6px;border-radius:6px;font-size:11px;">${tipoInfo.icon}</span>
    <span style="flex:1;font-size:12px;font-weight:500;">${fase.nome || tipoInfo.label}</span>
    <span style="font-size:10px;color:#64748b;">${fase.durata||0}'</span>
    <button class="btn-tpl-fase-up" data-idx="${index}" style="background:none;border:none;cursor:pointer;font-size:11px;padding:0 2px;" title="Su">▲</button>
    <button class="btn-tpl-fase-down" data-idx="${index}" style="background:none;border:none;cursor:pointer;font-size:11px;padding:0 2px;" title="Giù">▼</button>
    <button class="btn-tpl-fase-edit" data-idx="${index}" style="background:none;border:none;cursor:pointer;font-size:12px;padding:0 2px;" title="Modifica">✏️</button>
    <button class="btn-tpl-fase-del" data-idx="${index}" style="background:none;border:none;cursor:pointer;font-size:12px;padding:0 2px;" title="Elimina">✕</button>
  </div>`;
}

function attachTplFasiListeners() {
  document.querySelectorAll('.btn-tpl-fase-del').forEach(btn => {
    btn.addEventListener('click', () => { modalFasi.splice(parseInt(btn.dataset.idx), 1); refreshTplFasi(); });
  });
  document.querySelectorAll('.btn-tpl-fase-up').forEach(btn => {
    btn.addEventListener('click', () => { const i = parseInt(btn.dataset.idx); if (i > 0) { [modalFasi[i-1], modalFasi[i]] = [modalFasi[i], modalFasi[i-1]]; refreshTplFasi(); } });
  });
  document.querySelectorAll('.btn-tpl-fase-down').forEach(btn => {
    btn.addEventListener('click', () => { const i = parseInt(btn.dataset.idx); if (i < modalFasi.length-1) { [modalFasi[i], modalFasi[i+1]] = [modalFasi[i+1], modalFasi[i]]; refreshTplFasi(); } });
  });
  document.querySelectorAll('.btn-tpl-fase-edit').forEach(btn => {
    btn.addEventListener('click', () => { openTplFaseForm(parseInt(btn.dataset.idx)); });
  });
}

function refreshTplFasi() {
  const container = document.getElementById('tplFasiContainer');
  if (!container) return;
  container.innerHTML = modalFasi.length > 0 ? modalFasi.map((f,i) => renderTplFase(f,i)).join('') : '<p style="font-size:12px;color:#94a3b8;">Nessuna fase.</p>';
  document.getElementById('tplDurata').innerHTML = `Durata: <strong>${modalFasi.reduce((s,f)=>s+(f.durata||0),0)}</strong> min`;
  attachTplFasiListeners();
}

function openTplFaseForm(editIdx) {
  const isEdit = editIdx !== null;
  const fase = isEdit ? modalFasi[editIdx] : {};
  document.getElementById('tplFaseForm')?.remove();
  const container = document.getElementById('tplFasiContainer');
  const formHtml = `<div id="tplFaseForm" style="border:1px solid #667eea;border-radius:8px;padding:10px;margin-bottom:6px;background:#f8faff;">
    <div style="display:grid;grid-template-columns:1fr 1fr 60px;gap:6px;margin-bottom:6px;">
      <select id="tplFaseTipo" style="padding:6px;border:1px solid #e2e8f0;border-radius:6px;font-size:11px;">${TIPI_FASE_MODAL.map(t => `<option value="${t.id}" ${fase.tipo===t.id?'selected':''}>${t.icon} ${t.label}</option>`).join('')}</select>
      <input id="tplFaseNome" value="${fase.nome||''}" placeholder="Nome" style="padding:6px;border:1px solid #e2e8f0;border-radius:6px;font-size:11px;">
      <input id="tplFaseDurata" type="number" value="${fase.durata||15}" min="5" max="60" step="5" style="padding:6px;border:1px solid #e2e8f0;border-radius:6px;font-size:11px;">
    </div>
    <div style="display:flex;gap:6px;"><button class="btn btn-primary btn-small" id="tplFaseOk" style="font-size:11px;">${isEdit?'Aggiorna':'Aggiungi'}</button><button class="btn btn-secondary btn-small" id="tplFaseNo" style="font-size:11px;">Annulla</button></div>
  </div>`;
  container.insertAdjacentHTML('beforeend', formHtml);
  document.getElementById('tplFaseNo')?.addEventListener('click', () => document.getElementById('tplFaseForm')?.remove());
  document.getElementById('tplFaseOk')?.addEventListener('click', () => {
    const tipoVal = document.getElementById('tplFaseTipo').value;
    const tipoInfo = TIPI_FASE_MODAL.find(t => t.id === tipoVal);
    const newFase = { id: `f_${Date.now()}`, tipo: tipoVal, nome: document.getElementById('tplFaseNome').value || tipoInfo?.label || '', durata: parseInt(document.getElementById('tplFaseDurata').value) || 15 };
    if (isEdit) modalFasi[editIdx] = newFase; else modalFasi.push(newFase);
    document.getElementById('tplFaseForm')?.remove();
    refreshTplFasi();
  });
}

function openConfigForm(tid, g, i, f, l) {
  g = g || 1; i = i || '17:00'; f = f || '18:30'; l = l || '';
  const giorni = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];

  const existing = document.getElementById('currentModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay'; modal.id = 'currentModal';
  modal.innerHTML = `<div class="modal-content" style="max-width:500px;">
    <div class="modal-header"><h2>${tid ? 'Modifica' : 'Nuovo'} Giorno</h2><button class="modal-close-btn" id="modalCloseX">×</button></div>
    <div class="modal-body">
      <div class="form-group" style="margin-bottom:12px;"><label>Giorno</label><select id="tfG">${giorni.map((gn,ix) => `<option value="${ix}" ${parseInt(g)===ix?'selected':''}>${gn}</option>`).join('')}</select></div>
      <div class="form-grid"><div class="form-group"><label>Inizio</label><input id="tfI" type="time" value="${i}"></div><div class="form-group"><label>Fine</label><input id="tfF" type="time" value="${f}"></div></div>
      <div class="form-group" style="margin-top:12px;"><label>Luogo</label><input id="tfL" value="${l}"></div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">Annulla</button><button class="btn btn-primary" id="saveConfigBtn">${tid?'Aggiorna':'Salva'}</button></div>
  </div>`;
  document.body.appendChild(modal);

  const close = () => document.getElementById('currentModal')?.remove();
  document.getElementById('modalCloseX').addEventListener('click', close);
  document.getElementById('modalCancelBtn').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  document.getElementById('saveConfigBtn').addEventListener('click', async () => {
    const data = { giorno_settimana: parseInt(document.getElementById('tfG').value), ora_inizio: document.getElementById('tfI').value, ora_fine: document.getElementById('tfF').value, luogo: document.getElementById('tfL').value };
    showLoading();
    try {
      if (tid) await apiFetch('/allenamenti/config/' + tid, { method: 'PUT', body: JSON.stringify(data) });
      else await apiFetch('/squadre/' + window.YFM.squadraId + '/allenamenti/config', { method: 'POST', body: JSON.stringify(data) });
      hideLoading(); close(); loadTrainingSettings();
    } catch(e) { hideLoading(); alert('Errore: ' + e.message); }
  });
}
