const fs = require('fs');

async function catalogAllMedia() {
  let allMedia = [];
  for (let page = 1; page <= 5; page++) {
    try {
      const res = await fetch(`https://romanydelgado.com/wp-json/wp/v2/media?per_page=100&page=${page}&order=desc&orderby=date`);
      if (!res.ok) break;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;
      allMedia = allMedia.concat(data);
    } catch (e) {
      break;
    }
  }

  console.log('Total media fetched:', allMedia.length);

  // Filter out system theme assets, plugin icons, headers, backgrounds, etc.
  const relevantDocs = allMedia.filter(m => {
    const url = m.source_url.toLowerCase();
    const title = (m.title?.rendered || '').toLowerCase();
    const mime = m.mime_type || '';

    // Ignore elementor assets, web logos, icons
    if (url.includes('elementor') || url.includes('cropped-') || url.includes('logo-dorado') || url.includes('logo-blanco') || url.includes('logo_chase')) {
      return false;
    }
    if (url.includes('dog_logo') || url.includes('hero.png') || url.includes('photo_2026-04-21')) {
      return false;
    }

    // Include PDFs, documents, CamScanners, Informes, WhatsApp images of paperwork, etc.
    if (mime.includes('pdf') || mime.includes('document') || mime.includes('video/mp4')) return true;
    if (url.includes('camscanner') || url.includes('informe') || url.includes('notificacion') || url.includes('courier') || url.includes('poder') || url.includes('sentencia') || url.includes('ejercicio')) return true;
    if (url.includes('whatsapp') || url.includes('img_') || url.includes('imagen')) return true;
    if (title.includes('informe') || title.includes('poder') || title.includes('notificacion') || title.includes('carta') || title.includes('tesis') || title.includes('tesina')) return true;

    return false;
  });

  console.log('Total relevant attachments:', relevantDocs.length);

  const catalog = relevantDocs.map(m => {
    const url = m.source_url;
    const title = m.title?.rendered || url.split('/').pop();
    const date = m.date ? m.date.split('T')[0] : '2026-07-01';
    const mime = m.mime_type || 'application/pdf';

    // Infer author
    let author = 'Carmen Luisa';
    const lower = (url + ' ' + title).toLowerCase();
    if (lower.includes('luis') || lower.includes('ejercicio unilateral')) {
      author = 'Luis Delgado';
    } else if (lower.includes('victor') || lower.includes('tesina') || lower.includes('tesis')) {
      author = 'Víctor Román';
    } else if (lower.includes('oscar')) {
      author = 'oscarpc20';
    } else if (lower.includes('mariela')) {
      author = 'Mariela Isabel';
    } else if (lower.includes('hector')) {
      author = 'Héctor';
    } else if (date >= '2026-08-01' && date <= '2026-09-30' && (lower.includes('agua blanca') || lower.includes('informe') || lower.includes('ipostel') || lower.includes('courier') || lower.includes('copias'))) {
      author = 'Carmen Luisa';
    }

    return {
      id: `wp-media-${m.id}`,
      name: title.replace(/&#8211;/g, '-').replace(/&amp;/g, '&'),
      url: url,
      type: mime,
      author: author,
      date: date,
      category: 'evidencia',
      note: m.caption?.rendered ? m.caption.rendered.replace(/<[^>]*>/g, '').trim() : ''
    };
  });

  fs.writeFileSync('src/components/expedientes/historicalAttachmentsData.ts', `// Archivos y evidencias adjuntas históricas cargadas por el personal (Carmen, Luis, Víctor, etc.)
export interface HistoricalAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  author: string;
  date: string;
  category: 'evidencia';
  note?: string;
  expediente?: string;
}

export const HISTORICAL_ATTACHMENTS: HistoricalAttachment[] = ${JSON.stringify(catalog, null, 2)};
`);

  console.log('Saved catalog with', catalog.length, 'historical files!');
}

catalogAllMedia();
