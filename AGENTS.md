# Youth Football Manager - Contesto Progetto

## Stack Tecnico
- **Frontend**: Vite + JavaScript ES modules, deploy su Vercel
- **Backend**: Node.js/Express, deploy su Vercel
- **Database**: Supabase (PostgreSQL)
- **Autenticazione**: Auth Supabase (opzionale)

## Struttura Progetto
```
/frontend-v2/src/
  /modules/team/
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
  /modules/coach/
    training.js       - Allenamenti e presenze
  /modules/performance/
    stats.js          - Statistiche disciplina
    reports.js        - Report partita/stagionale
  /modules/club/
    settings.js       - Impostazioni
    workspace.js      - Info società
  /services/api.js    - Chiamate API
  /utils/            - Formatters e UI utils
  main.js            - Entry point
  router.js          - Routing

/backend/api/index.js - Tutti gli endpoint API (v3.12)
```

## Tabelle DB Principali
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
1. **Prima di ogni modifica**: Verificare struttura DB esistente con API Supabase
2. **Prima di ogni feature**: Creare PLAN dettagliato e validare con utente
3. **Endpoint**: Verificare se esistono già prima di crearne di nuovi
4. **Commit**: Sempre con messaggio descrittivo e push

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
- **Campo**: `partita.archiviata` (boolean)
- **Pulsante Archivia**: visibile SOLO per partite passate con risultato
- **Dopo archiviazione**: stile visivo grigio (#8B7355), icona 📦, Edit/Elimina nascosti
- **Sblocca**: disponibile per riattivare modifiche

### Gestione Moduli (Formazione/Eventi/Convocazioni)
- **Non archiviata**: modal modificabile
- **Archiviata**: modal sola lettura con badge "📦 Partita Archiviata"

---

## Endpoint API principali

### Partite
- `GET /api/partite/:id/dettaglio` - Dettaglio con eventi e campo archiviata
- `PUT /api/partite/:id/archivia` - Archivia partita
- `PUT /api/partite/:id/sblocca` - Sblocca partita archiviata

### Formazione e Convocazioni
- `GET /api/partite/:id/formazione` - Formazione (array diretto)
- `POST /api/partite/:id/formazione` - Salva formazione
- `GET /api/partite/:id/convocazioni` - Convocazioni

### Eventi
- `POST /api/partite/:id/evento-item` - Inserisci singolo evento
- `POST /api/partite/:id/eventi-batch` - Inserisci batch eventi
- `DELETE /api/partite/:id/eventi-batch` - Elimina tutti eventi

### Valutazioni
- `GET /api/partite/:id/valutazioni` - Lista valutazioni
- `POST /api/partite/:id/valutazioni` - Salva batch valutazioni

---

## Task Completati ✅
- ✅ **Timeline Partita** - Vista minuto-per-minuto eventi in matchDetail.js
- ✅ **Archivia Partita** - Blocco modifiche per partite concluse

## Task Sospesi ⏸️
- ⏸️ **Valutazioni Giocatore** - Valutazioni tecniche per stagione/partita

## Ultime Modifiche (commit: abad1ab)
- Fix logica Archivia Partita con UI corretta
- Solo icona 📦 (senza etichetta "Archiviata")
- Rimosso pulsante Formazione duplicato
- Partite future con risultato: pulsante "✏️ Eventi" per continuare modifiche

## URL Applicazione
- **Frontend**: https://youth-football-manager.vercel.app
- **Backend**: https://youth-football-manager-backend.vercel.app
- **Repo**: https://github.com/ecopraf/youth-football-manager
