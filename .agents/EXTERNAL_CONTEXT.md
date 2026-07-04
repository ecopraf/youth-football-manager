# Youth Football Manager — Contesto Progetto per Agent Esterni

> Copia e incolla questo documento in ChatGPT (o altro agent) per fornire il contesto completo del progetto.
> Ultimo aggiornamento: 15 Luglio 2026 | Versione: v3.15

---

## 🎯 Missione

Youth Football Manager è la **memoria digitale della squadra di calcio giovanile**. Centralizza gestione giocatori, partite, statistiche, allenamenti, convocazioni e comunicazioni per società sportive dilettantistiche italiane.

**Target**: Allenatori, dirigenti e famiglie di squadre giovanili (Under 14-17).

**Modello business**: SaaS — €99/anno (Coach, 1 squadra) | €249/anno (Club, illimitate).

---

## 🏗️ Stack Tecnologico

| Layer | Tecnologia | Deploy |
|-------|-----------|--------|
| Frontend | Vite 6 + JavaScript ES Modules (no framework) | Vercel (static) |
| Backend | Node.js + Express (14 router modulari) | Vercel (serverless) |
| Database | Supabase (PostgreSQL) eu-west-1 | Supabase Cloud |
| Auth | JWT custom (7gg) + Guest tokens (24h) | — |
| Styling | CSS custom (no Tailwind) | — |
| State | Window globals (`window.YFM.*`) | — |

**URL Produzione**:
- App: https://youth-football-manager.vercel.app
- API: https://youth-football-manager-backend.vercel.app/api

---

## 📁 Struttura Repository

```
youth-football-manager/
├── frontend-v2/src/
│   ├── main.js                 # Entry point + init
│   ├── router.js               # Routing SPA
│   ├── style.css               # Stili globali
│   ├── services/api.js         # apiFetch wrapper con auth
│   ├── utils/
│   │   ├── formatters.js       # Date, avatar colors
│   │   └── ui.js               # Loading, custom alert/confirm
│   ├── components/
│   │   ├── layout/             # Sidebar, header
│   │   ├── PageHelp.js         # Help interattivo
│   │   └── helpData.js         # Contenuti help
│   └── modules/
│       ├── auth/               # Login, guest view, absence reporting
│       ├── admin/              # Users CRUD, guest links, workspaces
│       ├── team/               # Dashboard, roster, calendar, formazione, convocazioni, matchDetail, playerDetail
│       ├── coach/              # Training (presenze, config, templates), notifications, tournaments
│       ├── performance/        # Stats, reports (PDF)
│       ├── club/               # Staff, seasons/categories, settings
│       └── import/             # Import center (PDF, XLS, Tuttocampo, GR)
│
├── backend/api/
│   ├── index.js                # Entry: middleware, health, mount 14 router
│   ├── pdfCalendarioParser.js  # Parser PDF calendario SGS/LND
│   ├── helpers/
│   │   ├── tuttocampo.js       # Login/scraping Tuttocampo
│   │   ├── importUtils.js      # Normalizzazione nomi, parsing eventi, log
│   │   ├── importFormationTC.js # Import formazioni da TC
│   │   └── gazzettaRegionale.js # Fetch classifica/calendario/marcatori GR
│   └── routes/
│       ├── auth.js             # Login, register, users CRUD, guest (batch delete/renew)
│       ├── workspace.js        # Workspace, facility, staff workspace
│       ├── team.js             # Squadre CRUD, stagioni, categorie
│       ├── training.js         # Config, presenze, templates, allenamenti-futuri (virtuali)
│       ├── match.js            # Partite CRUD, convocazioni, formazione, eventi
│       ├── staff.js            # Staff per distinta
│       ├── admin.js            # Migrazioni schema
│       ├── statistics.js       # Stats complete, top players, report
│       ├── player.js           # Calciatori CRUD, scadenze, stats
│       ├── roster.js           # Import rosa XLS/Tuttocampo
│       ├── importCalendario.js # PDF, testo SGS, import-log
│       ├── importTuttocampo.js # Scraping calendario TC, eventi, loghi
│       ├── importConfirm.js    # Confirm TC, formations batch
│       ├── gazzettaRegionale.js # Classifica, calendario, marcatori, loghi GR
│       └── absence.js          # Segnalazione assenze atleti (notifiche)
│
└── .agents/                    # Documentazione per AI agents
```

---

## 🗄️ Schema Database

### Convenzione: Tabelle in inglese, colonne in italiano

| Tabella | Descrizione | Relazioni chiave |
|---------|-------------|-----------------|
| `workspace` | Società sportiva (multi-tenant) | — |
| `season` | Stagione sportiva | → workspace_id |
| `category` | Categorie (U14, U15, U16...) | → workspace_id |
| `competition` | Campionati | — |
| `facility` | Impianti sportivi | → workspace_id |
| `team` | Squadra (1 per stagione+categoria) | → season_id, category_id |
| `player` | Giocatore (anagrafica) | — |
| `team_player` | Associazione giocatore↔squadra | → team_id, player_id. Campi: stato, aggregato, numero_maglia |
| `staff` | Personale (qualifiche JSONB) | → workspace_id |
| `team_staff` | Staff assegnato a squadra | → team_id, staff_id, ruolo_squadra |
| `match` | Partita | → team_id, competition_id. Campi: formazione_meta JSONB, archiviata |
| `match_event` | Eventi (GOL, ASSIST, YELLOW...) | → match_id, player_id |
| `match_formation` | Formazione partita | → match_id, team_player_id |
| `match_statistics` | Statistiche dettagliate | → match_id, team_player_id |
| `convocation` | Convocazioni | → match_id, team_player_id |
| `training` | Sessioni allenamento | → team_id |
| `training_attendance` | Presenze allenamenti | → training_id, team_player_id |
| `training_config` | Settimana tipo (giorni/orari) | → team_id, giorno_settimana |
| `training_template` | Template programma seduta | → team_id, programma JSONB |
| `valutazione_partita` | Valutazioni giocatore | → partita_id, calciatore_id |
| `document` | Documenti polimorfici | entita_tipo, entita_id |
| `users` | Utenti sistema | → workspace_id. Campi: ruolo, permessi JSONB, squadre_accesso[] |
| `guest_token` | Token guest | → utente_id. Campi: token, tipo, squadre_accesso, scadenza |
| `import_log` | Storico importazioni | → workspace_id, team_id |
| `team_logo` | Loghi avversari (777+) | nome_normalizzato UNIQUE, logo_path |
| `tournament` | Tornei | → workspace_id, team_id |
| `absence_notification` | Segnalazioni assenza atleti | → player_id, team_id, training_id (nullable) |

### Relazioni importanti
- `convocation`, `match_formation`, `training_attendance` usano `team_player_id` (NON player_id diretto)
- `users.squadre_accesso` contiene **category_id** (non team_id) — la categoria è persistente tra stagioni
- `match.formazione_meta` JSONB: `{modulo, positions}` per layout campo visuale
- `staff.qualifiche` JSONB: `{matricola, tessera_figc, tessera_lnd, tipo_tessera}`

---

## 🔐 Sistema Autorizzazioni

| Ruolo | Accesso |
|-------|---------|
| Superadmin | Tutto, tutti i workspace, gestione utenti globale |
| Admin | Tutto nel proprio workspace |
| Allenatore | Limitato a categorie assegnate + permessi granulari |
| Guest (atleta/genitore) | Solo lettura: dashboard, calendario, stats figlio, segnala assenza |

**Permessi granulari** (`users.permessi` JSONB):
- Moduli: `rosa`, `partite`, `formazione`, `allenamenti`, `statistiche`, `guest_links`
- Livelli: `""` (nessuno), `"read"`, `"write"`

---

## ✅ Moduli Funzionanti (v3.15)

| Modulo | Descrizione |
|--------|-------------|
| **Dashboard** | Trend ultimi 5, badge competizione, classifica GR (lazy), prossima partita |
| **Rosa** | CRUD giocatori, import XLS FIGC, import Tuttocampo, aggregati, svincolati |
| **Calendario** | Partite con archivio, import PDF/testo/TC, risultati, eventi |
| **Convocazioni** | Selezione giocatori per partita |
| **Formazione** | Campo visuale con drag&drop, moduli tattici |
| **Distinta** | PDF distinta gara con staff |
| **Match Detail** | Dettaglio partita con timeline eventi |
| **Allenamenti** | Presenze batch, settimana tipo, templates programma |
| **Statistiche** | Stats individuali e squadra, top players |
| **Report** | PDF partita, stagionale, giocatore |
| **Import Center** | PDF SGS, XLS FIGC, Tuttocampo (calendario+formazioni+eventi), GR |
| **Staff** | CRUD con qualifiche, assegnazione a squadre |
| **Guest Links** | Generazione batch, multi-select delete/renew, scadenza stagionale |
| **Guest View** | Dashboard read-only, calendario, segnalazione assenze |
| **Help** | Sistema help interattivo contestuale (popover + overlay) |
| **Gazzetta Regionale** | Classifica, calendario, marcatori da API esterna |
| **Loghi** | 777+ loghi avversari, wizard batch da GR |

---

## 🚧 Moduli Pianificati (non ancora implementati)

| Modulo | Priorità | Note |
|--------|----------|------|
| Infortuni | P1 | Tabella `injury`, auto-cambio stato giocatore, widget dashboard |
| Visite Mediche (storico) | P1 | Tabella `player_medical`, alert scadenze |
| Valutazioni (completamento UI) | P2 | Tabella esiste, UI incompleta |
| Tornei (riattivazione) | P3 | Codice già pronto, solo da riattivare |
| Email convocazioni | P2 | SendGrid |
| Notifiche in-app | P2 | — |
| Google Calendar sync | P2 | — |
| Test fisici | P3 | — |
| App mobile nativa | P3 | — |

---

## 🏛️ Pattern Architetturali

### Frontend
- **No framework**: Vanilla JS con ES Modules, routing custom
- **Rendering**: innerHTML con template literals (no virtual DOM)
- **State**: `window.YFM` globals (user, squadraId, allSquadre)
- **Modali**: `createModal()` utility o div con `display:none`
- **Cache dual-layer**: Memory (2min) per dati DB, sessionStorage (10min) per API esterne
- **Lazy loading**: Dati esterni lenti (>500ms) caricati dopo render iniziale
- **Custom dialogs**: `window.alert()` e `window.confirm()` overridden con popup styled (confirm è async/Promise)

### Backend
- **Router modulari**: Ogni dominio ha il suo file in `routes/`
- **Auth middleware**: JWT verificato su ogni endpoint protetto
- **Batch operations**: Sempre 1 query per N record (`WHERE id = ANY($1)` o `.in()`)
- **Supabase JS** per CRUD semplice, **pg diretto** per JOIN/transazioni/migrazioni
- **Endpoint batch**: `DELETE /api/risorsa-batch`, `PUT /api/risorsa-batch` con body `{ids:[...]}`

### Database
- **Multi-tenant**: Ogni query filtrata per workspace_id
- **Pivot table**: `team_player` è il centro di tutte le relazioni giocatore↔squadra
- **JSONB**: Per metadati, configurazioni, layout (formazione_meta, qualifiche, permessi)
- **Sessioni virtuali**: `/allenamenti-futuri` genera sessioni dalla `training_config` senza crearle nel DB

### Performance
- Latenza DB Supabase: ~130-150ms per query semplice
- Dashboard: 7 query parallele (~450ms dati DB + lazy GR ~600ms)
- Cache invalidata esplicitamente dopo ogni operazione di scrittura

---

## 🎨 Design System

| Elemento | Valore |
|----------|--------|
| Primary | `#667eea` |
| Success | `#27AE60` |
| Warning | `#F39C12` |
| Danger | `#E74C3C` |
| Card radius | 12px |
| Button radius | 10px |
| Input radius | 8px |
| Hover card | `translateY(-8px) scale(1.03)` |

**Lingua UI**: Italiano. Emoji per leggibilità (⚽📅🏆).

---

## 📋 Convenzioni Codice

- JavaScript ES6+, 2 spazi, punto e virgola obbligatorio, virgolette singole
- Naming: camelCase (variabili/funzioni), PascalCase (classi), SCREAMING_SNAKE (costanti)
- Tabelle DB: inglese. Colonne DB: italiano
- Commit: `feat:`, `fix:`, `docs:`, `refactor:`, `style:`
- Nessun `console.log` in produzione
- Tutti gli endpoint di scrittura con `authMiddleware`
- Accessibilità: `title` su icone, HTML semantico

---

## 🔄 Flussi Chiave

### Segnalazione Assenza (Guest → Mister)
1. Atleta apre "Segnala Assenza" → vede prossime 3 settimane (reali + virtuali da config)
2. Seleziona allenamento → sceglie motivo + messaggio opzionale
3. Inserito in `absence_notification` (solo notifica, non modifica presenze)
4. Mister apre pagina Presenze → vede "⚠️ Assenza segnalata" accanto al giocatore
5. Mister decide se segnare assente e salva presenze normalmente

### Import Dati
1. Upload PDF/XLS o URL Tuttocampo
2. Backend parsa e restituisce preview
3. Utente conferma → insert batch nel DB
4. Log in `import_log`

### Cache & Performance
1. Dashboard carica dati DB veloci (~150ms) → render immediato
2. Dati esterni (classifica GR) caricati lazy in background (~600ms)
3. Cache memory 2min per dati frequenti, sessionStorage 10min per dati esterni
4. Invalidazione esplicita dopo ogni scrittura (save risultato, archivia, elimina)

---

## 🏢 Workspace di Produzione

| Workspace | Categorie | Utenti |
|-----------|-----------|--------|
| SSD New Team | Under 15, 16, 17 | Superadmin (test) |
| Albalonga | — | Francesco Annese (admin) |
| DF Academy | Under 15 | Matteo Urilli (allenatore) |

---

## 💡 Come Usare Questo Contesto

Quando progetti una nuova funzionalità, considera:

1. **Dove si inserisce** nella struttura moduli (frontend) e routes (backend)
2. **Quali tabelle** servono (nuove o esistenti) — rispetta naming convention
3. **Relazioni**: usa `team_player_id` come pivot, `category_id` per accesso
4. **Batch**: ogni operazione multi-record = 1 query SQL
5. **Cache**: se il dato viene mostrato in dashboard/stats, prevedi invalidazione
6. **Permessi**: chi può accedere? (ruolo + modulo + livello)
7. **Guest**: se visibile ai guest, deve funzionare con JWT guest (solo lettura)
8. **UI**: card con radius 12px, colori dal design system, emoji per leggibilità
9. **Micro-task**: scomponi in task da max 15min, con dipendenze esplicite

**Output ideale per lo sviluppatore**:
- Schema tabella SQL (se nuova)
- Lista endpoint con request/response
- Wireframe testuale della UI
- Lista micro-task ordinati con dipendenze
- File coinvolti (frontend + backend)
