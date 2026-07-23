# Modulo: Performance (Statistiche e Report)

> Riferimenti: `/.agents/AGENTS.md` §statistics | `/.agents/knowledge/DATABASE_SCHEMA.md` §match_statistics

## File del modulo

| File | Responsabilità |
|------|---------------|
| `stats.js` | Statistiche giocatori + grafici per competizione |
| `reports.js` | Report partita, stagionale, individuale giocatore |
| `playerPerformance.js` | Vista rosa aggregata (top performer, analisi reparto, classifica) + vista giocatore (trend voti, medie, lista partite valutate, media mensile) |

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
GET    /api/squadre/:id/performance-summary?tipo=    ← tipo = campionato|amichevole|tutte. Default campionato con fallback automatico su tutte se <3 giocatori con voti
GET    /api/calciatori/:id/performance-detail?team_id=&tipo=  ← stesso filtro tipo
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
| `squadraId` | stats, reports, playerPerformance |
| `competizioneFiltro` | stats (filtro tipo competizione persistente) |
| `pageParams` | reports (`from: 'printCenter'` per back button), playerPerformance (`playerId` per deep-link da playerDetail) |
| `getWorkspaceLogo()` | reports (logo in intestazione report) |
| `navigateTo()` | reports, playerPerformance |

## Entry point router
`src/router.js` — rotte: `stats`, `reports`, `playerPerformance`

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

playerPerformance.js
  └── imports: utils/charts.js (drawSimpleLineChart) ← grafico trend voti (linea singola)
```

## Helpers backend usati

- `helpers/importUtils.js` → `coreTeamName()` — normalizza nome squadra per matching (usato in `statistics.js`)

## Note critiche

- `competizioneFiltro` persiste tra navigazioni — resettare solo se si cambia squadra
- Report partita e stagionale sono generati lato backend (dati aggregati) — non ricalcolare nel frontend
- `tipo` nel query param stats: `tutte`, `campionato`, `coppa`, `torneo`, `amichevole`
- Report individuale: `GET /calciatori/:id/report` accetta `team_id`, `season_id`, `tipo` come query params
- **Filtro tipo competizione**: `?tipo=campionato|amichevole|tutte`. Default frontend = campionato con fallback automatico su `tutte` se <3 giocatori con ≥3 voti. Amichevole = tutto tranne Campionato e Coppa (include tornei e null). Filtro persiste nella variabile di modulo `activeTipo` e viene passato anche a `performance-detail` quando si apre il dettaglio giocatore
- **Fix cross-team**: entrambi gli endpoint fetchano prima le partite del `team_id` richiesto, poi filtrano `valutazione_partita` con `.in('partita_id', teamMatchIds)`. Senza questo fix i voti di altri team/stagioni venivano inclusi
- **performance-detail**: le valutazioni vengono ordinate per `data_ora` della partita lato backend prima di calcolare trend e medie. Senza questo sort i voti arrivano in ordine casuale dal DB e il trend è errato
- **Trend**: usa prima metà vs seconda metà dei voti ordinati per data. Label frontend: "Ultimi N voti" (seconda metà) / "Primi N voti" (prima metà) dove N = `floor(n_valutazioni/2)` e `ceil(n_valutazioni/2)`
- **Grafico trend**: usa `drawSimpleLineChart` (NON `drawLineChart` che è dual-line). Label asse X verticali con `ctx.clip()` per evitare sforamenti. Canvas `height=130`, `padding.bottom=60`
- **Doppio endpoint performance-detail** in `statistics.js`: Express usa il primo (riga ~695). Il secondo è un duplicato legacy — non rimuovere senza verificare che il primo copra tutti i casi

## TODO / Bug aperti

- [ ] Nessun bug noto aperto al momento
