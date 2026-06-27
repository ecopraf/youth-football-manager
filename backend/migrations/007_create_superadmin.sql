-- ============================================================
-- YOUTH FOOTBALL MANAGER - CREAZIONE TABELLA USERS + SUPERADMIN
-- Versione: 1.0 - 2026-06-27
--
-- 1. Crea tabella users (se non esiste)
-- 2. Crea superadmin
-- ============================================================

-- 1. Crea tabella users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nome VARCHAR(100),
    cognome VARCHAR(100),
    telefono VARCHAR(50),
    ruolo VARCHAR(50) DEFAULT 'admin',
    workspace_id UUID REFERENCES workspace(id) ON DELETE SET NULL,
    ruoli TEXT[] DEFAULT ARRAY['admin'],
    squadre_accesso UUID[] DEFAULT ARRAY[]::UUID[],
    is_superadmin BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Crea indice su email per performance login
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_workspace ON users(workspace_id);

-- 2. Crea superadmin
DO $$
DECLARE
    password_hash TEXT;
    user_id UUID;
BEGIN
    -- Genera hash bcrypt per la password 'raffaele78'
    password_hash := crypt('raffaele78', gen_salt('bf'));
    
    -- Verifica se esiste già
    IF EXISTS (SELECT 1 FROM users WHERE email = 'coppola.raffaele@gmail.com') THEN
        -- Aggiorna se esiste
        UPDATE users SET 
            password_hash = password_hash,
            nome = 'Raffaele',
            cognome = 'Coppola',
            ruolo = 'admin',
            ruoli = ARRAY['admin', 'allenatore', 'staff'],
            is_superadmin = true,
            is_active = true
        WHERE email = 'coppola.raffaele@gmail.com';
        RAISE NOTICE 'Utente aggiornato: coppola.raffaele@gmail.com';
    ELSE
        -- Crea nuovo superadmin
        INSERT INTO users (
            id, email, password_hash, nome, cognome, ruolo,
            workspace_id, ruoli, squadre_accesso, is_superadmin, is_active, created_at
        ) VALUES (
            gen_random_uuid(),
            'coppola.raffaele@gmail.com',
            password_hash,
            'Raffaele',
            'Coppola',
            'admin',
            '00000000-0000-0000-0000-000000000001',
            ARRAY['admin', 'allenatore', 'staff'],
            ARRAY[]::UUID[],
            true,
            true,
            NOW()
        )
        RETURNING id INTO user_id;
        RAISE NOTICE 'Superadmin creato! ID: %', user_id;
    END IF;
END $$;

-- ============================================================
-- UTENTI TEST (DF Academy + ACP Annex)
-- ============================================================

DO $$
DECLARE
    password_hash TEXT;
    ws_df UUID;
    ws_acp UUID;
BEGIN
    -- Recupera workspace_ids
    SELECT id INTO ws_df FROM workspace WHERE nome ILIKE '%df academy%' LIMIT 1;
    SELECT id INTO ws_acp FROM workspace WHERE nome ILIKE '%acp annex%' OR nome ILIKE '%annex%' LIMIT 1;
    
    RAISE NOTICE 'DF Academy workspace: %', ws_df;
    RAISE NOTICE 'ACP Annex workspace: %', ws_acp;
    
    -- Matteo Urilli - Allenatore DF Academy (password: mister)
    password_hash := crypt('mister', gen_salt('bf'));
    IF ws_df IS NOT NULL THEN
        INSERT INTO users (id, email, password_hash, nome, cognome, ruolo, workspace_id, ruoli, is_superadmin, is_active)
        VALUES (gen_random_uuid(), 'matteo@urilli.it', password_hash, 'Matteo', 'Urilli', 'allenatore', ws_df, ARRAY['allenatore'], false, true)
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, ruolo = 'allenatore', workspace_id = ws_df;
        RAISE NOTICE 'Utente creato: matteo@urilli.it (Allenatore DF Academy)';
    ELSE
        INSERT INTO users (id, email, password_hash, nome, cognome, ruolo, workspace_id, ruoli, is_superadmin, is_active)
        VALUES (gen_random_uuid(), 'matteo@urilli.it', password_hash, 'Matteo', 'Urilli', 'allenatore', '00000000-0000-0000-0000-000000000001', ARRAY['allenatore'], false, true)
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, ruolo = 'allenatore';
        RAISE NOTICE 'Utente creato: matteo@urilli.it (Allenatore - workspace non trovato, usato demo)';
    END IF;
    
    -- Francesco Annese - Admin ACP Annex (password: annex)
    password_hash := crypt('annex', gen_salt('bf'));
    IF ws_acp IS NOT NULL THEN
        INSERT INTO users (id, email, password_hash, nome, cognome, ruolo, workspace_id, ruoli, is_superadmin, is_active)
        VALUES (gen_random_uuid(), 'francesco@annese.it', password_hash, 'Francesco', 'Annese', 'admin', ws_acp, ARRAY['admin'], false, true)
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, ruolo = 'admin', workspace_id = ws_acp;
        RAISE NOTICE 'Utente creato: francesco@annese.it (Admin ACP Annex)';
    ELSE
        INSERT INTO users (id, email, password_hash, nome, cognome, ruolo, workspace_id, ruoli, is_superadmin, is_active)
        VALUES (gen_random_uuid(), 'francesco@annese.it', password_hash, 'Francesco', 'Annese', 'admin', '00000000-0000-0000-0000-000000000001', ARRAY['admin'], false, true)
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, ruolo = 'admin';
        RAISE NOTICE 'Utente creato: francesco@annese.it (Admin - workspace non trovato, usato demo)';
    END IF;
END $$;

-- Verifica tutti gli utenti
SELECT id, email, nome, cognome, ruolo, workspace_id, is_superadmin, is_active 
FROM users
ORDER BY created_at;