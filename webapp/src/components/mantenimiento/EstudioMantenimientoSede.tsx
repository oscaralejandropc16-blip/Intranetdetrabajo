import React, { useState, useMemo } from 'react';
import { 
  Sparkles, Plus, Clock, CheckCircle2, Trash2, Edit3, 
  Check, Coffee, Droplets, Wrench, ShoppingCart, 
  Brush, MapPin, Key, CheckCheck, FileText, X
} from 'lucide-react';
import type { Actuacion } from '../../types/libros';
import SystemAlertModal from '../common/SystemAlertModal';

interface EstudioMantenimientoSedeProps {
  actuaciones: Actuacion[];
  setActuaciones: React.Dispatch<React.SetStateAction<Actuacion[]>>;
  pendingTasks?: any[];
  setPendingTasks?: any;
  reportSubmitted: boolean;
}

// Estructura interna de una labor de mantenimiento / servicios generales
export interface MantenimientoLabor {
  id: string;
  hora: string;
  area: string;
  tipo: 'Limpieza & Desinfección' | 'Servicio de Café & Atención' | 'Insumos & Reposición' | 'Mantenimiento & Reparación' | 'Compras & Caja Chica' | 'Cierre & Seguridad';
  detalle: string;
  insumoRequerido?: string;
  estado: 'Completada' | 'En Proceso' | 'Insumo Pendiente' | 'Requiere Revisión';
  prioridad: 'Normal' | 'Alta' | 'Urgente';
  observaciones?: string;
}

// Áreas oficiales del despacho Román & Delgado en Valencia
const AREAS_DESPACHO = [
  { id: 'Recepción & Sala de Espera', label: 'Recepción & Espera', icon: '🏢', desc: 'Atención a clientes y entrada principal' },
  { id: 'Despacho Principal Jefatura', label: 'Despacho Jefatura', icon: '⚖️', desc: 'Oficinas Dr. Víctor Román & Dr. Luis Delgado' },
  { id: 'Sala de Juntas & Conferencias', label: 'Sala de Juntas', icon: '🏛️', desc: 'Mesa de reuniones y firmas' },
  { id: 'Cafetería, Cocina & Comedor', label: 'Cafetería & Cocina', icon: '☕', desc: 'Termos de café, refrigerios y vajilla' },
  { id: 'Sanitarios Clientes & Personal', label: 'Sanitarios & Baños', icon: '🚻', desc: 'Higiene, jabón y papel' },
  { id: 'Oficinas de Abogados & Asistentes', label: 'Oficinas Abogados', icon: '📁', desc: 'Dra. Carmen, Dra. Mariela, Dr. Héctor' },
  { id: 'Oficina de Sistemas & Servidores', label: 'Oficina Sistemas', icon: '💻', desc: 'Espacio TI (Óscar)' },
  { id: 'Depósito, Insumos & Archivo', label: 'Depósito & Insumos', icon: '📦', desc: 'Almacén de limpieza y suministros' },
  { id: 'Sede Completa / Áreas Comunes', label: 'Sede General', icon: '📍', desc: 'Pasillos, cristales y fachada' },
];

// Tipos de labores con sus iconos y colores
const TIPOS_LABOR = [
  { id: 'Limpieza & Desinfección', label: 'Limpieza Diaria', icon: <Brush className="w-4 h-4" />, color: 'emerald' },
  { id: 'Servicio de Café & Atención', label: 'Cafetería & Agua', icon: <Coffee className="w-4 h-4" />, color: 'amber' },
  { id: 'Insumos & Reposición', label: 'Insumos & Stock', icon: <Droplets className="w-4 h-4" />, color: 'blue' },
  { id: 'Mantenimiento & Reparación', label: 'Mantenimiento / Aire', icon: <Wrench className="w-4 h-4" />, color: 'indigo' },
  { id: 'Compras & Caja Chica', label: 'Compras Sede', icon: <ShoppingCart className="w-4 h-4" />, color: 'purple' },
  { id: 'Cierre & Seguridad', label: 'Cierre & Llaves', icon: <Key className="w-4 h-4" />, color: 'slate' },
];

// Insumos frecuentes para insertar con 1 clic
const INSUMOS_FRECUENTES = [
  '💧 2 Botellones de Agua Mineral',
  '☕ Café Molido Especial 500g',
  '🍬 Azúcar Blanca & Edulcorante',
  '🥤 Vasos Cónicos de Café y Agua',
  '🧻 Papel Higiénico Institucional',
  '🧼 Jabón Líquido Antibacterial',
  '🧽 Cloro & Desinfectante Lavanda',
  '🗑️ Bolsas de Basura Negras Grandes',
  '💡 Bombillos LED Luz Blanca 12W',
  '🔋 Baterías AA Controles de Aire'
];

// Plantillas de labores habituales
const LABORES_HABITUALES = [
  'Limpieza profunda, aspirado y mopeado desinfectante de pisos',
  'Limpieza y desinfección de escritorios, mesas y cristales',
  'Preparación de termo de café fresco y reposición de agua para clientes',
  'Limpieza profunda y desinfección de sanitarios con reposición de jabón y papel',
  'Vaciado y cambio de bolsas de todas las papeleras del despacho',
  'Revisión y limpieza de filtros de aires acondicionados de la sede',
  'Inspección de cierre: apagado de luces, aires, desconexión y llaves aseguradas'
];

export default function EstudioMantenimientoSede({
  actuaciones,
  setActuaciones,
  pendingTasks = [],
  setPendingTasks,
  reportSubmitted
}: EstudioMantenimientoSedeProps) {

  // Modales y estados
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroArea, setFiltroArea] = useState<string>('todos');

  // Estado para alertas y confirmaciones del sistema (Sin popups nativos)
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: 'warning' | 'error' | 'success' | 'info';
    title: string;
    message: string;
    showCancel?: boolean;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'warning',
    title: '',
    message: ''
  });

  // Formulario de registro de labor
  const [formData, setFormData] = useState<MantenimientoLabor>({
    id: '',
    hora: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false }),
    area: 'Recepción & Sala de Espera',
    tipo: 'Limpieza & Desinfección',
    detalle: '',
    insumoRequerido: '',
    estado: 'Completada',
    prioridad: 'Normal',
    observaciones: ''
  });

  // Convertir actuaciones al modelo de Mantenimiento
  const labores: MantenimientoLabor[] = useMemo(() => {
    return actuaciones.map(act => {
      const anyAct = act as any;
      if (anyAct.mantenimientoData) {
        return anyAct.mantenimientoData;
      }

      // Parsear desde formato estándar si viene de la base de datos
      const areaMatch = act.numeroAsunto.match(/\[(.*?)\]/);
      const areaParsed = (areaMatch ? areaMatch[1] : 'Recepción & Sala de Espera');

      let tipo: MantenimientoLabor['tipo'] = 'Limpieza & Desinfección';
      const textUpper = (act.numeroAsunto + ' ' + (act.partes || '') + ' ' + act.actuacion).toLowerCase();
      if (textUpper.includes('café') || textUpper.includes('cafe') || textUpper.includes('cocina') || textUpper.includes('termo')) {
        tipo = 'Servicio de Café & Atención';
      } else if (textUpper.includes('insumo') || textUpper.includes('compra') || textUpper.includes('agua') || textUpper.includes('papel')) {
        tipo = 'Insumos & Reposición';
      } else if (textUpper.includes('reparac') || textUpper.includes('aire') || textUpper.includes('bombillo') || textUpper.includes('mantenimiento')) {
        tipo = 'Mantenimiento & Reparación';
      } else if (textUpper.includes('cierre') || textUpper.includes('llave') || textUpper.includes('seguridad')) {
        tipo = 'Cierre & Seguridad';
      }

      const cleanDetalle = act.actuacion || act.numeroAsunto.replace(/\[.*?\]\s*/g, '').replace(/^[•\-:]\s*/, '').trim();

      return {
        id: act.id,
        hora: act.hora || '08:00',
        area: areaParsed || 'Sede General',
        tipo,
        detalle: cleanDetalle || 'Labor de servicios generales',
        insumoRequerido: act.partes?.includes('Insumo:') ? act.partes.split('Insumo:')[1]?.trim() : '',
        estado: (act.estado === 'Completada' ? 'Completada' : 'En Proceso') as any,
        prioridad: 'Normal',
        observaciones: act.observaciones || ''
      };
    });
  }, [actuaciones]);

  // KPIs y Estadísticas de la Jornada
  const stats = useMemo(() => {
    return {
      total: labores.length,
      completadas: labores.filter(l => l.estado === 'Completada').length,
      insumos: labores.filter(l => l.tipo === 'Insumos & Reposición' || !!l.insumoRequerido).length,
      reparaciones: labores.filter(l => l.tipo === 'Mantenimiento & Reparación').length
    };
  }, [labores]);

  // Filtrado de labores
  const filteredLabores = useMemo(() => {
    return labores.filter(l => {
      if (filtroTipo !== 'todos' && l.tipo !== filtroTipo) return false;
      if (filtroArea !== 'todos' && l.area !== filtroArea) return false;
      return true;
    });
  }, [labores, filtroTipo, filtroArea]);

  // Abrir modal para crear nueva labor
  const handleOpenNueva = () => {
    setEditingId(null);
    setFormData({
      id: `mnt_${Date.now()}`,
      hora: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false }),
      area: 'Recepción & Sala de Espera',
      tipo: 'Limpieza & Desinfección',
      detalle: '',
      insumoRequerido: '',
      estado: 'Completada',
      prioridad: 'Normal',
      observaciones: ''
    });
    setModalOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEditar = (l: MantenimientoLabor) => {
    setEditingId(l.id);
    setFormData({ ...l });
    setModalOpen(true);
  };

  // Guardar labor
  const handleGuardarLabor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.detalle.trim()) {
      setAlertConfig({
        isOpen: true,
        type: 'warning',
        title: 'Detalle de Labor Requerido',
        message: 'Por favor describe qué labor realizaste o qué insumo se requiere para que quede registrado formalmente en tu bitácora diaria.',
        showCancel: false,
        confirmText: 'Entendido',
        isDestructive: false
      });
      return;
    }

    const formattedAsunto = `[${formData.area}] ${formData.tipo} • ${formData.detalle.slice(0, 48)}`;
    const formattedPartes = `Área: ${formData.area}${formData.insumoRequerido ? ` | Insumo: ${formData.insumoRequerido}` : ''} | Prioridad: ${formData.prioridad}`;
    const cleanDetalle = formData.detalle.trim();

    const enrichedActuacion: any = {
      id: editingId || formData.id || `mnt_${Date.now()}`,
      hora: formData.hora,
      numeroAsunto: formattedAsunto,
      partes: formattedPartes,
      actuacion: cleanDetalle,
      estado: formData.estado === 'Completada' ? 'Completada' : 'En trámite',
      observaciones: formData.observaciones || '',
      mantenimientoData: { ...formData, id: editingId || formData.id || `mnt_${Date.now()}` }
    };

    if (editingId) {
      setActuaciones(prev => prev.map(a => a.id === editingId ? enrichedActuacion : a));
    } else {
      setActuaciones(prev => [...prev, enrichedActuacion]);
    }

    setModalOpen(false);
  };

  // Solicitar eliminación de labor (con SystemAlertModal, sin confirm nativo)
  const handleSolicitarEliminarLabor = (labor: MantenimientoLabor) => {
    setAlertConfig({
      isOpen: true,
      type: 'warning',
      title: '¿Eliminar registro de labor?',
      message: `Estás a punto de eliminar la siguiente labor:\n\n• Área: ${labor.area}\n• Labor: ${labor.tipo}\n• Detalle: "${labor.detalle}"\n\n¿Qué pasará al confirmar?\nSe eliminará de tu bitácora de servicios generales de hoy. Esta acción no se puede deshacer.`,
      showCancel: true,
      confirmText: 'Sí, eliminar registro',
      cancelText: 'Conservar en bitácora',
      isDestructive: true,
      onConfirm: () => {
        setActuaciones(prev => prev.filter(a => a.id !== labor.id));
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Cambiar estado rápido a Completada
  const handleToggleCompletada = (labor: MantenimientoLabor) => {
    const nuevoEstado = labor.estado === 'Completada' ? 'En Proceso' : 'Completada';
    const updated = { ...labor, estado: nuevoEstado };
    const enrichedActuacion: any = {
      id: labor.id,
      hora: labor.hora,
      numeroAsunto: `[${labor.area}] ${labor.tipo} • ${labor.detalle.slice(0, 48)}`,
      partes: `Área: ${labor.area}${labor.insumoRequerido ? ` | Insumo: ${labor.insumoRequerido}` : ''} | Prioridad: ${labor.prioridad}`,
      actuacion: labor.detalle,
      estado: nuevoEstado === 'Completada' ? 'Completada' : 'En trámite',
      observaciones: labor.observaciones || '',
      mantenimientoData: updated
    };
    setActuaciones(prev => prev.map(a => a.id === labor.id ? enrichedActuacion : a));
  };

  // Toggle de tareas de agenda si vienen asignadas por jefatura
  const handleToggleAgendaTask = (taskId: string | number) => {
    if (reportSubmitted || !setPendingTasks) return;
    setPendingTasks((prev: any[]) => (prev || []).map((t: any) => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  return (
    <div className="space-y-6">

      {/* 1. HERO BANNER: CONTROL DE SERVICIOS GENERALES & SEDE */}
      <div className="bg-gradient-to-r from-slate-950 via-teal-950 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-teal-800/40 relative overflow-hidden">
        {/* Glow de ambientación en verde esmeralda y oro */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full text-xs font-black tracking-wide shadow-sm">
                <Sparkles className="w-3.5 h-3.5" /> SERVICIOS GENERALES & MANTENIMIENTO DE SEDE
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Sede Valencia Operativa
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Bitácora de Instalaciones, Limpieza & Insumos
            </h2>

            <p className="text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              Control diario del despacho <strong className="text-amber-400">Román & Delgado</strong> a cargo de <strong className="text-white">Doris Rangel</strong>. Registra la limpieza de áreas, reposición de café y refrigerios, compras de insumos e inspecciones de la sede.
            </p>
          </div>

          {/* Botón Principal de Acción */}
          {!reportSubmitted && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleOpenNueva}
                className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer text-sm"
              >
                <Plus className="w-5 h-5" />
                <span>+ Registrar Labor / Insumo</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. CHECKLIST RÁPIDO DE ÁREAS DE LA SEDE */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Espacios Clave:</span>
            {AREAS_DESPACHO.slice(0, 5).map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => setFiltroArea(filtroArea === a.id ? 'todos' : a.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filtroArea === a.id
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/80'
                }`}
              >
                <span>{a.icon}</span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>Responsable:</span>
            <span className="px-2.5 py-0.5 rounded-lg bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
              Doris Rangel
            </span>
          </div>
        </div>
      </div>

      {/* 3. TAREAS PROGRAMADAS / INSTRUCCIONES DE JEFATURA (Si existen para Doris) */}
      {pendingTasks && pendingTasks.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-amber-950">
                Instrucciones & Tareas Asignadas por Jefatura para Hoy
              </h3>
              <p className="text-xs text-amber-800 font-medium">
                Puntos indicados por Víctor Román o Luis Delgado para atender durante tu jornada.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {pendingTasks.map((task: any) => (
              <label
                key={task.id}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  task.completed 
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 line-through' 
                    : 'bg-white border-amber-200 text-slate-800 hover:shadow-xs'
                }`}
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  disabled={reportSubmitted}
                  onChange={() => handleToggleAgendaTask(task.id)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 mt-1 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold block">{task.title || task.text}</span>
                  {task.observaciones && (
                    <span className="text-[11px] text-amber-700 block mt-0.5 font-medium">
                      Nota: {task.observaciones}
                    </span>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 4. KPIS DE MANTENIMIENTO */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Labores Registradas</div>
          <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>{stats.total}</span>
            <span className="text-xs text-slate-400 font-bold">actividades</span>
          </div>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1">
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> Labores Completadas
          </div>
          <div className="text-2xl font-black text-emerald-900">
            {stats.completadas}
          </div>
        </div>

        <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 shadow-xs">
          <div className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Droplets className="w-3.5 h-3.5 text-blue-600" /> Insumos & Reposición
          </div>
          <div className="text-2xl font-black text-blue-900">
            {stats.insumos}
          </div>
        </div>

        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 shadow-xs">
          <div className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5 text-amber-600" /> Mantenimiento & Aires
          </div>
          <div className="text-2xl font-black text-amber-900">
            {stats.reparaciones}
          </div>
        </div>
      </div>

      {/* 5. FILTROS RÁPIDOS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 p-2.5 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 px-2">Categoría:</span>
          {['todos', 'Limpieza & Desinfección', 'Servicio de Café & Atención', 'Insumos & Reposición', 'Mantenimiento & Reparación'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFiltroTipo(cat)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                filtroTipo === cat
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat === 'todos' ? 'Todas las Labores' : cat}
            </button>
          ))}
        </div>

        {filtroArea !== 'todos' && (
          <button
            type="button"
            onClick={() => setFiltroArea('todos')}
            className="text-xs text-rose-600 hover:underline font-bold px-2 cursor-pointer"
          >
            Quitar filtro de área ({filtroArea})
          </button>
        )}
      </div>

      {/* 6. LISTADO VISUAL DE LABORES EN CARDS MODERNAS */}
      <div className="space-y-4">
        {filteredLabores.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Brush className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-800">No hay labores registradas para este filtro hoy</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Registra las actividades de mantenimiento, limpieza de despachos o insumos requeridos haciendo clic en el botón superior.
            </p>
            {!reportSubmitted && (
              <button
                type="button"
                onClick={handleOpenNueva}
                className="mt-4 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                + Registrar Primera Labor
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLabores.map((labor) => {
              const isCompletada = labor.estado === 'Completada';

              return (
                <div 
                  key={labor.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-teal-300 transition-all shadow-xs hover:shadow-md flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Área Badge */}
                        <span className="px-2.5 py-1 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 text-teal-800 border border-teal-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-teal-600" /> {labor.area}
                        </span>

                        {/* Tipo de Labor */}
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1">
                          {labor.tipo === 'Servicio de Café & Atención' ? <Coffee className="w-3 h-3 text-amber-600" /> :
                           labor.tipo === 'Insumos & Reposición' ? <Droplets className="w-3 h-3 text-blue-600" /> :
                           labor.tipo === 'Mantenimiento & Reparación' ? <Wrench className="w-3 h-3 text-indigo-600" /> :
                           labor.tipo === 'Compras & Caja Chica' ? <ShoppingCart className="w-3 h-3 text-purple-600" /> :
                           labor.tipo === 'Cierre & Seguridad' ? <Key className="w-3 h-3 text-slate-600" /> :
                           <Brush className="w-3 h-3 text-emerald-600" />}
                          {labor.tipo}
                        </span>

                        {/* Hora */}
                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {labor.hora}
                        </span>
                      </div>

                      {/* Estado Badge */}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 shrink-0 ${
                        isCompletada 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs' 
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}>
                        {isCompletada ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3" />}
                        {labor.estado}
                      </span>
                    </div>

                    {/* Detalle Principal de la Labor */}
                    <h4 className="text-base font-black text-slate-900 group-hover:text-teal-700 transition-colors mb-2 leading-snug">
                      {labor.detalle}
                    </h4>

                    {/* Insumo Requerido si aplica */}
                    {labor.insumoRequerido && (
                      <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3 text-xs mb-3 flex items-start gap-2">
                        <Droplets className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-extrabold text-blue-950 text-[11px]">Insumo o Reposición Solicitada:</div>
                          <div className="text-blue-800 font-medium text-xs mt-0.5">{labor.insumoRequerido}</div>
                        </div>
                      </div>
                    )}

                    {/* Notas / Observaciones para Jefatura */}
                    {labor.observaciones && (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-xs mb-3 text-slate-700">
                        <span className="font-bold text-slate-500 text-[11px] block">Nota para Jefatura:</span>
                        <span className="font-medium mt-0.5 block">{labor.observaciones}</span>
                      </div>
                    )}
                  </div>

                  {/* Acciones al Pie de la Tarjeta */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-400">
                      Prioridad: <span className={labor.prioridad === 'Urgente' ? 'text-rose-600 font-black' : labor.prioridad === 'Alta' ? 'text-amber-600 font-bold' : 'text-slate-600 font-bold'}>{labor.prioridad}</span>
                    </span>

                    {!reportSubmitted && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleCompletada(labor)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            isCompletada 
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          }`}
                          title="Alternar estado completado"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isCompletada ? 'Completada' : 'Marcar Lista'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditar(labor)}
                          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-teal-600 rounded-xl transition-colors cursor-pointer"
                          title="Editar labor"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSolicitarEliminarLabor(labor)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                          title="Eliminar labor de la bitácora"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. MODAL PROFESIONAL DE REGISTRO / EDICIÓN PARA DORIS */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-950 text-white rounded-3xl max-w-3xl w-full border border-slate-800 shadow-2xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header del Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                  <Brush className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                    <span>{editingId ? 'Editar Labor de Sede' : 'Nueva Labor de Servicios Generales'}</span>
                    <span className="text-xs text-teal-300 font-bold bg-teal-500/15 px-2 py-0.5 rounded-full border border-teal-500/30">
                      Doris Rangel
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Román & Delgado | Despacho de Abogados • Sede Valencia
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleGuardarLabor} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700">
              
              {/* 1. Selector de Área / Espacio con Botones de 1 Clic */}
              <div>
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-400" />
                  <span>Área o Espacio de la Sede</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AREAS_DESPACHO.map(a => {
                    const isSelected = formData.area === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, area: a.id })}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                          isSelected
                            ? 'bg-gradient-to-r from-teal-600/30 to-emerald-600/20 border-teal-500 text-white shadow-md shadow-teal-500/20 ring-1 ring-teal-500/40'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-lg">{a.icon}</span>
                        <div className="truncate">
                          <span className="text-xs font-black block truncate">{a.label}</span>
                          <span className="text-[10px] text-slate-500 block truncate">{a.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Categoría de Labor y Hora */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Brush className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tipo de Labor</span>
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm font-bold text-white outline-none focus:border-teal-500"
                  >
                    {TIPOS_LABOR.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Hora Realizada</span>
                  </label>
                  <input
                    type="time"
                    value={formData.hora}
                    onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm font-bold text-white outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* 3. Detalle de la Labor */}
              <div>
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-teal-400" />
                  <span>Detalle de la Labor Realizada *</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.detalle}
                  onChange={(e) => setFormData({ ...formData, detalle: e.target.value })}
                  placeholder="Describe qué labor realizaste en esta área..."
                  className="w-full p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs sm:text-sm font-medium text-white placeholder-slate-500 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />

                {/* Plantillas habituales de 1 clic */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 block w-full">Plantillas rápidas:</span>
                  {LABORES_HABITUALES.slice(0, 4).map((plantilla, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        detalle: prev.detalle ? `${prev.detalle}. ${plantilla}` : plantilla
                      }))}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-[10px] font-medium transition-all text-left cursor-pointer"
                    >
                      + {plantilla.slice(0, 42)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Insumos Requeridos / Reposición (Opcional) */}
              <div>
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-blue-400" />
                  <span>Insumo o Compra Requerida (Opcional)</span>
                </label>
                <input
                  type="text"
                  value={formData.insumoRequerido}
                  onChange={(e) => setFormData({ ...formData, insumoRequerido: e.target.value })}
                  placeholder="Ej: Hace falta reponer 2 botellones de agua o jabón líquido..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm font-medium text-white placeholder-slate-500 outline-none focus:border-teal-500"
                />

                {/* Botones de Insumos Frecuentes de 1 Clic */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 block w-full">+ Insumos frecuentes del despacho:</span>
                  {INSUMOS_FRECUENTES.map((ins, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        insumoRequerido: prev.insumoRequerido ? `${prev.insumoRequerido}, ${ins}` : ins
                      }))}
                      className="px-2.5 py-0.5 bg-blue-500/10 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                    >
                      {ins}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Estado y Observaciones de Jefatura */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                    Estado de la Labor
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm font-bold text-white outline-none focus:border-teal-500"
                  >
                    <option value="Completada">🟢 Labor Completada</option>
                    <option value="En Proceso">🟡 En Proceso / En curso</option>
                    <option value="Insumo Pendiente">🔵 Insumo Pendiente por Comprar</option>
                    <option value="Requiere Revisión">🔴 Requiere Revisión de Jefatura</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                    Prioridad
                  </label>
                  <select
                    value={formData.prioridad}
                    onChange={(e) => setFormData({ ...formData, prioridad: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm font-bold text-white outline-none focus:border-teal-500"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                  Notas / Observaciones para Jefatura (Víctor Román & Luis Delgado)
                </label>
                <input
                  type="text"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Comentarios sobre el estado del área, técnicos recibidos..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm font-medium text-white placeholder-slate-500 outline-none focus:border-teal-500"
                />
              </div>

              {/* Botones del Modal */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 text-slate-400 hover:text-white rounded-xl font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-xs shadow-lg shadow-emerald-500/25 cursor-pointer transition-all active:scale-95 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingId ? 'Guardar Cambios' : 'Registrar en Bitácora'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 8. MODAL DE AVISOS Y CONFIRMACIONES DEL SISTEMA */}
      <SystemAlertModal
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        showCancel={alertConfig.showCancel}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        isDestructive={alertConfig.isDestructive}
        badgeText={alertConfig.isDestructive ? 'confirmación requerida' : undefined}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={alertConfig.onConfirm}
      />

    </div>
  );
}
