import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';

const RUOLO_ACR = { 'Portiere': 'POR', 'Difensore': 'DIF', 'Centrocampista': 'CEN', 'Attaccante': 'ATT' };

const MODULI = {
  '4-3-3': { label: '4-3-3', rows: [1, 4, 3, 3] },
  '4-4-2': { label: '4-4-2', rows: [1, 4, 4, 2] },
  '3-5-2': { label: '3-5-2', rows: [1, 3, 5, 2] },
  '3-4-3': { label: '3-4-3', rows: [1, 3, 4, 3] },
  '4-2-3-1': { label: '4-2-3-1', rows: [1, 4, 2, 3, 1] },
  '4-5-1': { label: '4-5-1', rows: [1, 4, 5, 1] },
  '5-3-2': { label: '5-3-2', rows: [1, 5, 3, 2] },
  '4-1-4-1': { label: '4-1-4-1', rows: [1, 4, 1, 4, 1] },
};

const PITCH_CSS = `
.pitch-container { display:flex; gap:16px; flex-wrap:wrap; }
.pitch-panel { flex:1; min-width:240px; }
.pitch-roster { flex:0 0 200px; max-height:420px; overflow-y:auto; }
@media (max-width:768px) {
  .pitch-container { flex-direction:column; }
  .pitch-roster { max-height:none; overflow-y:visible; background:#fff; border-radius:12px; padding:10px; border:1px solid #eee; margin-top:8px; }
}
.pitch { width:100%; max-width:340px; aspect-ratio:2/3; margin:0 auto; background:linear-gradient(180deg,#2d8a4e 0%,#1a6b38 100%); border-radius:12px; position:relative; overflow:hidden; border:3px solid #1a5c30; touch-action:none; }
.pitch::before { content:''; position:absolute; top:50%; left:8%; right:8%; height:1px; background:rgba(255,255,255,0.25); }
.pitch::after { content:''; position:absolute; top:50%; left:50%; width:50px; height:50px; border:1px solid rgba(255,255,255,0.25); border-radius:50%; transform:translate(-50%,-50%); }
.pitch-slot { position:absolute; width:38px; height:38px; border-radius:50%; background:rgba(255,255,255,0.12); border:2px dashed rgba(255,255,255,0.35); display:flex; align-items:center; justify-content:center; transform:translate(-50%,-50%); transition:background 0.2s,border 0.2s,box-shadow 0.2s; cursor:default; user-select:none; }
.pitch-slot.occupied { background:white; border:2px solid #667eea; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.3); }
.pitch-slot.occupied:active { cursor:grabbing; }
.pitch-slot.drag-over { background:rgba(102,126,234,0.4); border-color:white; transform:translate(-50%,-50%) scale(1.12); }
.pitch-slot .slot-num { font-size:13px; font-weight:700; color:#667eea; pointer-events:none; }
.pitch-slot .slot-name { position:absolute; bottom:-14px; font-size:7px; color:white; font-weight:600; white-space:nowrap; text-shadow:0 1px 2px rgba(0,0,0,0.9); pointer-events:none; }
.roster-item { display:flex; align-items:center; gap:6px; padding:6px 8px; margin-bottom:3px; background:#f8f9fa; border-radius:8px; cursor:grab; border:1px solid #eee; transition:all 0.2s; font-size:11px; }
.roster-item.placed { opacity:0.3; pointer-events:none; }
.roster-item .r-num { width:22px; height:22px; background:#667eea; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; flex-shrink:0; }
.roster-item .r-name { font-weight:500; flex:1; }
.roster-item .r-role { font-size:9px; color:#888; }
.modulo-select { display:flex; gap:5px; flex-wrap:wrap; margin-bottom:10px; }
.modulo-btn { padding:5px 10px; border-radius:8px; border:1px solid #dee2e6; background:white; cursor:pointer; font-size:11px; font-weight:600; transition:all 0.2s; }
.modulo-btn:hover { border-color:#667eea; background:#f0f4ff; }
.modulo-btn.active { background:#667eea; color:white; border-color:#667eea; }
.bench-section { margin-top:10px; padding-top:10px; border-top:1px solid #eee; }
.bench-section h5 { margin:0 0 6px; font-size:11px; color:#666; }
.pitch-readonly .pitch-slot.occupied { cursor:default; }
@media (max-width:640px) { .pitch { max-width:260px; } .pitch-slot { width:30px; height:30px; } .pitch-slot .slot-num { font-size:10px; } .pitch-slot .slot-name { font-size:6px; bottom:-11px; } .roster-item { padding:5px 6px; font-size:10px; } .roster-item .r-num { width:18px; height:18px; font-size:8px; } .modulo-btn { padding:4px 8px; font-size:10px; } }
`;

export async function openFormazioneForm(mid) {
  const match = (window.YFM.allMatches || []).find(m => m.id === mid) || {};
  const isArchiviata = match.archiviata === true || match.archiviata === 'true';

  let convocazioni = [], formazioneSalvata = null, giocatori = [];

  [convocazioni, formazioneSalvata, giocatori] = await Promise.all([
    apiFetch('/partite/' + mid + '/convocazioni').catch(() => []),
    apiFetch('/partite/' + mid + '/formazione').catch(() => ({ formazione: [], meta: {} })),
    apiFetch('/squadre/' + window.YFM.squadraId + '/calciatori').catch(() => [])
  ]);

  const convocatiIds = convocazioni.filter(c => c.presente === true).map(c => c.calciatoreId);
  const ruoloOrder = ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante'];
  const giocatoriConvocati = giocatori.filter(g => convocatiIds.includes(g.id)).sort((a, b) => {
    const ra = ruoloOrder.indexOf(a.ruolo), rb = ruoloOrder.indexOf(b.ruolo);
    if (ra !== rb) return ra - rb;
    return a.cognome.localeCompare(b.cognome);
  });

  // Converti formazione API in formato interno
  const apiFormazione = Array.isArray(formazioneSalvata) ? formazioneSalvata : (formazioneSalvata?.formazione || []);
  const apiMeta = formazioneSalvata?.meta || {};
  const formazione = convertApiFormation(apiFormazione, giocatori, apiMeta);

  if (isArchiviata) {
    renderPitchReadOnly(match, giocatoriConvocati, formazione, giocatori);
  } else {
    renderPitchEdit(mid, match, giocatoriConvocati, formazione, giocatori);
  }
}

function convertApiFormation(apiData, allPlayers, meta) {
  if (!apiData || !Array.isArray(apiData) || apiData.length === 0) return null;
  const titolari = apiData.filter(f => f.posizione === 'Titolare' || f.is_starter);
  const riserve = apiData.filter(f => f.posizione === 'Panchina' || !f.is_starter);
  const portiere = titolari.find(f => { const g = allPlayers.find(p => p.id === f.calciatoreId); return g?.ruolo === 'Portiere'; });
  return {
    modulo: meta?.modulo || '4-3-3',
    positions: meta?.positions || {},
    portiere: portiere?.calciatoreId || titolari[0]?.calciatoreId,
    difensori: titolari.filter(f => { const g = allPlayers.find(p => p.id === f.calciatoreId); return g?.ruolo === 'Difensore'; }).map(f => f.calciatoreId),
    centrocampisti: titolari.filter(f => { const g = allPlayers.find(p => p.id === f.calciatoreId); return g?.ruolo === 'Centrocampista'; }).map(f => f.calciatoreId),
    attaccanti: titolari.filter(f => { const g = allPlayers.find(p => p.id === f.calciatoreId); return g?.ruolo === 'Attaccante'; }).map(f => f.calciatoreId),
    riserve: riserve.map(f => f.calciatoreId)
  };
}

function renderPitchReadOnly(match, giocatoriConvocati, formazione, allPlayers) {
  const modulo = formazione?.modulo || '4-3-3';
  const titolariIds = formazione ? [formazione.portiere, ...(formazione.difensori||[]), ...(formazione.centrocampisti||[]), ...(formazione.attaccanti||[])].filter(Boolean) : [];
  const riserveIds = formazione?.riserve || [];

  let html = `<style>${PITCH_CSS}</style><div class="pitch-readonly">`;
  html += `<div style="text-align:center;margin-bottom:12px;"><span style="background:#667eea;color:white;padding:4px 12px;border-radius:8px;font-size:13px;font-weight:600;">Modulo: ${modulo}</span></div>`;
  html += `<div class="pitch" id="pitchField">${buildPitchSlots(modulo, titolariIds, allPlayers, formazione?.positions)}</div>`;
  if (riserveIds.length > 0) {
    html += `<div class="bench-section"><h5>🪑 Panchina (${riserveIds.length})</h5><div style="display:flex;flex-wrap:wrap;gap:6px;">`;
    riserveIds.forEach(id => { const g = allPlayers.find(p => p.id === id); if (g) html += `<span style="background:#f0f0f0;padding:4px 10px;border-radius:6px;font-size:11px;">${g.numero_maglia||'?'} ${g.cognome}</span>`; });
    html += `</div></div>`;
  }
  html += `</div>`;
  const footer = '<button class="btn btn-secondary" id="modalCancelBtn">Chiudi</button>';
  const modal = createModal('👥 Formazione - ' + match.avversario, html, footer, '500px');
  document.getElementById('modalCancelBtn').addEventListener('click', () => modal.close());
}

function renderPitchEdit(mid, match, giocatoriConvocati, formazione, allPlayers) {
  const savedModulo = formazione?.modulo || '4-3-3';
  const titolariIds = formazione ? [formazione.portiere, ...(formazione.difensori||[]), ...(formazione.centrocampisti||[]), ...(formazione.attaccanti||[])].filter(Boolean) : [];

  let html = `<style>${PITCH_CSS}</style>`;
  html += `<p style="margin-bottom:8px;font-size:13px;color:#666;">Trascina i giocatori dalla lista al campo.</p>`;
  html += `<div class="modulo-select" id="moduloSelect">`;
  Object.keys(MODULI).forEach(k => { html += `<button class="modulo-btn${k===savedModulo?' active':''}" data-modulo="${k}">${k}</button>`; });
  html += `</div><div class="pitch-container">`;
  html += `<div class="pitch-panel"><div class="pitch" id="pitchField">${buildPitchSlots(savedModulo, titolariIds, allPlayers, formazione?.positions)}</div>`;
  html += `<div id="pitchCount" style="text-align:center;margin-top:8px;font-size:12px;font-weight:600;color:#667eea;">${titolariIds.length}/11 titolari</div></div>`;
  html += `<div class="pitch-roster" id="rosterList"><h5 style="margin:0 0 8px;font-size:12px;color:#333;">📋 Convocati</h5>`;
  giocatoriConvocati.forEach(g => {
    const num = g.numero_maglia || '?';
    const placed = titolariIds.includes(g.id) ? ' placed' : '';
    html += `<div class="roster-item${placed}" draggable="true" data-pid="${g.id}" data-num="${num}" data-name="${g.cognome}"><div class="r-num">${num}</div><div class="r-name">${g.cognome} ${g.nome}</div><div class="r-role">${RUOLO_ACR[g.ruolo]||''}</div></div>`;
  });
  html += `</div></div>`;

  const footer = '<button class="btn btn-secondary" id="modalCancelBtn">Annulla</button><button class="btn btn-primary" id="saveFormBtn">💾 Salva</button>';
  const modal = createModal('👥 Formazione - ' + match.avversario, html, footer, '850px');

  let currentModulo = savedModulo;
  let slotAssignments = {};
  let customPositions = formazione?.positions ? {...formazione.positions} : {};
  titolariIds.forEach((id, i) => { slotAssignments[i] = id; });

  document.querySelectorAll('#moduloSelect .modulo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#moduloSelect .modulo-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentModulo = btn.dataset.modulo;
      const totalSlots = MODULI[currentModulo].rows.reduce((a,b)=>a+b,0);
      const newA = {}; Object.values(slotAssignments).forEach((pid,i) => { if(i<totalSlots) newA[i]=pid; });
      slotAssignments = newA; customPositions = {};
      refreshPitch();
    });
  });

  setupDragDrop(slotAssignments, allPlayers, refreshPitch, customPositions);

  function refreshPitch() {
    const field = document.getElementById('pitchField');
    if (field) field.innerHTML = buildPitchSlotsFromState(currentModulo, slotAssignments, allPlayers, customPositions);
    updateRosterState(slotAssignments);
    const n = Object.keys(slotAssignments).length;
    const cnt = document.getElementById('pitchCount');
    if (cnt) cnt.textContent = `${n}/11 titolari`;
    const saveBtn = document.getElementById('saveFormBtn');
    if (saveBtn) { saveBtn.disabled = n !== 11; saveBtn.style.opacity = n === 11 ? '1' : '0.5'; }
    setupDragDrop(slotAssignments, allPlayers, refreshPitch, customPositions);
  }

  document.getElementById('saveFormBtn').addEventListener('click', async () => {
    const placed = Object.values(slotAssignments);
    if (placed.length !== 11) { alert('⚠️ Posiziona 11 giocatori!'); return; }
    const portieri = placed.filter(id => { const g = allPlayers.find(p=>p.id===id); return g?.ruolo==='Portiere'; });
    if (portieri.length !== 1) { alert('⚠️ Serve esattamente 1 portiere titolare!'); return; }

    const riserve = giocatoriConvocati.filter(g => !placed.includes(g.id)).map(g => g.id);
    const formazione = [];
    placed.forEach((pid, i) => {
      formazione.push({ calciatoreId: pid, numeroMaglia: allPlayers.find(p=>p.id===pid)?.numero_maglia || 99, posizione: 'Titolare', capitano: false, viceCapitano: false });
    });
    riserve.forEach(pid => {
      formazione.push({ calciatoreId: pid, numeroMaglia: allPlayers.find(p=>p.id===pid)?.numero_maglia || 99, posizione: 'Panchina', capitano: false, viceCapitano: false });
    });

    showLoading();
    try {
      await apiFetch('/partite/' + mid + '/formazione', { method: 'PUT', body: JSON.stringify({ formazione, modulo: currentModulo, positions: customPositions }) });
      hideLoading(); modal.close();
      alert('✅ Formazione salvata!');
      if (window.YFM?.loadCalendar) window.YFM.loadCalendar();
    } catch(e) { hideLoading(); alert('Errore: ' + e.message); }
  });

  document.getElementById('modalCancelBtn').addEventListener('click', () => modal.close());
}

function buildPitchSlots(modulo, titolariIds, allPlayers, positions) {
  const assignments = {}; titolariIds.forEach((id,i) => { assignments[i]=id; });
  return buildPitchSlotsFromState(modulo, assignments, allPlayers, positions||{});
}

function buildPitchSlotsFromState(modulo, assignments, allPlayers, customPositions) {
  const rows = (MODULI[modulo]||MODULI['4-3-3']).rows;
  let html = '', slotIdx = 0;
  rows.forEach((count, rowIndex) => {
    const totalRows = rows.length;
    const yPercent = 90 - (rowIndex * (75/(totalRows-1)));
    for (let i = 0; i < count; i++) {
      const xPercent = count===1 ? 50 : 15 + (i*(70/(count-1)));
      const custom = customPositions?.[slotIdx];
      const finalX = custom ? custom.x : xPercent;
      const finalY = custom ? custom.y : yPercent;
      const pid = assignments[slotIdx];
      const player = pid ? allPlayers.find(p=>p.id===pid) : null;
      const occupied = player ? ' occupied' : '';
      const num = player ? (player.numero_maglia||'?') : '';
      const name = player ? player.cognome : '';
      html += `<div class="pitch-slot${occupied}" data-slot="${slotIdx}" style="top:${finalY}%;left:${finalX}%;"><span class="slot-num">${num}</span><span class="slot-name">${name}</span></div>`;
      slotIdx++;
    }
  });
  return html;
}

function setupDragDrop(assignments, allPlayers, refresh, customPositions) {
  let draggedPid = null, draggedFromSlot = null;

  // Roster items: drag HTML5 (rosa → campo)
  document.querySelectorAll('.roster-item[draggable]').forEach(item => {
    item.addEventListener('dragstart', (e) => { draggedPid = item.dataset.pid; draggedFromSlot = null; item.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
    item.addEventListener('dragend', () => { item.classList.remove('dragging'); draggedPid = null; });
  });

  // Pitch slots: accettano drop dalla rosa
  document.querySelectorAll('.pitch-slot').forEach(slot => {
    slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('drag-over'); });
    slot.addEventListener('dragleave', () => { slot.classList.remove('drag-over'); });
    slot.addEventListener('drop', (e) => {
      e.preventDefault(); slot.classList.remove('drag-over');
      const targetIdx = parseInt(slot.dataset.slot);
      if (!draggedPid) return;
      const existingPid = assignments[targetIdx];
      if (draggedFromSlot !== null) {
        delete assignments[draggedFromSlot];
        if (existingPid) assignments[draggedFromSlot] = existingPid;
      } else {
        if (existingPid) delete assignments[targetIdx];
        Object.keys(assignments).forEach(k => { if (assignments[k]===draggedPid) delete assignments[k]; });
      }
      if (!draggedFromSlot && Object.keys(assignments).length >= 11 && !existingPid) { draggedPid=null; return; }
      assignments[targetIdx] = draggedPid;
      draggedPid = null; draggedFromSlot = null;
      refresh();
    });
  });

  // Drop back to roster
  const rosterEl = document.getElementById('rosterList');
  if (rosterEl) {
    rosterEl.addEventListener('dragover', (e) => e.preventDefault());
    rosterEl.addEventListener('drop', (e) => {
      e.preventDefault();
      if (draggedFromSlot !== null && draggedPid) { delete assignments[draggedFromSlot]; draggedPid=null; draggedFromSlot=null; refresh(); }
    });
  }

  // Slot occupati: pointer events per spostamento fluido (no drag HTML5)
  const pitch = document.getElementById('pitchField');
  if (!pitch) return;
  document.querySelectorAll('.pitch-slot.occupied').forEach(slot => {
    let moving = false;
    let hasMoved = false;
    let startX, startY;

    slot.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      moving = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      slot.setPointerCapture(e.pointerId);
      slot.style.cursor = 'grabbing';
      slot.style.zIndex = '10';
      // Imposta per drag dalla rosa verso questo slot
      draggedPid = assignments[parseInt(slot.dataset.slot)];
      draggedFromSlot = parseInt(slot.dataset.slot);
    });

    slot.addEventListener('pointermove', (e) => {
      if (!moving) return;
      e.preventDefault();
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx > 5 || dy > 5) hasMoved = true;
      if (!hasMoved) return;
      const rect = pitch.getBoundingClientRect();
      const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));
      slot.style.left = x + '%';
      slot.style.top = y + '%';
    });

    slot.addEventListener('pointerup', (e) => {
      if (!moving) return;
      moving = false;
      slot.releasePointerCapture(e.pointerId);
      slot.style.cursor = '';
      slot.style.zIndex = '';

      if (hasMoved) {
        // Salva posizione custom
        const rect = pitch.getBoundingClientRect();
        const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));
        customPositions[parseInt(slot.dataset.slot)] = { x, y };

        // Controlla se è stato droppato su un altro slot (swap)
        const targetSlot = document.elementFromPoint(e.clientX, e.clientY)?.closest('.pitch-slot');
        if (targetSlot && targetSlot !== slot) {
          const fromIdx = parseInt(slot.dataset.slot);
          const toIdx = parseInt(targetSlot.dataset.slot);
          const fromPid = assignments[fromIdx];
          const toPid = assignments[toIdx];
          delete assignments[fromIdx];
          if (toPid) assignments[fromIdx] = toPid;
          assignments[toIdx] = fromPid;
          delete customPositions[fromIdx];
          delete customPositions[toIdx];
          refresh();
          return;
        }
      } else {
        // Click senza movimento: rimuovi dal campo (torna in rosa)
        const idx = parseInt(slot.dataset.slot);
        delete assignments[idx];
        delete customPositions[idx];
        refresh();
      }

      draggedPid = null;
      draggedFromSlot = null;
    });
  });
}

function updateRosterState(assignments) {
  const placedIds = new Set(Object.values(assignments));
  document.querySelectorAll('.roster-item').forEach(item => { item.classList.toggle('placed', placedIds.has(item.dataset.pid)); });
}

function createModal(title, content, footer, maxW='600px') {
  const existing = document.getElementById('currentModal'); if (existing) existing.remove();
  const modal = document.createElement('div'); modal.className='modal-overlay'; modal.id='currentModal';
  modal.innerHTML = `<div class="modal-content" style="max-width:${maxW};"><div class="modal-header"><h2>${title}</h2><button class="modal-close-btn" id="modalCloseX">×</button></div><div class="modal-body">${content}</div>${footer?'<div class="modal-footer">'+footer+'</div>':''}</div>`;
  document.body.appendChild(modal);
  const close = () => { const m=document.getElementById('currentModal'); if(m) m.remove(); };
  document.getElementById('modalCloseX').addEventListener('click', close);
  modal.addEventListener('click', e => { if(e.target===modal) close(); });
  return { modal, close };
}
