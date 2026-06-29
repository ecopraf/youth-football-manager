const supabase = require('../db/supabase');

// Helper functions per badge e dettagli competizione
function determineTipoEvento(competizione) {
  if (!competizione) return 'amichevole';
  const c = competizione.toLowerCase();
  if (c.includes('coppa') || c.includes('cop')) return 'coppa';
  if (c.includes('torneo') || c.includes('torn')) return 'torneo';
  if (c.includes('amichev') || c.includes('amic')) return 'amichevole';
  return 'campionato';
}

function determineDettaglio(competizione, giornata) {
  if (!competizione) return '-';
  const c = competizione.toLowerCase();
  
  if (c.includes('coppa') || c.includes('cop')) {
    // Per coppa, ritorna il turno se presente (es. QF, SF, F)
    if (giornata && isNaN(parseInt(giornata))) return String(giornata);
    return '-';
  }
  if (c.includes('torneo') || c.includes('torn')) {
    // Per torneo, mostra giornata o "-"
    return giornata ? 'G.' + giornata : '-';
  }
  // Per campionato, mostra sempre G.XX
  return 'G.' + String(giornata || '-');
}

// Genera colore stabile per avversario basato su hash
function generateBadgeColor(avversario) {
  if (!avversario) return '#888888';
  
  // Colori predefiniti per club comuni
  const clubColors = {
    'inter': '#0068A8',
    'inter academy': '#0068A8',
    'inter youth': '#0068A8',
    'milan': '#FF0000',
    'milan academy': '#FF0000',
    'milan junior': '#FF0000',
    'juventus': '#000000',
    'juventus academy': '#000000',
    'juventus youth': '#000000',
    'roma': '#8E0015',
    'roma academy': '#8E0015',
    'lazio': '#87D8F7',
    'lazio youth': '#87D8F7',
    'napoli': '#12A0D7',
    'napoli youth': '#12A0D7',
    'atalanta': '#1E71B8',
    'atalanta academy': '#1E71B8',
    'fiorentina': '#482E92',
    'fiorentina academy': '#482E92'
  };
  
  const normalized = avversario.toLowerCase().trim();
  if (clubColors[normalized]) return clubColors[normalized];
  
  // Genera colore hash stabile per club non riconosciuti
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#3498DB', '#E74C3C', '#9B59B6', '#1ABC9C', 
    '#F39C12', '#2ECC71', '#E91E63', '#00BCD4',
    '#8BC34A', '#FF5722', '#607D8B', '#795548'
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

const teamController = {
  // GET /api/squadre - Lista tutte le squadre
  getAll: async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('team')
        .select('*')
        .order('nome');
      
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      
      res.json(data || []);
    } catch (err) {
      console.error('Get teams error:', err);
      res.status(500).json({ error: 'Errore server' });
    }
  },

  // GET /api/squadre/:id - Dettaglio squadra
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('team')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !data) {
        return res.status(404).json({ error: 'Squadra non trovata' });
      }
      
      res.json(data);
    } catch (err) {
      console.error('Get team error:', err);
      res.status(500).json({ error: 'Errore server' });
    }
  },

  // PUT /api/squadre/:id - Aggiorna squadra
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const { data, error } = await supabase
        .from('team')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      
      res.json({ success: true, data });
    } catch (err) {
      console.error('Update team error:', err);
      res.status(500).json({ error: 'Errore server' });
    }
  },

  // DELETE /api/squadre/:id - Elimina squadra
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Elimina prima tutti i dati dipendenti
      const { data: partite } = await supabase.from('match').select('id').eq('team_id', id);
      for (const p of (partite || [])) {
        await supabase.from('match_formation').delete().eq('match_id', p.id);
        await supabase.from('convocation').delete().eq('match_id', p.id);
        await supabase.from('match_event').delete().eq('match_id', p.id);
        await supabase.from('match_statistics').delete().eq('match_id', p.id);
      }
      await supabase.from('match').delete().eq('team_id', id);
      
      await supabase.from('training_attendance').delete().in('training_id', 
        (await supabase.from('training').select('id').eq('team_id', id)).data?.map(t => t.id) || []
      );
      await supabase.from('training').delete().eq('team_id', id);
      await supabase.from('team_player').delete().eq('team_id', id);
      await supabase.from('team_staff').delete().eq('team_id', id);
      await supabase.from('team').delete().eq('id', id);
      
      res.json({ success: true });
    } catch (err) {
      console.error('Delete team error:', err);
      res.status(500).json({ error: 'Errore server' });
    }
  },

  // GET /api/squadre/:id/calciatori - Lista giocatori rosa
  getPlayers: async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('team_player')
        .select('player:player_id(*), numero_maglia, ruolo_preferito, stato, is_primary')
        .eq('team_id', id);
      
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      
      const players = (data || []).map(r => ({
        id: r.player.id,
        nome: r.player.nome,
        cognome: r.player.cognome,
        data_nascita: r.player.data_nascita,
        telefono: r.player.telefono,
        email: r.player.email,
        ruolo_principale: r.player.ruolo_principale,
        numero_maglia: r.numero_maglia,
        ruolo_preferito: r.ruolo_preferito,
        stato: r.stato,
        is_primary: r.is_primary
      }));
      
      res.json(players);
    } catch (err) {
      console.error('Get players error:', err);
      res.status(500).json({ error: 'Errore server' });
    }
  },

  // POST /api/squadre/:id/calciatori - Aggiungi giocatore
  addPlayer: async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, cognome, numeroMaglia, ruolo, telefono } = req.body;
      
      // Crea giocatore
      const { data: cal, error: err1 } = await supabase
        .from('player')
        .insert({
          nome,
          cognome,
          telefono,
          ruolo_principale: ruolo
        })
        .select()
        .single();
      
      if (err1) {
        return res.status(400).json({ error: err1.message });
      }
      
      // Aggiungi alla rosa
      await supabase.from('team_player').insert({
        team_id: id,
        player_id: cal.id,
        numero_maglia: numeroMaglia,
        ruolo_preferito: ruolo,
        stato: 'Attivo',
        is_primary: true
      });
      
      res.status(201).json(cal);
    } catch (err) {
      console.error('Add player error:', err);
      res.status(500).json({ error: 'Errore server' });
    }
  },

  // GET /api/squadre/:id/partite - Lista partite
  getMatches: async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('match')
        .select('*')
        .eq('team_id', id)
        .order('data_ora', { ascending: false });
      
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      
      res.json(data || []);
    } catch (err) {
      console.error('Get matches error:', err);
      res.status(500).json({ error: 'Errore server' });
    }
  },

  // GET /api/squadre/:id/partite-future - Prossime partite
  getUpcomingMatches: async (req, res) => {
    try {
      const { id } = req.params;
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('match')
        .select('*')
        .eq('team_id', id)
        .gte('data_ora', now)
        .order('data_ora', { ascending: true })
        .limit(5);
      
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      
      res.json(data || []);
    } catch (err) {
      console.error('Get upcoming matches error:', err);
      res.status(500).json({ error: 'Errore server' });
    }
  },

  // POST /api/squadre/:id/partite - Crea partita
  createMatch: async (req, res) => {
    try {
      const { id } = req.params;
      const { avversario, luogo, competition_id, giornata, dataOra } = req.body;
      
      const { data, error } = await supabase
        .from('match')
        .insert({
          team_id: id,
          data_ora: dataOra,
          avversario,
          luogo,
          competition_id,
          giornata
        })
        .select()
        .single();
      
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(201).json(data);
    } catch (err) {
      console.error('Create match error:', err);
      res.status(500).json({ error: 'Errore server' });
    }
  },

  // GET /api/squadre/:id/scadenze-mediche - Scadenze certificati (nota: player non ha piu data_visita_medica)
  getMedicalExpirations: async (req, res) => {
    try {
      const { id } = req.params;
      // Questa funzionalita richiederebbe una tabella document o campi aggiuntivi
      res.json([]);
    } catch (err) {
      console.error('Get medical expirations error:', err);
      res.status(500).json({ error: 'Errore server' });
    }
  },

  // GET /api/squadre/:id/statistiche-complete - Statistiche complete
  getStatistics: async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data: partite } = await supabase
        .from('match')
        .select('*')
        .eq('team_id', id);
      
      const giocate = (partite || []).filter(p => p.stato === 'Terminata');
      const vinte = giocate.filter(p => {
        if (p.luogo === 'Casa') return p.gol_casa > p.gol_ospite;
        return p.gol_ospite > p.gol_casa;
      });
      const pareggiate = giocate.filter(p => p.gol_casa === p.gol_ospite);
      const perse = giocate.filter(p => {
        if (p.luogo === 'Casa') return p.gol_casa < p.gol_ospite;
        return p.gol_ospite < p.gol_casa;
      });
      
      const golFatti = giocate.reduce((sum, p) => sum + (p.luogo === 'Casa' ? p.gol_casa : p.gol_ospite), 0);
      const golSubiti = giocate.reduce((sum, p) => sum + (p.luogo === 'Casa' ? p.gol_ospite : p.gol_casa), 0);
      
      // Calcola tipo_evento, dettaglio_competizione e badge_avversario per ogni partita
      const risultati = giocate.map(p => {
        const tipoEvento = determineTipoEvento(p.competizione);
        const dettaglioCompetizione = determineDettaglio(p.competizione, p.giornata);
        const badgeAvversario = generateBadgeColor(p.avversario);
        
        return {
          id: p.id,
          avversario: p.avversario,
          luogo: p.luogo,
          dataOra: p.data_ora,
          golFatti: p.luogo === 'Casa' ? p.gol_casa : p.gol_ospite,
          golSubiti: p.luogo === 'Casa' ? p.gol_ospite : p.gol_casa,
          giornata: p.giornata,
          competizione: p.competizione,
          tipoEvento,
          dettaglioCompetizione,
          badgeAvversario
        };
      }).sort((a, b) => new Date(b.dataOra) - new Date(a.dataOra));
      
      res.json({
        partiteTotali: partite?.length || 0,
        partiteGiocate: giocate.length,
        vittorie: vinte.length,
        pareggi: pareggiate.length,
        sconfitte: perse.length,
        golFatti,
        golSubiti,
        differenzaReti: golFatti - golSubiti,
        punti: vinte.length * 3 + pareggiate.length,
        risultati
      });
    } catch (err) {
      console.error('Get statistics error:', err);
      res.status(500).json({ error: 'Errore server' });
    }
  },

  // GET /api/squadre/:id/top-players - Top marcatori
  getTopPlayers: async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data: partite } = await supabase
        .from('match')
        .select('id')
        .eq('team_id', id);
      
      const ids = (partite || []).map(p => p.id);
      if (ids.length === 0) {
        return res.json({ marcatori: [], assistmen: [], presenze: [] });
      }
      
      const { data: eventi } = await supabase
        .from('match_event')
        .select('tipo_evento, player_id, player_id_secondario, minuto')
        .in('match_id', ids);
      
      const stats = {};
      (eventi || []).forEach(e => {
        if (!stats[e.player_id]) {
          stats[e.player_id] = { gol: 0, assist: 0, presenze: 0 };
        }
        stats[e.player_id].presenze++;
        if (e.tipo_evento === 'Gol') {
          stats[e.player_id].gol++;
        }
        if (e.tipo_evento === 'Gol' && e.player_id_secondario) {
          if (!stats[e.player_id_secondario]) {
            stats[e.player_id_secondario] = { gol: 0, assist: 0, presenze: 0 };
          }
          stats[e.player_id_secondario].assist++;
        }
      });
      
      const { data: rosa } = await supabase
        .from('team_player')
        .select('player:player_id(id, nome, cognome)')
        .eq('team_id', id);
      
      const nomi = {};
      (rosa || []).forEach(r => {
        nomi[r.player.id] = r.player.nome + ' ' + r.player.cognome;
      });
      
      const result = Object.entries(stats).map(([id, s]) => ({ id, nome: nomi[id] || id, ...s }));
      
      res.json({
        marcatori: result.filter(x => x.gol > 0).sort((a, b) => b.gol - a.gol).slice(0, 5),
        assistmen: result.filter(x => x.assist > 0).sort((a, b) => b.assist - a.assist).slice(0, 5),
        presenze: result.filter(x => x.presenze > 0).sort((a, b) => b.presenze - a.presenze).slice(0, 5)
      });
    } catch (err) {
      console.error('Get top players error:', err);
      res.status(500).json({ error: 'Errore server' });
    }
  }
};

module.exports = teamController;
