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

### EPIC 6: Polish pre-stagione

> Bug fix, UX improvements, preparazione per utenti reali.

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 6.1a | Backend: aggiungere endpoint `GET+POST /partite/:id/valutazioni` (legge/scrive su `valutazione_partita`) | ✅ | — | routes/match.js | ~8min |
| 6.1b | Match Center: aggiungere tab "⭐ Valutazioni" (visibile solo se partita Terminata), riusa logica `valutazioni.js` | ✅ | 6.1a | modules/team/matchCenter.js | ~10min |
| 6.1c | Distinta: rimuovere funzione `openValutazioniForm` (dead code, spostata nel MC) | ✅ | 6.1b | modules/team/distinta.js | ~3min |
| 6.1d | Fix valutazioni: gruppi titolari/subentrati, minutaggio categoria, assist, SV corner case, tab mobile emoji+label | ✅ | 6.1b | modules/team/matchCenter.js | ~30min |
| 6.2 | Report presenze allenamenti (stampabile) | ✅ | — | modules/print/printPresenze.js, router.js, printCenter.js | ~10min |
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

### EPIC 11: Sistema Atleta & Genitore (evoluzione Guest)

> Sostituire il concetto generico di "Guest" con due ruoli distinti (Famiglia e Ospite) con capabilities, home e notifiche differenziate. Infrastruttura guest_token invariata (nessuna registrazione), ma UX e permessi specifici per tipo.

#### Fase 1: Tipi e Capabilities (backend)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 11.1 | Definire capabilities Atleta vs Genitore in `capabilities.js` (frontend + backend mirror) | ✅ | — | utils/capabilities.js, helpers/capabilities.js | ~5min |
| 11.2 | Aggiornare `guest_token.tipo` per supportare valori `famiglia` e `ospite` (retrocompat con esistenti) | ✅ | 11.1 | routes/auth.js, routes/guestLinks.js | ~5min |
| 11.3 | Differenziare JWT guest: includere `tipo` nelle capabilities check del middleware | ✅ | 11.2 | middleware/auth.js, helpers/capabilities.js | ~5min |
| 11.4 | Endpoint: tipo `famiglia` può POST su `/api/absence-notification` solo per il proprio player_id | ✅ | 11.3 | routes/notification.js | ~5min |
| 11.5 | Test funzionale capabilities famiglia/ospite (permessi differenziati) | ✅ | 11.4 | tmp_test.js | ~5min |

#### Fase 2: Home Atleta (frontend)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 11.6 | Creare `modules/auth/guestAtleta.js` — Home Famiglia (tipo=`famiglia`): notifiche, convocazioni, indisponibilità, allenamenti, partite, stats personali, quote, tesseramento | ✅ | 11.3 | modules/auth/guestAtleta.js | ~15min |
| 11.6a | — Widget notifiche + convocazione prossima | ✅ | 11.6 | modules/auth/guestAtleta.js | ~5min |
| 11.6b | — Form "Comunica indisponibilità" (data + motivo) | ✅ | 11.4, 11.6 | modules/auth/guestAtleta.js | ~5min |
| 11.6c | — Sezioni calendario allenamenti + partite + stats personali + classifica | ✅ | 11.6 | modules/auth/guestAtleta.js | ~5min |

#### Fase 3: Home Genitore (frontend)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 11.7 | Creare `modules/auth/guestGenitore.js` — Home Ospite (tipo=`ospite`): solo calendario partite, risultati pubblici. Nessuna quota, nessun dato personale | ✅ | 11.3 | modules/auth/guestGenitore.js | ~15min |
| 11.7a | — Widget comunicazioni con badge priorità | ✅ | 11.7, 11.9 | modules/auth/guestGenitore.js | ~5min |
| 11.7b | — Sezioni convocazioni figlio + calendario + risultati + classifica | ✅ | 11.7 | modules/auth/guestGenitore.js | ~5min |

#### Fase 4: Router guest differenziato

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 11.8 | Aggiornare router.js: guest `tipo=famiglia` → guestAtleta, `tipo=ospite` → guestGenitore | ✅ | 11.6, 11.7 | router.js, modules/auth/guest.js | ~5min |

#### Fase 5: Priorità notifiche

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 11.9 | ALTER TABLE `notification` ADD `priorita` TEXT DEFAULT 'info' (info/importante/urgente) | ✅ | — | migrazione SQL | ~3min |
| 11.10 | Frontend: badge colorato priorità (🔵🟡🔴) nelle liste notifiche | ✅ | 11.9 | modules/team/notifications.js, guestAtleta.js, guestGenitore.js | ~5min |

#### Fase 6: Comunicazioni con destinatari (fase 1)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 11.11 | ALTER TABLE `notification` ADD `destinatario_tipo TEXT[]` (famiglia/ospite/staff) | ✅ | — | migrazione SQL | ~3min |
| 11.12 | UI creazione comunicazione: selezione destinatari (tipo + categorie) | ✅ | 11.11 | modules/team/notifications.js | ~10min |
| 11.13 | Backend: filtro GET notifiche per `destinatario_tipo` in base al ruolo richiedente | ✅ | 11.11 | routes/notification.js | ~5min |
| 11.14 | Notifiche convocazione differenziate: testo diverso per tipo `famiglia` vs `ospite` | ✅ | 11.11, 11.2 | routes/convocazioni.js | ~5min |

#### Fase 7: UI generazione link (aggiornamento)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 11.15 | Aggiornare UI "Genera Link" — rinominare tipi in "Atleta" e "Genitore" (invece di guest generico) | ✅ | 11.2 | modules/admin/guestLinks.js | ~5min |
| 11.16 | Test build completo + aggiornare docs | ✅ | 11.15 | DEVELOPMENT_PLAN.md, AGENTS.md | ~5min |

**Effort totale stimato**: ~2h 10min (16 task + 3 sotto-task)

**Note architetturali**:
- L'infrastruttura `guest_token` resta invariata (link senza registrazione)
- Il JWT guest contiene già `tipo` — basta usarlo per routing e capabilities
- Le home famiglia/ospite sono pagine standalone (non usano sidebar staff)
- La priorità notifiche è un campo semplice, non un sistema di regole complesso
- Le comunicazioni fase 1 usano la tabella `notification` esistente con filtro `destinatario_tipo`

---

### EPIC 12: Club Operations — Fase 1 (Quote + Kit + Checklist)

> Digitalizzare i flussi operativi della segreteria: gestione quote economiche, kit sportivo, checklist inizio stagione. Dashboard action-driven per segreteria. Posizionamento: da app-allenatore a piattaforma di società.

#### Fase 1: Gestione Quote

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 12.1 | CREATE TABLE `fee`, `fee_config`, `fee_installment` (schema con rate configurabili per workspace/categoria) | ✅ | — | migrazione SQL | ~5min |
| 12.2 | Endpoint CRUD `/api/fee-configs`, `/api/fees`, `/api/fees-generate`, `/api/fee-installments/:id/pay|unpay`, `/api/fees-batch` | ✅ | 12.1 | routes/fees.js | ~10min |
| 12.3 | Sezione "Situazione economica" in playerDetail (lista quote + stato + storico pagamenti) | ✅ | 12.2 | modules/team/playerDetail.js | ~10min |
| 12.4 | Vista quote per squadra (pagina fees.js con config, generazione, pagamenti per rata) | ✅ | 12.2 | modules/club/fees.js | ~15min |
| 12.5 | Widget "Quote" in dashboard (raggruppato per config, incassato/totale, alert scadenze) | ✅ | 12.2 | modules/team/dashboard.js | ~5min |
| 12.6 | Creazione quote batch (`/api/fees-generate` + rigenerazione da config aggiornata) | ✅ | 12.2 | routes/fees.js, modules/club/fees.js | ~10min |
| 12.7 | Notifica scadenza quote (`/api/fees/notify` — manuale da UI) | ✅ | 12.2 | routes/fees.js | ~5min |

#### Fase 2: Kit Sportivo

> Gestione magazzino kit della società (condiviso tra categorie) con assegnazione per giocatore. Template configurabile per settore (scuola calcio con taglie bambino 116-158 + numerazione sequenziale, settore giovanile con taglie adulto XS-XXL + numerazione libera/nessuna). Taglia giocatore salvata su `team_player` (aggiornabile per stagione).

##### Fase 2a: Taglia giocatore nel roster (~20min)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 12.8 | ALTER TABLE `team_player` ADD COLUMN `taglia TEXT` | ✅ | — | migrazione SQL | ~3min |
| 12.9 | Endpoint PUT `/api/team-player/:id` — aggiornare taglia (già esistente? estendere) | ✅ | 12.8 | routes/player.js | ~5min |
| 12.10 | Roster: mostrare colonna taglia (editabile inline con select) | ✅ | 12.9 | modules/team/roster.js | ~7min |
| 12.11 | Player detail: campo taglia nella sezione anagrafica | ✅ | 12.9 | modules/team/playerDetail.js | ~5min |

##### Fase 2b: DB + Backend Kit (~35min)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 12.12 | CREATE TABLE `kit_template` (workspace_id, nome, settore, articoli JSONB, numerazione, numerazione_start, taglie JSONB, attivo) | ✅ | — | migrazione SQL | ~5min |
| 12.13 | CREATE TABLE `kit_stock` (workspace_id, template_id, articolo, taglia, numero, stato, note) | ✅ | 12.12 | migrazione SQL | ~3min |
| 12.14 | CREATE TABLE `kit_assignment` (kit_stock_id, player_id, team_id, season_id, data_assegnazione) | ✅ | 12.13 | migrazione SQL | ~3min |
| 12.15 | Endpoint CRUD `/api/kit-templates` (GET per workspace, POST, PUT, DELETE) | ✅ | 12.12 | routes/kit.js (nuovo) | ~10min |
| 12.16 | Endpoint POST `/api/kit-stock/generate` — genera stock da template (taglia × quantità, numeri sequenziali se configurato) | ✅ | 12.13 | routes/kit.js | ~10min |
| 12.17 | Endpoint GET `/api/kit-stock?workspace_id=X&template_id=Y` — vista magazzino con conteggi per taglia/stato | ✅ | 12.13 | routes/kit.js | ~5min |
| 12.18 | Endpoint POST `/api/kit-assignments` — assegna pezzo a giocatore (stock.stato → assegnato) | ✅ | 12.14 | routes/kit.js | ~5min |
| 12.19 | Endpoint GET `/api/kit-assignments?team_id=X&season_id=Y` — assegnazioni per categoria | ✅ | 12.14 | routes/kit.js | ~5min |
| 12.20 | Endpoint POST `/api/kit-stock/restock` — aggiungere stock (nuovo ordine parziale) | ✅ | 12.13 | routes/kit.js | ~5min |

##### Fase 2c: UI Pagina Kit (~50min)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 12.21 | Pagina kit.js — struttura base con card collassabili per template (header: nome, stato assegnazioni, magazzino disponibile) | ✅ | 12.17, 12.19 | modules/club/kit.js (nuovo) | ~15min |
| 12.22 | Modale configurazione template — nome, settore (radio SC/SG → taglie auto), lista articoli (ha_taglia/ha_numero toggle), regola numerazione | ✅ | 12.15 | modules/club/kit.js | ~15min |
| 12.23 | Modale genera stock — griglia taglia × quantità, preview numeri se sequenziale, bottone genera | ✅ | 12.16 | modules/club/kit.js | ~10min |
| 12.24 | Modale assegnazione giocatore — select giocatore (taglia pre-proposta da team_player), select taglia/numero disponibili, conferma | ✅ | 12.18 | modules/club/kit.js | ~10min |
| 12.24b | Auto-assign batch — bottone "🎯 Auto" assegna kit a tutti i giocatori con taglia impostata e stock disponibile (endpoint batch + UI) | ✅ | 12.24 | routes/kit.js, modules/club/kit.js | ~10min |
| 12.24c | Prompt "Vuoi creare una quota per il kit?" dopo salvataggio template — link diretto a pagina Quote | ✅ | 12.24 | modules/club/kit.js | ~5min |

##### Fase 2d: Vista magazzino + consegne (~30min)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 12.25 | Tab/sezione Magazzino — griglia taglia × disponibili/assegnati/ordinati per template, evidenzia esauriti, bottone "+ Ordina" | ✅ | 12.17 | modules/club/kit.js | ~15min |
| 12.26 | Lista assegnazioni per categoria — giocatori con pallino stato, articoli assegnati, filtri (Tutti/Incompleti/Completi) | ✅ | 12.19 | modules/club/kit.js | ~10min |
| 12.27 | Widget dashboard "Kit" — riga per template con alert + contatori, click → pagina Kit | ✅ | 12.19 | modules/team/dashboard.js | ~5min |

##### Fase 2e: Integrazione (~15min)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 12.28 | Router + sidebar: voce "👕 Kit" sotto Club per admin/segreteria | ✅ | 12.21 | router.js, sidebarNav.js | ~5min |
| 12.29 | Migrazione stagione: copiare taglia da team_player precedente come default | ✅ | 12.8 | routes/workspace.js | ~5min |
| 12.30 | Test build + aggiornare AGENTS.md e DATABASE_SCHEMA.md | ✅ | 12.28 | docs | ~5min |

##### Fase 2f: Kit Staff (~35min)

> Estendere il sistema kit per gestire l'assegnazione ai membri dello staff. La taglia è salvata su `staff` (caratteristica della persona). Il kit è visibile cross-categoria: se assegnato nella categoria X, appare già assegnato anche nella categoria Y dove lo stesso staff è presente.

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 12.46 | DB: `ALTER TABLE kit_assignment ADD staff_id UUID REFERENCES staff(id)` + `ALTER TABLE staff ADD taglia TEXT` | ✅ | — | migrazione SQL | ~3min |
| 12.47 | Backend: `GET /kit-assignments?team_id=X` include staff (join `staff`+`team_staff`, cross-categoria per staff già assegnati) | ✅ | 12.46 | routes/kit.js | ~8min |
| 12.48 | Backend: `POST /kit-assignments-batch` accetta `staff_id` opzionale (alternativo a `player_id`) + `UPDATE staff SET taglia` se fornita | ✅ | 12.46 | routes/kit.js | ~5min |
| 12.49 | Frontend: toggle Giocatori/Staff nella lista assegnazioni per template; modal assegnazione con select staff (filtrato per team_staff della categoria corrente, con badge se già assegnato in altra categoria) | ✅ | 12.47, 12.48 | modules/club/kit.js | ~15min |
| 12.50 | Test build + aggiornare docs (AGENTS.md, DATABASE_SCHEMA.md, helpData.js) | ✅ | 12.49 | docs | ~5min |

##### Fase 2g: Flusso "Ordine Evaso" (~45min)

> Gestire il ciclo di vita degli ordini in attesa: kit completi (`da_ordinare_kit`) e pezzi sfusi (`pezzi_in_attesa` su bundle). Card "Da ordinare" diventa operativa con bottone "Gestisci ordine" per ogni voce. Tipo 1 parziale si converte in Tipo 2 (pezzi_in_attesa).

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 12.51 | Backend: `POST /kit-evadi-ordine` — body `{player_id?/staff_id?, template_id, taglia, tipo_ordine: 'kit'\|'pezzi', articoli_arrivati?, assegna_subito}`. Tipo kit: crea bundle+stock, assegna se richiesto, azzera `da_ordinare_kit`. Tipo pezzi: rimuove articoli da `pezzi_in_attesa` del bundle, aggiorna stato bundle | ✅ | — | routes/kit.js | ~15min |
| 12.52 | Frontend: card "Da ordinare" — righe singole con bottone "Gestisci ordine" per ogni voce (Tipo 1 kit e Tipo 2 pezzi sfusi) | ✅ | 12.51 | modules/club/kit.js | ~10min |
| 12.53 | Frontend: `showGestisciOrdineKitModal()` — checklist articoli arrivati, radio assegna-subito/solo-stock | ✅ | 12.52 | modules/club/kit.js | ~10min |
| 12.54 | Frontend: `showGestisciOrdinePezziModal()` — checklist pezzi in attesa (spunta = arrivato), pezzi non spuntati restano in attesa | ✅ | 12.52 | modules/club/kit.js | ~8min |
| 12.55 | Test build + aggiornare docs | ✅ | 12.54 | docs | ~3min |

##### Fase 2h: Refactoring Layout Pagina Kit (~60min)

> Redesign completo della pagina kit: 3 sezioni distinte (Assegnazioni con tab per template, Magazzino con tab per template, Ordini con tab Da ordinare/In attesa). Layout 2 colonne desktop per Magazzino+Ordini. Elimina scroll verticale infinito.

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 12.56 | Nuova struttura `render()`: header + sezione Assegnazioni (card con tab template) + grid 2col desktop (Magazzino + Ordini) | ✅ | — | modules/club/kit.js | ~15min |
| 12.57 | Sezione Assegnazioni: tab pill per ogni template, filtri Tutti/Incompleti/Completi contestuali, lista giocatori/staff del template selezionato | ✅ | 12.56 | modules/club/kit.js | ~15min |
| 12.58 | Sezione Magazzino: card con tab pill per template, bundle per taglia collassabili (riusa logica esistente) | ✅ | 12.56 | modules/club/kit.js | ~15min |
| 12.59 | Sezione Ordini: card con tab "Da ordinare" / "In attesa fornitore" (unifica le due sezioni attuali) | ✅ | 12.56 | modules/club/kit.js | ~10min |
| 12.60 | CSS responsive: grid 2col desktop (Magazzino+Ordini), 1col mobile. Tab pill standard. Build test + docs | ✅ | 12.57-12.59 | modules/club/kit.js | ~5min |

**Effort totale Fase 2**: ~2h30 (23 task)

**Taglie per settore (default)**:
- Scuola Calcio: 116, 122, 128, 134, 140, 146, 152, 158, XS Adulto
- Settore Giovanile: XS, S, M, L, XL, XXL

**Regole numerazione**:
- `nessuna`: articoli senza numero (K-way, borsa, tuta...)
- `libera`: numero scelto manualmente (o auto da numero_maglia)
- `sequenziale`: numeri assegnati automaticamente partendo da `numerazione_start` (default 13), per taglia

#### Fase 3: Checklist Stagione

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 12.31 | CREATE TABLE `registration_checklist` (player_id, team_id, season_id, items JSONB, completamento_pct INT) | ✅ | — | migrazione SQL | ~3min |
| 12.32 | Configurazione template checklist per workspace (colonna `checklist_template` JSONB su workspace + endpoint GET/PUT) | ✅ | 12.31 | routes/checklist.js | ~5min |
| 12.33 | Endpoint GET/PUT `/api/checklist` (per player + per team aggregato) + POST `/api/checklist-generate` (batch) | ✅ | 12.31 | routes/checklist.js | ~10min |
| 12.34 | UI checklist per giocatore (toggle items + barra progresso) | ✅ | 12.33 | modules/club/checklist.js | ~10min |
| 12.35 | Vista aggregata "Situazione squadra" (tutti i giocatori con % completamento, filtro per item mancante) | ✅ | 12.33 | modules/club/checklist.js | ~10min |
| 12.36 | Auto-generazione checklist su migrazione stagione (hook in endpoint migra) | ✅ | 12.32, 12.33 | routes/workspace.js | ~5min |
| 12.37 | Widget "Checklist" in dashboard (incompleti + barra progresso media, click → pagina) | ✅ | 12.33 | modules/team/dashboard.js | ~5min |

#### Fase 4: Dashboard Segreteria Action-Driven

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 12.38 | Endpoint aggregato `/api/club-operations/summary` (quote pendenti + kit da consegnare + certificati scadenza + checklist incomplete) | ✅ | 12.33 | routes/clubOperations.js | ~10min |
| 12.39 | Dashboard segreteria con card action-driven (widget individuali Quote/Kit/Checklist/Certificati con click → pagina) | ✅ | 12.38 | modules/team/dashboard.js | ~10min |
| 12.40 | Sidebar: voci Quote, Kit, Checklist visibili per segreteria/admin (individualmente) | ✅ | 12.34 | components/layout/sidebarNav.js | ~5min |
| 12.41 | Test build completo + aggiornare docs | ✅ | 12.40 | DEVELOPMENT_PLAN.md, AGENTS.md | ~5min |

**Effort totale stimato EPIC 12**: ~15h (42 task)

**Note architetturali**:
- `fee`, `kit_assignment`, `registration_checklist` sono legate a `player_id` + `team_id` + `season_id` → dati per stagione
- Collegamento Kit ↔ Quote: dopo creazione template kit, prompt chiede se creare quota dedicata (tipico SC: quota kit separata; SG: kit incluso in quota stagionale). Il link porta alla pagina Quote per configurare la fee_config
- `kit_stock` è per workspace (magazzino condiviso tra categorie), le assegnazioni sono per team/categoria
- `team_player.taglia` è per stagione (copiata in migrazione stagione come default)
- La configurazione (template kit, template checklist, fee_config) è per workspace → riutilizzabile tra stagioni
- I widget dashboard segreteria si aggiungono ai widget esistenti (visibili solo per profilo segreteria/admin)
- La voce sidebar "Club Operations" richiede capability `club_operations: read/write`
- Le notifiche scadenza quote (12.7) dipendono da EPIC 11 (destinatario_tipo genitore)
- Taglie scuola calcio: 116, 122, 128, 134, 140, 146, 152, 158, XS Adulto
- Taglie settore giovanile: XS, S, M, L, XL, XXL
- Numerazione kit: nessuna (default) | libera (manuale) | sequenziale (auto da N)
- Fase futura (v4.0): Ricevute PDF, Ordini fornitore con tracking, Storico magazzino multi-stagione

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

### EPIC 18: Refactoring Stagioni — Rimozione "attiva" e Assegnazione Esplicita

> Eliminare il concetto di "stagione attiva" come flag globale. Ogni utente/staff vede solo le stagioni assegnate. La stellina indica la più recente (calcolata al volo). Staff assegnato per stagione con migrazione esplicita. Selettore stagione/categoria con logica di persistenza intelligente.

**Problema attuale**: `season.attiva` è un flag globale per workspace che crea bug (staff assegnato alla stagione sbagliata), obbliga un'azione manuale ("attiva stagione"), e non riflette la realtà multi-utente.

**Nuovo modello**:
- Visibilità stagioni = `users.stagioni_accesso` (assegnazione esplicita)
- Default = la più recente tra quelle assegnate (calcolata al volo per anno)
- Stellina ★ = cosmetico, indica la più recente
- Staff = assegnato per team (= per stagione), con migrazione esplicita
- `season.attiva` = campo ignorato (non rimosso dal DB per evitare migrazione distruttiva)

#### Fase 1: Backend — Nuova logica visibilità stagioni

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 18.1 | Helper `getLatestSeason(seasons)`: ordina per anno desc, ritorna la prima (sostituisce `.find(s => s.attiva)`) | ✅ | — | helpers/seasons.js (nuovo) | ~5min |
| 18.2 | Endpoint GET `/workspaces/:id/stagioni`: aggiungere campo calcolato `is_latest` (true sulla più recente) al posto di `attiva` nella risposta | ✅ | 18.1 | routes/workspace.js | ~5min |
| 18.3 | Endpoint POST creazione stagione: rimuovere `await supabase.from('season').update({ attiva: false })` — non disattivare più le altre | ✅ | 18.1 | routes/workspace.js | ~3min |
| 18.4 | Endpoint PUT `/stagioni/:id` (team.js): rimuovere logica "disattiva le altre quando ne attivi una" | ✅ | 18.1 | routes/team.js | ~3min |
| 18.5 | Rimuovere endpoint PUT `/workspaces/:id/stagioni/:seasonId/attiva` (non più necessario) | ✅ | 18.3 | routes/workspace.js | ~3min |
| 18.6 | Staff POST/PUT: usare `getLatestSeason()` al posto di `.find(s => s.attiva)` come fallback (già fixato parzialmente) | ✅ | 18.1 | routes/workspace.js | ~5min |

#### Fase 2: Backend — Assegnazione stagioni a utenti

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 18.7 | Endpoint PUT `/api/users/:id` (creazione/modifica utente): accettare `stagioni_accesso` come array di season_id obbligatorio (almeno 1) | ✅ | — | routes/auth.js | ~5min |
| 18.8 | Endpoint GET `/auth/me`: includere `stagioni_accesso` dell'utente nella risposta (per il frontend) | ✅ | 18.7 | routes/auth.js | ~3min |
| 18.9 | Logica visibilità: superadmin/admin → tutte le stagioni; staff → solo `stagioni_accesso`; se vuoto (legacy) → la più recente | ✅ | 18.7 | modules/team/squadre.js | ~5min |

#### Fase 3: Frontend — Selettore stagione/categoria

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 18.10 | `loadSquadre()`: sostituire `stagioni.find(s => s.attiva)` con `getLatestSeason()` (ordina per anno desc, prende la prima tra quelle accessibili) | ✅ | 18.2 | modules/team/squadre.js | ~5min |
| 18.11 | Selettore stagione: stellina ★ sulla più recente (non su `attiva`), ordinamento anno desc | ✅ | 18.10 | modules/team/squadre.js | ~3min |
| 18.12 | Cambio stagione: mantiene la categoria selezionata se esiste nella nuova stagione, altrimenti fallback alla prima disponibile | ✅ | 18.10 | modules/team/squadre.js | ~8min |
| 18.13 | Cambio categoria: torna alla stagione più recente per quella categoria | ✅ | 18.12 | modules/team/squadre.js | ~5min |
| 18.14 | Rimuovere logica `_stagioneAttiva` e `preferisci l'attiva` dal selettore | ✅ | 18.10 | modules/team/squadre.js | ~3min |

#### Fase 4: Frontend — Pagina Stagioni & Categorie

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 18.15 | Rimuovere badge "ATTIVA" e bottone "Attiva" dalla lista stagioni | ✅ | 18.5 | modules/club/seasonsCategories.js | ~5min |
| 18.16 | Aggiungere badge "★ Più recente" (cosmetico, non cliccabile) sulla stagione con anno più alto | ✅ | 18.15 | modules/club/seasonsCategories.js | ~3min |
| 18.17 | Wizard creazione stagione: rimuovere riferimento a "attivala" — la nuova è automaticamente la più recente | ✅ | 18.15 | modules/club/seasonsCategories.js | ~3min |

#### Fase 5: Frontend — Workspace Hub (superadmin)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 18.18 | Tab Stagioni: rimuovere bottone "Attiva", aggiungere badge "★ Più recente" | ✅ | 18.5 | modules/admin/workspaces.js | ~5min |
| 18.19 | Tab Utenti: aggiungere selezione stagioni (checkbox) nella creazione/modifica utente | ✅ | 18.7 | modules/admin/workspaces.js | ~8min |
| 18.20 | Tab Utenti: mostrare stagioni assegnate nella lista utenti (chip/badge) | ✅ | 18.19 | modules/admin/workspaces.js | ~5min |

#### Fase 6: Staff — Migrazione esplicita da pagina Staff

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 18.21 | Backend: endpoint POST `/api/workspaces/:id/staff/migrate` — body: `{ from_season_id, to_season_id, staff_ids[] }` — crea `team_staff` per ogni staff nel team della stagione destinazione (skip duplicati) | ✅ | — | routes/workspace.js | ~10min |
| 18.22 | Frontend pagina Staff: bottone "📋 Copia da altra stagione" (visibile se >1 stagione nel workspace) | ✅ | 18.21 | modules/club/staff.js | ~5min |
| 18.23 | Modale migrazione: dropdown stagione sorgente → preview staff con checkbox (deselezionabili) → conferma | ✅ | 18.22 | modules/club/staff.js | ~10min |
| 18.24 | Preview: mostrare "✓ già presente" per staff già assegnati nella stagione destinazione (non selezionabili) | ✅ | 18.23 | modules/club/staff.js | ~5min |

#### Fase 7: Staff — Modale con contesto stagione

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 18.25 | Modale staff: mostrare la stagione correntemente visualizzata (readonly) + dropdown categoria | ✅ | 18.10 | modules/club/staff.js | ~5min |
| 18.26 | Pagina Staff: filtrare lista per stagione selezionata nel header (mostra solo staff assegnati a team di quella stagione) | ✅ | 18.25 | modules/club/staff.js | ~8min |

#### Fase 8: Pulizia e finalizzazione

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 18.27 | Aggiornare helpData.js: rimuovere riferimenti a "stagione attiva", aggiornare testi | ✅ | 18.15 | components/helpData.js | ~3min |
| 18.28 | Verificare endpoint migrazione stagione (wizard): `migra_staff` continua a funzionare (copia team_staff dalla stagione precedente) | ✅ | 18.3 | routes/workspace.js | ~5min |
| 18.29 | Test build completo frontend + syntax check backend | ✅ | 18.28 | — | ~3min |
| 18.30 | Aggiornare docs (DEVELOPMENT_PLAN, AGENTS.md, project-rules.md) — rimuovere riferimenti a "stagione attiva" come concetto operativo | ✅ | 18.29 | .agents/, .amazonq/rules/ | ~5min |

**Effort totale stimato**: ~2h 40min (30 task)

**Priorità implementazione**:
1. Fase 1 (Backend logica) — rimuove dipendenza da `attiva`, 24min
2. Fase 2 (Assegnazione utenti) — fondamenta nuovo modello, 13min
3. Fase 3 (Selettore frontend) — UX core, 24min
4. Fase 6 (Migrazione staff) — risolve il problema originale, 30min
5. Fase 7 (Modale staff) — contesto stagione chiaro, 13min
6. Fase 4+5 (UI stagioni) — pulizia visuale, 16min
7. Fase 8 (Pulizia) — docs e test, 16min

**Note architetturali**:
- `season.attiva` resta come colonna nel DB (non viene droppata) ma non viene più letta/scritta da nessuna logica
- La "più recente" si calcola con: `seasons.sort((a,b) => b.nome.localeCompare(a.nome))[0]` (il nome è formato "YYYY/YY")
- `users.stagioni_accesso` diventa il campo primario per la visibilità (già esiste, oggi è opzionale)
- Per utenti legacy senza `stagioni_accesso`: fallback = la più recente (retrocompatibile)
- Il selettore stagione nel header mantiene la selezione in localStorage (come oggi)
- La pagina Staff filtra per stagione selezionata — se cambio stagione, vedo lo staff di quella stagione
- La migrazione staff (pagina Staff) è indipendente dalla migrazione nel wizard creazione stagione (entrambe funzionano)
- Nessuna dipendenza da altre Epic

**Comportamento selettore (riepilogo)**:
| Azione | Risultato |
|--------|----------|
| Cambio stagione | Mantiene categoria se esiste, altrimenti fallback prima disponibile |
| Cambio categoria | Torna alla stagione più recente per quella categoria |
| Primo accesso | Stagione più recente tra quelle assegnate + prima categoria |
| Legacy (no stagioni_accesso) | Stagione più recente del workspace |

### EPIC 19: PWA Guest — Installazione App + Notifiche Push

> Permettere alle famiglie (link guest atleta) di installare l'app come PWA e ricevere notifiche push per convocazioni, comunicazioni e scadenze quote.

**Valore**: Le famiglie non devono ricordarsi di aprire il link — ricevono push automatiche. Differenziatore forte rispetto a gruppi WhatsApp.

**Valore**: Le famiglie non devono ricordarsi di aprire il link — ricevono push automatiche. Differenziatore forte rispetto a gruppi WhatsApp.

**Prerequisiti**: EPIC 12 completato (quote visibili nel guest), EPIC 11 completato (infrastruttura guest).

#### Fase 1: Token Refresh & Persistenza Sessione (~2h)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 19.1 | Estendere durata JWT guest da 24h a 30 giorni (o implementare refresh token silenzioso) | ⬜ | — | routes/auth.js | ~15min |
| 19.2 | Frontend: auto-refresh JWT guest prima della scadenza (intercettore 401 → re-auth con token originale) | ⬜ | 19.1 | services/api.js | ~30min |
| 19.3 | Banner "Installa App" per guest su mobile (beforeinstallprompt + fallback istruzioni iOS) | ⬜ | — | modules/auth/guestAtleta.js | ~30min |
| 19.4 | Persistenza: salvare token guest in localStorage, auto-login al riapertura PWA | ⬜ | 19.1 | modules/auth/guest.js | ~30min |

#### Fase 2: Push Subscription (~2h30)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 19.5 | Generare VAPID keys e salvarle in env backend | ⬜ | — | .env, config | ~10min |
| 19.6 | Tabella DB `push_subscription` (id, user_id, guest_token_id, endpoint, keys_p256dh, keys_auth, created_at) | ⬜ | 19.5 | migration SQL | ~10min |
| 19.7 | Endpoint POST `/api/push/subscribe` — salva subscription (auth: user o guest) | ⬜ | 19.6 | routes/push.js (nuovo) | ~20min |
| 19.8 | Endpoint DELETE `/api/push/unsubscribe` — rimuove subscription | ⬜ | 19.7 | routes/push.js | ~10min |
| 19.9 | Frontend: richiedere permesso notifiche dopo login guest + registrare subscription | ⬜ | 19.7 | modules/auth/guestAtleta.js | ~30min |
| 19.10 | Service Worker: gestire evento `push` → mostrare notifica nativa con titolo/body/icon | ⬜ | 19.9 | sw.js / service-worker.js | ~30min |
| 19.11 | Service Worker: gestire `notificationclick` → aprire app sulla pagina corretta | ⬜ | 19.10 | sw.js | ~20min |

#### Fase 3: Invio Push dal Backend (~2h)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 19.12 | Helper `sendPush(subscriptions, payload)` con web-push library | ⬜ | 19.5 | helpers/push.js (nuovo) | ~20min |
| 19.13 | Trigger push su pubblicazione convocazione → invia a tutti i guest del team | ⬜ | 19.12 | routes/match.js o convocazioni | ~20min |
| 19.14 | Trigger push su nuova comunicazione (notification tipo=avviso) → invia a guest destinatari | ⬜ | 19.12 | routes/notifications.js | ~20min |
| 19.15 | Trigger push su scadenza quota (check-scadenze) → invia a guest del player | ⬜ | 19.12 | routes/fees.js | ~20min |
| 19.16 | Gestione subscription scadute/invalide: rimuovere su errore 410 Gone | ⬜ | 19.12 | helpers/push.js | ~15min |

#### Fase 4: Testing & Polish (~1h30)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 19.17 | Test iOS Safari 16.4+ (PWA installata, push permission) | ⬜ | 19.10 | — | ~30min |
| 19.18 | Test Android Chrome (install prompt, push) | ⬜ | 19.10 | — | ~20min |
| 19.19 | Preferenze notifiche guest: toggle on/off per tipo (convocazioni, comunicazioni, quote) | ⬜ | 19.9 | modules/auth/guestAtleta.js | ~30min |
| 19.20 | Badge icona app con conteggio notifiche non lette (navigator.setAppBadge) | ⬜ | 19.10 | sw.js | ~10min |

**Effort totale**: ~8h | **Priorità**: Post-EPIC 12 | **Dipendenze**: EPIC 11 ✅, EPIC 12

---

### EPIC 20: Modulo Tesseramento Atleti

> Digitalizzare il processo di tesseramento: template modulo personalizzabile per società (logo, dati, clausole), generazione PDF pre-compilato con dati atleta, checklist documenti con tracking stato, vista aggregata per squadra. Ogni società configura il proprio template una volta, poi genera moduli per ogni atleta con un click.

**Valore commerciale**: Elimina il lavoro manuale della segreteria (compilare moduli a mano per 20+ atleti). PDF professionale con logo società. Tracking chi ha consegnato cosa. Integrazione con Print Center.

#### Fase 1: Schema DB e Template

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 20.1 | CREATE TABLE `registration_template` (id, workspace_id FK, titolo TEXT, intestazione TEXT, documenti_richiesti JSONB, clausole TEXT, note_aggiuntive TEXT, created_at, updated_at) | ✅ | — | migrazione SQL | ~3min |
| 20.2 | CREATE TABLE `registration` (id, player_id FK, team_id FK, season_id FK, template_id FK, stato TEXT, dati_genitore JSONB, documenti_consegnati JSONB, data_tesseramento DATE, note TEXT, created_at, updated_at) | ✅ | 20.1 | migrazione SQL | ~3min |
| 20.3 | Seed template default per workspace esistenti (documenti standard FIGC: foto, certificato medico, CF, stato famiglia, consenso privacy) | ✅ | 20.1 | migrazione SQL | ~3min |
| 20.4 | Aggiornare DATABASE_SCHEMA.md con nuove tabelle | ✅ | 20.2 | .agents/knowledge/DATABASE_SCHEMA.md | ~2min |

#### Fase 2: Backend CRUD

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 20.5 | Creare `routes/registration.js` — GET/PUT `/api/workspaces/:id/registration-template` (upsert template per workspace) | ✅ | 20.1 | routes/registration.js | ~10min |
| 20.6 | Endpoint GET `/api/squadre/:teamId/registrations` (lista tesseramenti per squadra con stato e % completamento) | ✅ | 20.2 | routes/registration.js | ~8min |
| 20.7 | Endpoint POST `/api/registrations` (crea tesseramento per player, auto-popola da template) | ✅ | 20.2, 20.5 | routes/registration.js | ~5min |
| 20.8 | Endpoint PUT `/api/registrations/:id` (aggiorna stato, documenti consegnati, dati genitore) | ✅ | 20.7 | routes/registration.js | ~5min |
| 20.9 | Endpoint POST `/api/squadre/:teamId/registrations-batch` (genera tesseramenti per tutta la rosa in un click) | ✅ | 20.7 | routes/registration.js | ~8min |
| 20.10 | Endpoint GET `/api/registrations/:id/pdf` → print page standalone (non endpoint PDF server-side) | ✅ | 20.8 | modules/print/printTesseramento.js | ~15min |
| 20.11 | Registrare router in `api/index.js` + authMiddleware | ✅ | 20.5 | api/index.js | ~3min |

#### Fase 3: Frontend — Configurazione Template

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 20.12 | Creare `modules/club/registration.js` — pagina Tesseramento con tab "Template" e "Situazione" | ✅ | 20.5 | modules/club/registration.js | ~10min |
| 20.13 | Tab Template: form configurazione (titolo, intestazione, lista documenti richiesti con add/remove, clausole, anteprima) | ✅ | 20.12 | modules/club/registration.js | ~12min |
| 20.14 | Lista documenti: ogni item ha nome, obbligatorio (toggle), nota età (es. "se >12 anni: agonistico") | ✅ | 20.13 | modules/club/registration.js | ~5min |
| 20.15 | Anteprima live: mostra come apparirà il modulo PDF con logo società e dati placeholder | ✅ | 20.13 | modules/club/registration.js | ~8min |

#### Fase 4: Frontend — Situazione Tesseramenti per Squadra

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 20.16 | Tab Situazione: tabella giocatori con colonne stato, documenti (icone ✅/❌ per ogni doc), azioni | ✅ | 20.6 | modules/club/registration.js | ~12min |
| 20.17 | Filtri: per stato (tutti/incompleti/completi/tesserati), ricerca nome | ✅ | 20.16 | modules/club/registration.js | ~5min |
| 20.18 | Click su riga → espande dettaglio: checklist documenti (toggle consegnato), dati genitore (form inline), note | ✅ | 20.16 | modules/club/registration.js | ~10min |
| 20.19 | Bottone "Genera per tutta la rosa" (batch) + conferma modale | ✅ | 20.9, 20.16 | modules/club/registration.js | ~5min |
| 20.20 | Bottone "📄 Scarica PDF" per singolo atleta (chiama endpoint PDF) | ✅ | 20.10, 20.16 | modules/club/registration.js | ~5min |
| 20.21 | Stato auto-calcolato: tutti i doc obbligatori consegnati → "Completo", altrimenti "Incompleto" | ✅ | 20.8 | routes/registration.js | ~3min |

#### Fase 5: Generazione PDF

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 20.22 | Layout PDF A4: logo società (da workspace) + intestazione + dati atleta + dati genitore + lista documenti + clausole + spazi firma | ✅ | 20.10 | modules/print/printTesseramento.js | ~15min |
| 20.23 | Dati atleta auto-compilati: nome, cognome, data nascita, luogo nascita, CF, indirizzo (da player) | ✅ | 20.22 | modules/print/printTesseramento.js | ~5min |
| 20.24 | Dati genitore: nome, cognome, documento (tipo + numero + rilasciato il), parentela — da `registration.dati_genitore` JSONB | ✅ | 20.22 | modules/print/printTesseramento.js | ~5min |
| 20.25 | Sezione documenti richiesti: lista con checkbox (✓ se consegnato, vuoto se no) + note età-specifiche | ✅ | 20.22 | modules/print/printTesseramento.js | ~3min |
| 20.26 | Footer: luogo + data + spazi firma (genitore richiedente + ragazzo) | ✅ | 20.22 | modules/print/printTesseramento.js | ~3min |

#### Fase 6: Integrazione e Finalizzazione

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 20.27 | Sidebar: voce "📋 Tesseramento" sotto Club (capability: `tesseramento`) | ✅ | 20.12 | components/layout/sidebarNav.js | ~3min |
| 20.28 | Router: registrare route `/tesseramento` | ✅ | 20.12 | router.js | ~2min |
| 20.29 | Print Center: aggiungere card "Modulo Tesseramento" nella sezione Rosa (genera PDF per atleta selezionato) | ✅ | 20.10 | modules/team/printCenter.js | ~5min |
| 20.30 | Dashboard widget: "Tesseramenti incompleti" (contatore + link) — visibile per segreteria/admin | ✅ | 20.6 | modules/team/dashboard.js | ~8min |
| 20.31 | Player Detail: sezione "Tesseramento" con stato + documenti + link PDF | ✅ | 20.8 | modules/team/playerDetail.js | ~8min |
| 20.32 | Help in-app: aggiungere helpData per pagina Tesseramento | ✅ | 20.12 | components/helpData.js | ~3min |
| 20.33 | Test build completo + syntax check backend | ✅ | 20.32 | — | ~3min |
| 20.34 | Aggiornare docs (DEVELOPMENT_PLAN, AGENTS.md, DATABASE_SCHEMA) | ✅ | 20.33 | .agents/ | ~3min |

#### Fase 7: Accesso Guest (Link Famiglia)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 20.35 | Endpoint GET `/api/registrations/player/:playerId` (guest-safe: ritorna tesseramento + template del proprio figlio) | ✅ | 20.8 | routes/registration.js | ~5min |
| 20.36 | Home Famiglia: sezione "📋 Tesseramento" con stato documenti + bottone "Scarica Modulo PDF" | ✅ | 20.35 | modules/auth/guestAtleta.js | ~8min |
| 20.37 | Pagina print standalone `/print/tesseramento/:registrationId` (A4, accessibile da guest con JWT) | ✅ | 20.22 | modules/print/printTesseramento.js | ~10min |
| 20.38 | Famiglia può compilare dati mancanti (nome genitore, cognome, documento) direttamente dalla home → PUT registration | ✅ | 20.36, 20.8 | modules/auth/guestAtleta.js | ~10min |
| 20.39 | Capability `tesseramento` dedicata (write: admin/segreteria, read: allenatore/dirigente) | ✅ | 20.27 | utils/capabilities.js, api/helpers/capabilities.js | ~5min |
| 20.40 | Auto-check certificato medico: se data_visita_medica valida → doc "Certificato medico" auto-smarcato nella risposta API | ✅ | 20.6 | routes/registration.js | ~5min |
| 20.41 | Sollecito documenti mancanti: POST `/registrations/:id/sollecito` → notifica in-app alla famiglia | ✅ | 20.8 | routes/registration.js, modules/club/registration.js | ~8min |
| 20.42 | Sollecito certificati medici: POST `/notifications/sollecito-certificato` (singolo + bulk) dalla card Certificati dashboard | ✅ | — | routes/notification.js, utils/certificati.js | ~10min |
| 20.43 | Stato lettura inline per notifiche individuali (✅ Letta / ⏳ Non letta) nella tab Inviate | ✅ | — | modules/coach/notifications.js | ~5min |
| 20.44 | Fix notifiche staff: `created_by` incluso nel filtro GET (staff vede proprie inviate), escluso da unread count | ✅ | — | routes/notification.js | ~3min |

**Effort totale stimato**: ~4h (38 task)

**Priorità implementazione**:
1. Fase 1 (DB) — fondamenta, 11min
2. Fase 2 (Backend CRUD) — API pronte, 54min
3. Fase 3 (Template UI) — configurazione società, 35min
4. Fase 4 (Situazione) — tracking operativo, 40min
5. Fase 5 (PDF) — generazione documento, 31min
6. Fase 6 (Integrazione) — polish e connessioni, 35min
7. Fase 7 (Guest Famiglia) — accesso link famiglia, 33min

**Note architetturali**:
- `registration_template` è 1:1 per workspace (ogni società ha il suo template)
- `registration` è 1:1 per player+team+season (un tesseramento per atleta per stagione)
- `documenti_richiesti` nel template: `[{nome: "Foto tessera", obbligatorio: true, nota_eta: "2 foto se >8 anni, 1 se ≤8"}]`
- `documenti_consegnati` nella registration: `[{nome: "Foto tessera", consegnato: true, data_consegna: "2025-07-10"}]`
- `dati_genitore` JSONB: `{nome, cognome, parentela, documento_tipo, documento_numero, documento_rilasciato}`
- `stato` enum: `non_iniziato`, `incompleto`, `completo`, `tesserato`
- Il PDF usa una libreria server-side (es. `pdfkit` o HTML→PDF con `puppeteer-core`) — da valutare la più leggera per Vercel
- Logo società: già disponibile in `workspace.logo` — incluso automaticamente nel PDF
- Dati società: da `workspace` (nome, indirizzo da `facility` principale)
- Integrazione con EPIC 12 (checklist): il tesseramento può essere un item della checklist stagione
- Capability: riusa `rosa: write` (chi gestisce la rosa gestisce anche i tesseramenti) oppure nuova `tesseramento: write` se serve granularità
- Nessuna dipendenza da altre Epic (standalone)
- **Accesso guest Famiglia**: il link Famiglia (tipo=`famiglia` nel DB, label "👨‍👩‍👦 Famiglia" nella UI) ha `player_id` → mostra il tesseramento del proprio figlio. Il link Ospite (tipo=`ospite`, senza player_id) NON vede il tesseramento
- **Print Center guest**: la pagina `/print/tesseramento/:id` è accessibile con JWT guest (come le altre pagine print)

**Evoluzione futura (v2)**:
- Firma digitale (canvas touch per firma su mobile)
- Archivio storico tesseramenti (cross-season)
- Export batch PDF (ZIP con tutti i moduli della squadra)
- Integrazione con portale FIGC (upload automatico — se API disponibile)
- QR code sul modulo per verifica autenticità

---

### EPIC 21: Pagamento Quote — Bonifico + Upload Ricevuta + Stripe (futuro)

> Permettere ai genitori di pagare le quote tramite bonifico bancario con upload ricevuta, notifica automatica alla segreteria, e conferma pagamento. Supabase Storage per i file. Archiviazione stagionale per gestione spazio. Fase futura: pagamento online via Stripe Connect.

**Valore commerciale**: Elimina il passaparola "hai pagato?", dà trasparenza ai genitori (vedono rate e scadenze), riduce lavoro segreteria (notifica + conferma in 1 click), storico pagamenti con prova documentale.

#### Fase 1: Setup Storage + Config Bonifico

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 21.1 | Creare bucket `ricevute` su Supabase Storage (privato, max 5MB/file) | ✅ | — | script migrazione | ~3min |
| 21.2 | ALTER TABLE `fee_config`: ADD `causale_template TEXT` (iban già in workspace_anagrafica, intestatario = workspace.nome) | ✅ | — | migrazione SQL | ~3min |
| 21.3 | ALTER TABLE `fee_installment`: ADD `ricevuta_path TEXT`, `ricevuta_uploaded_at TIMESTAMPTZ`, `conferma_user_id UUID` | ✅ | — | migrazione SQL | ~3min |
| 21.4 | Aggiornare DATABASE_SCHEMA.md con nuove colonne + sezione Storage | ✅ | 21.2, 21.3 | .agents/knowledge/DATABASE_SCHEMA.md | ~2min |

#### Fase 2: Backend — Upload e Conferma

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 21.5 | Endpoint PUT `/api/fee-config/:id/payment-info` — salva IBAN, intestatario, causale template | ✅ | 21.2 | routes/fees.js | ~5min |
| 21.6 | Endpoint POST `/api/fees/installments/:id/upload-ricevuta` — multer upload + salva su Supabase Storage + aggiorna `ricevuta_path` + crea notification per segreteria | ✅ | 21.1, 21.3 | routes/fees.js | ~12min |
| 21.7 | Endpoint GET `/api/fees/installments/:id/ricevuta` — genera signed URL (1h) per download/preview | ✅ | 21.6 | routes/fees.js | ~5min |
| 21.8 | Endpoint PUT `/api/fees/installments/:id/conferma-pagamento` — segreteria conferma, aggiorna stato rata + `conferma_user_id` | ✅ | 21.6 | routes/fees.js | ~5min |
| 21.9 | Endpoint GET `/api/guest/fees` — rate del giocatore (guest atleta/genitore) con info bonifico | ✅ | 21.5 | routes/fees.js | ~8min |

#### Fase 3: Frontend Guest — Vista Quote + Upload

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 21.10 | Card "💰 Le mie quote" nella home Famiglia (`guestAtleta.js`) — lista rate con stato, scadenza, importo | ✅ | 21.9 | modules/auth/guestAtleta.js | ~10min |
| 21.11 | Dettaglio rata: mostra estremi bonifico (IBAN, intestatario, causale pre-compilata con nome atleta + tipo quota + numero rata) | ✅ | 21.10 | modules/auth/guestAtleta.js | ~8min |
| 21.12 | Bottone "📎 Carica ricevuta" — input file (JPG/PNG/PDF, max 5MB) + upload + feedback toast | ✅ | 21.6, 21.11 | modules/auth/guestAtleta.js | ~10min |
| 21.13 | Stato visivo rata: 🔴 scaduta, 🟡 in scadenza, 🟢 pagata, 📎 ricevuta caricata (in attesa conferma) | ✅ | 21.10 | modules/auth/guestAtleta.js | ~5min |
| 21.14 | ~~Card "💰 Le mie quote" anche nella home atleta (read-only, senza upload)~~ — già incluso in 21.10-21.13 (unico modulo Famiglia) | ✅ | — | — | — |

#### Fase 4: Frontend Segreteria — Notifica + Conferma

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 21.15 | Notifica in Centro Comunicazioni: "Rossi Marco ha caricato ricevuta per Rata 2 - Kit" con link diretto | ✅ | 21.6 | modules/coach/notifications.js | ~8min |
| 21.16 | Click notifica → modale preview ricevuta (immagine/PDF inline) + bottoni "✅ Conferma" / "❌ Rifiuta" | ✅ | 21.7, 21.15 | modules/coach/notifications.js | ~10min |
| 21.17 | Se rifiutata: notifica alla famiglia "Ricevuta non valida — ricaricare" + reset `ricevuta_path` | ✅ | 21.16 | routes/fees.js | ~5min |
| 21.18 | Vista quote admin: badge "📎" su rate con ricevuta caricata in attesa di conferma | ✅ | 21.16 | modules/club/fees.js | ~5min |

#### Fase 5: Config Bonifico — UI Segreteria

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 21.19 | Sezione "Estremi pagamento" nella pagina Fee Config — form causale template (IBAN/intestatario da workspace) | ✅ | 21.5 | modules/club/fees.js | ~8min |
| 21.20 | Anteprima causale: mostra esempio compilato (es. "Iscrizione 2025-26 Rata 2 - Rossi Marco") | ✅ | 21.19 | modules/club/fees.js | ~3min |

#### Fase 6: Archiviazione Stagionale

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 21.21 | Endpoint POST `/api/fees/archivio-ricevute` — genera ZIP con tutte le ricevute della stagione (organizzate per giocatore/quota) + riepilogo CSV | ✅ | 21.6 | routes/fees.js | ~15min |
| 21.22 | Endpoint DELETE `/api/fees/ricevute-stagione` — elimina file da Storage dopo conferma download | ✅ | 21.21 | routes/fees.js | ~5min |
| 21.23 | Frontend: bottone "📦 Archivia ricevute stagione" in pagina Quote (solo admin) — download ZIP + conferma pulizia | ✅ | 21.21 | modules/club/fees.js | ~8min |
| 21.24 | Dopo pulizia: rate con `ricevuta_path` mostrano "📁 Archiviata" invece del link download | ✅ | 21.22 | modules/club/fees.js | ~3min |

#### Fase 7 (Futura): Stripe Connect — Pagamento Online

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 21.25 | Setup Stripe Connect: ogni workspace collega il proprio account Stripe | ⬜ | 21.9 | routes/payments.js (nuovo) | ~15min |
| 21.26 | Endpoint POST `/api/fees/installments/:id/checkout` — crea Stripe Checkout Session (importo + commissione) | ⬜ | 21.25 | routes/payments.js | ~10min |
| 21.27 | Endpoint POST `/api/webhooks/stripe` — webhook payment_intent.succeeded → aggiorna rata automaticamente | ⬜ | 21.26 | routes/payments.js | ~10min |
| 21.28 | Frontend guest: bottone "💳 Paga online" accanto a "📎 Carica ricevuta" — redirect a Stripe | ⬜ | 21.26 | modules/auth/guestGenitore.js | ~5min |
| 21.29 | Frontend admin: badge "💳 Online" vs "🏦 Bonifico" vs "💵 Contanti" nella vista quote | ⬜ | 21.27 | modules/club/fees.js | ~5min |
| 21.30 | Config workspace: sezione Stripe (connect account, test/live mode toggle) | ⬜ | 21.25 | modules/club/settings.js | ~8min |

#### Fase 8: Finalizzazione

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 21.31 | Help in-app: aggiungere helpData per flusso pagamento (guest + segreteria) | ⬜ | 21.18 | components/helpData.js | ~5min |
| 21.32 | Test build completo + syntax check backend | ⬜ | 21.24 | — | ~3min |
| 21.33 | Aggiornare docs (DEVELOPMENT_PLAN, AGENTS.md, DATABASE_SCHEMA) | ⬜ | 21.32 | .agents/ | ~3min |

**Effort totale stimato**: Fase 1-5 (bonifico): ~8-10h | Fase 6 (archiviazione): ~3h | Fase 7 (Stripe): ~5-6h

**Dipendenze esterne**: Fase 7 richiede account Stripe della società + verifica legale/fiscale ASD.

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
EPIC 18 (Refactoring Stagioni) ──→ nessuna dipendenza (refactoring logica esistente)
EPIC 19 (PWA Guest Push) ──→ dipende da EPIC 11 (guest infrastruttura) + EPIC 12 (quote visibili)
EPIC 20 (Tesseramento) ──→ nessuna dipendenza (standalone, usa workspace/player/team esistenti)
EPIC 23 (Player Performance Center) → nessuna dipendenza (usa dati già esistenti: valutazione_partita + match_event)
```

Tutte le Epic sono indipendenti. L'ordine consigliato per impatto/effort:
1. **EPIC 1** (pulizia, 20min) → riduce debito tecnico ✅
2. **EPIC 2** (infortuni, 43min) → feature richiesta dai mister ✅
3. **EPIC 11** (atleta/genitore, ~2h) → evoluzione accesso utenti, alto valore percepito ✅
4. **EPIC 16** (Print Center, ~3h15) → differenziatore commerciale, hub documentale, risolve Android ✅
5. **EPIC 18** (Refactoring Stagioni, ~2h40) → fix architetturale critico ✅
6. **EPIC 23** (Player Performance Center, ~2h38) → decision support per allenatori, differenziatore forte
7. **EPIC 17** (Piano Gara, ~4h15) → differenziatore forte, nessuna app giovanile lo offre
8. **EPIC 15** (PWA offline-first, ~2h) → differenziatore commerciale, campo sportivo
9. **EPIC 14** (Match Center evolution, ~53min) → UX bordo campo
10. **EPIC 3** (visite, 35min) → scadenze mediche = obbligo FIGC
11. **EPIC 4** (anagrafica avversari, ~74min) → base per futuro
12. **EPIC 6** (polish, 33min) → UX
13. **EPIC 9** (workspace hub, ~57min) → gestione superadmin
14. **EPIC 7** (tornei, 37min) → nice-to-have
15. **EPIC 12** (club operations, ~15h) → valore società, post-EPIC 11
16. **EPIC 13** (preseason, ~76min) → utile solo 2-3 settimane/anno
17. **EPIC 20** (Tesseramento, ~3h30) → digitalizzazione processo iscrizione ✅
18. **EPIC 19** (PWA Guest Push, ~8h) → engagement famiglie, post-EPIC 12
19. **EPIC 22** (Refactoring Capabilities, ~1h20) → UX permessi

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
- Il numero EPIC è **progressivo** (prossimo: EPIC 23)
- Inserire SEMPRE in ordine numerico nella sezione "3. Epics & Micro-Task"
- Mai inserire un EPIC tra due esistenti con numero inferiore/superiore (es. non mettere EPIC 19 tra EPIC 4 e EPIC 6)
- Aggiornare la sezione "4. Dipendenze tra Epic" se il nuovo EPIC ha dipendenze

### Aggiungere nuove Epic
- Formato: `EPIC N: Titolo`
- Deve avere: descrizione breve, tabella task, dipendenze
- Aggiornare sezione 4 (dipendenze)
