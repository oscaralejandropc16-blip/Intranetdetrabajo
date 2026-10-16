import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, DollarSign, TrendingUp, TrendingDown, Landmark, 
  Receipt, CheckCircle2, Clock, 
  FileText, Building, CreditCard, RefreshCw, 
  Plus, Trash2, Edit3, Filter, Copy, Check, X, ShieldCheck
} from 'lucide-react';
import type { Actuacion } from '../../types/libros';
import SystemAlertModal from '../common/SystemAlertModal';

interface EstudioContabilidadProps {
  actuaciones: Actuacion[];
  setActuaciones: React.Dispatch<React.SetStateAction<Actuacion[]>>;
  pendingTasks?: any[];
  setPendingTasks?: any;
  reportSubmitted: boolean;
}

// Estructura de un Asiento / Operación Contable
export interface ContabilidadEntry {
  id: string;
  hora: string;
  categoria: 'Bancos & Conciliación' | 'Tributos SENIAT' | 'Impuestos Municipales' | 'Retenciones IVA / ISLR' | 'Nómina & Parafiscales' | 'Cuentas por Cobrar' | 'Cuentas por Pagar & Caja Chica' | 'Cierre Contable & Auditoría';
  subtipo: string;
  referencia: string;
  monto: number;
  moneda: 'USD' | 'VES';
  montoVes?: number;
  montoUsd?: number;
  tipoMovimiento: 'Ingreso' | 'Egreso' | 'Retención' | 'Declaración' | 'Conciliación' | 'Informativo';
  descripcion: string;
  bancoOEntidad?: string;
  estado: 'Conciliado' | 'Declarado' | 'En Proceso' | 'Pendiente' | 'Por Revisar';
  observaciones?: string;
  calculoFiscal?: {
    baseImponible: number;
    iva16: number;
    retencionIvaPct: number;
    retencionIvaMonto: number;
    retencionIslrPct: number;
    retencionIslrMonto: number;
    netoPagar: number;
  };
}

// Bancos y Entidades habituales del despacho Román & Delgado
const BANCOS_ENTIDADES = [
  'Banesco Banco Universal (Cta. Corriente Bs.)',
  'Banesco Banco Universal (Cta. Verde USD)',
  'Banco Mercantil (Cta. Corriente Bs.)',
  'Banco de Venezuela (Cta. Corriente)',
  'Banco del Tesoro',
  'Caja Chica Despacho (Efectivo)',
  'SENIAT (Portal Fiscal Nacional)',
  'Alcaldía de Valencia (SEMAT)',
  'IVSS / TIUNA (Seguro Social)',
  'FAOV / BANAVIH (Ahorro Habitacional)',
  'INCES'
];

// Categorías contables
const CATEGORIAS_CONTABLES = [
  { id: 'Bancos & Conciliación', label: 'Bancos & Conciliación', icon: Landmark, color: 'blue' },
  { id: 'Retenciones IVA / ISLR', label: 'Retenciones IVA / ISLR', icon: Receipt, color: 'indigo' },
  { id: 'Tributos SENIAT', label: 'Tributos SENIAT', icon: ShieldCheck, color: 'purple' },
  { id: 'Impuestos Municipales', label: 'Alcaldía / SEMAT', icon: Building, color: 'amber' },
  { id: 'Nómina & Parafiscales', label: 'Nómina & Parafiscales', icon: CreditCard, color: 'emerald' },
  { id: 'Cuentas por Cobrar', label: 'Cobranza Clientes', icon: TrendingUp, color: 'teal' },
  { id: 'Cuentas por Pagar & Caja Chica', label: 'Pagos & Caja Chica', icon: TrendingDown, color: 'rose' },
  { id: 'Cierre Contable & Auditoría', label: 'Cierre & Auditoría', icon: FileText, color: 'slate' },
];

// Plantillas de 1 Clic para agilizar el registro diario
const PLANTILLAS_RAPIDAS = [
  {
    titulo: 'Conciliación Bancaria Diaria',
    categoria: 'Bancos & Conciliación' as const,
    subtipo: 'Conciliación de Extracto',
    banco: 'Banesco Banco Universal (Cta. Corriente Bs.)',
    tipoMovimiento: 'Conciliación' as const,
    monto: 0,
    moneda: 'VES' as const,
    referencia: 'CONC-BANESCO',
    descripcion: 'Conciliación de saldos en libro mayor vs. extracto bancario diario. Verificación de débitos y créditos.',
    estado: 'Conciliado' as const
  },
  {
    titulo: 'Retención de IVA 75% Emitida',
    categoria: 'Retenciones IVA / ISLR' as const,
    subtipo: 'Comprobante IVA 75%',
    banco: 'SENIAT (Portal Fiscal Nacional)',
    tipoMovimiento: 'Retención' as const,
    monto: 0,
    moneda: 'VES' as const,
    referencia: 'COMP-RET-IVA',
    descripcion: 'Emisión y entrega de comprobante de retención del 75% del IVA a proveedor por servicios profesionales.',
    estado: 'Declarado' as const
  },
  {
    titulo: 'Retención de ISLR 3% / 5%',
    categoria: 'Retenciones IVA / ISLR' as const,
    subtipo: 'Retención ISLR Dcto. 1808',
    banco: 'SENIAT (Portal Fiscal Nacional)',
    tipoMovimiento: 'Retención' as const,
    monto: 0,
    moneda: 'VES' as const,
    referencia: 'RET-ISLR-1808',
    descripcion: 'Cálculo y aplicación de retención de Impuesto Sobre la Renta según Decreto 1808.',
    estado: 'Conciliado' as const
  },
  {
    titulo: 'Cuadre y Arqueo de Caja Chica',
    categoria: 'Cuentas por Pagar & Caja Chica' as const,
    subtipo: 'Arqueo de Fondos',
    banco: 'Caja Chica Despacho (Efectivo)',
    tipoMovimiento: 'Egreso' as const,
    monto: 50,
    moneda: 'USD' as const,
    referencia: 'ARQUEO-CC',
    descripcion: 'Revisión de facturas, recibos y cuadre físico de fondos de caja chica para gastos operativos de la sede.',
    estado: 'Conciliado' as const
  },
  {
    titulo: 'Verificación de Nómina Quincenal',
    categoria: 'Nómina & Parafiscales' as const,
    subtipo: 'Auditoría Nómina',
    banco: 'Banesco Banco Universal (Cta. Corriente Bs.)',
    tipoMovimiento: 'Informativo' as const,
    monto: 0,
    moneda: 'USD' as const,
    referencia: 'AUD-NOM-QUINC',
    descripcion: 'Revisión y cuadre de recibos de honorarios y asignaciones del personal del despacho para el pago quincenal.',
    estado: 'Conciliado' as const
  },
  {
    titulo: 'Declaración Quincenal SENIAT (IVA)',
    categoria: 'Tributos SENIAT' as const,
    subtipo: 'Declaración Quincenal',
    banco: 'SENIAT (Portal Fiscal Nacional)',
    tipoMovimiento: 'Declaración' as const,
    monto: 0,
    moneda: 'VES' as const,
    referencia: 'SENIAT-IVA-QUINC',
    descripcion: 'Carga de archivo XML en el portal fiscal del SENIAT y obtención de certificado de declaración quincenal.',
    estado: 'Declarado' as const
  }
];

export default function EstudioContabilidad({
  actuaciones,
  setActuaciones,
  reportSubmitted
}: EstudioContabilidadProps) {

  // Tasa Oficial de Cambio (BCV)
  const [tasaBcv, setTasaBcv] = useState<number>(() => {
    const saved = localStorage.getItem('rd_bcv_usd') || localStorage.getItem('rd_live_bcv_rate');
    return saved && Number(saved) > 0 ? Number(saved) : 877.90;
  });
  const [loadingBcv, setLoadingBcv] = useState<boolean>(false);

  // Escuchar actualizaciones de tasa BCV en vivo
  useEffect(() => {
    const handleBcvUpdate = (e: any) => {
      const live = Number(e?.detail || localStorage.getItem('rd_bcv_usd'));
      if (live && live > 0) setTasaBcv(live);
    };

    window.addEventListener('rd_bcv_updated', handleBcvUpdate);

    // Intentar consulta inicial si la tasa es por defecto
    if (!localStorage.getItem('rd_bcv_usd')) {
      setLoadingBcv(true);
      fetch('https://ve.dolarapi.com/v1/dolares/oficial')
        .then(res => res.json())
        .then(data => {
          if (data?.promedio) {
            setTasaBcv(data.promedio);
            localStorage.setItem('rd_bcv_usd', String(data.promedio));
          }
        })
        .catch(() => {})
        .finally(() => setLoadingBcv(false));
    }

    return () => window.removeEventListener('rd_bcv_updated', handleBcvUpdate);
  }, []);

  const refreshBcvRate = async () => {
    setLoadingBcv(true);
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      const data = await res.json();
      if (data?.promedio) {
        setTasaBcv(data.promedio);
        localStorage.setItem('rd_bcv_usd', String(data.promedio));
        window.dispatchEvent(new CustomEvent('rd_bcv_updated', { detail: data.promedio }));
      }
    } catch (e) {
      console.warn('No se pudo refrescar tasa BCV:', e);
    } finally {
      setLoadingBcv(false);
    }
  };

  // Estados de interfaz
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  const [filtroMoneda, setFiltroMoneda] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [copiadoCalc, setCopiadoCalc] = useState(false);

  // Modal de alertas del sistema (Sin alert nativo)
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

  // Estado de la calculadora rápida de retenciones e impuestos
  const [calcBase, setCalcBase] = useState<number>(100);
  const [calcMoneda, setCalcMoneda] = useState<'USD' | 'VES'>('USD');
  const [calcRetIvaPct, setCalcRetIvaPct] = useState<number>(75); // 75% o 100%
  const [calcRetIslrPct, setCalcRetIslrPct] = useState<number>(3); // 1%, 2%, 3%, 5%

  // Cálculos reactivos de la calculadora fiscal
  const calcResultados = useMemo(() => {
    const base = Number(calcBase) || 0;
    const baseVes = calcMoneda === 'USD' ? base * tasaBcv : base;
    const baseUsd = calcMoneda === 'VES' && tasaBcv > 0 ? base / tasaBcv : base;

    const iva16 = base * 0.16;
    const totalConIva = base + iva16;
    const retIvaMonto = iva16 * (calcRetIvaPct / 100);
    const retIslrMonto = base * (calcRetIslrPct / 100);
    const totalRetenciones = retIvaMonto + retIslrMonto;
    const netoPagar = totalConIva - totalRetenciones;

    return {
      base,
      baseVes,
      baseUsd,
      iva16,
      totalConIva,
      retIvaMonto,
      retIslrMonto,
      totalRetenciones,
      netoPagar
    };
  }, [calcBase, calcMoneda, calcRetIvaPct, calcRetIslrPct, tasaBcv]);

  // Formulario de creación / edición de asiento
  const [formData, setFormData] = useState<ContabilidadEntry>({
    id: '',
    hora: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false }),
    categoria: 'Bancos & Conciliación',
    subtipo: 'Conciliación Bancaria',
    referencia: '',
    monto: 0,
    moneda: 'USD',
    tipoMovimiento: 'Conciliación',
    descripcion: '',
    bancoOEntidad: BANCOS_ENTIDADES[0],
    estado: 'Conciliado',
    observaciones: ''
  });

  // Parsear actuaciones existentes de KANT hacia asientos contables
  const asientos: ContabilidadEntry[] = useMemo(() => {
    return actuaciones.map(act => {
      const anyAct = act as any;
      if (anyAct.contabilidadData) {
        return anyAct.contabilidadData;
      }

      // Fallback: parsear desde formato estándar si viene de la base de datos
      const catMatch = act.numeroAsunto.match(/\[(.*?)\]/);
      const catParsed = (catMatch ? catMatch[1] : 'Bancos & Conciliación') as ContabilidadEntry['categoria'];

      let moneda: 'USD' | 'VES' = 'USD';
      let monto = 0;
      if (act.partes?.includes('Bs.')) {
        moneda = 'VES';
        const numPart = act.partes.split('Bs.')[1]?.split('|')[0]?.trim();
        monto = parseFloat((numPart || '0').replace(/\./g, '').replace(',', '.')) || 0;
      } else if (act.partes?.includes('$')) {
        moneda = 'USD';
        const numPart = act.partes.split('$')[1]?.split('|')[0]?.trim();
        monto = parseFloat(numPart || '0') || 0;
      }

      let tipoMov: ContabilidadEntry['tipoMovimiento'] = 'Conciliación';
      const text = (act.numeroAsunto + ' ' + (act.partes || '') + ' ' + act.actuacion).toLowerCase();
      if (text.includes('ingreso') || text.includes('cobro') || text.includes('honorarios recibidos')) {
        tipoMov = 'Ingreso';
      } else if (text.includes('egreso') || text.includes('pago') || text.includes('gasto') || text.includes('compra')) {
        tipoMov = 'Egreso';
      } else if (text.includes('retención') || text.includes('retencion') || text.includes('islr') || text.includes('iva')) {
        tipoMov = 'Retención';
      } else if (text.includes('declaración') || text.includes('declaracion') || text.includes('seniat') || text.includes('semat')) {
        tipoMov = 'Declaración';
      }

      return {
        id: act.id,
        hora: act.hora || '08:00',
        categoria: catParsed,
        subtipo: act.numeroAsunto.split('•')[0]?.replace(/\[.*?\]/, '').trim() || 'Operación Contable',
        referencia: act.partes?.includes('Ref:') ? act.partes.split('Ref:')[1]?.split('|')[0]?.trim() : 'REF-S/N',
        monto,
        moneda,
        tipoMovimiento: tipoMov,
        descripcion: act.actuacion || 'Asiento contable registrado en bitácora',
        bancoOEntidad: BANCOS_ENTIDADES[0],
        estado: (act.estado === 'Completada' ? 'Conciliado' : 'Pendiente') as any,
        observaciones: act.observaciones || ''
      };
    });
  }, [actuaciones]);

  // Métricas y KPIs Contables
  const kpis = useMemo(() => {
    let totalUsd = 0;
    let totalVes = 0;
    let totalIngresosUsd = 0;
    let totalEgresosUsd = 0;
    let conciliadosCount = 0;

    asientos.forEach(a => {
      const val = Number(a.monto) || 0;
      const inUsd = a.moneda === 'USD' ? val : (tasaBcv > 0 ? val / tasaBcv : 0);

      if (a.tipoMovimiento === 'Ingreso') totalIngresosUsd += inUsd;
      if (a.tipoMovimiento === 'Egreso') totalEgresosUsd += inUsd;

      if (a.moneda === 'USD') totalUsd += val;
      if (a.moneda === 'VES') totalVes += val;

      if (a.estado === 'Conciliado' || a.estado === 'Declarado') conciliadosCount++;
    });

    const porcentajeConciliado = asientos.length > 0 ? Math.round((conciliadosCount / asientos.length) * 100) : 100;

    return {
      totalAsientos: asientos.length,
      conciliadosCount,
      porcentajeConciliado,
      totalUsd,
      totalVes,
      totalIngresosUsd,
      totalEgresosUsd
    };
  }, [asientos, tasaBcv]);

  // Asientos filtrados
  const filteredAsientos = useMemo(() => {
    return asientos.filter(a => {
      if (filtroCategoria !== 'todos' && a.categoria !== filtroCategoria) return false;
      if (filtroMoneda !== 'todos' && a.moneda !== filtroMoneda) return false;
      if (filtroEstado !== 'todos' && a.estado !== filtroEstado) return false;
      return true;
    });
  }, [asientos, filtroCategoria, filtroMoneda, filtroEstado]);

  // Manejo de abrir modal nuevo
  const handleOpenNuevo = () => {
    setEditingId(null);
    setFormData({
      id: `cnt_${Date.now()}`,
      hora: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false }),
      categoria: 'Bancos & Conciliación',
      subtipo: 'Conciliación Bancaria',
      referencia: '',
      monto: 0,
      moneda: 'USD',
      tipoMovimiento: 'Conciliación',
      descripcion: '',
      bancoOEntidad: BANCOS_ENTIDADES[0],
      estado: 'Conciliado',
      observaciones: ''
    });
    setModalOpen(true);
  };

  // Abrir modal con plantilla rápida
  const handleAplicarPlantilla = (p: typeof PLANTILLAS_RAPIDAS[0]) => {
    setEditingId(null);
    setFormData({
      id: `cnt_${Date.now()}`,
      hora: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false }),
      categoria: p.categoria,
      subtipo: p.subtipo,
      referencia: p.referencia,
      monto: p.monto,
      moneda: p.moneda,
      tipoMovimiento: p.tipoMovimiento,
      descripcion: p.descripcion,
      bancoOEntidad: p.banco,
      estado: p.estado,
      observaciones: ''
    });
    setModalOpen(true);
  };

  // Cargar cálculo de la calculadora al formulario
  const handleInsertarCalculoEnAsiento = () => {
    const desc = `Cálculo Fiscal Factura | Base: ${calcResultados.base.toFixed(2)} ${calcMoneda} | IVA 16%: ${calcResultados.iva16.toFixed(2)} | Ret. IVA (${calcRetIvaPct}%): ${calcResultados.retIvaMonto.toFixed(2)} | Ret. ISLR (${calcRetIslrPct}%): ${calcResultados.retIslrMonto.toFixed(2)} | Neto a Pagar: ${calcResultados.netoPagar.toFixed(2)} ${calcMoneda}`;
    
    setEditingId(null);
    setFormData({
      id: `cnt_${Date.now()}`,
      hora: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false }),
      categoria: 'Retenciones IVA / ISLR',
      subtipo: 'Liquidación con Retenciones',
      referencia: 'CALC-RET-' + Date.now().toString().slice(-4),
      monto: Number(calcResultados.netoPagar.toFixed(2)),
      moneda: calcMoneda,
      tipoMovimiento: 'Retención',
      descripcion: desc,
      bancoOEntidad: BANCOS_ENTIDADES[0],
      estado: 'Conciliado',
      observaciones: `Base imponible: ${calcResultados.base} ${calcMoneda}. Tasa BCV referencia: ${tasaBcv.toFixed(2)} Bs./$`,
      calculoFiscal: {
        baseImponible: calcResultados.base,
        iva16: calcResultados.iva16,
        retencionIvaPct: calcRetIvaPct,
        retencionIvaMonto: calcResultados.retIvaMonto,
        retencionIslrPct: calcRetIslrPct,
        retencionIslrMonto: calcResultados.retIslrMonto,
        netoPagar: calcResultados.netoPagar
      }
    });
    setModalOpen(true);
  };

  // Copiar resumen de retención
  const handleCopiarResumenCalculo = () => {
    const text = `RESUMEN DE LIQUIDACIÓN Y RETENCIONES FISCALES (KANT)
• Base Imponible: ${calcResultados.base.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ${calcMoneda}
• IVA 16%: ${calcResultados.iva16.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ${calcMoneda}
• Total Factura: ${calcResultados.totalConIva.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ${calcMoneda}
• Retención IVA (${calcRetIvaPct}%): -${calcResultados.retIvaMonto.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ${calcMoneda}
• Retención ISLR (${calcRetIslrPct}%): -${calcResultados.retIslrMonto.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ${calcMoneda}
• Total Retenciones: -${calcResultados.totalRetenciones.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ${calcMoneda}
----------------------------------------
NETO A TRANSFERIR: ${calcResultados.netoPagar.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ${calcMoneda}
(Equivalente Bs. BCV @ ${tasaBcv.toFixed(2)}: Bs. ${(calcResultados.netoPagar * (calcMoneda === 'USD' ? tasaBcv : 1)).toLocaleString('es-VE', { minimumFractionDigits: 2 })})`;

    navigator.clipboard.writeText(text);
    setCopiadoCalc(true);
    setTimeout(() => setCopiadoCalc(false), 2000);
  };

  // Abrir modal para editar
  const handleOpenEditar = (asiento: ContabilidadEntry) => {
    setEditingId(asiento.id);
    setFormData({ ...asiento });
    setModalOpen(true);
  };

  // Guardar asiento contable en actuaciones
  const handleGuardarAsiento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descripcion.trim()) {
      setAlertConfig({
        isOpen: true,
        type: 'warning',
        title: 'Descripción Requerida',
        message: 'Por favor ingresa la descripción o detalle de la operación contable para que quede formalizada en la bitácora diaria.',
        showCancel: false,
        confirmText: 'Entendido'
      });
      return;
    }

    const formattedMonto = formData.moneda === 'USD' 
      ? `$${Number(formData.monto).toFixed(2)}` 
      : `Bs. ${Number(formData.monto).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;

    const formattedAsunto = `[${formData.categoria}] ${formData.subtipo} • ${formData.descripcion.slice(0, 48)}`;
    const formattedPartes = `Ref: ${formData.referencia || 'S/N'} | Monto: ${formattedMonto} | Banco/Ente: ${formData.bancoOEntidad || 'General'} | Estado: ${formData.estado}`;

    const enrichedActuacion: any = {
      id: editingId || formData.id || `cnt_${Date.now()}`,
      hora: formData.hora,
      numeroAsunto: formattedAsunto,
      partes: formattedPartes,
      actuacion: formData.descripcion.trim(),
      estado: (formData.estado === 'Conciliado' || formData.estado === 'Declarado') ? 'Completada' : 'En trámite',
      observaciones: formData.observaciones || '',
      contabilidadData: {
        ...formData,
        id: editingId || formData.id || `cnt_${Date.now()}`
      }
    };

    if (editingId) {
      setActuaciones(prev => prev.map(a => a.id === editingId ? enrichedActuacion : a));
    } else {
      setActuaciones(prev => [...prev, enrichedActuacion]);
    }

    setModalOpen(false);
  };

  // Solicitar eliminación de asiento contable
  const handleSolicitarEliminar = (asiento: ContabilidadEntry) => {
    setAlertConfig({
      isOpen: true,
      type: 'warning',
      title: 'Eliminar Registro Contable',
      message: `¿Estás seguro de que deseas eliminar la operación "${asiento.subtipo}" (Ref: ${asiento.referencia || 'S/N'})?`,
      showCancel: true,
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      isDestructive: true,
      onConfirm: () => {
        setActuaciones(prev => prev.filter(a => a.id !== asiento.id));
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* BANNER PRINCIPAL: CORPORATE ACCOUNTING & FINANCE */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-6 lg:p-8 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-blue-400" />
                Departamento de Contabilidad & Finanzas
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-slate-200 border border-white/10">
                Martín Delgado (Contador Oficial)
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Panel de Control Contable & Tributario
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl font-medium leading-relaxed">
              Conciliación bancaria multimoneda, emisión de retenciones IVA / ISLR, seguimiento del calendario fiscal del SENIAT y registro de asientos diarios de Román & Delgado.
            </p>
          </div>

          {/* TARJETA TASA BCV OFICIAL */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/15 shadow-inner">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-400/30">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">Tasa Oficial BCV</span>
                <button 
                  onClick={refreshBcvRate}
                  disabled={loadingBcv}
                  className="text-slate-400 hover:text-white transition-colors p-0.5 rounded cursor-pointer"
                  title="Actualizar tasa BCV oficial"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingBcv ? 'animate-spin text-blue-400' : ''}`} />
                </button>
              </div>
              <div className="text-lg font-black text-white font-mono tracking-tight">
                Bs. {tasaBcv.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-xs text-emerald-400 font-sans ml-1">/ USD</span>
              </div>
            </div>
          </div>
        </div>

        {/* BARRA DE ACCIONES RÁPIDAS EN BANNER */}
        <div className="relative z-10 mt-6 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                showCalculator 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
              }`}
            >
              <Calculator className="w-4 h-4 text-cyan-300" />
              <span>{showCalculator ? 'Ocultar Calculadora Fiscal' : 'Abrir Calculadora de Retenciones'}</span>
            </button>
          </div>

          {!reportSubmitted && (
            <button
              onClick={handleOpenNuevo}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Asiento / Registro Contable</span>
            </button>
          )}
        </div>
      </div>

      {/* WIDGET: CALCULADORA RÁPIDA DE RETENCIONES FISCALES E IVA (COLAPSABLE / INTERACTIVA) */}
      {showCalculator && (
        <div className="bg-white rounded-3xl p-6 lg:p-8 border border-blue-200 shadow-md space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 shadow-inner">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">Calculadora de Retenciones (SENIAT)</h3>
                <p className="text-xs text-slate-500 font-medium">Desglose instantáneo de Base, IVA 16%, Retención IVA y Retención ISLR según normativa venezolana.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopiarResumenCalculo}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiadoCalc ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copiadoCalc ? '¡Copiado!' : 'Copiar Resumen'}</span>
              </button>
              {!reportSubmitted && (
                <button
                  onClick={handleInsertarCalculoEnAsiento}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cargar en Asiento</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* INPUT BASE */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Monto Base Imponible</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={calcBase}
                  onChange={(e) => setCalcBase(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
                <div className="absolute right-2 top-2 flex bg-slate-200 p-0.5 rounded-lg text-[10px] font-black">
                  <button
                    type="button"
                    onClick={() => setCalcMoneda('USD')}
                    className={`px-2 py-0.5 rounded-md cursor-pointer ${calcMoneda === 'USD' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'}`}
                  >
                    USD
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcMoneda('VES')}
                    className={`px-2 py-0.5 rounded-md cursor-pointer ${calcMoneda === 'VES' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'}`}
                  >
                    VES
                  </button>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {calcMoneda === 'USD' 
                  ? `≈ Bs. ${calcResultados.baseVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` 
                  : `≈ $${calcResultados.baseUsd.toFixed(2)} USD`}
              </span>
            </div>

            {/* IVA 16% (AUTOMATICO) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">IVA 16% (Calculado)</label>
              <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-700">
                {calcResultados.iva16.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {calcMoneda}
              </div>
              <span className="text-[10px] text-slate-400">Total con IVA: {calcResultados.totalConIva.toLocaleString('es-VE', { minimumFractionDigits: 2 })} {calcMoneda}</span>
            </div>

            {/* SELECTOR RETENCION IVA */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Retención de IVA</label>
              <select
                value={calcRetIvaPct}
                onChange={(e) => setCalcRetIvaPct(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
              >
                <option value={75}>75% (Contribuyente Especial)</option>
                <option value={100}>100% (Retención Total)</option>
                <option value={0}>0% (Sin Retención)</option>
              </select>
              <span className="text-[10px] font-mono text-rose-600 font-bold">
                - {calcResultados.retIvaMonto.toLocaleString('es-VE', { minimumFractionDigits: 2 })} {calcMoneda}
              </span>
            </div>

            {/* SELECTOR RETENCION ISLR */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Retención ISLR (Dcto. 1808)</label>
              <select
                value={calcRetIslrPct}
                onChange={(e) => setCalcRetIslrPct(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
              >
                <option value={3}>3% (Honorarios Prof. Pers. Natural)</option>
                <option value={5}>5% (Honorarios Prof. Pers. Jurídica)</option>
                <option value={2}>2% (Servicios Generales)</option>
                <option value={1}>1% (Venta de Bienes Muebles)</option>
                <option value={0}>0% (Sin Retención ISLR)</option>
              </select>
              <span className="text-[10px] font-mono text-rose-600 font-bold">
                - {calcResultados.retIslrMonto.toLocaleString('es-VE', { minimumFractionDigits: 2 })} {calcMoneda}
              </span>
            </div>
          </div>

          {/* BARRA RESULTADO NETO */}
          <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-300 block">Total Neto a Pagar / Transferir al Proveedor</span>
                <span className="text-[11px] text-slate-400">Total con IVA menos retenciones de IVA e ISLR</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                {calcResultados.netoPagar.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {calcMoneda}
              </div>
              <div className="text-[11px] text-slate-300 font-mono">
                {calcMoneda === 'USD' 
                  ? `Equivalente: Bs. ${(calcResultados.netoPagar * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2 })}` 
                  : `Equivalente: $${(calcResultados.netoPagar / (tasaBcv || 1)).toFixed(2)} USD`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CRONOGRAMA & CUMPLIMIENTO FISCAL VENEZUELA (SENIAT, ALCALDÍA, PARAFISCALES) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* IVA SENIAT */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">SENIAT • IVA</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
              Quincenal
            </span>
          </div>
          <div>
            <div className="text-sm font-black text-slate-800">Retenciones de IVA</div>
            <p className="text-xs text-slate-500 mt-0.5">Declaración quincenal y emisión de TXT / XML para portal fiscal.</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Estado:</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Al día
            </span>
          </div>
        </div>

        {/* ISLR SENIAT */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">SENIAT • ISLR</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
              Mensual
            </span>
          </div>
          <div>
            <div className="text-sm font-black text-slate-800">Retenciones ISLR (1808)</div>
            <p className="text-xs text-slate-500 mt-0.5">Declaración mensual de honorarios y servicios retenidos.</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Vence:</span>
            <span className="font-bold text-slate-700">Día 10 del mes</span>
          </div>
        </div>

        {/* ALCALDÍA DE VALENCIA */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">SEMAT VALENCIA</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
              Municipal
            </span>
          </div>
          <div>
            <div className="text-sm font-black text-slate-800">Actividades Económicas</div>
            <p className="text-xs text-slate-500 mt-0.5">Patente municipal sobre ingresos brutos del despacho.</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Estado:</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> En regla
            </span>
          </div>
        </div>

        {/* PARAFISCALES */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">PARAFISCALES</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">
              IVSS / FAOV
            </span>
          </div>
          <div>
            <div className="text-sm font-black text-slate-800">Seguridad Social & Vivienda</div>
            <p className="text-xs text-slate-500 mt-0.5">Aportes patronales y retenciones del personal en TIUNA y BANAVIH.</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Nómina:</span>
            <span className="font-bold text-blue-600">Verificada</span>
          </div>
        </div>
      </div>

      {/* PLANTILLAS DE 1 CLIC PARA TAREAS FRECUENTES */}
      {!reportSubmitted && (
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Operaciones Frecuentes (1 Clic)
              </h4>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Haz clic para registrar rápidamente</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {PLANTILLAS_RAPIDAS.map((plantilla, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAplicarPlantilla(plantilla)}
                className="text-left p-3 bg-white hover:bg-blue-50/50 hover:border-blue-300 rounded-xl border border-slate-200 transition-all group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-slate-800 group-hover:text-blue-700 transition-colors">
                    {plantilla.titulo}
                  </span>
                  <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1">{plantilla.descripcion}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* METRICAS DE LA JORNADA CONTABLE */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Asientos Hoy</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{kpis.totalAsientos}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {kpis.conciliadosCount} de {kpis.totalAsientos} conciliados ({kpis.porcentajeConciliado}%)
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Flujo Divisas</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            ${kpis.totalUsd.toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-medium font-mono">
            USD registrados hoy
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Flujo Bolívares</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono truncate" title={`Bs. ${kpis.totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}>
            Bs. {kpis.totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Movimientos en moneda nacional
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Estatus Conciliación</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {kpis.porcentajeConciliado}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Libros cuadrados con extractos
          </div>
        </div>
      </div>

      {/* SECCIÓN PRINCIPAL: TABLA DE ASIENTOS Y GESTIÓN DIARIA */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* CABECERA Y FILTROS */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-blue-600" />
              Libro de Operaciones y Asientos del Día
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Registros que se certificarán en la bitácora oficial de Martín Delgado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* FILTRO CATEGORÍA */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="todos">Todas las categorías</option>
                {CATEGORIAS_CONTABLES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* FILTRO MONEDA */}
            <select
              value={filtroMoneda}
              onChange={(e) => setFiltroMoneda(e.target.value)}
              className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="todos">Todas las monedas</option>
              <option value="USD">Dólares (USD)</option>
              <option value="VES">Bolívares (VES)</option>
            </select>

            {/* FILTRO ESTADO */}
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos los estados</option>
              <option value="Conciliado">Conciliado</option>
              <option value="Declarado">Declarado</option>
              <option value="En Proceso">En Proceso</option>
              <option value="Pendiente">Pendiente</option>
            </select>
          </div>
        </div>

        {/* TABLA DE OPERACIONES */}
        {filteredAsientos.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
              <Receipt className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-800">No hay asientos contables registrados</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Utiliza el botón superior "+ Nuevo Asiento" o selecciona una de las plantillas rápidas para comenzar a documentar la actividad contable y fiscal del día.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Hora</th>
                  <th className="py-3.5 px-4">Categoría & Subtipo</th>
                  <th className="py-3.5 px-4">Referencia / Comprobante</th>
                  <th className="py-3.5 px-4">Banco / Entidad</th>
                  <th className="py-3.5 px-4">Monto</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredAsientos.map((asiento) => {
                  const catConfig = CATEGORIAS_CONTABLES.find(c => c.id === asiento.categoria);
                  const Icon = catConfig ? catConfig.icon : Landmark;
                  
                  return (
                    <tr key={asiento.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-600 whitespace-nowrap">
                        {asiento.hora}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{asiento.subtipo}</span>
                            <span className="text-[11px] text-slate-400">{asiento.categoria}</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 line-clamp-1">{asiento.descripcion}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                        {asiento.referencia || <span className="text-slate-400 font-normal">S/N</span>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          {asiento.bancoOEntidad?.split('(')[0]?.trim() || 'General'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className={`font-mono font-bold text-sm ${
                          asiento.tipoMovimiento === 'Ingreso' ? 'text-emerald-600' :
                          asiento.tipoMovimiento === 'Egreso' ? 'text-rose-600' :
                          asiento.tipoMovimiento === 'Retención' ? 'text-indigo-600' :
                          'text-slate-800'
                        }`}>
                          {asiento.moneda === 'USD' ? `$${Number(asiento.monto).toFixed(2)}` : `Bs. ${Number(asiento.monto).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}
                        </div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          {asiento.tipoMovimiento}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1 ${
                          asiento.estado === 'Conciliado' ? 'bg-emerald-100 text-emerald-800' :
                          asiento.estado === 'Declarado' ? 'bg-blue-100 text-blue-800' :
                          asiento.estado === 'En Proceso' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {asiento.estado === 'Conciliado' && <CheckCircle2 className="w-3 h-3" />}
                          {asiento.estado}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {!reportSubmitted && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditar(asiento)}
                              className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                              title="Editar registro contable"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSolicitarEliminar(asiento)}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL PARA CREAR O EDITAR ASIENTO CONTABLE */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    {editingId ? 'Editar Registro Contable' : 'Nuevo Registro Contable'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Ingresa los datos del asiento, referencia bancaria o comprobante fiscal.
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarAsiento} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* HORA */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Hora de Registro</label>
                  <input
                    type="time"
                    value={formData.hora}
                    onChange={(e) => setFormData(prev => ({ ...prev, hora: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                {/* TIPO DE MOVIMIENTO */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Tipo de Movimiento</label>
                  <select
                    value={formData.tipoMovimiento}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipoMovimiento: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Conciliación">Conciliación Bancaria</option>
                    <option value="Retención">Retención Fiscal (IVA / ISLR)</option>
                    <option value="Declaración">Declaración Fiscal / Tributaria</option>
                    <option value="Ingreso">Ingreso / Cobranza</option>
                    <option value="Egreso">Egreso / Pago a Proveedor</option>
                    <option value="Informativo">Informativo / Auditoría</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* CATEGORIA */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Categoría Contable</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none cursor-pointer"
                  >
                    {CATEGORIAS_CONTABLES.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* SUBTIPO */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Subtipo / Concepto *</label>
                  <input
                    type="text"
                    value={formData.subtipo}
                    onChange={(e) => setFormData(prev => ({ ...prev, subtipo: e.target.value }))}
                    placeholder="Ej: Retención IVA 75%, Extracto Banesco..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* BANCO O ENTE FISCAL */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Banco, Caja o Entidad Fiscal</label>
                <select
                  value={formData.bancoOEntidad}
                  onChange={(e) => setFormData(prev => ({ ...prev, bancoOEntidad: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none cursor-pointer"
                >
                  {BANCOS_ENTIDADES.map((b, idx) => (
                    <option key={idx} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* REFERENCIA Y MONTO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">N° Referencia / Factura / Comprobante</label>
                  <input
                    type="text"
                    value={formData.referencia}
                    onChange={(e) => setFormData(prev => ({ ...prev, referencia: e.target.value }))}
                    placeholder="Ej: FAC-00921, REF-9812..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Monto & Moneda</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      value={formData.monto}
                      onChange={(e) => setFormData(prev => ({ ...prev, monto: parseFloat(e.target.value) || 0 }))}
                      className="w-2/3 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                    <select
                      value={formData.moneda}
                      onChange={(e) => setFormData(prev => ({ ...prev, moneda: e.target.value as any }))}
                      className="w-1/3 px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none cursor-pointer"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="VES">VES (Bs.)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ESTADO */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Estado de la Operación</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value as any }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="Conciliado">Conciliado (Comprobado con Extracto / Libro)</option>
                  <option value="Declarado">Declarado (Presentado formalmente en Portal Fiscal)</option>
                  <option value="En Proceso">En Proceso (Cálculo o trámite en curso)</option>
                  <option value="Pendiente">Pendiente (Por conciliar o por pagar)</option>
                  <option value="Por Revisar">Por Revisar (Requiere soporte o auditoría)</option>
                </select>
              </div>

              {/* DESCRIPCIÓN */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Descripción Detallada *</label>
                <textarea
                  rows={3}
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Detalla la naturaleza contable, acreedor, beneficiario o notas fiscales..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* OBSERVACIONES */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Notas Adicionales / Instrucciones de Jefatura</label>
                <input
                  type="text"
                  value={formData.observaciones}
                  onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                  placeholder="Opcional: observaciones de auditoría o recordatorios..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {editingId ? 'Actualizar Registro' : 'Guardar Registro Contable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ALERTAS DEL SISTEMA (SIN POPUPS NATIVOS) */}
      <SystemAlertModal
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        showCancel={alertConfig.showCancel}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        isDestructive={alertConfig.isDestructive}
        onConfirm={alertConfig.onConfirm}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
