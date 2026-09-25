const { createClient } = require('./node_modules/@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function runAudit() {
  console.log('====================================================');
  console.log('🔍 AUDITORÍA INTEGRAL DE BASE DE DATOS Y STORAGE');
  console.log('====================================================\n');

  // 1. Tablas y recuento
  const tables = [
    'profiles', 
    'bitacoras', 
    'bitacora_drafts', 
    'expedientes', 
    'investigaciones_kant', 
    'gastos', 
    'chat_messages'
  ];

  console.log('--- RECUENTO DE REGISTROS POR TABLA ---');
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ ${t}: ERROR -> ${error.message} (código ${error.code})`);
    } else {
      console.log(`✅ ${t}: ${count} registros`);
    }
  }

  // 2. Muestreo de datos e integridad
  console.log('\n--- VERIFICACIÓN DE INTEGRIDAD DE DATOS ---');
  
  // Perfiles
  const { data: profiles } = await supabase.from('profiles').select('id, email, full_name, role');
  console.log(`👥 Perfiles de usuario (${profiles ? profiles.length : 0}):`);
  (profiles || []).forEach(p => console.log(`   - ${p.full_name} (${p.email}) [Rol: ${p.role}]`));

  // Bitácoras
  const { data: bitacoras } = await supabase.from('bitacoras').select('id, user, fecha, estado, pdf_url').limit(5);
  console.log(`\n📋 Muestra de bitácoras (${bitacoras ? bitacoras.length : 0} analizadas):`);
  (bitacoras || []).forEach(b => console.log(`   - ID: ${b.id} | Usuario: ${b.user} | Fecha: ${b.fecha} | Estado: ${b.estado} | PDF: ${b.pdf_url ? 'CDN OK' : 'Sin PDF'}`));

  // Expedientes
  const { data: expedientes } = await supabase.from('expedientes').select('id, numero, cliente, estado').limit(5);
  console.log(`\n📁 Muestra de expedientes (${expedientes ? expedientes.length : 0} analizados):`);
  (expedientes || []).forEach(e => console.log(`   - ${e.numero}: ${e.cliente} [${e.estado}]`));

  // Gastos
  const { data: gastos } = await supabase.from('gastos').select('id, user_name, total_usd, estado, semana').limit(5);
  console.log(`\n💰 Muestra de relaciones de gastos (${gastos ? gastos.length : 0} analizadas):`);
  (gastos || []).forEach(g => console.log(`   - Semana ${g.semana}: ${g.user_name} | $${g.total_usd} [${g.estado}]`));

  // Chat
  const { data: chat } = await supabase.from('chat_messages').select('id, sender_name, recipient_name, mensaje, created_at').order('created_at', { ascending: false }).limit(5);
  console.log(`\n💬 Mensajes de chat recientes (${chat ? chat.length : 0}):`);
  (chat || []).forEach(c => console.log(`   - [${c.created_at}] ${c.sender_name} -> ${c.recipient_name}: "${c.mensaje}"`));

  // 3. Storage Buckets
  console.log('\n--- VERIFICACIÓN DE STORAGE BUCKETS ---');
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) {
    console.log(`❌ Error al listar buckets: ${bErr.message}`);
  } else {
    for (const b of buckets) {
      const { data: files, error: fErr } = await supabase.storage.from(b.id).list('', { limit: 50 });
      console.log(`📦 Bucket '${b.name}' (id: ${b.id}, public: ${b.public}):`);
      if (fErr) {
        console.log(`   ⚠️ Error listando archivos: ${fErr.message}`);
      } else {
        console.log(`   Contiene ${files ? files.length : 0} elementos raíz:`);
        (files || []).slice(0, 5).forEach(f => console.log(`     - ${f.name} (${f.metadata ? f.metadata.size : 'dir'} bytes)`));
      }
    }
  }

  // 4. Verificación de políticas RLS y operaciones CRUD
  console.log('\n--- TEST DE OPERACIONES CRUD (PERMISOS ANON / WEBAPP) ---');
  
  // Test Read
  const { error: rErr } = await supabase.from('profiles').select('id').limit(1);
  console.log(`- Lectura (SELECT): ${rErr ? '❌ Falló: ' + rErr.message : '✅ Exitoso'}`);

  // Test Insert + Delete en chat_messages (temporal)
  const testId = '44444444-5555-6666-7777-888888888888';
  const { error: iErr } = await supabase.from('chat_messages').insert({
    id: testId,
    sender_name: 'auditor_test',
    recipient_name: 'jefatura',
    mensaje: 'test auditoria'
  });
  console.log(`- Inserción (INSERT): ${iErr ? '❌ Falló: ' + iErr.message : '✅ Exitoso'}`);

  const { error: dErr } = await supabase.from('chat_messages').delete().eq('id', testId);
  console.log(`- Eliminación (DELETE): ${dErr ? '❌ Falló: ' + dErr.message : '✅ Exitoso'}`);

  console.log('\n====================================================');
  console.log('✅ AUDITORÍA COMPLETADA');
  console.log('====================================================');
}

runAudit();
