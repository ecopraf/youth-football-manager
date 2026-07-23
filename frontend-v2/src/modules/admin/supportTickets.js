import { apiFetch } from '../../services/api.js';
import { showToast } from '../../utils/ui.js';

let tickets = [];
let filtroStato = 'aperto';
let filtroWorkspace = '';
let filtroPriorita = 'tutti';
let expandedId = null;

const PRIORITA_BADGE = {
  low:      { label: '🟢 Low',      bg: '#E8F8F0', color: '#27AE60' },
  medium:   { label: '🟡 Medium',   bg: '#FFF8E1', color: '#F39C12' },
  high:     { label: '🔴 High',     bg: '#FDEDEE', color: '#E74C3C' },
  critical: { label: '⚫ Critical', bg: '#F0F0F0', color: '#1a1a2e' },
};

export default async function loadSupportTickets() {
  const c = document.getElementById('pageContent');
  c.innerHTML = `
    <style>
      .st-filters { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:16px; }
      .st-ticket { background:white; border-radius:12px; box-shadow:0 1px 4px rgba(0,0,0,0.08); margin-bottom:10px; overflow:hidden; }
      .st-ticket-header { display:flex; align-items:center; gap:10px; padding:12px 16px; cursor:pointer; }
      .st-ticket-header:hover { background:#f9f9f9; }
      .st-badge { font-size:11px; padding:2px 8px; border-radius:10px; font-weight:600; }
      .st-badge.aperto { background:#FEF3C7; color:#92400E; }
      .st-badge.chiuso { background:#D1FAE5; color:#065F46; }
      .st-badge-p { font-size:11px; padding:2px 8px; border-radius:10px; font-weight:600; }
      .st-tipo { font-size:12px; color:#888; }
      .st-meta { font-size:12px; color:#aaa; margin-left:auto; white-space:nowrap; }
      .st-body { padding:0 16px 16px; border-top:1px solid #f0f0f0; }
      .st-desc { background:#f9f9f9; border-radius:8px; padding:12px; font-size:14px; white-space:pre-wrap; margin:12px 0; color:#333; }
      .st-info { font-size:12px; color:#888; margin-bottom:12px; display:grid; grid-template-columns:auto 1fr; gap:2px 12px; }
      .st-info span:nth-child(odd) { color:#bbb; }
      .st-risposta-box { background:#EFF6FF; border-radius:8px; padding:12px; margin-bottom:12px; font-size:13px; color:#1E40AF; white-space:pre-wrap; }
      .st-actions { display:flex; gap:8px; flex-wrap:wrap; }
      .st-reply-area { width:100%; box-sizing:border-box; border:1px solid #ddd; border-radius:8px; padding:10px; font-size:14px; resize:vertical; min-height:80px; margin-bottom:8px; font-family:inherit; }
      .st-reply-area:focus { outline:none; border-color:#667eea; }
      .st-empty { text-align:center; color:#aaa; padding:40px; font-size:14px; }
      @media(max-width:500px) { .st-meta { display:none; } .st-actions { flex-direction:column; } }
    </style>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
      <h2 style="margin:0;font-size:18px;">🎫 Ticket di Supporto</h2>
      <button id="btnPulisciChiusi" class="btn btn-secondary" style="font-size:12px;padding:6px 12px;">🧹 Pulisci ticket chiusi</button>
    </div>
    <div class="st-filters">
      <div class="tab-bar" id="filtroStatoBar">
        <button class="tab-btn active" data-stato="aperto">Aperti</button>
        <button class="tab-btn" data-stato="chiuso">Chiusi</button>
        <button class="tab-btn" data-stato="tutti">Tutti</button>
      </div>
      <div class="tab-bar" id="filtroPrioritaBar">
        <button class="tab-btn active" data-p="tutti">Tutte</button>
        <button class="tab-btn" data-p="critical">⚫ Critical</button>
        <button class="tab-btn" data-p="high">🔴 High</button>
        <button class="tab-btn" data-p="medium">🟡 Medium</button>
        <button class="tab-btn" data-p="low">🟢 Low</button>
      </div>
    </div>
    <div id="stList"></div>
  `;

  document.getElementById('btnPulisciChiusi').addEventListener('click', pulisciChiusi);
  document.querySelectorAll('#filtroStatoBar .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filtroStatoBar .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filtroStato = btn.dataset.stato;
      loadData();
    });
  });

  document.querySelectorAll('#filtroPrioritaBar .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filtroPrioritaBar .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filtroPriorita = btn.dataset.p;
      renderList();
    });
  });

  await loadData();
}

async function loadData() {
  const c = document.getElementById('pageContent');
  const list = document.getElementById('stList');
  if (!list) return;

  list.innerHTML = '<div class="st-empty">⏳ Caricamento...</div>';
  const params = new URLSearchParams({ stato: filtroStato });
  const res = await apiFetch(`/support/tickets?${params}`);
  if (document.getElementById('pageContent') !== c) return;

  if (!res.success) { list.innerHTML = '<div class="st-empty">Errore caricamento ticket</div>'; return; }
  tickets = res.data || [];
  renderList();
}

function renderList() {
  const list = document.getElementById('stList');
  if (!list) return;
  if (!tickets.length) { list.innerHTML = '<div class="st-empty">Nessun ticket trovato</div>'; return; }

  const filtered = filtroPriorita === 'tutti' ? tickets : tickets.filter(t => (t.priorita || 'medium') === filtroPriorita);
  if (!filtered.length) { list.innerHTML = '<div class="st-empty">Nessun ticket trovato</div>'; return; }

  const TIPO_EMOJI = { bug: '🐛', suggerimento: '💡', domanda: '❓' };
  list.innerHTML = filtered.map(t => {
    const emoji = TIPO_EMOJI[t.tipo] || '📋';
    const data = new Date(t.created_at).toLocaleString('it-IT', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' });
    const isOpen = expandedId === t.id;
    const desc60 = (t.descrizione || '').substring(0, 80) + ((t.descrizione||'').length > 80 ? '…' : '');
    const pb = PRIORITA_BADGE[t.priorita || 'medium'] || PRIORITA_BADGE.medium;

    const bodyHtml = isOpen ? `
      <div class="st-body">
        <div class="st-info">
          <span>Da</span><span>${t.nome || '—'} · ${t.email || '—'} · ${t.ruolo || '—'}</span>
          <span>Pagina</span><span>${t.pagina || '—'}</span>
          <span>Build</span><span>${t.build || '—'}</span>
        </div>
        <div class="st-desc">${(t.descrizione||'').replace(/</g,'&lt;')}</div>
        ${t.risposta ? `<div style="font-size:12px;color:#888;margin-bottom:4px;">✅ Risposta inviata:</div><div class="st-risposta-box">${t.risposta.replace(/</g,'&lt;')}</div>` : ''}
        ${t.stato === 'aperto' ? `
          <textarea class="st-reply-area" id="reply-${t.id}" placeholder="Scrivi una risposta da inviare via email all'utente..."></textarea>
          <div class="st-actions">
            <button class="btn btn-primary" style="font-size:13px;" onclick="window._stRispondi('${t.id}')">📨 Invia risposta</button>
            <button class="btn btn-secondary" style="font-size:13px;" onclick="window._stChiudi('${t.id}')">✓ Chiudi senza risposta</button>
            <button class="btn" style="font-size:13px;background:#FEE2E2;color:#991B1B;" onclick="window._stElimina('${t.id}')">🗑️ Elimina</button>
          </div>
        ` : `
          <div class="st-actions">
            <button class="btn btn-secondary" style="font-size:13px;" onclick="window._stRiapri('${t.id}')">↩️ Riapri</button>
            <button class="btn" style="font-size:13px;background:#FEE2E2;color:#991B1B;" onclick="window._stElimina('${t.id}')">🗑️ Elimina</button>
          </div>
        `}
      </div>` : '';

    return `<div class="st-ticket">
      <div class="st-ticket-header" onclick="window._stToggle('${t.id}')">
        <span style="font-size:18px;">${emoji}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:600;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${desc60.replace(/</g,'&lt;')}</div>
          <div class="st-tipo">${t.nome||t.email||'—'} · ${t.pagina||'—'}</div>
        </div>
        <span class="st-badge ${t.stato}">${t.stato}</span>
        ${t.tipo === 'bug' ? `<span class="st-badge-p" style="background:${pb.bg};color:${pb.color};">${pb.label}</span>` : ''}
        <span class="st-meta">${data}</span>
        <span style="color:#aaa;font-size:12px;margin-left:4px;">${isOpen ? '▲' : '▼'}</span>
      </div>
      ${bodyHtml}
    </div>`;
  }).join('');
}

// Handlers globali
window._stToggle = (id) => {
  expandedId = expandedId === id ? null : id;
  renderList();
};

window._stRispondi = async (id) => {
  const ta = document.getElementById(`reply-${id}`);
  const risposta = ta?.value?.trim();
  if (!risposta) { showToast('Scrivi una risposta prima di inviare', 'warning'); return; }
  const btn = ta.nextElementSibling?.querySelector('button');
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Invio...'; }
  const res = await apiFetch(`/support/tickets/${id}/rispondi`, { method: 'PUT', body: JSON.stringify({ risposta }) });
  if (res.success) { showToast('✅ Risposta inviata!', 'success'); expandedId = null; loadData(); }
  else { showToast('Errore invio risposta', 'error'); if (btn) { btn.disabled = false; btn.innerHTML = '📨 Invia risposta'; } }
};

window._stChiudi = async (id) => {
  const res = await apiFetch(`/support/tickets/${id}/stato`, { method: 'PUT', body: JSON.stringify({ stato: 'chiuso' }) });
  if (res.success) { showToast('Ticket chiuso', 'success'); expandedId = null; loadData(); }
  else showToast('Errore', 'error');
};

window._stRiapri = async (id) => {
  const res = await apiFetch(`/support/tickets/${id}/stato`, { method: 'PUT', body: JSON.stringify({ stato: 'aperto' }) });
  if (res.success) { showToast('Ticket riaperto', 'success'); expandedId = null; loadData(); }
  else showToast('Errore', 'error');
};

window._stElimina = async (id) => {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:320px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
    <div style="font-size:32px;text-align:center;margin-bottom:12px;">🗑️</div>
    <div style="font-weight:700;font-size:16px;text-align:center;margin-bottom:8px;">Elimina ticket</div>
    <div style="font-size:14px;color:#666;text-align:center;margin-bottom:20px;">Questa azione è irreversibile.</div>
    <div style="display:flex;gap:8px;">
      <button id="cancelDel" class="btn btn-secondary" style="flex:1;">Annulla</button>
      <button id="confirmDel" class="btn" style="flex:1;background:#E74C3C;color:white;">Elimina</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#cancelDel').onclick = () => overlay.remove();
  overlay.querySelector('#confirmDel').onclick = async () => {
    overlay.remove();
    const res = await apiFetch(`/support/tickets/${id}`, { method: 'DELETE' });
    if (res.success) { showToast('Ticket eliminato', 'success'); expandedId = null; loadData(); }
    else showToast('Errore eliminazione', 'error');
  };
};

async function pulisciChiusi() {
  const chiusiCount = tickets.filter(t => t.stato === 'chiuso').length;
  const countLabel = chiusiCount > 0 ? `${chiusiCount} ticket chiusi` : 'tutti i ticket chiusi';

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:24px;max-width:320px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
    <div style="font-size:32px;text-align:center;margin-bottom:12px;">🧹</div>
    <div style="font-weight:700;font-size:16px;text-align:center;margin-bottom:8px;">Pulisci ticket chiusi</div>
    <div style="font-size:14px;color:#666;text-align:center;margin-bottom:20px;">Verranno eliminati <strong>${countLabel}</strong>. Azione irreversibile.</div>
    <div style="display:flex;gap:8px;">
      <button id="cancelPulisci" class="btn btn-secondary" style="flex:1;">Annulla</button>
      <button id="confirmPulisci" class="btn btn-primary" style="flex:1;">Elimina tutti</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#cancelPulisci').onclick = () => overlay.remove();
  overlay.querySelector('#confirmPulisci').onclick = async (e) => {
    const btn = e.target; btn.disabled = true; btn.innerHTML = '⏳';
    overlay.remove();
    const res = await apiFetch('/support/tickets/chiusi', { method: 'DELETE' });
    if (res.success) {
      if (res.deleted > 0) showToast(`🧹 ${res.deleted} ticket eliminati`, 'success');
      else showToast('Nessun ticket chiuso da eliminare', 'info');
      expandedId = null; loadData();
    } else showToast('Errore pulizia', 'error');
  };
}
