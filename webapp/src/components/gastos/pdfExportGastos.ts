import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { RelacionGastos } from '../../types/gastos';

export async function exportarRelacionGastosPDF(relacion: RelacionGastos, logoBase64?: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // 1. Encabezado Oficial
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin, 10, 22, 22);
    } catch (e) {
      console.warn('Error dibujando logo en PDF de gastos', e);
    }
  }

  const textStartX = logoBase64 ? margin + 26 : margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('ROMÁN & DELGADO  |  ABOGADOS', textStartX, 16);

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFont('helvetica', 'normal');
  doc.text('CONTROL OPERATIVO DE DESEMBOLSOS Y GASTOS DE TRÁMITES', textStartX, 21.5);
  doc.text('SISTEMA INTEGRAL DE GESTIÓN Y AUDITORÍA INTERNA', textStartX, 26);

  // Cuadro de Control a la derecha
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('RELACIÓN DE GASTOS', pageWidth - margin, 16, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`ID Control: #EXP-${relacion.id || 'N/A'}`, pageWidth - margin, 21.5, { align: 'right' });
  doc.text(`Fecha Emisión: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth - margin, 26, { align: 'right' });

  // Línea divisoria
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(margin, 31, pageWidth - margin, 31);

  // Funciones auxiliares de formateo limpio
  const formatPeriodDate = (d?: string) => {
    if (!d) return 'N/A';
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split('-');
      return `${day}/${m}/${y}`;
    }
    return d;
  };

  const capitalizeWords = (str?: string) => {
    if (!str) return 'No especificado';
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  // 2. Información del Empleado y Período
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, 34, pageWidth - (margin * 2), 22, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, 34, pageWidth - (margin * 2), 22, 2, 2, 'S');

  // Columna 1: Solicitante (X: margin + 5)
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('RESPONSABLE / SOLICITANTE:', margin + 5, 39);

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(capitalizeWords(relacion.empleado), margin + 5, 45, { maxWidth: 48 });

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tasa BCV: Bs ${Number(relacion.tasaBcv || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, margin + 5, 51);

  // Columna 2: Período Reportado (X: margin + 56)
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('PERÍODO REPORTADO:', margin + 56, 39);

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  const periodoTexto = `${relacion.periodo} (${formatPeriodDate(relacion.fechaInicio)} al ${formatPeriodDate(relacion.fechaFin)})`;
  doc.text(periodoTexto, margin + 56, 45, { maxWidth: 80 });

  if (relacion.estatus === 'Pagado') {
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`Liquidado el ${relacion.fechaPago || ''} vía ${relacion.metodoPago || ''} (Ref: ${relacion.referenciaPago || 'S/R'})`, margin + 56, 51, { maxWidth: 80 });
  }

  // Columna 3: Estatus / Liquidación (Alineada a la derecha)
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTATUS / LIQUIDACIÓN:', pageWidth - margin - 5, 39, { align: 'right' });

  // Badge pill de estatus con espacio dedicado a la derecha
  const estatusRaw = (relacion.estatus || 'Pendiente').trim();
  const estatusUpper = estatusRaw.toUpperCase();
  const badgeW = 28;
  const badgeH = 6;
  const badgeX = pageWidth - margin - 5 - badgeW;
  const badgeY = 41;

  if (estatusUpper === 'PAGADO') {
    doc.setFillColor(220, 252, 231); // emerald-100
    doc.setDrawColor(134, 239, 172); // emerald-300
    doc.setTextColor(21, 128, 61);   // emerald-700
  } else if (estatusUpper === 'PENDIENTE') {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(252, 211, 77);   // amber-300
    doc.setTextColor(180, 83, 9);     // amber-700
  } else {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setTextColor(71, 85, 105);   // slate-600
  }

  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(estatusUpper, badgeX + (badgeW / 2), badgeY + 4.2, { align: 'center' });

  // 3. Tabla Desglosada de Gastos
  const tableData = (relacion.items || []).map((item, index) => {
    return [
      (index + 1).toString(),
      item.fechaGasto ? formatPeriodDate(item.fechaGasto) : 'N/A',
      item.tramiteExpediente || 'General',
      item.categoria || 'Otro',
      item.descripcion || 'Sin descripción adicional',
      `$ ${Number(item.montoUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `Bs ${Number(item.montoVes || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      item.comprobanteUrl || item.comprobanteBase64 ? 'Adjunto' : 'Sin Soporte'
    ];
  });

  autoTable(doc, {
    startY: 60,
    head: [['#', 'Fecha', 'Trámite / Asunto', 'Partida / Concepto', 'Detalle Justificativo', 'Total USD ($)', 'Total Bs (VES)', 'Soporte']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 18 },
      2: { cellWidth: 32, fontStyle: 'bold' },
      3: { cellWidth: 26 },
      4: { cellWidth: 'auto' },
      5: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
      6: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
      7: { halign: 'center', cellWidth: 18 }
    },
    margin: { left: margin, right: margin }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 120;

  // 4. Cuadro de Totales y Liquidación
  let totalBoxY = finalY + 6;
  if (totalBoxY + 55 > pageHeight - 15) {
    doc.addPage();
    totalBoxY = margin + 10;
  }

  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(pageWidth - margin - 75, totalBoxY, 75, 26, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(pageWidth - margin - 75, totalBoxY, 75, 26, 2, 2, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL GENERAL A REEMBOLSAR:', pageWidth - margin - 70, totalBoxY + 6);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`$ ${Number(relacion.totalUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`, pageWidth - margin - 5, totalBoxY + 14, { align: 'right' });

  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Bs ${Number(relacion.totalVes || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} VES`, pageWidth - margin - 5, totalBoxY + 21, { align: 'right' });

  // Firmas de Conformidad
  const signatureY = totalBoxY + 38;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  
  // Firma Empleado
  doc.line(margin + 10, signatureY, margin + 65, signatureY);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Firma del Solicitante', margin + 37.5, signatureY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(capitalizeWords(relacion.empleado), margin + 37.5, signatureY + 8, { align: 'center' });

  // Firma Jefatura
  doc.line(pageWidth - margin - 65, signatureY, pageWidth - margin - 10, signatureY);
  doc.setFont('helvetica', 'normal');
  doc.text('Aprobado por Jefatura', pageWidth - margin - 37.5, signatureY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(relacion.pagadoPor || 'Román & Delgado Abogados', pageWidth - margin - 37.5, signatureY + 8, { align: 'center' });

  // 5. Pie de Página en todas las hojas
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Román & Delgado Abogados — Documento Interno de Rendición y Liquidación de Gastos Operativos', margin, pageHeight - 7);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  const rawEmp = (relacion.empleado || 'empleado').trim();
  const cleanEmp = rawEmp.replace(/\s+/g, '_');
  const cleanPeriod = (relacion.periodo || 'Periodo').trim().replace(/\s+/g, '_');
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const fileName = `Gastos_${cleanEmp}_${cleanPeriod}_${dateStr}.pdf`;

  try {
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      URL.revokeObjectURL(blobUrl);
    }, 15000);
  } catch (err) {
    doc.save(fileName);
  }
}
