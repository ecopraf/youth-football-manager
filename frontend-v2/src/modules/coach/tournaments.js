/**
 * tournaments.js - Pagina "🏆 Tornei"
 * Legato alla categoria attiva (window.YFM.squadraId)
 */

import { apiFetch } from '../../services/api.js';

let tournaments = [];

function getTeamId() { return window.YFM.squadraId; }
function getTeamName() { return window.YFM.getSquadraName ? window.YFM.getSquadraName() : 'Squadra'; }
function getWorkspaceLogo() { return window.YFM.workspaceInfo?.logo_url || null; }
function getSocietaName() { return window.YFM.getSocietaName ? window.YFM.getSocietaName() : ''; }

export default async function loadTournaments() {
  const c = document.getElementById('pageContent');
  c.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';
  try {
    const all = await apiFetch('/tornei');
    tournaments = all.filter(t => t.team_id === getTeamId());
  } catch (e) { tournaments = []; }
  render();
}

// ── RENDER LISTA ──
function render() {
  const c = document.getElementById('pageContent');
  const logo = getWorkspaceLogo();
  const logoHtml = logo ? `<img src="${logo}" style="width:28px;height:28px;border-radius:6px;object-fit:contain;">` : '';
  c.innerHTML = `
    <div style="max-width:900px;margin:0 auto;padding:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:10px;">
          ${logoHtml}
          <h2 style="margin:0;">🏆 Tornei - ${getTeamName()}</h2>
        </div>
        <button id="btnNewTorneo" style="background:var(--blue,#667eea);color:#fff;border:none;padding:10px 18px;border-radius:10px;cursor:pointer;font-size:14px;">+ Nuovo Torneo</button>
      </div>
      <div id="torneiList">${renderList()}</div>
      <div id="torneoModal"></div>
    </div>`;
  document.getElementById('btnNewTorneo').addEventListener('click', openWizard);
  attachListListeners();
}

function attachListListeners() {
  const c = document.getElementById('pageContent');
  c.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!await confirm('Eliminare questo torneo?')) return;
      await apiFetch('/tornei/' + btn.dataset.id, { method: 'DELETE' });
      tournaments = tournaments.filter(t => t.id !== btn.dataset.id);
      document.getElementById('torneiList').innerHTML = renderList();
      attachListListeners();
    });
  });
  c.querySelectorAll('[data-action="pdf"]').forEach(btn => {
    btn.addEventListener('click', () => { const t = tournaments.find(x => x.id === btn.dataset.id); if (t) generatePDF(t); });
  });
  c.querySelectorAll('[data-action="detail"]').forEach(btn => {
    btn.addEventListener('click', () => { const t = tournaments.find(x => x.id === btn.dataset.id); if (t) openDetail(t); });
  });
}

function renderList() {
  if (!tournaments.length) return '<div style="text-align:center;color:#888;padding:40px;">Nessun torneo creato. Clicca "+ Nuovo Torneo" per iniziare.</div>';
  return tournaments.map(t => {
    const nSquadre = (t.squadre || []).length;
    const confermate = (t.squadre || []).filter(s => s.confermata).length;
    const stato = t.stato === 'bozza' ? '📝 Bozza' : t.stato === 'confermato' ? '✅ Confermato' : '🏁 Completato';
    return `<div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);display:flex;justify-content:space-between;align-items:center;">
      <div style="cursor:pointer;flex:1;" data-action="detail" data-id="${t.id}">
        <div style="font-weight:600;font-size:15px;">${t.nome}</div>
        <div style="font-size:12px;color:#888;margin-top:4px;">${t.data_inizio ? new Date(t.data_inizio).toLocaleDateString('it') : 'Data TBD'} · ${t.sede || 'Sede TBD'} · ${nSquadre} squadre (${confermate} confermate) · ${stato}</div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;">
        <button data-action="pdf" data-id="${t.id}" style="background:#27AE60;color:#fff;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;">📄 PDF</button>
        <button data-action="delete" data-id="${t.id}" style="background:#E74C3C;color:#fff;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

// ── WIZARD CREAZIONE ──
function openWizard() {
  const modal = document.getElementById('torneoModal');
  const logo = getWorkspaceLogo();
  const squadraCasa = getSocietaName() + ' ' + getTeamName();

  modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;" id="wizardOverlay">
      <div style="background:#fff;border-radius:16px;padding:24px;width:90%;max-width:550px;max-height:85vh;overflow-y:auto;">
        <h3 style="margin:0 0 16px;">🏆 Nuovo Torneo</h3>

        <!-- Squadra organizzatrice -->
        <div style="background:#f0f4ff;border-radius:10px;padding:12px;margin-bottom:16px;display:flex;align-items:center;gap:10px;">
          ${logo ? `<img src="${logo}" style="width:36px;height:36px;border-radius:8px;object-fit:contain;">` : '<div style="width:36px;height:36px;border-radius:8px;background:#667eea;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;">🏠</div>'}
          <div>
            <div style="font-size:11px;color:#667eea;font-weight:600;">SQUADRA ORGANIZZATRICE</div>
            <div style="font-size:14px;font-weight:500;">${squadraCasa}</div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;">
          <!-- Nome torneo -->
          <div>
            <label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px;">Nome torneo *</label>
            <input id="wNome" placeholder="es. Memorial Rossi 2025" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
          </div>

          <!-- Date -->
          <div style="display:flex;gap:8px;">
            <div style="flex:1;">
              <label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px;">Data inizio</label>
              <input id="wDataInizio" type="date" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
            <div style="flex:1;">
              <label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px;">Data fine</label>
              <input id="wDataFine" type="date" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
          </div>

          <!-- Sede -->
          <div>
            <label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px;">Sede / Campo</label>
            <input id="wSede" placeholder="es. Campo Sportivo Comunale" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
          </div>

          <!-- Modalità -->
          <div>
            <label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px;">Modalità di gioco</label>
            <select id="wModalita" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
              <option value="girone">Girone all'italiana</option>
              <option value="eliminazione">Eliminazione diretta</option>
              <option value="misto">Fase a gironi + eliminazione</option>
            </select>
          </div>

          <!-- Regolamento -->
          <div style="display:flex;gap:8px;">
            <div style="flex:1;">
              <label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px;">Durata partita (min)</label>
              <input id="wDurata" type="number" value="20" min="5" max="90" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
            <div style="flex:1;">
              <label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:4px;">Giocatori per squadra</label>
              <input id="wGiocatori" type="number" value="7" min="3" max="11" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
            </div>
          </div>

          <!-- Squadre partecipanti -->
          <div style="border-top:1px solid #eee;padding-top:14px;">
            <div style="font-weight:600;margin-bottom:8px;">📋 Squadre invitate</div>
            <div id="wSquadreList" style="margin-bottom:8px;"></div>
            <div style="display:flex;gap:8px;align-items:center;">
              <input id="wSquadraInput" placeholder="Nome squadra" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:8px;">
              <input id="wSquadraLogo" placeholder="URL logo (opz.)" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:11px;">
              <button id="wAddSquadra" style="background:var(--blue,#667eea);color:#fff;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-weight:700;">+</button>
            </div>
            <button id="wImportGR" style="margin-top:8px;background:#f0f4ff;color:#667eea;border:1px solid #667eea;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:12px;width:100%;">📥 Importa squadre da Gazzetta Regionale</button>
            <div id="wGRPanel" style="display:none;margin-top:8px;"></div>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-top:20px;justify-content:flex-end;">
          <button id="wCancel" style="padding:10px 20px;border:1px solid #ddd;border-radius:10px;cursor:pointer;background:#fff;">Annulla</button>
          <button id="wSave" style="padding:10px 20px;background:var(--blue,#667eea);color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:600;">Crea Torneo</button>
        </div>
      </div>
    </div>`;

  let squadre = [];

  const renderSquadre = () => {
    const el = document.getElementById('wSquadreList');
    if (!el) return;
    el.innerHTML = squadre.map((s, i) => `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:#f8f9fa;border-radius:8px;margin-bottom:4px;">
        ${s.logo_url ? `<img src="${s.logo_url}" style="width:22px;height:22px;border-radius:4px;object-fit:contain;">` : '<div style="width:22px;height:22px;border-radius:4px;background:#ddd;display:flex;align-items:center;justify-content:center;font-size:10px;">⚽</div>'}
        <span style="flex:1;font-size:13px;">${s.nome}</span>
        <span style="font-size:11px;color:${s.confermata ? '#27AE60' : '#F39C12'};">${s.confermata ? '✅' : '⏳'}</span>
        <button data-rm="${i}" style="background:none;border:none;cursor:pointer;color:#E74C3C;font-size:16px;line-height:1;">×</button>
      </div>`).join('');
    el.querySelectorAll('[data-rm]').forEach(btn => {
      btn.addEventListener('click', () => { squadre.splice(+btn.dataset.rm, 1); renderSquadre(); });
    });
  };

  document.getElementById('wAddSquadra').addEventListener('click', () => {
    const nameInput = document.getElementById('wSquadraInput');
    const logoInput = document.getElementById('wSquadraLogo');
    const nome = nameInput.value.trim();
    if (!nome) return;
    squadre.push({ nome, logo_url: logoInput.value.trim() || null, confermata: false });
    nameInput.value = '';
    logoInput.value = '';
    renderSquadre();
  });

  document.getElementById('wSquadraInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('wAddSquadra').click(); }
  });

  // Import GR
  document.getElementById('wImportGR').addEventListener('click', () => {
    const panel = document.getElementById('wGRPanel');
    if (panel.style.display !== 'none') { panel.style.display = 'none'; return; }
    panel.style.display = 'block';
    panel.innerHTML = `
      <div style="background:#f8f9fa;padding:12px;border-radius:8px;">
        <select id="grChamp" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;margin-bottom:8px;"><option>Caricamento...</option></select>
        <select id="grGroup" disabled style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;margin-bottom:8px;"><option>-- Prima seleziona campionato --</option></select>
        <div id="grTeams"></div>
      </div>`;
    loadGRChamps();
  });

  async function loadGRChamps() {
    const sel = document.getElementById('grChamp');
    try {
      const data = await apiFetch('/gr/championships/1');
      sel.innerHTML = '<option value="">-- Seleziona campionato --</option>' + data.map(d => `<option value="${d.id}">${d.text}</option>`).join('');
      sel.addEventListener('change', () => { if (sel.value) loadGRGroups(sel.value); });
    } catch (e) { sel.innerHTML = '<option>Errore caricamento</option>'; }
  }

  async function loadGRGroups(champId) {
    const sel = document.getElementById('grGroup');
    sel.disabled = true;
    sel.innerHTML = '<option>Caricamento...</option>';
    try {
      const data = await apiFetch('/gr/groups/1/' + champId);
      sel.innerHTML = '<option value="">-- Seleziona girone --</option>' + data.map(d => `<option value="${d.id}">Girone ${d.text}</option>`).join('');
      sel.disabled = false;
      sel.addEventListener('change', () => { if (sel.value) loadGRTeams(champId, sel.value); });
    } catch (e) { sel.innerHTML = '<option>Errore</option>'; }
  }

  async function loadGRTeams(champId, groupId) {
    const div = document.getElementById('grTeams');
    div.innerHTML = '<div style="text-align:center;padding:8px;color:#666;">Caricamento...</div>';
    try {
      const data = await apiFetch('/gr/preview/1/' + champId + '/' + groupId);
      if (!data.classifica?.length) { div.innerHTML = '<div style="color:#c00;">Nessuna squadra trovata</div>'; return; }
      div.innerHTML = data.classifica.map(r => `
        <label style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px;cursor:pointer;">
          <input type="checkbox" value="${r.nome}" class="grTeamCb"> ${r.nome}
        </label>`).join('') + '<button id="grAddSelected" style="margin-top:8px;background:#667eea;color:#fff;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:12px;width:100%;">Aggiungi selezionate</button>';
      document.getElementById('grAddSelected').addEventListener('click', () => {
        div.querySelectorAll('.grTeamCb:checked').forEach(cb => {
          if (!squadre.find(s => s.nome === cb.value)) squadre.push({ nome: cb.value, logo_url: null, confermata: false });
        });
        renderSquadre();
        document.getElementById('wGRPanel').style.display = 'none';
      });
    } catch (e) { div.innerHTML = `<div style="color:#c00;">Errore: ${e.message}</div>`; }
  }

  document.getElementById('wCancel').addEventListener('click', () => { modal.innerHTML = ''; });
  document.getElementById('wizardOverlay').addEventListener('click', (e) => { if (e.target.id === 'wizardOverlay') modal.innerHTML = ''; });

  document.getElementById('wSave').addEventListener('click', async () => {
    const nome = document.getElementById('wNome').value.trim();
    if (!nome) { alert('Inserisci il nome del torneo'); return; }
    const body = {
      nome,
      data_inizio: document.getElementById('wDataInizio').value || null,
      data_fine: document.getElementById('wDataFine').value || null,
      sede: document.getElementById('wSede').value.trim() || null,
      modalita: document.getElementById('wModalita').value,
      regolamento: {
        durata_partita: +document.getElementById('wDurata').value || 20,
        giocatori: +document.getElementById('wGiocatori').value || 7
      },
      squadre,
      team_id: getTeamId()
    };
    try {
      const created = await apiFetch('/tornei', { method: 'POST', body: JSON.stringify(body) });
      tournaments.unshift(created);
      modal.innerHTML = '';
      render();
    } catch (e) { alert('Errore: ' + e.message); }
  });
}

// ── DETTAGLIO TORNEO ──
function openDetail(t) {
  const modal = document.getElementById('torneoModal');
  const logo = getWorkspaceLogo();
  const squadreHtml = (t.squadre || []).map((s, i) => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:#f8f9fa;border-radius:8px;margin-bottom:4px;">
      ${s.logo_url ? `<img src="${s.logo_url}" style="width:22px;height:22px;border-radius:4px;object-fit:contain;">` : '<div style="width:22px;height:22px;border-radius:4px;background:#ddd;display:flex;align-items:center;justify-content:center;font-size:10px;">⚽</div>'}
      <span style="flex:1;font-size:13px;">${s.nome}</span>
      <button data-conf="${i}" style="padding:4px 10px;border-radius:6px;border:none;cursor:pointer;font-size:11px;background:${s.confermata ? '#27AE60' : '#F39C12'};color:#fff;">${s.confermata ? '✅ Confermata' : '⏳ In attesa'}</button>
    </div>`).join('');

  modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;" id="detailOverlay">
      <div style="background:#fff;border-radius:16px;padding:24px;width:90%;max-width:500px;max-height:85vh;overflow-y:auto;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
          ${logo ? `<img src="${logo}" style="width:32px;height:32px;border-radius:6px;object-fit:contain;">` : ''}
          <h3 style="margin:0;">🏆 ${t.nome}</h3>
        </div>
        <div style="font-size:12px;color:#888;margin-bottom:12px;">${t.data_inizio ? new Date(t.data_inizio).toLocaleDateString('it') : ''} ${t.data_fine ? '- ' + new Date(t.data_fine).toLocaleDateString('it') : ''} · ${t.sede || ''}</div>
        <div style="font-size:12px;margin-bottom:16px;background:#f8f9fa;padding:10px;border-radius:8px;">
          <b>Modalità:</b> ${t.modalita || 'girone'} · <b>Durata:</b> ${t.regolamento?.durata_partita || 20} min · <b>Giocatori:</b> ${t.regolamento?.giocatori || 7} per squadra
        </div>
        <div style="font-weight:600;margin-bottom:8px;">Squadre (${(t.squadre||[]).length})</div>
        <div id="detailSquadre">${squadreHtml || '<div style="color:#888;font-size:13px;">Nessuna squadra</div>'}</div>
        <div style="display:flex;gap:8px;margin-top:20px;justify-content:flex-end;">
          <button id="detailPdf" style="padding:8px 16px;background:#27AE60;color:#fff;border:none;border-radius:8px;cursor:pointer;">📄 PDF Invito</button>
          <button id="detailClose" style="padding:8px 16px;border:1px solid #ddd;border-radius:8px;cursor:pointer;background:#fff;">Chiudi</button>
        </div>
      </div>
    </div>`;

  modal.querySelectorAll('[data-conf]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = +btn.dataset.conf;
      t.squadre[idx].confermata = !t.squadre[idx].confermata;
      await apiFetch('/tornei/' + t.id, { method: 'PUT', body: JSON.stringify({ squadre: t.squadre }) });
      openDetail(t);
    });
  });
  document.getElementById('detailPdf').addEventListener('click', () => generatePDF(t));
  document.getElementById('detailClose').addEventListener('click', () => { modal.innerHTML = ''; });
  document.getElementById('detailOverlay').addEventListener('click', (e) => { if (e.target.id === 'detailOverlay') modal.innerHTML = ''; });
}

// ── PDF INVITO ──
async function generatePDF(t) {
  if (!window.jspdf) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  let y = 20;

  // Logo squadra di casa nel PDF
  const logo = getWorkspaceLogo();
  if (logo) {
    try {
      const img = await loadImage(logo);
      doc.addImage(img, 'PNG', pw / 2 - 12, y, 24, 24);
      y += 30;
    } catch (e) { /* skip logo if fails */ }
  }

  // Titolo
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text(t.nome, pw / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100);
  doc.text('Organizzato da: ' + getSocietaName() + ' ' + getTeamName(), pw / 2, y, { align: 'center' });
  doc.setTextColor(0);
  y += 12;

  if (t.data_inizio) {
    const dataStr = new Date(t.data_inizio).toLocaleDateString('it', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    doc.text('📅 ' + dataStr + (t.data_fine && t.data_fine !== t.data_inizio ? ' - ' + new Date(t.data_fine).toLocaleDateString('it') : ''), pw / 2, y, { align: 'center' });
    y += 7;
  }
  if (t.sede) { doc.text('📍 ' + t.sede, pw / 2, y, { align: 'center' }); y += 7; }

  y += 5;
  doc.setDrawColor(102, 126, 234);
  doc.line(20, y, pw - 20, y);
  y += 10;

  // Regolamento
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Regolamento', 20, y); y += 7;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(11);
  doc.text('• Modalità: ' + (t.modalita || 'girone'), 25, y); y += 6;
  doc.text('• Durata partite: ' + (t.regolamento?.durata_partita || 20) + ' minuti', 25, y); y += 6;
  doc.text('• Giocatori per squadra: ' + (t.regolamento?.giocatori || 7), 25, y); y += 12;

  // Squadre
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Squadre partecipanti (' + (t.squadre || []).length + ')', 20, y); y += 8;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(11);

  for (const [i, s] of (t.squadre || []).entries()) {
    if (y > 270) { doc.addPage(); y = 20; }
    const status = s.confermata ? '✓' : '?';
    doc.text(`${i + 1}. ${s.nome}  [${status}]`, 25, y);
    y += 6;
  }

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text('Generato da Youth Football Manager', pw / 2, 285, { align: 'center' });

  doc.save('Invito_' + t.nome.replace(/\s+/g, '_') + '.pdf');
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}
