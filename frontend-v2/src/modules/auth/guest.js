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
    
    // Salva sessione guest con JWT per accesso API
    setGuestSession(guestData);
    if (guestData.jwt) {
      localStorage.setItem('yfm_token', guestData.jwt);
    }
    
    // Ricostruisci layout con sidebar guest
    const { setupGuestLayout } = await import('../../components/layout/Sidebar');
    setupGuestLayout(guestData.tipo);
    const { initRouter } = await import('../../router');
    initRouter();
    
    // Carica squadre filtrate per squadre_accesso del guest
    window.YFM.guestSquadreAccesso = guestData.squadre_accesso || [];
    window.YFM.guestPlayerId = guestData.player_id || null;
    await loadSquadre();
    
    window.YFM.navigateTo('dashboard');
  } catch (err) {
    hideLoading();
    c.innerHTML = `<div style="text-align:center;padding:60px 20px;">
      <p style="font-size:48px;">&#x274c;</p>
      <h2>Accesso negato</h2>
      <p style="color:#666;">${err.message.includes('404') ? 'Link revocato o non valido.' : 'Link scaduto. Richiedine uno nuovo.'}</p>
    </div>`;
  }
}
