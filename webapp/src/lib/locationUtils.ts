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

  // 2. Cortar en el primer paréntesis o corchete (remueve "(🌐 Red IP...", "(🛰️ GPS...", "(Ø<ß...", "(Red IP)", etc.)
  if (str.includes('(')) {
    str = str.split('(')[0].trim();
  }
  if (str.includes('[')) {
    str = str.split('[')[0].trim();
  }

  // 3. Cortar si tiene separadores de guión largo o medio con notas añadidas (" — Red IP", " - CANTV")
  if (str.includes(' — ')) {
    str = str.split(' — ')[0].trim();
  }
  if (str.includes(' - ')) {
    str = str.split(' - ')[0].trim();
  }

  // 4. Normalizar "Valencia, Estado Carabobo" -> "Valencia, Carabobo"
  str = str.replace(/,\s*Estado\s+/i, ', ');
  str = str.replace(/^Estado\s+/i, '');

  // 5. Eliminar cualquier carácter no imprimible o emojis que dañan fuentes Helvetica en PDF
  str = str.replace(/[^\w\s,.-áéíóúÁÉÍÓÚñÑ]/g, '').trim();

  // 6. Si solo quedó "Valencia", agregar estado por formalidad
  if (str.toLowerCase() === 'valencia' || str.toLowerCase() === 'valencia,') {
    return 'Valencia, Carabobo';
  }

  // 7. Si después de limpiar quedó solo números/coordenadas, "venezuela" o vacío, fallback a sede principal
  if (!str || /^[\d.,\s-]+$/.test(str) || str.toLowerCase() === 'venezuela') {
    return 'Valencia, Carabobo';
  }

  return str;
}
