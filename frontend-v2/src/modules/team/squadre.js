import { apiFetch } from '../../services/api';
import { getSavedWorkspaceId } from '../club/workspaceSwitcher';

export async function loadSquadre(stagioneId) {
  console.log('[loadSquadre] Starting...', { stagioneId, workspaceInfo: window.YFM.workspaceInfo });
  
  try {
    let allSquadre;
    
    // Guest: carica tutte le squadre e filtra per category_id (squadre_accesso contiene category_id)
    const guestSquadre = window.YFM.guestSquadreAccesso || [];
    if (guestSquadre.length > 0 && !window.YFM.workspaceInfo) {
      console.log('[loadSquadre] Guest mode, loading by category IDs');
      const all = await apiFetch('/squadre');
      allSquadre = (all || []).filter(s => guestSquadre.includes(s.category_id));
    } else if (stagioneId) {
      // Se passato stagioneId, usa quello
      console.log('[loadSquadre] Using provided stagioneId:', stagioneId);
      allSquadre = await apiFetch(`/stagioni/${stagioneId}/squadre`);
    } else {
      // Determina il workspace corrente
      // 1. Usa quello già impostato in window.YFM.workspaceInfo
      // 2. Oppure quello salvato in localStorage
      // 3. Oppure il primo dalla lista
      let currentWorkspace = window.YFM.workspaceInfo;
      
      console.log('[loadSquadre] Current workspace from window.YFM:', currentWorkspace?.id, currentWorkspace?.nome);
      
      if (!currentWorkspace) {
        console.log('[loadSquadre] No workspace in window.YFM, fetching from API...');
        const savedWsId = getSavedWorkspaceId();
        const workspaces = await apiFetch('/auth/workspaces');
        console.log('[loadSquadre] Got workspaces:', workspaces.map(w => w.nome));
        
        if (savedWsId) {
          currentWorkspace = workspaces.find(w => w.id === savedWsId);
        }
        if (!currentWorkspace) {
          currentWorkspace = workspaces[0];
        }
        
        if (currentWorkspace) {
          console.log('[loadSquadre] Selected workspace:', currentWorkspace.nome);
          window.YFM.workspaceInfo = currentWorkspace;
          window.YFM.activeWorkspaceId = currentWorkspace.id;
        }
      }
      
      if (!currentWorkspace) {
        console.error('[loadSquadre] CRITICAL: No workspace found!');
        return;
      }
      
      // Cerca stagioni del workspace e prendi quella attiva
      console.log('[loadSquadre] Fetching seasons for workspace:', currentWorkspace.id);
      const stagioni = await apiFetch(`/workspaces/${currentWorkspace.id}/stagioni`);
      console.log('[loadSquadre] Got seasons:', stagioni.map(s => s.nome + (s.attiva ? ' (attiva)' : '')));
      
      const stagioneAttiva = stagioni.find(s => s.attiva) || stagioni[0];
      console.log('[loadSquadre] Selected season:', stagioneAttiva?.id, stagioneAttiva?.nome);
      
      if (stagioneAttiva) {
        console.log('[loadSquadre] Fetching teams for season:', stagioneAttiva.id);
        allSquadre = await apiFetch(`/stagioni/${stagioneAttiva.id}/squadre`);
        console.log('[loadSquadre] Got teams:', allSquadre.length);
      } else {
        console.warn('[loadSquadre] No active season found!');
        allSquadre = [];
      }
    }
    
    console.log('[loadSquadre] Setting allSquadre:', allSquadre.length, 'teams');
    
    // Filtra per categorie_accesso dell'utente (se non admin/superadmin e non guest)
    const user = window.YFM.getUser ? window.YFM.getUser() : null;
    const categorieAccesso = user?.categorie_accesso || [];
    if (!guestSquadre.length && user && !user.is_superadmin && user.ruolo !== 'admin' && categorieAccesso.length > 0) {
      allSquadre = allSquadre.filter(s => !s.category_id || categorieAccesso.includes(s.category_id));
      console.log('[loadSquadre] Filtered by categorie_accesso:', allSquadre.length);
    }
    
    window.YFM.allSquadre = allSquadre;
    
    const sel = document.getElementById('squadraSelect');
    if (sel) {
      sel.innerHTML = allSquadre.map(s => {
        const categoriaNome = s.category?.nome || s.categoria || '';
        const tipoCampionato = s.category?.tipo_campionato || '';
        const displayNome = categoriaNome && tipoCampionato 
          ? `${categoriaNome} ${tipoCampionato}` 
          : (categoriaNome || s.nome);
        return `<option value="${s.id}" ${s.id === window.YFM.squadraId ? 'selected' : ''}>${displayNome}</option>`;
      }).join('');
      sel.addEventListener('change', e => {
        window.YFM.squadraId = e.target.value;
        window.YFM.allPlayers = [];
        window.YFM.allMatches = [];
        window.YFM.navigateTo(window.YFM.currentPage);
      });
    }
    if (allSquadre.length > 0 && !allSquadre.find(s => s.id === window.YFM.squadraId)) {
      window.YFM.squadraId = allSquadre[0].id;
      console.log('[loadSquadre] Set default squadraId:', window.YFM.squadraId);
    }
    
    console.log('[loadSquadre] Done. Current squadraId:', window.YFM.squadraId);
  } catch (err) {
    console.error('[loadSquadre] ERROR:', err);
  }
}

// Assicura che window.YFM esista
window.YFM = window.YFM || {};
window.YFM.getSquadraName = () => {
  const s = window.YFM.allSquadre.find(x => x.id === window.YFM.squadraId);
  if (!s) return 'Squadra';
  const categoriaNome = s.category?.nome || s.categoria || '';
  const tipoCampionato = s.category?.tipo_campionato || '';
  if (categoriaNome && tipoCampionato) {
    return `${categoriaNome} ${tipoCampionato}`;
  }
  return categoriaNome || s.nome;
};

window.YFM.getSquadra = () => {
  return window.YFM.allSquadre.find(x => x.id === window.YFM.squadraId) || {};
};

window.YFM.getSocietaName = () => {
  return window.YFM.workspaceInfo ? window.YFM.workspaceInfo.nome : 'La tua Società';
};
