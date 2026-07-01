# Regole di Progetto - Youth Football Manager

## Onboarding Obbligatorio (Inizio Chat)

All'inizio di ogni nuova conversazione, l'agente DEVE leggere i seguenti file per allinearsi allo stato attuale del progetto:

1. **`.agents/AGENTS.md`** — Entry point, schema DB, comandi, workflow
2. **`.agents/knowledge/ROADMAP.md`** — Backlog, bug noti, priorità
3. **`PROJECT_STATUS.md`** — Stato moduli, ultimi commit, architettura

Solo dopo aver letto questi file l'agente può procedere con il task richiesto dall'utente.

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
- `training`, `training_attendance`, `training_config`, `training_template`
- `valutazione_partita`, `document`
- `users`, `guest_token`

**NON ESISTONO** (non usare mai nel codice):
- `formazione_partita` → usa `match_formation`
- `presenza_allenamento` → usa `training` + `training_attendance`
- `allenamento_config` / `configurazione_allenamento` → usa `training_config`
- `guest_link` → usa `guest_token`
- `calciatore` → usa `player`
- `squadra` → usa `team`
- `stagione` → usa `season`
- `utente` → usa `users`
- `rosa` → usa `team_player`
- `partita` → usa `match`
- `evento_partita` → usa `match_event`
- `training_material` → non esiste

## Relazioni chiave nel DB

- `convocation` usa `team_player_id` (NON `player_id`)
- `match_formation` usa `team_player_id` (NON `player_id`)
- `training_attendance` usa `training_id` + `team_player_id`
- `training_config` usa `team_id` + `giorno_settimana` (settimana tipo)
- `training_template` usa `team_id` + `programma` JSONB
- `match.formazione_meta` JSONB contiene `{modulo, positions}` per il layout campo
- `staff.qualifiche` JSONB contiene `{matricola, tessera_figc, tessera_lnd, tipo_tessera}`
- `guest_token` ha colonne: `token, utente_id, tipo, squadre_accesso, scadenza`

## Regole di Sviluppo

- **Nessun riferimento alla demo** nel progetto principale (la demo è nel repo separato `youth-football-manager-demo`)
- **La registrazione è solo per admin/superadmin** — non esporre endpoint pubblici di registrazione
- **Tutti gli endpoint di scrittura** (POST/PUT/DELETE) devono avere `authMiddleware`
- **Nessun `console.log` di debug** nel codice pushato in produzione
- **Build test obbligatorio** prima di ogni commit (`npm run build` nel frontend, `node -c api/index.js` nel backend)
- **Porta locale backend**: 3002 (non 3001)
- **Versione attuale**: v3.15
- **Mai riutilizzare campi esistenti per scopi diversi** — se serve un nuovo dato, creare una colonna/tabella dedicata (es. `formazione_meta JSONB` per i metadati formazione, non il campo `note` già usato per le note testuali)
- **Preferire campi JSONB** per dati strutturati che non richiedono query dirette (metadati, configurazioni, layout)

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

## Gestione Task Complessi

### Stima e Progress

Quando l'utente richiede modifiche significative, l'agente DEVE:

1. **Analizzare** la complessità e scomporre il lavoro in task numerati
2. **Stimare** il tempo necessario per ogni task (es. ~2min, ~5min)
3. **Mostrare una tabella di progresso** aggiornata ad ogni step completato:

```
| # | Task                          | Stima | Stato |
|---|-------------------------------|-------|-------|
| 1 | Fix endpoint partite          | ~2min | ✅    |
| 2 | Restyling calendario          | ~5min | ⏳    |
| 3 | Test build                    | ~1min | ⬜    |
```

4. **Aggiornare** lo stato (⬜ → ⏳ → ✅) man mano che completa ogni task
5. **Comunicare** al termine di ogni task prima di procedere al successivo

### Suddivisione in Sottomoduli

Se una modifica è troppo complessa (tocca più di 3-4 file con logica diversa), l'agente DEVE:

1. **Valutare** se creare file/moduli separati anziché un unico file monolitico
2. **Preferire** la separazione in moduli quando:
   - Un file supera le 500 righe
   - La logica copre domini diversi (es. auth + training + match nello stesso handler)
   - Ci sono funzioni utility riutilizzabili in più punti
3. **Proporre** la struttura modulare all'utente prima di implementarla
4. **Non modificare mai** più di 200 righe in un singolo step senza conferma
