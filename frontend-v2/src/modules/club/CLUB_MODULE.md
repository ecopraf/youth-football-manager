# Modulo: Club (Kit, Quote, Tesseramento, Checklist, Impostazioni)

> Riferimenti: `/.agents/AGENTS.md` §kit §fees §workspace | `/.agents/knowledge/DATABASE_SCHEMA.md` §kit §fee

## File del modulo

| File | Responsabilità |
|------|---------------|
| `kit.js` | Magazzino kit: template, bundle, assegnazioni, ordini |
| `fees.js` | Quote associative: config, rate, pagamenti, ricevute |
| `registration.js` | Tesseramento giocatori (documenti, scadenze mediche) |
| `checklist.js` | Checklist pre-partita per categoria |
| `staff.js` | Gestione staff: Staff Tecnico + Dirigenti + Organigramma Societario (CRUD, solo admin) |
| `club.js` | Vetrina societaria read-only: Riferimenti Societari + Organigramma (read-only) |
| `seasonsCategories.js` | Stagioni e categorie |
| `settings.js` | Impostazioni workspace |
| `workspace.js` | Anagrafica societaria |
| `workspaceSwitcher.js` | Cambio workspace (superadmin/multi-workspace) |

## Endpoint backend usati

### Kit
```
GET    /api/kit-templates?workspace_id=
POST   /api/kit-templates
PUT    /api/kit-templates/:id
DELETE /api/kit-templates/:id
GET    /api/kit-bundles?workspace_id=
DELETE /api/kit-bundles/:id
PUT    /api/kit-bundles/segna-arrivati      ← segna pezzi arrivati dal fornitore
GET    /api/kit-stock
POST   /api/kit-stock/generate
POST   /api/kit-stock/restock
GET    /api/kit-assignments?team_id=&season_id=
POST   /api/kit-assignments
POST   /api/kit-assignments-batch
PUT    /api/kit-assignments/:id/sostituisci  ← sostituzione pezzo danneggiato
DELETE /api/kit-assignments/:id
PUT    /api/kit-da-ordinare                  ← flag da ordinare per giocatore/staff
POST   /api/kit-evadi-ordine                 ← evadi ordine e genera bundle
```

### Quote
```
GET    /api/fee-configs?workspace_id=
POST   /api/fee-configs
PUT    /api/fee-configs/:id
DELETE /api/fee-configs/:id
GET    /api/fees?team_id=&season_id=
POST   /api/fees/genera                      ← genera quote da config per team
PUT    /api/fees/:id/pay                     ← registra pagamento rata
PUT    /api/fees/:id/unpay                   ← annulla pagamento rata
GET    /api/fees/:id/installments
POST   /api/fees/:id/ricevuta               ← upload ricevuta PDF
```

### Staff / Workspace
```
GET    /api/squadre/:id/staff-completo        ← staff tecnico+dirigenti per team (team_staff)
GET    /api/workspaces/:id/organigramma       ← ruoli istituzionali (Presidente, VP, DG, DS, DT, Osservatore)
POST   /api/staff
PUT    /api/staff/:id
DELETE /api/staff/:id
GET    /api/workspaces/:id/anagrafica
PUT    /api/workspaces/:id/anagrafica
```

## Tabelle DB toccate

- `kit_template` — template kit (`is_portiere` → badge 🧤, articoli portiere)
- `kit_stock` — singoli pezzi fisici (ha_numero → numero maglia)
- `kit_bundle` — set completo assegnato (`stato`: integro/assegnato/parziale/saccheggiato/incompleto/da_riordinare)
- `kit_assignment` — assegnazione pezzo a giocatore/staff (esattamente uno tra `player_id` e `staff_id`)
- `fee_config` — configurazione quota (`rate` JSONB, `category_id` nullable)
- `fee` — quota giocatore (`importo_pagato` = fonte di verità)
- `fee_installment` — rata (`ricevuta_path`: null/`archived:<path>`)
- `staff` — staff tecnico (`workspace_id`, `qualifiche` JSONB)
- `team_staff` — collegamento staff ↔ team
- `workspace_anagrafica` — dati societari

## Variabili globali usate (`window.YFM.*`)

| Variabile | Usata in |
|-----------|---------|
| `squadraId` | kit, fees |
| `activeWorkspaceId` | kit |
| `currentSeasonId` | kit, fees |
| `getUser()` | kit |
| `navigateTo()` | kit |

## Entry point router
`src/router.js` — rotte: `kit`, `fees`, `registration`, `checklist`, `staff`, `seasonsCategories`, `settings`, `workspace`, `workspaceSwitcher`

## Route backend di riferimento

| Endpoint group | File backend |
|---|---|
| `/api/kit-*` | `backend/api/routes/kit.js` |
| `/api/fee-configs/*`, `/api/fees/*` | `backend/api/routes/fees.js` |
| `/api/staff/*`, `/api/squadre/:id/staff-completo` | `backend/api/routes/staff.js` |
| `/api/workspaces/:id/anagrafica` | `backend/api/routes/workspace.js` |
| `/api/checklist/*` | `backend/api/routes/checklist.js` |
| `/api/stagioni/*`, `/api/categorie/*` | `backend/api/routes/team.js` |

## Capabilities richieste (backend `requirePermission`)

| Operazione | Capability |
|---|---|
| Crea/modifica/elimina template, bundle, stock, assegnazioni kit | `kit` write |
| Lettura kit (templates, bundles, assignments, stock) | solo `authMiddleware` |
| Crea/modifica/elimina fee-config, genera quote, pay/unpay rate | `quote` write |
| Lettura quote e rate | solo `authMiddleware` |

## Dipendenze tra file frontend

```
kit.js
  └── nessun import da altri moduli (standalone)

fees.js
  └── nessun import da altri moduli (standalone)
```

## Note critiche

### Staff
- **Separazione ruoli**: `staff.js` mostra 3 sezioni — ⚽ Staff Tecnico, 👔 Dirigenti, 🏢 Organigramma Societario
  - Staff Tecnico: tutti i ruoli tranne Dirigente e Team Manager
  - Dirigenti: Dirigente + Team Manager
  - Organigramma: Presidente, Vice Presidente, DG, DS, DT, Osservatore (solo admin, CRUD)
- **Organigramma in club.js**: read-only, alimentato da `GET /api/workspaces/:id/organigramma` (ruoli con `team_staff.team_id = null`)
- **Organigramma in staff.js**: CRUD completo, usa `staffList` già caricato (filtrato per `isSocietario(ruolo)`)
- **Sidebar ordine Club**: Staff → Società → Stagioni

### Kit
- Kit staff: visibile **cross-categoria** (query su `staff_id` senza filtro `team_id`)
- Stato bundle `parziale` = temporaneo (pezzi in attesa fornitore) → si risolve con `segna-arrivati`
- Stato bundle `incompleto` = permanente (sostituzione non trovata)
- `numero_maglia` non è colonna diretta: calcolato dal primo `kit_stock` con `ha_numero=true` del bundle
- `fee.importo_pagato` è la fonte di verità per rigenerazione — aggiornato da pay/unpay
- `ricevuta_path = 'archived:<path>'` → ricevuta archiviata e rimossa da Storage (non eliminata)
- Quote: `fee_config.category_id` nullable → config applicabile a tutte le categorie se null

## TODO / Bug aperti

- [ ] Nessun bug noto aperto al momento
