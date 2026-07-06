import { apiFetch } from '../../services/api';

export async function loadWorkspaceInfo() {
  try {
    let ws = window.YFM.workspaceInfo;
    
    if (!ws) {
      const workspaces = await apiFetch('/auth/workspaces');
      ws = workspaces[0];
      if (ws) {
        window.YFM.workspaceInfo = ws;
        window.YFM.activeWorkspaceId = ws.id;
      }
    }
    
    if (ws) {
      window.YFM.workspaceId = ws.id;
      const wn = document.getElementById('workspaceName');
      if (wn) wn.textContent = ws.nome_breve || ws.nome || 'Società';
      const hn = document.getElementById('headerSocName');
      if (hn) hn.textContent = ws.nome_breve || ws.nome || 'Società';
      const logo = document.getElementById('headerLogo');
      if (logo && ws.logo_url) {
        logo.src = ws.logo_url;
        logo.style.display = 'block';
      }
      // Facility in parallelo (non bloccante per il render)
      apiFetch('/workspaces/' + ws.id + '/facility')
        .then(f => { window.YFM.facility = f; })
        .catch(() => { window.YFM.facility = null; });
    }
  } catch (e) {
    console.error('loadWorkspaceInfo error:', e);
    const wn = document.getElementById('workspaceName');
    if (wn) wn.textContent = 'Società';
  }
}
