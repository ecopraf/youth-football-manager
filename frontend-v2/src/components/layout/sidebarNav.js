/**
 * sidebarNav.js - Genera il menu di navigazione sidebar
 * Filtra le voci in base a capabilities, ruolo e profilo utente
 */

export function buildNavHtml({ user, isGuest, isSuperadmin }) {
  if (isGuest) return buildGuestNav();

  const showForRole = (roles) => {
    if (!user) return false;
    if (isSuperadmin) return true;
    return roles.includes(user.ruolo);
  };

  const hasCap = (capId) => {
    if (!user) return false;
    if (isSuperadmin) return true;
    if (user.ruolo === 'admin') return true;
    if (user.ruolo === 'allenatore') {
      const permessi = user.permessi || {};
      const caps = permessi.capabilities || permessi;
      if (!caps || Object.keys(caps).length === 0) return true;
      return !!caps[capId];
    }
    const permessi = user.permessi || {};
    const caps = permessi.capabilities || permessi;
    return !!caps[capId];
  };

  let html = '';

  // Dashboard — sempre visibile
  html += navItem('dashboard', '🏠', 'Dashboard', 'Panoramica: statistiche, prossima partita, top players', true);

  // Team
  html += sectionTitle('⚽ Team');
  if (hasCap('rosa')) html += navItem('roster', '👕', 'Rosa', 'Lista giocatori, statistiche individuali, storico');
  if (hasCap('partite')) html += navItem('calendar', '📅', 'Calendario', 'Calendario partite, risultati, archiviazione');

  // Coach
  if (hasCap('allenamenti')) {
    html += sectionTitle('🎯 Coach');
    html += '<a href="#" class="sidebar-expandable" id="trainingToggle" title="🏋️ Allenamenti">🏋️ Allenamenti <span style="float:right;font-size:10px;">▶</span></a>';
    html += '<div id="trainingSubmenu" style="display:none;padding-left:12px;">';
    html += navItem('trainingSessions', '📋', 'Sedute', 'Programma sedute');
    html += navItem('trainingPresenze', '🙋', 'Presenze', 'Presenze allenamenti');
    html += navItem('trainingSettings', '⚙️', 'Impostazioni', 'Configurazione allenamenti');
    html += '</div>';
  }

  // Performance
  if (hasCap('statistiche') || hasCap('report')) {
    html += sectionTitle('📈 Performance');
    if (hasCap('statistiche')) html += navItem('stats', '📊', 'Statistiche', 'Marcatori, assist, discipline, statistiche');
    if (hasCap('report')) html += navItem('reports', '📄', 'Report', 'Report partita e stagionale PDF');
    if (hasCap('report')) html += navItem('printCenter', '🖨', 'Print Center', 'Hub documenti: stampa, anteprima, condividi');
  }

  // Club
  html += sectionTitle('🏛️ Club');
  html += navItem('club', '🏢', 'Società', 'Organigramma, staff e riferimenti società');
  if (showForRole(['admin', 'allenatore'])) html += navItem('staff', '👔', 'Staff', 'Staff tecnico e societario');
  if (showForRole(['admin']) || hasCap('quote')) html += navItem('fees', '💰', 'Quote', 'Gestione quote economiche');
  if (showForRole(['admin']) || hasCap('kit')) html += navItem('kit', '👕', 'Kit', 'Gestione kit sportivo');
  if (showForRole(['admin']) || hasCap('tesseramento')) html += navItem('registration', '📋', 'Tesseramento', 'Iscrizioni e documenti');

  // Import Center — visibile a chi ha capability import
  if (hasCap('import') && !showForRole(['admin'])) {
    html += sectionTitle('🔧 Strumenti');
    html += navItem('importCenter', '📥', 'Import Center', 'Import dati da fonti esterne');
  }

  // Amministrazione
  if (showForRole(['admin'])) {
    html += sectionTitle('🔐 Amministrazione');
    html += navItem('seasonsCategories', '🗓️', 'Stagioni', 'Gestione stagioni e categorie');
    if (hasCap('import')) html += navItem('importCenter', '📥', 'Import Center', 'Import dati da fonti esterne');
    if (isSuperadmin) html += navItem('workspaces', '🌐', 'Workspace', 'Gestione workspace/società');
    html += navItem('users', '👥', 'Utenti', 'Gestione utenti e permessi');
  }

  // Guest Links
  if (hasCap('guest_links')) html += navItem('guestLinks', '🔗', 'Link Guest', 'Genera e gestisci link guest temporanei');

  return html;
}

function buildGuestNav() {
  let html = '';
  html += navItem('dashboard', '🏠', 'Dashboard', 'Panoramica', true);
  html += sectionTitle('⚽ Team');
  html += navItem('roster', '👕', 'Rosa', 'Lista giocatori');
  html += navItem('calendar', '📅', 'Calendario', 'Calendario partite');
  html += sectionTitle('🏛️ Club');
  html += navItem('club', '🏢', 'Società', 'Riferimenti società');
  return html;
}

function navItem(page, icon, label, tooltip, active = false) {
  return `<a href="#"${active ? ' class="active"' : ''} data-page="${page}" title="${icon} ${tooltip}">${icon} ${label}</a>`;
}

function sectionTitle(text) {
  return `<div class="sidebar-section-title">${text}</div>`;
}
