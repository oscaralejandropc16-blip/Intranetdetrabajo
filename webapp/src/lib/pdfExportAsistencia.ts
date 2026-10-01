import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface BitacoraAsistenciaItem {
  id?: string | number;
  user_name?: string;
  user?: string;
  fecha?: string;
  date?: string;
  hora_entrada?: string;
  clockIn?: string;
  hora_salida?: string;
  clockOut?: string;
  estado?: string;
  status?: string;
  supervisado_por?: string;
  ubicacion_entrada?: string;
  ubicacionEntrada?: string;
  ubicacion_salida?: string;
  ubicacionSalida?: string;
  [key: string]: any;
}

export interface ExportAsistenciaOptions {
  employeeName: string;
  employeeEmail?: string;
  employeeRole?: string;
  periodLabel: string;
  startDate?: string;
  endDate?: string;
  bitacoras: BitacoraAsistenciaItem[];
}

export function parseTime12h(tStr?: string | null): number | null {
  if (!tStr) return null;
  const match = tStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let [, hStr, mStr, p] = match;
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (p) {
    const pUpper = p.toUpperCase();
    if (pUpper === 'PM' && h < 12) h += 12;
    if (pUpper === 'AM' && h === 12) h = 0;
  }
  return h * 60 + m;
}

export function calcDuration(inStr?: string | null, outStr?: string | null): { diffMin: number; text: string } {
  const mIn = parseTime12h(inStr);
  const mOut = parseTime12h(outStr);
  if (mIn === null || mOut === null) return { diffMin: 0, text: '—' };
  let diff = mOut - mIn;
  if (diff < 0) diff += 24 * 60;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return { diffMin: diff, text: `${hours}h ${mins < 10 ? '0' : ''}${mins}m` };
}

function getDayShort(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[d.getDay()] || '';
  } catch {
    return '';
  }
}

function formatDateShort(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  } catch {
    return dateStr;
  }
}

const monthNamesEs: Record<string, string> = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
};

export async function exportarReporteAsistenciaPDF(options: ExportAsistenciaOptions): Promise<void> {
  const {
    employeeName,
    employeeEmail = 'abgcarmendelgado.990@gmail.com',
    employeeRole = 'Abogada / Gestión de Casos',
    periodLabel,
    bitacoras
  } = options;

  // Filtrar y ordenar bitácoras cronológicamente
  const sortedBitacoras = [...bitacoras].sort((a, b) => {
    const dateA = a.fecha || a.date || '';
    const dateB = b.fecha || b.date || '';
    return dateA.localeCompare(dateB);
  });

  // Agrupar por mes (YYYY-MM)
  const groupedByMonth: Record<string, BitacoraAsistenciaItem[]> = {};
  sortedBitacoras.forEach(item => {
    const d = item.fecha || item.date || 'Sin Fecha';
    const monthKey = d.length >= 7 ? d.substring(0, 7) : 'Otros';
    if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = [];
    groupedByMonth[monthKey].push(item);
  });

  // Totales generales
  let totalMin = 0;
  sortedBitacoras.forEach(b => {
    const inTime = b.hora_entrada || b.clockIn;
    const outTime = b.hora_salida || b.clockOut;
    totalMin += calcDuration(inTime, outTime).diffMin;
  });

  const totalDias = sortedBitacoras.length;
  const avgMinPerDay = totalDias > 0 ? Math.round(totalMin / totalDias) : 0;

  // Documento tamaño Letter vertical sobrio
  const doc = new jsPDF({ format: 'letter', unit: 'mm', compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const contentWidth = pageWidth - (marginX * 2);

  // ==========================================
  // 1. ENCABEZADO INSTITUCIONAL FORMAL
  // ==========================================
  let currentY = 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // Gris oscuro casi negro
  doc.text('ROMÁN & DELGADO ABOGADOS', marginX, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Control Interno de Gestión y Asistencia Laboral', marginX, currentY + 4.5);

  const todayFormatted = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Documento Oficial de Asistencia', pageWidth - marginX, currentY, { align: 'right' });
  doc.text(`Emisión: ${todayFormatted}`, pageWidth - marginX, currentY + 4.5, { align: 'right' });

  // Línea divisoria muy fina y limpia
  currentY += 8;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);

  // ==========================================
  // 2. TÍTULO Y DATOS DEL EMPLEADO
  // ==========================================
  currentY += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('REPORTE CONSOLIDADO DE ENTRADA Y SALIDA', marginX, currentY);

  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Registro horario correspondiente a las bitácoras digitales del sistema central.', marginX, currentY);

  currentY += 5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, currentY, contentWidth, 20, 1.5, 1.5, 'FD');

  const col1X = marginX + 4;
  const col2X = marginX + (contentWidth / 2) + 4;

  // Fila 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Empleado:', col1X, currentY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(employeeName, col1X + 22, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Período:', col2X, currentY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(periodLabel, col2X + 20, currentY + 5.5);

  // Fila 2
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Cargo:', col1X, currentY + 11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(employeeRole, col1X + 22, currentY + 11);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Jornadas:', col2X, currentY + 11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalDias} días registrados`, col2X + 20, currentY + 11);

  // Fila 3
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Correo:', col1X, currentY + 16.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(employeeEmail, col1X + 22, currentY + 16.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Total Horas:', col2X, currentY + 16.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${Math.floor(totalMin / 60)}h ${totalMin % 60}m  (Promedio: ${Math.floor(avgMinPerDay / 60)}h ${avgMinPerDay % 60}m/día)`, col2X + 20, currentY + 16.5);

  currentY += 24;

  // ==========================================
  // 3. TABLAS POR MES
  // ==========================================
  const monthKeys = Object.keys(groupedByMonth).sort();

  const getMonthTitle = (key: string): string => {
    if (key.includes('-')) {
      const [year, m] = key.split('-');
      const name = monthNamesEs[m] || m;
      return `Mes de ${name} ${year}`;
    }
    return key;
  };

  monthKeys.forEach((mKey, idx) => {
    const items = groupedByMonth[mKey];
    let mMin = 0;
    items.forEach(b => {
      mMin += calcDuration(b.hora_entrada || b.clockIn, b.hora_salida || b.clockOut).diffMin;
    });

    // Si ya no cabe en la página (menos de 35mm), saltar página
    if (currentY + (items.length * 6) + 25 > pageHeight - 35) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${idx + 1}. ${getMonthTitle(mKey)}`, marginX, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${items.length} jornadas — Subtotal: ${Math.floor(mMin / 60)}h ${mMin % 60}m`, pageWidth - marginX, currentY, { align: 'right' });

    const tableBody = items.map((b, i) => {
      const inTime = b.hora_entrada || b.clockIn || '—';
      const outTime = b.hora_salida || b.clockOut || '—';
      const dur = calcDuration(inTime, outTime);
      const rawDate = b.fecha || b.date || '';
      const dayStr = getDayShort(rawDate);
      const dateFormatted = formatDateShort(rawDate);
      const sup = b.supervisado_por || (b.estado === 'aprobado' || b.status === 'Revisado' ? 'Luis Delgado' : 'Jefatura');
      const estado = (b.estado === 'aprobado' || b.status === 'Revisado') ? 'Aprobado' : 'Pendiente';

      return [
        String(i + 1).padStart(2, '0'),
        `${dateFormatted} (${dayStr})`,
        inTime,
        outTime,
        dur.text,
        estado,
        sup
      ];
    });

    tableBody.push([
      '',
      `Subtotal ${getMonthTitle(mKey)}`,
      '—',
      '—',
      `${Math.floor(mMin / 60)}h ${mMin % 60}m`,
      `${items.length} días`,
      'Auditado'
    ]);

    autoTable(doc, {
      startY: currentY + 2.5,
      head: [['N°', 'Fecha', 'Hora Entrada', 'Hora Salida', 'Duración', 'Estado', 'Supervisión']],
      body: tableBody,
      theme: 'plain',
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [51, 65, 85],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 2,
        lineColor: [203, 213, 225],
        lineWidth: { top: 0.3, bottom: 0.5 }
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59],
        cellPadding: 1.8,
        lineColor: [241, 245, 249],
        lineWidth: { bottom: 0.2 }
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center', textColor: [100, 116, 139] },
        1: { cellWidth: 32, fontStyle: 'bold' },
        2: { cellWidth: 26, halign: 'center' },
        3: { cellWidth: 26, halign: 'center' },
        4: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
        5: { cellWidth: 26, halign: 'center' },
        6: { cellWidth: 'auto' }
      },
      didParseCell: function(data) {
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fillColor = [248, 250, 252];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [15, 23, 42];
          data.cell.styles.lineWidth = { top: 0.3, bottom: 0.3 };
          data.cell.styles.lineColor = [203, 213, 225];
        }
      },
      margin: { left: marginX, right: marginX }
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  });

  // ==========================================
  // 4. TOTAL CONSOLIDADO Y FIRMAS
  // ==========================================
  if (currentY + 45 > pageHeight - 15) {
    doc.addPage();
    currentY = 16;
  }

  // Fila de Total General Bimestral
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(marginX, currentY, contentWidth, 7, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAL CONSOLIDADO (${periodLabel.toUpperCase()}):`, marginX + 4, currentY + 4.8);

  const totalText = `${totalDias} Jornadas  |  ${Math.floor(totalMin / 60)}h ${totalMin % 60}m Totales  |  Promedio: ${Math.floor(avgMinPerDay / 60)}h ${avgMinPerDay % 60}m / día`;
  doc.text(totalText, pageWidth - marginX - 4, currentY + 4.8, { align: 'right' });

  // Nota de constancia
  currentY += 10;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Constancia: Los datos reflejados corresponden fielmente a las bitácoras digitales registradas en el servidor central de Román & Delgado Abogados.',
    marginX, currentY
  );

  // Firmas
  currentY += 8;
  const signWidth = 60;
  
  // Firma 1: Empleada
  const sign1X = marginX + 15;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(sign1X, currentY + 12, sign1X + signWidth, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(employeeName, sign1X + (signWidth / 2), currentY + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Empleado / Titular de Bitácora', sign1X + (signWidth / 2), currentY + 19.5, { align: 'center' });

  // Firma 2: Jefatura
  const sign2X = pageWidth - marginX - 15 - signWidth;
  doc.line(sign2X, currentY + 12, sign2X + signWidth, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Dirección de Jefatura', sign2X + (signWidth / 2), currentY + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Román & Delgado Abogados', sign2X + (signWidth / 2), currentY + 19.5, { align: 'center' });

  // Pie de página para todas las páginas
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.line(marginX, pageHeight - 10, pageWidth - marginX, pageHeight - 10);
    doc.text('Román & Delgado Abogados — Plataforma Oficial de Control Horario y Gestión Interna', marginX, pageHeight - 6.5);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - marginX, pageHeight - 6.5, { align: 'right' });
  }

  // Descargar archivo
  const cleanName = employeeName.replace(/\s+/g, '_');
  const fileName = `Reporte_Horas_${cleanName}_${periodLabel.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
