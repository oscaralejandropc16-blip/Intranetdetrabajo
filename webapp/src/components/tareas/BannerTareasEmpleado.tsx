import { useState, useEffect, useCallback } from 'react';
import { 
  CheckSquare, CheckCircle2, Play, Send, 
  ChevronDown, ChevronUp, Copy, Scale, Calendar, User, Clock
} from 'lucide-react';
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
    <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-lg mb-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* ENCABEZADO */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-sm shadow-amber-500/20 shrink-0">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-white">
                Tareas Asignadas por Dirección
              </h3>
              {tareasPendientes.length > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 shadow-xs animate-pulse">
                  {tareasPendientes.length} Pendiente{tareasPendientes.length > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Al día
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Al culminar una tarea, se añade automáticamente a tu Bitácora Diaria
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pestañas compactas: Pendientes vs Completadas */}
          <div className="flex items-center bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => {
                setPestana('pendientes');
                if (collapsed) setCollapsed(false);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                pestana === 'pendientes'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Pendientes</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                pestana === 'pendientes' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
              }`}>
                {tareasPendientes.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPestana('completadas');
                if (collapsed) setCollapsed(false);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                pestana === 'completadas'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Completadas</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                pestana === 'completadas' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
              }`}>
                {tareasCompletadas.length}
              </span>
            </button>
          </div>

          {/* Botón Minimizar/Expandir */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            title={collapsed ? 'Ver tareas' : 'Minimizar tareas'}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* CONTENIDO DESPLEGABLE */}
      {!collapsed && (
        <div className="mt-3 relative z-10">
          
          {/* Mensaje de vacío según la pestaña */}
          {pestana === 'pendientes' && tareasPendientes.length === 0 && (
            <div className="bg-slate-950/50 border border-emerald-500/30 rounded-xl p-3.5 text-center flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-left">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-300">¡Al día! No tienes tareas pendientes de Jefatura.</p>
                  <p className="text-[11px] text-slate-400">Todas las instrucciones asignadas han sido culminadas e integradas a tu bitácora.</p>
                </div>
              </div>
              {tareasCompletadas.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPestana('completadas')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Ver {tareasCompletadas.length} completadas &rarr;
                </button>
              )}
            </div>
          )}

          {pestana === 'completadas' && tareasCompletadas.length === 0 && (
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-center">
              <Clock className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <p className="text-xs font-semibold text-slate-300">Aún no has completado tareas hoy.</p>
            </div>
          )}

          {/* LISTA CON SCROLL COMPACTO: No empuja la bitácora hacia abajo */}
          {tareasAMostrar.length > 0 && (
            <div className="max-h-[340px] overflow-y-auto space-y-2.5 pr-1.5 scrollbar-thin">
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
                        ? 'bg-slate-950/40 border-slate-800/80'
                        : t.prioridad === 'urgente'
                        ? 'bg-slate-950/80 border-rose-500/50 shadow-sm'
                        : 'bg-slate-950/70 border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      
                      {/* DETALLES DE LA TAREA */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Prioridad */}
                          {t.prioridad === 'urgente' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                              🔥 URGENTE
                            </span>
                          )}
                          {t.prioridad === 'alta' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                              ⚡ ALTA
                            </span>
                          )}

                          {/* Estado */}
                          {t.estado === 'pendiente' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              🟡 Por Iniciar
                            </span>
                          )}
                          {t.estado === 'en_proceso' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              🔵 En Progreso
                            </span>
                          )}
                          {esCompletada && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Completada
                            </span>
                          )}

                          {t.expediente_asociado && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                              <Scale className="w-3 h-3 text-indigo-400" />
                              Exp: {t.expediente_asociado}
                            </span>
                          )}
                        </div>

                        <h4 className={`text-sm font-bold ${esCompletada ? 'line-through text-slate-400' : 'text-white'}`}>
                          {t.titulo}
                        </h4>

                        {t.descripcion && (
                          <p className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 whitespace-pre-line leading-relaxed">
                            {t.descripcion}
                          </p>
                        )}

                        {t.respuesta_empleado && (
                          <div className="bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl text-xs text-emerald-200 space-y-1">
                            <div className="flex items-center gap-1 font-bold text-emerald-300 text-[11px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Tu reporte de cumplimiento enviado a Jefatura:</span>
                            </div>
                            <p className="italic text-emerald-100 bg-emerald-900/30 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 text-[11px]">
                              "{t.respuesta_empleado}"
                            </p>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 pt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3 h-3 text-amber-400" />
                            Asignado por: <strong className="text-slate-200">{t.asignado_por}</strong>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            Límite: <strong className={t.prioridad === 'urgente' ? 'text-rose-400' : 'text-slate-200'}>{fechaLimiteText}</strong>
                          </span>
                        </div>

                      </div>

                      {/* ACCIONES DEL EMPLEADO */}
                      <div className="flex flex-wrap md:flex-nowrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800 shrink-0">
                        
                        {/* Botón Iniciar Tarea */}
                        {t.estado === 'pendiente' && (
                          <button
                            onClick={() => handleStartTask(t.id)}
                            disabled={savingId === t.id}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Comenzar</span>
                          </button>
                        )}

                        {/* Botón Completar (Abre el campo de reporte y lo agrega directo a la bitácora) */}
                        {!esCompletada && (
                          <button
                            onClick={() => {
                              setReportingId(reportingId === t.id ? null : t.id);
                              setReportComment('');
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{reportingId === t.id ? 'Cancelar' : 'Completar'}</span>
                          </button>
                        )}

                        {/* Botón Pasar a mi Bitácora (por si ya estaba completada o quiere pasarlo manualmente) */}
                        {onCopiarABitacora && (
                          <button
                            onClick={() => handleCopiarABitacora(t)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer ${
                              copiedId === t.id
                                ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
                            }`}
                            title="Asegurar o agregar nuevamente en tu Libro de Actuaciones de hoy"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedId === t.id ? '¡En tu Bitácora!' : 'Pasar a Bitácora'}</span>
                          </button>
                        )}

                      </div>

                    </div>

                    {/* FORMULARIO DE REPORTE AL COMPLETAR: Informa a Jefatura y pasa directo a bitácora */}
                    {reportingId === t.id && (
                      <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row gap-2 animate-in fade-in duration-150">
                        <input
                          type="text"
                          value={reportComment}
                          onChange={e => setReportComment(e.target.value)}
                          placeholder="Escribe brevemente tu reporte (ej. 'Listo, diligencia consignada en tribunal')..."
                          className="flex-1 px-3 py-2 bg-slate-900 border border-emerald-500/50 rounded-xl text-xs text-white outline-none focus:border-emerald-400"
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
                          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{savingId === t.id ? 'Guardando...' : 'Completar y Pasar a Bitácora'}</span>
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
