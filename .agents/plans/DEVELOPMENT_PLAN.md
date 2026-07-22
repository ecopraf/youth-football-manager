# Youth Football Manager — Development Plan

> **Fonte di verità unica** per lo stato del progetto, task, dipendenze e priorità.
> Ultimo aggiornamento: 17 Luglio 2026 | Versione: v3.16 | Build: v3.16.68

---

## 1. Stato Attuale

| Campo | Valore |
|-------|--------|
| Versione | v3.16 |
| Target MVP | 15 Settembre 2026 |
| Frontend | Vite + JS ES Modules → Vercel |
| Backend | Node.js/Express (20 router) → Vercel |
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
| Tesseramento | ✅ | modules/club/registration.js, routes/registration.js, modules/print/printTesseramento.js, utils/capabilities.js (capability dedicata) |
| Print Center | ✅ | modules/team/printCenter.js, modules/print/*.js (EPIC 16) |

---

## 3. Epics & Micro-Task

> **Epic completati archiviati** in `DEVELOPMENT_PLAN_ARCHIVE.md`: EPIC 1, 2, 3, 6, 8, 9, 10, 11, 12, 16, 18, 20, 21 (Fase 1-6).

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

### EPIC 7: Tornei (riattivazione)

> Codice già pronto, solo da riattivare e completare.

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 7.1 | Riattivare link sidebar Tornei | ⬜ | — | sidebar.js | ~2min |
| 7.2 | Generazione calendario round-robin | ⬜ | 7.1 | modules/coach/tournaments.js | ~15min |
| 7.3 | Inserimento partite torneo nel calendario | ⬜ | 7.2 | routes/tournament.js | ~10min |
| 7.4 | Classifica live girone | ⬜ | 7.3 | modules/coach/tournaments.js | ~10min |

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

### EPIC 22: Refactoring Capabilities — Gruppi Espandibili + Profili Custom

> Ristrutturare il sistema capabilities con gruppi funzionali (es. "Segreteria", "Tecnico", "Dirigenza") che fungono da preset espandibili. Ogni gruppo contiene le singole capabilities. Per profili custom: espandi il gruppo e abilita/disabilita le singole voci. UX wizard migliorata con card espandibili.

**Valore**: Flessibilità totale nella configurazione permessi. Società con ruoli ibridi (es. dirigente che fa anche segreteria) possono comporre il profilo perfetto senza dover scegliere un preset rigido.

#### Fase 1: Modello dati e struttura gruppi

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 22.1 | Definire struttura CAPABILITY_GROUPS (array di gruppi, ogni gruppo ha id, label, icon, capabilities[]) | ⬜ | — | capabilities.js | ~5min |
| 22.2 | Raggruppare capabilities esistenti: Tecnico (rosa, partite, convocazioni, formazione, allenamenti, statistiche), Segreteria (quote, kit, tesseramento, import, guest_links), Comunicazione (report) | ⬜ | 22.1 | capabilities.js | ~5min |
| 22.3 | Aggiornare backend mirror capabilities.js | ⬜ | 22.2 | api/helpers/capabilities.js | ~3min |

#### Fase 2: UI Wizard Permessi

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 22.4 | Refactoring wizard utenti — card per gruppo con header (nome + icona + toggle "tutto") | ⬜ | 22.2 | modules/admin/ | ~15min |
| 22.5 | Click su header gruppo → espande lista singole capabilities con toggle read/write/none | ⬜ | 22.4 | modules/admin/ | ~10min |
| 22.6 | Preset profili (Allenatore, Segreteria, ecc.) → pre-seleziona i gruppi corretti, utente può poi personalizzare | ⬜ | 22.5 | modules/admin/ | ~10min |
| 22.7 | Salvataggio: se profilo modificato rispetto al preset → salva come "custom" con capabilities esplicite | ⬜ | 22.6 | modules/admin/ | ~5min |
| 22.8 | Retrocompatibilità: utenti esistenti con vecchio formato permessi continuano a funzionare | ⬜ | 22.4 | capabilities.js | ~5min |

#### Fase 3: Sidebar e controlli accesso

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 22.9 | Sidebar: raggruppare voci per gruppo capability (separatori visivi opzionali) | ⬜ | 22.2 | sidebarNav.js | ~10min |
| 22.10 | Test completo: creare utente custom, verificare sidebar + accesso pagine + backend permission | ⬜ | 22.9 | — | ~10min |

**Effort totale stimato**: ~1h 20min

**Dipendenze**: Nessuna (standalone, refactoring puro)

---

### EPIC 23: Player Performance Center

> Pagina dedicata sotto la sezione Performance per trasformare i voti partita in conoscenza strategica. Vista rosa aggregata (classifica interna, analisi per reparto, top performer) + vista giocatore (trend voti, media, eventi correlati). Obiettivo: da sistema di data entry a sistema di decision support per allenatori e DS.

**Valore commerciale**: Nessun gestionale dilettantistico offre analytics sui voti. L'allenatore vede in un colpo d'occhio chi sta crescendo, chi è in calo, quali reparti sono deboli. Il DS ha elementi oggettivi per le decisioni di mercato.

**Prerequisito**: Dati sufficienti = almeno 5 partite con valutazioni inserite. Sotto questa soglia mostrare stato "Dati insufficienti".

#### Fase 1: Backend — Endpoint aggregati

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 23.1 | Endpoint `GET /api/squadre/:teamId/performance-summary` — per ogni giocatore: media voti, n° valutazioni, trend (media ultimi 5 vs precedenti), minuti totali, gol/assist/cartellini da match_event | ⬜ | — | routes/statistics.js | ~15min |
| 23.2 | Endpoint `GET /api/calciatori/:playerId/performance-detail?team_id=X` — lista valutazioni con dati partita (avversario, data, competizione, minuti, eventi), media mensile, trend | ⬜ | — | routes/statistics.js | ~10min |

#### Fase 2: Pagina base — Vista Rosa

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 23.3 | Creare `modules/performance/playerPerformance.js` — struttura pagina con due view: Rosa (default) e Giocatore | ⬜ | 23.1 | modules/performance/playerPerformance.js | ~10min |
| 23.4 | Sezione "🏆 Top Performer" — top 5 per media voti con badge trend (⬆⬇➡) e mini-sparkline | ⬜ | 23.3 | modules/performance/playerPerformance.js | ~12min |
| 23.5 | Sezione "📊 Analisi per Reparto" — media voti per ruolo (Portieri/Difensori/Centrocampisti/Attaccanti) con heatmap colorata (🟢🟡🔴) | ⬜ | 23.3 | modules/performance/playerPerformance.js | ~10min |
| 23.6 | Sezione "📋 Classifica Rosa" — tabella tutti i giocatori ordinata per media voti, con colonne: nome, media, trend, presenze valutate, gol, assist | ⬜ | 23.3 | modules/performance/playerPerformance.js | ~12min |
| 23.7 | Sezione "⚠️ Senza valutazioni" — giocatori con 0 voti nelle ultime 3 partite (reminder per l'allenatore) | ⬜ | 23.3 | modules/performance/playerPerformance.js | ~8min |

#### Fase 3: Vista Giocatore

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 23.8 | Click su giocatore → vista dettaglio con header (nome, media, trend, minuti totali) | ⬜ | 23.4 | modules/performance/playerPerformance.js | ~8min |
| 23.9 | Grafico trend voti — canvas line chart (ultime 10 partite) con punti cliccabili, asse X = data partita | ⬜ | 23.8 | modules/performance/playerPerformance.js | ~15min |
| 23.10 | Statistiche aggregate — media stagionale, media ultimi 5 vs precedenti (con delta colorato), miglior voto, peggior voto | ⬜ | 23.8 | modules/performance/playerPerformance.js | ~8min |
| 23.11 | Lista partite valutate — card per partita con voto, minuti, avversario, data, eventi (⚽🅰️🟨🟥), nota allenatore | ⬜ | 23.8 | modules/performance/playerPerformance.js | ~12min |
| 23.12 | Analisi mensile — media voti per mese (barre orizzontali colorate) | ⬜ | 23.8 | modules/performance/playerPerformance.js | ~10min |

#### Fase 4: Integrazione

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 23.13 | Sidebar: voce "⭐ Performance" sotto sezione Performance (capability: `statistiche`) | ⬜ | 23.3 | components/layout/sidebarNav.js | ~3min |
| 23.14 | Router: registrare route `playerPerformance` | ⬜ | 23.3 | router.js | ~2min |
| 23.15 | PlayerDetail: link "→ Vedi performance" nella sezione valutazioni che naviga alla pagina con giocatore pre-selezionato | ⬜ | 23.8 | modules/team/playerDetail.js | ~5min |
| 23.16 | Dashboard: widget "⭐ Top Performer" — top 3 giocatori per media voti (ultimi 30gg), visibile per allenatore/admin | ⬜ | 23.1 | modules/team/dashboard.js | ~10min |
| 23.17 | helpData.js: aggiungere entry per pagina playerPerformance | ⬜ | 23.3 | components/helpData.js | ~3min |
| 23.18 | Test build completo + aggiornare docs (AGENTS.md, DATABASE_SCHEMA) | ⬜ | 23.17 | .agents/ | ~3min |

**Effort totale stimato**: ~2h 38min (18 task)

**Priorità implementazione**:
1. Fase 1 (Backend) — dati aggregati, 25min
2. Fase 2 (Vista Rosa) — valore immediato per l'allenatore, 52min
3. Fase 3 (Vista Giocatore) — approfondimento per singolo atleta, 53min
4. Fase 4 (Integrazione) — connessioni con resto app, 26min

**Note architetturali**:
- Nessuna tabella DB nuova — tutto basato su `valutazione_partita` + `match_event` + `match` esistenti
- Il trend è calcolato: media ultimi 5 voti vs media voti precedenti (se <5 voti totali → solo media, no trend)
- La heatmap reparto usa soglie: media ≥7 = 🟢, 6-6.9 = 🟡, <6 = 🔴
- Il grafico trend usa `utils/charts.js` già esistente
- La vista giocatore è una sub-view nella stessa pagina (no navigazione separata) — URL con `?playerId=X` per deep-link da playerDetail
- Capability richiesta: `statistiche: read` (stessa delle statistiche esistenti)
- Soglia dati minimi: <3 valutazioni per giocatore → mostrare "Dati insufficienti" invece di media
- I minuti giocati vengono da `valutazione_partita` (già salvati nella tab MC) — NON da match_formation
- **Non implementare ora**: micro-valutazioni (Tecnica/Tattica/ecc.), radar chart, confronto giocatori, valutazione AI conferma/svincolo — richiedono più stagioni di dati per essere significativi

**Dipendenze**: Nessuna (usa dati già esistenti)

---

### EPIC 24: Inbox Comunicazioni

> Vista organizzata per admin/segreteria che aggrega tutte le comunicazioni in entrata in un'unica pagina strutturata: assenze atleti, risposte convocazioni, notifiche bonifici, avvisi generali. Complementare alla campanellina (che rimane per il badge globale) — l'inbox è la vista dettaglio con azioni rapide e archivio.

**Valore commerciale**: Con l'aumento degli utenti e delle comunicazioni, la campanellina da sola non basta. L'inbox permette a segreteria e admin di avere tutto sotto controllo senza perdere messaggi importanti, con azioni rapide inline (conferma bonifico, vai alla partita, segna letto).

**Prerequisito**: Tabelle `notification` e `absence_notification` già esistenti e popolate.

#### Fase 1: Backend — Endpoint aggregati

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 24.1 | Endpoint `GET /api/inbox?workspace_id=X&team_id=Y&tipo=all\|assenze\|avvisi\|convocazioni&letto=all\|true\|false&limit=50&offset=0` — aggrega `notification` + `absence_notification` in lista unificata ordinata per data desc, con contatori per tipo | ✅ | — | backend/api/routes/inbox.js (nuovo) | ~15min |
| 24.2 | Endpoint `PUT /api/inbox/mark-read` — body `{ids: [...], tipo: 'notification'\|'absence'}` — segna letti in batch | ✅ | 24.1 | backend/api/routes/inbox.js | ~8min |
| 24.3 | Endpoint `PUT /api/inbox/mark-all-read` — segna tutti letti per workspace+team (filtro tipo opzionale) | ✅ | 24.1 | backend/api/routes/inbox.js | ~5min |
| 24.4 | Registrare router inbox in `index.js` | ✅ | 24.1 | backend/api/index.js | ~2min |

#### Fase 2: Pagina Inbox Frontend

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 24.5 | Creare `modules/club/inbox.js` — struttura pagina con header (titolo + "Segna tutti letti"), tab bar pill: Tutti / Assenze / Convocazioni / Avvisi / Bonifici, summary contatori non letti per tab | ✅ | 24.1 | modules/club/inbox.js | ~10min |
| 24.6 | Lista messaggi — card per ogni item con: icona tipo (🏃 assenza, 📋 convocazione, 💰 bonifico, 📢 avviso), titolo, testo preview, data relativa (es. "2 ore fa"), badge "Nuovo" se non letto, sfondo leggermente diverso per non letti | ✅ | 24.5 | modules/club/inbox.js | ~12min |
| 24.7 | Azioni rapide inline per tipo: assenza → "Vai all'allenamento"; convocazione indisponibile → "Vai alla partita"; bonifico → "Conferma / Rifiuta" (riusa modal esistente da fees.js); avviso generico → "Segna letto" | ✅ | 24.6 | modules/club/inbox.js | ~15min |
| 24.8 | Paginazione — carica 20 item alla volta, bottone "Carica altri" in fondo | ✅ | 24.6 | modules/club/inbox.js | ~8min |
| 24.9 | Sezione "Archivio" — messaggi letti con data > 30gg collassati in accordion, espandibile con click | ✅ | 24.6 | modules/club/inbox.js | ~8min |
| 24.10 | Filtro squadra — se admin con più squadre, dropdown per filtrare per categoria | ✅ | 24.5 | modules/club/inbox.js | ~5min |

#### Fase 3: Integrazione

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 24.11 | Sidebar: voce "📬 Inbox" con badge contatore non letti, visibile a admin/segreteria/dirigente | ✅ | 24.5 | components/layout/sidebarNav.js | ~5min |
| 24.12 | Router: registrare route `inbox` | ✅ | 24.5 | router.js | ~2min |
| 24.13 | Campanellina: click naviga a `/inbox` invece di aprire dropdown (il dropdown rimane solo per preview rapida top 3) | ❌ | 24.5 | components/layout/header.js | ~8min |
| 24.14 | helpData.js: aggiungere entry per pagina inbox | ✅ | 24.5 | components/helpData.js | ~3min |
| 24.15 | Test build + aggiornare AGENTS.md | ✅ | 24.14 | .agents/AGENTS.md | ~3min |

**Effort totale stimato**: ~1h 49min (15 task)

**Priorità implementazione**:
1. Fase 1 (Backend) — endpoint aggregati, 30min
2. Fase 2 (Pagina) — lista + azioni rapide, 58min
3. Fase 3 (Integrazione) — sidebar + router + campanellina, 21min

**Note architetturali**:
- Nessuna tabella DB nuova — tutto basato su `notification` + `absence_notification` esistenti
- Il tipo "bonifico" è un sottoinsieme di `notification` con `tipo = 'ricevuta_bonifico'` — filtrato lato backend
- La campanellina mantiene il suo dropdown per preview rapida (top 3 non letti) — l'inbox è la vista completa
- Capability richiesta: visibile a chi ha ruolo admin/segreteria/dirigente
- L'archivio 30gg è calcolato lato frontend — filtra la lista già caricata
- Azioni bonifico riusano gli endpoint esistenti `PUT /api/fees/installments/:id/conferma-bonifico` e `/rifiuta-bonifico`
- Mobile: card full-width, azioni rapide come bottoni piccoli sotto il testo

---

### EPIC 25: Raise Ticket — Segnalazione Bug & Supporto

> Widget flottante discreto accessibile da tutte le pagine autenticate che permette agli utenti di segnalare problemi, inviare suggerimenti o chiedere supporto. Il ticket viene inviato via email a `youthfootballmanager@gmail.com` con contesto automatico (URL, versione build, workspace, ruolo, user agent). Supporta allegato screenshot (upload o paste da clipboard).

**Valore commerciale**: Con più società a bordo e utenti con esperienze diverse, il supporto diventa critico. Un sistema di ticket integrato riduce la frizione e fornisce contesto tecnico automatico che accelera la risoluzione. Professionalizza l'immagine del prodotto.

**Prerequisito**: Configurare Gmail App Password per SMTP in `.env`.

#### Fase 1: Backend — Endpoint + Email

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 25.1 | Installare `nodemailer` (`npm install nodemailer`) + configurare transporter Gmail SMTP con `SUPPORT_EMAIL_USER` e `SUPPORT_EMAIL_PASS` in `.env` | ✅ | — | backend/package.json, backend/.env | ~5min |
| 25.2 | Endpoint `POST /api/support/ticket` (auth opzionale) — body: `{tipo, descrizione, url_pagina, screenshot_base64?}` — raccoglie contesto server-side e invia email a `youthfootballmanager@gmail.com` | ✅ | 25.1 | backend/api/routes/support.js (nuovo) | ~15min |
| 25.3 | Email template HTML — sezioni: Tipo ticket (🐛 Bug / 💡 Suggerimento / ❓ Domanda), Descrizione utente, Contesto tecnico (URL, build version, workspace, ruolo, user agent, timestamp), Screenshot inline se allegato | ✅ | 25.2 | backend/api/routes/support.js | ~10min |
| 25.4 | Registrare router support in `index.js` | ✅ | 25.2 | backend/api/index.js | ~2min |

#### Fase 2: Widget Frontend

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 25.5 | Creare `components/supportWidget.js` — bottone flottante `❓` in basso a destra (`position:fixed; bottom:24px; right:24px; z-index:1500`), visibile su tutte le pagine autenticate (escluso pagine print) | ✅ | — | components/supportWidget.js (nuovo) | ~8min |
| 25.6 | Modal ticket — campi: tipo (pill: 🐛 Bug / 💡 Suggerimento / ❓ Domanda), textarea descrizione (placeholder contestuale per tipo), upload screenshot opzionale (accept: image/*, max 2MB) | ✅ | 25.5 | components/supportWidget.js | ~12min |
| 25.7 | Paste screenshot da clipboard — listener `paste` sulla modal che intercetta immagini dagli appunti e le mostra come preview con bottone rimuovi | ✅ | 25.6 | components/supportWidget.js | ~10min |
| 25.8 | Raccolta contesto automatico: `window.location.href`, `window.YFM.buildVersion`, `window.YFM.workspaceName`, ruolo utente da sessionStorage, `navigator.userAgent` — inclusi nel payload senza input utente | ✅ | 25.6 | components/supportWidget.js | ~5min |
| 25.9 | Submit + feedback — spinner durante invio, toast "✅ Segnalazione inviata!" su successo, chiusura automatica modal dopo 2s | ✅ | 25.6 | components/supportWidget.js | ~8min |
| 25.10 | Throttle anti-spam — max 3 ticket per sessione (contatore in sessionStorage), oltre il limite mostra messaggio con email diretta | ✅ | 25.9 | components/supportWidget.js | ~5min |

#### Fase 3: Integrazione

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 25.11 | Inizializzare `supportWidget` in `main.js` dopo il login (non per guest) — `initSupportWidget()` chiamata dopo `setupLayout()` | ✅ | 25.5 | main.js | ~3min |
| 25.12 | Nascondere widget su pagine print — check `window.location.hash.includes('print')` prima di mostrare il bottone | ✅ | 25.5 | components/supportWidget.js | ~2min |
| 25.13 | Test build + aggiornare AGENTS.md con nuovo router e componente | ✅ | 25.11 | .agents/AGENTS.md | ~3min |

**Effort totale stimato**: ~1h 28min (13 task)

**Priorità implementazione**:
1. Fase 1 (Backend + Email) — infrastruttura, 32min
2. Fase 2 (Widget) — UX completa, 48min
3. Fase 3 (Integrazione) — collegamento app, 8min

**Note architetturali**:
- Nessuna tabella DB — i ticket vanno direttamente via email, nessuno storage interno
- Gmail SMTP: usare App Password (non password account) — generare da Google Account → Sicurezza → Password app
- Screenshot: convertito in base64 lato frontend, inviato come stringa nel body JSON (max 2MB), incluso nell'email come `<img>` inline
- Il widget NON è visibile ai guest
- `Reply-To` impostata sull'email dell'utente che ha inviato il ticket per risposta diretta
- Tipo "Bug" pre-selezionato di default
- **Non implementare ora**: dashboard ticket, stati aperto/chiuso, assegnazione, SLA

---

### EPIC 27: Support Ticket Management

> Persistenza ticket nel DB + pagina superadmin per gestione ticket con risposta via email e pulizia.

**Prerequisito**: EPIC 25 ✅ (widget ticket già funzionante, endpoint `/support/ticket` già esistente).

#### Fase 1: Persistenza ticket nel DB

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 27.1 | Migrazione DB: CREATE TABLE `support_ticket` (id UUID PK, workspace_id UUID nullable, user_id UUID nullable, email TEXT, nome TEXT, ruolo TEXT, pagina TEXT, tipo TEXT, descrizione TEXT, build TEXT, user_agent TEXT, stato TEXT DEFAULT 'aperto', risposta TEXT, risposta_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now()) + RLS deny anon | ✅ | — | migrazione SQL | ~5min |
| 27.2 | Aggiornare `POST /api/support/ticket` — salva nel DB oltre a inviare email | ✅ | 27.1 | backend/api/routes/support.js | ~5min |

#### Fase 2: Pagina superadmin

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 27.3 | Backend: `GET /api/support/tickets` (solo superadmin) — lista con filtri `stato` (aperto/chiuso/tutti) e `workspace_id` | ✅ | 27.1 | backend/api/routes/support.js | ~8min |
| 27.4 | Backend: `PUT /api/support/tickets/:id/rispondi` — salva risposta + cambia stato a 'chiuso' + invia email all'utente | ✅ | 27.3 | backend/api/routes/support.js | ~10min |
| 27.5 | Backend: `PUT /api/support/tickets/:id/stato` — cambia stato (aperto/chiuso) senza risposta | ✅ | 27.3 | backend/api/routes/support.js | ~3min |
| 27.6 | Backend: `DELETE /api/support/tickets/:id` — elimina singolo ticket | ✅ | 27.3 | backend/api/routes/support.js | ~3min |
| 27.7 | Backend: `DELETE /api/support/tickets/chiusi` — elimina tutti i ticket con stato='chiuso' | ✅ | 27.3 | backend/api/routes/support.js | ~3min |
| 27.8 | Frontend: creare `modules/admin/supportTickets.js` — lista ticket con filtri stato/workspace, card per ticket con tipo/pagina/build/data/stato badge | ✅ | 27.3 | modules/admin/supportTickets.js (nuovo) | ~12min |
| 27.9 | Frontend: dettaglio ticket — espansione inline con descrizione completa + form risposta textarea + bottone Invia Risposta | ✅ | 27.8 | modules/admin/supportTickets.js | ~10min |
| 27.10 | Frontend: azioni ticket — bottone Chiudi (senza risposta), 🗑️ Elimina singolo (confirm modal), 🧹 "Pulisci ticket chiusi" (confirm con conteggio) | ✅ | 27.8 | modules/admin/supportTickets.js | ~8min |
| 27.11 | Sidebar + router: voce "🎫 Ticket" visibile solo superadmin, route `supportTickets` | ✅ | 27.8 | sidebarNav.js, router.js | ~3min |
| 27.12 | helpData.js + test build + aggiornare docs | ✅ | 27.11 | helpData.js, AGENTS.md, DEVELOPMENT_PLAN.md | ~5min |

**Effort totale stimato**: ~75min (12 task)

**Note architetturali**:
- `workspace_id` e `user_id` nullable per ticket inviati da utenti non autenticati (futuro)
- La risposta viene inviata all'email del mittente (già nel body del ticket)
- Stato: `aperto` (default) → `chiuso` (dopo risposta o chiusura manuale)
- Eliminazione: hard delete diretto, nessuna soft-delete
- `DELETE /api/support/tickets/chiusi` è un endpoint dedicato (non batch generico) per semplicità
- Visibilità: solo superadmin (ruolo `superadmin` nel JWT)
- Screenshot non salvato nel DB (solo inviato via email) — troppo pesante per storage DB

---

### EPIC 26: Pagamenti Online (Stripe Connect)

> Permettere ai genitori di pagare le quote direttamente in app tramite carta di credito. Ogni workspace collega il proprio account Stripe. Fase naturale successiva a EPIC 21 (bonifico + upload ricevuta, già completato).

**Prerequisito**: Account Stripe della società + verifica legale/fiscale ASD. Dipende da EPIC 21 ✅ (infrastruttura quote già pronta).

**Valore commerciale**: Elimina la frizione del bonifico manuale, pagamento immediato con carta, riconciliazione automatica. Differenziatore forte rispetto a gestionali concorrenti.

#### Fase 1: Backend

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 26.1 | Installare `stripe` in backend (`npm install stripe`) + aggiungere `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` in `.env` | ⬜ | — | backend/package.json, backend/.env | ~5min |
| 26.2 | Endpoint POST `/api/fees/installments/:id/checkout` — crea Stripe Checkout Session (importo + commissione piattaforma) | ⬜ | 26.1 | backend/api/routes/payments.js (nuovo) | ~10min |
| 26.3 | Endpoint POST `/api/webhooks/stripe` — webhook `payment_intent.succeeded` → aggiorna rata automaticamente (stato pagata + metodo_pagamento = 'stripe') | ⬜ | 26.2 | backend/api/routes/payments.js | ~10min |
| 26.4 | Endpoint POST `/api/workspaces/:id/stripe-connect` — avvia OAuth flow Stripe Connect per collegare account workspace | ⬜ | 26.1 | backend/api/routes/payments.js | ~15min |
| 26.5 | Registrare router payments in `index.js` | ⬜ | 26.2 | backend/api/index.js | ~2min |

#### Fase 2: Frontend

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 26.6 | Home Famiglia: bottone "💳 Paga online" accanto a "📎 Carica ricevuta" — redirect a Stripe Checkout | ⬜ | 26.2 | modules/auth/guestAtleta.js | ~5min |
| 26.7 | Vista quote admin: badge "💳 Online" vs "🏦 Bonifico" vs "💵 Contanti" nella colonna metodo pagamento | ⬜ | 26.3 | modules/club/fees.js | ~5min |
| 26.8 | Config workspace: sezione Stripe (bottone "Collega account Stripe", stato connessione, toggle test/live mode) | ⬜ | 26.4 | modules/club/settings.js | ~8min |

#### Fase 3: Finalizzazione

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 26.9 | Help in-app: aggiungere helpData per flusso pagamento online (guest + segreteria) | ⬜ | 26.6 | components/helpData.js | ~5min |
| 26.10 | Test build completo + aggiornare AGENTS.md | ⬜ | 26.9 | .agents/AGENTS.md | ~3min |

**Effort totale stimato**: ~1h 8min (10 task)

**Note architetturali**:
- Stripe Connect: ogni workspace ha il proprio account Stripe — i pagamenti vanno direttamente alla società, la piattaforma trattiene una commissione configurabile
- Il webhook deve essere registrato su Stripe Dashboard con l'URL del backend Vercel
- `fee_installment.metodo_pagamento` già esiste — aggiungere valore `'stripe'` ai valori supportati
- Pagamento Stripe e bonifico sono alternativi per la stessa rata — non cumulabili
- **Non implementare ora**: abbonamenti ricorrenti, rimborsi automatici, fatturazione elettronica

---

## 4. Dipendenze tra Epic

> Epic 1, 2, 3, 6, 8, 9, 10, 11, 12, 16, 18, 20, 21 archiviati in `DEVELOPMENT_PLAN_ARCHIVE.md`.

```
EPIC 4 (Opponent) ──→ nessuna dipendenza
EPIC 6 (Polish) ──→ nessuna dipendenza
EPIC 7 (Tornei) ──→ nessuna dipendenza
EPIC 13 (Preseason) ──→ nessuna dipendenza
EPIC 14 (Match Center Evolution) ──→ nessuna dipendenza
EPIC 15 (PWA Offline-First) ──→ nessuna dipendenza
EPIC 19 (PWA Guest Push) ──→ dipende da EPIC 11 ✅ + EPIC 12 ✅ (archiviati)
EPIC 22 (Capabilities) ──→ nessuna dipendenza
EPIC 23 (Player Performance Center) ──→ nessuna dipendenza
EPIC 24 (Inbox Comunicazioni) ──→ nessuna dipendenza
EPIC 25 (Raise Ticket) ──→ nessuna dipendenza
EPIC 26 (Stripe) ──→ dipende da EPIC 21 ✅ (archiviato)
EPIC 27 (Support Ticket Management) ──→ dipende da EPIC 25 ✅
```

Tutte le Epic sono indipendenti. L'ordine consigliato per impatto/effort:
1. **EPIC 25** (Raise Ticket, ~1h28) → supporto utenti, priorità con nuove società a bordo
2. **EPIC 24** (Inbox Comunicazioni, ~1h49) → controllo comunicazioni, valore operativo immediato
3. **EPIC 23** (Player Performance Center, ~2h38) → decision support per allenatori, differenziatore forte
4. **EPIC 17** (Piano Gara, ~4h15) → differenziatore forte, nessuna app giovanile lo offre
5. **EPIC 15** (PWA offline-first, ~2h) → differenziatore commerciale, campo sportivo
6. **EPIC 14** (Match Center evolution, ~53min) → UX bordo campo
7. **EPIC 22** (Capabilities, ~1h20) → gestione permessi avanzata
8. **EPIC 26** (Stripe, ~1h08) → pagamenti online, dipendenze già soddisfatte
9. **EPIC 19** (PWA Guest Push) → engagement famiglie, dipendenze già soddisfatte
10. **EPIC 4** (anagrafica avversari, ~74min) → base per futuro
11. **EPIC 6** (polish, 33min) → UX
12. **EPIC 7** (tornei, 37min) → nice-to-have
13. **EPIC 13** (preseason, ~76min) → utile solo 2-3 settimane/anno

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
| — | Nessun bug noto al momento | — |
---

## 7. Changelog Recente

| Commit | Descrizione |
|--------|-------------|
| v3.16.99 | fix: dashboard widget convocazione role-aware — segreteria/read vede `👁 Vedi convocazione` + badge `✅ Pubblicata`, mister/write vede `Vedi/Modifica` + PDF. fix: inbox notifica convocazione apre direttamente `openConvocation(riferimento_id, true)` invece di navigare al calendario. fix: capability `convocazioni` segreteria da `write` a `read` (DB + profilo default `capabilities.js`) |
| v3.16.99 | feat: sidebar modulare per ruolo — `sidebarNav.js` refactoring con builder functions; ordine default Team→Coach→Performance→Segreteria→Club→Amministrazione; sezione Club: Staff→Società→Stagioni; profilo `segreteria` vede Segreteria in cima. feat: organigramma societario spostato in `staff.js` (CRUD admin: Staff Tecnico + Dirigenti + Organigramma); `club.js` diventa vetrina read-only (Riferimenti Societari + Organigramma read-only). Nuovo endpoint `GET /api/workspaces/:id/organigramma`. fix: inbox `filtroSquadra` inizializzato con `window.YFM.squadraId` (evita cross-categoria), dropdown pre-selezionato sulla squadra attiva |
| v3.16.99 | feat: EPIC 24 Inbox Comunicazioni — backend `inbox.js` (GET /inbox aggrega notification+absence_notification, PUT mark-read batch, PUT mark-all-read), capability `inbox` (default write per segreteria+admin), pagina `modules/club/inbox.js` (tab Tutti/Assenze/Convocazioni/Bonifici/Avvisi, badge non letti, espansione inline, azioni rapide, paginazione, archivio 30gg, filtro squadra), sidebar voce 📬 Inbox, router inbox, helpData inbox |
| v3.16.99 | feat: parser PDF calendario SGS — supporto multi-regione. Fix regex bordi `I/!` (Lombardia, Sicilia, Piemonte): header HEADER_REGEX esteso a GIOVANISSIMI/ALLIEVI, date/orari/partite/campi accettano `I` e `!` oltre a `|`, fix regex ospite con `\s{2,}[|I]` come terminatore (nomi completi invece di troncati), suggestions filtrate da caratteri bordo. Nuovo parser Campania (formato lineare senza tabelle): `isCampaniaFormat()` rileva automaticamente (date concatenate `A. DD/MM/YYYYR.` + assenza `G I O R N A T A` spaziato), `findTeamInCampaniaPdf()` + `extractCampaniaCalendar()` con risoluzione nome completo via prefisso comune su righe-casa, split avversario per prefix/suffix match, `stripLegalSuffix()` per nomi puliti. Fix header Campania U17 (`\s*` invece di `\s+` tra categoria e GIRONE). Router `importCalendario.js`: auto-detect formato in `parse-pdf` e `extract` (zero modifiche frontend). Testato su: Lazio SGS (30p), Lazio Elite (16p), Lombardia U14 (30p), Sicilia U17 (26p), Campania U15 (24p), Campania U17 (22p), Piemonte multi-girone (26p) |
| v3.16.98 | feat: EPIC 27 Support Ticket Management — tabella `support_ticket` nel DB (RLS deny anon), `POST /support/ticket` salva nel DB + rate limit 5/giorno per user_id (superadmin escluso), `GET /support/tickets` lista con filtri stato/workspace (solo superadmin), `PUT /support/tickets/:id/rispondi` risposta via email con ID ticket (#XXXXXXXX) + chiude, `PUT /support/tickets/:id/stato`, `DELETE /support/tickets/:id`, `DELETE /support/tickets/chiusi`. Frontend: pagina `supportTickets.js` con lista espandibile, form risposta inline, confirm modal elimina/pulisci (modale sempre visibile indipendente dal filtro). fix: superadmin user_id=null su INSERT. fix: check `is_superadmin` invece di `ruolo=superadmin` su tutti gli endpoint. fix: `showToast` importata in main.js (era window.showToast). fix: toast aggiornamenti in alto (top:24px). fix: `showToast` parametro `position` top/bottom. fix: `checkForUpdates` ascolta evento `updatefound` per feedback preciso. fix: rate limit ticket rimosso da sessionStorage, gestito lato DB per utente. Sidebar voce 🎫 Ticket solo superadmin. helpData entry supportTickets |
| v3.16.97 | feat: EPIC 25 fix completo — FAB ⚡ unificato (Guida+Segnala), PageHelp bottone fisso rimosso se FAB presente, openPageHelp/activateInteractiveHelp export, fix help interattivo (getActiveBtn fallback yfm-fab-main), fix injectStyles sempre. fix: supportWidget — import showToast, endpoint /support/ticket (no /api duplicato), build da BUILD_INFO.id, pagina da YFM.currentPage, workspace nome da workspaceInfo. fix: email ticket — Mittente nome cognome, Account email·ruolo, Reply-To con display name. fix: toast posizionato sopra FAB (bottom:80px). fix: apiFetch guard /api duplicato con warning console. feat: showToast centralizzata in ui.js con param duration |
| v3.16.91 | feat: SW update toast con polling differenziato (30s superadmin / 30min utenti) + bottone 🔄 check aggiornamenti sidebar superadmin. fix: print center convocazione/distinta ora usano moduli calendario (rimossi printConvocazione.js+printDistinta.js ridondanti), allMatches sincronizzato prima di aprire moduli. fix: distinta rimuove highlight capitano/vice dalla stampa. fix: print-center-status distinta disponibile se ci sono convocazioni (rimossa dipendenza da notifica pubblicazione). fix: stampa mobile html+body font-size override su convocazione/distinta/report |
| v3.16.90 | fix: stampa mobile convocazione (@page 10mm, padding 0, font 11px) e distinta (@page 6mm, font 7-8px) per evitare seconda pagina. feat: import center alert→showToast con durata import (t0/Date.now()) su tutti i flussi (PDF, testo, GR calendario, GR marcatori, formazioni, loghi). docs: DEVELOPMENT_PLAN archiviazione epic 6/16/20/21, nuovi EPIC 24/25/26, DEVELOPMENT_PLAN_ARCHIVE.md creato, AGENTS.md e project-rules.md aggiornati con regole archiviazione |
| v3.16.82 | feat: tab Valutazioni nel Match Center — gruppi Titolari/Subentrati/Non entrati, minutaggio da getHalfDuration() (U16=80'), assist da e.assist_id (GOAL mergiato), SV per <5min e corner case sub all'ultimo minuto (Math.max(1,...)), formazioneIniziale per gruppi corretti, showToast locale, voto nullable in DB. fix: tab MC mobile emoji+label abbreviata (flex:1, no scroll), header MC mobile (flex:1, word-break), overflow-x:clip su .content (permette scroll figli) |
| v3.16.81 | fix: guestLinks — loadGuestLinks non chiamava loadData() (griglia sempre vuota), rimosso riferimento a #linksTableBody (vecchio DOM) nel catch |
| v3.16.80 | fix: kit modale assegnazione — articolo con sostituzione `in_attesa` mostrato con sfondo grigio + icona 🔄 + badge "in attesa sostituzione" invece di ✅ verde (Santangelo Tuta rappresentanza) |
| v3.16.79 | fix: kit assegnazioni — conteggio `assigned` sottraeva sostituzioni `in_attesa` (assignedEff = assigned - sostPendenti); badge 🔧 nella riga giocatore se sostituzione pendente. feat: kit layout accordion — 3 card header affiancate (Assegnazioni/Magazzino/Ordini) con summary numerico real-time via `summaryOnly=true`; card multi-riga `updateSezCard(lines[])`; card Ordini righe separate da ordinare/in attesa fornitore; card Assegnazioni riga sostituzioni in attesa. docs: helpData kit aggiornato (PAGE_HELP + ELEMENT_HELP + data-help sulle 3 card) |
| v3.16.77 | fix: checklist — migrazione DB chiave `tesseramento` → `tesseramento_figc` (20 record). feat: filtro item checklist mostra gruppo "Completati" collassabile in fondo invece di nasconderli; dot item filtrato evidenziato; stato espanso persistente in sessione |
| v3.16.76 | refactor: pagina Kit — layout 3 sezioni (Assegnazioni full-width, grid 2col Magazzino+Ordini); tab pill per template in ogni sezione; filtri Tutti/Incompleti/Completi inline; summary header con contatori; ordini unificati in tab underline Da ordinare/In attesa. docs: regole UI aggiornate (CSS inline render, stato tab modulo, filtri inline, summary header, tab misti pill+underline) |
| v3.16.75 | fix: da_ordinare_kit staff azzerato su batch-assign, fix manuale DB Coppola. feat: DELETE /kit-bundles/:id (solo se non assegnato), bottone 🗑️ su bundle magazzino (admin), nome destinatario in card "In attesa dal fornitore" |
| v3.16.74 | feat: kit flusso ordine evaso — `POST /kit-evadi-ordine` (Tipo 1 kit completo: crea bundle+stock+assegna, azzera da_ordinare_kit; Tipo 2 pezzi sfusi: rimuove da pezzi_in_attesa, crea stock, assegna). Card "Da ordinare" con bottone "Gestisci ordine" per riga, modal Tipo 1 (checklist articoli + radio assegna/stock), modal Tipo 2 (checklist pezzi in attesa). Task 12.51-12.55 |
| v3.16.73 | feat: kit staff — toggle Giocatori/Staff per template, modal assegnazione staff con taglia, cross-categoria visibility. DB: staff_id su kit_assignment, taglia su staff, player_id nullable. Task 12.46-12.49 |
| v3.16.72 | feat: kit icone contestuali per template (getKitIcon: 🧤 portiere, 👟 allenamento, ⚽ gara, 🧥 invernale, 👕 default) — rimuove badge testuale Portiere inline. fix: nDaOrdinare filtrato per ruolo portiere su kit portiere, tmpl_nome con concatenazione invece di template literal annidato, ruolo_principale nel mapping roster, overlay→parentOverlay in showPezziSelectionModal, grid-template-columns:1fr modal portiere |
| v3.16.71 | feat: kit portiere filtra solo portieri (ruolo_principale=Portiere); kit normale esclude portieri già coperti da kit portiere. feat: numerazione libera — campo n° nel modal assegnazione, salvato su kit_stock. fix: modal portiere grid-template-columns:1fr. Note: release counter a v3.16.70, commit taggato v3.16.71 |
| v3.16.70 | feat: kit numerazione libera — campo n° nel modal assegnazione (visibile solo se tmpl.numerazione=libera), salvato su kit_stock al momento dell'assegnazione, mostrato in magazzino come n°X. Fix modal portiere: grid-template-columns:1fr + id ktArtList per toggle corretto |
| v3.16.69 | feat: kit numero maglia in magazzino (n°X se numerazione sequenziale, Kit #N altrimenti), kit portiere (is_portiere su kit_template, ARTICOLI_PORTIERE precompilati, toggle modal config, badge 🧤 in lista e magazzino), fix query GET /kit-bundles (subquery numero_maglia via JSONB invece di tabella inesistente), docs: helpData kit.config+kitMagazzino aggiornati, project-rules regole Python+test SQL |
| v3.16.68 | fix: kit help interattivo tab magazzino — data-help aggiornato dinamicamente in renderCards/renderMagazzino, ELEMENT_HELP kit.magazzino con stati bundle, docs: kit_bundle+pezzi_in_attesa in project-rules e AGENTS.md |
| v3.16.67 | feat: kit pezzi mancanti fornitore — stato parziale bundle, modal selezione pezzi con checkbox, card "In attesa dal fornitore" con segna-arrivati (crea assignment + aggiorna stock), fix JSONB pezzi_in_attesa da pg raw, fix modal giocatore banner arancione se kit parziale, help interattivo contestuale tab lista (kit) e magazzino (kitMagazzino) |
| v3.16.66 | feat: kit — UX magazzino completa. Checkbox da ordinare centralizzato (handleDaOrdinare con taglia), sezione gialla "Da ordinare" in magazzino con giocatori raggruppati per taglia + sostituzioni in_attesa, badge summary 🛒 N da ordinare / 🔄 N sost. in attesa per template, badge "🛒 da ordinare XXL" con taglia nel roster, stato incompleto nel STATO_BADGE, frecce +10/-10 nel modal genera stock, query pg raw aggregata GET /kit-bundles (80 righe vs 1040), aggiornamento taglia su batch-assign via team_player.id diretto |
| v3.16.65 | feat: kit bundle — nuovo modello magazzino con kit fisici tracciati. DB: CREATE TABLE kit_bundle (template_id, taglia, numero_kit, stato integro/saccheggiato/assegnato/da_riordinare), ALTER kit_stock ADD bundle_id, ALTER kit_assignment ADD sostituzioni JSONB + bundle_id_originale. Backend: generate crea bundle+pezzi atomicamente, batch-assign usa bundle interi (saccheggiati prima degli integri), nuovo endpoint POST /kit-assignments/:id/sostituisci con saccheggio intelligente (attinge da bundle già saccheggiati prima di aprirne nuovi), GET /kit-bundles. Frontend: renderMagazzino vista per bundle con badge stato, showGenerateStockModal input per kit interi, showAssignModal con storico sostituzioni + bottone Sostituisci pezzo, showSostituzioneModal con articolo/motivo/costo/note |
| v3.16.65 | feat: kit bundle — nuovo modello magazzino con kit fisici tracciati. DB: CREATE TABLE kit_bundle, ALTER kit_stock ADD bundle_id, ALTER kit_assignment ADD sostituzioni+bundle_id_originale. Backend: generate/restock batch (2 query per taglia vs 2N), batch-assign usa bundle interi (saccheggiati prima degli integri), endpoint POST /kit-assignments/:id/sostituisci con saccheggio intelligente, GET /kit-bundles, _updateBundleStato solo per perso/danneggiato. Frontend: magazzino vista bundle con taglie collassabili+summary inline, display kit completo vs parzialmente assegnato, showSostituzioneModal con articolo/motivo/costo/note, storico sostituzioni in showAssignModal. Fix: kitDisponibili conta bundle con TUTTI pezzi disponibili (non pezzi sfusi), badge header card aggiornati |
| v3.16.64 | fix: kit lista assegnazioni ordinata alfabeticamente (cognome+nome). feat: checklist stagione — item auto/manual: certificato/kit/quota aggiornati automaticamente dai dati reali con sync al caricamento, item manual (iscrizione, gdpr, foto, tesseramento_figc) spuntabili manualmente; modale checklist mostra badge stato + link pagina dedicata per item auto; DEFAULT_ITEMS aggiornato con tipo+link; endpoint POST /checklist/:playerId/sync; helpData checklist aggiornato |
| v3.16.63 | feat: workspace_anagrafica — dati societari separati da workspace. DB: nuova tabella con colori_sociali, sponsor_tecnico, nome_campo, indirizzo_campo, iban (migrati da workspace/facility). Backend: POST/PUT /workspaces solo nome/logo/nome_breve, GET/PUT /workspaces/:id/anagrafica aggiornato. Frontend workspaces.js: modale creazione semplificata, parser unificato parseSocietaText() TC+testo libero con preview campo per campo + flusso conferma prima di applicare. Frontend club.js: card mostra colori/sponsor/campo/iban, modal con sezioni Società/Contatti/Campo, bottone incolla dati con parser. Dashboard: fix kit widget (rosterMap undefined, workspace_id fallback, display X assegnati). Docs: DATABASE_SCHEMA, AGENTS.md, project-rules, helpData aggiornati |
| v3.16.62 | feat: EPIC 12 Kit — auto-assign batch (🎯 Auto button), assegna kit a tutti i giocatori con taglia impostata in un click (endpoint POST /kit-assignments-batch), help in-app pagina Kit, capability dedicata `kit`, UX card (expanded state, inline assign, taglia badges, conteggio assegnati nella riga info), fix taglia in team_player (GET/PUT), taglie per settore (SG: XS-XXL, SC: 116-158 + adulte) |
| v3.16.89 | fix: stampa mobile convocazione+distinta (font-size espliciti @media print, page-break-inside:avoid firme), calendario presenze height fissa 52px, motivi assenza icone/colori corretti (Assenza ingiustificata grigio, Malattia rosso), layout mobile righe compatte motivi, migrazione DB 316 record motivi_assenza normalizzati |
| v3.16.88 | feat: EPIC 21 Fase 6 — archiviazione stagionale ricevute ZIP+CSV, validazione formato upload PDF/JPG/PNG, badge Archiviata in UI, CORS exposedHeaders Content-Disposition |
| v3.16.60 | feat: carriera filtra per tipo competizione (expand mostra solo partite del tipo selezionato), date picker smart per data nascita (posiziona su anno atteso da categoria), Match Center blocca eventi prima di avvio partita, tesseramento validazione rafforzata (stato Completo richiede residenza + documento genitore), nuovo giocatore richiede telefono genitore obbligatorio. Fix: notifiche tesseramento non più visibili ad allenatore (destinatario_profilo segreteria per notifiche famiglia), minutaggio amichevoli U14/U15 corretto (60→70, 30→35 per partite importate con durata errata) |
| v3.16.59 | feat: report stagionale separa ufficiali/amichevoli (punti solo su ufficiali), filtro competizione salvato per utente (preferenze_ui.competizione_filtro) con default "tutte", stats.js usa stessa preferenza, fees.js "☑ Tutti" in modalità selezione. Fix: updateNotifBadge check UUID (no 400 con superadmin), training template created_by null per superadmin (fix uuid parse error) |
| v3.16.54 | feat: EPIC 20 completata — Modulo Tesseramento con capability dedicata, auto-check certificato medico, sollecito documenti (singolo + bulk), sollecito certificati medici dalla dashboard (singolo + bulk), stato lettura inline notifiche individuali (✅/⏳), fix notifiche staff (created_by nel filtro, escluso da unread), rimossa pagina stats guest (filtro nella card home: Tutte/Campionato/Amichevoli), fix guest router per print-tesseramento |
| v3.16.55 | feat: playerDetail collapsible cards (valutazioni, infortuni, quote, tesseramento, carriera) con summary header, sezione Tesseramento visibile anche se non generato, fix spacing card, carriera ordinata per stagione desc, help in-app per pagine guest (Atleta + Famiglia) e Tesseramento, fix capability tesseramento per utenti esistenti |
| v3.16.53 | feat: notifica quote manuale (singola/batch) con messaggio personalizzato, cleanup notifiche automatico (>30gg + lette pre-lunedì), fix tab Inviate/Ricevute (split per created_by), fix guest vede solo notifiche proprie (destinatario_player_id), fix receipts mostra solo destinatario specifico, rimosso check-scadenze automatico, sidebar UI migliorata (#1e3a5f, contrasto, icone univoche), fix guest links visibilità workspace, capability convocazioni separata da formazione |
| v3.16.48 | feat: ordinamento alfabetico intelligente workspace (skip acronimi A.S.D., S.S.D., ecc.) |
| v3.16.44 | feat: Quote — modale Configura Quote con ✏️ Modifica (nome/importo/rate/categoria), 📋 Duplica config, 🔄 Rigenera quote esistenti (batch ottimizzato, preserva pagamenti con logica residuo). Endpoint POST /fee-configs/:id/rigenera. Help in-app per pagina Quote. Fix showToast mancante |
| v3.16.42 | feat: EPIC 12 guest UX — link Ospite senza comunicazioni, link Famiglia con sezione 💰 Situazione Quote (rate pagate/scadute), header semplificato (rimosso titolo, solo messaggio benvenuto). Fix nomi colonne fee_installment (stato/scadenza) |
| v3.16.87 | feat: EPIC 21 Fase 6 — archiviazione stagionale ricevute (ZIP+CSV per giocatore/quota, filename Società_Categoria_Stagione), validazione formato upload PDF/JPG/PNG (fileFilter multer + client-side), badge 📁 Archiviata in UI, CORS exposedHeaders Content-Disposition, dipendenza adm-zip |
| v3.16.86 | fix: sidebar guest — voce Quote mancante per tipo famiglia |
| v3.16.35 | feat: EPIC 21 Fase 3 — notifiche ricevuta bonifico in Centro Comunicazioni (card arancione + Conferma/Rifiuta/Vedi), badge campanella per segreteria, fix created_by guest null, fix tipo mancante in select unread, fix guard sessionStorage guest vs utente normale, modal custom conferma/rifiuta, spunta letta rimossa da tab Inviate |
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

### Aggiungere nuovi EPIC
- Il numero EPIC è **progressivo** (prossimo: EPIC 28)
- Inserire SEMPRE in ordine numerico nella sezione "3. Epics & Micro-Task"
- Mai inserire un EPIC tra due esistenti con numero inferiore/superiore
- Aggiornare la sezione "4. Dipendenze tra Epic" se il nuovo EPIC ha dipendenze

### Archiviare EPIC completati
- Un EPIC va archiviato quando **tutti i task sono ✅** (o ❌ cancellati con motivazione)
- Procedura: copiare il blocco in `DEVELOPMENT_PLAN_ARCHIVE.md`, rimuoverlo dal piano attivo
- Aggiornare la nota `> Epic completati archiviati` in cima alla sezione 3
- Aggiornare la sezione 4 (Dipendenze) rimuovendo i riferimenti all'epic archiviato
- Aggiornare il contatore "prossimo: EPIC N" se necessario
- **Non leggere l'archivio di default** — solo su richiesta esplicita o per consultare storia pregressa
