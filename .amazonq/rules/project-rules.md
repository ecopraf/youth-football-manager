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

1. **`.agents/plans/DEVELOPMENT_PLAN.md`** — ⭐ FONTE DI VERITÀ: stato, task, priorità, dipendenze (epic attivi)
2. **`backend/.env`** — Credenziali DB, Supabase, JWT
3. **`.agents/AGENTS.md`** — Entry point, schema DB, comandi, workflow, **global state frontend**

> Epic completati sono in **`.agents/plans/DEVELOPMENT_PLAN_ARCHIVE.md`** — consultare solo se serve storia pregressa, NON leggere di default.

Solo dopo aver letto questi file l'agente può procedere con il task richiesto dall'utente.

**Documentazione modulare** (consultare solo quando si lavora sul modulo specifico):
- `frontend-v2/src/modules/NOME/NOME_MODULE.md` — endpoint, tabelle DB, variabili YFM, dipendenze, note critiche per quel modulo
- `frontend-v2/src/UTILS_COMPONENTS.md` — utils e components trasversali (DataGrid, offlineBuffer, charts, ecc.)

### Checklist pre-implementazione (OBBLIGATORIA)

Prima di scrivere QUALSIASI codice frontend, verificare:
- [ ] Quali variabili `window.YFM.*` servono? (consultare sezione "Frontend Global State" in AGENTS.md)
- [ ] L'endpoint backend esiste già? (consultare sezione "Backend Files" in AGENTS.md — ogni router ha la mappa endpoint inline. Se non presente, verificare con `grep "router\." routes/NOME.js` prima di scrivere qualsiasi path frontend)
- [ ] Le tabelle DB esistono? (consultare DATABASE_SCHEMA.md)
- [ ] Il modulo è registrato nel router? (consultare `router.js`)
- [ ] La sidebar ha la voce? (consultare `sidebarNav.js`)
- [ ] Serve un util/component trasversale già esistente? (consultare `src/UTILS_COMPONENTS.md`)

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

### ⚠️ Prevenzione Timeout (CRITICO)

L'agente ha un limite di tempo per risposta. Per evitare timeout:

1. **Mai riscrivere un file intero** con `fsWrite create` se il file supera 100 righe. Usare SEMPRE `fsReplace` con diff mirati
2. **Max 3-4 `fsReplace` diffs per chiamata** su file grandi (>300 righe). Se servono più modifiche, suddividere in step separati
3. **Un file per step**: se un task richiede modifiche a 3+ file, fare un file alla volta con build test intermedio
4. **Leggere solo le righe necessarie**: usare `sed -n 'X,Yp'` per leggere sezioni specifiche invece di `fsRead` su file grandi
5. **Build test dopo ogni file modificato** (non accumulare modifiche senza verificare)
6. **Se un task tocca un file con molti riferimenti da sostituire** (es. rinominare una variabile usata 10+ volte), suddividere in:
   - Step A: sostituzioni nella funzione `render()` 
   - Step B: sostituzioni nella funzione `wizard()`
   - Step C: sostituzioni nelle funzioni helper
   - Step D: rimozione codice morto
7. **Grep prima, replace dopo**: sempre verificare con `grep -n` quanti riferimenti esistono prima di iniziare le sostituzioni
8. **Mai combinare analisi + implementazione**: se serve capire la struttura di un file grande, farlo in uno step separato (solo lettura), poi implementare nello step successivo

**Soglie operative:**
| Operazione | Limite sicuro | Rischio timeout |
|---|---|---|
| `fsReplace` diffs su stesso file | ≤4 diffs | >6 diffs |
| Righe totali modificate per step | ≤80 righe | >150 righe |
| File modificati per step | ≤2 file | >3 file |
| `fsRead` dimensione file | ≤300 righe | >500 righe (usare sed) |

**Pattern sicuro per refactoring ampi:**
```
Step 1: grep -n per mappare tutti i riferimenti
Step 2: fsReplace su funzione A (max 3 diffs)
Step 3: build test
Step 4: fsReplace su funzione B (max 3 diffs)  
Step 5: build test
Step 6: rimuovere codice morto
Step 7: build test finale
```

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

**IMPORTANTE — RLS su nuove tabelle**: ogni volta che si crea una nuova tabella su Supabase, abilitare subito RLS e aggiungere una policy `deny anon`. Il backend usa `service_role` e non è impattato. Senza questa operazione la tabella è leggibile pubblicamente via REST API con l'anon key.
```javascript
await client.query(`ALTER TABLE public.NOME_TABELLA ENABLE ROW LEVEL SECURITY`);
await client.query(`CREATE POLICY "deny_anon_NOME_TABELLA" ON public.NOME_TABELLA FOR ALL TO anon USING (false)`);
```

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
   - **Nuove variabili `window.YFM.*` o helper functions** → aggiornare sezione "Frontend Global State"
   - **Rinomina/rimozione variabili globali** → aggiornare tabella "Errori comuni da evitare"
   - **Nuove tabelle nella gerarchia dati** → aggiornare albero "Gerarchia dati (DB → Frontend)"
4. **`frontend-v2/src/components/helpData.js`** — **OBBLIGATORIO** se la modifica aggiunge una nuova pagina o funzionalità visibile all'utente. Aggiungere entry con chiave = nome pagina nel router.
5. **`frontend-v2/src/modules/NOME/NOME_MODULE.md`** — **OBBLIGATORIO** se la modifica tocca un modulo esistente e cambia:
   - Endpoint usati (aggiunti, rimossi, rinominati)
   - Tabelle DB toccate dal modulo
   - Variabili `window.YFM.*` usate
   - Dipendenze tra file frontend del modulo
   - Note critiche o comportamenti non ovvi
   - Capabilities richieste
6. **`frontend-v2/src/UTILS_COMPONENTS.md`** — **OBBLIGATORIO** se la modifica tocca un util o component trasversale (`utils/`, `components/`) e cambia la sua API, il suo comportamento o i moduli che lo usano.

> ⚠️ I file `PROJECT_STATUS.md` e `.agents/knowledge/ROADMAP.md` sono deprecati.
> La fonte di verità unica è `DEVELOPMENT_PLAN.md`.
> ⚠️ **AGENTS.md** deve essere aggiornato contestualmente ad ogni modifica che cambia struttura file, endpoint, dipendenze o architettura (nuovi router, nuovi helper, nuovi moduli frontend, nuove tabelle DB).
> ⚠️ **Tutti gli aggiornamenti docs/help vanno fatti NELLO STESSO task**, non come step separato da confermare. Sono parte integrante dell'implementazione.
> ⚠️ **Il changelog in DEVELOPMENT_PLAN.md va aggiornato NELLO STESSO COMMIT** dei file modificati — mai in un commit separato. Il messaggio di commit e la riga changelog devono essere coerenti. Se si dimentica, aggiornare nel commit successivo prima del push.

## Schema Database (Fonte di verità)

Le tabelle reali nel DB Supabase sono:
- `workspace`, `workspace_anagrafica`, `season`, `category`, `competition`, `facility`
- `team`, `player`, `team_player`, `staff`, `team_staff`

**Colonne notevoli `category`**: `tipo_campionato TEXT` (Regionale, Provinciale...), `girone TEXT` (lettera girone, es. "E" — auto-salvato da import PDF e config GR)

**Colonne notevoli `player`**: `codice_fiscale TEXT` (UNIQUE partial, nullable — gold standard per matching import), `matricola_figc TEXT` (tessera FIGC)

**Colonne notevoli `team_player`**: `stato TEXT` (Attivo, Infortunato, Svincolato), `aggregato BOOLEAN DEFAULT false` (true se giocatore aggregato da categoria inferiore), `capitano BOOLEAN DEFAULT false`, `vice_capitano BOOLEAN DEFAULT false`
- `match`, `match_event`, `match_formation`, `match_statistics`, `convocation`

**Colonne notevoli `convocation`**: `risposta TEXT` (null=disponibile, 'indisponibile'), `risposta_motivo TEXT`, `risposta_at TIMESTAMPTZ`
- Alla pubblicazione: se atleta ha già assenza per la data → auto `risposta='indisponibile'`
- Batch save (convocazioni-batch): preserva risposte esistenti sui giocatori che restano convocati
- DELETE training_config: cascade elimina allenamenti futuri del giorno rimosso (solo se senza presenze)

**Colonne notevoli `match`**: `tipo_competizione TEXT` (Campionato, Coppa, Torneo [nome], null=Amichevole), `indirizzo_campo TEXT` (indirizzo campo trasferta da PDF SGS), `tc_match_url TEXT` (URL pagina partita Tuttocampo per import formazioni), `live_meta JSONB` (`{stato: '1t'|'intervallo'|'2t'|'fine', start_1t, end_1t, start_2t, end_match}` — lifecycle Live Match Mode), `formazione_meta JSONB` (`{modulo, positions, modulo_finale}` — modulo iniziale + posizioni custom + modulo finale se cambiato durante partita), `distinta_meta JSONB` (`{assistente_arbitro, matricola_assistente, tessera_assistente}` — dati compilati dal form Compila distinta)

**⚠️ Convenzione gol (CRITICA)**:
- `gol_casa` = **gol fatti dalla NOSTRA squadra** (sempre, indipendentemente da Casa/Trasferta)
- `gol_ospite` = **gol fatti dall'AVVERSARIO** (sempre, indipendentemente da Casa/Trasferta)
- Il campo `luogo` (Casa/Trasferta) indica solo DOVE si gioca, NON chi è "casa" nel punteggio
- Vittoria = `gol_casa > gol_ospite`, Sconfitta = `gol_casa < gol_ospite`
- Import da fonti esterne (GR, Tuttocampo, Sheets): se il dato è in formato "casa-ospite" reale, INVERTIRE per trasferte

**Codici tipo_evento (OBBLIGATORI)**: `GOAL`, `ASSIST`, `SUB`, `YELLOW`, `RED`, `SUBITO`, `AUTOGOL`, `IN`, `OUT`
- ❌ MAI usare: `GOL`, `ASS`, `AMMONIZIONE`, `ESPULSIONE` (codici errati che non matchano la lookup table)
- `training`, `training_attendance`, `training_config`, `training_template`
**Colonne notevoli `valutazione_partita`**: `voto NUMERIC` (nullable — null = SV, nessun voto numerico), `nota_allenatore TEXT`

- `users`, `guest_token`
- `import_log`
- `tournament`
- `kit_template`, `kit_stock`, `kit_assignment`, `kit_bundle`

**Colonne notevoli `kit_bundle`**: `template_id UUID`, `taglia TEXT`, `numero_kit INT`, `stato TEXT` (integro/assegnato/parziale/saccheggiato/incompleto/da_riordinare), `pezzi_in_attesa JSONB DEFAULT '[]'` (array nomi articoli non ancora consegnati dal fornitore)
**Colonne notevoli `kit_assignment`**: `player_id UUID` (nullable — null per staff), `staff_id UUID` (nullable — null per giocatori), `kit_stock_id UUID`, `bundle_id_originale UUID` (bundle da cui proviene il pezzo), `sostituzioni JSONB` (array `{articolo, motivo, costo, note, stato: 'in_attesa'|'sostituito', data}`)
**Regola kit_assignment**: esattamente uno tra `player_id` e `staff_id` deve essere valorizzato. Kit staff visibile cross-categoria (query su `staff_id` senza filtro `team_id`).
**Stato bundle**: `parziale` = assegnato con pezzi in attesa fornitore (temporaneo, si risolve con `PUT /kit-bundles/segna-arrivati`). `incompleto` = sostituzione non trovata (permanente).
**Colonne notevoli `kit_template`**: `is_portiere BOOLEAN DEFAULT false` — se true, pre-compila con articoli da portiere (Maglia/Pantaloncino/Calzettoni portiere + Guanti). Badge 🧤 in lista e magazzino. `numero_maglia` (calcolato da `kit_stock.numero` del primo articolo `ha_numero=true` per bundle — restituito da `GET /kit-bundles`).

- `absence_notification`
- `notification`
- `fee`, `fee_config`, `fee_installment`

**Colonne notevoli `fee`**: `fee_config_id UUID`, `player_id UUID`, `team_id UUID`, `season_id UUID`, `importo_totale NUMERIC(10,2)`, `importo_pagato NUMERIC(10,2) DEFAULT 0` (fonte di verità per rigenerazione — aggiornato da endpoint pay/unpay), `stato TEXT` (da_pagare, parziale, pagata)

**Colonne notevoli `fee_config`**: `workspace_id UUID`, `nome TEXT`, `importo_totale NUMERIC(10,2)`, `rate JSONB` (array di {importo, scadenza_label, scadenza}), `category_id UUID` (nullable), `attiva BOOLEAN`

**Colonne notevoli `fee_installment`**: `fee_id UUID`, `numero_rata INT`, `importo NUMERIC(10,2)`, `scadenza DATE`, `scadenza_label TEXT`, `stato TEXT` (da_pagare, pagata, parziale), `data_pagamento DATE`, `metodo_pagamento TEXT`, `ricevuta_numero TEXT`, `note TEXT`, `ricevuta_path TEXT` (null = nessuna ricevuta, `archived:<path>` = archiviata e rimossa da Storage)

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

**Struttura `workspace`**: solo `nome`, `nome_breve`, `logo_url`, `checklist_template`, `data_creazione` — gestito dal superadmin.
**Struttura `workspace_anagrafica`**: tutti i dati societari (`forma_giuridica`, `matricola_figc`, `p_iva`, `codice_fiscale`, `sdi`, `iban`, `indirizzo`, `telefono`, `email`, `sito_web`, `facebook`, `instagram`, `colori_sociali`, `sponsor_tecnico`, `nome_campo`, `indirizzo_campo`) — modificabile da admin/segreteria via `GET/PUT /api/workspaces/:id/anagrafica`. Parser unificato TC+testo libero: `parseSocietaText()` in `club.js` e `workspaces.js`.

**NON ESISTONO PIÙ**:
- Workspace demo `ASD Green Academy` (ID: `00000000-...`) — eliminato
- Workspace `SSD New Team` (ID: `22222222-...`) — eliminato

## Regole Colonne team_player (OBBLIGATORIO)

Quando si aggiunge una colonna a `team_player`, va aggiunta in **TUTTI** gli endpoint che joinano quella tabella:

1. `GET /api/squadre/:id/calciatori` — select + mapping nella risposta
2. `GET /api/calciatori/:id` — select nel join team_player + assegnazione a `data.*` (ENTRAMBI i rami: con e senza `squadraId`)
3. `PUT /api/calciatori/:id` — gestione nel blocco `tpUpdate`

**Checklist nuova colonna team_player:**
- [ ] Aggiunta colonna nel DB (migrazione)
- [ ] `GET /squadre/:id/calciatori` → aggiunta nel `.select()` E nel `.map()` della risposta
- [ ] `GET /calciatori/:id` → aggiunta nel `.select()` del join E nel `data.campo = tp.campo` (2 punti: con squadraId e senza)
- [ ] `PUT /calciatori/:id` → gestione in `tpUpdate` con condizione `!== undefined`
- [ ] Frontend: form di modifica (roster + playerDetail) include il campo
- [ ] Frontend: visualizzazione (griglia roster, dettaglio) mostra il campo

## Nomi Categorie nel DB

Le categorie nel DB usano il formato **abbreviato**: `U14`, `U15`, `U16` (NON "Under 14", "Under 15").

Quando si scrive logica basata sul nome categoria, usare regex che copra entrambi i formati:
```javascript
/u(?:nder)?\s*(?:1[4-9]|[2-9]\d)|juniores|primavera/i
```

**Settore Giovanile Agonistico**: da U14 in su (U14, U15, U16, U17, U18, U19, Juniores, Primavera)
**Scuola Calcio**: tutto il resto (Piccoli Amici, Pulcini, Esordienti, U8-U13)

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

| Profilo | rosa | partite | formazione | allenamenti | statistiche | guest_links | import | report | quote |
|---------|------|---------|------------|-------------|-------------|-------------|--------|--------|-------|
| allenatore | write | write | write | write | read | — | write | read | — |
| vice_allenatore | read | read | write | write | read | — | — | read | — |
| dirigente | read | read | read | — | read | write | — | read | — |
| preparatore | read | — | — | write | read | — | — | — | — |
| osservatore | read | read | — | — | read | — | — | read | — |
| segreteria | write | read | write | read | read | write | write | read | write |
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
- guest → capabilities dal profilo (`famiglia` o `ospite`)

### Sidebar filtrata
- Ogni voce sidebar richiede una capability specifica (vedi `sidebarNav.js`)
- Admin/Superadmin vedono tutto
- Allenatore vede solo le voci per cui ha almeno `read` nel proprio profilo capabilities (fallback: tutto se nessun permesso)
- Staff vede solo le voci per cui ha almeno `read`
- Guest link: visibile solo per chi ha `guest_links` capability (admin, segreteria, dirigente)

### Tipi Guest (OBBLIGATORIO — fonte di verità)

| Valore DB (`guest_token.tipo`) | Label UI | Home caricata | Accesso quote/tesseramento |
|---|---|---|---|
| `famiglia` | 👨‍👩‍👦 Famiglia | `guestAtleta.js` | ✅ Sì (ha `player_id`) |
| `ospite` | 👋 Ospite | `guestGenitore.js` | ❌ No (solo partite/risultati) |

**Regola**: `ospite` è un link di cortesia per amici/parenti — NON vede quote, tesseramento, convocazioni personali, né upload ricevute. Solo calendario partite e risultati pubblici.

**⚠️ Nomi storici da NON usare nel codice**: `atleta`, `genitore` — questi erano nomi di un refactoring intermedio (EPIC 11) mai completato nel DB. I valori reali nel DB sono `famiglia` e `ospite`.

**⚠️ Controllo tipo guest (CRITICO)**: in `setupGuestLayout` e ovunque si distingua il tipo guest, usare SEMPRE `tipo === 'famiglia'` (NON `tipo === 'atleta'`). Stesso vale per `sessionStorage.getItem('guest_tipo') === 'famiglia'`.

**⚠️ JWT guest in sessionStorage**: il JWT non è in `sessionStorage.getItem('yfm_guest_jwt')` (non esiste). È dentro l'oggetto `yfm_guest`:
```javascript
// ❌ SBAGLIATO
const token = sessionStorage.getItem('yfm_guest_jwt');
// ✅ CORRETTO
const guestRaw = sessionStorage.getItem('yfm_guest');
let token = null;
try { token = guestRaw ? JSON.parse(guestRaw).jwt : null; } catch { token = null; }
```

**⚠️ Variabili guest in memoria**: `window.YFM.guestPlayerId/guestTeamId/guestPlayerName` sono settate solo al login guest e non sopravvivono a navigazione/reload. Ogni modulo guest DEVE ripristinarle da `sessionStorage('yfm_guest')` come fallback (vedi pattern in AGENTS.md).

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
- **Landing page**: la versione aggiornata si trova in `youth-football-manager-demo/landing/` (repo separato). La cartella `youth-football-manager/landing/` è obsoleta e non va modificata. Per aggiornare la landing, lavorare sul repo `youth-football-manager-demo`. Il deploy **NON è automatico**: dopo il push, eseguire manualmente:
  ```bash
  cd youth-football-manager-demo/landing
  vercel --prod
  ```
  Il progetto Vercel si chiama `yfm-landing` → https://yfm-landing.vercel.app
- **Landing page — `index.html`**: contiene un logo base64 molto lungo. Usare SEMPRE `grep -n 'testo' index.html | grep -v base64` per localizzare le righe e `sed -n 'X,Yp'` per leggere solo la sezione necessaria. MAI `fsRead` sull'intero file.
- **La registrazione è solo per admin/superadmin** — non esporre endpoint pubblici di registrazione
- **Tutti gli endpoint di scrittura** (POST/PUT/DELETE) devono avere `authMiddleware`
- **Nessun `console.log` di debug** nel codice pushato in produzione
- **Build test obbligatorio** prima di ogni commit (`npm run build` nel frontend, `node -c api/index.js` nel backend)
- **Guard post-await obbligatorio** in ogni funzione `load*()` frontend: dopo chiamate async, verificare sempre che `#pageContent` sia ancora quello catturato prima degli await. Pattern obbligatorio:
  ```javascript
  export default async function loadXxx() {
    const c = document.getElementById('pageContent');
    // ... await chiamate API ...
    if (document.getElementById('pageContent') !== c) return; // utente ha navigato via
    render(c);
  }
  ```
  Nel `catch`, stessa verifica prima di mostrare l'errore: `if (document.getElementById('pageContent') === c) c.innerHTML = '...'`
- **`loadData()` obbligatorio alla fine di `load*()`**: ogni funzione `load*()` che costruisce il DOM e registra event listener DEVE chiamare `await loadData()` come ultimo step. Senza questa chiamata la pagina viene renderizzata vuota. Pattern:
  ```javascript
  export default async function loadXxx() {
    const c = document.getElementById('pageContent');
    c.innerHTML = `...HTML...`;
    // registra event listener
    showLoading('Caricamento...');
    await loadData(); // OBBLIGATORIO — popola i dati
    hideLoading();
  }
  ```
- **Porta locale backend**: 3002 (non 3001)
- **Backend locale**: il backend locale viene sempre avviato/riavviato dall'utente — l'agente NON deve mai eseguire `node api/index.js` o comandi equivalenti. Se serve un riavvio, chiedere all'utente di farlo.
- **Invio email commerciali**: per inviare email alle società usare SEMPRE `send_emails.js` — MAI eseguire invii diretti via nodemailer o altri metodi.
  ```bash
  node send_emails.js                        # Lazio (default)
  node send_emails.js societa_campania.csv   # altra regione
  ```
- **Versione attuale**: v3.16 (frontend e backend allineati)
- **Mai riutilizzare campi esistenti per scopi diversi** — se serve un nuovo dato, creare una colonna/tabella dedicata
- **Preferire campi JSONB** per dati strutturati che non richiedono query dirette (metadati, configurazioni, layout)
- **NON pushare senza conferma esplicita dell'utente**
- **Eseguire senza fermarsi** se il task è chiaro e l'utente ha dato istruzioni esplicite (es. "fai release commit e push"). Chiedere conferma solo in caso di errore o ambiguità reale, mai per cautela generica su operazioni intermedie

---

## 🎨 Regole UI/UX (OBBLIGATORIO)

### Tab Navigation — Standard

Due stili di tab, scegliere in base al contesto:

| Stile | Classi CSS | Quando usare |
|-------|-----------|---------------|
| **Pill** | `.tab-bar` + `.tab-btn` | 2-3 tab con etichette corte. Attiva = sfondo primary + testo bianco. Es: Tesseramento, Kit |
| **Underline** | `.report-tabs` + `.report-tab` | 3+ tab con etichette lunghe o pagine con molto contenuto sotto. Attiva = bordo inferiore primary. Es: Report |

**Regola**: mai mischiare i due stili allo stesso livello gerarchico. È ammesso usare pill per la selezione entità principale e underline per sotto-tab secondarie dentro una sezione (es. pagina Kit: pill per template → underline per "Da ordinare" / "In attesa").

### Stato tab — Variabili di modulo (OBBLIGATORIO)

Lo stato delle tab attive DEVE essere dichiarato come **variabile di modulo** (fuori da `render()`), non come variabile locale. Questo garantisce che la selezione persista durante la sessione senza reload.

```javascript
// ✅ OBBLIGATORIO — variabili di modulo, fuori da render()
let activeAssegnazioniTab = null; // inizializzato al primo template in render()
let activeMagazzinoTab = null;
let activeOrdiniTab = 'da_ordinare';
let assegnazioniFilter = 'all';

function render(c) {
  // Inizializza solo se null o se il template non esiste più
  if (!activeTab || !entities.find(e => e.id === activeTab))
    activeTab = entities[0]?.id || null;
  // ...
}
```

**Regola**: ogni sezione con tab indipendente ha la propria variabile di stato. Il reset avviene solo se l'entità selezionata non esiste più (es. template eliminato).

### CSS inline nel render() — Quando usarlo (OBBLIGATORIO)

Per classi CSS specifiche di un singolo modulo (non riutilizzabili altrove), iniettare un blocco `<style>` all'inizio dell'HTML generato da `render()` invece di aggiungere classi globali in `style.css`.

```javascript
function render(c) {
  c.innerHTML = `
    <style>
      .kit-tab { font-size:12px; padding:5px 12px; border-radius:20px; ... }
      .kit-tab.active { background:#667eea; color:white; }
      @media(max-width:768px) { .kit-page-grid { grid-template-columns:1fr; } }
    </style>
    <!-- HTML del modulo -->
  `;
}
```

**Quando usare `<style>` inline nel render()**:
- Classi usate solo in questo modulo (prefisso con nome modulo, es. `.kit-`, `.fee-`, `.report-`)
- Media query specifiche del modulo
- Animazioni/transizioni locali

**Quando usare `style.css` globale**:
- Classi riutilizzate in 2+ moduli (es. `.tab-bar`, `.btn`, `.card`)
- Reset/base styles
- Variabili CSS custom

### Filtri inline accanto al titolo sezione (OBBLIGATORIO)

Quando una sezione ha filtri rapidi (es. Tutti / Incompleti / Completi), posizionarli **nella stessa riga del titolo** usando `justify-content:space-between`, non sotto in una riga separata.

```html
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
  <span style="font-weight:700;font-size:14px;color:#374151;">📋 Titolo Sezione</span>
  <div class="kit-filter-bar">
    <button class="kit-filter active" data-f="all">Tutti</button>
    <button class="kit-filter" data-f="incompleto">Incompleti</button>
    <button class="kit-filter" data-f="completo">Completi</button>
  </div>
</div>
```

**Stile filtri**: pill piccole (`font-size:11px; padding:3px 10px; border-radius:12px`), attivo = sfondo primary. Su mobile wrappano sotto il titolo grazie a `flex-wrap:wrap`.

### Summary header con contatori (OBBLIGATORIO)

Ogni sezione con tab che mostra una lista DEVE avere un summary header che mostra i contatori chiave **senza bisogno di espandere**. Il summary va aggiornato ad ogni cambio tab/filtro.

```javascript
// Pattern: calcola contatori dalla lista filtrata
const total = list.length;
const completi = list.filter(x => x.stato === 'completo').length;
const incompleti = total - completi;

// Render summary inline accanto al titolo o sotto la tab bar
const summary = `<span style="font-size:12px;color:#888;">
  ${total} totali · <span style="color:#27AE60;">${completi} completi</span>
  ${incompleti > 0 ? ` · <span style="color:#E74C3C;">${incompleti} incompleti</span>` : ''}
</span>`;
```

**Regola**: il summary deve essere visibile senza scroll, aggiornato in tempo reale al cambio filtro/tab, e usare colori semantici (verde = ok, rosso = attenzione).

### Quando usare tab per navigare tra entità multiple (OBBLIGATORIO)

Se una pagina gestisce **N entità omogenee** (es. template kit, categorie, stagioni, tipi documento), usare **tab pill** per selezionare l'entità attiva invece di mostrare tutto in cascata verticale.

**Regola**: se ci sono 2+ entità della stessa natura con dati propri → tab, non lista verticale.

Esempi:
- Pagina Kit: tab per ogni template (Kit Squadra / Kit Portiere / Kit Staff)
- Pagina Quote: tab per ogni fee_config
- Pagina Checklist: tab per ogni categoria

**Pattern standard tab-entità**:
```javascript
// Stato attivo
let activeTab = entities[0].id;

// Render tab bar
const tabBar = `<div class="tab-bar">
  ${entities.map(e => `<button class="tab-btn${e.id === activeTab ? ' active' : ''}" data-id="${e.id}">${e.nome}</button>`).join('')}
</div>`;

// Render contenuto entità attiva
function renderTabContent(id) { /* mostra solo dati dell'entità selezionata */ }

// Handler
doc.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => { activeTab = btn.dataset.id; renderTabContent(activeTab); });
});
```

### Layout pagine complesse — Sezioni affiancate (OBBLIGATORIO)

Per pagine con **2+ sezioni funzionalmente distinte** (es. lista + dettaglio, magazzino + ordini), usare layout a **griglia 2 colonne su desktop**, colonna singola su mobile.

**Regola**: se due sezioni sono indipendenti e consultate separatamente → affiancarle su desktop invece di metterle in cascata.

```css
/* Pattern standard 2 colonne */
.page-grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 768px) {
  .page-grid-2col { grid-template-columns: 1fr; }
}

/* Colonna principale + sidebar */
.page-grid-main-side {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}
@media (max-width: 768px) {
  .page-grid-main-side { grid-template-columns: 1fr; }
}
```

**Quando usare quale**:
| Pattern | Quando |
|---|---|
| `2col` (1fr 1fr) | Sezioni di pari importanza (es. Magazzino + Ordini) |
| `main-side` (2fr 1fr) | Sezione principale + pannello secondario (es. lista + filtri) |
| Cascata verticale | Solo se le sezioni sono sequenziali (es. step wizard) |

### Principio generale

Ogni elemento UI deve essere **coerente con il design system dell'app**. Mai usare componenti nativi del browser quando esiste un equivalente custom.

### Divieti assoluti

| ❌ Vietato | ✅ Usare invece |
|---|---|
| `alert()` | Toast notification (`showToast()`) o modal custom |
| `prompt()` | Modal custom con input stilizzato |
| `confirm()` | Modal custom con bottoni Annulla/Conferma |
| Import/parse dati | Sempre flusso **parse → preview → conferma → applica** (mai popolare campi direttamente senza conferma utente) |
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

### Principi UX di default (OBBLIGATORI)

Questi principi si applicano AUTOMATICAMENTE a ogni nuova UI senza bisogno di richiesta esplicita:

| Principio | Dettaglio |
|---|---|
| Informazioni compatte | Dati correlati (alert, scadenze, stato) vanno inline tra parentesi o badge accanto al titolo — mai su righe separate se evitabile |
| Raggruppamento per tipologia | Liste eterogenee (quote, kit, documenti) DEVONO essere raggruppate per tipo con header collassabile |
| Card espandibili | Gruppi con >3 elementi: header chiuso di default con summary, click per espandere. Riduce scroll e cognitive load |
| Summary nell'header | Ogni card/gruppo chiuso deve mostrare le info essenziali (totale, stato critico, prossima scadenza) senza bisogno di espandere |
| Desktop intatto su fix mobile | Modifiche per mobile usano SOLO media query CSS (`@media max-width:500px`) — mai toccare stili inline desktop |
| Tooltip per dettagli secondari | Info di dettaglio (date specifiche, breakdown) nel `title` attribute per hover desktop; su mobile il tap sulla riga apre il modale dettaglio |
| Filtri con stato visibile | Bottoni filtro devono avere stile `active` evidente (sfondo primary, testo bianco) per indicare la selezione corrente |
| Coerenza dashboard ↔ pagina | Widget dashboard e pagina dedicata devono usare la stessa struttura dati e lo stesso raggruppamento (es. per tipologia) |
| Ordinamento liste giocatori | Ogni lista di giocatori DEVE essere ordinata per **cognome + nome** (`localeCompare`) salvo casi specifici (es. per ruolo nelle formazioni, per numero maglia nel roster, per minuto nelle sostituzioni). Se non specificato diversamente, il default è sempre alfabetico |

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

### Stampa da Mobile — Regole Standard (OBBLIGATORIO)

Il browser mobile usa font-size base più grande e margini di stampa più generosi rispetto al desktop. Senza override espliciti, il contenuto straborda nella seconda pagina.

**Regola**: ogni pagina stampabile (`/print/*`) DEVE includere nel `@media print` i seguenti override:

```css
@media print {
  /* ... regole esistenti ... */
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body, .print-doc { font-size: 12px !important; }  /* o 9px per documenti densi */
  /* Override esplicito di TUTTI i font-size usati nel documento */
  .print-title .t1 { font-size: 18px !important; }
  .print-table th, .print-table td { font-size: 11px !important; padding: 3px 6px !important; }
  .print-note { font-size: 10px !important; }
  .print-firma { font-size: 12px !important; margin-top: 6mm !important; }
  /* Evita page-break dentro sezioni critiche */
  .print-firme, .print-firma, .dist-firme { page-break-inside: avoid; }
}
```

**Perché**: il browser mobile ignora i font-size definiti fuori da `@media print` e applica il proprio scaling. Solo gli `!important` dentro `@media print` vengono rispettati.

**Testing stampa mobile**: non testabile da DevTools desktop — deploy su Vercel e testare da dispositivo reale.

**Checklist nuova pagina stampabile**:
- [ ] `@page { size: A4 portrait; margin: Xmm; }` definito
- [ ] `font-size` espliciti con `!important` per tutti gli elementi nel `@media print`
- [ ] `-webkit-print-color-adjust: exact` per colori/sfondi
- [ ] `page-break-inside: avoid` su firme e sezioni che non devono spezzarsi
- [ ] Testato su dispositivo mobile reale dopo deploy
- [ ] Se `@media (max-width:500px)` collassa grid a 1 colonna → aggiungere override `grid-template-columns: 1fr 1fr !important` nel `@media print` per ripristinare 2 colonne in stampa

**`@page` margin su mobile (CRITICO)**:
- `@page` non supporta media query — un valore unico vale sia desktop che mobile
- Su mobile il browser aggiunge header/footer (URL + data) che occupano ~10-12mm sottraendo spazio al contenuto
- **Soluzione obbligatoria**: rilevare mobile in JS al click stampa e iniettare il margine corretto dinamicamente

```javascript
// Pattern per documenti che usano printHTML() (convocazioni, distinta)
const isMobile = window.innerWidth <= 768;
const pageMargin = isMobile ? '3mm' : '15mm'; // 3mm elimina footer browser su mobile
const printStyles = `<style>@page{margin:${pageMargin};size:A4 portrait}...</style>`;
printHTML(printStyles + content, titolo);

// Pattern per documenti che usano window.print() direttamente (report)
document.getElementById('printBtn').addEventListener('click', () => {
  let mobileStyle;
  if (window.innerWidth <= 768) {
    mobileStyle = document.createElement('style');
    mobileStyle.textContent = '@page { margin: 3mm !important; }';
    document.head.appendChild(mobileStyle);
  }
  window.print();
  if (mobileStyle) setTimeout(() => mobileStyle.remove(), 1000);
});
```

**Scaling contenuto su mobile**: se il documento risulta troppo piccolo rispetto al foglio (spazio bianco in basso), aggiungere `html { zoom: 1.35 }` nel printStyles mobile. Il valore 1.35 è calibrato per documenti A4 con 20 righe (convocazioni). Aggiustare in base al contenuto.

**Grid 2 colonne in stampa**: se `@media (max-width:500px)` collassa `.pr-players-grid` o simili a 1 colonna, il `@media print` deve forzare `display: grid !important; grid-template-columns: 1fr 1fr !important` — `display: grid` è necessario perché altrimenti la regola mobile sovrascrive quella print.

**Liste con molti elementi su mobile**: se una lista (es. motivi assenza, statistiche) usa card affiancate su desktop, su mobile (`max-width:500px`) usare layout a righe compatte:
```
icona + label (flex:1) + barra percentuale (80px) + numero + %
```
Implementare con due blocchi HTML distinti (`.desktop-cards` / `.mobile-rows`) e CSS `display:none` / `display:block` via media query — mai JS resize.

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
- **Durata partita**: usare sempre `getHalfDuration()` (già definita nel file) — NON ricalcolare la categoria manualmente
- **Formazione iniziale vs corrente**: `formazioneIniziale` = snapshot pre-SUB (usare per valutazioni/gruppi); `formazioneData` = stato corrente post-SUB (usare per formazione live)
- **ASSIST negli eventi**: al caricamento gli eventi ASSIST vengono mergiati nel GOAL corrispondente e rimossi dall'array `eventi`. L'assist è in `e.assist_id` dell'evento GOAL — NON cercare `e.tipo === 'ASSIST'`
- **`showToast` in matchCenter**: è una funzione locale definita nel file (riga ~1148) — NON importarla da `ui.js` (non esiste lì)
- **Tab MC mobile**: usare `mc-tab-short` con emoji + label abbreviata (`flex:1`, no scroll). Su desktop `mc-tab-full` con testo completo
- **`overflow-x:clip` vs `hidden`**: `clip` blocca il contenuto che straborda ma NON crea un nuovo scroll container — usarlo quando si vuole che i figli con `overflow-x:auto` possano scrollare

### Flusso Convocazioni → Formazione → Distinta (OBBLIGATORIO)

Il flusso operativo è sequenziale:

```
1. Convocazioni salvate (selezione giocatori)
2. Convocazioni PUBBLICATE (notifica inviata → sblocca formazione)
3. Match Center → Formazione (giorno partita, dai convocati)
4. Distinta → stampabile in qualsiasi momento
```

**Regole:**

| Stato | Calendario (progress dot) | Match Center (tab Formazione) | Distinta |
|---|---|---|---|
| Convocazioni NON salvate | 🟡 Blink su "Conv" | ❌ Bloccato — messaggio + link | ⚠️ Vuota con banner giallo |
| Convocazioni salvate, NON pubblicate | 🟡 Blink su "Conv" | ❌ Bloccato — messaggio + link | ⚠️ Vuota con banner giallo |
| Convocazioni PUBBLICATE, no formazione | 🟡 Blink su "Form" | ✅ Bottone "Crea" | ✅ Mostra convocati |
| Convocazioni PUBBLICATE + formazione | 🟡 Blink su "MC" | ✅ Mostra formazione | ✅ Distinta completa |
| Formazione esistente (import), conv non pubblicate | 🟡 Blink su "Conv" | ✅ Mostra formazione | ⚠️ Mostra formazione con banner |

- La **pubblicazione** delle convocazioni è il prerequisito per creare la formazione nel MC
- Il check "pubblicata" si basa sulla presenza di una `notification` con `tipo='convocazione'` per la partita (endpoint `/convocazioni-stato`)
- Il semplice salvataggio (record in `convocation`) NON sblocca la formazione
- La distinta non blocca MAI — al massimo mostra un avviso e righe vuote

### Pallino "Pubblica" nel modale convocazioni

| Stato | Colore pallino | Animazione |
|---|---|---|
| Non pubblicata / modifiche pendenti | `#FFD700` (oro) | `pulse-dot 1.2s infinite` |
| Pubblicata | `#27AE60` (verde) | Nessuna |

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

### Regola #3b: Condividere Promise tra componenti che usano gli stessi dati

Se due widget/card nella stessa pagina necessitano degli stessi dati API, creare UNA Promise condivisa e riusarla.

```javascript
// ❌ VIETATO (stessa API chiamata 2 volte per 2 card diverse)
apiFetch('/partite/' + id + '/convocazioni').then(data => renderCard1(data));
apiFetch('/partite/' + id + '/convocazioni').then(data => renderCard2(data));

// ✅ OBBLIGATORIO (una Promise, due consumer)
const convPromise = apiFetch('/partite/' + id + '/convocazioni').catch(() => []);
convPromise.then(data => renderCard1(data));
convPromise.then(data => renderCard2(data));
```

**Regola corollario**: se due card mostrano lo stesso dato (es. "N disponibili"), DEVONO usare la stessa fonte dati e la stessa formula di calcolo per garantire coerenza visiva.

### Regola #4: Selezionare solo colonne necessarie

Mai usare `select('*')` su tabelle con molte colonne o molte righe. Specificare sempre le colonne.

### Regola #4b: Coerenza semantica dei dati derivati

Quando un dato viene calcolato da più fonti (es. "giocatori indisponibili" = indisponibili da convocazione + infortunati), la logica di calcolo DEVE essere identica ovunque venga mostrato.

**Regole:**
- Definire la formula UNA volta e riusarla (funzione helper o variabile condivisa)
- Mai contare come "indisponibile" un giocatore che è stato esplicitamente incluso in un'azione (es. infortunato ma convocato = in recupero, non indisponibile)
- Se due UI mostrano lo stesso conteggio, devono usare la stessa fonte dati E la stessa formula

```javascript
// ❌ VIETATO (logiche diverse per lo stesso concetto)
// Card A: conta TUTTI gli infortunati
const infortunati = dashInfortunati.filter(i => !i.data_rientro_effettiva);
// Card B: conta solo quelli non convocati
const infortunati = dashInfortunati.filter(i => !i.data_rientro_effettiva && !convIds.has(i.player_id));

// ✅ OBBLIGATORIO (stessa logica ovunque)
const convIds = new Set(tutti.map(c => c.calciatoreId));
const infortunatiNonConv = dashInfortunati.filter(i => !i.data_rientro_effettiva && !convIds.has(i.player_id));
// Usare infortunatiNonConv in ENTRAMBE le card
```

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

**Corollario — Hook secondari (fire-and-forget)**:
Quando si aggiunge un hook a un endpoint esistente (es. auto-aggiornamento checklist, notifica, log), i dati necessari all'hook DEVONO provenire da:
1. Dati già nel `req.body` o `req.params` — preferito
2. JOIN aggiunto al select già presente nell'endpoint — se serve una sola colonna extra
3. MAI una query separata dedicata solo all'hook

```javascript
// ❌ VIETATO (query extra solo per l'hook)
await supabase.from('fee').update(...).eq('id', inst.fee_id);
const { data: fee } = await supabase.from('fee').select('player_id, team_id').eq('id', inst.fee_id).single(); // query extra!
hookFn(fee.player_id, fee.team_id);

// ✅ OBBLIGATORIO (JOIN nel select iniziale)
const { data: inst } = await supabase.from('fee_installment')
  .update(...).eq('id', id).select('*, fee:fee_id(player_id, team_id, season_id)').single();
hookFn(inst.fee.player_id, inst.fee.team_id, inst.fee.season_id); // zero query extra

// ✅ OBBLIGATORIO (dati dal body/params se il frontend li ha già)
// Frontend: apiFetch('/calciatori/' + id, { body: JSON.stringify({ ...d, season_id: window.YFM.currentSeasonId }) })
// Backend: const seasonId = c.season_id; // zero query extra
```

### Regola #8: Endpoint unificati — Mai duplicare chiamate per dati già disponibili

Se un endpoint backend fetcha dati correlati (es. `category`, `team`, `team_staff`) per costruire la risposta, **includere quei dati nella risposta** anziché costringere il frontend a fare chiamate separate per gli stessi dati.

```javascript
// ❌ VIETATO (frontend fa 3 chiamate, backend fetcha gli stessi dati 2 volte)
// Frontend:
const [staff, categorie, teams] = await Promise.all([
  apiFetch('/workspaces/X/staff'),      // backend fetcha category + team internamente
  apiFetch('/workspaces/X/categorie'),   // stessa query category!
  apiFetch('/stagioni/Y/squadre')        // stessa query team + N+1 loop!
]);

// ✅ OBBLIGATORIO (1 chiamata, backend restituisce tutto)
// Frontend:
const { staff, categories, seasonTeamIds } = await apiFetch('/workspaces/X/staff?season_id=Y');
// Backend: fetcha category e team UNA volta, li include nella risposta
```

**Checklist prima di creare un nuovo endpoint o modificare un modulo frontend:**
1. Il backend ha già questi dati in un endpoint esistente? → Estendere la risposta
2. Il frontend ha già questi dati in memoria (variabile globale, `staffList`, `window.YFM.*`)? → Riusarli
3. Serve davvero una chiamata API o basta filtrare dati già fetchati? → Filtrare in memoria

### Regola #9: Mai chiamate API ridondanti nel frontend

Se un modulo ha già fetchato dati in `loadData()` e li tiene in una variabile di modulo (es. `staffList`, `categorie`), le funzioni interne (modal, azioni) NON devono ri-fetchare gli stessi dati.

```javascript
// ❌ VIETATO (ri-fetcha dati già in memoria)
async function openModal() {
  const staff = await apiFetch('/workspaces/X/staff'); // staffList esiste già!
  renderModal(staff);
}

// ✅ OBBLIGATORIO (usa dati in memoria)
function openModal() {
  renderModal(staffList); // già fetchato da loadData()
}
```

**Eccezioni ammesse:**
- Azione rara che richiede dati di un'altra stagione/workspace (es. "Copia da altra stagione")
- Dati che potrebbero essere cambiati da un altro utente (refresh esplicito)

### Regola #10: Formato risposta per endpoint che servono pagine intere

Quando un endpoint serve una pagina frontend con dati eterogenei, restituire un **oggetto strutturato** (non un array semplice) per includere metadati utili:

```javascript
// ✅ Formato consigliato per endpoint "pagina"
res.json({
  staff: [...],           // dati principali
  categories: [...],      // dati per form/filtri
  seasonTeamIds: [...],   // dati per filtro stagione
});

// Frontend: destruttura in una riga
const { staff, categories, seasonTeamIds } = await apiFetch(url);
```

**Retrocompatibilità**: se si cambia formato (da array a oggetto), il frontend DEVE gestire entrambi:
```javascript
const res = await apiFetch(url);
const list = Array.isArray(res) ? res : (res.staff || []);
```

### Benchmark di riferimento (Luglio 2025)

| Endpoint | Target | Accettabile |
|----------|--------|-------------|
| GET semplice (config, calciatori) | <300ms | <500ms |
| GET con aggregazione (stats, summary) | <500ms | <1000ms |
| GET con batch fetch (presenze, formazioni) | <800ms | <1500ms |
| POST/PUT/DELETE | <300ms | <500ms |

### Semantica Disponibilità Partita (OBBLIGATORIA)

| Categoria | Icona | Definizione | Fonte dati |
|-----------|-------|-------------|------------|
| Disponibili | 👥 | Convocati utilizzabili | `convocation.presente=true` senza risposta indisponibile e senza infortunio indisponibile |
| Indisponibili | 🏥 | Infortunati non utilizzabili | Infortunati con `risposta='indisponibile'` + infortunati non convocati (`injury` attivi) |
| Assenti | ❌ | Assenza comunicata (non infortunio) | `convocation.risposta='indisponibile'` di NON infortunati + `absence_notification` per data partita |

**Regole:**
- Infortunato convocato SENZA risposta indisponibile = in recupero → conta come disponibile (il mister l'ha scelto consapevolmente)
- Infortunato con `risposta='indisponibile'` → conta come 🏥 indisponibile (NON come ❌ assente)
- Badge convocazioni: se giocatore è infortunato E indisponibile, mostrare SOLO badge 🤕 (non doppio badge)
- `absence_notification` per data partita → giocatore frozen nelle convocazioni + conta come ❌ assente nella dashboard

### Migrazione Stagione — Infortuni (OBBLIGATORIO)

La migrazione rosa (`POST /stagioni/:id/migra`) DEVE:
1. Includere giocatori con `stato IN ('Attivo', 'Infortunato')` (non solo Attivo)
2. Preservare lo stato originale (infortunato resta infortunato)
3. Aggiornare `injury.team_id` degli infortuni aperti al nuovo team

---

## 🧠 Cache Frontend (OBBLIGATORIO)

### Architettura

| Layer | Storage | TTL | Uso |
|-------|---------|-----|-----|
| Memory | Variabile JS | 5 min | Dati DB frequenti (dashboard, stats) |
| Session | sessionStorage | 10 min | Dati esterni lenti (classifica GR, calendario GR) |

### Invalidazione dopo scrittura

| Operazione | Funzioni da chiamare |
|------------|---------------------|
| Salva risultato/eventi partita | `invalidateDashboardCache()` + `invalidateStatsCache()` |
| Archivia/sblocca/elimina partita | `invalidateDashboardCache()` + `invalidateStatsCache()` |
| Elimina tutte le partite | `invalidateDashboardCache()` + `invalidateStatsCache()` |
| Modifica roster (add/edit/delete) | `invalidateDashboardCache()` |
| Salva/pubblica convocazioni | `invalidateDashboardCache()` + `refreshDashConvCards(matchId)` |
| Salva presenze allenamento | `invalidateDashboardCache()` |
| Salva/annulla seduta allenamento | `invalidateDashboardCache()` |
| Modifica config settimana tipo | `invalidateDashboardCache()` |
| Import (rosa, calendario, formazioni) | `invalidateDashboardCache()` |

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

### Formato obbligatorio

Ogni commit dopo un `npm run release` DEVE includere la versione nel messaggio:

```
[v3.16.X] tipo: descrizione
```

La versione si legge dal file `.last-release` nella root del progetto (generato automaticamente da `npm run release`).

### Comando commit standard (dopo release)

```bash
git add <file-modificati> frontend-v2/.build-counter.json
git add -f frontend-v2/src/build-info.js .last-release
git commit -m "[v3.16.X] tipo: descrizione"
git push origin main
```

### Tipi

```
feat: nuova funzionalità
fix: correzione bug
docs: documentazione
refactor: refactoring codice
style: stili (CSS)
```

### Esempi

```bash
git commit -m "[v3.16.4] feat: migliora UI dashboard con badge competizione"
git commit -m "[v3.16.5] fix: distinta stampa mobile"
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

## 🔧 Strumenti di Modifica File (OBBLIGATORIO)

### Regola #1: Python per modifiche a file JS/HTML con template literals

I file frontend contengono template literals con backtick, virgolette miste e HTML inline. `fsReplace` fallisce spesso su questi pattern. Usare **sempre Python** per modifiche a file `.js` che contengono:
- Template literals (backtick + `${...}`)
- HTML inline con attributi `style="..."` o `class="..."`
- Stringhe con virgolette doppie e singole miste
- Più di una riga di contesto da matchare

```python
# Pattern standard per modifiche JS con Python
with open('path/to/file.js', 'r') as f:
    content = f.read()

old = 'stringa esatta da sostituire'
new = 'nuova stringa'

if old in content:
    content = content.replace(old, new, 1)
    with open('path/to/file.js', 'w') as f:
        f.write(content)
    print('OK')
else:
    print('NOT FOUND')
```

**Quando usare `fsReplace`**: solo per file `.md`, `.json`, file di configurazione, o singole righe semplici senza virgolette miste.

**Quando usare Python**: sempre per file `.js` con template literals o HTML inline, e per qualsiasi sostituzione che coinvolge più di una riga.

### Regola #2: Testare query SQL prima di scrivere il codice

Ogni nuova query SQL (endpoint, subquery, JOIN, aggregazione) DEVE essere testata direttamente sul DB **prima** di essere inserita nel codice backend:

```javascript
// Eseguire con: cd backend && /Users/Raffaele/.nvm/versions/node/v24.18.0/bin/node -e "..."
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://...', ssl: { rejectUnauthorized: false } });
pool.query('SELECT ...').then(r => console.log('OK', r.rows)).catch(e => console.error('ERR:', e.message)).finally(() => pool.end());
```

**Regola**: se la query usa tabelle, colonne o funzioni non verificate di recente → testarla prima. Non assumere che una tabella o colonna esista senza verifica.

**Quando si può saltare il test**: solo per query banali su tabelle già usate nello stesso endpoint (es. `SELECT id FROM kit_template WHERE workspace_id = $1`).

---

## Workflow Post-Modifica

1. Implementa le modifiche
2. Testa: `cd frontend-v2 && npm run release` + `cd backend && node -c api/index.js`
   > ⚠️ `npm run release` = incrementa build counter + build. Usare `npm run build` SOLO per test intermedi senza commit.
   > ⚠️ **UNA SOLA release per commit**. Se dopo la release servono micro-fix (spostare un elemento, fix typo, aggiustamento CSS), usare `npm run build` per verificare e includere nel MEDESIMO commit senza rieseguire `npm run release`. Mai incrementare il counter due volte per lo stesso commit.
3. **Test funzionale** (vedi sezione sotto)
4. Aggiorna documentazione (DEVELOPMENT_PLAN.md changelog + eventuali AGENTS.md/project-rules.md)
5. Commit con messaggio descrittivo — **INCLUDERE SEMPRE** `frontend-v2/.build-counter.json` nel commit (vedi sotto)
6. Push su main → deploy automatico Vercel (SOLO con conferma utente)

### File obbligatori nel commit dopo `npm run release`

| File | Motivo | Come aggiungerlo |
|------|--------|------------------|
| `frontend-v2/.build-counter.json` | Vercel lo legge durante il build per generare il build ID corretto | `git add frontend-v2/.build-counter.json` |
| `frontend-v2/src/build-info.js` | Contiene il build ID mostrato nell'app | `git add -f frontend-v2/src/build-info.js` |
| `.last-release` | Riferimento versione per il messaggio di commit | `git add -f .last-release` |

> ⚠️ **CRITICO**: Se `.build-counter.json` non viene committato, Vercel genera il build con il counter vecchio e l'app mostra una versione obsoleta. Questo file NON è nel `.gitignore` ma va aggiunto esplicitamente ad ogni commit.

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
