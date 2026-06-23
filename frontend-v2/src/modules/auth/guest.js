import { verifyGuestToken, setGuestSession } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';

export default async function loadGuest() {
  const c = document.getElementById('pageContent');
  
  // Estrai token dall'URL
  const pathParts = window.location.pathname.split('/');
  const token = pathParts[pathParts.length - 1];
  
  if (!token || token === 'guest') {
    c.innerHTML = `
      <div class="auth-container">
        <div class="auth-card" style="text-align:center;">
          <h1>⚽ Youth Football Manager</h1>
          <p style="color:#666;margin:20px 0;">Link non valido</p>
          <p style="color:#999;font-size:14px;">Il link potrebbe essere scaduto o non essere corretto.</p>
        </div>
      </div>
    `;
    return;
  }

  showLoading('Verifica accesso...');
  
  try {
    const guestData = await verifyGuestToken(token);
    hideLoading();
    
    // Salva sessione guest
    setGuestSession(guestData);
    
    // Reindirizza alla dashboard
    c.innerHTML = `
      <div class="auth-container">
        <div class="auth-card" style="text-align:center;">
          <h1>⚽ Youth Football Manager</h1>
          <div style="margin:20px 0;">
            <p style="font-size:48px;">${guestData.tipo === 'atleta' ? '🏃' : '👨‍👩‍👧'}</p>
            <p style="font-size:18px;font-weight:bold;text-transform:capitalize;">Accesso come ${guestData.tipo}</p>
            <p style="color:#666;">Creato da: ${guestData.creator}</p>
          </div>
          <p style="color:#666;">Reindirizzamento...</p>
        </div>
      </div>
    `;
    
    // Reindirizza dopo 2 secondi
    setTimeout(() => {
      window.YFM.navigateTo('dashboard');
    }, 2000);
    
  } catch (err) {
    hideLoading();
    let errore = 'Link non valido';
    if (err.message.includes('410') || err.message.includes('scaduto')) {
      errore = 'Questo link è scaduto. Richiedine uno nuovo all\'amministratore.';
    } else if (err.message.includes('404')) {
      errore = 'Link non valido. Il link potrebbe essere stato revocato.';
    }
    
    c.innerHTML = `
      <div class="auth-container">
        <div class="auth-card" style="text-align:center;">
          <h1>⚽ Youth Football Manager</h1>
          <div style="margin:20px 0;">
            <p style="font-size:48px;color:#E74C3C;">❌</p>
            <p style="color:#E74C3C;font-weight:bold;">${errore}</p>
          </div>
          <p style="color:#999;font-size:14px;">Contatta l'amministratore se pensi che ci sia un errore.</p>
        </div>
      </div>
    `;
  }
}
