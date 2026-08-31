import React, { useState } from 'react';
import { 
  Plus, Trash2, Receipt, Calendar, 
  Upload, Image as ImageIcon, CheckCircle2, ArrowLeft,
  Save, Send, Eye, X
} from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import type { RelacionGastos, GastoItem, CategoriaGasto } from '../../types/gastos';
import { submitToServer, fileToDataUrl } from '../../lib/api';
import SystemAlertModal, { type AlertType } from '../common/SystemAlertModal';

interface FormRelacionGastosProps {
  initialData?: RelacionGastos | null;
  onSaveSuccess: () => void;
  onCancel: () => void;
  globalExpedientes?: any[];
}

const CATEGORIAS_RAPIDAS: { label: CategoriaGasto; icon: string; bg: string }[] = [
  { label: 'Fotocopias', icon: '📄', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Taxis / Traslados', icon: '🚕', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'Aranceles / Tasas', icon: '⚖️', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  { label: 'Timbres Fiscales', icon: '🏷️', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { label: 'Almuerzo / Refrigerio', icon: '☕', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
  { label: 'Estacionamiento', icon: '🅿️', bg: 'bg-slate-50 text-slate-700 border-slate-200' },
  { label: 'Papelería', icon: '📎', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { label: 'Gestión Externa', icon: '🏛️', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { label: 'Otro', icon: '📝', bg: 'bg-rose-50 text-rose-700 border-rose-200' }
];

export default function FormRelacionGastos({
  initialData,
  onSaveSuccess,
  onCancel,
  globalExpedientes = []
}: FormRelacionGastosProps) {
  const currentUserName = localStorage.getItem('rd_user_name') || 'Empleado';
  
  // Obtener tasa BCV desde localStorage si existe, o usar default
  const getInitialBcv = () => {
    try {
      const savedRate = localStorage.getItem('rd_live_bcv_rate');
      if (savedRate && !isNaN(Number(savedRate)) && Number(savedRate) > 0) {
        return Number(savedRate);
      }
    } catch (e) {}
    return 65.50; // Fallback seguro
  };

  const today = new Date();
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const [titulo, setTitulo] = useState(initialData?.titulo || `Gastos Semanales - ${format(today, 'dd/MM/yyyy')} - ${currentUserName}`);
  const [periodo, setPeriodo] = useState<'Semanal' | 'Quincenal' | 'Mensual' | 'Específico'>(initialData?.periodo || 'Semanal');
  const [fechaInicio, setFechaInicio] = useState(initialData?.fechaInicio || weekStart);
  const [fechaFin, setFechaFin] = useState(initialData?.fechaFin || weekEnd);
  const [tasaBcv, setTasaBcv] = useState<number>(initialData?.tasaBcv || getInitialBcv());
  
  // Lista de items de gasto
  const [items, setItems] = useState<GastoItem[]>(() => {
    if (initialData?.items && initialData.items.length > 0) {
      return initialData.items;
    }
    // Estado inicial: 1 trámite con 2 casillas de ejemplo
    return [
      {
        id: 'g_' + Math.random().toString(36).substring(7),
        tramiteExpediente: '',
        categoria: 'Fotocopias',
        descripcion: '',
        moneda: 'USD',
        monto: 0,
        montoUsd: 0,
        montoVes: 0,
        fechaGasto: format(today, 'yyyy-MM-dd')
      },
      {
        id: 'g_' + Math.random().toString(36).substring(7),
        tramiteExpediente: '',
        categoria: 'Taxis / Traslados',
        descripcion: '',
        moneda: 'USD',
        monto: 0,
        montoUsd: 0,
        montoVes: 0,
        fechaGasto: format(today, 'yyyy-MM-dd')
      }
    ];
  });

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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

  // Agrupar items por Trámite / Expediente
  const tramitesUnicos = Array.from(new Set(items.map(i => i.tramiteExpediente.trim()))).filter(t => t !== '');
  if (items.some(i => !i.tramiteExpediente.trim()) && !tramitesUnicos.includes('')) {
    tramitesUnicos.push('');
  }

  // Cálculos automáticos
  const totalUsd = items.reduce((acc, curr) => acc + (curr.montoUsd || 0), 0);
  const totalVes = items.reduce((acc, curr) => acc + (curr.montoVes || 0), 0);

  const handleUpdateItem = (id: string, updates: Partial<GastoItem>) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, ...updates };

      // Recalcular montos duales
      const currentRate = tasaBcv > 0 ? tasaBcv : 1;
      if ('monto' in updates || 'moneda' in updates) {
        const val = Number(updated.monto) || 0;
        if (updated.moneda === 'USD') {
          updated.montoUsd = val;
          updated.montoVes = Number((val * currentRate).toFixed(2));
        } else {
          updated.montoVes = val;
          updated.montoUsd = Number((val / currentRate).toFixed(2));
        }
      }
      return updated;
    }));
  };

  // Recalcular todo cuando cambie la tasa BCV
  const handleTasaChange = (newRate: number) => {
    setTasaBcv(newRate);
    if (newRate > 0) {
      setItems(prev => prev.map(item => {
        const val = Number(item.monto) || 0;
        if (item.moneda === 'USD') {
          return {
            ...item,
            montoUsd: val,
            montoVes: Number((val * newRate).toFixed(2))
          };
        } else {
          return {
            ...item,
            montoVes: val,
            montoUsd: Number((val / newRate).toFixed(2))
          };
        }
      }));
    }
  };

  const handleAddItemToTramite = (tramiteName: string) => {
    const newItem: GastoItem = {
      id: 'g_' + Math.random().toString(36).substring(7),
      tramiteExpediente: tramiteName,
      categoria: 'Fotocopias',
      descripcion: '',
      moneda: 'USD',
      monto: 0,
      montoUsd: 0,
      montoVes: 0,
      fechaGasto: format(today, 'yyyy-MM-dd')
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleAddNewTramite = () => {
    const defaultExp = globalExpedientes.length > 0 ? (globalExpedientes[0].numeroExpediente || '') : '';
    const nextNum = tramitesUnicos.length + 1;
    const initialTramiteName = defaultExp || `Trámite / Gestión #${nextNum}`;

    const newItem: GastoItem = {
      id: 'g_' + Math.random().toString(36).substring(7),
      tramiteExpediente: initialTramiteName,
      categoria: 'Fotocopias',
      descripcion: '',
      moneda: 'USD',
      monto: 0,
      montoUsd: 0,
      montoVes: 0,
      fechaGasto: format(today, 'yyyy-MM-dd')
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      setSystemAlert({
        isOpen: true,
        type: 'warning',
        title: 'Mínimo de Registros',
        message: 'La relación de gastos debe contener al menos un renglón.'
      });
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleFileUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setSystemAlert({
        isOpen: true,
        type: 'warning',
        title: 'Archivo demasiado grande',
        message: 'Por favor sube una imagen o comprobante menor a 5 MB.'
      });
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      handleUpdateItem(id, {
        comprobanteBase64: dataUrl,
        comprobanteName: file.name
      });
    } catch (err) {
      console.error('Error cargando comprobante:', err);
    }
  };

  const handleSubmit = async (targetEstatus: 'Borrador' | 'Pendiente') => {
    // Validaciones
    const validItems = items.filter(i => (i.monto && i.monto > 0) || i.descripcion.trim() !== '');
    if (validItems.length === 0) {
      setSystemAlert({
        isOpen: true,
        type: 'warning',
        title: 'Gastos Vacíos',
        message: 'Por favor añade al menos un gasto con su monto respectivo antes de guardar o enviar.'
      });
      return;
    }

    setSaving(true);
    const payload = {
      id: initialData?.id || 0,
      titulo: titulo.trim() || `Gastos (${periodo}) - ${currentUserName}`,
      empleado: currentUserName,
      periodo,
      fechaInicio,
      fechaFin,
      tasaBcv,
      totalUsd,
      totalVes,
      estatus: targetEstatus,
      items: items.map(i => ({
        ...i,
        montoUsd: Number(i.montoUsd || 0),
        montoVes: Number(i.montoVes || 0)
      }))
    };

    try {
      await submitToServer('/rd-intranet/v1/gastos', payload);
      setSystemAlert({
        isOpen: true,
        type: 'success',
        title: targetEstatus === 'Pendiente' ? '¡Relación Enviada a Jefatura!' : '¡Borrador Guardado!',
        message: targetEstatus === 'Pendiente' 
          ? 'Tu relación de gastos ha sido enviada con éxito a Jefatura. Se notificará a los socios para su revisión y liquidación.'
          : 'Tu relación de gastos se ha guardado en borrador. Podrás continuar editándola cuando desees.',
        onConfirm: () => {
          onSaveSuccess();
        }
      });
    } catch (err: any) {
      console.error('Error guardando relación de gastos:', err);
      // Fallback localstorage
      try {
        const localList = JSON.parse(localStorage.getItem('rd_local_gastos_drafts') || '[]');
        const updatedList = [payload, ...localList.filter((g: any) => g.id !== payload.id)];
        localStorage.setItem('rd_local_gastos_drafts', JSON.stringify(updatedList));
      } catch (e) {}

      setSystemAlert({
        isOpen: true,
        type: 'warning',
        title: 'Guardado Local',
        message: 'Se guardó la información localmente debido a una intermitencia de red con el servidor. Tu información está segura.'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <SystemAlertModal
        isOpen={systemAlert.isOpen}
        type={systemAlert.type}
        title={systemAlert.title}
        message={systemAlert.message}
        showCancel={systemAlert.showCancel}
        onConfirm={systemAlert.onConfirm}
        onClose={() => setSystemAlert(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Modal visor de comprobante */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="relative max-w-2xl w-full bg-slate-900 rounded-3xl p-4 border border-white/10 shadow-2xl flex flex-col items-center">
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-white font-bold text-sm mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-amber-400" /> Soporte / Factura Adjunta
            </div>
            <img 
              src={previewImage} 
              alt="Comprobante" 
              className="max-h-[75vh] w-auto rounded-2xl object-contain shadow-lg border border-slate-800"
            />
          </div>
        </div>
      )}

      {/* Barra Superior con botón Volver y Título */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all cursor-pointer"
            title="Volver al listado"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                Planilla de Desembolsos
              </span>
              <span className="text-xs font-bold text-slate-400">
                Responsable: {currentUserName}
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-0.5">
              {initialData ? 'Editar Relación de Gastos' : 'Nueva Relación de Gastos & Taxes'}
            </h2>
          </div>
        </div>

        {/* Resumen flotante de totales */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl flex items-center gap-3 border border-slate-800 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-black">
              $
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total a Reembolsar</div>
              <div className="text-sm font-black text-white flex items-center gap-2">
                <span>${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-xs text-amber-400 font-bold">/ Bs {totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuración de Período y Tasa BCV */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-500" /> Datos Generales de la Relación
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">Tasa Oficial BCV:</span>
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
              <span className="text-[11px] font-black text-amber-900">Bs</span>
              <input
                type="number"
                step="0.01"
                value={tasaBcv}
                onChange={(e) => handleTasaChange(Number(e.target.value))}
                className="w-20 text-xs font-black text-amber-900 bg-transparent outline-none text-right"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Título de la Relación</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Gastos Semana 35 - Tribunales Caracas"
              className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Frecuencia / Período</label>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as any)}
              className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none bg-white"
            >
              <option value="Semanal">Semanal (7 Días)</option>
              <option value="Quincenal">Quincenal (15 Días)</option>
              <option value="Mensual">Mensual</option>
              <option value="Específico">Trámite Específico / Puntual</option>
            </select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Desde</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Hasta</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Renglones de Gastos Agrupados por Trámite */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-600" /> Desglose de Gastos por Trámite o Gestión
            </h3>
            <p className="text-xs text-slate-500">
              Puedes asociar múltiples renglones (fotocopias, taxis, aranceles, timbres) a un mismo expediente o trámite.
            </p>
          </div>
          
          <button
            type="button"
            onClick={handleAddNewTramite}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" /> Añadir Otro Trámite
          </button>
        </div>

        {/* Renderizado de Bloques por Trámite */}
        {tramitesUnicos.map((tramiteName, tIndex) => {
          const itemsOfTramite = items.filter(i => i.tramiteExpediente.trim() === tramiteName.trim());
          const subtotalUsd = itemsOfTramite.reduce((acc, curr) => acc + (curr.montoUsd || 0), 0);
          const subtotalVes = itemsOfTramite.reduce((acc, curr) => acc + (curr.montoVes || 0), 0);

          return (
            <div 
              key={tramiteName || `empty_tramite_${tIndex}`} 
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden transition-all hover:border-slate-300"
            >
              {/* Encabezado del Trámite */}
              <div className="bg-slate-50/80 p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center shrink-0">
                    {tIndex + 1}
                  </div>
                  <div className="flex-1 max-w-md">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                      Trámite / Asunto Judicial o Gestión
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        list={`expedientes-list-${tIndex}`}
                        value={tramiteName}
                        placeholder="Ej: RD-J-2026-12779 o Notaría 1era de Valencia..."
                        onChange={(e) => {
                          const newName = e.target.value;
                          setItems(prev => prev.map(item => {
                            if (item.tramiteExpediente.trim() === tramiteName.trim()) {
                              return { ...item, tramiteExpediente: newName };
                            }
                            return item;
                          }));
                        }}
                        className="w-full px-3 py-1.5 text-xs font-bold text-slate-800 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      />
                      <datalist id={`expedientes-list-${tIndex}`}>
                        {globalExpedientes.map((exp: any, idx: number) => (
                          <option key={exp.id || idx} value={exp.numeroExpediente || exp.codigoCorrelativo}>
                            {exp.partes ? `${exp.numeroExpediente} - ${exp.partes}` : exp.numeroExpediente}
                          </option>
                        ))}
                      </datalist>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Subtotal Trámite</span>
                    <span className="text-xs font-black text-slate-800">
                      ${subtotalUsd.toFixed(2)} <span className="text-slate-400 font-medium">/ Bs {subtotalVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddItemToTramite(tramiteName)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-blue-200"
                  >
                    <Plus className="w-3.5 h-3.5" /> Añadir Casilla
                  </button>
                </div>
              </div>

              {/* Casillas / Renglones del Trámite */}
              <div className="p-4 space-y-3">
                {itemsOfTramite.map((item, rIndex) => (
                  <div 
                    key={item.id} 
                    className="p-3.5 bg-slate-50/50 rounded-2xl border border-slate-200/60 flex flex-col lg:flex-row items-start lg:items-center gap-3 transition-all hover:bg-slate-50"
                  >
                    <div className="w-6 h-6 rounded-lg bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {rIndex + 1}
                    </div>

                    {/* Selector de Categoría */}
                    <div className="w-full lg:w-48 shrink-0">
                      <select
                        value={item.categoria}
                        onChange={(e) => handleUpdateItem(item.id, { categoria: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-800 outline-none"
                      >
                        {CATEGORIAS_RAPIDAS.map(cat => (
                          <option key={cat.label} value={cat.label}>
                            {cat.icon} {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Detalle o Justificación */}
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        value={item.descripcion}
                        onChange={(e) => handleUpdateItem(item.id, { descripcion: e.target.value })}
                        placeholder="Descripción o justificación (ej. 15 fotocopias autenticadas + 2 traslados)..."
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Fecha del desembolso */}
                    <div className="w-full sm:w-32 shrink-0">
                      <input
                        type="date"
                        value={item.fechaGasto}
                        onChange={(e) => handleUpdateItem(item.id, { fechaGasto: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-600 outline-none"
                      />
                    </div>

                    {/* Moneda y Monto */}
                    <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
                      <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white">
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(item.id, { moneda: 'USD' })}
                          className={`px-2 py-1 text-[11px] font-black transition-colors ${
                            item.moneda === 'USD' ? 'bg-amber-400 text-slate-950' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          $
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(item.id, { moneda: 'VES' })}
                          className={`px-2 py-1 text-[11px] font-black transition-colors ${
                            item.moneda === 'VES' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Bs
                        </button>
                      </div>

                      <div className="relative w-28">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={item.monto || ''}
                          onChange={(e) => handleUpdateItem(item.id, { monto: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 text-xs font-black text-slate-900 rounded-xl border border-slate-200 bg-white outline-none text-right focus:border-amber-500"
                        />
                      </div>

                      {/* Equivalente en la otra moneda */}
                      <div className="w-24 text-right">
                        <span className="text-[10px] text-slate-400 font-bold block">
                          {item.moneda === 'USD' ? 'En Bs:' : 'En $: '}
                        </span>
                        <span className="text-[11px] font-extrabold text-slate-700">
                          {item.moneda === 'USD' 
                            ? `Bs ${Number(item.montoVes || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}` 
                            : `$ ${Number(item.montoUsd || 0).toFixed(2)}`}
                        </span>
                      </div>
                    </div>

                    {/* Soporte / Comprobante */}
                    <div className="flex items-center gap-2 shrink-0">
                      {item.comprobanteBase64 ? (
                        <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setPreviewImage(item.comprobanteBase64 || null)}
                            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold flex items-center gap-1 cursor-pointer"
                            title="Ver Comprobante"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver Foto
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item.id, { comprobanteBase64: undefined, comprobanteName: undefined })}
                            className="text-slate-400 hover:text-rose-500 cursor-pointer ml-1"
                            title="Eliminar comprobante"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-dashed border-slate-300 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors">
                          <Upload className="w-3 h-3 text-slate-400" />
                          <span>Adjuntar</span>
                          <input 
                            type="file" 
                            accept="image/*,application/pdf" 
                            className="hidden" 
                            onChange={(e) => handleFileUpload(item.id, e)}
                          />
                        </label>
                      )}

                      {/* Eliminar renglón */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Eliminar este renglón"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Botones Inferiores de Acción */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Los gastos enviados a Jefatura activarán una notificación para su aprobación y pago.</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit('Borrador')}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Guardar Borrador
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit('Pendiente')}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" /> {saving ? 'Enviando...' : 'Enviar a Jefatura para Pago'}
          </button>
        </div>
      </div>
    </div>
  );
}
