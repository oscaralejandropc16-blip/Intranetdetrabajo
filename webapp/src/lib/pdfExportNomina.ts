import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReciboNomina } from '../types/nomina';

// Función para precargar y comprimir logo
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
        console.warn('No se pudo redimensionar logo para recibo de nómina:', e);
      }
      resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = '/logo.png';
  });
}

function formatMonto(monto?: number, moneda: string = 'USD'): string {
  if (monto === undefined || monto === null) return '—';
  const formatted = monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return moneda === 'USD' ? `$ ${formatted}` : `Bs. ${formatted}`;
}

export async function exportarReciboNominaPDF(recibo: ReciboNomina): Promise<void> {
  const doc = new jsPDF({ format: 'letter', unit: 'mm', compress: true });
  const pageWidth = doc.internal.pageSize.getWidth(); // 215.9 mm
  const marginX = 14;
  const contentWidth = pageWidth - (marginX * 2);
  const logoBase64 = await getLogoBase64();

  // Función para dibujar un talón individual (Original o Copia)
  const drawVoucher = (startY: number, isCopy: boolean) => {
    let currentY = startY;

    // 1. Encabezado con Logo y Membrete
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', marginX, currentY, 18, 12, undefined, 'FAST');
    }

    const headerTextX = logoBase64 ? marginX + 22 : marginX;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('ROMÁN & DELGADO  |  ABOGADOS', headerTextX, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('SISTEMA INTEGRAL DE NÓMINA Y GESTIÓN LABORAL (KANT)', headerTextX, currentY + 8.5);
    doc.text('RIF: J-50175917-0  •  Valencia, Venezuela', headerTextX, currentY + 12);

    // Número de Recibo y Tipo de Talón en esquina derecha
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`RECIBO DE PAGO Nº: ${recibo.numeroRecibo}`, pageWidth - marginX, currentY + 4.5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Período: ${recibo.periodoInicio} al ${recibo.periodoFin}`, pageWidth - marginX, currentY + 8.5, { align: 'right' });

    // Etiqueta distintiva: ORIGINAL o COPIA
    doc.setFillColor(isCopy ? 241 : 238, isCopy ? 245 : 242, isCopy ? 249 : 255);
    doc.setDrawColor(isCopy ? 148 : 59, isCopy ? 163 : 130, isCopy ? 184 : 246);
    doc.roundedRect(pageWidth - marginX - 32, currentY + 10.5, 32, 5.5, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(isCopy ? 71 : 29, isCopy ? 85 : 78, isCopy ? 105 : 216);
    doc.text(isCopy ? '[ COPIA ARCHIVO ]' : '[ ORIGINAL EMPLEADO ]', pageWidth - marginX - 16, currentY + 14.3, { align: 'center' });

    // Línea separadora
    currentY += 15.5;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(marginX, currentY, pageWidth - marginX, currentY);

    // 2. Ficha de Datos del Trabajador
    currentY += 2.5;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, currentY, contentWidth, 14, 1.2, 1.2, 'FD');

    const c1X = marginX + 3;
    const c2X = marginX + (contentWidth / 3) + 2;
    const c3X = marginX + (contentWidth * 2 / 3) + 2;

    doc.setFontSize(7);
    // Fila 1
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Trabajador:', c1X, currentY + 4);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(recibo.empleadoNombre, c1X + 17, currentY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Cédula:', c2X, currentY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(recibo.cedula, c2X + 12, currentY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Cargo:', c3X, currentY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(recibo.cargo, c3X + 11, currentY + 4);

    // Fila 2
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Sueldo Base:', c1X, currentY + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`${formatMonto(recibo.sueldoBaseMensual, 'USD')} / mes`, c1X + 17, currentY + 9.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Pago:', c2X, currentY + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const pagoDetalle = recibo.referenciaPago 
      ? `${recibo.tipoPago} (${recibo.banco}) • Ref: ${recibo.referenciaPago}`
      : `${recibo.tipoPago} (${recibo.banco})`;
    doc.text(pagoDetalle, c2X + 10, currentY + 9.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    const esMensualCompleto = recibo.modalidadLiquidacion === 'mensual_completo';
    doc.text(esMensualCompleto ? 'Liquidación:' : 'Días Quincena:', c3X, currentY + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(
      esMensualCompleto 
        ? 'Mes Completo (El Último)' 
        : `${recibo.diasLaborados} laborados + ${recibo.diasDescanso} descanso`, 
      c3X + (esMensualCompleto ? 18 : 21), 
      currentY + 9.5
    );

    // 3. Tabla de Conceptos
    currentY += 16;
    const tableData = recibo.conceptos.map(c => [
      c.concepto,
      c.dht || '—',
      c.devengado !== undefined && c.devengado > 0 ? formatMonto(c.devengado, 'USD') : '',
      c.deduccion !== undefined && c.deduccion > 0 ? formatMonto(c.deduccion, 'USD') : ''
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [['CONCEPTO', 'D/H/T', 'DEVENGADO', 'DEDUCCIÓN']],
      body: tableData,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7,
        cellPadding: 1.5,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.3
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.2,
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.50 },
        1: { cellWidth: contentWidth * 0.16, halign: 'center' },
        2: { cellWidth: contentWidth * 0.17, halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] },
        3: { cellWidth: contentWidth * 0.17, halign: 'right', fontStyle: 'bold', textColor: [225, 29, 72] }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || currentY + 25;

    // 4. Fila de Totales y Neto a Pagar
    const totalsY = finalY + 1.5;
    doc.setFillColor(241, 245, 249);
    doc.rect(marginX, totalsY, contentWidth, 6.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(marginX, totalsY, contentWidth, 6.5, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text('TOTALES:', marginX + (contentWidth * 0.50) - 4, totalsY + 4.3, { align: 'right' });
    doc.setTextColor(16, 185, 129);
    doc.text(formatMonto(recibo.totalDevengado, 'USD'), marginX + (contentWidth * 0.83) - 2, totalsY + 4.3, { align: 'right' });
    doc.setTextColor(225, 29, 72);
    doc.text(formatMonto(recibo.totalDeducciones, 'USD'), pageWidth - marginX - 2, totalsY + 4.3, { align: 'right' });

    // Cuadro de Neto a Pagar Destacado (Bolívares Protagonista)
    const netY = totalsY + 8;
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(marginX + (contentWidth * 0.40), netY, contentWidth * 0.60, 11, 1.2, 1.2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(241, 245, 249);
    doc.text('NETO A PAGAR:', marginX + (contentWidth * 0.40) + 3.5, netY + 4.8);

    // Monto Principal en Bolívares (VES)
    doc.setFontSize(10.2);
    doc.setTextColor(52, 211, 153); // emerald-400
    doc.text(formatMonto(recibo.netoPagarVes, 'VES'), pageWidth - marginX - 3.5, netY + 5.2, { align: 'right' });

    // Referencia Oficial en USD y Tasa BCV
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(203, 213, 225);
    const refTxt = `Ref. Oficial: ${formatMonto(recibo.netoPagarUsd, 'USD')}${recibo.tasaCambio ? ` (Tasa BCV: ${recibo.tasaCambio.toFixed(2)})` : ''}${recibo.referenciaPago ? ` • Ref: ${recibo.referenciaPago}` : ''}`;
    doc.text(refTxt, pageWidth - marginX - 3.5, netY + 9.2, { align: 'right' });

    // 5. Pie de Talón: Caja de Firma y Huella
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(marginX, netY, contentWidth * 0.42, 11, 1.2, 1.2, 'D');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Firma y Huella del Trabajador', marginX + 3, netY + 3.8);
    doc.text(`C.I. ${recibo.cedula}`, marginX + 3, netY + 9.2);

    // Estado de Pago y Fecha oficial
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(16, 185, 129);
    doc.text(`PAGADO • ${recibo.fechaPago || new Date().toLocaleDateString('es-VE')}`, marginX + (contentWidth * 0.42) - 3, netY + 9.2, { align: 'right' });
  };

  // Dibujar Talón 1: ORIGINAL (Arriba)
  drawVoucher(10, false);

  // Línea divisoria de corte en el centro
  const cutY = 138;
  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(marginX, cutY, pageWidth - marginX, cutY);
  doc.setLineDashPattern([], 0); // Reset dash

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('✂  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  LÍNEA DE CORTE OFICIAL  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  ✂', pageWidth / 2, cutY - 1, { align: 'center' });

  // Dibujar Talón 2: COPIA (Abajo)
  drawVoucher(144, true);

  // Guardar archivo PDF
  const cleanName = recibo.empleadoNombre.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Recibo_Nomina_${cleanName}_Q${recibo.quincena}_${recibo.mes}_${recibo.anio}.pdf`;
  doc.save(fileName);
}
