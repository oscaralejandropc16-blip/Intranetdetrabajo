/**
 * Utilidades para procesamiento y formato de ubicaciones geográficas
 * Román & Delgado | Abogados - Sistema KANT
 */

/**
 * Limpia y formatea la cadena de ubicación para documentos PDF oficiales.
 * Elimina coordenadas GPS, notas técnicas de red (NetUno, CANTV, Red IP, etc.),
 * márgenes de error satelital y caracteres especiales/emojis no soportados por jsPDF,
 * garantizando que solo se imprima un texto limpio, sobrio y conciso (ej: "Valencia, Carabobo").
 */
export function cleanLocationForPdf(rawLoc?: string | null): string {
  if (!rawLoc || typeof rawLoc !== 'string') {
    return 'Valencia, Carabobo';
  }

  let str = rawLoc.trim();

  // Si está vacío, N/A, N/R o en estado transitorio
  if (
    !str ||
    str === 'N/A' ||
    str === 'N/R' ||
    str.toLowerCase().includes('detectando') ||
    str.toLowerCase().includes('obteniendo') ||
    str.toLowerCase().includes('sin gps') ||
    str.toLowerCase().includes('no disponible')
  ) {
    return 'Valencia, Carabobo';
  }

  // 1. Extraer ciudad si viene en formato compuesto (coordenadas|||nombre_lugar)
  if (str.includes('|||')) {
    const parts = str.split('|||');
    str = (parts[1] && parts[1].trim()) ? parts[1].trim() : parts[0].trim();
  }

  // 2. Si detectamos la ciudad en cualquier parte de la cadena, devolver el formato oficial estricto
  const lower = str.toLowerCase();
  if (lower.includes('valencia')) {
    return 'Valencia, Carabobo';
  }
  if (lower.includes('caracas')) {
    return 'Caracas, Distrito Capital';
  }
  if (lower.includes('maracay')) {
    return 'Maracay, Aragua';
  }
  if (lower.includes('barquisimeto')) {
    return 'Barquisimeto, Lara';
  }
  if (lower.includes('maracaibo')) {
    return 'Maracaibo, Zulia';
  }
  if (lower.includes('puerto la cruz')) {
    return 'Puerto La Cruz, Anzoátegui';
  }

  // 3. Cortar en el primer paréntesis o corchete (remueve "(🌐 Red IP...", "(🛰️ GPS...", etc.)
  if (str.includes('(')) {
    str = str.split('(')[0].trim();
  }
  if (str.includes('[')) {
    str = str.split('[')[0].trim();
  }

  // 4. Cortar si contiene términos técnicos de red
  const techKeywords = ['red ip', 'netuno', 'cantv', 'permiso', 'bloqueado', 'satelital', 'verificado', 'wifi', 'wi-fi', 'wlan', 'gps'];
  for (const kw of techKeywords) {
    const idx = str.toLowerCase().indexOf(kw);
    if (idx !== -1) {
      str = str.substring(0, idx).trim();
    }
  }

  // 5. Cortar si tiene separadores de guión largo o medio
  if (str.includes(' — ')) {
    str = str.split(' — ')[0].trim();
  }
  if (str.includes(' - ')) {
    str = str.split(' - ')[0].trim();
  }

  // 6. Normalizar y eliminar cualquier carácter no imprimible
  str = str.replace(/,\s*Estado\s+/i, ', ');
  str = str.replace(/^Estado\s+/i, '');
  str = str.replace(/[^\w\s,.-áéíóúÁÉÍÓÚñÑ]/g, '').trim();
  str = str.replace(/[,\s-]+$/, '').trim();

  // 7. Si después de limpiar quedó solo números/coordenadas, "venezuela" o vacío, fallback
  if (!str || /^[\d.,\s-]+$/.test(str) || str.toLowerCase() === 'venezuela') {
    return 'Valencia, Carabobo';
  }

  return str;
}
