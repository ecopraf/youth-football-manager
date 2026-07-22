# Utils & Components Trasversali

> Riferimenti: `/.agents/AGENTS.md` §cache §global-state | `/.agents/knowledge/DATABASE_SCHEMA.md`

File riutilizzabili in 2+ moduli. Non appartengono a un singolo modulo.

---

### `api.js`
Wrapper fetch autenticato. Aggiunge automaticamente il base URL `/api` e il token JWT.
```javascript
apiFetch(endpoint, options?)  // endpoint SENZA prefisso /api (es. '/support/ticket', non '/api/support/ticket')
```
**Regola critica**: MAI passare endpoint con `/api/` — viene aggiunto automaticamente. Un guard in `apiFetch` rileva e corregge il doppio prefisso loggando un warning in console.

---

## `utils/`

### `ui.js`
Spinner di caricamento globale e toast notification.
```javascript
showLoading(msg?)              // mostra overlay spinner
hideLoading()                  // nasconde overlay
showToast(msg, type?, duration?) // toast temporaneo (type: success/error/warning/info, duration ms default 3000)
```
**Usato in**: tutti i moduli. **Regola**: MAI usare `alert()` — usare `showToast()` o il `window.alert` custom.
**Nota**: molti moduli esistenti hanno una `showToast` locale — sono equivalenti. I nuovi moduli devono importare da `ui.js`.

---

### `formatters.js`
Formattazione date e valori numerici.
```javascript
formatDate(iso)         // → "15 gen 2025"
formatDateShort(iso)    // → "15/01"
formatCurrency(n)       // → "€ 120,00"
```
**Usato in**: calendar, fees, registration, guestAtleta, reports.

---

### `capabilities.js`
Profili e capabilities utente. Mirror del file backend `helpers/capabilities.js`.
```javascript
PROFILI             // oggetto profili predefiniti (allenatore, dirigente, segreteria, ...)
CAPABILITIES        // lista capability disponibili
getUserCapabilities(permessi)  // → { rosa: 'write', partite: 'read', ... }
```
**Usato in**: `router.js` (definisce `window.YFM.canWrite/canRead`), `sidebarNav.js`.
**Nota**: `window.YFM.canWrite(modulo)` e `canRead(modulo)` sono definiti nel router usando questa funzione.

---

### `offlineBuffer.js`
Buffer offline per Match Center e Presenze. Salva dati in `localStorage` quando la rete è instabile; sync automatico al ritorno online.
```javascript
bufferAction(key, payload)   // accoda azione offline
flushBuffer(key, sendFn)     // invia buffer al ritorno online
hasPending(key)              // → boolean
```
**Usato in**: `matchCenter.js` (live mode), `trainingPresenze.js`.

---

### `sessionGuard.js`
Gestione sessioni stale e inattività.
- Visibility check: quando la tab torna visibile dopo >5min, verifica JWT e ricarica la pagina
- Inattività: dopo timeout configurabile, mostra avviso e poi logout
```javascript
initSessionGuard()   // chiamato una volta in main.js
```
**Usato in**: `main.js` (init globale).

---

### `charts.js`
Chart canvas-based senza dipendenze esterne.
```javascript
drawBarChart(canvas, data, options)
drawLineChart(canvas, data, options)
drawPieChart(canvas, data, options)
```
**Usato in**: `performance/stats.js`, `dashboard.js`.

---

### `teamMatch.js`
Matching nomi squadra da fonti esterne (GR, Tuttocampo). Gestisce abbreviazioni (`Pol.`, `C.`, `Atl.`, ecc.) per normalizzare i nomi prima del confronto.
```javascript
normalizeTeamName(name)          // → nome normalizzato
matchTeamName(name, candidates)  // → candidato più simile
```
**Usato in**: `import/importCenter.js`, `match.js` (backend helper mirror).

---

### `printHelper.js`
PWA-safe print helper.
- iOS/Desktop: usa `@media print` nella pagina corrente
- Fallback: apre finestra di stampa con contenuto iniettato
```javascript
triggerPrint()   // avvia stampa cross-platform
```
**Usato in**: tutti i moduli `print/`.

---

### `certificati.js`
Calcola stato certificati medici per lista giocatori.
```javascript
calcCertificatiStatus(players, sogliaGiorni?)
// → { scaduti: [], inScadenza: [], validi: [], mancanti: [] }
```
**Usato in**: `roster.js`, `printScadenzeMediche.js`.

---

### `codiceFiscale.js`
Calcolo e validazione codice fiscale italiano. Include lookup codici catastali (Belfiore).
```javascript
calcolaCodiceFiscale(dati)   // → stringa CF
validaCodiceFiscale(cf)      // → boolean
```
**Usato in**: `registration.js`, form anagrafica giocatore.

---

## `components/`

### `DataGrid.js`
Tabella responsive riutilizzabile. Desktop: `<table>` con `table-layout:fixed`. Mobile (≤500px): layout card stile SofaScore.

```javascript
// columns: [{ key, label, labelShort?, width?, align?, color?, bold?, render?,
//             primary?, secondary?, meta?, mobileIcon?, mobilePrefix? }]
//   primary: titolo card mobile (es. avversario)
//   secondary: riga meta sinistra con icona 📅 (es. data)
renderDataGrid(container, columns, rows, options?)
```
**Usato in**: `performance/stats.js`, `playerDetail.js`, `guestAtleta.js`.
**Regola**: usare per tabelle con 5+ colonne o dati misti testo+numeri. Non toccare stili desktop quando si modifica il mobile.

---

### `PageHelp.js`
Help contestuale interattivo. Mostra guida pagina e tooltip su elementi specifici.
- Modalità 1: click `?` → popover guida generale
- Modalità 2: long-press o doppio-click `?` → modalità interattiva (click su elementi per spiegazione)

```javascript
initPageHelp(pageKey)   // pageKey = chiave in helpData.js
```
**Usato in**: ogni pagina che ha entry in `helpData.js`.

---

### `helpData.js`
Definizioni help contestuale per tutte le pagine.
```javascript
PAGE_HELP     // { [pageKey]: { title, content } }
ELEMENT_HELP  // { [selector]: { title, content } }
```
**Regola obbligatoria**: aggiungere entry ogni volta che si crea una nuova pagina o funzionalità visibile all'utente.

---

### `supportWidget.js`
FAB ⚡ unificato in basso a destra. Click espande due opzioni animate verso lalto.

```javascript
initSupportWidget()   // chiamato una volta in main.js dopo setupLayout()
```

- **❓ Guida**: apre PageHelp popover (doppio-click = modalita interattiva)
- **🐛 Segnala**: modal ticket con tipo (Bug/Idea/Domanda), textarea, screenshot upload/paste (max 2MB)
- Pagina da `window.YFM.currentPage`, build da `BUILD_INFO.id`, workspace da `workspaceInfo.nome`
- Throttle: max 5 ticket per sessione (`sessionStorage: yfm_ticket_count`) — incrementato solo su invio riuscito
- Non visibile su pagine print. Toast a `bottom:80px` per non sovrapporsi al FAB
- Invia a `POST /support/ticket` (senza prefisso /api)

**Usato in**: `main.js` (init globale, non per guest).

---

### `layout/`
Sidebar e header dell'app.

| File | Responsabilità |
|------|---------------|
| `sidebarNav.js` | Voci sidebar filtrate per capabilities. Admin/superadmin vedono tutto. |
| `header.js` | Header con nome squadra, selettore workspace, logout |

**Nota**: `sidebarNav.js` usa `getUserCapabilities()` per filtrare le voci. Ogni nuova pagina deve avere la propria voce con capability richiesta.

---

## Cache frontend (dual-layer)

Documentata in `AGENTS.md` §cache. Riepilogo:

| Layer | Storage | TTL | Scope |
|-------|---------|-----|-------|
| Memory | `window.YFM._cache` | 2 min | tab corrente |
| Persistent | `sessionStorage` | 10 min | sessione browser |

**Pattern**:
```javascript
// Lettura con fallback
const cached = window.YFM._cache?.players || JSON.parse(sessionStorage.getItem('yfm_players') || 'null');
if (cached && Date.now() - cached.ts < 120000) return cached.data;

// Scrittura
const entry = { data: result, ts: Date.now() };
window.YFM._cache = window.YFM._cache || {};
window.YFM._cache.players = entry;
sessionStorage.setItem('yfm_players', JSON.stringify(entry));
```

**Invalidazione**: chiamare `invalidateDashboardCache()` / `invalidateStatsCache()` dopo operazioni di scrittura che impattano dashboard o stats.
