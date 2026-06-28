-- Migration 008: Add training attendance tables
-- This adds tables for managing training sessions and player attendance

-- Tabella configurazione allenamenti (piano settimanale)
CREATE TABLE IF NOT EXISTS allenamento_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE,
    giorno_settimana INTEGER NOT NULL CHECK (giorno_settimana BETWEEN 0 AND 6),
    ora_inizio TIME NOT NULL,
    ora_fine TIME NOT NULL,
    luogo VARCHAR(200),
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, giorno_settimana)
);

-- Indici per allenamento_config
CREATE INDEX IF NOT EXISTS idx_allenamento_config_team ON allenamento_config(team_id);
CREATE INDEX IF NOT EXISTS idx_allenamento_config_giorno ON allenamento_config(giorno_settimana);

-- Tabella presenze allenamento (per ogni sessione di allenamento)
CREATE TABLE IF NOT EXISTS presenza_allenamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE,
    calciatore_id UUID NOT NULL REFERENCES calciatore(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    presente BOOLEAN DEFAULT true,
    motivo_assenza VARCHAR(100),
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, calciatore_id, data)
);

-- Indici per presenza_allenamento
CREATE INDEX IF NOT EXISTS idx_presenza_team ON presenza_allenamento(team_id);
CREATE INDEX IF NOT EXISTS idx_presenza_calciatore ON presenza_allenamento(calciatore_id);
CREATE INDEX IF NOT EXISTS idx_presenza_data ON presenza_allenamento(data);

-- Commenti sulle tabelle
COMMENT ON TABLE allenamento_config IS 'Configurazione settimanale degli allenamenti (giorni e orari)';
COMMENT ON TABLE presenza_allenamento IS 'Presenze dei giocatori agli allenamenti con motivo assenza';
COMMENT ON COLUMN presenza_allenamento.motivo_assenza IS 'Motivo assenza: Impegni Scolastici, Motivi Familiari, Infortunio, Malattia, o NULL se non specificato';