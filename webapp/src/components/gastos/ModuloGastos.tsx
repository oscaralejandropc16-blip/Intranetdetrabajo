import { useState, useEffect } from 'react';
import { 
  Plus, Receipt, Clock, CheckCircle2, 
  ShieldCheck, Download, Edit3, Trash2, RefreshCw,
  Eye, ChevronDown, ChevronUp, X, AlertCircle
} from 'lucide-react';
import api, { submitToServer } from '../../lib/api';
import type { RelacionGastos } from '../../types/gastos';
import FormRelacionGastos from './FormRelacionGastos';
import PanelJefaturaGastos from './PanelJefaturaGastos';
import { exportarRelacionGastosPDF } from './pdfExportGastos';
import SystemAlertModal, { type AlertType } from '../common/SystemAlertModal';
import { getStoredExpedientes } from '../expedientes/mockExpedientesData';

interface ModuloGastosProps {
  isJefatura?: boolean;
  globalExpedientes?: any[];
}

const isJefaturaUser = (userName: string) => {
  if (!userName) return false;
  const lower = userName.toLowerCase().trim();
  const jefaturaExact = [
    'victor', 'victor roman', 'víctor román', 
    'luis', 'luis delgado', 
    'romanydelgado', 'romanydelgado@gmail.com',
    'admin', 'jefatura'
  ];
  return jefaturaExact.some(j => lower === j || lower.startsWith('luis delgado') || lower.startsWith('victor roman') || lower.startsWith('romanydelgado'));
};

export default function ModuloGastos({ isJefatura: propIsJefatura, globalExpedientes: propGlobalExpedientes }: ModuloGastosProps) {
  const currentLoggedUser = localStorage.getItem('rd_user_name') || 'Empleado';
  const isJefe = propIsJefatura !== undefined ? propIsJefatura : isJefaturaUser(currentLoggedUser);

  const [relaciones, setRelaciones] = useState<RelacionGastos[]>([]);
  const [globalExpedientes, setGlobalExpedientes] = useState<any[]>(() => {
    if (Array.isArray(propGlobalExpedientes) && propGlobalExpedientes.length > 0) {
      return propGlobalExpedientes;
    }
    return getStoredExpedientes();
  });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'lista' | 'nuevo' | 'editar'>(isJefe ? 'lista' : 'lista');
  const [activeTabJefe, setActiveTabJefe] = useState<'supervision' | 'mis_gastos'>('supervision');
  const [selectedRelacion, setSelectedRelacion] = useState<RelacionGastos | null>(null);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [systemAlert, setSystemAlert] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
    showCancel?: boolean;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const fetchGastos = async () => {
    setLoading(true);
    try {
      const [gastosRes, expRes] = await Promise.all([
        api.get('/rd-intranet/v1/gastos').catch(() => ({ data: [] })),
        api.get('/rd-intranet/v1/expedientes').catch(() => ({ data: [] }))
      ]);

      const serverGastos: RelacionGastos[] = Array.isArray(gastosRes.data) ? gastosRes.data : [];
      
      // Combinar con borradores locales válidos si no existen en el servidor
      try {
        const localDrafts = JSON.parse(localStorage.getItem('rd_local_gastos_drafts') || '[]');
        if (Array.isArray(localDrafts)) {
          const validDrafts = localDrafts.filter((ld: any) => Number(ld.totalUsd || ld.monto || 0) > 0);
          localStorage.setItem('rd_local_gastos_drafts', JSON.stringify(validDrafts));
          validDrafts.forEach((ld: any) => {
            if (!serverGastos.some(sg => String(sg.id) === String(ld.id))) {
              serverGastos.unshift(ld);
            }
          });
        }
      } catch (e) {}

      // Excluir relaciones vacías o en $0 y ordenar de la más nueva a la más vieja
      const validRelaciones = serverGastos
        .filter(g => Number(g.totalUsd || 0) > 0)
        .sort((a, b) => {
          const dateA = a.fechaFin || a.fechaInicio || a.fechaCreacion || '';
          const dateB = b.fechaFin || b.fechaInicio || b.fechaCreacion || '';
          if (dateA !== dateB) return dateB.localeCompare(dateA);
          const createdA = a.createdAt || '';
          const createdB = b.createdAt || '';
          if (createdA !== createdB) return createdB.localeCompare(createdA);
          return String(b.id || '').localeCompare(String(a.id || ''));
        });
      setRelaciones(validRelaciones);
      
      // Expedientes con respaldo sólido
      if (Array.isArray(expRes.data) && expRes.data.length > 0) {
        setGlobalExpedientes(expRes.data);
      } else if (Array.isArray(propGlobalExpedientes) && propGlobalExpedientes.length > 0) {
        setGlobalExpedientes(propGlobalExpedientes);
      } else {
        setGlobalExpedientes(getStoredExpedientes());
      }
    } catch (err) {
      console.error('Error fetching gastos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGastos();
  }, []);

  // Mis gastos (del usuario actual)
  const misRelaciones = relaciones.filter(r => {
    const rUser = (r.empleado || '').toLowerCase().trim();
    const curr = currentLoggedUser.toLowerCase().trim();
    return rUser === curr || curr.includes(rUser) || rUser.includes(curr);
  });

  // Métricas del empleado
  const miTotalPendiente = misRelaciones
    .filter(r => r.estatus === 'Pendiente')
    .reduce((sum, r) => sum + (Number(r.totalUsd) || 0), 0);
  const miTotalPagado = misRelaciones
    .filter(r => r.estatus === 'Pagado')
    .reduce((sum, r) => sum + (Number(r.totalUsd) || 0), 0);

  const handleDeleteRelacion = (rel: RelacionGastos) => {
    setSystemAlert({
      isOpen: true,
      type: 'warning',
      title: '¿Eliminar Relación de Gastos?',
      message: `Esta acción eliminará de forma permanente la relación "${rel.titulo}". ¿Deseas continuar?`,
      showCancel: true,
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        // 1. Cerrar diálogo de inmediato para no congelar la pantalla
        setSystemAlert(prev => ({ ...prev, isOpen: false }));

        // 2. Limpiar de borradores locales si existía
        try {
          const localDrafts = JSON.parse(localStorage.getItem('rd_local_gastos_drafts') || '[]');
          if (Array.isArray(localDrafts)) {
            const updated = localDrafts.filter((ld: any) => String(ld.id) !== String(rel.id));
            localStorage.setItem('rd_local_gastos_drafts', JSON.stringify(updated));
          }
        } catch (e) {}

        // 3. Eliminación optimista en el estado de React
        setRelaciones(prev => prev.filter(r => String(r.id) !== String(rel.id)));

        // 4. Intentar eliminar en servidor si tiene ID
        try {
          const res = await submitToServer('/rd-intranet/v1/gastos/eliminar', { id: rel.id });
          if (res && res.success === false) {
            setSystemAlert({
              isOpen: true,
              type: 'error',
              title: 'Aviso de Eliminación',
              message: res.message || 'No se pudo eliminar en el servidor.'
            });
          }
          fetchGastos();
        } catch (e: any) {
          console.error('Error eliminando en servidor:', e);
        }
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <SystemAlertModal
        isOpen={systemAlert.isOpen}
        type={systemAlert.type}
        title={systemAlert.title}
        message={systemAlert.message}
        showCancel={systemAlert.showCancel}
        confirmText={systemAlert.confirmText}
        cancelText={systemAlert.cancelText}
        onConfirm={systemAlert.onConfirm}
        onClose={() => setSystemAlert(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Modal de Vista Previa de Comprobante / Recibo */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="bg-slate-900 rounded-3xl p-5 max-w-2xl w-full border border-slate-800 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white">
                <Eye className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold">Comprobante de Soporte</h3>
              </div>
              <button 
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="w-full flex items-center justify-center bg-slate-950/60 rounded-2xl p-2 min-h-[220px]">
              <img 
                src={previewImage} 
                alt="Comprobante de soporte" 
                className="max-h-[75vh] max-w-full w-auto rounded-xl object-contain shadow-lg border border-slate-800"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const fallback = document.getElementById('comprobante-error-msg-user');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div id="comprobante-error-msg-user" style={{ display: 'none' }} className="flex flex-col items-center justify-center py-8 text-slate-400 text-xs">
                <AlertCircle className="w-8 h-8 text-amber-400 mb-2 opacity-80" />
                <span>No se pudo cargar la vista previa del comprobante.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 1: FORMULARIO DE CREACIÓN / EDICIÓN */}
      {(viewMode === 'nuevo' || viewMode === 'editar') && (
        <FormRelacionGastos
          initialData={selectedRelacion}
          globalExpedientes={globalExpedientes}
          onSaveSuccess={() => {
            setViewMode('lista');
            setSelectedRelacion(null);
            fetchGastos();
          }}
          onCancel={() => {
            setViewMode('lista');
            setSelectedRelacion(null);
          }}
        />
      )}

      {/* VISTA 2: LISTADOS PRINCIPALES */}
      {viewMode === 'lista' && (
        <div className="space-y-6">
          {/* Header Principal del Módulo */}
          <div className="bg-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black shadow-inner shrink-0">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    Control de Gastos & Reembolsos
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Taxes & Desembolsos
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rendición de cuentas semanal y quincenal de fotocopias, traslados, aranceles y desembolsos judiciales.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end md:self-center shrink-0 flex-wrap">
              <button
                onClick={fetchGastos}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Actualizar datos"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => {
                  setSelectedRelacion(null);
                  setViewMode('nuevo');
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Nueva Relación de Gastos
              </button>
            </div>
          </div>

          {/* Si es Jefatura, Selector de Pestañas (Supervisión vs Mis Gastos) */}
          {isJefe && (
            <div className="flex gap-1.5 p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300/80 w-fit">
              <button
                onClick={() => setActiveTabJefe('supervision')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTabJefe === 'supervision'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Supervisión & Liquidaciones del Equipo</span>
                {relaciones.filter(r => r.estatus === 'Pendiente').length > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full font-black text-[10px]">
                    {relaciones.filter(r => r.estatus === 'Pendiente').length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTabJefe('mis_gastos')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTabJefe === 'mis_gastos'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-4 h-4 text-amber-500" />
                <span>Mis Gastos Personales ({misRelaciones.length})</span>
              </button>
            </div>
          )}

          {/* VISTA JEFATURA: PANEL DE SUPERVISIÓN */}
          {isJefe && activeTabJefe === 'supervision' ? (
            <PanelJefaturaGastos
              relaciones={relaciones}
              loading={loading}
              onRefresh={fetchGastos}
              onEditRelacion={(rel) => {
                setSelectedRelacion(rel);
                setViewMode('editar');
              }}
            />
          ) : (
            /* VISTA EMPLEADO: MIS RELACIONES DE GASTOS */
            <div className="space-y-6">
              {/* Tarjetas de Resumen Personal */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Pendiente por Reembolsar
                    </span>
                    <span className="text-xl font-black text-amber-600 mt-1 block">
                      ${miTotalPendiente.toFixed(2)} USD
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      {misRelaciones.filter(r => r.estatus === 'Pendiente').length} relación(es) en revisión
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Total Pagado / Reembolsado
                    </span>
                    <span className="text-xl font-black text-emerald-600 mt-1 block">
                      ${miTotalPagado.toFixed(2)} USD
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      {misRelaciones.filter(r => r.estatus === 'Pagado').length} liquidación(es) pagadas
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Historial Registrado
                    </span>
                    <span className="text-xl font-black text-slate-800 mt-1 block">
                      {misRelaciones.length} Planillas
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      Rendiciones en el sistema
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Receipt className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Listado de mis relaciones */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Mis Relaciones de Gastos Entregadas
                  </h3>
                </div>

                {loading && misRelaciones.length === 0 ? (
                  <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-xs animate-in fade-in">
                    <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <h4 className="text-sm font-bold text-slate-700">Cargando tus relaciones de gastos...</h4>
                    <p className="text-xs text-slate-400">Consultando la base de datos central en tiempo real.</p>
                  </div>
                ) : misRelaciones.length === 0 ? (
                  <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-xs">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">Aún no has registrado gastos</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Haz clic en "Nueva Relación de Gastos" para desglosar tus fotocopias, traslados y desembolsos semanales.
                    </p>
                    <button
                      onClick={() => setViewMode('nuevo')}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" /> Crear mi Primer Reporte
                    </button>
                  </div>
                ) : (
                  misRelaciones.map(rel => {
                    const isExpanded = expandedId === rel.id;
                    const itemsCount = (rel.items || []).length;

                    return (
                      <div 
                        key={rel.id} 
                        className={`bg-white rounded-3xl border transition-all overflow-hidden ${
                          isExpanded 
                            ? 'border-amber-300 shadow-sm ring-1 ring-amber-300/40' 
                            : 'border-slate-200 shadow-xs hover:border-slate-300'
                        }`}
                      >
                        {/* Cabecera Principal de la Tarjeta */}
                        <div 
                          className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer select-none"
                          onClick={() => setExpandedId(isExpanded ? null : rel.id)}
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                              rel.estatus === 'Pagado'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rel.estatus === 'Pendiente'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              <Receipt className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-sm text-slate-900 truncate">
                                  {rel.titulo}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  rel.estatus === 'Pagado'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : rel.estatus === 'Pendiente'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : rel.estatus === 'Rechazado'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}>
                                  {rel.estatus === 'Pendiente' ? 'En Revisión por Jefatura' : rel.estatus === 'Pagado' ? 'Pagado' : rel.estatus}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1 flex-wrap">
                                <span>Período: {rel.periodo} ({rel.fechaInicio || 'N/A'} al {rel.fechaFin || 'N/A'})</span>
                                <span>•</span>
                                <span>{itemsCount} partidas</span>
                                {rel.estatus === 'Pagado' && (
                                  <>
                                    <span>•</span>
                                    <span className="text-emerald-700 font-bold">
                                      Pagado el {rel.fechaPago} vía {rel.metodoPago} (Ref: {rel.referenciaPago || 'S/R'})
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Montos y Acciones */}
                          <div className="flex items-center gap-2.5 self-end md:self-center flex-wrap" onClick={(e) => e.stopPropagation()}>
                            <div className="text-right mr-1">
                              <span className="text-base font-black text-slate-900 block">
                                ${Number(rel.totalUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="text-xs font-bold text-amber-600">
                                Bs {Number(rel.totalVes || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>

                            {/* Botón Ver Detalle */}
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : rel.id)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                                isExpanded
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                              }`}
                              title="Ver desglose de partidas y comprobantes"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{isExpanded ? 'Ocultar' : 'Ver Detalle'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            {/* Botón Editar / Anexar Comprobantes: permitido mientras NO esté Pagado */}
                            {rel.estatus !== 'Pagado' && (
                              <button
                                onClick={() => {
                                  setSelectedRelacion(rel);
                                  setViewMode('editar');
                                }}
                                className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition-all cursor-pointer border border-amber-200 shadow-2xs"
                                title="Editar / Anexar comprobantes o corregir montos"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Botón Descargar PDF */}
                            <button
                              onClick={() => exportarRelacionGastosPDF(rel)}
                              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
                              title="Descargar PDF Oficial"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {/* Eliminar si es borrador */}
                            {rel.estatus === 'Borrador' && (
                              <button
                                onClick={() => handleDeleteRelacion(rel)}
                                className="p-2 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                                title="Eliminar borrador"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Desglose de Partidas (Acordeón Detallado) */}
                        {isExpanded && (
                          <div className="p-5 border-t border-slate-100 space-y-4 bg-white animate-in slide-in-from-top-1">
                            {/* Comprobante de Liquidación si está pagado */}
                            {rel.estatus === 'Pagado' && (
                              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                  <div>
                                    <div className="text-xs font-bold text-emerald-950">
                                      Liquidado el {rel.fechaPago || 'Fecha no registrada'} vía <span className="font-black text-emerald-800">{rel.metodoPago || 'Pago'}</span>
                                    </div>
                                    <div className="text-[11px] text-emerald-700">
                                      Referencia: <span className="font-mono font-bold">{rel.referenciaPago || 'Sin número de referencia'}</span>
                                      {rel.pagadoPor && ` • Procesado por: ${rel.pagadoPor}`}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Si tiene observaciones de jefatura */}
                            {rel.comentariosJefatura && (
                              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900">
                                <span className="font-bold">Observación de Jefatura: </span>
                                {rel.comentariosJefatura}
                              </div>
                            )}

                            {/* Tabla de Renglones / Partidas */}
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-100/70 text-slate-600 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                                    <th className="py-2.5 px-3">Fecha</th>
                                    <th className="py-2.5 px-3">Trámite / Expediente</th>
                                    <th className="py-2.5 px-3">Categoría</th>
                                    <th className="py-2.5 px-3">Descripción / Justificación</th>
                                    <th className="py-2.5 px-3 text-right">Monto ($)</th>
                                    <th className="py-2.5 px-3 text-right">Monto (Bs)</th>
                                    <th className="py-2.5 px-3 text-center">Soporte</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {(rel.items || []).map((item, idx) => (
                                    <tr key={item.id || idx} className="hover:bg-slate-50/60 transition-colors">
                                      <td className="py-2.5 px-3 font-medium text-slate-500 whitespace-nowrap">
                                        {item.fechaGasto || 'N/A'}
                                      </td>
                                      <td className="py-2.5 px-3 font-bold text-slate-800">
                                        {item.tramiteExpediente || 'General / Despacho'}
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                                          {item.categoria}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-600">
                                        {item.descripcion || 'Sin detalle adicional'}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                                        ${Number(item.montoUsd || 0).toFixed(2)}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-bold text-slate-600 whitespace-nowrap">
                                        Bs {Number(item.montoVes || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                        {item.comprobanteBase64 || item.comprobanteUrl ? (
                                          <button
                                            onClick={() => setPreviewImage(item.comprobanteBase64 || item.comprobanteUrl || null)}
                                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer border border-emerald-200"
                                          >
                                            <Eye className="w-3 h-3" /> Ver Foto
                                          </button>
                                        ) : (
                                          <span className="text-slate-300 text-[10px] italic">Sin foto</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Resumen al pie del desglose */}
                            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2 flex-wrap">
                              <div className="text-xs text-slate-500 font-medium">
                                Tasa de cambio aplicada: <span className="font-bold text-slate-700">Bs {Number(rel.tasaBcv || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {rel.estatus !== 'Pagado' && (
                                  <button
                                    onClick={() => {
                                      setSelectedRelacion(rel);
                                      setViewMode('editar');
                                    }}
                                    className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl transition-all cursor-pointer border border-amber-200 flex items-center gap-1.5"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-amber-700" /> Editar Partidas / Anexar Fotos
                                  </button>
                                )}
                                <button
                                  onClick={() => exportarRelacionGastosPDF(rel)}
                                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                  <Download className="w-3.5 h-3.5 text-amber-400" /> Descargar PDF Oficial
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
