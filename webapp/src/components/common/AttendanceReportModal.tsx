import { useState, useEffect, useMemo } from 'react';
import { X, FileText, Calendar, Clock, Download, CheckCircle, ShieldCheck, Loader2, MapPin } from 'lucide-react';
import { exportarReporteAsistenciaPDF, calcDuration, type BitacoraAsistenciaItem } from '../../lib/pdfExportAsistencia';
import { supabase } from '../../lib/supabase';

interface AttendanceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmployee?: string;
}

export default function AttendanceReportModal({
  isOpen,
  onClose,
  initialEmployee = 'Carmen Luisa'
}: AttendanceReportModalProps) {
  const [selectedEmployee, setSelectedEmployee] = useState(initialEmployee);
  const [periodPreset, setPeriodPreset] = useState<'ultimos_2_meses' | 'agosto' | 'septiembre' | 'todos' | 'personalizado'>('ultimos_2_meses');
  const [customStart, setCustomStart] = useState('2026-08-01');
  const [customEnd, setCustomEnd] = useState('2026-09-30');
  const [loading, setLoading] = useState(false);
  const [bitacoras, setBitacoras] = useState<BitacoraAsistenciaItem[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Cargar bitácoras de Supabase para el empleado seleccionado
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('bitacoras')
          .select('id, user_name, fecha, hora_entrada, hora_salida, total_horas, estado, supervisado_por, actuaciones, tareas, resumen')
          .order('fecha', { ascending: true });

        const empLower = selectedEmployee.toLowerCase();
        if (empLower.includes('carmen')) {
          query = query.ilike('user_name', '%carmen%');
        } else if (empLower.includes('mariela')) {
          query = query.ilike('user_name', '%mariela%');
        } else if (empLower.includes('hector')) {
          query = query.ilike('user_name', '%hector%');
        } else if (empLower.includes('oscar')) {
          query = query.ilike('user_name', '%oscar%');
        }

        const { data, error } = await query;
        if (!error && data && isMounted) {
          setBitacoras(data);
        }
      } catch (err) {
        console.error('Error fetching attendance records:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedEmployee]);

  // Filtrar según el período seleccionado
  const filteredBitacoras = useMemo(() => {
    return bitacoras.filter(b => {
      const f = b.fecha || b.date || '';
      if (!f) return false;

      if (periodPreset === 'ultimos_2_meses') {
        return f >= '2026-08-01' && f <= '2026-09-30';
      }
      if (periodPreset === 'agosto') {
        return f.startsWith('2026-08');
      }
      if (periodPreset === 'septiembre') {
        return f.startsWith('2026-09');
      }
      if (periodPreset === 'personalizado') {
        return f >= customStart && f <= customEnd;
      }
      return true; // todos
    });
  }, [bitacoras, periodPreset, customStart, customEnd]);

  // Cálculos estadísticos
  const stats = useMemo(() => {
    let totalMinutes = 0;
    filteredBitacoras.forEach(b => {
      const dur = calcDuration(b.hora_entrada || b.clockIn, b.hora_salida || b.clockOut);
      totalMinutes += dur.diffMin;
    });

    const count = filteredBitacoras.length;
    const avgMinutes = count > 0 ? Math.round(totalMinutes / count) : 0;

    return {
      count,
      totalHours: Math.floor(totalMinutes / 60),
      totalRemainingMins: totalMinutes % 60,
      avgHours: Math.floor(avgMinutes / 60),
      avgRemainingMins: avgMinutes % 60,
      totalMinutes
    };
  }, [filteredBitacoras]);

  const getPeriodLabel = () => {
    switch (periodPreset) {
      case 'ultimos_2_meses':
        return 'Agosto y Septiembre de 2026';
      case 'agosto':
        return 'Mes de Agosto de 2026';
      case 'septiembre':
        return 'Mes de Septiembre de 2026';
      case 'todos':
        return 'Historial Completo Registrado';
      case 'personalizado':
        return `Del ${customStart} al ${customEnd}`;
    }
  };

  const handleDownload = async () => {
    setGeneratingPdf(true);
    try {
      await exportarReporteAsistenciaPDF({
        employeeName: selectedEmployee,
        employeeEmail: selectedEmployee.toLowerCase().includes('carmen') ? 'abgcarmendelgado.990@gmail.com' : undefined,
        employeeRole: 'Abogada / Gestión de Despacho y Tribunales',
        periodLabel: getPeriodLabel(),
        bitacoras: filteredBitacoras
      });
    } catch (e) {
      console.error('Error generando PDF:', e);
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabecera del Modal */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-amber-500/30 relative">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  Auditoría Laboral
                </span>
                <span className="text-[10px] text-slate-400 font-bold">R&D Abogados</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5">
                Reporte de Horas de Entrada y Salida (PDF)
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Controles de Selección */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Selector de Empleado */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Empleado Titular
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all cursor-pointer"
              >
                <option value="Carmen Luisa">Carmen Luisa Delgado</option>
                <option value="Mariela Isabel">Mariela Isabel</option>
                <option value="Hector">Héctor</option>
                <option value="oscarpc20">oscarpc20 (Pruebas)</option>
              </select>
            </div>

            {/* Selector de Período */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Período a Auditar
              </label>
              <select
                value={periodPreset}
                onChange={(e) => setPeriodPreset(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all cursor-pointer"
              >
                <option value="ultimos_2_meses">Últimos 2 Meses (Agosto y Septiembre 2026)</option>
                <option value="agosto">Solo Mes de Agosto 2026</option>
                <option value="septiembre">Solo Mes de Septiembre 2026</option>
                <option value="todos">Todo el Historial Registrado</option>
                <option value="personalizado">Personalizado (Rango específico)</option>
              </select>
            </div>
          </div>

          {/* Rango de Fechas Personalizado */}
          {periodPreset === 'personalizado' && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-amber-50/50 rounded-2xl border border-amber-200/50 animate-in fade-in">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha Inicial</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha Final</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
                />
              </div>
            </div>
          )}

          {/* Tarjetas de Métricas Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-left">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Jornadas</span>
              <p className="text-xl font-black text-slate-900 mt-0.5">{stats.count} Días</p>
              <span className="text-[10px] text-slate-500 font-medium">Registrados</span>
            </div>

            <div className="bg-blue-50/50 p-3.5 rounded-2xl border border-blue-100 text-left">
              <span className="text-[10px] font-bold uppercase text-blue-600 block tracking-wider">Tiempo Total</span>
              <p className="text-xl font-black text-blue-900 mt-0.5">{stats.totalHours}h {stats.totalRemainingMins}m</p>
              <span className="text-[10px] text-blue-600 font-medium">Horas de servicio</span>
            </div>

            <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100 text-left">
              <span className="text-[10px] font-bold uppercase text-emerald-600 block tracking-wider">Promedio Diario</span>
              <p className="text-xl font-black text-emerald-900 mt-0.5">{stats.avgHours}h {stats.avgRemainingMins}m</p>
              <span className="text-[10px] text-emerald-600 font-medium">Por jornada</span>
            </div>

            <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-100 text-left">
              <span className="text-[10px] font-bold uppercase text-amber-700 block tracking-wider">Estado Auditoría</span>
              <p className="text-base font-black text-amber-900 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-amber-600 inline" /> 100% OK
              </p>
              <span className="text-[10px] text-amber-700 font-medium">Con trazabilidad</span>
            </div>
          </div>

          {/* Tabla Resumen de Muestra */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Desglose de Jornadas ({filteredBitacoras.length} registros)
              </h4>
              <span className="text-[11px] font-medium text-slate-400">
                {getPeriodLabel()}
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  <span className="text-xs font-medium">Cargando registros de bitácoras...</span>
                </div>
              ) : filteredBitacoras.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  No se encontraron bitácoras para los filtros seleccionados.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold tracking-wider sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Entrada</th>
                      <th className="py-2.5 px-3">Salida</th>
                      <th className="py-2.5 px-3">Ubicación & GPS</th>
                      <th className="py-2.5 px-3 text-center">Duración</th>
                      <th className="py-2.5 px-3 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBitacoras.map((b, idx) => {
                      const dur = calcDuration(b.hora_entrada || b.clockIn, b.hora_salida || b.clockOut);
                      const inLoc = b.ubicacion_entrada || b.ubicacionEntrada || '';
                      const isGps = inLoc.includes('GPS Verificado');
                      const isIp = inLoc.includes('Red IP') || inLoc.includes('CANTV') || inLoc.includes('Digitel');
                      const locCoords = inLoc.includes('|||') ? inLoc.split('|||')[0] : '';
                      const locName = inLoc.includes('|||')
                        ? inLoc.split('|||')[1].replace(/\(.*\)/, '').trim()
                        : (inLoc ? inLoc.replace(/\(.*\)/, '').trim() : '');

                      return (
                        <tr key={b.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 font-bold text-slate-800 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {b.fecha || b.date}
                          </td>
                          <td className="py-2 px-3 font-semibold text-emerald-600">
                            {b.hora_entrada || b.clockIn || 'N/R'}
                          </td>
                          <td className="py-2 px-3 font-semibold text-rose-500">
                            {b.hora_salida || b.clockOut || 'N/R'}
                          </td>
                          <td className="py-2 px-3">
                            {inLoc && inLoc !== 'N/A' && inLoc !== 'N/R' ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isGps ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded shadow-2xs" title={inLoc}>
                                    <MapPin className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                    <span>{locName || 'GPS'} (🛰️ GPS)</span>
                                  </span>
                                ) : isIp ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded" title="Marcaje sin GPS satelital verificado (Conexión por IP)">
                                    <MapPin className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                    <span>{locName || 'Red IP'} (⚠️ IP)</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-600 font-medium truncate max-w-[130px] inline-block" title={inLoc}>
                                    {inLoc}
                                  </span>
                                )}
                                {locCoords && (
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${locCoords}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline inline-flex items-center"
                                    title="Ver punto satelital en Google Maps"
                                  >
                                    Maps
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Sin registro</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-700">
                            {dur.text}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              (b.estado === 'aprobado' || b.status === 'Revisado')
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {b.estado || b.status || 'Enviado'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Pie del Modal con Botones */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Formato oficial membretado listo para firma y archivo institucional.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Enlace directo al archivo estático pre-generado si es Carmen en Agosto/Septiembre */}
            {selectedEmployee.toLowerCase().includes('carmen') && periodPreset === 'ultimos_2_meses' && (
              <a
                href="/Reporte_Horas_Carmen_Agosto_Septiembre_2026.pdf"
                download="Reporte_Horas_Carmen_Agosto_Septiembre_2026.pdf"
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Descarga Directa
              </a>
            )}

            <button
              onClick={handleDownload}
              disabled={generatingPdf || filteredBitacoras.length === 0}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {generatingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generando PDF...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" /> Generar y Descargar PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
