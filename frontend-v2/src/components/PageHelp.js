/**
 * PageHelp.js - Help contestuale per pagina
 * Bottone ? fisso in basso a destra, popover con guida della pagina corrente
 */

const PAGE_HELP = {
  dashboard: {
    title: '📊 Dashboard',
    items: [
      'Panoramica statistiche squadra: punti, V/P/S, gol',
      'Click su una partita per vedere il dettaglio',
      'Top 3 marcatori, assistmen e presenze',
      'Prossima partita in evidenza con convocazioni rapide',
      'Cambia squadra dal selettore in alto'
    ]
  },
  roster: {
    title: '👥 Rosa',
    items: [
      'Click su un giocatore per aprire la scheda completa',
      '+ Aggiungi per inserire un nuovo calciatore',
      'Cerca per nome o filtra per ruolo/stato',
      'Alert certificati medici in scadenza (30 giorni)',
      'Modalità selezione (admin): elimina o sposta multipli'
    ]
  },
  calendar: {
    title: '📅 Calendario',
    items: [
      'Partite future in alto, giocate sotto',
      'Click sulla card per aprire il dettaglio partita',
      'Pallini di stato: Conv → Form → Ris → Ev',
      '+ Nuova per aggiungere una partita',
      '📥 Importa CSV per importazione massiva',
      '📦 Archivia per bloccare modifiche a partita conclusa'
    ]
  },
  trainingSessions: {
    title: '📋 Sedute',
    items: [
      'Click su un giorno 🟢 per aprire il programma',
      'Scegli tipo seduta (Tattico, Tecnico, Atletico...)',
      'Aggiungi fasi: Riscaldamento → Tecnica → Tattica → Partita',
      'Ogni fase ha durata, descrizione e materiale',
      '📋 Usa Template per applicare un programma salvato',
      '🟠 Giorni arancioni = partita (no allenamento)',
      'Salva come Template per riutilizzare il programma'
    ]
  },
  trainingPresenze: {
    title: '🙋 Presenze',
    items: [
      'Seleziona un giorno dal calendario',
      'Spunta i giocatori ASSENTI (checkbox rossa)',
      'Seleziona il motivo assenza dal menu',
      '💾 Salva Presenze (salvataggio batch, veloce)',
      'Riepilogo in basso: % presenze per giocatore',
      'Colori: verde ≥80%, giallo ≥60%, rosso <60%'
    ]
  },
  trainingSettings: {
    title: '⚙️ Impostazioni Allenamenti',
    items: [
      'Settimana tipo: configura giorni e orari allenamento',
      '+ Aggiungi giorno per nuova seduta settimanale',
      'Template: click su una card per modificare',
      '+ Nuovo Template per crearne uno da zero',
      'I template sono condivisi con tutto lo staff'
    ]
  },
  stats: {
    title: '📊 Statistiche',
    items: [
      'Tabella completa: presenze, minuti, gol, assist, cartellini',
      'Click su intestazione colonna per ordinare (▲/▼)',
      '⚠️ Alert diffidati: giocatori con 4 ammonizioni',
      'Minutaggio calcolato per categoria (U15=70\', U16=80\', U17+=90\')',
      'Badge ruolo colorati: POR giallo, DIF blu, CEN verde, ATT rosso'
    ]
  },
  reports: {
    title: '📄 Report',
    items: [
      'Report Partita: seleziona una partita terminata',
      'Report Stagionale: riepilogo completo stagione',
      'Report Giocatore: statistiche individuali',
      'Genera → anteprima → 🖨️ Stampa PDF'
    ]
  }
};

let helpBtn = null;
let helpPopover = null;
let currentPage = null;

export function injectPageHelp(page) {
  currentPage = page;
  const config = PAGE_HELP[page];

  // Rimuovi popover se aperto
  if (helpPopover) { helpPopover.remove(); helpPopover = null; }

  if (!config) {
    if (helpBtn) helpBtn.style.display = 'none';
    return;
  }

  // Crea bottone se non esiste
  if (!helpBtn) {
    helpBtn = document.createElement('button');
    helpBtn.id = 'pageHelpBtn';
    helpBtn.innerHTML = '?';
    helpBtn.style.cssText = 'position:fixed;bottom:20px;right:20px;width:36px;height:36px;border-radius:50%;background:#667eea;color:white;border:none;font-size:18px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(102,126,234,0.4);z-index:9000;transition:transform 0.2s;';
    helpBtn.addEventListener('click', toggleHelp);
    document.body.appendChild(helpBtn);
  }

  helpBtn.style.display = 'flex';
  helpBtn.style.alignItems = 'center';
  helpBtn.style.justifyContent = 'center';
}

function toggleHelp() {
  if (helpPopover) {
    helpPopover.remove();
    helpPopover = null;
    return;
  }

  const config = PAGE_HELP[currentPage];
  if (!config) return;

  helpPopover = document.createElement('div');
  helpPopover.id = 'pageHelpPopover';
  helpPopover.style.cssText = 'position:fixed;bottom:66px;right:20px;width:300px;max-width:calc(100vw - 40px);background:white;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.18);z-index:9001;overflow:hidden;animation:helpFadeIn 0.2s ease;';

  let html = `<style>@keyframes helpFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}</style>`;
  html += `<div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;">`;
  html += `<span style="color:white;font-size:14px;font-weight:600;">${config.title}</span>`;
  html += `<button id="helpClose" style="background:none;border:none;color:white;font-size:20px;cursor:pointer;padding:0 4px;">×</button>`;
  html += `</div>`;
  html += `<div style="padding:12px 16px;max-height:240px;overflow-y:auto;">`;
  config.items.forEach((item, i) => {
    html += `<div style="font-size:13px;padding:8px 0;${i < config.items.length - 1 ? 'border-bottom:1px solid #f1f5f9;' : ''}display:flex;align-items:flex-start;gap:8px;">`;
    html += `<span style="color:#667eea;font-size:8px;margin-top:5px;">●</span>`;
    html += `<span>${item}</span>`;
    html += `</div>`;
  });
  html += `</div>`;

  helpPopover.innerHTML = html;
  document.body.appendChild(helpPopover);

  document.getElementById('helpClose').addEventListener('click', () => { helpPopover.remove(); helpPopover = null; });

  // Click fuori chiude
  setTimeout(() => {
    document.addEventListener('click', closeOnOutside);
  }, 100);
}

function closeOnOutside(e) {
  if (helpPopover && !helpPopover.contains(e.target) && e.target !== helpBtn) {
    helpPopover.remove();
    helpPopover = null;
    document.removeEventListener('click', closeOnOutside);
  }
}
