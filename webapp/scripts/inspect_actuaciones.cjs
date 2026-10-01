const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function check() {
  const { data: bitacoras } = await supabase.from('bitacoras').select('*');
  console.log('--- INSPECTING ACTUACIONES FOR ATTACHMENT MENTIONS ---');
  let count = 0;
  (bitacoras || []).forEach(b => {
    let acts = b.actuaciones;
    if (typeof acts === 'string') {
      try { acts = JSON.parse(acts); } catch(e) {}
    }
    if (Array.isArray(acts) && acts.length > 0) {
      acts.forEach(a => {
        const text = JSON.stringify(a).toLowerCase();
        if (text.includes('adjunt') || text.includes('anexo') || text.includes('pdf') || text.includes('escrito') || text.includes('oficio') || text.includes('copia') || text.includes('soporte') || text.includes('archivo') || text.includes('document')) {
          console.log('[' + b.fecha + ' - ' + b.user_name + '] Actuacion: ' + (a.numeroAsunto || a.expediente || '') + ' | ' + (a.actuacion || a.resumen || ''));
          count++;
        }
      });
    }
  });
  console.log('Total mentions of documents/adjuntos in actuaciones:', count);
}
check();
