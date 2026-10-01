const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uimuiqebgdettgmaebhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpbXVpcWViZ2RldHRnbWFlYmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNDU4MDQsImV4cCI6MjEwNTkyMTgwNH0.Ewq0nlX3THfBsltkqrScG-2Lb6ONskvZ_n_rh9mnREg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('=== 1. BUCKETS ===');
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  console.log('Buckets:', buckets?.map(b => b.name), bErr);

  console.log('\n=== 2. STORAGE FILES IN EVIDENCIAS BUCKET ===');
  const { data: rootFiles } = await supabase.storage.from('evidencias').list('', { limit: 100 });
  console.log('Root files in evidencias:', rootFiles);

  const { data: subEvidencias } = await supabase.storage.from('evidencias').list('evidencias', { limit: 100 });
  console.log('In evidencias/evidencias:', subEvidencias);

  for (const f of (rootFiles || [])) {
    if (f.id === null) { // Folder
      const { data: folderFiles } = await supabase.storage.from('evidencias').list(f.name, { limit: 100 });
      console.log(`In evidencias/${f.name}:`, folderFiles?.length, 'files');
      if (folderFiles && folderFiles.length > 0 && f.name !== 'pdfs') {
        console.log(`Files in ${f.name}:`, folderFiles);
      }
    }
  }

  console.log('\n=== 3. ALL OTHER BUCKETS FILES ===');
  for (const b of (buckets || [])) {
    if (b.name !== 'evidencias') {
      const { data: files } = await supabase.storage.from(b.name).list('', { limit: 100 });
      console.log(`Bucket ${b.name}:`, files);
    }
  }

  console.log('\n=== 4. BITACORAS TABLE INSPECTION ===');
  const { data: bitacoras } = await supabase.from('bitacoras').select('*').limit(200);
  console.log('Total bitacoras rows:', bitacoras?.length);

  bitacoras.forEach(b => {
    let hasEv = false;
    let evVal = b.evidences;
    if (Array.isArray(evVal) && evVal.length > 0) hasEv = true;
    else if (typeof evVal === 'string' && evVal !== '[]' && evVal.length > 2) hasEv = true;

    // Check attached_files or other columns
    let attVal = b.attached_files || b.attachedFiles;
    if (attVal && (Array.isArray(attVal) ? attVal.length > 0 : attVal.length > 2)) hasEv = true;

    // Check if actuaciones contain attachments
    let acts = b.actuaciones;
    if (typeof acts === 'string') {
      try { acts = JSON.parse(acts); } catch(e) {}
    }
    let actsWithAtt = 0;
    if (Array.isArray(acts)) {
      acts.forEach(a => {
        if (a.adjunto || a.attachment || a.archivo || a.documento || a.evidencia || (a.observaciones && a.observaciones.includes('http'))) {
          actsWithAtt++;
        }
      });
    }

    if (hasEv || actsWithAtt > 0) {
      console.log(`Row ${b.id} | User: ${b.user_name} | Date: ${b.fecha} | Evidences:`, b.evidences, '| Acts with att:', actsWithAtt);
    }
  });

  console.log('\n=== 5. CHECK OTHER SUPABASE TABLES ===');
  // Check chat_messages for attachments
  const { data: chatMsgs } = await supabase.from('chat_messages').select('*').not('adjunto_url', 'is', null);
  console.log('Chat messages with attachment:', chatMsgs?.length);
  chatMsgs?.forEach(m => console.log('Chat file:', m.sender_name, m.adjunto_url));

  // Check expedientes for documents
  const { data: expRows } = await supabase.from('expedientes').select('*');
  let expDocs = 0;
  expRows?.forEach(exp => {
    const d = exp.documentos || exp.anexos || exp.archivos;
    if (d && (Array.isArray(d) ? d.length > 0 : d.length > 2)) {
      expDocs++;
      console.log('Expediente doc:', exp.numero_expediente || exp.titulo, d);
    }
  });
  console.log('Expedientes with docs:', expDocs);
}

run();
