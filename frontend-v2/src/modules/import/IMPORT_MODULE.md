# Modulo: Import Center

> Riferimenti: `/.agents/AGENTS.md` §import | `/.agents/knowledge/DATABASE_SCHEMA.md` §import_log

## File del modulo

| File | Responsabilità |
|------|---------------|
| `importCenter.js` | Hub import: PDF SGS, testo SGS, XLS FIGC, Portale Regionale (GR), loghi |

## Entry point router
`src/router.js` — rotta: `importCenter`

## Endpoint backend usati

```
POST   /api/calendario/parse-pdf            ← parse PDF SGS (multipart, cerca squadra)
POST   /api/calendario/extract             ← estrae partite da PDF per categoria/girone
POST   /api/calendario/import              ← conferma import partite
POST   /api/calendario/parse-text          ← parse testo libero SGS
GET    /api/import-log?team_id=            ← storico importazioni
GET    /api/gr/championships/:level        ← campionati portale regionale
GET    /api/gr/groups/:level/:champId      ← gironi di un campionato
GET    /api/gr/preview/:level/:champ/:group ← anteprima classifica girone
POST   /api/gr/configure                   ← salva/rimuove URL girone per team
GET    /api/gr/calendario/:teamId          ← calendario dal portale regionale
GET    /api/gr/classifica/:teamId
GET    /api/gr/marcatori/:teamId
GET    /api/gr/match-events/preview?teamId=
POST   /api/gr/match-events/import
POST   /api/gr/import-calendario/:teamId
POST   /api/gr/import-loghi/:teamId
POST   /api/gr/logos-wizard                ← batch scan loghi (superadmin)
POST   /api/gr/logos-confirm               ← conferma aggiornamenti loghi (superadmin)
GET    /api/matches-without-formation?team_id=
POST   /api/import-formations-batch
GET    /api/squadre/:id/competitions
```

## Route backend di riferimento

| Endpoint group | File backend |
|---|---|
| `/api/calendario/*` | `backend/api/routes/importCalendario.js` |
| `/api/gr/*` | `backend/api/routes/gazzettaRegionale.js` |
| `/api/import-log` | `backend/api/routes/importConfirm.js` |
| `/api/import-formations-batch`, `/api/matches-without-formation` | `backend/api/routes/importTuttocampo.js` |

## Capabilities richieste

| Operazione | Capability |
|---|---|
| Import calendario PDF/testo | `partite` write |
| Import rosa XLS | `rosa` write (delegato a `roster.js` via `openImportXlsModal`) |
| Import GR (calendario, marcatori, loghi) | `partite` write |
| Wizard loghi, logos-confirm | `is_superadmin` |
| Lettura import-log, competitions | solo `authMiddleware` |

## Tabelle DB toccate

- `match` — partite importate
- `match_event` — marcatori importati da GR
- `import_log` — storico (`tipo`: calendario_pdf/calendario_testo/calendario_tuttocampo/rosa_xls/rosa_tuttocampo/formazioni_tuttocampo)
- `category` — `girone` aggiornato da configurazione GR

## Variabili globali usate (`window.YFM.*`)

| Variabile | Usata in |
|-----------|---------|
| `squadraId` | tutti |
| `getSquadraName()` | importCenter |
| `getSquadra()` | importCenter (GR config — legge `classifica_url`, `category.girone`) |
| `allSquadre` | importCenter (aggiorna `classifica_url` in memoria dopo config GR) |
| `getUser()` | importCenter (mostra card loghi solo a superadmin) |
| `navigateTo()` | importCenter (redirect a roster per import XLS) |
| `openImportXlsModal()` | importCenter (delega import XLS al modulo roster) |

## Dipendenze tra file frontend

```
importCenter.js
  ├── imports: team/dashboard.js (invalidateDashboardCache)
  ├── imports: utils/formatters.js (formatDate)
  └── imports: utils/teamMatch.js (isOurTeam)
```

## Note critiche

- Flusso obbligatorio per tutti gli import: **parse → preview → conferma** — mai popolare dati direttamente senza mostrare anteprima all'utente
- Import XLS: `importCenter` non gestisce il flusso direttamente — chiama `window.YFM.openImportXlsModal()` che è registrata da `roster.js`
- GR config: salva `classifica_url` su `team` e `girone` su `category` — aggiorna anche `window.YFM.allSquadre` in memoria per evitare reload
- Dopo ogni import: invalida cache dashboard (`invalidateDashboardCache()`) e ricarica `loadImportCenter()`
- `import_log.tipo` valori validi: `calendario_pdf`, `calendario_testo`, `calendario_tuttocampo`, `rosa_xls`, `rosa_tuttocampo`, `formazioni_tuttocampo`

## TODO / Bug aperti

- [ ] Nessun bug noto aperto al momento
