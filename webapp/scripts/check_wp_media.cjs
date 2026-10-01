async function checkMore() {
  for (let page = 1; page <= 3; page++) {
    try {
      const res = await fetch('https://romanydelgado.com/wp-json/wp/v2/media?per_page=100&page=' + page);
      if (res.ok) {
        const data = await res.json();
        console.log('Page ' + page + ' items: ' + data.length);
        const docs = data.filter(m => m.mime_type.includes('pdf') || m.mime_type.includes('document') || m.source_url.includes('WhatsApp') || m.source_url.includes('Notificacion') || m.source_url.includes('Courier') || m.source_url.includes('Luis') || m.source_url.includes('Carmen') || m.source_url.includes('Victor'));
        docs.forEach(d => console.log('[P' + page + '] ' + d.date + ' | ' + d.source_url + ' | ' + (d.title?.rendered || '')));
      }
    } catch (e) {
      console.log('Err page ' + page + ': ' + e.message);
    }
  }
}
checkMore();
