/**
 * trainingSessions.js - Pagina "📋 Sedute"
 * Calendario mensile + dettaglio seduta (programma con fasi, tipo, template)
 */

import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';
import { renderCalendar, attachCalendarListeners, setOnDateSelect, selectTodayIfTraining, getSelectedDate } from './trainingCalendar';
import { loadTrainingData } from './trainingData';

const TIPI_SEDUTA = ['Tattico', 'Tecnico', 'Atletico', 'Partita a tema', 'Possesso palla', 'Difensivo', 'Misto'];
const TIPI_FASE = [
  { id: 'riscaldamento', label: 'Riscaldamento', icon: '🏃', color: '#f59e0b' },
  { id: 'tecnica', label: 'Tecnica', icon: '⚽', color: '#3b82f6' },
  { id: 'tattica', label: 'Tattica', icon: '🧠', color: '#8b5cf6' },
  { id: 'atletica', label: 'Atletica', icon: '💪', color: '#ef4444' },
  { id: 'partita', label: 'Partita', icon: '🏟️', color: '#22c55e' },
  { id: 'defaticamento', label: 'Defaticamento', icon: '🧘', color: '#6b7280' }
];
const MATERIALE_OPTIONS = [
  { id: 'coni', label: '🔶 Coni' }, { id: 'paletti', label: '🔷 Paletti' },
  { id: 'over', label: '🟠 Over' }, { id: 'casacche', label: '🟡 Casacche' },
  { id: 'porte_piccole', label: '⬜ Porte piccole' }, { id: 'scala_agilita', label: '🪜 Scala agilità' },
  { id: 'palloni', label: '⚽ Palloni' }, { id: 'elastici', label: '🟣 Elastici' }
];

let trainingData = null;
let currentFasi = [];

export default async function loadTrainingSessions() {
  const c = document.getElementById('pageContent');
  c.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';

  trainingData = await loadTrainingData();
  if (!trainingData) return;

  const { config, presenze, partite } = trainingData;
  selectTodayIfTraining(config);

  setOnDateSelect(async (date) => {
    const container = document.getElementById('sessionContainer');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:20px;color:#6c757d;"><div class="spinner"></div></div>';
    const programma = await loadProgrammaFromDB(date);
    container.innerHTML = renderSessionDetail(date, programma);
    attachSessionListeners(date);
  });

  window._trainingRefreshCalendar = () => {
    const calEl = document.getElementById('trainingCalendar');
    if (calEl) { calEl.innerHTML = renderCalendar(config, presenze, partite); attachCalendarListeners(); }
  };

  const initialDate = getSelectedDate();
  const initialProgramma = initialDate ? await loadProgrammaFromDB(initialDate) : null;

  c.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <h1 class="page-title">📋 Sedute - ${window.YFM.getSquadraName()}</h1>
    </div>
    <div class="card" style="margin-bottom:16px;"><div id="trainingCalendar">${renderCalendar(config, presenze, partite)}</div></div>
    <div class="card" style="margin-bottom:16px;" id="sessionContainer">${renderSessionDetail(initialDate, initialProgramma)}</div>
  `;

  attachCalendarListeners();
  attachSessionListeners(initialDate);
}

function renderSessionDetail(date, programma) {
  if (!date) return `<div style="text-align:center;padding:40px;color:#6c757d;"><p style="font-size:16px;">📅 Seleziona un giorno dal calendario</p></div>`;

  const giorni = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  const d = new Date(date);
  const dayLabel = giorni[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear();

  programma = programma || {};
  const tipo = programma.tipo || '';
  const obiettivo = programma.obiettivo || '';
  const materialeUsato = programma.materiale || [];
  const noteAllenamento = programma.note || '';
  currentFasi = programma.fasi ? [...programma.fasi] : [];

  let html = `<style>
    .program-section{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:16px}
    .program-field{margin-bottom:12px}
    .program-field label{display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:4px}
    .program-field input,.program-field select,.program-field textarea{width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit}
    .program-field textarea{min-height:60px;resize:vertical}
    .materiale-grid{display:flex;flex-wrap:wrap;gap:8px}
    .mat-chip{padding:6px 12px;border-radius:20px;font-size:12px;cursor:pointer;border:1px solid #e2e8f0;background:white;transition:all 0.15s}
    .mat-chip:hover{border-color:#667eea}
    .mat-chip.active{background:#667eea;color:white;border-color:#667eea}
    .fase-card{border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:10px;background:white}
    .fase-header{display:flex;align-items:center;gap:8px}
    .fase-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px}
    .fase-title{font-size:13px;font-weight:600;color:#334155;flex:1}
    .fase-durata{font-size:11px;color:#64748b;background:#f1f5f9;padding:2px 8px;border-radius:10px}
    .fase-actions button{background:none;border:none;cursor:pointer;font-size:14px;padding:2px 4px;border-radius:4px}
    .fase-actions button:hover{background:#f1f5f9}
    .fase-form{border:1px solid #667eea;border-radius:10px;padding:12px;margin-bottom:10px;background:#f8faff}
  </style>`;

  html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
    <div style="font-size:15px;font-weight:600;color:#1a1a2e;">🎯 ${dayLabel}</div>
    <button class="btn btn-secondary btn-small" id="btnApplyTemplate" data-help="training.template">📋 Usa Template</button>
  </div>`;

  html += `<div class="program-section">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="program-field"><label>Tipo seduta</label><select id="sessionTipo" data-help="training.tipoSeduta"><option value="">-- Seleziona --</option>${TIPI_SEDUTA.map(t => `<option value="${t}" ${tipo===t?'selected':''}>${t}</option>`).join('')}</select></div>
      <div class="program-field"><label>Obiettivo</label><input type="text" id="sessionObiettivo" value="${obiettivo}" placeholder="Es. Sviluppo gioco sulle fasce"></div>
    </div>
    <div style="margin-top:12px;">
      <label style="display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:8px;">Fasi della seduta</label>
      <div id="fasiContainer" data-help="training.fasi">${currentFasi.length > 0 ? currentFasi.map((f,i) => renderFaseCard(f,i)).join('') : '<p style="font-size:12px;color:#94a3b8;margin:0;">Nessuna fase. Clicca "+ Aggiungi Fase".</p>'}</div>
      <div id="durataTotale" style="font-size:12px;color:#64748b;margin-top:8px;text-align:right;">Durata: <strong>${currentFasi.reduce((s,f)=>s+(f.durata||0),0)}</strong> min</div>
      <button class="btn btn-secondary btn-small" id="btnAddFase" style="margin-top:8px;">+ Aggiungi Fase</button>
    </div>
    <div class="program-field" style="margin-top:12px;"><label>Materiale</label>
      <div class="materiale-grid" id="materialeGrid">${MATERIALE_OPTIONS.map(m => `<span class="mat-chip ${materialeUsato.includes(m.id)?'active':''}" data-mat="${m.id}">${m.label}</span>`).join('')}</div>
    </div>
    <div class="program-field"><label>Note</label><textarea id="sessionNote" placeholder="Note...">${noteAllenamento}</textarea></div>
  </div>`;

  html += `<div style="display:flex;gap:8px;flex-wrap:wrap;">
    <button class="btn btn-primary" id="btnSaveProgram">🎯 Salva Programma</button>
    <button class="btn btn-secondary" id="btnSaveTemplate" data-help="training.salvaTemplate" style="font-size:12px;">📋 Salva come Template</button>
  </div>`;

  return html;
}

function renderFaseCard(fase, index) {
  const tipoInfo = TIPI_FASE.find(t => t.id === fase.tipo) || TIPI_FASE[0];
  return `<div class="fase-card"><div class="fase-header">
    <div class="fase-icon" style="background:${tipoInfo.color}20;">${tipoInfo.icon}</div>
    <span class="fase-title">${fase.nome || tipoInfo.label}</span>
    <span class="fase-durata">${fase.durata||0} min</span>
    <div class="fase-actions">
      <button class="btn-fase-up" data-idx="${index}">▲</button>
      <button class="btn-fase-down" data-idx="${index}">▼</button>
      <button class="btn-fase-edit" data-idx="${index}">✏️</button>
      <button class="btn-fase-del" data-idx="${index}">🗑️</button>
    </div>
  </div>${fase.descrizione ? `<div style="font-size:12px;color:#475569;margin-top:4px;">${fase.descrizione}</div>` : ''}</div>`;
}

function attachSessionListeners(date) {
  if (!date) return;
  document.querySelectorAll('#materialeGrid .mat-chip').forEach(chip => { chip.addEventListener('click', () => chip.classList.toggle('active')); });
  document.getElementById('btnAddFase')?.addEventListener('click', () => openFaseForm(null));
  attachFasiListeners();
  document.getElementById('btnSaveProgram')?.addEventListener('click', () => saveProgramma(date));
  document.getElementById('btnSaveTemplate')?.addEventListener('click', async () => {
    const nome = prompt('Nome del template:');
    if (!nome) return;
    showLoading();
    try {
      await apiFetch('/squadre/' + window.YFM.squadraId + '/training-templates', { method: 'POST', body: JSON.stringify({ nome, programma: collectProgramma() }) });
      hideLoading(); alert('✅ Template salvato!');
    } catch(e) { hideLoading(); alert('Errore: ' + e.message); }
  });
  document.getElementById('btnApplyTemplate')?.addEventListener('click', () => applyTemplateUI(date));
}

function attachFasiListeners() {
  document.querySelectorAll('.btn-fase-del').forEach(btn => { btn.addEventListener('click', () => { currentFasi.splice(parseInt(btn.dataset.idx), 1); refreshFasiUI(); }); });
  document.querySelectorAll('.btn-fase-edit').forEach(btn => { btn.addEventListener('click', () => openFaseForm(parseInt(btn.dataset.idx))); });
  document.querySelectorAll('.btn-fase-up').forEach(btn => { btn.addEventListener('click', () => { const i=parseInt(btn.dataset.idx); if(i>0){[currentFasi[i-1],currentFasi[i]]=[currentFasi[i],currentFasi[i-1]]; refreshFasiUI();} }); });
  document.querySelectorAll('.btn-fase-down').forEach(btn => { btn.addEventListener('click', () => { const i=parseInt(btn.dataset.idx); if(i<currentFasi.length-1){[currentFasi[i],currentFasi[i+1]]=[currentFasi[i+1],currentFasi[i]]; refreshFasiUI();} }); });
}

function refreshFasiUI() {
  const container = document.getElementById('fasiContainer');
  if (!container) return;
  container.innerHTML = currentFasi.length > 0 ? currentFasi.map((f,i) => renderFaseCard(f,i)).join('') : '<p style="font-size:12px;color:#94a3b8;margin:0;">Nessuna fase.</p>';
  document.getElementById('durataTotale').innerHTML = `Durata: <strong>${currentFasi.reduce((s,f)=>s+(f.durata||0),0)}</strong> min`;
  attachFasiListeners();
}

function openFaseForm(editIdx) {
  const isEdit = editIdx !== null;
  const fase = isEdit ? currentFasi[editIdx] : {};
  document.getElementById('faseFormInline')?.remove();
  const container = document.getElementById('fasiContainer');
  const formHtml = `<div class="fase-form" id="faseFormInline">
    <div style="display:grid;grid-template-columns:1fr 1fr 80px;gap:8px;">
      <div class="program-field"><label>Tipo</label><select id="faseFormTipo">${TIPI_FASE.map(t => `<option value="${t.id}" ${fase.tipo===t.id?'selected':''}>${t.icon} ${t.label}</option>`).join('')}</select></div>
      <div class="program-field"><label>Nome</label><input type="text" id="faseFormNome" value="${fase.nome||''}" placeholder="Es. Rondo 4v2"></div>
      <div class="program-field"><label>Min</label><input type="number" id="faseFormDurata" value="${fase.durata||15}" min="5" max="60" step="5"></div>
    </div>
    <div class="program-field"><label>Descrizione</label><textarea id="faseFormDesc" rows="2" placeholder="Descrivi...">${fase.descrizione||''}</textarea></div>
    <div style="display:flex;gap:8px;margin-top:8px;">
      <button class="btn btn-primary btn-small" id="btnFaseConfirm">${isEdit?'✏️ Aggiorna':'✅ Aggiungi'}</button>
      <button class="btn btn-secondary btn-small" id="btnFaseCancel">Annulla</button>
    </div>
  </div>`;
  container.insertAdjacentHTML('beforeend', formHtml);
  document.getElementById('btnFaseCancel')?.addEventListener('click', () => document.getElementById('faseFormInline')?.remove());
  document.getElementById('btnFaseConfirm')?.addEventListener('click', () => {
    const tipoVal = document.getElementById('faseFormTipo')?.value || 'tecnica';
    const tipoInfo = TIPI_FASE.find(t => t.id === tipoVal);
    const newFase = { id: isEdit ? fase.id : `f_${Date.now()}`, tipo: tipoVal, nome: document.getElementById('faseFormNome')?.value || tipoInfo?.label || '', durata: parseInt(document.getElementById('faseFormDurata')?.value) || 15, descrizione: document.getElementById('faseFormDesc')?.value || '' };
    if (isEdit) currentFasi[editIdx] = newFase; else currentFasi.push(newFase);
    document.getElementById('faseFormInline')?.remove();
    refreshFasiUI();
  });
}

function collectProgramma() {
  return { tipo: document.getElementById('sessionTipo')?.value || '', obiettivo: document.getElementById('sessionObiettivo')?.value || '', fasi: [...currentFasi], materiale: Array.from(document.querySelectorAll('#materialeGrid .mat-chip.active')).map(c => c.dataset.mat), note: document.getElementById('sessionNote')?.value || '' };
}

async function saveProgramma(date) {
  showLoading();
  try {
    await apiFetch('/squadre/' + window.YFM.squadraId + '/training-by-date', { method: 'POST', body: JSON.stringify({ date, programma: collectProgramma() }) });
    hideLoading(); alert('✅ Programma salvato!');
  } catch(e) { hideLoading(); alert('Errore: ' + e.message); }
}

async function loadProgrammaFromDB(date) {
  if (!date || !window.YFM.squadraId) return null;
  try {
    const res = await apiFetch('/squadre/' + window.YFM.squadraId + '/training-by-date/' + date);
    return res.programma || null;
  } catch(e) { return null; }
}

async function applyTemplateUI(date) {
  const templates = await apiFetch('/squadre/' + window.YFM.squadraId + '/training-templates').catch(() => []);
  if (templates.length === 0) { alert('Nessun template salvato.'); return; }

  const TIPO_COLORS = { 'Tattico': '#8b5cf6', 'Tecnico': '#3b82f6', 'Atletico': '#ef4444', 'Partita a tema': '#22c55e', 'Possesso palla': '#06b6d4', 'Difensivo': '#f59e0b', 'Misto': '#6b7280' };

  const existing = document.getElementById('templatePickerModal');
  if (existing) existing.remove();

  const cardsHtml = templates.map((t, idx) => {
    const prog = t.programma || {};
    const fasi = prog.fasi || [];
    const durata = fasi.reduce((s, f) => s + (f.durata || 0), 0);
    const tipoColor = TIPO_COLORS[prog.tipo] || '#6b7280';
    const fasiIcons = fasi.map(f => {
      const info = TIPI_FASE.find(tf => tf.id === f.tipo) || TIPI_FASE[0];
      return `<span style="background:${info.color}20;color:${info.color};padding:1px 5px;border-radius:8px;font-size:9px;font-weight:600;">${info.icon}${f.durata||0}'</span>`;
    }).join('');
    return `<div class="tpl-pick-card" data-idx="${idx}" style="background:#f8f9fa;border:1px solid #eee;border-radius:10px;padding:12px;cursor:pointer;transition:all 0.2s;">
      <div style="font-size:13px;font-weight:700;margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.nome}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap;">
        ${prog.tipo ? `<span style="background:${tipoColor};color:white;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;">${prog.tipo}</span>` : ''}
        <span style="font-size:10px;color:#6c757d;">\u23f1\ufe0f${durata}' \u2022 ${fasi.length} fasi</span>
      </div>
      ${fasiIcons ? `<div style="display:flex;flex-wrap:wrap;gap:3px;">${fasiIcons}</div>` : ''}
    </div>`;
  }).join('');

  const modal = document.createElement('div');
  modal.id = 'templatePickerModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal-content" style="max-width:500px;"><div class="modal-header"><h2>\ud83d\udccb Scegli Template</h2><button class="modal-close-btn" id="tplPickClose">\u00d7</button></div><div class="modal-body" style="max-height:60vh;overflow-y:auto;"><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;">${cardsHtml}</div></div></div>`;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  document.getElementById('tplPickClose').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  modal.querySelectorAll('.tpl-pick-card').forEach(card => {
    card.addEventListener('mouseenter', () => { card.style.borderColor = '#667eea'; card.style.transform = 'translateY(-2px)'; });
    card.addEventListener('mouseleave', () => { card.style.borderColor = '#eee'; card.style.transform = 'none'; });
    card.addEventListener('click', () => {
      const prog = templates[parseInt(card.dataset.idx)].programma || {};
      if (prog.tipo) { const sel = document.getElementById('sessionTipo'); if (sel) sel.value = prog.tipo; }
      if (prog.obiettivo) { const inp = document.getElementById('sessionObiettivo'); if (inp) inp.value = prog.obiettivo; }
      if (prog.note) { const ta = document.getElementById('sessionNote'); if (ta) ta.value = prog.note; }
      if (prog.fasi?.length > 0) currentFasi = JSON.parse(JSON.stringify(prog.fasi));
      refreshFasiUI();
      document.querySelectorAll('#materialeGrid .mat-chip').forEach(chip => { chip.classList.toggle('active', (prog.materiale||[]).includes(chip.dataset.mat)); });
      close();
    });
  });
}
