# Modulo: Print

> Riferimenti: `/.agents/AGENTS.md` §print | project-rules.md §stampa-mobile

## File del modulo

| File | Responsabilità |
|------|---------------|
| `printFormazione.js` | Stampa formazione su campo (layout pitch A4) |
| `printReport.js` | Stampa report partita (score, eventi, giocatori) |
| `printRosa.js` | Stampa elenco tesserati |
| `printPresenze.js` | Stampa registro presenze allenamenti (griglia settimanale o summary) |
| `printScadenzeMediche.js` | Stampa scadenze visite mediche con semaforo |
| `printTesseramento.js` | Stampa modulo iscrizione/tesseramento giocatore |

## Entry point router
`src/router.js` — rotte: `print-formazione`, `print-report`, `print-rosa`, `print-presenze`, `print-scadenze-mediche`, `print-tesseramento`
Tutte le rotte print usano `print.html` come documento base (non `index.html`).

## Endpoint backend usati

```
GET    /api/partite/:id/formazione          ← printFormazione
GET    /api/squadre/:id/calciatori          ← printFormazione, printRosa, printPresenze, printScadenzeMediche
GET    /api/partite/:id/report              ← printReport
GET    /api/squadre/:id/allenamenti/presenze ← printPresenze
GET    /api/registrations/:id              ← printTesseramento
GET    /api/workspaces/:id/registration-template ← printTesseramento
GET    /api/calciatori/:id                 ← printTesseramento (fallback player)
```

## Route backend di riferimento

| Endpoint group | File backend |
|---|---|
| `/api/partite/:id/formazione`, `/api/partite/:id/report` | `backend/api/routes/match.js` |
| `/api/squadre/:id/calciatori`, `/api/squadre/:id/allenamenti/presenze` | `backend/api/routes/player.js`, `training.js` |
| `/api/registrations/*` | `backend/api/routes/registration.js` |

## Capabilities richieste

Tutti gli endpoint usati sono in sola lettura — solo `authMiddleware`, nessuna capability specifica.

## Variabili globali usate (`window.YFM.*`)

| Variabile | Usata in |
|-----------|---------|
| `squadraId` | tutti |
| `pageParams` | printFormazione (`id`), printReport (`id`), printTesseramento (`id`, `blank`) |
| `getSocietaName()` | printFormazione, printRosa, printPresenze, printScadenzeMediche |
| `getWorkspaceLogo()` | printFormazione, printReport, printRosa, printPresenze, printScadenzeMediche, printTesseramento |
| `getSquadra()` | printFormazione, printRosa, printPresenze, printScadenzeMediche |
| `navigateTo()` | tutti (back button → `printCenter`) |
| `activeWorkspaceId` | printTesseramento |
| `workspaceInfo` | printTesseramento |
| `currentSeasonId` | printTesseramento |
| `accessibleSeasons` | printTesseramento |

## Dipendenze tra file frontend

```
printFormazione.js
  └── imports: team/formazione.js (PITCH_CSS, buildPitchSlotsFromState, convertApiFormation)
```

## Note critiche

- Tutti i file print usano `print.html` (non `index.html`) — sidebar e header sono nascosti via `@media print`
- Regola stampa mobile obbligatoria: ogni `@media print` DEVE includere override espliciti di `font-size` per evitare che il browser mobile usi font-size base più grande e faccia traboccare il contenuto su pagina 2
- **`@page` margin su mobile**: `@page` non supporta media query — rilevare mobile in JS al click stampa e iniettare margine dinamico: `3mm` su mobile (elimina footer browser URL+data), valore originale su desktop. Vedi pattern in `project-rules.md` §stampa-mobile
- **`convocazioni.js`** (in `modules/team/`): usa `printHTML()` con `zoom:1.35` su mobile per scalare il contenuto e riempire il foglio A4. Margine: `3mm` mobile / `15mm` desktop
- **`distinta.js`** (in `modules/team/`): usa `printHTML()`. Margine: `3mm` mobile / `8mm` desktop. Righe: 24 fissi (regolamento)
- **`printReport.js`**: usa `window.print()` — inietta `<style>` temporaneo con `@page{margin:3mm}` su mobile, rimosso dopo stampa. Grid titolari/riserve forzato a 2 colonne con `display:grid !important` nel `@media print` per battere la regola `@media(max-width:500px)`
- `printPresenze.js` ha due modalità: **summary** (tutti i periodi, solo totali) e **griglia** (periodo selezionato ≤34 sedute, colonne per data) — la griglia usa orientamento landscape
- `printTesseramento.js` supporta modalità `blank=true` (modulo vuoto senza dati giocatore)
- Back button in tutti i moduli print → `window.YFM.navigateTo('printCenter')`

## TODO / Bug aperti

- [ ] Nessun bug noto aperto al momento
