import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';
import { BUILD_INFO } from '../../build-info';
import { wsSortKey } from '../club/workspaceSwitcher';

export default async function loadLogin() {
  const c = document.getElementById('pageContent');
  
  // Se già loggato, reindirizza
  if (window.YFM && window.YFM.isAuthenticated && window.YFM.isAuthenticated()) {
    window.YFM.navigateTo('dashboard');
    return;
  }

  c.innerHTML = `
    <div class="login-container">
      <div class="login-welcome">
        <img src="/assets/app-icon.png" alt="Youth Football Manager" class="login-icon">
        <h1>Youth Football Manager</h1>
        <p class="login-subtitle">La piattaforma digitale per allenatori di calcio giovanile</p>
        
        <div class="login-features">
          <div class="login-feature">
            <span class="feature-icon">👥</span>
            <span>Gestione Rosa</span>
          </div>
          <div class="login-feature">
            <span class="feature-icon">📅</span>
            <span>Calendario Partite</span>
          </div>
          <div class="login-feature">
            <span class="feature-icon">🏃</span>
            <span>Allenamenti</span>
          </div>
          <div class="login-feature">
            <span class="feature-icon">📈</span>
            <span>Statistiche</span>
          </div>
        </div>
        
        <form id="loginForm" class="login-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" placeholder="tua@email.com" required>
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" placeholder="La tua password" required>
          </div>
          
          <div id="loginError" class="error-message" style="display:none;"></div>
          
          <button type="submit" class="btn-login-submit">
            🔐 Accedi
          </button>
        </form>
        
        <p class="login-note">
          Non hai un account? Contatta il tuo amministratore.
        </p>
        
        <div class="build-info">
          build: ${BUILD_INFO.id}
        </div>
      </div>
    </div>
    
    <style>
      .login-container {
        position: fixed;
        inset: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
        background: rgba(248, 249, 250, 0.7);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 200;
      }
      .login-welcome {
        background: white;
        border-radius: 24px;
        padding: 48px;
        width: 100%;
        max-width: 500px;
        box-shadow: 0 12px 48px rgba(0,0,0,0.12);
        text-align: center;
      }
      .login-icon {
        width: 120px;
        height: 120px;
        object-fit: contain;
        border-radius: 24px !important;
        box-shadow: 0 8px 30px rgba(102,126,234,0.3);
        margin: 0 auto 24px auto;
        display: block;
      }
      .login-welcome h1 {
        font-size: 28px;
        font-weight: 700;
        margin: 0 0 12px 0;
        color: #1a1a2e;
      }
      .login-subtitle {
        color: #666;
        font-size: 16px;
        margin: 0 0 32px 0;
      }
      .login-features {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 32px;
      }
      .login-feature {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 16px;
        background: #f8f9ff;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
        color: #444;
      }
      .feature-icon {
        font-size: 20px;
      }
      .login-form {
        text-align: left;
        margin-bottom: 24px;
      }
      .login-form .form-group {
        margin-bottom: 16px;
      }
      .login-form label {
        display: block;
        font-weight: 500;
        margin-bottom: 6px;
        color: #333;
        font-size: 14px;
      }
      .login-form input {
        width: 100%;
        padding: 14px 16px;
        border: 1.5px solid #e0e0e0;
        border-radius: 10px;
        font-size: 15px;
        box-sizing: border-box;
        transition: border-color 0.2s;
      }
      .login-form input:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
      }
      .btn-login-submit {
        width: 100%;
        padding: 18px 32px;
        border-radius: 14px;
        font-size: 17px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        border: none;
        box-shadow: 0 6px 20px rgba(102,126,234,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }
      .btn-login-submit:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 30px rgba(102,126,234,0.5);
      }
      .btn-login-submit:active {
        transform: translateY(-1px);
      }
      .login-note {
        margin-top: 0;
        font-size: 13px;
        color: #999;
        line-height: 1.5;
      }
      .build-info {
        text-align: center;
        padding: 8px;
        font-size: 10px;
        color: #ccc;
        margin-top: 16px;
        font-family: monospace;
      }
      .error-message {
        background: #fee;
        color: #c33;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 12px;
        font-size: 14px;
        text-align: center;
      }
      @media (max-width: 480px) {
        .login-welcome {
          padding: 32px 24px;
        }
        .login-features {
          grid-template-columns: 1fr;
        }
      }
    </style>
  `;

  // Login form
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
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
      localStorage.removeItem('yfm_demo_session');
      localStorage.removeItem('yfm_demo_user');
      
      window.YFM.setUser(res.user);
      const user = res.user;
      
      // Superadmin: mostra selezione workspace
      if (user.is_superadmin) {
        const { loadAvailableWorkspaces } = await import('../../modules/club/workspaceSwitcher');
        const workspaces = await loadAvailableWorkspaces();
        hideLoading();
        showSuperadminHome(workspaces, user);
        return;
      }
      
      await proceedToApp(user);
    } catch (err) {
      hideLoading();
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
    }
  });
}

async function showSuperadminHome(workspaces, user) {
  await proceedToApp(user, workspaces, 'workspaces');
}

async function proceedToApp(user, workspaces, targetPage = 'dashboard') {
  try {
    if (!workspaces) {
      const { loadAvailableWorkspaces } = await import('../../modules/club/workspaceSwitcher');
      workspaces = await loadAvailableWorkspaces();
    }

    if (!window.YFM.activeWorkspaceId) {
      const { getSavedWorkspaceId, saveCurrentWorkspace } = await import('../../modules/club/workspaceSwitcher');
      const savedId = getSavedWorkspaceId();
      const currentWs = (savedId && workspaces.find(w => w.id === savedId)) || workspaces.find(w => w.id === user.workspace_id) || workspaces[0];
      if (currentWs) {
        saveCurrentWorkspace(currentWs.id);
        window.YFM.workspaceInfo = currentWs;
        window.YFM.activeWorkspaceId = currentWs.id;
      }
    }

    const { setupLayout } = await import('../../components/layout/Sidebar');
    setupLayout();
    const { initRouter } = await import('../../router');
    initRouter();

    const { loadWorkspaceInfo } = await import('../../modules/club/workspace');
    const { loadSquadre } = await import('../../modules/team/squadre');
    const { populateWorkspaceSelect } = await import('../../modules/club/workspaceSwitcher');
    await Promise.all([loadWorkspaceInfo(), loadSquadre()]);
    if (user.is_superadmin) populateWorkspaceSelect(workspaces);

    hideLoading();
    window.YFM.navigateTo(targetPage);
  } catch (err) {
    hideLoading();
    console.error('[proceedToApp]', err);
  }
}
