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
```

Tutte le Epic sono indipendenti. L'ordine consigliato per impatto/effort:
1. **EPIC 1** (pulizia, 20min) → riduce debito tecnico ✅
2. **EPIC 2** (infortuni, 43min) → feature richiesta dai mister ✅
3. **EPIC 11** (atleta/genitore, ~2h) → evoluzione accesso utenti, alto valore percepito
4. **EPIC 3** (visite, 35min) → scadenze mediche = obbligo FIGC
6. **EPIC 4** (anagrafica avversari, ~74min) → base per futuro
6. **EPIC 6** (polish, 33min) → UX
7. **EPIC 9** (workspace hub, ~57min) → gestione superadmin
8. **EPIC 7** (tornei, 37min) → nice-to-have
9. **EPIC 12** (club operations, ~10h) → valore società, post-EPIC 11
10. **EPIC 13** (preseason, ~76min) → utile solo 2-3 settimane/anno, bassa priorità

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
| (pending) | feat: email atleta + email genitore in scheda giocatore (view/edit/insert) |
| (pending) | fix: distinta — colonna numero maglia vuota per compilazione manuale, (P) per portieri con ruolo_principale dal backend |
| (pending) | style: ultime partite — logo avversario su desktop (inline-flex), data dd/mm/yy, rimossa icona calendario su mobile |
| (pending) | feat: carriera espandibile — click su stagione espande lista partite (DataGrid desktop / cards mobile), mutuamente esclusivo, endpoint career-matches, giornata+risultato su desktop, risultato+ellipsis avversario su mobile |
| (pending) | fix: certificati badge click — toggle apri/chiudi dettaglio su click badge |
| (pending) | refactor: rimossa funzionalità "Sposta Giocatore" (ridondante con wizard migrazione) da roster.js, playerDetail.js, backend player.js |
| (pending) | fix: distinta — amichevole senza giornata, preview font 10px simulazione stampa, bottone 📄 Distinta in dashboard, assistente arbitro layout matr+tessera |
| (pending) | fix: diffidati modulo 5 — squalifica al 5°/10°/15° giallo (diffidato a 4/9/14 ammonizioni) |
| (pending) | fix: modali form — rimosso click-overlay-close su modali con dati (partita, calciatore, convocazioni, formazione, valutazioni, note, distinta staff, training config) |
| (pending) | feat: offline buffer — banner globale connessione (solo quando offline), buffer localStorage per MC eventi/note e presenze allenamento, auto-sync al ritorno online |
| (pending) | perf: dashboard cold start — eliminata await mePromise (-400ms), dedup /auth/workspaces (-300ms), certificati inclusi nel JOIN players (-200ms), rimossi 2 lazy fetch ridondanti (injuries+calciatori già nel dashboard aggregato, -600ms) |
| (pending) | style: calendario — badge "📦 Archiviata" sostituito con icona 🔒 discreta (tooltip hover) |
| (pending) | feat: logo ASD Aprilia C.S.P. aggiunto (file + record team_logo DB) |
| (pending) | feat: EPIC 11 Sistema Atleta & Genitore — capabilities differenziate (atleta/genitore), home atleta (stats+allenamenti+assenze), home genitore (comunicazioni+risultati), routing guest differenziato, priorità notifiche (info/importante/urgente), destinatario_tipo su notification, UI creazione comunicazione con destinatari, notifiche convocazione differenziate per tipo |
| (pending) | perf: v3.16 — indici DB (match_formation, training_attendance, match team+stato), VIEW v_player_season_stats + v_team_season_summary, endpoint aggregato /dashboard (1 call vs 5-6), frontend refactor cache |
| (pending) | fix: training calendar — ripristino/annullamento aggiorna colore giorno immediatamente (fix closure su annullati array) |
| (pending) | fix: report partita — dropdown mostra solo partite con stato Terminata (escluse future e in corso) |
| (pending) | refactor: sistema capabilities — migrazione da isAdmin() a canWrite()/canRead() per modulo, allenatore usa capabilities reali (non blanket true), guest_links rimosso da profilo allenatore, nuovo endpoint convocazioni-pubblica separato da salvataggio, pulizia notifiche DB |
| (pending) | feat: indisponibilità inline — bottone ❌ su ogni allenamento/partita nella home atleta, modal con data pre-compilata, stato persistente in sessionStorage (fetch al login + persist dopo invio), fix backend accetta player_id da body per token legacy |
| (pending) | feat: crea link singolo atleta — dropdown filtra solo giocatori senza link attivo, player_id obbligatorio per tipo atleta |
| (pending) | feat: risposta convocazione — atleta può segnalare indisponibilità post-convocazione (colonne risposta/risposta_motivo/risposta_at su convocation, endpoint POST risposta, notifica allenatore, badge ❌ in UI convocazioni, counter indisponibili in dashboard) |
| (pending) | fix: congruenza flusso — assenza pre-convocazione auto-imposta indisponibile alla pubblicazione, batch convocazioni preserva risposte esistenti, DELETE config cascade allenamenti futuri senza presenze |
| (pending) | feat: ristrutturazione Centro Comunicazioni — tabs Inviate/Ricevute, assenze+indisponibilità unificate, bottone Rispondi atleta, endpoint POST /notifications/reply |

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
