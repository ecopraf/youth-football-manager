/**
 * Admin routes — migrazioni schema DB
 */
const express = require('express');

function createAdminRouter({ supabase, authMiddleware }) {
  const router = express.Router();

  // POST /api/admin/migrate-new-schema
  router.post('/api/admin/migrate-new-schema', authMiddleware, async (req, res) => {
    try {
      if (!req.user?.is_superadmin && req.user?.ruolo !== 'superadmin') {
        return res.status(403).json({ error: 'Solo superadmin può eseguire migrazioni' });
      }

      const results = { tables_created: [], seed_data: [], errors: [] };

      const migrations = [
        { name: 'category', sql: `CREATE TABLE IF NOT EXISTS category (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nome VARCHAR(100) NOT NULL, anno_da INTEGER NOT NULL, anno_a INTEGER NOT NULL, genere VARCHAR(10) DEFAULT 'M', descrizione TEXT, created_at TIMESTAMP DEFAULT NOW())` },
        { name: 'competition', sql: `CREATE TABLE IF NOT EXISTS competition (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nome VARCHAR(200) NOT NULL, tipo VARCHAR(50) DEFAULT 'Campionato', federazione VARCHAR(100), regione VARCHAR(100), logo_url TEXT, descrizione TEXT, created_at TIMESTAMP DEFAULT NOW())` },
        { name: 'facility', sql: `CREATE TABLE IF NOT EXISTS facility (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nome VARCHAR(200) NOT NULL, indirizzo TEXT, citta VARCHAR(100), capienza INTEGER, superficie VARCHAR(50), tipo VARCHAR(50), illuminazione BOOLEAN DEFAULT false, servizi TEXT[], coordinate_gps JSONB, note TEXT, created_at TIMESTAMP DEFAULT NOW())` },
        { name: 'staff', sql: `CREATE TABLE IF NOT EXISTS staff (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nome VARCHAR(100) NOT NULL, cognome VARCHAR(100) NOT NULL, data_nascita DATE, sesso VARCHAR(1) DEFAULT 'M', foto_url TEXT, telefono VARCHAR(50), email VARCHAR(255), ruolo VARCHAR(50) NOT NULL, qualifiche JSONB DEFAULT '{}', documento JSONB DEFAULT '{}', note TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())` },
        { name: 'team', sql: `CREATE TABLE IF NOT EXISTS team (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), season_id UUID NOT NULL, category_id UUID, nome VARCHAR(100) NOT NULL, colori_casa VARCHAR(50), colori_trasferta VARCHAR(50), venue_id UUID, allenatore_id UUID, dirigente_id UUID, preparatore_id UUID, portieri_id UUID, matricola_figc VARCHAR(100), iscritta_competizione UUID, note TEXT, created_at TIMESTAMP DEFAULT NOW())` },
        { name: 'team_player', sql: `CREATE TABLE IF NOT EXISTS team_player (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), team_id UUID NOT NULL, player_id UUID NOT NULL, numero_maglia INTEGER, ruolo_preferito VARCHAR(50), stato VARCHAR(50) DEFAULT 'Attivo', data_assegnazione DATE DEFAULT CURRENT_DATE, data_cessione DATE, note TEXT, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(team_id, player_id))` },
        { name: 'team_staff', sql: `CREATE TABLE IF NOT EXISTS team_staff (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), team_id UUID NOT NULL, staff_id UUID NOT NULL, ruolo_squadra VARCHAR(100) NOT NULL, data_assegnazione DATE DEFAULT CURRENT_DATE, data_cessione DATE, note TEXT, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(team_id, staff_id, ruolo_squadra))` },
        { name: 'match', sql: `CREATE TABLE IF NOT EXISTS match (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), team_id UUID NOT NULL, competition_id UUID, venue_id UUID, data_ora TIMESTAMP NOT NULL, avversario VARCHAR(200) NOT NULL, luogo VARCHAR(20) DEFAULT 'Casa', giornata INTEGER, gol_casa INTEGER DEFAULT 0, gol_ospite INTEGER DEFAULT 0, stato VARCHAR(30) DEFAULT 'Da disputare', archiviat BOOLEAN DEFAULT false, note TEXT, note_avversario TEXT, created_at TIMESTAMP DEFAULT NOW())` },
        { name: 'match_event', sql: `CREATE TABLE IF NOT EXISTS match_event (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), match_id UUID NOT NULL, tipo_evento VARCHAR(50) NOT NULL, minuto INTEGER, player_id UUID, player_id_secondario UUID, note TEXT, created_at TIMESTAMP DEFAULT NOW())` },
        { name: 'match_formation', sql: `CREATE TABLE IF NOT EXISTS match_formation (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), match_id UUID NOT NULL, team_player_id UUID NOT NULL, posizione VARCHAR(50), numero_maglia INTEGER, is_captain BOOLEAN DEFAULT false, is_vice_captain BOOLEAN DEFAULT false, is_starter BOOLEAN DEFAULT true, ordine INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW())` },
        { name: 'convocation', sql: `CREATE TABLE IF NOT EXISTS convocation (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), match_id UUID NOT NULL, team_player_id UUID NOT NULL, convocato_da UUID, convocato_il DATE DEFAULT CURRENT_DATE, confermato BOOLEAN, presente BOOLEAN, note TEXT, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(match_id, team_player_id))` },
        { name: 'training', sql: `CREATE TABLE IF NOT EXISTS training (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), team_id UUID NOT NULL, venue_id UUID, data_ora TIMESTAMP NOT NULL, durata_minuti INTEGER DEFAULT 90, tipo VARCHAR(50), descrizione TEXT, note TEXT, created_at TIMESTAMP DEFAULT NOW())` },
        { name: 'training_attendance', sql: `CREATE TABLE IF NOT EXISTS training_attendance (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), training_id UUID NOT NULL, team_player_id UUID NOT NULL, presente BOOLEAN DEFAULT false, motivi_assenza TEXT, note TEXT, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(training_id, team_player_id))` },
        { name: 'match_statistics', sql: `CREATE TABLE IF NOT EXISTS match_statistics (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), match_id UUID NOT NULL, team_player_id UUID NOT NULL, minuti_giocati INTEGER DEFAULT 0, gol INTEGER DEFAULT 0, assist INTEGER DEFAULT 0, tiri INTEGER DEFAULT 0, tiri_in_porta INTEGER DEFAULT 0, passaggi INTEGER DEFAULT 0, passaggi_riusciti INTEGER DEFAULT 0, palloni_recuperati INTEGER DEFAULT 0, falli_subiti INTEGER DEFAULT 0, falli_commessi INTEGER DEFAULT 0, ammonizioni INTEGER DEFAULT 0, espulsioni INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(match_id, team_player_id))` },
        { name: 'document', sql: `CREATE TABLE IF NOT EXISTS document (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tipo VARCHAR(50) NOT NULL, entita_tipo VARCHAR(50) NOT NULL, entita_id UUID NOT NULL, file_url TEXT NOT NULL, nome_file VARCHAR(255), mime_type VARCHAR(100), dimensione INTEGER, data_upload TIMESTAMP DEFAULT NOW(), scadenza DATE, note TEXT)` }
      ];

      for (const m of migrations) {
        try {
          await supabase.rpc('exec_sql', { sql: m.sql });
          results.tables_created.push(m.name);
        } catch (e) { if (!e.message.includes('already exists')) results.errors.push(m.name + ': ' + e.message); }
      }

      // Alter tables
      try {
        await supabase.rpc('exec_sql', { sql: `ALTER TABLE stagione ADD COLUMN IF NOT EXISTS attiva BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS data_inizio DATE, ADD COLUMN IF NOT EXISTS data_fine DATE, ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false` });
        results.tables_created.push('stagione (columns)');
      } catch (e) { results.errors.push('stagione columns: ' + e.message); }

      try {
        await supabase.rpc('exec_sql', { sql: `ALTER TABLE calciatore ADD COLUMN IF NOT EXISTS sesso VARCHAR(1) DEFAULT 'M', ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()` });
        results.tables_created.push('calciatore (columns)');
      } catch (e) { results.errors.push('calciatore columns: ' + e.message); }

      // Seed categories
      try {
        await supabase.rpc('exec_sql', { sql: `INSERT INTO category (id, nome, anno_da, anno_a, descrizione) VALUES 
          ('c0000001-0000-0000-0000-000000000001', 'Under 14', 2011, 2012, 'Ragazzi nati 2011-2012'),
          ('c0000002-0000-0000-0000-000000000002', 'Under 15', 2010, 2011, 'Ragazzi nati 2010-2011'),
          ('c0000003-0000-0000-0000-000000000003', 'Under 16', 2009, 2010, 'Ragazzi nati 2009-2010'),
          ('c0000004-0000-0000-0000-000000000004', 'Under 17', 2008, 2009, 'Ragazzi nati 2008-2009'),
          ('c0000005-0000-0000-0000-000000000005', 'Under 18', 2007, 2008, 'Ragazzi nati 2007-2008'),
          ('c0000006-0000-0000-0000-000000000006', 'Primavera', 2005, 2006, 'Giovani calciatori')
          ON CONFLICT (id) DO NOTHING` });
        results.seed_data.push('categories');
      } catch (e) { results.errors.push('categories seed: ' + e.message); }

      // Seed competitions
      try {
        await supabase.rpc('exec_sql', { sql: `INSERT INTO competition (id, nome, tipo, regione, descrizione) VALUES 
          ('cc000001-0000-0000-0000-000000000001', 'Campionato Regionale Lazio', 'Campionato', 'Lazio', 'Campionato regionale FIGC'),
          ('cc000002-0000-0000-0000-000000000002', 'Coppa Lazio', 'Coppa', 'Lazio', 'Coppa regionale FIGC'),
          ('cc000003-0000-0000-0000-000000000003', 'Campionato Nazionale U19', 'Campionato', 'Nazionale', 'Campionato federale under 19'),
          ('cc000004-0000-0000-0000-000000000004', 'Torneo Friendlies', 'Amichevole', NULL, 'Partite amichevoli')
          ON CONFLICT (id) DO NOTHING` });
        results.seed_data.push('competitions');
      } catch (e) { results.errors.push('competitions seed: ' + e.message); }

      res.json({ success: true, results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createAdminRouter;
