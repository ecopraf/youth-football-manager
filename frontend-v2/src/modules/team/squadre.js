import { apiFetch } from '../../services/api';

export async function loadSquadre() {
  try {
    const allSquadre = await apiFetch('/stagioni/22222222-2222-2222-2222-222222222222/squadre');
    window.YFM.allSquadre = allSquadre;
    const sel = document.getElementById('squadraSelect');
    if (sel) {
      sel.innerHTML = allSquadre.map(s => 
        `<option value="${s.id}" ${s.id === window.YFM.squadraId ? 'selected' : ''}>${s.nome}</option>`
      ).join('');
      sel.addEventListener('change', e => {
        window.YFM.squadraId = e.target.value;
        window.YFM.allPlayers = [];
        window.YFM.allMatches = [];
        window.YFM.navigateTo(window.YFM.currentPage);
      });
    }
    if (allSquadre.length > 0 && !allSquadre.find(s => s.id === window.YFM.squadraId)) {
      window.YFM.squadraId = allSquadre[0].id;
    }
  } catch (err) {
    console.error(err);
  }
}

// Assicura che window.YFM esista
window.YFM = window.YFM || {};
window.YFM.getSquadraName = () => {
  const s = window.YFM.allSquadre.find(x => x.id === window.YFM.squadraId);
  return s ? s.nome : 'Squadra';
};

window.YFM.getSquadra = () => {
  return window.YFM.allSquadre.find(x => x.id === window.YFM.squadraId) || {};
};

window.YFM.getSocietaName = () => {
  return window.YFM.workspaceInfo ? window.YFM.workspaceInfo.nome : 'ASD Albalonga';
};
