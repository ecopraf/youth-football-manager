import { apiFetch } from '../../services/api.js';

export default async function loadClub() {
  const c = document.getElementById('pageContent');
  c.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';

  try {
    const wid = window.YFM.workspaceId || window.YFM.activeWorkspaceId;
    const teamId = window.YFM.squadraId;

    const [wsData, facility, staffData] = await Promise.all([
      apiFetch('/auth/workspaces').then(ws => ws.find(w => w.id === wid) || ws[0]),
      apiFetch('/workspaces/' + wid + '/facility').catch(() => null),
      apiFetch('/squadre/' + teamId + '/staff-completo').catch(() => [])
    ]);

    renderClub(c, wsData, facility, staffData);
  } catch (e) {
    c.innerHTML = '<div class="error-box">Errore: ' + e.message + '</div>';
  }
}

function renderClub(c, ws, facility, staff) {
  const teamName = window.YFM.getSquadraName();
  const logo = ws?.logo_url || '';

  // Raggruppa staff per ruolo
  const staffTecnico = staff.filter(s => ['allenatore', 'preparatore_atletico', 'allenatore_portieri', 'collaboratore'].includes(s.ruolo_squadra));
  const staffDirigenziale = staff.filter(s => ['dirigente', 'direttore_sportivo', 'osservatore'].includes(s.ruolo_squadra));

  const ruoloLabels = {
    allenatore: 'Allenatore',
    preparatore_atletico: 'Preparatore Atletico',
    allenatore_portieri: 'Allenatore Portieri',
    collaboratore: 'Collaboratore Tecnico',
    dirigente: 'Dirigente',
    direttore_sportivo: 'Direttore Sportivo',
    osservatore: 'Osservatore'
  };

  let html = `<style>
    .club-header { display:flex; align-items:center; gap:16px; margin-bottom:24px; }
    .club-logo { width:64px; height:64px; border-radius:12px; object-fit:contain; background:#f5f5f5; padding:4px; }
    .club-name { font-size:22px; font-weight:700; color:#1a1a2e; }
    .club-team { font-size:14px; color:#667eea; font-weight:500; }
    .club-cards { display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:16px; margin-bottom:24px; }
    .club-card { background:white; border-radius:12px; padding:20px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #eee; }
    .club-card-title { font-size:14px; font-weight:700; color:#1a1a2e; margin-bottom:12px; display:flex; align-items:center; gap:8px; }
    .club-staff-item { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid #f5f5f5; }
    .club-staff-item:last-child { border-bottom:none; }
    .club-staff-avatar { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, #667eea, #764ba2); color:white; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:600; flex-shrink:0; }
    .club-staff-name { font-size:13px; font-weight:600; color:#333; }
    .club-staff-role { font-size:11px; color:#888; }
    .club-info-row { display:flex; align-items:center; gap:8px; padding:6px 0; font-size:13px; color:#555; }
    .club-info-icon { font-size:16px; width:24px; text-align:center; }
    .club-empty { color:#999; font-size:13px; font-style:italic; padding:8px 0; }
    @media (max-width:639px) { .club-cards { grid-template-columns:1fr; } .club-header { flex-direction:column; align-items:flex-start; } }
  </style>`;

  html += `<div class="club-header">
    ${logo ? `<img src="${logo}" class="club-logo" alt="Logo">` : '<div class="club-logo" style="display:flex;align-items:center;justify-content:center;font-size:28px;">🏢</div>'}
    <div>
      <div class="club-name">${ws?.nome || 'Società'}</div>
      <div class="club-team">${teamName}</div>
    </div>
  </div>`;

  html += '<div class="club-cards">';

  // Staff Tecnico
  html += `<div class="club-card">
    <div class="club-card-title">⚽ Staff Tecnico</div>`;
  if (staffTecnico.length > 0) {
    staffTecnico.forEach(s => {
      const initials = (s.nome?.[0] || '') + (s.cognome?.[0] || '');
      html += `<div class="club-staff-item">
        <div class="club-staff-avatar">${initials.toUpperCase()}</div>
        <div><div class="club-staff-name">${s.cognome} ${s.nome}</div><div class="club-staff-role">${ruoloLabels[s.ruolo_squadra] || s.ruolo_squadra}</div></div>
      </div>`;
    });
  } else {
    html += '<div class="club-empty">Nessuno staff tecnico assegnato</div>';
  }
  html += '</div>';

  // Staff Dirigenziale
  html += `<div class="club-card">
    <div class="club-card-title">👔 Dirigenza</div>`;
  if (staffDirigenziale.length > 0) {
    staffDirigenziale.forEach(s => {
      const initials = (s.nome?.[0] || '') + (s.cognome?.[0] || '');
      html += `<div class="club-staff-item">
        <div class="club-staff-avatar" style="background:linear-gradient(135deg, #F39C12, #E74C3C);">${initials.toUpperCase()}</div>
        <div><div class="club-staff-name">${s.cognome} ${s.nome}</div><div class="club-staff-role">${ruoloLabels[s.ruolo_squadra] || s.ruolo_squadra}</div></div>
      </div>`;
    });
  } else {
    html += '<div class="club-empty">Nessun dirigente assegnato</div>';
  }
  html += '</div>';

  // Info Società
  html += `<div class="club-card">
    <div class="club-card-title">🏢 Riferimenti</div>`;
  if (facility) {
    if (facility.nome) html += `<div class="club-info-row"><span class="club-info-icon">🏟️</span>${facility.nome}</div>`;
    if (facility.indirizzo) html += `<div class="club-info-row"><span class="club-info-icon">📍</span>${facility.indirizzo}</div>`;
    if (facility.citta) html += `<div class="club-info-row"><span class="club-info-icon">🏙️</span>${facility.citta}</div>`;
  }
  if (ws?.email) html += `<div class="club-info-row"><span class="club-info-icon">📧</span>${ws.email}</div>`;
  if (ws?.telefono) html += `<div class="club-info-row"><span class="club-info-icon">📞</span>${ws.telefono}</div>`;
  if (!facility && !ws?.email && !ws?.telefono) {
    html += '<div class="club-empty">Nessun riferimento configurato</div>';
  }
  html += '</div>';

  html += '</div>';
  c.innerHTML = html;
}
