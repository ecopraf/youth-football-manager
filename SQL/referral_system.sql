-- =====================================================
-- SISTEMA REFERRAL - Youth Football Manager
-- =====================================================

-- 1. Aggiungi campo referral_code alla tabella workspace
ALTER TABLE workspace ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE workspace ADD COLUMN IF NOT EXISTS referral_active BOOLEAN DEFAULT false;
ALTER TABLE workspace ADD COLUMN IF NOT EXISTS referral_commission DECIMAL(5,2) DEFAULT 20.00;

-- 2. Tabella per tracciare i referral
CREATE TABLE IF NOT EXISTS referral_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code TEXT NOT NULL,
    utente_id UUID REFERENCES utente(id),
    workspace_id UUID REFERENCES workspace(id),
    tipo TEXT DEFAULT 'registrazione',
    commissione DECIMAL(10,2),
    stato TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_referral_code ON referral_log(referral_code);
CREATE INDEX IF NOT EXISTS idx_stato ON referral_log(stato);

-- 3. Tabella partner (per partner esterni)
CREATE TABLE IF NOT EXISTS partner (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    codice TEXT UNIQUE NOT NULL,
    commissione DECIMAL(5,2) DEFAULT 20.00,
    attivo BOOLEAN DEFAULT true,
    logo_url TEXT,
    website TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Lista referral completa
CREATE TABLE IF NOT EXISTS referral (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partner(id),
    workspace_id UUID REFERENCES workspace(id),
    utente_id UUID REFERENCES utente(id),
    tipo TEXT DEFAULT 'registrazione',
    prezzo_pieno DECIMAL(10,2) DEFAULT 250.00,
    commissione_partner DECIMAL(10,2) DEFAULT 50.00,
    stato TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_partner_id ON referral(partner_id);
CREATE INDEX IF NOT EXISTS idx_referral_stato ON referral(stato);

COMMENT ON TABLE referral IS 'Tracciamento referral da partner';
COMMENT ON TABLE partner IS 'Partner commerciali (Gazzetta, Tuttocampo, etc.)';
