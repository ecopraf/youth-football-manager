# Youth Football Manager — Development Plan

> **Fonte di verità unica** per lo stato del progetto, task, dipendenze e priorità.
> Ultimo aggiornamento: 18 Luglio 2026 | Versione: v3.16 | Build: v3.16.33

---

## 1. Stato Attuale

| Campo | Valore |
|-------|--------|
| Versione | v3.16 |
| Target MVP | 15 Settembre 2026 |
| Frontend | Vite + JS ES Modules → Vercel |
| Backend | Node.js/Express (17 router) → Vercel |
| Database | Supabase PostgreSQL |
| Workspace attivi | Albalonga, DF Academy, Polisportiva Ciampino |

---

## 2. Moduli — Stato Operativo

| Modulo | Stato | File principali |
|--------|-------|-----------------|
| Auth & Permessi | ✅ | routes/auth.js, modules/auth/, utils/sessionGuard.js |
| Dashboard | ✅ | modules/team/dashboard.js (personalizzabile: riordino + show/hide widget con preferenze in users.preferenze_ui, GR card con sfondo sfumato, layout 2-col desktop / card separate mobile) |
| Rosa (Roster) | ✅ | modules/team/roster.js, routes/player.js |
| Calendario | ✅ | modules/team/calendar.js, routes/match.js |
| Convocazioni | ✅ | modules/team/convocazioni.js |
| Formazione | ✅ | modules/team/formazione.js |
| Distinta | ✅ | modules/team/distinta.js |
| Match Center | ✅ | modules/team/matchCenter.js (single entry point partita: eventi live, formazione con sub-tabs Iniziale/Finale, sostituzioni drag/tap, modulo_finale tracking, protezione temporale transizioni, override emergenza long-press 3s) |
| Allenamenti | ✅ | modules/coach/training*.js, routes/training.js |
| Statistiche | ✅ | modules/performance/stats.js, routes/statistics.js |
| Report | ✅ | modules/performance/reports.js |
| Import Center | ✅ | modules/import/importCenter.js |
| Staff | ✅ | modules/club/staff.js, routes/staff.js |
| Workspace CRUD | ✅ | modules/admin/workspaces.js |
| Stagioni & Categorie | ✅ | modules/club/seasonsCategories.js (redesign v2) |
| Guest View | ✅ | modules/auth/guest.js |
| Help Interattivo | ✅ | components/PageHelp.js, components/helpData.js |
| Loghi Squadre | ✅ | 765 loghi, wizard GR, dedup hash MD5 |
| Gazzetta Regionale | ✅ | routes/gazzettaRegionale.js |
| Tornei | ⏸️ | modules/coach/tournaments.js (disabilitato) |
| Infortuni | ✅ | routes/player.js, modules/team/playerDetail.js, dashboard.js |
| Visite Mediche | ✅ | utils/certificati.js, dashboard.js, convocazioni.js (badge+banner) |
| Valutazioni | ⚠️ | Parziale (tabella esiste, UI incompleta) |
| Print Center | ✅ | modules/team/printCenter.js, modules/print/*.js (EPIC 16) |

---

## 3. Epics & Micro-Task

### EPIC 1: Pulizia DB — Rimuovere ridondanze team

> Le colonne `allenatore_id/dirigente_id/preparatore_id/portieri_id` su `team` sono ridondanti perché esiste `team_staff`.

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 1.1 | DROP colonne staff da tabella `team` | ✅ | — | migrazione SQL | ~3min |
| 1.2 | Rimuovere riferimenti backend (nullify on delete, query) | ✅ | 1.1 | routes/match.js, routes/team.js | ~10min |
| 1.3 | Verificare frontend (distinta, staff widget) usi solo `team_staff` | ✅ | 1.2 | distinta.js, dashboard.js | ~5min |
| 1.4 | Aggiornare DATABASE_SCHEMA.md | ✅ | 1.1 | .agents/knowledge/ | ~3min |

---

### EPIC 2: Modulo Infortuni

> Tracciare infortuni con date, tipo, gravità. Cambio automatico stato giocatore.

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 2.1 | CREATE TABLE `injury` | ✅ | — | migrazione SQL | ~3min |
| 2.2 | Endpoint CRUD `/api/injuries` (GET team, POST, PUT, DELETE) | ✅ | 2.1 | routes/player.js o nuovo | ~10min |
| 2.3 | Auto-update `team_player.stato` → "Infortunato" on create | ✅ | 2.2 | routes/player.js | ~5min |
| 2.4 | Auto-update `team_player.stato` → "Attivo" on rientro | ✅ | 2.3 | routes/player.js | ~3min |
| 2.5 | Sezione infortuni in playerDetail (lista + form) | ✅ | 2.2 | modules/team/playerDetail.js | ~10min |
| 2.6 | Widget "Infortunati" in dashboard (nomi + giorni restanti) | ✅ | 2.2 | modules/team/dashboard.js | ~10min |
| 2.7 | Convocazioni: badge 🏥 su giocatori infortunati | ✅ | 2.3 | modules/team/convocazioni.js | ~5min |
| 2.8 | Aggiornare docs | ✅ | 2.7 | DEVELOPMENT_PLAN.md | ~2min |

---

### EPIC 3: Certificati Medici (alert + warning convocazioni)

> Potenziare la gestione certificati medici esistente (`player.data_visita_medica`) con alert intelligenti e warning nelle convocazioni. Nessuna tabella nuova — il campo scadenza su player è sufficiente. Il tipo (agonistico/non agonistico) è implicito dalla categoria (≥U14 = agonistico). La conservazione 5 anni è responsabilità della società (documenti cartacei/PDF), non dell'app.

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 3.1 | Dashboard: affinare widget certificati con 3 livelli (>30gg = ok, ≤30gg = giallo, scaduto = rosso) + contatore per livello | ✅ | — | modules/team/dashboard.js, utils/certificati.js | ~5min |
| 3.2 | Convocazioni: badge rosso "⚠️ Cert. scaduto" su giocatori con certificato scaduto + banner riepilogativo se ≥1 convocato ha scadenza | ✅ | — | modules/team/convocazioni.js | ~8min |
| 3.3 | Aggiornare docs | ✅ | 3.2 | DEVELOPMENT_PLAN.md | ~2min |

---

### EPIC 4: Anagrafica Avversari (evoluzione team_logo)

> Trasformare `team_logo` in un vero registry avversari con info utili: città, campo con indirizzo, colori maglia, contatti, storico scontri diretti. UI dedicata per consultazione e gestione.

#### Fase 1: Estensione DB e backend

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 4.1 | ALTER TABLE `team_logo` ADD `citta` TEXT, `indirizzo_campo` TEXT, `colori_maglia` TEXT, `telefono` TEXT, `note` TEXT | ⬜ | — | migrazione SQL | ~3min |
| 4.2 | Endpoint GET/PUT `/api/opponents/:id` (dettaglio + modifica campi estesi) | ⬜ | 4.1 | routes/opponents.js | ~10min |
| 4.3 | Endpoint GET `/api/opponents/:id/history` (storico scontri diretti: partite giocate, risultati, bilancio V/P/S) | ⬜ | 4.1 | routes/opponents.js | ~10min |

#### Fase 2: UI Anagrafica Avversari

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 4.4 | Pagina "Avversari" — lista con logo, nome, città, bilancio scontri (searchbox + filtro) | ⬜ | 4.2 | modules/club/opponents.js | ~15min |
| 4.5 | Dettaglio avversario — card con info + storico scontri diretti (tabella partite) | ⬜ | 4.3, 4.4 | modules/club/opponents.js | ~10min |
| 4.6 | Form modifica avversario (città, indirizzo campo, colori, telefono, note) | ⬜ | 4.4 | modules/club/opponents.js | ~10min |

#### Fase 3: Integrazione con flussi esistenti

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 4.7 | Creazione partita: seleziona avversario → pre-compila indirizzo campo trasferta | ⬜ | 4.1 | modules/team/calendar.js | ~5min |
| 4.8 | Match Center / Calendario: link al dettaglio avversario dal nome | ⬜ | 4.5 | modules/team/matchCenter.js, calendar.js | ~5min |
| 4.9 | Sidebar: voce "Avversari" sotto Club (visibile per allenatore/admin) | ⬜ | 4.4 | components/layout/sidebarNav.js | ~3min |
| 4.10 | Test build completo + aggiornare docs | ⬜ | 4.9 | DEVELOPMENT_PLAN.md, AGENTS.md | ~3min |

**Effort totale stimato**: ~74min (10 task)

**Note architetturali**:
- `team_logo` resta la tabella base (non rinominare per retrocompatibilità), ma il dominio si chiama "Avversari"
- Lo storico scontri diretti è una query su `match` filtrando per avversario (normalizzato) cross-season
- L'indirizzo campo pre-compilato è un suggerimento (l'utente può modificarlo)
- I colori maglia sono testo libero (es. "Bianco/Rosso") — no color picker complesso

---

### ~~EPIC 5: Import TC Fase 3~~ ❌ ELIMINATA

> Già implementato nel codice (`archiveCompleted` flag + `findExistingMatch` dedup). Nessun task residuo.

---

### EPIC 12: Club Operations — Fase 1 (Quote + Kit + Checklist)

> Digitalizzare i flussi operativi della segreteria: gestione quote economiche, kit sportivo, checklist inizio stagione. Dashboard action-driven per segreteria. Posizionamento: da app-allenatore a piattaforma di società.

#### Fase 1: Gestione Quote

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 12.1 | CREATE TABLE `fee` (player_id, team_id, season_id, tipo, importo, scadenza, stato, metodo_pagamento, data_pagamento, note) + `fee_payment` (fee_id, importo, data, metodo, ricevuta_numero) | ⬜ | — | migrazione SQL | ~5min |
| 12.2 | Endpoint CRUD `/api/fees` (GET per team/player, POST, PUT, DELETE) + `/api/fees/:id/payments` (POST pagamento parziale) | ⬜ | 12.1 | routes/fees.js | ~10min |
| 12.3 | Sezione "Situazione economica" in playerDetail (lista quote + stato + storico pagamenti) | ⬜ | 12.2 | modules/team/playerDetail.js | ~10min |
| 12.4 | Vista quote per squadra (tabella: giocatore, tipo, importo, scadenza, stato — filtri per stato/tipo) | ⬜ | 12.2 | modules/club/fees.js | ~15min |
| 12.5 | Widget "Quote pendenti" in dashboard segreteria (conteggio + importo totale da incassare) | ⬜ | 12.2 | modules/team/dashboard.js | ~5min |
| 12.6 | Creazione quote batch (applica stessa quota a tutta la squadra in un click) | ⬜ | 12.2 | routes/fees.js, modules/club/fees.js | ~10min |
| 12.7 | Notifica automatica scadenza quote (7gg prima → notification per genitore) | ⬜ | 12.2, 11.11 | routes/fees.js | ~5min |

#### Fase 2: Kit Sportivo

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 12.8 | CREATE TABLE `kit_order` (player_id, team_id, season_id, stato, note) + `kit_item` (kit_order_id, articolo, taglia, personalizzazione_nome, personalizzazione_numero, consegnato, data_consegna) | ⬜ | — | migrazione SQL | ~5min |
| 12.9 | Endpoint CRUD `/api/kit` (GET per team/player, POST ordine con items, PUT item consegnato, DELETE) | ⬜ | 12.8 | routes/kit.js | ~10min |
| 12.10 | UI ordine kit — auto-proposta cognome da player + numero da team_player.numero_maglia, lista articoli configurabile | ⬜ | 12.9 | modules/club/kit.js | ~15min |
| 12.11 | Vista consegne per squadra (chi ha ritirato cosa, filtro per articolo/stato) | ⬜ | 12.9 | modules/club/kit.js | ~10min |
| 12.12 | Widget "Kit da consegnare" in dashboard segreteria | ⬜ | 12.9 | modules/team/dashboard.js | ~5min |
| 12.13 | Configurazione articoli kit per workspace (template: quali articoli compongono il kit base) | ⬜ | 12.8 | routes/kit.js, modules/club/kit.js | ~10min |

#### Fase 3: Checklist Stagione

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 12.14 | CREATE TABLE `registration_checklist` (player_id, team_id, season_id, items JSONB, completamento_pct INT) | ⬜ | — | migrazione SQL | ~3min |
| 12.15 | Configurazione template checklist per workspace (quali step: iscrizione, certificato, GDPR, quota, kit, foto, tesseramento) | ⬜ | 12.14 | routes/workspace.js | ~5min |
| 12.16 | Endpoint GET/PUT `/api/checklist` (per player + per team aggregato) | ⬜ | 12.14 | routes/checklist.js | ~10min |
| 12.17 | UI checklist per giocatore (toggle items + barra progresso) | ⬜ | 12.16 | modules/club/checklist.js | ~10min |
| 12.18 | Vista aggregata "Situazione squadra" (tutti i giocatori con % completamento, filtro per item mancante) | ⬜ | 12.16 | modules/club/checklist.js | ~10min |
| 12.19 | Auto-generazione checklist su migrazione stagione (hook in endpoint migra) | ⬜ | 12.15, 12.16 | routes/workspace.js | ~5min |
| 12.20 | Widget "Iscrizioni incomplete" in dashboard segreteria (giocatori con checklist < 100%) | ⬜ | 12.16 | modules/team/dashboard.js | ~5min |

#### Fase 4: Dashboard Segreteria Action-Driven

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 12.21 | Endpoint aggregato `/api/club-operations/summary` (quote pendenti + kit da consegnare + certificati scadenza + checklist incomplete) | ⬜ | 12.2, 12.9, 12.16 | routes/clubOperations.js | ~10min |
| 12.22 | Dashboard segreteria con card action-driven (contatori + link diretto all'azione) | ⬜ | 12.21 | modules/team/dashboard.js | ~10min |
| 12.23 | Sidebar: voce "Club Operations" con sotto-menu (Quote, Kit, Checklist) visibile per segreteria/admin | ⬜ | 12.4, 12.10, 12.17 | components/layout/sidebarNav.js | ~5min |
| 12.24 | Test build completo + aggiornare docs | ⬜ | 12.23 | DEVELOPMENT_PLAN.md, AGENTS.md | ~5min |

**Effort totale stimato**: ~10h (24 task)

**Note architetturali**:
- Le tabelle `fee`, `kit_order`, `registration_checklist` sono tutte legate a `player_id` + `team_id` + `season_id` → dati per stagione
- La configurazione (template kit, template checklist) è per workspace → riutilizzabile tra stagioni
- I widget dashboard segreteria si aggiungono ai widget esistenti (visibili solo per profilo segreteria/admin)
- La voce sidebar "Club Operations" richiede capability `club_operations: read/write` da aggiungere ai profili
- Le notifiche scadenza quote (12.7) dipendono da EPIC 11 (destinatario_tipo genitore)
- Fase futura (v4.0): Ricevute PDF, Centro Documentale, Workflow iscrizione completo, Magazzino

---

### EPIC 14: Match Center Evolution

> Redesign UX del Match Center: layout 2 colonne desktop, tab Dettagli (arbitro/campo/meteo), riorganizzazione tab, Quick Action Rigore separata. Obiettivo: più operativo da bordo campo, migliore uso spazio su desktop.

#### Fase 1: Layout 2 colonne desktop

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 14.1 | Ristrutturare `getBody()` con grid 2 colonne (timeline sx, azioni rapide dx) su desktop >768px | ⬜ | — | modules/team/matchCenter.js | ~8min |
| 14.2 | CSS responsive: collassare a 1 colonna su mobile (azioni sopra, timeline sotto) | ⬜ | 14.1 | modules/team/matchCenter.js | ~5min |

#### Fase 2: Tab Dettagli partita

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 14.3 | Migrazione DB: ALTER TABLE `match` ADD `arbitro` TEXT, `assistenti` TEXT, `meteo` TEXT | ⬜ | — | migrazione SQL | ~3min |
| 14.4 | Backend: includere nuovi campi in GET `/partite/:id/dettaglio` e PUT `/partite/:id` | ⬜ | 14.3 | routes/match.js | ~5min |
| 14.5 | Frontend: creare tab "Dettagli" con form (arbitro, assistenti, campo, meteo, note avversario) | ⬜ | 14.4 | modules/team/matchCenter.js | ~10min |
| 14.6 | Auto-save debounce sui campi Dettagli (come Note) | ⬜ | 14.5 | modules/team/matchCenter.js | ~5min |

#### Fase 3: Riorganizzazione tab

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 14.7 | Riordinare tab: Eventi (default), Formazione, Dettagli, Note, Import | ⬜ | 14.5 | modules/team/matchCenter.js | ~3min |
| 14.8 | Badge contatore su tab Eventi (già presente) + badge su Dettagli se compilati | ⬜ | 14.7 | modules/team/matchCenter.js | ~3min |

#### Fase 4: Quick Action Rigore separata

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 14.9 | Aggiungere bottone "Rigore" nella griglia Quick Actions (icona 🎯) | ⬜ | — | modules/team/matchCenter.js | ~3min |
| 14.10 | Click su Rigore → apre drawer con tipo GOAL + checkbox Rigore pre-selezionato | ⬜ | 14.9 | modules/team/matchCenter.js | ~3min |

#### Fase 5: Finalizzazione

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 14.11 | Test build frontend + syntax check backend | ⬜ | 14.10 | — | ~2min |
| 14.12 | Aggiornare docs (DEVELOPMENT_PLAN, AGENTS.md, DATABASE_SCHEMA) | ⬜ | 14.11 | .agents/ | ~3min |

**Effort totale stimato**: ~53min (12 task)

**Note architetturali**:
- Il layout 2 colonne usa CSS Grid (`grid-template-columns: 1fr 280px` su desktop, `1fr` su mobile)
- I nuovi campi DB (`arbitro`, `assistenti`, `meteo`) sono TEXT semplici — no JSONB
- Il tab Dettagli riusa il pattern auto-save debounce già implementato per Note
- Il tab Import resta ultimo (meno usato)
- La Quick Action Rigore è un shortcut UX — internamente crea un evento GOAL con flag `rigore=true`
- `indirizzo_campo` e `note_avversario` esistono già in DB — il tab Dettagli li espone in modo editabile

---

### EPIC 15: PWA Offline-First

> Rendere YFM utilizzabile offline al campo sportivo: cache dati READ, sync queue per scritture, IndexedDB come storage locale. Approccio "offline-aware" controllato (non cache-everything).

**Caso d'uso primario**: allenatore al campo con rete instabile/assente → Match Center, presenze allenamento, convocazioni/rosa in lettura.

**Stato attuale PWA**:
- ✅ Installabile (manifest, icone, screenshots, registerSW)
- ✅ Cache asset statici (JS, CSS, immagini) via Workbox precache
- ✅ Banner offline globale (`initOfflineBanner()`)
- ✅ Buffer localStorage per MC eventi/note (`offlineBuffer.js`)
- ❌ Nessuna cache API REST runtime
- ❌ Nessun IndexedDB per dati applicativi
- ❌ `apiFetch()` senza fallback offline
- ❌ Nessuna sync queue generica per POST/PUT

#### Fase 1: IndexedDB + Cache GET principali

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 15.1 | Creare `src/services/offlineDb.js` — wrapper IndexedDB (idb-keyval o raw) con stores: workspace, squadre, players, matches, trainings, convocations | ⬜ | — | services/offlineDb.js | ~10min |
| 15.2 | Estendere `apiFetch()` — su risposta OK salva in IndexedDB (solo GET cacheable); su network error ritorna ultimo dato da IndexedDB | ⬜ | 15.1 | services/api.js | ~10min |
| 15.3 | Definire cache policy: lista endpoint GET cacheable (workspace, squadre, rosa, calendario, partite, convocazioni, allenamenti) vs non-cacheable (login, admin) | ⬜ | 15.2 | services/api.js o services/cachePolicy.js | ~5min |
| 15.4 | Invalidazione cache IndexedDB: clear store specifico dopo scrittura correlata (es. salva presenze → clear trainings) | ⬜ | 15.2 | services/offlineDb.js | ~5min |

#### Fase 2: Match Center offline completo

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 15.5 | MC: pre-fetch e cache in IndexedDB dei dati partita (convocati, formazione, eventi esistenti) all'apertura | ⬜ | 15.1 | modules/team/matchCenter.js | ~10min |
| 15.6 | MC: registrazione eventi offline → salva in IndexedDB (evoluzione da localStorage buffer attuale) | ⬜ | 15.5 | modules/team/matchCenter.js, offlineBuffer.js | ~10min |
| 15.7 | MC: indicatore visivo "modalità offline" (badge/icona) quando opera senza rete | ⬜ | 15.6 | modules/team/matchCenter.js | ~3min |

#### Fase 3: Presenze allenamento offline

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 15.8 | Training: pre-fetch rosa + sessioni settimana in IndexedDB | ⬜ | 15.1 | modules/coach/trainingPresenze.js | ~5min |
| 15.9 | Training: salvataggio presenze offline → sync queue | ⬜ | 15.8, 15.10 | modules/coach/trainingPresenze.js | ~10min |

#### Fase 4: Sync Queue generica

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 15.10 | Creare `src/services/syncQueue.js` — queue IndexedDB per operazioni POST/PUT/DELETE pendenti (endpoint, method, payload, timestamp, retries) | ⬜ | 15.1 | services/syncQueue.js | ~10min |
| 15.11 | Auto-sync: al ritorno online (`online` event) esegue queue in ordine FIFO, gestisce conflitti (409 → drop, 401 → re-auth) | ⬜ | 15.10 | services/syncQueue.js | ~10min |
| 15.12 | UI: indicatore sync pending (badge con contatore operazioni in coda) + toast post-sync | ⬜ | 15.11 | components/layout/Sidebar.js o main.js | ~5min |

#### Fase 5: Service Worker Runtime Cache

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 15.13 | Aggiungere `workbox.runtimeCaching` in vite.config.js per GET API autenticate (NetworkFirst con fallback cache, TTL 5min) | ⬜ | — | vite.config.js | ~5min |
| 15.14 | Separare cache per workspace/utente (cache key include workspace_id) | ⬜ | 15.13 | vite.config.js | ~5min |
| 15.15 | Background Sync registration per POST/PUT critici (Workbox BackgroundSync plugin) | ⬜ | 15.13 | vite.config.js | ~10min |

#### Fase 6: Offline Status avanzato

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 15.16 | Estendere banner offline con 3 stati: ONLINE / OFFLINE / SYNCING (con animazione) | ⬜ | 15.11 | main.js | ~5min |
| 15.17 | Pagine che richiedono dati non cachati: mostrare stato "Dati non disponibili offline" invece di errore generico | ⬜ | 15.2 | services/api.js | ~5min |
| 15.18 | Test build + aggiornare docs | ⬜ | 15.17 | DEVELOPMENT_PLAN.md, AGENTS.md | ~3min |

**Effort totale stimato**: ~2h 6min (18 task)

**Priorità implementazione**:
1. Fase 1 (IndexedDB + cache GET) — fondamenta
2. Fase 4 (Sync Queue) — necessaria per fasi 2-3
3. Fase 2 (MC offline) — caso d'uso #1 campo sportivo
4. Fase 3 (Presenze offline) — caso d'uso #2
5. Fase 5 (SW runtime cache) — ottimizzazione
6. Fase 6 (UX offline) — polish

**Note architetturali**:
- IndexedDB preferito a localStorage per: capacità (>5MB), struttura, transazioni
- La cache è per workspace+utente (multi-tenant safe)
- JWT nel header → SW non può cachare con Authorization senza logica custom
- Sync queue usa FIFO con max 3 retry, backoff esponenziale
- Conflitti: 409 (dato già aggiornato) → drop silenzioso + notifica; 401 → pausa sync + re-login
- `offlineBuffer.js` esistente verrà migrato a IndexedDB (fase 2) mantenendo retrocompatibilità
- Dipendenza suggerita: `idb` (wrapper IndexedDB leggero, ~1KB gzip) oppure raw IndexedDB API

**Valore commerciale**: "YFM funziona anche quando al campo non prende internet" — differenziatore forte per società sportive in zone con copertura scarsa.

---

### EPIC 16: Print Center (Hub Documentale)

> Hub centralizzato per tutti i documenti stampabili/condivisibili della società. Risolve il problema stampa Android (pagine standalone `/print/...`), centralizza l'accesso ai documenti, introduce varianti e cronologia. Differenziatore commerciale: "apri il Print Center, stampa in 2 tap".

**Valore commerciale**: Nessuna app sportiva giovanile offre un hub documentale centralizzato. Per segreteria/dirigente è il punto di riferimento naturale. Risolve elegantemente il problema Android con pagine dedicate A4-optimized.

#### Fase 1: Infrastruttura e pagina base

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 16.1 | Creare modulo `modules/team/printCenter.js` — struttura pagina con sezioni Match Day, Allenamenti, Rosa | ✅ | — | modules/team/printCenter.js | ~10min |
| 16.2 | Sidebar: voce "📄 Print Center" visibile per allenatore, segreteria, dirigente, admin (capability: `report`) | ✅ | 16.1 | components/layout/sidebarNav.js | ~3min |
| 16.3 | Router: registrare route `/print-center` | ✅ | 16.1 | router.js | ~2min |
| 16.4 | UI: selettore partita (dropdown prossima/ultima + lista recenti) con auto-selezione intelligente | ✅ | 16.1 | modules/team/printCenter.js | ~8min |
| 16.5 | UI: card documento con stato disponibilità (✔ Disponibile / ⏳ Non compilata / 🔒 Post-partita) | ✅ | 16.4 | modules/team/printCenter.js | ~8min |
| 16.6 | Backend: endpoint `GET /api/squadre/:id/print-center-status?match_id=X` — stato disponibilità di ogni documento per una partita | ✅ | — | routes/statistics.js o nuovo | ~10min |

#### Fase 2: Pagine stampa standalone (`/print/:tipo/:id`)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 16.7 | Creare `modules/print/printConvocazione.js` — pagina standalone A4 convocazione (no sidebar, layout ottimizzato stampa) | ✅ | 16.6 | modules/print/printConvocazione.js | ~12min |
| 16.8 | Creare `modules/print/printDistinta.js` — pagina standalone A4 distinta gara | ✅ | 16.7 | modules/print/printDistinta.js | ~12min |
| 16.9 | Creare `modules/print/printFormazione.js` — pagina standalone A4 formazione (campo + nomi) | ✅ | 16.7 | modules/print/printFormazione.js | ~10min |
| 16.10 | Creare `modules/print/printReport.js` — pagina standalone A4 report partita (riuso logica reports.js) | ✅ | 16.7 | modules/print/printReport.js | ~10min |
| 16.11 | Router: registrare routes `/print/convocazione/:id`, `/print/distinta/:id`, `/print/formazione/:id`, `/print/report/:id` | ✅ | 16.7 | router.js | ~3min |
| 16.12 | CSS globale: stile `@media print` per pagine `/print/*` (nasconde header/sidebar, A4 margins, page-break) | ✅ | 16.11 | style.css o print.css | ~5min |

#### Fase 3: Azioni documento (Anteprima, Stampa, Condividi)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 16.13 | Click su card documento → drawer/modale con 4 azioni: 👁 Anteprima, 🖨 Stampa, 📄 PDF, 📤 Condividi | ✅ | 16.5 | modules/team/printCenter.js | ~8min |
| 16.14 | Anteprima: naviga a pagina print standalone | ✅ | 16.11, 16.13 | modules/team/printCenter.js | ~5min |
| 16.15 | Stampa: naviga a pagina print + window.print() | ✅ | 16.14 | modules/print/*.js | ~5min |
| 16.16 | Condividi: Web Share API con fallback copia link | ✅ | 16.14 | modules/team/printCenter.js | ~5min |

#### Fase 4: Documenti Allenamenti e Rosa

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 16.17 | Creare `modules/print/printPresenze.js` — registro presenze allenamenti (tabella giocatori × date, stampabile) | ✅ | 16.12 | modules/print/printPresenze.js | ~12min |
| 16.18 | Creare `modules/print/printRosa.js` — elenco tesserati (nome, cognome, data nascita, numero, ruolo) | ✅ | 16.12 | modules/print/printRosa.js | ~8min |
| 16.19 | Creare `modules/print/printScadenzeMediche.js` — lista scadenze visite mediche | ✅ | 16.12 | modules/print/printScadenzeMediche.js | ~8min |
| 16.20 | Router: registrare routes `/print/presenze/:teamId`, `/print/rosa/:teamId`, `/print/scadenze/:teamId` | ✅ | 16.17 | router.js | ~3min |
| 16.21 | Aggiungere card Presenze, Rosa, Scadenze nella sezione corrispondente del Print Center | ✅ | 16.17, 16.18, 16.19 | modules/team/printCenter.js | ~5min |

#### Fase 5: Varianti documento

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 16.22 | Convocazione varianti: Standard / Con telefoni genitori / Con staff | ✅ | 16.7 | modules/print/printConvocazione.js | ~8min |
| 16.23 | Distinta varianti: FIGC / Torneo (semplificata) | ✅ | 16.8 | modules/print/printDistinta.js | ~8min |
| 16.24 | UI selezione variante nel drawer azioni (radio buttons) | ✅ | 16.22, 16.23, 16.13 | modules/team/printCenter.js | ~5min |

#### Fase 6: Cronologia e Polish

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 16.25 | Cronologia: salvare ultimi 10 documenti aperti in localStorage, mostrare sezione "🕒 Recenti" | ✅ | 16.13 | modules/team/printCenter.js | ~8min |
| 16.26 | Mobile: layout responsive card documenti (1 colonna, touch targets 44px) | ✅ | 16.5 | modules/team/printCenter.js | ~5min |
| 16.27 | Report stagionale: aggiungere card nel Print Center (riuso endpoint esistente) | ✅ | 16.10 | modules/team/printCenter.js | ~3min |
| 16.28 | Test build completo + aggiornare docs | ✅ | 16.27 | DEVELOPMENT_PLAN.md, AGENTS.md | ~3min |

**Effort totale stimato**: ~3h 15min (28 task)

**Priorità implementazione**:
1. Fase 1 (infrastruttura + pagina) — scheletro navigabile
2. Fase 2 (pagine standalone) — cuore della feature, risolve problema Android
3. Fase 3 (azioni) — UX completa
4. Fase 4 (allenamenti + rosa) — estende copertura documenti
5. Fase 5 (varianti) — valore aggiunto per segreteria
6. Fase 6 (cronologia + polish) — UX premium

**Note architetturali**:
- Le pagine `/print/*` sono route standalone: no sidebar, no header app, solo il documento + bottone "Stampa" e "← Torna"
- Ogni pagina print fetcha i propri dati via API (autenticata) — funziona anche aperta direttamente via URL
- Il Print Center è una pagina SPA normale (con sidebar) che mostra le card e gestisce le azioni
- La cronologia usa `localStorage` key `yfm_print_history` (array di `{tipo, id, titolo, timestamp}`)
- I bottoni "Stampa" esistenti nelle altre pagine (convocazioni, distinta, report) restano come shortcut — non vengono rimossi
- Web Share API: fallback su desktop = copia URL negli appunti + toast "Link copiato"
- Le pagine print usano `printHelper.js` esistente per il flusso stampa (già gestisce Android vs iOS/Desktop)
- Capability richiesta: `report: read` (stessa dei report esistenti) — non serve nuova capability
- Nessuna tabella DB nuova necessaria per v1 (tutto basato su dati esistenti)

**Evoluzione futura (v2 → Document Center)**:
- Archivio documenti generati (tabella `document_archive`)
- Preferiti (pin documenti frequenti)
- Ricerca full-text
- Export ZIP multiplo
- Sezioni Scouting e Analytics
- Template personalizzabili per workspace

---

### EPIC 17: Piano Gara (Match Plan)

> Trasformare il Match Center in un vero Piano Gara: calci piazzati, compiti tattici individuali, pressing, costruzione, marcature, piano cambi, obiettivo gara. Entità autonoma nel DB con template riutilizzabili. Differenziatore forte: nessuna app giovanile offre un piano tattico strutturato.

**Valore commerciale**: L'allenatore arriva al campo con un dossier completo (non solo formazione). Possibilità di salvare template ("vs squadre forti", "trasferta", "campo piccolo") e applicarli con un click. Evoluzione futura: lavagna interattiva, promemoria live, PDF dossier gara.

#### Fase 1: Schema DB e migrazione

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 17.1 | CREATE TABLE `match_plan` (id, match_id FK, team_id FK, calci_piazzati JSONB, pressing JSONB, costruzione JSONB, calcio_inizio JSONB, marcature JSONB, copertura_preventiva JSONB, piano_cambi JSONB, obiettivo TEXT, note_avversario TEXT, created_at, updated_at) | ⬜ | — | migrazione SQL | ~5min |
| 17.2 | CREATE TABLE `match_plan_task` (id, match_plan_id FK CASCADE, team_player_id FK, compiti TEXT[], note TEXT) | ⬜ | 17.1 | migrazione SQL | ~3min |
| 17.3 | CREATE TABLE `match_plan_template` (id, team_id FK, nome TEXT, piano JSONB, created_at) | ⬜ | 17.1 | migrazione SQL | ~3min |
| 17.4 | Aggiornare DATABASE_SCHEMA.md con nuove tabelle | ⬜ | 17.3 | .agents/knowledge/DATABASE_SCHEMA.md | ~3min |

#### Fase 2: Backend CRUD

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 17.5 | Creare `routes/matchPlan.js` — GET/POST/PUT `/api/partite/:matchId/plan` (upsert piano gara) | ⬜ | 17.1 | routes/matchPlan.js | ~10min |
| 17.6 | Endpoint GET/POST/PUT/DELETE `/api/partite/:matchId/plan/tasks` (compiti individuali batch) | ⬜ | 17.2, 17.5 | routes/matchPlan.js | ~10min |
| 17.7 | Endpoint CRUD `/api/squadre/:teamId/plan-templates` (GET lista, POST salva, DELETE elimina) | ⬜ | 17.3 | routes/matchPlan.js | ~10min |
| 17.8 | Endpoint POST `/api/partite/:matchId/plan/from-template/:templateId` (applica template a partita) | ⬜ | 17.5, 17.7 | routes/matchPlan.js | ~5min |
| 17.9 | Registrare router in `api/index.js` + authMiddleware | ⬜ | 17.5 | api/index.js | ~3min |

#### Fase 3: Frontend — Tab Piano Gara nel Match Center

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 17.10 | Aggiungere tab "Piano Gara" nel Match Center (panelMap + handler) | ⬜ | 17.5 | modules/team/matchCenter.js | ~5min |
| 17.11 | Sezione Calci Piazzati: corner dx/sx (dropdown giocatore + backup), punizioni (ordine 1-3), rigori (ordine 1-5), rimesse laterali (dx/sx) | ⬜ | 17.10 | modules/team/matchCenter.js | ~15min |
| 17.12 | Sezione Pressing & Costruzione: radio Alto/Medio/Basso, trigger checkbox, schema costruzione radio | ⬜ | 17.10 | modules/team/matchCenter.js | ~10min |
| 17.13 | Sezione Calcio d'Inizio: radio Lunga/Corta + dropdown ricevente | ⬜ | 17.10 | modules/team/matchCenter.js | ~5min |
| 17.14 | Sezione Marcature: lista coppie (input avversario + dropdown nostro giocatore), add/remove | ⬜ | 17.10 | modules/team/matchCenter.js | ~10min |
| 17.15 | Sezione Copertura Preventiva: checkbox giocatori che restano dietro su corner/punizione offensiva | ⬜ | 17.10 | modules/team/matchCenter.js | ~8min |
| 17.16 | Sezione Obiettivo Gara: textarea con auto-save debounce | ⬜ | 17.10 | modules/team/matchCenter.js | ~3min |
| 17.17 | Sezione Note Avversario: textarea (punti deboli, schema, giocatori pericolosi) | ⬜ | 17.10 | modules/team/matchCenter.js | ~3min |
| 17.18 | Bottone "Salva Piano" + toast conferma + auto-save su cambio tab | ⬜ | 17.11 | modules/team/matchCenter.js | ~5min |

#### Fase 4: Compiti Tattici Individuali

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 17.19 | Sezione Compiti Individuali: lista giocatori convocati con tag predefiniti per ruolo | ⬜ | 17.6, 17.10 | modules/team/matchCenter.js | ~12min |
| 17.20 | Libreria tag per ruolo: Portiere (costruzione bassa, uscita alta, ricerca punta...), Difensore (spinta, resta basso, marcatura stretta...), Centrocampista (inserimento, copertura, regia...), Attaccante (profondità, viene incontro, pressing portiere...) | ⬜ | 17.19 | utils/matchPlanTags.js | ~8min |
| 17.21 | UI: click giocatore → espande card con tag selezionabili (chip toggle) + campo note libero | ⬜ | 17.19, 17.20 | modules/team/matchCenter.js | ~10min |
| 17.22 | Salvataggio batch compiti (1 chiamata per tutti i giocatori) | ⬜ | 17.21 | modules/team/matchCenter.js | ~5min |

#### Fase 5: Piano Cambi

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 17.23 | Sezione Piano Cambi: lista entry (minuto, esce dropdown, entra dropdown, condizione text) | ⬜ | 17.10 | modules/team/matchCenter.js | ~10min |
| 17.24 | Add/remove entry + ordinamento per minuto | ⬜ | 17.23 | modules/team/matchCenter.js | ~5min |
| 17.25 | Opzione "Cambio modulo" (minuto + nuovo modulo dropdown) | ⬜ | 17.23 | modules/team/matchCenter.js | ~5min |

#### Fase 6: Template e Finalizzazione

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 17.26 | UI: bottone "Salva come Template" (modale nome) + "Carica Template" (dropdown lista) | ⬜ | 17.7, 17.8, 17.18 | modules/team/matchCenter.js | ~10min |
| 17.27 | Carica template: popola form con dati template, utente modifica e salva | ⬜ | 17.26 | modules/team/matchCenter.js | ~5min |
| 17.28 | Badge tab Piano Gara: pallino verde se compilato, vuoto se no | ⬜ | 17.18 | modules/team/matchCenter.js | ~3min |
| 17.29 | Mobile responsive: layout 1 colonna, sezioni collassabili (accordion) | ⬜ | 17.18 | modules/team/matchCenter.js | ~8min |
| 17.30 | Test build completo + syntax check backend | ⬜ | 17.29 | — | ~3min |
| 17.31 | Aggiornare docs (DEVELOPMENT_PLAN, AGENTS.md, DATABASE_SCHEMA) | ⬜ | 17.30 | .agents/ | ~3min |

**Effort totale stimato**: ~4h 15min (31 task)

**Priorità implementazione**:
1. Fase 1 (DB) — fondamenta, 14min
2. Fase 2 (Backend CRUD) — API pronte, 38min
3. Fase 3 (Tab UI base) — form compilabile, ~64min
4. Fase 4 (Compiti individuali) — cuore tattico, ~35min
5. Fase 5 (Piano cambi) — operatività bordo campo, ~20min
6. Fase 6 (Template + polish) — riutilizzabilità, ~32min

**Note architetturali**:
- `match_plan` è 1:1 con `match` (un piano per partita) — `match_id` UNIQUE
- Le sezioni usano JSONB per massima flessibilità (evolvere senza migrazioni DDL)
- `match_plan_task` è relazione 1:N separata per query efficienti sui compiti individuali
- I template salvano uno snapshot JSONB completo del piano (esclusi compiti individuali che dipendono dalla rosa)
- I dropdown giocatori nel piano usano i convocati (se disponibili) o la rosa attiva
- Il tab Piano Gara è visibile solo se la partita non è archiviata (come Formazione)
- Capability richiesta: `formazione: write` (stessa della formazione — è parte della preparazione tattica)
- Auto-save debounce (1.5s) su tutti i campi, come già fatto per Note nel MC
- Nessuna dipendenza da altre Epic

**Evoluzione futura (v2)**:
- Lavagna interattiva: click su giocatore nel campo → pannello laterale con tutti i suoi compiti/ruoli
- Promemoria live: a minuto X durante il match, notifica "Ricordati: ingresso Bianchi, cambio modulo"
- PDF Dossier Gara: pagina aggiuntiva nel Print Center con piano tattico completo
- Condivisione piano con staff (vice-allenatore vede il piano pre-partita)
- Storico piani: confronto piano vs esecuzione reale (cambi effettivi vs pianificati)
- AI suggestions: basate su storico avversario e risultati precedenti

---

### EPIC 6: Polish pre-stagione

> Bug fix, UX improvements, preparazione per utenti reali.

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 6.1 | Completare UI valutazioni giocatore | ⬜ | — | modules/team/valutazioni.js | ~15min |
| 6.2 | Report presenze allenamenti (stampabile) | ⬜ | — | modules/performance/reports.js | ~10min |
| 6.3 | Import_log: aggiungere `durata_import`, `warnings` | ⬜ | — | migrazione SQL + routes/ | ~5min |
| 6.4 | Document: aggiungere colonna `cartella` | ⬜ | — | migrazione SQL | ~3min |

---

### EPIC 7: Tornei (riattivazione)

> Codice già pronto, solo da riattivare e completare.

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 7.1 | Riattivare link sidebar Tornei | ⬜ | — | sidebar.js | ~2min |
| 7.2 | Generazione calendario round-robin | ⬜ | 7.1 | modules/coach/tournaments.js | ~15min |
| 7.3 | Inserimento partite torneo nel calendario | ⬜ | 7.2 | routes/tournament.js | ~10min |
| 7.4 | Classifica live girone | ⬜ | 7.3 | modules/coach/tournaments.js | ~10min |

---

### EPIC 8: Redesign Stagioni & Categorie

> Stagione = 01/07→30/06. Wizard creazione con migrazione. Dropdown solo stagione attiva. Carriera cross-season.

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 8.1 | Fix dati DB: rimuovere stagione duplicata, normalizzare date 01/07 | ✅ | — | migrazione SQL | ~3min |
| 8.2 | Backend: POST stagione con anno_inizio, auto-team, disattiva precedente | ✅ | 8.1 | routes/workspace.js | ~10min |
| 8.3 | Backend: endpoint migrazione POST /stagioni/:id/migra | ✅ | 8.2 | routes/workspace.js | ~15min |
| 8.4 | Frontend: rifare UI seasonsCategories.js con wizard + modale | ✅ | 8.2, 8.3 | modules/club/seasonsCategories.js | ~15min |
| 8.5 | Frontend: dropdown squadre mostra SOLO stagione attiva | ✅ | 8.4 | modules/team/squadre.js | ~5min |
| 8.6 | Guest genitore: accesso già limitato (roster, club, calendar) | ✅ | — | router.js | ~0min |
| 8.7 | Staff migrato visibile nella nuova stagione (garantito da 8.3) | ✅ | 8.3 | — | ~0min |
| 8.8 | Backend: endpoint /career e /last-matches cross-season | ✅ | — | routes/player.js | ~10min |
| 8.9 | Test build completo | ✅ | 8.8 | — | ~2min |
| 8.10 | Aggiornare docs | ✅ | 8.9 | DEVELOPMENT_PLAN.md | ~3min |

---

### EPIC 10: Dashboard Personalizzabile

> Riordino e show/hide widget dashboard per utente. Preferenze salvate in DB.

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 10.1 | ALTER TABLE `users` ADD `preferenze_ui` JSONB | ✅ | — | migrazione SQL | ~2min |
| 10.2 | Endpoint GET/PUT `/api/users/preferences` | ✅ | 10.1 | routes/auth.js | ~5min |
| 10.3 | Wrappare widget dashboard con `data-widget` ID | ✅ | — | modules/team/dashboard.js | ~5min |
| 10.4 | UI modale "Organizza" (frecce ↑↓ + toggle visibilità + salva) | ✅ | 10.2, 10.3 | modules/team/dashboard.js | ~10min |
| 10.5 | Caricamento preferenze al load + applyLayout | ✅ | 10.2, 10.3 | modules/team/dashboard.js | ~5min |

---

### EPIC 9: Workspace Hub (superadmin)

> Pagina workspace centralizzata con tab Info (modificabile), Stagioni, Utenti. Permette al superadmin di gestire tutto il setup di un workspace senza navigare tra pagine diverse.

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 9.1 | Click su card workspace → vista dettaglio con tab (Info, Stagioni, Utenti) | ✅ | — | modules/admin/workspaces.js | ~15min |
| 9.2 | Tab Info: form inline modificabile (nome, contatti, social, facility, logo) | ✅ | 9.1 | modules/admin/workspaces.js | ~10min |
| 9.3 | Tab Stagioni: lista stagioni con team, azioni (crea, migra, attiva) | ✅ | 9.1 | modules/admin/workspaces.js, routes/workspace.js | ~15min |
| 9.4 | Tab Utenti: lista utenti workspace + creazione rapida + modifica ruolo/permessi | ✅ | 9.1 | modules/admin/workspaces.js | ~15min |
| 9.5 | Test build + aggiornare docs | ✅ | 9.4 | DEVELOPMENT_PLAN.md | ~2min |

---

### EPIC 13: Preseason (Open Day + Ritiro)

> Gestione fase pre-stagione: Open Day per valutare prospect esterni, Ritiro con doppie sedute giornaliere, transizione a stagione regolare.

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 13.1 | Migrazione DB: `training.fase` TEXT (regolare/openday/ritiro), `team.config_attiva_dal` DATE, CREATE TABLE `training_participant` (id, training_id, nome, cognome, anno_nascita, provenienza, valutazione, note) | ⬜ | — | migrazione SQL | ~5min |
| 13.2 | Backend: filtro sessioni virtuali con `config_attiva_dal` (non generare virtuali prima di questa data) | ⬜ | 13.1 | routes/training.js | ~5min |
| 13.3a | Backend: endpoint CRUD `training_participant` (GET per training_id, POST) | ⬜ | 13.1 | routes/training.js | ~7min |
| 13.3b | Backend: endpoint PUT/DELETE `training_participant` + campo valutazione (1-5 stelle) | ⬜ | 13.3a | routes/training.js | ~5min |
| 13.4a | Frontend: tab Preseason nella pagina allenamenti (struttura + navigazione) | ⬜ | 13.2 | modules/coach/training.js | ~8min |
| 13.4b | Frontend: wizard Open Day (form date/orari + batch create sessioni con fase=openday) | ⬜ | 13.4a, 13.3a | modules/coach/training.js | ~10min |
| 13.4c | Frontend: lista partecipanti Open Day (tabella + form aggiunta + valutazione stelle) | ⬜ | 13.4b, 13.3b | modules/coach/training.js | ~10min |
| 13.5a | Frontend: wizard Ritiro (form data inizio/fine + orari AM/PM + batch create) | ⬜ | 13.4a | modules/coach/training.js | ~10min |
| 13.5b | Frontend: vista calendario preseason (sessioni doppie, colori per fase) | ⬜ | 13.5a | modules/coach/training.js | ~8min |
| 13.6 | Frontend: bottone "Avvia stagione regolare" → imposta `config_attiva_dal` su team | ⬜ | 13.5b | modules/coach/training.js, routes/training.js | ~5min |
| 13.7 | Test build completo + aggiornare docs | ⬜ | 13.6 | DEVELOPMENT_PLAN.md, AGENTS.md | ~3min |

**Effort totale stimato**: ~76min (11 task)

**Note architetturali**:
- `training_participant` è separata da `training_attendance` perché i partecipanti Open Day NON sono nella rosa (sono prospect esterni)
- `training.fase` permette di colorare/filtrare le sessioni nel calendario (regolare=default, openday=verde, ritiro=arancio)
- `config_attiva_dal` evita che le sessioni virtuali da `training_config` vengano generate prima dell'inizio effettivo della stagione regolare
- Il wizard Open Day crea N sessioni in batch con fase=openday
- Il wizard Ritiro crea sessioni doppie (AM+PM) per ogni giorno del periodo

---

### EPIC 11: Sistema Atleta & Genitore (evoluzione Guest)

> Sostituire il concetto generico di "Guest" con due ruoli distinti (Atleta e Genitore) con capabilities, home e notifiche differenziate. Infrastruttura guest_token invariata (nessuna registrazione), ma UX e permessi specifici per tipo.

#### Fase 1: Tipi e Capabilities (backend)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 11.1 | Definire capabilities Atleta vs Genitore in `capabilities.js` (frontend + backend mirror) | ✅ | — | utils/capabilities.js, helpers/capabilities.js | ~5min |
| 11.2 | Aggiornare `guest_token.tipo` per supportare valori `atleta` e `genitore` (retrocompat con esistenti) | ✅ | 11.1 | routes/auth.js, routes/guestLinks.js | ~5min |
| 11.3 | Differenziare JWT guest: includere `tipo` nelle capabilities check del middleware | ✅ | 11.2 | middleware/auth.js, helpers/capabilities.js | ~5min |
| 11.4 | Endpoint: atleta può POST su `/api/absence-notification` solo per il proprio player_id | ✅ | 11.3 | routes/notification.js | ~5min |
| 11.5 | Test funzionale capabilities atleta/genitore (permessi differenziati) | ✅ | 11.4 | tmp_test.js | ~5min |

#### Fase 2: Home Atleta (frontend)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 11.6 | Creare `modules/auth/guestAtleta.js` — Home atleta (notifiche, convocazioni, indisponibilità, allenamenti, partite, stats personali, classifica) | ✅ | 11.3 | modules/auth/guestAtleta.js | ~15min |
| 11.6a | — Widget notifiche + convocazione prossima | ✅ | 11.6 | modules/auth/guestAtleta.js | ~5min |
| 11.6b | — Form "Comunica indisponibilità" (data + motivo) | ✅ | 11.4, 11.6 | modules/auth/guestAtleta.js | ~5min |
| 11.6c | — Sezioni calendario allenamenti + partite + stats personali + classifica | ✅ | 11.6 | modules/auth/guestAtleta.js | ~5min |

#### Fase 3: Home Genitore (frontend)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 11.7 | Creare `modules/auth/guestGenitore.js` — Home genitore (comunicazioni, convocazioni figlio, calendario, risultati, classifica, stats squadra) | ✅ | 11.3 | modules/auth/guestGenitore.js | ~15min |
| 11.7a | — Widget comunicazioni con badge priorità | ✅ | 11.7, 11.9 | modules/auth/guestGenitore.js | ~5min |
| 11.7b | — Sezioni convocazioni figlio + calendario + risultati + classifica | ✅ | 11.7 | modules/auth/guestGenitore.js | ~5min |

#### Fase 4: Router guest differenziato

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 11.8 | Aggiornare router.js: guest `tipo=atleta` → guestAtleta, `tipo=genitore` → guestGenitore | ✅ | 11.6, 11.7 | router.js, modules/auth/guest.js | ~5min |

#### Fase 5: Priorità notifiche

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 11.9 | ALTER TABLE `notification` ADD `priorita` TEXT DEFAULT 'info' (info/importante/urgente) | ✅ | — | migrazione SQL | ~3min |
| 11.10 | Frontend: badge colorato priorità (🔵🟡🔴) nelle liste notifiche | ✅ | 11.9 | modules/team/notifications.js, guestAtleta.js, guestGenitore.js | ~5min |

#### Fase 6: Comunicazioni con destinatari (fase 1)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 11.11 | ALTER TABLE `notification` ADD `destinatario_tipo TEXT[]` (atleta/genitore/staff) | ✅ | — | migrazione SQL | ~3min |
| 11.12 | UI creazione comunicazione: selezione destinatari (tipo + categorie) | ✅ | 11.11 | modules/team/notifications.js | ~10min |
| 11.13 | Backend: filtro GET notifiche per `destinatario_tipo` in base al ruolo richiedente | ✅ | 11.11 | routes/notification.js | ~5min |
| 11.14 | Notifiche convocazione differenziate: testo diverso per atleta vs genitore | ✅ | 11.11, 11.2 | routes/convocazioni.js | ~5min |

#### Fase 7: UI generazione link (aggiornamento)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 11.15 | Aggiornare UI "Genera Link" — rinominare tipi in "Atleta" e "Genitore" (invece di guest generico) | ✅ | 11.2 | modules/admin/guestLinks.js | ~5min |
| 11.16 | Test build completo + aggiornare docs | ✅ | 11.15 | DEVELOPMENT_PLAN.md, AGENTS.md | ~5min |

**Effort totale stimato**: ~2h 10min (16 task + 3 sotto-task)

**Note architetturali**:
- L'infrastruttura `guest_token` resta invariata (link senza registrazione)
- Il JWT guest contiene già `tipo` — basta usarlo per routing e capabilities
- Le home atleta/genitore sono pagine standalone (non usano sidebar staff)
- La priorità notifiche è un campo semplice, non un sistema di regole complesso
- Le comunicazioni fase 1 usano la tabella `notification` esistente con filtro `destinatario_tipo`

---

## 4. Dipendenze tra Epic

```
EPIC 1 (Pulizia DB) ──→ nessuna dipendenza, può partire subito
EPIC 2 (Infortuni) ──→ nessuna dipendenza
EPIC 3 (Visite Mediche) ──→ nessuna dipendenza
EPIC 4 (Opponent) ──→ nessuna dipendenza
EPIC 6 (Polish) ──→ nessuna dipendenza
EPIC 7 (Tornei) ──→ nessuna dipendenza (codice già pronto)
EPIC 9 (Workspace Hub) ──→ nessuna dipendenza
EPIC 11 (Atleta/Genitore) ──→ nessuna dipendenza (usa infrastruttura guest_token esistente)
EPIC 12 (Club Operations) ──→ dipende parzialmente da EPIC 11 (notifiche genitore per scadenze quote)
EPIC 13 (Preseason) ──→ nessuna dipendenza
EPIC 14 (Match Center Evolution) ──→ nessuna dipendenza
EPIC 15 (PWA Offline-First) ──→ nessuna dipendenza (usa infrastruttura PWA già installata)
EPIC 16 (Print Center) ──→ nessuna dipendenza (riusa endpoint e logica stampa esistenti)
EPIC 17 (Piano Gara) ──→ nessuna dipendenza (usa Match Center e rosa esistenti)
```

Tutte le Epic sono indipendenti. L'ordine consigliato per impatto/effort:
1. **EPIC 1** (pulizia, 20min) → riduce debito tecnico ✅
2. **EPIC 2** (infortuni, 43min) → feature richiesta dai mister ✅
3. **EPIC 11** (atleta/genitore, ~2h) → evoluzione accesso utenti, alto valore percepito ✅
4. **EPIC 16** (Print Center, ~3h15) → differenziatore commerciale, hub documentale, risolve Android ✅
5. **EPIC 17** (Piano Gara, ~4h15) → differenziatore forte, nessuna app giovanile lo offre
6. **EPIC 15** (PWA offline-first, ~2h) → differenziatore commerciale, campo sportivo
7. **EPIC 14** (Match Center evolution, ~53min) → UX bordo campo (complementare a EPIC 17)
8. **EPIC 3** (visite, 35min) → scadenze mediche = obbligo FIGC
9. **EPIC 4** (anagrafica avversari, ~74min) → base per futuro + sinergia con note avversario EPIC 17
10. **EPIC 6** (polish, 33min) → UX
11. **EPIC 9** (workspace hub, ~57min) → gestione superadmin
12. **EPIC 7** (tornei, 37min) → nice-to-have
13. **EPIC 12** (club operations, ~10h) → valore società, post-EPIC 11
14. **EPIC 13** (preseason, ~76min) → utile solo 2-3 settimane/anno, bassa priorità

---

## 5. Backlog Futuro (post-MVP)

| Area | Feature | Priorità |
|------|---------|----------|
| Comunicazioni | Email convocazioni (SendGrid) | P2 |
| Comunicazioni | ~~Notifiche in-app~~ | ✅ |
| Calendario | Integrazione Google Calendar | P2 |
| Performance | Test fisici (semplificati) | P3 |
| Performance | Piano individuale giocatore | P3 |
| UI | ~~Timeline partita animata~~ (fatto in Match Center) | ✅ |
| UI | ~~Formazione live con sostituzioni~~ (fatto in Match Center) | ✅ |
| Tech | TypeScript graduale | P3 |
| Tech | Test E2E (Playwright) | P3 |
| Mobile | ~~App nativa~~ → PWA installabile (già fatto) | ✅ |

---

## 6. Bug Noti

| Severità | Descrizione | File |
|----------|-------------|------|
| Minore | Valutazioni giocatore: UI incompleta | valutazioni.js |

---

## 7. Changelog Recente

| Commit | Descrizione |
|--------|-------------|
| v3.16.34 | feat: EPIC 3 Certificati Medici — badge "⚠️ Cert. scaduto" / "⏳ Cert. in scadenza" nelle convocazioni + banner riepilogativo se ≥1 convocato ha certificato scaduto/mancante |
| v3.16.33 | fix: guest header — rimosso selettore squadra/stagione, avatar con logout (atleta: iniziali, genitore: G), fix loadSquadre per guest con workspaceInfo |
| v3.16.32 | fix: aggiorna card dashboard in tempo reale dopo salvataggio convocazioni (refreshDashConvCards), data-conv-stato/alert attributes |
| v3.16.31 | fix: cache invalidation completa — aggiunta invalidateDashboardCache in roster, trainingPresenze, trainingSessions, trainingSettings, importCenter + TTL dashboard 2min→5min |
| v3.16.30 | fix: invalidate dashboard cache dopo salvataggio/pubblicazione convocazioni + logo avversario nella card segreteria |
| v3.16.29 | fix: teamMatch QUALIFIERS (isOurTeam false positives), aggregabili anno_da=0, import diagnostics marcatori GR |
| v3.16.27 | feat: EPIC 9 Workspace Hub — vista dettaglio workspace con tab Info (form inline modificabile con logo/facility), Stagioni (lista con team, crea, attiva + gestione categorie inline: crea/elimina), Utenti (lista con profilo/categorie, crea rapido, modifica inline). Backend: GET teams per stagione, PUT attiva stagione |
| v3.16.24 | fix: report giocatore "Altro" → "Amichevole" (backend career + frontend playerDetail + reports), presenze fallback match_statistics, subtotali per competizione, query ottimizzate (5 vs 7), Print Center rinominato "Report Squadra", help in-app Print Center, mobile print rosa/scadenze (overflow-x + padding ridotto + colonna Stato nascosta), registro presenze mobile max 3 settimane con highlight raggiungibili, eliminata categoria U18 vuota Albalonga |
| — | feat: EPIC 16 Print Center completo — hub documentale centralizzato con 7 documenti stampabili (Convocazione, Distinta, Formazione, Report, Presenze, Rosa, Scadenze), varianti (telefoni/staff/torneo), cronologia, Web Share API, pagine standalone A4 |
| v3.16.13 | fix: convocazioni assenze relative a settimana partita (non corrente), certificati medici responsive (1 colonna mobile, badge toggle singola sezione) |
| — | data: import amichevoli 2025/26 (6 partite) e 2024/25 (15 partite) da Google Sheets, fix tipo_evento (GOL→GOAL, ASS→ASSIST, AMMONIZIONE→YELLOW, ESPULSIONE→RED), fix formazioni ordine per ruolo (POR slot 0), fix gol trasferta (convenzione: gol_casa=nostri, gol_ospite=avversario), fix risultati campionato Fonte Meravigliosa e Fortitudo |
| v3.16.12 | fix: print mobile iOS/Android (afterprint cleanup), tipo_competizione default Amichevole, report (null) fix |
| — | fix: migrazione stagione include infortunati + migra injury.team_id, dashboard card con semantica corretta (infortunati=indisponibili, assenze comunicate=assenti), badge convocazioni non duplicato |
| — | feat: welcome card onboarding dismissable in dashboard, differenziata per profilo (allenatore/segreteria/dirigente/vice) |
| — | fix: flusso convocazioni — pallino Pubblica ora giallo (visibile su sfondo viola), calendario e MC vincolati a pubblicazione effettiva (non solo salvataggio) |
| — | perf: dashboard card convocazione — 1 sola API call condivisa tra card partita e card segreteria, rimossa /convocati ridondante da calendario, rimosso fallback /convocazioni da MC loadGiocatori |
| — | fix: card Staff dashboard — mostra tutto lo staff tecnico di campo (ordinato), flusso formazione/distinta con check convocazioni pubblicate |
| — | fix: convocazioni — rosa minimo 11 + assenze settimanali da training_attendance (non da comunicazioni atleta) |
| — | feat: distinta — capitano/vice da team_player, assistente arbitro in form Compila, nome PDF dinamico, cerchio titolari 14px |
| 1feff73 | fix: Import Center — preview anteprima prima di importare da Portale Regionale |
| 2e2e838 | feat: numeri maglia per partita — input editabile in formazione, distinta cerchiata, bottone Distinta in MC |
| 28bf43d | refactor: build counter non si incrementa più durante build — solo con npm run release |
| 57a03c8 | feat: frontend version bump v3.15→v3.16 + auto-bump minor al superamento build 99 |
| 2d192bd | feat: register_past UX + convocazione nome fix + help expansion |
| 6a7ab79 | feat: expand in-app help — Match Center interactive + convocazioni/formazione PAGE_HELP |
| fdbce1f | fix: mobile tables + missing result badge + register_past |
| a903050 | fix: add logo lookup to main /partite endpoint + optimize with shared cache (TTL 2min) |
| 5f66734 | fix: mobile UX (avatar, landscape sidebar toggle, stagione rimossa) + report eventi ordinati per minuto |
| 9efcf28 | fix: mobile UX — ripristino avatar header, toast landscape, CSS landscape compatto |
| def6cb9 | fix: Lighthouse accessibility — meta description, robots.txt, alt img, heading order, contrasto colori |
| 5b003be | feat: PWA installabile — manifest, icone, screenshots, registerSW autoUpdate, banner offline |
| 47e6d4e | fix: certificati medici + distinta + convocazioni flusso + ordine nomi |
| 2609208 | feat: ristrutturazione Centro Comunicazioni — tabs Inviate/Ricevute, Rispondi atleta |
| d9730c0 | feat: convocazione dettagliata in home genitore e atleta |
| a06dde8 | feat: flusso convocazione completo — congelamento indisponibili, vedi convocazione |
| e510054 | feat: risposta convocazione + fix congruenza flusso |
| 33f6774 | refactor: capabilities system + convocazioni pubblica + indisponibilità inline |
| 362bc6a | fix: report partita mostra solo partite Terminate + training calendar fix |
| 80f5743 | perf: v3.16 — indici DB, VIEW aggregate, endpoint dashboard unificato |
| a3039dd | feat: tipo competizione + girone — dropdown 4 opzioni, distinta/convocazione dinamiche |
| 938a561 | feat: Centro Comunicazioni — notifiche in-app, segreteria capabilities, widget convocazione |
| d096ec3 | perf: dashboard cold start -1.5s — dedup API, certificati in JOIN, rimossi fetch ridondanti |
| e1edbd4 | feat: offline support — banner globale, buffer localStorage MC + presenze, auto-sync |
| 79c3db5 | fix: certificati toggle, rimozione Sposta, distinta fixes, diffidati mod5, modali no-overlay-close |
| 4793e78 | feat: carriera espandibile — click su stagione mostra partite con DataGrid |

> **Nota**: per lo storico completo dei commit precedenti, consultare `git log --oneline`.

---

## 8. Convenzioni Operative

### Come lavorare con questo documento

1. **Inizio chat** → Leggi questo file + `.amazonq/rules/project-rules.md`
2. **Prima di implementare** → Identifica l'Epic e il task ID
3. **Durante** → Aggiorna stato task (⬜ → ⏳ → ✅)
4. **Dopo** → Aggiorna changelog, commit

### Stato task
- ⬜ Da fare
- ⏳ In corso
- ✅ Completato
- ⏸️ Sospeso
- ❌ Cancellato

### Aggiungere nuovi task
- Ogni task deve essere **atomico** (max 15min di lavoro)
- Deve avere: ID univoco, dipendenze esplicite, file coinvolti
- Se un task supera 15min → spezzarlo in sotto-task

### Aggiungere nuove Epic
- Formato: `EPIC N: Titolo`
- Deve avere: descrizione breve, tabella task, dipendenze
- Aggiornare sezione 4 (dipendenze)
