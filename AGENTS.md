# Youth Football Manager - Contesto Progetto

## Stack Tecnico
- **Frontend**: Vite + JavaScript ES modules, deploy su Vercel
- **Backend**: Node.js/Express, deploy su Vercel
- **Database**: Supabase (PostgreSQL)
- **Autenticazione**: JWT custom + Link Guest
- **Logo**: `/frontend-v2/public/assets/logo.png`
- **Email**: youthfootballmanager@gmail.com

## Credenziali Supabase (Environment Variables)

### Variabili Backend (Vercel)
```
SUPABASE_URL=https://csxdlxbhcnyfppojwwzy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeGRseGJoY255ZnBwb2p3d3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc1MTMxMywiZXhwIjoyMDk3MzI3MzEzfQ.HZXGk1Xfz0EvSqewAoSCcgZ6gIQYLOP-54mE3YVHgBo
JWT_SECRET=aEj1OXdTHxSHD8iObjFov1jJ06RoyM1Ormf8KBb0uPI=
```

### API Keys Pubbliche
- **ANON KEY**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeGRseGJoY255ZnBwb2p3d3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NTEzMTMsImV4cCI6MjA5NzMyNzMxM30.KTL6Z_Mwo_QzNidWt95YLqc7ZvdbfxyQdzxCT5uNRIw`
- **SERVICE ROLE KEY**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeGRseGJoY255ZnBwb2p3d3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc1MTMxMywiZXhwIjoyMDk3MzI3MzEzfQ.HZXGk1Xfz0EvSqewAoSCcgZ6gIQYLOP-54mE3YVHgBo`

### Schema Tabelle Principali (verificato 2025-06-25)

**workspace**: id, nome, logo_url, data_creazione

**stagione**: id, workspace_id, nome, data_inizio, data_fine, is_attiva

**squadra**: id, stagione_id, nome, categoria, allenatore, dirigente, ...

**calciatore**: id, workspace_id, nome, cognome, data_nascita, luogo_nascita, tipo_documento, numero_documento, rilasciato_da, telefono, matricola_figc, ...

**rosa**: id, squadra_id, calciatore_id, numero_maglia, ruolo, stato

**partita**: id, squadra_id, data_ora, avversario, luogo, competizione, giornata, note, note_avversario, archiviata

**evento_partita**: id, partita_id, tipo_evento_codice, calciatore_principale_id, calciatore_secondario_id, minuto, note

**utente**: id, workspace_id, email, password_hash, nome, cognome, ruolo, is_active, is_superadmin

## Struttura Progetto
```
frontend-v2/
├── src/
│   ├── main.js              # Entry point, init app, routing base
│   ├── router.js            # Routing dinamico con window.YFM.navigateTo()
│   ├── style.css            # Stili globali
│   ├── components/
│   │   └── layout/
│   │       └── Sidebar.js   # Layout sidebar + header
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── login.js     # Login (2 pulsanti: Login + Demo)
│   │   │   └── guest.js     # Attivazione guest link
│   │   ├── admin/
│   │   │   ├── users.js     # CRUD utenti
│   │   │   └── guestLinks.js # Gestione link guest
│   │   ├── demo/
│   │   │   └── demo.js      # Sistema demo interattivo (~1300 righe)
│   │   ├── team/
│   │   │   ├── dashboard.js     # Dashboard con prossima partita
│   │   │   ├── roster.js        # Rosa giocatori
│   │   │   ├── calendar.js      # Calendario partite
│   │   │   ├── matchDetail.js   # Dettaglio partita + timeline
│   │   │   ├── formazione.js    # Gestione formazione
│   │   │   ├── convocazioni.js  # Convocazioni
│   │   │   ├── resultForm.js    # Eventi partita
│   │   │   ├── playerDetail.js  # Scheda giocatore
│   │   │   ├── valutazioni.js   # Valutazioni
│   │   │   ├── distinta.js       # Distinta FIGC PDF
│   │   │   ├── noteAvversario.js # Note avversario
│   │   │   └── squadre.js       # Gestione squadre
│   │   ├── coach/
│   │   │   └── training.js     # Allenamenti + materiale
│   │   ├── performance/
│   │   │   ├── stats.js         # Statistiche disciplina
│   │   │   └── reports.js       # Report PDF
│   │   └── club/
│   │       ├── settings.js       # Impostazioni
│   │       └── workspace.js     # Info società
│   ├── services/
│   │   └── api.js            # Chiamate API (apiFetch)
│   └── utils/
│       ├── formatters.js     # Format data, numeri
│       └── ui.js             # Loading, notifiche
├── public/
│   └── assets/
│       ├── logo.png
│       └── app-icon.png
└── vite.config.js
```

### Backend (backend/)
```
backend/
├── api/
│   └── index.js              # Tutti gli endpoint (~1600 righe)
├── node_modules/
├── package.json
└── vercel.json
```

### Landing Page
```
landing/
└── index.html                # Landing page professionale
```

## Database Schema (Supabase)

### Tabelle Principali

| Tabella | Campi Chiave | Descrizione |
|---------|--------------|-------------|
| `workspace` | id, nome, logo_url, referral_code | Società/club |
| `stagione` | id, workspace_id, nome, data_inizio, data_fine, is_attiva | Stagione sportiva |
| `squadra` | id, stagione_id, nome, categoria, allenatore | Squadra |
| `calciatore` | id, workspace_id, nome, cognome, data_nascita | Giocatore |
| `rosa` | id, squadra_id, calciatore_id, numero_maglia, ruolo, stato | Associazione |
| `partita` | id, squadra_id, data_ora, avversario, luogo, archiviata | Partita |
| `evento_partita` | id, partita_id, tipo_evento_codice, calciatore_principale_id, minuto | Eventi |
| `convocazione` | id, partita_id, calciatore_id | Convocazioni |
| `formazione_partita` | id, partita_id, calciatore_id, ruolo, numero_maglia | Formazione |
| `valutazione_partita` | id, partita_id, calciatore_id, voto, note | Valutazioni |
| `utente` | id, workspace_id, email, password_hash, nome, ruolo, is_superadmin | Utente |
| `guest_token` | id, token, tipo, scadenza, utente_id | Token guest |
| `partner` | id, nome, email, codice, tipo | Partner commerciali |
| `referral_log` | id, referral_code, utente_id, commissione, stato | Log referral |
| `materiale_allenamento` | id, squadra_id, titolo, tipo, url | Materiale allenamenti |
| `config_allenamento` | id, squadra_id, giorno_settimana, ora_inizio, ora_fine, luogo | Config allenamenti |

### Tabella Eventi Partita (tipo_evento_codice)
- `GOAL` - Gol segnato
- `SUBITO` - Gol subito (portiere)
- `ASSIST` - Assist
- `YELLOW` - Cartellino giallo
- `RED` - Cartellino rosso
- `IN` - Entrato in campo
- `OUT` - Uscito dal campo

## Regole Chat (da rispettare SEMPRE)

### Modifiche al Database
1. **Preferire sempre API integrate**: Se il backend ha endpoint per le operazioni CRUD, usarli tramite le API esistenti
2. **Se API non disponibili**: Fornire query SQL dettagliate da eseguire in Supabase SQL Editor con istruzioni step-by-step:
   - Indicare esattamente quale tabella modificare
   - Fornire la query completa con tutti i campi necessari
   - Specificare l'ordine di esecuzione se ci sono dipendenze
3. **Verificare struttura DB**: Prima di ogni modifica, controllare schema esistente con API o via SQL

### Modifiche al Progetto
1. **Ambiente di lavoro predefinito**: Locale - solo quando la versione è stabile e testata si fa deploy su Vercel (dopo conferma esplicita dell'utente)
2. **Prima di ogni feature**: Creare PLAN dettagliato e validare con utente
3. **Endpoint**: Verificare se esistono già prima di crearne di nuovi
4. **Commit**: Sempre con messaggio descrittivo e push
5. **Deploy**: Solo su richiesta esplicita dell'utente o dopo conferma che la versione è stabile

### Comandi ed Esecuzioni
1. **Se eseguibili in automatico**: Eseguirli direttamente e mostrare output
2. **Se NON eseguibili in automatico**: Fornire comandi completi con istruzioni dettagliate:
   - Comandi esatti da copiare
   - Ordine di esecuzione
   - Output atteso
   - Come verificare il successo
3. **Ambiente**: Notare che l'esecuzione avviene in ambiente sandbox, alcuni comandi potrebbero non essere disponibili

### Documentazione
1. Dopo ogni feature importante, aggiornare AGENTS.md
2. Mantenere aggiornata la sezione "Task Completati"

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

## Stili Grafici (Design System)

### Variabili CSS Base
```css
:root {
  --primary: #667eea;
  --primary-dark: #5a67d8;
  --success: #27AE60;
  --warning: #F39C12;
  --danger: #E74C3C;
  --text: #333333;
  --gray: #888888;
  --light: #f8f9fa;
  --border: #e0e0e0;
}
```

### Bordi e Radius
| Elemento | Border Radius |
|----------|---------------|
| Card semplici | `12px` |
| Card con sfondo gradiente | `16px` |
| Bottoni | `10px` |
| Badge/Chip | `20px` (pill) o `8px` |
| Input | `8px` |
| Player Card (top 3) | `16px` |
| Match item | `10px` |

### Ombre (Box Shadow)
| Uso | Valore |
|-----|--------|
| Card base | `0 2px 10px rgba(0,0,0,0.08)` |
| Card evidenziata | `0 4px 20px rgba(0,0,0,0.08)` |
| Card hover / effetto 3D | `0 15px 30px rgba(0,0,0,0.2), 0 5px 15px rgba(0,0,0,0.1)` |
| Pulsanti gradiente | `0 8px 25px rgba(102,126,234,0.4)` |

### Effetti Interattivi

**Hover su card giocatore (effetto lift 3D):**
```css
.player-card {
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}
.player-card:hover {
  transform: translateY(-8px) scale(1.03);
  box-shadow: 0 15px 30px rgba(0,0,0,0.2), 0 5px 15px rgba(0,0,0,0.1);
}
```

**Hover su match item:**
```css
.match-item {
  transition: all 0.2s ease;
  background: #fafafa;
}
.match-item:hover {
  background: #f0f0f0;
  transform: translateX(5px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
```

**Pulsanti:**
```css
button {
  transition: all 0.2s ease;
  cursor: pointer;
}
button:hover {
  transform: translateY(-2px);
}
button:active {
  transform: translateY(0);
}
```

### Gradenti
| Tipo | Valore |
|------|--------|
| Sfondo principale | `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` |
| Oro (1° classificato) | `linear-gradient(180deg, #FFD700 0%, #FFA500 100%)` |
| Argento (2° classificato) | `linear-gradient(180deg, #E8E8E8 0%, #A0A0A0 100%)` |
| Bronzo (3° classificato) | `linear-gradient(180deg, #CD7F32 0%, #8B4513 100%)` |

### Spacing
| Tipo | Valore |
|------|--------|
| Padding card interna | `16px` |
| Gap tra card | `16px` o `20px` |
| Margin section | `24px` |
| Gap tra elementi inline | `8px` o `12px` |

### Icone/Emoji con Effetti
```css
/* Per medaglie con rilievo */
filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));

/* Per trend indicators */
box-shadow: 0 2px 6px rgba(0,0,0,0.2);
```

### Responsive Breakpoints
```css
@media (max-width: 900px) { /* Tablet */ }
@media (max-width: 600px) { /* Mobile grande */ }
@media (max-width: 400px) { /* Mobile piccolo */ }
```

### Colori Risultati
| Risultato | Colore |
|-----------|--------|
| Vittoria | `#27AE60` |
| Pareggio | `#F39C12` |
| Sconfitta | `#E74C3C` |
| Testo secondario | `#888888` |

### Template Card Standard
```html
<div style="
  background: white;
  padding: 16px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
">
  <!-- Contenuto -->
</div>
```

### Template Player Box (Top 3 - con effetto 3D hover)
```html
<!-- Box giocatore singolo con effetto rilievo 3D -->
<div style="
  flex: 1;
  background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
  padding: 16px 8px;
  border-radius: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 6px 20px rgba(0,0,0,0.25), 0 3px 6px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.4);
"
onmouseover="this.style.transform='translateY(-8px) scale(1.05)'; this.style.boxShadow='0 20px 40px rgba(0,0,0,0.35), 0 10px 15px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.4)';"
onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.25), 0 3px 6px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.4)';"
>
  <div style="font-size: 32px; margin-bottom: 8px; filter: drop-shadow(0 3px 4px rgba(0,0,0,0.4));">🥇</div>
  <div style="font-size: 13px; font-weight: bold; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.4); margin-bottom: 6px;">Marco Rossi</div>
  <div style="font-size: 16px; font-weight: bold; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.4);">20 Gol</div>
</div>
```

**Colori per posizione:**
| Posizione | Background Start | Background End |
|-----------|-----------------|---------------|
| 1° (Oro) | `#FFD700` | `#FFA500` |
| 2° (Argento) | `#C0C0C0` | `#A0A0A0` |
| 3° (Bronzo) | `#CD7F32` | `#8B4513` |

### Template Prossima Partita (Evidenziata)
```html
<div style="
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  color: white;
  border-radius: 16px;
  box-shadow: 0 8px 25px rgba(102,126,234,0.4);
">
  <!-- Contenuto -->
</div>
```

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

## Sistema Partnership

### Modello Commerciale
| Piano | Prezzo | Note |
|-------|--------|------|
| **Coach** | €99/anno | ~€9/mese, 1 squadra, tutte le funzionalità |
| **Club** | €249/anno | ~€25/mese, squadre illimitate, permessi avanzati |
| **AI Plus** | Coming Soon | Assistente AI, analisi, automazioni |

### Partnership a 3 Livelli
1. **Referral Commerciale** - Landing page + codice referral + 20% commissione
2. **Integrazione Tecnica** - Widget, import dati, link diretti
3. **Co-Marketing** - Webinar, articoli, eventi FIGC/LND

### Commissioni Partner
| Piano | Prima Registrazione (20%) | Rinnovi Annuali (10%) |
|-------|--------------------------|----------------------|
| **Coach** (€99/anno) | €19,80 | €9,90 |
| **Club** (€249/anno) | €49,80 | €24,90 |

### Proiezioni Ricavi (Profilo Club - €249/anno)
| Scenario | Società/Anno | Ricavo | Commissione |
|----------|--------------|--------|-------------|
| Conservativo | 15 | €3.735 | €747 |
| Realistico | 30 | €7.470 | €1.494 |
| Ottimistico | 45 | €11.205 | €2.241 |

### Documentazione Partnership
- `/docs/PROPOSTA_PARTNERSHIP.md` - Proposta completa (Markdown)
- `/docs/PROPOSTA_PARTNERSHIP_WITH_LOGO.html` - Proposta PDF-ready (con logo)
- `/docs/PITCH_DECK.md` - Presentazione sintetica
- `/docs/CONTATTI_PORTALI.md` - Email tipo e contatti
- `/landing/index.html` - Landing page pubblica
- `/SQL/referral_system.sql` - Schema DB per referral

### Repo Landing Page
- **Repo**: `https://github.com/ecopraf/yfm-landing`
- **Vercel**: `https://yfm-landing.vercel.app`

---

## Task Completati ✅
- ✅ Timeline Partita - vista minuto-per-minuto eventi in matchDetail.js
- ✅ Archivia Partita - Blocco modifiche per partite concluse
- ✅ LIVE Indicator - Pallino e scritta LIVE lampeggianti per partite in corso
- ✅ Auth FASE 1 - Sistema ruoli, gestione utenti, link guest
- ✅ Dashboard Aggiornata - Prossima partita in evidenza, trend, top players
- ✅ Accessibilità - Tooltip su tutte le icone senza testo
- ✅ Dashboard 3D - Grafica moderna con effetto hover e card cliccabili
- ✅ Design System - Stili consolidati in AGENTS.md
- ✅ Landing Page v4 - Logo embedded completo, pricing Coach/Club/AI Plus, link email _blank
- ✅ Demo Interattiva - Pulsante "Avvia Demo" nella pagina login, sessione demo senza account
- ✅ Pricing Aggiornato - Coach (€99), Club (€249), AI Plus (Coming Soon)
- ✅ Commissioni Partnership - Dettaglio per profilo Coach/Club
- ✅ Proiezioni Ricavi - Scenari 15-30-45 con page-break PDF
- ✅ Sistema Mini Missioni - Step sequenziali per pagina (Dashboard, Calendario, Rosa, etc.)

## Bug Noti ⚠️
- Nessuno (demo funziona completamente)

## Task Sospesi ⏸️
- ✅ Valutazioni Giocatore (base) - Valutazioni tecniche per stagione/partita
- ⏸️ Filtro Categorie - Staff vede solo squadre assegnate

## Prossime Azioni - Partnership Strategy

### Immediate (Go-Live)
- [x] Creare credenziali demo in Supabase (demo_yfm / demo_yfm)
- [x] Testare flow completo: landing → demo login
- [x] Implementare scheda giocatore in modalità demo ✅ TESTATO
- [ ] Aggiungere eventi/partite archiviate dati simulati (opzionale)

### Breve Termine
- [ ] Setup sistema pagamenti/commissioni (Stripe, PayPal, bonifico?)
- [ ] Creare codici referral unici per ogni partner
- [ ] Definire processo onboarding partner

### Medio Termine
- [ ] Acquisto dominio personalizzato (es. youthfootballmanager.it)
- [ ] Setup email professionale (info@...)
- [ ] Dashboard partner con statistiche referral

### Opportunità
- [ ] Integrazione con portali sportivi (Tuttocampo, OA Sport, etc.)
- [ ] Webinar FIGC/LND per presentazione
- [ ] Case study con prime società pilota

---

---

## Landing Page

### File e Posizione
- **File principale**: `/landing/index.html` (root del repo)
- Logo embedded base64
- Responsive (desktop/tablet/mobile)
- Stesso stile dei documenti PDF

### Sistema Demo Interattivo
La demo funziona tramite pulsante "Avvia Demo" nella pagina di login:
- **URL**: https://youth-football-manager.vercel.app
- **Flusso**: Landing → "Prova la Demo" → Login → "Avvia Demo"
- Non richiede account, usa dati simulati in memoria

#### Mini Missioni (Step Guidati per Pagina)
Ogni pagina ha step sequenziali che guidano l'utente attraverso le funzionalità:

| Pagina | Step |
|--------|------|
| **Dashboard** | Esplora → Prossima partita → Statistiche → Risultati recenti |
| **Calendario** | Esplora → Apri partita → Convoca → Formazione → Distinta → Eventi → Archivia |
| **Rosa** | Esplora → Filtra ruolo → Cerca giocatore → Apri scheda |
| **Allenamenti** | Esplora → Crea seduta → Aggiungi esercizi → Presenze |
| **Statistiche** | Esplora → Classifica marcatori → Classifica assist → Disciplina |
| **Report** | Esplora → Genera report → Scarica PDF |

**Caratteristiche:**
- Trigger automatici: `auto_on_view`, `click`, `select`, `input`
- Panel laterale con progress bar (collapsible)
- Toast "completata!" su ogni step
- Reset completo su "Ricarica Demo"
- Badge "Demo X%" nell'header

**File**: `frontend-v2/src/modules/demo/demo.js` (classe `MiniMissionManager`)

### Gestione Landing Page
1. **Modifiche**: Il file è HTML statico, modificare direttamente e pushare
2. **Deploy**: Vercel aggiorna automaticamente su push
3. **Test locale**: Aprire `landing/index.html` nel browser

---

## Regole per Modifiche con Task Tracker

### Prima di Iniziare una Modifica
1. Creare **PLAN dettagliato** delle modifiche
2. Elencare tutti i **file coinvolti**
3. Prevedere **test necessari**
4. Condividere con utente per validazione

### Durante le Modifiche
1. Usare `task_tracker` per tracciare progressi:
   ```javascript
   task_tracker({
     command: "plan",
     task_list: [
       { title: "Task 1", status: "in_progress" },
       { title: "Task 2", status: "todo" }
     ]
   })
   ```

2. Aggiornare task man mano:
   - `in_progress`: task attualmente in lavorazione
   - `done`: task completato
   - `todo`: task da fare

3. Per modifiche multi-step, numerare i passi nel messaggio commit

### Dopo le Modifiche
1. **Verificare** che il build passi (`vite build`)
2. **Testare** localmente se possibile
3. **Commit** con messaggio chiaro:
   - Formato: `[breve tag]: [descrizione]`
   - Esempi:
     - `feat: aggiungi feature X`
     - `fix: risolvi bug in Y`
     - `docs: aggiorna documentazione`
     - `refactor: migliora codice Z`

4. **Push** immediato dopo commit

### Template Commit Message
```
<tipo>: <descrizione breve>

[descrizione dettagliata se necessario]

Files:
- file1.js
- file2.html

Test: vite build ✅
```

---

## Documenti di Progetto (HTML → PDF)

### Regole per Documenti Professionali
Quando si crea un documento HTML destinato alla stampa PDF, **SEMPRE**:

1. **Logo Embedded (OBBLIGATORIO)**
   - Il logo NON deve essere un riferimento a file esterno
   - Usare sempre il logo in formato **base64 embedded** direttamente nell'SRC dell'img
   - Posizione logo: `/workspace/project/youth-football-manager/docs/logo.png`
   - Procedura: convertire il PNG in base64 e includerlo come `src="data:image/png;base64,..."`

2. **Foglio di Stile CSS Integrato**
   - Tutti gli stili inline nel tag `<style>` nell'`<head>`
   - Usare Google Fonts: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`
   - Font principale: `font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;`

3. **Struttura Cover**
   ```html
   <div class="cover">
       <img src="data:image/png;base64,..." alt="Logo YFM" class="cover-logo">
       <h1>Titolo Documento</h1>
       <h2>Sottotitolo</h2>
   </div>
   ```

4. **Page Break**
   - Per forzare una nuova pagina PDF: `style="page-break-before: always;"`
   - Esempio: prima delle sezioni principali o contenuti che devono iniziare da pagina nuova

5. **Box Evidenziati**
   ```html
   <div class="highlight-box">
       <h3>Titolo</h3>
       <p>Contenuto...</p>
   </div>
   ```

6. **Responsive per Stampa**
   ```css
   @media print {
       body { padding: 20px; }
       .section { page-break-inside: avoid; }
   }
   ```

### Documenti Esistenti
| File | Descrizione |
|------|-------------|
| `/landing/index.html` | Landing page professionale (HTML statico) |
| `/docs/PROPOSTA_PARTNERSHIP_WITH_LOGO.html` | Proposta partnership (logo embedded, 3 livelli) |
| `/docs/PROPOSTA_PARTNERSHIP.md` | Proposta partnership (Markdown) |
| `/docs/PITCH_DECK.md` | Presentazione sintetica |
| `/docs/FUNZIONALITA_YFM.html` | Panoramica funzionalità per partnership |
| `/docs/MANUALE_UTENTE.html` | Manuale utente completo |
| `/docs/logo.png` | Logo YFM (usare per base64) |

### Esempio Script Python per Logo Embedded
```python
import base64

# Leggi e converte logo in base64
with open('docs/logo.png', 'rb') as f:
    logo_b64 = base64.b64encode(f.read()).decode('utf-8')

# Inserisci nel tag img
html = html.replace('src="logo.png"', f'src="data:image/png;base64,{logo_b64}"')
```

## Ultime Modifiche (commit: f90fce8)
- feat: nuovo flusso login con due pulsanti distinti (Login + Demo)
- feat: banner demo con pulsanti, sidebar CTA, stili mobile
- fix: demo init, badge reload, training modal close
- docs: aggiorna AGENTS.md con Sistema Demo completo

## URL Applicazione
| Ambiente | URL |
|----------|-----|
| **Landing Page** | https://youth-football-manager.vercel.app |
| **App** | https://youth-football-manager.vercel.app/login |
| **Backend API** | https://youth-football-manager-backend.vercel.app/api |
| **Repo GitHub** | https://github.com/ecopraf/youth-football-manager |
| **Demo** | https://youth-football-manager.vercel.app/login → click "🎮 Demo" |

## Deploy Vercel

Token API disponibile come secret `VERCEL_TOKEN` per deploy automatici.

**Project ID**: `prj_zJ4cDM8Y8ledbwYKdJYWKQWwRrV6`

```bash
curl -X POST "https://api.vercel.com/v13/deployments" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"youth-football-manager","gitSource":{"type":"github","repo":"ecopraf/youth-football-manager","repoId":"1273151079","ref":"main"},"project":"prj_zJ4cDM8Y8ledbwYKdJYWKQWwRrV6","target":"production"}'
```

---

## Stato Attuale Repository (Giugno 2025)

### Struttura Frontend Modules
| Directory | File | Righe | Descrizione |
|-----------|------|-------|-------------|
| team/ | dashboard.js | 190 | Dashboard con prossima partita, trend, top players |
| team/ | roster.js | 322 | Rosa giocatori, CRUD, filtri |
| team/ | calendar.js | 283 | Calendario partite con archiviazione |
| team/ | convocazioni.js | 161 | Gestione convocazioni |
| team/ | distinta.js | 277 | Distinta FIGC PDF |
| team/ | formazione.js | 230 | Gestione formazione |
| team/ | resultForm.js | 231 | Inserimento eventi/risultato |
| team/ | matchDetail.js | 183 | Dettaglio partita con timeline |
| team/ | playerDetail.js | 391 | Scheda giocatore completa |
| team/ | valutazioni.js | 170 | Valutazioni partite |
| team/ | noteAvversario.js | 81 | Note avversario |
| team/ | squadre.js | 40 | Gestione squadre |
| admin/ | users.js | ~280 | Gestione utenti |
| admin/ | guestLinks.js | ~240 | Gestione link guest |
| auth/ | login.js | 267 | Login con supporto demo URL |
| auth/ | guest.js | ~100 | Attivazione guest |
| coach/ | training.js | 347 | Allenamenti e presenze |
| performance/ | reports.js | 788 | Report partita/stagionale |
| performance/ | stats.js | 59 | Statistiche disciplina |
| club/ | settings.js | 98 | Impostazioni |
| club/ | workspace.js | 20 | Info società |

### Backend API (backend/api/index.js - 1543 righe)
- Health: `/api/health`, `/api/warmup`
- Auth: login, register, users CRUD, guest links
- Squadre: CRUD, statistiche-complete, top-players, valutazioni-top
- Partite: dettaglio, formazione, convocazioni, eventi, valutazioni
- Calciatori: lista, sposta, storico valutazioni
- Partner: lista, verifica codice, referral log, stats (admin)

### Sistema Partnership/Referral
- Tabella `partner` per gestione partner commerciali
- Tabella `referral_log` per tracciare registrazioni referral
- Endpoint admin per gestione partner e statistiche

### Task Completati ✅
- ✅ Timeline Partita - vista minuto-per-minuto in matchDetail.js
- ✅ Archivia Partita - blocco modifiche per partite concluse
- ✅ LIVE Indicator - pallino e scritta LIVE lampeggianti
- ✅ Auth FASE 1 - sistema ruoli, gestione utenti, link guest
- ✅ Dashboard Aggiornata - prossima partita in evidenza, trend
- ✅ Accessibilità - tooltip su tutte le icone
- ✅ Dashboard 3D - grafica moderna con effetto hover
- ✅ Design System - stili consolidati in AGENTS.md
- ✅ Landing Page v4 - logo embedded, pricing Coach/Club/AI Plus
- ✅ Demo Interattiva - Pulsante "Avvia Demo" in login page (no URL params)
- ✅ Pricing Aggiornato - Coach (€99), Club (€249), AI Plus (Coming Soon)
- ✅ Commissioni Partnership - dettaglio per profilo Coach/Club
- ✅ Proiezioni Ricavi - scenari 15-30-45 con page-break PDF
- ✅ Sistema Referral - tabelle partner, referral_log, endpoint admin
- ✅ Player Detail - scheda giocatore completa con storico
- ✅ **Demo Interattiva** - sistema missioni guidate con progress tracking
- ✅ Demo Button Fix - avvia senza login API (localStorage)
- ✅ Bottoni Login Allineati - stessa dimensione, effetti 3D hover
- ✅ Demo Flow Fix - reload pagina per init corretto demoManager
- ✅ Demo Workspace Green Academy - endpoint /api/demo/init, loadSquadre dinamico
- ✅ Backend Bug Fix - rimosso codice referral mal posizionato

### Task Sospesi ⏸️
- ✅ Valutazioni Giocatore (base) - valutazioni tecniche per stagione/partita
- ⏸️ Filtro Categorie - staff vede solo squadre assegnate

### Roadmap MVP
| Fase | Contenuto | Stato |
|------|-----------|-------|
| **FASE 1** | Auth/Ruoli (Login, JWT, Admin/Allenatore/Staff) | ✅ COMPLETATO |
| **FASE 1b** | Demo Interattiva (missioni, progress, tooltip marketing) | ✅ COMPLETATO |
| **FASE 2** | Import CSV base (rosa, partite, eventi) | TODO |
| **FASE 3** | Import Tuttocampo (web scraping) | TODO |
| **FASE 4** | Centro Importazioni (log, duplicati, matching) | TODO |
| **FASE 5** | Polish, test, template repository | TODO |

---

## Sistema Demo Interattiva

### Concetto
Demo guidata con **missioni** e **progress tracking** per massimizzare il coinvolgimento e la conversione. L'utente "impara" il prodotto invece di solo guardarlo.

### Flusso Completo
```
Landing Page → "Prova la Demo" → /login
→ Click "🎮 Demo" → Imposta sessione in localStorage
→ window.location.href = '/' → Ricarica pagina principale
→ main.js: isDemo() = true → initDemoSession()
→ /api/demo/init → carica dati Green Academy
→ Popup Benvenuto → Badge Demo 🌱
→ Panel Missioni → Navigazione pagine
→ Tooltip Marketing → Completion → CTA Registrazione
```

### File Chiave
| File | Responsabilità |
|------|----------------|
| `frontend-v2/src/modules/auth/login.js` | Click Demo → imposta sessione → ricarica / |
| `frontend-v2/src/router.js` | `window.YFM.isDemo()` per accesso pagine |
| `frontend-v2/src/main.js` | `isDemo()` → `initDemoSession()` → `/api/demo/init` |
| `frontend-v2/src/modules/demo/demo.js` | UI demo, missioni, progress tracking |
| `frontend-v2/src/modules/team/squadre.js` | `loadSquadre()` con ricerca stagione attiva |
| `backend/api/index.js` | `/api/demo/init`, `/api/workspaces/:id/stagioni` |

### Costanti Demo (localStorage)
```javascript
'yfm_demo_session'   // 'active' quando demo è attiva
'yfm_demo_user'      // JSON con {id, nome, cognome, ruolo, email}
'yfm_demo_progress'   // JSON con {missions: [...], welcomeShown: bool}
```

### Funzioni Globali (window.YFM)
```javascript
window.YFM.isDemo()          // true se yfm_demo_session === 'active'
window.YFM.isGuest()         // true se guest link attivo
window.YFM.isAuthenticated() // true se JWT token valido
```

### Endpoint Demo API
- **GET /api/demo/init** - Inizializza sessione demo
  - Risposta: `{workspace, stagione, squadre, primaSquadra}`
  - Trova automaticamente Green Academy (id: `00000000-0000-0000-0000-000000000001`)
  - Stagione attiva: `2025/26` (id: `00000000-0000-0000-0000-000000000002`)
  - Squadre: Green Academy Primavera e Allievi B

- **GET /api/workspaces/:id/stagioni** - Lista stagioni di un workspace

### Missioni Disponibili (6 pagine)
| # | Missione | Pagina Router |
|---|----------|---------------|
| 1 | Dashboard | dashboard |
| 2 | Rosa | roster |
| 3 | Calendario | calendar |
| 4 | Allenamenti | training |
| 5 | Statistiche | stats |
| 6 | Report | reports |

### Componenti UI Demo
- **Badge Progress**: `🌱 Demo XX%` - sfondo bianco, bordo verde, effetto 3D hover
- **Panel Missioni**: Click badge per vedere missioni e pulsante "Richiedi Informazioni"
- **Popup Benvenuto**: First-time con opzioni Tour/Esplora liberamente
- **Banner Marketing**: Slide-up contestuale per ogni pagina visitata
- **Celebrazione**: Popup quando tutte le 6 missioni sono completate
- **Form Registrazione**: Sempre accessibile dal panel o dal completamento

### Workspace Demo (Database)
| ID | Nome | Stagione Attiva |
|----|------|-----------------|
| `00000000-0000-0000-0000-000000000001` | ASD Green Academy | 2025/26 |
| `00000000-0000-0000-0000-000000000010` | Green Academy Primavera | - |
| `00000000-0000-0000-0000-000000000011` | Green Academy Allievi B | - |

### Prossime Evoluzioni Demo
- ⏸️ Clone sessione isolato per ogni visitatore
- ⏸️ Reset automatico dati dopo timeout
- ⏸️ Opzione "Salva progressi" → registrazione con dati precompilati

---

## Procedura Test post-Deploy

### Ambiente di Test
Dopo ogni deploy su Vercel, testare le modifiche su:
- **Produzione**: https://youth-football-manager.vercel.app
- **Preview** (se disponibile): link da Vercel Dashboard

### Test Manuali Standard

#### 1. Login Page
- [ ] Apri `/login`
- [ ] Verifica pulsanti "🔐 Accedi" e "🎮 Avvia Demo" visibili e allineati
- [ ] Verifica effetti 3D hover sui bottoni
- [ ] Test login con credenziali reali (se disponibili)

#### 2. Demo Interattiva
- [ ] Click "🎮 Avvia Demo"
- [ ] Verifica popup benvenuto appare
- [ ] Verifica badge "🌱 Demo XX%" nell'header
- [ ] Naviga tra le pagine: Dashboard → Rosa → Calendario → Allenamenti → Statistiche → Report
- [ ] Verifica progress tracking (missioni completate)
- [ ] Verifica tooltip marketing su ogni pagina
- [ ] Click sul badge → apre panel missioni

#### 3. Console Browser (DevTools F12)
- [ ] Check per errori JavaScript
- [ ] Check per warning `console.log` lasciati nel codice
- [ ] Verifica log `[DEMO]`, `[MAIN]`, `[ROUTER]` se presenti

### Test Demo Flow (log attesi)
```
[MAIN] Autenticato: false Demo: true
[MAIN] Init demo
[DEMO] init() called, isDemo: true
[DEMO] loadProgress, saved: null
[DEMO] Creating UI...
[DEMO] updateBadge called
[DEMO] setupWelcomePopup called
[ROUTER] navigateTo chiamato con: dashboard
```

### Test Backend
- [ ] Avvia backend localmente: `cd backend && npm run dev`
- [ ] Verifica nessun errore `ReferenceError`
- [ ] Test API endpoints principali via Postman/curl

### Comandi Locali per Test
```bash
# Pull ultime modifiche
cd ~/workspace/youth-football-manager
git pull origin main

# Backend (terminale 1)
cd backend && npm install && npm run dev

# Frontend (terminale 2)
cd frontend-v2 && npm install && npm run dev

# Test in browser
# http://localhost:5173/login
```

### Deploy su Vercel (se necessario)
```bash
# Trigger via deploy hook
curl -s -X POST "https://api.vercel.com/v1/integrations/deploy/prj_zJ4cDM8Y8ledbwYKdJYWKQWwRrV6/sdSMzRESB6"

# Oppure via GitHub push (automatico se configurato)
```

### Checklist Pre-Deploy
- [ ] Build passa: `cd frontend-v2 && npm run build`
- [ ] Nessun errore TypeScript/ESLint
- [ ] Credenziali/demo user inserite nel DB Supabase
- [ ] Backend avviabile senza errori
- [ ] Commit con messaggio descrittivo
