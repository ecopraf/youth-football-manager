# Backend API - Struttura

## File Principale
- `index.js` — Monolite con tutti gli endpoint esistenti (~1960 righe)

## Moduli Condivisi (usati da index.js e dai nuovi route modules)
- `db/supabase.js` — Client Supabase con keep-alive
- `middleware/auth.middleware.js` — authMiddleware + permission helpers

## Nuovi Moduli (route files)
- `routes/` — Qui vanno le nuove feature come moduli Express Router

## Come Aggiungere un Nuovo Modulo

### 1. Crea il file route
```javascript
// routes/import.routes.js
const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { authMiddleware, requirePermission } = require('../middleware/auth.middleware');

router.post('/csv', authMiddleware, requirePermission('rosa', 'write'), async (req, res) => {
  // logica import
});

module.exports = router;
```

### 2. Monta in index.js (in fondo, prima di module.exports)
```javascript
app.use('/api/import', require('./routes/import.routes.js'));
```

## Regole
- I nuovi moduli usano `require('../db/supabase')` e `require('../middleware/auth.middleware')`
- NON duplicare authMiddleware o supabase client
- Ogni route file è un Express Router autocontenuto
- Il monolite `index.js` non cresce più: nuove feature → nuovi file in `routes/`
