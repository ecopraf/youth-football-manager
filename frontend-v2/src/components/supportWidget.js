import { apiFetch } from '../services/api.js';
import { showToast } from '../utils/ui.js';
import { openPageHelp, activateInteractiveHelp } from './PageHelp.js';
import { BUILD_INFO } from '../build-info.js';

const MAX_TICKETS = 5;
const TICKET_KEY = 'yfm_ticket_count';

let fabExpanded = false;

export function initSupportWidget() {
  if (window.location.hash.includes('print')) return;

  injectStyles();

  const fab = document.createElement('div');
  fab.id = 'yfm-fab';
  fab.innerHTML = `
    <div id="yfm-fab-menu">
      <button class="yfm-fab-option" id="yfm-fab-help" title="Guida pagina (doppio-click: help interattivo)">
        <span>❓</span><span class="yfm-fab-label">Guida</span>
      </button>
      <button class="yfm-fab-option" id="yfm-fab-ticket" title="Segnala un problema o invia un suggerimento">
        <span>🐛</span><span class="yfm-fab-label">Segnala</span>
      </button>
    </div>
    <button id="yfm-fab-main" title="Aiuto e supporto">⚡</button>
  `;
  document.body.appendChild(fab);

  const mainBtn = fab.querySelector('#yfm-fab-main');
  const menu = fab.querySelector('#yfm-fab-menu');

  mainBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fabExpanded = !fabExpanded;
    menu.classList.toggle('open', fabExpanded);
    mainBtn.classList.toggle('active', fabExpanded);
    mainBtn.textContent = fabExpanded ? '✕' : '⚡';
  });

  // Chiudi al click fuori
  document.addEventListener('click', (e) => {
    if (fabExpanded && !fab.contains(e.target)) {
      fabExpanded = false;
      menu.classList.remove('open');
      mainBtn.classList.remove('active');
      mainBtn.textContent = '⚡';
    }
  });

  // Guida — click singolo popover, doppio-click interattivo
  const helpBtn = fab.querySelector('#yfm-fab-help');
  let helpClickTimer = null;
  helpBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeMenu(mainBtn, menu);
    helpClickTimer = setTimeout(() => { openPageHelp(); }, 50);
  });
  helpBtn.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    clearTimeout(helpClickTimer);
    closeMenu(mainBtn, menu);
    activateInteractiveHelp();
  });

  // Segnala
  fab.querySelector('#yfm-fab-ticket').addEventListener('click', () => {
    closeMenu(mainBtn, menu);
    openTicketModal();
  });

  // Nascondi su pagine print
  window.addEventListener('hashchange', () => {
    fab.style.display = window.location.hash.includes('print') ? 'none' : '';
  });
}

function closeMenu(mainBtn, menu) {
  fabExpanded = false;
  menu.classList.remove('open');
  mainBtn.classList.remove('active');
  mainBtn.textContent = '⚡';
}

function injectStyles() {
  if (document.getElementById('yfm-fab-styles')) return;
  const s = document.createElement('style');
  s.id = 'yfm-fab-styles';
  s.textContent = `
    #yfm-fab { position:fixed; bottom:20px; right:20px; z-index:9100; display:flex; flex-direction:column; align-items:flex-end; gap:8px; }
    #yfm-fab-main {
      width:44px; height:44px; border-radius:50%; border:none;
      background:linear-gradient(135deg,#667eea,#764ba2); color:white;
      font-size:20px; cursor:pointer; box-shadow:0 4px 14px rgba(102,126,234,0.5);
      display:flex; align-items:center; justify-content:center;
      transition:transform 0.2s, box-shadow 0.2s;
      z-index:9101;
    }
    #yfm-fab-main:hover { transform:scale(1.1); box-shadow:0 6px 20px rgba(102,126,234,0.6); }
    #yfm-fab-main.active { background:linear-gradient(135deg,#e74c3c,#c0392b); }
    #yfm-fab-menu {
      display:flex; flex-direction:column; align-items:flex-end; gap:8px;
      overflow:hidden; max-height:0; opacity:0;
      transition:max-height 0.25s ease, opacity 0.2s ease;
      pointer-events:none;
    }
    #yfm-fab-menu.open { max-height:120px; opacity:1; pointer-events:all; }
    .yfm-fab-option {
      display:flex; align-items:center; gap:8px;
      padding:8px 14px 8px 12px; border-radius:22px; border:none;
      background:white; color:#333; font-size:13px; font-weight:600;
      cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,0.15);
      white-space:nowrap; transition:transform 0.15s, box-shadow 0.15s;
    }
    .yfm-fab-option:hover { transform:translateX(-3px); box-shadow:0 4px 14px rgba(0,0,0,0.2); }
    .yfm-fab-label { font-size:13px; }
  `;
  document.head.appendChild(s);
}

function openTicketModal() {
  const count = parseInt(sessionStorage.getItem(TICKET_KEY) || '0');
  if (count >= MAX_TICKETS) {
    showToast(`Limite segnalazioni raggiunto. Scrivi a youthfootballmanager@gmail.com`, 'warning', 6000);
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'support-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9200;display:flex;align-items:center;justify-content:center;padding:16px;';

  overlay.innerHTML = `
    <style>
      .sw-card{background:white;border-radius:16px;padding:24px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:sw-in 0.2s ease;}
      @keyframes sw-in{from{transform:scale(0.9);opacity:0}to{transform:scale(1);opacity:1}}
      .sw-title{font-size:17px;font-weight:700;color:#1a1a2e;margin-bottom:16px;}
      .sw-tipo-bar{display:flex;gap:8px;margin-bottom:16px;}
      .sw-tipo{flex:1;padding:8px 4px;border:2px solid #e5e7eb;border-radius:10px;background:white;cursor:pointer;font-size:13px;text-align:center;transition:all 0.15s;}
      .sw-tipo.active{border-color:#667eea;background:#f0f2ff;color:#667eea;font-weight:600;}
      .sw-label{font-size:12px;color:#666;margin-bottom:6px;font-weight:600;}
      .sw-textarea{width:100%;box-sizing:border-box;border:1.5px solid #e5e7eb;border-radius:8px;padding:10px;font-size:14px;resize:vertical;min-height:100px;font-family:inherit;outline:none;transition:border-color 0.15s;}
      .sw-textarea:focus{border-color:#667eea;}
      .sw-upload{margin-top:12px;}
      .sw-preview{margin-top:8px;position:relative;display:inline-block;}
      .sw-preview img{max-width:100%;max-height:120px;border-radius:8px;border:1px solid #ddd;}
      .sw-preview-rm{position:absolute;top:-6px;right:-6px;background:#E74C3C;color:white;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;}
      .sw-actions{display:flex;gap:8px;margin-top:16px;}
      .sw-btn{flex:1;padding:10px;border-radius:10px;border:none;cursor:pointer;font-size:14px;font-weight:600;transition:opacity 0.15s;}
      .sw-btn:disabled{opacity:0.5;cursor:not-allowed;}
      .sw-btn-cancel{background:#f3f4f6;color:#555;}
      .sw-btn-send{background:#667eea;color:white;}
      .sw-counter{font-size:11px;color:#aaa;text-align:right;margin-top:4px;}
    </style>
    <div class="sw-card">
      <div class="sw-title">🐛 Invia segnalazione</div>
      <div class="sw-tipo-bar">
        <button class="sw-tipo active" data-tipo="bug">🐛 Bug</button>
        <button class="sw-tipo" data-tipo="suggerimento">💡 Idea</button>
        <button class="sw-tipo" data-tipo="domanda">❓ Domanda</button>
      </div>
      <div class="sw-label">Descrizione</div>
      <textarea class="sw-textarea" id="sw-desc" placeholder="Descrivi il problema o il suggerimento..."></textarea>
      <div class="sw-counter">${MAX_TICKETS - count} segnalazioni rimanenti in questa sessione</div>
      <div class="sw-upload">
        <div class="sw-label">Screenshot (opzionale — o incolla con Cmd+V)</div>
        <input type="file" id="sw-file" accept="image/*" style="font-size:13px;">
        <div class="sw-preview" id="sw-preview" style="display:none;">
          <img id="sw-preview-img" src="" alt="screenshot">
          <button class="sw-preview-rm" id="sw-preview-rm">✕</button>
        </div>
      </div>
      <div class="sw-actions">
        <button class="sw-btn sw-btn-cancel" id="sw-cancel">Annulla</button>
        <button class="sw-btn sw-btn-send" id="sw-send">Invia</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  let tipoAttivo = 'bug';
  let screenshotBase64 = null;
  const desc = overlay.querySelector('#sw-desc');
  desc.focus();

  overlay.querySelectorAll('.sw-tipo').forEach(btn => {
    btn.onclick = () => {
      overlay.querySelectorAll('.sw-tipo').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tipoAttivo = btn.dataset.tipo;
      const ph = { bug: 'Descrivi il problema: cosa stavi facendo, cosa è successo...', suggerimento: 'Descrivi la tua idea o miglioramento...', domanda: 'Scrivi la tua domanda...' };
      desc.placeholder = ph[tipoAttivo];
    };
  });

  overlay.querySelector('#sw-file').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Screenshot troppo grande (max 2MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshot(ev.target.result);
    reader.readAsDataURL(file);
  };

  overlay.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file.size > 2 * 1024 * 1024) { showToast('Screenshot troppo grande (max 2MB)', 'error'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => setScreenshot(ev.target.result);
        reader.readAsDataURL(file);
        break;
      }
    }
  });

  function setScreenshot(dataUrl) {
    screenshotBase64 = dataUrl;
    overlay.querySelector('#sw-preview-img').src = dataUrl;
    overlay.querySelector('#sw-preview').style.display = 'inline-block';
  }

  overlay.querySelector('#sw-preview-rm').onclick = () => {
    screenshotBase64 = null;
    overlay.querySelector('#sw-preview').style.display = 'none';
    overlay.querySelector('#sw-file').value = '';
  };

  const close = () => overlay.remove();
  overlay.querySelector('#sw-cancel').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });

  overlay.querySelector('#sw-send').onclick = async () => {
    const descrizione = desc.value.trim();
    if (descrizione.length < 5) { showToast('Descrizione troppo breve', 'error'); desc.focus(); return; }

    const sendBtn = overlay.querySelector('#sw-send');
    sendBtn.disabled = true;
    sendBtn.textContent = '⏳ Invio...';

    const buildVersion = BUILD_INFO?.id || '-';
    const workspaceName = window.YFM?.workspaceInfo?.nome || window.YFM?.activeWorkspaceId || '-';
    const userAgent = navigator.userAgent;

    try {
      await apiFetch('/support/ticket', {
        method: 'POST',
        body: JSON.stringify({ tipo: tipoAttivo, descrizione, url_pagina: window.YFM?.currentPage || window.location.href, screenshot_base64: screenshotBase64, build_version: buildVersion, workspace_name: workspaceName, user_agent: userAgent })
      });
      sessionStorage.setItem(TICKET_KEY, String(parseInt(sessionStorage.getItem(TICKET_KEY) || '0') + 1));
      showToast('✅ Segnalazione inviata!', 'success', 4000);
      setTimeout(close, 500);
    } catch(err) {
      console.error('Support ticket error:', err);
      sendBtn.disabled = false;
      sendBtn.textContent = 'Invia';
      showToast('Errore invio. Scrivi a youthfootballmanager@gmail.com', 'error', 5000);
    }
  };
}
