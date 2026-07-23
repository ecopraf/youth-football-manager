export default async function loadDemoExpired() {
  const c = document.getElementById('pageContent');
  const scadenza = sessionStorage.getItem('demo_scadenza');
  const dataStr = scadenza
    ? new Date(scadenza).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  c.innerHTML = `
    <div style="min-height:80vh;display:flex;align-items:center;justify-content:center;padding:24px;">
      <div style="max-width:480px;width:100%;text-align:center;">
        <div style="font-size:64px;margin-bottom:16px;">⏰</div>
        <h1 style="font-size:24px;font-weight:700;color:#1F2937;margin-bottom:8px;">Periodo di prova terminato</h1>
        ${dataStr ? `<p style="color:#6B7280;margin-bottom:8px;">Il tuo accesso demo è scaduto il <strong>${dataStr}</strong>.</p>` : ''}
        <p style="color:#6B7280;margin-bottom:32px;">Per continuare ad usare Youth Football Manager, contattaci per attivare il tuo abbonamento.</p>
        <div style="display:flex;flex-direction:column;gap:12px;align-items:center;">
          <a href="mailto:youthfootballmanager@gmail.com?subject=Attivazione%20abbonamento%20YFM"
             style="display:inline-block;background:#667eea;color:white;padding:14px 32px;border-radius:10px;font-weight:600;text-decoration:none;font-size:16px;width:100%;max-width:320px;box-sizing:border-box;">
            ✉️ Contattaci via email
          </a>
          <a href="https://wa.me/393351051147?text=Ciao%2C%20vorrei%20attivare%20YFM"
             target="_blank"
             style="display:inline-block;background:#25D366;color:white;padding:14px 32px;border-radius:10px;font-weight:600;text-decoration:none;font-size:16px;width:100%;max-width:320px;box-sizing:border-box;">
            💬 Scrivici su WhatsApp
          </a>
        </div>
        <p style="margin-top:32px;font-size:12px;color:#9CA3AF;">
          Youth Football Manager · <a href="mailto:youthfootballmanager@gmail.com" style="color:#667eea;">youthfootballmanager@gmail.com</a>
        </p>
      </div>
    </div>
  `;
}
