import { verifyGuestToken, setGuestSession } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';
import { loadSquadre } from '../team/squadre';

export default async function loadGuest() {
  const c = document.getElementById('pageContent');
  const token = window.YFM.guestToken;
  
  if (!token) {
    c.innerHTML = `<div style="text-align:center;padding:60px 20px;">
      <p style="font-size:48px;">&#x274c;</p>
      <h2>Link non valido</h2>
      <p style="color:#666;">Il link potrebbe essere scaduto o non essere corretto.</p>
      <a href="/" class="btn btn-primary" style="margin-top:20px;">Vai alla Home</a>
    </div>`;
    return;
  }

  showLoading('Verifica accesso...');
  
  try {
    const guestData = await verifyGuestToken(token);
    hideLoading();
    
    // Salva sessione guest con JWT per accesso API (sessionStorage, isolato per tab)
    setGuestSession(guestData);
    
    // Ricostruisci layout con sidebar guest
    const playerName = guestData.player_name || null;
    const { setupGuestLayout } = await import('../../components/layout/Sidebar');
    setupGuestLayout(guestData.tipo, playerName);
    const { initRouter } = await import('../../router');
    initRouter();
    
    // Carica squadre filtrate per squadre_accesso del guest
    window.YFM.guestSquadreAccesso = guestData.squadre_accesso || [];
    window.YFM.guestPlayerId = guestData.player_id || null;
    window.YFM.guestTeamId = guestData.team_id || null;
    window.YFM.guestPlayerName = playerName;
    await loadSquadre();
    
    // Messaggio di benvenuto
    if (playerName) {
      const c = document.getElementById('pageContent');
      if (c) {
        c.innerHTML = `<div style="text-align:center;padding:60px 20px;">
          <p style="font-size:48px;">\u{1F44B}</p>
          <h2 style="margin:12px 0 8px;">Ciao ${playerName.split(' ')[0]}!</h2>
          <p style="color:#666;">Benvenuto nel tuo spazio personale</p>
        </div>`;
        const targetPage = guestData.tipo === 'atleta' ? 'guestAtleta' : guestData.tipo === 'genitore' ? 'guestGenitore' : 'dashboard';
        setTimeout(() => window.YFM.navigateTo(targetPage), 2000);
      }
    } else {
      const targetPage = guestData.tipo === 'atleta' ? 'guestAtleta' : guestData.tipo === 'genitore' ? 'guestGenitore' : 'dashboard';
      window.YFM.navigateTo(targetPage);
    }
  } catch (err) {
    hideLoading();
    c.innerHTML = `<div style="text-align:center;padding:60px 20px;">
      <p style="font-size:48px;">&#x274c;</p>
      <h2>Accesso negato</h2>
      <p style="color:#666;">${err.message.includes('404') ? 'Link revocato o non valido.' : 'Link scaduto. Richiedine uno nuovo.'}</p>
    </div>`;
  }
}
