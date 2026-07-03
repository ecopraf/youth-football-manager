import { apiFetch, API_BASE } from '../../services/api.js';
import { showLoading, hideLoading } from '../../utils/ui.js';
import { formatDate } from '../../utils/formatters.js';

export default async function loadImportCenter() {
  const c = document.getElementById('pageContent');
  const teamId = window.YFM.squadraId;
  const teamName = window.YFM.getSquadraName();

  let logs = [];
  try {
    logs = await apiFetch('/import-log?team_id=' + teamId);
  } catch (e) { logs = []; }

  renderMain(c, logs, teamName);
}

function renderMain(c, logs, teamName) {
  const tipoIcons = {
    calendario_pdf: '📄', calendario_testo: '📋', calendario_tuttocampo: '🌐',
    rosa_xls: '📊', rosa_tuttocampo: '⚽', formazioni_tuttocampo: '🏟️'
  };
  const tipoLabels = {
    calendario_pdf: 'Calendario PDF', calendario_testo: 'Calendario Testo', calendario_tuttocampo: 'Calendario TC',
    rosa_xls: 'Rosa XLS', rosa_tuttocampo: 'Rosa TC', formazioni_tuttocampo: 'Formazioni TC'
  };

  let html = `<style>
    .import-cards { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px; margin-bottom:32px; }
    .import-card { background:white; border-radius:12px; padding:20px; box-shadow:0 2px 8px rgba(0,0,0,0.08); cursor:pointer; transition:transform 0.15s, box-shadow 0.15s; border:1px solid #eee; }
    .import-card:hover { transform:translateY(-4px); box-shadow:0 8px 20px rgba(0,0,0,0.12); }
    .import-card-icon { font-size:32px; margin-bottom:8px; }
    .import-card-title { font-size:15px; font-weight:700; color:#1a1a2e; margin-bottom:4px; }
    .import-card-desc { font-size:12px; color:#666; line-height:1.4; }
    .import-card-badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:600; margin-top:8px; }
    .log-table { width:100%; border-collapse:collapse; font-size:13px; }
    .log-table th { text-align:left; padding:8px 12px; background:#f5f5f5; font-weight:600; font-size:11px; color:#666; }
    .log-table td { padding:8px 12px; border-bottom:1px solid #f0f0f0; }
    .log-badge { padding:2px 8px; border-radius:10px; font-size:10px; font-weight:600; }
    .log-success { background:#D4EDDA; color:#155724; }
    .log-error { background:#F8D7DA; color:#721C24; }
    @media (max-width:639px) { .import-cards { grid-template-columns:1fr; } }
  </style>`;

  html += `<div style="margin-bottom:24px;"><h1 class="page-title">📥 Import Center</h1><p style="color:#666;font-size:14px;">${teamName} — Importa dati da fonti esterne</p></div>`;

  // === CARDS ===
  html += `<div class="import-cards">
    <div class="import-card" id="icPdf">
      <div class="import-card-icon">📄</div>
      <div class="import-card-title">Calendario PDF SGS</div>
      <div class="import-card-desc">Upload file PDF del calendario federale SGS/LND</div>
      <span class="import-card-badge" style="background:#E3F2FD;color:#1565C0;">Upload file</span>
    </div>
    <div class="import-card" id="icText">
      <div class="import-card-icon">📋</div>
      <div class="import-card-title">Calendario Testo SGS</div>
      <div class="import-card-desc">Copia-incolla il testo del calendario dal sito o da file</div>
      <span class="import-card-badge" style="background:#F3E5F5;color:#7B1FA2;">Copia-incolla</span>
    </div>
    <div class="import-card" id="icTc"${window.YFM.getUser()?.is_superadmin ? '' : ' style="display:none;"'}>
      <div class="import-card-icon">🌐</div>
      <div class="import-card-title">Calendario Tuttocampo</div>
      <div class="import-card-desc">Scraping calendario, risultati e marcatori da Tuttocampo.it</div>
      <span class="import-card-badge" style="background:#E8F5E9;color:#2E7D32;">URL</span>
    </div>
    <div class="import-card" id="icXls">
      <div class="import-card-icon">📊</div>
      <div class="import-card-title">Rosa XLS FIGC</div>
      <div class="import-card-desc">Upload tabulato atleti Excel (.xlsx) dalla federazione</div>
      <span class="import-card-badge" style="background:#E3F2FD;color:#1565C0;">Upload file</span>
    </div>
    <div class="import-card" id="icRosaTc"${window.YFM.getUser()?.is_superadmin ? '' : ' style="display:none;"'}>
      <div class="import-card-icon">⚽</div>
      <div class="import-card-title">Rosa Tuttocampo</div>
      <div class="import-card-desc">Scraping rosa giocatori da pagina Tuttocampo</div>
      <span class="import-card-badge" style="background:#E8F5E9;color:#2E7D32;">URL</span>
    </div>
    <div class="import-card" id="icFormations"${window.YFM.getUser()?.is_superadmin ? '' : ' style="display:none;"'}>
      <div class="import-card-icon">🏟️</div>
      <div class="import-card-title">Formazioni Tuttocampo</div>
      <div class="import-card-desc">Importa formazioni e sostituzioni per partite già in calendario</div>
      <span class="import-card-badge" style="background:#FFF3E0;color:#E65100;">Batch / URL</span>
    </div>
  </div>

  <div style="margin-bottom:32px;">
    <h2 style="font-size:16px;font-weight:600;margin-bottom:12px;">📰 Gazzetta Regionale</h2>
    <p style="color:#666;font-size:13px;margin-bottom:12px;">Importa classifica, calendario, marcatori e loghi dal portale Gazzetta Regionale. Funziona da qualsiasi dispositivo.</p>
    <div class="import-cards">
      <div class="import-card" id="icGrConfig">
        <div class="import-card-icon">⚙️</div>
        <div class="import-card-title">Configura URL Girone</div>
        <div class="import-card-desc">Inserisci l'URL della classifica/calendario del tuo girone su Gazzetta Regionale</div>
        <span class="import-card-badge" style="background:#E8EAF6;color:#283593;">Setup</span>
      </div>
      <div class="import-card" id="icGrCalendario">
        <div class="import-card-icon">📅</div>
        <div class="import-card-title">Calendario + Risultati</div>
        <div class="import-card-desc">Importa tutte le partite con risultati aggiornati dal girone</div>
        <span class="import-card-badge" style="background:#E8F5E9;color:#2E7D32;">Import</span>
      </div>
      ${window.YFM.getUser()?.is_superadmin ? `<div class="import-card" id="icGrLoghi">
        <div class="import-card-icon">🏷️</div>
        <div class="import-card-title">Loghi Squadre (Girone)</div>
        <div class="import-card-desc">Scarica loghi delle squadre del girone configurato</div>
        <span class="import-card-badge" style="background:#FFF3E0;color:#E65100;">Superadmin</span>
      </div>` : ''}
      ${window.YFM.getUser()?.is_superadmin ? `<div class="import-card" id="icGrLoghiWizard">
        <div class="import-card-icon">🧙</div>
        <div class="import-card-title">Wizard Loghi (Batch)</div>
        <div class="import-card-desc">Scansiona tutti i gironi GR, scarica nuovi loghi e verifica aggiornamenti</div>
        <span class="import-card-badge" style="background:#EDE7F6;color:#4527A0;">Superadmin</span>
      </div>` : ''}
      <div class="import-card" id="icGrPreview">
        <div class="import-card-icon">👁️</div>
        <div class="import-card-title">Anteprima Dati</div>
        <div class="import-card-desc">Visualizza classifica, ultima giornata e marcatori del girone</div>
        <span class="import-card-badge" style="background:#F3E5F5;color:#7B1FA2;">Preview</span>
      </div>
    </div>
  </div>`;

  // === LOG STORICO ===
  html += `<div style="margin-top:16px;"><h2 style="font-size:16px;font-weight:600;margin-bottom:12px;">📜 Storico Importazioni</h2>`;
  if (logs.length === 0) {
    html += `<p style="color:#999;text-align:center;padding:24px;">Nessuna importazione registrata</p>`;
  } else {
    html += `<div style="overflow-x:auto;border:1px solid #eee;border-radius:8px;"><table class="log-table"><thead><tr><th>Data</th><th>Tipo</th><th>Fonte</th><th>Importati</th><th>Saltati</th><th>Esito</th></tr></thead><tbody>`;
    logs.forEach(l => {
      const icon = tipoIcons[l.tipo] || '📦';
      const label = tipoLabels[l.tipo] || l.tipo;
      const date = new Date(l.created_at).toLocaleString('it-IT', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' });
      const badge = l.esito === 'success' ? '<span class="log-badge log-success">✅ OK</span>' : `<span class="log-badge log-error">❌ ${l.errore || 'Errore'}</span>`;
      html += `<tr><td>${date}</td><td>${icon} ${label}</td><td>${l.fonte || '-'}</td><td style="font-weight:600;color:#27AE60;">${l.record_importati}</td><td style="color:#888;">${l.record_saltati}</td><td>${badge}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }
  html += `</div>`;

  c.innerHTML = html;

  // Event listeners
  document.getElementById('icPdf').addEventListener('click', openImportPdf);
  document.getElementById('icText').addEventListener('click', openImportText);
  document.getElementById('icTc')?.addEventListener('click', () => { window.YFM.navigateTo('calendar'); setTimeout(() => document.getElementById('btnImportTc')?.click(), 300); });
  document.getElementById('icXls').addEventListener('click', () => { window.YFM.navigateTo('roster'); setTimeout(() => document.getElementById('btnImportXls')?.click(), 300); });
  document.getElementById('icRosaTc')?.addEventListener('click', () => { window.YFM.navigateTo('roster'); setTimeout(() => document.getElementById('btnImportTc')?.click(), 300); });
  document.getElementById('icFormations')?.addEventListener('click', openImportFormations);
  document.getElementById('icGrConfig').addEventListener('click', openGrConfig);
  document.getElementById('icGrCalendario').addEventListener('click', openGrCalendario);
  document.getElementById('icGrLoghi')?.addEventListener('click', openGrLoghi);
  document.getElementById('icGrLoghiWizard')?.addEventListener('click', openGrLoghiWizard);
  document.getElementById('icGrPreview').addEventListener('click', openGrPreview);
}

// === IMPORT PDF (redirect to calendar's existing modal) ===
function openImportPdf() {
  window.YFM.navigateTo('calendar');
  setTimeout(() => document.getElementById('btnImportPdf')?.click(), 300);
}

// === IMPORT TESTO CALENDARIO SGS ===
function openImportText() {
  const modal = createModal('📋 Importa Calendario da Testo', `
    <p style="margin-bottom:12px;color:#666;">Incolla il testo del calendario SGS/LND (copiato dal sito, da email o da file .txt).</p>
    <div class="form-group" style="margin-bottom:12px;">
      <label>Nome squadra (come appare nel testo)</label>
      <input id="txtTeamName" placeholder="es. DREAMING FOOTBALL ACADEMY">
    </div>
    <div class="form-group" style="margin-bottom:12px;">
      <label>Testo calendario</label>
      <textarea id="txtCalendar" rows="12" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-family:monospace;font-size:11px;" placeholder="Incolla qui il testo del calendario..."></textarea>
    </div>
    <div style="margin-bottom:12px;">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
        <input type="file" id="txtFileInput" accept=".txt" style="display:none;">
        <button class="btn btn-secondary btn-small" id="txtFileBtn">📁 Oppure carica file .txt</button>
      </label>
    </div>
    <div id="txtResult"></div>
  `, '<button class="btn btn-secondary" id="modalCancel">Annulla</button><button class="btn btn-primary" id="txtSearch">🔍 Cerca</button>', '750px');

  document.getElementById('txtFileBtn').addEventListener('click', () => document.getElementById('txtFileInput').click());
  document.getElementById('txtFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { document.getElementById('txtCalendar').value = ev.target.result; };
    reader.readAsText(file);
  });

  document.getElementById('txtSearch').addEventListener('click', async () => {
    const text = document.getElementById('txtCalendar').value.trim();
    const name = document.getElementById('txtTeamName').value.trim();
    if (!text || !name) { alert('Inserisci testo e nome squadra'); return; }

    const resultDiv = document.getElementById('txtResult');
    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Analisi testo...</div>';

    try {
      const data = await apiFetch('/calendario/parse-text', {
        method: 'POST',
        body: JSON.stringify({ text, searchName: name })
      });

      if (!data.partite || data.partite.length === 0) {
        resultDiv.innerHTML = `<div style="color:#c00;padding:12px;background:#fee;border-radius:8px;">❌ Nessuna partita trovata per "${name}".</div>`;
        return;
      }

      const rows = data.partite.map(p => {
        const d = new Date(p.data);
        const dateStr = d.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'2-digit' });
        const timeStr = d.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });
        const icon = p.luogo === 'Casa' ? '🏠' : '✈️';
        return `<tr><td style="padding:4px 8px;font-size:12px;">${p.giornata}</td><td style="padding:4px 8px;font-size:12px;">${dateStr} ${timeStr}</td><td style="padding:4px 8px;font-size:12px;">${icon} ${p.avversario}</td></tr>`;
      }).join('');

      const catInfo = data.categorie.map(c => `${c.categoria} G.${c.girone}`).join(', ');
      resultDiv.innerHTML = `
        <div style="background:#e8f5e9;padding:10px 12px;border-radius:8px;margin-bottom:12px;">
          ✅ <strong>${data.partite.length}</strong> partite trovate <small style="color:#555;">(${catInfo})</small>
        </div>
        <div style="max-height:250px;overflow-y:auto;border:1px solid #eee;border-radius:8px;">
          <table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f5f5f5;"><th style="padding:6px 8px;font-size:11px;text-align:left;">G</th><th style="padding:6px 8px;font-size:11px;text-align:left;">Data</th><th style="padding:6px 8px;font-size:11px;text-align:left;">Partita</th></tr></thead><tbody>${rows}</tbody></table>
        </div>
        <div class="form-group" style="margin-top:12px;"><label>Competizione (opzionale)</label><input id="txtComp" placeholder="es. Campionato Regionale"></div>
        <button class="btn btn-primary" id="txtConfirm" style="margin-top:12px;width:100%;">✅ Conferma e Importa (${data.partite.length} partite)</button>`;

      document.getElementById('txtConfirm').addEventListener('click', async () => {
        showLoading('Importazione...');
        try {
          const partite = data.partite.map(p => ({
            ...p,
            competizione: document.getElementById('txtComp').value.trim() || p.competizione
          }));
          const resp = await apiFetch('/calendario/import', {
            method: 'POST',
            body: JSON.stringify({ squadraId: window.YFM.squadraId, partite })
          });
          hideLoading();
          modal.close();
          alert(`✅ Importate ${resp.inserite} partite!`);
          loadImportCenter();
        } catch (err) {
          hideLoading();
          alert('Errore: ' + err.message);
        }
      });
    } catch (err) {
      resultDiv.innerHTML = `<div style="color:#c00;padding:12px;background:#fee;border-radius:8px;">❌ ${err.message}</div>`;
    }
  });
}

// === IMPORT FORMAZIONI BATCH ===
async function openImportFormations() {
  const modal = createModal('🏟️ Importa Formazioni da Tuttocampo', `
    <p style="margin-bottom:12px;color:#666;">Seleziona le partite per cui importare formazioni, sostituzioni e gol da Tuttocampo.</p>
    <div class="form-group" style="margin-bottom:12px;">
      <label>Nome squadra su Tuttocampo</label>
      <input id="fmTeamName" placeholder="es. Dreaming Football Academy" value="">
    </div>
    <div id="fmMatchList"><div class="loading"><div class="spinner"></div>Caricamento partite...</div></div>
  `, '<button class="btn btn-secondary" id="modalCancel">Annulla</button><button class="btn btn-primary" id="fmImport" disabled>📥 Importa selezionate</button>', '700px');

  try {
    const matches = await apiFetch('/matches-without-formation?team_id=' + window.YFM.squadraId);
    const listDiv = document.getElementById('fmMatchList');

    if (!matches || matches.length === 0) {
      listDiv.innerHTML = '<p style="color:#999;text-align:center;padding:16px;">Nessuna partita con link Tuttocampo trovata.<br><small>Importa prima il calendario da Tuttocampo.</small></p>';
      return;
    }

    const withoutForm = matches.filter(m => !m.has_formation);
    const withForm = matches.filter(m => m.has_formation);

    let html = '';
    if (withoutForm.length > 0) {
      html += `<div style="margin-bottom:8px;display:flex;align-items:center;gap:8px;">
        <label style="font-size:12px;cursor:pointer;"><input type="checkbox" id="fmSelectAll"> Seleziona tutte (${withoutForm.length})</label>
      </div>`;
      html += `<div style="max-height:300px;overflow-y:auto;border:1px solid #eee;border-radius:8px;padding:8px;">`;
      withoutForm.forEach(m => {
        const d = new Date(m.data_ora).toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'2-digit' });
        html += `<label style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid #f5f5f5;cursor:pointer;">
          <input type="checkbox" class="fmCheck" value="${m.id}">
          <span style="font-size:13px;flex:1;">${m.avversario}</span>
          <span style="font-size:11px;color:#888;">${d}</span>
          <span style="font-size:11px;color:#aaa;">G.${m.giornata || '?'}</span>
        </label>`;
      });
      html += `</div>`;
    }
    if (withForm.length > 0) {
      html += `<p style="margin-top:12px;font-size:12px;color:#27AE60;">✅ ${withForm.length} partite hanno già la formazione importata</p>`;
    }
    listDiv.innerHTML = html;

    // Select all
    document.getElementById('fmSelectAll')?.addEventListener('change', (e) => {
      document.querySelectorAll('.fmCheck').forEach(cb => { cb.checked = e.target.checked; });
      document.getElementById('fmImport').disabled = !e.target.checked;
    });
    listDiv.addEventListener('change', () => {
      const checked = document.querySelectorAll('.fmCheck:checked').length;
      document.getElementById('fmImport').disabled = checked === 0;
    });

    document.getElementById('fmImport').addEventListener('click', async () => {
      const teamName = document.getElementById('fmTeamName').value.trim();
      if (!teamName) { alert('Inserisci il nome squadra su Tuttocampo'); return; }
      const matchIds = [...document.querySelectorAll('.fmCheck:checked')].map(cb => cb.value);
      if (matchIds.length === 0) return;

      showLoading(`Importazione formazioni (${matchIds.length} partite)...`);
      try {
        const resp = await apiFetch('/import-formations-batch', {
          method: 'POST',
          body: JSON.stringify({ matchIds, teamId: window.YFM.squadraId, teamName })
        });
        hideLoading();
        modal.close();
        const ok = resp.results?.filter(r => r.ok).length || 0;
        const fail = resp.results?.filter(r => !r.ok).length || 0;
        let msg = `✅ Formazioni importate: ${resp.imported}/${resp.total}`;
        if (fail > 0) msg += `\n⚠️ ${fail} partite con errori`;
        alert(msg);
        loadImportCenter();
      } catch (err) {
        hideLoading();
        alert('Errore: ' + err.message);
      }
    });
  } catch (err) {
    document.getElementById('fmMatchList').innerHTML = `<p style="color:red;">❌ ${err.message}</p>`;
  }
}

// === GAZZETTA REGIONALE: CONFIGURA URL ===
function openGrConfig() {
  const teamName = window.YFM.getSquadraName();
  const modal = createModal('⚙️ Configura Girone — ' + teamName, `
    <div style="background:#f0f4ff;padding:10px 12px;border-radius:8px;margin-bottom:16px;font-size:13px;">
      🏃 Squadra: <strong>${teamName}</strong>
    </div>
    <div id="grWizard">
      <div class="form-group" style="margin-bottom:12px;">
        <label>1. Campionato</label>
        <select id="grChamp" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;">
          <option value="">Caricamento...</option>
        </select>
      </div>
      <div class="form-group" style="margin-bottom:12px;">
        <label>2. Girone</label>
        <select id="grGroup" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;" disabled>
          <option value="">Seleziona prima il campionato</option>
        </select>
      </div>
      <div id="grPreview" style="margin-top:12px;"></div>
    </div>
    <details style="margin-top:16px;">
      <summary style="font-size:12px;color:#999;cursor:pointer;">Inserimento manuale URL (fallback)</summary>
      <div class="form-group" style="margin-top:8px;">
        <input id="grUrl" placeholder="es. https://v2.apiweb.gazzettaregionale.it/classifiche/classifica/1/55/2325" style="font-size:12px;">
        <button class="btn btn-secondary btn-small" id="grSaveUrl" style="margin-top:6px;">Salva URL</button>
      </div>
    </details>
    <div id="grConfigResult"></div>
  `, '<button class="btn btn-secondary" id="modalCancel">Annulla</button><button class="btn btn-primary" id="grSave" disabled>✅ Conferma</button>', '650px');

  let selectedLevel = '1'; // Giovanili default
  let selectedChamp = '';
  let selectedGroup = '';

  // Load championships (level 1 = Giovanili)
  async function loadChampionships() {
    const sel = document.getElementById('grChamp');
    sel.innerHTML = '<option value="">Caricamento...</option>';
    try {
      const data = await apiFetch('/gr/championships/1');
      sel.innerHTML = '<option value="">-- Seleziona campionato --</option>' +
        data.map(d => '<option value="' + d.id + '">' + d.text + '</option>').join('');
    } catch (e) {
      sel.innerHTML = '<option value="">Errore caricamento</option>';
    }
  }

  async function loadGroups(champId) {
    const sel = document.getElementById('grGroup');
    sel.disabled = true;
    sel.innerHTML = '<option value="">Caricamento...</option>';
    document.getElementById('grPreview').innerHTML = '';
    document.getElementById('grSave').disabled = true;
    try {
      const data = await apiFetch('/gr/groups/1/' + champId);
      if (data.length === 0) {
        sel.innerHTML = '<option value="">Nessun girone</option>';
        return;
      }
      sel.innerHTML = '<option value="">-- Seleziona girone --</option>' +
        data.map(d => '<option value="' + d.id + '">Girone ' + d.text + '</option>').join('');
      sel.disabled = false;
    } catch (e) {
      sel.innerHTML = '<option value="">Errore</option>';
    }
  }

  async function loadPreview(champId, groupId) {
    const div = document.getElementById('grPreview');
    div.innerHTML = '<div style="text-align:center;padding:8px;color:#666;"><div class="spinner" style="margin:0 auto 6px;"></div>Caricamento anteprima...</div>';
    try {
      const data = await apiFetch('/gr/preview/1/' + champId + '/' + groupId);
      if (!data.classifica || data.classifica.length === 0) {
        div.innerHTML = '<div style="color:#c00;padding:8px;">Nessuna classifica trovata</div>';
        return;
      }
      const info = data.info || {};
      let html = '<div style="background:#e8f5e9;padding:8px 12px;border-radius:8px;margin-bottom:8px;font-size:12px;">✅ ' + info.championship_name + ' - Gir. ' + (info.group_name || '') + ' (' + data.classifica.length + ' squadre)</div>';
      html += '<div style="max-height:200px;overflow-y:auto;border:1px solid #eee;border-radius:8px;padding:4px 8px;font-size:12px;">';
      data.classifica.forEach(r => {
        const isUs = r.nome.toLowerCase().includes(teamName.toLowerCase()) || teamName.toLowerCase().includes(r.nome.toLowerCase());
        const style = isUs ? 'font-weight:700;color:#667eea;background:#f0f4ff;' : '';
        html += '<div style="padding:3px 0;border-bottom:1px solid #f5f5f5;' + style + '">' + r.pos + '. ' + r.nome + ' (' + r.punti + ' pt)</div>';
      });
      html += '</div>';
      div.innerHTML = html;
      document.getElementById('grSave').disabled = false;
      selectedGroup = groupId;
      selectedChamp = champId;
    } catch (e) {
      div.innerHTML = '<div style="color:#c00;padding:8px;">❌ ' + e.message + '</div>';
    }
  }

  loadChampionships();

  document.getElementById('grChamp').addEventListener('change', (e) => {
    if (e.target.value) loadGroups(e.target.value);
    else {
      document.getElementById('grGroup').innerHTML = '<option value="">Seleziona prima il campionato</option>';
      document.getElementById('grGroup').disabled = true;
      document.getElementById('grPreview').innerHTML = '';
      document.getElementById('grSave').disabled = true;
    }
  });

  document.getElementById('grGroup').addEventListener('change', (e) => {
    const champId = document.getElementById('grChamp').value;
    if (e.target.value && champId) loadPreview(champId, e.target.value);
  });

  document.getElementById('grSave').addEventListener('click', async () => {
    if (!selectedChamp || !selectedGroup) return;
    const url = '1/' + selectedChamp + '/' + selectedGroup;
    showLoading('Salvataggio...');
    try {
      await apiFetch('/gr/configure', { method: 'POST', body: JSON.stringify({ teamId: window.YFM.squadraId, url }) });
      hideLoading();
      modal.close();
      alert('✅ Girone configurato per ' + teamName + '!');
    } catch (err) {
      hideLoading();
      alert('❌ ' + err.message);
    }
  });

  // Fallback URL manuale
  document.getElementById('grSaveUrl')?.addEventListener('click', async () => {
    const url = document.getElementById('grUrl').value.trim();
    if (!url) { alert('Inserisci un URL'); return; }
    showLoading('Salvataggio...');
    try {
      await apiFetch('/gr/configure', { method: 'POST', body: JSON.stringify({ teamId: window.YFM.squadraId, url }) });
      hideLoading();
      modal.close();
      alert('✅ URL configurato!');
    } catch (err) {
      hideLoading();
      alert('❌ ' + err.message);
    }
  });
}

// === GAZZETTA REGIONALE: IMPORT CALENDARIO ===
async function openGrCalendario() {
  const modal = createModal('📅 Import Calendario da Gazzetta Regionale', '<div class="loading"><div class="spinner"></div>Caricamento anteprima...</div>', '<button class="btn btn-secondary" id="modalCancel">Annulla</button><button class="btn btn-primary" id="grCalConfirm" disabled>Importa</button>', '700px');

  try {
    const data = await apiFetch('/gr/calendario/' + window.YFM.squadraId);
    const body = document.querySelector('#importModal .modal-body');
    if (!data.matches || data.matches.length === 0) {
      body.innerHTML = '<div style="color:#c00;padding:12px;">❌ Nessuna partita trovata. Configura prima il girone.</div>';
      return;
    }

    const teamName = data.teamName || '';
    const ourMatches = data.matches.filter(m =>
      m.casa.toLowerCase().includes(teamName.toLowerCase()) || teamName.toLowerCase().includes(m.casa.toLowerCase()) ||
      m.ospite.toLowerCase().includes(teamName.toLowerCase()) || teamName.toLowerCase().includes(m.ospite.toLowerCase())
    );

    let html = `<div style="background:#e8f5e9;padding:10px 12px;border-radius:8px;margin-bottom:12px;font-size:13px;">✅ ${ourMatches.length} partite trovate per <strong>${teamName}</strong></div>`;
    html += '<div style="margin-bottom:12px;"><label style="font-size:13px;cursor:pointer;"><input type="radio" name="grCalMode" value="all" checked> Importa calendario + risultati</label><br><label style="font-size:13px;cursor:pointer;"><input type="radio" name="grCalMode" value="results"> Aggiorna solo Risultati (match esistenti)</label></div>';
    html += '<div style="max-height:300px;overflow-y:auto;border:1px solid #eee;border-radius:8px;padding:8px;font-size:12px;">';
    ourMatches.forEach(m => {
      const isCasa = m.casa.toLowerCase().includes(teamName.toLowerCase()) || teamName.toLowerCase().includes(m.casa.toLowerCase());
      const avv = isCasa ? m.ospite : m.casa;
      const icon = isCasa ? '🏠' : '✈️';
      const score = (m.gol_casa !== null && m.gol_casa !== undefined) ? ` ${m.gol_casa}-${m.gol_ospite}` : '';
      html += `<div style="padding:3px 0;border-bottom:1px solid #f5f5f5;">G.${m.giornata} | ${m.data} | ${icon} ${avv}${score}</div>`;
    });
    html += '</div>';
    body.innerHTML = html;
    document.getElementById('grCalConfirm').disabled = false;

    document.getElementById('grCalConfirm').addEventListener('click', async () => {
      const mode = document.querySelector('input[name="grCalMode"]:checked')?.value || 'all';
      showLoading('Importazione...');
      try {
        const resp = await apiFetch('/gr/import-calendario/' + window.YFM.squadraId, {
          method: 'POST',
          body: JSON.stringify({ mode })
        });
        hideLoading();
        modal.close();
        alert(`✅ Calendario importato!\n• Importate: ${resp.imported}\n• Aggiornate: ${resp.updated || 0}\n• Già presenti: ${resp.skipped}\n• Totale: ${resp.total}`);
        loadImportCenter();
      } catch (err) {
        hideLoading();
        alert('❌ ' + err.message);
      }
    });
  } catch (err) {
    const body = document.querySelector('#importModal .modal-body');
    if (body) body.innerHTML = `<div style="color:#c00;padding:12px;">❌ ${err.message}</div>`;
  }
}

// === GAZZETTA REGIONALE: IMPORT LOGHI ===
async function openGrLoghi() {
  const modal = createModal('🏷️ Import Loghi da Gazzetta Regionale', '<div class="loading"><div class="spinner"></div>Caricamento anteprima...</div>', '<button class="btn btn-secondary" id="modalCancel">Annulla</button><button class="btn btn-primary" id="grLoghiConfirm" disabled>Scarica loghi</button>', '600px');

  try {
    const data = await apiFetch('/gr/calendario/' + window.YFM.squadraId);
    const body = document.querySelector('#importModal .modal-body');
    if (!data.matches || data.matches.length === 0) {
      body.innerHTML = '<div style="color:#c00;padding:12px;">❌ Configura prima il girone.</div>';
      return;
    }

    // Extract unique logos
    const logos = {};
    data.matches.forEach(m => {
      if (m.casa_logo) logos[m.casa] = m.casa_logo;
      if (m.ospite_logo) logos[m.ospite] = m.ospite_logo;
    });
    const logoList = Object.entries(logos);

    let html = `<div style="background:#e8f5e9;padding:10px 12px;border-radius:8px;margin-bottom:12px;font-size:13px;">✅ ${logoList.length} loghi disponibili</div>`;
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;max-height:300px;overflow-y:auto;">';
    logoList.forEach(([nome, url]) => {
      html += `<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid #eee;border-radius:8px;font-size:11px;"><img src="${url}" style="width:24px;height:24px;border-radius:50%;object-fit:contain;">${nome}</div>`;
    });
    html += '</div>';
    body.innerHTML = html;
    document.getElementById('grLoghiConfirm').disabled = false;

    document.getElementById('grLoghiConfirm').addEventListener('click', async () => {
      showLoading('Download loghi...');
      try {
        const resp = await apiFetch('/gr/import-loghi/' + window.YFM.squadraId, { method: 'POST' });
        hideLoading();
        modal.close();
        alert(`✅ Loghi importati!\n• Nuovi: ${resp.imported}\n• Già presenti: ${resp.skipped}\n• Errori: ${resp.errors}`);
      } catch (err) {
        hideLoading();
        alert('❌ ' + err.message);
      }
    });
  } catch (err) {
    const body = document.querySelector('#importModal .modal-body');
    if (body) body.innerHTML = `<div style="color:#c00;padding:12px;">❌ ${err.message}</div>`;
  }
}

// === GAZZETTA REGIONALE: ANTEPRIMA ===
async function openGrPreview() {
  const modal = createModal('👁️ Anteprima Girone — Gazzetta Regionale', '<div class="loading"><div class="spinner"></div>Caricamento dati...</div>', '<button class="btn btn-secondary" id="modalCancel">Chiudi</button>', '800px');

  try {
    const teamId = window.YFM.squadraId;
    const [classifica, marcatori] = await Promise.all([
      apiFetch('/gr/classifica/' + teamId),
      apiFetch('/gr/marcatori/' + teamId)
    ]);

    const body = modal.close.__modal?.querySelector('.modal-body') || document.querySelector('#importModal .modal-body');
    if (!body) return;

    let html = '';
    if (!classifica.classifica) {
      html = '<div style="color:#c00;padding:16px;background:#fee;border-radius:8px;">❌ URL non configurato. Usa "Configura URL Girone" prima.</div>';
    } else {
      const info = classifica.info || {};
      html += `<h3 style="margin:0 0 8px;font-size:14px;">🏆 ${info.championship_name || 'Classifica'} - Gir. ${info.group_name || ''}</h3>`;
      html += `<div style="font-size:11px;color:#999;margin-bottom:12px;">Aggiornata al ${info.aggiornamento || '?'} • Stagione ${info.season || ''}</div>`;
      html += '<div style="overflow-x:auto;margin-bottom:24px;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#f5f5f5;"><th style="padding:6px;">#</th><th style="padding:6px;text-align:left;">Squadra</th><th style="padding:6px;">Pt</th><th style="padding:6px;">G</th><th style="padding:6px;">V</th><th style="padding:6px;">N</th><th style="padding:6px;">P</th><th style="padding:6px;">GF</th><th style="padding:6px;">GS</th></tr></thead><tbody>';
      const teamName = classifica.teamName || '';
      classifica.classifica.forEach(r => {
        const isUs = r.nome.toLowerCase().includes(teamName.toLowerCase()) || teamName.toLowerCase().includes(r.nome.toLowerCase());
        const style = isUs ? ' style="background:#f0f4ff;font-weight:700;color:#667eea;"' : '';
        const logo = r.logo ? `<img src="${r.logo}" style="width:18px;height:18px;border-radius:50%;object-fit:contain;flex-shrink:0;" onerror="this.style.display='none'">` : '';
        html += `<tr${style}><td style="padding:4px 6px;text-align:center;">${r.pos}</td><td style="padding:4px 6px;"><div style="display:flex;align-items:center;gap:6px;white-space:nowrap;">${logo}<span>${r.nome}</span></div></td><td style="padding:4px 6px;text-align:center;font-weight:700;">${r.punti}</td><td style="padding:4px 6px;text-align:center;">${r.g}</td><td style="padding:4px 6px;text-align:center;">${r.v}</td><td style="padding:4px 6px;text-align:center;">${r.n}</td><td style="padding:4px 6px;text-align:center;">${r.p}</td><td style="padding:4px 6px;text-align:center;">${r.gf}</td><td style="padding:4px 6px;text-align:center;">${r.gs}</td></tr>`;
      });
      html += '</tbody></table></div>';

      // Marcatori
      if (marcatori.marcatori && marcatori.marcatori.length > 0) {
        const teamMarcatori = marcatori.marcatori.filter(m => {
          const mn = m.squadra.toLowerCase();
          return mn.includes(teamName.toLowerCase()) || teamName.toLowerCase().includes(mn);
        });

        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">';
        html += '<div><h4 style="font-size:13px;margin:0 0 6px;">⚽ Top 10 Regionali</h4>';
        html += '<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#f5f5f5;"><th style="padding:3px 4px;text-align:center;">#</th><th style="padding:3px 4px;text-align:left;">Giocatore</th><th style="padding:3px 4px;text-align:center;">Gol</th><th style="padding:3px 4px;text-align:left;">Squadra</th></tr></thead><tbody>';
        marcatori.marcatori.slice(0, 10).forEach((m, i) => {
          const isOur = m.squadra.toLowerCase().includes(teamName.toLowerCase()) || teamName.toLowerCase().includes(m.squadra.toLowerCase());
          const rowStyle = isOur ? ' style="background:#f0f4ff;font-weight:600;color:#667eea;"' : '';
          html += `<tr${rowStyle}><td style="padding:2px 4px;text-align:center;">${i + 1}</td><td style="padding:2px 4px;">${m.nome}</td><td style="padding:2px 4px;text-align:center;font-weight:700;">${m.gol}</td><td style="padding:2px 4px;color:#666;">${m.squadra}</td></tr>`;
        });
        html += '</tbody></table></div>';

        if (teamMarcatori.length > 0) {
          html += `<div><h4 style="font-size:13px;margin:0 0 6px;color:#667eea;">⚽ ${teamName}</h4>`;
          html += '<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#f5f5f5;"><th style="padding:3px 4px;text-align:left;">Giocatore</th><th style="padding:3px 4px;text-align:center;">Gol</th></tr></thead><tbody>';
          teamMarcatori.slice(0, 10).forEach(m => {
            html += `<tr><td style="padding:2px 4px;">${m.nome}</td><td style="padding:2px 4px;text-align:center;font-weight:700;">${m.gol}</td></tr>`;
          });
          html += '</tbody></table></div>';
        }
        html += '</div>';
      }
    }

    body.innerHTML = html;
  } catch (err) {
    const body = document.querySelector('#importModal .modal-body');
    if (body) body.innerHTML = `<div style="color:#c00;padding:16px;">❌ ${err.message}</div>`;
  }
}

// === WIZARD LOGHI BATCH (superadmin) ===
function openGrLoghiWizard() {
  const modal = createModal('🧙 Wizard Loghi — Batch GR', `
    <p style="margin-bottom:16px;color:#666;font-size:13px;">Scansiona tutti i campionati e gironi di Gazzetta Regionale per scaricare loghi mancanti e rilevare aggiornamenti.</p>
    <div style="margin-bottom:16px;">
      <label style="font-size:13px;font-weight:600;margin-bottom:8px;display:block;">Scope scansione:</label>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;margin-bottom:4px;"><input type="checkbox" id="wizLvl1" checked> Giovanili</label>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;"><input type="checkbox" id="wizLvl2" checked> Dilettanti</label>
    </div>
    <div id="wizResult"></div>
  `, '<button class="btn btn-secondary" id="modalCancel">Annulla</button><button class="btn btn-primary" id="wizStart">🚀 Avvia Scansione</button>', '700px');

  document.getElementById('wizStart').addEventListener('click', async () => {
    const levels = [];
    if (document.getElementById('wizLvl1').checked) levels.push(1);
    if (document.getElementById('wizLvl2').checked) levels.push(2);
    if (levels.length === 0) { alert('Seleziona almeno un livello'); return; }

    const resultDiv = document.getElementById('wizResult');
    resultDiv.innerHTML = '<div style="text-align:center;padding:24px;"><div class="spinner" style="margin:0 auto 8px;"></div><p style="color:#666;font-size:13px;">Scansione in corso... Potrebbe richiedere qualche minuto.</p><p style="color:#999;font-size:11px;">Naviga tutti i gironi, scarica nuovi loghi, rileva aggiornamenti.</p></div>';
    document.getElementById('wizStart').disabled = true;

    try {
      const resp = await apiFetch('/gr/logos-wizard', {
        method: 'POST',
        body: JSON.stringify({ levels })
      });

      let html = `<div style="background:#e8f5e9;padding:12px;border-radius:8px;margin-bottom:16px;">
        <strong>✅ Scansione completata</strong><br>
        <span style="font-size:12px;color:#555;">Gironi: ${resp.groupsScanned} | Nuovi: <strong style="color:#27AE60;">+${resp.newImported}</strong> | Invariati: ${resp.unchanged} | Errori: ${resp.errors} | Totale file: ${resp.totalLogos}</span>
      </div>`;

      if (resp.updates && resp.updates.length > 0) {
        html += `<h3 style="font-size:14px;margin-bottom:8px;">🔄 ${resp.updates.length} loghi con aggiornamenti disponibili</h3>
        <p style="font-size:12px;color:#666;margin-bottom:12px;">Confronta vecchio e nuovo, poi scegli per ciascuno.</p>
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <button class="btn btn-small btn-secondary" id="wizAcceptAll">✅ Accetta tutti</button>
          <button class="btn btn-small btn-secondary" id="wizRejectAll">❌ Rifiuta tutti</button>
        </div>
        <div id="wizUpdates" style="max-height:400px;overflow-y:auto;">`;
        resp.updates.forEach((u, i) => {
          const sizeDiff = u.newSize - u.oldSize;
          const diffLabel = sizeDiff > 0 ? `+${(sizeDiff/1024).toFixed(1)}KB` : `${(sizeDiff/1024).toFixed(1)}KB`;
          html += `<div class="wiz-update-row" style="display:grid;grid-template-columns:1fr 80px 80px 120px;align-items:center;gap:8px;padding:8px;border:1px solid #eee;border-radius:8px;margin-bottom:6px;" data-idx="${i}">
            <div style="display:flex;align-items:center;gap:8px;">
              <img src="${u.oldPath}" style="width:32px;height:32px;object-fit:contain;border:1px solid #ddd;border-radius:4px;" title="Vecchio">
              <span style="font-size:18px;">→</span>
              <img src="${u.newPath}" style="width:32px;height:32px;object-fit:contain;border:1px solid #667eea;border-radius:4px;" title="Nuovo">
              <span style="font-size:12px;">${u.nome || u.fileName}</span>
            </div>
            <span style="font-size:11px;color:#888;">${(u.oldSize/1024).toFixed(1)}KB</span>
            <span style="font-size:11px;color:#667eea;">${(u.newSize/1024).toFixed(1)}KB (${diffLabel})</span>
            <select class="wiz-decision" data-idx="${i}" style="padding:4px 8px;border-radius:6px;border:1px solid #ddd;font-size:12px;">
              <option value="accept">✅ Aggiorna</option>
              <option value="reject">❌ Mantieni vecchio</option>
            </select>
          </div>`;
        });
        html += '</div><button class="btn btn-primary" id="wizConfirm" style="margin-top:12px;width:100%;">💾 Conferma scelte</button>';
      } else {
        html += '<p style="color:#27AE60;font-size:13px;">Tutti i loghi sono aggiornati, nessuna differenza rilevata.</p>';
      }

      resultDiv.innerHTML = html;

      // Store updates for confirm
      const updatesData = resp.updates || [];

      document.getElementById('wizAcceptAll')?.addEventListener('click', () => {
        document.querySelectorAll('.wiz-decision').forEach(s => { s.value = 'accept'; });
      });
      document.getElementById('wizRejectAll')?.addEventListener('click', () => {
        document.querySelectorAll('.wiz-decision').forEach(s => { s.value = 'reject'; });
      });

      document.getElementById('wizConfirm')?.addEventListener('click', async () => {
        const decisions = updatesData.map((u, i) => {
          const sel = document.querySelector(`.wiz-decision[data-idx="${i}"]`);
          return { fileName: u.fileName, nomeNorm: u.nomeNorm, nome: u.nome, action: sel?.value || 'reject' };
        });

        showLoading('Applicazione scelte...');
        try {
          const confirmResp = await apiFetch('/gr/logos-confirm', {
            method: 'POST',
            body: JSON.stringify({ decisions })
          });
          hideLoading();
          modal.close();
          alert(`✅ Completato!\n• Aggiornati: ${confirmResp.accepted}\n• Mantenuti: ${confirmResp.rejected}`);
        } catch (err) {
          hideLoading();
          alert('❌ ' + err.message);
        }
      });
    } catch (err) {
      resultDiv.innerHTML = `<div style="color:#c00;padding:12px;background:#fee;border-radius:8px;">❌ ${err.message}</div>`;
      document.getElementById('wizStart').disabled = false;
    }
  });
}

// === MODAL HELPER ===
function createModal(title, content, footer, maxW = '600px') {
  const existing = document.getElementById('importModal');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'modal-overlay';
  el.id = 'importModal';
  el.innerHTML = `<div class="modal-content" style="max-width:${maxW};max-height:90vh;overflow-y:auto;">
    <div class="modal-header"><h2>${title}</h2><button class="modal-close-btn" id="imCloseX">×</button></div>
    <div class="modal-body">${content}</div>
    ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
  </div>`;
  document.body.appendChild(el);
  const close = () => { const m = document.getElementById('importModal'); if (m) m.remove(); };
  close.__modal = el;
  document.getElementById('imCloseX').addEventListener('click', close);
  el.addEventListener('click', e => { if (e.target === el) close(); });
  const cancelBtn = document.getElementById('modalCancel');
  if (cancelBtn) cancelBtn.addEventListener('click', close);
  return { close };
}
