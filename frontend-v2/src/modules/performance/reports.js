export default async function loadReports() {
  const c = document.getElementById('pageContent');
  c.innerHTML = `
    <h1 class="page-title">Report ${window.YFM.getSquadraName()}</h1>
    <p class="page-subtitle">Genera e scarica report della stagione</p>
    <div class="grid-2">
      <div class="card" style="text-align:center;padding:40px 20px;">
        <div style="font-size:48px;margin-bottom:16px;">📄</div>
        <h3>Report Stagionale</h3>
        <p style="color:var(--gray);margin-bottom:20px;">In sviluppo</p>
        <button class="btn btn-primary" disabled>Prossimamente</button>
      </div>
      <div class="card" style="text-align:center;padding:40px 20px;">
        <div style="font-size:48px;margin-bottom:16px;">👤</div>
        <h3>Report Giocatore</h3>
        <p style="color:var(--gray);margin-bottom:20px;">In sviluppo</p>
        <button class="btn btn-primary" disabled>Prossimamente</button>
      </div>
    </div>
  `;
}
