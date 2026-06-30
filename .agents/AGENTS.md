# Youth Football Manager - AI Agent Workspace

> **Entry point per agenti AI** (OpenHands, Agent Canvas, Claude Code, etc.)

---

## 📁 Struttura Repository

```
.agents/                    # Configurazione agenti AI
├── AGENTS.md              # ← Questo file (entry point)
├── knowledge/             # Conoscenza del prodotto
│   ├── VISION.md          # Missione, valori, target
│   ├── ARCHITECTURE.md    # Stack, API, database
│   └── ROADMAP.md         # Backlog, priorità
├── standards/             # Convenzioni e regole
│   └── CODING_STANDARDS.md
├── tasks/                 # Template task
│   └── TEMPLATE.md
└── prompts/               # System prompts
    └── SYSTEM_PROMPT.md
```

---

## 🚀 Prima di Iniziare

### 1. Leggi i documenti di contesto
```
.agents/knowledge/VISION.md      → Cosa stiamo costruendo
.agents/knowledge/ARCHITECTURE.md → Come è fatto il sistema
.agents/knowledge/ROADMAP.md     → Cosa c'è da fare
.agents/standards/CODING_STANDARDS.md → Come scrivere codice
```

### 2. Verifica stato attuale
```bash
git log --oneline -3
git status
```

### 3. Consulta il system prompt
`.agents/prompts/SYSTEM_PROMPT.md`

---

## 📋 Info Progetto

| Info | Valore |
|------|--------|
| **Versione** | v3.15 |
| **Build ID** | `v3.15.<git-hash>` |
| **Frontend** | Vite + JavaScript ES Modules |
| **Backend** | Node.js/Express + Supabase |
| **Deploy** | Vercel (auto su push a main) |
| **Logo** | `/frontend-v2/public/assets/logo.png` |

---

## 🔗 Link Utili

- **App**: https://youth-football-manager.vercel.app
- **Backend API**: https://youth-football-manager-backend.vercel.app/api
- **Repo**: https://github.com/ecopraf/youth-football-manager

---

## 📖 Documentazione Dettagliata

| Documento | Descrizione |
|-----------|-------------|
| `.agents/knowledge/VISION.md` | Missione, valori, modello business |
| `.agents/knowledge/ARCHITECTURE.md` | Stack, struttura, API, DB |
| `.agents/knowledge/ROADMAP.md` | Backlog, priorità, bug noti |
| `.agents/standards/CODING_STANDARDS.md` | Convenzioni codice, naming, git |
| `.agents/prompts/SYSTEM_PROMPT.md` | System prompt per agenti |
| `.agents/tasks/TEMPLATE.md` | Template per task |

---

## 🗄️ Schema Database

| Tabella | Descrizione | FK Chiave |
|---------|-------------|----------|
| `workspace` | Società/club | - |
| `season` | Stagione sportiva | workspace_id |
| `category` | Categorie (U14, U15...) | workspace_id |
| `competition` | Campionati | - |
| `team` | Squadra | season_id, category_id |
| `player` | Giocatore | - |
| `team_player` | Associazione giocatore-squadra | team_id, player_id |
| `match` | Partita | team_id, competition_id |
| `match_event` | Eventi (GOAL, ASSIST, YELLOW...) | match_id, player_id |
| `match_formation` | Formazione | match_id, team_player_id |
| `match_statistics` | Statistiche dettagliate | match_id, team_player_id |
| `convocation` | Convocazioni | match_id, team_player_id |
| `training` | Allenamenti | team_id |
| `training_attendance` | Presenze allenamenti | training_id, team_player_id |
| `valutazione_partita` | Valutazioni | partita_id, calciatore_id |
| `staff` | Personale | - |
| `team_staff` | Staff assegnato a squadra | team_id, staff_id |
| `facility` | Impianti sportivi | - |
| `document` | Documenti polimorfici | entita_tipo, entita_id |
| `users` | Utente sistema | workspace_id |
| `guest_token` | Token guest | utente_id |

---

## 🔧 Workflow Raccomandato

### Per nuove feature:
```
1. Leggi .agents/knowledge/ per contesto
2. Pianifica modifiche
3. Implementa seguendo standards
4. Testa locally
5. Commit: git add . && git commit -m "tipo: descrizione"
6. Push: git push origin main
7. Verifica produzione (~2 min dopo)
```

### Per bug fix:
```
1. Riproduci il bug
2. Identifica causa
3. Implementa fix minima
4. Verifica fix
5. Commit + Push
```

---

## ⚠️ Regole Importanti

- **NON modificare**: `frontend-v2/src/build-info.js` (auto-generato)
- **NON hardcodare**: credenziali, API keys
- **Deploy**: automatico su push a main
- **Build ID**: `v3.15.<git-hash>` (mostrato dopo `npm run build`)

### 🔐 Credenziali Supabase (persistenti)

```
SUPABASE_URL=https://csxdlxbhcnyfppojwwzy.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeGRseGJoY255ZnBwb2p3d3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NTEzMTMsImV4cCI6MjA5NzMyNzMxM30.KTL6Z_Mwo_QzNidWt95YLqc7ZvdbfxyQdzxCT5uNRIw
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeGRseGJoY255ZnBwb2p3d3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc1MTMxMywiZXhwIjoyMDk3MzI3MzEzfQ.HZXGk1Xfz0EvSqewAoSCcgZ6gIQYLOP-54mE3YVHgBo
JWT_SECRET=aEj1OXdTHxSHD8iObjFov1jJ06RoyM1Ormf8KBb0uPI=
```

### 📡 Query Rapide Supabase
```bash
# Query tabella
curl -s 'https://csxdlxbhcnyfppojwwzy.supabase.co/rest/v1/workspace?select=*' \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### Modifiche Database
1. **Usa le API esistenti** quando possibili
2. **Se l'API non esiste**: fornisci query SQL dettagliate
3. **Prima di modificare**: verifica lo schema con `SELECT * FROM ... LIMIT 1`

### Modifiche Frontend
1. Segui CODING_STANDARDS.md per stile
2. Non modificare file generati automaticamente (`build-info.js`)
3. Testa responsive su mobile

### Modifiche Backend
1. Mantieni compatibilità con versioni precedenti
2. Aggiungi validazione input
3. Gestisci errori con messaggi user-friendly

### Deploy
1. **Non fare deploy manuale** - è automatico su push
2. Dopo ogni feature: commit + push
3. Verifica con `curl https://.../api/health`

---

## Workflow Raccomandato

### Per Nuove Feature

```
1. ANALISI
   - Leggi VISION e ROADMAP
   - Identifica file da modificare
   - Verifica se esiste già l'API/funzionalità

2. PIANIFICAZIONE
   - Crea task list
   - Valida con utente se complessa

3. IMPLEMENTAZIONE
   - Segui CODING_STANDARDS
   - Commit frequenti con messaggi descrittivi

4. VERIFICA
   - Build locale: npm run build
   - Test manuale se possibile
   - Verifica API con curl

5. DEPLOY
   - Push su main → trigger automatico
   - Attendi ~2 minuti
   - Verifica produzione
```

### Per Bug Fix

```
1. RIPRODUCI
   - Identifica i passaggi per replicare il bug
   
2. ANALIZZA
   - Leggi il codice rilevante
   - Verifica log browser console
   - Testa API con curl

3. FIX
   - Implementa la correzione minima
   - Non introduurre nuovi bug

4. VERIFICA
   - Testa la fix
   - Verifica non abbia impatto su altre parti

5. COMMIT
   - Messaggio: "fix: <breve descrizione bug>"
   - Push
```

---

## Checklist Prima di Commit

- [ ] Codice segue CODING_STANDARDS
- [ ] Build locale passa (`npm run build`)
- [ ] Nessun `console.log` left-over in produzione
- [ ] Variabili d'ambiente non hardcoded
- [ ] Accessibilità rispettata (title su icone)
- [ ] Errori gestiti con messaggi user-friendly

---

## Comandi Utili

```bash
# Setup locale
git clone https://github.com/ecopraf/youth-football-manager.git
cd youth-football-manager
cd frontend-v2 && npm install && npm run build

# Backend locale (se necessario)
cd backend && npm install && node api/index.js

# Verifica build
npm run build
# Output: Build ID: v3.15.XXXXXXX

# Deploy (automatico)
git add .
git commit -m "tipo: descrizione"
git push origin main

# Verifica produzione
curl https://youth-football-manager-backend.vercel.app/api/health
```

---

## File Sensibili

### NON MODIFICARE MAI
- `frontend-v2/src/build-info.js` (generato automaticamente)
- `frontend-v2/dist/` (output build)
- `node_modules/` (dipendenze)
- File con credenziali (`.env`)

### Variabili d'Ambiente
Le credenziali sono in AGENTS.md (repository context). Non esporle mai.

---

## Contesto Multi-Workspace

Il sistema supporta **multi-tenant**: ogni workspace è una società sportiva isolata.

**Regole**:
- Tutte le query includono `workspace_id`
- API `/auth/workspaces` per ottenere squadre utente
- Ogni workspace è una società sportiva isolata

---

## Convenzioni API

### Risposte
```javascript
// Successo
{ success: true, data: {...} }

// Errore
{ success: false, error: 'Messaggio' }
```

### Endpoint Standard
```
GET    /api/<risorsa>           → Lista
GET    /api/<risorsa>/:id       → Dettaglio
POST   /api/<risorsa>           → Crea
PUT    /api/<risorsa>/:id       → Modifica
DELETE /api/<risorsa>/:id       → Elimina
```

---

## Design System

### Colori
```css
--primary: #667eea
--success: #27AE60
--warning: #F39C12
--danger: #E74C3C
--text: #333333
```

### Border Radius
- Card: 12px
- Card gradient: 16px
- Bottoni: 10px
- Input: 8px

### Effetti Hover
```css
.card:hover {
  transform: translateY(-8px) scale(1.03);
  box-shadow: 0 15px 30px rgba(0,0,0,0.2);
}
```

---

## Contatti e Credenziali

- **Email**: youthfootballmanager@gmail.com
- **Supabase**: nel repository context (AGENTS.md padre)
- **Backend API**: https://youth-football-manager-backend.vercel.app/api

---

## Riga di Comando Finale

Dopo ogni task completato:
```bash
git add .
git commit -m "tipo: descrizione - build v3.15.<hash>"
git push origin main
```

Il `<hash>` è il commit hash corrente (vedi `git rev-parse --short HEAD`).
