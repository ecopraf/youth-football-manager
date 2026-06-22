# 1. OBJECTIVE

Implementare le **4 feature ad alta priorità** della roadmap Core 1.x per completare il prodotto minimo vitale:

1. **Auth/Ruoli MVP** - Sistema di autenticazione e gestione ruoli ✅ COMPLETATO
2. **Valutazioni Giocatore** - Valutazioni tecniche per stagione/partita 🔴 Da fare
3. **Reports** - Report partita completo + Report stagionale/giocatore ✅ COMPLETATO
4. **Timeline Partita** - Vista minuto-per-minuto degli eventi 🔴 Da fare

---

# 2. CONTEXT SUMMARY

## Stato Attuale delle Feature

| Feature | Stato | Note |
|---------|-------|------|
| Auth/Ruoli MVP | ✅ COMPLETATO | Login/Register, JWT, middleware, protezione route |
| Reports | ✅ COMPLETATO | Report Partita (con social comment), Report Stagionale (stats, top rankings), Report Giocatore (stats, storico) |
| Timeline Partita | 🔴 Da fare | Lista eventi in matchDetail.js, no visualizzazione timeline |
| Valutazioni Giocatore | 🔴 Da fare | Nessun riferimento nel codebase |

## Componenti Chiave
- **Backend**: `backend/api/index.js` (Node.js + Express + Supabase)
- **Frontend**: `frontend-v2/src/` (Vite + JS vanilla)
- **Database**: Supabase (PostgreSQL) - tabelle esistenti: `calciatore`, `partita`, `evento_partita`, etc.
- **Routing**: `frontend-v2/src/router.js` → `window.YFM.navigateTo()`

## Dipendenze Tra Feature
```
Auth/Ruoli MVP (1) ✅ COMPLETATO
    ↓
Reports (3) ✅ COMPLETATO
    ↓
Valutazioni Giocatore (2) ← dipende da auth per report individuali
    ↓
Timeline Partita (4) ← indipendente, ma utilizza eventi esistenti
```

## Ultimo Rilascio Stabile (v3.10)
- **Auth MVP**: Login, Register, JWT, middleware, protezione route
- **Report Partita**: Con social comment per social media
- **Report Stagionale**: Stats aggregate, Punti, DR, Top Marcatori/Assist/Presenze
- **Report Giocatore**: Stats individuali, Minuti giocati, Storico eventi

---

# 3. APPROACH OVERVIEW

## Strategia: Implementazione Sequenziale

Implementazione partendo dalle dipendenze fondamentali:

1. **Auth/Ruoli MVP** ✅ COMPLETATO - Base per sicurezza e autorizzazione
2. **Reports** ✅ COMPLETATO - Espansione da MVP a completo
3. **Valutazioni Giocatore** 🔄 PROSSIMO - Feature richiesta per report individuali
4. **Timeline Partita** 🔴 Da fare - UI migliorata per visualizzazione eventi

## Alternativa Considerata
Implementazione parallela: **Scartata** per rischio di conflitti e difficoltà di testing.

## Stack Tecnico per Nuove Feature
- **Auth**: JWT con Supabase Auth (o sessioni custom)
- **Valutazioni**: Nuova tabella `valutazione_giocatore` + API CRUD
- **Reports**: jsPDF per PDF, evoluzione UI esistente
- **Timeline**: CSS animato + dati evento_partita esistenti

---

# 4. IMPLEMENTATION STEPS

## FASE 1: Auth/Ruoli MVP ✅ COMPLETATO

### Step 1.1 - Schema Database Auth ✅
**Goal:** Creare tabelle per utenti e ruoli

**Method:**
1. Creare tabella `utente` con campi: `id`, `email`, `password_hash`, `nome`, `cognome`, `ruolo` (enum: 'admin', 'allenatore', 'staff'), `workspace_id`, `created_at`
2. Creare tabella `sessione` per token refresh: `id`, `utente_id`, `token`, `scadenza`

**Reference:** `backend/api/index.js`, Supabase schema

---

### Step 1.2 - API Auth Backend ✅
**Goal:** Endpoint per login/logout/registrazione

**Method:**
1. `POST /api/auth/register` - Registrazione nuovo utente
2. `POST /api/auth/login` - Login con email/password, ritorna JWT
3. `POST /api/auth/logout` - Invalida sessione
4. `GET /api/auth/me` - Ritorna utente corrente
5. `PUT /api/auth/profile` - Aggiorna profilo

**Reference:** `backend/api/index.js`

---

### Step 1.3 - Middleware Auth ✅
**Goal:** Proteggere endpoint con JWT

**Method:**
1. Creare middleware `authMiddleware` che valida JWT
2. Aggiungere ruolo utente a `req.user`
3. Applicare a tutti gli endpoint esistenti (per ora opzionale)

**Reference:** `backend/api/index.js`

---

### Step 1.4 - UI Login ✅
**Goal:** Schermata di login

**Method:**
1. Creare `frontend-v2/src/modules/auth/login.js`
2. Aggiungere rotta `/login` nel router
3. Salvare token in localStorage
4. Reindirizzare a dashboard dopo login

**Reference:** `frontend-v2/src/router.js`, `frontend-v2/src/modules/auth/`

---

### Step 1.5 - Protezione Route ✅
**Goal:** Bloccare accesso senza auth

**Method:**
1. Aggiungere check `window.YFM.isAuthenticated()` in router
2. Redirect a login se non autenticato
3. Mostrare/nascondere elementi UI basati su ruolo

**Reference:** `frontend-v2/src/router.js`

---

## FASE 2: Reports Completo ✅ COMPLETATO

### Step 2.1 - Report Partita ✅
**Goal:** Generare report partita con stats e formazione

**Method:**
1. Creare endpoint `GET /api/partite/:partitaId/report`
2. Includere: formazione, eventi, marcatori, ammonizioni
3. Aggiungere Commento Social per social media
4. UI con tabs in `reports.js`

**Reference:** `backend/api/index.js`, `frontend-v2/src/modules/performance/reports.js`

---

### Step 2.2 - Report Stagionale ✅
**Goal:** Generare report aggregato stagione

**Method:**
1. Creare endpoint `GET /api/squadre/:squadraId/report-stagionale`
2. Aggregare: partite giocate, vittorie/pareggi/sconfitte, gol fatti/subiti, Punti, DR
3. Top 3 Marcatori, Top 3 Assist, Top 3 Presenze
4. Lista risultati stagionali
5. Integrare in UI con tabs

**Reference:** `backend/api/index.js`, `frontend-v2/src/modules/performance/reports.js`

---

### Step 2.3 - Report Giocatore ✅
**Goal:** Report individuale giocatore

**Method:**
1. Creare endpoint `GET /api/calciatori/:id/report`
2. Includere: stats individuali (partite, gol, assist, ammonizioni, espulsioni)
3. Minuti giocati (calcolati)
4. Storico eventi per partita
5. Giocatori ordinati alfabeticamente

**Reference:** `backend/api/index.js`, `frontend-v2/src/modules/performance/reports.js`

---

### Step 2.4 - Export PDF/CSV 🔴 Da fare
**Goal:** Download report in formato PDF

**Method:**
1. Implementare stampa PDF native del browser
2. Escludere sezioni non necessarie (es. commento social)

**Reference:** `frontend-v2/src/modules/performance/reports.js`

---

## FASE 3: Valutazioni Giocatore 🔴 DA FARE

### Step 3.1 - Schema Database Valutazioni
**Goal:** Creare tabella per valutazioni

**Method:**
1. Creare tabella `valutazione_giocatore`: `id`, `calciatore_id`, `stagione_id`, `partita_id` (nullable), `voto` (1-10), `note`, `categoria` (tecnica, condizione, comportamento), `data_valutazione`, `valutatore_id`
2. Aggiungere FK e indici

**Reference:** Supabase schema

---

### Step 3.2 - API Valutazioni Backend
**Goal:** CRUD per valutazioni

**Method:**
1. `GET /api/squadre/:squadraId/valutazioni` - Lista valutazioni squadra
2. `GET /api/calciatori/:id/valutazioni` - Valutazioni singolo giocatore
3. `POST /api/valutazioni` - Crea valutazione
4. `PUT /api/valutazioni/:id` - Modifica valutazione
5. `DELETE /api/valutazioni/:id` - Elimina valutazione

**Reference:** `backend/api/index.js`

---

### Step 3.3 - UI Scheda Giocatore con Valutazioni
**Goal:** Integrare valutazioni nella scheda giocatore esistente

**Method:**
1. Estendere `frontend-v2/src/modules/team/playerDetail.js`
2. Aggiungere sezione "Valutazioni" con grafico storico
3. Aggiungere form per nuova valutazione post-partita

**Reference:** `frontend-v2/src/modules/team/playerDetail.js`

---

### Step 3.4 - UI Lista Valutazioni Stagione
**Goal:** Vista aggregate delle valutazioni

**Method:**
1. Creare `frontend-v2/src/modules/coach/valutazioni.js`
2. Mostrare media voti per giocatore
3. Filtri per data/partita/categoria

**Reference:** `frontend-v2/src/modules/coach/valutazioni.js`

---

## FASE 4: Timeline Partita 🔴 DA FARE

### Step 4.1 - UI Timeline in Match Detail
**Goal:** Visualizzazione timeline minuto-per-minuto

**Method:**
1. Estendere `frontend-v2/src/modules/team/matchDetail.js`
2. Creare componente timeline verticale con icone animate
3. Raggruppare eventi per minuto con icone multiple

**Reference:** `frontend-v2/src/modules/team/matchDetail.js`

---

### Step 4.2 - Timeline Expandibile
**Goal:** Dettagli evento espandibili

**Method:**
1. Click su evento → espande con dettagli aggiuntivi
2. Mostrare formazione al momento del minuto
3. Highlight giocatore coinvolto

**Reference:** `frontend-v2/src/modules/team/matchDetail.js`

---

### Step 4.3 - Mini Timeline nel Calendario
**Goal:** Preview eventi nella lista partite

**Method:**
1. In `calendar.js`, aggiungere colonna con icone eventi principali
2. Click → apre match detail con timeline

**Reference:** `frontend-v2/src/modules/team/calendar.js`

---

### Step 4.4 - Timeline Animata
**Goal:** Animazione progressiva caricamento timeline

**Method:**
1. Aggiungere CSS animations per fade-in eventi
2. Scroll animation per caricamento progressivo
3. Color coding per tipo evento

**Reference:** `frontend-v2/src/style.css`

---

# 5. TESTING AND VALIDATION

## Criteri di Successo

### Auth/Ruoli MVP ✅
- [x] Login con credenziali valide → redirect a dashboard
- [x] Login con credenziali invalide → messaggio errore
- [x] Logout → clear token, redirect a login
- [x] Accesso a route protetta senza auth → redirect a login
- [ ] Ruolo admin vs allenatore → visibilità menu diversa (da completare)

### Reports ✅
- [x] Report Partita → genera correttamente con tutti i dati
- [x] Report Partita → Commento Social per social media
- [x] Report Partita → Social comment escluso dalla stampa
- [x] Report Stagionale → stats aggregate, Punti, DR
- [x] Report Stagionale → Top 3 Marcatori/Assist/Presenze
- [x] Report Giocatore → stats individuali complete
- [x] Report Giocatore → Minuti giocati
- [x] Report Giocatore → ordinamento alfabetico
- [ ] Export PDF → download file valido (stampa browser funziona)

### Valutazioni Giocatore 🔴
- [ ] Creazione valutazione → salvata in DB, visibile in scheda
- [ ] Modifica valutazione → aggiornamento immediato
- [ ] Media voti calcolata correttamente
- [ ] Filtri funzionano (data, partita, categoria)

### Timeline Partita 🔴
- [ ] Timeline visibile in match detail
- [ ] Eventi ordinati per minuto crescente
- [ ] Icone corrette per tipo evento
- [ ] Click espande dettagli evento
- [ ] Responsive mobile

## Checklist Pre-Deploy
- [ ] Tutti gli endpoint testati con Postman/curl
- [ ] UI testata su Chrome, Firefox, Safari
- [ ] Mobile responsive verificato
- [ ] Errori backend gestiti con messaggi utente
- [ ] Loading states visibili durante chiamate API
- [ ] Documentazione API aggiornata
