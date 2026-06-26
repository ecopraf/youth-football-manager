# Youth Football Manager

La memoria digitale della squadra di calcio giovanile

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
- **Landing**: https://youth-football-manager.vercel.app (root)
- **Backend API**: https://youth-football-manager-backend.vercel.app
- **Demo**: https://youth-football-manager.vercel.app/login?demo_email=demo_yfm&demo_password=demo_yfm&auto_login=1

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

### 5. Accedere all'App Locale

1. Apri http://localhost:5173
2. Usa le credenziali demo o registrati

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

### Frontend Build (produzione)
```bash
cd frontend-v2
npm run build
# Output in frontend-v2/dist/
```

### Preview build locale
```bash
npm run preview
```

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
│   ├── admin/         # Gestione utenti
│   ├── team/          # Dashboard, roster, calendar, etc.
│   ├── coach/         # Allenamenti
│   ├── performance/   # Stats, reports
│   ├── demo/          # Sistema demo (tooltip, highlight)
│   └── club/          # Impostazioni
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

### Effetti
- Hover lift: `transform: translateY(-8px)`
- Box shadow hover: `0 15px 30px rgba(0,0,0,0.2)`

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
git commit -m "fix: correggi tooltip sidebar in demo mode"
```

---

## 🔑 Variabili d'Ambiente (Backend)

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-anon-key
JWT_SECRET=your-secret
PORT=3001
```

---

## Funzionalità Principali

- ✅ Gestione roster giocatori
- ✅ Calendario partite con archivio
- ✅ Formazioni e convocazioni
- ✅ Statistiche individuali e di squadra
- ✅ Report PDF partita/stagionale
- ✅ Sistema auth con ruoli
- ✅ Link guest temporanei
- ✅ Demo mode con tooltip guidati
- ✅ Dashboard con top players
