# Modulo: Admin (Utenti, Guest Links, Workspace)

> Riferimenti: `/.agents/AGENTS.md` §auth §capabilities | `/.agents/knowledge/DATABASE_SCHEMA.md` §users §guest_token

## File del modulo

| File | Responsabilità |
|------|---------------|
| `users.js` | Gestione utenti workspace (CRUD, profili, capabilities, categorie accesso) |
| `guestLinks.js` | Gestione link guest (crea, rinnova, revoca) |
| `workspaces.js` | Gestione workspace (superadmin): CRUD, stagioni, categorie, migrazione stagione |

## Entry point router
`src/router.js` — rotte: `users`, `guestLinks`, `workspaces`

## Endpoint backend usati

### Utenti
```
GET    /api/auth/users?workspace_id=&only_active=
POST   /api/auth/users
PUT    /api/auth/users/:id
PUT    /api/auth/users/:id/toggle-active
DELETE /api/auth/users/:id?hard=true
GET    /api/auth/workspaces
GET    /api/workspaces/:id/categorie
GET    /api/workspaces/:id/stagioni
GET    /api/workspaces/:id/staff
```

### Guest Links
```
GET    /api/auth/guest-links
PUT    /api/auth/guest-links-renew
DELETE /api/auth/guest-link/:token
GET    /api/squadre/:id/calciatori
```

### Workspace (superadmin)
```
GET    /api/workspaces
POST   /api/workspaces
PUT    /api/workspaces/:id
DELETE /api/workspaces/:id
GET    /api/workspaces/:id/recap
GET    /api/workspaces/:id/anagrafica
PUT    /api/workspaces/:id/anagrafica
POST   /api/workspaces/:id/stagioni
PUT    /api/stagioni/:id
DELETE /api/stagioni/:id
POST   /api/stagioni/:id/migra
GET    /api/workspaces/:id/stagioni/:id/teams
POST   /api/workspaces/:id/categorie
PUT    /api/categorie/:id
DELETE /api/categorie/:id
POST   /api/categorie/:id/team
DELETE /api/squadre/:id
GET    /api/logos
```

## Route backend di riferimento

| Endpoint group | File backend |
|---|---|
| `/api/auth/users*`, `/api/auth/guest-links*` | `backend/api/routes/auth.js` |
| `/api/workspaces/*`, `/api/stagioni/*`, `/api/categorie/*` | `backend/api/routes/workspace.js` |

## Capabilities richieste

| Operazione | Capability |
|---|---|
| Gestione utenti, guest links | `admin` o `isAdmin()` |
| Gestione workspace, stagioni, categorie | `is_superadmin` |
| Lettura workspaces | `authMiddleware` |

## Tabelle DB toccate

- `users` — utenti (`permessi` JSONB con `profilo` + `capabilities`)
- `guest_token` — link guest (`tipo`: `famiglia`/`ospite`, `squadre_accesso`)
- `workspace` — workspace
- `workspace_anagrafica` — dati societari
- `season` — stagioni
- `category` — categorie
- `team` — squadre

## Variabili globali usate (`window.YFM.*`)

| Variabile | Usata in |
|-----------|---------|
| `getUser()` | users, guestLinks, workspaces |
| `isAdmin()` | users, guestLinks |
| `activeWorkspaceId` | users, guestLinks |
| `workspaceInfo` | users |
| `allStagioni` | guestLinks |
| `currentSeasonId` | guestLinks |
| `getSquadra()` | guestLinks |
| `squadraId` | guestLinks |
| `canWrite('guest_links')` | guestLinks |
| `navigateTo()` | — |

## Dipendenze tra file frontend

```
users.js
  └── imports: utils/capabilities.js (CAPABILITIES, PROFILI, getUserCapabilities)

workspaces.js
  ├── imports: utils/teamMatch.js (isOurTeam)
  └── imports: club/workspaceSwitcher.js (populateWorkspaceSelect) — lazy import
```

## Note critiche

- `parseSocietaText()` in `workspaces.js` è il parser unificato TC+testo libero per anagrafica societaria — stesso parser presente in `backend/api/routes/workspace.js`
- Migrazione stagione (`/stagioni/:id/migra`): migra rosa, staff, config allenamenti da stagione precedente con mapping categorie
- `users.squadre_accesso` contiene array di `category_id` (NON `team_id`)
- Profili disponibili: `admin`, `allenatore`, `vice_allenatore`, `dirigente`, `preparatore`, `osservatore`, `segreteria`, `custom`

## TODO / Bug aperti

- [ ] Nessun bug noto aperto al momento
