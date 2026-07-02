# Regole di Progetto - Youth Football Manager

## Onboarding Obbligatorio (Inizio Chat)

All'inizio di ogni nuova conversazione, l'agente DEVE leggere i seguenti file per allinearsi allo stato attuale del progetto:

1. **`backend/.env`** — Credenziali DB, Supabase, JWT (per operazioni dirette sul DB)
2. **`.agents/AGENTS.md`** — Entry point, schema DB, comandi, workflow
3. **`.agents/knowledge/ROADMAP.md`** — Backlog, bug noti, priorità
4. **`PROJECT_STATUS.md`** — Stato moduli, ultimi commit, architettura

Solo dopo aver letto questi file l'agente può procedere con il task richiesto dall'utente.

## Accesso Diretto al Database

L'agente ha accesso diretto al DB PostgreSQL tramite la connection string in `backend/.env`:

```
DATABASE_URL=postgresql://postgres.csxdlxbhcnyfppojwwzy:Yfm2026Secure!@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
```

### Come eseguire query/migrazioni SQL

Dato che `psql` non è installato, usare Node.js con il pacchetto `pg` (già in `backend/node_modules`):

```javascript
// File: backend/tmp_migrate.js (eliminare dopo l'uso)
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.csxdlxbhcnyfppojwwzy:Yfm2026Secure!@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    // Esegui query qui
    const { rows } = await client.query('SELECT ...');
    console.log(rows);
  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(e => { console.error(e); process.exit(1); });
```

Eseguire con: `cd backend && /Users/Raffaele/.nvm/versions/node/v24.18.0/bin/node tmp_migrate.js`

**IMPORTANTE**: Eliminare sempre `tmp_migrate.js` dopo l'uso.

### Supabase REST API

Per query rapide di lettura/scrittura senza migrazioni:

```bash
curl -s 'https://csxdlxbhcnyfppojwwzy.supabase.co/rest/v1/TABELLA?select=*' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeGRseGJoY255ZnBwb2p3d3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NTEzMTMsImV4cCI6MjA5NzMyNzMxM30.KTL6Z_Mwo_QzNidWt95YLqc7ZvdbfxyQdzxCT5uNRIw" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeGRseGJoY255ZnBwb2p3d3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc1MTMxMywiZXhwIjoyMDk3MzI3MzEzfQ.HZXGk1Xfz0EvSqewAoSCcgZ6gIQYLOP-54mE3YVHgBo"
```

- **ANON KEY** (apikey header): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeGRseGJoY255ZnBwb2p3d3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NTEzMTMsImV4cCI6MjA5NzMyNzMxM30.KTL6Z_Mwo_QzNidWt95YLqc7ZvdbfxyQdzxCT5uNRIw`
- **SERVICE ROLE KEY** (Authorization Bearer): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeGRseGJoY255ZnBwb2p3d3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc1MTMxMywiZXhwIjoyMDk3MzI3MzEzfQ.HZXGk1Xfz0EvSqewAoSCcgZ6gIQYLOP-54mE3YVHgBo`
- **JWT_SECRET**: `aEj1OXdTHxSHD8iObjFov1jJ06RoyM1Ormf8KBb0uPI=`
- **Node path**: `/Users/Raffaele/.nvm/versions/node/v24.18.0/bin/node`

## Documentazione Obbligatoria

Dopo ogni build significativa (nuove feature, fix di bug multipli, refactoring, modifiche allo schema DB, aggiunta/rimozione endpoint API), l'agente DEVE aggiornare la documentazione:

1. **`.agents/knowledge/ROADMAP.md`** — Spostare task completati nella sezione "Risolti", aggiornare bug noti
2. **`.agents/knowledge/ARCHITECTURE.md`** — Aggiornare se cambiano tabelle DB, endpoint API, struttura file
3. **`.agents/AGENTS.md`** — Aggiornare schema DB, versione, comandi utili
4. **`PROJECT_STATUS.md`** — Aggiornare ultimi commit, stato moduli, tabelle DB

## Schema Database (Fonte di verità)

Le tabelle reali nel DB Supabase sono:
- `workspace`, `season`, `category`, `competition`, `facility`
- `team`, `player`, `team_player`, `staff`, `team_staff`
- `match`, `match_event`, `match_formation`, `match_statistics`, `convocation`
- `training`, `training_attendance`, `training_config`, `training_template`
- `valutazione_partita`, `document`
- `users`, `guest_token`

**NON ESISTONO** (non usare mai nel codice):
- `formazione_partita` → usa `match_formation`
- `presenza_allenamento` → usa `training` + `training_attendance`
- `allenamento_config` / `configurazione_allenamento` → usa `training_config`
- `guest_link` → usa `guest_token`
- `calciatore` → usa `player`
- `squadra` → usa `team`
- `stagione` → usa `season`
- `utente` → usa `users`
- `rosa` → usa `team_player`
- `partita` → usa `match`
- `evento_partita` → usa `match_event`
- `training_material` → non esiste

## Workspace di Produzione

I workspace attivi nel DB sono:
- `SSD New Team` (ID: `22222222-2222-2222-2222-222222222222`) — Categorie: Under 15, Under 16, Under 17
- `ACP Annex` (ID: `752eab50-73c1-495b-9e0e-8b851e9c9a99`)
- `DF Academy` (ID: `ab1186e5-a884-4355-b684-28e32b8157c2`) — Categorie: Under 15

**NON ESISTE PIÙ** il workspace demo `ASD Green Academy` (ID: `00000000-0000-0000-0000-000000000001`) — eliminato. Non usare mai questo ID nel codice.

## Relazioni chiave nel DB

- `convocation` usa `team_player_id` (NON `player_id`)
- `match_formation` usa `team_player_id` (NON `player_id`)
- `training_attendance` usa `training_id` + `team_player_id`
- `training_config` usa `team_id` + `giorno_settimana` (settimana tipo)
- `training_template` usa `team_id` + `programma` JSONB
- `match.formazione_meta` JSONB contiene `{modulo, positions}` per il layout campo
- `staff.workspace_id` UUID — associa lo staff al workspace
- `staff.qualifiche` JSONB contiene `{matricola, tessera_figc, tessera_lnd, tipo_tessera}`
- `team_staff` collega staff a team (e quindi a categorie) con `ruolo_squadra`
- `guest_token` ha colonne: `token, utente_id, tipo, squadre_accesso, scadenza`
- `users.permessi` JSONB contiene permessi granulari per staff: `{rosa: "write", partite: "read", ...}`
- `users.squadre_accesso` array di category_id (NON team_id) per limitare visibilità per categoria

## Sistema Autorizzazioni

### Accesso basato su Categorie (NON squadre)
- `users.squadre_accesso` contiene **category_id** (non team_id)
- La categoria è persistente tra stagioni, il team cambia ogni stagione
- Admin/Superadmin con array vuoto = accesso a tutte le categorie
- Allenatore con array = accesso solo alle categorie elencate

### Helper Backend (api/index.js)
- `hasPermission(user, modulo, livello)` — verifica se l'utente ha accesso al modulo
- `hasCategoryAccess(user, categoryId)` — verifica accesso alla categoria
- `requirePermission(modulo, livello)` — middleware Express per proteggere endpoint

### Moduli disponibili per permessi
- `rosa` — CRUD calciatori
- `partite` — CRUD partite, risultati, eventi
- `formazione` — convocazioni, formazione, distinta
- `allenamenti` — presenze, sedute, config, template
- `statistiche` — visualizzazione stats
- `guest_links` — generazione link guest

### Livelli: `""` (nessuno), `"read"`, `"write"`

### Guest JWT
- Generato da `/api/guest/:token` con validità 24h
- Contiene: `{isGuest: true, tipo, squadre_accesso}`
- `authMiddleware` lo riconosce e imposta `req.user.ruolo = 'guest'`
- `requirePermission` blocca tutti i guest (403)

## Regole di Sviluppo

- **Nessun riferimento alla demo** nel progetto principale (la demo è nel repo separato `youth-football-manager-demo`)
- **La registrazione è solo per admin/superadmin** — non esporre endpoint pubblici di registrazione
- **Tutti gli endpoint di scrittura** (POST/PUT/DELETE) devono avere `authMiddleware`
- **Nessun `console.log` di debug** nel codice pushato in produzione
- **Build test obbligatorio** prima di ogni commit (`npm run build` nel frontend, `node -c api/index.js` nel backend)
- **Porta locale backend**: 3002 (non 3001)
- **Versione attuale**: v3.15
- **Mai riutilizzare campi esistenti per scopi diversi** — se serve un nuovo dato, creare una colonna/tabella dedicata
- **Preferire campi JSONB** per dati strutturati che non richiedono query dirette (metadati, configurazioni, layout)
- **NON pushare senza conferma esplicita dell'utente**

## Convenzioni Commit

```
feat: nuova funzionalità
fix: correzione bug
docs: documentazione
refactor: refactoring codice
style: stili (CSS)
```

## Workflow Post-Modifica

1. Implementa le modifiche
2. Testa: `cd frontend-v2 && npm run build` + `cd backend && node -c api/index.js`
3. Se la modifica è significativa → aggiorna documentazione (vedi sopra)
4. Commit con messaggio descrittivo
5. Push su main → deploy automatico Vercel (SOLO con conferma utente)

## Gestione Task Complessi

### Stima e Progress

Quando l'utente richiede modifiche significative, l'agente DEVE:

1. **Analizzare** la complessità e scomporre il lavoro in task numerati
2. **Stimare** il tempo necessario per ogni task (es. ~2min, ~5min)
3. **Mostrare una tabella di progresso** aggiornata ad ogni step completato:

```
| # | Task                          | Stima | Stato |
|---|-------------------------------|-------|-------|
| 1 | Fix endpoint partite          | ~2min | ✅    |
| 2 | Restyling calendario          | ~5min | ⏳    |
| 3 | Test build                    | ~1min | ⬜    |
```

4. **Aggiornare** lo stato (⬜ → ⏳ → ✅) man mano che completa ogni task
5. **Comunicare** al termine di ogni task prima di procedere al successivo

### Suddivisione in Sottomoduli

Se una modifica è troppo complessa (tocca più di 3-4 file con logica diversa), l'agente DEVE:

1. **Valutare** se creare file/moduli separati anziché un unico file monolitico
2. **Preferire** la separazione in moduli quando:
   - Un file supera le 500 righe
   - La logica copre domini diversi (es. auth + training + match nello stesso handler)
   - Ci sono funzioni utility riutilizzabili in più punti
3. **Proporre** la struttura modulare all'utente prima di implementarla
4. **Non modificare mai** più di 200 righe in un singolo step senza conferma
