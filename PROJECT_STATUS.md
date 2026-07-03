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

### Backend (`backend/api/index.js` → Architettura Modulare)
- **Stack**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Architettura**: 13 router modulari montati in index.js (~130 righe)
- **Esport**: `module.exports = app;` per Vercel
- **CORS**: abilitato globalmente

#### Struttura Router
```
api/index.js → monta:
  routes/auth.js              — Login, register, users, guest
  routes/workspace.js         — Workspace, facility, stagioni
  routes/team.js              — Squadre CRUD
  routes/training.js          — Allenamenti, presenze, config
  routes/match.js             — Partite, convocazioni, formazione
  routes/staff.js             — Staff per distinta
  routes/admin.js             — Migrazioni schema
  routes/statistics.js        — Stats complete, top players
  routes/player.js            — Calciatori CRUD, scadenze
  routes/roster.js            — Import rosa XLS/Tuttocampo
  routes/importCalendario.js  — PDF, testo SGS, import-log
  routes/importTuttocampo.js  — Scraping calendario TC, eventi
  routes/importConfirm.js     — Confirm TC, formations batch
```

Ogni router è una factory function:
```javascript
function createXxxRouter({ supabase, authMiddleware, requirePermission }) {
  const router = express.Router();
  // ... endpoints
  return router;
}
module.exports = createXxxRouter;
```

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

#### Convenzione Naming (v2.0 - Giugno 2026)
- **Tabelle**: 🇬🇧 Inglese (es. `player`, `team`, `match`)
- **Colonne**: 🇮🇹 Italiano (es. `nome`, `cognome`, `data_nascita`)

#### Tabelle Principali
| Tabella (EN) | Descrizione | Colonne Chiave |
|--------------|-------------|----------------|
| `workspace` | Società/club | id, nome, logo_url, data_creazione |
| `users` | Utenti sistema | id, email, password_hash, nome, cognome, ruolo, workspace_id, is_superadmin, is_active, squadre_accesso, permessi JSONB |
| `season` | Stagioni sportive | id, workspace_id, nome, data_inizio, data_fine, attiva |
| `category` | Categorie (Under 14, etc.) | id, workspace_id, nome, tipo_campionato, anno_da, anno_a |
| `competition` | Campionati/Competizioni | id, nome, tipo, federazione, regione |
| `team` | Squadre per stagione | id, season_id, category_id, nome |
| `player` | Anagrafica calciatori | id, nome, cognome, data_nascita, ruolo_principale, matricola_figc |
| `team_player` | Assegnazione giocatori-squadra | id, team_id, player_id, numero_maglia, ruolo_preferito, stato, aggregato |
| `match` | Partite | id, team_id, data_ora, avversario, luogo, gol_casa, gol_ospite, archiviata, formazione_meta JSONB, note, note_avversario |
| `match_event` | Eventi partita | id, match_id, tipo_evento, minuto, player_id |
| `match_formation` | Formazioni tattiche | id, match_id, team_player_id, posizione, numero_maglia, is_starter, is_captain, ordine |
| `convocation` | Convocazioni | id, match_id, team_player_id, presente |
| `match_statistics` | Statistiche partita | id, match_id, team_player_id, minuti_giocati, gol, assist |
| `training` | Allenamenti | id, team_id, data_ora, durata_minuti, tipo, descrizione, note |
| `training_attendance` | Presenze allenamenti | id, training_id, team_player_id, presente, motivi_assenza |
| `training_config` | Settimana tipo | id, team_id, giorno_settimana, ora_inizio, ora_fine, luogo |
| `training_template` | Template allenamento | id, team_id, nome, programma JSONB, created_by |
| `staff` | Anagrafica personale | id, nome, cognome, ruolo, qualifiche |
| `team_staff` | Assegnazione staff a squadra | id, team_id, staff_id, ruolo_squadra |
| `facility` | Impianti sportivi | id, nome, indirizzo, citta |
| `document` | Documenti polimorfici | id, tipo, entita_tipo, entita_id, file_url |
| `guest_token` | Token guest temporanei | id, token, utente_id, tipo, squadre_accesso, scadenza |
| `valutazione_partita` | Valutazioni | id, partita_id, calciatore_id, voto |
| `import_log` | Storico importazioni | id, workspace_id, team_id, user_id, tipo, fonte, dettagli JSONB, record_importati, record_saltati, esito, errore, created_at |
| `team_logo` | Loghi squadre avversarie | id, nome, nome_normalizzato UNIQUE, logo_path, tc_team_id, created_at |

---

## 2b. Infrastruttura Proxy (Tuttocampo)

### Problema
Tuttocampo blocca tutti gli IP datacenter (Vercel, Cloudflare, AWS). Lo scraping automatico funziona solo da IP residenziali.

### Soluzione
- **Locale**: connessione diretta (IP residenziale dell'utente)
- **Produzione**: fallback manuale (l'utente copia/incolla dalla pagina TC)
- **Cloudflare Worker** (`tc-proxy.yfm-proxy.workers.dev`): deployato ma TC blocca anche CF
- **Env var Vercel**: `PROXY_TC_URL` configurata ma inefficace
- **Consiglio**: fare import rosa/calendario TC da backend locale (scrive nello stesso DB prod)

---

## 3. Sistema di Autenticazione e Autorizzazioni ✅ COMPLETATO

### Ruoli Utente
| Ruolo | Descrizione | Permessi |
|-------|-------------|----------|
| **Superadmin** | Owner sistema | Accesso completo a tutti i workspace |
| **Admin** | Amministratore workspace | Accesso completo al proprio workspace, gestisce utenti e link guest |
| **Allenatore** | Responsabile tecnico | Pieni poteri sulle squadre in `squadre_accesso` (o tutte se vuoto) |
| **Staff** | Collaboratore | Permessi granulari per modulo (configurabili dall'admin) |
| **Guest** | Ospite temporaneo | Solo lettura via JWT guest, limitato a squadre specifiche |

### Permessi Granulari (Staff)
Campo `permessi` JSONB su tabella `users`:
```json
{"rosa": "write", "partite": "write", "formazione": "read", "allenamenti": "write", "statistiche": "read", "guest_links": ""}
```
Valori: `""` (nessun accesso), `"read"` (sola lettura), `"write"` (lettura + scrittura)

### Matrice Permessi
| Azione | Superadmin | Admin | Allenatore | Staff (con permesso) | Guest |
|--------|:---:|:---:|:---:|:---:|:---:|
| Leggere dati (GET) | ✅ | ✅ | ✅ | ✅ (moduli assegnati) | ✅ (limitato) |
| Creare/modificare partite | ✅ | ✅ | ✅ | Se `partite: write` | ❌ |
| Formazione/Convocazioni | ✅ | ✅ | ✅ | Se `formazione: write` | ❌ |
| Aggiungere calciatori | ✅ | ✅ | ✅ | Se `rosa: write` | ❌ |
| Presenze allenamento | ✅ | ✅ | ✅ | Se `allenamenti: write` | ❌ |
| Creare workspace | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestire utenti | ✅ | ✅ | ❌ | ❌ | ❌ |
| Pagina Impostazioni | ✅ | ✅ | ❌ | ❌ | ❌ |

### Guest View
| Pagina | Genitore | Atleta |
|--------|:---:|:---:|
| Dashboard (risultati, prossima partita) | ✅ | ✅ |
| Rosa (nomi, ruolo, numero) | ✅ | ✅ |
| Dettaglio giocatore (telefono, documenti) | ❌ | ❌ |
| Calendario (partite, risultati) | ✅ | ✅ |
| Statistiche | ❌ | ✅ |
| Qualsiasi azione di scrittura | ❌ | ❌ |

### Flusso Guest
```
Admin crea link guest → /api/auth/guest-link
Genitore/Atleta accede a /guest/[token]
Backend verifica token → genera JWT guest (24h)
Frontend salva JWT → sidebar ridotta → navigazione limitata
Ogni GET funziona (JWT valido) | Ogni POST/PUT/DELETE → 403
```

### Gestione Utenti (Admin)
- CRUD completo utenti da pannello Admin
- Campo `squadre_accesso` per limitare accesso per categoria
- Campo `permessi` JSONB per permessi granulari staff
- Campo `is_active` per disattivare utenti senza eliminarli
- Campo `is_superadmin` per permessi speciali
- UI: sezione permessi visibile solo quando ruolo = staff

### Link Guest
- Generazione link temporanei con scadenza configurabile
- URL formato: `/guest/{token}`
- Tipi: `atleta` o `genitore`
- Accesso limitato alle categorie selezionate
- Revoca immediata dei link
- JWT guest generato alla verifica (24h validità)

### Endpoint Auth
- `POST /api/auth/login` - Login (restituisce squadre_accesso, ruoli, permessi)
- `POST /api/auth/register` - Registrazione (solo admin/superadmin)
- `GET /api/auth/users` - Lista utenti (Admin)
- `POST /api/auth/users` - Crea utente (Admin)
- `PUT /api/auth/users/:id` - Modifica utente + permessi (Admin)
- `DELETE /api/auth/users/:id` - Disattiva utente (Admin)
- `POST /api/auth/guest-link` - Genera link guest (Admin)
- `GET /api/auth/guest-links` - Lista link guest (Admin)
- `DELETE /api/auth/guest-link/:token` - Revoca link (Admin)
- `GET /api/guest/:token` - Verifica guest → restituisce JWT guest
- `GET /api/auth/workspaces` - Workspace accessibili (autenticato)

### Endpoint Calendario/Import
- `POST /api/calendario/parse-pdf` - Upload PDF + cerca squadra (multipart: pdf + searchName)
- `POST /api/calendario/extract` - Estrai calendario per categoria (multipart: pdf + searchName + categoria + girone)
- `POST /api/calendario/import` - Conferma e inserisci partite nel DB (JSON: squadraId + partite[])
- `DELETE /api/squadre/:id/partite-all` - Elimina TUTTE le partite di una squadra + eventi/formazioni/convocazioni

---

## 4. Stato Funzionale dei Moduli

### ✅ OPERATIVI

| Modulo | Percorso | Descrizione |
|--------|----------|-------------|
| Dashboard | `modules/team/dashboard.js` | Widget riepilogo, prossima partita, trend GF/GS/DR, top marcatori/assist/presenze, badge competizione, risultati colorati con layout casa/trasferta (logo+nome squadra, score centrato), classifica GR live, calendario GR navigabile con frecce ◀▶, top marcatori regionali/girone, ultima giornata GR con loghi. Staff sotto risultati (desktop) o in fondo (mobile). Guest view semplificata |
| Rosa | `modules/team/roster.js` | CRUD giocatori, scadenze mediche, filtri, selezione multipla, svincolo/riattivazione, aggregazione da categorie inferiori (badge AGG), recupera svincolati workspace, import XLS/TC |
| Calendario | `modules/team/calendar.js` | CRUD partite, pallino lampeggiante, badge sezioni pill, archiviazione, import PDF SGS/LND, import CSV, cancella calendario, guest view |
| Convocazioni | `modules/team/convocazioni.js` | Vincoli min/max, PDF, sola lettura se archiviata |
| Distinta | `modules/team/distinta.js` | Layout FIGC, 24 righe, staff con dropdown selezione + inserimento manuale, stampa PDF |
| Match Detail | `modules/team/matchDetail.js` | Eventi, timeline per tempo, statistiche |
| Note Avversario | `modules/team/noteAvversario.js` | Ereditarietà automatica note |
| Scheda Giocatore | `modules/team/playerDetail.js` | Profilo, stats, carriera, ultime partite, creazione nuovo giocatore (stessa UI), validazione anno nascita, normalizzazione nomi |
| Formazione | `modules/team/formazione.js` | Campo visuale con drag&drop, 8 moduli tattici, posizioni custom persistenti |
| Eventi/Risultato | `modules/team/resultForm.js` | Inserimento eventi, sola lettura se archiviata |
| Valutazioni | `modules/team/valutazioni.js` | Valutazioni partite |
| Allenamenti | `modules/coach/trainingSessions.js` | 📋 Sedute: calendario + programma fasi strutturato + template |
| | `modules/coach/trainingPresenze.js` | 🙋 Presenze: calendario + presenze batch + riepilogo % |
| | `modules/coach/trainingSettings.js` | ⚙️ Impostazioni: settimana tipo + gestione template (card compatte + modale modifica) |
| | `modules/coach/trainingData.js` | Caricamento dati condiviso per le 3 sotto-pagine |
| | `modules/coach/trainingCalendar.js` | Calendario mensile condiviso (presenze, programmati, partite) |
| Stats | `modules/performance/stats.js` | 5 widget, alert diffidati, tabella completa con sorting per colonna |
| Help | `components/PageHelp.js` | Bottone ? contestuale con guida per ogni pagina |
| Stats | `modules/performance/stats.js` | Disciplina (ammonizioni, espulsioni) |
| Reports | `modules/performance/reports.js` | Report Partita (fallback convocazioni), Stagionale (top players, match per competizione), Giocatore (event history), commento social |
| Settings | `modules/club/settings.js` | Stagione, categoria, staff |
| Stagioni & Categorie | `modules/club/seasonsCategories.js` | CRUD stagioni (attiva/disattiva), CRUD categorie, creazione team (category+season), card team con contatori giocatori/staff |
| Staff | `modules/club/staff.js` | Due sezioni: Staff Tecnico (filtrato per categorie_accesso per allenatore) + Organigramma Societario (solo admin). TC paste import. Visibile a admin + allenatore |
| Workspace | `modules/club/workspace.js` | Info società, caricamento facility |
| Import Center | `modules/import/importCenter.js` | Pagina centralizzata con 6 card import TC + 4 card Gazzetta Regionale, wizard testo SGS, batch formazioni TC, wizard GR 3-step, log storico DB |
| Loghi Squadre | `frontend-v2/public/logos/` | 777+ loghi PNG da Tuttocampo e GR, matching fuzzy, logo workspace, convocazioni layout PDF (3 colonne), dettaglio partita logo+nome vs logo+nome, distinta 80px, header 40px, wizard batch GR (superadmin) con confronto aggiornamenti |
| Gazzetta Regionale | `backend/api/routes/gazzettaRegionale.js` | Import classifica/calendario/marcatori/loghi da GR API pubblica, wizard config, fuzzy match, dashboard widget |
| Workspace Switcher | `modules/club/workspaceSwitcher.js` | Dropdown select nella sidebar per superadmin |
| Workspace CRUD | `modules/admin/workspaces.js` | Gestione workspace superadmin: create/edit/delete cascade, TC paste parser, auto-logo fuzzy match |
| Stagioni & Categorie | `modules/club/seasonsCategories.js` | CRUD stagioni, categorie, creazione team, card con contatori giocatori/staff (solo admin) |
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
| Dashboard Badge Competizione | dd364a3, 61a3f87 | Badge colorati competizione, risultati colorati V/P/S, pallino avversario |
| Calendario Pallino Lampeggiante | 634ec74, 0310aa0 | Indicatore prossimo passo con animazione, badge sezioni pill |
| Demo Mode Rimosso | 1b11426, 12bb78a | Rimosso sistema demo dal frontend principale |
| Guest View Migliorata | - | Dashboard semplificata, calendario guest, sidebar ridotta |
| Login Flow Fix | - | Workspace selector superadmin, layout prima del data loading |
| PDF Import Calendario | - | Parser SGS/LND 3 colonne, campi da gioco, multi-categoria |
| Cancella Calendario | - | Elimina tutte le partite + dati associati in batch |
| Staff Ruoli | - | Aggiunti Direttore Sportivo, Osservatore; icona 👔 |
| Import Tuttocampo Marcatori | - | Estrazione scorers da AJAX, fuzzy match cognome, eventi GOAL salvati con player_id |
| Import Rosa XLS | - | Tabulato FIGC .xlsx, parsing CF per cognomi composti, raggruppamento per anno nascita |
| Rosa: Ruolo non assegnato | - | Sezione visibile per giocatori importati senza ruolo |
| Import Rosa Tuttocampo | bed0274 | Scraping rosa da Tuttocampo, fix URL/token/ruolo |
| PDF Calendario Elite | - | Regex fix per formato "UNDER XX REG. ECCELLENZA MASCH" |
| Facility Campo di Casa | - | Endpoint, settings UI, indirizzo in convocazioni/distinta |
| Workspace Switcher v2 | - | Dropdown select in sidebar per superadmin, rimosso modal |
| Import TC Formazioni | - | Scraping formazioni da MatchFormations.php, fuzzy match, convocazioni+formazioni+eventi |
| Gazzetta Regionale | f0d4423 | Import classifica/calendario/marcatori/loghi da API pubblica GR, wizard config, dashboard widget, fuzzy match |
| Dashboard casa/trasferta | 56259b8 | Risultati con layout corretto casa/trasferta, nome società + loghi, score centrato, match detail invertito in trasferta |
| Sidebar riordinata | 56259b8 | Dashboard → Team → Performance → Coach → Club → Admin |
| Fix penalità classifica | 56259b8 | Suffisso (-N) rimosso dal nome, mostrato come badge rosso separato |
| Calendario GR navigabile | (pending) | Widget dashboard con frecce ◀▶ per scorrere tutte le giornate, solo visualizzazione live da GR |
| Top Marcatori dashboard | (pending) | Regionali (top 10 assoluti) + Girone (filtrati per squadre classifica) side-by-side |
| Staff workspace isolation | 16bb36b | Staff page usa activeWorkspaceId per superadmin |
| Staff tecnico/societario | 12e7dc5 | Pagina staff separata in due sezioni, visibile anche ad allenatore |
| Staff widget fix | 92c10e1 | Solo ruolo esatto 'dirigente', rimosso Giannini da team_staff |
| Stagioni & Categorie | b140eef | Pagina admin CRUD stagioni, categorie, creazione team |
| Team counters | 40c6736 | Contatori giocatori/staff nelle card team pagina Stagioni |
| Gestione giocatori avanzata | 3f7b8ae | Validazione anno nascita per categoria, normalizzazione nomi, creazione da playerDetail, custom alert modale, DELETE endpoint, svincolo/riattivazione, aggregazione categorie inferiori, recupera svincolati workspace |
| Import Center | - | Pagina centralizzata 6 card, parser testo SGS, batch formazioni TC, log storico DB, voce sidebar |
| Loghi Squadre TC + GR | - | 777+ loghi PNG da TC e GR, matching fuzzy acronimi, logo workspace, wizard batch GR (superadmin), confronto aggiornamenti pending |

### ⏸️ SOSPESI

| Funzionalità | Note |
|--------------|------|
| Valutazioni Giocatore | Valutazioni tecniche per stagione/partita |
| Filtro Categorie | Staff vede solo squadre assegnate |

### 🔴 DA IMPLEMENTARE

| Funzionalità | Note |
|--------------|------|
| Import Tuttocampo Fase 3 | Archiviazione automatica, gestione conflitti duplicati |
| Import Center miglioramenti | Rilevamento duplicati, matching intelligente cross-import |
| Multi-istanza | Supporto multiple società |

---


## 5. Demo Standalone ✅

> ⚠️ **La demo è un repository separato** (`youth-football-manager-demo`) con deploy indipendente.
> Il progetto principale NON contiene più codice demo, bottoni demo, o modalità demo.

### Demo Standalone
- **URL**: https://youth-football-manager-demo.vercel.app
- **Repository**: https://github.com/ecopraf/youth-football-manager-demo
- **Landing Page**: https://yfm-landing.vercel.app

### Differenza con la Demo nel Progetto Principale

| Aspetto | Progetto Principale | Demo Standalone |
|---------|---------------------|-----------------|
| Backend | Richiesto (Supabase) | Non richiesto |
| Dati | Salvati su DB | Salvati in localStorage |
| Deploy | Vercel + Backend | Solo Vercel (frontend) |
| Uso | Produzione reale | Prova senza account |

### Dati Demo Precaricati (Standalone)

| Tipo | Contenuto |
|------|-----------|
| Workspace | SSD New Team |
| Squadre | Under 19, Under 17 |
| Giocatori | 20 giocatori con stats |
| Partite | 7 partite (2 future, 5 terminate) |
| Eventi | Gol, assist per partite terminate |
| Convocazioni | Per partite future |
| Formazioni | Per partite terminate |
| Allenamenti | 30 sessioni storiche precaricate |
| Statistiche | Punti, V/P/S, GF/GS, DR |
| Top Players | Marcatori, assist, presenze |

### Struttura File Demo Standalone

| File | Percorso | Descrizione |
|------|----------|-------------|
| `demo.js` | `demo/frontend/src/modules/demo/demo.js` | DemoManager + MiniMissionManager |
| `DemoPersistence.js` | `demo/frontend/src/modules/demo/DemoPersistence.js` | Persistenza localStorage |

### Persistenza Demo Standalone

Le modifiche vengono salvate in `localStorage` sotto la chiave `yfm_demo_persistence`:

```javascript
window.YFM.demoPersistence.saveMatchResult(matchId, golCasa, golOspiti)
window.YFM.demoPersistence.addEvent(matchId, { tipo, minuto, player_id })
window.YFM.demoPersistence.saveFormation(matchId, formation)
window.YFM.demoPersistence.saveConvocation(matchId, playerIds)
window.YFM.demoPersistence.saveTrainingPresence(trainingId, { presenti, assenti })
window.YFM.demoPersistence.initTrainingHistory(giocatori) // 30 sessioni precaricate
window.YFM.demoPersistence.reset() // Resetta tutti i dati
```

### Riepilogo Presenze Allenamenti (Demo Standalone)

La sezione "Riepilogo Presenze" mostra:
- Numero totale sessioni per giocatore
- Presenze totali
- Assenze totali
- Percentuale presenze
- Assenze nell'ultima settimana

### ID Speciali Demo

| Tipo | ID |
|------|-----|

---

## 6. Logica Archiviazione Partite

### Campo Database
- Tabella: `match`
- Campo: `archiviata` (boolean, default false) - nota: nel nuovo schema è `archiviata` (femminile) in italiano

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

## 7. Routing e Navigazione

Il router (`router.js`) definisce le pagine accessibili dalla sidebar:

```javascript
window.YFM.pages = {
  login:      () => import('./modules/auth/login.js'),
  guest:      () => import('./modules/auth/guest.js'),
  users:      () => import('./modules/admin/users.js'),
  guestLinks: () => import('./modules/admin/guestLinks.js'),
  dashboard:  () => import('./modules/team/dashboard.js'),
  roster:     () => import('./modules/team/roster.js'),
  calendar:   () => import('./modules/team/calendar.js'),
  matchDetail: () => import('./modules/team/matchDetail.js'),
  convocazioni: () => import('./modules/team/convocazioni.js'),
  formazione: () => import('./modules/team/formazione.js'),
  playerDetail: () => import('./modules/team/playerDetail.js'),
  training:   () => import('./modules/coach/trainingSessions.js'),
  trainingSessions: () => import('./modules/coach/trainingSessions.js'),
  trainingPresenze: () => import('./modules/coach/trainingPresenze.js'),
  trainingSettings: () => import('./modules/coach/trainingSettings.js'),
  stats:      () => import('./modules/performance/stats.js'),
  reports:    () => import('./modules/performance/reports.js'),
  settings:   () => import('./modules/club/settings.js'),
  seasonsCategories: () => import('./modules/club/seasonsCategories.js'),
  staff:      () => import('./modules/club/staff.js'),
  importCenter: () => import('./modules/import/importCenter.js'),
  workspaces: () => import('./modules/admin/workspaces.js'),
};
```

### Ordine Sidebar
1. 📊 Dashboard
2. 👥 **Team** — Rosa, Calendario, Import Center
3. 📈 **Performance** — Statistiche, Report
4. 🎯 **Coach** — Allenamenti (Sedute, Presenze, Impostazioni)
5. 🏢 **Club** — Stagioni (admin), Impostazioni (admin), Staff (admin + allenatore)
6. 🔐 **Amministrazione** — Workspace (superadmin), Utenti (admin), Link Guest (admin + allenatore)

Navigazione: `window.YFM.navigateTo('nomePagina')`

---

## 8. Servizi e Utility

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

## 9. Linee Guida per Collaboratori

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

## 10. Roadmap MVP 2026

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
- [x] Import rosa da XLS (tabulato FIGC)
- [x] Preview anteprima dati con raggruppamento per anno
- [x] Gestione errori e deduplicazione
- [ ] Wizard import CSV (partite)
- [ ] Wizard import CSV (eventi)

#### Core Tuttocampo
- [x] Parser URL Tuttocampo
- [x] Web scraping partite (calendario AJAX)
- [x] Web scraping risultati
- [x] Web scraping marcatori (da `<ul class="scorers">` in AJAX)
- [x] Fuzzy match marcatori vs rosa
- [ ] Web scraping rosa (non prioritario, XLS è più affidabile)

#### Centro Importazioni
- [ ] Log storico importazioni
- [ ] Rilevamento duplicati
- [ ] Matching giocatori esistenti
- [ ] Report finale import

### 📊 Milestone

| Data | Milestone | Stato |
|------|-----------|-------|
| 23 Giugno 2026 | Auth FASE 1 completata | ✅ **COMPLETATA** |
| 15 Luglio 2026 | Import Tuttocampo + XLS | ✅ **COMPLETATA** |
| 20 Luglio 2026 | Import Center + Formazioni TC | ✅ **COMPLETATA** |
| 15 Agosto 2026 | Polish Import Center (duplicati, matching) | ⏳ |
| 1 Settembre 2026 | Polish e test | ⏳ |
| 15 Settembre 2026 | MVP STABILE | ⏳ |

---

## 11. Deploy

### Progetti Collegati

| Progetto | URL | Repository |
|----------|-----|------------|
| **Demo Standalone** | https://youth-football-manager-demo.vercel.app | `youth-football-manager-demo` |
| **Landing Page** | https://yfm-landing.vercel.app | `youth-football-manager-demo` |

### Frontend Principale (Vercel)
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

### Accesso Demo
Per provare l'applicazione senza account, usa la **Demo Standalone**:
- **URL**: https://youth-football-manager-demo.vercel.app
- Dati precaricati: 20 giocatori, 7 partite, 30 sessioni allenamento
- Tutti i dati in localStorage (nessun backend richiesto)

---

## 12. Ultimi Commit

| Hash | Descrizione |
|------|------------|
| 40c6736 | feat: contatori giocatori/staff nelle card team della pagina Stagioni |
| b140eef | feat: pagina Stagioni & Categorie per admin (CRUD stagioni, categorie, creazione team) |
| 951de11 | fix: usa categorie_accesso (non squadre_accesso) per filtro staff allenatore |
| eb931fd | fix: allenatore può accedere alla pagina staff tecnico |
| 12e7dc5 | feat: separa staff tecnico da organigramma societario |
| 92c10e1 | fix: staff widget solo ruoli squadra (dirigente esatto), rimosso Giannini da team_staff |
| 16bb36b | fix: staff page usa activeWorkspaceId per superadmin workspace switching |
| e825b51 | feat: report endpoints backend (partita/stagionale/giocatore), fix typo INVIOLATA, import loghi GR, aggiorna docs |
| 3665480 | feat: gestione workspace CRUD con cascade delete, parser TC per workspace e staff, fix aggregazione e filtri rosa |
| 3f7b8ae | feat: aggregazione giocatori da categorie inferiori con badge AGG, filtro, recupera svincolati workspace |
| c779163 | feat: gestione svincolo giocatori con riattivazione, sezione svincolati collassabile |
| 003634b | feat: custom alert modale con titolo Youth Football Manager |
| a2d6598 | feat: creazione giocatore usa stessa pagina di modifica (playerDetail) |
| 5123a6a | fix: validazione anno nascita con limite superiore (anno_da+2), rinomina sezione Dati Giocatore |
| f833b68 | fix: aggiunto endpoint DELETE /squadre/:id/calciatori/:id mancante |
| 9d15fe7 | feat: validazione anno nascita per categoria + normalizzazione nome/cognome |
| 56259b8 | feat: dashboard risultati casa/trasferta, fix penalità classifica, riordino sidebar, ultima giornata GR con loghi |
| 25e5277 | docs: aggiorna documentazione con integrazione Gazzetta Regionale + fix label import risultati |
| f0d4423 | feat: integrazione Gazzetta Regionale — classifica, calendario, marcatori, loghi, wizard config, dashboard widget |
| (pending) | feat: wizard loghi batch GR — scan campionati selezionati, download nuovi, confronto aggiornamenti con provenienza, UI pending (superadmin) |
| (pending) | fix: card Import Center visibili solo superadmin — corretto window.YFM.getUser() vs currentUser |
| (pending) | feat: apiFetch timeout configurabile (default 30s, wizard 300s) |
| 2bc61df | feat: fallback manuale import rosa TC (supporta testo copiato + HTML) |
| c5044c7 | fix: usa fetch nativo per proxy TC |
| b549848 | feat: supporto Cloudflare Worker proxy per TC |
| 34ab64e | feat: migliora loghi (dettaglio, convocazioni come PDF, distinta più grandi) + rinomina workspace Albalonga |
| af378c0 | fix: normalizza accenti (Citta→Città) nell'import PDF/testo SGS |
| 02f3664 | style: ingrandisce logo workspace nella header (32→40px) |
| (pending) | refactor: modularizzazione completa backend — 13 router, index.js da ~2000 a ~130 righe |
| (pending) | feat: Import Center con 6 card, parser testo SGS, batch formazioni TC, log storico DB |
| (pending) | feat: import formazioni Tuttocampo (MatchFormations.php scraping) |
| (pending) | feat: workspace switcher dropdown nella sidebar per superadmin |
| (pending) | feat: facility (campo di casa) in convocazioni e distinta |
| (pending) | fix: PDF calendario regex per formato Elite/Eccellenza |
| (pending) | fix: import rosa Tuttocampo (URL, token, ruolo, en-dash) |
| bed0274 | feat: import rosa Tuttocampo + fix vari |
| fc00806 | docs: manuale utente riscritto completamente (v2.0) |

---

*Ultimo aggiornamento: 8 Luglio 2026 (Staff isolation, staff tecnico/societario, pagina Stagioni & Categorie, team counters)*

---

## 13. Utenti di Sistema

### Superadmin
| Ruolo | Email | Password | Note |
|-------|-------|----------|------|
| Superadmin | coppola.raffaele@gmail.com | raffaele78 | Sviluppatore/Owner |

### Utenti di Test - Production

| Nome | Ruolo | Email | Password | Workspace |
|------|-------|-------|----------|-----------|
| Matteo Urilli | Allenatore | matteo@urilli.it | mister | DF Academy |
| Francesco Annese | Admin | francesco@annese.it | annex | Albalonga |

### Utenti di Test - Demo

| Ruolo | Email | Password | Note |
|-------|-------|----------|------|

---

## 14. Workspace di Test - SSD New Team

### Creazione Workspace Test
Per creare il workspace di test SSD New Team, eseguire lo script SQL:
```
SQL/ssd-new-team-full.sql
```

### Dati Inseriti

| Elemento | Quantità | Note |
|----------|----------|------|
| Workspace | 1 | SSD New Team |
| Stagione | 1 | 2025/26 |
| Squadre | 6 | U14, U15, U16, U17, U18, U19 |
| Giocatori | 108 | 18 per categoria |
| Partite | 90 | 15 per categoria (10 archiviate + 5 future) |
| Eventi | ~50 | Gol, assist, cartellini |
| Allenamenti | 6 configurazioni | 2-3 sedute a settimana |
| Utenti | 3 | Admin, Allenatore, Staff |

### Credenziali Accesso

| Ruolo | Email | Password |
|-------|-------|----------|
| Admin | admin@ssdnewteam.it | newteam_admin |
| Allenatore | roberto.bianchi@ssdnewteam.it | newteam_admin |
| Staff | staff@ssdnewteam.it | newteam_admin |

### Caratteristiche Dati
- **Giocatori**: Nomi reali italiani, date di nascita coerenti con categoria
- **Partite**: Risultati realistici (vittorie/sconfitte/pareggi)
- **Eventi**: Marcatori, assist, cartellini gialli/rossi
- **Avversari**: Squadre reali del territorio romano
- **Allenamenti**: Configurazione settimanale per ogni categoria
