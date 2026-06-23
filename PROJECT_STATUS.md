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
- Sistema di autenticazione con ruoli multipli (Admin, Allenatore, Staff, Guest)

Macro-aree funzionali:
- 🏢 **CLUB** – Impostazioni società e stagione
- 👥 **TEAM** – Rosa, calendari, partite, formazione
- 🎯 **COACH** – Allenamenti e presenze
- 📈 **PERFORMANCE** – Statistiche e report
- 🔐 **ADMIN** – Gestione utenti e link guest

> ⚠️ Il vecchio frontend `frontend/` è **dismesso**. Tutto lo sviluppo va fatto su `frontend-v2/`.

---

## 2. Architettura Tecnica

### Backend (`backend/api/index.js`)
- **Stack**: Node.js + Express
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
Tabelle principali: `utente`, `guest_token`, `calciatori`, `rosa`, `squadra`, `stagione`, `workspace`, `partita` (con campo `archiviata`), `convocazione`, `formazione_partita`, `evento_partita`, `valutazione_partita`, `presenza_allenamento`, `configurazione_allenamento`.

---

## 3. Sistema di Autenticazione (Auth FASE 1) ✅ COMPLETATO

### Ruoli Utente
| Ruolo | Descrizione | Permessi |
|-------|-------------|----------|
| **Admin** | Amministratore sistema | Accesso completo, gestisce utenti e link guest |
| **Allenatore** | Responsabile tecnico | Gestisce rosa, partite, formazioni, eventi, convocazioni |
| **Staff** | Assistente | Accesso limitato alle funzionalità assegnate |
| **Guest** | Ospite temporaneo | Accesso via link, solo lettura, limitato a categorie specifiche |

### Gestione Utenti (Admin)
- CRUD completo utenti da pannello Admin
- Campo `squadre_accesso` per limitare accesso per categoria
- Campo `is_active` per disattivare utenti senza eliminarli
- Campo `is_superadmin` per permessi speciali

### Link Guest
- Generazione link temporanei con scadenza configurabile
- URL formato: `/guest/{token}`
- Tipi: `atleta` o `genitore`
- Accesso limitato alle categorie selezionate
- Revoca immediata dei link

### Endpoint Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registrazione
- `GET /api/auth/users` - Lista utenti (Admin)
- `POST /api/auth/users` - Crea utente (Admin)
- `PUT /api/auth/users/:id` - Modifica utente (Admin)
- `DELETE /api/auth/users/:id` - Disattiva utente (Admin)
- `POST /api/auth/guest-link` - Genera link guest (Admin)
- `GET /api/auth/guest-links` - Lista link guest (Admin)
- `DELETE /api/auth/guest-link/:token` - Revoca link (Admin)
- `GET /api/guest/:token` - Attivazione guest

---

## 4. Stato Funzionale dei Moduli

### ✅ OPERATIVI

| Modulo | Percorso | Descrizione |
|--------|----------|-------------|
| Dashboard | `modules/team/dashboard.js` | Widget riepilogo, prossima partita, trend GF/GS/DR, top marcatori/assist/presenze |
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
| Gestione Utenti | `modules/admin/users.js` | CRUD utenti sistema (Admin) |
| Link Guest | `modules/admin/guestLinks.js` | Genera/revoca link accesso guest (Admin) |

### ✅ COMPLETATI

| Funzionalità | Commit | Note |
|--------------|--------|------|
| Timeline Partita | - | Vista minuto-per-minuto in matchDetail.js |
| Archivia Partita | abad1ab | Blocco modifiche per partite concluse |
| Auth FASE 1 | bdedf42 | Sistema ruoli, gestione utenti, link guest |
| Dashboard Aggiornata | bdedf42 | Prossima partita in evidenza, trend, top players |
| Accessibilità | bdedf42 | Tooltip su tutte le icone |

### ⏸️ SOSPESI

| Funzionalità | Note |
|--------------|------|
| Valutazioni Giocatore | Valutazioni tecniche per stagione/partita |
| Filtro Categorie | Staff vede solo squadre assegnate |

### 🔴 DA IMPLEMENTARE

| Funzionalità | Note |
|--------------|------|
| Import Tuttocampo | Import dati da fonti esterne |
| Import CSV | Import massivo dati |
| Multi-istanza | Supporto multiple società |

---

## 5. Logica Archiviazione Partite

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

## 6. Routing e Navigazione

Il router (`router.js`) definisce le pagine accessibili dalla sidebar:

```javascript
indow.YFM.pages = {
  login:      () => import('./modules/auth/login.js'),
  guest:      () => import('./modules/auth/guest.js'),
  users:      () => import('./modules/admin/users.js'),
  guestLinks: () => import('./modules/admin/guestLinks.js'),
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

## 7. Servizi e Utility

### API (`src/services/api.js`)
- `apiFetch(path, options?)` → chiama il backend
- `verifyGuestToken(token)` → verifica token guest
- `setGuestSession(data)` → imposta sessione guest
- **Regola**: usare sempre `apiFetch`, mai `fetch` diretto

### UI Utils (`src/utils/ui.js`)
- `showLoading(message?)` / `hideLoading()` → loading globale

### Formatters (`src/utils/formatters.js`)
- `formatDate`, `formatDateShort`, `formatTime`
- `getAvatarColor(nome)` → colori avatar coerenti

---

## 8. Linee Guida per Collaboratori

### Regole fondamentali
1. **Mai inventare route, nomi tabelle o funzioni** → verificare prima nel codice
2. **Prima leggere, poi scrivere** → leggere il file prima di modificarlo
3. **Usare `window.YFM`** per stato globale e navigazione
4. **Usare `apiFetch`** per chiamate backend
5. **Usare `showLoading/hideLoading`** per operazioni asincrone
6. **Documentazione** → Dopo ogni feature importante, aggiornare AGENTS.md e PROJECT_STATUS.md

### Struttura di un modulo
```javascript
mport { apiFetch } from '../../services/api';
mport { showLoading, hideLoading } from '../../utils/ui';

xport default async function loadModuleName() {
  const c = document.getElementById('pageContent');
  c.innerHTML = '<div class="loading"><div class="spinner"></div>Caricamento...</div>';

  try {
    const data = await apiFetch('/endpoint');
    renderModule(c, data);
  } catch (e) {
    c.innerHTML = '<div class="error-box">' + e.message + '</div>';
  }
}

unction renderModule(container, data) {
  container.innerHTML = '<h1 class="page-title">Titolo</h1>';
  // ... render logica
}
```

---

## 9. Roadmap MVP 2026

### 🎯 Obiettivo
**Versione completa e stabile entro metà Settembre 2026** per inizio campionati.

### ✅ Checklist Completata - Auth FASE 1

#### Core Autenticazione
- [x] Login/Logout funzionante con JWT
- [x] Ruoli: Admin, Allenatore, Staff con permessi
- [x] Gestione utenti (Admin)
- [x] Link guest (Atleta/Genitore)
- [x] Dashboard con prossima partita
- [x] Accessibilità tooltip

### 📋 Prossime Checklist - Import Dati

#### Core Import Dati
- [ ] Wizard import CSV (rosa)
- [ ] Wizard import CSV (partite)
- [ ] Wizard import CSV (eventi)
- [ ] Preview anteprima dati
- [ ] Gestione errori

#### Core Tuttocampo
- [ ] Parser URL Tuttocampo
- [ ] Web scraping rosa
- [ ] Web scraping partite
- [ ] Web scraping risultati
- [ ] Web scraping marcatori

#### Centro Importazioni
- [ ] Log storico importazioni
- [ ] Rilevamento duplicati
- [ ] Matching giocatori esistenti
- [ ] Report finale import

### 📊 Milestone

| Data | Milestone | Stato |
|------|-----------|-------|
| 23 Giugno 2026 | Auth FASE 1 completata | ✅ **COMPLETATA** |
| 15 Luglio 2026 | Auth completa | ⏳ |
| 15 Agosto 2026 | Import base | ⏳ |
| 1 Settembre 2026 | Import Tuttocampo | ⏳ |
| 15 Settembre 2026 | MVP STABILE | ⏳ |

---

## 10. Deploy

### Frontend (Vercel)
- **URL**: https://youth-football-manager.vercel.app
- Root Directory: `frontend-v2`
- Build: `npm run build`
- Output: `dist`

### Backend (Vercel)
- **URL**: https://youth-football-manager-backend.vercel.app
- Root Directory: `backend`

### Env richieste (Backend)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

### Database (Supabase)
- **URL**: https://csxdlxbhcnyfppojwwzy.supabase.co

---

## 11. Ultimi Commit

| Hash | Descrizione |
|------|------------|
| bdedf42 | FIX: Dashboard aggiornata con prossima partita, tooltip accessibilità |
| 4b7c9e6 | FIX: Query order by id invece di created_at (colonna non esiste) |
| 4fed908 | DEBUG: Aggiunto logging in /auth/users per diagnosticare |
| 542f267 | FIX: Lista utenti, guest link, copy clipboard |
| 7fc2bce | FIX: Router guest link, main.js cleanup, logout button header |

---

*Ultimo aggiornamento: Giugno 2026*
