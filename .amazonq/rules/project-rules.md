# Regole di Progetto - Youth Football Manager

## Documentazione Obbligatoria

Dopo ogni build significativa (nuove feature, fix di bug multipli, refactoring, modifiche allo schema DB, aggiunta/rimozione endpoint API), l'agente DEVE aggiornare la documentazione:

1. **`.agents/knowledge/ROADMAP.md`** — Spostare task completati nella sezione "Risolti", aggiornare bug noti
2. **`.agents/knowledge/ARCHITECTURE.md`** — Aggiornare se cambiano tabelle DB, endpoint API, struttura file
3. **`.agents/AGENTS.md`** — Aggiornare schema DB, versione, comandi utili
4. **`PROJECT_STATUS.md`** — Aggiornare ultimi commit, stato moduli, tabelle DB

## Schema Database (Fonte di verità)

Le tabelle reali nel DB Supabase sono:
- `workspace`, `season`, `category`, `competition`, `facility`
- `team`, `player`, `team_player`, `staff`, `team_staff`
- `match`, `match_event`, `match_formation`, `match_statistics`, `convocation`
- `training`, `training_attendance`
- `valutazione_partita`, `document`
- `users`, `guest_token`

**NON ESISTONO** (non usare mai nel codice):
- `formazione_partita` → usa `match_formation`
- `presenza_allenamento` → usa `training` + `training_attendance`
- `allenamento_config` / `configurazione_allenamento` → non esiste
- `guest_link` → usa `guest_token`
- `calciatore` → usa `player`
- `squadra` → usa `team`
- `stagione` → usa `season`
- `utente` → usa `users`
- `rosa` → usa `team_player`
- `partita` → usa `match`
- `evento_partita` → usa `match_event`

## Relazioni chiave nel DB

- `convocation` usa `team_player_id` (NON `player_id`)
- `match_formation` usa `team_player_id` (NON `player_id`)
- `training_attendance` usa `training_id` + `team_player_id`
- `guest_token` ha colonne: `token, utente_id, tipo, squadre_accesso, scadenza`

## Regole di Sviluppo

- **Nessun riferimento alla demo** nel progetto principale (la demo è nel repo separato `youth-football-manager-demo`)
- **La registrazione è solo per admin/superadmin** — non esporre endpoint pubblici di registrazione
- **Tutti gli endpoint di scrittura** (POST/PUT/DELETE) devono avere `authMiddleware`
- **Nessun `console.log` di debug** nel codice pushato in produzione
- **Build test obbligatorio** prima di ogni commit (`npm run build` nel frontend, `node -c api/index.js` nel backend)
- **Porta locale backend**: 3002 (non 3001)
- **Versione attuale**: v3.15

## Convenzioni Commit

```
feat: nuova funzionalità
fix: correzione bug
docs: documentazione
refactor: refactoring codice
style: stili (CSS)
```

## Workflow Post-Modifica

1. Implementa le modifiche
2. Testa: `cd frontend-v2 && npm run build` + `cd backend && node -c api/index.js`
3. Se la modifica è significativa → aggiorna documentazione (vedi sopra)
4. Commit con messaggio descrittivo
5. Push su main → deploy automatico Vercel
