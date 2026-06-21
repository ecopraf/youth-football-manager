import { apiFetch } from '../../services/api';

export async function loadWorkspaceInfo() {
  try {
    const w = await apiFetch('/workspaces');
    if (w && w.length > 0) {
      window.YFM.workspaceInfo = w[0];
      document.getElementById('workspaceName').textContent = w[0].nome;
      const hn = document.getElementById('headerSocName');
      if (hn) hn.textContent = w[0].nome;
      const logo = document.getElementById('headerLogo');
      if (logo && w[0].logo_url) {
        logo.src = w[0].logo_url;
        logo.style.display = 'block';
      }
    }
  } catch (e) {
    document.getElementById('workspaceName').textContent = 'ASD Albalonga';
  }
}
