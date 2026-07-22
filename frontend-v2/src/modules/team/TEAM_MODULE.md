# Modulo: Team (Match Center + Roster + Calendar + Convocazioni)

> Riferimenti: `/.agents/AGENTS.md` §match §roster | `/.agents/knowledge/DATABASE_SCHEMA.md` §match §team_player

## File del modulo

| File | Responsabilità |
|------|---------------|
| `matchCenter.js` | Hub partita: live mode, formazione, eventi, valutazioni, note |
| `matchDetail.js` | Dettaglio partita (sola lettura + edit risultato) |
| `resultForm.js` | Form inserimento/modifica risultato |
| `formazione.js` | Editor formazione standalone |
| `distinta.js` | Compilazione distinta arbitrale |
| `convocazioni.js` | Gestione convocazioni + risposte |
| `calendar.js` | Calendario partite con import |
| `roster.js` | Griglia rosa + form giocatore + aggregazioni |
| `playerDetail.js` | Dettaglio giocatore (stats, kit, quote, storico) |
| `dashboard.js` | Dashboard squadra (trend, prossima partita, badge) |
| `squadre.js` | Selettore squadra attiva |
| `valutazioni.js` | Pagina valutazioni standalone |
| `noteAvversario.js` | Note scouting avversario |
| `printCenter.js` | Hub stampe (link a moduli print/) |

## Endpoint backend usati

### Match
```
GET    /api/squadre/:id/partite
GET    /api/squadre/:id/partite-future
POST   /api/squadre/:id/partite
PUT    /api/partite/:id
DELETE /api/partite/:id
GET    /api/partite/:id/dettaglio
PUT    /api/partite/:id/note
PUT    /api/partite/:id/live-action          ← lifecycle live (1t/intervallo/2t/fine)
PUT    /api/partite/:id/archivia
PUT    /api/partite/:id/sblocca
GET    /api/partite/:id/formazione
PUT    /api/partite/:id/formazione
GET    /api/partite/:id/valutazioni
POST   /api/partite/:id/valutazioni
POST   /api/partite/:id/eventi-batch
DELETE /api/partite/:id/eventi-batch
GET    /api/partite/:id/convocazioni
GET    /api/partite/:id/convocazioni-stato
POST   /api/partite/:id/convocazioni
POST   /api/partite/:id/convocazioni-batch
POST   /api/partite/:id/convocazioni-pubblica
POST   /api/partite/:id/convocazioni/:convId/risposta
GET    /api/partite/:id/distinta-meta
PUT    /api/partite/:id/distinta-meta
GET    /api/squadre/:id/partite/:mid/distinta
GET    /api/squadre/:id/ultima-formazione
```

### Roster
```
GET    /api/squadre/:id/calciatori
GET    /api/squadre/:id/calciatori?includi_svincolati=1
POST   /api/squadre/:id/calciatori
PUT    /api/calciatori/:id
DELETE /api/squadre/:id/calciatori/:pid
POST   /api/squadre/:id/svincola
POST   /api/squadre/:id/riattiva
POST   /api/squadre/:id/aggrega
POST   /api/squadre/:id/disaggrega
POST   /api/squadre/:id/recupera
GET    /api/squadre/:id/aggregabili
GET    /api/squadre/:id/svincolati-workspace
GET    /api/squadre/:id/scadenze-mediche
POST   /api/roster/parse-xls              ← parse preview (multipart)
POST   /api/roster/import-xls            ← conferma import
POST   /api/roster/scrape-tuttocampo
POST   /api/roster/import-tuttocampo
POST   /api/roster/parse-html-tuttocampo
POST   /api/roster/parse-text-tuttocampo
```

## Tabelle DB toccate

- `match` — partita (gol_casa=nostri, gol_ospite=avversario — SEMPRE)
- `match_event` — eventi (GOAL/ASSIST/SUB/YELLOW/RED/SUBITO/AUTOGOL/IN/OUT)
- `match_formation` — formazione (usa `team_player_id`, non `player_id`)
- `match_statistics` — statistiche aggregate
- `convocation` — convocazioni (usa `team_player_id`)
- `player` — anagrafica giocatore
- `team_player` — rosa (stato, aggregato, capitano, vice_capitano)
- `valutazione_partita` — voti post-partita (voto nullable = SV)

## Variabili globali usate (`window.YFM.*`)

| Variabile | Usata in |
|-----------|---------|
| `squadraId` | tutti |
| `currentSeasonId` | matchCenter, roster |
| `allMatches` | matchCenter |
| `allPlayers` | roster |
| `allSquadre` | roster |
| `canWrite` | roster |
| `pageParams` | matchCenter |
| `getSquadra()` | roster, matchCenter |
| `getSquadraName()` | roster, matchCenter |
| `getSocietaName()` | matchCenter |
| `getWorkspaceLogo()` | matchCenter |
| `navigateTo()` | matchCenter |
| `openPlayerDetail()` | roster |
| `openPlayerForm()` | roster |
| `openImportXlsModal()` | roster |
| `openConvocation()` | matchCenter |
| `openFormazioneForm()` | matchCenter |
| `openDistintaMC()` | matchCenter |
| `onFormazioneSaved()` | matchCenter |
| `guestSquadreAccesso` | matchCenter (guest) |

## Entry point router
`src/router.js` — rotte: `dashboard`, `roster`, `playerDetail`, `calendar`, `matchCenter`, `matchDetail`, `formazione`, `convocazioni`, `distinta`, `valutazioni`, `noteAvversario`, `printCenter`, `squadre`

**Alias rotte**: `formation` → `formazione` (redirect silenzioso nel router)

## Route backend di riferimento

| Endpoint group | File backend |
|---|---|
| `/api/partite/*`, `/api/squadre/:id/partite*`, formazione, convocazioni, eventi, distinta | `backend/api/routes/match.js` |
| `/api/squadre/:id/calciatori*`, `/api/calciatori/:id`, aggregazioni, svincolo | `backend/api/routes/player.js` |
| `/api/roster/*` (import XLS/TC) | `backend/api/routes/roster.js` |

## Capabilities richieste (backend `requirePermission`)

| Operazione | Capability |
|---|---|
| Crea/modifica/elimina partita | `partite` write |
| Inserisci/elimina eventi, valutazioni, note | `partite` write |
| Pubblica/gestisci convocazioni, distinta-meta | `convocazioni` write |
| Salva formazione | `formazione` write |
| Import XLS/TC, aggiungi/modifica/svincola giocatore | `rosa` write |
| Lettura partite, formazione, convocazioni, roster | solo `authMiddleware` (nessuna capability) |

## Dipendenze tra file frontend

```
matchCenter.js
  ├── imports: formazione.js (PITCH_CSS, buildPitchSlots, convertApiFormation)
  ├── imports: distinta.js (openDistinta)
  ├── imports: dashboard.js (invalidateDashboardCache)
  ├── imports: performance/stats.js (invalidateStatsCache)
  └── imports: utils/offlineBuffer.js (live mode offline)

roster.js
  ├── imports: playerDetail.js (loadNewPlayerForm)
  ├── imports: dashboard.js (invalidateDashboardCache)
  └── imports: utils/certificati.js (calcCertificatiStatus)
```

## Helpers backend usati

- `helpers/importUtils.js` → `coreTeamName()` — normalizza nome squadra per matching loghi (usato in `match.js`)
- `helpers/tuttocampo.js` → `tcLogin/tcFetchPage/tcFetchAjax` — scraping TC (usato in `roster.js`)

## Note critiche

- `gol_casa` = gol NOSTRI, `gol_ospite` = gol AVVERSARIO — indipendente da Casa/Trasferta
- Timeline visuale MC: algoritmo tracks (sopra=GOAL/SUB/SUBITO, sotto=YELLOW/RED), MIN_DIST_PCT=8%, tooltip fixed via JS (mouseenter/touchstart), punteggio progressivo visibile sui gol
- `match_event.note` per SUBITO = nome giocatore avversario (testo libero); per GOAL = `'autogol'`/`'rigore'`
- `live_meta` JSONB su `match`: `{stato, start_1t, end_1t, start_2t, end_match}`
- `formazione_meta` JSONB su `match`: `{modulo, positions, modulo_finale}`
- Convocazioni: `risposta=null` → disponibile, `risposta='indisponibile'` → assente
- Import rosa: flusso obbligatorio **parse → preview → conferma** (mai popolare direttamente)
- `roster-old.js` è file legacy — non modificare

## TODO / Bug aperti

- [ ] `calendar.js.backup` presente — verificare se il backup è ancora necessario
