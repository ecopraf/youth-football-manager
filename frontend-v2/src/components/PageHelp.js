/**
 * PageHelp.js - Help contestuale interattivo
 * 
 * Modalità 1: Click "?" → popover con guida generale pagina
 * Modalità 2: Long-press o doppio-click "?" → modalità interattiva
 *   - Overlay semi-trasparente
 *   - Elementi con [data-help] si illuminano
 *   - Click su elemento → tooltip con spiegazione
 *   - ESC o click "?" → disattiva
 */

import { PAGE_HELP, ELEMENT_HELP } from './helpData.js';

let helpBtn = null;
let helpPopover = null;
let helpTooltip = null;
let currentPage = null;
let interactiveMode = false;
let overlayEl = null;
let modalObserver = null;
let activeModal = null;

// Chiamata dal FAB unificato per aprire il popover senza bottone fisso
export function openPageHelp() {
  if (!currentPage || !PAGE_HELP[currentPage]) return;
  if (interactiveMode) deactivateInteractive();
  else togglePagePopover();
}

export function activateInteractiveHelp() {
  if (!currentPage || !PAGE_HELP[currentPage]) return;
  if (helpPopover) { helpPopover.remove(); helpPopover = null; }
  activateInteractive();
}

export function injectPageHelp(page) {
  currentPage = page;
  const config = PAGE_HELP[page];

  cleanup();

  // Se il FAB unificato è presente, non creare il bottone fisso
  const fabPresent = !!document.getElementById('yfm-fab');

  if (!config) {
    if (helpBtn) helpBtn.style.display = 'none';
    return;
  }

  if (!helpBtn && !fabPresent) {
    createHelpButton();
  }

  // Inietta sempre gli stili (servono anche per il popover aperto dal FAB)
  injectStyles();

  if (helpBtn) {
    helpBtn.style.display = 'flex';
    helpBtn.classList.remove('help-active');
  }
  enableHelpBtn();
  startModalObserver();
}

function createHelpButton() {
  helpBtn = document.createElement('button');
  helpBtn.id = 'pageHelpBtn';
  helpBtn.innerHTML = '?';
  helpBtn.title = 'Click: guida pagina · Doppio-click: help interattivo';
  helpBtn.style.cssText = 'position:fixed;bottom:20px;right:20px;width:40px;height:40px;border-radius:50%;background:#667eea;color:white;border:none;font-size:18px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(102,126,234,0.4);z-index:9000;transition:all 0.2s;display:flex;align-items:center;justify-content:center;';
  
  // Single click → popover generale
  helpBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (interactiveMode) {
      deactivateInteractive();
    } else {
      togglePagePopover();
    }
  });

  // Double click → modalità interattiva
  helpBtn.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    if (helpPopover) { helpPopover.remove(); helpPopover = null; }
    activateInteractive();
  });

  document.body.appendChild(helpBtn);
}

function injectStyles() {
  if (document.getElementById('helpStyles')) return;
  const style = document.createElement('style');
  style.id = 'helpStyles';
  style.textContent = `
    @keyframes helpFadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    @keyframes helpPulse { 0%,100% { box-shadow:0 0 0 0 rgba(102,126,234,0.4); } 50% { box-shadow:0 0 0 8px rgba(102,126,234,0); } }
    #pageHelpBtn.help-active { background:#F39C12; animation:helpPulse 1.5s infinite; }
    .help-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.15); z-index:8000; cursor:default; }
    [data-help].help-highlight { position:relative; z-index:8500; outline:2px dashed #667eea; outline-offset:4px; border-radius:8px; cursor:help !important; transition:outline-color 0.3s, background 0.15s; }
    [data-help].help-highlight:hover { outline-color:#F39C12; outline-style:solid; }
    [data-help].help-highlight.help-tap { background:rgba(102,126,234,0.15); outline-color:#F39C12; outline-style:solid; }
    .help-tooltip { position:fixed; z-index:9002; background:white; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.2); max-width:320px; width:calc(100vw - 40px); animation:helpFadeIn 0.15s ease; overflow:hidden; }
    .help-tooltip-header { background:linear-gradient(135deg,#667eea,#764ba2); padding:10px 14px; display:flex; align-items:center; justify-content:space-between; }
    .help-tooltip-header span { color:white; font-size:13px; font-weight:600; }
    .help-tooltip-header button { background:none; border:none; color:white; font-size:18px; cursor:pointer; padding:0 4px; }
    .help-tooltip-body { padding:12px 14px; font-size:13px; line-height:1.5; color:#333; }
    .help-popover { position:fixed; bottom:70px; right:20px; width:300px; max-width:calc(100vw - 40px); background:white; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.18); z-index:9001; overflow:hidden; animation:helpFadeIn 0.2s ease; }
    .help-interactive-hint { position:fixed; top:16px; left:50%; transform:translateX(-50%); background:#667eea; color:white; padding:8px 16px; border-radius:20px; font-size:12px; font-weight:600; z-index:9003; box-shadow:0 4px 12px rgba(102,126,234,0.4); animation:helpFadeIn 0.3s ease; }
  `;
  document.head.appendChild(style);
}

// === POPOVER GENERALE ===

function togglePagePopover() {
  if (helpPopover) {
    helpPopover.remove();
    helpPopover = null;
    return;
  }

  const config = PAGE_HELP[currentPage];
  if (!config) return;

  helpPopover = document.createElement('div');
  helpPopover.className = 'help-popover';

  const hasInteractiveElements = document.querySelectorAll('[data-help]').length > 0;

  let html = `<div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;">`;
  html += `<span style="color:white;font-size:14px;font-weight:600;">${config.title}</span>`;
  html += `<button id="helpClose" style="background:none;border:none;color:white;font-size:20px;cursor:pointer;padding:0 4px;">×</button>`;
  html += `</div>`;
  html += `<div style="padding:12px 16px;">`;
  html += `<p style="font-size:12px;color:#666;margin:0 0 10px 0;">${config.desc}</p>`;
  config.items.forEach((item, i) => {
    html += `<div style="font-size:13px;padding:6px 0;${i < config.items.length - 1 ? 'border-bottom:1px solid #f1f5f9;' : ''}display:flex;align-items:flex-start;gap:8px;">`;
    html += `<span style="color:#667eea;font-size:8px;margin-top:5px;">●</span>`;
    html += `<span>${item}</span></div>`;
  });
  if (hasInteractiveElements) {
    html += `<div style="margin-top:12px;padding-top:10px;border-top:1px solid #eee;text-align:center;">`;
    html += `<button id="helpInteractiveBtn" style="background:#667eea;color:white;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">🎯 Help Interattivo</button>`;
    html += `<div style="font-size:10px;color:#999;margin-top:4px;">Clicca sugli elementi per info dettagliate</div>`;
    html += `</div>`;
  }
  html += `</div>`;

  helpPopover.innerHTML = html;
  document.body.appendChild(helpPopover);

  document.getElementById('helpClose').addEventListener('click', () => { helpPopover.remove(); helpPopover = null; });
  
  const interactiveBtn = document.getElementById('helpInteractiveBtn');
  if (interactiveBtn) {
    interactiveBtn.addEventListener('click', () => {
      helpPopover.remove();
      helpPopover = null;
      activateInteractive();
    });
  }

  setTimeout(() => document.addEventListener('click', closePopoverOnOutside), 100);
}

function closePopoverOnOutside(e) {
  const fab = document.getElementById('yfm-fab');
  const fabHelpBtn = document.getElementById('yfm-fab-help');
  if (helpPopover
    && !helpPopover.contains(e.target)
    && e.target !== helpBtn
    && e.target !== fabHelpBtn
    && !(fabHelpBtn && fabHelpBtn.contains(e.target))
    && !(fab && fab.contains(e.target))) {
    helpPopover.remove();
    helpPopover = null;
    document.removeEventListener('click', closePopoverOnOutside);
  }
}

// === MODAL AWARENESS ===

function startModalObserver() {
  if (modalObserver) return;
  modalObserver = new MutationObserver(() => checkModalState());
  modalObserver.observe(document.body, { childList: true, subtree: true });
}

function checkModalState() {
  const modal = document.querySelector('.modal-overlay:not([style*="display:none"])');
  if (modal && !activeModal) {
    // Modale appena aperta
    activeModal = modal;
    if (interactiveMode) deactivateInteractive();
    if (helpPopover) { helpPopover.remove(); helpPopover = null; }
    const hasHelp = modal.querySelectorAll('[data-help]').length > 0;
    if (hasHelp) {
      enableHelpBtn();
    } else {
      disableHelpBtn();
    }
  } else if (!modal && activeModal) {
    // Modale chiusa
    activeModal = null;
    enableHelpBtn();
  }
}

function disableHelpBtn() {
  if (!helpBtn) return;
  helpBtn.disabled = true;
  helpBtn.style.opacity = '0.35';
  helpBtn.style.cursor = 'not-allowed';
  helpBtn.title = 'Help non disponibile per questa finestra';
}

function enableHelpBtn() {
  if (!helpBtn) return;
  helpBtn.disabled = false;
  helpBtn.style.opacity = '1';
  helpBtn.style.cursor = 'pointer';
  helpBtn.title = 'Click: guida pagina · Doppio-click: help interattivo';
}

// === MODALITÀ INTERATTIVA ===

function getHelpScope() {
  // Se c'è una modale aperta con [data-help], limita lo scope alla modale
  if (activeModal && activeModal.querySelectorAll('[data-help]').length > 0) {
    return activeModal;
  }
  return document;
}

// Ritorna il bottone attivo (fisso o FAB main)
function getActiveBtn() {
  return helpBtn || document.getElementById('yfm-fab-main');
}

function activateInteractive() {
  if (interactiveMode) return;
  interactiveMode = true;

  const btn = getActiveBtn();
  if (btn) { btn.classList.add('help-active'); btn.innerHTML = '✕'; }

  const scope = getHelpScope();

  // Overlay o listener per chiudere cliccando fuori dagli elementi help
  if (!activeModal) {
    overlayEl = document.createElement('div');
    overlayEl.className = 'help-overlay';
    overlayEl.addEventListener('click', (e) => {
      e.stopPropagation();
      deactivateInteractive();
    });
    document.body.appendChild(overlayEl);
  } else {
    // Dentro modale: click su area vuota (non su [data-help]) → disattiva
    activeModal.addEventListener('click', onModalBlankClick, true);
    activeModal.style.cursor = 'default';
  }

  // Hint in alto
  const hint = document.createElement('div');
  hint.className = 'help-interactive-hint';
  hint.id = 'helpHint';
  hint.textContent = '🎯 Clicca su un elemento evidenziato per info · ESC per uscire';
  document.body.appendChild(hint);

  // Evidenzia elementi solo nello scope
  scope.querySelectorAll('[data-help]').forEach(el => {
    el.classList.add('help-highlight');
    el.addEventListener('click', onElementClick, true);
  });

  // ESC per uscire
  document.addEventListener('keydown', onEscKey);
}

function onModalBlankClick(e) {
  // Se il click è su un elemento [data-help] o sul tooltip, ignora
  if (e.target.closest('[data-help]') || e.target.closest('.help-tooltip')) return;
  e.stopPropagation();
  deactivateInteractive();
}

function deactivateInteractive() {
  if (!interactiveMode) return;
  interactiveMode = false;

  const btn = getActiveBtn();
  if (btn) { btn.classList.remove('help-active'); btn.innerHTML = helpBtn ? '?' : '⚡'; }

  if (overlayEl) { overlayEl.remove(); overlayEl = null; }
  if (helpTooltip) { helpTooltip.remove(); helpTooltip = null; }
  
  const hint = document.getElementById('helpHint');
  if (hint) hint.remove();

  // Rimuovi listener modale
  if (activeModal) {
    activeModal.removeEventListener('click', onModalBlankClick, true);
    activeModal.style.cursor = '';
  }

  document.querySelectorAll('[data-help].help-highlight').forEach(el => {
    el.classList.remove('help-highlight');
    el.removeEventListener('click', onElementClick, true);
  });

  document.removeEventListener('keydown', onEscKey);
}

function onEscKey(e) {
  if (e.key === 'Escape') deactivateInteractive();
}

function onElementClick(e) {
  e.preventDefault();
  e.stopPropagation();

  const el = e.currentTarget;
  const helpKey = el.getAttribute('data-help');
  const helpInfo = ELEMENT_HELP[helpKey];

  if (!helpInfo) return;

  // Flash feedback per mobile
  el.classList.add('help-tap');
  setTimeout(() => el.classList.remove('help-tap'), 300);

  showTooltip(el, helpInfo);
}

function showTooltip(targetEl, info) {
  if (helpTooltip) helpTooltip.remove();

  helpTooltip = document.createElement('div');
  helpTooltip.className = 'help-tooltip';

  helpTooltip.innerHTML = `
    <div class="help-tooltip-header">
      <span>${info.title}</span>
      <button id="helpTooltipClose">×</button>
    </div>
    <div class="help-tooltip-body">${info.desc}</div>
  `;

  document.body.appendChild(helpTooltip);

  // Posiziona vicino all'elemento
  const rect = targetEl.getBoundingClientRect();
  const ttRect = helpTooltip.getBoundingClientRect();
  
  let top = rect.bottom + 8;
  let left = rect.left;

  // Se esce dal viewport in basso, metti sopra
  if (top + ttRect.height > window.innerHeight - 20) {
    top = rect.top - ttRect.height - 8;
  }
  // Se esce a destra
  if (left + ttRect.width > window.innerWidth - 20) {
    left = window.innerWidth - ttRect.width - 20;
  }
  // Se esce a sinistra
  if (left < 20) left = 20;
  // Se esce in alto
  if (top < 20) top = 20;

  helpTooltip.style.top = top + 'px';
  helpTooltip.style.left = left + 'px';

  document.getElementById('helpTooltipClose').addEventListener('click', () => {
    helpTooltip.remove();
    helpTooltip = null;
  });
}

// === CLEANUP ===

function cleanup() {
  if (helpPopover) { helpPopover.remove(); helpPopover = null; }
  if (helpTooltip) { helpTooltip.remove(); helpTooltip = null; }
  if (interactiveMode) deactivateInteractive();
  activeModal = null;
}
