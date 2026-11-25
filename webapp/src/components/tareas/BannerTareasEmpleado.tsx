import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { TareaAsignada } from '../../types/tareas';
import type { Actuacion } from '../../types/libros';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CheckSquare, Clock, CheckCircle2, RefreshCw, Calendar,
  User, Scale, Search, Filter, RotateCcw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  FileText, Send, X, Check
} from 'lucide-react';

interface BannerTareasEmpleadoProps {
  currentUserName: string;
  onCopiarABitacora?: (actuacion: Partial<Actuacion>) => void;
  fullPage?: boolean;
  onTareasCountChange?: (count: number) => void;
}

export default function BannerTareasEmpleado({
  currentUserName,
  onCopiarABitacora,
  fullPage = false,
  onTareasCountChange
}: BannerTareasEmpleadoProps) {
  const [tareas, setTareas] = useState<TareaAsignada[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Filtros (por defecto mostrar solo tareas activas/pendientes para no mezclar historial completado antiguo)
  const [filtroEstado, setFiltroEstado] = useState<'activas' | 'todos' | 'pendiente' | 'en_proceso' | 'completada'>('activas');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Acciones en tareas
  const [reportingId, setReportingId] = useState<number | null>(null);
  const [reportComment, setReportComment] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(fullPage ? 10 : 5);

  const cleanName = (currentUserName || '').toLowerCase().trim();

  // 1. Cargar tareas asignadas a este empleado
  const fetchMisTareas = useCallback(async (isSilent = false) => {
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!cleanName) return;

    if (!isSilent) setRefreshing(true);

    try {
      const { data, error } = await supabase
        .from('tareas_asignadas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        // Filtrar tareas dirigidas a este usuario
        const misTareas = (data as TareaAsignada[]).filter(t => {
          const dest = (t.asignado_a || '').toLowerCase().trim();
          const destNombre = (t.asignado_a_nombre || '').toLowerCase().trim();
          return dest.includes(cleanName) || cleanName.includes(dest) || destNombre.includes(cleanName) || cleanName.includes(destNombre);
        });
        setTareas(misTareas);

        const pendientes = misTareas.filter(t => t.estado !== 'completada');
        if (onTareasCountChange) {
          onTareasCountChange(pendientes.length);
        }

        // Si no tiene tareas pendientes y estamos en modo banner, minimizar por defecto
        if (!fullPage && pendientes.length === 0 && misTareas.length > 0) {
          setCollapsed(true);
        }
      }
    } catch (e) {
      console.warn('Error al consultar tareas del empleado:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cleanName, fullPage, onTareasCountChange]);

  useEffect(() => {
    fetchMisTareas();

    const handleVisibility = () => {
      if (!document.hidden) fetchMisTareas(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchMisTareas]);

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filtroEstado, filtroPrioridad]);

  // 2. Iniciar tarea (marcar en proceso)
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
      numeroAsunto: t.expediente_asociado || 'Instrucción de Dirección',
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

        // Actualizar contador
        const pendientesRestantes = tareas.filter(t => t.id !== id && t.estado !== 'completada');
        if (onTareasCountChange) {
          onTareasCountChange(pendientesRestantes.length);
        }

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

  // Métricas
  const totalCount = tareas.length;
  const pendientesCount = tareas.filter(t => t.estado === 'pendiente').length;
  const enProgresoCount = tareas.filter(t => t.estado === 'en_proceso').length;
  const activasCount = pendientesCount + enProgresoCount;
  const completadasCount = tareas.filter(t => t.estado === 'completada').length;

  // Filtrado + orden inteligente (siempre tareas activas primero, luego por fecha más reciente)
  const tareasFiltradas = tareas
    .filter(t => {
      const matchSearch =
        t.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.descripcion || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.expediente_asociado || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.asignado_por.toLowerCase().includes(searchQuery.toLowerCase());

      const matchEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'activas' ? t.estado !== 'completada' : t.estado === filtroEstado);
      const matchPrioridad = filtroPrioridad === 'todos' || t.prioridad === filtroPrioridad;

      return matchSearch && matchEstado && matchPrioridad;
    })
    .sort((a, b) => {
      const rank = (s?: string) => (s === 'en_proceso' ? 0 : s === 'pendiente' ? 1 : 2);
      const rDiff = rank(a.estado) - rank(b.estado);
      if (rDiff !== 0) return rDiff;
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });

  // Paginación
  const totalPages = Math.max(1, Math.ceil(tareasFiltradas.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, tareasFiltradas.length);
  const tareasPaginadas = tareasFiltradas.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage: number) => {
    const validPage = Math.max(1, Math.min(totalPages, newPage));
    setCurrentPage(validPage);
  };

  // Si no está en vista completa y no tiene tareas asignadas, no muestra nada
  if (!fullPage && (loading ? false : tareas.length === 0)) {
    return null;
  }

  return (
    <div className={`space-y-5 animate-in fade-in duration-300 ${!fullPage ? 'mb-5' : ''}`}>

      {/* TARJETA / BANNER SUPERIOR */}
      <div className="bg-white rounded-3xl border border-blue-200 shadow-md shadow-blue-950/8 p-6 lg:p-7 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-5 border-b border-blue-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 border border-blue-200 text-[#1e3a8a] text-xs font-bold uppercase tracking-wider mb-2">
              <CheckSquare className="w-3.5 h-3.5 text-blue-700" />
              <span>Instrucciones &bull; Despacho Román &amp; Delgado</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#172554] to-[#1d4ed8] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-900/20">
                <CheckSquare className="w-6 h-6" />
              </span>
              Mis Tareas Asignadas
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl font-medium leading-relaxed">
              Diligencias, investigaciones y actuaciones delegadas por Dirección. Complétalas e intégralas a tu bitácora diaria en tiempo real.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center">
            <button
              type="button"
              onClick={() => fetchMisTareas()}
              disabled={refreshing}
              className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>

            {!fullPage && (
              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                {collapsed ? `Ver tareas (${activasCount} pendientes)` : 'Minimizar'}
              </button>
            )}
          </div>
        </div>

        {/* METRICAS KPI (SOLO EN VISTA COMPLETA PARA NO OCUPAR ESPACIO EN BITÁCORA) */}
        {fullPage && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-5">
            <div className="bg-slate-50/80 border border-slate-200/90 p-4 rounded-2xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-200/60 text-slate-700 flex items-center justify-center shrink-0">
                <CheckSquare className="w-5 h-5 text-slate-700" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">Total Asignadas</span>
                <span className="text-2xl font-black text-slate-900">{totalCount}</span>
              </div>
            </div>

            <div className="bg-blue-50/50 border border-blue-200/80 p-4 rounded-2xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-blue-700 block uppercase tracking-wider">Por Iniciar</span>
                <span className="text-2xl font-black text-blue-900">{pendientesCount}</span>
              </div>
            </div>

            <div className="bg-indigo-50/50 border border-indigo-200/80 p-4 rounded-2xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 text-indigo-700" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-indigo-700 block uppercase tracking-wider">En Progreso</span>
                <span className="text-2xl font-black text-indigo-900">{enProgresoCount}</span>
              </div>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-200/80 p-4 rounded-2xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-700 block uppercase tracking-wider">Completadas</span>
                <span className="text-2xl font-black text-emerald-900">{completadasCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CONTENIDO PRINCIPAL: BARRA DE FILTROS + LISTADO DE TAREAS */}
      {(!collapsed || fullPage) && (
        <div className="space-y-4">

          {/* BARRA DE BÚSQUEDA Y FILTROS */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por título, expediente o instrucción..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>

            <div className="flex flex-wrap gap-2.5 items-center">
              {/* Filtro por Estado */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={filtroEstado}
                  onChange={e => setFiltroEstado(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="activas">Pendientes y En Progreso ({activasCount})</option>
                  <option value="pendiente">Solo Por Iniciar ({pendientesCount})</option>
                  <option value="en_proceso">Solo En Progreso ({enProgresoCount})</option>
                  <option value="completada">Historial Completadas ({completadasCount})</option>
                  <option value="todos">Todas ({totalCount})</option>
                </select>
              </div>

              {/* Filtro por Prioridad */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                <select
                  value={filtroPrioridad}
                  onChange={e => setFiltroPrioridad(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="todos">Todas las prioridades</option>
                  <option value="urgente">Urgentes</option>
                  <option value="alta">Altas</option>
                  <option value="normal">Normales</option>
                </select>
              </div>

              {/* Botón Limpiar Filtros */}
              {(searchQuery || filtroEstado !== 'activas' || filtroPrioridad !== 'todos') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFiltroEstado('activas');
                    setFiltroPrioridad('todos');
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Restablecer filtros"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpiar</span>
                </button>
              )}
            </div>
          </div>

          {/* LISTADO DE TAREAS */}
          {loading ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-slate-600 font-bold text-sm">Cargando tus tareas asignadas...</p>
            </div>
          ) : tareasFiltradas.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
              <CheckSquare className="w-12 h-12 text-blue-500 mx-auto mb-3" />
              <h3 className="text-slate-900 font-bold text-lg mb-1">
                {searchQuery || (filtroEstado !== 'activas' && filtroEstado !== 'todos') || filtroPrioridad !== 'todos'
                  ? 'No hay tareas que coincidan con los filtros'
                  : '¡Al día! No tienes tareas pendientes'}
              </h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                {searchQuery || (filtroEstado !== 'activas' && filtroEstado !== 'todos') || filtroPrioridad !== 'todos'
                  ? 'Prueba modificando tus términos de búsqueda o restableciendo los filtros.'
                  : 'Todas las instrucciones asignadas por Dirección han sido atendidas o completadas. Puedes consultar el historial seleccionando "Historial Completadas".'}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {tareasPaginadas.map(t => {
                const fechaLimiteText = t.fecha_limite ? (() => {
                  try {
                    return format(new Date(t.fecha_limite + 'T12:00:00'), "d 'de' MMMM yyyy", { locale: es });
                  } catch {
                    return t.fecha_limite;
                  }
                })() : 'Sin fecha límite';

                const fechaCreadaFormateada = t.created_at ? (() => {
                  try {
                    return format(new Date(t.created_at), "d MMM yyyy, h:mm a", { locale: es });
                  } catch {
                    return t.created_at;
                  }
                })() : '';

                const esCompletada = t.estado === 'completada';

                return (
                  <div
                    key={t.id}
                    className={`bg-white rounded-3xl border transition-all duration-200 shadow-2xs hover:shadow-xs p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 ${t.prioridad === 'urgente' && !esCompletada
                      ? 'border-rose-200 bg-rose-50/15'
                      : esCompletada
                        ? 'border-emerald-200 bg-emerald-50/15'
                        : 'border-slate-200/90'
                      }`}
                  >
                    {/* INFORMACIÓN DE LA TAREA */}
                    <div className="space-y-3 flex-1 min-w-0">

                      {/* BADGES SUPERIORES */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Prioridad */}
                        {t.prioridad === 'urgente' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                            URGENTE
                          </span>
                        )}
                        {t.prioridad === 'alta' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Alta
                          </span>
                        )}
                        {t.prioridad === 'normal' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Normal
                          </span>
                        )}

                        {/* Estado */}
                        {t.estado === 'pendiente' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Por Iniciar
                          </span>
                        )}
                        {t.estado === 'en_proceso' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            En Progreso
                          </span>
                        )}
                        {esCompletada && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completada
                          </span>
                        )}

                        {/* Expediente relacionado */}
                        {t.expediente_asociado && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1">
                            <Scale className="w-3 h-3 text-slate-600" />
                            Exp: {t.expediente_asociado}
                          </span>
                        )}
                      </div>

                      {/* Título de la Tarea */}
                      <h4 className={`text-base sm:text-lg font-black leading-snug ${esCompletada ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {t.titulo}
                      </h4>

                      {/* Descripción o Instrucciones de Jefatura */}
                      {t.descripcion && (
                        <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3.5 space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            <FileText className="w-3 h-3 text-slate-400" />
                            <span>Instrucciones de Dirección:</span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-700 font-medium whitespace-pre-line leading-relaxed">
                            {t.descripcion}
                          </p>
                        </div>
                      )}

                      {/* REPORTE DE CUMPLIMIENTO ENVIADO A JEFATURA */}
                      {t.respuesta_empleado && (
                        <div className="bg-gradient-to-br from-emerald-50/80 via-teal-50/20 to-white border border-emerald-200 rounded-2xl p-4 shadow-2xs space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-extrabold text-xs text-emerald-950">
                                Reporte de Cumplimiento Enviado a Jefatura
                              </span>
                            </div>
                            {t.completada_en && (
                              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3 text-emerald-600" />
                                {(() => {
                                  try {
                                    return format(new Date(t.completada_en), "d MMM yyyy, h:mm a", { locale: es });
                                  } catch {
                                    return '';
                                  }
                                })()}
                              </span>
                            )}
                          </div>
                          <div className="bg-white/80 border border-emerald-200/60 rounded-xl p-3 shadow-2xs">
                            <p className="text-xs sm:text-sm text-slate-800 font-medium italic whitespace-pre-line leading-relaxed">
                              "{t.respuesta_empleado}"
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Meta: Asignada por, Fecha límite, etc. */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 pt-1">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                          <User className="w-3.5 h-3.5 text-blue-600" />
                          Asignada por: <strong className="text-slate-900">{t.asignado_por}</strong>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Fecha límite: <strong className={t.prioridad === 'urgente' ? 'text-rose-600 font-bold' : 'text-slate-700'}>{fechaLimiteText}</strong>
                        </span>
                        {fechaCreadaFormateada && (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Clock className="w-3.5 h-3.5" />
                            Recibida el {fechaCreadaFormateada}
                          </span>
                        )}
                      </div>

                    </div>

                    {/* ACCIONES DEL EMPLEADO */}
                    <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">

                      {/* Botón Iniciar Tarea */}
                      {t.estado === 'pendiente' && (
                        <button
                          type="button"
                          onClick={() => handleStartTask(t.id)}
                          disabled={savingId === t.id}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Comenzar</span>
                        </button>
                      )}

                      {/* Botón Completar (Despliega reporte para Jefatura) */}
                      {!esCompletada && (
                        <button
                          type="button"
                          onClick={() => {
                            setReportingId(reportingId === t.id ? null : t.id);
                            setReportComment('');
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{reportingId === t.id ? 'Cancelar' : 'Completar'}</span>
                        </button>
                      )}

                      {/* Botón Pasar a mi Bitácora */}
                      {onCopiarABitacora && (
                        <button
                          type="button"
                          onClick={() => handleCopiarABitacora(t)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${copiedId === t.id
                            ? 'bg-emerald-600 text-white font-black shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                          title="Asegurar o agregar nuevamente en tu Libro de Actuaciones de hoy"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{copiedId === t.id ? 'Copiada en Bitácora' : 'Pasar a Bitácora'}</span>
                        </button>
                      )}

                    </div>

                  </div>
                );
              })}

              {/* FORMULARIO EXPANDIBLE PARA REPORTAR Y COMPLETAR TAREA */}
              {reportingId && (
                <div className="bg-white p-5 rounded-3xl border border-emerald-300 shadow-lg animate-in slide-in-from-top-2 duration-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="font-extrabold text-sm text-slate-900">
                        Culminar Tarea &bull; Reporte para Dirección
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReportingId(null)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 font-medium">
                    Describe brevemente las diligencias realizadas. Este reporte será enviado a Jefatura y quedará agregado automáticamente en tu bitácora de hoy:
                  </p>

                  <textarea
                    rows={3}
                    value={reportComment}
                    onChange={e => setReportComment(e.target.value)}
                    placeholder="Ej. 'Diligencia consignada en el Tribunal 2do de Control. Se obtuvo sello y copia recibida satisfactoriamente...'"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none"
                    autoFocus
                  />

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setReportingId(null)}
                      className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold text-xs rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCompleteTask(reportingId)}
                      disabled={savingId === reportingId}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{savingId === reportingId ? 'Guardando...' : 'Completar y Guardar en Bitácora'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* PAGINACIÓN */}
              {totalPages > 1 && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap justify-center sm:justify-start">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-600">Mostrar:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-slate-50 border border-slate-200 text-slate-800 font-bold px-2.5 py-1.5 rounded-xl text-xs outline-none cursor-pointer hover:border-blue-500 transition-colors"
                      >
                        <option value={5}>5 tareas</option>
                        <option value={10}>10 tareas</option>
                        <option value={20}>20 tareas</option>
                        <option value={9999}>Ver todas ({tareasFiltradas.length})</option>
                      </select>
                    </div>

                    <span className="text-slate-300">|</span>

                    <span className="text-slate-600 font-medium">
                      Mostrando <strong className="text-slate-900 font-bold">{tareasFiltradas.length === 0 ? 0 : startIndex + 1}</strong> a <strong className="text-slate-900 font-bold">{endIndex}</strong> de <strong className="text-blue-600 font-bold">{tareasFiltradas.length}</strong> tareas
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={safeCurrentPage === 1}
                      title="Primera página"
                      className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePageChange(safeCurrentPage - 1)}
                      disabled={safeCurrentPage === 1}
                      title="Página anterior"
                      className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Anterior</span>
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => page === 1 || page === totalPages || Math.abs(page - safeCurrentPage) <= 1)
                      .map((page, idx, array) => {
                        const prevPage = array[idx - 1];
                        const showEllipsis = prevPage && page - prevPage > 1;

                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && (
                              <span className="px-1 text-slate-400 text-xs font-bold">...</span>
                            )}
                            <button
                              onClick={() => handlePageChange(page)}
                              className={`w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center ${safeCurrentPage === page
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 font-black'
                                : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300'
                                }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}

                    <button
                      onClick={() => handlePageChange(safeCurrentPage + 1)}
                      disabled={safeCurrentPage === totalPages}
                      title="Página siguiente"
                      className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="hidden sm:inline">Siguiente</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={safeCurrentPage === totalPages}
                      title="Última página"
                      className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
