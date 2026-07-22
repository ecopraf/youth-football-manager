# Modulo: Coach (Allenamenti)

> Riferimenti: `/.agents/AGENTS.md` §training | `/.agents/knowledge/DATABASE_SCHEMA.md` §training

## File del modulo

| File | Responsabilità |
|------|---------------|
| `trainingSessions.js` | Sessioni allenamento per data + programma + template |
| `trainingCalendar.js` | Calendario settimanale allenamenti |
| `trainingPresenze.js` | Registro presenze per sessione |
| `trainingData.js` | Statistiche presenze aggregate |
| `trainingSettings.js` | Configurazione giorni allenamento (settimana tipo) |
| `notifications.js` | Notifiche assenze e avvisi |
| `tournaments.js` | Gestione tornei |

## Endpoint backend usati

```
GET    /api/squadre/:id/allenamenti/config
POST   /api/squadre/:id/allenamenti/config
PUT    /api/allenamenti/config/:id
DELETE /api/allenamenti/config/:id          ← cascade elimina allenamenti futuri senza presenze
GET    /api/squadre/:id/allenamenti/presenze
POST   /api/squadre/:id/allenamenti/presenze
POST   /api/squadre/:id/allenamenti/presenze-batch
GET    /api/squadre/:id/allenamenti/summary
GET    /api/squadre/:id/allenamenti/annullati
GET    /api/squadre/:id/allenamenti-futuri
GET    /api/squadre/:id/assenze-settimana
GET    /api/squadre/:id/training-by-date/:date
POST   /api/squadre/:id/training-by-date
GET    /api/squadre/:id/training-templates
POST   /api/squadre/:id/training-templates
DELETE /api/training-templates/:id
GET    /api/training/:id/programma
PUT    /api/training/:id/programma
PUT    /api/training/:id/annulla
PUT    /api/training/:id/ripristina
```

## Tabelle DB toccate

- `training` — sessione allenamento (generata da config o manuale)
- `training_attendance` — presenze (usa `training_id` + `team_player_id`)
- `training_config` — settimana tipo (usa `team_id` + `giorno_settimana`)
- `training_template` — template programma (usa `team_id` + `programma` JSONB)
- `absence_notification` — notifiche assenze (`training_id` nullable per sessioni virtuali)

## Variabili globali usate (`window.YFM.*`)

| Variabile | Usata in |
|-----------|---------|
| `squadraId` | tutti |
| `getSquadraName()` | trainingSessions |

## Entry point router
`src/router.js` — rotte: `trainingCalendar`, `trainingSessions`, `trainingPresenze`, `trainingData`, `trainingSettings`, `notifications`, `tournaments`

**Alias rotte**: `training` → `trainingSessions` (redirect silenzioso nel router)

## Route backend di riferimento

| Endpoint group | File backend |
|---|---|
| `/api/squadre/:id/allenamenti/*`, `/api/training/*`, templates | `backend/api/routes/training.js` |
| `/api/notifications/*` | `backend/api/routes/notification.js` |
| `/api/tornei/*` | `backend/api/routes/tournament.js` |

## Capabilities richieste (backend `requirePermission`)

| Operazione | Capability |
|---|---|
| Crea/modifica config, presenze, programma, template, annulla/ripristina | `allenamenti` write |
| Crea/modifica/elimina tornei | `partite` write |
| Lettura allenamenti, presenze, summary, templates | solo `authMiddleware` |
| Notifiche (tutte le operazioni) | solo `authMiddleware` |

## Dipendenze tra file frontend

```
trainingSessions.js
  ├── imports: trainingCalendar.js (renderCalendar, attachCalendarListeners, selectTodayIfTraining)
  ├── imports: trainingData.js (loadTrainingData)
  └── imports: team/dashboard.js (invalidateDashboardCache)
```

## Note critiche

- DELETE `training_config`: cascade elimina solo allenamenti futuri **senza presenze registrate**
- Sessioni "virtuali" in `absence_notification`: `training_id = null` (data senza sessione reale)
- Template programma: JSONB libero, non ha schema fisso — non validare lato backend
- `training_attendance` usa `team_player_id` (NON `player_id`)

## TODO / Bug aperti

- [ ] `trainingData.js` — statistiche presenze non mostrano trend stagionale
