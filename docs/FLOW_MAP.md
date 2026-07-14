# 🗺️ Mappa Logica - Youth Football Manager

> Diagrammi di flusso per comprendere rapidamente i passaggi delle funzionalità principali.
> Formato: Mermaid (renderizzabile su GitHub, VS Code con estensione, Notion, etc.)

---

## 📐 Architettura Generale

```mermaid
graph TD
    subgraph Frontend["Frontend (Vite SPA)"]
        LOGIN[Login Page]
        GUEST[Guest Access]
        DASH[Dashboard]
        MODULES[Moduli Funzionali]
    end

    subgraph Backend["Backend (Express)"]
        AUTH[Auth Router]
        API[19 Router REST]
        MW[Middleware Auth]
    end

    subgraph DB["Supabase (PostgreSQL)"]
        TABLES[(Tabelle)]
    end

    LOGIN -->|JWT| AUTH
    GUEST -->|Guest Token| AUTH
    AUTH -->|Token valido| MW
    MW --> API
    API --> TABLES
    MODULES -->|apiFetch| MW
```

---

## 🔐 Flusso Autenticazione

```mermaid
flowchart TD
    START([Utente apre app]) --> CHECK{Token in localStorage?}
    CHECK -->|No| LOGIN[Mostra Login]
    CHECK -->|Sì| VALID{Token scaduto?}
    VALID -->|Sì| LOGIN
    VALID -->|No| ROLE{Ruolo utente}

    LOGIN -->|Email + Password| API_LOGIN[POST /api/auth/login]
    API_LOGIN -->|JWT + user| STORE[Salva token + user in localStorage]
    STORE --> ROLE

    ROLE -->|superadmin| WS_SELECT[Seleziona Workspace]
    ROLE -->|admin/allenatore/staff| TEAM_SELECT[Seleziona Squadra]
    WS_SELECT --> TEAM_SELECT
    TEAM_SELECT --> DASH([Dashboard])

    subgraph Guest Flow
        GLINK([Link guest /g/:token]) --> API_GUEST[GET /api/guest/:token]
        API_GUEST -->|JWT guest 24h| TIPO{Tipo guest}
        TIPO -->|atleta| HOME_ATL[Home Atleta]
        TIPO -->|genitore| HOME_GEN[Home Genitore]
    end
```

---

## 🏠 Dashboard — Caricamento Dati

```mermaid
flowchart LR
    LOAD[loadData] --> API[GET /squadre/:id/dashboard]
    API --> BACKEND{Backend aggrega}
    BACKEND --> Q1[Stats squadra]
    BACKEND --> Q2[Top players]
    BACKEND --> Q3[Prossime partite]
    BACKEND --> Q4[Ultimi allenamenti]
    BACKEND --> Q5[Infortuni attivi]
    BACKEND --> Q6[Scadenze mediche]
    Q1 & Q2 & Q3 & Q4 & Q5 & Q6 -->|Promise.all| RESP[Risposta unica]
    RESP --> RENDER[Render cards/widget]
```

---

## ⚽ Flusso Partita Completo (Lifecycle)

```mermaid
flowchart TD
    CREATE[Crea Partita<br/>calendario] --> CONV[Convocazioni]
    CONV --> SAVE_CONV[Salva convocati]
    SAVE_CONV --> PUB{Pubblica?}
    PUB -->|No| WAIT[In attesa pubblicazione]
    PUB -->|Sì| NOTIF[Invia notifica convocazione]
    NOTIF --> FORM_UNLOCK[🔓 Sblocca Formazione]
    FORM_UNLOCK --> MC[Match Center]

    MC --> TAB_FORM[Tab Formazione<br/>Drag & Drop modulo]
    MC --> TAB_EVENTS[Tab Eventi<br/>Gol, Ammonizioni, Sost.]
    MC --> TAB_NOTES[Tab Note]

    TAB_FORM --> LIVE{Avvia Live?}
    LIVE -->|Sì| T1[▶️ 1° Tempo]
    T1 -->|35-45 min| INT[⏸️ Intervallo]
    INT -->|10 min| T2[▶️ 2° Tempo]
    T2 -->|35-45 min| FINE[🏁 Fine Partita]
    FINE --> RESULT[Salva Risultato]
    RESULT --> ARCHIVE[Archivia Partita]

    ARCHIVE --> STATS_UPDATE[Aggiorna Statistiche]
    ARCHIVE --> DASH_INV[Invalida Cache Dashboard]
```

---

## 📋 Flusso Convocazioni → Formazione → Distinta

```mermaid
flowchart TD
    CAL[Calendario<br/>Seleziona partita] --> CONV_PAGE[Pagina Convocazioni]
    CONV_PAGE --> SELECT[Seleziona giocatori<br/>dalla rosa]

    SELECT --> CHECK_ABS{Giocatore ha<br/>assenza segnalata?}
    CHECK_ABS -->|Sì| DISABLED[Checkbox disabilitata<br/>auto-indisponibile]
    CHECK_ABS -->|No| ENABLED[Checkbox attiva]

    ENABLED --> SAVE[💾 Salva]
    SAVE --> PUB_BTN[📢 Pubblica]
    PUB_BTN --> NOTIF_SEND[Crea notification<br/>tipo=convocazione]
    NOTIF_SEND --> UNLOCK[✅ Formazione sbloccata]

    UNLOCK --> MC_FORM[Match Center → Tab Formazione]
    MC_FORM --> DRAG[Posiziona giocatori<br/>su campo tattico]
    DRAG --> SAVE_FORM[Salva match_formation]

    SAVE_FORM --> DISTINTA[📄 Distinta Gara]
    DISTINTA --> PRINT[🖨️ Stampa PDF]
```

---

## 👥 Gestione Rosa (Roster)

```mermaid
flowchart TD
    ROSTER[Pagina Rosa] --> VIEW[Visualizza giocatori<br/>ordinati per numero]

    VIEW --> ADD{Azione}
    ADD -->|Manuale| FORM[Form nuovo giocatore]
    ADD -->|Import XLS| UPLOAD[Upload tabulato FIGC]
    ADD -->|Import TC| SCRAPE[Scraping Tuttocampo]

    UPLOAD --> PARSE[Parsing XLS<br/>cognomi composti]
    PARSE --> MATCH{CF già presente?}
    MATCH -->|Sì| UPDATE[Aggiorna dati]
    MATCH -->|No| CREATE[Crea player + team_player]

    FORM --> SAVE_P[POST /api/calciatori]
    SAVE_P --> TP[Crea team_player<br/>stato=Attivo]

    VIEW --> CLICK[Click giocatore]
    CLICK --> DETAIL[Player Detail<br/>Carriera, Stats, Infortuni]
```

---

## 🏋️ Flusso Allenamenti

```mermaid
flowchart TD
    CONFIG[⚙️ Settings<br/>Settimana tipo] --> DAYS[Configura giorni<br/>orari, impianto]
    DAYS --> AUTO_GEN[Auto-genera sessioni<br/>future]

    SESSIONS[📅 Sessioni] --> LIST[Lista allenamenti]
    LIST --> SELECT_S[Seleziona sessione]
    SELECT_S --> PRESENZE[Registra presenze]

    PRESENZE --> MARK{Per ogni giocatore}
    MARK -->|Presente ✅| SAVE_ATT[training_attendance<br/>presente=true]
    MARK -->|Assente ❌| MOTIVO[Inserisci motivo]
    MOTIVO --> SAVE_ATT

    subgraph Assenze Guest
        ATLETA[Home Atleta] --> SIGNAL[Segnala assenza]
        SIGNAL --> ABS_NOT[absence_notification]
        ABS_NOT --> COACH_BELL[🔔 Notifica allenatore]
    end
```

---

## 📊 Flusso Statistiche e Report

```mermaid
flowchart TD
    STATS_PAGE[Pagina Statistiche] --> FETCH[GET /api/statistiche/:teamId]

    FETCH --> CALC{Backend calcola}
    CALC --> MATCH_EV[match_event<br/>GOAL, ASSIST, YELLOW...]
    CALC --> ATTEND[training_attendance<br/>% presenze]
    CALC --> FORM_DATA[match_formation<br/>presenze partita]

    CALC --> RESP[Risposta aggregata]
    RESP --> TOP[🏆 Top Players]
    RESP --> TEAM_STATS[📈 Stats Squadra]
    RESP --> INDIVIDUAL[👤 Stats Individuali]

    INDIVIDUAL --> REPORT[📄 Report PDF]
    REPORT --> PRINT_R[Stampa/Download]
```

---

## 🔄 Flusso Import (Import Center)

```mermaid
flowchart TD
    HUB[Import Center] --> TYPE{Tipo import}

    TYPE -->|Rosa XLS| XLS[Upload .xlsx FIGC]
    TYPE -->|Calendario PDF| PDF[Upload PDF SGS/LND]
    TYPE -->|Tuttocampo| TC[URL Tuttocampo]

    XLS --> PARSE_XLS[Parsing xlsx<br/>Cognomi, CF, Matricola]
    PARSE_XLS --> PREVIEW_R[Preview giocatori]
    PREVIEW_R --> CONFIRM_R[Conferma import]
    CONFIRM_R --> LOG_R[import_log tipo=rosa_xls]

    PDF --> PARSE_PDF[pdf-parse<br/>Estrai partite]
    PARSE_PDF --> PREVIEW_C[Preview calendario]
    PREVIEW_C --> CONFIRM_C[Conferma import]
    CONFIRM_C --> LOG_C[import_log tipo=calendario_pdf]

    TC --> SCRAPE_TC[cheerio scraping]
    SCRAPE_TC --> PREVIEW_TC[Preview dati]
    PREVIEW_TC --> CONFIRM_TC[Conferma]
    CONFIRM_TC --> LOG_TC[import_log tipo=calendario_tuttocampo]

    TC --> FORM_TC[Import Formazioni TC]
    FORM_TC --> MATCH_PLAYERS[Match giocatori<br/>per nome/cognome]
    MATCH_PLAYERS --> SAVE_FORM_TC[Salva match_formation]
```

---

## 💰 Flusso Quote Economiche (Fees)

```mermaid
flowchart TD
    CONFIG_FEE[Fee Config<br/>Definisci quota tipo] --> RATE[Configura rate<br/>importi + scadenze]
    RATE --> GENERA[Genera quote<br/>per tutti i giocatori]
    GENERA --> FEE_RECORDS[fee + fee_installment<br/>per ogni player]

    FEE_RECORDS --> VIEW_FEE[Vista Quote]
    VIEW_FEE --> PLAYER_FEE[Dettaglio giocatore]
    PLAYER_FEE --> PAY{Azione}
    PAY -->|Paga rata| MARK_PAID[PUT /api/fees/:id/pay]
    PAY -->|Annulla| MARK_UNPAID[PUT /api/fees/:id/unpay]

    MARK_PAID --> UPDATE[Aggiorna importo_pagato<br/>Ricalcola stato]
```

---

## 👔 Flusso Staff e Permessi

```mermaid
flowchart TD
    ADMIN[Admin/Superadmin] --> USERS[Gestione Utenti]
    USERS --> CREATE_U[Crea utente]
    CREATE_U --> PROFILE{Profilo}

    PROFILE -->|allenatore| CAP_A[Capabilities: rosa✏️ partite✏️<br/>allenamenti✏️ statistiche👁️]
    PROFILE -->|segreteria| CAP_S[Capabilities: rosa✏️ quote✏️<br/>import✏️ guest_links✏️]
    PROFILE -->|dirigente| CAP_D[Capabilities: rosa👁️<br/>guest_links✏️]
    PROFILE -->|custom| CAP_C[Personalizza ogni modulo]

    CAP_A & CAP_S & CAP_D & CAP_C --> SAVE_U[Salva users.permessi JSONB]
    SAVE_U --> SIDEBAR[Sidebar filtrata<br/>per capabilities]
```

---

## 🔔 Flusso Notifiche

```mermaid
flowchart TD
    subgraph Creazione
        CONV_PUB[Pubblica convocazione] --> NOT_CONV[notification tipo=convocazione]
        AVVISO[Invia avviso] --> NOT_AVV[notification tipo=avviso]
        SOLLECITO[Sollecito certificato] --> NOT_SOLL[notification tipo=sollecito]
    end

    subgraph Ricezione
        NOT_CONV & NOT_AVV & NOT_SOLL --> BELL[🔔 Badge notifiche]
        BELL --> CENTRO[Centro Comunicazioni]
        CENTRO --> TAB_INV[📤 Inviate<br/>edit/delete]
        CENTRO --> TAB_RIC[📥 Ricevute<br/>read + rispondi]
    end

    subgraph Guest
        NOT_CONV --> GUEST_BELL[🔔 Guest bell]
        GUEST_BELL --> GUEST_VIEW[Vedi convocazione]
    end
```

---

## 🗓️ Flusso Calendario

```mermaid
flowchart TD
    CAL_PAGE[Pagina Calendario] --> FETCH_M[GET /api/partite?team_id=X]
    FETCH_M --> SPLIT{Stato partita}

    SPLIT -->|Future| UPCOMING[Prossime partite<br/>🟡 Pallino lampeggiante]
    SPLIT -->|Archiviate| ARCHIVE_LIST[Archivio risultati]

    UPCOMING --> ACTIONS{Azioni disponibili}
    ACTIONS --> BTN_CONV[📋 Convoca]
    ACTIONS --> BTN_DIST[📄 Distinta]
    ACTIONS --> BTN_MC[⚽ Match Center]

    BTN_CONV --> CONV_FLOW[→ Flusso Convocazioni]
    BTN_MC --> MC_FLOW[→ Match Center]

    ARCHIVE_LIST --> DETAIL[Dettaglio partita<br/>read-only]

    subgraph Progress Dots
        DOT1[Conv] --> DOT2[Form] --> DOT3[MC]
        DOT1 -.->|Blink se mancante| NEXT_STEP
    end
```

---

## 🏢 Flusso Workspace / Stagioni / Categorie

```mermaid
flowchart TD
    WS[Workspace<br/>= Società sportiva] --> SEASONS[Stagioni<br/>es. 2024-25]
    SEASONS --> CATS[Categorie<br/>Under 14, Under 15...]
    CATS --> TEAMS[Squadre<br/>= Categoria + Stagione]
    TEAMS --> PLAYERS[Rosa giocatori<br/>team_player]
    TEAMS --> MATCHES[Partite]
    TEAMS --> TRAININGS[Allenamenti]

    subgraph Selezione
        LOGIN_OK[Login OK] --> SEL_WS[Seleziona workspace<br/>solo superadmin]
        SEL_WS --> SEL_TEAM[Seleziona squadra<br/>filtrata per accesso]
        SEL_TEAM --> SET_GLOBAL["window.YFM.squadraId<br/>window.YFM.currentSeasonId"]
    end
```

---

## 🖨️ Flusso Stampe (Print Center)

```mermaid
flowchart LR
    PRINT[Print Center] --> P1[📋 Convocazione PDF]
    PRINT --> P2[📄 Distinta Gara]
    PRINT --> P3[⚽ Formazione]
    PRINT --> P4[📊 Report Partita]
    PRINT --> P5[📅 Presenze]
    PRINT --> P6[👥 Rosa]
    PRINT --> P7[🏥 Scadenze Mediche]
    PRINT --> P8[📝 Tesseramento]

    P1 & P2 & P3 & P4 & P5 & P6 & P7 & P8 --> RENDER_PDF[Render HTML<br/>→ window.print()]
```

---

## 🔑 Mappa Permessi → Pagine

```mermaid
graph TD
    subgraph Tutti
        DASH2[Dashboard]
        CAL2[Calendario]
        STATS2[Statistiche]
    end

    subgraph "rosa: read/write"
        ROSTER2[Rosa]
        PLAYER2[Dettaglio Giocatore]
    end

    subgraph "partite: write"
        CONV2[Convocazioni]
        MC2[Match Center]
    end

    subgraph "allenamenti: write"
        TRAIN2[Allenamenti]
        PRES2[Presenze]
    end

    subgraph "guest_links: write"
        GL2[Guest Links]
    end

    subgraph "import: write"
        IMP2[Import Center]
    end

    subgraph "quote: read/write"
        FEES2[Quote]
    end

    subgraph "Solo Admin"
        USERS2[Gestione Utenti]
        WS2[Workspaces]
        SC2[Stagioni/Categorie]
    end
```

---

## Legenda

| Simbolo | Significato |
|---------|-------------|
| `([...])` | Inizio/Fine |
| `[...]` | Azione/Processo |
| `{...}` | Decisione |
| `-->` | Flusso diretto |
| `-.->` | Flusso condizionale |
| `subgraph` | Raggruppamento logico |

---

> 📌 **Come visualizzare**: Apri questo file su GitHub, oppure usa l'estensione VS Code "Markdown Preview Mermaid Support", oppure incolla i blocchi su [mermaid.live](https://mermaid.live).
