import { useState, useEffect } from 'react';
import { History, Download, CheckCircle2, AlertCircle, Clock, MapPin } from 'lucide-react';
import api from '../../lib/api';

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
                      <span 
                        className="text-xs text-slate-400 font-medium cursor-help border-b border-dotted border-slate-400"
                        title="El archivo PDF de este reporte anterior no se pudo adjuntar al servidor en ese momento (o superó el límite de peso del WAF/hosting), por lo cual en esa ocasión se guardó de forma directa solo en tu dispositivo/PC."
                      >
                        No disponible (?)
                      </span>
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
