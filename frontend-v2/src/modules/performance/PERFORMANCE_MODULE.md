# Modulo: Performance (Statistiche e Report)

> Riferimenti: `/.agents/AGENTS.md` §statistics | `/.agents/knowledge/DATABASE_SCHEMA.md` §match_statistics

## File del modulo

| File | Responsabilità |
|------|---------------|
| `stats.js` | Statistiche giocatori + grafici per competizione |
| `reports.js` | Report partita, stagionale, individuale giocatore |

## Endpoint backend usati

```
GET    /api/squadre/:id/stats-giocatori?tipo=   ← tipo = tutte/campionato/coppa/...
GET    /api/squadre/:id/stats-charts?tipo=
GET    /api/squadre/:id/statistiche-complete
GET    /api/squadre/:id/top-players
GET    /api/squadre/:id/valutazioni-top
GET    /api/squadre/:id/classifica
GET    /api/squadre/:id/competitions
GET    /api/squadre/:id/report-stagionale
GET    /api/squadre/:id/calciatori             ← per selettore giocatore in reports
GET    /api/squadre/:id/partite                ← per selettore partita in reports
GET    /api/partite/:id/report
GET    /api/calciatori/:id/report?team_id=&...
GET    /api/squadre/:id/print-center-status
```

## Tabelle DB toccate

- `match` — dati partite per aggregazione
- `match_event` — eventi (GOAL/ASSIST/YELLOW/RED/SUBITO/AUTOGOL)
- `match_statistics` — statistiche aggregate per partita
- `valutazione_partita` — voti (nullable = SV)
- `player` + `team_player` — anagrafica per join

## Variabili globali usate (`window.YFM.*`)

| Variabile | Usata in |
|-----------|---------|
| `squadraId` | stats, reports |
| `competizioneFiltro` | stats (filtro tipo competizione persistente) |
| `pageParams` | reports (`from: 'printCenter'` per back button) |
| `getWorkspaceLogo()` | reports (logo in intestazione report) |
| `navigateTo()` | reports |

## Entry point router
`src/router.js` — rotte: `stats`, `reports`

## Route backend di riferimento

| Endpoint group | File backend |
|---|---|
| `/api/squadre/:id/stats-*`, `/api/squadre/:id/top-*`, `/api/squadre/:id/classifica`, `/api/squadre/:id/report-*`, `/api/partite/:id/report`, `/api/calciatori/:id/report` | `backend/api/routes/statistics.js` |

## Capabilities richieste (backend `requirePermission`)

| Operazione | Capability |
|---|---|
| Tutte le letture stats e report | solo `authMiddleware` (nessuna capability) |

## Dipendenze tra file frontend

```
stats.js
  ├── imports: team/dashboard.js (invalidateDashboardCache)
  └── imports: utils/charts.js (drawBarChart, drawDonutChart, drawLineChart)

reports.js
  └── imports: utils/printHelper.js (printHTML)
```

## Helpers backend usati

- `helpers/importUtils.js` → `coreTeamName()` — normalizza nome squadra per matching (usato in `statistics.js`)

## Note critiche

- `competizioneFiltro` persiste tra navigazioni — resettare solo se si cambia squadra
- Report partita e stagionale sono generati lato backend (dati aggregati) — non ricalcolare nel frontend
- `tipo` nel query param stats: `tutte`, `campionato`, `coppa`, `torneo`, `amichevole`
- Report individuale: `GET /calciatori/:id/report` accetta `team_id`, `season_id`, `tipo` come query params

## TODO / Bug aperti

- [ ] Nessun bug noto aperto al momento
