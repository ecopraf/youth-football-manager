import { apiFetch } from '../../services/api';
import { getSavedWorkspaceId, saveCurrentWorkspace } from '../club/workspaceSwitcher';
import { invalidateDashboardCache } from './dashboard.js';

const STORAGE_KEY = 'yfm_squadra_id';
const SEASON_STORAGE_KEY = 'yfm_stagione_id';

export async function loadSquadre(stagioneId) {
  try {
    let allSquadre;
    let stagioni = [];
    
    const guestSquadre = window.YFM.guestSquadreAccesso || [];
    if (guestSquadre.length > 0) {
      if (window.YFM.guestTeamId) {
        const teamData = await apiFetch(`/squadre/${window.YFM.guestTeamId}`).catch(() => null);
        allSquadre = teamData ? [teamData] : [];
      } else {
        const all = await apiFetch('/squadre');
        allSquadre = (all || []).filter(s => guestSquadre.includes(s.category_id));
      }
    } else if (stagioneId) {
      allSquadre = await apiFetch(`/stagioni/${stagioneId}/squadre`);
    } else {
      let currentWorkspace = window.YFM.workspaceInfo;
      
      if (!currentWorkspace) {
        const savedWsId = getSavedWorkspaceId();
        const workspaces = await apiFetch('/auth/workspaces');
        if (savedWsId) currentWorkspace = workspaces.find(w => w.id === savedWsId);
        if (!currentWorkspace) currentWorkspace = workspaces[0];
        if (currentWorkspace) {
          window.YFM.workspaceInfo = currentWorkspace;
          window.YFM.activeWorkspaceId = currentWorkspace.id;
        }
      }
      
      if (!currentWorkspace) return;
      
      stagioni = await apiFetch(`/workspaces/${currentWorkspace.id}/stagioni`);
      window.YFM.allStagioni = stagioni;
      
      // Determina stagioni accessibili per l'utente
      const user = window.YFM.getUser ? window.YFM.getUser() : null;
      const stagioniAccesso = user?.stagioni_accesso || [];
      
      let accessibleSeasons;
      if (user?.is_superadmin || user?.ruolo === 'admin') {
        // Superadmin e admin vedono TUTTE le stagioni del workspace
        accessibleSeasons = [...stagioni];
      } else if (stagioniAccesso.length > 0) {
        // Staff con stagioni assegnate: vede solo quelle
        accessibleSeasons = stagioni.filter(s => stagioniAccesso.includes(s.id));
      } else {
        // Legacy (nessuna stagione assegnata): vede la più recente
        const sorted = stagioni.slice().sort((a, b) => (b.nome || '').localeCompare(a.nome || ''));
        accessibleSeasons = sorted.length > 0 ? [sorted[0]] : [];
      }
      
      // Ordina per anno decrescente (2026/27 prima, 2024/25 dopo)
      accessibleSeasons.sort((a, b) => (b.nome || '').localeCompare(a.nome || ''));
      
      window.YFM.accessibleSeasons = accessibleSeasons;
      
      // Seleziona stagione: da localStorage o default (la più recente tra quelle accessibili)
      const savedSeasonId = localStorage.getItem(SEASON_STORAGE_KEY);
      let selectedSeason;
      if (savedSeasonId && accessibleSeasons.find(s => s.id === savedSeasonId)) {
        selectedSeason = accessibleSeasons.find(s => s.id === savedSeasonId);
      } else {
        selectedSeason = accessibleSeasons[0] || null;
      }
      
      if (selectedSeason) {
        window.YFM.currentSeasonId = selectedSeason.id;
        localStorage.setItem(SEASON_STORAGE_KEY, selectedSeason.id);
        const teams = await apiFetch(`/stagioni/${selectedSeason.id}/squadre`);
        (teams || []).forEach(t => { t._stagione = selectedSeason.nome; });
        allSquadre = teams || [];
      } else {
        allSquadre = [];
      }
      
      // Render selettore stagione se >1 accessibile
      renderSeasonSelector(accessibleSeasons, selectedSeason);
    }
    
    // Filtra per categorie_accesso dell'utente
    const user = window.YFM.getUser ? window.YFM.getUser() : null;
    const categorieAccesso = user?.categorie_accesso || [];
    if (!guestSquadre.length && user && !user.is_superadmin && user.ruolo !== 'admin' && categorieAccesso.length > 0) {
      allSquadre = allSquadre.filter(s => !s.category_id || categorieAccesso.includes(s.category_id));
    }
    
    window.YFM.allSquadre = allSquadre;
    
    // Ripristina squadraId
    const savedSquadraId = localStorage.getItem(STORAGE_KEY);
    if (savedSquadraId && allSquadre.find(s => s.id === savedSquadraId)) {
      window.YFM.squadraId = savedSquadraId;
    } else if (allSquadre.length > 0 && !allSquadre.find(s => s.id === window.YFM.squadraId)) {
      const preferActive = allSquadre[0];
      window.YFM.squadraId = preferActive.id;
    }
    if (window.YFM.squadraId) {
      localStorage.setItem(STORAGE_KEY, window.YFM.squadraId);
    }
    
    const sel = document.getElementById('squadraSelect');
    if (sel) {
      if (guestSquadre.length > 0 && allSquadre.length <= 1) {
        sel.style.display = 'none';
        if (allSquadre.length === 1) window.YFM.squadraId = allSquadre[0].id;
        return;
      }
      sel.innerHTML = allSquadre.slice().sort((a, b) => {
        const numA = parseInt((a.category?.nome || '').replace(/\D/g, '')) || 0;
        const numB = parseInt((b.category?.nome || '').replace(/\D/g, '')) || 0;
        return numB - numA;
      }).map(s => {
        const categoriaNome = s.category?.nome || s.categoria || '';
        const tipoCampionato = s.category?.tipo_campionato || '';
        const displayNome = categoriaNome && tipoCampionato 
          ? `${categoriaNome} ${tipoCampionato}` 
          : (categoriaNome || s.nome);
        return `<option value="${s.id}" ${s.id === window.YFM.squadraId ? 'selected' : ''}>${displayNome}</option>`;
      }).join('');
      
      sel.onchange = async (e) => {
        window.YFM.squadraId = e.target.value;
        localStorage.setItem(STORAGE_KEY, e.target.value);
        window.YFM.allPlayers = [];
        window.YFM.allMatches = [];
        invalidateDashboardCache();
        const sq = allSquadre.find(s => s.id === e.target.value);
        const wsId = sq?.category?.workspace_id;
        if (wsId && wsId !== window.YFM.activeWorkspaceId) {
          window.YFM.activeWorkspaceId = wsId;
          window.YFM.workspaceId = wsId;
          saveCurrentWorkspace(wsId);
          const workspaces = await apiFetch('/auth/workspaces').catch(() => []);
          const ws = workspaces.find(w => w.id === wsId);
          if (ws) {
            window.YFM.workspaceInfo = ws;
            const hn = document.getElementById('headerSocName');
            if (hn) hn.textContent = ws.nome;
            const wsSel = document.getElementById('workspaceSelect');
            if (wsSel) wsSel.value = wsId;
          }
          try { window.YFM.facility = await apiFetch('/workspaces/' + wsId + '/facility'); } catch(e) { window.YFM.facility = null; }
        }
        window.YFM.navigateTo(window.YFM.currentPage);
        import('../coach/notifications.js').then(m => m.updateNotifBadge()).catch(() => {});
      };
    }
  } catch (err) {
    console.error('[loadSquadre] ERROR:', err);
  }
}

function renderSeasonSelector(seasons, selected) {
  // Rimuovi selettore esistente
  const existing = document.getElementById('seasonSelect');
  if (existing) existing.remove();
  
  if (!seasons || seasons.length <= 1) return;
  
  const headerRight = document.querySelector('.header-right');
  if (!headerRight) return;
  
  const sel = document.createElement('select');
  sel.id = 'seasonSelect';
  sel.className = 'header-select';
  sel.style.cssText = 'font-size:13px;padding:6px 10px;min-width:100px;';
  sel.innerHTML = seasons.map(s => 
    `<option value="${s.id}" ${s.id === selected?.id ? 'selected' : ''}>${s.nome}${s.id === seasons[0]?.id ? ' ★' : ''}</option>`
  ).join('');
  
  sel.onchange = async () => {
    // Salva category_id corrente per tentare di mantenerla nella nuova stagione
    const prevSquadra = window.YFM.allSquadre?.find(s => s.id === window.YFM.squadraId);
    const prevCategoryName = prevSquadra?.category?.nome || null;
    
    window.YFM.currentSeasonId = sel.value;
    localStorage.setItem(SEASON_STORAGE_KEY, sel.value);
    invalidateDashboardCache();
    
    // Carica squadre della nuova stagione
    const newTeams = await apiFetch(`/stagioni/${sel.value}/squadre`).catch(() => []);
    
    // Cerca stessa categoria nella nuova stagione
    let matchTeam = prevCategoryName 
      ? newTeams.find(t => t.category?.nome === prevCategoryName) 
      : null;
    
    if (matchTeam) {
      window.YFM.squadraId = matchTeam.id;
      localStorage.setItem(STORAGE_KEY, matchTeam.id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      window.YFM.squadraId = null;
    }
    
    await loadSquadre(sel.value);
    window.YFM.navigateTo(window.YFM.currentPage);
    import('../coach/notifications.js').then(m => m.updateNotifBadge()).catch(() => {});
  };
  
  // Inserisci prima del selettore squadra
  const squadraSelect = document.getElementById('squadraSelect');
  if (squadraSelect) {
    headerRight.insertBefore(sel, squadraSelect);
  } else {
    headerRight.prepend(sel);
  }
}

window.YFM = window.YFM || {};
window.YFM.getSquadraName = () => {
  const s = window.YFM.allSquadre.find(x => x.id === window.YFM.squadraId);
  if (!s) return 'Squadra';
  const categoriaNome = s.category?.nome || s.categoria || '';
  const tipoCampionato = s.category?.tipo_campionato || '';
  const base = categoriaNome && tipoCampionato ? `${categoriaNome} ${tipoCampionato}` : (categoriaNome || s.nome);
  return s._stagione ? `${base} (${s._stagione})` : base;
};

window.YFM.getSquadra = () => {
  return window.YFM.allSquadre.find(x => x.id === window.YFM.squadraId) || {};
};

window.YFM.getSocietaName = () => {
  return window.YFM.workspaceInfo ? (window.YFM.workspaceInfo.nome_breve || window.YFM.workspaceInfo.nome) : 'La tua Società';
};
