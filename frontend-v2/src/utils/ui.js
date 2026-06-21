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
