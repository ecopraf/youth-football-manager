# Youth Football Manager - AI Agent Workspace

> **Entry point per agenti AI** (OpenHands, Agent Canvas, Claude Code, etc.)

---

## 📁 Struttura Repository

```
.agents/                    # Configurazione agenti AI
├── AGENTS.md              # ← Questo file (entry point)
├── plans/                 # ⭐ DEVELOPMENT PLAN (fonte di verità)
│   ├── DEVELOPMENT_PLAN.md  # Epic attivi, micro-task, dipendenze
│   └── DEVELOPMENT_PLAN_ARCHIVE.md # Epic completati ✅ (solo consultazione)
├── knowledge/             # Conoscenza del prodotto
│   ├── VISION.md          # Missione, valori, target
│   ├── ARCHITECTURE.md    # Stack, API, struttura file
│   ├── DATABASE_SCHEMA.md # Schema DB completo (fonte unica)
│   └── ROADMAP.md         # [DEPRECATO] → usa DEVELOPMENT_PLAN.md
├── standards/             # Convenzioni e regole
│   └── CODING_STANDARDS.md
├── tasks/                 # Template task
│   └── TEMPLATE.md
└── prompts/               # System prompts
    └── SYSTEM_PROMPT.md
```

---

## 🚀 Prima di Iniziare

### 1. Leggi i documenti di contesto
```
.agents/plans/DEVELOPMENT_PLAN.md  → ⭐ Epic attivi, task, priorità (LEGGERE SEMPRE)
.agents/plans/DEVELOPMENT_PLAN_ARCHIVE.md → Epic completati ✅ (solo se serve storia pregressa)
.agents/knowledge/VISION.md        → Cosa stiamo costruendo
.agents/knowledge/ARCHITECTURE.md  → Come è fatto il sistema
.agents/knowledge/DATABASE_SCHEMA.md → Schema DB completo
.agents/standards/CODING_STANDARDS.md → Come scrivere codice
```

### 2. Verifica stato attuale
```bash
git log --oneline -3
git status
```

### 3. Consulta il system prompt
`.agents/prompts/SYSTEM_PROMPT.md`

---

## 📋 Info Progetto

| Info | Valore |
|------|--------|
| **Versione** | v3.16 |
| **Build ID** | `v3.15.<git-hash>` |
| **Frontend** | Vite + JavaScript ES Modules |
| **Backend** | Node.js/Express (18 router) + Supabase |
| **Deploy** | Vercel (auto su push a main) |
| **PWA** | Installabile (vite-plugin-pwa, Workbox precache, registerSW autoUpdate). Offline: solo asset statici. Offline-first API cache: EPIC 15 (planned). |
| **Auth** | JWT + capabilities granulari per modulo (rosa, partite, formazione, allenamenti, statistiche, guest_links, import, report, quote, tesseramento). Livelli: `''` (nessuno), `'read'`, `'write'`. Admin/superadmin bypassano. Allenatore usa capabilities dal profilo (fallback legacy: tutto se nessun permesso). `quote` e `tesseramento` visibili solo per admin e segreteria (write), allenatore/dirigente (read). |
| **Guest** | JWT guest (24h). Login risolve team_id + player_name. Tipo: `famiglia` (home personale con quote/tesseramento, ha `player_id`) o `ospite` (solo partite/risultati, link di cortesia). Capabilities differenziate per tipo. |
| **Notifiche** | Badge 🔔 aggiornato al login + polling 60s + cambio squadra. Centro Comunicazioni con tabs (📤 Inviate + 📥 Ricevute). Inviate: avvisi/convocazioni creati dall'utente (edit/delete). Ricevute: assenze + indisponibilità convocati (read-only + 💬 Rispondi). Convocazioni: salva separato da pubblica (notifica solo su Pubblica). |
| **Help** | Sistema help interattivo contestuale (PageHelp.js + helpData.js) |

### Backend Dependencies
- `express`, `cors`, `bcryptjs`, `jsonwebtoken`
  - CORS config: `exposedHeaders: ['Content-Disposition']` (necessario per download file con filename dal backend)
- `@supabase/supabase-js`, `pg`
- `multer` (upload file PDF/XLS)
- `adm-zip` (generazione ZIP archiviazione ricevute)
- `xlsx` (parsing tabulato atleti FIGC .xlsx)
- `pdf-parse@1.1.1` (parsing PDF calendario SGS/LND)
- `cheerio` (parsing HTML Tuttocampo)
- `dotenv`

### Frontend Dependencies
- `vite` 6, `tailwindcss` 4
- `vite-plugin-pwa` 1.3 (Workbox precache + manifest generation)
- `virtual:pwa-register` (auto-import da vite-plugin-pwa per registerSW)

### Backend Files (Architettura Modulare)
```
api/
├── index.js                    — Entry point: middleware, health, mount router (~225 righe)
├── pdfCalendarioParser.js      — Parser PDF calendario SGS/LND
├── middleware/
│   └── auth.middleware.js       — authMiddleware, requirePermission, checkSquadraAccess
├── db/
│   └── supabase.js             — Client Supabase inizializzato
├── helpers/
│   ├── tuttocampo.js           — Login/request Tuttocampo
│   ├── importUtils.js          — Normalizzazione nomi, parsing eventi, log, scrape loghi
│   ├── importFormationTC.js    — Import formazioni da Tuttocampo
│   ├── gazzettaRegionale.js    — Fetch classifica/calendario/marcatori da GR API
│   ├── dbErrors.js             — Traduzione errori DB (duplicate key → messaggi IT)
│   ├── capabilities.js         — Profili/capabilities utente (mirror CommonJS)
│   └── teamAccess.js           — Validazione accesso team (team→category resolution)
└── routes/ (23 router)
    ├── auth.js                 — Login, register, users CRUD, guest (batch delete/renew)
                                  `POST /api/auth/login` `POST /api/auth/logout` `GET /api/auth/me` `PUT /api/auth/profile`
                                  `POST /api/auth/register` `GET /api/auth/users` `GET|PUT|DELETE /api/auth/users/:id` `PUT /api/auth/users/:id/toggle-active`
                                  `GET /api/auth/guest-links` `POST /api/auth/guest-link` `DELETE /api/auth/guest-link/:token` `DELETE /api/auth/guest-links-batch` `POST /api/auth/guest-links-renew`
                                  `GET /api/guest/:token` `GET|PUT /api/users/preferences`
    ├── workspace.js            — Workspace (nome/logo/nome_breve), workspace_anagrafica (dati societari), facility, stagioni, categorie, migrazione
                                  `GET /api/auth/workspaces` `GET /api/workspaces` `GET|PUT /api/workspaces/:id` `PUT /api/workspaces/:id/logo` `PUT /api/workspaces/:id/anagrafica` `GET /api/workspaces/:id/recap`
                                  `GET|POST /api/workspaces/:id/stagioni` `GET /api/workspaces/:id/stagioni/:seasonId/teams` `POST /api/stagioni/:id/migra`
                                  `GET|POST /api/workspaces/:id/categorie` `DELETE /api/categorie/:id`
                                  `GET|POST /api/workspaces/:id/facility` `GET|PUT /api/workspaces/:id/staff` `POST /api/workspaces/:id/staff/migrate`
                                  `GET /api/staff/:id` `GET /api/logos` `GET /api/teams/search`
    ├── team.js                 — Squadre CRUD, PUT stagioni, POST categorie/:catId/team
                                  `GET|POST /api/squadre` `GET|PUT|DELETE /api/squadre/:id` `GET|PUT /api/stagioni/:id` `GET /api/stagioni/:id/squadre` `POST /api/categorie/:catId/team` `GET /api/stagioni`
    ├── training.js             — Config, presenze, templates, programma, allenamenti-futuri
                                  `GET|PUT /api/squadre/:squadraId/allenamenti/config` `DELETE /api/allenamenti/config/:id`
                                  `GET|POST /api/squadre/:squadraId/allenamenti/presenze` `POST /api/squadre/:squadraId/allenamenti/presenze-batch`
                                  `GET|POST /api/squadre/:squadraId/training-templates` `GET|PUT|DELETE /api/training-templates/:id` `GET /api/squadre/:squadraId/training-by-date` `GET|PUT /api/squadre/:squadraId/training-by-date/:date`
                                  `GET /api/squadre/:squadraId/allenamenti/summary` `GET /api/squadre/:squadraId/allenamenti-futuri` `GET /api/squadre/:squadraId/allenamenti/annullati`
                                  `POST /api/training/:id/annulla` `POST /api/training/:id/ripristina` `GET|PUT /api/training/:trainingId/programma`
                                  `GET|POST /api/squadre/:squadraId/allenamenti/materiale` `DELETE /api/allenamenti/materiale/:id` `GET /api/squadre/:teamId/assenze-settimana`
    ├── match.js                — Partite CRUD, convocazioni, formazione, eventi, live-action
                                  `GET /api/squadre/:squadraId/partite` `GET /api/squadre/:squadraId/partite-all` `GET /api/squadre/:squadraId/partite-future`
                                  `GET|PUT|DELETE /api/partite/:id` `POST /api/squadre/:squadraId/importa-calendario`
                                  `GET|PUT /api/partite/:matchId/dettaglio` `PUT /api/partite/:matchId/distinta-meta` `PUT /api/partite/:id/note`
                                  `POST /api/partite/:id/archivia` `POST /api/partite/:id/sblocca` `POST /api/partite/:id/live-action`
                                  `GET|POST /api/partite/:matchId/convocazioni` `POST /api/partite/:matchId/convocazioni-batch` `POST /api/partite/:matchId/convocazioni-pubblica`
                                  `GET /api/partite/:matchId/convocazioni-stato` `PUT /api/partite/:matchId/convocazioni/:convId/risposta`
                                  `GET /api/squadre/:squadraId/partite/:matchId/convocati` `GET /api/squadre/:squadraId/partite/:matchId/distinta`
                                  `GET|POST /api/squadre/:squadraId/partite/:matchId/formazione` `GET|PUT /api/partite/:matchId/formazione`
                                  `GET|POST /api/squadre/:squadraId/partite/:matchId/eventi` `POST /api/partite/:matchId/eventi-batch` `POST /api/partite/:matchId/evento-item`
                                  `GET|POST /api/partite/:matchId/valutazioni` `GET /api/squadre/:teamId/ultima-formazione`
    ├── staff.js                — Staff completo per distinta
                                  `GET /api/squadre/:squadraId/staff-completo`
    ├── admin.js                — Migrazioni schema DB
    ├── statistics.js           — Statistiche complete, top players, report partita/stagionale/giocatore
                                  `GET /api/squadre/:id/statistiche-complete` `GET /api/squadre/:id/stats-charts` `GET /api/squadre/:id/top-players` `GET /api/squadre/:id/valutazioni-top`
                                  `GET /api/squadre/:id/classifica` `GET /api/squadre/:id/competitions` `GET /api/squadre/:squadraId/stats-giocatori`
                                  `GET /api/partite/:matchId/report` `GET /api/squadre/:squadraId/report-stagionale` `GET /api/calciatori/:playerId/report`
                                  `GET /api/squadre/:id/print-center-status`
    ├── player.js               — Calciatori CRUD, scadenze, career, career-matches, last-matches, injuries, move
                                  `GET /api/squadre/:squadraId/calciatori` `GET|PUT|DELETE /api/squadre/:squadraId/calciatori/:id` `PUT /api/squadre/:squadraId/calciatori/:tpId/ruolo-capitano`
                                  `GET|PUT /api/calciatori/:id` `GET /api/calciatori/:id/career` `GET /api/calciatori/:id/career-matches` `GET /api/calciatori/:id/last-matches`
                                  `GET /api/squadre/:squadraId/scadenze-mediche`
                                  `POST /api/squadre/:squadraId/svincola` `POST /api/squadre/:squadraId/riattiva` `POST /api/squadre/:squadraId/recupera` `GET /api/squadre/:squadraId/svincolati-workspace`
                                  `POST /api/squadre/:squadraId/aggrega` `POST /api/squadre/:squadraId/disaggrega` `GET /api/squadre/:squadraId/aggregabili`
                                  `GET|POST /api/injuries` `GET|PUT|DELETE /api/injuries/:id` `GET /api/players/:playerId/injuries` `GET /api/squadre/:teamId/injuries`
                                  `GET /api/giocatori/:id/valutazioni`
    ├── roster.js               — Import rosa XLS/Tuttocampo
                                  `POST /api/roster/parse-xls` `POST /api/roster/import-xls`
                                  `POST /api/roster/scrape-tuttocampo` `POST /api/roster/parse-html-tuttocampo` `POST /api/roster/parse-text-tuttocampo` `POST /api/roster/import-tuttocampo`
    ├── importCalendario.js     — PDF, testo SGS, import-log. Parser: formato standard `|` (Lazio, Lazio Elite) + variante `I/!` (Lombardia, Sicilia, Piemonte) + formato lineare Campania (auto-detect). Esporta: `findTeamInPdf`, `extractCalendar`, `isCampaniaFormat`, `findTeamInCampaniaPdf`, `extractCampaniaCalendar`
                                  `POST /api/calendario/parse-pdf` `POST /api/calendario/parse-text` `POST /api/calendario/extract` `POST /api/calendario/import` `GET /api/import-log`
    ├── importTuttocampo.js     — Scraping calendario TC, eventi, loghi automatici
                                  `POST /api/calendario/import-tuttocampo` `GET /api/partite/:matchId/eventi-tuttocampo` `POST /api/partite/:matchId/import-eventi-tuttocampo`
    ├── importConfirm.js        — Confirm TC, formations batch, matches-without-formation
                                  `POST /api/calendario/confirm-tuttocampo` `POST /api/import-formations-batch` `GET /api/matches-without-formation`
    ├── gazzettaRegionale.js    — Classifica, calendario, marcatori, loghi da GR API, wizard loghi
                                  `GET /api/gr/levels` `GET /api/gr/championships/:levelId` `GET /api/gr/groups/:levelId/:championshipId` `GET /api/gr/preview/:levelId/:championshipId/:groupId`
                                  `GET /api/gr/classifica/:teamId` `GET /api/gr/calendario/:teamId` `GET /api/gr/marcatori/:teamId`
                                  `POST /api/gr/import-calendario/:teamId` `POST /api/gr/import-loghi/:teamId` `PUT /api/gr/configure`
                                  `POST /api/gr/match-events/preview` `POST /api/gr/match-events/import`
                                  `POST /api/gr/logos-wizard` `POST /api/gr/logos-confirm` `GET /api/gr/logos-pending`
    ├── absence.js              — Segnalazione assenze atleti (notifiche, storico, motivi)
                                  `GET /api/absence/motivi` `POST /api/absence` `GET /api/absence/player/:playerId`
                                  `GET /api/absence/team/:teamId` `GET /api/absence/team/:teamId/week` `GET /api/absence/unread/:teamId`
                                  `PUT /api/absence/:id/read` `POST /api/absence/read-all/:teamId`
    ├── notification.js         — Comunicazioni in-app (convocazioni, avvisi, solleciti), conferme lettura, sollecito-certificato
                                  `GET /api/notifications/team/:teamId` `GET /api/notifications/unread` `POST /api/notifications` `DELETE /api/notifications-batch`
                                  `PUT /api/notifications/:id/read` `POST /api/notifications/read-all` `POST /api/notifications/guest-read`
                                  `GET|DELETE /api/notifications/:id` `GET /api/notifications/:id/receipts` `POST /api/notifications/reply`
                                  `POST /api/notifications/sollecito-certificato`
    ├── dashboard.js            — Endpoint aggregato dashboard (stats+top+partite+allenamenti+injuries+certificati)
                                  `GET /api/squadre/:id/dashboard`
    ├── fees.js                 — Fee config CRUD, quote generate, installments, pagamenti, rigenera batch
                                  `GET /api/fee-configs` `POST /api/fee-configs` `PUT /api/fee-configs/:id` `DELETE /api/fee-configs/:id`
                                  `POST /api/fee-configs/:id/rigenera` `PUT /api/fee-configs/:id/payment-info`
                                  `GET /api/fees` `POST /api/fees-generate` `DELETE /api/fees/:id` `DELETE /api/fees-batch`
                                  `POST /api/fees/notify` `GET /api/fees/guest`
                                  `POST /api/fees/archivio-ricevute` (ZIP ricevute stagione + CSV) `DELETE /api/fees/ricevute-stagione` (pulizia Storage + marca archived:)
                                  `PUT /api/fee-installments/:id/pay` `PUT /api/fee-installments/:id/unpay`
                                  `POST /api/fee-installments/:id/upload-ricevuta` (formati: PDF/JPG/PNG, max 5MB) `GET /api/fee-installments/:id/ricevuta` `PUT /api/fee-installments/:id/conferma-pagamento`
    ├── kit.js                  — Kit templates CRUD, stock generate/restock, assignments singoli e batch, bundle model, flusso ordine evaso
                                  `GET|POST /api/kit-templates` `GET|PUT|DELETE /api/kit-templates/:id`
                                  `GET /api/kit-stock` `POST /api/kit-stock/generate` `POST /api/kit-stock/restock`
                                  `GET /api/kit-bundles` `PUT /api/kit-bundles/segna-arrivati` `DELETE /api/kit-bundles/:id`
                                  `GET /api/kit-assignments` `POST /api/kit-assignments` `DELETE /api/kit-assignments/:id` `POST /api/kit-assignments/:id/sostituisci`
                                  `POST /api/kit-assignments-batch` `GET /api/kit-da-ordinare` `POST /api/kit-evadi-ordine`
                                  GET /kit-assignments restituisce {players, staff} (staff cross-categoria). batch-assign accetta is_staff+staff_id, azzera da_ordinare_kit per giocatori E staff.
    ├── checklist.js            — Checklist stagione: template per workspace, CRUD per player/team, generazione batch
                                  `GET|PUT /api/checklist-template` `GET|PUT /api/checklist/:playerId` `POST /api/checklist/:playerId/sync`
                                  `GET /api/checklist` `POST /api/checklist-generate`
    ├── clubOperations.js       — Endpoint aggregato /api/club-operations/summary (quote+kit+checklist+certificati)
                                  `GET /api/club-operations/summary`
    ├── registration.js         — Tesseramento: template CRUD, registrations CRUD/batch, sollecito documenti, auto-check certificato
                                  `GET|PUT /api/workspaces/:id/registration-template`
                                  `GET /api/squadre/:teamId/registrations` `POST /api/registrations` `GET|PUT|DELETE /api/registrations/:id`
                                  `POST /api/squadre/:teamId/registrations-batch` `DELETE /api/squadre/:teamId/registrations-batch`
                                  `GET /api/registrations/player/:playerId` `PUT /api/registrations/player/:playerId/anagrafica`
                                  `POST /api/registrations/:id/sollecito`
    ├── tournament.js           — Tornei CRUD (disabilitato in sidebar)
                                  `GET|POST /api/tornei` `GET|PUT|DELETE /api/tornei/:id`
    └── support.js              — Segnalazioni bug/supporto via email + gestione ticket superadmin
                                  `POST /api/support/ticket` (auth required — invia email + salva in DB; rate limit 5/giorno per user_id; superadmin: user_id=null)
                                  `GET /api/support/tickets` (solo superadmin — lista con filtri stato/workspace_id)
                                  `PUT /api/support/tickets/:id/rispondi` (risposta via email + chiude ticket; oggetto: [YFM] Risposta al Ticket #XXXXXXXX)
                                  `PUT /api/support/tickets/:id/stato` (cambia stato aperto/chiuso)
                                  `DELETE /api/support/tickets/:id` (elimina singolo)
                                  `DELETE /api/support/tickets/chiusi` (elimina tutti i chiusi)
```

### Script Utility
```
backend/scripts/
├── import-loghi-gr.js         — Batch download loghi da tutti i gironi GR
└── scrape-logos.js            — Scraping loghi da Tuttocampo
```

### Testing con Puppeteer
Puppeteer è disponibile via `npx` (cache in `~/.npm/_npx/`) e in `docs/commerciale/node_modules/puppeteer`.
Non è una dipendenza del progetto principale ma può essere usato per test E2E headless:
```bash
# Eseguire uno script di test
/Users/Raffaele/.nvm/versions/node/v24.18.0/bin/node -e "const p = require('/Users/Raffaele/.npm/_npx/55158e48eb5c59f7/node_modules/puppeteer'); ..."
# Oppure via npx
npx puppeteer ...
```
**Limiti**: richiede backend locale avviato dall'utente (porta 3002) e frontend su localhost:5173 (`npm run dev`).

### Endpoint Wizard Loghi (solo superadmin, locale)
- `POST /api/gr/logos-wizard` — body: `{levels: [1], championshipIds: ['49','55']}` → scan gironi, scarica nuovi, rileva aggiornamenti
- `POST /api/gr/logos-confirm` — body: `{decisions: [{fileName, nomeNorm, nome, action: 'accept'|'reject'}]}` → applica scelte
- `GET /api/gr/logos-pending` — lista loghi in `.pending/` per confronto

### Frontend Files

> Documentazione modulare dettagliata: ogni cartella `modules/NOME/` contiene `NOME_MODULE.md` con endpoint, tabelle DB, variabili YFM, dipendenze e note critiche. Utils e components trasversali documentati in `src/UTILS_COMPONENTS.md`.

```
frontend-v2/src/
├── main.js                    — Entry point, init app
├── router.js                  — Routing SPA
├── style.css                  — Stili globali + responsive
├── build-info.js              — Auto-generato (NON modificare)
├── services/
│   └── api.js                 — apiFetch wrapper con auth
├── utils/
│   ├── formatters.js          — Formattazione date, avatar colors
│   ├── ui.js                  — Loading spinner, toast
│   ├── capabilities.js        — Profili, capabilities, getUserCapabilities()
│   ├── sessionGuard.js        — Visibility check + inactivity timer
│   ├── offlineBuffer.js       — Buffer localStorage offline + auto-sync online
│   ├── codiceFiscale.js       — Calcolo CF + autocomplete comuni
│   ├── charts.js              — Grafici canvas (trend, barre)
│   └── teamMatch.js           — Utility partita (formazione, eventi)
├── components/
│   ├── DataGrid.js            — Tabella responsive (table desktop / card mobile)
│   ├── PageHelp.js            — Help interattivo contestuale
│   ├── helpData.js            — Dati help per pagina
│   └── layout/
│       ├── Sidebar.js         — Sidebar responsive
│       └── sidebarNav.js      — Nav filtrato per capabilities
└── modules/
    ├── auth/
    │   ├── login.js           — Login page
    │   ├── guest.js           — Guest view (routing differenziato per tipo)
    │   ├── guestAtleta.js     — Home Famiglia (tipo=famiglia: stats, allenamenti, partite, assenze, quote, tesseramento)
    │   ├── guestGenitore.js   — Home Ospite (tipo=ospite: solo partite/risultati pubblici, niente quote)
    │   └── absence.js         — Segnalazione assenza (guest)
    ├── admin/
    │   ├── users.js           — Gestione utenti
    │   ├── guestLinks.js      — Link guest CRUD
    │   └── workspaces.js      — Gestione workspace (superadmin)
    ├── team/
    │   ├── dashboard.js       — Dashboard principale
    │   ├── roster.js          — Rosa giocatori + import XLS
    │   ├── playerDetail.js    — Scheda giocatore (dettaglio, carriera, infortuni)
    │   ├── calendar.js        — Calendario partite
    │   ├── convocazioni.js    — Convocazioni
    │   ├── formazione.js      — Formazione pre-partita
    │   ├── distinta.js        — Distinta gara
    │   ├── matchCenter.js     — Match Center (eventi, formazione live, note)
    │   ├── matchDetail.js     — Dettaglio partita (read-only)
    │   ├── resultForm.js      — Form risultato partita
    │   ├── noteAvversario.js  — Note avversario
    │   ├── valutazioni.js     — Valutazioni giocatori
    │   └── squadre.js         — Selettore squadre
    ├── coach/
    │   ├── trainingCalendar.js  — Calendario allenamenti
    │   ├── trainingPresenze.js  — Presenze allenamenti
    │   ├── trainingSessions.js  — Sessioni/programma
    │   ├── trainingSettings.js  — Config settimana tipo
    │   ├── trainingData.js      — Dati/cache allenamenti
    │   ├── notifications.js     — Notifiche assenze
    │   └── tournaments.js       — Tornei (disabilitato)
    ├── performance/
    │   ├── stats.js           — Statistiche squadra/giocatori
    │   └── reports.js         — Report PDF
    ├── club/
    │   ├── club.js            — Pagina società
    │   ├── staff.js           — Gestione staff
    │   ├── seasonsCategories.js — Stagioni e categorie (wizard)
    │   ├── settings.js        — Impostazioni
    │   ├── workspace.js       — Dettaglio workspace
    │   ├── workspaceSwitcher.js — Switch workspace (superadmin)
    │   ├── fees.js            — Quote economiche (config, assegnazione, pagamenti)
    │   ├── kit.js             — Kit sportivo (template, stock, assegnazioni, auto-assign batch, vista magazzino, bundle model, stato parziale/fornitore, flusso ordine evaso, elimina bundle, help contestuale per tab)
    │   ├── checklist.js       — Checklist stagione (toggle items, barra progresso, filtri per item, template config)
    │   └── registration.js    — Tesseramento atleti
    └── import/
        └── importCenter.js    — Hub import (XLS, PDF, TC)

- **supportWidget.js** (`components/supportWidget.js`) — FAB ⚡ unificato in basso a destra. Click espande due opzioni: ❓ Guida (apre PageHelp popover, doppio-click = interattivo) e 🐛 Segnala (apre modal ticket). `initSupportWidget()` chiamata in `main.js` dopo `setupLayout()`. Non visibile su pagine print. Rate limit 5/giorno gestito lato backend (rimossa logica sessionStorage). Screenshot via upload o paste clipboard (max 2MB). Pagina da `window.YFM.currentPage`. Build da `BUILD_INFO.id`. Invia a `POST /support/ticket`.

- **supportTickets.js** (`modules/admin/supportTickets.js`) — Pagina gestione ticket solo superadmin. Lista espandibile con filtri stato (Aperti/Chiusi/Tutti). Dettaglio inline con form risposta, bottone Chiudi senza risposta, elimina singolo (confirm modal), pulizia massiva ticket chiusi (confirm con conteggio). Route: `supportTickets`. Sidebar: voce 🎫 Ticket visibile solo superadmin.

- **App**: https://youth-football-manager.vercel.app
- **Backend API**: https://youth-football-manager-backend.vercel.app/api
- **Repo**: https://github.com/ecopraf/youth-football-manager

---

## 📖 Documentazione Dettagliata

| Documento | Descrizione |
|-----------|-------------|
| `.agents/knowledge/VISION.md` | Missione, valori, modello business |
| `.agents/knowledge/ARCHITECTURE.md` | Stack, struttura, API, DB |
| `.agents/knowledge/ROADMAP.md` | Backlog, priorità, bug noti |
| `.agents/standards/CODING_STANDARDS.md` | Convenzioni codice, naming, git |
| `.agents/prompts/SYSTEM_PROMPT.md` | System prompt per agenti |
| `.agents/tasks/TEMPLATE.md` | Template per task |

---

## 🗄️ Schema Database

| Tabella | Descrizione | FK Chiave |
|---------|-------------|----------|
| `workspace` | Società/club | - |
| `season` | Stagione sportiva | workspace_id |
| `category` | Categorie (U14, U15...) con girone | workspace_id, girone TEXT |
| `competition` | Campionati | - |
| `team` | Squadra | season_id, category_id, classifica_url |
| `player` | Giocatore (codice_fiscale TEXT UNIQUE partial nullable) | - |
| `team_player` | Associazione giocatore-squadra | team_id, player_id, aggregato |
| `injury` | Infortuni giocatore | player_id, team_id |
| `match` | Partita | team_id, tipo_competizione TEXT, live_meta JSONB, formazione_meta JSONB |
| `match_event` | Eventi (GOAL, ASSIST, YELLOW...) | match_id, player_id, player_id_secondario |
| `match_formation` | Formazione (is_starter = fonte verità) | match_id, team_player_id, ordine |
| `match_statistics` | Statistiche dettagliate | match_id, team_player_id |
| `convocation` | Convocazioni | match_id, team_player_id, risposta TEXT, risposta_motivo TEXT, risposta_at TIMESTAMPTZ |

**Colonne notevoli `convocation`**: `risposta TEXT` (null=disponibile, 'indisponibile'), `risposta_motivo TEXT`, `risposta_at TIMESTAMPTZ`. Auto-impostato a 'indisponibile' alla pubblicazione se atleta ha già segnalato assenza per la data.
- Alla pubblicazione: se atleta ha già assenza per la data → auto `risposta='indisponibile'`
- Batch save: record con `risposta='indisponibile'` sono congelati (non eliminati/ri-inseriti)
- Endpoint `/convocati`: esclude `risposta='indisponibile'` dalla lista effettiva (distinta, PDF, formazione)
- Frontend convocazioni: checkbox disabled per giocatori con assenza pre-convocazione o indisponibilità post-convocazione
- Home atleta: bottone ❌ inline partita visibile solo PRIMA della pubblicazione; dopo mostra card stato (convocato/non convocato) + Vedi Convocazione
| `training` | Sessioni allenamento | team_id |
| `training_attendance` | Presenze allenamenti | training_id, team_player_id |
| `training_config` | Settimana tipo (giorni/orari) | team_id |
| `training_template` | Template programma seduta | team_id, created_by |
| `valutazione_partita` | Valutazioni | partita_id, calciatore_id |
| `staff` | Personale (con qualifiche JSONB) | workspace_id |
| `team_staff` | Staff assegnato a squadra | team_id, staff_id, ruolo_squadra |
| `facility` | Impianti sportivi | - |
| `document` | Documenti polimorfici | entita_tipo, entita_id |
| `users` | Utente sistema | workspace_id |
| `guest_token` | Token guest | utente_id |
| `import_log` | Storico importazioni | workspace_id, team_id, user_id |
| `team_logo` | Loghi squadre avversarie | nome, nome_normalizzato UNIQUE, logo_path, tc_team_id (777+ file in logos/) |
| `absence_notification` | Segnalazioni assenza atleti | player_id, team_id, training_id (nullable), data_allenamento, motivo, messaggio, letto |
| `notification` | Comunicazioni in-app (convocazioni, avvisi) | workspace_id, team_id, tipo, titolo, messaggio, riferimento_id, destinatario_profilo TEXT[], letto |

---

## 🔧 Workflow Raccomandato

### Per nuove feature:
```
1. Leggi .agents/knowledge/ per contesto
2. Pianifica modifiche
3. Implementa seguendo standards
4. Testa locally
5. Commit: git add . && git commit -m "tipo: descrizione"
6. Push: git push origin main
7. Verifica produzione (~2 min dopo)
```

### Per bug fix:
```
1. Riproduci il bug
2. Identifica causa
3. Implementa fix minima
4. Verifica fix
5. Commit + Push
```

---

## ⚽ Match Center — Lifecycle Partita

Match Center è il **single entry point** per tutte le operazioni partita (formazione, eventi, note).

### Flusso Live
```
▶️ Inizio 1°T → ⏸️ Fine 1°T → ▶️ Inizio 2°T → 🏁 Fine Partita
```

### Protezione Temporale
| Transizione | Tempo minimo | Categoria |
|---|---|---|
| Fine 1°T | 35/40/45 min | U14-15 / U16 / U17+ |
| Inizio 2°T | 10 min (intervallo fisso) | Tutte |
| Fine Partita | 35/40/45 min | U14-15 / U16 / U17+ |

- Bottone **disabilitato** (grigio) finché non passa il tempo minimo
- **Countdown** sotto il bottone: "⏸️ Intervallo · X min" o "⏳ Abilitato tra X min"
- **Override emergenza**: long-press 3 secondi → conferma "Forzare transizione?"

### Formazione
- `match_formation.is_starter` = fonte di verità formazione iniziale
- `formazione_meta.modulo` = modulo iniziale, `formazione_meta.modulo_finale` = se cambiato durante partita
- Partite terminate con sostituzioni: tab Formazione mostra sub-tabs **Finale** / **Iniziale**
- Durante live: formazione cristallizzata, solo `modulo_finale` aggiornabile

### Sostituzioni
- Max 7 per partita (contatore visibile "🔄 X/7")
- Drawer filtra: "Esce" = giocatori in campo, "Entra" = panchina

### Calendario
- Bottoni: **Convoca**, **Distinta**, **⚽ Match Center**
- Partite archiviate: MC in read-only

---

## ⚠️ Regole Importanti

- **NON modificare**: `frontend-v2/src/build-info.js` (auto-generato)
- **NON hardcodare**: credenziali, API keys
- **Deploy**: automatico su push a main
- **Build ID**: `v3.15.<git-hash>` (mostrato dopo `npm run build`)

---

## 🗄️ Regole Ottimizzazione DB

### Principio fondamentale: 1 query per N record

Ogni operazione batch DEVE usare una singola query SQL. MAI iterare con query individuali.

```javascript
// ❌ VIETATO
for (const token of tokens) {
  await supabase.from('guest_token').delete().eq('token', token);
}

// ✅ OBBLIGATORIO
await supabase.from('guest_token').delete().in('token', tokens);
```

### Endpoint batch
- Naming: `DELETE /api/risorsa-batch`, `PUT /api/risorsa-batch`
- Body: `{ ids: [...] }` o campo specifico (es. `{ tokens: [...] }`)
- Risposta: `{ success: true, deleted/updated: N }`
- Usare `WHERE id = ANY($1)` o `.in('campo', array)` di Supabase

### Quando usare pg diretto vs Supabase JS
| Caso | Usa |
|------|-----|
| CRUD semplice | `supabase.from()` |
| JOIN complessi, subquery | `pg` raw query |
| Transazioni atomiche | `pg` con `BEGIN/COMMIT` |
| Migrazioni DDL | `pg` raw query |

---

## 🧠 Regole Cache Frontend

### Architettura dual-layer

| Layer | Storage | TTL | Quando usare |
|-------|---------|-----|------|
| Memory | Variabile JS | 2 min | Dati DB che cambiano spesso (dashboard, stats) |
| Session | sessionStorage | 10 min | Dati esterni lenti e raramente aggiornati (classifica GR) |

### Invalidazione obbligatoria

Dopo ogni scrittura che modifica dati in cache, chiamare la funzione di invalidazione:

| Operazione | Invalidare |
|------------|------------|
| Salva risultato/eventi | `invalidateDashboardCache()` + `invalidateStatsCache()` |
| Archivia/sblocca/elimina partita | `invalidateDashboardCache()` + `invalidateStatsCache()` |
| Elimina tutte le partite | `invalidateDashboardCache()` + `invalidateStatsCache()` |
| Modifica roster | `invalidateStatsCache()` |
| Salva presenze allenamento | `invalidateDashboardCache()` |

### Lazy loading dati pesanti

API esterne lente (>500ms, es. Gazzetta Regionale) DEVONO essere caricate in modo lazy:
1. Render immediato con dati DB veloci (~150ms)
2. Placeholder visibile per sezione lazy
3. Caricamento asincrono senza bloccare la UI

### Cosa NON cachare
- Token/auth, dati in editing, risposte di scrittura

### Pattern standard
```javascript
let cache = { data: null, ts: 0 };
const TTL = 2 * 60 * 1000;

async function fetchCached(fetchFn) {
  if (cache.data && Date.now() - cache.ts < TTL) return cache.data;
  cache = { data: await fetchFn(), ts: Date.now() };
  return cache.data;
}
export function invalidateCache() { cache = { data: null, ts: 0 }; }
```

### 🔐 Credenziali Supabase (persistenti)

```
SUPABASE_URL=https://csxdlxbhcnyfppojwwzy.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeGRseGJoY255ZnBwb2p3d3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NTEzMTMsImV4cCI6MjA5NzMyNzMxM30.KTL6Z_Mwo_QzNidWt95YLqc7ZvdbfxyQdzxCT5uNRIw
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeGRseGJoY255ZnBwb2p3d3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc1MTMxMywiZXhwIjoyMDk3MzI3MzEzfQ.HZXGk1Xfz0EvSqewAoSCcgZ6gIQYLOP-54mE3YVHgBo
JWT_SECRET=aEj1OXdTHxSHD8iObjFov1jJ06RoyM1Ormf8KBb0uPI=
```

### 📡 Query Rapide Supabase
```bash
# Query tabella
curl -s 'https://csxdlxbhcnyfppojwwzy.supabase.co/rest/v1/workspace?select=*' \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### Modifiche Database
1. **Usa le API esistenti** quando possibili
2. **Se l'API non esiste**: fornisci query SQL dettagliate
3. **Prima di modificare**: verifica lo schema con `SELECT * FROM ... LIMIT 1`

### Modifiche Frontend
1. Segui CODING_STANDARDS.md per stile
2. Non modificare file generati automaticamente (`build-info.js`)
3. Testa responsive su mobile

### Modifiche Backend
1. Mantieni compatibilità con versioni precedenti
2. Aggiungi validazione input
3. Gestisci errori con `handleDbError()` (mai esporre messaggi Postgres raw)
4. Ogni INSERT/UPDATE su tabelle con UNIQUE constraint deve usare `handleDbError(error, res)`

### Deploy
1. **Non fare deploy manuale** - è automatico su push
2. Dopo ogni feature: commit + push
3. Verifica con `curl https://.../api/health`

### ⚠️ Deploy Landing Page (yfm-landing) — OBBLIGATORIO

La landing page si trova in `youth-football-manager-demo/landing/` (repo separato).
Il progetto Vercel `yfm-landing` **NON si triggera automaticamente** dal push su GitHub.

Dopo ogni modifica a file in `landing/`, eseguire SEMPRE:

```bash
cd /Users/Raffaele/Documents/Youth-Foorball-Manager/youth-football-manager-demo/landing
vercel --prod --yes
```

URL produzione: **https://yfm-landing.vercel.app**

---

## Workflow Raccomandato

### Per Nuove Feature

```
1. ANALISI
   - Leggi VISION e ROADMAP
   - Identifica file da modificare
   - Verifica se esiste già l'API/funzionalità

2. PIANIFICAZIONE
   - Crea task list
   - Valida con utente se complessa

3. IMPLEMENTAZIONE
   - Segui CODING_STANDARDS
   - Commit frequenti con messaggi descrittivi

4. VERIFICA
   - Build locale: npm run build
   - Test manuale se possibile
   - Verifica API con curl

5. DEPLOY
   - Push su main → trigger automatico
   - Attendi ~2 minuti
   - Verifica produzione
```

### Per Bug Fix

```
1. RIPRODUCI
   - Identifica i passaggi per replicare il bug
   
2. ANALIZZA
   - Leggi il codice rilevante
   - Verifica log browser console
   - Testa API con curl

3. FIX
   - Implementa la correzione minima
   - Non introduurre nuovi bug

4. VERIFICA
   - Testa la fix
   - Verifica non abbia impatto su altre parti

5. COMMIT
   - Messaggio: "fix: <breve descrizione bug>"
   - Push
```

---

## Checklist Prima di Commit

- [ ] Codice segue CODING_STANDARDS
- [ ] Build locale passa (`npm run build`)
- [ ] Nessun `console.log` left-over in produzione
- [ ] Variabili d'ambiente non hardcoded
- [ ] Accessibilità rispettata (title su icone)
- [ ] Errori gestiti con messaggi user-friendly

---

## Comandi Utili

```bash
# Setup locale
git clone https://github.com/ecopraf/youth-football-manager.git
cd youth-football-manager
cd frontend-v2 && npm install && npm run build

# Backend locale (se necessario)
cd backend && npm install && node api/index.js

# Verifica build
npm run build
# Output: Build ID: v3.15.XXXXXXX

# Deploy (automatico)
git add .
git commit -m "tipo: descrizione"
git push origin main

# Verifica produzione
curl https://youth-football-manager-backend.vercel.app/api/health
```

---

## File Sensibili

### NON MODIFICARE MAI
- `frontend-v2/src/build-info.js` (generato automaticamente)
- `frontend-v2/dist/` (output build)
- `node_modules/` (dipendenze)
- File con credenziali (`.env`)

### Variabili d'Ambiente
Le credenziali sono in AGENTS.md (repository context). Non esporle mai.

---

## Contesto Multi-Workspace

Il sistema supporta **multi-tenant**: ogni workspace è una società sportiva isolata.

**Regole**:
- Tutte le query includono `workspace_id`
- API `/auth/workspaces` per ottenere squadre utente
- Ogni workspace è una società sportiva isolata

---

## 🌐 Frontend Global State (`window.YFM`)

Tutte le variabili globali disponibili nel frontend dopo il login e la selezione squadra.

### Stato corrente (settato in `modules/team/squadre.js`)

| Variabile | Tipo | Descrizione | Quando disponibile |
|-----------|------|-------------|--------------------|
| `window.YFM.squadraId` | UUID | `team.id` della squadra selezionata | Dopo selezione squadra |
| `window.YFM.currentSeasonId` | UUID | `season.id` della stagione corrente | Dopo selezione squadra |
| `window.YFM.accessibleSeasons` | Array | Stagioni accessibili all'utente | Dopo selezione squadra |
| `window.YFM.allSquadre` | Array | Tutte le squadre della stagione | Dopo selezione squadra |

### Workspace (settato in `main.js` / `modules/auth/login.js`)

| Variabile | Tipo | Descrizione |
|-----------|------|-------------|
| `window.YFM.activeWorkspaceId` | UUID | `workspace.id` corrente |
| `window.YFM.workspaceInfo` | Object | `{id, nome, logo, societa_nome, ...}` |

### Helper functions (definite in `main.js`)

| Funzione | Ritorna | Uso |
|----------|---------|-----|
| `window.YFM.getUser()` | Object | Utente corrente (da localStorage) |
| `window.YFM.getSquadra()` | Object | Oggetto squadra corrente da `allSquadre` |
| `window.YFM.getSquadraName()` | String | Nome squadra (categoria) |
| `window.YFM.getSocietaName()` | String | Nome società (workspace) |
| `window.YFM.getWorkspaceLogo()` | String | URL logo workspace |
| `window.YFM.canRead(modulo)` | Boolean | Ha capability `read` sul modulo |
| `window.YFM.canWrite(modulo)` | Boolean | Ha capability `write` sul modulo |
| `window.YFM.isAuthenticated()` | Boolean | Token valido e non scaduto |
| `window.YFM.navigateTo(page, params)` | void | Naviga a pagina con parametri |
| `window.YFM.hasAccessToSquadra(id)` | Boolean | Utente ha accesso a quella categoria |

### Guest state (settato in `modules/auth/guest.js`)

| Variabile | Tipo | Descrizione |
|-----------|------|-------------|
| `window.YFM.guestToken` | String | Token guest corrente |
| `window.YFM.guestTeamId` | UUID | team_id per guest (auto-selezionato) |
| `window.YFM.guestPlayerId` | UUID | player_id (solo tipo `famiglia`) |
| `window.YFM.guestPlayerName` | String | Nome giocatore (solo tipo `famiglia`) |
| `window.YFM.guestSquadreAccesso` | Array | category_id accessibili |

> ⚠️ **ATTENZIONE**: `guestPlayerId`, `guestTeamId`, `guestPlayerName` sono variabili **in memoria** settate solo durante il flusso di login guest (`guest.js`). NON sopravvivono a un reload della pagina. Ogni modulo guest che le usa DEVE ripristinarle da `sessionStorage` come fallback:
> ```javascript
> if (!window.YFM.guestPlayerId) {
>   const gs = sessionStorage.getItem('yfm_guest');
>   if (gs) { try { const d = JSON.parse(gs); window.YFM.guestPlayerId = d.player_id || null; window.YFM.guestTeamId = d.team_id || null; window.YFM.guestPlayerName = d.player_name || null; } catch {} }
> }
> ```

### Preferenze utente (settate in `modules/team/dashboard.js`)

| Variabile | Tipo | Descrizione |
|-----------|------|-------------|
| `window.YFM.competizioneFiltro` | String | Filtro competizione salvato (`'tutte'`, `'campionato'`, `'ufficiali'`, `'amichevoli'`). Usato da dashboard e stats come default. Salvato in `users.preferenze_ui.competizione_filtro` |

### ⚠️ Errori comuni da evitare

| ❌ Sbagliato | ✅ Corretto | Note |
|---|---|---|
| `window.YFM.stagioneId` | `window.YFM.currentSeasonId` | `stagioneId` NON ESISTE |
| `window.YFM.seasonId` | `window.YFM.currentSeasonId` | Usare sempre `currentSeasonId` |
| `window.YFM.teamId` | `window.YFM.squadraId` | Il campo si chiama `squadraId` |
| `window.YFM.workspaceId` | `window.YFM.activeWorkspaceId` | Prefisso `active` |
| `window.YFM.user` | `window.YFM.getUser()` | È una funzione, non una proprietà |
| `loadXxx()` senza `await loadData()` | Chiamare `await loadData()` alla fine di `loadXxx()` | La funzione `load*` deve sempre popolare i dati dopo aver costruito il DOM e registrato gli event listener |
| `sessionStorage.getItem('yfm_guest_jwt')` | `JSON.parse(sessionStorage.getItem('yfm_guest')).jwt` | `yfm_guest_jwt` NON ESISTE — il JWT è dentro l'oggetto `yfm_guest` |
| `tipo === 'atleta'` in `setupGuestLayout` | `tipo === 'famiglia'` | Il valore reale nel DB è `famiglia`, non `atleta` (nome storico deprecato) |

### 🔄 Aggiornamento obbligatorio

Questa sezione DEVE essere aggiornata quando:
- Si aggiunge una nuova variabile a `window.YFM.*`
- Si aggiunge/modifica una helper function globale
- Si cambia il nome o il comportamento di una variabile esistente
- Si introduce un nuovo flusso di inizializzazione (es. nuovo tipo di login/guest)
- Si aggiunge una nuova tabella DB che entra nella gerarchia dati

### Gerarchia dati (DB → Frontend)

```
workspace (società)
 └── season (stagione: 2024-25)
      └── category (Under 15, Under 16...)
           └── team (squadra = category + season)
                ├── team_player (rosa: player + team)
                ├── match (partite)
                ├── training (allenamenti)
                ├── fee (quote economiche)
                └── team_staff (staff assegnato)
```

- `window.YFM.squadraId` = `team.id` (NON `category.id`)
- `window.YFM.currentSeasonId` = `season.id`
- Per filtrare dati per squadra+stagione: usare `team_id` (che già implica la stagione)
- Per filtrare dati cross-stagione: usare `player_id` + `season_id`

---

## Convenzioni API

### Risposte
```javascript
// Successo
{ success: true, data: {...} }

// Errore
{ success: false, error: 'Messaggio' }
```

### Endpoint Standard
```
GET    /api/<risorsa>           → Lista
GET    /api/<risorsa>/:id       → Dettaglio
POST   /api/<risorsa>           → Crea
PUT    /api/<risorsa>/:id       → Modifica
DELETE /api/<risorsa>/:id       → Elimina
```

---

## Design System

### Colori
```css
--primary: #667eea
--success: #27AE60
--warning: #F39C12
--danger: #E74C3C
--text: #333333
```

### Border Radius
- Card: 12px
- Card gradient: 16px
- Bottoni: 10px
- Input: 8px

### Effetti Hover
```css
.card:hover {
  transform: translateY(-8px) scale(1.03);
  box-shadow: 0 15px 30px rgba(0,0,0,0.2);
}
```

---

## Contatti e Credenziali

- **Email**: youthfootballmanager@gmail.com
- **Supabase**: nel repository context (AGENTS.md padre)
- **Backend API**: https://youth-football-manager-backend.vercel.app/api

---

## Riga di Comando Finale

Dopo ogni task completato:
```bash
git add .
git commit -m "tipo: descrizione - build v3.15.<hash>"
git push origin main
```

Il `<hash>` è il commit hash corrente (vedi `git rev-parse --short HEAD`).
