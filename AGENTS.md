# Youth Football Manager - Contesto Progetto

## Stack Tecnico
- **Frontend**: React + Vite, deploy su Vercel
- **Backend**: Node.js/Express, deploy su Render o simile
- **Database**: Supabase (PostgreSQL)
- **Autenticazione**: Auth Supabase

## Struttura Progetto
```
/frontend-v2/src/
  /modules/team/
    calendar.js      - Calendario partite
    distinta.js     - Distinta partita
    formazione.js   - Gestione formazione
    convocazioni.js - Gestione convocazioni
    resultForm.js   - Inserimento risultato/eventi (futuro)
    valutazioni.js  - Valutazioni giocatori (passate)
    playerDetail.js - Scheda giocatore
    matchDetail.js  - Dettaglio partita
  /services/api.js  - Chiamate API
  main.js           - Entry point, routing

/backend/api/index.js - Tutti gli endpoint API
```

## Tabelle DB Principali
- `calciatori` - Giocatori
- `rosa` - Associazione giocatori-squadra
- `squadra` - Squadre
- `partita` - Partite
- `convocazione` - Convocazioni
- `formazione_partita` - Formazioni
- `evento_partita` - Eventi (GOAL, YELLOW, RED, ASSIST, GOAL_SUBITO)
- `valutazione_partita` - Valutazioni (calciatore_id, voto, nota_allenatore)

## Regole Chat (da rispettare SEMPRE)
1. **Prima di ogni modifica**: Verificare struttura DB esistente con API Supabase
2. **Prima di ogni feature**: Creare PLAN dettagliato e validare con utente
3. **Endpoint**: Verificare se esistono già prima di crearne di nuovi
4. **Commit**: Sempre con messaggio descrittivo e push

## Flusso Logico Attuale

### Calendario Partite
```
├── ⚽ PROSSIMA PARTITA (evidenziata)
├── 📅 Prossime Partite (ordinate per data)
└── 🏆 Partite Giocate (ordinate per data DESC)
```

### Gestione Singola Partita
- **Futura senza risultato**: [📊 Risultato] → form eventi+valutazioni
- **Passata con risultato**: [✏️ Eventi] [👥 Formazione] [⭐ Valutazioni]

## Endpoint API principali
- `GET /api/partite/:id/dettaglio` - Dettaglio con eventi
- `GET /api/partite/:id/formazione` - Formazione (array diretto)
- `GET /api/partite/:id/convocazioni` - Convocazioni
- `POST /api/partite/:id/eventi` - Inserisci evento
- `DELETE /api/partite/:id/eventi` - Elimina tutti eventi
- `GET /api/partite/:id/valutazioni` - Lista valutazioni
- `POST /api/partite/:id/valutazioni` - Salva batch valutazioni

## Task Da Completare
- [ ] Pulsante "Archivia Partita" per bloccare modifiche dopo conclusione

## Ultime Modifiche (commit: 7bae49f)
- Fix completo eventi/valutazioni
- Scheda valutazioni separata per partite passate
- Risultato dinamico che si aggiorna in tempo reale

## URL Applicazione
- Frontend: https://youth-football-manager.vercel.app
- Repo: https://github.com/ecopraf/youth-football-manager
