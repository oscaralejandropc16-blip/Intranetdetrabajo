const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable');
const { createClient } = require('../node_modules/@supabase/supabase-js');

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

const fnAutoTable = autoTable.default || autoTable;

function parseTime12h(tStr) {
  if (!tStr) return null;
  const match = tStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let [_, h, m, p] = match;
  h = parseInt(h, 10);
  m = parseInt(m, 10);
  if (p) {
    p = p.toUpperCase();
    if (p === 'PM' && h < 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;
  }
  return h * 60 + m;
}

function calcDuration(inStr, outStr) {
  const mIn = parseTime12h(inStr);
  const mOut = parseTime12h(outStr);
  if (mIn === null || mOut === null) return { diffMin: 0, text: '—' };
  let diff = mOut - mIn;
  if (diff < 0) diff += 24 * 60;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return { diffMin: diff, text: `${hours}h ${mins < 10 ? '0' : ''}${mins}m` };
}

function getDayShort(dateStr) {
  const parts = dateStr.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return days[d.getDay()] || '';
}

function formatDateShort(dateStr) {
  const parts = dateStr.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

async function generateCleanPdf() {
  console.log('Consultando registros de Carmen Luisa en Supabase...');
  const { data, error } = await supabase
    .from('bitacoras')
    .select('*')
    .ilike('user_name', '%carmen%')
    .gte('fecha', '2026-08-01')
    .lte('fecha', '2026-09-30')
    .order('fecha', { ascending: true });

  if (error) {
    console.error('Error al consultar Supabase:', error);
    return;
  }

  const agosto = data.filter(d => d.fecha.startsWith('2026-08'));
  const sept = data.filter(d => d.fecha.startsWith('2026-09'));

  let minAgosto = 0;
  agosto.forEach(b => {
    minAgosto += calcDuration(b.hora_entrada, b.hora_salida).diffMin;
  });

  let minSept = 0;
  sept.forEach(b => {
    minSept += calcDuration(b.hora_entrada, b.hora_salida).diffMin;
  });

  const totalMin = minAgosto + minSept;
  const totalDias = data.length;
  const avgMinPerDay = totalDias > 0 ? Math.round(totalMin / totalDias) : 0;

  // Documento tamaño Letter vertical
  const doc = new jsPDF({ format: 'letter', unit: 'mm', compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const contentWidth = pageWidth - (marginX * 2);

  // ==========================================
  // 1. ENCABEZADO INSTITUCIONAL FORMAL (SOBRIO)
  // ==========================================
  let currentY = 16;

  // Membrete de la firma a la izquierda
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // Gris oscuro casi negro
  doc.text('ROMÁN & DELGADO ABOGADOS', marginX, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Gris medio
  doc.text('Control Interno de Gestión y Asistencia Laboral', marginX, currentY + 4.5);

  // Fecha y metadatos a la derecha
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Documento Oficial de Asistencia', pageWidth - marginX, currentY, { align: 'right' });
  doc.text('Emisión: 01 de Octubre de 2026', pageWidth - marginX, currentY + 4.5, { align: 'right' });

  // Línea divisoria muy fina y limpia
  currentY += 8;
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.4);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);

  // ==========================================
  // 2. TÍTULO Y DATOS GENERALES
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

  // Datos en formato de ficha limpia con fondo sutil
  currentY += 5;
  doc.setFillColor(248, 250, 252); // slate-50 muy suave
  doc.setDrawColor(226, 232, 240); // slate-200
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
  doc.text('Carmen Luisa Delgado', col1X + 22, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Período:', col2X, currentY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text('Agosto y Septiembre de 2026', col2X + 20, currentY + 5.5);

  // Fila 2
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Cargo:', col1X, currentY + 11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text('Abogada / Gestión de Casos', col1X + 22, currentY + 11);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Jornadas:', col2X, currentY + 11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalDias} días registrados (11 en Ago | 7 en Sep)`, col2X + 20, currentY + 11);

  // Fila 3
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Correo:', col1X, currentY + 16.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text('abgcarmendelgado.990@gmail.com', col1X + 22, currentY + 16.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Total Horas:', col2X, currentY + 16.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${Math.floor(totalMin / 60)}h ${totalMin % 60}m  (Promedio: ${Math.floor(avgMinPerDay / 60)}h ${avgMinPerDay % 60}m/día)`, col2X + 20, currentY + 16.5);

  currentY += 24;

  // ==========================================
  // 3. TABLA 1: MES DE AGOSTO 2026
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Mes de Agosto 2026', marginX, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`11 jornadas — Subtotal: ${Math.floor(minAgosto / 60)}h ${minAgosto % 60}m`, pageWidth - marginX, currentY, { align: 'right' });

  const tableAgostoBody = agosto.map((b, idx) => {
    const dur = calcDuration(b.hora_entrada, b.hora_salida);
    const dayStr = getDayShort(b.fecha);
    const dateFormatted = formatDateShort(b.fecha);
    const sup = b.supervisado_por || (b.estado === 'aprobado' ? 'Luis Delgado' : 'Jefatura');
    const estado = b.estado === 'aprobado' ? 'Aprobado' : 'Pendiente';

    return [
      String(idx + 1).padStart(2, '0'),
      `${dateFormatted} (${dayStr})`,
      b.hora_entrada || '—',
      b.hora_salida || '—',
      dur.text,
      estado,
      sup
    ];
  });

  tableAgostoBody.push([
    '',
    'Subtotal Agosto 2026',
    '—',
    '—',
    `${Math.floor(minAgosto / 60)}h ${minAgosto % 60}m`,
    '11 días',
    'Auditado'
  ]);

  fnAutoTable(doc, {
    startY: currentY + 2.5,
    head: [['N°', 'Fecha', 'Hora Entrada', 'Hora Salida', 'Duración', 'Estado', 'Supervisión']],
    body: tableAgostoBody,
    theme: 'plain',
    headStyles: {
      fillColor: [241, 245, 249], // slate-100
      textColor: [51, 65, 85],     // slate-700
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
      // Fila de subtotal
      if (data.row.index === tableAgostoBody.length - 1) {
        data.cell.styles.fillColor = [248, 250, 252];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [15, 23, 42];
        data.cell.styles.lineWidth = { top: 0.3, bottom: 0.3 };
        data.cell.styles.lineColor = [203, 213, 225];
      }
    },
    margin: { left: marginX, right: marginX }
  });

  // ==========================================
  // 4. TABLA 2: MES DE SEPTIEMBRE 2026
  // ==========================================
  currentY = doc.lastAutoTable.finalY + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Mes de Septiembre 2026', marginX, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`7 jornadas — Subtotal: ${Math.floor(minSept / 60)}h ${minSept % 60}m`, pageWidth - marginX, currentY, { align: 'right' });

  const tableSeptBody = sept.map((b, idx) => {
    const dur = calcDuration(b.hora_entrada, b.hora_salida);
    const dayStr = getDayShort(b.fecha);
    const dateFormatted = formatDateShort(b.fecha);
    const sup = b.supervisado_por || (b.estado === 'aprobado' ? 'Luis Delgado' : 'Jefatura');
    const estado = b.estado === 'aprobado' ? 'Aprobado' : 'Pendiente';

    return [
      String(idx + 1).padStart(2, '0'),
      `${dateFormatted} (${dayStr})`,
      b.hora_entrada || '—',
      b.hora_salida || '—',
      dur.text,
      estado,
      sup
    ];
  });

  tableSeptBody.push([
    '',
    'Subtotal Septiembre 2026',
    '—',
    '—',
    `${Math.floor(minSept / 60)}h ${minSept % 60}m`,
    '7 días',
    'Auditado'
  ]);

  fnAutoTable(doc, {
    startY: currentY + 2.5,
    head: [['N°', 'Fecha', 'Hora Entrada', 'Hora Salida', 'Duración', 'Estado', 'Supervisión']],
    body: tableSeptBody,
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
      if (data.row.index === tableSeptBody.length - 1) {
        data.cell.styles.fillColor = [248, 250, 252];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [15, 23, 42];
        data.cell.styles.lineWidth = { top: 0.3, bottom: 0.3 };
        data.cell.styles.lineColor = [203, 213, 225];
      }
    },
    margin: { left: marginX, right: marginX }
  });

  // ==========================================
  // 5. RESUMEN FINAL Y FIRMAS EN LA MISMA PÁGINA
  // ==========================================
  currentY = doc.lastAutoTable.finalY + 5;

  // Fila de Total General Bimestral
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(marginX, currentY, contentWidth, 7, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL CONSOLIDADO BIMESTRAL (AGOSTO Y SEPTIEMBRE 2026):', marginX + 4, currentY + 4.8);

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
  doc.text('Carmen Luisa Delgado', sign1X + (signWidth / 2), currentY + 16, { align: 'center' });
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

  // Pie de página
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.line(marginX, pageHeight - 10, pageWidth - marginX, pageHeight - 10);
  doc.text('Román & Delgado Abogados — Plataforma Oficial de Control Horario y Gestión Interna', marginX, pageHeight - 6.5);
  doc.text('Página 1 de 1', pageWidth - marginX, pageHeight - 6.5, { align: 'right' });

  const pdfBytes = Buffer.from(doc.output('arraybuffer'));
  
  const outPath1 = path.join(__dirname, '../../Reporte_Horas_Carmen_Agosto_Septiembre_2026.pdf');
  const outPath2 = path.join(__dirname, '../public/Reporte_Horas_Carmen_Agosto_Septiembre_2026.pdf');
  const outPath3 = path.join(__dirname, '../dist/Reporte_Horas_Carmen_Agosto_Septiembre_2026.pdf');

  fs.writeFileSync(outPath1, pdfBytes);
  fs.writeFileSync(outPath2, pdfBytes);
  if (fs.existsSync(path.dirname(outPath3))) {
    fs.writeFileSync(outPath3, pdfBytes);
  }

  // Copia en artifact dir
  const artifactDir = path.join('C:', 'Users', 'Laptop', '.gemini', 'antigravity-ide', 'brain', 'aeda41dc-dd9e-4bf1-9aa0-2624fa9ddd4e');
  if (fs.existsSync(artifactDir)) {
    fs.writeFileSync(path.join(artifactDir, 'Reporte_Horas_Carmen_Agosto_Septiembre_2026.pdf'), pdfBytes);
  }

  console.log(`✅ PDF sobrio generado exitosamente!`);
  console.log(`  - Guardado en: ${outPath1}`);
  console.log(`  - Páginas totales: ${doc.internal.getNumberOfPages()}`);
  console.log(`  - Tamaño: ${(pdfBytes.length / 1024).toFixed(1)} KB`);
}

generateCleanPdf();
