/**
 * Demo Interattiva - Youth Football Manager
 * Sistema di demo guidata con missioni e progressi
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURAZIONE MISSIONI
// ═══════════════════════════════════════════════════════════════

export const DEMO_MISSIONS = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Panoramica società, prossima partita e statistiche',
    icon: '📊',
    page: 'dashboard',
    completed: false
  },
  {
    id: 'roster',
    title: 'Rosa',
    description: 'Gestisci giocatori, ruoli e numeri di maglia',
    icon: '👥',
    page: 'roster',
    completed: false
  },
  {
    id: 'calendar',
    title: 'Calendario',
    description: 'Tutte le partite, archiviazione e dettagli',
    icon: '📅',
    page: 'calendar',
    completed: false
  },
  {
    id: 'training',
    title: 'Allenamenti',
    description: 'Organizza sedute e monitora presenze',
    icon: '🏃',
    page: 'training',
    completed: false
  },
  {
    id: 'stats',
    title: 'Statistiche',
    description: 'Classifiche marcatori, assist e disciplina',
    icon: '📈',
    page: 'stats',
    completed: false
  },
  {
    id: 'reports',
    title: 'Report',
    description: 'Genera report partita e stagionali PDF',
    icon: '📄',
    page: 'reports',
    completed: false
  }
];

// ═══════════════════════════════════════════════════════════════
// TOOLTIP MARKETING (per pagina)
// ═══════════════════════════════════════════════════════════════

export const DEMO_TOOLTIPS = {
  dashboard: {
    title: '💡 Dashboard Intelligente',
    content: 'Panoramica completa: prossima partita, trend risultati, top marcatori, top assist e statistiche società.'
  },
  roster: {
    title: '💡 Rosa Digitale',
    content: 'Gestisci tutti i giocatori con ruoli, numeri di maglia e scadenze mediche. Filtra per ruolo, cerca per nome e aggiungi nuovi giocatori.'
  },
  calendar: {
    title: '💡 Calendario Completo',
    content: 'Tutte le partite in un\'unica vista. Prossime e passate organizzate per data. Archiviazione con un click.'
  },
  training: {
    title: '💡 Allenamenti Organizzati',
    content: 'Organizza le sedute di allenamento, monitora le presenze e condividi esercizi con lo staff.'
  },
  stats: {
    title: '💡 Statistiche Avanzate',
    content: 'Classifiche marcatori, assist e presenze.Statistiche di disciplina. Filtra per stagione e categoria.'
  },
  reports: {
    title: '💡 Report Professionali',
    content: 'Genera report partita, stagionali e individuali in PDF. Professionali e pronti da stampare.'
  },
  // Alias per compatibilità
  'player-detail': {
    title: '💡 Scheda Giocatore',
    content: 'Storico completo: presenze, gol, assist e valutazioni del giocatore selezionato.'
  }
};

// ═══════════════════════════════════════════════════════════════
// STATO DEMO
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'yfm_demo_progress';
const SESSION_KEY = 'yfm_demo_session';

class DemoManager {
  constructor() {
    this.isDemo = false;
    this.missions = [...DEMO_MISSIONS];
    this.completedCount = 0;
    this.welcomeShown = false;
  }

  // ═══════════════════════════════════════════════════════════════
  // INIZIALIZZAZIONE
  // ═══════════════════════════════════════════════════════════════

  init() {
    // Controlla se è una sessione demo dal login
    const params = new URLSearchParams(window.location.search);
    this.isDemo = params.has('demo') || localStorage.getItem(SESSION_KEY) === 'active';
    
    console.log('[DEMO] init() called, isDemo:', this.isDemo, 'welcomeShown:', this.welcomeShown);
    
    if (this.isDemo) {
      this.loadProgress();
      console.log('[DEMO] after loadProgress, missions:', this.completedCount, '/', this.missions.length);
      this.setupWelcomePopup();
      this.updateBadge();
      this.injectTooltipStyles();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // GESTIONE PROGRESSI
  // ═══════════════════════════════════════════════════════════════

  loadProgress() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.missions = data.missions || [...DEMO_MISSIONS];
        this.welcomeShown = data.welcomeShown || false;
      } else {
        this.missions = [...DEMO_MISSIONS];
      }
      this.updateCompletedCount();
    } catch (e) {
      console.log('Demo: errore caricamento progressi', e);
      this.missions = [...DEMO_MISSIONS];
    }
  }

  saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        missions: this.missions,
        welcomeShown: this.welcomeShown,
        savedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.log('Demo: errore salvataggio progressi', e);
    }
  }

  updateCompletedCount() {
    this.completedCount = this.missions.filter(m => m.completed).length;
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPLETAMENTO MISSIONE
  // ═══════════════════════════════════════════════════════════════

  completeMission(missionId) {
    const mission = this.missions.find(m => m.id === missionId);
    if (mission && !mission.completed) {
      mission.completed = true;
      this.updateCompletedCount();
      this.saveProgress();
      this.updateMissionPanel();
      this.updateBadge();
      
      // Mostra notifica
      this.showNotification(`🏆 ${mission.title} completata!`);
      
      // Check se tutte completate
      if (this.completedCount === this.missions.length) {
        this.showCompletionCelebration();
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // NAVIGAZIONE CON TRACKING
  // ═══════════════════════════════════════════════════════════════

  navigateTo(page, params = null) {
    // Tracking missione se la pagina è una missione
    this.trackPageVisit(page);
    
    // Naviga normalmente
    if (window.YFM && window.YFM.navigateTo) {
      window.YFM.navigateTo(page, params);
    }
    
    // Mostra tooltip se disponibile
    setTimeout(() => {
      this.showTooltipForPage(page);
    }, 500);
  }

  trackPageVisit(page) {
    // Trova la missione corrispondente
    const mission = this.missions.find(m => m.page === page);
    if (mission) {
      this.completeMission(mission.id);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UI COMPONENTS
  // ═══════════════════════════════════════════════════════════════

  // Badge nell'header
  updateBadge() {
    let badge = document.getElementById('demo-badge');
    if (!badge && this.isDemo) {
      badge = document.createElement('div');
      badge.id = 'demo-badge';
      badge.innerHTML = '🌱 Modalità Demo';
      badge.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        background: linear-gradient(135deg, #27AE60, #2ECC71);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 4px 15px rgba(39, 174, 96, 0.4);
        cursor: pointer;
        transition: all 0.3s ease;
      `;
      badge.onclick = () => this.toggleMissionPanel();
      document.body.appendChild(badge);
    }
    
    if (badge) {
      const progress = Math.round((this.completedCount / this.missions.length) * 100);
      badge.innerHTML = `🌱 Demo ${progress}%`;
      
      if (progress === 100) {
        badge.style.background = 'linear-gradient(135deg, #F39C12, #E67E22)';
        badge.innerHTML = '🎉 Demo Completa!';
      }
    }
  }

  // Panel Missioni
  toggleMissionPanel() {
    let panel = document.getElementById('demo-mission-panel');
    
    if (panel) {
      panel.remove();
      return;
    }
    
    this.showMissionPanel();
  }

  showMissionPanel() {
    const panel = document.createElement('div');
    panel.id = 'demo-mission-panel';
    
    const progress = Math.round((this.completedCount / this.missions.length) * 100);
    
    panel.innerHTML = `
      <div class="demo-panel-header">
        <div class="demo-panel-title">
          <span style="font-size: 24px;">🎯</span>
          <div>
            <h3>Scopri YFM</h3>
            <p>Completa le missioni per esplorare</p>
          </div>
        </div>
        <button class="demo-panel-close" onclick="document.getElementById('demo-mission-panel').remove()">×</button>
      </div>
      
      <div class="demo-progress-bar">
        <div class="demo-progress-fill" style="width: ${progress}%"></div>
      </div>
      <div class="demo-progress-text">${this.completedCount} di ${this.missions.length} missioni completate</div>
      
      <div class="demo-missions-list">
        ${this.missions.map(m => `
          <div class="demo-mission-item ${m.completed ? 'completed' : ''}" data-mission="${m.id}">
            <span class="demo-mission-icon">${m.completed ? '✅' : m.icon}</span>
            <div class="demo-mission-content">
              <div class="demo-mission-title">${m.title}</div>
              <div class="demo-mission-desc">${m.description}</div>
            </div>
          </div>
        `).join('')}
      </div>
      
      ${this.completedCount === this.missions.length ? `
        <div class="demo-completion-banner">
          <h4>🎉 Hai completato la demo!</h4>
          <p>Prova YFM con la tua società</p>
          <button class="demo-cta-btn" onclick="window.demoManager.showRegistrationForm()" style="margin-bottom:8px;">
            📝 Registrati Adesso →
          </button>
          <button onclick="window.demoManager.resetDemo()" style="
            width:100%;
            padding:10px;
            background:#f0f0f0;
            color:#666;
            border:1px solid #ddd;
            border-radius:8px;
            font-size:13px;
            cursor:pointer;
          ">🔄 Riprova la demo</button>
        </div>
      ` : ''}
    `;
    
    panel.style.cssText = `
      position: fixed;
      top: 120px;
      right: 20px;
      width: 340px;
      max-height: 70vh;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      z-index: 10000;
      overflow: hidden;
      font-family: 'Inter', -apple-system, sans-serif;
    `;
    
    // Inject styles
    this.injectPanelStyles();
    
    document.body.appendChild(panel);
    
    // Click su missione per navigare
    panel.querySelectorAll('.demo-mission-item').forEach(item => {
      item.addEventListener('click', () => {
        const missionId = item.dataset.mission;
        const mission = this.missions.find(m => m.id === missionId);
        if (mission && !mission.completed) {
          this.navigateTo(mission.page);
        }
      });
    });
  }

  updateMissionPanel() {
    const panel = document.getElementById('demo-mission-panel');
    if (!panel) return;
    
    this.missions.forEach(m => {
      const item = panel.querySelector(`[data-mission="${m.id}"]`);
      if (item) {
        if (m.completed) {
          item.classList.add('completed');
          item.querySelector('.demo-mission-icon').textContent = '✅';
        }
      }
    });
    
    const progress = Math.round((this.completedCount / this.missions.length) * 100);
    panel.querySelector('.demo-progress-fill').style.width = `${progress}%`;
    panel.querySelector('.demo-progress-text').textContent = `${this.completedCount} di ${this.missions.length} missioni completate`;
  }

  // ═══════════════════════════════════════════════════════════════
  // POPUP BENVENUTO
  // ═══════════════════════════════════════════════════════════════

  setupWelcomePopup() {
    console.log('[DEMO] setupWelcomePopup called, welcomeShown:', this.welcomeShown);
    if (this.welcomeShown) {
      console.log('[DEMO] skipping popup, already shown');
      return;
    }
    
    setTimeout(() => {
      console.log('[DEMO] showing popup now');
      this.showWelcomePopup();
    }, 1000);
  }

  showWelcomePopup() {
    const overlay = document.createElement('div');
    overlay.id = 'demo-welcome-overlay';
    
    overlay.innerHTML = `
      <div class="demo-welcome-card">
        <div class="demo-welcome-header">
          <div class="demo-welcome-logo">⚽</div>
          <h2>Benvenuto nella Demo!</h2>
        </div>
        
        <div class="demo-welcome-content">
          <p>Stai esplorando <strong>ASD Green Academy</strong>, una società di esempio.</p>
          
          <div class="demo-welcome-features">
            <div class="demo-feature">
              <span class="demo-feature-icon">🎯</span>
              <span>Esplora tutte le funzionalità</span>
            </div>
            <div class="demo-feature">
              <span class="demo-feature-icon">✏️</span>
              <span>Prova a modificare dati</span>
            </div>
            <div class="demo-feature">
              <span class="demo-feature-icon">🔒</span>
              <span>I tuoi dati non verranno salvati</span>
            </div>
          </div>
          
          <div class="demo-welcome-cta">
            <button class="demo-tour-btn" onclick="window.demoManager.startTour()">
              🚀 Inizia il Tour Guidato
            </button>
            <button class="demo-skip-btn" onclick="window.demoManager.skipTour()">
              Esplora liberamente
            </button>
          </div>
        </div>
      </div>
    `;
    
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 20000;
      backdrop-filter: blur(4px);
    `;
    
    // Inject welcome styles
    this.injectWelcomeStyles();
    
    document.body.appendChild(overlay);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.skipTour();
      }
    });
    
    this.welcomeShown = true;
    this.saveProgress();
  }

  startTour() {
    this.closeWelcomePopup();
    this.navigateTo(this.missions[0].page);
  }

  skipTour() {
    this.closeWelcomePopup();
  }

  closeWelcomePopup() {
    const overlay = document.getElementById('demo-welcome-overlay');
    if (overlay) overlay.remove();
  }

  // ═══════════════════════════════════════════════════════════════
  // TOOLTIP MARKETING
  // ═══════════════════════════════════════════════════════════════

  showTooltipForPage(page) {
    if (!this.isDemo) return;
    
    // Cerca tooltip per pagina
    const tooltip = DEMO_TOOLTIPS[page];
    if (!tooltip) return;
    
    // Non mostrare se già mostrato di recente
    const lastShown = sessionStorage.getItem('yfm_tooltip_shown_' + page);
    if (lastShown) return;
    
    this.showMarketingTooltip(tooltip);
    sessionStorage.setItem('yfm_tooltip_shown_' + page, 'true');
  }

  showMarketingTooltip(tooltip) {
    // Rimuovi tooltip precedente
    const existing = document.getElementById('demo-marketing-tooltip');
    if (existing) existing.remove();
    
    const tip = document.createElement('div');
    tip.id = 'demo-marketing-tooltip';
    tip.innerHTML = `
      <div class="demo-tip-header">${tooltip.title}</div>
      <div class="demo-tip-content">${tooltip.content}</div>
      <button class="demo-tip-close" onclick="this.parentElement.remove()">✓</button>
    `;
    
    tip.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      max-width: 400px;
      box-shadow: 0 8px 30px rgba(102, 126, 234, 0.4);
      z-index: 9999;
      font-family: 'Inter', -apple-system, sans-serif;
      animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(tip);
    
    // Auto-hide dopo 8 secondi
    setTimeout(() => {
      if (tip.parentElement) tip.remove();
    }, 8000);
  }

  showNotification(message) {
    const notif = document.createElement('div');
    notif.className = 'demo-notification';
    notif.textContent = message;
    notif.style.cssText = `
      position: fixed;
      top: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: #27AE60;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 10001;
      animation: slideDown 0.3s ease;
      box-shadow: 0 4px 15px rgba(39, 174, 96, 0.4);
    `;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
      notif.style.opacity = '0';
      setTimeout(() => notif.remove(), 300);
    }, 3000);
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPLETAMENTO DEMO
  // ═══════════════════════════════════════════════════════════════

  showCompletionCelebration() {
    const banner = document.createElement('div');
    banner.id = 'demo-celebration';
    banner.innerHTML = `
      <div class="celebration-content">
        <span style="font-size: 48px;">🎉</span>
        <h3>Hai completato la demo!</h3>
        <p>Sei pronto per provare YFM con la tua società?</p>
        <div class="celebration-actions">
          <button class="celebration-btn-primary" onclick="window.YFM.navigateTo('settings')">
            Inizia la prova gratuita
          </button>
          <button class="celebration-btn-secondary" onclick="window.demoManager.resetDemo()">
            Riprova la demo
          </button>
        </div>
      </div>
    `;
    
    banner.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 40px;
      border-radius: 20px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      z-index: 20001;
      animation: popIn 0.4s ease;
    `;
    
    this.injectCelebrationStyles();
    document.body.appendChild(banner);
    
    // Auto show after 2 seconds if not interacted
    setTimeout(() => {
      if (document.getElementById('demo-celebration')) {
        // Already showing
      }
    }, 2000);
  }

  // ═══════════════════════════════════════════════════════════════
  // FORM REGISTRAZIONE
  // ═══════════════════════════════════════════════════════════════

  showRegistrationForm() {
    const overlay = document.createElement('div');
    overlay.id = 'demo-registration-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.6);
      z-index: 20000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;

    overlay.innerHTML = `
      <div style="
        background: white;
        border-radius: 16px;
        padding: 32px;
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
          <h2 style="margin:0;font-size:22px;color:#333;">📝 Richiesta Informazioni</h2>
          <button onclick="window.demoManager.closeRegistrationForm()" style="
            background:none;border:none;font-size:24px;cursor:pointer;color:#888;padding:4px;line-height:1;
          ">×</button>
        </div>
        
        <form id="demo-registration-form" onsubmit="window.demoManager.submitRegistration(event)">
          <div style="margin-bottom:16px;">
            <label style="display:block;font-weight:600;margin-bottom:6px;color:#333;font-size:14px;">
              Nome Società *
            </label>
            <input type="text" name="societa" required placeholder="Es. ASD Calcio Gioventù"
              style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;">
          </div>
          
          <div style="margin-bottom:16px;">
            <label style="display:block;font-weight:600;margin-bottom:6px;color:#333;font-size:14px;">
              Nome e Cognome Contatto *
            </label>
            <input type="text" name="nome" required placeholder="Es. Marco Rossi"
              style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;">
          </div>
          
          <div style="margin-bottom:16px;">
            <label style="display:block;font-weight:600;margin-bottom:6px;color:#333;font-size:14px;">
              Email *
            </label>
            <input type="email" name="email" required placeholder="Es. marco.rossi@email.it"
              style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;">
          </div>
          
          <div style="margin-bottom:16px;">
            <label style="display:block;font-weight:600;margin-bottom:6px;color:#333;font-size:14px;">
              Telefono
            </label>
            <input type="tel" name="telefono" placeholder="Es. 333 1234567"
              style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;">
          </div>
          
          <div style="margin-bottom:16px;">
            <label style="display:block;font-weight:600;margin-bottom:6px;color:#333;font-size:14px;">
              Categorie di Interesse *
            </label>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                <input type="checkbox" name="categorie" value="Primi Calci"> Primi Calci
              </label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                <input type="checkbox" name="categorie" value="Pulcini"> Pulcini
              </label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                <input type="checkbox" name="categorie" value="Esordienti"> Esordienti
              </label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                <input type="checkbox" name="categorie" value="Allievi"> Allievi
              </label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                <input type="checkbox" name="categorie" value="Juniores"> Juniores
              </label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                <input type="checkbox" name="categorie" value="Femminile"> Femminile
              </label>
            </div>
          </div>
          
          <div style="margin-bottom:20px;">
            <label style="display:block;font-weight:600;margin-bottom:6px;color:#333;font-size:14px;">
              Note / Messaggio
            </label>
            <textarea name="note" rows="3" placeholder="Eventuali informazioni aggiuntive..."
              style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:14px;resize:vertical;box-sizing:border-box;"></textarea>
          </div>
          
          <button type="submit" style="
            width:100%;
            padding:14px;
            background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color:white;
            border:none;
            border-radius:10px;
            font-size:16px;
            font-weight:600;
            cursor:pointer;
            transition:transform 0.2s;
          ">📧 Invia Richiesta</button>
          
          <p style="text-align:center;margin-top:16px;font-size:12px;color:#888;">
            Le tue informazioni saranno inviate a youthfootballmanager@gmail.com
          </p>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeRegistrationForm();
    });
  }

  closeRegistrationForm() {
    document.getElementById('demo-registration-overlay')?.remove();
  }

  submitRegistration(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const dati = {
      societa: formData.get('societa'),
      nome: formData.get('nome'),
      email: formData.get('email'),
      telefono: formData.get('telefono') || '-',
      categorie: formData.getAll('categorie').join(', ') || '-',
      note: formData.get('note') || '-'
    };

    // Crea corpo email
    const subject = encodeURIComponent('Richiesta Informazioni YFM - ' + dati.societa);
    const body = encodeURIComponent(
      `RICHIESTA INFORMAZIONI YFM\n` +
      `========================\n\n` +
      `Società: ${dati.societa}\n` +
      `Nome: ${dati.nome}\n` +
      `Email: ${dati.email}\n` +
      `Telefono: ${dati.telefono}\n` +
      `Categorie: ${dati.categorie}\n\n` +
      `Note:\n${dati.note}`
    );

    // Apri email client
    window.location.href = `mailto:youthfootballmanager@gmail.com?subject=${subject}&body=${body}`;
    
    this.closeRegistrationForm();
    
    // Mostra conferma
    alert('✅ Richiesta inviata! Ti contatteremo presto.');
  }

  resetDemo() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SESSION_KEY);
    this.missions = [...DEMO_MISSIONS];
    this.completedCount = 0;
    this.welcomeShown = false;
    
    // Remove all demo UI
    document.getElementById('demo-badge')?.remove();
    document.getElementById('demo-mission-panel')?.remove();
    document.getElementById('demo-welcome-overlay')?.remove();
    document.getElementById('demo-celebration')?.remove();
    document.getElementById('demo-registration-overlay')?.remove();
    
    // Reset session storage for tooltips
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('yfm_tooltip_shown_')) {
        sessionStorage.removeItem(key);
      }
    });
    
    // Navigate to dashboard and show welcome again
    this.navigateTo('dashboard');
    
    // Recrea badge e mostra popup di benvenuto
    setTimeout(() => {
      this.updateBadge();
      this.showMissionPanel();
      this.showWelcomePopup();
    }, 500);
  }

  // ═══════════════════════════════════════════════════════════════
  // STYLES
  // ═══════════════════════════════════════════════════════════════

  injectPanelStyles() {
    if (document.getElementById('demo-panel-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'demo-panel-styles';
    style.textContent = `
      #demo-mission-panel .demo-panel-header {
        padding: 20px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      #demo-mission-panel .demo-panel-title {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      #demo-mission-panel .demo-panel-title h3 {
        margin: 0;
        font-size: 16px;
      }
      #demo-mission-panel .demo-panel-title p {
        margin: 0;
        font-size: 12px;
        opacity: 0.8;
      }
      #demo-mission-panel .demo-panel-close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }
      #demo-mission-panel .demo-progress-bar {
        height: 6px;
        background: #e0e0e0;
        margin: 16px 20px 8px;
        border-radius: 3px;
        overflow: hidden;
      }
      #demo-mission-panel .demo-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #27AE60, #2ECC71);
        transition: width 0.3s ease;
      }
      #demo-mission-panel .demo-progress-text {
        font-size: 12px;
        color: #666;
        text-align: center;
        margin-bottom: 16px;
      }
      #demo-mission-panel .demo-missions-list {
        max-height: 300px;
        overflow-y: auto;
        padding: 0 12px 12px;
      }
      #demo-mission-panel .demo-mission-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 10px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: #f8f9fa;
      }
      #demo-mission-panel .demo-mission-item:hover {
        background: #e8eaff;
      }
      #demo-mission-panel .demo-mission-item.completed {
        background: #e8f8ef;
      }
      #demo-mission-panel .demo-mission-icon {
        font-size: 20px;
      }
      #demo-mission-panel .demo-mission-title {
        font-weight: 600;
        font-size: 14px;
        color: #333;
      }
      #demo-mission-panel .demo-mission-desc {
        font-size: 11px;
        color: #666;
        margin-top: 2px;
      }
      #demo-mission-panel .demo-completion-banner {
        background: linear-gradient(135deg, #F39C12, #E67E22);
        color: white;
        padding: 20px;
        text-align: center;
      }
      #demo-mission-panel .demo-completion-banner h4 {
        margin: 0 0 8px;
        font-size: 16px;
      }
      #demo-mission-panel .demo-completion-banner p {
        margin: 0 0 12px;
        font-size: 13px;
        opacity: 0.9;
      }
      #demo-mission-panel .demo-cta-btn {
        background: white;
        color: #E67E22;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s;
      }
      #demo-mission-panel .demo-cta-btn:hover {
        transform: scale(1.05);
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translate(-50%, 20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
    `;
    document.head.appendChild(style);
  }

  injectWelcomeStyles() {
    if (document.getElementById('demo-welcome-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'demo-welcome-styles';
    style.textContent = `
      .demo-welcome-card {
        background: white;
        border-radius: 20px;
        max-width: 480px;
        width: 90%;
        overflow: hidden;
        animation: popIn 0.4s ease;
      }
      .demo-welcome-header {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        padding: 30px;
        text-align: center;
      }
      .demo-welcome-logo {
        font-size: 48px;
        margin-bottom: 12px;
      }
      .demo-welcome-header h2 {
        margin: 0;
        font-size: 24px;
      }
      .demo-welcome-content {
        padding: 30px;
      }
      .demo-welcome-content > p {
        color: #666;
        margin: 0 0 20px;
        text-align: center;
      }
      .demo-welcome-features {
        margin-bottom: 24px;
      }
      .demo-feature {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: #f8f9fa;
        border-radius: 10px;
        margin-bottom: 8px;
      }
      .demo-feature-icon {
        font-size: 20px;
      }
      .demo-welcome-cta {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .demo-tour-btn {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        border: none;
        padding: 14px 24px;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .demo-tour-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
      }
      .demo-skip-btn {
        background: none;
        border: none;
        color: #888;
        padding: 10px;
        cursor: pointer;
        font-size: 14px;
      }
      .demo-skip-btn:hover {
        color: #333;
      }
      @keyframes popIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes slideDown {
        from { opacity: 0; transform: translate(-50%, -20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
    `;
    document.head.appendChild(style);
  }

  injectTooltipStyles() {
    if (document.getElementById('demo-tooltip-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'demo-tooltip-styles';
    style.textContent = `
      .demo-tip-header {
        font-weight: 700;
        font-size: 14px;
        margin-bottom: 6px;
      }
      .demo-tip-content {
        font-size: 13px;
        opacity: 0.95;
        line-height: 1.5;
      }
      .demo-tip-close {
        position: absolute;
        top: 8px;
        right: 12px;
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 14px;
      }
      .demo-notification {
        font-family: 'Inter', -apple-system, sans-serif;
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translate(-50%, 20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
    `;
    document.head.appendChild(style);
  }

  injectCelebrationStyles() {
    if (document.getElementById('demo-celebration-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'demo-celebration-styles';
    style.textContent = `
      #demo-celebration .celebration-content h3 {
        margin: 16px 0 8px;
        color: #333;
        font-size: 20px;
      }
      #demo-celebration .celebration-content p {
        color: #666;
        margin: 0 0 20px;
      }
      #demo-celebration .celebration-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
      }
      #demo-celebration .celebration-btn-primary {
        background: linear-gradient(135deg, #27AE60, #2ECC71);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
      }
      #demo-celebration .celebration-btn-secondary {
        background: #f0f0f0;
        color: #333;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
      }
      @keyframes popIn {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
    `;
    document.head.appendChild(style);
  }
}

// ═══════════════════════════════════════════════════════════════
// ESPORTAZIONE
// ═══════════════════════════════════════════════════════════════

const demoManager = new DemoManager();
export default demoManager;

// Espone globalmente per accesso da HTML inline
window.demoManager = demoManager;
