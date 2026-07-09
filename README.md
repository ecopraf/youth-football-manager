# Youth Football Manager

La memoria digitale della squadra di calcio giovanile

## 🤖 Per Agenti AI (OpenHands / Agent Canvas)

Questo progetto è ottimizzato per lavorare con agenti AI. Prima di iniziare qualsiasi task, l'agente dovrebbe leggere:

```
.agents/
├── VISION.md           → Missione, valori, target utente
├── ARCHITECTURE.md     → Stack, struttura, API, database
├── ROADMAP.md          → Backlog, priorità, bug noti
├── CODING_STANDARDS.md → Convenzioni codice, naming, git
└── AGENTS.md           → Istruzioni specifiche per agenti
```

**Workflow consigliato**:
1. Leggi `.agents/` per contesto completo
2. Analizza il task e crea un piano
3. Implementa seguendo coding standards
4. Commit con messaggio descrittivo
5. Push → deploy (verificare se automatico o manuale)

---

## Panoramica

Youth Football Manager è un'applicazione web completa per la gestione di squadre di calcio giovanili. Permette di gestire giocatori, partite, statistiche, allenamenti e molto altro.

## Struttura del Progetto

```
youth-football-manager/
├── backend/           # API backend (Node.js/Express) - Vercel
├── frontend-v2/       # Frontend moderno (Vite/JavaScript) - Vercel
├── docs/              # Documenti partnership e manuali
├── landing.html       # Landing page pubblica
├── AGENTS.md          # Linee guida sviluppo (per AI)
└── README.md
```

## Tech Stack

- **Backend**: Node.js, Express, Supabase (PostgreSQL)
- **Frontend**: Vite, JavaScript ES modules
- **Database**: Supabase (PostgreSQL)
- **Auth**: JWT custom + Guest links
- **Deploy**: Vercel

## Link Utili

- **App**: https://youth-football-manager.vercel.app
- **Backend API**: https://youth-football-manager-backend.vercel.app

---

## 🔑 Credenziali Accesso

### Superadmin
| Email | Password |
|-------|----------|
| coppola.raffaele@gmail.com | raffaele78 |

### Utenti Production
| Nome | Ruolo | Email | Password | Workspace |
|------|-------|-------|----------|-----------|
| Matteo Urilli | Allenatore | matteo@urilli.it | mister | DF Academy |
| Francesco Annese | Admin | francesco@annese.it | annex | Albalonga |

---

## 🚀 Setup Locale

### 1. Clonare il Repository

```bash
git clone https://github.com/ecopraf/youth-football-manager.git
cd youth-football-manager
```

### 2. Pull (Aggiornare il codice)

```bash
git pull origin main
```

### 3. Backend (API)

```bash
cd backend
npm install
node api/index.js
# Backend disponibile su http://localhost:3001
```

### 4. Frontend (Sviluppo)

```bash
cd frontend-v2
npm install
npm run dev
# Frontend disponibile su http://localhost:5173
```

---

## 📋 Comandi Git Essenziali

```bash
# Verificare stato repository
git status

# Pull ultimo codice
git pull origin main

# Vedere commit recenti
git log --oneline -5

# Creare branch per modifiche
git checkout -b feature/nome-feature

# Aggiungere e committare modifiche
git add .
git commit -m "descrizione modifiche"

# Push su branch
git push origin nome-branch

# Tornare su main
git checkout main
```

---

## 🛠️ Comandi Build & Deploy

### Build Frontend
```bash
cd frontend-v2
npm run build
# Output: Build ID: v3.16.<counter>
# Output in frontend-v2/dist/
```

### Deploy su Vercel
Il deploy può essere automatico o manuale a seconda delle impostazioni del progetto.

### Verificare Versioni

**Backend**:
```bash
curl https://youth-football-manager-backend.vercel.app/api/health
```

**Frontend**: 
- Apri l'app → Login footer o Sidebar footer → `build: v3.16.<counter>`

---

## 🔢 Sistema Build ID

Il build ID identifica univocamente ogni release: `v3.16.<counter>`

**Formato**: `v<major>.<minor>.<build-number>`

**Auto-bump**: al raggiungimento del build 99, la minor si incrementa automaticamente (es. `v3.16.99` → `v3.17.1`).

---

## 📁 Struttura Frontend

```
frontend-v2/src/
├── main.js            # Entry point
├── router.js          # Routing
├── style.css          # Stili globali
├── services/
│   └── api.js         # Chiamate API
├── modules/
│   ├── auth/          # Login, guest
│   ├── admin/         # Gestione utenti, link guest
│   ├── team/          # Dashboard, roster, calendar, etc.
│   ├── coach/         # Allenamenti
│   ├── performance/   # Stats, reports
│   └── club/          # Impostazioni, workspace
├── utils/
│   ├── formatters.js  # Formattazione date
│   └── ui.js          # Loading spinner
└── components/
    └── layout/        # Sidebar, header
```

## 📁 Struttura Backend

```
backend/api/
├── index.js           # Tutti gli endpoint
├── auth.js            # Autenticazione
├── middleware/        # Auth middleware
└── db/               # Query Supabase
```

---

## 🎨 Design System

### Colori Principali
- Primary: `#667eea`
- Success: `#27AE60`
- Warning: `#F39C12`
- Danger: `#E74C3C`

### Border Radius
- Card: `12px`
- Card gradiente: `16px`
- Bottoni: `10px`
- Input: `8px`

---

## 📝 Convenzioni Commit

```
feat: nuova funzionalità
fix: correzione bug
docs: documentazione
refactor: refactoring codice
style: stili (CSS)
```

Esempio:
```bash
git commit -m "feat: migliora UI dashboard con badge competizione"
```

---

## 🔑 Variabili d'Ambiente (Backend)

### 1. Crea il file `.env`

```bash
cd backend
cp .env.example .env
```

Le credenziali Supabase sono già nel file `.env.example`.

### 2. Avvia il backend

```bash
node api/index.js
```

Il backend sarà disponibile su **http://localhost:3001**

---

## Funzionalità Principali

- ✅ Gestione roster giocatori
- ✅ Import rosa da tabulato XLS FIGC (parsing intelligente cognomi)
- ✅ Import calendario e marcatori da Tuttocampo
- ✅ Calendario partite con archivio
- ✅ Formazioni e convocazioni
- ✅ Statistiche individuali e di squadra
- ✅ Report PDF partita/stagionale
- ✅ Sistema auth con ruoli
- ✅ Link guest temporanei
- ✅ Dashboard con trend ultimi 5 e badge competizione
- ✅ Calendario con pallino lampeggiante per prossimo passo
