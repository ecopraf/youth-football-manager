/**
 * Supabase Client condiviso
 * Usato dai moduli route per accesso al database
 */
const { createClient } = require('@supabase/supabase-js');
const http = require('http');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ Missing Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  global: {
    fetch: (url, options) => {
      const agent = new http.Agent({ keepAlive: true, timeout: 60000 });
      return fetch(url, { ...options, agent });
    }
  }
});

module.exports = supabase;
