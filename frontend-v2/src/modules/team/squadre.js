import { apiFetch } from '../../services/api';
import { getSavedWorkspaceId, saveCurrentWorkspace } from '../club/workspaceSwitcher';

const STORAGE_KEY = 'yfm_squadra_id';

export async function loadSquadre(stagioneId) {
  try {
    let allSquadre;
    let stagioni = [];
    
    const guestSquadre = window.YFM.guestSquadreAccesso || [];
    if (guestSquadre.length > 0 && !window.YFM.workspaceInfo) {
      const all = await apiFetch('/squadre');
      allSquadre = (all || []).filter(s => guestSquadre.includes(s.category_id));
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
      
      // Carica team di TUTTE le stagioni
      const allTeams = [];
      for (const s of stagioni) {
        const teams = await apiFetch(`/stagioni/${s.id}/squadre`);
        (teams || []).forEach(t => { t._stagione = s.nome; t._stagioneAttiva = s.attiva; });
        allTeams.push(...(teams || []));
      }
      allSquadre = allTeams;
    }
    
    // Filtra per categorie_accesso dell'utente (se non admin/superadmin e non guest)
    const user = window.YFM.getUser ? window.YFM.getUser() : null;
    const categorieAccesso = user?.categorie_accesso || [];
    if (!guestSquadre.length && user && !user.is_superadmin && user.ruolo !== 'admin' && categorieAccesso.length > 0) {
      allSquadre = allSquadre.filter(s => !s.category_id || categorieAccesso.includes(s.category_id));
    }
    
    window.YFM.allSquadre = allSquadre;
    
    // Ripristina squadraId da localStorage o seleziona default
    const savedSquadraId = localStorage.getItem(STORAGE_KEY);
    if (savedSquadraId && allSquadre.find(s => s.id === savedSquadraId)) {
      window.YFM.squadraId = savedSquadraId;
    } else if (allSquadre.length > 0 && !allSquadre.find(s => s.id === window.YFM.squadraId)) {
      const preferActive = allSquadre.find(s => s._stagioneAttiva) || allSquadre[0];
      window.YFM.squadraId = preferActive.id;
    }
    if (window.YFM.squadraId) {
      localStorage.setItem(STORAGE_KEY, window.YFM.squadraId);
    }
    
    const sel = document.getElementById('squadraSelect');
    if (sel) {
      // Raggruppa per stagione
      const byStag = {};
      allSquadre.forEach(s => {
        const stag = s._stagione || 'Corrente';
        if (!byStag[stag]) byStag[stag] = [];
        byStag[stag].push(s);
      });
      const stagKeys = Object.keys(byStag).sort().reverse();
      
      if (stagKeys.length <= 1) {
        sel.innerHTML = allSquadre.map(s => {
          const categoriaNome = s.category?.nome || s.categoria || '';
          const tipoCampionato = s.category?.tipo_campionato || '';
          const displayNome = categoriaNome && tipoCampionato 
            ? `${categoriaNome} ${tipoCampionato}` 
            : (categoriaNome || s.nome);
          return `<option value="${s.id}" ${s.id === window.YFM.squadraId ? 'selected' : ''}>${displayNome}</option>`;
        }).join('');
      } else {
        sel.innerHTML = stagKeys.map(stag => {
          const opts = byStag[stag].map(s => {
            const categoriaNome = s.category?.nome || s.categoria || '';
            const tipoCampionato = s.category?.tipo_campionato || '';
            const base = categoriaNome && tipoCampionato 
              ? `${categoriaNome} ${tipoCampionato}` 
              : (categoriaNome || s.nome);
            const displayNome = `${base} (${stag})`;
            return `<option value="${s.id}" ${s.id === window.YFM.squadraId ? 'selected' : ''}>${displayNome}</option>`;
          }).join('');
          return `<optgroup label="📅 ${stag}">${opts}</optgroup>`;
        }).join('');
      }
      
      sel.onchange = async (e) => {
        window.YFM.squadraId = e.target.value;
        localStorage.setItem(STORAGE_KEY, e.target.value);
        window.YFM.allPlayers = [];
        window.YFM.allMatches = [];
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
      };
    }
  } catch (err) {
    console.error('[loadSquadre] ERROR:', err);
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
  return window.YFM.workspaceInfo ? window.YFM.workspaceInfo.nome : 'La tua Società';
};
