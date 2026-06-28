import './style.css'
import { setupLayout } from './components/layout/Sidebar'
import { initRouter } from './router'
import { loadWorkspaceInfo } from './modules/club/workspace'
import { loadSquadre } from './modules/team/squadre'
import { loadPlayerDetail } from './modules/team/playerDetail.js'
import { showWorkspaceSelectorModal, initWorkspaceSwitcherInSidebar, getSavedWorkspaceId, resetWorkspaceCache, getRealWorkspaces, loadAvailableWorkspaces, isSuperAdmin, saveCurrentWorkspace } from './modules/club/workspaceSwitcher'
import demoManager from './modules/demo/demo'
import { BUILD_INFO } from './build-info'

// Imposta build ID globale per la UI
window.YFM_BUILD_ID = BUILD_INFO.id

// Workspace demo
const DEMO_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

// ═══════════════════════════════════════════════════════════════
// DATI DEMO IN MEMORIA (no API, no backend)
// ═══════════════════════════════════════════════════════════════
const DEMO_WORKSPACE = {
  id: '00000000-0000-0000-0000-000000000001',
  nome: 'ASD Green Academy',
  indirizzo: 'Via del Verde 1, Roma',
  telefono: '333 1234567',
  email: 'info@greenacademy.it'
};

const DEMO_SQUADRE = [
  { id: '00000000-0000-0000-0000-000000000010', nome: 'Green Academy', categoria: 'Primavera', allenatore: 'Marco Bianchi', dirigente: 'Luca Verdi' },
  { id: '00000000-0000-0000-0000-000000000011', nome: 'Green Academy', categoria: 'Allievi B', allenatore: 'Roberto Rossi', dirigente: 'Paolo Gialli' }
];

// Partite demo
const DEMO_PARTITE = [
  // Prossime partite
  { id: 'm001', avversario: 'Roma Academy', luogo: 'Trasferta', data_ora: '2026-07-05T15:30:00', competizione: 'Campionato Primavera', stato: 'Da disputare', giornata: 16 },
  { id: 'm002', avversario: 'Lazio Youth', luogo: 'Casa', data_ora: '2026-07-12T16:00:00', competizione: 'Campionato Primavera', stato: 'Da disputare', giornata: 17 },
  // Partite terminate
  { id: 'm003', avversario: 'Inter Academy', luogo: 'Casa', data_ora: '2026-06-20T15:00:00', competizione: 'Campionato Primavera', stato: 'Terminata', gol_casa: 3, gol_trasferta: 1, giornata: 15 },
  { id: 'm004', avversario: 'Milan Youth', luogo: 'Trasferta', data_ora: '2026-06-13T15:00:00', competizione: 'Campionato Primavera', stato: 'Terminata', gol_casa: 2, gol_trasferta: 2, giornata: 14 },
  { id: 'm005', avversario: 'Juventus Academy', luogo: 'Casa', data_ora: '2026-06-06T15:00:00', competizione: 'Campionato Primavera', stato: 'Terminata', gol_casa: 4, gol_trasferta: 0, giornata: 13 },
  { id: 'm006', avversario: 'Napoli Academy', luogo: 'Trasferta', data_ora: '2026-05-30T15:00:00', competizione: 'Campionato Primavera', stato: 'Terminata', gol_casa: 1, gol_trasferta: 2, giornata: 12 },
  { id: 'm007', avversario: 'Fiorentina Youth', luogo: 'Casa', data_ora: '2026-05-23T15:00:00', competizione: 'Campionato Primavera', stato: 'Terminata', gol_casa: 5, gol_trasferta: 1, giornata: 11 },
];

// Eventi partite demo (gol, assist)
const DEMO_EVENTI = [
  // m003: Green 3-1 Inter
  { match_id: 'm003', player_id: 'c007', tipo: 'GOAL', minuto: 15 },
  { match_id: 'm003', player_id: 'c011', tipo: 'GOAL', minuto: 34 },
  { match_id: 'm003', player_id: 'c009', tipo: 'GOAL', minuto: 67 },
  { match_id: 'm003', player_id: 'c007', tipo: 'ASSIST', minuto: 67 },
  { match_id: 'm003', player_id: 'c011', tipo: 'ASSIST', minuto: 15 },
  // m003: Inter gol
  { match_id: 'm003', player_id: null, tipo: 'GOAL', minuto: 52, note: 'Inter' },
  // m004: Green 2-2 Milan
  { match_id: 'm004', player_id: 'c005', tipo: 'GOAL', minuto: 23 },
  { match_id: 'm004', player_id: 'c008', tipo: 'GOAL', minuto: 78 },
  { match_id: 'm004', player_id: 'c005', tipo: 'ASSIST', minuto: 78 },
  // m005: Green 4-0 Juventus
  { match_id: 'm005', player_id: 'c009', tipo: 'GOAL', minuto: 12 },
  { match_id: 'm005', player_id: 'c011', tipo: 'GOAL', minuto: 28 },
  { match_id: 'm005', player_id: 'c017', tipo: 'GOAL', minuto: 55 },
  { match_id: 'm005', player_id: 'c007', tipo: 'GOAL', minuto: 72 },
  { match_id: 'm005', player_id: 'c009', tipo: 'ASSIST', minuto: 72 },
  // m006: Green 1-2 Napoli
  { match_id: 'm006', player_id: 'c011', tipo: 'GOAL', minuto: 41 },
  // m007: Green 5-1 Fiorentina
  { match_id: 'm007', player_id: 'c007', tipo: 'GOAL', minuto: 8 },
  { match_id: 'm007', player_id: 'c011', tipo: 'GOAL', minuto: 19 },
  { match_id: 'm007', player_id: 'c009', tipo: 'GOAL', minuto: 35 },
  { match_id: 'm007', player_id: 'c017', tipo: 'GOAL', minuto: 58 },
  { match_id: 'm007', player_id: 'c020', tipo: 'GOAL', minuto: 81 },
  { match_id: 'm007', player_id: 'c007', tipo: 'ASSIST', minuto: 35 },
  { match_id: 'm007', player_id: 'c011', tipo: 'ASSIST', minuto: 58 },
];

// Statistiche demo
const DEMO_STATISTICHE = {
  punti: 34,
  partiteGiocate: 14,
  vittorie: 10,
  pareggi: 4,
  sconfitte: 0,
  golFatti: 38,
  golSubiti: 12,
  differenzaReti: 26
};

// Top players demo
const DEMO_TOP_PLAYERS = {
  marcatori: [
    { id: 'c011', nome: 'Giovanni', cognome: 'Marroni', gol: 12 },
    { id: 'c007', nome: 'Simone', cognome: 'Arancioni', gol: 9 },
    { id: 'c009', nome: 'Tommaso', cognome: 'Viola', gol: 7 },
    { id: 'c017', nome: 'Niccolò', cognome: 'Piombo', gol: 5 },
    { id: 'c020', nome: 'Marco', cognome: 'Marea', gol: 3 }
  ],
  assistmen: [
    { id: 'c007', nome: 'Simone', cognome: 'Arancioni', assist: 8 },
    { id: 'c011', nome: 'Giovanni', cognome: 'Marroni', assist: 6 },
    { id: 'c005', nome: 'Andrea', cognome: 'Neri', assist: 4 },
    { id: 'c009', nome: 'Tommaso', cognome: 'Viola', assist: 3 },
    { id: 'c008', nome: 'Federico', cognome: 'Rosa', assist: 2 }
  ],
  presenze: [
    { id: 'c002', nome: 'Luca', cognome: 'Bianchi', presenze: 14 },
    { id: 'c003', nome: 'Matteo', cognome: 'Verdi', presenze: 14 },
    { id: 'c005', nome: 'Andrea', cognome: 'Neri', presenze: 13 },
    { id: 'c007', nome: 'Simone', cognome: 'Arancioni', presenze: 13 },
    { id: 'c011', nome: 'Giovanni', cognome: 'Marroni', presenze: 12 }
  ]
};

const DEMO_CALCIATORI = [
  { id: 'c001', nome: 'Alessandro', cognome: 'Rossi', data_nascita: '2010-03-15', numero_maglia: 1, ruolo: 'Portiere', stato: 'Attivo', presenze: 10, gol: 0, assist: 0 },
  { id: 'c002', nome: 'Luca', cognome: 'Bianchi', data_nascita: '2010-01-20', numero_maglia: 2, ruolo: 'Difensore', stato: 'Attivo', presenze: 14, gol: 1, assist: 2 },
  { id: 'c003', nome: 'Matteo', cognome: 'Verdi', data_nascita: '2010-05-10', numero_maglia: 3, ruolo: 'Difensore', stato: 'Attivo', presenze: 14, gol: 0, assist: 1 },
  { id: 'c004', nome: 'Francesco', cognome: 'Gialli', data_nascita: '2010-02-28', numero_maglia: 4, ruolo: 'Difensore', stato: 'Attivo', presenze: 11, gol: 0, assist: 0 },
  { id: 'c005', nome: 'Andrea', cognome: 'Neri', data_nascita: '2010-07-14', numero_maglia: 5, ruolo: 'Centrocampista', stato: 'Attivo', presenze: 13, gol: 2, assist: 4 },
  { id: 'c006', nome: 'Davide', cognome: 'Blu', data_nascita: '2010-04-05', numero_maglia: 6, ruolo: 'Centrocampista', stato: 'Attivo', presenze: 10, gol: 1, assist: 1 },
  { id: 'c007', nome: 'Simone', cognome: 'Arancioni', data_nascita: '2010-06-22', numero_maglia: 7, ruolo: 'Attaccante', stato: 'Attivo', presenze: 13, gol: 9, assist: 8 },
  { id: 'c008', nome: 'Federico', cognome: 'Rosa', data_nascita: '2010-08-30', numero_maglia: 8, ruolo: 'Centrocampista', stato: 'Attivo', presenze: 12, gol: 2, assist: 2 },
  { id: 'c009', nome: 'Tommaso', cognome: 'Viola', data_nascita: '2010-09-12', numero_maglia: 9, ruolo: 'Attaccante', stato: 'Attivo', presenze: 11, gol: 7, assist: 3 },
  { id: 'c010', nome: 'Nicolò', cognome: 'Grigi', data_nascita: '2010-11-03', numero_maglia: 10, ruolo: 'Centrocampista', stato: 'Attivo', presenze: 9, gol: 1, assist: 2 },
  { id: 'c011', nome: 'Giovanni', cognome: 'Marroni', data_nascita: '2010-12-18', numero_maglia: 11, ruolo: 'Attaccante', stato: 'Attivo', presenze: 12, gol: 12, assist: 6 },
  { id: 'c012', nome: 'Riccardo', cognome: 'Celesti', data_nascita: '2010-03-25', numero_maglia: 12, ruolo: 'Portiere', stato: 'Attivo', presenze: 4, gol: 0, assist: 0 },
  { id: 'c013', nome: 'Filippo', cognome: 'Oro', data_nascita: '2010-01-08', numero_maglia: 13, ruolo: 'Difensore', stato: 'Attivo', presenze: 8, gol: 0, assist: 1 },
  { id: 'c014', nome: 'Edoardo', cognome: 'Argento', data_nascita: '2010-05-30', numero_maglia: 14, ruolo: 'Centrocampista', stato: 'Attivo', presenze: 6, gol: 0, assist: 0 },
  { id: 'c015', nome: 'Gabriele', cognome: 'Bronzo', data_nascita: '2010-07-11', numero_maglia: 15, ruolo: 'Difensore', stato: 'Attivo', presenze: 5, gol: 0, assist: 0 },
  { id: 'c016', nome: 'Lorenzo', cognome: 'Rame', data_nascita: '2010-02-14', numero_maglia: 16, ruolo: 'Portiere', stato: 'Attivo', presenze: 0, gol: 0, assist: 0 },
  { id: 'c017', nome: 'Niccolò', cognome: 'Piombo', data_nascita: '2010-10-07', numero_maglia: 17, ruolo: 'Attaccante', stato: 'Attivo', presenze: 10, gol: 5, assist: 2 },
  { id: 'c018', nome: 'Samuele', cognome: 'Zinco', data_nascita: '2010-04-28', numero_maglia: 18, ruolo: 'Centrocampista', stato: 'Attivo', presenze: 7, gol: 0, assist: 1 },
  { id: 'c019', nome: 'Antonio', cognome: 'Stagno', data_nascita: '2010-06-16', numero_maglia: 19, ruolo: 'Difensore', stato: 'Infortunato', presenze: 3, gol: 0, assist: 0 },
  { id: 'c020', nome: 'Marco', cognome: 'Marea', data_nascita: '2010-08-03', numero_maglia: 20, ruolo: 'Attaccante', stato: 'Attivo', presenze: 8, gol: 3, assist: 1 }
];

// Popola il select delle squadre
function populateSquadreSelect() {
  const sel = document.getElementById('squadraSelect');
  if (sel && window.YFM.allSquadre) {
    sel.innerHTML = window.YFM.allSquadre.map(s => 
      `<option value="${s.id}" ${s.id === window.YFM.squadraId ? 'selected' : ''}>${s.nome}${s.categoria ? ' ' + s.categoria : ''}</option>`
    ).join('');
    sel.addEventListener('change', e => {
      window.YFM.squadraId = e.target.value;
      window.YFM.allPlayers = [];
      window.YFM.allMatches = [];
      window.YFM.navigateTo(window.YFM.currentPage);
    });
  }
}

// Inizializzazione sessione demo con dati in memoria
function initDemoSession() {
  console.log('[MAIN] Init demo - ASD Green Academy');
  
  // Imposta dati demo (sovrascrive qualsiasi workspace caricato)
  window.YFM.workspaceInfo = DEMO_WORKSPACE;
  window.YFM.allSquadre = DEMO_SQUADRE;
  window.YFM.squadraId = DEMO_SQUADRE[0].id; // Primavera
  window.YFM.allPlayers = DEMO_CALCIATORI;
  window.YFM.demoMatches = DEMO_PARTITE;
  window.YFM.demoEvents = DEMO_EVENTI;
  window.YFM.demoStats = DEMO_STATISTICHE;
  window.YFM.demoTopPlayers = DEMO_TOP_PLAYERS;
  
  // Aggiorna UI
  const wsName = document.getElementById('workspaceName');
  if (wsName) wsName.textContent = DEMO_WORKSPACE.nome;
  
  // Popola il select delle squadre
  populateSquadreSelect();
  
  // Inizializza demo manager
  demoManager.init();
  
  // Naviga alla dashboard
  window.YFM.navigateTo('dashboard');
}

// Inizializza oggetto globale
window.YFM = {
  squadraId: null,
  allSquadre: [],
  currentPage: 'dashboard',
  allPlayers: [],
  allMatches: [],
  workspaceInfo: null,
  guestToken: null,
  pageParams: null,
  apiBase: '' // Viene impostato dal backend
};

// Funzioni helper per squadra
window.YFM.getSquadraName = () => {
  const s = window.YFM.allSquadre.find(x => x.id === window.YFM.squadraId);
  return s ? s.nome + (s.categoria ? ' ' + s.categoria : '') : 'Squadra';
};
window.YFM.getSquadra = () => {
  return window.YFM.allSquadre.find(x => x.id === window.YFM.squadraId) || {};
};
window.YFM.getSocietaName = () => {
  return window.YFM.workspaceInfo ? window.YFM.workspaceInfo.nome : 'ASD';
};

// Funzioni globali per logout
window.YFM.handleLogout = function() {
  console.log('[LOGOUT] Starting...');
  localStorage.removeItem('yfm_token');
  localStorage.removeItem('yfm_user');
  localStorage.removeItem('yfm_guest');
  localStorage.removeItem('yfm_demo_session');
  localStorage.removeItem('yfm_demo_progress');
  localStorage.removeItem('yfm_active_workspace');
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('yfm_demo') || key.startsWith('demo_')) {
      localStorage.removeItem(key);
    }
  });
  if (window.demoManager) {
    ['demo-badge', 'demo-mission-panel', 'demo-welcome-overlay', 'demo-celebration',
     'demo-registration-overlay', 'demo-marketing-tooltip'].forEach(id => {
      document.getElementById(id)?.remove();
    });
  }
  // Resetta cache workspace switcher
  resetWorkspaceCache();
  window.location.href = '/landing.html';
};

// Funzioni globali per i moduli del calendario (caricate on-demand)
window.YFM.loadCalendar = async () => {
  const m = await import('./modules/team/calendar.js')
  await m.default()
}
window.YFM.openConvocation = async (mid, readOnly) => {
  const m = await import('./modules/team/convocazioni.js')
  m.openConvocation(mid, readOnly)
}
window.YFM.openDistinta = async (mid) => {
  const m = await import('./modules/team/distinta.js')
  m.openDistinta(mid)
}
window.YFM.openFormazioneForm = async (mid) => {
  const m = await import('./modules/team/formazione.js')
  m.openFormazioneForm(mid)
}
window.YFM.openNoteAvversario = async (mid) => {
  const m = await import('./modules/team/noteAvversario.js')
  m.openNoteAvversario(mid)
}
window.YFM.openMatchDetail = async (mid) => {
  const m = await import('./modules/team/matchDetail.js')
  m.openMatchDetail(mid)
}
window.YFM.openValutazioni = async (mid) => {
  const m = await import('./modules/team/valutazioni.js')
  m.openValutazioni(mid)
}
window.YFM.openResultForm = async (mid) => {
  const m = await import('./modules/team/resultForm.js')
  m.openResultForm(mid)
}
window.YFM.openPlayerDetail = function(playerId) {
  var c = document.getElementById('pageContent');
  if (!c) { console.error('pageContent non trovato'); return; }
  loadPlayerDetail(c, playerId);
};

document.addEventListener('DOMContentLoaded', () => {
  setupLayout();
  initRouter();

  // Check per guest link (URL: /guest/{token})
  const path = window.location.pathname;
  if (path.startsWith('/guest/')) {
    const token = path.split('/guest/')[1];
    if (token) {
      window.YFM.guestToken = token;
      window.YFM.navigateTo('guest');
      return;
    }
  }

  // Se già autenticato o demo
  const isAuth = window.YFM.isAuthenticated && window.YFM.isAuthenticated();
  const isDemo = window.YFM.isDemo && window.YFM.isDemo();

  if (isAuth || isDemo) {
    console.log('[MAIN] Auth:', isAuth, 'Demo:', isDemo);
    
    if (isDemo) {
      // Demo: usa dati in memoria (no API)
      initDemoSession();
    } else {
      // Utenti normali: carica dal backend
      loadAvailableWorkspaces().then(async (workspaces) => {
        const user = window.YFM.getUser();
        
        if (isSuperAdmin(user)) {
          // Superadmin: mostra selettore workspace iniziale SOLO se non c'è già una selezione
          const realWs = getRealWorkspaces(workspaces);
          const savedWsId = getSavedWorkspaceId();
          
          // Verifica se c'è già un workspace salvato
          const hasSavedWorkspace = savedWsId && realWs.find(w => w.id === savedWsId);
          
          if (!hasSavedWorkspace && realWs.length > 1) {
            // Mostra modal di selezione solo se non c'è selezione salvata e ci sono più workspace
            const selectedWs = await showWorkspaceSelectorModal();
            if (selectedWs) {
              saveCurrentWorkspace(selectedWs.id);
              window.YFM.workspaceInfo = selectedWs;
              window.YFM.activeWorkspaceId = selectedWs.id;
            }
          } else if (realWs.length === 1 || hasSavedWorkspace) {
            // Usa quello salvato o l'unico disponibile
            const wsToUse = hasSavedWorkspace 
              ? realWs.find(w => w.id === savedWsId) 
              : realWs[0];
            if (wsToUse) {
              saveCurrentWorkspace(wsToUse.id);
              window.YFM.workspaceInfo = wsToUse;
              window.YFM.activeWorkspaceId = wsToUse.id;
            }
          }
          
          // Inizializza switcher in sidebar
          setTimeout(() => initWorkspaceSwitcherInSidebar(), 100);
        } else {
          // Utente normale: usa il suo workspace_id dal profilo
          const userWorkspaceId = user?.workspace_id;
          if (userWorkspaceId) {
            const userWs = workspaces.find(w => w.id === userWorkspaceId);
            if (userWs) {
              window.YFM.workspaceInfo = userWs;
              window.YFM.activeWorkspaceId = userWs.id;
              console.log('[MAIN] Workspace utente:', userWs.nome);
            }
          }
        }
        
        await Promise.all([loadWorkspaceInfo(), loadSquadre()]);
        window.YFM.navigateTo('dashboard');
      }).catch(async () => {
        await Promise.all([loadWorkspaceInfo(), loadSquadre()]);
        window.YFM.navigateTo('dashboard');
      });
    }
  } else {
    window.YFM.navigateTo('login');
  }
});
