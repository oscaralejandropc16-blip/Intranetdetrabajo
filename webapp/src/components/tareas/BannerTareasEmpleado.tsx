import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { TareaAsignada } from '../../types/tareas';
import type { Actuacion } from '../../types/libros';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BannerTareasEmpleadoProps {
  currentUserName: string;
  onCopiarABitacora?: (actuacion: Partial<Actuacion>) => void;
}

export default function BannerTareasEmpleado({ currentUserName, onCopiarABitacora }: BannerTareasEmpleadoProps) {
  const [tareas, setTareas] = useState<TareaAsignada[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [pestana, setPestana] = useState<'pendientes' | 'completadas'>('pendientes');
  const [reportingId, setReportingId] = useState<number | null>(null);
  const [reportComment, setReportComment] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const cleanName = (currentUserName || '').toLowerCase().trim();

  // 1. Cargar tareas asignadas a este empleado
  const fetchMisTareas = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!cleanName) return;

    try {
      const { data, error } = await supabase
        .from('tareas_asignadas')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Filtrar tareas dirigidas a este usuario
        const misTareas = (data as TareaAsignada[]).filter(t => {
          const dest = (t.asignado_a || '').toLowerCase().trim();
          const destNombre = (t.asignado_a_nombre || '').toLowerCase().trim();
          return dest.includes(cleanName) || cleanName.includes(dest) || destNombre.includes(cleanName) || cleanName.includes(destNombre);
        });
        setTareas(misTareas);

        // Si no tiene tareas pendientes, mantener colapsado para no estorbar la bitácora
        const pendientes = misTareas.filter(t => t.estado !== 'completada');
        if (pendientes.length === 0) {
          setCollapsed(true);
        }
      }
    } catch (e) {
      console.warn('Error al consultar tareas del empleado:', e);
    } finally {
      setLoading(false);
    }
  }, [cleanName]);

  useEffect(() => {
    fetchMisTareas();

    const handleVisibility = () => {
      if (!document.hidden) fetchMisTareas();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchMisTareas]);

  // 2. Iniciar tarea (marcar en progreso)
  const handleStartTask = async (id: number) => {
    setSavingId(id);
    try {
      const { error } = await supabase
        .from('tareas_asignadas')
        .update({ estado: 'en_proceso' })
        .eq('id', id);

      if (!error) {
        setTareas(prev => prev.map(t => t.id === id ? { ...t, estado: 'en_proceso' } : t));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingId(null);
    }
  };

  // 3. Pasar a la Bitácora Diaria del empleado
  const handleCopiarABitacora = (t: TareaAsignada, comentarioExtra?: string) => {
    if (!onCopiarABitacora) return;

    const textoReporte = comentarioExtra || t.respuesta_empleado || '';
    const obsFinal = textoReporte 
      ? `${textoReporte}${t.descripcion ? ` — Instrucción: ${t.descripcion}` : ''}`
      : (t.descripcion ? `${t.descripcion}` : 'Tarea asignada por Dirección ejecutada y culminada.');

    onCopiarABitacora({
      hora: format(new Date(), 'hh:mm a'),
      numeroAsunto: t.expediente_asociado || 'Instrucción de Jefatura',
      partes: `Asignado por: ${t.asignado_por}`,
      actuacion: t.titulo,
      observaciones: obsFinal,
      estado: 'Completada'
    });

    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 3500);
  };

  // 4. Completar tarea con reporte de observaciones y AUTOMÁTICAMENTE pasarla a la Bitácora
  const handleCompleteTask = async (id: number) => {
    setSavingId(id);
    const finalReport = reportComment.trim() || 'Tarea completada satisfactoriamente.';
    const nowIso = new Date().toISOString();

    try {
      const payload = {
        estado: 'completada' as const,
        respuesta_empleado: finalReport,
        completada_en: nowIso
      };

      const { error } = await supabase
        .from('tareas_asignadas')
        .update(payload)
        .eq('id', id);

      if (!error) {
        const tareaActual = tareas.find(t => t.id === id);
        setTareas(prev => prev.map(t => t.id === id ? { ...t, ...payload } : t));
        setReportingId(null);
        setReportComment('');

        // AUTOMÁTICAMENTE AGREGAR A LA BITÁCORA DEL DÍA
        if (tareaActual) {
          handleCopiarABitacora(tareaActual, finalReport);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingId(null);
    }
  };

  const tareasPendientes = tareas.filter(t => t.estado !== 'completada');
  const tareasCompletadas = tareas.filter(t => t.estado === 'completada');

  if (loading || tareas.length === 0) {
    return null; // Si no tiene tareas asignadas, no ocupa espacio
  }

  const tareasAMostrar = pestana === 'pendientes' ? tareasPendientes : tareasCompletadas;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs mb-4">
      {/* ENCABEZADO */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              Tareas Asignadas por Dirección
            </h3>
            {tareasPendientes.length > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {tareasPendientes.length} Pendiente{tareasPendientes.length > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Al día
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Al culminar una tarea, se añade automáticamente a tu Bitácora Diaria
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Pestañas compactas: Pendientes vs Completadas */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => {
                setPestana('pendientes');
                if (collapsed) setCollapsed(false);
              }}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                pestana === 'pendientes'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pendientes ({tareasPendientes.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setPestana('completadas');
                if (collapsed) setCollapsed(false);
              }}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                pestana === 'completadas'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completadas ({tareasCompletadas.length})
            </button>
          </div>

          {/* Botón Minimizar/Expandir */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
          >
            {collapsed ? 'Ver tareas' : 'Minimizar'}
          </button>
        </div>
      </div>

      {/* CONTENIDO DESPLEGABLE */}
      {!collapsed && (
        <div className="mt-3">
          
          {/* Mensaje de vacío según la pestaña */}
          {pestana === 'pendientes' && tareasPendientes.length === 0 && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-center flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-left">
                <p className="text-xs font-bold text-emerald-900">Al día: No tienes tareas pendientes de Jefatura.</p>
                <p className="text-xs text-emerald-700">Todas las instrucciones asignadas han sido culminadas e integradas a tu bitácora.</p>
              </div>
              {tareasCompletadas.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPestana('completadas')}
                  className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-900 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer shrink-0"
                >
                  Ver {tareasCompletadas.length} completadas
                </button>
              )}
            </div>
          )}

          {pestana === 'completadas' && tareasCompletadas.length === 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-xs font-semibold text-slate-600">Aún no has completado tareas hoy.</p>
            </div>
          )}

          {/* LISTA CON SCROLL COMPACTO: No empuja la bitácora hacia abajo */}
          {tareasAMostrar.length > 0 && (
            <div className="max-h-[340px] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
              {tareasAMostrar.map(t => {
                const fechaLimiteText = t.fecha_limite ? (() => {
                  try {
                    return format(new Date(t.fecha_limite + 'T12:00:00'), "d 'de' MMMM", { locale: es });
                  } catch {
                    return t.fecha_limite;
                  }
                })() : 'Sin fecha límite';

                const esCompletada = t.estado === 'completada';

                return (
                  <div
                    key={t.id}
                    className={`rounded-xl border p-3.5 transition-all duration-200 ${
                      esCompletada
                        ? 'bg-slate-50/70 border-slate-200'
                        : t.prioridad === 'urgente'
                        ? 'bg-red-50/40 border-red-200 shadow-xs'
                        : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      
                      {/* DETALLES DE LA TAREA */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Prioridad */}
                          {t.prioridad === 'urgente' && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
                              Urgente
                            </span>
                          )}
                          {t.prioridad === 'alta' && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                              Alta
                            </span>
                          )}

                          {/* Estado */}
                          {t.estado === 'pendiente' && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                              Por Iniciar
                            </span>
                          )}
                          {t.estado === 'en_proceso' && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                              En Progreso
                            </span>
                          )}
                          {esCompletada && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Completada
                            </span>
                          )}

                          {t.expediente_asociado && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Exp: {t.expediente_asociado}
                            </span>
                          )}
                        </div>

                        <h4 className={`text-sm font-bold ${esCompletada ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                          {t.titulo}
                        </h4>

                        {t.descripcion && (
                          <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200 whitespace-pre-line leading-relaxed">
                            {t.descripcion}
                          </p>
                        )}

                        {t.respuesta_empleado && (
                          <div className="bg-emerald-50/80 border border-emerald-200 p-2.5 rounded-lg text-xs text-slate-800 space-y-1">
                            <span className="block font-bold text-emerald-900 text-[11px]">
                              Reporte de cumplimiento enviado a Jefatura:
                            </span>
                            <p className="italic text-slate-800 bg-white/80 px-2.5 py-1.5 rounded border border-emerald-200/60 text-xs">
                              "{t.respuesta_empleado}"
                            </p>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 pt-0.5">
                          <span>
                            Asignado por: <strong className="text-slate-700">{t.asignado_por}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Fecha límite: <strong className={t.prioridad === 'urgente' ? 'text-red-700' : 'text-slate-700'}>{fechaLimiteText}</strong>
                          </span>
                        </div>

                      </div>

                      {/* ACCIONES DEL EMPLEADO */}
                      <div className="flex flex-wrap md:flex-nowrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                        
                        {/* Botón Iniciar Tarea */}
                        {t.estado === 'pendiente' && (
                          <button
                            onClick={() => handleStartTask(t.id)}
                            disabled={savingId === t.id}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
                          >
                            Comenzar
                          </button>
                        )}

                        {/* Botón Completar (Abre el campo de reporte y lo agrega directo a la bitácora) */}
                        {!esCompletada && (
                          <button
                            onClick={() => {
                              setReportingId(reportingId === t.id ? null : t.id);
                              setReportComment('');
                            }}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
                          >
                            {reportingId === t.id ? 'Cancelar' : 'Completar'}
                          </button>
                        )}

                        {/* Botón Pasar a mi Bitácora (por si ya estaba completada o quiere pasarlo manualmente) */}
                        {onCopiarABitacora && (
                          <button
                            onClick={() => handleCopiarABitacora(t)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              copiedId === t.id
                                ? 'bg-emerald-600 text-white font-black'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                            }`}
                            title="Asegurar o agregar nuevamente en tu Libro de Actuaciones de hoy"
                          >
                            {copiedId === t.id ? 'En tu Bitácora' : 'Pasar a Bitácora'}
                          </button>
                        )}

                      </div>

                    </div>

                    {/* FORMULARIO DE REPORTE AL COMPLETAR: Informa a Jefatura y pasa directo a bitácora */}
                    {reportingId === t.id && (
                      <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col sm:flex-row gap-2 animate-in fade-in duration-150">
                        <input
                          type="text"
                          value={reportComment}
                          onChange={e => setReportComment(e.target.value)}
                          placeholder="Escribe brevemente tu reporte (ej. 'Listo, diligencia consignada en tribunal')..."
                          className="flex-1 px-3 py-2 bg-white border border-emerald-400 rounded-lg text-xs text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCompleteTask(t.id);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleCompleteTask(t.id)}
                          disabled={savingId === t.id}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shrink-0"
                        >
                          {savingId === t.id ? 'Guardando...' : 'Completar y Pasar a Bitácora'}
                        </button>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
