# Youth Football Manager - Roadmap

## Stato Sviluppo

**Versione Attuale**: v3.15
**Target MVP**: Fine Settembre 2026

---

## Fasi di Sviluppo

### FASE 1 ✅ COMPLETATA
**Sistema Auth/Ruoli/Permessi**
- [x] Login con JWT
- [x] Registrazione utenti (solo admin)
- [x] Ruoli: admin, allenatore, staff, guest
- [x] Gestione utenti (CRUD)
- [x] Link guest temporanei con JWT guest
- [x] Multi-workspace isolation
- [x] Permessi granulari per staff (campo `permessi` JSONB su users)
- [x] `squadre_accesso` per limitare visibilità squadre
- [x] Tutti i GET protetti con authMiddleware
- [x] Role-check su tutti gli endpoint di scrittura (requirePermission)
- [x] Guest view: sidebar ridotta, solo lettura, no dati sensibili
- [x] Guard frontend su pagine admin (settings, users, guestLinks)

### FASE 2 📋 IN CORSO
**Import Dati**
- [x] Import CSV base (struttura)
- [x] Import PDF calendario SGS/LND (parser 3 colonne, campi da gioco, multi-categoria)
- [x] Cancella calendario (elimina tutte le partite di una squadra in batch)
- [x] Import Tuttocampo - Fase 1 (scraping calendario + risultati)
- [x] Import Tuttocampo - Fase 2: Marcatori da AJAX
  - Estrazione marcatori da `<ul class="scorers"><a title="Cognome Nome">` nell'AJAX ResultsView.php
  - Checkbox "Importa marcatori" nel modal Tuttocampo
  - Preview con colonna ⚽ (conteggio gol per partita)
  - Fuzzy match cognome vs rosa team_player al momento del confirm
  - Solo eventi con player_id matchato vengono salvati
  - Formato display: "Cognome N." (es. Pannone M.)
- [x] Import Tuttocampo - Fase 2b: Formazioni da AJAX
  - Endpoint `POST /Web/Views/MatchFormations/MatchFormations.php?tckk=<tckk>` con body `match_id=<SHORT_ID>&category_id=<roundID>`
  - Parsing titolari, riserve, modulo, sostituzioni (con minuto), gol
  - Fuzzy match cognome vs rosa team_player
  - Crea convocations + match_formations + match_events (GOAL, SUBSTITUTION)
  - Checkbox "Importa formazioni" nel modal Tuttocampo
  - Batch import per partite già in DB (`POST /api/import-formations-batch`)
- [x] Import Rosa da XLS (tabulato FIGC)
  - Upload file .xlsx dalla pagina Rosa (bottone "📥 Importa XLS")
  - Parsing intelligente cognome/nome tramite codice fiscale (gestisce DE, DI, DELLA, etc.)
  - Raggruppamento automatico per anno di nascita con suggerimento categoria
  - Admin sceglie categoria target, allenatore importa nella sua
  - Deduplicazione: skip se cognome+nome+data_nascita già esiste
  - Crea player + team_player in batch
  - Sezione "⚠️ Ruolo non assegnato" per giocatori importati senza ruolo
- [x] Import Center (pagina centralizzata)
  - Pagina dedicata con 6 card: PDF, Testo, Tuttocampo, XLS, Rosa TC, Formazioni TC
  - Sezione Gazzetta Regionale con 4 card: Config wizard, Calendario, Loghi, Preview
  - Parser testo calendario SGS (copia-incolla o upload .txt) — stesso parser del PDF
  - Import formazioni batch (seleziona partite con tc_match_url senza formazione)
  - Log storico importazioni in DB (tabella `import_log`)
  - Voce sidebar "📥 Import Center" tra Calendario e Coach
- [x] Integrazione Gazzetta Regionale
  - API pubblica JSON `v2.apiweb.gazzettaregionale.it` (no IP blocking)
  - Wizard configurazione 3 step: Campionato → Girone → Preview classifica
  - Import calendario con fuzzy matching (nomi abbreviati GR vs nomi FIGC)
  - Due modalità: "Importa calendario + risultati" / "Aggiorna solo Risultati (match esistenti)"
  - Import loghi da GR (preview griglia prima dell'import)
  - Preview classifica + marcatori (tabelle side-by-side compatte)
  - Dashboard widget classifica con evidenziazione squadra
  - Colonna `classifica_url` su tabella `team` per configurazione GR
  - Backend: helper `gazzettaRegionale.js` + router con 10+ endpoint
  - Frontend: sezione dedicata in Import Center
- [x] Loghi Squadre da Tuttocampo
  - Scraping automatico loghi durante import calendario TC (checkbox "Importa loghi")
  - Download PNG da CDN b2-content.tuttocampo.it e salvataggio in `frontend-v2/public/logos/`
  - Tabella DB `team_logo` (nome, nome_normalizzato, logo_path, tc_team_id)
  - Matching fuzzy avversario → logo (gestisce acronimi: sa.ma.gor → samagor, l.v.p.a → lvpa)
  - `stripAccents()` per normalizzazione accenti (città→citta) nel matching
  - Logo mostrato in: dashboard, calendario, dettaglio partita, convocazioni, distinta
  - Logo workspace associato a ciascun workspace (colonna `logo_url` su tabella `workspace`)
  - Convocazioni: layout 3 colonne (logo ws sx, titolo centro, logo LND dx) come PDF ufficiale
  - Dettaglio partita: `[logo] NomeSquadra vs [logo] Avversario`
  - Distinta: loghi ingranditi (80px)
  - Header app: logo workspace 40px
  - Script manuale: `backend/scripts/scrape-logos.js <url-classifica-tc>`
- [x] Normalizzazione accenti import PDF SGS
  - `ACCENT_MAP` in `pdfCalendarioParser.js` e `importUtils.js`: "Citta" → "Città", "Universita" → "Università"
  - Applicata in `normalizeTeamName()` dopo Title Case
- [x] Cloudflare Worker proxy per Tuttocampo
  - Worker deployato su `tc-proxy.yfm-proxy.workers.dev` (free tier 100K req/giorno)
  - Backend usa proxy quando `PROXY_TC_URL` è configurato (env var su Vercel)
  - **NOTA**: TC blocca anche IP Cloudflare Workers — il proxy non risolve il problema
  - In locale: connessione diretta (IP residenziale, funziona sempre)
  - In produzione: fallback manuale (copia/incolla testo dalla pagina TC)
- [x] Fallback manuale import rosa Tuttocampo
  - Quando scraping automatico fallisce, mostra box con istruzioni
  - L'utente apre la pagina TC → seleziona tabella → copia → incolla
  - Supporta sia HTML (Ctrl+U) che testo semplice (selezione visibile)
  - Endpoint `POST /api/roster/parse-html-tuttocampo` (HTML)
  - Endpoint `POST /api/roster/parse-text-tuttocampo` (testo copiato)
  - Parsing intelligente: rileva date DD-MM-YYYY e ruoli POR/DIF/CEN/ATT
- [ ] Import Tuttocampo - Fase 3: Archiviazione automatica
  - Partite con risultato importate → archiviata=true automatico
  - Gestione conflitti: se partita già esiste (stesso avversario+giornata) → skip o aggiorna
- [ ] Import CSV avanzato (campi FIGC completi)

### FASE 3 📋 TODO
**Dashboard e Analytics**
- [ ] Dashboard coach con insights
- [ ] Statistiche avanzate (xG, passaggi, etc.)
- [ ] Confronto giocatori
- [ ] Trend stagionali

### FASE 4 📋 TODO
**Polish e Launch**
- [ ] Test end-to-end completi
- [ ] Ottimizzazione performance
- [ ] Documentazione utente
- [ ] Video tutorial

---

## Backlog Funzionalità

### Alta Priorità (P1)

#### Gestione Giocatori
- [x] Validazione anno nascita per categoria (anno_da ≤ nascita ≤ anno_da+2)
- [x] Normalizzazione nomi (capitalize, trim spazi multipli)
- [x] Svincolo giocatori con preservazione storico
- [x] Riattivazione giocatori svincolati
- [x] Aggregazione da categorie inferiori (badge AGG, filtro dedicato)
- [x] Recupera svincolati da tutto il workspace (cross-stagione)
- [x] Creazione giocatore con stessa UI di modifica (playerDetail)
- [x] Custom alert modale (titolo "Youth Football Manager")
- [x] Endpoint DELETE giocatore dalla rosa
- [ ] Scheda giocatore avanzata con foto
- [ ] Storico presenze/assenze
- [ ] Note allenatore personali
- [ ] Allegati (certificati medici, etc.)

#### Calendario Partite
- [ ] Integrazione Google Calendar
- [ ] Notifiche push per partite
- [ ] Previsioni meteo per giorno partita
- [ ] Statistiche testa-a-testa con avversari

#### Report e Documenti
- [ ] Report presenze allenamenti
- [ ] Distinta FIGC in formato ufficiale
- [ ] Elenco rosa stampabile
- [ ] Certificato trasferta

### Media Priorità (P2)

#### Comunicazioni
- [ ] Notifiche in-app
- [ ] Email per convocazioni (SendGrid?)
- [ ] Broadcast ai genitori
- [ ] Bacheca annunci

#### Performance
- [ ] Tracking fitness giocatori
- [ ] Questionari pre/post partita
- [ ] Analisi video (integrazione)
- [ ] Statistiche Avanzate (xG, heatmaps)

### Bassa Priorità (P3)

#### Funzionalità Extra
- [ ] Gamification (badge, achievement)
- [ ] Integrazione social
- [ ] App mobile nativa
- [ ] Integrazione pagamenti (quando necessario)

---

## Bug Noti

### Critici
- Nessuno

### Risolti (Luglio 2026 - Reports & Workspace)
- [x] 3 endpoint report completamente mancanti dal backend → creati in statistics.js
- [x] Report Partita: usa FK allenatore_id/dirigente_id → staff join, fallback convocazioni quando formazione assente
- [x] Report Stagionale: stats complete con top players e match list raggruppata per competizione
- [x] Report Giocatore: stats ed event history across all teams
- [x] Fix display duplicato nomi (cognome || nome → solo cognome) nel frontend reports
- [x] Fix typo "PORTA INVOLATA" → "PORTA INVIOLATA" nel commento social
- [x] FK constraint error su DELETE staff → nullify allenatore_id/dirigente_id/preparatore_id/portieri_id + convocato_da
- [x] Staff page usava JWT workspace_id → corretto con activeWorkspaceId per superadmin
- [x] Dashboard staff widget: solo `ruolo === 'dirigente'` (esatto), rimosso Giannini (ruolo societario) da team_staff
- [x] Allenatore bloccato su pagina staff → aggiunto isAllenatore in canWrite check
- [x] Allenatore vedeva staff di altre categorie → filtro con categorie_accesso

### Risolti (Luglio 2026)
- [x] Endpoint senza authMiddleware (partite, calciatori) → protetti
- [x] 30+ GET endpoint ora richiedono authMiddleware
- [x] Rimosso /api/workspaces pubblico (solo /api/auth/workspaces autenticato)
- [x] Sistema permessi granulari: hasPermission + hasSquadraAccess + requirePermission
- [x] Role-check su POST/PUT/DELETE (rosa, partite, formazione, allenamenti)
- [x] Guest JWT: /api/guest/:token restituisce JWT limitato (24h, solo lettura)
- [x] Guest view frontend: sidebar ridotta, whitelist pagine, no playerDetail
- [x] Login response arricchita: squadre_accesso, ruoli, permessi
- [x] Colonna `permessi` JSONB aggiunta su tabella users
- [x] UI admin: sezione permessi granulari per staff (6 moduli × 3 livelli)
- [x] Filtro squadre_accesso nel dropdown frontend
- [x] Guard isAdmin() su settings.js
- [x] Statistiche calcolate con stima → calcolo reale da gol_casa/gol_ospite
- [x] Training usa tabelle inesistenti → allineato a training + training_attendance + training_config
- [x] guest_link inesistente → allineato a guest_token
- [x] formazione_partita inesistente → allineato a match_formation
- [x] convocation usa player_id → corretto in team_player_id (con mapping calciatoreId)
- [x] formatTime non gestisce ISO datetime → fix
- [x] Mismatch snake_case/camelCase (presenze, scadenze, numero_maglia) → fix
- [x] 15+ endpoint mancanti nel backend → aggiunti
- [x] Pagina login con riferimenti demo → rimossi, stile rinnovato
- [x] Calendario restyling completo (progress dots, card cliccabili, mobile toggle, LIVE)
- [x] Formazione: campo visuale con drag&drop, 8 moduli, posizioni custom persistenti (formazione_meta JSONB)
- [x] Formazione mobile: tap-to-place + free-move + slot suggeriti per ruolo
- [x] Formazione desktop: role hints durante drag + vincolo portiere
- [x] Distinta: fallback convocati, staff con dropdown selezione + dati completi
- [x] Allenamenti: split in 3 sotto-pagine (Sedute, Presenze, Impostazioni)
- [x] Allenamenti: calendario mostra partite, presenze batch, template DB con card compatte
- [x] Statistiche: 5 widget, alert diffidati, tabella con sorting, badge ruolo, minutaggio per categoria
- [x] Performance: batch convocazioni, eventi, presenze (1 fetch invece di N)
- [x] Build-info: counter incrementale v3.15.N
- [x] Data oggi: fix UTC vs locale nel calendario
- [x] Help contestuale: bottone ? con guida per ogni pagina
- [x] Guest view migliorata: dashboard semplificata (solo prossima partita + widget + risultati), calendario guest (solo partite giocate + prossima)
- [x] Guest sidebar: "Le mie Stats" → "Statistiche", icona staff 👥 → 👔
- [x] Login flow fix: workspace selector per superadmin, layout costruito prima del data loading
- [x] Workspace switcher: dropdown select nella sidebar per superadmin (rimosso modal)
- [x] Import rosa Tuttocampo: fix URL, token, ruolo, en-dash
- [x] PDF Import calendario: regex fix per formato Elite/Eccellenza
- [x] Facility (Campo di Casa): settings, convocazioni, distinta con indirizzo
- [x] Staff: aggiunti ruoli "Direttore Sportivo" e "Osservatore"
- [x] PDF Import calendario SGS/LND: parser 3 colonne, estrazione campi da gioco, multi-categoria/girone
- [x] Cancella calendario: elimina tutte le partite + eventi/formazioni/convocazioni associate
- [x] Fix guest token category/workspace: team ACP Annex category_id corretto
- [x] Fix guestLinks.js: superadmin carica categorie da tutti i workspace
- [x] Import rosa Tuttocampo: fix doppio /api/api/, token key, window.currentTeamId, ruolo_principale/ruolo_preferito, en-dash in input number
- [x] PDF calendario regex: supporto formato Elite "UNDER XX REG. ECCELLENZA MASCH" oltre a Regionali
- [x] Facility (Campo di Casa): tabella facility con workspace_id/is_default, endpoint GET/PUT, UI settings, convocazioni e distinta mostrano indirizzo
- [x] Workspace switcher semplificato: rimosso modal iniziale, rimosso switcher sidebar complesso, sostituito con <select> nella sidebar per superadmin
- [x] Fix duplicate event listener su #squadraSelect (onchange invece di addEventListener)
- [x] Import Tuttocampo Formazioni: scraping formazioni da MatchFormations.php, fuzzy match, batch import
- [x] Import Center: pagina centralizzata con 6 card, parser testo, batch formazioni, log storico DB
- [x] Dashboard risultati casa/trasferta: layout corretto con nome società + logo workspace + logo avversario, score centrato
- [x] Match Detail: in trasferta mostra Avversario vs NomeSquadra con score invertito
- [x] Classifica GR: fix penalità (-N) rimossa dal nome, mostrata come badge rosso separato
- [x] Ultima giornata GR: widget dashboard con loghi da classifica, fuzzy match, evidenziazione squadra
- [x] Sidebar riordinata: Dashboard → Team → Performance → Coach → Club → Admin
- [x] Calendario GR navigabile in dashboard: frecce ◀▶ per scorrere tutte le giornate, solo visualizzazione (no import)
- [x] Top Marcatori in dashboard: colonne side-by-side Regionali (top 10 assoluti) e Girone (filtrati per squadre del girone)
- [x] Staff spostato sotto Ultimi Risultati (desktop), in fondo alla dashboard (mobile)
- [x] Workspace CRUD completo per superadmin (create/edit/delete con cascade, auto-logo fuzzy match, TC paste parser)
- [x] Staff TC paste import (parsing tab-separated, duplicate detection, batch import)
- [x] Disaggrega giocatori (rimuovi aggregazione con bottone ✕ su badge AGG)
- [x] Fix filtro roster per sezione gridNoRole
- [x] Report endpoints backend (3 nuovi: partita, stagionale, giocatore) con fallback convocazioni
- [x] Fix typo commento social "PORTA INVIOLATA"
- [x] Dashboard marcatori labels: "REGIONALI" → "GENERALE", "GIRONE" → "GIRONE X"
- [x] Staff workspace isolation: usa activeWorkspaceId (non JWT workspace_id) per superadmin
- [x] Staff page separata in Staff Tecnico + Organigramma Societario (admin only)
- [x] Allenatore accede a Staff Tecnico (filtrato per categorie_accesso)
- [x] Pagina Stagioni & Categorie per admin (CRUD stagioni, categorie, creazione team)
- [x] Contatori giocatori/staff nelle card team della pagina Stagioni

### Minori
- [ ] Valutazioni giocatore: sistema incompleto
- [x] ~~Filtro categorie: staff vede tutte le squadre~~ → risolto con squadre_accesso
- [x] ~~Workspace isolation non completo su tutti gli endpoint GET~~ → tutti i GET protetti

---

## Technical Debt

### Refactoring Suggeriti
- [x] Modularizzare backend: index.js monolite → 13 router modulari (~130 righe index.js)
- [ ] Estrarre API client in modulo separato
- [ ] Centralizzare gestione errori API
- [ ] Sostituire window.YFM con stato react/query
- [ ] Aggiungere TypeScript gradualmente

### Test
- [ ] Setup CI/CD con test
- [ ] Test E2E con Playwright
- [ ] Test API con Supertest

---

## Note Deploy

### Quando rilasciare nuove versioni
1. Feature completata e testata localmente
2. Build ID generato correttamente
3. Messaggio commit descrittivo
4. Push su main → deploy automatico

### Rollback
Se un deploy causa problemi:
1. Identifica commit funzionante
2. `git revert <commit-hash>`
3. Push → nuovo deploy

---

## Metriche Obiettivo 2026

| Metrica | Target |
|---------|--------|
| Società paganti | 15-30 |
| Giocatori gestiti | 500+ |
| Partite/mese | 100+ |
| uptime | 99.5% |
