export const config = {
  runtime: 'edge',
};

export function validateWpUploadUrl(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || '').trim());
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'romanydelgado.com') {
      return null;
    }
    if (!parsed.pathname.startsWith('/wp-content/uploads/')) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export default async function handler(req) {
  const reqUrl = new URL(req.url);
  const safeUrl = validateWpUploadUrl(reqUrl.searchParams.get('url'));
  if (!safeUrl) {
    return new Response('URL no permitida para previsualización.', { status: 403 });
  }

  try {
    const upstream = await fetch(safeUrl);
    if (!upstream.ok) {
      return new Response('No se pudo cargar el documento remoto.', { status: upstream.status });
    }
    const headers = new Headers();
    headers.set('Content-Type', upstream.headers.get('content-type') || 'application/pdf');
    headers.set('Content-Disposition', 'inline');
    headers.set('Cache-Control', 'public, max-age=86400');
    return new Response(upstream.body, { status: 200, headers });
  } catch {
    return new Response('Error obteniendo documento.', { status: 502 });
  }
}
