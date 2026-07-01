# Youth Football Manager - Roadmap

## Stato Sviluppo

**Versione Attuale**: v3.15
**Target MVP**: Fine Settembre 2026

---

## Fasi di Sviluppo

### FASE 1 ✅ COMPLETATA
**Sistema Auth/Ruoli**
- [x] Login con JWT
- [x] Registrazione utenti
- [x] Ruoli: admin, allenatore, staff, guest
- [x] Gestione utenti (CRUD)
- [x] Link guest temporanei
- [x] Multi-workspace isolation

### FASE 2 📋 TODO
**Import Dati**
- [x] Import CSV base (struttura)
- [ ] Import CSV avanzato (campi FIGC completi)
- [ ] Import Tuttocampo (web scraping)
- [ ] Centro Importazioni con:
  - [ ] Log operazioni
  - [ ] Rilevamento duplicati
  - [ ] Matching intelligente giocatori

### FASE 3 📋 TODO
**Dashboard e Analytics**
- [ ] Dashboard coach con insights
- [ ] Statistiche avanzate (xG, passaggi, etc.)
- [ ] Confronto giocatori
- [ ] Trend stagionali

### FASE 4 📋 TODO
**Polish e Launch**
- [ ] Test end-to-end completi
- [ ] Ottimizzazione performance
- [ ] Documentazione utente
- [ ] Video tutorial

---

## Backlog Funzionalità

### Alta Priorità (P1)

#### Gestione Giocatori
- [ ] Scheda giocatore avanzata con foto
- [ ] Storico presenze/assenze
- [ ] Note allenatore personali
- [ ] Allegati (certificati medici, etc.)

#### Calendario Partite
- [ ] Integrazione Google Calendar
- [ ] Notifiche push per partite
- [ ] Previsioni meteo per giorno partita
- [ ] Statistiche testa-a-testa con avversari

#### Report e Documenti
- [ ] Report presenze allenamenti
- [ ] Distinta FIGC in formato ufficiale
- [ ] Elenco rosa stampabile
- [ ] Certificato trasferta

### Media Priorità (P2)

#### Comunicazioni
- [ ] Notifiche in-app
- [ ] Email per convocazioni (SendGrid?)
- [ ] Broadcast ai genitori
- [ ] Bacheca annunci

#### Performance
- [ ] Tracking fitness giocatori
- [ ] Questionari pre/post partita
- [ ] Analisi video (integrazione)
- [ ] Statistiche Avanzate (xG, heatmaps)

### Bassa Priorità (P3)

#### Funzionalità Extra
- [ ] Gamification (badge, achievement)
- [ ] Integrazione social
- [ ] App mobile nativa
- [ ] Integrazione pagamenti (quando necessario)

---

## Bug Noti

### Critici
- Nessuno

### Risolti (Luglio 2026)
- [x] Endpoint senza authMiddleware (partite, calciatori) → protetti
- [x] Statistiche calcolate con stima → calcolo reale da gol_casa/gol_ospite
- [x] Training usa tabelle inesistenti → allineato a training + training_attendance + training_config
- [x] guest_link inesistente → allineato a guest_token
- [x] formazione_partita inesistente → allineato a match_formation
- [x] convocation usa player_id → corretto in team_player_id (con mapping calciatoreId)
- [x] formatTime non gestisce ISO datetime → fix
- [x] Mismatch snake_case/camelCase (presenze, scadenze, numero_maglia) → fix
- [x] 15+ endpoint mancanti nel backend → aggiunti
- [x] Pagina login con riferimenti demo → rimossi, stile rinnovato
- [x] Calendario restyling completo (progress dots, card cliccabili, mobile toggle, LIVE)
- [x] Formazione: campo visuale con drag&drop, 8 moduli, posizioni custom persistenti (formazione_meta JSONB)
- [x] Formazione mobile: tap-to-place + free-move + slot suggeriti per ruolo
- [x] Formazione desktop: role hints durante drag + vincolo portiere
- [x] Distinta: fallback convocati, staff con dropdown selezione + dati completi
- [x] Allenamenti: split in 3 sotto-pagine (Sedute, Presenze, Impostazioni)
- [x] Allenamenti: calendario mostra partite, presenze batch, template DB con card compatte
- [x] Statistiche: 5 widget, alert diffidati, tabella con sorting, badge ruolo, minutaggio per categoria
- [x] Performance: batch convocazioni, eventi, presenze (1 fetch invece di N)
- [x] Build-info: counter incrementale v3.15.N
- [x] Data oggi: fix UTC vs locale nel calendario
- [x] Help contestuale: bottone ? con guida per ogni pagina

### Minori
- [ ] Filtro categorie: staff vede tutte le squadre invece di quelle assegnate
- [ ] Valutazioni giocatore: sistema incompleto
- [ ] Workspace isolation non completo su tutti gli endpoint GET

---

## Technical Debt

### Refactoring Suggeriti
- [ ] Estrarre API client in modulo separato
- [ ] Centralizzare gestione errori API
- [ ] Sostituire window.YFM con stato react/query
- [ ] Aggiungere TypeScript gradualmente

### Test
- [ ] Setup CI/CD con test
- [ ] Test E2E con Playwright
- [ ] Test API con Supertest

---

## Note Deploy

### Quando rilasciare nuove versioni
1. Feature completata e testata localmente
2. Build ID generato correttamente
3. Messaggio commit descrittivo
4. Push su main → deploy automatico

### Rollback
Se un deploy causa problemi:
1. Identifica commit funzionante
2. `git revert <commit-hash>`
3. Push → nuovo deploy

---

## Metriche Obiettivo 2026

| Metrica | Target |
|---------|--------|
| Società paganti | 15-30 |
| Giocatori gestiti | 500+ |
| Partite/mese | 100+ |
| uptime | 99.5% |
