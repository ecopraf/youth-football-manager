# Regole di Progetto - Youth Football Manager

## Modello Operativo

Questo progetto lavora per **micro-task atomici** (max 15min ciascuno), organizzati in **Epic** nel Development Plan.

### Principi:
- Ogni modifica è un micro-task con ID univoco (es. `2.3`)
- Ogni task ha dipendenze esplicite, file coinvolti, effort stimato
- Lo stato viene aggiornato nel DEVELOPMENT_PLAN ad ogni completamento
- Mai lavorare su task non tracciati — se serve qualcosa di nuovo, prima aggiungerlo al plan

## Onboarding Obbligatorio (Inizio Chat)

All'inizio di ogni nuova conversazione, l'agente DEVE leggere i seguenti file per allinearsi:

1. **`.agents/plans/DEVELOPMENT_PLAN.md`** — ⭐ FONTE DI VERITÀ: stato, task, priorità, dipendenze
2. **`backend/.env`** — Credenziali DB, Supabase, JWT
3. **`.agents/AGENTS.md`** — Entry point, schema DB, comandi, workflow

Solo dopo aver letto questi file l'agente può procedere con il task richiesto dall'utente.

## Workflow Micro-Task

### Prima di implementare:
1. Identificare l'Epic e il task ID nel DEVELOPMENT_PLAN
2. Se il task non esiste → aggiungerlo al plan con ID, dipendenze, file, effort
3. Verificare che le dipendenze siano soddisfatte (task precedenti ✅)
4. Comunicare all'utente: "Lavoro su task X.Y: [descrizione]"

### Durante l'implementazione:
1. Aggiornare stato task: ⬜ → ⏳
2. Lavorare su UN task alla volta
3. Ogni task = 1 commit (o raggruppare 2-3 task correlati)

### Dopo il completamento:
1. Aggiornare stato task: ⏳ → ✅
2. Aggiornare changelog nel DEVELOPMENT_PLAN
3. Se la modifica tocca schema DB → aggiornare DATABASE_SCHEMA.md
4. Comunicare: "Task X.Y completato. Prossimo: X.Z"

### Regole task:
- Max 15min per task. Se supera → spezzare in sotto-task
- Ogni task deve essere committabile singolarmente
- Mai modificare più di 200 righe senza conferma utente
- Dipendenze devono essere esplicite ("Dipende da: 2.1")

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

Dopo ogni task completato, l'agente DEVE aggiornare:

1. **`.agents/plans/DEVELOPMENT_PLAN.md`** — Stato task (⬜→✅), changelog, bug noti
2. **`.agents/knowledge/DATABASE_SCHEMA.md`** — Solo se cambiano tabelle/colonne DB
3. **`.agents/AGENTS.md`** — Solo se cambiano endpoint API o struttura file

> ⚠️ I file `PROJECT_STATUS.md` e `.agents/knowledge/ROADMAP.md` sono deprecati.
> La fonte di verità unica è `DEVELOPMENT_PLAN.md`.

## Schema Database (Fonte di verità)

Le tabelle reali nel DB Supabase sono:
- `workspace`, `season`, `category`, `competition`, `facility`
- `team`, `player`, `team_player`, `staff`, `team_staff`

**Colonne notevoli `team_player`**: `stato TEXT` (Attivo, Infortunato, Svincolato), `aggregato BOOLEAN DEFAULT false` (true se giocatore aggregato da categoria inferiore)
- `match`, `match_event`, `match_formation`, `match_statistics`, `convocation`

**Colonne notevoli `match`**: `indirizzo_campo TEXT` (indirizzo campo trasferta da PDF SGS), `tc_match_url TEXT` (URL pagina partita Tuttocampo per import formazioni), `live_meta JSONB` (`{stato: '1t'|'intervallo'|'2t'|'fine', start_1t, end_1t, start_2t, end_match}` — lifecycle Live Match Mode)
- `training`, `training_attendance`, `training_config`, `training_template`
- `valutazione_partita`, `document`
- `users`, `guest_token`
- `import_log`
- `tournament`
- `absence_notification`

**Colonne notevoli `import_log`**: `tipo TEXT` (calendario_pdf, calendario_testo, calendario_tuttocampo, rosa_xls, rosa_tuttocampo, formazioni_tuttocampo), `dettagli JSONB`, `record_importati INT`, `esito TEXT`

**Colonne notevoli `absence_notification`**: `player_id`, `team_id`, `training_id` (nullable, null per sessioni virtuali), `data_allenamento DATE`, `motivo TEXT`, `messaggio TEXT`, `letto BOOLEAN`

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
- `ACP Annex` (ID: `752eab50-73c1-495b-9e0e-8b851e9c9a99`) → **rinominato in "Albalonga"**
- `DF Academy` (ID: `ab1186e5-a884-4355-b684-28e32b8157c2`) — Categorie: Under 15

**NON ESISTONO PIÙ**:
- Workspace demo `ASD Green Academy` (ID: `00000000-...`) — eliminato
- Workspace `SSD New Team` (ID: `22222222-...`) — eliminato

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

### Capabilities & Profili (v2)

`users.permessi` JSONB supporta due formati (retrocompatibile):

**Nuovo formato** (preferito):
```json
{
  "profilo": "allenatore",
  "capabilities": { "rosa": "write", "partite": "write", "allenamenti": "write", ... }
}
```

**Vecchio formato** (ancora supportato):
```json
{ "rosa": "write", "partite": "read" }
```

### Profili predefiniti

| Profilo | rosa | partite | formazione | allenamenti | statistiche | guest_links | import | report |
|---------|------|---------|------------|-------------|-------------|-------------|--------|--------|
| allenatore | write | write | write | write | read | write | write | read |
| vice_allenatore | read | read | write | write | read | — | — | read |
| dirigente | read | read | read | — | read | write | — | read |
| preparatore | read | — | — | write | read | — | — | — |
| osservatore | read | read | — | — | read | — | — | read |
| custom | (personalizzato dall'admin) |

### File di riferimento
- `frontend-v2/src/utils/capabilities.js` — PROFILI, CAPABILITIES, getUserCapabilities()
- `backend/api/helpers/capabilities.js` — mirror CommonJS
- `frontend-v2/src/components/layout/sidebarNav.js` — nav filtrato per capabilities

### Livelli capability: `""` (nessuno), `"read"`, `"write"`

### Logica hasPermission (backend)
- superadmin/admin/allenatore → sempre `true`
- staff → controlla `getUserCapabilities(permessi)[modulo]`
- guest → sempre bloccato (403)

### Sidebar filtrata
- Ogni voce sidebar richiede una capability specifica (vedi `sidebarNav.js`)
- Admin/Allenatore/Superadmin vedono tutto
- Staff vede solo le voci per cui ha almeno `read`

### Guest JWT
- Generato da `/api/guest/:token` con validità 24h
- Contiene: `{isGuest: true, tipo, squadre_accesso}`
- Risposta include anche: `team_id` (stagione attiva), `player_name` (se player_id presente)
- Frontend usa `team_id` per auto-selezionare squadra senza mostrare selettori
- Logout guest mostra "Sessione terminata" (non redirect a login)
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

---

## 🎨 Regole UI/UX (OBBLIGATORIO)

### Principio generale

Ogni elemento UI deve essere **coerente con il design system dell'app**. Mai usare componenti nativi del browser quando esiste un equivalente custom.

### Divieti assoluti

| ❌ Vietato | ✅ Usare invece |
|---|---|
| `alert()` | Toast notification (`showToast()`) o modal custom |
| `prompt()` | Modal custom con input stilizzato |
| `confirm()` | Modal custom con bottoni Annulla/Conferma |
| Checkbox/radio nativi non stilizzati | Componenti con stile app (border-radius, colori brand) |

### Modal custom — Template

Quando serve un input dall'utente (es. minuto sostituzione, conferma azione):

```javascript
// Overlay centrato + card animata
const overlay = document.createElement('div');
overlay.className = 'modal-overlay-class'; // fixed, centered, backdrop blur
overlay.innerHTML = `<div class="modal-card-class">
  <div class="modal-icon">🔄</div>
  <div class="modal-title">Titolo</div>
  <!-- contenuto -->
  <div class="modal-actions">
    <button class="btn btn-secondary" id="cancelBtn">Annulla</button>
    <button class="btn btn-primary" id="confirmBtn">Conferma</button>
  </div>
</div>`;
```

### Stile obbligatorio per modali/popup

- Overlay: `position:fixed; background:rgba(0,0,0,0.5); z-index:2000; display:flex; align-items:center; justify-content:center`
- Card: `background:white; border-radius:16px; padding:24px; max-width:360px; width:100%; box-shadow:0 20px 60px rgba(0,0,0,0.3); animation:scale-in 0.2s`
- Chiusura: click overlay, tasto Escape, bottone Annulla
- Focus automatico sull'input principale

### Layout e responsive

- **Mobile-first**: ogni layout DEVE funzionare su mobile (320px+)
- **Max-width contenuto**: usare `max-width` + `margin: 0 auto` per centrare sezioni
- **Flex-direction**: `row` su desktop → `column` su mobile via media query
- **Touch targets**: minimo 44x44px per bottoni/elementi interattivi su mobile
- **No overflow nascosto**: verificare sempre che il contenuto non esca dal viewport su mobile

### Colori e stile card

- Card: `background:white; border-radius:12px; padding:16px; border:1px solid #eee`
- Badge/chip colorati: usare sfondo pastello + testo scuro (es. `background:#eef2ff; color:#4338ca; border:1px solid #c7d2fe`)
- Mai grigio chiaro (`#f5f5f5`) per elementi interattivi — usare colori che si distinguano
- Hover: leggero `transform` o `box-shadow`, mai solo cambio colore

### Interazioni touch/mobile

- **Drag & drop**: funziona solo su desktop. Su mobile usare **two-tap flow** (tap per selezionare → tap per posizionare)
- **Selezione attiva**: evidenziare con colore brand (`#667eea` sfondo, testo bianco)
- **Feedback visivo**: sempre mostrare stato selezionato/hover/attivo

---

## 🗄️ Ottimizzazione DB (OBBLIGATORIO)

### Regola #1: UNA query per operazione batch

MAI iterare con query individuali. Usare SEMPRE `WHERE id = ANY($1)` o `.in('campo', array)`.

```javascript
// ❌ VIETATO (N query per N record)
for (const id of ids) await supabase.from('t').delete().eq('id', id);

// ✅ OBBLIGATORIO (1 query per N record)
await supabase.from('t').delete().in('id', ids);
```

### Regola #2: Endpoint batch dedicati

- Naming: `DELETE /api/risorsa-batch`, `PUT /api/risorsa-batch`
- Body: `{ ids: [...] }` (array di identificatori)
- Backend: singola query con `IN` / `ANY`
- Risposta: `{ success: true, deleted/updated: N }`

### Regola #3: Supabase JS vs pg diretto

- CRUD semplice → `supabase.from()`
- JOIN complessi / subquery → `pg` raw
- Transazioni atomiche → `pg` con `BEGIN/COMMIT`
- Migrazioni DDL → `pg` raw

---

## 🧠 Cache Frontend (OBBLIGATORIO)

### Architettura

| Layer | Storage | TTL | Uso |
|-------|---------|-----|-----|
| Memory | Variabile JS | 2 min | Dati DB frequenti (dashboard, stats) |
| Session | sessionStorage | 10 min | Dati esterni lenti (classifica GR, calendario GR) |

### Invalidazione dopo scrittura

| Operazione | Funzioni da chiamare |
|------------|---------------------|
| Salva risultato/eventi partita | `invalidateDashboardCache()` + `invalidateStatsCache()` |
| Archivia/sblocca/elimina partita | `invalidateDashboardCache()` + `invalidateStatsCache()` |
| Elimina tutte le partite | `invalidateDashboardCache()` + `invalidateStatsCache()` |
| Modifica roster | `invalidateStatsCache()` |
| Salva presenze allenamento | `invalidateDashboardCache()` |

### Lazy loading obbligatorio

API esterne lente (>500ms) DEVONO essere caricate DOPO il render iniziale:
1. Mostra subito dati DB veloci (~150ms)
2. Placeholder visibile per sezione lazy
3. Carica dati esterni senza bloccare UI

### Cosa NON cachare

- Token/auth, dati in editing attivo, risposte di scrittura

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
3. **Test funzionale** (vedi sezione sotto)
4. Aggiorna documentazione (DEVELOPMENT_PLAN.md changelog + eventuali AGENTS.md/project-rules.md)
5. Commit con messaggio descrittivo
6. Push su main → deploy automatico Vercel (SOLO con conferma utente)

> ⚠️ **REGOLA**: Aggiornare SEMPRE la documentazione (changelog, schema, endpoint) ad ogni commit. Non serve che l'utente lo chieda esplicitamente.

---

## 🧪 Test Funzionale Post-Sviluppo (OBBLIGATORIO)

Dopo aver completato una feature o un fix, **prima di proporre commit/push**, l'agente DEVE:

### 1. Chiedere conferma all'utente

```
"Implementazione completata. Vuoi che esegua i test funzionali prima del commit?"
```

Se l'utente conferma (o non si oppone), procedere con il test.

### 2. Eseguire test automatico

Creare un file temporaneo `backend/tmp_test.js` che verifica:

- **CRUD**: Create → Read → Update → Delete su dati di test
- **Logica business**: Simulare i flussi principali toccati dalla modifica
- **Retrocompatibilità**: Verificare che i dati esistenti continuino a funzionare
- **Permessi**: Se la modifica tocca auth/permessi, testare i vari ruoli

### 3. Template test

```javascript
// File: backend/tmp_test.js (eliminare dopo l'uso)
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.csxdlxbhcnyfppojwwzy:Yfm2026Secure!@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    // --- TEST CASES ---
    // 1. Crea dati di test (prefisso 'test.' o email @yfm-test.it)
    // 2. Verifica operazioni
    // 3. Pulisci dati di test (DELETE)
    // 4. Log risultati con ✅/❌
    console.log('\n🎉 Tutti i test passati!');
  } catch(e) {
    console.error('❌ TEST FALLITO:', e.message);
    // Pulisci comunque i dati di test
  } finally {
    client.release();
    await pool.end();
  }
}
run();
```

Eseguire con: `cd backend && /Users/Raffaele/.nvm/versions/node/v24.18.0/bin/node tmp_test.js`

### 4. Regole test

- **Mai toccare dati reali**: usare email `@yfm-test.it` o prefisso `test_` per i dati
- **Sempre pulire**: DELETE dei dati di test alla fine (anche in caso di errore)
- **Eliminare il file**: `rm tmp_test.js` dopo l'esecuzione
- **Riportare risultati**: mostrare all'utente la tabella dei test con esito
- **Se un test fallisce**: correggere il bug PRIMA di proporre il commit

### 5. Cosa testare per tipo di modifica

| Tipo modifica | Test richiesti |
|---|---|
| Nuovo endpoint API | CRUD completo + validazione input + permessi |
| Modifica logica permessi | Tutti i ruoli (superadmin, admin, allenatore, staff, guest) |
| Modifica schema DB | Migrazione + lettura/scrittura nuove colonne + retrocompatibilità |
| Fix bug | Riprodurre il caso che causava il bug + verificare la fix |
| Refactoring | Verificare che output sia identico pre/post refactoring |
| Solo frontend (UI/CSS) | Solo build test (`npm run build`) — no test DB |

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
