# Youth Football Manager

> ⚠️ **Per agenti AI**: consultare `.agents/AGENTS.md` (entry point principale)

## Quick Links
- **App**: https://youth-football-manager.vercel.app
- **Backend**: https://youth-football-manager-backend.vercel.app/api
- **Repo**: https://github.com/ecopraf/youth-football-manager

## Info
- **Versione**: v3.14
- **Build ID**: `v3.14.<git-hash>`
- **Deploy**: Manuale via API (NON automatico su push a main)

## 🔑 Credenziali Sistema

### Superadmin
| Email | Password |
|-------|----------|
| coppola.raffaele@gmail.com | raffaele78 |

### Utenti Production
| Nome | Ruolo | Email | Password | Workspace |
|------|-------|-------|----------|-----------|
| Matteo Urilli | Allenatore | matteo@urilli.it | mister | DF Academy |
| Francesco Annese | Admin | francesco@annese.it | annex | ACP Annex |

## ⚠️ ISTRUZIONI IMPORTANTI

### Git & Deploy
- **NON fare push automatico su main** che triggera deploy Vercel
- Per ogni modifica:
  1. Disabilita deploy Vercel via API
  2. Fai commit e push
  3. Riabilita deploy Vercel
- Per deploy manuale: usare l'API Vercel con commit SHA specifico (richiedere conferma)

## 🔐 Credenziali Configurate

> ⚠️ **NOTA**: Le credenziali sensibili sono gestite tramite le variabili d'ambiente dell'agent.
> Non inserire mai secrets hardcoded nei file. Fai riferimento alle variabili `$SUPABASE_URL`, `$SUPABASE_SERVICE_ROLE_KEY`, `$VERCEL_TOKEN`.

### Supabase
- **URL**: `https://csxdlxbhcnyfppojwwzy.supabase.co`
- **Service Role Key**: usa variabile `$SUPABASE_SERVICE_ROLE_KEY`

### Vercel
- **Token**: usa variabile `$VERCEL_TOKEN`
- **Project ID**: `prj_zJ4cDM8Y8ledbwYKdJYWKQWwRrV6`
- **Team**: `team_CqNxANEW3rt4d6yuYeZM9Db7`

### Database Direct Access
```bash
# Usa le variabili d'ambiente dell'agent
curl -X POST "https://csxdlxbhcnyfppojwwzy.supabase.co/rest/v1/rpc/exec_sql" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT 1"}'
```

### Vercel API - Gestione Deploy
```bash
# Disabilita deploy automatici
curl -X PATCH "https://api.vercel.com/v6/projects/youth-football-manager" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gitProviderOptions":{"createDeployments":"disabled"}}'

# Riabilita deploy
curl -X PATCH "https://api.vercel.com/v6/projects/youth-football-manager" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gitProviderOptions":{"createDeployments":"enabled"}}'
```

### Workspace Switcher - Note Implementative
- Solo i **superadmin** vedono lo switcher
- Al login appare un modal di selezione se ci sono 2+ workspace reali
- Dalla sidebar si può cambiare in qualsiasi momento
- Il workspace demo (ID: `00000000-0000-0000-0000-000000000001`) è escluso