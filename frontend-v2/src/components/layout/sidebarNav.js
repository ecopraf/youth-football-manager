import { PROFILI } from '../../utils/capabilities.js';

/**
 * sidebarNav.js - Genera il menu di navigazione sidebar
 * Filtra le voci in base a capabilities, ruolo e profilo utente
 */

export function buildNavHtml({ user, isGuest, isSuperadmin }) {
  if (isGuest) return buildGuestNav(user?.guestTipo);

  const showForRole = (roles) => {
    if (!user) return false;
    if (isSuperadmin) return true;
    return roles.includes(user.ruolo);
  };

  const hasCap = (capId) => {
    if (!user) return false;
    if (isSuperadmin) return true;
    if (user.ruolo === 'admin') return true;
    const permessi = user.permessi || {};
    const caps = permessi.capabilities || permessi;
    // Se la capability è esplicitamente salvata, usarla
    if (caps && capId in caps) {
      if (user.ruolo === 'allenatore' && Object.keys(caps).length === 0) return true;
      return !!caps[capId];
    }
    // Fallback: se l'utente ha un profilo riconosciuto, usare il default del profilo
    const profilo = permessi.profilo;
    if (profilo && PROFILI[profilo]) {
      return !!(PROFILI[profilo].capabilities || {})[capId];
    }
    // Legacy: allenatore senza permessi → tutto visibile
    if (user.ruolo === 'allenatore') return true;
    return false;
  };

  // Determina profilo dominante per ordinamento sezioni
  const profilo = user?.permessi?.profilo || user?.ruolo || '';
  const isSegreteria = profilo === 'segreteria' && !showForRole(['admin']);

  const buildTeam = () => {
    let s = '';
    s += sectionTitle('⚽ Team');
    if (hasCap('rosa')) s += navItem('roster', '👕', 'Rosa', 'Lista giocatori, statistiche individuali, storico');
    if (hasCap('partite')) s += navItem('calendar', '📅', 'Calendario', 'Calendario partite, risultati, archiviazione');
    return s;
  };

  const buildCoach = () => {
    if (!hasCap('allenamenti')) return '';
    let s = sectionTitle('🎯 Coach');
    s += '<a href="#" class="sidebar-expandable" id="trainingToggle" title="🏋️ Allenamenti">🏋️ Allenamenti <span style="float:right;font-size:10px;">▶</span></a>';
    s += '<div id="trainingSubmenu" style="display:none;padding-left:12px;">';
    s += navItem('trainingSessions', '📋', 'Sedute', 'Programma sedute');
    s += navItem('trainingPresenze', '🙋', 'Presenze', 'Presenze allenamenti');
    s += navItem('trainingSettings', '⚙️', 'Impostazioni', 'Configurazione allenamenti');
    s += '</div>';
    return s;
  };

  const buildPerformance = () => {
    if (!hasCap('statistiche') && !hasCap('report')) return '';
    let s = sectionTitle('📈 Performance');
    if (hasCap('statistiche')) s += navItem('stats', '📊', 'Statistiche', 'Marcatori, assist, discipline, statistiche');
    if (hasCap('statistiche')) s += navItem('playerPerformance', '⭐', 'Voti & Trend', 'Voti, trend, top performer, analisi reparto');
    if (hasCap('report')) s += navItem('reports', '📄', 'Report', 'Report partita e stagionale PDF');
    if (hasCap('report')) s += navItem('printCenter', '🖨', 'Print Center', 'Hub documenti: stampa, anteprima, condividi');
    return s;
  };

  const buildSegreteria = () => {
    if (!showForRole(['admin']) && !hasCap('inbox') && !hasCap('quote') && !hasCap('kit') && !hasCap('tesseramento')) return '';
    let s = sectionTitle('💼 Segreteria');
    if (showForRole(['admin']) || hasCap('inbox')) s += navItem('inbox', '📬', 'Inbox', 'Comunicazioni in entrata');
    if (showForRole(['admin']) || hasCap('quote')) s += navItem('fees', '💰', 'Quote', 'Gestione quote economiche');
    if (showForRole(['admin']) || hasCap('kit')) s += navItem('kit', '👕', 'Kit', 'Gestione kit sportivo');
    if (showForRole(['admin']) || hasCap('tesseramento')) s += navItem('registration', '📋', 'Tesseramento', 'Iscrizioni e documenti');
    if (showForRole(['admin']) || hasCap('tesseramento')) s += navItem('checklist', '✅', 'Checklist', 'Checklist inizio stagione');
    return s;
  };

  const buildClub = () => {
    let s = sectionTitle('🏛️ Club');
    if (showForRole(['admin', 'allenatore'])) s += navItem('staff', '👔', 'Staff', 'Staff tecnico e societario');
    s += navItem('club', '🏢', 'Società', 'Organigramma, staff e riferimenti società');
    if (showForRole(['admin'])) s += navItem('seasonsCategories', '🗓️', 'Stagioni', 'Gestione stagioni e categorie');
    return s;
  };

  const buildAmministrazione = () => {
    if (!showForRole(['admin'])) return '';
    let s = sectionTitle('🔐 Amministrazione');
    if (hasCap('import')) s += navItem('importCenter', '📥', 'Import Center', 'Import dati da fonti esterne');
    s += navItem('users', '👥', 'Utenti', 'Gestione utenti e permessi');
    if (hasCap('guest_links')) s += navItem('guestLinks', '🔗', 'Link Guest', 'Genera e gestisci link guest temporanei');
    if (isSuperadmin) s += navItem('supportTickets', '🎫', 'Ticket', 'Gestione ticket di supporto');
    if (isSuperadmin) s += navItem('workspaces', '🌐', 'Workspace', 'Gestione workspace/società');
    return s;
  };

  let html = '';
  html += navItem('dashboard', '🏠', 'Dashboard', 'Panoramica: statistiche, prossima partita, top players', true);

  if (isSegreteria) {
    html += buildSegreteria();
    html += buildTeam();
    html += buildPerformance();
    html += buildClub();
  } else {
    html += buildTeam();
    html += buildCoach();
    html += buildPerformance();
    html += buildSegreteria();
    html += buildClub();
    html += buildAmministrazione();
  }

  // Import per non-admin con capability import
  if (hasCap('import') && !showForRole(['admin'])) {
    html += sectionTitle('🔧 Strumenti');
    html += navItem('importCenter', '📥', 'Import Center', 'Import dati da fonti esterne');
  }
  // Guest Links per non-admin
  if (hasCap('guest_links') && !showForRole(['admin'])) html += navItem('guestLinks', '🔗', 'Link Guest', 'Genera e gestisci link guest temporanei');

  return html;
}

function buildGuestNav(tipoParam) {
  const guestTipo = tipoParam || sessionStorage.getItem('guest_tipo');
  const homeTarget = guestTipo === 'ospite' ? 'guestGenitore' : 'guestAtleta';
  let html = '';
  html += navItem(homeTarget, '🏠', 'Home', 'Panoramica', true);
  if (guestTipo !== 'ospite') {
    html += navItem('guestFees', '💰', 'Quote', 'Le mie quote');
  }
  html += sectionTitle('⚽ Team');
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
