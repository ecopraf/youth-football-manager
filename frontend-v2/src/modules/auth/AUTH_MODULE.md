# Modulo: Auth (Login, Guest, Assenze)

> Riferimenti: `/.agents/AGENTS.md` §auth §guest | `/.agents/knowledge/DATABASE_SCHEMA.md` §guest_token §users

## File del modulo

| File | Responsabilità |
|------|---------------|
| `login.js` | Form login + selezione workspace post-login |
| `guest.js` | Entry point link guest — verifica token e smista a guestAtleta/guestGenitore |
| `guestAtleta.js` | Home guest tipo `famiglia` — convocazioni, quote, partite, allenamenti, tesseramento |
| `guestGenitore.js` | Home guest tipo `ospite` — solo calendario partite e risultati |
| `guestFees.js` | Pagina quote per guest `famiglia` — rate, IBAN, upload ricevuta |
| `absence.js` | Segnalazione assenza allenamento (guest `famiglia`) |
| `demoExpired.js` | Pagina demo scaduta — mostrata su 403 `DEMO_EXPIRED`. CTA email + WhatsApp (+39 335 105 1147), data scadenza da `sessionStorage('demo_scadenza')` |
| `workspaceSospeso.js` | Pagina workspace sospeso — mostrata su 403 `WORKSPACE_SUSPENDED`. CTA email + WhatsApp. |

## Entry point router
`src/router.js` — rotte: `login`, `guest`, `guestAtleta`, `guestGenitore`, `guestFees`, `absence`, `demoExpired`, `workspaceSospeso`

**Logica router guest (CRITICA)**:
- Rotta `dashboard` con sessione guest attiva → redirect automatico a `guestAtleta` (se `guest_tipo === 'famiglia'`) o `guestGenitore` (se `guest_tipo === 'ospite'`)
- `guestAllowedPages`: lista pagine accessibili senza redirect — `['guest','guestAtleta','guestGenitore','guestFees','absence']`
- Qualsiasi rotta non in `guestAllowedPages` con sessione guest → redirect a home guest
- `window.YFM.canWrite` e `window.YFM.canRead` sono definiti inline nel router (non in un modulo separato) e usano `getUserCapabilities()` da `utils/capabilities.js`

## Endpoint backend usati

```
POST   /api/auth/login
GET    /api/auth/workspaces
GET    /api/guest/:token                    ← verifica token + genera JWT guest 24h
GET    /api/squadre/:id/partite-future
GET    /api/squadre/:id/allenamenti-futuri
GET    /api/partite/:id/convocazioni
GET    /api/squadre/:id/partite/:id/convocati
GET    /api/absence/player/:id
GET    /api/absence/motivi
POST   /api/absence
GET    /api/fees/guest?team_id=
POST   /api/fee-installments/:id/upload-ricevuta
GET    /api/fee-installments/:id/ricevuta
GET    /api/notifications/team/:id?destinatario_tipo=atleta
PUT    /api/notifications/guest-read
GET    /api/registrations/player/:id
GET    /api/calciatori/:id/career-matches?teamId=
```

## Route backend di riferimento

| Endpoint group | File backend |
|---|---|
| `/api/auth/*`, `/api/guest/*` | `backend/api/routes/auth.js` |
| `/api/absence/*` | `backend/api/routes/absence.js` |
| `/api/fees/guest`, `/api/fee-installments/*` | `backend/api/routes/fees.js` |

## Capabilities richieste

| Operazione | Capability |
|---|---|
| Login, guest token | nessuna (pubblico) |
| Tutte le operazioni guest | JWT guest (`isGuest: true`) — `requirePermission` blocca tutto, usare solo endpoint senza guard |

## Tabelle DB toccate

- `users` — login
- `guest_token` — verifica token guest (`tipo`: `famiglia` o `ospite`)
- `absence_notification` — segnalazioni assenza
- `convocation` — risposta convocazione
- `fee` + `fee_installment` — quote guest

## Variabili globali usate (`window.YFM.*`)

| Variabile | Usata in |
|-----------|---------|
| `isAuthenticated()` | login (redirect se già loggato) |
| `setUser()` | login |
| `navigateTo()` | login, guest |
| `workspaceInfo` | login, guest |
| `activeWorkspaceId` | login, guest |
| `guestToken` | guest |
| `guestSquadreAccesso` | guest |
| `guestPlayerId` | guestAtleta, guestFees, absence |
| `guestTeamId` | guestAtleta, guestGenitore, guestFees |
| `guestPlayerName` | guestAtleta |
| `squadraId` | absence |
| `getSocietaName()` | guestAtleta, guestGenitore |
| `facility` | guestAtleta, guestGenitore |

## Dipendenze tra file frontend

```
guest.js
  └── imports: team/squadre.js (loadSquadre)

guestAtleta.js
  └── nessun import da altri moduli
```

## Note critiche

- Tipo guest: `famiglia` → guestAtleta (ha player_id, vede quote/convocazioni), `ospite` → guestGenitore (solo partite)
- ⚠️ MAI usare `tipo === 'atleta'` o `tipo === 'genitore'` — i valori reali nel DB sono `famiglia` e `ospite`
- JWT guest in sessionStorage: NON è in `yfm_guest_jwt` — è dentro `JSON.parse(sessionStorage.getItem('yfm_guest')).jwt`
- `guestPlayerId/guestTeamId/guestPlayerName` non sopravvivono a reload — ogni modulo guest DEVE ripristinarli da `sessionStorage('yfm_guest')` come fallback
- Upload ricevuta: usa JWT guest da sessionStorage (non `localStorage.getItem('yfm_token')`)
- Logout guest: mostra "Sessione terminata" (non redirect a login)

## TODO / Bug aperti

- [ ] Nessun bug noto aperto al momento
