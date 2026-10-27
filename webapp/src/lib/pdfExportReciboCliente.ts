import jsPDF from 'jspdf';
import type { ReciboCliente } from '../types/recibos';

// Función para precargar y redimensionar el logo oficial
let cachedLogoBase64: string | null = null;
async function getLogoBase64(): Promise<string | null> {
  if (cachedLogoBase64) return cachedLogoBase64;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 110;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 160, 110);
          cachedLogoBase64 = canvas.toDataURL('image/png', 0.85);
          resolve(cachedLogoBase64);
          return;
        }
      } catch (e) {
        console.warn('No se pudo procesar el logo para el recibo:', e);
      }
      resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = '/logo.png';
  });
}

function formatMonto(monto?: number, moneda: string = 'USD'): string {
  if (monto === undefined || monto === null) return '0,00';
  const formatted = monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return moneda === 'USD' ? `$ ${formatted}` : `Bs. ${formatted}`;
}

// Convertidor básico de números a letras para montos en dólares o bolívares
function numeroALetras(monto: number, moneda: 'USD' | 'VES'): string {
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  const entero = Math.floor(monto);
  const centavos = Math.round((monto - entero) * 100);

  let textoEntero = '';
  if (entero === 0) {
    textoEntero = 'CERO';
  } else if (entero === 100) {
    textoEntero = 'CIEN';
  } else if (entero < 10) {
    textoEntero = unidades[entero];
  } else if (entero < 20) {
    textoEntero = especiales[entero - 10];
  } else if (entero < 100) {
    const d = Math.floor(entero / 10);
    const u = entero % 10;
    textoEntero = u === 0 ? decenas[d] : `${decenas[d]} Y ${unidades[u]}`;
  } else if (entero < 1000) {
    const c = Math.floor(entero / 100);
    const resto = entero % 100;
    if (resto === 0) {
      textoEntero = c === 1 ? 'CIEN' : centenas[c];
    } else {
      textoEntero = `${centenas[c]} ${numeroALetras(resto, moneda).split(' ')[0]}`;
    }
  } else {
    textoEntero = entero.toString();
  }

  const sufijoMoneda = moneda === 'USD' 
    ? 'DÓLARES DE LOS ESTADOS UNIDOS DE AMÉRICA' 
    : 'BOLÍVARES';

  const centavosTexto = centavos > 0 ? ` CON ${centavos}/100` : ' CON 00/100';

  return `${textoEntero}${centavosTexto} ${sufijoMoneda}`;
}

export async function generarReciboClienteBlob(recibo: ReciboCliente): Promise<{ blob: Blob; fileName: string }> {
  // Formato media carta (Half Letter: 139.7 x 215.9 mm) o carta completa con 2 talones (Original y Duplicado)
  const doc = new jsPDF({ format: 'letter', unit: 'mm', compress: true });
  const pageWidth = doc.internal.pageSize.getWidth(); // 215.9 mm
  const marginX = 14;
  const contentWidth = pageWidth - (marginX * 2);
  const logoBase64 = await getLogoBase64();

  // Función para dibujar un talón (Original arriba, Duplicado abajo para archivo del cliente)
  const drawVoucher = (startY: number, isCopy: boolean) => {
    let currentY = startY;

    // Borde exterior elegante tipo talonario bancario/legal
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, currentY, contentWidth, 120, 3, 3);

    // Barra superior decorativa
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(marginX, currentY, contentWidth, 2.5, 'F');

    // Logo y Membrete
    currentY += 6;
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', marginX + 3, currentY, 20, 13);
      } catch (e) {}
    }

    const textHeaderX = logoBase64 ? marginX + 26 : marginX + 3;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('ROMÁN & DELGADO — ESCRITORIO JURÍDICO', textHeaderX, currentY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Asesoría Jurídica Corporativa & Litigios • R.I.F. J-50073284-0', textHeaderX, currentY + 8);
    doc.text('Valencia • Maracay, Venezuela • contacto@romanydelgado.com', textHeaderX, currentY + 11.5);

    // Caja de Nro Recibo y Fecha en esquina derecha
    const boxReciboX = pageWidth - marginX - 60;
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(boxReciboX, currentY, 57, 13, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(180, 83, 9); // Amber 700
    doc.text(`RECIBO Nº: ${recibo.numeroRecibo}`, boxReciboX + 28.5, currentY + 4.5, { align: 'center' });

    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`Fecha: ${recibo.fecha}${recibo.hora ? ` • ${recibo.hora}` : ''}`, boxReciboX + 28.5, currentY + 8.5, { align: 'center' });

    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(isCopy ? '[ COPIA CLIENTE ]' : '[ ORIGINAL ESCRITORIO ]', boxReciboX + 28.5, currentY + 11.5, { align: 'center' });

    // Línea divisoria
    currentY += 16;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(marginX + 3, currentY, pageWidth - marginX - 3, currentY);

    // Sección: Datos del Cliente y Expediente
    currentY += 4;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(marginX + 3, currentY, contentWidth - 6, 17, 1.5, 1.5, 'F');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);

    // Fila 1: Cliente y Cédula
    doc.text('HEMOS RECIBIDO DE:', marginX + 5, currentY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.text(recibo.clienteNombre.toUpperCase(), marginX + 38, currentY + 4.5);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('C.I. / R.I.F.:', marginX + 120, currentY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(recibo.clienteCedula, marginX + 140, currentY + 4.5);

    // Fila 2: Concepto y Expediente
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('TIPO DE INGRESO:', marginX + 5, currentY + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(recibo.tipoRecibo === 'Honorarios Profesionales' ? 180 : 16, recibo.tipoRecibo === 'Honorarios Profesionales' ? 83 : 185, recibo.tipoRecibo === 'Honorarios Profesionales' ? 9 : 129);
    doc.setFont('helvetica', 'bold');
    doc.text(recibo.tipoRecibo.toUpperCase(), marginX + 38, currentY + 9.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('EXPEDIENTE / CASO:', marginX + 120, currentY + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(recibo.expedienteRelacionado || 'Asesoría General', marginX + 152, currentY + 9.5);

    // Fila 3: Contacto
    if (recibo.clienteTelefono || recibo.clienteEmail) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('CONTACTO:', marginX + 5, currentY + 14.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const contactoTxt = [recibo.clienteTelefono, recibo.clienteEmail].filter(Boolean).join(' • ');
      doc.text(contactoTxt, marginX + 38, currentY + 14.5);
    }

    // Sección: Cuadro de Monto y Concepto Detallado
    currentY += 21;

    // Caja de Concepto
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX + 3, currentY, contentWidth - 65, 24, 1.5, 1.5, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('POR CONCEPTO DE:', marginX + 5, currentY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const splitConcepto = doc.splitTextToSize(recibo.concepto, contentWidth - 75);
    doc.text(splitConcepto, marginX + 5, currentY + 8.5);

    // Caja destacada de Monto (a la derecha)
    const boxMontoX = pageWidth - marginX - 58;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(180, 83, 9);
    doc.setLineWidth(0.4);
    doc.roundedRect(boxMontoX, currentY, 55, 24, 2, 2, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL RECIBIDO', boxMontoX + 27.5, currentY + 4.5, { align: 'center' });

    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(formatMonto(recibo.monto, recibo.moneda), boxMontoX + 27.5, currentY + 12, { align: 'center' });

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    if (recibo.tasaBcv && recibo.moneda === 'USD') {
      const equivBs = recibo.monto * recibo.tasaBcv;
      doc.text(`Tasa BCV: ${recibo.tasaBcv.toFixed(2)} Bs./$`, boxMontoX + 27.5, currentY + 16.5, { align: 'center' });
      doc.text(`Equiv: ${formatMonto(equivBs, 'VES')}`, boxMontoX + 27.5, currentY + 20, { align: 'center' });
    } else {
      doc.text(`Método: ${recibo.metodoPago}`, boxMontoX + 27.5, currentY + 18, { align: 'center' });
    }

    // Monto en letras y Método de pago detallado
    currentY += 27;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('LA CANTIDAD DE:', marginX + 5, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const montoLetras = numeroALetras(recibo.monto, recibo.moneda);
    doc.text(montoLetras, marginX + 32, currentY);

    currentY += 4.5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('MODALIDAD DE PAGO:', marginX + 5, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    let detallePago = recibo.metodoPago;
    if (recibo.bancoDestino) detallePago += ` (${recibo.bancoDestino})`;
    if (recibo.referenciaPago) detallePago += ` • Ref: ${recibo.referenciaPago}`;
    doc.text(detallePago, marginX + 37, currentY);

    // Nota legal del artículo 22 Ley de Abogados
    currentY += 6;
    doc.setFontSize(6.2);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Constancia oficial de recepción económica sujeta a la Ley de Abogados y normas de ética profesional. No requiere factura fiscal para gestiones de aranceles.',
      marginX + 5,
      currentY
    );

    // Firmas (Abogado Receptor y Cliente Conforme)
    currentY += 13;
    const signColWidth = (contentWidth - 30) / 2;

    // Firma Abogado
    const sign1X = marginX + 10;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(sign1X, currentY, sign1X + signColWidth, currentY);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('POR ROMÁN & DELGADO', sign1X + (signColWidth / 2), currentY + 4, { align: 'center' });

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Abg. Receptor: ${recibo.abogadoReceptor}`, sign1X + (signColWidth / 2), currentY + 7.5, { align: 'center' });

    // Firma Cliente
    const sign2X = pageWidth - marginX - signColWidth - 10;
    doc.line(sign2X, currentY, sign2X + signColWidth, currentY);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('CONFORME CLIENTE', sign2X + (signColWidth / 2), currentY + 4, { align: 'center' });

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(recibo.clienteNombre, sign2X + (signColWidth / 2), currentY + 7.5, { align: 'center' });
    doc.text(`C.I. ${recibo.clienteCedula}`, sign2X + (signColWidth / 2), currentY + 10.5, { align: 'center' });
  };

  // 1. Talón Superior: ORIGINAL (Escritorio)
  drawVoucher(12, false);

  // Línea punteada de corte / tijeras
  const midY = 138;
  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(marginX, midY, pageWidth - marginX, midY);
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('- - - - - - - - - - - - - - - - - - - - - -  CORTE POR AQUÍ  - - - - - - - - - - - - - - - - - - - - - -', pageWidth / 2, midY + 1.5, { align: 'center' });
  doc.setLineDashPattern([], 0);

  // 2. Talón Inferior: DUPLICADO (Cliente)
  drawVoucher(145, true);

  const cleanClient = recibo.clienteNombre.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Recibo_${recibo.numeroRecibo}_${cleanClient}.pdf`;
  const blob = doc.output('blob');

  return { blob, fileName };
}

export async function exportarReciboClientePDF(recibo: ReciboCliente): Promise<void> {
  const { blob, fileName } = await generarReciboClienteBlob(recibo);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
