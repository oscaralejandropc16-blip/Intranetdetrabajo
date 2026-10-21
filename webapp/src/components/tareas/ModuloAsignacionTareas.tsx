import { useState, useEffect, useCallback } from 'react';
import { 
  CheckSquare, Plus, Search, Filter, RefreshCw, Clock, 
  CheckCircle2, MessageCircle, Trash2, Calendar, 
  User, Scale, X, Send
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { supabaseGetSystemUsers, type SystemUser } from '../../lib/supabaseAdapter';
import type { TareaAsignada } from '../../types/tareas';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ModuloAsignacionTareasProps {
  currentBossName?: string;
}

export default function ModuloAsignacionTareas({ currentBossName }: ModuloAsignacionTareasProps) {
  const bossName = currentBossName || localStorage.getItem('rd_user_name') || 'Jefatura';
  
  const [tareas, setTareas] = useState<TareaAsignada[]>([]);
  const [empleados, setEmpleados] = useState<SystemUser[]>([]);
  const [expedientes, setExpedientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEmpleado, setFiltroEmpleado] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroPrioridad, setFiltroPrioridad] = useState('Todos');

  // Modal Nueva Tarea
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formAsignadoA, setFormAsignadoA] = useState('');
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formExpediente, setFormExpediente] = useState('');
  const [formFechaLimite, setFormFechaLimite] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formPrioridad, setFormPrioridad] = useState<'urgente' | 'alta' | 'normal' | 'baja'>('normal');

  // 1. Cargar datos
  const loadData = useCallback(async (isSilent = false) => {
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!isSilent) setRefreshing(true);

    try {
      // a) Tareas
      const { data: tareasData, error: errTareas } = await supabase
        .from('tareas_asignadas')
        .select('*')
        .order('created_at', { ascending: false });

      if (!errTareas && tareasData) {
        setTareas(tareasData as TareaAsignada[]);
      }

      // b) Empleados del sistema (Solo rol empleado)
      const users = await supabaseGetSystemUsers();
      const soloEmpleados = users.filter(u => u.active !== false && u.role === 'empleado');
      setEmpleados(soloEmpleados);
      if (soloEmpleados.length > 0 && !formAsignadoA) {
        setFormAsignadoA(soloEmpleados[0].username || soloEmpleados[0].fullName);
      }

      // c) Expedientes para asociar
      const { data: expData } = await supabase
        .from('expedientes')
        .select('numero, titulo')
        .order('created_at', { ascending: false })
        .limit(60);
      if (expData) setExpedientes(expData);

    } catch (e) {
      console.error('Error cargando módulo de tareas:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [formAsignadoA]);

  useEffect(() => {
    loadData();

    const handleVisibility = () => {
      if (!document.hidden) loadData(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loadData]);

  // 2. Crear nueva tarea
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim() || !formAsignadoA) return;

    setSubmitting(true);
    try {
      const selectedEmp = empleados.find(
        e => e.username === formAsignadoA || e.fullName === formAsignadoA
      );
      const empNombre = selectedEmp ? selectedEmp.fullName : formAsignadoA;

      const payload = {
        asignado_por: bossName,
        asignado_a: formAsignadoA.toLowerCase().trim(),
        asignado_a_nombre: empNombre,
        titulo: formTitulo.trim(),
        descripcion: formDescripcion.trim() || null,
        expediente_asociado: formExpediente.trim() || null,
        fecha_limite: formFechaLimite || null,
        prioridad: formPrioridad,
        estado: 'pendiente'
      };

      const { data, error } = await supabase
        .from('tareas_asignadas')
        .insert(payload)
        .select()
        .single();

      if (!error && data) {
        setTareas(prev => [data as TareaAsignada, ...prev]);
        setModalOpen(false);
        setFormTitulo('');
        setFormDescripcion('');
        setFormExpediente('');
        setFormFechaLimite(format(new Date(), 'yyyy-MM-dd'));
        setFormPrioridad('normal');
      } else {
        alert('Error al asignar tarea: ' + (error?.message || 'Error desconocido'));
      }
    } catch (err: any) {
      alert('Fallo de red: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Cambiar estado manualmente por Jefatura
  const handleStatusChange = async (id: number, nuevoEstado: TareaAsignada['estado']) => {
    try {
      const updatePayload: any = { estado: nuevoEstado };
      if (nuevoEstado === 'completada') {
        updatePayload.completada_en = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tareas_asignadas')
        .update(updatePayload)
        .eq('id', id);

      if (!error) {
        setTareas(prev => prev.map(t => t.id === id ? { ...t, ...updatePayload } : t));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 4. Eliminar tarea
  const handleDeleteTask = async (id: number, titulo: string) => {
    if (!window.confirm(`¿Deseas eliminar la tarea "${titulo}"?`)) return;
    try {
      const { error } = await supabase
        .from('tareas_asignadas')
        .delete()
        .eq('id', id);

      if (!error) {
        setTareas(prev => prev.filter(t => t.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtrado
  const tareasFiltradas = tareas.filter(t => {
    const matchSearch = 
      t.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.descripcion || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.asignado_a_nombre || t.asignado_a).toLowerCase().includes(searchQuery.toLowerCase());

    const matchEmp = filtroEmpleado === 'Todos' || 
      t.asignado_a.toLowerCase() === filtroEmpleado.toLowerCase() ||
      (t.asignado_a_nombre || '').toLowerCase() === filtroEmpleado.toLowerCase();

    const matchEstado = filtroEstado === 'Todos' || t.estado === filtroEstado;
    const matchPrio = filtroPrioridad === 'Todos' || t.prioridad === filtroPrioridad;

    return matchSearch && matchEmp && matchEstado && matchPrio;
  });

  // Métricas
  const totalTareas = tareas.length;
  const pendientesCount = tareas.filter(t => t.estado === 'pendiente').length;
  const enProgresoCount = tareas.filter(t => t.estado === 'en_proceso').length;
  const completadasCount = tareas.filter(t => t.estado === 'completada').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* BANNER PRINCIPAL DE JEFATURA */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 lg:p-8 rounded-3xl border border-indigo-800/40 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-3">
              <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gestión de Equipo &bull; Despacho Román &amp; Delgado</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <CheckSquare className="w-8 h-8 text-amber-400" />
              Delegación &amp; Asignación de Tareas
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Asigna instrucciones, investigaciones y actuaciones directas a cada empleado desde tu usuario, sin necesidad de ingresar a sus cuentas.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center">
            <button
              onClick={() => loadData()}
              disabled={refreshing}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 border border-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>

            <button
              onClick={() => setModalOpen(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Asignar Nueva Tarea</span>
            </button>
          </div>
        </div>

        {/* METRICAS RESUMEN */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-800/50 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/50">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Total Asignadas</span>
            <span className="text-2xl font-black text-white">{totalTareas}</span>
          </div>
          <div className="bg-amber-500/10 backdrop-blur-md p-3.5 rounded-2xl border border-amber-500/20">
            <span className="text-[11px] font-bold text-amber-400 block uppercase">Pendientes</span>
            <span className="text-2xl font-black text-amber-300">{pendientesCount}</span>
          </div>
          <div className="bg-blue-500/10 backdrop-blur-md p-3.5 rounded-2xl border border-blue-500/20">
            <span className="text-[11px] font-bold text-blue-400 block uppercase">En Progreso</span>
            <span className="text-2xl font-black text-blue-300">{enProgresoCount}</span>
          </div>
          <div className="bg-emerald-500/10 backdrop-blur-md p-3.5 rounded-2xl border border-emerald-500/20">
            <span className="text-[11px] font-bold text-emerald-400 block uppercase">Completadas</span>
            <span className="text-2xl font-black text-emerald-300">{completadasCount}</span>
          </div>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar tarea, instrucción o empleado..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-2.5 items-center">
          {/* Filtro por Empleado */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={filtroEmpleado}
              onChange={e => setFiltroEmpleado(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="Todos">Todos los empleados</option>
              {empleados.map(emp => (
                <option key={emp.username || emp.fullName} value={emp.username || emp.fullName}>
                  {emp.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Estado */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="Todos">Todos los estados</option>
              <option value="pendiente">🟡 Pendientes</option>
              <option value="en_proceso">🔵 En Progreso</option>
              <option value="completada">🟢 Completadas</option>
            </select>
          </div>

          {/* Filtro por Prioridad */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <select
              value={filtroPrioridad}
              onChange={e => setFiltroPrioridad(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="Todos">Todas las prioridades</option>
              <option value="urgente">🔴 Urgentes</option>
              <option value="alta">🟠 Altas</option>
              <option value="normal">🔵 Normales</option>
            </select>
          </div>
        </div>
      </div>

      {/* LISTADO DE TAREAS */}
      {loading ? (
        <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-600 font-bold text-sm">Cargando tareas asignadas...</p>
        </div>
      ) : tareasFiltradas.length === 0 ? (
        <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center">
          <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-slate-800 font-bold text-lg mb-1">No hay tareas con estos filtros</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-5">
            {searchQuery || filtroEmpleado !== 'Todos' || filtroEstado !== 'Todos'
              ? 'Prueba modificando tus términos de búsqueda o filtros.'
              : 'Aún no has delegado tareas directas a los empleados.'}
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
          >
            + Asignar la primera tarea
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tareasFiltradas.map(t => {
            const fechaLimiteFormateada = t.fecha_limite ? (() => {
              try {
                return format(new Date(t.fecha_limite + 'T12:00:00'), "d 'de' MMMM", { locale: es });
              } catch {
                return t.fecha_limite;
              }
            })() : 'Sin fecha límite';

            const fechaCreadaFormateada = t.created_at ? (() => {
              try {
                return format(new Date(t.created_at), "d MMM, h:mm a", { locale: es });
              } catch {
                return t.created_at;
              }
            })() : '';

            // Mensaje de WhatsApp para recordar al empleado
            const msgWhatsApp = encodeURIComponent(
              `Hola ${t.asignado_a_nombre || t.asignado_a}, te recuerdo la tarea asignada: "${t.titulo}". Favor mantener actualizado el estatus en tu KANT.`
            );

            return (
              <div
                key={t.id}
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 ${
                  t.prioridad === 'urgente' && t.estado !== 'completada'
                    ? 'border-rose-300 bg-rose-50/20'
                    : t.estado === 'completada'
                    ? 'border-emerald-200/80 bg-emerald-50/15'
                    : 'border-slate-200/90'
                }`}
              >
                {/* INFORMACIÓN DE LA TAREA */}
                <div className="space-y-2 flex-1">
                  
                  {/* BADGES SUPERIORES */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Prioridad */}
                    {t.prioridad === 'urgente' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white shadow-sm animate-pulse">
                        🔥 URGENTE
                      </span>
                    )}
                    {t.prioridad === 'alta' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950">
                        ⚡ Alta
                      </span>
                    )}
                    {t.prioridad === 'normal' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        Normal
                      </span>
                    )}

                    {/* Estado */}
                    {t.estado === 'pendiente' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                        🟡 Pendiente
                      </span>
                    )}
                    {t.estado === 'en_proceso' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300">
                        🔵 En Progreso
                      </span>
                    )}
                    {t.estado === 'completada' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completada
                      </span>
                    )}

                    {/* Expediente relacionado */}
                    {t.expediente_asociado && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                        <Scale className="w-3 h-3 text-indigo-600" />
                        Exp: {t.expediente_asociado}
                      </span>
                    )}
                  </div>

                  {/* Título de la Tarea */}
                  <h4 className="text-base font-bold text-slate-900 leading-snug">
                    {t.titulo}
                  </h4>

                  {/* Descripción o Instrucciones */}
                  {t.descripcion && (
                    <p className="text-sm text-slate-600 bg-slate-50/80 border border-slate-200/60 p-3 rounded-xl whitespace-pre-line">
                      {t.descripcion}
                    </p>
                  )}

                  {/* Reporte de Culminación del Empleado */}
                  {t.respuesta_empleado && (
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-950 space-y-1">
                      <div className="flex items-center gap-1 font-bold text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Reporte de cumplimiento del empleado:</span>
                      </div>
                      <p className="text-emerald-900 whitespace-pre-line">{t.respuesta_empleado}</p>
                    </div>
                  )}

                  {/* Meta: Asignado a, Fecha límite, etc. */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 pt-1">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                      <User className="w-3.5 h-3.5 text-amber-600" />
                      Asignada a: <strong className="text-slate-900">{t.asignado_a_nombre || t.asignado_a}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Límite: <strong className={t.prioridad === 'urgente' ? 'text-rose-600' : 'text-slate-700'}>{fechaLimiteFormateada}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      Asignada por {t.asignado_por} ({fechaCreadaFormateada})
                    </span>
                  </div>

                </div>

                {/* ACCIONES DE JEFATURA */}
                <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                  
                  {/* RECORDAR POR WHATSAPP */}
                  <a
                    href={`https://wa.me/?text=${msgWhatsApp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    title="Enviar recordatorio por WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>

                  {/* SELECTOR DE ESTADO */}
                  <select
                    value={t.estado}
                    onChange={e => handleStatusChange(t.id, e.target.value as TareaAsignada['estado'])}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 rounded-xl px-2.5 py-2 outline-none cursor-pointer"
                  >
                    <option value="pendiente">🟡 Pendiente</option>
                    <option value="en_proceso">🔵 En Progreso</option>
                    <option value="completada">🟢 Completada</option>
                  </select>

                  {/* ELIMINAR */}
                  <button
                    onClick={() => handleDeleteTask(t.id, t.titulo)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                    title="Eliminar tarea"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ASIGNAR NUEVA TAREA */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Asignar Tarea a Empleado</h3>
                  <p className="text-xs text-slate-500">Aparecerá en el KANT del empleado asignado</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              
              {/* Empleado Destino */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Seleccionar Empleado *
                </label>
                <select
                  value={formAsignadoA}
                  onChange={e => setFormAsignadoA(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all cursor-pointer"
                >
                  {empleados.map(emp => (
                    <option key={emp.username || emp.fullName} value={emp.username || emp.fullName}>
                      {emp.fullName} ({emp.department || 'Legal'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Título de la Tarea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Título de la Tarea / Actuación *
                </label>
                <input
                  type="text"
                  value={formTitulo}
                  onChange={e => setFormTitulo(e.target.value)}
                  required
                  placeholder="Ej. Revisar expediente 4521 en Tribunal 2do de Control"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all"
                />
              </div>

              {/* Instrucciones Detalladas */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Instrucciones o Detalles
                </label>
                <textarea
                  value={formDescripcion}
                  onChange={e => setFormDescripcion(e.target.value)}
                  rows={3}
                  placeholder="Instrucciones específicas, diligencias a consignar, teléfono de contacto..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all resize-none"
                />
              </div>

              {/* Expediente Asociado */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Expediente / Caso Relacionado (Opcional)
                </label>
                <select
                  value={formExpediente}
                  onChange={e => setFormExpediente(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="">-- Ninguno o No Aplica --</option>
                  {expedientes.map(exp => (
                    <option key={exp.numero} value={exp.numero}>
                      {exp.numero} - {exp.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Fecha Límite */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Fecha Objetivo / Límite
                  </label>
                  <input
                    type="date"
                    value={formFechaLimite}
                    onChange={e => setFormFechaLimite(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Prioridad */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Prioridad
                  </label>
                  <select
                    value={formPrioridad}
                    onChange={e => setFormPrioridad(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="normal">🔵 Normal</option>
                    <option value="alta">⚡ Alta</option>
                    <option value="urgente">🔥 Urgente</option>
                  </select>
                </div>
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Asignando...' : 'Asignar Tarea'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
