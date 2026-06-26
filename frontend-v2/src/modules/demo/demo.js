/**
 * Demo Interattiva - Youth Football Manager
 * Sistema di demo guidata con missioni e progressi
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURAZIONE MINI MISSIONI (per pagina)
// ═══════════════════════════════════════════════════════════════

export const MINI_MISSIONS_CONFIG = {
  dashboard: {
    title: 'Dashboard',
    icon: '📊',
    steps: [
      {
        id: 'explore_dashboard',
        title: 'Esplora la Dashboard',
        description: 'Scopri la panoramica della tua società',
        trigger: 'page_view'
      },
      {
        id: 'view_match_results',
        title: 'Guarda i risultati',
        description: 'Clicca su una partita per vedere i dettagli',
        trigger: 'click',
        target: '.next-match-card, .match-highlight, [data-match-id], .match-card'
      }
    ]
  },

  roster: {
    title: 'Rosa',
    icon: '👥',
    steps: [
      {
        id: 'filter_role',
        title: 'Filtra per ruolo',
        description: 'Applica un filtro per ruolo',
        trigger: 'select',
        target: '#roleFilter, select[name="role"], select[id*="role"], select[name*="role"]'
      },
      {
        id: 'view_player_card',
        title: 'Apri scheda giocatore',
        description: 'Clicca su un giocatore per vedere i dettagli',
        trigger: 'click',
        target: '.player-card, .giocatore-item, [data-player-id], .roster-player'
      }
    ]
  },

  calendar: {
    title: 'Calendario',
    icon: '📅',
    steps: [
      {
        id: 'explore_calendar',
        title: 'Esplora il calendario',
        description: 'Visualizza le partite in programma',
        trigger: 'page_view'
      },
      {
        id: 'create_convocation',
        title: 'Crea convocazioni',
        description: 'Prepara la lista dei giocatori convocati',
        trigger: 'click',
        target: 'button[name="convoca"], button:has-text("Convoca"), .btn-convoca'
      },
      {
        id: 'set_formation',
        title: 'Scegli la formazione',
        description: 'Assegna i ruoli in campo ai giocatori',
        trigger: 'click',
        target: 'button[name="formazione"], button:has-text("Formazione"), .btn-formazione'
      },
      {
        id: 'view_distinta',
        title: 'Visiona la distinta',
        description: 'Genera la distinta ufficiale FIGC',
        trigger: 'click',
        target: 'button[name="distinta"], button:has-text("Distinta"), .btn-distinta'
      },
      {
        id: 'insert_result',
        title: 'Inserisci il risultato',
        description: 'Registra gol, assist e altri eventi',
        trigger: 'click',
        target: 'button[name="eventi"], button[name="risultato"], button:has-text("Eventi"), button:has-text("Risultato")'
      }
    ]
  },

  training: {
    title: 'Allenamenti',
    icon: '🏃',
    steps: [
      {
        id: 'explore_training',
        title: 'Esplora gli allenamenti',
        description: 'Scopri le sedute programmate',
        trigger: 'page_view'
      },
      {
        id: 'view_session',
        title: 'Visualizza una seduta',
        description: 'Clicca su una seduta per vedere i dettagli',
        trigger: 'click',
        target: '.session-item, .training-item, [data-session-id], .seduta-item'
      },
      {
        id: 'mark_attendance',
        title: 'Segna le presenze',
        description: 'Registra i giocatori presenti',
        trigger: 'click',
        target: 'button:has-text("Presenze"), button:has-text("Attendance"), .btn-presenze'
      }
    ]
  },

  stats: {
    title: 'Statistiche',
    icon: '📈',
    steps: [
      {
        id: 'explore_stats',
        title: 'Esplora le statistiche',
        description: 'Visualizza le classifiche e i dati',
        trigger: 'auto_complete'
      }
    ]
  },

  reports: {
    title: 'Report',
    icon: '📄',
    steps: [
      {
        id: 'explore_reports',
        title: 'Esplora i report',
        description: 'Scopri i modelli di report disponibili',
        trigger: 'page_view'
      },
      {
        id: 'generate_match_report',
        title: 'Genera report partita',
        description: 'Crea il report dettagliato di una partita',
        trigger: 'click',
        target: 'button:has-text("Genera Report"), button:has-text("Genera"), .btn-genera-report'
      },
      {
        id: 'generate_season_report',
        title: 'Genera report stagione',
        description: 'Crea il report stagionale',
        trigger: 'click',
        target: 'button:has-text("Report Stagionale"), button:has-text("Genera Report Stagionale")'
      },
      {
        id: 'download_pdf',
        title: 'Scarica il PDF',
        description: 'Scarica il report in formato PDF',
        trigger: 'click',
        target: 'button:has-text("Stampa"), button:has-text("PDF"), .btn-stampa'
      }
    ]
  }
};;

// ═══════════════════════════════════════════════════════════════
// CONFIGURAZIONE MISSIONI GLOBALI
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
    
    // Dati demo per allenamenti
    this.demoTrainings = [
      { id: 't1', data: '2025-06-23', titolo: 'Tattica offensiva', descrizione: 'Esercizi per il gioco offensivo', durata: 90 },
      { id: 't2', data: '2025-06-20', titolo: 'Palleggi e contrasti', descrizione: 'Tecnica e combattimento', durata: 75 },
      { id: 't3', data: '2025-06-18', titolo: 'Possesso palla', descrizione: 'Esercizi sul mantenimento del possesso', durata: 60 },
      { id: 't4', data: '2025-06-16', titolo: 'Schema corner', descrizione: 'Allenamento su calci da fermo', durata: 45 },
    ];
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
      
      // Assicurati che il DOM sia pronto
      if (document.body) {
        this._createDemoUI();
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          this._createDemoUI();
        });
      }
    }
  }
  
  _createDemoUI() {
    console.log('[DEMO] Creating UI...');
    this.injectTooltipStyles();
    this.updateBadge();
    this.setupWelcomePopup();
    this.preloadTrainingData();
  }
  
  preloadTrainingData() {
    // Precarica sedute di allenamento nella sessionStorage
    if (!sessionStorage.getItem('yfm_training_sessions')) {
      sessionStorage.setItem('yfm_training_sessions', JSON.stringify(this.demoTrainings));
    }
    // Imposta data selezionata
    if (!sessionStorage.getItem('lastTrainingDate')) {
      sessionStorage.setItem('lastTrainingDate', '2025-06-23');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // GESTIONE PROGRESSI
  // ═══════════════════════════════════════════════════════════════

  loadProgress() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      console.log('[DEMO] loadProgress, saved:', saved);
      if (saved) {
        const data = JSON.parse(saved);
        console.log('[DEMO] data.missions:', data.missions, 'length:', data.missions?.length);
        // Verifica che le missioni siano consistenti
        if (data.missions && Array.isArray(data.missions) && data.missions.length === DEMO_MISSIONS.length) {
          this.missions = data.missions;
        } else {
          console.log('[DEMO] Missioni non consistenti, reset a default');
          this.missions = JSON.parse(JSON.stringify(DEMO_MISSIONS));
        }
        this.welcomeShown = data.welcomeShown || false;
      } else {
        console.log('[DEMO] Nessun dato salvato, uso default');
        this.missions = JSON.parse(JSON.stringify(DEMO_MISSIONS));
      }
      console.log('[DEMO] this.missions dopo load:', this.missions.length);
      this.updateCompletedCount();
    } catch (e) {
      console.log('Demo: errore caricamento progressi', e);
      this.missions = JSON.parse(JSON.stringify(DEMO_MISSIONS));
    }
  }

  saveProgress() {
    try {
      // Verifica consistenza prima di salvare
      if (this.missions.length !== DEMO_MISSIONS.length) {
        console.log('[DEMO] Warning: numero missioni non corretto,修复');
        this.missions = JSON.parse(JSON.stringify(DEMO_MISSIONS));
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        missions: this.missions,
        welcomeShown: this.welcomeShown,
        savedAt: new Date().toISOString()
      }));
      
      console.log('[DEMO] Progress saved, missions:', this.missions.map(m => m.id + ':' + m.completed));
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
    
    // Inizializza mini missioni per la pagina
    setTimeout(() => {
      if (window.miniMissionManager) {
        window.miniMissionManager.init(page);
      }
    }, 800);
    
    // DISABILITATO: la missione si completa solo con tutti gli step mini mission completati
    // this.trackPageVisit(page);
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
    console.log('[DEMO] updateBadge called, isDemo:', this.isDemo, 'missions:', this.missions.length);
    
    let badge = document.getElementById('demo-badge');
    
    // Forza creazione badge se siamo in demo mode
    if (this.isDemo && !badge) {
      console.log('[DEMO] Creating badge...');
      badge = document.createElement('div');
      badge.id = 'demo-badge';
      document.body.appendChild(badge);
    }
    
    if (badge) {
      const progress = this.missions.length > 0 
        ? Math.round((this.completedCount / this.missions.length) * 100) 
        : 0;
      
      badge.innerHTML = '🌱 Demo';
      badge.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        background: white;
        color: #27AE60;
        padding: 10px 20px;
        border-radius: 25px;
        font-size: 14px;
        font-weight: 700;
        z-index: 9999;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(0,0,0,0.15), 0 2px 4px rgba(39,174,96,0.2), inset 0 1px 2px rgba(255,255,255,0.8);
        border: 2px solid #27AE60;
        text-shadow: 0 1px 1px rgba(39,174,96,0.2);
      `;
      badge.onmouseover = function() {
        this.style.transform = 'translateY(-3px) scale(1.05)';
        this.style.boxShadow = '0 8px 25px rgba(39,174,96,0.4), 0 4px 8px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,0.8)';
      };
      badge.onmouseout = function() {
        this.style.transform = 'translateY(0) scale(1)';
        this.style.boxShadow = '0 4px 15px rgba(0,0,0,0.15), 0 2px 4px rgba(39,174,96,0.2), inset 0 1px 2px rgba(255,255,255,0.8)';
      };
      badge.onclick = () => this.toggleMissionPanel();
      
      // Aggiorna testo con progress
      if (this.missions.length > 0) {
        badge.innerHTML = `🌱 Demo ${progress}%`;
      }
      
      if (progress === 100) {
        badge.style.background = 'linear-gradient(180deg, #FFD700 0%, #FFA500 100%)';
        badge.style.color = 'white';
        badge.style.borderColor = '#FF8C00';
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
      
      <div style="padding: 16px 20px; border-top: 1px solid #eee;">
        <button onclick="window.demoManager.showRegistrationForm()" style="
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 8px;
        ">📩 Richiedi Informazioni</button>
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
    
    // Verifica che le missioni nel DOM siano corrette
    const panelMissions = panel.querySelectorAll('.demo-mission-item');
    if (panelMissions.length !== this.missions.length) {
      console.log('[DEMO] Panel missions count mismatch, recreating panel');
      panel.remove();
      this.showMissionPanel();
      return;
    }
    
    this.missions.forEach((m, index) => {
      const item = panel.querySelector(`[data-mission="${m.id}"]`);
      if (item) {
        if (m.completed) {
          item.classList.add('completed');
          item.querySelector('.demo-mission-icon').textContent = '✅';
        } else {
          item.classList.remove('completed');
          item.querySelector('.demo-mission-icon').textContent = m.icon;
        }
      }
    });
    
    const progress = Math.round((this.completedCount / this.missions.length) * 100);
    const progressFill = panel.querySelector('.demo-progress-fill');
    const progressText = panel.querySelector('.demo-progress-text');
    
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressText) progressText.textContent = `${this.completedCount} di ${this.missions.length} missioni completate`;
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
    // Chiudi prima eventuali banner aperti
    document.getElementById('demo-celebration')?.remove();
    
    const banner = document.createElement('div');
    banner.id = 'demo-celebration';
    banner.innerHTML = `
      <div class="celebration-content">
        <span style="font-size: 48px;">🎉</span>
        <h3>Hai completato la demo!</h3>
        <p>Sei pronto per provare YFM con la tua società?</p>
        <div class="celebration-actions">
          <button class="celebration-btn-primary" onclick="window.demoManager.showRegistrationForm()">
            ✉️ Registrati Adesso
          </button>
          <div class="demo-completion-extra-actions">
            <button class="demo-btn-reload" onclick="window.demoManager.resetDemo()">
              🔄 Ricarica Demo
            </button>
            <button class="demo-btn-close" onclick="window.demoManager.exitDemo()">
              🚪 Chiudi Demo
            </button>
          </div>
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
      max-width: 90vw;
      width: 400px;
    `;
    
    this.injectCelebrationStyles();
    document.body.appendChild(banner);
  }

  // ═══════════════════════════════════════════════════════════════
  // FORM REGISTRAZIONE
  // ═══════════════════════════════════════════════════════════════

  showRegistrationForm() {
    // Chiudi banner celebrazione se presente
    document.getElementById('demo-celebration')?.remove();
    
    // Chiudi panel missioni se presente
    document.getElementById('demo-mission-panel')?.remove();
    
    // Chiudi popup benvenuto se presente
    document.getElementById('demo-welcome-overlay')?.remove();
    
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
    console.log("[DEMO] resetDemo() called");
    
    // Rimuovi TUTTI i dati demo dal localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.includes("demo") || key.includes("yfm_demo") || key.includes("mission")) {
        console.log("[DEMO] Removing:", key);
        localStorage.removeItem(key);
      }
    });
    
    // Remove all demo UI
    ["demo-badge", "demo-mission-panel", "demo-welcome-overlay", "demo-celebration",
     "demo-registration-overlay", "demo-marketing-tooltip", "mini-missions-container",
     "mini-missions-styles"].forEach(id => {
      document.getElementById(id)?.remove();
    });

    // Reset mini mission manager
    if (window.miniMissionManager) {
      window.miniMissionManager.currentPage = null;
      window.miniMissionManager.steps = [];
      window.miniMissionManager.completedSteps.clear();
    }
    
    // Reset session storage for tooltips
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith("yfm_tooltip_shown_")) {
        sessionStorage.removeItem(key);
      }
    });
    
    // Imposta nuova sessione demo e ricarica la pagina (come click "Avvia Demo")
    console.log("[DEMO] Reimpostando sessione demo e ricaricando...");
    localStorage.setItem("yfm_demo_session", "active");
    localStorage.setItem("yfm_demo_user", JSON.stringify({
      id: "00000000-0000-0000-0000-000000000099",
      nome: "Demo",
      cognome: "Allenatore",
      ruolo: "allenatore",
      email: "demo_yfm@yfm.it"
    }));
    
    // Ricarica la pagina principale (main.js ri-inizializzerà tutto)
    window.location.href = "/";
  }
  
  // Chiude la demo e reindirizza alla landing page
  exitDemo() {
    console.log('[DEMO] exitDemo() called');
    
    // Rimuovi TUTTI i dati demo dal localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.includes('demo') || key.includes('yfm_demo') || key.includes('mission') || key.includes('yfm_token') || key.includes('yfm_user')) {
        localStorage.removeItem(key);
      }
    });
    
    // Rimuovi UI demo
    ['demo-badge', 'demo-mission-panel', 'demo-welcome-overlay', 'demo-celebration', 
     'demo-registration-overlay', 'demo-marketing-tooltip'].forEach(id => {
      document.getElementById(id)?.remove();
    });
    
    // Reindirizza alla landing page
    window.location.href = '/landing.html';
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
        white-space: nowrap;
      }
      #demo-celebration .celebration-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: center;
      }
      #demo-celebration .celebration-btn-primary {
        background: linear-gradient(135deg, #27AE60, #2ECC71);
        color: white;
        border: none;
        padding: 14px 32px;
        border-radius: 10px;
        font-weight: 600;
        font-size: 15px;
        cursor: pointer;
        width: 100%;
        max-width: 280px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(39,174,96,0.3);
      }
      #demo-celebration .celebration-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(39,174,96,0.4);
      }
      #demo-celebration .demo-completion-extra-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
        flex-wrap: nowrap;
      }
      #demo-celebration .demo-btn-reload,
      #demo-celebration .demo-btn-close {
        background: linear-gradient(135deg, #E74C3C, #C0392B);
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.3s ease;
      }
      #demo-celebration .demo-btn-reload:hover,
      #demo-celebration .demo-btn-close:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(231,76,60,0.4);
      }
      @keyframes popIn {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      @media (max-width: 480px) {
        #demo-celebration {
          padding: 24px !important;
          width: 85vw !important;
        }
        #demo-celebration .celebration-content p {
          white-space: normal !important;
          font-size: 13px;
        }
        #demo-celebration .demo-completion-extra-actions {
          flex-direction: column;
          width: 100%;
        }
        #demo-celebration .demo-btn-reload,
        #demo-celebration .demo-btn-close {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// ═══════════════════════════════════════════════════════════════
// MINI MISSION MANAGER (mini missioni per pagina)
// ═══════════════════════════════════════════════════════════════

class MiniMissionManager {
  constructor() {
    this.currentPage = null;
    this.steps = [];
    this.currentStepIndex = 0;
    this.completedSteps = new Set();
    this.listeners = [];
    this.pageStates = {};
    this.scrollTriggered = false;
    this.interactionTriggered = false;
  }

  init(page) {
    if (!this.isDemoMode()) return;
    
    this.currentPage = page;
    this.currentStepIndex = 0;
    this.completedSteps.clear();
    
    // Carica configurazione per questa pagina
    const config = MINI_MISSIONS_CONFIG[page];
    if (!config) {
      this.hideMiniMissions();
      return;
    }
    
    this.steps = config.steps.map((s, i) => ({
      ...s,
      index: i,
      completed: false,
      active: i === 0
    }));
    
    this.renderMiniMissions();
    this.setupListeners();
    this.updateUI();

    // Auto-complete per step immediati (page_view o auto_complete)
    this.steps.forEach(step => {
      if ((step.trigger === 'auto_complete' || step.trigger === 'page_view') && !step.completed) {
        console.log('[MINI_MISSION] Auto-completing:', step.id);
        setTimeout(() => this.completeStep(step.id), 500);
      }
    });
  }

  isDemoMode() {
    return window.demoManager && window.demoManager.isDemo;
  }

  // Render UI mini missioni
  renderMiniMissions() {
    let container = document.getElementById('mini-missions-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'mini-missions-container';
      document.body.appendChild(container);
    }
    
    const config = MINI_MISSIONS_CONFIG[this.currentPage];
    const completedCount = this.completedSteps.size;
    const totalSteps = this.steps.length;
    const progress = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
    
    container.innerHTML = `
      <div id="mini-missions-panel" class="mini-missions-panel ${this.isCollapsed() ? 'collapsed' : ''}">
        <div class="mini-missions-header" onclick="window.miniMissionManager.togglePanel()">
          <div class="mini-missions-title">
            <span class="mini-missions-icon">${config.icon}</span>
            <span class="mini-missions-label">${config.title}</span>
          </div>
          <div class="mini-missions-progress">
            <span>${completedCount}/${totalSteps}</span>
            <span class="mini-missions-toggle">${this.isCollapsed() ? '▼' : '▲'}</span>
          </div>
        </div>
        <div class="mini-missions-progress-bar">
          <div class="mini-missions-progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="mini-missions-steps">
          ${this.steps.map((step, i) => this.renderStep(step, i)).join('')}
        </div>
      </div>
    `;
    
    this.injectMiniMissionsStyles();
  }

  renderStep(step, index) {
    const isActive = index === this.currentStepIndex && !step.completed;
    const isCompleted = step.completed;
    const isPending = !isActive && !isCompleted;
    
    let statusIcon = '⭕';
    if (isCompleted) statusIcon = '✅';
    if (isActive) statusIcon = '🎯';
    
    let className = 'mini-mission-step';
    if (isActive) className += ' active';
    if (isCompleted) className += ' completed';
    if (isPending) className += ' pending';
    
    return `
      <div class="${className}" data-step="${step.id}" onclick="window.miniMissionManager.focusStep('${step.id}')">
        <div class="step-status">${statusIcon}</div>
        <div class="step-content">
          <div class="step-title">${step.title}</div>
          <div class="step-description">${step.description}</div>
        </div>
      </div>
    `;
  }

  setupListeners() {
    // Rimuovi listener precedenti
    this.listeners.forEach(l => l.el.removeEventListener(l.type, l.handler));
    this.listeners = [];
    
    this.steps.forEach(step => {
      if (step.trigger === 'auto_on_view') {
        // Auto-complete per elementi visibili
        this.checkAutoComplete(step);
      } else if (step.trigger === 'click') {
        this.setupClickListener(step);
      } else if (step.trigger === 'select') {
        this.setupSelectListener(step);
      } else if (step.trigger === 'input') {
        this.setupInputListener(step);
      }
    });
  }

  checkAutoComplete(step) {
    // Per trigger auto_on_view, verifica dopo un delay
    setTimeout(() => {
      if (this.completedSteps.has(step.id)) return;
      const el = document.querySelector(step.target);
      if (el) {
        this.completeStep(step.id);
      }
    }, 1000);
  }

  setupClickListener(step) {
    const handler = (e) => {
      if (e.target.closest('#mini-missions-panel')) return;
      if (!this.completedSteps.has(step.id)) {
        this.completeStep(step.id);
      }
    };
    
    // Prova a trovare l'elemento
    const tryAttach = () => {
      const elements = document.querySelectorAll(step.target);
      elements.forEach(el => {
        if (!el._miniMissionBound) {
          el.addEventListener('click', handler);
          el._miniMissionBound = true;
          this.listeners.push({ el, type: 'click', handler });
        }
      });
    };
    
    tryAttach();
    // Riprova dopo un po' per elementi caricati dinamicamente
    setTimeout(tryAttach, 1000);
  }

  setupSelectListener(step) {
    const handler = () => {
      if (!this.completedSteps.has(step.id)) {
        this.completeStep(step.id);
      }
    };
    
    const tryAttach = () => {
      const el = document.querySelector(step.target);
      if (el && !el._miniMissionBound) {
        el.addEventListener('change', handler);
        el._miniMissionBound = true;
        this.listeners.push({ el, type: 'change', handler });
      }
    };
    
    tryAttach();
    setTimeout(tryAttach, 1000);
  }

  setupInputListener(step) {
    const handler = () => {
      if (!this.completedSteps.has(step.id)) {
        this.completeStep(step.id);
      }
    };
    
    const tryAttach = () => {
      const el = document.querySelector(step.target);
      if (el && !el._miniMissionBound) {
        el.addEventListener('input', handler);
        el._miniMissionBound = true;
        this.listeners.push({ el, type: 'input', handler });
      }
    };
    
    tryAttach();
    setTimeout(tryAttach, 1000);
  }

  completeStep(stepId) {
    if (this.completedSteps.has(stepId)) return;
    
    const step = this.steps.find(s => s.id === stepId);
    if (!step) return;
    
    this.completedSteps.add(stepId);
    step.completed = true;
    
    // Avanza al prossimo step
    const nextIndex = this.currentStepIndex + 1;
    if (nextIndex < this.steps.length) {
      this.currentStepIndex = nextIndex;
      this.steps[nextIndex].active = true;
    }
    
    this.updateUI();
    this.showStepComplete(step);
  }

  focusStep(stepId) {
    const step = this.steps.find(s => s.id === stepId);
    if (!step) return;
    
    // Trova e evidenzia l'elemento target
    if (step.target) {
      const el = document.querySelector(step.target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('mini-mission-highlight');
        setTimeout(() => el.classList.remove('mini-mission-highlight'), 2000);
      }
    }
  }

  showStepComplete(step) {
    // Toast di completamento
    const toast = document.createElement('div');
    toast.className = 'mini-mission-toast';
    toast.innerHTML = `
      <span class="toast-icon">✅</span>
      <span class="toast-text">${step.title} completata!</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    }, 100);
  }

  updateUI() {
    const container = document.getElementById('mini-missions-container');
    if (!container) return;
    
    this.renderMiniMissions();
  }

  togglePanel() {
    const isCollapsed = this.isCollapsed();
    localStorage.setItem('mini_missions_collapsed', !isCollapsed);
    this.renderMiniMissions();
  }

  isCollapsed() {
    return localStorage.getItem('mini_missions_collapsed') === 'true';
  }

  hideMiniMissions() {
    const container = document.getElementById('mini-missions-container');
    if (container) container.remove();
  }

  resetPage() {
    // Reset mini missioni per la pagina corrente
    this.currentStepIndex = 0;
    this.completedSteps.clear();
    this.steps.forEach((s, i) => {
      s.completed = false;
      s.active = i === 0;
    });
    this.renderMiniMissions();
    this.setupListeners();
  }

  injectMiniMissionsStyles() {
    if (document.getElementById('mini-missions-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'mini-missions-styles';
    style.textContent = `
      .mini-missions-panel {
        position: fixed;
        top: 120px;
        right: 20px;
        width: 300px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        z-index: 9998;
        overflow: hidden;
        transition: all 0.3s ease;
      }
      .mini-missions-panel.collapsed {
        width: 200px;
      }
      .mini-missions-panel.collapsed .mini-missions-steps {
        display: none;
      }
      .mini-missions-header {
        padding: 16px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .mini-missions-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .mini-missions-icon {
        font-size: 20px;
      }
      .mini-missions-label {
        font-weight: 600;
        font-size: 14px;
      }
      .mini-missions-progress {
        font-size: 12px;
        opacity: 0.9;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .mini-missions-toggle {
        font-size: 10px;
      }
      .mini-missions-progress-bar {
        height: 4px;
        background: rgba(255,255,255,0.3);
      }
      .mini-missions-progress-fill {
        height: 100%;
        background: #27AE60;
        transition: width 0.3s ease;
      }
      .mini-missions-steps {
        max-height: 400px;
        overflow-y: auto;
        padding: 8px;
      }
      .mini-mission-step {
        display: flex;
        gap: 12px;
        padding: 12px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-bottom: 4px;
      }
      .mini-mission-step:hover {
        background: #f0f4ff;
      }
      .mini-mission-step.active {
        background: linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.15));
        border-left: 3px solid #667eea;
      }
      .mini-mission-step.completed {
        opacity: 0.7;
      }
      .mini-mission-step.pending {
        opacity: 0.5;
      }
      .step-status {
        font-size: 18px;
        flex-shrink: 0;
      }
      .step-content {
        flex: 1;
      }
      .step-title {
        font-size: 13px;
        font-weight: 600;
        color: #333;
        margin-bottom: 2px;
      }
      .step-description {
        font-size: 11px;
        color: #666;
      }
      .mini-mission-step.active .step-title {
        color: #667eea;
      }
      .mini-mission-toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #27AE60, #2ECC71);
        color: white;
        padding: 12px 20px;
        border-radius: 25px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 15px rgba(39,174,96,0.4);
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.3s ease;
        z-index: 10000;
      }
      .mini-mission-toast.show {
        transform: translateY(0);
        opacity: 1;
      }
      .mini-mission-highlight {
        animation: miniMissionPulse 0.5s ease-in-out 3;
        box-shadow: 0 0 0 4px rgba(102,126,234,0.4);
      }
      @keyframes miniMissionPulse {
        0%, 100% { box-shadow: 0 0 0 4px rgba(102,126,234,0.4); }
        50% { box-shadow: 0 0 0 8px rgba(102,126,234,0.2); }
      }
    `;
    document.head.appendChild(style);
  }
}

// ═══════════════════════════════════════════════════════════════
// ESPORTAZIONE
// ═══════════════════════════════════════════════════════════════

const demoManager = new DemoManager();
const miniMissionManager = new MiniMissionManager();

export default demoManager;
export { miniMissionManager };

// Espone globalmente per accesso da HTML inline
window.demoManager = demoManager;
window.miniMissionManager = miniMissionManager;
