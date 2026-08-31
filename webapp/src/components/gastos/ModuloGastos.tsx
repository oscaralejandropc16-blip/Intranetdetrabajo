import { useState, useEffect } from 'react';
import { 
  Plus, Receipt, Clock, CheckCircle2, 
  ShieldCheck, Download, Edit3, Trash2, RefreshCw
} from 'lucide-react';
import api, { submitToServer } from '../../lib/api';
import type { RelacionGastos } from '../../types/gastos';
import FormRelacionGastos from './FormRelacionGastos';
import PanelJefaturaGastos from './PanelJefaturaGastos';
import { exportarRelacionGastosPDF } from './pdfExportGastos';
import SystemAlertModal, { type AlertType } from '../common/SystemAlertModal';

interface ModuloGastosProps {
  isJefatura?: boolean;
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

export default function ModuloGastos({ isJefatura: propIsJefatura }: ModuloGastosProps) {
  const currentLoggedUser = localStorage.getItem('rd_user_name') || 'Empleado';
  const isJefe = propIsJefatura !== undefined ? propIsJefatura : isJefaturaUser(currentLoggedUser);

  const [relaciones, setRelaciones] = useState<RelacionGastos[]>([]);
  const [globalExpedientes, setGlobalExpedientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'lista' | 'nuevo' | 'editar'>(isJefe ? 'lista' : 'lista');
  const [activeTabJefe, setActiveTabJefe] = useState<'supervision' | 'mis_gastos'>('supervision');
  const [selectedRelacion, setSelectedRelacion] = useState<RelacionGastos | null>(null);

  const [systemAlert, setSystemAlert] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
    showCancel?: boolean;
    onConfirm?: () => void;
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
      
      // Combinar con borradores locales si no existen en el servidor
      try {
        const localDrafts = JSON.parse(localStorage.getItem('rd_local_gastos_drafts') || '[]');
        if (Array.isArray(localDrafts)) {
          localDrafts.forEach((ld: any) => {
            if (!serverGastos.some(sg => String(sg.id) === String(ld.id))) {
              serverGastos.unshift(ld);
            }
          });
        }
      } catch (e) {}

      setRelaciones(serverGastos);
      if (Array.isArray(expRes.data)) {
        setGlobalExpedientes(expRes.data);
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
      onConfirm: async () => {
        try {
          await submitToServer('/rd-intranet/v1/gastos/eliminar', { id: rel.id });
          fetchGastos();
        } catch (e) {
          console.error('Error eliminando', e);
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
        onConfirm={systemAlert.onConfirm}
        onClose={() => setSystemAlert(prev => ({ ...prev, isOpen: false }))}
      />

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

                {misRelaciones.length === 0 ? (
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
                  misRelaciones.map(rel => (
                    <div 
                      key={rel.id} 
                      className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-300 transition-all"
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
                              {rel.estatus === 'Pendiente' ? '🟡 En Revisión por Jefatura' : rel.estatus === 'Pagado' ? '🟢 Pagado' : rel.estatus}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1 flex-wrap">
                            <span>Período: {rel.periodo} ({rel.fechaInicio || 'N/A'} al {rel.fechaFin || 'N/A'})</span>
                            <span>•</span>
                            <span>{(rel.items || []).length} partidas</span>
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
                      <div className="flex items-center gap-3 self-end md:self-center">
                        <div className="text-right">
                          <span className="text-base font-black text-slate-900 block">
                            ${Number(rel.totalUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs font-bold text-amber-600">
                            Bs {Number(rel.totalVes || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Botón Editar si está en borrador o devuelto */}
                        {(rel.estatus === 'Borrador' || rel.estatus === 'Rechazado') && (
                          <button
                            onClick={() => {
                              setSelectedRelacion(rel);
                              setViewMode('editar');
                            }}
                            className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            title="Editar / Corregir"
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
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
