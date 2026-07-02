# 🔧 PROPOSTA: DB CLEANUP + BACKEND MODULARE

## PARTE 1: PULIZIA DATABASE

### Piano di Cleanup

```
DATI ATTUALI:
- workspace: 4 ✅ (DA MANTENERE)
- utente: 11 ✅ (DA MANTENERE)
- squadra: 7 🗑️ (DA CANCELLARE)
- stagione: 0 (vuota)
- calciatori: 86 🗑️ (DA CANCELLARE - saranno PLAYER)
- partite: 51 🗑️ (DA CANCELLARE)
- rosa: ? 🗑️ (DA CANCELLARE)
- altri record 🗑️
```

### Azioni Immediate

```sql
-- 1. Backup prima di tutto
-- (Da fare manualmente da Supabase Dashboard)

-- 2. Cancellare tutti i dati non-anagrafici
DELETE FROM rosa WHERE id IS NOT NULL;
DELETE FROM evento_partita WHERE id IS NOT NULL;
DELETE FROM presenza_allenamento WHERE id IS NOT NULL;
DELETE FROM convocazione WHERE id IS NOT NULL;
DELETE FROM formazione_partita WHERE id IS NOT NULL;
DELETE FROM configurazione_allenamento WHERE id IS NOT NULL;
DELETE FROM partita WHERE id IS NOT NULL;
DELETE FROM allenamento WHERE id IS NOT NULL;
DELETE FROM calciatore WHERE id IS NOT NULL;
DELETE FROM squadra WHERE id IS NOT NULL;
DELETE FROM stagione WHERE id IS NOT NULL;

-- 3. Resettare sequence
ALTER SEQUENCE IF EXISTS squadra_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS calciatore_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS partita_id_seq RESTART WITH 1;
-- etc.
```

### Workspace da Mantenere

| ID | Nome | Note |
|----|------|------|
| `22222222-2222-2222-2222-222222222222` | SSD New Team | Produzione |
| `752eab50-73c1-495b-9e0e-8b851e9c9a99` | ACP Annex | Produzione |
| `ab1186e5-a884-4355-b684-28e32b8157c2` | DF Academy | Produzione |

---

## PARTE 2: BACKEND MODULARE - ANALISI E PROPOSTA

### Stato Attuale

```
backend/
├── api/
│   └── index.js          ← MONOLITICO (1806 righe!)
├── package.json
└── vercel.json
```

**Problemi dell'attuale struttura monolitica:**
1. ❌ File unico da 1800+ righe - difficile da navigare
2. ❌ Tutti gli endpoint in un unico file
3. ❌ Logica mista (HTTP, DB, auth)
4. ❌ Difficile da testare
5. ❌ Impossibile riutilizzare logica tra endpoint
6. ❌ Conflitti git se più dev lavorano contemporaneamente

### Opzioni Architetturali

#### Opzione A: Modularizzazione Progressiva (Consigliata) ⭐
```
backend/
├── api/
│   ├── index.js              # Entry point + routes setup
│   ├── routes/               # Rotte organizzate
│   │   ├── auth.routes.js
│   │   ├── workspace.routes.js
│   │   ├── team.routes.js
│   │   ├── player.routes.js
│   │   ├── staff.routes.js
│   │   ├── match.routes.js
│   │   ├── training.routes.js
│   │   └── category.routes.js
│   ├── controllers/          # Logica HTTP (opzionale)
│   │   ├── auth.controller.js
│   │   ├── workspace.controller.js
│   │   └── ...
│   ├── services/             # Logica business
│   │   ├── auth.service.js
│   │   ├── workspace.service.js
│   │   └── ...
│   ├── middleware/           # Middleware condivisi
│   │   ├── auth.middleware.js
│   │   └── error.middleware.js
│   ├── db/                   # Query e helper DB
│   │   ├── supabase.js
│   │   └── queries/
│   │       ├── team.queries.js
│   │       └── ...
│   └── utils/                # Utility
│       ├── validators.js
│       └── helpers.js
├── package.json
└── vercel.json
```

**Vantaggi:**
- ✅ Manutenibile - ogni modulo ha responsabilità singola
- ✅ Testabile - unit test per services
- ✅ Riutilizzabile - logica condivisa
- ✅ Scalabile - aggiungi moduli senza toccare esistenti
- ✅ Team collaboration - meno conflitti git
- ✅ Deploy compatibile - Vercel funziona con exports

**Svantaggi:**
- ⚠️ Refactoring iniziale (8-16h)
- ⚠️ Piccola curva di apprendimento

#### Opzione B: Struttura a Layer Semplificata
```
backend/
├── api/
│   ├── index.js              # App entry (snello)
│   ├── routes/               # Solo route definitions
│   └── lib/                  # Tutta la logica
│       ├── supabase.js
│       ├── auth.js
│       ├── workspaces.js
│       ├── teams.js
│       ├── players.js
│       └── ...
└── vercel.json
```

**Vantaggi:**
- ✅ Minore refactoring
- ✅ Struttura piatta e semplice

**Svantaggi:**
- ⚠️ Meno separazione (routes + lib mixed)

#### Opzione C: Microservizi (NON Consigliata)
Separare in:
- `api-auth` - autenticazione
- `api-teams` - gestione squadre
- `api-matches` - partite
- etc.

**PROBLEMI:**
- ❌ Overhead per questo progetto
- ❌ Complessità deployment
- ❌ Dati condivisi tra servizi
- ❌ Vercel functions separate = costi x2

---

### Piano di Implementazione Modulare

#### Fase 1: Setup Struttura (2-4h)

```bash
# 1. Creare cartelle
mkdir -p backend/api/{routes,controllers,services,middleware,db/queries,utils}

# 2. Creare file base
# - supabase.js (connessione)
# - auth.middleware.js
# - error.middleware.js
# - routes/index.js (aggrega tutte le routes)
```

#### Fase 2: Estrazione Moduli (16-24h)

**Step 2.1: Auth Module**
```javascript
// backend/api/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Mantiene la logica attuale ma organizzata
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/me', authMiddleware, authController.me);

module.exports = router;
```

**Step 2.2: Workspace Module**
```javascript
// backend/api/routes/workspace.routes.js
router.get('/', workspaceController.getAll);
router.post('/', workspaceController.create);
router.get('/:id', workspaceController.getById);
router.put('/:id', workspaceController.update);
router.delete('/:id', workspaceController.delete);
router.get('/:id/seasons', workspaceController.getSeasons);
router.post('/:id/seasons', workspaceController.createSeason);
```

**Step 2.3: Team Module (ex Squadre)**
```javascript
// backend/api/routes/team.routes.js
router.get('/seasons/:seasonId/teams', teamController.getBySeason);
router.post('/seasons/:seasonId/teams', teamController.create);
router.get('/teams/:id', teamController.getById);
router.put('/teams/:id', teamController.update);
router.delete('/teams/:id', teamController.delete);
router.get('/teams/:id/players', teamController.getPlayers);
router.post('/teams/:id/players', teamController.addPlayer);
```

**Step 2.4: Player Module (ex Calciatori)**
```javascript
// backend/api/routes/player.routes.js
router.get('/players', playerController.getAll);
router.get('/players/:id', playerController.getById);
router.put('/players/:id', playerController.update);
router.get('/players/:id/history', playerController.getHistory);
router.get('/players/:id/statistics', playerController.getStatistics);
```

**Step 2.5: Staff Module (NUOVO)**
```javascript
// backend/api/routes/staff.routes.js
router.get('/staff', staffController.getAll);
router.post('/staff', staffController.create);
router.get('/staff/:id', staffController.getById);
router.put('/staff/:id', staffController.update);
router.delete('/staff/:id', staffController.delete);
router.get('/teams/:id/staff', staffController.getByTeam);
router.post('/teams/:id/staff', staffController.assignToTeam);
```

**Step 2.6: Match Module**
```javascript
// backend/api/routes/match.routes.js
router.get('/teams/:teamId/matches', matchController.getByTeam);
router.post('/teams/:teamId/matches', matchController.create);
router.get('/matches/:id', matchController.getById);
router.put('/matches/:id', matchController.update);
router.get('/matches/:id/details', matchController.getDetails);
router.post('/matches/:id/events', matchController.addEvent);
```

#### Fase 3: Entry Point Snello (2-4h)

```javascript
// backend/api/index.js (NUOVO - snello)
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Import routes
const authRoutes = require('./routes/auth.routes');
const workspaceRoutes = require('./routes/workspace.routes');
const teamRoutes = require('./routes/team.routes');
const playerRoutes = require('./routes/player.routes');
const staffRoutes = require('./routes/staff.routes');
const matchRoutes = require('./routes/match.routes');
const categoryRoutes = require('./routes/category.routes');

// Import middleware
const { authMiddleware } = require('./middleware/auth.middleware');
const { errorHandler } = require('./middleware/error.middleware');

// Import lib
const supabase = require('./db/supabase');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '3.15' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api', teamRoutes);  // /api/seasons/:id/teams, /api/teams/:id/...
app.use('/api', playerRoutes);
app.use('/api', staffRoutes);
app.use('/api', matchRoutes);
app.use('/api/categories', categoryRoutes);

// Error handler
app.use(errorHandler);

module.exports = app;
```

---

### Confronto Tempi

| Approccio | Tempo Refactoring | Manutenzione Futura | Scalabilità |
|-----------|------------------|---------------------|-------------|
| Monolitico (attuale) | 0h (ora) | Difficile 😰 | Limitata 😰 |
| Modulare (Opzione A) | 20-30h | Facile 😊 | Alta 😊 |
| Layer Semplificato (Opzione B) | 10-16h | Media 😐 | Media 😐 |

---

## PARTE 3: PIANO COMBINATO SUGGERITO

### Sequenza Consigliata

```
GIORNO 1: DB Cleanup
├── Backup DB da Supabase Dashboard
├── Esegui script cleanup SQL
└── Verifica workspace + utenti

GIORNO 2-3: Backend Modulare (Fase 1)
├── Crea struttura cartelle
├── Estrai auth module
├── Estrai workspace module
└── Test endpoint

GIORNO 4-5: Backend Modulare (Fase 2)
├── Estrai team module
├── Estrai player module
├── Estrai match module
└── Test completo

GIORNO 6-7: Backend Modulare (Fase 3)
├── Estrai staff module
├── Estrai training module
├── Crea nuovi endpoint per nuova struttura
└── Test end-to-end

SETTIMANA 2: Testing + Fix
├── Test completo su staging
├── Fix bug trovati
└── Deploy in produzione
```

---

## RACCOMANDAZIONI

1. **DB Cleanup**: ✅ Farlo subito - dati sporchi complicano tutto

2. **Backend Modulare**: 
   - ✅ Consigliato per progetti che crescono
   - ⚠️ Ma richiede tempo (20-30h)
   - 💡 Alternativa: modularizzazione graduale (un modulo alla volta)

3. **Approccio Ibrido Consigliato**:
   ```
   - GIORNO 1: Cleanup DB + Iniziare struttura modulare
   - MAN mano: Estarre un modulo per settimana
   - SENZA bloccare lo sviluppo di nuove features
   ```

---

## PROSSIMI PASSI

1. [ ] Conferma cleanup DB (si/no)
2. [ ] Scelta approccio backend:
   - [ ] Modularizzazione completa (20-30h)
   - [ ] Modularizzazione graduale (1 modulo/settimana)
   - [ ] Layer semplificato (10-16h)
3. [ ] Backup Supabase (manuale)
4. [ ] Esecuzione piano

---

*Documento generato: 2026-06-27*
*Autore: AI Assistant*
