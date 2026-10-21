import { useState, useEffect, useCallback } from 'react';
import { 
  CheckSquare, CheckCircle2, Play, Send, 
  ChevronDown, ChevronUp, Copy, Scale, Calendar, User
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

  // 3. Completar tarea con reporte de observaciones
  const handleCompleteTask = async (id: number) => {
    setSavingId(id);
    try {
      const payload = {
        estado: 'completada' as const,
        respuesta_empleado: reportComment.trim() || 'Tarea completada satisfactoriamente.',
        completada_en: new Date().toISOString()
      };

      const { error } = await supabase
        .from('tareas_asignadas')
        .update(payload)
        .eq('id', id);

      if (!error) {
        setTareas(prev => prev.map(t => t.id === id ? { ...t, ...payload } : t));
        setReportingId(null);
        setReportComment('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingId(null);
    }
  };

  // 4. Pasar a la Bitácora Diaria del empleado con 1 clic
  const handleCopiarABitacora = (t: TareaAsignada) => {
    if (!onCopiarABitacora) return;

    onCopiarABitacora({
      hora: format(new Date(), 'hh:mm a'),
      numeroAsunto: t.expediente_asociado || 'Instrucción de Jefatura',
      partes: `Asignado por: ${t.asignado_por}`,
      actuacion: t.titulo,
      observaciones: t.descripcion ? `${t.descripcion}` : 'Tarea asignada por Dirección ejecutada.',
      estado: t.estado === 'completada' ? 'Completada' : 'En trámite'
    });

    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const tareasPendientes = tareas.filter(t => t.estado !== 'completada');
  const tareasCompletadas = tareas.filter(t => t.estado === 'completada');

  if (loading || tareas.length === 0) {
    return null; // Si no tiene tareas asignadas, no ocupa espacio
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-950 border border-amber-500/35 rounded-3xl p-5 sm:p-6 shadow-xl mb-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ENCABEZADO */}
      <div className="relative z-10 flex items-center justify-between gap-4 pb-3 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/30">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white">
                Tareas Asignadas por Dirección
              </h3>
              {tareasPendientes.length > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-sm animate-pulse">
                  {tareasPendientes.length} Pendiente{tareasPendientes.length > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500 text-slate-950 shadow-sm">
                  {tareasCompletadas.length} Completada{tareasCompletadas.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300">
              Instrucciones y diligencias directas de Jefatura para tu jornada
            </p>
          </div>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all cursor-pointer"
          title={collapsed ? 'Ver tareas' : 'Minimizar'}
        >
          {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </button>
      </div>

      {/* CONTENIDO DESPLEGABLE */}
      {!collapsed && (
        <div className="mt-4 space-y-3 relative z-10">
          
          {tareasPendientes.length === 0 && (
            <div className="bg-slate-900/60 border border-emerald-500/30 rounded-2xl p-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
              <p className="text-sm font-bold text-emerald-300">¡Al día! No tienes tareas pendientes de Jefatura.</p>
              <p className="text-xs text-slate-400">Todas las instrucciones asignadas han sido completadas.</p>
            </div>
          )}

          {tareas.map(t => {
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
                className={`rounded-2xl border p-4 transition-all duration-200 ${
                  esCompletada
                    ? 'bg-slate-900/40 border-slate-700/50 opacity-80'
                    : t.prioridad === 'urgente'
                    ? 'bg-slate-900/90 border-rose-500/60 shadow-lg shadow-rose-950/30'
                    : 'bg-slate-900/85 border-slate-700'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  
                  {/* DETALLES DE LA TAREA */}
                  <div className="space-y-1.5 flex-1">
                    
                    <div className="flex flex-wrap items-center gap-2">
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
                      <p className="text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 whitespace-pre-line">
                        {t.descripcion}
                      </p>
                    )}

                    {t.respuesta_empleado && (
                      <div className="bg-emerald-950/50 border border-emerald-500/40 p-3 rounded-2xl text-xs text-emerald-200 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Tu reporte de cumplimiento enviado a Jefatura:</span>
                        </div>
                        <p className="italic text-emerald-100 bg-emerald-900/40 px-3 py-2 rounded-xl border border-emerald-500/25">
                          "{t.respuesta_empleado}"
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-0.5">
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
                  <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800 shrink-0">
                    
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

                    {/* Botón Marcar Completada */}
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

                    {/* Botón Pasar a mi Bitácora */}
                    {onCopiarABitacora && (
                      <button
                        onClick={() => handleCopiarABitacora(t)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer ${
                          copiedId === t.id
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
                        }`}
                        title="Copiar directamente como actuación en tu bitácora de hoy"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedId === t.id ? '¡Copiado a Bitácora!' : 'Pasar a Bitácora'}</span>
                      </button>
                    )}

                  </div>

                </div>

                {/* FORMULARIO DE REPORTE AL COMPLETAR */}
                {reportingId === t.id && (
                  <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2 animate-in fade-in duration-150">
                    <input
                      type="text"
                      value={reportComment}
                      onChange={e => setReportComment(e.target.value)}
                      placeholder="Escribe brevemente el resultado para Jefatura (ej. 'Listo, diligencia consignada')..."
                      className="flex-1 px-3 py-2 bg-slate-950 border border-emerald-500/50 rounded-xl text-xs text-white outline-none focus:border-emerald-400"
                    />
                    <button
                      onClick={() => handleCompleteTask(t.id)}
                      disabled={savingId === t.id}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{savingId === t.id ? 'Guardando...' : 'Confirmar Culminación'}</span>
                    </button>
                  </div>
                )}

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
}
