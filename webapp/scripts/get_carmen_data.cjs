const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function inspect() {
  const { data, error } = await supabase
    .from('bitacoras')
    .select('*')
    .ilike('user_name', '%carmen%')
    .gte('fecha', '2026-08-01')
    .lte('fecha', '2026-09-30')
    .order('fecha', { ascending: true });
    
  if (error) {
    console.error('Error fetching bitacoras:', error);
    return;
  }
  
  console.log(`Encontradas ${data.length} bitácoras para Carmen en Agosto y Septiembre 2026:\n`);
  data.forEach((b, idx) => {
    let actSummary = '';
    try {
      const acts = typeof b.actuaciones === 'string' ? JSON.parse(b.actuaciones) : b.actuaciones;
      if (Array.isArray(acts) && acts.length > 0) {
        actSummary = acts.map(a => a.actuacion || a.titulo || a.descripcion || JSON.stringify(a)).join('; ');
      }
    } catch(e) {}

    console.log(`[${idx + 1}] Fecha: ${b.fecha} | Entrada: ${b.hora_entrada || 'N/R'} | Salida: ${b.hora_salida || 'N/R'} | Estado: ${b.estado} | Supervisado por: ${b.supervisado_por || 'N/A'}`);
    if (b.ubicacion_entrada || b.ubicacion_salida) {
      console.log(`    Ubicación Entrada: ${b.ubicacion_entrada || 'N/A'} | Ubicación Salida: ${b.ubicacion_salida || 'N/A'}`);
    }
    if (actSummary) {
      console.log(`    Actuaciones (${actSummary.length > 100 ? actSummary.slice(0, 100) + '...' : actSummary})`);
    }
  });
}

inspect();
