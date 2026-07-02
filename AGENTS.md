# Youth Football Manager

> ⚠️ **Per agenti AI**: consultare `.agents/AGENTS.md` (entry point principale)

## Quick Links
- **App**: https://youth-football-manager.vercel.app
- **Backend**: https://youth-football-manager-backend.vercel.app/api
- **Repo**: https://github.com/ecopraf/youth-football-manager

## Info
- **Versione**: v3.15
- **Build ID**: `v3.15.<git-hash>`
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

---

---

## 🎯 Funzionalità Dashboard

### Ultimi Risultati - Layout Migliorato

La dashboard mostra le ultime 5 partite con le seguenti informazioni:

#### Trend Ultime 5
```
┌─────────────────────────────────────────────────────┐
│ ANDAMENTO ULTIME 5                                  │
│    [V]      [P]      [V]      [S]      [V]       │
│   3-1      2-2      4-0      1-2      3-1       │
│  GF:12    GS:6     Diff:+6                          │
└─────────────────────────────────────────────────────┘
```

#### Lista Partite con Badge
```
┌─────────────────────────────────────────────────────┐
│ 🏆 Campionato  G.15                    20/06     │
│ 🏠 ●🔵 Inter Academy                    3 - 1     │
└─────────────────────────────────────────────────────┘
```

#### Badge Competizione
| Tipo | Badge | Colore |
|------|-------|--------|
| Campionato | 🏆 Campionato | Verde (#e8f5e9 / #28a745) |
| Coppa | 🏅 Coppa | Arancione (#fff3e0 / #fd7e14) |
| Torneo | 🎯 Torneo | Blu (#e3f2fd / #007bff) |
| Amichevole | 🤝 Amichevole | Grigio (#f5f5f5 / #6c757d) |

#### Badge Risultato Colorato
- **Vittoria**: Sfondo verde chiaro (#e8f5e9), bordo verde (#28a745)
- **Pareggio**: Sfondo giallo chiaro (#fff8e1), bordo giallo scuro (#b8860b)
- **Sconfitta**: Sfondo rosso chiaro (#ffebee), bordo rosso (#dc3545)

#### Badge Avversario
Pallino colorato (8x8px) con ombra per identificare visivamente l'avversario.

---

## 🎯 Funzionalità Calendario

### Pallino Lampeggiante per Prossimo Passo

Il calendario mostra un pallino 🔵 lampeggiante accanto alla partita che richiede azione.

#### Logica Determinazione Passo
| Condizione | Step restituito |
|------------|-----------------|
| Nessuna convocazione | `convocazione` |
| Convocazione esistente, no formazione | `formazione` |
| Formazione salvata, no distinta | `distinta` |
| Distinta presente, no risultato | `risultato` |
| Risultato inserito, no eventi | `eventi` |
| Tutto completato | `null` |

#### Colori Step
| Step | Colore | Icona |
|------|--------|-------|
| Convocazione | 🔵 `#007bff` | 📋 |
| Formazione | 🩵 `#17a2b8` | 🏟️ |
| Distinta | 🟠 `#fd7e14` | 📄 |
| Risultato | 🟢 `#28a745` | 📊 |
| Eventi | 🟣 `#6f42c1` | ⚽ |

#### UI Calendario (Desktop)
```
┌─────────────────────────────────────────────────────┐
│ 🟢 PROSSIMA    🔵📋 Convocazione                  │
│─────────────────────────────────────────────────────│
│ 📦 25 Gen 2025                                        │
│ [G.15] [Campionato] [🏠 Casa]                      │
│                                                     │
│ [📋 Convocazione][🏟️ Formazione][📄 Distinta]     │
│ [📝 Note]                          [✏️][🗑️]         │
└─────────────────────────────────────────────────────┘

📅 IN ARRIVO
┌─────────────────────────────────────────────────────┐
│ [G.16] [Campionato] [✈️ Trasferta]                 │
│                                                     │
│ [📋][🏟️][📄][📝]                  [✏️][🗑️]         │
└─────────────────────────────────────────────────────┘

🏆 GIOCATE
┌─────────────────────────────────────────────────────┐
│ 18 Gen 2025                                        │
│ [G.14] [Campionato] [✈️ Trasferta]                 │
│                                                     │
│ [📋][🏟️][📄][📦 Archivia][📝]   [✏️][🗑️]         │
└─────────────────────────────────────────────────────┘
```

#### UI Calendario (Mobile <640px)
```
┌──────────────────────────┐
│ [G.15] [🏠]             │
│ 📦                      │
│ 25/01/2025              │
│ Green vs Juventus        │
│ ASD vs Juventus 3-1 ✅  │
│         [✏️][🗑️]        │
│ ┌────┬────┬────┐        │
│ │📋  │🏟️  │📄  │        │
│ ├────┼────┼────┤        │
│ │📝  │    │    │        │
│ └────┴────┴────┘        │
└──────────────────────────┘
```

#### Badge Risultato Colorato
| Esito | Badge | Colore |
|-------|-------|--------|
| Vittoria | 3-1 ✅ | Verde `#27AE60` |
| Sconfitta | 1-3 ❌ | Rosso `#E74C3C` |
| Pareggio | 2-2 🤝 | Giallo `#F39C12` |

#### Badge Sezioni Calendario
- **Prossima Partita**: 🟢 PROSSIMA (verde)
- **In Arrivo**: 📅 IN ARRIVO (blu chiaro)
- **Giocate**: 🏆 GIOCATE (grigio)

---

## 🏗️ Endpoint API Key

- `/api/stagioni/:id/squadre` → restituisce squadre per stagione con category join
- `/api/squadre/:id/calciatori` → GET: lista giocatori, POST: aggiungi giocatore
- `/api/squadre/:id/scadenze-mediche` → giocatori con certificato in scadenza (30 giorni)
- `/api/squadre/:id/statistiche-complete` → statistiche squadre con array `risultati`
- `/api/squadre/:id/top-players` → top marcatori/assist/presenze
- `/api/squadre/:id/partite/:id/convocati` → lista convocati
- `/api/squadre/:id/partite/:id/formazione` → formazione salvata
- `/api/squadre/:id/partite/:id/distinta` → distinta partita
- `/api/squadre/:id/partite/:id/eventi` → eventi partita

### Schema Risultato Partita (in `statistiche-complete`)
```javascript
{
  id: 'uuid',
  avversario: 'Inter Academy',
  luogo: 'Casa',
  dataOra: '2026-06-20T15:00:00Z',
  golFatti: 3,
  golSubiti: 1,
  giornata: 15,
  competizione: 'Campionato Primavera A',
  tipoEvento: 'campionato',           // campionato | coppa | torneo | amichevole
  dettaglioCompetizione: 'G.15',      // G.15, QF, SF, F
  badgeAvversario: '#0068A8'           // colore esadecimale
}
```

---

## 🧪 Test Applicazione

### Avvio Frontend Locale
```bash
cd /workspace/youth-football-manager/frontend-v2
npm install  # se necessario
npx vite --host 0.0.0.0 --port 8080
```
Frontend disponibile su: http://localhost:8080 (o porta successiva)

### Flusso Test Completo
1. Apri browser → http://localhost:8080
2. Login con credenziali utente
3. Testa sequenzialmente:
   - **Dashboard**: verifica statistiche, trend ultimi 5, badge competizione
   - **Rosa**: verifica lista giocatori con filtri
   - **Calendario**: verifica pallino lampeggiante, badge sezioni, badge luogo
   - **Convocazioni**: verifica lista giocatori per partita
   - **Formazione**: verifica caricamento convocati
   - **Risultato**: verifica lista giocatori per eventi
   - **Allenamenti**: verifica date e tabella presenze
   - **Report**: verifica generazione report

### Commit e Push
```bash
cd /workspace/youth-football-manager
git add .
git commit -m "fix: descrizione fix"
git push
```

**NOTA**: Non dimenticare di disabilitare deploy Vercel prima di push se richiesto.
#### Pulsanti Calendario per Tipo Partita
| Tipo | Pulsanti Visibili |
|------|-------------------|
| Future | Convocazione, Formazione, Distinta, Eventi*, Note, Edit, Delete |
| Giocate (con risultato) | Convocazione, Formazione, Distinta, Archivia, Note, Edit, Delete |
| Giocate (senza risultato) | Convocazione, Formazione, Distinta, Note, Edit, Delete |
| Archiviate | Convocazione, Formazione, Distinta, Sblocca, Note |

*Eventi: solo se la partita ha gia un risultato
