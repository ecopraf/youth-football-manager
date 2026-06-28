# Youth Football Manager

> ⚠️ **Per agenti AI**: consultare `.agents/AGENTS.md` (entry point principale)

## Quick Links
- **App**: https://youth-football-manager.vercel.app
- **Backend**: https://youth-football-manager-backend.vercel.app/api
- **Repo**: https://github.com/ecopraf/youth-football-manager

## Info
- **Versione**: v3.14
- **Build ID**: `v3.14.<git-hash>`
- **Deploy**: Manuale via API (NON automatico su push a main)

## 🔑 Credenziali Sistema

### Superadmin
| Email | Password |
|-------|----------|
| coppola.raffaele@gmail.com | raffaele78 |

### Utenti Production
| Nome | Ruolo | Email | Password | Workspace |
|------|-------|-------|----------|-----------|
| Matteo Urilli | Allenatore | matteo@urilli.it | mister | DF Academy |
| Francesco Annese | Admin | francesco@annese.it | annex | ACP Annex |

## ⚠️ ISTRUZIONI IMPORTANTI

### Git & Deploy
- **NON fare push automatico su main** che triggera deploy Vercel
- Per ogni modifica:
  1. Disabilita deploy Vercel via API
  2. Fai commit e push
  3. Riabilita deploy Vercel
- Per deploy manuale: usare l'API Vercel con commit SHA specifico (richiedere conferma)

## 🔐 Credenziali Configurate

> ⚠️ **NOTA**: Le credenziali sensibili sono gestite tramite le variabili d'ambiente dell'agent.
> Non inserire mai secrets hardcoded nei file. Fai riferimento alle variabili `$SUPABASE_URL`, `$SUPABASE_SERVICE_ROLE_KEY`, `$VERCEL_TOKEN`.

### Supabase
- **URL**: `https://csxdlxbhcnyfppojwwzy.supabase.co`
- **ANON_KEY**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeGRseGJoY255ZnBwb2p3d3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NTEzMTMsImV4cCI6MjA5NzMyNzMxM30.KTL6Z_Mwo_QzNidWt95YLqc7ZvdbfxyQdzxCT5uNRIw`
- **SERVICE_ROLE_KEY**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeGRseGJoY255ZnBwb2p3d3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc1MTMxMywiZXhwIjoyMDk3MzI3MzEzfQ.HZXGk1Xfz0EvSqewAoSCcgZ6gIQYLOP-54mE3YVHgBo`
- **JWT_SECRET**: `aEj1OXdTHxSHD8iObjFov1jJ06RoyM1Ormf8KBb0uPI=`

### Vercel
- **Token**: usa variabile `$VERCEL_TOKEN`
- **Project ID**: `prj_zJ4cDM8Y8ledbwYKdJYWKQWwRrV6`
- **Team**: `team_CqNxANEW3rt4d6yuYeZM9Db7`

### Database Direct Access
```bash
# Usa le variabili d'ambiente dell'agent
curl -X POST "https://csxdlxbhcnyfppojwwzy.supabase.co/rest/v1/rpc/exec_sql" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT 1"}'
```

### Vercel API - Gestione Deploy
```bash
# Disabilita deploy automatici
curl -X PATCH "https://api.vercel.com/v6/projects/youth-football-manager" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gitProviderOptions":{"createDeployments":"disabled"}}'

# Riabilita deploy
curl -X PATCH "https://api.vercel.com/v6/projects/youth-football-manager" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gitProviderOptions":{"createDeployments":"enabled"}}'
```

### Workspace Switcher - Note Implementative
- Solo i **superadmin** vedono lo switcher
- Al login appare un modal di selezione se ci sono 2+ workspace reali
- Dalla sidebar si può cambiare in qualsiasi momento
- Il workspace demo (ID: `00000000-0000-0000-0000-000000000001`) è escluso

---

## 📋 REGOLE DI SVILUPPO

### ⚠️ Prima di Modificare la Logica

1. **NON rimuovere campi dalla logica esistente** - Se un campo "manca" nel DB, la prima azione è **aggiungerlo con migrazione**, non rimuovere la funzionalità dal codice
2. **Chiedere conferma** prima di cambiare la logica generale delle funzionalità
3. **Verificare la struttura del DB** prima di assumere cosa esiste o non esiste
4. **Testare gli endpoint** direttamente prima di considerare una modifica come risolta

### 🗄️ Schema Database

#### Tabella `player`
| Campo | Tipo | Descrizione |
|-------|------|-------------|
| id | UUID | Primary key |
| nome | TEXT | Nome giocatore |
| cognome | TEXT | Cognome giocatore |
| data_nascita | DATE | Data di nascita |
| sesso | TEXT | M/F |
| foto_url | TEXT | URL foto |
| telefono | TEXT | Telefono |
| email | TEXT | Email |
| ruolo_principale | TEXT | Ruolo principale |
| piede_preferito | TEXT | Destro/Sinistro/Ambidestro |
| altezza | INTEGER | Altezza in cm |
| peso | INTEGER | Peso in kg |
| note | TEXT | Note |
| luogo_nascita | TEXT | Luogo di nascita |
| nazionalita | TEXT | Nazionalità (default: Italiana) |
| residenza | TEXT | Residenza |
| matricola_figc | TEXT | Codice FIGC (UNIQUE) |
| tipo_documento | TEXT | Tipo documento |
| numero_documento | TEXT | Numero documento |
| rilasciato_da | TEXT | Ente rilascio documento |
| data_visita_medica | DATE | Data ultima visita medica |
| scadenza_visita_medica | DATE | Scadenza certificato medico |
| tesserato_dal | DATE | Inizio tesseramento |
| tesserato_fino_al | DATE | Fine tesseramento |

#### Tabella `team_player`
| Campo | Tipo | Descrizione |
|-------|------|-------------|
| id | UUID | Primary key |
| team_id | UUID | FK a team |
| player_id | UUID | FK a player |
| numero_maglia | INTEGER | Numero di maglia |
| ruolo_preferito | TEXT | Ruolo per questa stagione |
| stato | TEXT | Attivo/Aggregato/Infortunato/Svincolato/Trasferito |
| is_primary | BOOLEAN | Squadra principale |
| data_assegnazione | DATE | Data assegnazione alla squadra |
| data_cessione | DATE | Data uscita dalla squadra |
| note | TEXT | Note |

#### Tabella `season`
| Campo | Tipo | Descrizione |
|-------|------|-------------|
| id | UUID | Primary key |
| workspace_id | UUID | FK a workspace |
| nome | TEXT | Nome stagione (es. "2025/26") |
| data_inizio | DATE | Data inizio |
| attiva | BOOLEAN | Stagione attiva |

#### Tabella `team`
| Campo | Tipo | Descrizione |
|-------|------|-------------|
| id | UUID | Primary key |
| nome | TEXT | Nome squadra |
| season_id | UUID | FK a season |
| category_id | UUID | FK a category |
| allenatore_id | UUID | FK a staff |
| dirigente_id | UUID | FK a staff |
| colori_casa | TEXT | Colori casa |
| colori_trasferta | TEXT | Colori trasferta |

### 🔄 Flusso Login e Caricamento Dati

1. Login → ottiene token JWT e dati utente
2. Se utente normale (non superadmin): usa `workspace_id` dal profilo per impostare `window.YFM.workspaceInfo`
3. `loadSquadre()` viene chiamato **dopo** che `workspaceInfo` è impostato
4. `loadSquadre()` cerca le stagioni del workspace, poi le squadre della stagione attiva
5. Il `squadraId` viene impostato automaticamente dalla prima squadra disponibile

### 📁 Struttura Migrations

Le migrazioni sono in `backend/migrations/` e seguono il pattern:
```
XXX_nome_migrazione.sql
```

Esempio: `004_add_player_fields.sql` aggiunge i campi mancanti alla tabella player.

### 🏗️ Endpoint API Key

- `/api/stagioni/:id/squadre` → restituisce squadre per stagione con category join
- `/api/squadre/:id/calciatori` → GET: lista giocatori, POST: aggiungi giocatore
- `/api/squadre/:id/scadenze-mediche` → giocatori con certificato in scadenza (30 giorni)
- `/api/squadre/:id/statistiche-complete` → statistiche squadre
- `/api/squadre/:id/top-players` → top marcatori/assist/presenze