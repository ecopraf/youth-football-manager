# 📊 Database Schema - Youth Football Manager

> Documento generato il 2025-07-14 — Fonte: Supabase PostgreSQL

---

## 🏗️ Gerarchia Principale

```
WORKSPACE (società sportiva)
 ├── SEASON (stagione: 2025/26, 2026/27)
 ├── CATEGORY (Under 15, Under 16 — persistente tra stagioni)
 ├── FACILITY (impianti sportivi)
 ├── STAFF (personale tecnico)
 └── USERS (utenti app)
        │
        └── TEAM (squadra = season + category)
              ├── TEAM_PLAYER (rosa) ──► PLAYER (anagrafica)
              ├── TEAM_STAFF (staff assegnato)
              ├── MATCH (partite)
              │    ├── MATCH_EVENT (gol, ammonizioni, sostituzioni)
              │    ├── MATCH_FORMATION (formazione titolare/panchina)
              │    ├── MATCH_STATISTICS (stats individuali)
              │    └── CONVOCATION (convocazioni)
              ├── TRAINING (allenamenti)
              │    └── TRAINING_ATTENDANCE (presenze)
              ├── TRAINING_CONFIG (settimana tipo)
              └── TRAINING_TEMPLATE (programmi salvati)
```

**Concetto chiave:** Il `TEAM` è l'entità operativa stagionale. Ogni stagione si crea un nuovo team per la stessa categoria. La `CATEGORY` è persistente e usata per i permessi utente.

---

## 📋 Tabelle Strutturali

### WORKSPACE — La società sportiva (root)

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| nome | varchar(100) | NO | | Es: "Albalonga" |
| logo_url | varchar(255) | SI | | |
| indirizzo | text | SI | | |
| telefono | varchar(50) | SI | | |
| email | varchar(255) | SI | | |
| sito_web | varchar(255) | SI | | |
| colori_sociali | varchar(100) | SI | | |
| sponsor_tecnico | varchar(100) | SI | | |
| nome_breve | text | SI | | Nome compatto per UI (sidebar, dashboard) |
| data_creazione | timestamptz | SI | now() | |

**Tabelle figlie dirette:** season, category, facility, staff, users, import_log, tournament

---

### SEASON — Stagione sportiva

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| workspace_id | uuid | NO | | FK → workspace.id |
| nome | varchar(100) | NO | | Es: "2025/26" |
| data_inizio | date | SI | | |
| data_fine | date | SI | | |
| attiva | boolean | SI | false | Stagione corrente |
| is_default | boolean | SI | false | Mostrata di default |
| created_at | timestamp | SI | now() | |

**Logica:** Ogni workspace ha più stagioni. Solo una è `attiva` alla volta.

---

### CATEGORY — Categoria d'età (persistente tra stagioni)

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| workspace_id | uuid | SI | | FK → workspace.id |
| nome | varchar(100) | NO | | Es: "Under 15" |
| tipo_campionato | varchar(50) | SI | 'Regionale' | |
| anno_da | integer | NO | | Anno nascita minimo |
| anno_a | integer | NO | | Anno nascita massimo |
| genere | varchar(10) | SI | 'M' | |
| is_active | boolean | SI | true | |
| descrizione | text | SI | | |
| created_at | timestamp | SI | now() | |

**⚠️ Importante:** `users.squadre_accesso` contiene array di `category_id` (NON team_id). Così i permessi restano validi tra stagioni.

---

### TEAM — Squadra (specifica per stagione + categoria)

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| season_id | uuid | NO | | FK → season.id |
| category_id | uuid | SI | | FK → category.id |
| nome | varchar(100) | NO | | |
| colori_casa | varchar(50) | SI | | |
| colori_trasferta | varchar(50) | SI | | |
| venue_id | uuid | SI | | FK → facility.id |
| matricola_figc | varchar(100) | SI | | |
| iscritta_competizione | uuid | SI | | FK → competition.id |
| note | text | SI | | |
| classifica_url | text | SI | | URL classifica esterna |
| created_at | timestamp | SI | now() | |

**Relazioni in uscita:**
- `season_id` → season
- `category_id` → category
- `venue_id` → facility (campo di casa)
- `iscritta_competizione` → competition

**Tabelle figlie:** team_player, match, training, training_config, training_template, team_staff, tournament, import_log, absence_notification

---

### FACILITY — Impianti sportivi

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| workspace_id | uuid | SI | | FK → workspace.id |
| nome | varchar(200) | NO | | |
| indirizzo | text | SI | | |
| citta | varchar(100) | SI | | |
| capienza | integer | SI | | |
| superficie | varchar(50) | SI | | |
| tipo | varchar(50) | SI | | |
| illuminazione | boolean | SI | false | |
| servizi | array | SI | | |
| coordinate_gps | jsonb | SI | | |
| note | text | SI | | |
| is_default | boolean | SI | false | |
| created_at | timestamp | SI | now() | |

**Usata da:** team.venue_id, match.venue_id, training.venue_id

---

### COMPETITION — Campionati e Coppe

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| nome | varchar(200) | NO | | |
| tipo | varchar(50) | SI | 'Campionato' | Campionato/Coppa/Torneo |
| federazione | varchar(100) | SI | | |
| regione | varchar(100) | SI | | |
| logo_url | text | SI | | |
| descrizione | text | SI | | |
| created_at | timestamp | SI | now() | |

**Usata da:** team.iscritta_competizione, match.competition_id



---

## 👤 Tabelle Anagrafiche

### PLAYER — Giocatore (anagrafica permanente)

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| nome | varchar(100) | NO | | |
| cognome | varchar(100) | NO | | |
| data_nascita | date | SI | | |
| sesso | varchar(1) | SI | 'M' | |
| foto_url | text | SI | | |
| telefono | varchar(50) | SI | | |
| email | varchar(255) | SI | | |
| ruolo_principale | varchar(50) | SI | | Portiere, Difensore, etc. |
| piede_preferito | varchar(20) | SI | | Destro/Sinistro/Ambidestro |
| altezza | integer | SI | | cm |
| peso | integer | SI | | kg |
| luogo_nascita | text | SI | | |
| nazionalita | text | SI | | |
| residenza | text | SI | | |
| matricola_figc | text | SI | | Tessera FIGC |
| codice_fiscale | text | SI | UNIQUE (partial, WHERE NOT NULL) | CF per matching univoco |
| tipo_documento | text | SI | | |
| numero_documento | text | SI | | |
| rilasciato_da | date | SI | | |
| data_visita_medica | date | SI | | |
| scadenza_visita_medica | date | SI | | |
| tesserato_dal | date | SI | | |
| tesserato_fino_al | date | SI | | |
| note | text | SI | | |
| created_at | timestamp | SI | now() | |
| updated_at | timestamp | SI | now() | |

**Logica:** L'anagrafica è permanente e indipendente dalla stagione. Il player viene collegato ai team tramite `team_player`.

---

### TEAM_PLAYER — Rosa (pivot player ↔ team)

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK — **usato ovunque** |
| team_id | uuid | NO | | FK → team.id |
| player_id | uuid | NO | | FK → player.id |
| is_primary | boolean | SI | true | |
| numero_maglia | integer | SI | | |
| ruolo_preferito | varchar(50) | SI | | Ruolo nel team specifico |
| stato | varchar(50) | SI | 'Attivo' | Attivo/Infortunato/Svincolato |
| aggregato | boolean | SI | false | true = da categoria inferiore |
| data_assegnazione | date | SI | CURRENT_DATE | |
| data_cessione | date | SI | | |
| note | text | SI | | |
| created_at | timestamp | SI | now() | |

**⚠️ FONDAMENTALE:** `team_player.id` è la chiave usata in:
- `convocation.team_player_id` — convocazioni
- `match_formation.team_player_id` — formazione
- `match_statistics.team_player_id` — statistiche
- `training_attendance.team_player_id` — presenze allenamento

Questo perché un giocatore può essere in più team (aggregato) e serve sapere "in quale veste" ha partecipato.

---

## ⚽ Tabelle Partite

### MATCH — Partita

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| team_id | uuid | NO | | FK → team.id |
| competition_id | uuid | SI | | FK → competition.id |
| venue_id | uuid | SI | | FK → facility.id |
| data_ora | timestamp | NO | | |
| avversario | varchar(200) | NO | | Nome squadra avversaria |
| luogo | varchar(20) | SI | 'Casa' | Casa/Trasferta |
| giornata | integer | SI | | Numero giornata campionato |
| gol_casa | integer | SI | 0 | |
| gol_ospite | integer | SI | 0 | |
| stato | varchar(30) | SI | 'Da disputare' | Da disputare/Terminata/Rinviata |
| archiviata | boolean | SI | false | |
| formazione_meta | jsonb | SI | | `{modulo: "4-3-3", positions: [...]}` |
| live_meta | jsonb | SI | | `{stato, start_1t, end_1t, start_2t, end_match}` |
| indirizzo_campo | text | SI | | Indirizzo trasferta (da PDF SGS) |
| tc_match_url | text | SI | | URL Tuttocampo per import |
| note | text | SI | | |
| note_avversario | text | SI | | |
| created_at | timestamp | SI | now() | |

---

### MATCH_EVENT — Eventi partita

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| match_id | uuid | NO | | FK → match.id |
| tipo_evento | varchar(50) | NO | | Codice (vedi tipo_evento) |
| minuto | integer | SI | | |
| player_id | uuid | SI | | FK → player.id ⚠️ (non team_player!) |
| player_id_secondario | uuid | SI | | FK → player.id (es: chi esce) |
| note | text | SI | | |
| created_at | timestamp | SI | now() | |

**⚠️ Eccezione:** Questa tabella usa `player_id` diretto, non `team_player_id`.

---

### MATCH_FORMATION — Formazione partita

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| match_id | uuid | NO | | FK → match.id |
| team_player_id | uuid | NO | | FK → team_player.id |
| posizione | varchar(50) | SI | | Es: "DC", "CC", "ATT" |
| numero_maglia | integer | SI | | |
| is_captain | boolean | SI | false | |
| is_vice_captain | boolean | SI | false | |
| is_starter | boolean | SI | true | true=titolare, false=panchina |
| ordine | integer | SI | 0 | Ordine visualizzazione |
| created_at | timestamp | SI | now() | |

---

### MATCH_STATISTICS — Statistiche individuali partita

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| match_id | uuid | NO | | FK → match.id |
| team_player_id | uuid | NO | | FK → team_player.id |
| minuti_giocati | integer | SI | 0 | |
| gol | integer | SI | 0 | |
| assist | integer | SI | 0 | |
| tiri | integer | SI | 0 | |
| tiri_in_porta | integer | SI | 0 | |
| passaggi | integer | SI | 0 | |
| passaggi_riusciti | integer | SI | 0 | |
| palloni_recuperati | integer | SI | 0 | |
| falli_subiti | integer | SI | 0 | |
| falli_commessi | integer | SI | 0 | |
| ammonizioni | integer | SI | 0 | |
| espulsioni | integer | SI | 0 | |
| created_at | timestamp | SI | now() | |

**Vincolo UNIQUE:** `(match_id, team_player_id)` — un solo record per giocatore per partita.

---

### CONVOCATION — Convocazione partita

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| match_id | uuid | NO | | FK → match.id |
| team_player_id | uuid | NO | | FK → team_player.id |
| convocato_da | uuid | SI | | FK → staff.id |
| convocato_il | date | SI | CURRENT_DATE | |
| confermato | boolean | SI | | |
| presente | boolean | SI | | |
| note | text | SI | | |
| created_at | timestamp | SI | now() | |

**Vincolo UNIQUE:** `(match_id, team_player_id)`

---

### VALUTAZIONE_PARTITA — Voti post-partita

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| partita_id | uuid | NO | | FK → match.id (⚠️ nome colonna legacy) |
| calciatore_id | uuid | NO | | FK → player.id (⚠️ nome legacy) |
| voto | numeric | NO | | |
| nota_allenatore | text | SI | | |
| created_at | timestamptz | SI | now() | |

**Vincolo UNIQUE:** `(partita_id, calciatore_id)`



---

## 🏋️ Tabelle Allenamenti

### TRAINING — Seduta di allenamento

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| team_id | uuid | NO | | FK → team.id |
| venue_id | uuid | SI | | FK → facility.id |
| data_ora | timestamp | NO | | |
| durata_minuti | integer | SI | 90 | |
| tipo | varchar(50) | SI | | |
| descrizione | text | SI | | |
| note | text | SI | | |
| created_at | timestamp | SI | now() | |

---

### TRAINING_ATTENDANCE — Presenze allenamento

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| training_id | uuid | NO | | FK → training.id |
| team_player_id | uuid | NO | | FK → team_player.id |
| presente | boolean | SI | false | |
| motivi_assenza | text | SI | | |
| note | text | SI | | |
| created_at | timestamp | SI | now() | |

**Vincolo UNIQUE:** `(training_id, team_player_id)`

---

### TRAINING_CONFIG — Settimana tipo

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| team_id | uuid | NO | | FK → team.id |
| giorno_settimana | integer | NO | | 0=Dom, 1=Lun, ..., 6=Sab |
| ora_inizio | time | SI | | |
| ora_fine | time | SI | | |
| luogo | varchar(200) | SI | | |
| created_at | timestamp | SI | now() | |

**Logica:** Definisce i giorni fissi di allenamento. Usato per generare automaticamente le sedute settimanali.

---

### TRAINING_TEMPLATE — Programmi allenamento salvati

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| team_id | uuid | NO | | FK → team.id |
| nome | varchar(200) | NO | | |
| programma | jsonb | NO | | Struttura esercizi |
| created_by | uuid | SI | | FK → users.id |
| created_at | timestamp | SI | now() | |

---

## 👔 Tabelle Staff

### STAFF — Personale tecnico

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| workspace_id | uuid | SI | | FK → workspace.id |
| nome | varchar(100) | NO | | |
| cognome | varchar(100) | NO | | |
| data_nascita | date | SI | | |
| sesso | varchar(1) | SI | 'M' | |
| foto_url | text | SI | | |
| telefono | varchar(50) | SI | | |
| email | varchar(255) | SI | | |
| ruolo | varchar(50) | NO | | Allenatore/Dirigente/Preparatore/etc. |
| qualifiche | jsonb | SI | '{}' | `{matricola, tessera_figc, tessera_lnd, tipo_tessera}` |
| documento | jsonb | SI | '{}' | |
| note | text | SI | | |
| created_at | timestamp | SI | now() | |
| updated_at | timestamp | SI | now() | |

---

### TEAM_STAFF — Assegnazione staff ↔ team (molti-a-molti)

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| team_id | uuid | NO | | FK → team.id |
| staff_id | uuid | NO | | FK → staff.id |
| ruolo_squadra | varchar(100) | NO | | Ruolo specifico nel team |
| data_assegnazione | date | SI | CURRENT_DATE | |
| data_cessione | date | SI | | |
| note | text | SI | | |
| created_at | timestamp | SI | now() | |

**Vincolo UNIQUE:** `(team_id, staff_id, ruolo_squadra)`

---

## 🔐 Tabelle Utenti & Auth

### USERS — Utenti applicazione

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| email | varchar(255) | NO | | UNIQUE |
| password_hash | text | NO | | bcrypt |
| nome | varchar(100) | SI | | |
| cognome | varchar(100) | SI | | |
| telefono | varchar(50) | SI | | |
| ruolo | varchar(50) | SI | 'admin' | admin/allenatore |
| workspace_id | uuid | SI | | FK → workspace.id |
| ruoli | text[] | SI | ['admin'] | |
| squadre_accesso | uuid[] | SI | [] | **Array di category_id** |
| is_superadmin | boolean | SI | false | Accesso a tutti i workspace |
| is_active | boolean | SI | true | |
| permessi | jsonb | SI | '{}' | `{rosa:"write", partite:"read", ...}` |
| last_login | timestamp | SI | | |
| created_at | timestamp | SI | now() | |
| updated_at | timestamp | SI | now() | |

**Sistema permessi:**
- `squadre_accesso` = array vuoto → accesso a TUTTE le categorie (admin/superadmin)
- `squadre_accesso` = [cat_id1, cat_id2] → accesso solo a quelle categorie
- `permessi` = moduli con livello: `""` (nessuno), `"read"`, `"write"`
- Moduli: `rosa`, `partite`, `formazione`, `allenamenti`, `statistiche`, `guest_links`

---

### GUEST_TOKEN — Link guest temporanei

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| token | varchar(64) | NO | | UNIQUE |
| utente_id | uuid | SI | | FK → users.id (chi l'ha creato) |
| tipo | varchar(20) | NO | | genitore/osservatore |
| giocatore_id | uuid | SI | | Deprecato |
| player_id | uuid | SI | | FK → player.id (link per genitore) |
| squadre_accesso | uuid[] | SI | | Categorie visibili |
| scadenza | timestamp | SI | | |
| telefono | text | SI | | Contatto genitore |
| created_at | timestamp | SI | now() | |

---

### SESSIONE — Sessioni utente

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| utente_id | uuid | SI | | FK → users.id |
| token | text | NO | | |
| scadenza | timestamptz | NO | | |
| created_at | timestamptz | SI | now() | |

---

## 📦 Tabelle di Supporto

### IMPORT_LOG — Storico importazioni

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| workspace_id | uuid | SI | | FK → workspace.id |
| team_id | uuid | SI | | FK → team.id |
| user_id | uuid | SI | | FK → users.id |
| tipo | text | NO | | calendario_pdf/calendario_testo/calendario_tuttocampo/rosa_xls/rosa_tuttocampo/formazioni_tuttocampo |
| fonte | text | SI | | |
| dettagli | jsonb | SI | '{}' | |
| record_importati | integer | SI | 0 | |
| record_saltati | integer | SI | 0 | |
| esito | text | SI | 'success' | |
| errore | text | SI | | |
| created_at | timestamptz | SI | now() | |

---

### TOURNAMENT — Tornei

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| workspace_id | uuid | SI | | FK → workspace.id |
| team_id | uuid | SI | | FK → team.id |
| nome | text | NO | | |
| data_inizio | date | SI | | |
| data_fine | date | SI | | |
| sede | text | SI | | |
| modalita | text | SI | 'girone' | girone/eliminazione |
| regolamento | jsonb | SI | '{}' | |
| squadre | jsonb | SI | '[]' | |
| stato | text | SI | 'bozza' | bozza/in_corso/completato |
| calendario | jsonb | SI | | |
| created_at | timestamptz | SI | now() | |

---

### DOCUMENT — Documenti (polimorfico)

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| tipo | varchar(50) | NO | | Tipo documento |
| entita_tipo | varchar(50) | NO | | player/team/match/etc. |
| entita_id | uuid | NO | | ID dell'entità collegata |
| file_url | text | NO | | |
| nome_file | varchar(255) | SI | | |
| mime_type | varchar(100) | SI | | |
| dimensione | integer | SI | | bytes |
| data_upload | timestamp | SI | now() | |
| scadenza | date | SI | | |
| note | text | SI | | |

**Logica:** Tabella polimorfica — `entita_tipo` + `entita_id` collegano a qualsiasi tabella.

---

### TEAM_LOGO — Cache loghi squadre avversarie

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| nome | text | NO | | Nome originale |
| nome_normalizzato | text | NO | | UNIQUE — per matching |
| logo_path | text | NO | | Path file locale |
| tc_team_id | text | SI | | ID Tuttocampo |
| created_at | timestamp | SI | now() | |

---

### TIPO_EVENTO — Lookup tipi evento

| Colonna | Tipo | Null | Note |
|---------|------|------|------|
| codice | varchar(10) | NO | PK — Es: GOL, AMM, ESP, SOT |
| descrizione | varchar(50) | NO | |
| icona | varchar(50) | SI | |

---

### ABSENCE_NOTIFICATION — Notifiche assenza

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| player_id | uuid | NO | | FK → player.id |
| team_id | uuid | NO | | FK → team.id |
| training_id | uuid | SI | | FK → training.id |
| data_allenamento | date | NO | | |
| motivo | text | NO | | |
| messaggio | text | SI | | |
| letto | boolean | SI | false | |
| created_at | timestamptz | SI | now() | |

---

### PRESENZA_PARTITA — Presenze partita (tabella legacy)

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| partita_id | uuid | NO | | FK → match.id |
| calciatore_id | uuid | NO | | FK → player.id |
| minuti_giocati | integer | NO | 0 | |
| titolare | boolean | NO | false | |
| entrato_minuto | integer | SI | | |
| uscito_minuto | integer | SI | | |
| note | text | SI | | |
| created_at | timestamptz | SI | now() | |

**⚠️ Nota:** Tabella legacy, parallela a match_formation. Potrebbe essere deprecata in futuro.

---

### MATERIALE_ALLENAMENTO — File/video allenamenti

| Colonna | Tipo | Null | Default | Note |
|---------|------|------|---------|------|
| id | uuid | NO | gen_random_uuid() | PK |
| squadra_id | uuid | SI | | FK → team.id |
| giorno_settimana | integer | NO | | |
| titolo | varchar(200) | NO | | |
| descrizione | text | SI | | |
| tipo | varchar(20) | SI | 'file' | file/video/link |
| url | text | NO | | |
| data_caricamento | timestamptz | SI | now() | |



---

## 🔗 Mappa Completa Foreign Keys

```
workspace.id
 ├── season.workspace_id
 ├── category.workspace_id
 ├── facility.workspace_id
 ├── staff.workspace_id
 ├── users.workspace_id
 ├── import_log.workspace_id
 └── tournament.workspace_id

season.id
 └── team.season_id

category.id
 └── team.category_id

facility.id
 ├── team.venue_id
 ├── match.venue_id
 └── training.venue_id

staff.id
 ├── team_staff.staff_id
 └── convocation.convocato_da

competition.id
 ├── team.iscritta_competizione
 └── match.competition_id

team.id
 ├── team_player.team_id
 ├── team_staff.team_id
 ├── match.team_id
 ├── training.team_id
 ├── training_config.team_id
 ├── training_template.team_id
 ├── tournament.team_id
 ├── import_log.team_id
 └── absence_notification.team_id

player.id
 ├── team_player.player_id
 ├── match_event.player_id
 ├── match_event.player_id_secondario
 ├── guest_token.player_id
 └── absence_notification.player_id

team_player.id  ⭐ (pivot centrale)
 ├── convocation.team_player_id
 ├── match_formation.team_player_id
 ├── match_statistics.team_player_id
 └── training_attendance.team_player_id

match.id
 ├── match_event.match_id
 ├── match_formation.match_id
 ├── match_statistics.match_id
 └── convocation.match_id

training.id
 ├── training_attendance.training_id
 └── absence_notification.training_id

users.id
 ├── guest_token.utente_id
 ├── import_log.user_id
 └── training_template.created_by
```

---

## 💡 Regole e Concetti Chiave

| # | Regola | Spiegazione |
|---|--------|-------------|
| 1 | **Workspace = Società** | Tutto parte da qui. Isolamento totale tra workspace. |
| 2 | **Category persistente, Team stagionale** | La categoria "Under 15" esiste sempre; il team "Albalonga U15 2025/26" è specifico della stagione. |
| 3 | **team_player.id è il pivot centrale** | Collega player a team. Il suo ID è usato in formazioni, convocazioni, statistiche, presenze. |
| 4 | **Accesso utenti su category_id** | `users.squadre_accesso` contiene category_id, non team_id. Così non serve riassegnare permessi ogni stagione. |
| 5 | **match_event usa player_id** | Eccezione: usa player.id diretto, non team_player_id. |
| 6 | **formazione_meta in match** | JSONB con `{modulo, positions}` per il layout grafico del campo. |
| 7 | **Naming convention** | Tabelle in inglese, colonne in italiano. |
| 8 | **Vincoli UNIQUE** | convocation(match_id, team_player_id), match_statistics(match_id, team_player_id), training_attendance(training_id, team_player_id) |

---

## 📊 Diagramma ER Semplificato

```
┌──────────────┐
│  WORKSPACE   │
└──────┬───────┘
       │
  ┌────┼────────────────────────┐
  │    │                        │
  ▼    ▼                        ▼
┌────┐ ┌────────┐         ┌──────────┐
│SEAS│ │CATEGORY│         │ FACILITY │
└──┬─┘ └───┬────┘         └────┬─────┘
   │        │                   │
   └───┬────┘                   │
       ▼                        │
  ┌─────────┐◄─────────────────┘
  │  TEAM   │
  └────┬────┘
       │
  ┌────┼──────────────────────────────┐
  │    │              │               │
  ▼    ▼              ▼               ▼
┌────────────┐  ┌──────────┐   ┌──────────┐
│TEAM_PLAYER │  │  MATCH   │   │ TRAINING │
└─────┬──────┘  └────┬─────┘   └────┬─────┘
      │               │              │
      │    ┌──────────┼──────┐       │
      │    │          │      │       │
      ▼    ▼          ▼      ▼       ▼
┌─────────────┐ ┌────────┐ ┌───┐ ┌──────────────────┐
│MATCH_FORMAT.│ │M_EVENT │ │CON│ │TRAINING_ATTENDANCE│
│MATCH_STATS  │ └────────┘ │VOC│ └──────────────────┘
└─────────────┘             └───┘
```

---

## 📤 Export in PDF

### Metodo 1: VS Code (consigliato)

1. Apri questo file in VS Code
2. Installa l'estensione **"Markdown PDF"** (yzane.markdown-pdf)
3. `Cmd+Shift+P` → "Markdown PDF: Export (pdf)"
4. Il PDF viene generato nella stessa cartella

### Metodo 2: Terminale con Pandoc

```bash
# Installa pandoc (se non presente)
brew install pandoc

# Installa un engine LaTeX leggero
brew install --cask basictex

# Genera PDF
cd docs/
pandoc DATABASE_SCHEMA.md -o DATABASE_SCHEMA.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=2cm \
  -V fontsize=10pt
```

### Metodo 3: npx (senza installare nulla globalmente)

```bash
cd docs/
npx md-to-pdf DATABASE_SCHEMA.md
# Genera DATABASE_SCHEMA.pdf nella stessa cartella
```

### Metodo 4: Online

1. Vai su https://markdowntohtml.com o https://dillinger.io
2. Incolla il contenuto di questo file
3. Esporta come PDF dal browser (Cmd+P → Salva come PDF)

