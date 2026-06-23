# Youth Football Manager – Project Status

> Documento di riferimento per collaboratori: architettura, stato attuale e roadmap futura.

---

## 1. Visione e Scope

**Youth Football Manager** è una **piattaforma tecnica per allenatori e società di calcio giovanile**.

Obiettivi principali:
- Gestire rosa, ruoli, stato fisico, scadenze
- Calendario, partite, convocazioni, distinte FIGC, formazione
- Allenamenti, presenze, obiettivi delle sedute
- Analisi partite, timeline eventi, note avversario
- Statistiche avanzate e performance individuali/di squadra
- Storico carriera dei giocatori su più stagioni

Macro-aree funzionali:
- 🏢 **CLUB** – Impostazioni società e stagione
- 👥 **TEAM** – Rosa, calendari, partite, formazione
- 🎯 **COACH** – Allenamenti e presenze
- 📈 **PERFORMANCE** – Statistiche e report

> ⚠️ Il vecchio frontend `frontend/` è **dismesso**. Tutto lo sviluppo va fatto su `frontend-v2/`.

---

## 2. Architettura Tecnica

### Backend (`backend/api/index.js`)
- **Stack**: Node.js + Express
- **Versione**: 3.12
- **Database**: Supabase (PostgreSQL)
- **Esport**: `module.exports = app;` per Vercel
- **CORS**: abilitato globalmente

### Frontend (`frontend-v2/src/`)
- **Tooling**: Vite + JavaScript ES modules
- **Stile**: CSS custom in `src/style.css` (responsive, media queries)
- **Routing**: gestito via `window.YFM` in `src/router.js`

#### Entry point
- `frontend-v2/index.html` → `<div id="app">`
- `frontend-v2/src/main.js` → bootstrap, inizializza `window.YFM`
- `frontend-v2/src/router.js` → definisce le "pagine" logiche
- `frontend-v2/src/components/layout/Sidebar.js` → layout + sidebar + header

### Database (Supabase)
Tabelle principali: `calciatori`, `rosa`, `squadra`, `stagione`, `workspace`, `partita` (con campo `archiviata`), `convocazione`, `formazione_partita`, `evento_partita`, `valutazione_partita`, `presenza_allenamento`, `configurazione_allenamento`.

---

## 3. Stato Funzionale dei Moduli

### ✅ OPERATIVI

| Modulo | Percorso | Descrizione |
|--------|----------|-------------|
| Dashboard | `modules/team/dashboard.js` | Widget riepilogo, trend GF/GS/DR, top marcatori/assist/presenze |
| Rosa | `modules/team/roster.js` | CRUD giocatori, scadenze mediche, filtri |
| Calendario | `modules/team/calendar.js` | CRUD partite, prossima in evidenza, archiviazione |
| Convocazioni | `modules/team/convocazioni.js` | Vincoli min/max, PDF, sola lettura se archiviata |
| Distinta | `modules/team/distinta.js` | Layout FIGC, 24 righe, staff, stampa PDF |
| Match Detail | `modules/team/matchDetail.js` | Eventi, timeline per tempo, statistiche |
| Note Avversario | `modules/team/noteAvversario.js` | Ereditarietà automatica note |
| Scheda Giocatore | `modules/team/playerDetail.js` | Profilo, stats, carriera, ultime partite |
| Formazione | `modules/team/formazione.js` | Scelta titolari/panchina, sola lettura se archiviata |
| Eventi/Risultato | `modules/team/resultForm.js` | Inserimento eventi, sola lettura se archiviata |
| Valutazioni | `modules/team/valutazioni.js` | Valutazioni partite |
| Allenamenti | `modules/coach/training.js` | Calendario sedute, presenze, materiale |
| Stats | `modules/performance/stats.js` | Disciplina (ammonizioni, espulsioni) |
| Reports | `modules/performance/reports.js` | Report Partita, Stagionale, Giocatore |
| Settings | `modules/club/settings.js` | Stagione, categoria, staff |
| Workspace | `modules/club/workspace.js` | Info società |

### ✅ COMPLETATI

| Funzionalità | Commit | Note |
|--------------|--------|------|
| Timeline Partita | - | Vista minuto-per-minuto in matchDetail.js |
| Archivia Partita | abad1ab | Blocco modifiche per partite concluse |

### ⏸️ SOSPESI

| Funzionalità | Note |
|--------------|------|
| Valutazioni Giocatore | Valutazioni tecniche per stagione/partita |

### 🔴 DA IMPLEMENTARE

| Funzionalità | Note |
|--------------|------|
| Auth/Ruoli | Login, ruoli (Allenatore, Staff, Admin) |
| Import Tuttocampo | Import dati da fonti esterne |
| Multi-istanza | Supporto multiple società |

---

## 4. Logica Archiviazione Partite

### Campo Database
- Tabella: `partita`
- Campo: `archiviata` (boolean, default false)

### Endpoint API
- `PUT /api/partite/:id/archivia` - Archivia partita
- `PUT /api/partite/:id/sblocca` - Sblocca partita archiviata

### Pulsanti Calendario per Scenario

| Scenario | Pulsanti |
|----------|----------|
| **Futura senza risultato** | Formazione, Note, Convoca, Distinta, Edit, Elimina |
| **Futura con risultato** | Formazione, Note, Convoca, Distinta, ✏️ Eventi, Edit, Elimina |
| **Passata con risultato** | Formazione, Convoca, Distinta, 📦 Archivia, Edit, Elimina |
| **Passata archiviata** | Formazione, Convoca, Distinta, 🔓 Sblocca (stile grigio) |

### Gestione Moduli
- **Non archiviata**: modal modificabile
- **Archiviata**: modal sola lettura con badge "📦 Partita Archiviata"

### Stile Visivo Archiviate
- Opacità: 75%
- Bordo sinistro: #8B7355 (marrone)
- Background: #F5F5F0 (beige chiaro)
- Icona: 📦 accanto alla data

---

## 5. Routing e Navigazione

Il router (`router.js`) definisce le pagine accessibili dalla sidebar:

```javascript
window.YFM.pages = {
  dashboard:  () => import('./modules/team/dashboard.js'),
  roster:     () => import('./modules/team/roster.js'),
  calendar:   () => import('./modules/team/calendar.js'),
  training:   () => import('./modules/coach/training.js'),
  stats:      () => import('./modules/performance/stats.js'),
  reports:    () => import('./modules/performance/reports.js'),
  settings:   () => import('./modules/club/settings.js'),
};
```

Navigazione: `window.YFM.navigateTo('nomePagina')`

---

## 6. Servizi e Utility

### API (`src/services/api.js`)
- `apiFetch(path, options?)` → chiama il backend
- Gestisce cache busting, timeout, errori
- **Regola**: usare sempre `apiFetch`, mai `fetch` diretto

### UI Utils (`src/utils/ui.js`)
- `showLoading(message?)` / `hideLoading()` → loading globale

### Formatters (`src/utils/formatters.js`)
- `formatDate`, `formatDateShort`, `formatTime`
- `getAvatarColor(nome)` → colori avatar coerenti

---

## 7. Linee Guida per Collaboratori

### Regole fondamentali
1. **Mai inventare route, nomi tabelle o funzioni** → verificare prima nel codice
2. **Prima leggere, poi scrivere** → leggere il file prima di modificarlo
3. **Usare `window.YFM`** per stato globale e navigazione
4. **Usare `apiFetch`** per chiamate backend
5. **Usare `showLoading/hideLoading`** per operazioni asincrone

### Struttura di un modulo
```javascript
import { apiFetch } from '../../services/api';
import { showLoading, hideLoading } from '../../utils/ui';

export default async function loadModuleName() {
  const c = document.getElementById('pageContent');
  c.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';
  
  try {
    const data = await apiFetch('/endpoint');
    renderModule(c, data);
  } catch (e) {
    c.innerHTML = '<div class="error-box">' + e.message + '</div>';
  }
}

function renderModule(container, data) {
  container.innerHTML = '<h1 class="page-title">Titolo</h1>';
  // ... render logica
}
```

---

## 8. Setup Locale

```bash
# Backend
cd backend
npm install
node api/index.js

# Frontend
cd frontend-v2
npm install
npm run dev -- --host 0.0.0.0 --port 8080
```

---

## 9. Deploy

### Frontend (Vercel)
- **URL**: https://youth-football-manager.vercel.app
- Root Directory: `frontend-v2`
- Build: `npm run build`
- Output: `dist`

### Backend (Vercel)
- **URL**: https://youth-football-manager-backend.vercel.app
- Root Directory: `backend`
- Versione: 3.12

### Env richieste (Backend)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

### Database (Supabase)
- **URL**: https://csxdlxbhcnyfppojwwzy.supabase.co

---

## 10. Ultimi Commit

| Hash | Descrizione |
|------|------------|
| abad1ab | Fix UI Archivia Partita - logica corretta |
| 3758059 | Correzione logica Archivia Partita |
| a0e5ee1 | FEAT: Archivia Partita - blocco modifiche |

---

*Ultimo aggiornamento: Giugno 2026*
