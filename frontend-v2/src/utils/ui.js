export function showLoading(message = 'Salvataggio...') {
  const existing = document.getElementById('globalLoading');
  if (existing) return;

  const d = document.createElement('div');
  d.id = 'globalLoading';
  d.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;z-index:9999;">
      <div style="background:white;border-radius:16px;padding:32px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
        <div class="spinner"></div>
        <p style="margin-top:12px;font-weight:500;">${message}</p>
      </div>
    </div>`;
  document.body.appendChild(d);
}

export function hideLoading() {
  const d = document.getElementById('globalLoading');
  if (d) d.remove();
}

// Custom alert con titolo "Youth Football Manager"
(function overrideNativeDialogs() {
  window.alert = function(msg) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:99999;';
    const isError = /errore|non compatibile|obbligatori|troppo corto/i.test(msg);
    const isSuccess = /\u2705|importat|completat/i.test(msg);
    const icon = isError ? '⚠️' : isSuccess ? '✅' : 'ℹ️';
    overlay.innerHTML = `<div style="background:white;border-radius:16px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);overflow:hidden;animation:fadeIn .15s ease;">
      <div style="padding:16px 20px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;font-weight:600;font-size:14px;">Youth Football Manager</div>
      <div style="padding:24px 20px;font-size:14px;line-height:1.6;white-space:pre-line;">${icon} ${msg}</div>
      <div style="padding:12px 20px;border-top:1px solid #eee;display:flex;justify-content:flex-end;">
        <button style="padding:10px 24px;background:#667eea;color:white;border:none;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;" onclick="this.closest('div[style*=fixed]').remove()">Ok</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('button').focus();
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === 'Escape') overlay.remove(); });
  };

  const nativeConfirm = window.confirm.bind(window);
  window.confirm = function(msg) {
    // Se chiamato in contesto sincrono (non-async), fallback nativo
    // Per contesto async, ritorna Promise
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:99999;';
      overlay.innerHTML = `<div style="background:white;border-radius:16px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);overflow:hidden;animation:fadeIn .15s ease;">
        <div style="padding:16px 20px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;font-weight:600;font-size:14px;">Youth Football Manager</div>
        <div style="padding:24px 20px;font-size:14px;line-height:1.6;white-space:pre-line;">❓ ${msg}</div>
        <div style="padding:12px 20px;border-top:1px solid #eee;display:flex;justify-content:flex-end;gap:8px;">
          <button data-r="false" style="padding:10px 24px;background:#f0f0f0;color:#333;border:none;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;">Annulla</button>
          <button data-r="true" style="padding:10px 24px;background:#667eea;color:white;border:none;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;">Conferma</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('[data-r="true"]').focus();
      const close = (val) => { overlay.remove(); resolve(val); };
      overlay.querySelector('[data-r="true"]').addEventListener('click', () => close(true));
      overlay.querySelector('[data-r="false"]').addEventListener('click', () => close(false));
      overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
      overlay.addEventListener('keydown', e => { if (e.key === 'Escape') close(false); if (e.key === 'Enter') close(true); });
    });
  };
})();
