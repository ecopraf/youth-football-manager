# Support Module

## File coinvolti
- `backend/api/routes/support.js` — tutti gli endpoint
- `frontend-v2/src/components/supportWidget.js` — FAB + modal ticket
- `frontend-v2/src/modules/admin/supportTickets.js` — pagina gestione ticket (solo superadmin)
- `frontend-v2/src/components/helpData.js` — entry `supportTickets`

## Tabelle DB
- `support_ticket` — id UUID, workspace_id UUID nullable, user_id UUID nullable, email, nome, ruolo, pagina, tipo, priorita TEXT DEFAULT 'medium', descrizione, build, user_agent, stato TEXT DEFAULT 'aperto', risposta, risposta_at, created_at

**Valori `priorita`**: `low` 🟢, `medium` 🟡 (default), `high` 🔴, `critical` ⚫
- Inviata solo per tipo `bug` (per suggerimenti/domande viene forzata a `medium`)

## Endpoint backend

| Metodo | Path | Auth | Note |
|--------|------|------|------|
| POST | `/api/support/ticket` | authMiddleware | Invia email + salva DB. Rate limit 5/giorno per user_id. Superadmin: user_id=null. Screenshot come allegato email (non salvato in DB) |
| GET | `/api/support/tickets` | superadmin | Lista con filtri `?stato=aperto\|chiuso\|tutti&workspace_id=X` |
| PUT | `/api/support/tickets/:id/rispondi` | superadmin | Salva risposta + stato=chiuso + invia email all'utente |
| PUT | `/api/support/tickets/:id/stato` | superadmin | Cambia stato aperto/chiuso senza risposta |
| DELETE | `/api/support/tickets/:id` | superadmin | Elimina singolo ticket |
| DELETE | `/api/support/tickets/chiusi` | superadmin | Elimina tutti i ticket con stato=chiuso |

## Variabili YFM usate
- `window.YFM.currentPage` — pagina corrente nel payload ticket
- `window.YFM.workspaceInfo.nome` — nome workspace nel payload
- `BUILD_INFO.id` — build version nel payload

## Note critiche
- **Screenshot**: inviato come allegato email (nodemailer `attachments`), NON salvato nel DB e NON inline base64 (Gmail blocca i data URI inline)
- **Rate limit**: contatore nel DB (`COUNT WHERE user_id AND created_at > now()-1day`), non in sessionStorage. Superadmin escluso dal rate limit (user_id=null)
- **Auth superadmin**: usare sempre `req.user.is_superadmin` (NON `req.user.ruolo === 'superadmin'` — il superadmin ha `ruolo: 'admin'` nel JWT)
- **Email risposta**: oggetto `[YFM] Risposta al Ticket #XXXXXXXX` (primi 8 char UUID)
- **Stato ticket**: `aperto` (default) → `chiuso` (dopo risposta o chiusura manuale)
- **Visibilità pagina**: solo superadmin (sidebar + router)
- **FAB**: non visibile su pagine guest e pagine print
- **Mittente email**: `getMittente(user)` — nome cognome se presenti, fallback su parte locale email (es. `coppola.raffaele` da `coppola.raffaele@gmail.com`). Superadmin porta nome/cognome nel JWT dal login.
- **Priorità in email**: mostrata solo per tipo `bug`, con colore semantico. Riga `Tipo` sempre presente.
- **Card ticket in workspaces.js**: `renderTicketSummary()` chiamata al caricamento pagina — mostra contatori aperti/critical/high con link a supportTickets
- **Filtro priorità in supportTickets**: tab bar separata (Tutte/Critical/High/Medium/Low) — filtra lato frontend sulla lista già caricata
- **Priorità nel widget**: visibile solo per tipo `bug` (nascosta per suggerimento/domanda). Tooltip su ogni pill.
