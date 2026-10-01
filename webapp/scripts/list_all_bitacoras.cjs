const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function check() {
  const { data: bitacoras } = await supabase.from('bitacoras').select('id, user_name, fecha, evidences, actuaciones, created_at').order('fecha', { ascending: false });
  console.log('--- ALL 35 BITACORAS ---');
  bitacoras.forEach(b => {
    let acts = b.actuaciones;
    if (typeof acts === 'string') {
      try { acts = JSON.parse(acts); } catch(e) {}
    }
    const actCount = Array.isArray(acts) ? acts.length : 0;
    console.log(b.fecha + ' | ' + b.user_name + ' | Acts: ' + actCount + ' | Evidences: ' + JSON.stringify(b.evidences || []) + ' | Created: ' + b.created_at);
  });
}
check();
