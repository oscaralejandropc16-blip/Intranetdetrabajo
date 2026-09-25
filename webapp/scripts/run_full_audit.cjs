const { createClient } = require('./node_modules/@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function fullAudit() {
  const report = {
    timestamp: new Date().toISOString(),
    database: {},
    storage: {},
    security: {},
    performance: {},
    dataIntegrity: {}
  };

  console.log('======================================================================');
  console.log(' 🛡️  AUDITORÍA INTEGRAL DEL SISTEMA KANT — SUPABASE POSTGRESQL & WEBAPP');
  console.log('======================================================================\n');

  // -----------------------------------------------------------
  // 1. AUDITORÍA DE TABLAS Y RECUENTO DE DATOS
  // -----------------------------------------------------------
  const tables = [
    'profiles', 
    'bitacoras', 
    'bitacora_drafts', 
    'expedientes', 
    'investigaciones_kant', 
    'gastos', 
    'chat_messages'
  ];

  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      report.database[t] = { status: 'ERROR', error: error.message };
    } else {
      // Tomar una fila para ver estructura y columnas
      const { data: sample } = await supabase.from(t).select('*').limit(1);
      report.database[t] = {
        status: 'OK',
        rowCount: count,
        columns: sample && sample[0] ? Object.keys(sample[0]) : []
      };
    }
  }

  // -----------------------------------------------------------
  // 2. AUDITORÍA DE INTEGRIDAD DE DATOS ESPECÍFICOS
  // -----------------------------------------------------------
  // Profiles
  const { data: profiles } = await supabase.from('profiles').select('id, email, full_name, role');
  report.dataIntegrity.profiles = {
    total: profiles ? profiles.length : 0,
    roles: profiles ? profiles.map(p => ({ name: p.full_name, role: p.role, email: p.email })) : []
  };

  // Bitacoras
  const { data: bitacoras } = await supabase.from('bitacoras').select('id, user_name, fecha, estado, pdf_url, pdf_base64');
  let bitacorasConPdfCdn = 0;
  let bitacorasConBase64 = 0;
  (bitacoras || []).forEach(b => {
    if (b.pdf_url && b.pdf_url.startsWith('http')) bitacorasConPdfCdn++;
    if (b.pdf_base64 && b.pdf_base64.length > 500) bitacorasConBase64++;
  });
  report.dataIntegrity.bitacoras = {
    total: bitacoras ? bitacoras.length : 0,
    conPdfCdn: bitacorasConPdfCdn,
    conBase64Legacy: bitacorasConBase64,
    estados: (bitacoras || []).reduce((acc, b) => {
      acc[b.estado || 'sin_estado'] = (acc[b.estado || 'sin_estado'] || 0) + 1;
      return acc;
    }, {})
  };

  // Expedientes
  const { data: expedientes } = await supabase.from('expedientes').select('id, numero, cliente, estado');
  report.dataIntegrity.expedientes = {
    total: expedientes ? expedientes.length : 0,
    estados: (expedientes || []).reduce((acc, e) => {
      acc[e.estado || 'sin_estado'] = (acc[e.estado || 'sin_estado'] || 0) + 1;
      return acc;
    }, {})
  };

  // Gastos
  const { data: gastos } = await supabase.from('gastos').select('id, empleado_nombre, total_usd, total_ves, estado, items');
  let totalUsdSum = 0;
  (gastos || []).forEach(g => {
    totalUsdSum += parseFloat(g.total_usd) || 0;
  });
  report.dataIntegrity.gastos = {
    total: gastos ? gastos.length : 0,
    montoAcumuladoUsd: totalUsdSum.toFixed(2),
    estados: (gastos || []).reduce((acc, g) => {
      acc[g.estado || 'sin_estado'] = (acc[g.estado || 'sin_estado'] || 0) + 1;
      return acc;
    }, {})
  };

  // Chat Messages
  const { data: chatMsgs } = await supabase.from('chat_messages').select('id, sender_name, recipient_name, mensaje, created_at').order('created_at', { ascending: false });
  report.dataIntegrity.chat = {
    total: chatMsgs ? chatMsgs.length : 0,
    muestraReciente: (chatMsgs || []).slice(0, 5).map(m => ({
      id: m.id,
      from: m.sender_name,
      to: m.recipient_name,
      text: m.mensaje,
      date: m.created_at
    }))
  };

  // -----------------------------------------------------------
  // 3. AUDITORÍA DE STORAGE BUCKETS Y ARCHIVOS
  // -----------------------------------------------------------
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) {
    report.storage.error = bErr.message;
  } else {
    report.storage.buckets = [];
    for (const b of buckets) {
      const { data: files } = await supabase.storage.from(b.id).list('', { limit: 100 });
      let totalBytes = 0;
      (files || []).forEach(f => {
        if (f.metadata && f.metadata.size) totalBytes += f.metadata.size;
      });
      report.storage.buckets.push({
        id: b.id,
        name: b.name,
        public: b.public,
        fileCount: files ? files.length : 0,
        approxSizeKB: (totalBytes / 1024).toFixed(1)
      });
    }
  }

  // -----------------------------------------------------------
  // 4. TEST DE SEGURIDAD Y PERMISOS CRUD (RLS)
  // -----------------------------------------------------------
  // Lectura anónima
  const { data: testRead, error: readErr } = await supabase.from('profiles').select('id').limit(1);
  report.security.anonRead = !readErr;

  // Inserción / Eliminación de prueba con UUID
  const auditUuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const { error: insErr } = await supabase.from('chat_messages').insert({
    id: auditUuid,
    sender_name: 'auditor',
    recipient_name: 'sistema',
    mensaje: 'test_auditoria_sistema'
  });
  report.security.anonInsert = !insErr;

  const { error: delErr } = await supabase.from('chat_messages').delete().eq('id', auditUuid);
  report.security.anonDelete = !delErr;

  console.log(JSON.stringify(report, null, 2));
}

fullAudit();
