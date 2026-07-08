import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';

const RUOLO_ACR = { 'Portiere': 'POR', 'Difensore': 'DIF', 'Centrocampista': 'CEN', 'Attaccante': 'ATT' };

export { PITCH_CSS, MODULI, buildPitchSlots, convertApiFormation };

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
.pitch-roster { flex:0 0 200px; max-height:380px; overflow-y:auto; }
@media (max-width:768px) {
  .pitch-container { flex-direction:column; }
  .pitch-roster { max-height:none; overflow-y:visible; background:#fff; border-radius:12px; padding:10px; border:1px solid #eee; margin-top:8px; }
}
.pitch { width:100%; max-width:300px; aspect-ratio:3/4; margin:0 auto; background:linear-gradient(180deg,#2d8a4e 0%,#1a6b38 100%); border-radius:12px; position:relative; overflow:hidden; border:3px solid #1a5c30; touch-action:none; }
.pitch::before { content:''; position:absolute; top:50%; left:8%; right:8%; height:1px; background:rgba(255,255,255,0.25); }
.pitch::after { content:''; position:absolute; top:50%; left:50%; width:50px; height:50px; border:1px solid rgba(255,255,255,0.25); border-radius:50%; transform:translate(-50%,-50%); }
.pitch-slot { position:absolute; width:38px; height:38px; border-radius:50%; background:rgba(255,255,255,0.12); border:2px dashed rgba(255,255,255,0.35); display:flex; align-items:center; justify-content:center; transform:translate(-50%,-50%); transition:background 0.2s,border 0.2s,box-shadow 0.2s; cursor:default; user-select:none; }
.pitch-slot.occupied { background:white; border:2px solid #667eea; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.3); }
.pitch-slot.occupied:active { cursor:grabbing; }
.pitch-slot.drag-over { background:rgba(102,126,234,0.4); border-color:white; transform:translate(-50%,-50%) scale(1.12); }
.pitch-slot.suggested { border:2px solid rgba(255,255,255,0.9); background:rgba(255,255,255,0.25); animation:pulse-suggest 1.2s ease-in-out infinite; }
.pitch-slot.suggested-strong { border:2px solid #fbbf24; background:rgba(251,191,36,0.3); animation:pulse-suggest 1s ease-in-out infinite; }
.pitch-slot.slot-blocked { opacity:0.3; border:2px dashed rgba(255,0,0,0.4); }
@keyframes pulse-suggest { 0%,100%{transform:translate(-50%,-50%) scale(1);} 50%{transform:translate(-50%,-50%) scale(1.1);} }
.pitch-slot .slot-num { font-size:13px; font-weight:700; color:#667eea; pointer-events:none; user-select:none; }
.pitch-slot .slot-name { position:absolute; bottom:-12px; font-size:7px; color:white; font-weight:600; white-space:nowrap; text-shadow:0 1px 2px rgba(0,0,0,0.9); pointer-events:none; user-select:none; max-width:50px; overflow:hidden; text-overflow:ellipsis; }
.roster-item { display:flex; align-items:center; gap:6px; padding:6px 8px; margin-bottom:3px; background:#f8f9fa; border-radius:8px; cursor:grab; border:1px solid #eee; transition:all 0.2s; font-size:11px; }
.roster-item.placed { opacity:0.3; pointer-events:none; }
.roster-item.selected-mobile { background:#667eea; color:white; border-color:#667eea; }
.roster-item.selected-mobile .r-num { background:white; color:#667eea; }
.roster-item.selected-mobile .r-role { color:rgba(255,255,255,0.8); }
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
  const modulo = meta?.modulo || '4-3-3';
  const rows = (MODULI[modulo] || MODULI['4-3-3']).rows;
  const titolari = apiData.filter(f => f.posizione === 'Titolare' || f.is_starter);
  const riserve = apiData.filter(f => f.posizione === 'Panchina' || (!f.is_starter && f.posizione !== 'Titolare'));

  // Sort by ordine to preserve slot positions (sx/centro/dx)
  const sorted = [...titolari].sort((a, b) => (a.ordine ?? 99) - (b.ordine ?? 99));
  const ids = sorted.map(f => f.calciatoreId);

  // Split ids by modulo rows
  let idx = 0;
  const portiere = ids[idx] || null; idx += rows[0];
  const difensori = ids.slice(idx, idx + rows[1]); idx += rows[1];
  // All middle rows = centrocampisti
  let centrocampisti = [];
  for (let r = 2; r < rows.length - 1; r++) {
    centrocampisti = centrocampisti.concat(ids.slice(idx, idx + rows[r])); idx += rows[r];
  }
  // Last row = attaccanti
  const attaccanti = ids.slice(idx, idx + rows[rows.length - 1]);

  return {
    modulo,
    positions: meta?.positions || {},
    portiere,
    difensori,
    centrocampisti,
    attaccanti,
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
  const modal = createModal('🏟️ Formazione vs ' + match.avversario, html, footer, '500px');
  document.getElementById('modalCancelBtn').addEventListener('click', () => modal.close());
}

function renderPitchEdit(mid, match, giocatoriConvocati, formazione, allPlayers) {
  const savedModulo = formazione?.modulo || '4-3-3';
  const titolariIds = formazione ? [formazione.portiere, ...(formazione.difensori||[]), ...(formazione.centrocampisti||[]), ...(formazione.attaccanti||[])].filter(Boolean) : [];
  const isLive = !!(match.live_meta?.stato);

  let html = `<style>${PITCH_CSS}</style>`;
  html += `<p style="margin-bottom:8px;font-size:13px;color:#666;">Trascina i giocatori dalla lista al campo.</p>`;
  html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;"><div class="modulo-select" id="moduloSelect" data-help="formazione.modulo" style="margin-bottom:0;">`;
  Object.keys(MODULI).forEach(k => { html += `<button class="modulo-btn${k===savedModulo?' active':''}" data-modulo="${k}">${k}</button>`; });
  html += `</div>${!isLive ? '<button id="recallLastForm" style="padding:6px 12px;border-radius:8px;border:1px solid #ddd;background:#fff;color:#666;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;transition:all 0.2s;">📋 Ultima</button>' : ''}</div>`;
  html += `<div class="pitch-container"><div class="pitch-panel"><div class="pitch" id="pitchField" data-help="formazione.campo">${buildPitchSlots(savedModulo, titolariIds, allPlayers, formazione?.positions)}</div>`;
  html += `<div id="pitchCount" style="text-align:center;margin-top:8px;font-size:12px;font-weight:600;color:#667eea;">${titolariIds.length}/11 titolari</div></div>`;
  html += `<div class="pitch-roster" id="rosterList" data-help="formazione.roster"><h5 style="margin:0 0 8px;font-size:12px;color:#333;">📋 Convocati</h5>`;
  giocatoriConvocati.forEach(g => {
    const num = g.numero_maglia || '?';
    const placed = titolariIds.includes(g.id) ? ' placed' : '';
    html += `<div class="roster-item${placed}" draggable="true" data-pid="${g.id}" data-num="${num}" data-name="${g.cognome}"><div class="r-num">${num}</div><div class="r-name">${g.cognome} ${g.nome}</div><div class="r-role">${RUOLO_ACR[g.ruolo]||''}</div></div>`;
  });
  html += `</div></div>`;

  const footer = '<button class="btn btn-secondary" id="modalCancelBtn">Annulla</button><button class="btn btn-primary" id="saveFormBtn" data-help="formazione.salva">💾 Salva</button>';
  const modal = createModal('🏟️ Formazione vs ' + match.avversario, html, footer, '850px');

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
      resetRecallBtn();
      refreshPitch();
    });
  });

  setupDragDrop(slotAssignments, allPlayers, refreshPitch, customPositions);

  // Recall last formation button
  const recallBtn = document.getElementById('recallLastForm');
  function resetRecallBtn() {
    if (!recallBtn) return;
    recallBtn.textContent = '📋 Ultima';
    recallBtn.style.border = '1px solid #ddd';
    recallBtn.style.color = '#666';
    recallBtn.disabled = false;
  }
  recallBtn?.addEventListener('click', async () => {
    try {
      recallBtn.disabled = true; recallBtn.textContent = '⏳ Carico...';
      const res = await apiFetch('/squadre/' + window.YFM.squadraId + '/ultima-formazione');
      const arr = res?.formazione || [];
      if (arr.length === 0) { resetRecallBtn(); alert('Nessuna formazione precedente trovata'); return; }
      const meta = res?.meta || {};
      const newModulo = meta.modulo || '4-3-3';
      currentModulo = newModulo;
      document.querySelectorAll('#moduloSelect .modulo-btn').forEach(b => b.classList.toggle('active', b.dataset.modulo === newModulo));
      slotAssignments = {};
      arr.forEach((f, i) => { slotAssignments[i] = f.calciatoreId; });
      customPositions = meta.positions || {};
      refreshPitch();
      recallBtn.textContent = '✅ Ultima'; recallBtn.style.border = '1px solid #27AE60'; recallBtn.style.color = '#27AE60';
    } catch(e) { resetRecallBtn(); alert('Errore: ' + e.message); }
  });

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
      if (window.YFM?.onFormazioneSaved) window.YFM.onFormazioneSaved(mid);
      else if (window.YFM?.loadCalendar) window.YFM.loadCalendar();
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
  // Mappa riga → ruolo: prima riga = Portiere, ultima = Attaccante, mezzo = Centrocampista/Difensore
  const totalRows = rows.length;
  rows.forEach((count, rowIndex) => {
    const yPercent = 90 - (rowIndex * (75/(totalRows-1)));
    // Determina ruolo per questa riga
    let slotRole = 'Centrocampista';
    if (rowIndex === 0) slotRole = 'Portiere';
    else if (rowIndex === 1) slotRole = 'Difensore';
    else if (rowIndex === totalRows - 1) slotRole = 'Attaccante';
    else if (rowIndex === totalRows - 2 && totalRows > 3) slotRole = 'Attaccante';
    // Per moduli a 4 righe: 0=POR, 1=DIF, 2=CEN, 3=ATT
    if (totalRows === 4) {
      if (rowIndex === 2) slotRole = 'Centrocampista';
      if (rowIndex === 3) slotRole = 'Attaccante';
    }
    // Per moduli a 5 righe: 0=POR, 1=DIF, 2=CEN, 3=CEN, 4=ATT
    if (totalRows === 5) {
      if (rowIndex === 2 || rowIndex === 3) slotRole = 'Centrocampista';
      if (rowIndex === 4) slotRole = 'Attaccante';
    }
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
      html += `<div class="pitch-slot${occupied}" data-slot="${slotIdx}" data-role="${slotRole}" style="top:${finalY}%;left:${finalX}%;z-index:${totalRows - rowIndex};"><span class="slot-num">${num}</span><span class="slot-name">${name}</span></div>`;
      slotIdx++;
    }
  });
  return html;
}

function setupDragDrop(assignments, allPlayers, refresh, customPositions) {
  let draggedPid = null, draggedFromSlot = null;
  let selectedPid = null; // Per mobile tap-to-place
  let justMoved = false; // Flag per evitare conflitto pointer/touch

  // === MOBILE: Tap-to-place (alternativa al drag&drop) ===
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Tap su giocatore nella rosa: seleziona (SOLO mobile)
  // Tap su giocatore nella rosa: seleziona (SOLO mobile)
  document.querySelectorAll('.roster-item').forEach(item => {
    item.addEventListener('touchend', (e) => {
      e.preventDefault();
      const pid = item.dataset.pid;
      if (item.classList.contains('placed')) return;
      document.querySelectorAll('.roster-item.selected-mobile').forEach(el => el.classList.remove('selected-mobile'));
      document.querySelectorAll('.pitch-slot.suggested,.pitch-slot.suggested-strong').forEach(el => { el.classList.remove('suggested'); el.classList.remove('suggested-strong'); });
      if (selectedPid === pid) { selectedPid = null; return; }
      selectedPid = pid;
      item.classList.add('selected-mobile');
      // Evidenzia slot suggeriti per ruolo (anche occupati per sostituzione)
      const giocatore = allPlayers.find(p => p.id === pid);
      const ruolo = giocatore?.ruolo || '';
      document.querySelectorAll('.pitch-slot').forEach(slot => {
        const slotRole = slot.dataset.role;
        if (ruolo === 'Portiere' && slotRole === 'Portiere') slot.classList.add('suggested-strong');
        else if (ruolo === 'Portiere' && slotRole !== 'Portiere') slot.classList.add('slot-blocked');
        else if (ruolo !== 'Portiere' && slotRole === ruolo) slot.classList.add('suggested-strong');
        else if (ruolo !== 'Portiere' && slotRole === 'Portiere') slot.classList.add('slot-blocked');
        else slot.classList.add('suggested');
      });
    });
  });

  // Tap su slot: posiziona il giocatore selezionato (SOLO mobile)
  document.querySelectorAll('.pitch-slot').forEach(slot => {
    slot.addEventListener('touchend', (e) => {
      // Se veniamo da un free-move, ignora
      if (justMoved) { justMoved = false; return; }
      e.preventDefault();
      const targetIdx = parseInt(slot.dataset.slot);

      if (selectedPid) {
        const slotRole = slot.dataset.role;
        const giocatore = allPlayers.find(p => p.id === selectedPid);
        if (giocatore?.ruolo === 'Portiere' && slotRole !== 'Portiere') return;
        if (giocatore?.ruolo !== 'Portiere' && slotRole === 'Portiere') return;
        const existingPid = assignments[targetIdx];
        Object.keys(assignments).forEach(k => { if (assignments[k] === selectedPid) delete assignments[k]; });
        if (!existingPid && Object.keys(assignments).length >= 11) { selectedPid = null; return; }
        assignments[targetIdx] = selectedPid;
        selectedPid = null;
        document.querySelectorAll('.roster-item.selected-mobile').forEach(el => el.classList.remove('selected-mobile'));
        document.querySelectorAll('.pitch-slot.suggested,.pitch-slot.suggested-strong').forEach(el => { el.classList.remove('suggested'); el.classList.remove('suggested-strong'); });
        refresh();
      } else if (slot.classList.contains('occupied')) {
        // Tap su slot occupato senza selezione: rimuovi
        delete assignments[targetIdx];
        delete customPositions[targetIdx];
        refresh();
      }
    });
  });

  // === DESKTOP: Drag HTML5 (rosa → campo) ===
  document.querySelectorAll('.roster-item[draggable]').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedPid = item.dataset.pid; draggedFromSlot = null; item.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move';
      // Desktop: evidenzia slot suggeriti per ruolo
      const giocatore = allPlayers.find(p => p.id === item.dataset.pid);
      const ruolo = giocatore?.ruolo || '';
      document.querySelectorAll('.pitch-slot').forEach(slot => {
        const slotRole = slot.dataset.role;
        if (ruolo === 'Portiere' && slotRole === 'Portiere') slot.classList.add('suggested-strong');
        else if (ruolo === 'Portiere' && slotRole !== 'Portiere') slot.classList.add('slot-blocked');
        else if (ruolo !== 'Portiere' && slotRole === ruolo) slot.classList.add('suggested-strong');
        else if (ruolo !== 'Portiere' && slotRole === 'Portiere') slot.classList.add('slot-blocked');
        else slot.classList.add('suggested');
      });
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging'); draggedPid = null;
      document.querySelectorAll('.pitch-slot.suggested,.pitch-slot.suggested-strong,.pitch-slot.slot-blocked').forEach(el => { el.classList.remove('suggested'); el.classList.remove('suggested-strong'); el.classList.remove('slot-blocked'); });
    });
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
        justMoved = true; // Impedisce al touchend di rimuovere il giocatore
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
      } else if (!isTouchDevice) {
        // Click senza movimento su DESKTOP: rimuovi dal campo
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
  modal.innerHTML = `<div class="modal-content" style="max-width:${maxW};max-height:90vh;display:flex;flex-direction:column;"><div class="modal-header"><h2>${title}</h2><button class="modal-close-btn" id="modalCloseX">×</button></div><div class="modal-body" style="overflow-y:auto;flex:1;">${content}</div>${footer?'<div class="modal-footer">'+footer+'</div>':''}</div>`;
  document.body.appendChild(modal);
  const close = () => { const m=document.getElementById('currentModal'); if(m) m.remove(); };
  document.getElementById('modalCloseX').addEventListener('click', close);
  return { modal, close };
}
