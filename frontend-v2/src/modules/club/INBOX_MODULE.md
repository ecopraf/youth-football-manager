# Inbox Module

## File coinvolti
- `backend/api/routes/inbox.js` — endpoint aggregati
- `frontend-v2/src/modules/club/inbox.js` — pagina inbox
- `frontend-v2/src/utils/capabilities.js` — capability `inbox`
- `frontend-v2/src/components/helpData.js` — entry `inbox`

## Tabelle DB usate
- `notification` — avvisi, convocazioni, bonifici (tipo: avviso/convocazione/ricevuta_bonifico)
- `absence_notification` — segnalazioni assenza atleti

## Capability
- `inbox` — default `write` per `segreteria` e `admin`. Estendibile ad altri profili dal wizard utenti.

## Endpoint backend

| Metodo | Path | Note |
|--------|------|------|
| GET | `/api/inbox` | Aggrega notification + absence_notification. Params: `workspace_id` (required), `team_id`, `tipo` (all/assenze/avvisi/convocazioni/bonifici), `letto` (all/true/false), `limit` (default 50), `offset` (default 0). Risposta: `{data, total, contatori}` |
| PUT | `/api/inbox/mark-read` | Body: `{ids: [...], source: 'notification'\|'absence'}`. Segna letti in batch |
| PUT | `/api/inbox/mark-all-read` | Body: `{workspace_id, team_id?, tipo?}`. Segna tutti letti |

## Contatori risposta GET /inbox

```json
{
  "all": 10, "non_letti": 3,
  "assenze": 4, "assenze_non_lette": 1,
  "avvisi": 2, "avvisi_non_letti": 0,
  "convocazioni": 3, "convocazioni_non_lette": 2,
  "bonifici": 1, "bonifici_non_letti": 0
}
```

## Variabili YFM usate
- `window.YFM.activeWorkspaceId` — workspace corrente
- `window.YFM.squadraId` — squadra attiva (usata come default per `filtroSquadra` all'apertura)
- `window.YFM.allSquadre` — per dropdown filtro squadra (visibile se >1 squadra)
- `window.YFM.navigateTo()` — azioni rapide (vai allenamento, vai calendario)

## Note critiche
- **Filtro squadra default**: `filtroSquadra` inizializzato con `window.YFM.squadraId` — evita che messaggi di altre categorie appaiano nella vista corrente
- **Tipo bonifico**: in `notification` ha `tipo = 'ricevuta_bonifico'` o `'ricevuta_caricata'` — entrambi mappati a `'bonifico'` nella risposta inbox
- **source field**: ogni item ha `source: 'notification'|'absence'` — necessario per mark-read corretto
- **Archivio**: calcolato lato frontend — messaggi letti con età > 30gg collassati in accordion
- **Paginazione**: LIMIT=20, bottone "Carica altri" — append alla lista esistente
- **Azione conferma bonifico**: chiama `PUT /fee-installments/:id/conferma-pagamento` con `riferimento_id` dell'item
- **Azione rifiuta bonifico**: rimanda alla pagina Quote (endpoint rifiuta richiede logica più complessa)
- **24.13 SKIP**: la campanellina NON naviga all'inbox — mantiene il dropdown esistente. L'inbox è accessibile solo dalla sidebar
