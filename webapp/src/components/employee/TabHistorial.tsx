import { useState, useEffect } from 'react';
import { History, Download, CheckCircle2, AlertCircle, Clock, MapPin, FileText } from 'lucide-react';
import api from '../../lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BitacoraHistorial {
  id: number;
  date: string;
  clockIn: string;
  clockOut: string;
  status: string;
  ubicacionEntrada?: string;
  ubicacionSalida?: string;
  pdfBase64: string;
}

export default function TabHistorial() {
  const [historial, setHistorial] = useState<BitacoraHistorial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/rd-intranet/v1/my-history');
        if (response.data && Array.isArray(response.data)) {
          setHistorial(response.data);
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
      const doc = new jsPDF('landscape');
      const primaryColor: [number, number, number] = [15, 23, 42];
      const accentColor: [number, number, number] = [245, 158, 11];

      let logoBase64: string | null = null;
      try {
        const res = await fetch('/logo.png');
        const blob = await res.blob();
        logoBase64 = await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn('No se pudo cargar el logo para PDF', e);
      }

      if (logoBase64 && (doc as any).GState) {
        try {
          doc.setGState(new (doc as any).GState({ opacity: 0.07 }));
          doc.addImage(logoBase64, 'PNG', 98, 55, 100, 100);
          doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
        } catch (e) {}
      }

      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 297, 24, 'F');

      if (logoBase64) {
        try { doc.addImage(logoBase64, 'PNG', 14, 3.5, 22, 17); } catch (e) {}
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text('ROMÁN & DELGADO  |  ABOGADOS', logoBase64 ? 42 : 14, 11);

      doc.setFontSize(8.5);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text('SISTEMA INTEGRAL DE BITÁCORAS Y CONTROL DE GESTIÓN OFICIAL (KANT)', logoBase64 ? 42 : 14, 17.5);

      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text('REPORTE OFICIAL DE JORNADA', 283, 11, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225);
      const userName = localStorage.getItem('rd_user_name') || 'Empleado';
      doc.text(`Fecha: ${bitacora.date} — Empleado: ${userName}`, 283, 17.5, { align: 'right' });

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 34, 269, 26, 2.5, 2.5, 'FD');

      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('EMPLEADO / ABOGADO:', 18, 43);
      doc.setFont('helvetica', 'normal');
      doc.text(userName, 68, 43);

      doc.setFont('helvetica', 'bold');
      doc.text('FECHA DE JORNADA:', 18, 53);
      doc.setFont('helvetica', 'normal');
      doc.text(bitacora.date, 68, 53);

      doc.setFont('helvetica', 'bold');
      doc.text('HORARIO DE REGISTRO:', 145, 43);
      doc.setFont('helvetica', 'normal');
      doc.text(`Entrada: ${bitacora.clockIn || 'N/A'}  —  Salida: ${bitacora.clockOut || 'N/A'}`, 198, 43);

      doc.setFont('helvetica', 'bold');
      doc.text('UBICACIONES GPS:', 145, 53);
      doc.setFont('helvetica', 'normal');
      const cleanIn = bitacora.ubicacionEntrada ? (bitacora.ubicacionEntrada.includes('|||') ? bitacora.ubicacionEntrada.split('|||')[1] : bitacora.ubicacionEntrada) : 'N/A';
      const cleanOut = bitacora.ubicacionSalida ? (bitacora.ubicacionSalida.includes('|||') ? bitacora.ubicacionSalida.split('|||')[1] : bitacora.ubicacionSalida) : 'N/A';
      doc.text(`In: ${cleanIn.substring(0, 20)} | Out: ${cleanOut.substring(0, 20)}`, 198, 53);

      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(14, 70, 3, 6, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('ESTADO Y RESUMEN OFICIAL DE LA BITÁCORA EN BASE DE DATOS KANT', 19, 74.5);

      autoTable(doc, {
        startY: 80,
        head: [['PARÁMETRO REGISTRADO', 'INFORMACIÓN OFICIAL DEL EXPEDIENTE']],
        body: [
          ['Estado de Revisión', bitacora.status || 'Enviado'],
          ['ID de Registro KANT', `#${bitacora.id}`],
          ['Coordenadas de Entrada', bitacora.ubicacionEntrada || 'N/A'],
          ['Coordenadas de Salida', bitacora.ubicacionSalida || 'N/A'],
          ['Certificación del Sistema', 'Documento regenerado desde registros oficiales en Plataforma KANT']
        ],
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: 50 },
        columnStyles: { 0: { cellWidth: 70, fontStyle: 'bold' } },
        margin: { left: 14, right: 14 }
      });

      doc.setDrawColor(226, 232, 240);
      doc.line(14, 196, 283, 196);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Román & Delgado Abogados — Documento Oficial Confidencial de Uso Interno (Plataforma KANT)', 14, 201);

      doc.save(`Bitacora_${userName}_${bitacora.date}_OFICIAL.pdf`);
    } catch (error) {
      console.error('Error generando PDF de respaldo:', error);
      alert('Hubo un error al generar el PDF. Por favor reintenta.');
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 animate-in fade-in duration-500">
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
                        href={bitacora.pdfBase64} 
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
