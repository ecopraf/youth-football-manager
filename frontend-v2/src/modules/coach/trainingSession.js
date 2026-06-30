/**
 * trainingSession.js - Dettaglio seduta (presenze + programma strutturato con fasi)
 */

import { getAvatarColor } from '../../utils/formatters';
import { showLoading, hideLoading } from '../../utils/ui';
import { apiFetch } from '../../services/api';

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
  { id: 'coni', label: '🔶 Coni' },
  { id: 'paletti', label: '🔷 Paletti' },
  { id: 'over', label: '🟠 Over' },
  { id: 'casacche', label: '🟡 Casacche' },
  { id: 'porte_piccole', label: '⬜ Porte piccole' },
  { id: 'scala_agilita', label: '🪜 Scala agilità' },
  { id: 'palloni', label: '⚽ Palloni' },
  { id: 'elastici', label: '🟣 Elastici' }
];

const MOTIVI_ASSENZA = [
  { value: '', label: 'Nessun motivo' },
  { value: 'Impegni Scolastici', label: '📚 Impegni Scolastici' },
  { value: 'Motivi Familiari', label: '👨‍👩‍👧 Motivi Familiari' },
  { value: 'Infortunio', label: '🏥 Infortunio' },
  { value: 'Malattia', label: '🤒 Malattia' }
];

let currentFasi = [];

// Persistenza programma via API
async function getProgramma(date) {
  try {
    const resp = await apiFetch('/squadre/' + window.YFM.squadraId + '/training-by-date/' + date);
    return resp.programma || {};
  } catch { return {}; }
}
async function saveProgrammaToApi(date, programma) {
  try {
    // Cerca training esistente per questa data
    const resp = await apiFetch('/squadre/' + window.YFM.squadraId + '/training-by-date/' + date);
    if (resp.training) {
      // Aggiorna
      await apiFetch('/training/' + resp.training.id + '/programma', {
        method: 'PUT', body: JSON.stringify({ programma })
      });
    } else {
      // Crea nuovo
      await apiFetch('/squadre/' + window.YFM.squadraId + '/training-by-date', {
        method: 'POST', body: JSON.stringify({ date, programma })
      });
    }
  } catch(e) { console.error('Errore salvataggio programma:', e); }
}
// Template via API (condivisi nel workspace)
async function getTemplates() {
  try {
    return await apiFetch('/squadre/' + window.YFM.squadraId + '/training-templates');
  } catch { return []; }
}
async function saveTemplate(nome, programma) {
  await apiFetch('/squadre/' + window.YFM.squadraId + '/training-templates', {
    method: 'POST', body: JSON.stringify({ nome, programma })
  });
}

export async function renderSession(date, trainingData) {
  if (!date) {
    return `<div style="text-align:center;padding:40px;color:#6c757d;">
      <p style="font-size:16px;">📅 Seleziona un giorno dal calendario</p>
      <p style="font-size:13px;">Clicca su un giorno con il pallino verde per vedere il dettaglio</p>
    </div>`;
  }

  const { presenze, giocatori } = trainingData;
  const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const d = new Date(date);
  const dayLabel = giorni[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();

  const presenzeData = (presenze || []).filter(p => p.data === date);
  const assentiIds = presenzeData.filter(p => !p.presente).map(p => p.calciatore_id);
  const hasData = presenzeData.length > 0;
  const sorted = [...(giocatori || [])].sort((a, b) => a.cognome.localeCompare(b.cognome));
  const presentiCount = sorted.length - assentiIds.length;
  const assentiCount = assentiIds.length;

  // Programma dal DB
  const programma = date ? await getProgramma(date) : {};
  const tipo = programma.tipo || '';
  const obiettivo = programma.obiettivo || '';
  const materialeUsato = programma.materiale || [];
  const noteAllenamento = programma.note || '';
  currentFasi = programma.fasi ? JSON.parse(JSON.stringify(programma.fasi)) : [];

  let html = `<style>
    .session-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:8px; }
    .session-title { font-size:15px; font-weight:600; color:#1a1a2e; }
    .session-badge { font-size:11px; padding:4px 10px; border-radius:12px; font-weight:600; }
    .session-badge.registered { background:#d1fae5; color:#065f46; }
    .session-badge.new { background:#fef3c7; color:#92400e; }
    .program-section { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:16px; }
    .program-section h4 { margin:0 0 12px 0; font-size:14px; color:#334155; display:flex; align-items:center; gap:8px; }
    .program-field { margin-bottom:12px; }
    .program-field label { display:block; font-size:12px; font-weight:600; color:#64748b; margin-bottom:4px; }
    .program-field input, .program-field select, .program-field textarea { width:100%; padding:8px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:13px; font-family:inherit; }
    .program-field textarea { min-height:60px; resize:vertical; }
    .program-field input:focus, .program-field select:focus, .program-field textarea:focus { outline:none; border-color:#667eea; box-shadow:0 0 0 3px rgba(102,126,234,0.1); }
    .materiale-grid { display:flex; flex-wrap:wrap; gap:8px; }
    .mat-chip { padding:6px 12px; border-radius:20px; font-size:12px; cursor:pointer; border:1px solid #e2e8f0; background:white; transition:all 0.15s; }
    .mat-chip:hover { border-color:#667eea; }
    .mat-chip.active { background:#667eea; color:white; border-color:#667eea; }
    .fase-card { border:1px solid #e2e8f0; border-radius:10px; padding:12px; margin-bottom:10px; background:white; }
    .fase-card .fase-header { display:flex; align-items:center; gap:8px; margin-bottom:4px; }
    .fase-card .fase-icon { width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:14px; }
    .fase-card .fase-title { font-size:13px; font-weight:600; color:#334155; flex:1; }
    .fase-card .fase-durata { font-size:11px; color:#64748b; background:#f1f5f9; padding:2px 8px; border-radius:10px; }
    .fase-card .fase-actions { display:flex; gap:4px; }
    .fase-card .fase-actions button { background:none; border:none; cursor:pointer; font-size:14px; padding:2px 4px; border-radius:4px; }
    .fase-card .fase-actions button:hover { background:#f1f5f9; }
    .fase-card .fase-desc { font-size:12px; color:#475569; margin-top:4px; }
    .fase-form { border:1px solid #667eea; border-radius:10px; padding:12px; margin-bottom:10px; background:#f8faff; }
    .presenze-summary { display:flex; gap:16px; margin-bottom:12px; font-size:13px; }
    .session-actions { display:flex; gap:8px; margin-top:16px; flex-wrap:wrap; }
  </style>`;

  html += `<div class="session-header">
    <div><div class="session-title">📋 ${dayLabel}</div></div>
    <span class="session-badge ${hasData ? 'registered' : 'new'}">${hasData ? '✅ Registrata' : '🆕 Nuova seduta'}</span>
  </div>`;

  // === PROGRAMMA ===
  html += `<div class="program-section">
    <h4>🎯 Programma Allenamento <button class="btn btn-secondary btn-small" id="btnApplyTemplate" style="margin-left:auto;font-size:11px;">📋 Usa Template</button></h4>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="program-field"><label>Tipo seduta</label><select id="sessionTipo"><option value="">-- Seleziona --</option>${TIPI_SEDUTA.map(t => `<option value="${t}" ${tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="program-field"><label>Obiettivo</label><input type="text" id="sessionObiettivo" value="${obiettivo}" placeholder="Es. Sviluppo gioco sulle fasce"></div>
    </div>
    <div style="margin-top:12px;">
      <label style="display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:8px;">Fasi della seduta</label>
      <div id="fasiContainer">${currentFasi.length > 0 ? currentFasi.map((f, i) => renderFaseCard(f, i)).join('') : '<p style="font-size:12px;color:#94a3b8;margin:0;">Nessuna fase. Clicca "+ Aggiungi Fase".</p>'}</div>
      <div id="durataTotale" style="font-size:12px;color:#64748b;margin-top:8px;text-align:right;">Durata totale: <strong>${currentFasi.reduce((s, f) => s + (f.durata || 0), 0)}</strong> min</div>
      <button class="btn btn-secondary btn-small" id="btnAddFase" style="margin-top:8px;font-size:12px;">+ Aggiungi Fase</button>
    </div>
    <div class="program-field" style="margin-top:12px;"><label>Materiale</label>
      <div class="materiale-grid" id="materialeGrid">${MATERIALE_OPTIONS.map(m => `<span class="mat-chip ${materialeUsato.includes(m.id) ? 'active' : ''}" data-mat="${m.id}">${m.label}</span>`).join('')}</div>
    </div>
    <div class="program-field"><label>Note</label><textarea id="sessionNote" placeholder="Note aggiuntive...">${noteAllenamento}</textarea></div>
  </div>`;

  // === PRESENZE ===
  html += `<div>
    <h4 style="margin:0 0 12px 0;font-size:14px;color:#334155;">👥 Presenze <span style="font-size:12px;color:#6c757d;font-weight:normal;">(${presentiCount}/${sorted.length})</span></h4>
    <div class="presenze-summary"><span style="color:#22c55e;">✅ ${presentiCount}</span><span style="color:#ef4444;">❌ ${assentiCount}</span></div>
    <p style="margin-bottom:8px;font-size:12px;color:#6c757d;">Segna <span style="color:#E74C3C;font-weight:600;">ASSENTE</span>:</p>
    <div id="sessionPresenzeList">`;

  sorted.forEach(g => {
    const isAssente = assentiIds.includes(g.id);
    const presRecord = presenzeData.find(p => p.calciatore_id === g.id);
    const motivo = presRecord?.motivo_assenza || '';
    html += `<div class="convocation-item" style="flex-wrap:wrap;gap:8px;">
      <div style="display:flex;align-items:center;gap:8px;min-width:200px;">
        <input type="checkbox" ${isAssente ? 'checked' : ''} data-pid="${g.id}" class="session-pres-check" style="width:20px;height:20px;cursor:pointer;accent-color:#E74C3C;">
        <div class="player-avatar" style="width:28px;height:28px;font-size:11px;background:${getAvatarColor(g.nome)};">${g.nome[0]}${g.cognome[0]}</div>
        <span style="font-size:13px;">${g.nome} ${g.cognome}</span>
      </div>
      <select data-pid="${g.id}" class="session-motivo-select" style="padding:4px 8px;border-radius:6px;border:1px solid #e2e8f0;font-size:11px;${isAssente ? '' : 'opacity:0.4;'}" ${isAssente ? '' : 'disabled'}>
        ${MOTIVI_ASSENZA.map(m => `<option value="${m.value}" ${m.value === motivo ? 'selected' : ''}>${m.label}</option>`).join('')}
      </select>
    </div>`;
  });

  html += `</div></div>`;
  html += `<div class="session-actions">
    <button class="btn btn-primary" id="btnSaveSession">💾 Salva Seduta</button>
    <button class="btn btn-secondary" id="btnSaveTemplate" style="font-size:12px;">📋 Salva come Template</button>
  </div>`;

  return html;
}

function renderFaseCard(fase, index) {
  const tipoInfo = TIPI_FASE.find(t => t.id === fase.tipo) || TIPI_FASE[0];
  const matLabels = (fase.materiale || []).map(m => { const o = MATERIALE_OPTIONS.find(x => x.id === m); return o ? o.label.split(' ')[0] : ''; }).join(' ');
  return `<div class="fase-card" data-fase-idx="${index}">
    <div class="fase-header">
      <div class="fase-icon" style="background:${tipoInfo.color}20;">${tipoInfo.icon}</div>
      <span class="fase-title">${fase.nome || tipoInfo.label}</span>
      <span class="fase-durata">${fase.durata || 0} min</span>
      <div class="fase-actions">
        <button class="btn-fase-up" data-idx="${index}" title="Su">▲</button>
        <button class="btn-fase-down" data-idx="${index}" title="Giù">▼</button>
        <button class="btn-fase-edit" data-idx="${index}" title="Modifica">✏️</button>
        <button class="btn-fase-del" data-idx="${index}" title="Elimina">🗑️</button>
      </div>
    </div>
    ${fase.descrizione ? `<div class="fase-desc">${fase.descrizione}</div>` : ''}
    ${matLabels ? `<div style="font-size:11px;color:#64748b;margin-top:4px;">${matLabels}</div>` : ''}
  </div>`;
}

export function attachSessionListeners(date, trainingData, onSave) {
  // Materiale chips
  document.querySelectorAll('#materialeGrid .mat-chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('active'));
  });

  // Toggle motivo assenza
  document.querySelectorAll('.session-pres-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const select = document.querySelector(`.session-motivo-select[data-pid="${cb.dataset.pid}"]`);
      if (select) { select.disabled = !cb.checked; select.style.opacity = cb.checked ? '1' : '0.4'; }
    });
  });

  // Fasi
  document.getElementById('btnAddFase')?.addEventListener('click', () => openFaseForm(null));
  attachFasiListeners();

  // Salva
  document.getElementById('btnSaveSession')?.addEventListener('click', () => saveSession(date, trainingData, onSave));
  document.getElementById('btnSaveTemplate')?.addEventListener('click', async () => {
    const nome = prompt('Nome del template:');
    if (!nome) return;
    showLoading();
    try {
      await saveTemplate(nome, collectProgramma());
      hideLoading();
      alert('✅ Template "' + nome + '" salvato!');
    } catch(e) { hideLoading(); alert('Errore: ' + e.message); }
  });
  document.getElementById('btnApplyTemplate')?.addEventListener('click', () => applyTemplateUI(date, trainingData, onSave));
}

function attachFasiListeners() {
  document.querySelectorAll('.btn-fase-del').forEach(btn => {
    btn.addEventListener('click', () => { currentFasi.splice(parseInt(btn.dataset.idx), 1); refreshFasiUI(); });
  });
  document.querySelectorAll('.btn-fase-edit').forEach(btn => {
    btn.addEventListener('click', () => openFaseForm(parseInt(btn.dataset.idx)));
  });
  document.querySelectorAll('.btn-fase-up').forEach(btn => {
    btn.addEventListener('click', () => { const i = parseInt(btn.dataset.idx); if (i > 0) { [currentFasi[i-1], currentFasi[i]] = [currentFasi[i], currentFasi[i-1]]; refreshFasiUI(); } });
  });
  document.querySelectorAll('.btn-fase-down').forEach(btn => {
    btn.addEventListener('click', () => { const i = parseInt(btn.dataset.idx); if (i < currentFasi.length-1) { [currentFasi[i], currentFasi[i+1]] = [currentFasi[i+1], currentFasi[i]]; refreshFasiUI(); } });
  });
}

function refreshFasiUI() {
  const container = document.getElementById('fasiContainer');
  if (!container) return;
  container.innerHTML = currentFasi.length > 0 ? currentFasi.map((f, i) => renderFaseCard(f, i)).join('') : '<p style="font-size:12px;color:#94a3b8;margin:0;">Nessuna fase.</p>';
  const durataEl = document.getElementById('durataTotale');
  if (durataEl) durataEl.innerHTML = `Durata totale: <strong>${currentFasi.reduce((s, f) => s + (f.durata || 0), 0)}</strong> min`;
  attachFasiListeners();
}

function openFaseForm(editIdx) {
  const isEdit = editIdx !== null;
  const fase = isEdit ? currentFasi[editIdx] : {};
  document.getElementById('faseFormInline')?.remove();

  const formHtml = `<div class="fase-form" id="faseFormInline">
    <div style="display:grid;grid-template-columns:1fr 1fr 80px;gap:8px;">
      <div class="program-field"><label>Tipo</label><select id="faseFormTipo">${TIPI_FASE.map(t => `<option value="${t.id}" ${fase.tipo === t.id ? 'selected' : ''}>${t.icon} ${t.label}</option>`).join('')}</select></div>
      <div class="program-field"><label>Nome</label><input type="text" id="faseFormNome" value="${fase.nome || ''}" placeholder="Es. Rondo 4v2"></div>
      <div class="program-field"><label>Min</label><input type="number" id="faseFormDurata" value="${fase.durata || 15}" min="5" max="60" step="5"></div>
    </div>
    <div class="program-field"><label>Descrizione</label><textarea id="faseFormDesc" rows="2" placeholder="Descrivi l'esercizio...">${fase.descrizione || ''}</textarea></div>
    <div class="program-field"><label>Materiale fase</label><div class="materiale-grid" id="faseMatGrid">${MATERIALE_OPTIONS.map(m => `<span class="mat-chip ${(fase.materiale || []).includes(m.id) ? 'active' : ''}" data-mat="${m.id}">${m.label}</span>`).join('')}</div></div>
    <div style="display:flex;gap:8px;margin-top:8px;">
      <button class="btn btn-primary btn-small" id="btnFaseConfirm">${isEdit ? '✏️ Aggiorna' : '✅ Aggiungi'}</button>
      <button class="btn btn-secondary btn-small" id="btnFaseCancel">Annulla</button>
    </div>
  </div>`;

  const container = document.getElementById('fasiContainer');
  container.insertAdjacentHTML('beforeend', formHtml);

  document.querySelectorAll('#faseMatGrid .mat-chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('active'));
  });
  document.getElementById('btnFaseCancel')?.addEventListener('click', () => document.getElementById('faseFormInline')?.remove());
  document.getElementById('btnFaseConfirm')?.addEventListener('click', () => {
    const tipoVal = document.getElementById('faseFormTipo')?.value || 'tecnica';
    const tipoInfo = TIPI_FASE.find(t => t.id === tipoVal);
    const newFase = {
      id: isEdit ? fase.id : `f_${Date.now()}`,
      tipo: tipoVal,
      nome: document.getElementById('faseFormNome')?.value || tipoInfo?.label || '',
      durata: parseInt(document.getElementById('faseFormDurata')?.value) || 15,
      descrizione: document.getElementById('faseFormDesc')?.value || '',
      materiale: Array.from(document.querySelectorAll('#faseMatGrid .mat-chip.active')).map(c => c.dataset.mat)
    };
    if (isEdit) currentFasi[editIdx] = newFase; else currentFasi.push(newFase);
    document.getElementById('faseFormInline')?.remove();
    refreshFasiUI();
  });
}

function collectProgramma() {
  return {
    tipo: document.getElementById('sessionTipo')?.value || '',
    obiettivo: document.getElementById('sessionObiettivo')?.value || '',
    fasi: [...currentFasi],
    materiale: Array.from(document.querySelectorAll('#materialeGrid .mat-chip.active')).map(c => c.dataset.mat),
    note: document.getElementById('sessionNote')?.value || ''
  };
}

async function saveSession(date, trainingData, onSave) {
  if (!date) return;

  // Salva programma via API + presenze
  saveProgrammaToApi(date, collectProgramma());

  // Salva presenze via API
  const presenzeToSave = [];
  document.querySelectorAll('.session-pres-check').forEach(cb => {
    const isAssente = cb.checked;
    const pid = cb.dataset.pid;
    const select = document.querySelector(`.session-motivo-select[data-pid="${pid}"]`);
    const motivo = isAssente && select ? select.value : null;
    presenzeToSave.push({ calciatoreId: pid, data: date, presente: !isAssente, note: motivo });
  });

  showLoading();
  try {
    for (const p of presenzeToSave) {
      await apiFetch('/squadre/' + window.YFM.squadraId + '/allenamenti/presenze', {
        method: 'POST', body: JSON.stringify(p)
      });
    }
    hideLoading();
    alert('✅ Seduta salvata!');
    if (onSave) onSave();
  } catch (e) {
    hideLoading();
    alert('Errore: ' + e.message);
  }
}

async function applyTemplateUI(date, trainingData, onSave) {
  const templates = await getTemplates();
  if (templates.length === 0) { alert('Nessun template salvato.\nSalva prima una seduta come template.'); return; }
  const choice = prompt('Template disponibili:\n' + templates.map((t, i) => `${i+1}. ${t.nome}`).join('\n') + '\n\nInserisci il numero:');
  if (!choice) return;
  const idx = parseInt(choice) - 1;
  if (idx < 0 || idx >= templates.length) { alert('Scelta non valida'); return; }
  const prog = templates[idx].programma;
  if (prog.tipo) { const sel = document.getElementById('sessionTipo'); if (sel) sel.value = prog.tipo; }
  if (prog.obiettivo) { const inp = document.getElementById('sessionObiettivo'); if (inp) inp.value = prog.obiettivo; }
  if (prog.note) { const ta = document.getElementById('sessionNote'); if (ta) ta.value = prog.note; }
  if (prog.fasi && prog.fasi.length > 0) currentFasi = JSON.parse(JSON.stringify(prog.fasi));
  refreshFasiUI();
  document.querySelectorAll('#materialeGrid .mat-chip').forEach(chip => {
    chip.classList.toggle('active', (prog.materiale || []).includes(chip.dataset.mat));
  });
}
