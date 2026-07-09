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
3. **`.agents/AGENTS.md`** — **OBBLIGATORIO** se la modifica tocca:
   - Nuovi file/router/helper/middleware backend
   - Nuovi moduli/utils/components frontend
   - Nuove dipendenze (package.json)
   - Nuove tabelle o colonne rilevanti nel DB
   - Cambiamenti architetturali (auth flow, deploy, ecc.)

> ⚠️ I file `PROJECT_STATUS.md` e `.agents/knowledge/ROADMAP.md` sono deprecati.
> La fonte di verità unica è `DEVELOPMENT_PLAN.md`.
> ⚠️ **AGENTS.md** deve essere aggiornato contestualmente ad ogni modifica che cambia struttura file, endpoint, dipendenze o architettura (nuovi router, nuovi helper, nuovi moduli frontend, nuove tabelle DB).

## Schema Database (Fonte di verità)

Le tabelle reali nel DB Supabase sono:
- `workspace`, `season`, `category`, `competition`, `facility`
- `team`, `player`, `team_player`, `staff`, `team_staff`

**Colonne notevoli `category`**: `tipo_campionato TEXT` (Regionale, Provinciale...), `girone TEXT` (lettera girone, es. "E" — auto-salvato da import PDF e config GR)

**Colonne notevoli `player`**: `codice_fiscale TEXT` (UNIQUE partial, nullable — gold standard per matching import), `matricola_figc TEXT` (tessera FIGC)

**Colonne notevoli `team_player`**: `stato TEXT` (Attivo, Infortunato, Svincolato), `aggregato BOOLEAN DEFAULT false` (true se giocatore aggregato da categoria inferiore)
- `match`, `match_event`, `match_formation`, `match_statistics`, `convocation`

**Colonne notevoli `convocation`**: `risposta TEXT` (null=disponibile, 'indisponibile'), `risposta_motivo TEXT`, `risposta_at TIMESTAMPTZ`
- Alla pubblicazione: se atleta ha già assenza per la data → auto `risposta='indisponibile'`
- Batch save (convocazioni-batch): preserva risposte esistenti sui giocatori che restano convocati
- DELETE training_config: cascade elimina allenamenti futuri del giorno rimosso (solo se senza presenze)

**Colonne notevoli `match`**: `tipo_competizione TEXT` (Campionato, Coppa, Torneo [nome], null=Amichevole), `indirizzo_campo TEXT` (indirizzo campo trasferta da PDF SGS), `tc_match_url TEXT` (URL pagina partita Tuttocampo per import formazioni), `live_meta JSONB` (`{stato: '1t'|'intervallo'|'2t'|'fine', start_1t, end_1t, start_2t, end_match}` — lifecycle Live Match Mode), `formazione_meta JSONB` (`{modulo, positions, modulo_finale}` — modulo iniziale + posizioni custom + modulo finale se cambiato durante partita)
- `training`, `training_attendance`, `training_config`, `training_template`
- `valutazione_partita`, `document`
- `users`, `guest_token`
- `import_log`
- `tournament`
- `absence_notification`
- `notification`

**Colonne notevoli `import_log`**: `tipo TEXT` (calendario_pdf, calendario_testo, calendario_tuttocampo, rosa_xls, rosa_tuttocampo, formazioni_tuttocampo), `dettagli JSONB`, `record_importati INT`, `esito TEXT`

**Colonne notevoli `absence_notification`**: `player_id`, `team_id`, `training_id` (nullable, null per sessioni virtuali), `data_allenamento DATE`, `motivo TEXT`, `messaggio TEXT`, `letto BOOLEAN`

**Colonne notevoli `notification`**: `workspace_id`, `team_id`, `tipo TEXT` (convocazione/avviso), `titolo TEXT`, `messaggio TEXT`, `riferimento_id UUID` (es. match_id), `destinatario_profilo TEXT[]` (es. ['segreteria','dirigente']), `destinatario_user_id UUID` (nullable), `created_by UUID`, `letto BOOLEAN`

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
**Colonne notevoli `users`**: `permessi JSONB` (capabilities/profilo: `{rosa: "write", partite: "read", ...}`), `preferenze_ui JSONB` (`{dashboard_layout: {order: [...], hidden: [...]}}`), `squadre_accesso` array di category_id
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
| allenatore | write | write | write | write | read | — | write | read |
| vice_allenatore | read | read | write | write | read | — | — | read |
| dirigente | read | read | read | — | read | write | — | read |
| preparatore | read | — | — | write | read | — | — | — |
| osservatore | read | read | — | — | read | — | — | read |
| segreteria | write | read | write | read | read | write | write | read |
| custom | (personalizzato dall'admin) |

### File di riferimento
- `frontend-v2/src/utils/capabilities.js` — PROFILI, CAPABILITIES, getUserCapabilities()
- `backend/api/helpers/capabilities.js` — mirror CommonJS
- `frontend-v2/src/components/layout/sidebarNav.js` — nav filtrato per capabilities

### Livelli capability: `""` (nessuno), `"read"`, `"write"`

### Logica hasPermission (backend)
- superadmin/admin → sempre `true`
- allenatore → controlla `getUserCapabilities(permessi)[modulo]` (fallback `true` se nessun permesso salvato — legacy)
- staff → controlla `getUserCapabilities(permessi)[modulo]`
- guest → capabilities dal profilo (atleta/genitore)

### Sidebar filtrata
- Ogni voce sidebar richiede una capability specifica (vedi `sidebarNav.js`)
- Admin/Superadmin vedono tutto
- Allenatore vede solo le voci per cui ha almeno `read` nel proprio profilo capabilities (fallback: tutto se nessun permesso)
- Staff vede solo le voci per cui ha almeno `read`
- Guest link: visibile solo per chi ha `guest_links` capability (admin, segreteria, dirigente)

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
- **Versione attuale**: v3.16 (frontend e backend allineati)
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

- **Mobile-first OBBLIGATORIO**: ogni funzionalità (esistente o nuova) DEVE essere ottimizzata per cellulare e tablet
- **Breakpoints di riferimento**: mobile ≤500px, tablet 501-768px, desktop >768px
- **Ogni nuova UI** deve essere testata visivamente su viewport 375px (iPhone) e 768px (tablet) prima del commit
- **Max-width contenuto**: usare `max-width` + `margin: 0 auto` per centrare sezioni
- **Griglie responsive**: usare `grid-template-columns: repeat(auto-fit, minmax(Xpx, 1fr))` oppure media query per collassare a 1 colonna su mobile
- **Flex-direction**: `row` su desktop → `column` su mobile via media query
- **Touch targets**: minimo 44x44px per bottoni/elementi interattivi su mobile
- **No overflow nascosto**: verificare sempre che il contenuto non esca dal viewport su mobile
- **Modali su mobile**: `width:95%; max-height:90vh; overflow-y:auto; margin:16px`
- **Tabelle su mobile**: usare `overflow-x:auto` sul wrapper oppure layout card/stack verticale
- **Tabelle dati numerici su mobile**: usare media query per ridurre padding (`3px 2px`), font (`10px`), e forzare `width` fissa sulle colonne numeriche (es. `22px`) per allineamento
- **Tabelle con colonne miste (testo+numeri)**: numeri sempre `text-align:right` + `font-variant-numeric:tabular-nums` per incolonnamento perfetto

### Standard Tabelle Responsive (DataGrid)

Per tabelle con **5+ colonne** o dati misti (testo + numeri), usare il componente `DataGrid` (`components/DataGrid.js`) che gestisce automaticamente:

| Viewport | Rendering |
|----------|----------|
| Desktop (>500px) | `<table>` con `table-layout:fixed` e `<colgroup>` proporzionale (fr) |
| Mobile (≤500px) | Layout card custom (CSS media query, no JS resize) |

**Pattern mobile per dati raggruppabili** (es. carriera per squadra):
- Header gruppo: logo + nome (bold, 13px)
- Sotto-righe: label secondaria (📅 stagione) + stats inline
- Footer: totali con sfondo `#f0f4ff`

**Pattern mobile per liste flat** (es. ultime partite):
- Riga unica: logo + nome a sinistra, stats + meta a destra (`justify-content:space-between`)
- Stats compatte: emoji + valore bold, gap 6-8px

**Regole DataGrid mobile**:
- Mai più di 6-7 stat icons per riga (altrimenti wrappa)
- Logo squadra: 16-18px, `border-radius:50%`, `object-fit:contain`, con `onerror` fallback
- Font stats: 12px, `font-variant-numeric:tabular-nums`
- Padding card: 6-8px verticale, 14px orizzontale
- Separatore: `border-bottom:1px solid #f0f0f0`
- Il desktop NON viene mai toccato quando si modifica il mobile

**Come aggiungere loghi**:
- Workspace corrente: `window.YFM.getWorkspaceLogo()`
- Avversari/altre squadre: endpoint backend con `findLogo()` da tabella `team_logo`
- Fallback: emoji 🛡️ (carriera) o nessun logo (partite)
- **Layout desktop vs mobile diverso**: usare `window.innerWidth >= 900` per rendering condizionale (non solo CSS) quando la struttura HTML deve cambiare radicalmente
- **Sezioni GR (classifica/calendario/marcatori)**: su desktop card unica con `gr-grid` 2 colonne; su mobile card separate con sfondo sfumato individuale
- **Sfondi sfumati sezioni**: usare gradienti pastello leggeri per distinguere visivamente le aree (es. blu `#f0f4ff→#e8eeff`, verde `#f0fdf4→#e6f9ed`, arancio `#fef7ed→#fdf2e4`)
- **Landscape mobile**: layout permesso (manifest `orientation: any`), toast discreto "usa formato verticale" su device touch <900px in landscape, CSS compatto (header 48px, padding ridotto)
- **Font size minimo**: 12px su mobile per leggibilità
- **Padding/gap ridotti**: su mobile usare gap/padding più compatti (8-12px vs 16-20px desktop)

### Logo squadra (workspace) — Regole d'uso

Il logo della squadra corrente è disponibile globalmente tramite:

```javascript
// Logo URL (es. "/logos/albalonga.png") — mai null dopo init
window.YFM.getWorkspaceLogo()

// Nome società (es. "Albalonga") — mai null dopo init
window.YFM.getSocietaName()
```

**Regole:**

| Regola | Dettaglio |
|---|---|
| Mai check ridondante | ❌ `window.YFM.getWorkspaceLogo ? window.YFM.getWorkspaceLogo() : null` → ✅ `window.YFM.getWorkspaceLogo()` (la funzione esiste sempre) |
| Stile logo inline | `width:18px; height:18px; border-radius:50%; object-fit:contain;` + `onerror="this.style.display='none'"` |
| Logo header | 40x40px, `border-radius:8px` |
| Logo report/PDF | `height:60px; object-fit:contain` |
| Matching nome squadra | `v.toLowerCase().includes(window.YFM.getSocietaName().toLowerCase())` per capire se una riga è "la nostra squadra" |
| Fallback | Se logo non disponibile: nessun placeholder (nascondere con `display:none` via onerror) |
| Avversari | Usare endpoint backend `findLogo()` da tabella `team_logo` — NON hardcodare path |
| No variabili locali duplicate | Dichiarare `const wsLogo = window.YFM.getWorkspaceLogo()` UNA volta per funzione/scope |

**Dove si usa il logo workspace:**
- Header app (40x40)
- Dashboard (prossima partita, ultime partite)
- Match Center (header partita)
- Carriera giocatore (tabella desktop + card mobile)
- Convocazioni PDF
- Report PDF
- Tornei

---

### Colori e stile card

- Card: `background:white; border-radius:12px; padding:16px; border:1px solid #eee`
- Badge/chip colorati: usare sfondo pastello + testo scuro (es. `background:#eef2ff; color:#4338ca; border:1px solid #c7d2fe`)
- Mai grigio chiaro (`#f5f5f5`) per elementi interattivi — usare colori che si distinguano
- Hover: leggero `transform` o `box-shadow`, mai solo cambio colore

### Match Center — Tab e Panel

- Ogni tab panel usa la classe `mc-qa-card` per contenuto (max-width:600px, centrato)
- Tab switching: `panelMap = { events: 'mcBodyEvents', formation: 'mcBodyFormation', notes: 'mcBodyNotes' }`
- Nuovi panel: aggiungere in `getBody()`, registrare in `panelMap`, bind nel handler tab click
- Textarea/input nei panel: sempre `box-sizing:border-box` + `width:100%`

### Interazioni touch/mobile

- **Drag & drop**: funziona solo su desktop. Su mobile usare **two-tap flow** (tap per selezionare → tap per posizionare)
- **Selezione attiva**: evidenziare con colore brand (`#667eea` sfondo, testo bianco)
- **Feedback visivo**: sempre mostrare stato selezionato/hover/attivo

---

## 🚨 Gestione Errori DB (OBBLIGATORIO)

### Helper centralizzato: `backend/api/helpers/dbErrors.js`

Tutti gli errori Supabase/Postgres su operazioni di scrittura (INSERT/UPDATE) DEVONO essere gestiti tramite `handleDbError(error, res)` anziché restituire `error.message` raw.

```javascript
const { handleDbError } = require('../helpers/dbErrors');

// ❌ VIETATO (espone errore tecnico Postgres all'utente)
if (error) return res.status(400).json({ error: error.message });

// ✅ OBBLIGATORIO (messaggio user-friendly in italiano)
if (error) return handleDbError(error, res);
```

### Mappatura constraint → messaggio

| Constraint | Messaggio utente |
|---|---|
| `idx_player_codice_fiscale` | "Esiste già un giocatore con questo Codice Fiscale" |
| `users_email_key` | "Esiste già un utente con questa email" |
| `team_logo_nome_normalizzato_key` | "Logo già presente per questa squadra" |
| `convocation_match_id_team_player_id_key` | "Giocatore già convocato per questa partita" |
| `match_statistics_match_id_team_player_id_key` | "Statistiche già registrate per questo giocatore in questa partita" |
| `training_attendance_training_id_team_player_id_key` | "Presenza già registrata per questo allenamento" |
| `team_staff_team_id_staff_id_ruolo_squadra_key` | "Staff già assegnato con questo ruolo" |

### Quando usare `handleDbError`

- **SEMPRE** su endpoint che fanno `.insert()` o `.update()` su tabelle con UNIQUE constraint
- In particolare: `player` (CF), `users` (email), `team_logo`, `convocation`, `match_statistics`, `training_attendance`, `team_staff`
- Per errori non-duplicate, il helper restituisce comunque `error.message` con status 400

### Aggiungere nuovi constraint

Se si aggiunge un nuovo UNIQUE constraint al DB, aggiungere la mappatura in `DUPLICATE_MESSAGES` dentro `dbErrors.js`.

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

## ⚡ Performance Backend (OBBLIGATORIO)

### Regola #1: Parallelizzare query indipendenti

Se un endpoint esegue 2+ query che NON dipendono l'una dall'altra, usare SEMPRE `Promise.all`.

```javascript
// ❌ VIETATO (sequenziale — 3x latenza)
const { data: events } = await supabase.from('match_event').select(...);
const { data: convs } = await supabase.from('convocation').select(...);
const { data: stats } = await supabase.from('match_statistics').select(...);

// ✅ OBBLIGATORIO (parallelo — 1x latenza)
const [{ data: events }, { data: convs }, { data: stats }] = await Promise.all([
  supabase.from('match_event').select(...),
  supabase.from('convocation').select(...),
  supabase.from('match_statistics').select(...)
]);
```

### Regola #2: Evitare JOIN Supabase su tabelle grandi

I JOIN con `select('*, relazione:fk(colonne)')` sono costosi. Preferire:
- Fetch separato + map in memoria (più veloce per >100 righe)
- Selezionare SOLO le colonne necessarie (mai `select('*')` su tabelle grandi)

```javascript
// ❌ LENTO (JOIN su 3000+ righe)
const { data } = await supabase.from('training_attendance')
  .select('*, training:training_id(id, data_ora, team_id)').in('training_id', ids);

// ✅ VELOCE (fetch separato + map)
const { data: trainings } = await supabase.from('training').select('id, data_ora').in('id', ids);
const dateMap = {};
trainings.forEach(t => { dateMap[t.id] = t.data_ora; });
const { data } = await supabase.from('training_attendance')
  .select('id, training_id, team_player_id, presente, motivi_assenza').in('training_id', ids);
```

### Regola #3: Riutilizzare dati già fetchati

Se un endpoint ha già fetchato dei dati, NON fare una seconda query per un sottoinsieme degli stessi dati. Filtrare in memoria.

```javascript
// ❌ VIETATO (doppia query sugli stessi dati)
const { data: presenze } = await supabase.from('training_attendance').select('team_player_id, presente')...;
const { data: motivi } = await supabase.from('training_attendance').select('team_player_id, motivi_assenza').eq('presente', false)...;

// ✅ OBBLIGATORIO (una query, filtra in memoria)
const { data: presenze } = await supabase.from('training_attendance').select('team_player_id, presente, motivi_assenza')...;
const motivi = presenze.filter(p => !p.presente);
```

### Regola #4: Selezionare solo colonne necessarie

Mai usare `select('*')` su tabelle con molte colonne o molte righe. Specificare sempre le colonne.

### Regola #5: Batch fetch con limite Supabase

Supabase ha un hard limit di 1000 righe. Per tabelle grandi:
- Batch per 20 IDs con `.in('campo', batch).range(0, 9999)`
- Mai `.limit(N)` da solo (non supera il limite)

### Regola #6: Endpoint aggregati per pagine complesse

Se una pagina frontend fa 3+ chiamate API indipendenti, creare un **endpoint aggregato** backend che le unifica in una sola risposta.

```javascript
// ❌ VIETATO (frontend fa 5 chiamate parallele)
const [stats, top, partite, allenamenti, injuries] = await Promise.all([
  apiFetch('/stats'), apiFetch('/top'), apiFetch('/partite'), apiFetch('/allenamenti'), apiFetch('/injuries')
]);

// ✅ OBBLIGATORIO (1 sola chiamata, backend aggrega)
const dashData = await apiFetch('/squadre/:id/dashboard');
// Backend fa le 5 query in Promise.all e restituisce tutto insieme
```

### Regola #7: Includere dati correlati nel JOIN iniziale

Se un endpoint fetcha una tabella e poi fa una query separata per dati correlati (es. player per certificati), includere quei campi nel JOIN iniziale.

```javascript
// ❌ VIETATO (query separata per dati già raggiungibili via JOIN)
const { data: players } = await supabase.from('team_player').select('id, player:player_id(id, nome)')...;
// ... poi più avanti:
const { data: certs } = await supabase.from('player').select('id, data_visita_medica').in('id', playerIds);

// ✅ OBBLIGATORIO (includi nel JOIN iniziale)
const { data: players } = await supabase.from('team_player')
  .select('id, player:player_id(id, nome, cognome, data_visita_medica)')...;
// Usa players direttamente per i certificati, zero query extra
```

### Benchmark di riferimento (Luglio 2025)

| Endpoint | Target | Accettabile |
|----------|--------|-------------|
| GET semplice (config, calciatori) | <300ms | <500ms |
| GET con aggregazione (stats, summary) | <500ms | <1000ms |
| GET con batch fetch (presenze, formazioni) | <800ms | <1500ms |
| POST/PUT/DELETE | <300ms | <500ms |

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

---

## 🚀 Performance Frontend Init (OBBLIGATORIO)

### Regola #1: Mai bloccare il render con chiamate non essenziali

Chiamate come `/auth/me` (refresh profilo) devono essere **fire-and-forget** — non attendere il risultato prima di navigare alla dashboard.

```javascript
// ❌ VIETATO (blocca render per 400ms)
const mePromise = apiFetch('/auth/me');
await mePromise;
navigateTo('dashboard');

// ✅ OBBLIGATORIO (fire-and-forget)
apiFetch('/auth/me').then(u => setUser(u)).catch(() => {});
navigateTo('dashboard');
```

### Regola #2: Eliminare chiamate API duplicate

Se due moduli chiamano lo stesso endpoint (es. `/auth/workspaces`), fetchare UNA volta e condividere il risultato.

```javascript
// ❌ VIETATO (stessa API chiamata 2 volte in parallelo)
await Promise.all([loadWorkspaceInfo(), loadSquadre()]);
// entrambi chiamano /auth/workspaces internamente!

// ✅ OBBLIGATORIO (fetch una volta, condividi)
const workspaces = await apiFetch('/auth/workspaces');
window.YFM.workspaceInfo = workspaces[0];
await Promise.all([loadWorkspaceInfo(), loadSquadre()]);
// entrambi trovano workspaceInfo già settato, skip fetch
```

### Regola #3: Usare dati dall'endpoint aggregato

Se il backend restituisce dati aggregati (es. `/dashboard` include certificati + infortuni), il frontend NON deve fare chiamate separate per gli stessi dati.

```javascript
// ❌ VIETATO (ri-fetcha dati già disponibili)
const dashData = await apiFetch('/dashboard'); // include certificati
apiFetch('/calciatori').then(p => renderCertificati(p)); // RIDONDANTE!

// ✅ OBBLIGATORIO (usa dati già ricevuti)
const dashData = await apiFetch('/dashboard');
renderCertificati(dashData.certificati); // zero chiamate extra
```

### Regola #4: Sequenza init ottimale

```
1. DOMContentLoaded → setupLayout (sincrono)
2. Fetch workspace info (1 chiamata)
3. Promise.all([loadWorkspaceInfo, loadSquadre]) — workspace già in memoria
4. navigateTo('dashboard') — render immediato
5. Dashboard: 1 chiamata aggregata + lazy GR (sessionStorage cache)
6. Background: /auth/me, preferences, notifiche (non bloccanti)
```

### Target tempi caricamento (cold start)

| Fase | Target | Accettabile |
|------|--------|-------------|
| Init (fino a navigateTo) | <1s | <1.5s |
| Dashboard render (dati core) | <1.5s | <2.5s |
| Dashboard completa (lazy incluso) | <3s | <5s |
| Totale percepito dall'utente | <3s | <5s |

## Convenzioni Commit

```
feat: nuova funzionalità
fix: correzione bug
docs: documentazione
refactor: refactoring codice
style: stili (CSS)
```

## 📱 PWA & Offline (Regole)

### Stato attuale
- PWA installabile con `vite-plugin-pwa` (Workbox precache asset statici)
- `registerSW({ registerType: 'autoUpdate' })` in main.js
- Banner offline globale (`initOfflineBanner()`) con stati online/offline
- Buffer localStorage per Match Center eventi/note (`offlineBuffer.js`)
- Auto-sync MC al ritorno online

### Regole sviluppo PWA
- **Mai cachare token/auth** in IndexedDB o SW cache
- **Cache API per workspace+utente**: ogni store IndexedDB deve essere isolato per workspace_id
- **Sync queue FIFO**: operazioni offline eseguite in ordine cronologico al ritorno online
- **Conflitti 409**: drop silenzioso + toast informativo (dato già aggiornato da altro device)
- **Conflitti 401**: pausa sync, richiedi re-login
- **Indicatore visivo obbligatorio**: l'utente deve SEMPRE sapere se sta lavorando offline
- **Pre-fetch proattivo**: quando si apre MC o Presenze, cachare subito i dati necessari
- **Fallback graceful**: se dato non disponibile offline, mostrare messaggio chiaro (non errore generico)
- **Service Worker**: non modificare manualmente `sw.js` (generato da Workbox). Configurare solo via `vite.config.js`
- **Test offline**: prima di committare feature offline, testare con DevTools Network → Offline

### File PWA di riferimento
- `frontend-v2/vite.config.js` — configurazione VitePWA + manifest
- `frontend-v2/src/main.js` — registerSW + initOfflineBanner
- `frontend-v2/src/utils/offlineBuffer.js` — buffer MC (localStorage)
- `frontend-v2/public/icon-*.png` — icone PWA
- `frontend-v2/public/screenshots/` — screenshot per Install UI

### Regole Accessibility (Lighthouse)

Ogni nuova pagina/componente DEVE rispettare:

| Regola | Dettaglio |
|---|---|
| `<meta name="description">` | Presente in `index.html` — non rimuovere |
| `robots.txt` | In `public/robots.txt` — non rimuovere |
| Immagini con `alt` | Ogni `<img>` deve avere attributo `alt` descrittivo (o vuoto `alt=""` se decorativa) |
| Landmark `<main>` | Il contenitore `#app` in index.html è `<main>` — non cambiare in `<div>` |
| Label su select/input | Ogni `<select>` e `<input>` deve avere `<label>` associato (usare classe `sr-only` se non visibile) |
| Heading order | Sequenza h1→h2→h3 senza salti. Dashboard: h1 titolo, h2 sezioni, h3 sotto-sezioni |
| Contrasto colori | Mai usare `#888`, `#999`, `#aaa` per testo su sfondo bianco. Minimo: `#666` (ratio 4.5:1 WCAG AA). Override globale in `style.css` |
| `aria-label` su bottoni icona | Bottoni con solo icona/emoji (es. ☰) devono avere `aria-label` descrittivo |

**Classe utility `sr-only`** (definita in style.css):
```css
.sr-only { position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0; }
```
Usare per label visivamente nascoste ma accessibili a screen reader.

## Workflow Post-Modifica

1. Implementa le modifiche
2. Testa: `cd frontend-v2 && npm run build` + `cd backend && node -c api/index.js`
3. **Test funzionale** (vedi sezione sotto)
4. Aggiorna documentazione (DEVELOPMENT_PLAN.md changelog + eventuali AGENTS.md/project-rules.md)
5. Commit con messaggio descrittivo
6. Push su main → deploy automatico Vercel (SOLO con conferma utente)

> ⚠️ **REGOLA**: Aggiornare SEMPRE la documentazione (changelog, schema, endpoint) ad ogni commit. Non serve che l'utente lo chieda esplicitamente.

### Regola documentazione post-modifica (OBBLIGATORIA)

Al termine di ogni task che aggiunge nuove funzionalità o modifica significativamente quelle esistenti, l'agente DEVE **autonomamente** (senza che l'utente lo chieda):

1. **Aggiornare il changelog** in `DEVELOPMENT_PLAN.md` con una riga descrittiva della modifica
2. **Aggiornare `AGENTS.md`** se la modifica tocca: nuovi file, endpoint, moduli, dipendenze, tabelle DB, flussi architetturali
3. **Aggiornare `DATABASE_SCHEMA.md`** se la modifica tocca colonne o tabelle del DB
4. **Aggiornare `project-rules.md`** se la modifica introduce nuove convenzioni, pattern o regole operative
5. **Aggiornare l'help in-app** (`helpData.js`) se la modifica:
   - Aggiunge una nuova pagina/modulo → aggiungere voce in `PAGE_HELP`
   - Aggiunge elementi interattivi complessi → aggiungere `data-help` + voce in `ELEMENT_HELP`
   - Modifica significativamente il comportamento di una funzionalità già documentata → aggiornare la descrizione esistente
   - Rimuove una funzionalità → rimuovere la voce corrispondente

Questo step è parte integrante del completamento del task — un task NON è considerato completato finché la documentazione non è aggiornata.

### File help di riferimento
- `frontend-v2/src/components/helpData.js` — `PAGE_HELP` (popover "?") + `ELEMENT_HELP` (help interattivo)
- `frontend-v2/src/components/PageHelp.js` — logica help (non modificare se non necessario)
- Attributo `data-help="pagina.elemento"` sugli elementi HTML per l'help interattivo

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
