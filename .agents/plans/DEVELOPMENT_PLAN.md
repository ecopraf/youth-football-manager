# Youth Football Manager — Development Plan

> **Fonte di verità unica** per lo stato del progetto, task, dipendenze e priorità.
> Ultimo aggiornamento: 18 Luglio 2025 | Versione: v3.16 | Commit: pending

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
| Visite Mediche | ⬜ | Non esiste (dati su player, no storico) |
| Valutazioni | ⚠️ | Parziale (tabella esiste, UI incompleta) |

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

### EPIC 3: Visite Mediche (storico separato)

> Separare le visite mediche da player in tabella dedicata con storico.

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 3.1 | CREATE TABLE `player_medical` | ⬜ | — | migrazione SQL | ~3min |
| 3.2 | Migrazione dati: copia scadenza_visita_medica esistente → player_medical | ⬜ | 3.1 | script SQL | ~5min |
| 3.3 | Endpoint CRUD `/api/players/:id/medical` | ⬜ | 3.1 | routes/player.js | ~10min |
| 3.4 | Sezione "Visite mediche" in playerDetail | ⬜ | 3.3 | modules/team/playerDetail.js | ~10min |
| 3.5 | Alert scadenze in dashboard (visite < 30gg) | ⬜ | 3.3 | modules/team/dashboard.js | ~5min |
| 3.6 | Aggiornare docs | ⬜ | 3.5 | DEVELOPMENT_PLAN.md | ~2min |

---

### EPIC 4: Evoluzione team_logo → opponent registry

> Aggiungere campi a `team_logo` per renderla un vero registry avversari.

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 4.1 | ALTER TABLE `team_logo` ADD `citta`, `campo_default` | ⬜ | — | migrazione SQL | ~3min |
| 4.2 | Aggiornare endpoint loghi per esporre nuovi campi | ⬜ | 4.1 | routes/importTuttocampo.js | ~5min |
| 4.3 | Aggiornare docs | ⬜ | 4.2 | DEVELOPMENT_PLAN.md | ~2min |

---

### EPIC 5: Import TC Fase 3 — Archiviazione automatica

> Partite con risultato importato → archiviata=true. Gestione conflitti duplicati.

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 5.1 | Flag `archiviata=true` su partite importate con risultato | ⬜ | — | routes/importConfirm.js | ~5min |
| 5.2 | Skip duplicati: check avversario+giornata+data prima di insert | ⬜ | — | routes/importConfirm.js | ~10min |
| 5.3 | UI: mostrare partite skippate nel report import | ⬜ | 5.2 | modules/import/importCenter.js | ~5min |
| 5.4 | Aggiornare docs | ⬜ | 5.3 | DEVELOPMENT_PLAN.md | ~2min |

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
| 9.1 | Click su card workspace → vista dettaglio con tab (Info, Stagioni, Utenti) | ⬜ | — | modules/admin/workspaces.js | ~15min |
| 9.2 | Tab Info: form inline modificabile (nome, contatti, social, facility, logo) | ⬜ | 9.1 | modules/admin/workspaces.js | ~10min |
| 9.3 | Tab Stagioni: lista stagioni con team, azioni (crea, migra, attiva) | ⬜ | 9.1 | modules/admin/workspaces.js | ~15min |
| 9.4 | Tab Utenti: lista utenti workspace + creazione rapida + modifica ruolo/permessi | ⬜ | 9.1 | modules/admin/workspaces.js | ~15min |
| 9.5 | Test build + aggiornare docs | ⬜ | 9.4 | DEVELOPMENT_PLAN.md | ~2min |

---

## 4. Dipendenze tra Epic

```
EPIC 1 (Pulizia DB) ──→ nessuna dipendenza, può partire subito
EPIC 2 (Infortuni) ──→ nessuna dipendenza
EPIC 3 (Visite Mediche) ──→ nessuna dipendenza
EPIC 4 (Opponent) ──→ nessuna dipendenza
EPIC 5 (Import TC3) ──→ nessuna dipendenza
EPIC 6 (Polish) ──→ nessuna dipendenza
EPIC 7 (Tornei) ──→ nessuna dipendenza (codice già pronto)
EPIC 9 (Workspace Hub) ──→ nessuna dipendenza
```

Tutte le Epic sono indipendenti. L'ordine consigliato per impatto/effort:
1. **EPIC 1** (pulizia, 20min) → riduce debito tecnico
2. **EPIC 2** (infortuni, 43min) → feature richiesta dai mister
3. **EPIC 3** (visite, 35min) → scadenze mediche = obbligo FIGC
4. **EPIC 5** (import, 22min) → qualità dati
5. **EPIC 4** (opponent, 10min) → base per futuro
6. **EPIC 6** (polish, 33min) → UX
7. **EPIC 7** (tornei, 37min) → nice-to-have

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
| Mobile | App nativa | P3 |

---

## 6. Bug Noti

| Severità | Descrizione | File |
|----------|-------------|------|
| Minore | Valutazioni giocatore: UI incompleta | valutazioni.js |

---

## 7. Changelog Recente

| Commit | Descrizione |
|--------|-------------|
| 088d446 | feat: cleanup UI — rimuovi brand, redesign calendar toolbar, import tab Match Center (rimossi card TC, XLS modal diretto, tab Import in MC, countdown fix, filtro+selezione calendario, selector categorie ordinato, rename GR→Portale Regionale) |
| b887482 | feat: team access validation middleware — verifica workspace (utenti) e categoria (guest) su ogni richiesta con team_id |
| 4adc933 | feat: import XLS matching a cascata (CF → matricola → nome+DN) + colonna codice_fiscale su player + preview migliorata |
| 7649ccc | fix: dashboard DR +0 → mostra "0" neutro grigio |
| 0afd4fe | feat: Match Center — blocco avvio 5min, auto-expire, incolla tabellino TC |
| 43134b5 | fix: dashboard stagione dinamica |
| a209b32 | fix: import XLS categoria suggerita dinamica da stagione |
| 8c0ba27 | feat: validazione formato file import (XLS/PDF) |
| 7c70cb4 | fix: report giocatore filtro stagione/competizione + searchbox + fix nomi troncati |
| 17f6fbf | feat: MC single entry point + formazione sub-tabs Iniziale/Finale + protezione temporale live (countdown + long-press override) |
| (pending) | feat: training calendar — holidays italiane (Pasqua dinamica), mini counters presenti/assenti, auto-navigate ultimo mese con dati per stagioni passate |
| (pending) | fix: Supabase 1000-row limit — batch fetch (20 IDs + .range(0,9999)) su /presenze e /summary |
| (pending) | feat: summary season-aware — rileva stagione passata (>30gg da ultimo allenamento), nasconde Ass.Sett., mostra range stagione completo |
| (pending) | feat: indicatori motivi assenza nel riepilogo presenze (cards + barra distribuzione) |
| (pending) | perf: ottimizzazione endpoint — Promise.all su top-players/stats-giocatori (-79%/-50%), rimozione JOIN su presenze (-75%), unificazione batch su summary (-47%) |
| (pending) | style: redesign top players + staff cards — glassmorphism con medaglie, progress bar, avatar iniziali |
| (pending) | feat: card prossimo allenamento in dashboard (sopra partita) con shortcut Programma/Presenze |
| (pending) | feat: tab Note in Match Center con auto-save debounce + timestamp live |
| (pending) | fix: timezone allenamenti-futuri — usare data locale invece di toISOString() per evitare duplicati virtuali |
| ba51bee | feat: Live Match Mode — bottone stato, minuto live, pre-fill drawer, durata per categoria |
| 856acd8 | feat: Match Center hub + CORS fix + assist/rigore/autogol support |
| 7c5b3a6 | feat: unified Match Center button in calendar + dashboard |
| (pending) | feat: Match Center UX — autogol logic fix, SUB persistence, gol subito text field, live button blink, dashboard partita odierna, matchDetail SUB display fix |
| (pending) | fix: statistiche filtrate per tipo competizione (solo campionato+coppa per stats ufficiali) |
| fa94529 | feat: multi-session improvements — stats, calendar fix, dashboard, match events, assist fix, convocazioni fix |
| d7119aa | feat: formazione live interattiva in Match Center con sostituzioni drag/tap |
| 96609e7 | feat: Match Center formazione live + modulo_finale tracking + mobile fix + timeline 2 colonne + modal custom sostituzione |
| (pending) | fix: WhatsApp link aggiunge +39 a numeri senza prefisso internazionale + template picker con modale card + fix salvataggio/caricamento programma seduta (upsert backend + load da DB) |
| (pending) | feat: redesign stagioni — wizard con promozione categoria (U14→U15), tipo campionato, delete cascade, stagioni espandibili con card team |
| (pending) | feat: workspace.nome_breve — nome compatto per sidebar/dashboard (DB + backend + frontend) |
| (pending) | fix: GR matching usa team.nome (non workspace.nome) + wizard mostra nome team con categoria e warning mismatch |
| 6f7eda4 | fix: matching fuzzy nomi squadre GR con abbreviazioni (Pol., C., Atl., ecc.) |
| c810571 | fix: logout accessibile da sidebar (mobile+desktop) + chiusura sidebar immediata su tap |
| fee70e9 | fix: tasto modifica/elimina calendario non funzionava (selettore CSS errato) |
| 3cb48a5 | fix: orario partite — risolto timezone shift e display ridondante |
| 841531e | fix: import center + dashboard GR usano matching fuzzy abbreviazioni |
| (pending) | feat: redesign stagioni & categorie — wizard creazione con anno, auto-team, migrazione rosa/staff/config, dropdown solo stagione attiva, endpoint career/last-matches cross-season |
| (pending) | fix: badge notifiche immediato al login + polling 60s + aggiornamento cambio squadra |
| (pending) | fix: guest links filtrati per categoria squadra selezionata |
| (pending) | fix: pagina Società accessibile ai guest (usa dati in memoria) |
| (pending) | feat: guest UX — auto-redirect squadra stagione corrente, benvenuto personalizzato, nome atleta in header |
| (pending) | feat: notifiche assenze — campanella sempre visibile, badge nuove/totali settimana, auto-cleanup settimanale |
| (pending) | style: notifiche — layout griglia compatto, animazione segna-letta, spunta verde |
| (pending) | fix: guest logout mostra "Sessione terminata" invece di redirect a login |
| (pending) | style: nasconde avatar utente su mobile per liberare spazio header |
| (pending) | feat: superadmin login con selezione workspace, workspace_id=NULL |
| (pending) | feat: creazione categoria con dropdown (U14-U19 + tipo campionato) e auto-creazione team |
| (pending) | refactor: rimosse colonne staff ridondanti da team, report usa team_staff |
| 9be406a | feat: allenamenti-futuri virtuali da config + indicatore ⚠️ assenza segnalata in presenze |
| 612882a | perf: cache intelligente dashboard+stats (memory 2min, sessionStorage 10min, lazy load GR) |
| — | perf: skip loadAvailableWorkspaces per non-superadmin (-250ms init) |
| — | feat: custom alert/confirm dialogs (no URL nel titolo, async confirm) |
| — | feat: guest links — multi-select delete/renew batch, badge stato, colonna attivo dal |
| — | feat: help interattivo contestuale (popover + modalità interattiva con overlay) |
| — | fix: 401 handling su endpoint /auth/* (token scaduto non triggerava logout) |
| — | feat: scadenza guest links allineata a stagione calcistica (30/06) |
| d517f09 | fix: endpoint GET /api/giocatori/:id/valutazioni |
| 279c95c | feat: contatti genitori in scheda dettaglio |
| ab137a2 | feat: contatti genitori (padre/madre/tutore) nel form |
| ff6fcff | fix: persist squadraId in localStorage |
| 448882a | style: rimuove nome categoria dai titoli |
| dbc0b9b | feat: guest token season_id — legame stagione, blocco creazione post-31/07, nome giocatore da DB |
| e715772 | style: sidebar Coach sopra Performance, rinomina 'Genera Link Atleti' |
| 36c1276 | feat: workspace social (facebook/instagram) + import GR unificato con checkbox + fix classifica_url in memoria |
| c624f55 | feat: minuti reali da match_statistics nel report giocatore, fix calendario isPlayed, autocomplete avversario |
| (pending) | feat: session guard — visibility check (5min) + inactivity timer (30min) con banner + auto-reload pagina |
| (pending) | feat: import manuale rosa — fix parsing tab-separated (nome duplicato), legenda formato, preview tabella con numero maglia |
| (pending) | fix: Match Center import tabellino — salvataggio reale DB, blocco su partite Da disputare, dedup eventi, verifica avversario, preview formazione |
| (pending) | feat: codice fiscale nel form giocatore — campo CF + luogo nascita con autocomplete comuni + calcolo automatico CF |
| 0972348 | fix: import XLS — omonimi con CF diversi trattati come giocatori distinti (step 3 nome+DN solo se no CF/matricola, protezione sovrascrittura) |
| 73f6557 | fix: pulizia loghi duplicati (776→765) + dedup hash MD5 in import + normalizeLogoName unificato |
| 2bfb862 | feat: CF e Luogo Nascita nella pagina Nuovo Calciatore (playerDetail.js) |
| 22d2b8e | style: upload XLS drag&drop + modal utenti responsive mobile |
| (pending) | feat: CF e Luogo Nascita visibili e modificabili nella scheda giocatore (playerDetail view+edit) |
| (pending) | refactor: redesign form Nuovo Calciatore e Modifica — 3 sezioni card (Anagrafica/Sportivi/Documenti), griglia 2 colonne, CF auto-calcolato, header contestuale categoria+stagione, feedback visivo modalità edit (banner + bordo brand) |
| (pending) | feat: card certificati medici compatta con 4 badge (Scaduti/In Scadenza/Validi/Mancanti) + espansione dettaglio — in Rosa e Dashboard (nascosta di default, visibile per segreteria) |
| (pending) | feat: redesign pagina Gestione Utenti — filtri (cerca/ruolo/stato), azione Sospendi/Attiva toggle, badge stato, endpoint toggle-active, caricamento utenti inattivi |
| d733428 | style: responsive globale mobile — griglie 1col @500px, tabelle scroll, modal compatti |
| (pending) | feat: dashboard personalizzabile — riordino + show/hide widget, preferenze utente in DB, GR card sfondo sfumato, layout responsive (2-col desktop / card separate mobile), fix calendario centrato, marcatori 2-col con gol allineati a dx |
| (pending) | fix: scheda giocatore — rimossa card summary rotta (stats-current eliminato), carriera raggruppata per tipo competizione (Campionato/Coppa/Amichevole), endpoint ottimizzato (batch fetch) |
| (pending) | fix: gestione errori DB — helper centralizzato dbErrors.js traduce duplicate key in messaggi IT user-friendly (CF giocatore, email utente, ecc.) |
| (pending) | feat: profilo segreteria + widget certificati medici in dashboard (nascosto di default per altri profili, visibile per segreteria) |
| (pending) | fix: preferenze dashboard superadmin — risolto id hardcoded 'superadmin' su GET/PUT /users/preferences |
| (pending) | feat: DataGrid component — tabella responsive riutilizzabile (table desktop / card mobile), playerDetail carriera raggruppata per squadra con logo, ultime partite compatte con logo avversario, endpoint career+last-matches con logo da team_logo |
| (pending) | feat: Centro Comunicazioni — tabella notification DB, router notification.js (GET/PUT), trigger auto su convocazioni-batch, frontend notifications.js con tabs Comunicazioni+Assenze, badge campanella combinato |
| (pending) | feat: segreteria capabilities — formazione:write, import:write, sidebar Import Center per non-admin con capability |
| (pending) | feat: widget Prossima Convocazione in dashboard segreteria (stato convocati, bottoni Convoca/Vedi/PDF) |
| (pending) | fix: convocazione PDF header — NaN anno, undefined avversario, Invalid Date, formato amichevole vs campionato |
| (pending) | fix: notification trigger — workspace_id via category join (team non ha workspace_id), try/catch Supabase |
| (pending) | fix: badge campanella segreteria — rimosso early return su squadraId mancante |
| (pending) | style: wizard utenti — rimosso dot stagione attiva, bottone 💾 Salva |
| (pending) | feat: tipo competizione semplificato — dropdown 4 opzioni fisse (Campionato/Coppa/Torneo/Amichevole), campo match.tipo_competizione TEXT, rimosso JOIN competition |
| (pending) | feat: girone in category — colonna girone TEXT, auto-save da import PDF e config GR, distinta/convocazione mostrano "U15 Regionale - Girone E" |
| (pending) | fix: distinta dinamica per tipo — "del campionato X", "del torneo X", "della coppa X", "Gara Amichevole" |
| (pending) | fix: convocazione isAmichevole — variabile non definita causava crash "Vedi Convocazione" |
| (pending) | fix: PDF parser girone regex — cattura solo lettera (es. B) ignorando suffissi (BIS) |
| (pending) | perf: v3.16 — indici DB (match_formation, training_attendance, match team+stato), VIEW v_player_season_stats + v_team_season_summary, endpoint aggregato /dashboard (1 call vs 5-6), frontend refactor cache |

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
