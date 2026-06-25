import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';

export default async function loadLogin() {
  // Leggi parametri dalla URL
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  
  // Salva referral code dall URL se presente
  if (refCode) {
    localStorage.setItem('referralCode', refCode);
    // Rimuovi il parametro ref dall URL per pulizia
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }
  const c = document.getElementById('pageContent');
  
  // Se già loggato, reindirizza
  if (window.YFM && window.YFM.isAuthenticated && window.YFM.isAuthenticated()) {
    window.YFM.navigateTo('dashboard');
    return;
  }

  c.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <img src="/assets/app-icon.png" alt="Youth Football Manager" class="app-icon-login">
          <h1>Youth Football Manager</h1>
          <p>Accedi al tuo account</p>
        </div>
        
        <form id="loginForm" class="auth-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" placeholder=" tua@email.com" required>
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" placeholder=" La tua password" required>
          </div>
          
          <div id="loginError" class="error-message" style="display:none;"></div>
          
          <div class="auth-buttons-row">
            <button type="submit" class="btn btn-primary">🔐 Login</button>
            <button type="button" id="startDemoBtn" class="btn btn-secondary">🎮 Demo</button>
          </div>
        </form>
        
        <div class="auth-footer">
          <p>Non hai un account? <a href="#" id="showRegister">Registrati</a></p>
        </div>
      </div>
      
      <!-- Form Registrazione (nascosto) -->
      <div class="auth-card" id="registerCard" style="display:none;">
        <div class="auth-header">
          <img src="/assets/app-icon.png" alt="Youth Football Manager" class="app-icon-login">
          <h1>Youth Football Manager</h1>
          <p>Crea un nuovo account</p>
        </div>
        
        <form id="registerForm" class="auth-form">
          <div class="form-group">
            <label for="regNome">Nome *</label>
            <input type="text" id="regNome" placeholder=" Il tuo nome" required>
          </div>
          
          <div class="form-group">
            <label for="regCognome">Cognome</label>
            <input type="text" id="regCognome" placeholder=" Il tuo cognome">
          </div>
          
          <div class="form-group">
            <label for="regEmail">Email *</label>
            <input type="email" id="regEmail" placeholder=" tua@email.com" required>
          </div>
          
          <div class="form-group">
            <label for="regPassword">Password *</label>
            <input type="password" id="regPassword" placeholder=" Min 6 caratteri" minlength="6" required>
          </div>
          
          <div class="form-group">
            <label for="regRuolo">Ruolo</label>
            <select id="regRuolo">
              <option value="allenatore">Allenatore</option>
              <option value="staff">Staff</option>
              <option value="admin">Amministratore</option>
            </select>
          </div>
          
          <div id="registerError" class="error-message" style="display:none;"></div>
          
          <button type="submit" class="btn btn-primary btn-full">Registrati</button>
        </form>
        
        <div class="auth-footer">
          <p>Hai già un account? <a href="#" id="showLogin">Accedi</a></p>
        </div>
      </div>
    </div>
    
    <style>
      .auth-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 60vh;
        padding: 20px;
      }
      .auth-card {
        background: white;
        border-radius: 16px;
        padding: 40px;
        width: 100%;
        max-width: 400px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      }
      .auth-header {
        text-align: center;
        margin-bottom: 24px;
      }
      .auth-header img {
        border-radius: 16px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        display: block;
        margin: 0 auto;
      }
      .app-icon-login {
        width: 100px;
        height: 100px;
        object-fit: contain;
        border-radius: 20px !important;
        box-shadow: 0 8px 25px rgba(102,126,234,0.3) !important;
        display: block !important;
        margin: 0 auto !important;
      }
      .auth-header h1 {
        font-size: 22px;
        font-weight: 700;
        margin: 12px 0 8px 0;
        color: var(--primary);
      }
      .auth-header p {
        color: #666;
        margin: 0;
      }
      .auth-form .form-group {
        margin-bottom: 16px;
      }
      .auth-form label {
        display: block;
        font-weight: 500;
        margin-bottom: 6px;
        color: #333;
      }
      .auth-form input,
      .auth-form select {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
        box-sizing: border-box;
      }
      .auth-form input:focus {
        outline: none;
        border-color: #667eea;
      }
      .btn-full {
        width: 100%;
        padding: 14px;
        font-size: 16px;
        margin-top: 8px;
      }
      .auth-buttons-row {
        display: flex;
        gap: 12px;
        margin-top: 16px;
      }
      .auth-buttons-row .btn {
        flex: 1;
        padding: 14px;
        font-size: 15px;
        font-weight: 600;
      }
      .auth-buttons-row .btn-primary {
        background: linear-gradient(135deg, #667eea, #764ba2);
        box-shadow: 0 4px 15px rgba(102,126,234,0.4);
      }
      .auth-buttons-row .btn-secondary {
        background: linear-gradient(135deg, #27AE60, #2ECC71);
        color: white;
        border: none;
        box-shadow: 0 4px 15px rgba(39,174,96,0.4);
      }
      .auth-buttons-row .btn-secondary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(39,174,96,0.5);
      }
      .auth-footer {
        text-align: center;
        margin-top: 24px;
        color: #666;
      }
      .auth-footer a {
        color: #667eea;
        text-decoration: none;
        font-weight: 500;
      }
      .error-message {
        background: #fee;
        color: #c33;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 12px;
        font-size: 14px;
      }
    </style>
  `;

  // Toggle tra login e register
  document.getElementById('showRegister').addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('.auth-card').style.display = 'none';
    document.getElementById('registerCard').style.display = 'block';
  });

  document.getElementById('showLogin').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('registerCard').style.display = 'none';
    document.querySelector('.auth-card').style.display = 'block';
  });

  // Avvia demo
  document.getElementById('startDemoBtn').addEventListener('click', async () => {
    showLoading('Avvio demo...');
    
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ 
          email: 'demo_yfm', 
          password: 'demo_yfm' 
        })
      });
      
      // Salva token e user info
      localStorage.setItem('yfm_token', res.token);
      localStorage.setItem('yfm_user', JSON.stringify(res.user));
      localStorage.setItem('yfm_demo_session', 'active');
      
      window.YFM.setUser(res.user);
      
      // Pulisci URL da parametri
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      
      // Carica dati necessari per la dashboard
      const { loadWorkspaceInfo, loadSquadre } = await import('../../main.js');
      await Promise.all([loadWorkspaceInfo(), loadSquadre()]);
      
      // Inizializza demo manager
      if (window.demoManager) {
        window.demoManager.init();
      }
      
      hideLoading();
      window.YFM.navigateTo('dashboard');
    } catch (err) {
      hideLoading();
      const errorDiv = document.getElementById('loginError');
      errorDiv.textContent = 'Errore avvio demo: ' + err.message;
      errorDiv.style.display = 'block';
    }
  });

  // Login form
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    const isDemo = email === 'demo_yfm' || email === 'demo_yfm@yfm.it';
    
    showLoading('Accesso in corso...');
    errorDiv.style.display = 'none';
    
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      
      // Salva token e user info
      localStorage.setItem('yfm_token', res.token);
      localStorage.setItem('yfm_user', JSON.stringify(res.user));
      
      // Se è login demo, marca la sessione
      if (isDemo) {
        localStorage.setItem('yfm_demo_session', 'active');
      }
      
      window.YFM.setUser(res.user);
      
      // Pulisci URL da parametri demo
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      
      // Carica dati necessari per la dashboard
      const { loadWorkspaceInfo } = await import('../../modules/club/workspace');
      const { loadSquadre } = await import('../../modules/team/squadre');
      
      try {
        await Promise.all([loadWorkspaceInfo(), loadSquadre()]);
      } catch (e) {
        console.warn('Errore caricamento dati:', e);
      }
      
      // Inizializza demo se è sessione demo
      if (isDemo && window.demoManager) {
        window.demoManager.init();
      }
      
      hideLoading();
      window.YFM.navigateTo('dashboard');
    } catch (err) {
      hideLoading();
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
    }
  });

  // Register form
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('regNome').value;
    const cognome = document.getElementById('regCognome').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const ruolo = document.getElementById('regRuolo').value;
    const errorDiv = document.getElementById('registerError');
    
    showLoading('Registrazione...');
    errorDiv.style.display = 'none';
    
    try {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, nome, cognome, ruolo, referralCode: localStorage.getItem('referralCode') })
      });
      
      // Salva token e user info
      localStorage.setItem('yfm_token', res.token);
      localStorage.setItem('yfm_user', JSON.stringify(res.user));
      
      hideLoading();
      window.YFM.setUser(res.user);
      window.YFM.navigateTo('dashboard');
    } catch (err) {
      hideLoading();
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
    }
  });
}
