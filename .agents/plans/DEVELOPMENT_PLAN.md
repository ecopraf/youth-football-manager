# Youth Football Manager — Development Plan

> **Fonte di verità unica** per lo stato del progetto, task, dipendenze e priorità.
> Ultimo aggiornamento: 15 Luglio 2026 | Versione: v3.15 | Commit: 9be406a

---

## 1. Stato Attuale

| Campo | Valore |
|-------|--------|
| Versione | v3.15 |
| Target MVP | 15 Settembre 2026 |
| Frontend | Vite + JS ES Modules → Vercel |
| Backend | Node.js/Express (13 router) → Vercel |
| Database | Supabase PostgreSQL |
| Workspace attivi | SSD New Team, Albalonga, DF Academy |

---

## 2. Moduli — Stato Operativo

| Modulo | Stato | File principali |
|--------|-------|-----------------|
| Auth & Permessi | ✅ | routes/auth.js, modules/auth/ |
| Dashboard | ✅ | modules/team/dashboard.js |
| Rosa (Roster) | ✅ | modules/team/roster.js, routes/player.js |
| Calendario | ✅ | modules/team/calendar.js, routes/match.js |
| Convocazioni | ✅ | modules/team/convocazioni.js |
| Formazione | ✅ | modules/team/formazione.js |
| Distinta | ✅ | modules/team/distinta.js |
| Match Detail | ✅ | modules/team/matchDetail.js |
| Allenamenti | ✅ | modules/coach/training*.js, routes/training.js |
| Statistiche | ✅ | modules/performance/stats.js, routes/statistics.js |
| Report | ✅ | modules/performance/reports.js |
| Import Center | ✅ | modules/import/importCenter.js |
| Staff | ✅ | modules/club/staff.js, routes/staff.js |
| Workspace CRUD | ✅ | modules/admin/workspaces.js |
| Stagioni & Categorie | ✅ | modules/club/seasonsCategories.js |
| Guest View | ✅ | modules/auth/guest.js |
| Help Interattivo | ✅ | components/PageHelp.js, components/helpData.js |
| Loghi Squadre | ✅ | 777+ loghi, wizard GR |
| Gazzetta Regionale | ✅ | routes/gazzettaRegionale.js |
| Tornei | ⏸️ | modules/coach/tournaments.js (disabilitato) |
| Infortuni | ⬜ | Non esiste |
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
| 2.1 | CREATE TABLE `injury` | ⬜ | — | migrazione SQL | ~3min |
| 2.2 | Endpoint CRUD `/api/injuries` (GET team, POST, PUT, DELETE) | ⬜ | 2.1 | routes/player.js o nuovo | ~10min |
| 2.3 | Auto-update `team_player.stato` → "Infortunato" on create | ⬜ | 2.2 | routes/player.js | ~5min |
| 2.4 | Auto-update `team_player.stato` → "Attivo" on rientro | ⬜ | 2.3 | routes/player.js | ~3min |
| 2.5 | Sezione infortuni in playerDetail (lista + form) | ⬜ | 2.2 | modules/team/playerDetail.js | ~10min |
| 2.6 | Widget "Infortunati" in dashboard (nomi + giorni restanti) | ⬜ | 2.2 | modules/team/dashboard.js | ~10min |
| 2.7 | Aggiornare docs | ⬜ | 2.6 | DEVELOPMENT_PLAN.md | ~2min |

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

## 4. Dipendenze tra Epic

```
EPIC 1 (Pulizia DB) ──→ nessuna dipendenza, può partire subito
EPIC 2 (Infortuni) ──→ nessuna dipendenza
EPIC 3 (Visite Mediche) ──→ nessuna dipendenza
EPIC 4 (Opponent) ──→ nessuna dipendenza
EPIC 5 (Import TC3) ──→ nessuna dipendenza
EPIC 6 (Polish) ──→ nessuna dipendenza
EPIC 7 (Tornei) ──→ nessuna dipendenza (codice già pronto)
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
| Comunicazioni | Notifiche in-app | P2 |
| Calendario | Integrazione Google Calendar | P2 |
| Performance | Test fisici (semplificati) | P3 |
| Performance | Piano individuale giocatore | P3 |
| UI | Timeline partita animata | P3 |
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
| (pending) | feat: guest UX — auto-redirect squadra stagione corrente, benvenuto personalizzato, nome atleta in header |
| (pending) | feat: notifiche assenze — campanella sempre visibile, badge nuove/totali settimana, auto-cleanup settimanale |
| (pending) | style: notifiche — layout griglia compatto, animazione segna-letta, spunta verde |
| (pending) | fix: guest logout mostra "Sessione terminata" invece di redirect a login |
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
