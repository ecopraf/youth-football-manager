# Youth Football Manager — Development Plan Archive

> Epic completamente conclusi (tutti i task ✅). Archiviati per alleggerire DEVELOPMENT_PLAN.md.
> **Non modificare** — solo consultazione storica.

---

### EPIC 1: Pulizia DB — Rimuovere ridondanze team
> Completato: 2026
> Le colonne `allenatore_id/dirigente_id/preparatore_id/portieri_id` su `team` sono ridondanti perché esiste `team_staff`.

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 1.1 | DROP colonne staff da tabella `team` | ✅ | — | migrazione SQL | ~3min |
| 1.2 | Rimuovere riferimenti backend (nullify on delete, query) | ✅ | 1.1 | routes/match.js, routes/team.js | ~10min |
| 1.3 | Verificare frontend (distinta, staff widget) usi solo `team_staff` | ✅ | 1.2 | distinta.js, dashboard.js | ~5min |
| 1.4 | Aggiornare DATABASE_SCHEMA.md | ✅ | 1.1 | .agents/knowledge/ | ~3min |

---

### EPIC 2: Modulo Infortuni
> Completato: 2026
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
> Completato: 2026
> Potenziare la gestione certificati medici esistente (`player.data_visita_medica`) con alert intelligenti e warning nelle convocazioni. Nessuna tabella nuova — il campo scadenza su player è sufficiente.

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 3.1 | Dashboard: affinare widget certificati con 3 livelli (>30gg = ok, ≤30gg = giallo, scaduto = rosso) + contatore per livello | ✅ | — | modules/team/dashboard.js, utils/certificati.js | ~5min |
| 3.2 | Convocazioni: badge rosso "⚠️ Cert. scaduto" su giocatori con certificato scaduto + banner riepilogativo | ✅ | — | modules/team/convocazioni.js | ~8min |
| 3.3 | Aggiornare docs | ✅ | 3.2 | DEVELOPMENT_PLAN.md | ~2min |

---

### EPIC 8: Redesign Stagioni & Categorie
> Completato: 2026
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
> Completato: 2026
> Pagina workspace centralizzata con tab Info (modificabile), Stagioni, Utenti.

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 9.1 | Click su card workspace → vista dettaglio con tab (Info, Stagioni, Utenti) | ✅ | — | modules/admin/workspaces.js | ~15min |
| 9.2 | Tab Info: form inline modificabile (nome, contatti, social, facility, logo) | ✅ | 9.1 | modules/admin/workspaces.js | ~10min |
| 9.3 | Tab Stagioni: lista stagioni con team, azioni (crea, migra, attiva) | ✅ | 9.1 | modules/admin/workspaces.js, routes/workspace.js | ~15min |
| 9.4 | Tab Utenti: lista utenti workspace + creazione rapida + modifica ruolo/permessi | ✅ | 9.1 | modules/admin/workspaces.js | ~15min |
| 9.5 | Test build + aggiornare docs | ✅ | 9.4 | DEVELOPMENT_PLAN.md | ~2min |

---

### EPIC 10: Dashboard Personalizzabile
> Completato: 2026
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
> Completato: 2026
> Sostituire il concetto generico di "Guest" con due ruoli distinti (Famiglia e Ospite) con capabilities, home e notifiche differenziate.

#### Fase 1: Tipi e Capabilities (backend)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 11.1 | Definire capabilities Atleta vs Genitore in `capabilities.js` | ✅ | — | utils/capabilities.js, helpers/capabilities.js | ~5min |
| 11.2 | Aggiornare `guest_token.tipo` per supportare `famiglia` e `ospite` | ✅ | 11.1 | routes/auth.js, routes/guestLinks.js | ~5min |
| 11.3 | Differenziare JWT guest: includere `tipo` nelle capabilities check del middleware | ✅ | 11.2 | middleware/auth.js, helpers/capabilities.js | ~5min |
| 11.4 | Endpoint: tipo `famiglia` può POST su `/api/absence-notification` solo per il proprio player_id | ✅ | 11.3 | routes/notification.js | ~5min |
| 11.5 | Test funzionale capabilities famiglia/ospite | ✅ | 11.4 | tmp_test.js | ~5min |

#### Fase 2: Home Atleta (frontend)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 11.6 | Creare `modules/auth/guestAtleta.js` — Home Famiglia | ✅ | 11.3 | modules/auth/guestAtleta.js | ~15min |
| 11.6a | — Widget notifiche + convocazione prossima | ✅ | 11.6 | modules/auth/guestAtleta.js | ~5min |
| 11.6b | — Form "Comunica indisponibilità" (data + motivo) | ✅ | 11.4, 11.6 | modules/auth/guestAtleta.js | ~5min |
| 11.6c | — Sezioni calendario allenamenti + partite + stats personali + classifica | ✅ | 11.6 | modules/auth/guestAtleta.js | ~5min |

#### Fase 3: Home Genitore (frontend)

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 11.7 | Creare `modules/auth/guestGenitore.js` — Home Ospite | ✅ | 11.3 | modules/auth/guestGenitore.js | ~15min |
| 11.7a | — Widget comunicazioni con badge priorità | ✅ | 11.7, 11.9 | modules/auth/guestGenitore.js | ~5min |
| 11.7b | — Sezioni convocazioni figlio + calendario + risultati + classifica | ✅ | 11.7 | modules/auth/guestGenitore.js | ~5min |

#### Fase 4-7

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 11.8 | Router: guest `tipo=famiglia` → guestAtleta, `tipo=ospite` → guestGenitore | ✅ | 11.6, 11.7 | router.js | ~5min |
| 11.9 | ALTER TABLE `notification` ADD `priorita` TEXT DEFAULT 'info' | ✅ | — | migrazione SQL | ~3min |
| 11.10 | Frontend: badge colorato priorità (🔵🟡🔴) nelle liste notifiche | ✅ | 11.9 | modules/team/notifications.js | ~5min |
| 11.11 | ALTER TABLE `notification` ADD `destinatario_tipo TEXT[]` | ✅ | — | migrazione SQL | ~3min |
| 11.12 | UI creazione comunicazione: selezione destinatari | ✅ | 11.11 | modules/team/notifications.js | ~10min |
| 11.13 | Backend: filtro GET notifiche per `destinatario_tipo` | ✅ | 11.11 | routes/notification.js | ~5min |
| 11.14 | Notifiche convocazione differenziate per tipo famiglia/ospite | ✅ | 11.11, 11.2 | routes/convocazioni.js | ~5min |
| 11.15 | Aggiornare UI "Genera Link" — rinominare tipi | ✅ | 11.2 | modules/admin/guestLinks.js | ~5min |
| 11.16 | Test build completo + aggiornare docs | ✅ | 11.15 | DEVELOPMENT_PLAN.md, AGENTS.md | ~5min |

---

### EPIC 12: Club Operations — Fase 1 (Quote + Kit + Checklist)
> Completato: 2026
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

### EPIC 18: Refactoring Stagioni — Rimozione "attiva" e Assegnazione Esplicita
> Completato: 2026
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

### EPIC 16: Print Center (Hub Documentale)
> Completato: 2026
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

### EPIC 20: Modulo Tesseramento Atleti
> Completato: 2026
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

### EPIC 21: Pagamento Quote — Bonifico + Upload Ricevuta ✅
> Completato: 2026
> Fase 1-6 completate. Fase 7 (Stripe) spostata in EPIC 26.

#### Fase 1-6: Completate ✅

| ID | Task | Stato |
|----|------|-------|
| 21.1 | Bucket `ricevute` Supabase Storage | ✅ |
| 21.2 | ALTER fee_config: causale_template | ✅ |
| 21.3 | ALTER fee_installment: ricevuta_path, ricevuta_uploaded_at, conferma_user_id | ✅ |
| 21.4 | DATABASE_SCHEMA.md aggiornato | ✅ |
| 21.5 | PUT /api/fee-config/:id/payment-info | ✅ |
| 21.6 | POST /api/fees/installments/:id/upload-ricevuta | ✅ |
| 21.7 | GET /api/fees/installments/:id/ricevuta (signed URL) | ✅ |
| 21.8 | PUT /api/fees/installments/:id/conferma-pagamento | ✅ |
| 21.9 | GET /api/guest/fees | ✅ |
| 21.10-21.14 | Frontend guest: card quote, dettaglio rata, upload ricevuta, stati visivi | ✅ |
| 21.15-21.18 | Frontend segreteria: notifica, preview, conferma/rifiuta, badge | ✅ |
| 21.19-21.20 | Config bonifico UI segreteria | ✅ |
| 21.21-21.24 | Archiviazione stagionale ZIP+CSV, pulizia Storage, badge Archiviata | ✅ |

---

### EPIC 6: Polish pre-stagione
> Completato: 2026
> Bug fix, UX improvements, preparazione per utenti reali.

| ID | Task | Stato | Dipende da | File | Effort |
|----|------|-------|------------|------|--------|
| 6.1a | Backend: aggiungere endpoint `GET+POST /partite/:id/valutazioni` (legge/scrive su `valutazione_partita`) | ✅ | — | routes/match.js | ~8min |
| 6.1b | Match Center: aggiungere tab "⭐ Valutazioni" (visibile solo se partita Terminata), riusa logica `valutazioni.js` | ✅ | 6.1a | modules/team/matchCenter.js | ~10min |
| 6.1c | Distinta: rimuovere funzione `openValutazioniForm` (dead code, spostata nel MC) | ✅ | 6.1b | modules/team/distinta.js | ~3min |
| 6.1d | Fix valutazioni: gruppi titolari/subentrati, minutaggio categoria, assist, SV corner case, tab mobile emoji+label | ✅ | 6.1b | modules/team/matchCenter.js | ~30min |
| 6.2 | Report presenze allenamenti (stampabile) | ✅ | — | modules/print/printPresenze.js, router.js, printCenter.js | ~10min |
| 6.3 | Import_log: aggiungere `durata_import`, `warnings` | ❌ | — | — | Cancellato: durata mostrata in-UI al momento dell'import (Date.now() diff), nessun valore nel persistirla |
| 6.4 | Document: aggiungere colonna `cartella` | ❌ | — | — | Cancellato: tabella `document` non esiste nell'app, feature mai implementata |

---

### EPIC 24: Inbox Comunicazioni ✅
> Completato: 22 Luglio 2026

> Vista organizzata per admin/segreteria che aggrega tutte le comunicazioni in entrata: risposte convocazioni, notifiche bonifici, avvisi generali. Badge campanellina role-aware (segreteria → inbox, mister → notifications).

| ID | Task | Stato |
|----|------|-------|
| 24.1 | GET /api/inbox — aggrega notification + absence_notification, filtro days/tipo/letto | ✅ |
| 24.2 | PUT /api/inbox/mark-read — segna letti in batch | ✅ |
| 24.3 | PUT /api/inbox/mark-all-read | ✅ |
| 24.4 | Registrare router inbox in index.js | ✅ |
| 24.5 | Pagina inbox.js — tab Tutti/Convocazioni/Bonifici/Avvisi, filtro periodo (7gg/30gg/Tutte), toggle solo non letti | ✅ |
| 24.6 | Card per ogni item con icona tipo, preview, data relativa, badge Nuovo | ✅ |
| 24.7 | Azioni rapide inline: convocazione → openConvocation(riferimento_id, true); bonifico → Conferma/Rifiuta | ✅ |
| 24.8 | Paginazione — carica 20 item, bottone Carica altri | ✅ |
| 24.9 | Archivio messaggi letti collassato | ✅ |
| 24.10 | Filtro squadra — dropdown pre-selezionato su window.YFM.squadraId | ✅ |
| 24.11 | Sidebar voce 📬 Inbox con badge non letti | ✅ |
| 24.12 | Router route inbox | ✅ |
| 24.13 | Campanellina role-aware: segreteria/admin → inbox, mister/staff → notifications | ✅ |
| 24.14 | helpData.js entry inbox | ✅ |
| 24.15 | AGENTS.md aggiornato | ✅ |

**Note**: capability `convocazioni` segreteria → `read` (non `write`). Notifica convocazione pubblicata va a `['segreteria','dirigente']` (rimosso `osservatore`). Backend joina `fee_installment` per stato bonifico (✅ Confermato / ❌ Rifiutato / bottoni se in attesa).

---

### EPIC 25: Raise Ticket — Segnalazione Bug & Supporto ✅
> Completato: 22 Luglio 2026

> Widget flottante FAB ⚡ accessibile da tutte le pagine autenticate per segnalare bug, suggerimenti, domande. Ticket inviato via email con contesto automatico (URL, build, workspace, ruolo, user agent).

| ID | Task | Stato |
|----|------|-------|
| 25.1 | nodemailer installato + configurazione Gmail SMTP in .env | ✅ |
| 25.2 | POST /api/support/ticket — raccoglie contesto + invia email | ✅ |
| 25.3 | Email template HTML con tipo, descrizione, contesto tecnico, screenshot inline | ✅ |
| 25.4 | Registrare router support in index.js | ✅ |
| 25.5 | FAB ⚡ unificato (Guida + Segnala) — position:fixed bottom-right | ✅ |
| 25.6 | Modal ticket — tipo pill (🐛/💡/❓), textarea, upload screenshot | ✅ |
| 25.7 | Paste screenshot da clipboard con preview | ✅ |
| 25.8 | Raccolta contesto automatico (URL, build, workspace, ruolo, userAgent) | ✅ |
| 25.9 | Submit + toast feedback + chiusura automatica | ✅ |
| 25.10 | Rate limit: max 5 ticket/giorno per user_id (DB), superadmin escluso | ✅ |
| 25.11 | initSupportWidget() in main.js dopo login | ✅ |
| 25.12 | Widget nascosto su pagine print | ✅ |
| 25.13 | AGENTS.md aggiornato | ✅ |

---

### EPIC 27: Support Ticket Management ✅
> Completato: 22 Luglio 2026

> Persistenza ticket nel DB + pagina superadmin per gestione con risposta via email e pulizia.

| ID | Task | Stato |
|----|------|-------|
| 27.1 | CREATE TABLE support_ticket + RLS deny anon | ✅ |
| 27.2 | POST /support/ticket aggiornato — salva nel DB + invia email | ✅ |
| 27.3 | GET /support/tickets (solo superadmin) — filtri stato/workspace | ✅ |
| 27.4 | PUT /support/tickets/:id/rispondi — risposta email + chiude ticket | ✅ |
| 27.5 | PUT /support/tickets/:id/stato | ✅ |
| 27.6 | DELETE /support/tickets/:id | ✅ |
| 27.7 | DELETE /support/tickets/chiusi | ✅ |
| 27.8 | Frontend supportTickets.js — lista con filtri, card espandibile | ✅ |
| 27.9 | Dettaglio ticket inline + form risposta | ✅ |
| 27.10 | Azioni: Chiudi, Elimina, Pulisci chiusi (confirm modal) | ✅ |
| 27.11 | Sidebar voce 🎫 Ticket (solo superadmin) + route supportTickets | ✅ |
| 27.12 | helpData.js + docs aggiornati | ✅ |

---

### EPIC 14: Match Center Evolution

> Iniziato: 22 Luglio 2026 | Completato: 23 Luglio 2026

| ID | Task | Stato |
|----|------|-------|
| 14.1 | Layout 2 colonne desktop | ✅ |
| 14.2 | CSS responsive mobile | ✅ |
| 14.3-14.8 | Tab Dettagli + Riorganizzazione tab | ❌ Cancellati |
| 14.9 | Quick Action Rigore (sostituisce Autogol) | ✅ |
| 14.10 | Riordino logico quick actions | ✅ |
| 14.11 | Timeline visuale algoritmo tracks + tooltip fixed | ✅ |
| 14.12 | Build test | ✅ |
| 14.13 | Docs aggiornati | ✅ |

**Risultati**: timeline tracks (sopra=GOAL/SUB/SUBITO, sotto=YELLOW/RED), tooltip position:fixed, punteggio progressivo sui gol, badge RIG/AUT nel card evento, match_event.note per SUBITO = nome avversario, fmtName() uniformata, caricamento ottimizzato Promise.all.

---

### EPIC 29: Demo Mode — Workspace a Tempo

> Iniziato: 17 Luglio 2026 | Completato: 24 Luglio 2026

| ID | Task | Stato |
|----|------|-------|
| 29.1 | Migrazione: `demo_scadenza TIMESTAMPTZ DEFAULT NULL` su `workspace` | ✅ |
| 29.2 | Guard `DEMO_EXPIRED` in `authMiddleware` (superadmin escluso) | ✅ |
| 29.3 | Endpoint `PUT /workspaces/:id/demo` (7/15/30gg o null) | ✅ |
| 29.4 | Intercettazione 403 `DEMO_EXPIRED` in `api.js` → hash `#demo-scaduta` | ✅ |
| 29.5 | Pagina `demoExpired.js` con CTA email+WhatsApp (+39 335 105 1147) | ✅ |
| 29.6 | Pannello superadmin: badge giorni rimanenti + modal gestione demo | ✅ |
| 29.7 | Docs: DATABASE_SCHEMA.md + AGENTS.md | ✅ |
| 29.8 | Banner pre-scadenza: pill floating desktop / toast mobile, icone ✉️ 💬, gradiente 3D, `window._checkDemoBanner` ad ogni navigazione | ✅ |
| 29.9 | Fix modal demo: rilevamento bottone via `data-selected`, date calcolate sotto ogni bottone | ✅ |
| 29.10 | Numero WhatsApp reale in `demoExpired.js` e banner | ✅ |
| 29.11 | Sospensione workspace: colonna `sospeso BOOLEAN`, guard `WORKSPACE_SUSPENDED`, endpoint `PUT /workspaces/:id/sospendi` | ✅ |
| 29.12 | Pagina `workspaceSospeso.js` + intercettazione hash `#sospeso` + route | ✅ |
| 29.13 | Toggle switch sospensione in card workspace (modal custom conferma) | ✅ |

**Risultati**: sistema demo completo con scadenza automatica, banner pre-scadenza responsive, sospensione manuale workspace, pagine dedicate per demo scaduta e workspace sospeso.

---

### EPIC 30: Support Ticket — Priorità Bug

> Iniziato: 23 Luglio 2026 | Completato: 23 Luglio 2026

| ID | Task | Stato |
|----|------|-------|
| 30.1 | Migrazione: `priorita TEXT DEFAULT 'medium'` su `support_ticket` | ✅ |
| 30.2 | Backend: `priorita` in POST/GET ticket | ✅ |
| 30.3 | Frontend form: dropdown priorità in `supportWidget.js` | ✅ |
| 30.4 | Frontend lista superadmin: badge colorato + filtro priorità | ✅ |
| 30.5 | Card ticket in dashboard superadmin con contatori | ✅ |
| 30.6 | Home superadmin dedicata: sidebar minimale, griglia workspace, card ticket | ✅ |

**Risultati**: 4 livelli priorità (low/medium/high/critical), badge colorati, filtro in lista superadmin, card ticket in home superadmin, login superadmin naviga direttamente a pagina Workspace.

---

### EPIC 23: Player Performance Center

> Completato: 2026

| ID | Task | Stato |
|----|------|-------|
| 23.1 | Endpoint `GET /api/squadre/:teamId/performance-summary` | ✅ |
| 23.2 | Endpoint `GET /api/calciatori/:playerId/performance-detail` | ✅ |
| 23.3 | `playerPerformance.js` — struttura pagina Vista Rosa / Vista Giocatore | ✅ |
| 23.4 | Sezione Top Performer con badge trend e sparkline | ✅ |
| 23.5 | Analisi per Reparto con heatmap colorata | ✅ |
| 23.6 | Classifica Rosa ordinata per media voti | ✅ |
| 23.7 | Sezione giocatori senza valutazioni | ✅ |
| 23.8 | Vista dettaglio giocatore con header | ✅ |
| 23.9 | Grafico trend voti (canvas line chart) | ✅ |
| 23.10 | Statistiche aggregate (media, delta, min/max) | ✅ |
| 23.11 | Lista partite valutate con eventi | ✅ |
| 23.12 | Analisi mensile a barre | ✅ |
| 23.13 | Sidebar: voce ⭐ Performance | ✅ |
| 23.14 | Router: route `playerPerformance` | ✅ |
| 23.15 | PlayerDetail: link → Vedi performance | ✅ |
| 23.16 | Dashboard: widget performance_voti | ✅ |
| 23.17 | helpData.js: entry playerPerformance | ✅ |
| 23.18 | Docs aggiornati | ✅ |

**Risultati**: pagina Performance Center completa con vista rosa aggregata (top performer, analisi reparto, classifica, senza valutazioni) e vista giocatore (trend voti, statistiche, lista partite, analisi mensile). Widget `performance_voti` in dashboard.

---
