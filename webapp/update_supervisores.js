import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.substring(0, idx).trim(), l.substring(idx + 1).trim()];
    })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log('Iniciando actualización de supervisores en Supabase...');

  // 1. Julio -> Luis Delgado
  const julyDates = ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-26', '2026-07-28', '2026-07-30'];
  const { data: d1, error: e1 } = await supabase
    .from('bitacoras')
    .update({ supervisado_por: 'Luis Delgado' })
    .in('fecha', julyDates)
    .select('id, fecha, supervisado_por');
  if (e1) console.error('Error Julio:', e1.message);
  else console.log('Actualizadas bitácoras de Julio a Luis Delgado:', d1?.length);

  // 2. 9 de Agosto -> Víctor Román
  const { data: d2, error: e2 } = await supabase
    .from('bitacoras')
    .update({ supervisado_por: 'Víctor Román' })
    .eq('fecha', '2026-08-09')
    .select('id, fecha, supervisado_por');
  if (e2) console.error('Error 2026-08-09:', e2.message);
  else console.log('Actualizada bitácora 2026-08-09 a Víctor Román:', d2?.length);

  // 3. Agosto Luis Delgado
  const augLuis = ['2026-08-08', '2026-08-10', '2026-08-12', '2026-08-15', '2026-08-16', '2026-08-23'];
  const { data: d3, error: e3 } = await supabase
    .from('bitacoras')
    .update({ supervisado_por: 'Luis Delgado' })
    .in('fecha', augLuis)
    .select('id, fecha, supervisado_por');
  if (e3) console.error('Error Agosto Luis:', e3.message);
  else console.log('Actualizadas bitácoras de Agosto a Luis Delgado:', d3?.length);

  // 4. Víctor Román
  const augVictor = ['2026-08-02', '2026-08-03', '2026-09-20'];
  const { data: d4, error: e4 } = await supabase
    .from('bitacoras')
    .update({ supervisado_por: 'Víctor Román' })
    .in('fecha', augVictor)
    .select('id, fecha, supervisado_por');
  if (e4) console.error('Error Víctor:', e4.message);
  else console.log('Actualizadas bitácoras a Víctor Román:', d4?.length);

  console.log('¡Supervisores sincronizados exitosamente!');
}

run().catch(console.error);
