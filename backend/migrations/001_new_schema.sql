-- ============================================================
-- YOUTH FOOTBALL MANAGER - NUOVO SCHEMA DB
-- Versione: 1.1 - 2026-06-27
-- 
-- STAGIONE 2025/26 - ANNI DI NASCITA:
-- U14 = nati 2012
-- U15 = nati 2011
-- U16 = nati 2010
-- U17 = nati 2009
-- U18 = nati 2008
-- U19 = nati 2007
-- Juniores = nati 2007-2008
-- Primavera = nati 2005-2006
-- ============================================================

-- 1. DROP TABELLE VECCHIE
DROP TABLE IF EXISTS rosa CASCADE;
DROP TABLE IF EXISTS partita CASCADE;
DROP TABLE IF EXISTS evento_partita CASCADE;
DROP TABLE IF EXISTS allenamento CASCADE;
DROP TABLE IF EXISTS presenza_allenamento CASCADE;
DROP TABLE IF EXISTS formazione_partita CASCADE;
DROP TABLE IF EXISTS configurazione_allenamento CASCADE;

-- 2. CREA TABELLE NUOVE

-- CATEGORY
CREATE TABLE category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    tipo_campionato VARCHAR(50) DEFAULT 'Regionale',
    anno_da INTEGER NOT NULL,
    anno_a INTEGER NOT NULL,
    genere VARCHAR(10) DEFAULT 'M',
    descrizione TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON COLUMN category.tipo_campionato IS 'Provinciale, Regionale, Elite, Pro';

-- COMPETITION
CREATE TABLE competition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(200) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'Campionato',
    federazione VARCHAR(100),
    regione VARCHAR(100),
    logo_url TEXT,
    descrizione TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- FACILITY
CREATE TABLE facility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(200) NOT NULL,
    indirizzo TEXT,
    citta VARCHAR(100),
    capienza INTEGER,
    superficie VARCHAR(50),
    tipo VARCHAR(50),
    illuminazione BOOLEAN DEFAULT false,
    servizi TEXT[],
    coordinate_gps JSONB,
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- STAFF
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    data_nascita DATE,
    sesso VARCHAR(1) DEFAULT 'M',
    foto_url TEXT,
    telefono VARCHAR(50),
    email VARCHAR(255),
    ruolo VARCHAR(50) NOT NULL,
    qualifiche JSONB DEFAULT '{}',
    documento JSONB DEFAULT '{}',
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- TEAM
CREATE TABLE team (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES stagione(id) ON DELETE CASCADE,
    category_id UUID REFERENCES category(id),
    nome VARCHAR(100) NOT NULL,
    colori_casa VARCHAR(50),
    colori_trasferta VARCHAR(50),
    venue_id UUID REFERENCES facility(id),
    allenatore_id UUID REFERENCES staff(id),
    dirigente_id UUID REFERENCES staff(id),
    preparatore_id UUID REFERENCES staff(id),
    portieri_id UUID REFERENCES staff(id),
    matricola_figc VARCHAR(100),
    iscritta_competizione UUID REFERENCES competition(id),
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- TEAM_PLAYER
CREATE TABLE team_player (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES calciatore(id) ON DELETE RESTRICT,
    numero_maglia INTEGER,
    ruolo_preferito VARCHAR(50),
    stato VARCHAR(50) DEFAULT 'Attivo',
    data_assegnazione DATE DEFAULT CURRENT_DATE,
    data_cessione DATE,
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, player_id)
);

-- TEAM_STAFF
CREATE TABLE team_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
    ruolo_squadra VARCHAR(100) NOT NULL,
    data_assegnazione DATE DEFAULT CURRENT_DATE,
    data_cessione DATE,
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, staff_id, ruolo_squadra)
);

-- MATCH
CREATE TABLE match (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE,
    competition_id UUID REFERENCES competition(id),
    venue_id UUID REFERENCES facility(id),
    data_ora TIMESTAMP NOT NULL,
    avversario VARCHAR(200) NOT NULL,
    luogo VARCHAR(20) DEFAULT 'Casa',
    giornata INTEGER,
    gol_casa INTEGER DEFAULT 0,
    gol_ospite INTEGER DEFAULT 0,
    stato VARCHAR(30) DEFAULT 'Da disputare',
    archiviat BOOLEAN DEFAULT false,
    note TEXT,
    note_avversario TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- MATCH_EVENT
CREATE TABLE match_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES match(id) ON DELETE CASCADE,
    tipo_evento VARCHAR(50) NOT NULL,
    minuto INTEGER,
    player_id UUID REFERENCES calciatore(id),
    player_id_secondario UUID REFERENCES calciatore(id),
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- MATCH_FORMATION
CREATE TABLE match_formation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES match(id) ON DELETE CASCADE,
    team_player_id UUID NOT NULL REFERENCES team_player(id) ON DELETE CASCADE,
    posizione VARCHAR(50),
    numero_maglia INTEGER,
    is_captain BOOLEAN DEFAULT false,
    is_vice_captain BOOLEAN DEFAULT false,
    is_starter BOOLEAN DEFAULT true,
    ordine INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- CONVOCATION
CREATE TABLE convocation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES match(id) ON DELETE CASCADE,
    team_player_id UUID NOT NULL REFERENCES team_player(id) ON DELETE CASCADE,
    convocato_da UUID REFERENCES staff(id),
    convocato_il DATE DEFAULT CURRENT_DATE,
    confermato BOOLEAN,
    presente BOOLEAN,
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(match_id, team_player_id)
);

-- TRAINING
CREATE TABLE training (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES facility(id),
    data_ora TIMESTAMP NOT NULL,
    durata_minuti INTEGER DEFAULT 90,
    tipo VARCHAR(50),
    descrizione TEXT,
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- TRAINING_ATTENDANCE
CREATE TABLE training_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_id UUID NOT NULL REFERENCES training(id) ON DELETE CASCADE,
    team_player_id UUID NOT NULL REFERENCES team_player(id) ON DELETE CASCADE,
    presente BOOLEAN DEFAULT false,
    motivi_assenza TEXT,
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(training_id, team_player_id)
);

-- MATCH_STATISTICS
CREATE TABLE match_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES match(id) ON DELETE CASCADE,
    team_player_id UUID NOT NULL REFERENCES team_player(id) ON DELETE CASCADE,
    minuti_giocati INTEGER DEFAULT 0,
    gol INTEGER DEFAULT 0,
    assist INTEGER DEFAULT 0,
    tiri INTEGER DEFAULT 0,
    tiri_in_porta INTEGER DEFAULT 0,
    passaggi INTEGER DEFAULT 0,
    passaggi_riusciti INTEGER DEFAULT 0,
    palloni_recuperati INTEGER DEFAULT 0,
    falli_subiti INTEGER DEFAULT 0,
    falli_commessi INTEGER DEFAULT 0,
    ammonizioni INTEGER DEFAULT 0,
    espulsioni INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(match_id, team_player_id)
);

-- DOCUMENT
CREATE TABLE document (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(50) NOT NULL,
    entita_tipo VARCHAR(50) NOT NULL,
    entita_id UUID NOT NULL,
    file_url TEXT NOT NULL,
    nome_file VARCHAR(255),
    mime_type VARCHAR(100),
    dimensione INTEGER,
    data_upload TIMESTAMP DEFAULT NOW(),
    scadenza DATE,
    note TEXT
);

-- 3. MODIFICA TABELLE ESISTENTI
ALTER TABLE stagione ADD COLUMN IF NOT EXISTS attiva BOOLEAN DEFAULT false;
ALTER TABLE stagione ADD COLUMN IF NOT EXISTS data_inizio DATE;
ALTER TABLE stagione ADD COLUMN IF NOT EXISTS data_fine DATE;
ALTER TABLE stagione ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

ALTER TABLE calciatore ADD COLUMN IF NOT EXISTS sesso VARCHAR(1) DEFAULT 'M';
ALTER TABLE calciatore ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 4. SEED DATA - CATEGORIE (Stagione 2025/26)
-- Anni di nascita: U14 = nati 2012, U15 = nati 2011, U16 = nati 2010, U17 = nati 2009, U18 = nati 2008, U19 = nati 2007/2006
-- Tipo campionato: Provinciale, Regionale, Elite, Pro

INSERT INTO category (id, nome, tipo_campionato, anno_da, anno_a, descrizione) VALUES
    ('c0000001-0000-0000-0000-000000000001', 'Under 14 Provinciale', 'Provinciale', 2012, 2012, 'Ragazzi nati nel 2012'),
    ('c0000002-0000-0000-0000-000000000002', 'Under 14 Regionale', 'Regionale', 2012, 2012, 'Ragazzi nati nel 2012'),
    ('c0000003-0000-0000-0000-000000000003', 'Under 14 Elite', 'Elite', 2012, 2012, 'Ragazzi nati nel 2012'),
    ('c0000004-0000-0000-0000-000000000004', 'Under 15 Provinciale', 'Provinciale', 2011, 2011, 'Ragazzi nati nel 2011'),
    ('c0000005-0000-0000-0000-000000000005', 'Under 15 Regionale', 'Regionale', 2011, 2011, 'Ragazzi nati nel 2011'),
    ('c0000006-0000-0000-0000-000000000006', 'Under 15 Elite', 'Elite', 2011, 2011, 'Ragazzi nati nel 2011'),
    ('c0000007-0000-0000-0000-000000000007', 'Under 16 Provinciale', 'Provinciale', 2010, 2010, 'Ragazzi nati nel 2010'),
    ('c0000008-0000-0000-0000-000000000008', 'Under 16 Regionale', 'Regionale', 2010, 2010, 'Ragazzi nati nel 2010'),
    ('c0000009-0000-0000-0000-000000000009', 'Under 16 Elite', 'Elite', 2010, 2010, 'Ragazzi nati nel 2010'),
    ('c0000010-0000-0000-0000-000000000010', 'Under 17 Provinciale', 'Provinciale', 2009, 2009, 'Ragazzi nati nel 2009'),
    ('c0000011-0000-0000-0000-000000000011', 'Under 17 Regionale', 'Regionale', 2009, 2009, 'Ragazzi nati nel 2009'),
    ('c0000012-0000-0000-0000-000000000012', 'Under 17 Elite', 'Elite', 2009, 2009, 'Ragazzi nati nel 2009'),
    ('c0000013-0000-0000-0000-000000000013', 'Under 18 Provinciale', 'Provinciale', 2008, 2008, 'Ragazzi nati nel 2008'),
    ('c0000014-0000-0000-0000-000000000014', 'Under 18 Regionale', 'Regionale', 2008, 2008, 'Ragazzi nati nel 2008'),
    ('c0000015-0000-0000-0000-000000000015', 'Under 19 Regionale', 'Regionale', 2007, 2007, 'Ragazzi nati nel 2007'),
    ('c0000016-0000-0000-0000-000000000016', 'Under 19 Pro', 'Pro', 2006, 2006, 'Ragazzi nati nel 2006'),
    ('c0000017-0000-0000-0000-000000000017', 'Juniores Provinciale', 'Provinciale', 2007, 2008, 'Giovani 2007-2008'),
    ('c0000018-0000-0000-0000-000000000018', 'Juniores Regionale', 'Regionale', 2007, 2008, 'Giovani 2007-2008'),
    ('c0000019-0000-0000-0000-000000000019', 'Primavera', 'Regionale', 2005, 2006, 'Giovani calciatori 2005-2006');

-- SEED DATA - COMPETIZIONI
INSERT INTO competition (id, nome, tipo, regione, descrizione) VALUES
    ('cc000001-0000-0000-0000-000000000001', 'Campionato Regionale Lazio', 'Campionato', 'Lazio', 'Campionato regionale FIGC'),
    ('cc000002-0000-0000-0000-000000000002', 'Coppa Lazio', 'Coppa', 'Lazio', 'Coppa regionale FIGC'),
    ('cc000003-0000-0000-0000-000000000003', 'Campionato Nazionale U19', 'Campionato', 'Nazionale', 'Campionato federale under 19'),
    ('cc000004-0000-0000-0000-000000000004', 'Torneo Friendlies', 'Amichevole', NULL, 'Partite amichevoli');

-- 5. INDICI
CREATE INDEX IF NOT EXISTS idx_category_tipo ON category(tipo_campionato);
CREATE INDEX IF NOT EXISTS idx_category_anni ON category(anno_da, anno_a);
CREATE INDEX IF NOT EXISTS idx_team_season ON team(season_id);
CREATE INDEX IF NOT EXISTS idx_team_category ON team(category_id);
CREATE INDEX IF NOT EXISTS idx_team_player_team ON team_player(team_id);
CREATE INDEX IF NOT EXISTS idx_team_player_player ON team_player(player_id);
CREATE INDEX IF NOT EXISTS idx_team_staff_team ON team_staff(team_id);
CREATE INDEX IF NOT EXISTS idx_team_staff_staff ON team_staff(staff_id);
CREATE INDEX IF NOT EXISTS idx_match_team ON match(team_id);
CREATE INDEX IF NOT EXISTS idx_match_data_ora ON match(data_ora);
CREATE INDEX IF NOT EXISTS idx_match_event_match ON match_event(match_id);
CREATE INDEX IF NOT EXISTS idx_convocation_match ON convocation(match_id);
CREATE INDEX IF NOT EXISTS idx_training_team ON training(team_id);
