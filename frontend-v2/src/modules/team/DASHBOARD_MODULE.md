# Modulo: Dashboard

> Riferimenti: `/.agents/AGENTS.md` §frontend-global-state | `/.agents/knowledge/DATABASE_SCHEMA.md` §users

## File del modulo

| File | Responsabilità |
|------|---------------|
| `dashboard.js` | Dashboard principale: widget personalizzabili, layout organizzabile, preferenze utente |

## Entry point router
`src/router.js` — rotta: `dashboard`

## Endpoint backend usati

```
GET  /api/squadre/:id/calciatori
GET  /api/matches?team_id=&season_id=&limit=
GET  /api/training?team_id=&limit=
GET  /api/statistics/team?team_id=&season_id=
GET  /api/statistics/top-players?team_id=&season_id=
GET  /api/injuries?team_id=&active=true
GET  /api/fees?team_id=&season_id=
GET  /api/fee-configs?workspace_id=
GET  /api/kit-templates?workspace_id=
GET  /api/kit-stock?workspace_id=
GET  /api/kit-assignments?team_id=&season_id=
GET  /api/checklist?team_id=&season_id=
GET  /api/registration?team_id=&season_id=
GET  /api/convocazioni?team_id=&match_id=
GET  /api/workspaces/:id/anagrafica
PUT  /api/users/preferences   ← salva dashboard_layout in preferenze_ui
```

## Tabelle DB toccate

- `users` — `preferenze_ui JSONB` (`{dashboard_layout: {order: [...], hidden: [...]}}`)
- `match`, `training`, `player`, `team_player`, `match_statistics`
- `fee`, `fee_installment`, `fee_config`
- `kit_template`, `kit_stock`, `kit_assignment`
- `training_attendance`, `absence_notification`

## Variabili globali usate (`window.YFM.*`)

| Variabile | Uso |
|-----------|-----|
| `squadraId` | Fetch dati squadra attiva |
| `currentSeasonId` | Filtro stagione corrente |
| `activeWorkspaceId` | Fetch kit, anagrafica |
| `getUser()` | Profilo, capabilities, preferenze_ui |
| `canRead(cap)` | Visibilità widget per capability |
| `navigateTo()` | Click su widget → pagina |
| `workspaceInfo` | Banner anagrafica incompleta |

## Widget disponibili

| ID | Label | Capability richiesta |
|----|-------|---------------------|
| `next_training` | 🏋️ Prossimo Allenamento | — |
| `next_match` | ⏱ Prossima Partita | — |
| `stats_widgets` | 📊 Statistiche | — |
| `top_players` | 🏆 Top Giocatori | — |
| `performance_voti` | ⭐ Voti Performance | — |
| `results` | 📋 Ultimi Risultati | — |
| `injuries` | 🏥 Infortuni | — |
| `certificati` | 🏥 Certificati Medici | — |
| `classifica` | 🏆 Classifica & GR | — |
| `staff` | 👥 Staff | — |
| `convocazione` | 📋 Prossima Convocazione | — |
| `fees` | 💰 Quote | `quote` |
| `kit` | 👕 Kit Sportivo | `kit` |
| `checklist` | ✅ Checklist Stagione | `tesseramento` |
| `tesseramento` | 📋 Tesseramento | `tesseramento` |

## Layout default per profilo

| Profilo | Order | Hidden di default |
|---------|-------|-------------------|
| `admin`/superadmin | tutti i widget | nessuno |
| `allenatore` | next_training, next_match, stats_widgets, top_players, performance_voti, results, injuries, certificati, classifica, staff, convocazione | convocazione |
| `segreteria` | checklist, tesseramento, fees, kit, certificati, injuries, next_training, next_match, convocazione, stats_widgets, top_players, results, classifica, staff | stats_widgets, top_players |
| altri | ALL_ORDER | widget senza capability |

## Note critiche

- **Filtro capabilities**: `_canSeeWidget(id)` esclude widget per cui l'utente non ha capability. Applicato sia al render iniziale (`DEFAULT_HIDDEN`) che al pannello Organizza (`renderList()`)
- **Preferenze salvate**: `users.preferenze_ui.dashboard_layout = {order, hidden}`. Se null → usa DEFAULT_ORDER/DEFAULT_HIDDEN del profilo
- **Widget lazy**: `injuries`, `certificati`, `fees`, `kit`, `checklist`, `tesseramento`, `convocazione`, `performance_voti` — visibilità gestita dalle Promise, non dal display DOM. `data-userHidden` marca quelli nascosti dall'utente
- **Banner pre-scadenza demo**: `window._checkDemoBanner()` chiamato ad ogni navigazione — non è parte del modulo dashboard ma appare sopra di esso
- **Banner anagrafica incompleta**: mostrato solo ad admin/segreteria se `workspace_anagrafica` è incompleta
- **Reset layout**: bottone Reset nel pannello Organizza ripristina DEFAULT_ORDER/DEFAULT_HIDDEN del profilo corrente
