# Youth Football Manager - Architecture

## Panoramica Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                 │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐    │
│   │   Landing    │    │    App      │    │   Backend API   │    │
│   │  (Static)   │    │  (Vite/JS)  │    │   (Express)     │    │
│   └─────────────┘    └──────┬──────┘    └────────┬────────┘    │
└─────────────────────────────┼────────────────────┼──────────────┘
                              │                    │
                              │   REST API         │
                              └────────┬───────────┘
                                       │
                              ┌────────▼────────┐
                              │    SUPABASE     │
                              │   (PostgreSQL)  │
                              └─────────────────┘
```

## Stack Tecnologico

### Frontend
- **Framework**: Vite 6.x + JavaScript ES Modules
- **Styling**: CSS custom (no Tailwind)
- **Routing**: Router custom in `router.js`
- **State**: Window globals (`window.YFM.*`)
- **Deploy**: Vercel (static hosting)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Auth**: JWT custom + Guest tokens
- **Deploy**: Vercel Serverless Functions

### Database
- **Provider**: Supabase (PostgreSQL)
- **Convenzione naming**: Tabelle in EN, Colonne in IT
- **Auth Tables**: `users`, `guest_token`
- **Business Tables**: `player`, `team`, `season`, `match`, etc.

> ⚠️ Schema aggiornato a v2.0 (Giugno 2026): tabelle in inglese, colonne in italiano

## Struttura Repository

```
youth-football-manager/
├── frontend-v2/              # Frontend Vite
│   ├── src/
│   │   ├── main.js           # Entry point
│   │   ├── router.js         # Routing
│   │   ├── style.css         # Stili globali
│   │   ├── build-info.js     # Auto-generato (non tracciare)
│   │   ├── services/
│   │   │   └── api.js        # API_BASE + apiFetch
│   │   ├── modules/          # Pagine/applicazioni
│   │   │   ├── auth/         # Login, Guest
│   │   │   ├── admin/        # Users, Guest Links
│   │   │   ├── team/         # Dashboard, Roster, Calendar, etc.
│   │   │   ├── coach/        # Training
│   │   │   ├── performance/  # Stats, Reports
│   │   │   └── club/         # Settings, Workspace, Staff
│   │   ├── utils/
│   │   │   ├── formatters.js # Formattazione date
│   │   │   └── ui.js         # Loading spinner
│   │   └── components/
│   │       └── layout/        # Sidebar, Header
│   ├── public/
│   │   └── assets/           # Static assets
│   ├── dist/                 # Build output (gitignore)
│   ├── vite.config.js         # Build config con plugin
│   └── package.json
│
├── backend/
│   ├── api/
│   │   ├── index.js          # Tutti gli endpoint API
│   │   └── pdfCalendarioParser.js  # Parser PDF SGS/LND
│   └── package.json
│
├── .agents/                  # Configurazione agenti AI
├── docs/                     # Documenti partnership
├── landing.html              # Landing page statica
└── README.md                 # Documentazione
```

## API Design

### Base URL
- **Produzione**: `https://youth-football-manager-backend.vercel.app/api`
- **Locale**: `http://localhost:3002/api`

### Endpoint Principali

#### Auth
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/auth/login` | Login utente |
| POST | `/auth/register` | Registrazione |
| GET | `/auth/me` | Profilo utente |
| GET | `/auth/users` | Lista utenti (admin) |
| POST | `/auth/users` | Crea utente (admin) |
| PUT | `/auth/users/:id` | Modifica utente (admin) |
| DELETE | `/auth/users/:id` | Disattiva utente (admin) |
| POST | `/auth/guest-link` | Genera link guest |
| GET | `/auth/guest-links` | Lista link guest |
| DELETE | `/auth/guest-link/:token` | Revoca link |

#### Teams
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/squadre` | Lista squadre |
| GET | `/squadre/:id` | Dettaglio squadra |
| GET | `/squadre/:id/statistiche-complete` | Stats complete |
| GET | `/squadre/:id/top-players` | Top marcatori/assist |

#### Matches
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/partite/:id/dettaglio` | Dettaglio con eventi |
| GET | `/squadre/:id/partite-future` | Prossime partite |
| PUT | `/partite/:id/archivia` | Archivia partita |
| PUT | `/partite/:id/sblocca` | Sblocca partita |
| DELETE | `/squadre/:id/partite-all` | Elimina TUTTE le partite |

#### Import Dati
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/calendario/import-tuttocampo` | Scraping calendario Tuttocampo (con marcatori opzionali) |
| POST | `/calendario/confirm-tuttocampo` | Conferma import partite + eventi |
| POST | `/partite/:id/import-eventi-tuttocampo` | Import eventi singola partita (URL o HTML) |
| POST | `/partite/:id/eventi-tuttocampo` | Batch import eventi con fuzzy match |
| POST | `/roster/parse-xls` | Upload e parsing tabulato XLS FIGC (multipart) |
| POST | `/roster/import-xls` | Conferma import giocatori nella rosa |

#### PDF Import Calendario
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/calendario/parse-pdf` | Upload PDF + cerca squadra (multipart) |
| POST | `/calendario/extract` | Estrai calendario per categoria (multipart) |
| POST | `/calendario/import` | Conferma e inserisci partite nel DB |

#### Lineups & Events
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/partite/:id/formazione` | Formazione |
| POST | `/partite/:id/formazione` | Salva formazione |
| GET | `/partite/:id/convocazioni` | Convocazioni |
| POST | `/partite/:id/evento-item` | Inserisci evento |
| POST | `/partite/:id/eventi-batch` | Batch eventi |
| DELETE | `/partite/:id/eventi-batch` | Elimina eventi |

## Schema Database (v2.0)

### Convenzione Naming
- **Tabelle**: 🇬🇧 Inglese (es. `player`, `team`, `match`)
- **Colonne**: 🇮🇹 Italiano (es. `nome`, `cognome`, `data_nascita`)

### Tabelle Principali

```sql
-- Workspace (Multi-tenant)
workspace (id, nome, logo_url, created_at)

-- Users (ex utente)
users (id, email, password_hash, nome, cognome, ruolo, workspace_id, ...)

-- Season (ex stagione)
season (id, workspace_id, nome, data_inizio, data_fine, attiva, is_default, created_at)

-- Player (ex calciatori)
player (id, nome, cognome, data_nascita, sesso, telefono, email, 
        ruolo_principale, piede_preferito, altezza, peso, ...)

-- Category (categorie Under 14, U15, etc.)
category (id, workspace_id, nome, tipo_campionato, anno_da, anno_a, genere, ...)

-- Competition (campionati)
competition (id, nome, tipo, federazione, regione, logo_url, ...)

-- Facility (impianti sportivi)
facility (id, nome, indirizzo, citta, capienza, superficie, tipo, ...)

-- Team (ex squadra)
team (id, season_id, category_id, nome, colori_casa, colori_trasferta, 
      venue_id, allenatore_id, dirigente_id, preparatore_id, portieri_id, ...)

-- Staff (personale)
staff (id, nome, cognome, data_nascita, ruolo, qualifiche, documento, ...)

-- Team Staff (assegnazione staff a squadra)
team_staff (id, team_id, staff_id, ruolo_squadra, data_assegnazione, ...)

-- Team Player (ex rosa - associazione giocatore-squadra)
team_player (id, team_id, player_id, is_primary, numero_maglia, 
            ruolo_preferito, stato, data_assegnazione, ...)

-- Match (ex partita)
match (id, team_id, competition_id, venue_id, data_ora, avversario, luogo,
       giornata, gol_casa, gol_ospite, stato, archiviata, indirizzo_campo,
       formazione_meta JSONB, note, note_avversario, ...)

-- Match Event (ex evento_partita)
match_event (id, match_id, tipo_evento, minuto, player_id, player_id_secondario, ...)

-- Match Formation (ex formazione_partita)
match_formation (id, match_id, team_player_id, posizione, numero_maglia,
                is_captain, is_vice_captain, is_starter, ...)

-- Convocation (ex convocazione)
convocation (id, match_id, team_player_id, convocato_da, convocato_il,
            confermato, presente, ...)

-- Training (ex allenamento)
training (id, team_id, venue_id, data_ora, durata_minuti, tipo, ...)

-- Training Attendance (ex presenza_allenamento)
training_attendance (id, training_id, team_player_id, presente, motivi_assenza, ...)

-- Match Statistics
match_statistics (id, match_id, team_player_id, minuti_giocati, gol, assist,
                  tiri, passaggi, falli, ammonizioni, espulsioni, ...)

-- Document (polimorfico)
document (id, tipo, entita_tipo, entita_id, file_url, nome_file, 
          mime_type, dimensione, data_upload, scadenza, ...)

-- Guest Token
guest_token (id, token, tipo, utente_id, scadenza, ...)
```

## Gestione Multi-Workspace

Ogni workspace rappresenta una **società sportiva** isolata.

```
┌─────────────────────────────────────────┐
│           TUTTI I WORKSPACE             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │ ASD     │ │ ASD     │ │ Progetto│    │
│  │ Alba    │ │ Green   │ │ Demo    │    │
│  │ Longa   │ │ Academy │ │         │    │
│  └────┬────┘ └────┬────┘ └────┬────┘    │
│       │           │           │          │
│  Sq.Under10 │ Sq.Under12 │ Sq.Demo  │
└─────────────────────────────────────────┘
```

**Isolamento**: 
- Query sempre filtrate per `workspace_id`
- API `/auth/workspaces` restituisce squadre per workspace utente

## Build System

### Build ID
- **Formato**: `v<major>.<minor>.<git-hash>` (es. `v3.14.62f56e8`)
- **Generazione**: Vite plugin in `buildStart`
- **Display**: Footer login e sidebar

### Plugin Vite
```javascript
// frontend-v2/vite.config.js
function generateBuildInfo() {
  const gitHash = execSync('git rev-parse --short HEAD').toString().trim();
  const buildId = `v3.14.${gitHash}`;
  // Scrive in src/build-info.js
}
```

## Variabili d'Ambiente

### Frontend (.env)
```
VITE_API_BASE_URL=https://youth-football-manager-backend.vercel.app/api
```

### Backend (.env)
```
SUPABASE_URL=https://csxdlxbhcnyfppojwwzy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<key>
JWT_SECRET=<secret>
PORT=3001
```

## Deploy Pipeline

```
┌──────────┐    git push     ┌─────────────┐
│  Locale  │ ──────────────► │   GitHub    │
└──────────┘                 └──────┬──────┘
                                   │
                    Vercel webhook │
                                   ▼
                         ┌─────────────────┐
                         │     Vercel      │
                         ├─────────────────┤
                         │ Frontend Build  │ ~1-2 min
                         │ Backend Deploy  │ ~1-2 min
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │   Produzione    │
                         │ vercel.app      │
                         └─────────────────┘
```

## Sicurezza

### Auth
- Password hash con bcrypt
- JWT con scadenza 7 giorni
- Guest tokens con scadenza configurabile

### Row Level Security (RLS)
- Tutte le tabelle con `workspace_id`
- Policy Supabase per isolamento dati

### CORS
- Solo domini autorizzati in whitelist

## Performance

### Frontend
- Code splitting automatico con Vite
- Lazy loading moduli
- CSS inline critical path
- Cache busting con hash

### Backend
- Connessioni Supabase in pool
- Query ottimizzate con indici
- Warmup endpoint per keep-alive
