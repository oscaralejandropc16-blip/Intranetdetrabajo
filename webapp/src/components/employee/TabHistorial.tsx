import { useState, useEffect } from 'react';
import { History, Download, CheckCircle2, AlertCircle, Clock, MapPin, FileText } from 'lucide-react';
import api from '../../lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SystemAlertModal, { type AlertType } from '../common/SystemAlertModal';

interface BitacoraHistorial {
  id: number;
  date: string;
  clockIn: string;
  clockOut: string;
  status: string;
  ubicacionEntrada?: string;
  ubicacionSalida?: string;
  pdfBase64: string;
  content?: string;
  actuaciones?: any[];
  ingresos?: any[];
  programaciones?: any[];
}

export default function TabHistorial() {
  const [historial, setHistorial] = useState<BitacoraHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemAlert, setSystemAlert] = useState<{ isOpen: boolean; type: AlertType; title: string; message: string }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/rd-intranet/v1/my-history');
        if (response.data && Array.isArray(response.data)) {
          const parsedData = response.data.map((r: any) => {
            const parseJson = (val: any) => {
              if (Array.isArray(val)) return val;
              if (typeof val === 'string') {
                try { return JSON.parse(val); } catch(e) { return []; }
              }
              return [];
            };
            return {
              ...r,
              actuaciones: parseJson(r.actuaciones),
              ingresos: parseJson(r.ingresos),
              programaciones: parseJson(r.programaciones)
            };
          });
          setHistorial(parsedData);
        }
      } catch (error) {
        console.error('Error cargando el historial', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const openMap = (locationStr: string) => {
    // locationStr format could be "lat,lng" or "lat,lng|||City"
    if (!locationStr || locationStr === 'N/A') return;
    const coords = locationStr.split('|||')[0];
    window.open(`https://www.google.com/maps/search/?api=1&query=${coords}`, '_blank');
  };

  const generateFallbackPdf = async (bitacora: BitacoraHistorial) => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', compress: true });

      let logoBase64: string | null = null;
      try {
        logoBase64 = await new Promise<string | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 120;
            let w = img.width || 120;
            let h = img.height || 120;
            if (w > maxDim || h > maxDim) {
              if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
              else { w = Math.round((w * maxDim) / h); h = maxDim; }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL('image/png', 0.8));
            } else { resolve(null); }
          };
          img.onerror = () => resolve(null);
          img.src = '/logo.png';
        });
      } catch (e) {
        console.warn('No se pudo cargar o redimensionar el logo para PDF', e);
      }

      if (logoBase64 && (doc as any).GState) {
        try {
          doc.setGState(new (doc as any).GState({ opacity: 0.07 }));
          doc.addImage(logoBase64, 'PNG', 98, 55, 100, 100, 'logo', 'FAST');
          doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
        } catch (e) {}
      }

      let finalY = 62;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 34, 269, 22, 2.5, 2.5, 'FD');

      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      const userName = localStorage.getItem('rd_user_name') || 'Empleado';
      doc.text('EMPLEADO / ABOGADO:', 18, 42);
      doc.setFont('helvetica', 'normal');
      doc.text(userName, 68, 42);

      doc.setFont('helvetica', 'bold');
      doc.text('HORARIO REGISTRADO:', 18, 51);
      doc.setFont('helvetica', 'normal');
      doc.text(`Entrada: ${bitacora.clockIn || 'N/A'}   —   Salida: ${bitacora.clockOut || 'N/A'}`, 68, 51);

      doc.setFont('helvetica', 'bold');
      doc.text('UBICACIÓN ENTRADA:', 145, 42);
      doc.setFont('helvetica', 'normal');
      const cleanLocIn = bitacora.ubicacionEntrada ? (bitacora.ubicacionEntrada.includes('|||') ? bitacora.ubicacionEntrada.split('|||')[1] : bitacora.ubicacionEntrada) : 'N/A';
      doc.text(String(cleanLocIn).substring(0, 50), 190, 42);

      doc.setFont('helvetica', 'bold');
      doc.text('UBICACIÓN SALIDA:', 145, 51);
      doc.setFont('helvetica', 'normal');
      const cleanLocOut = bitacora.ubicacionSalida ? (bitacora.ubicacionSalida.includes('|||') ? bitacora.ubicacionSalida.split('|||')[1] : bitacora.ubicacionSalida) : 'N/A';
      doc.text(String(cleanLocOut).substring(0, 50), 190, 51);

      // Utility for parsing potentially stringified JSON arrays
      const parseJsonArray = (data: any) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (typeof data === 'string') {
          try {
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            return [];
          }
        }
        return [];
      };

      const parsedActuaciones = parseJsonArray(bitacora.actuaciones);
      const parsedIngresos = parseJsonArray(bitacora.ingresos);
      const parsedProgramaciones = parseJsonArray(bitacora.programaciones);

      // 1. Libro de Actuaciones (Siempre mostrar)
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('1. LIBRO DE ACTUACIONES DIARIAS (REGISTRO DE TRÁMITES Y DILIGENCIAS)', 14, finalY + 5);
      
      let actData: any[][] = [];
      if (parsedActuaciones.length > 0) {
        actData = parsedActuaciones.map((a: any) => [a.hora || 'N/A', a.numeroAsunto || 'N/A', a.partes || 'N/A', a.actuacion || 'N/A', a.observaciones || '']);
      } else if (bitacora.content && typeof bitacora.content === 'string' && bitacora.content.trim() !== '') {
        let cleanContent = bitacora.content.replace(/<[^>]*>?/gm, '').trim();
        if (cleanContent.includes('PROGRAMACIÓN FUTURA:')) {
          cleanContent = cleanContent.split('PROGRAMACIÓN FUTURA:')[0].replace('REPORTE HOY:', '').trim();
        }
        if (cleanContent === '' || cleanContent.toLowerCase().includes('sin actuaciones hoy')) {
          actData = [['—', '—', '—', 'Sin actuaciones o trámites registrados en esta jornada', '—']];
        } else {
          actData = [['—', '—', '—', cleanContent || 'Sin detalle adicional', '—']];
        }
      } else {
        actData = [['—', '—', '—', 'Sin actuaciones o trámites registrados en esta jornada', '—']];
      }

      autoTable(doc, {
        startY: finalY + 8,
        head: [['HORA', 'N° ASUNTO', 'PARTES INVOLUCRADAS', 'ACTUACIÓN / DILIGENCIA', 'OBSERVACIONES']],
        body: actData,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5, cellPadding: 3, lineColor: [203, 213, 225], lineWidth: 0.2 },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 3 },
        alternateRowStyles: { fillColor: [252, 253, 254] },
        styles: { lineColor: [226, 232, 240], lineWidth: 0.15 },
        margin: { left: 14, right: 14 }
      });
      finalY = (doc as any).lastAutoTable.finalY + 12;

      // 2. Libro de Ingresos (Siempre mostrar)
      if (finalY > 155) { doc.addPage('landscape'); finalY = 32; }
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('2. LIBRO DE INGRESOS (CAUSAS Y ASUNTOS ASIGNADOS)', 14, finalY + 5);

      let ingData: any[][] = [];
      if (parsedIngresos.length > 0) {
        ingData = parsedIngresos.map((i: any) => [i.tipo || 'N/A', i.numeroExpediente || 'N/A', i.organismoTribunal || 'N/A', i.partes || 'N/A', i.resumen || 'N/A', i.observaciones || '']);
      } else {
        ingData = [['—', '—', '—', '—', 'Sin nuevos ingresos o causas registradas en esta jornada', '—']];
      }

      autoTable(doc, {
        startY: finalY + 8,
        head: [['TIPO ASUNTO', 'N° EXPEDIENTE', 'TRIBUNAL / ORGANISMO', 'PARTES', 'SÍNTESIS DEL ASUNTO', 'OBSERVACIONES']],
        body: ingData,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5, cellPadding: 3, lineColor: [203, 213, 225], lineWidth: 0.2 },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 3 },
        alternateRowStyles: { fillColor: [252, 253, 254] },
        styles: { lineColor: [226, 232, 240], lineWidth: 0.15 },
        margin: { left: 14, right: 14 }
      });
      finalY = (doc as any).lastAutoTable.finalY + 12;

      // 3. Libro de Programación (Siempre mostrar)
      if (finalY > 155) { doc.addPage('landscape'); finalY = 32; }
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('3. LIBRO DE PROGRAMACIÓN (AGENDA DE ACTUACIONES FUTURAS)', 14, finalY + 5);

      let progData: any[][] = [];
      if (parsedProgramaciones.length > 0) {
        progData = parsedProgramaciones.map((p: any) => [`${p.fecha || ''} ${p.hora || ''}`.trim() || 'N/A', p.organismoTribunal || 'N/A', p.tipoActuacion || 'N/A', p.resumen || '—', p.observaciones || '—']);
      } else {
        progData = [['—', '—', '—', 'Sin programación o agenda futura registrada en la jornada', '—']];
      }

      autoTable(doc, {
        startY: finalY + 8,
        head: [['FECHA Y HORA', 'TRIBUNAL / LUGAR', 'ACTUACIÓN A REALIZAR', 'SÍNTESIS', 'OBSERVACIONES / INSTRUCCIONES']],
        body: progData,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5, cellPadding: 3, lineColor: [203, 213, 225], lineWidth: 0.2 },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 3 },
        alternateRowStyles: { fillColor: [252, 253, 254] },
        styles: { lineColor: [226, 232, 240], lineWidth: 0.15 },
        margin: { left: 14, right: 14 }
      });

      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.4);
        doc.line(14, 24, 283, 24);

        if (logoBase64) {
          try {
            doc.addImage(logoBase64, 'PNG', 14, 4, 24, 17, 'logo', 'FAST');
            if ((doc as any).GState) {
              doc.setGState(new (doc as any).GState({ opacity: 0.03 }));
            }
            doc.addImage(logoBase64, 'PNG', 98, 55, 100, 100, 'logo', 'FAST');
            if ((doc as any).GState) {
              doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
            }
          } catch (e) {}
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42);
        doc.text('ROMÁN & DELGADO  |  ABOGADOS', logoBase64 ? 42 : 14, 11);
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('SISTEMA INTEGRAL DE BITÁCORAS Y CONTROL DE GESTIÓN OFICIAL (KANT)', logoBase64 ? 42 : 14, 17.5);
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text('REPORTE OFICIAL DE JORNADA', 283, 11, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Fecha: ${bitacora.date} — Empleado: ${userName}`, 283, 17.5, { align: 'right' });

        doc.setDrawColor(226, 232, 240);
        doc.line(14, 196, 283, 196);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Román & Delgado Abogados — Documento Oficial Confidencial de Uso Interno (Plataforma KANT)', 14, 201);
        doc.text(`Página ${i} de ${totalPages}`, 283, 201, { align: 'right' });
      }

      doc.save(`Bitacora_${userName}_${bitacora.date}_OFICIAL.pdf`);
    } catch (error) {
      console.error('Error generando PDF de respaldo:', error);
      setSystemAlert({
        isOpen: true,
        type: 'error',
        title: 'Error de PDF',
        message: 'Hubo un error al generar el documento oficial en formato PDF. Por favor, verifica tu conexión e intenta de nuevo.'
      });
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 animate-in fade-in duration-500">
      <SystemAlertModal
        isOpen={systemAlert.isOpen}
        type={systemAlert.type}
        title={systemAlert.title}
        message={systemAlert.message}
        onClose={() => setSystemAlert({ ...systemAlert, isOpen: false })}
      />
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <History className="w-7 h-7 text-amber-500" />
          Mi Historial de Bitácoras
        </h3>
        <p className="text-slate-500 font-medium mt-1">Consulta tus reportes pasados y descarga los documentos PDF de cada jornada.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-xs border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Jornada</th>
              <th className="px-6 py-4">Ubicación (GPS)</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                  Cargando tu historial...
                </td>
              </tr>
            ) : historial.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                  Aún no tienes bitácoras registradas en el historial.
                </td>
              </tr>
            ) : (
              historial.map((bitacora) => (
                <tr key={bitacora.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{bitacora.date}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-sm font-medium">
                      <span className="flex items-center gap-1.5 text-emerald-600"><Clock className="w-3.5 h-3.5" /> Entrada: {bitacora.clockIn?.includes(' ') ? bitacora.clockIn.split(' ')[1] : bitacora.clockIn}</span>
                      <span className="flex items-center gap-1.5 text-rose-500"><Clock className="w-3.5 h-3.5" /> Salida: {bitacora.clockOut?.includes(' ') ? bitacora.clockOut.split(' ')[1] : bitacora.clockOut}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-3">
                      {bitacora.ubicacionEntrada && bitacora.ubicacionEntrada !== 'N/A' ? (
                        <div className="flex flex-col items-start gap-1">
                          {bitacora.ubicacionEntrada.includes('|||') && (
                            <span className="text-xs font-bold text-slate-700 leading-tight">{bitacora.ubicacionEntrada.split('|||')[1]}</span>
                          )}
                          <button onClick={() => openMap(bitacora.ubicacionEntrada!)} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors w-max uppercase tracking-wider">
                            <MapPin className="w-3 h-3" /> Entrada
                          </button>
                        </div>
                      ) : <span className="text-xs text-slate-400 font-medium">Sin GPS (Entrada)</span>}
                      
                      {bitacora.ubicacionSalida && bitacora.ubicacionSalida !== 'N/A' ? (
                        <div className="flex flex-col items-start gap-1">
                          {bitacora.ubicacionSalida.includes('|||') && (
                            <span className="text-xs font-bold text-slate-700 leading-tight">{bitacora.ubicacionSalida.split('|||')[1]}</span>
                          )}
                          <button onClick={() => openMap(bitacora.ubicacionSalida!)} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors w-max uppercase tracking-wider">
                            <MapPin className="w-3 h-3" /> Salida
                          </button>
                        </div>
                      ) : <span className="text-xs text-slate-400 font-medium">Sin GPS (Salida)</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                      ${bitacora.status === 'Enviado' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}
                    `}>
                      {bitacora.status === 'Enviado' ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      {bitacora.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {bitacora.pdfBase64 ? (
                      <a 
                        href={bitacora.pdfBase64.startsWith('data:') ? bitacora.pdfBase64 : `data:application/pdf;base64,${bitacora.pdfBase64}`} 
                        download={`Bitacora_${bitacora.date}.pdf`}
                        className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-md text-xs"
                      >
                        <Download className="w-4 h-4" /> PDF
                      </a>
                    ) : (
                      <button
                        onClick={() => generateFallbackPdf(bitacora)}
                        className="inline-flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-3.5 py-2 rounded-xl transition-all shadow-md text-xs"
                        title="Generar y descargar documento oficial PDF al instante con los datos registrados"
                      >
                        <FileText className="w-3.5 h-3.5" /> Generar PDF
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
