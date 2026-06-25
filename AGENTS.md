# Youth Football Manager - Contesto Progetto

## Stack Tecnico
- **Frontend**: Vite + JavaScript ES modules, deploy su Vercel
- **Backend**: Node.js/Express, deploy su Vercel
- **Database**: Supabase (PostgreSQL)
- **Autenticazione**: JWT custom + Link Guest
- **Logo**: `/frontend-v2/public/assets/logo.png`
- **Email**: youthfootballmanager@gmail.com

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

### Modifiche al Database
1. **Preferire sempre API integrate**: Se il backend ha endpoint per le operazioni CRUD, usarli tramite le API esistenti
2. **Se API non disponibili**: Fornire query SQL dettagliate da eseguire in Supabase SQL Editor con istruzioni step-by-step:
   - Indicare esattamente quale tabella modificare
   - Fornire la query completa con tutti i campi necessari
   - Specificare l'ordine di esecuzione se ci sono dipendenze
3. **Verificare struttura DB**: Prima di ogni modifica, controllare schema esistente con API o via SQL

### Modifiche al Progetto
1. **Prima di ogni feature**: Creare PLAN dettagliato e validare con utente
2. **Endpoint**: Verificare se esistono già prima di crearne di nuovi
3. **Commit**: Sempre con messaggio descrittivo e push

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
- `/landing.html` - Landing page pubblica
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
- ✅ Demo Auto-login - Parametri URL demo_email, demo_password, auto_login
- ✅ Pricing Aggiornato - Coach (€99), Club (€249), AI Plus (Coming Soon)
- ✅ Commissioni Partnership - Dettaglio per profilo Coach/Club
- ✅ Proiezioni Ricavi - Scenari 15-30-45 con page-break PDF

## Task Sospesi ⏸️
- ⏸️ Valutazioni Giocatore - Valutazioni tecniche per stagione/partita
- ⏸️ Filtro Categorie - Staff vede solo squadre assegnate

## Prossime Azioni - Partnership Strategy

### Immediate (Go-Live)
- [ ] Creare credenziali demo in Supabase (demo_yfm / demo_yfm)
- [ ] Testare flow completo: landing → demo login
- [ ] Personalizzare proposta con logo partner prima di invio

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
- **File principale**: `/landing.html` (root del repo)
- Logo embedded base64
- Responsive (desktop/tablet/mobile)
- Stesso stile dei documenti PDF

### Link Demo Auto-login
La landing page contiene link che permettono accesso demo automatico:
```
https://youth-football-manager.vercel.app/login?demo_email=demo_yfm&demo_password=demo_yfm&auto_login=1
```

**Parametri URL:**
| Parametro | Descrizione | Esempio |
|-----------|-------------|---------|
| `demo_email` | Email account demo | `demo_yfm` |
| `demo_password` | Password account demo | `demo_yfm` |
| `auto_login` | Auto-submit form | `1` |

### Gestione Landing Page
1. **Modifiche**: Il file è HTML statico, modificare direttamente e pushare
2. **Deploy**: Vercel aggiorna automaticamente su push
3. **Test locale**: Aprire `landing.html` nel browser

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
| `/landing.html` | Landing page professionale (HTML statico) |
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

## Ultime Modifiche (commit: latest)
- Landing page v3: demo auto-login, pricing 3-tier, icona multi-device
- Login: supporto parametri URL demo_email, demo_password, auto_login
- Pricing aggiornato: Base (free), Standard (€199), Portali (€199)
- Documenti: PROPOSTA_PARTNERSHIP, PITCH_DECK, FUNZIONALITA allineati al pricing
- AGENTS.md: aggiunta sezione Landing Page e regole Task Tracker

## URL Applicazione
- **Landing Page**: https://youth-football-manager.vercel.app (index) → landing.html
- **App**: https://youth-football-manager.vercel.app/login
- **Backend**: https://youth-football-manager-backend.vercel.app
- **Repo**: https://github.com/ecopraf/youth-football-manager
- **Demo**: https://youth-football-manager.vercel.app/login?demo_email=demo_yfm&demo_password=demo_yfm&auto_login=1
