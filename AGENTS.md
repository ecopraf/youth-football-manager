# Youth Football Manager - Contesto Progetto

## Stack Tecnico
- **Frontend**: Vite + JavaScript ES modules, deploy su Vercel
- **Backend**: Node.js/Express, deploy su Vercel
- **Database**: Supabase (PostgreSQL)
- **Autenticazione**: JWT custom + Link Guest

## Struttura Progetto
```
/frontend-v2/src/
  /modules/
    auth/
      login.js      - Login page
      guest.js      - Guest link activation
    admin/
      users.js      - Gestione utenti (Admin)
      guestLinks.js - Gestione link guest (Admin)
    team/
      calendar.js       - Calendario partite (con archiviazione)
      distinta.js       - Distinta FIGC
      formazione.js     - Gestione formazione
      convocazioni.js   - Gestione convocazioni
      resultForm.js     - Inserimento eventi/risultato
      valutazioni.js    - Valutazioni giocatori
      playerDetail.js   - Scheda giocatore
      matchDetail.js    - Dettaglio partita con timeline
      noteAvversario.js - Note avversario
      roster.js         - Rosa giocatori
      squadre.js        - Gestione squadre
      dashboard.js      - Dashboard con prossima partita
    coach/
      training.js       - Allenamenti e presenze
    performance/
      stats.js          - Statistiche disciplina
      reports.js        - Report partita/stagionale
    club/
      settings.js       - Impostazioni
      workspace.js      - Info società
  /services/api.js    - Chiamate API
  /utils/             - Formatters e UI utils
  main.js             - Entry point
  router.js           - Routing

/backend/api/index.js - Tutti gli endpoint API
```

## Tabelle DB Principali
- `utente` - Utenti sistema (id, email, password_hash, nome, cognome, ruolo, ruoli, squadre_accesso, is_active, is_superadmin, workspace_id)
- `guest_token` - Token guest (token, tipo, squadre_accesso, scadenza, utente_id)
- `calciatori` - Giocatori
- `rosa` - Associazione giocatori-squadra
- `squadra` - Squadre
- `stagione` - Stagioni sportive
- `workspace` - Società/club
- `partita` - Partite (con campo `archiviata`)
- `convocazione` - Convocazioni
- `formazione_partita` - Formazioni
- `evento_partita` - Eventi (GOAL, SUBITO, YELLOW, RED, ASSIST, IN, OUT)
- `valutazione_partita` - Valutazioni

## Regole Chat (da rispettare SEMPRE)
1. Prima di ogni modifica: Verificare struttura DB esistente con API Supabase
2. Prima di ogni feature: Creare PLAN dettagliato e validare con utente
3. Endpoint: Verificare se esistono già prima di crearne di nuovi
4. Commit: Sempre con messaggio descrittivo e push
5. Documentazione: Dopo ogni feature importante, aggiornare AGENTS.md

---

## Sistema Auth (Auth FASE 1) ✅ COMPLETATO

### Ruoli Utente
- **admin**: Accesso completo, gestisce utenti e link guest
- **allenatore**: Gestisce rosa, partite, formazioni, eventi
- **staff**: Accesso limitato
- **guest**: Accesso temporaneo via link (atleta/genitore)

### Gestione Utenti
- CRUD utenti da pannello Admin
- Campo squadre_accesso per limitare accesso per categoria
- Campo is_active per disattivare utenti

### Link Guest
- Generazione link temporanei con scadenza
- URL formato: /guest/{token}
- Tipi: atleta o genitore
- Gestione accesso per categorie specifiche

### Endpoint Auth
- POST /api/auth/login - Login
- POST /api/auth/register - Registrazione
- GET /api/auth/users - Lista utenti (Admin)
- POST /api/auth/users - Crea utente (Admin)
- PUT /api/auth/users/:id - Modifica utente (Admin)
- DELETE /api/auth/users/:id - Disattiva utente (Admin)
- POST /api/auth/guest-link - Genera link guest (Admin)
- GET /api/auth/guest-links - Lista link guest (Admin)
- DELETE /api/auth/guest-link/:token - Revoca link (Admin)
- GET /api/guest/:token - Attivazione guest

---

## Dashboard
- **Prossima Partita**: Evidenziata in alto con dati e pulsanti Convocazioni/Dettagli
- **Widgets**: Punti, Giocate, V, P, S, GF, GS, DR
- **Top 3**: Marcatori, Assist, Presenze
- **Migliori per Media Voto**
- **Ultimi Risultati**: Trend ultime 5 partite
- **Staff**: Allenatore, Dirigenti, Preparatore

---

## Flusso Logico: Calendario Partite

```
├── ⚽ PROSSIMA PARTITA (evidenziata in verde)
├── 📅 Prossime Partite (ordinate per data)
└── 🏆 Partite Giocate (ordinate per data DESC, con stile archivio)
```

### Logica Pulsanti Calendario

| Scenario | Pulsanti Visualizzati |
|----------|----------------------|
| **Futura senza risultato** | Formazione, Note, Convoca, Distinta, Edit, Elimina |
| **Futura con risultato** | Formazione, Note, Convoca, Distinta, ✏️ Eventi, Edit, Elimina |
| **Passata con risultato** | Formazione, Convoca, Distinta, 📦 Archivia, Edit, Elimina |
| **Passata archiviata** | Formazione, Convoca, Distinta, 🔓 Sblocca (stile grigio) |

### Logica Archiviazione
- **Campo**: partita.archiviata (boolean)
- **Pulsante Archivia**: visibile SOLO per partite passate con risultato
- **Dopo archiviazione**: stile visivo grigio (#8B7355), icona 📦, Edit/Elimina nascosti
- **Sblocca**: disponibile per riattivare modifiche

### Gestione Moduli (Formazione/Eventi/Convocazioni)
- **Non archiviata**: modal modificabile
- **Archiviata**: modal sola lettura con badge "📦 Partita Archiviata"

---

## Endpoint API principali

### Partite
- GET /api/partite/:id/dettaglio - Dettaglio con eventi e campo archiviata
- GET /api/squadre/:id/partite-future - Prossime partite
- PUT /api/partite/:id/archivia - Archivia partita
- PUT /api/partite/:id/sblocca - Sblocca partita archiviata

### Formazione e Convocazioni
- GET /api/partite/:id/formazione - Formazione (array diretto)
- POST /api/partite/:id/formazione - Salva formazione
- GET /api/partite/:id/convocazioni - Convocazioni

### Eventi
- POST /api/partite/:id/evento-item - Inserisci singolo evento
- POST /api/partite/:id/eventi-batch - Inserisci batch eventi
- DELETE /api/partite/:id/eventi-batch - Elimina tutti eventi

### Valutazioni
- GET /api/partite/:id/valutazioni - Lista valutazioni
- POST /api/partite/:id/valutazioni - Salva batch valutazioni

### Squadre
- GET /api/squadre - Lista squadre (pubblico)
- GET /api/squadre/:id/statistiche-complete - Statistiche complete
- GET /api/squadre/:id/top-players - Top marcatori, assist, presenze
- GET /api/squadre/:id/valutazioni-top - Migliori per media voto

---

## Accessibilità UI
- **Tooltip**: Tutti gli elementi iconografici senza testo visibile hanno attributo title
- **Icone**: emoji con title esplicativo per accessibilità
- **Scope**: calendario, dashboard, formazioni, eventi

---

## Roadmap MVP

### Target: MVP stabile entro metà Settembre 2026

| Fase | Contenuto | Stato |
|------|-----------|-------|
| **FASE 1** | Auth/Ruoli (Login, JWT, Admin/Allenatore/Staff) | ✅ COMPLETATO |
| **FASE 2** | Import CSV base (rosa, partite, eventi) | TODO |
| **FASE 3** | Import Tuttocampo (web scraping) | TODO |
| **FASE 4** | Centro Importazioni (log, duplicati, matching) | TODO |
| **FASE 5** | Polish, test, template repository | TODO |

---

## Task Completati ✅
- ✅ Timeline Partita - vista minuto-per-minuto eventi in matchDetail.js
- ✅ Archivia Partita - Blocco modifiche per partite concluse
- ✅ LIVE Indicator - Pallino e scritta LIVE lampeggianti per partite in corso
- ✅ Auth FASE 1 - Sistema ruoli, gestione utenti, link guest
- ✅ Dashboard Aggiornata - Prossima partita in evidenza, trend, top players
- ✅ Accessibilità - Tooltip su tutte le icone senza testo

## Task Sospesi ⏸️
- ⏸️ Valutazioni Giocatore - Valutazioni tecniche per stagione/partita
- ⏸️ Filtro Categorie - Staff vede solo squadre assegnate

## Ultime Modifiche (commit: 4b7c9e6)
- Dashboard: rimossa pulsante "+ Nuova Partita", aggiunta prossima partita in evidenza
- Dashboard: aggiunto endpoint /partite-future per prossime partite
- Utenti: fix reload invece di loadData dopo creazione
- Utenti: fix query order by id invece di created_at (colonna non esiste)
- Guest Links: fix copia link con event listener
- Accessibilità: aggiunto title tooltip su tutte le icone emoji

## URL Applicazione
- **Frontend**: https://youth-football-manager.vercel.app
- **Backend**: https://youth-football-manager-backend.vercel.app
- **Repo**: https://github.com/ecopraf/youth-football-manager
