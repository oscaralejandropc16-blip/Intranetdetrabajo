import { useState, useMemo } from 'react';
import { 
  CheckCircle2, Clock, Search, 
  Download, Eye, AlertCircle, X, ChevronDown, ChevronUp,
  Receipt, User, RefreshCw, Send, Trash2, RotateCcw, ExternalLink,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { format, isWithinInterval, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth } from 'date-fns';
import type { RelacionGastos, MetodoPagoGasto } from '../../types/gastos';
import { submitToServer } from '../../lib/api';
import { exportarRelacionGastosPDF } from './pdfExportGastos';
import SystemAlertModal, { type AlertType } from '../common/SystemAlertModal';

interface PanelJefaturaGastosProps {
  relaciones: RelacionGastos[];
  onRefresh: () => void;
  onEditRelacion?: (relacion: RelacionGastos) => void;
  loading?: boolean;
}

export default function PanelJefaturaGastos({
  relaciones,
  onRefresh,
  loading = false
}: PanelJefaturaGastosProps) {
  const currentLoggedUser = localStorage.getItem('rd_user_name') || 'Jefatura';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriodo, setFilterPeriodo] = useState<'todas' | 'esta_semana' | 'semana_anterior' | 'primera_quincena' | 'segunda_quincena' | 'este_mes'>('todas');
  const [filterEmpleado, setFilterEmpleado] = useState<string>('todos');
  const [filterEstatus, setFilterEstatus] = useState<string>('todos');
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Handlers reactivos que reinician la página a 1
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };
  const handlePeriodoChange = (val: any) => {
    setFilterPeriodo(val);
    setCurrentPage(1);
  };
  const handleEmpleadoChange = (val: string) => {
    setFilterEmpleado(val);
    setCurrentPage(1);
  };
  const handleEstatusChange = (val: string) => {
    setFilterEstatus(val);
    setCurrentPage(1);
  };

  // Estados de modales
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pagoModal, setPagoModal] = useState<{
    isOpen: boolean;
    relacion: RelacionGastos | null;
    metodoPago: MetodoPagoGasto;
    referenciaPago: string;
    fechaPago: string;
    comentario: string;
  }>({
    isOpen: false,
    relacion: null,
    metodoPago: 'Pago Móvil',
    referenciaPago: '',
    fechaPago: format(new Date(), 'yyyy-MM-dd'),
    comentario: ''
  });

  const [rechazoModal, setRechazoModal] = useState<{
    isOpen: boolean;
    relacion: RelacionGastos | null;
    motivo: string;
  }>({
    isOpen: false,
    relacion: null,
    motivo: ''
  });

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

  const [processing, setProcessing] = useState(false);

  // Lista única de empleados que han registrado gastos
  const empleadosUnicos = Array.from(new Set(relaciones.map(r => r.empleado).filter(Boolean)));

  // Filtrado reactivo
  const filteredRelaciones = relaciones.filter(r => {
    // Excluir relaciones vacías o en $0
    if (Number(r.totalUsd || 0) <= 0) return false;

    // 1. Búsqueda por texto
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchEmp = (r.empleado || '').toLowerCase().includes(q);
      const matchTit = (r.titulo || '').toLowerCase().includes(q);
      const matchItems = (r.items || []).some(i => 
        (i.tramiteExpediente || '').toLowerCase().includes(q) ||
        (i.descripcion || '').toLowerCase().includes(q) ||
        (i.categoria || '').toLowerCase().includes(q)
      );
      if (!matchEmp && !matchTit && !matchItems) return false;
    }

    // 2. Filtro de Empleado
    if (filterEmpleado !== 'todos' && r.empleado !== filterEmpleado) {
      return false;
    }

    // 3. Filtro de Estatus
    if (filterEstatus !== 'todos' && r.estatus !== filterEstatus) {
      return false;
    }

    // 4. Filtro de Período
    if (filterPeriodo !== 'todas' && r.fechaCreacion) {
      try {
        const itemDate = new Date(r.fechaCreacion);
        const today = new Date();
        if (filterPeriodo === 'esta_semana') {
          const start = startOfWeek(today, { weekStartsOn: 1 });
          const end = endOfWeek(today, { weekStartsOn: 1 });
          if (!isWithinInterval(itemDate, { start, end })) return false;
        } else if (filterPeriodo === 'semana_anterior') {
          const prevWeek = subWeeks(today, 1);
          const start = startOfWeek(prevWeek, { weekStartsOn: 1 });
          const end = endOfWeek(prevWeek, { weekStartsOn: 1 });
          if (!isWithinInterval(itemDate, { start, end })) return false;
        } else if (filterPeriodo === 'primera_quincena') {
          const day = itemDate.getDate();
          if (day > 15 || itemDate.getMonth() !== today.getMonth() || itemDate.getFullYear() !== today.getFullYear()) return false;
        } else if (filterPeriodo === 'segunda_quincena') {
          const day = itemDate.getDate();
          if (day <= 15 || itemDate.getMonth() !== today.getMonth() || itemDate.getFullYear() !== today.getFullYear()) return false;
        } else if (filterPeriodo === 'este_mes') {
          const start = startOfMonth(today);
          const end = endOfMonth(today);
          if (!isWithinInterval(itemDate, { start, end })) return false;
        }
      } catch (e) {}
    }

    return true;
  }).sort((a, b) => {
    const dateA = a.fechaFin || a.fechaInicio || a.fechaCreacion || '';
    const dateB = b.fechaFin || b.fechaInicio || b.fechaCreacion || '';
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    const createdA = a.createdAt || '';
    const createdB = b.createdAt || '';
    if (createdA !== createdB) return createdB.localeCompare(createdA);
    return String(b.id || '').localeCompare(String(a.id || ''));
  });

  // Paginación reactiva
  const totalPages = Math.max(1, Math.ceil(filteredRelaciones.length / itemsPerPage));
  const paginatedRelaciones = useMemo(() => {
    if (itemsPerPage >= 9999) return filteredRelaciones;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRelaciones.slice(start, start + itemsPerPage);
  }, [filteredRelaciones, currentPage, itemsPerPage]);

  // Métricas acumuladas
  const totalPendienteUsd = relaciones
    .filter(r => r.estatus === 'Pendiente')
    .reduce((sum, r) => sum + (Number(r.totalUsd) || 0), 0);
  const totalPendienteVes = relaciones
    .filter(r => r.estatus === 'Pendiente')
    .reduce((sum, r) => sum + (Number(r.totalVes) || 0), 0);

  const totalPagadoUsd = relaciones
    .filter(r => r.estatus === 'Pagado')
    .reduce((sum, r) => sum + (Number(r.totalUsd) || 0), 0);
  const totalPagadoVes = relaciones
    .filter(r => r.estatus === 'Pagado')
    .reduce((sum, r) => sum + (Number(r.totalVes) || 0), 0);

  const totalPendientesCount = relaciones.filter(r => r.estatus === 'Pendiente').length;

  const handleOpenPagoModal = (rel: RelacionGastos) => {
    setPagoModal({
      isOpen: true,
      relacion: rel,
      metodoPago: 'Pago Móvil',
      referenciaPago: '',
      fechaPago: format(new Date(), 'yyyy-MM-dd'),
      comentario: ''
    });
  };

  const handleConfirmarPago = async () => {
    if (!pagoModal.relacion) return;
    setProcessing(true);
    try {
      await submitToServer('/rd-intranet/v1/gastos/pagar', {
        id: pagoModal.relacion.id,
        metodoPago: pagoModal.metodoPago,
        referenciaPago: pagoModal.referenciaPago,
        fechaPago: pagoModal.fechaPago,
        comentariosJefatura: pagoModal.comentario
      });

      setPagoModal(prev => ({ ...prev, isOpen: false }));
      setSystemAlert({
        isOpen: true,
        type: 'success',
        title: '¡Gasto Liquidado y Pagado!',
        message: `La relación de gastos de ${pagoModal.relacion.empleado} ha sido marcada como PAGADA exitosamente.`
      });
      onRefresh();
    } catch (err: any) {
      console.error('Error pagando relación de gastos:', err);
      setSystemAlert({
        isOpen: true,
        type: 'error',
        title: 'Error de Procesamiento',
        message: 'No se pudo procesar el pago en el servidor. Intenta de nuevo.'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmarRechazo = async () => {
    if (!rechazoModal.relacion) return;
    setProcessing(true);
    try {
      await submitToServer('/rd-intranet/v1/gastos/rechazar', {
        id: rechazoModal.relacion.id,
        comentariosJefatura: rechazoModal.motivo
      });

      setRechazoModal(prev => ({ ...prev, isOpen: false }));
      setSystemAlert({
        isOpen: true,
        type: 'info',
        title: 'Relación Devuelta',
        message: `Se ha devuelto la relación de gastos a ${rechazoModal.relacion.empleado} con las observaciones indicadas.`
      });
      onRefresh();
    } catch (err) {
      console.error('Error rechazando gasto:', err);
    } finally {
      setProcessing(false);
    }
  };

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
        setSystemAlert(prev => ({ ...prev, isOpen: false }));

        // Limpiar de borradores locales si existiera
        try {
          const localDrafts = JSON.parse(localStorage.getItem('rd_local_gastos_drafts') || '[]');
          if (Array.isArray(localDrafts)) {
            const updated = localDrafts.filter((ld: any) => String(ld.id) !== String(rel.id));
            localStorage.setItem('rd_local_gastos_drafts', JSON.stringify(updated));
          }
        } catch (e) {}

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
          onRefresh();
        } catch (e: any) {
          console.error('Error eliminando relación:', e);
        }
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
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

      {/* Modal visor de comprobante */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl flex flex-col items-center cursor-default"
          >
            <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="text-slate-900 font-bold text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" /> Soporte / Factura Adjunta
              </div>
              <div className="flex items-center gap-2">
                {(previewImage.startsWith('http') || previewImage.startsWith('/')) && (
                  <a
                    href={previewImage}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-xl text-blue-700 transition-colors text-xs flex items-center gap-1.5 font-bold border border-blue-200"
                    title="Abrir imagen en pestaña nueva"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" /> Ver Original
                  </a>
                )}
                <button 
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="w-full flex items-center justify-center bg-slate-50 rounded-2xl p-2 min-h-[220px] border border-slate-100">
              <img 
                src={previewImage} 
                alt="Comprobante de soporte" 
                className="max-h-[75vh] max-w-full w-auto rounded-xl object-contain shadow-xs border border-slate-200"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const fallback = document.getElementById('comprobante-error-msg');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div id="comprobante-error-msg" style={{ display: 'none' }} className="flex flex-col items-center justify-center py-8 text-slate-400 text-xs">
                <AlertCircle className="w-8 h-8 text-blue-500 mb-2 opacity-80" />
                <span>No se pudo cargar la vista previa del comprobante.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Liquidación / Pago */}
      {pagoModal.isOpen && pagoModal.relacion && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Aprobar y Pagar Gastos</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{pagoModal.relacion.empleado}</p>
                </div>
              </div>
              <button 
                onClick={() => setPagoModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Resumen del Monto a Liquidar */}
            <div className="bg-slate-50 border border-slate-200/90 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Liquidación</span>
                <span className="text-lg font-bold text-slate-900">${pagoModal.relacion.totalUsd?.toFixed(2)} USD</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Monto en Bolívares</span>
                <span className="text-sm font-bold text-slate-700">Bs {pagoModal.relacion.totalVes?.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Método / Vía de Pago</label>
                <select
                  value={pagoModal.metodoPago}
                  onChange={(e) => setPagoModal(prev => ({ ...prev, metodoPago: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Pago Móvil">Pago Móvil (Bs)</option>
                  <option value="Transferencia Bs">Transferencia Bancaria (Bs)</option>
                  <option value="Efectivo USD">Efectivo ($ USD)</option>
                  <option value="Efectivo Bs">Efectivo (Bs)</option>
                  <option value="Zelle">Zelle ($)</option>
                  <option value="Binance / USDT">Binance / USDT</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Número de Referencia / Comprobante</label>
                <input
                  type="text"
                  placeholder="Ej: Ref #0102-98765432 o Efectivo entregado en oficina"
                  value={pagoModal.referenciaPago}
                  onChange={(e) => setPagoModal(prev => ({ ...prev, referenciaPago: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha de Liquidación</label>
                <input
                  type="date"
                  value={pagoModal.fechaPago}
                  onChange={(e) => setPagoModal(prev => ({ ...prev, fechaPago: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nota u Observación (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Comentario para el empleado..."
                  value={pagoModal.comentario}
                  onChange={(e) => setPagoModal(prev => ({ ...prev, comentario: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPagoModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={handleConfirmarPago}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> {processing ? 'Procesando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Devolución / Rechazo */}
      {rechazoModal.isOpen && rechazoModal.relacion && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Devolver Relación de Gastos</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{rechazoModal.relacion.empleado}</p>
                </div>
              </div>
              <button 
                onClick={() => setRechazoModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-2">
              <label className="block font-bold text-slate-700">Observaciones y Correcciones Requeridas</label>
              <textarea
                rows={4}
                placeholder="Indica al empleado qué debe corregir o justificar (ej. falta adjuntar recibo de arancel)..."
                value={rechazoModal.motivo}
                onChange={(e) => setRechazoModal(prev => ({ ...prev, motivo: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRechazoModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={processing || !rechazoModal.motivo.trim()}
                onClick={handleConfirmarRechazo}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" /> {processing ? 'Enviando...' : 'Enviar Observación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. TARJETAS DE INDICADORES / KPI EJECUTIVOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tarjeta 1: Pendiente de Pago */}
        <div className="bg-white p-5 rounded-3xl border border-blue-200 shadow-md shadow-blue-950/8 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80">
                Por Liquidar / Pagar
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                ${totalPendienteUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">
                Bs {totalPendienteVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold shadow-2xs">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-600">
            <span>Solicitudes pendientes:</span>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg font-bold">{totalPendientesCount}</span>
          </div>
        </div>

        {/* Tarjeta 2: Total Liquidado */}
        <div className="bg-white p-5 rounded-3xl border border-blue-200 shadow-md shadow-blue-950/8">
          <div className="flex justify-between items-start">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                Total Liquidado & Pagado
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                ${totalPagadoUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-semibold text-emerald-700 mt-0.5">
                Bs {totalPagadoVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>Relaciones liquidadas:</span>
            <span className="font-bold text-slate-800">{relaciones.filter(r => r.estatus === 'Pagado').length}</span>
          </div>
        </div>

        {/* Tarjeta 3: Equipo y Rendiciones */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                Control de Auditoría
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {relaciones.length} Relaciones en Total
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {empleadosUnicos.length} miembros del equipo con gastos registrados
              </p>
            </div>
            <button
              onClick={onRefresh}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2.5 mt-2 flex items-center justify-between font-medium">
            <span>Supervisado por:</span>
            <span className="font-bold text-slate-800">{currentLoggedUser}</span>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE FILTROS AVANZADOS */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por empleado, expediente, trámite, concepto..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-slate-50/60 font-medium text-slate-800"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Período */}
            <select
              value={filterPeriodo}
              onChange={(e) => handlePeriodoChange(e.target.value as any)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 outline-none"
            >
              <option value="todas">Todos los Períodos</option>
              <option value="esta_semana">Esta Semana</option>
              <option value="semana_anterior">Semana Anterior</option>
              <option value="primera_quincena">1era Quincena (1-15)</option>
              <option value="segunda_quincena">2da Quincena (16-Fin)</option>
              <option value="este_mes">Este Mes</option>
            </select>

            {/* Filtro Empleado */}
            <select
              value={filterEmpleado}
              onChange={(e) => handleEmpleadoChange(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 outline-none"
            >
              <option value="todos">Todos los Empleados</option>
              {empleadosUnicos.map(emp => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>

            {/* Filtro Estatus */}
            <select
              value={filterEstatus}
              onChange={(e) => handleEstatusChange(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 outline-none"
            >
              <option value="todos">Todos los Estados</option>
              <option value="Pendiente">Pendientes por Pagar</option>
              <option value="Pagado">Pagados / Liquidados</option>
              <option value="Borrador">Borradores</option>
              <option value="Rechazado">Devueltos / Rechazados</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. RESUMEN DE REGISTROS Y CONTROL DE PAGINACIÓN SUPERIOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Relaciones de Gastos del Equipo
          </span>
          {filteredRelaciones.length > 0 && (
            <p className="text-xs text-slate-500 mt-0.5">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredRelaciones.length)} de {filteredRelaciones.length} relaciones registradas
            </p>
          )}
        </div>

        {/* Selector de cantidad por página */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Mostrar:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2.5 py-1 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer"
          >
            <option value={5}>5 por pág.</option>
            <option value={10}>10 por pág.</option>
            <option value={20}>20 por pág.</option>
            <option value={50}>50 por pág.</option>
            <option value={9999}>Todas</option>
          </select>
        </div>
      </div>

      {/* 4. LISTADO DE RELACIONES DE GASTOS */}
      <div className="space-y-3">
        {loading && relaciones.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200/90 text-center space-y-3 shadow-2xs animate-in fade-in">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">Sincronizando relaciones de gastos...</h4>
            <p className="text-xs text-slate-500">Consultando la base de datos central en tiempo real.</p>
          </div>
        ) : filteredRelaciones.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200/90 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No se encontraron relaciones de gastos</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No hay registros que coincidan con los filtros seleccionados o el equipo aún no ha enviado relaciones en este período.
            </p>
          </div>
        ) : (
          paginatedRelaciones.map((rel) => {
            const isExpanded = expandedId === rel.id;
            const itemsCount = (rel.items || []).length;
            const tramitesGroup = Array.from(new Set((rel.items || []).map(i => i.tramiteExpediente.trim()))).filter(Boolean);

            return (
              <div 
                key={rel.id} 
                className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                  isExpanded
                    ? 'border-blue-300 shadow-xs ring-1 ring-blue-200'
                    : 'border-slate-200/90 shadow-2xs hover:border-slate-300'
                }`}
              >
                {/* Encabezado Principal de la Relación */}
                <div 
                  className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 cursor-pointer select-none"
                  onClick={() => setExpandedId(isExpanded ? null : rel.id)}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold ${
                      rel.estatus === 'Pagado'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : rel.estatus === 'Pendiente'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      <Receipt className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {rel.titulo || `Gastos ${rel.periodo} - ${rel.empleado}`}
                        </span>

                        {/* Badges de Estado */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          rel.estatus === 'Pagado'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : rel.estatus === 'Pendiente'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : rel.estatus === 'Rechazado'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {rel.estatus === 'Pendiente' ? 'Por Pagar' : rel.estatus === 'Pagado' ? 'Pagado' : rel.estatus}
                        </span>

                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                          {rel.periodo} ({rel.fechaInicio || 'N/A'} - {rel.fechaFin || 'N/A'})
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1 flex-wrap">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-blue-600" /> {rel.empleado}
                        </span>
                        <span>•</span>
                        <span>{tramitesGroup.length} trámite(s)</span>
                        <span>•</span>
                        <span>{itemsCount} renglón(es)</span>
                        <span>•</span>
                        <span>Tasa: Bs {rel.tasaBcv?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Totales y Acciones Principales */}
                  <div className="flex items-center gap-2.5 self-end lg:self-center flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <div className="text-right mr-1">
                      <div className="text-base font-bold text-slate-900">
                        ${Number(rel.totalUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs font-medium text-slate-500">
                        Bs {Number(rel.totalVes || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Botón Acción Rápida: Pagar si está pendiente */}
                    {rel.estatus === 'Pendiente' && (
                      <button
                        onClick={() => handleOpenPagoModal(rel)}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Aprobar & Pagar
                      </button>
                    )}

                    {/* Botón Descargar PDF */}
                    <button
                      onClick={() => exportarRelacionGastosPDF(rel)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60 rounded-xl transition-all cursor-pointer"
                      title="Descargar PDF Oficial"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* Toggle Desplegar */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : rel.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                        isExpanded
                          ? 'bg-blue-600 text-white border-blue-500 shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>{isExpanded ? 'Ocultar' : 'Ver Detalle'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Detalle Desplegable */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-100 space-y-4 bg-white animate-in slide-in-from-top-1">
                    {/* Si está pagado, mostrar comprobante de liquidación */}
                    {rel.estatus === 'Pagado' && (
                      <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-emerald-950">
                              Liquidado el {rel.fechaPago || 'Fecha no registrada'} vía <span className="font-bold text-emerald-800">{rel.metodoPago || 'Pago'}</span>
                            </div>
                            <div className="text-[11px] text-emerald-700">
                              Referencia: <span className="font-mono font-bold">{rel.referenciaPago || 'Sin número de referencia'}</span>
                              {rel.pagadoPor && ` • Procesado por: ${rel.pagadoPor}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Si tiene comentarios de jefatura */}
                    {rel.comentariosJefatura && (
                      <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl text-xs text-blue-950">
                        <span className="font-bold">Observación de Jefatura: </span>
                        {rel.comentariosJefatura}
                      </div>
                    )}

                    {/* Tabla de Renglones de Gasto */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#dbeafe] text-[#1e3a8a] uppercase font-extrabold text-[10px] tracking-wider border-b border-blue-200">
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
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                                ${Number(item.montoUsd || 0).toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-slate-600 whitespace-nowrap">
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

                    {/* Botones de acción dentro del detalle */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {rel.estatus === 'Pendiente' && (
                          <button
                            onClick={() => setRechazoModal({ isOpen: true, relacion: rel, motivo: '' })}
                            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-rose-200"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Devolver con Observaciones
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => exportarRelacionGastosPDF(rel)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-500/20"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-100" /> Exportar PDF Oficial
                        </button>
                        <button
                          onClick={() => handleDeleteRelacion(rel)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* 5. CONTROLES DE PAGINACIÓN INFERIOR */}
      {filteredRelaciones.length > itemsPerPage && itemsPerPage < 9999 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200/80 px-2 flex-wrap gap-3">
          <span className="text-xs text-slate-500 font-medium">
            Página {currentPage} de {totalPages} ({filteredRelaciones.length} registros totales)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Primera página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((page, index, arr) => {
                const prevPage = arr[index - 1];
                const showEllipsis = prevPage && page - prevPage > 1;
                return (
                  <span key={page} className="flex items-center">
                    {showEllipsis && <span className="px-1 text-slate-400 text-xs">...</span>}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </button>
                  </span>
                );
              })}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Última página"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
