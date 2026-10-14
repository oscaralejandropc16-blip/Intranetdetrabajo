import { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, DollarSign, CheckCircle2, Clock, 
  Download, Edit3, Trash2, Plus, Search, 
  RefreshCw, FileText, 
  TrendingUp, Users, ArrowUpRight, ArrowDownRight, CheckCheck,
  Sparkles, X, UserPlus, UserMinus,
  Eye, Image as ImageIcon, Upload, Copy, Check, ChevronDown, ChevronUp, Calendar,
  Building2, Smartphone, MessageCircle, Mail
} from 'lucide-react';
import { 
  type ReciboNomina, 
  type PlantillaEmpleadoNomina, 
  type ConceptoNomina,
  EMPLEADOS_NOMINA_DEFAULT
} from '../../types/nomina';
import { 
  supabaseGetRecibosNomina, 
  supabaseSaveReciboNomina, 
  supabaseEliminarReciboNomina,
  supabaseGetPlantillaNomina,
  supabaseSavePlantillaNomina
} from '../../lib/supabaseAdapter';
import { exportarReciboNominaPDF } from '../../lib/pdfExportNomina';
import SystemAlertModal, { type AlertType } from '../common/SystemAlertModal';

export default function ModuloNominaJefatura() {
  const currentLoggedUser = localStorage.getItem('rd_user_name') || 'Víctor Román';

  // Estados de filtro de período
  const [selectedQuincena, setSelectedQuincena] = useState<1 | 2>(() => {
    const day = new Date().getDate();
    return day <= 15 ? 1 : 2;
  });
  const [selectedMes, setSelectedMes] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedAnio, setSelectedAnio] = useState<number>(() => new Date().getFullYear());
  const [tasaCambio, setTasaCambio] = useState<number>(() => {
    const live = localStorage.getItem('rd_bcv_usd') || localStorage.getItem('rd_live_bcv_rate');
    if (live && !isNaN(Number(live)) && Number(live) > 0) return Number(live);
    const saved = localStorage.getItem('rd_nomina_tasa_bcv');
    return saved && !isNaN(Number(saved)) && Number(saved) > 0 ? Number(saved) : 877.90; // Tasa oficial del día BCV
  });

  // Estados de datos
  const [recibos, setRecibos] = useState<ReciboNomina[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewFilter, setViewFilter] = useState<'todos' | 'pagados' | 'pendientes'>('todos');
  const [activeTab, setActiveTab] = useState<'quincena_actual' | 'historial'>('quincena_actual');

  // Plantilla dinámica de trabajadores activos
  const [plantillaPersonal, setPlantillaPersonal] = useState<PlantillaEmpleadoNomina[]>([]);

  // Modal de Agregar / Editar Trabajador en la Plantilla
  const [workerModalOpen, setWorkerModalOpen] = useState<boolean>(false);
  const [editingWorker, setEditingWorker] = useState<PlantillaEmpleadoNomina | null>(null);
  const [workerForm, setWorkerForm] = useState<{
    nombre: string;
    cedula: string;
    cargo: string;
    sueldoMensual: number;
    banco: string;
    tipoPago: 'Pago Móvil' | 'Transferencia' | 'Efectivo' | 'Zelle' | 'Otro';
    numeroCuenta: string;
    tipoCuenta: 'Corriente' | 'Ahorro';
    frecuenciaPago: 'quincenal' | 'mensual_ultimo';
    telefono: string;
    email: string;
  }>({
    nombre: '',
    cedula: 'V-',
    cargo: '',
    sueldoMensual: 200,
    banco: 'Banesco',
    tipoPago: 'Pago Móvil',
    numeroCuenta: '',
    tipoCuenta: 'Corriente',
    frecuenciaPago: 'quincenal',
    telefono: '',
    email: ''
  });

  // Modal de Edición / Liquidación de Recibo
  const [editingRecibo, setEditingRecibo] = useState<ReciboNomina | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showConceptosAccordion, setShowConceptosAccordion] = useState<boolean>(false);
  const [previewCaptureModal, setPreviewCaptureModal] = useState<{ url: string; title: string } | null>(null);
  const [copiedData, setCopiedData] = useState<boolean>(false);
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);
  const [copiedCedula, setCopiedCedula] = useState<boolean>(false);
  const [copiedMonto, setCopiedMonto] = useState<boolean>(false);
  const [editingInlineCuenta, setEditingInlineCuenta] = useState<boolean>(false);
  const [inlineCuentaVal, setInlineCuentaVal] = useState<string>('');
  const [notificacionModal, setNotificacionModal] = useState<ReciboNomina | null>(null);
  const [autoOpenWhatsApp, setAutoOpenWhatsApp] = useState<boolean>(true);

  // Alerta del sistema
  const [systemAlert, setSystemAlert] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
    showCancel?: boolean;
    onConfirm?: () => void;
    confirmText?: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  // Guardar tasa en localStorage
  useEffect(() => {
    localStorage.setItem('rd_nomina_tasa_bcv', String(tasaCambio));
  }, [tasaCambio]);

  // Sincronizar automáticamente con la Tasa Oficial del BCV en vivo (desde LiveStatusBar o API oficial)
  useEffect(() => {
    const handleBcvUpdate = (e: any) => {
      const liveRate = e.detail || Number(localStorage.getItem('rd_bcv_usd'));
      if (liveRate && !isNaN(liveRate) && liveRate > 0) {
        setTasaCambio(liveRate);
      }
    };
    window.addEventListener('rd_bcv_updated', handleBcvUpdate);

    // Consulta inicial inmediata de la tasa BCV del día si no está cargada
    const liveSaved = localStorage.getItem('rd_bcv_usd') || localStorage.getItem('rd_live_bcv_rate');
    if (liveSaved && !isNaN(Number(liveSaved)) && Number(liveSaved) > 0) {
      setTasaCambio(Number(liveSaved));
    } else {
      fetch('https://ve.dolarapi.com/v1/dolares/oficial')
        .then(r => r.json())
        .then(data => {
          if (data && data.promedio) {
            setTasaCambio(data.promedio);
            localStorage.setItem('rd_bcv_usd', data.promedio.toString());
          }
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('rd_bcv_updated', handleBcvUpdate);
    };
  }, []);

  // Calcular fechas de la quincena seleccionada
  const { periodoInicio, periodoFin } = useMemo(() => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const mesStr = pad(selectedMes);
    if (selectedQuincena === 1) {
      return {
        periodoInicio: `${selectedAnio}-${mesStr}-01`,
        periodoFin: `${selectedAnio}-${mesStr}-15`
      };
    } else {
      // Último día del mes
      const lastDay = new Date(selectedAnio, selectedMes, 0).getDate();
      return {
        periodoInicio: `${selectedAnio}-${mesStr}-16`,
        periodoFin: `${selectedAnio}-${mesStr}-${pad(lastDay)}`
      };
    }
  }, [selectedQuincena, selectedMes, selectedAnio]);

  // Cargar recibos desde Supabase / Local
  const fetchRecibos = async () => {
    setLoading(true);
    try {
      const data = await supabaseGetRecibosNomina();
      setRecibos(data);
    } catch (err) {
      console.error('Error cargando recibos de nómina:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar plantilla de trabajadores (excluyendo a los socios directores / jefes Víctor Román y Luis Delgado)
  const isJefeSocio = (p: PlantillaEmpleadoNomina) => {
    const n = (p.nombre || '').toLowerCase().trim();
    const c = (p.cargo || '').toLowerCase().trim();
    return n.includes('victor rom') || n.includes('luis delg') || c.includes('socio director');
  };

  const fetchPlantilla = async () => {
    try {
      const list = await supabaseGetPlantillaNomina();
      const cleanList = (list || []).filter(p => !isJefeSocio(p));
      const finalList = cleanList.length > 0 ? cleanList : EMPLEADOS_NOMINA_DEFAULT;
      setPlantillaPersonal(finalList);
      if (list && cleanList.length !== list.length) {
        await supabaseSavePlantillaNomina(finalList);
      }
    } catch (err) {
      setPlantillaPersonal(EMPLEADOS_NOMINA_DEFAULT);
    }
  };

  useEffect(() => {
    fetchRecibos();
    fetchPlantilla();
  }, []);

  // Función constructora para generar un recibo inicial desde plantilla
  const construirReciboBorrador = (emp: PlantillaEmpleadoNomina, quincenaNum: 1 | 2, mesNum: number, anioNum: number): ReciboNomina => {
    const isMensual = emp.frecuenciaPago === 'mensual_ultimo';
    
    // Si cobra mensual único (el último):
    // En la 1ra quincena no cobra (devengado 0)
    // En la 2da quincena cobra el 100% del sueldo mensual completo
    let sueldoDevengado = 0;
    let conceptoPrincipal = 'Sueldo Quincenal';
    let dhtPrincipal = '11 DIAS';
    let diasLab = 11;
    let diasDesc = 4;

    if (isMensual) {
      if (quincenaNum === 1) {
        sueldoDevengado = 0;
        conceptoPrincipal = 'Sueldo Mensual Único (Cobra a Fin de Mes / El Último)';
        dhtPrincipal = 'Cobra el último';
        diasLab = 0;
        diasDesc = 0;
      } else {
        sueldoDevengado = emp.sueldoMensual; // 100% Completo
        conceptoPrincipal = 'Sueldo Mensual Completo (El Último)';
        dhtPrincipal = '30 DIAS';
        diasLab = 22;
        diasDesc = 8;
      }
    } else {
      sueldoDevengado = Math.round((emp.sueldoMensual / 2) * 100) / 100;
    }
    
    // Conceptos base: solo se incluye por defecto la asignación salarial devengada.
    // Bonos o deducciones adicionales se agregan únicamente si aplican.
    const conceptos: ConceptoNomina[] = [
      { id: 'c_1', concepto: conceptoPrincipal, dht: dhtPrincipal, devengado: sueldoDevengado, deduccion: 0 }
    ];

    const totalDevengado = sueldoDevengado;
    const totalDeducciones = 0;
    const netoUsd = totalDevengado - totalDeducciones;
    const netoVes = Math.round(netoUsd * tasaCambio * 100) / 100;

    const pad = (n: number) => n.toString().padStart(2, '0');
    const mesStr = pad(mesNum);
    const lastDay = quincenaNum === 1 ? 15 : new Date(anioNum, mesNum, 0).getDate();
    const pIni = quincenaNum === 1 ? `${anioNum}-${mesStr}-01` : `${anioNum}-${mesStr}-16`;
    const pFin = `${anioNum}-${mesStr}-${pad(lastDay)}`;

    return {
      id: `rec_${emp.id}_${anioNum}_${quincenaNum}_${mesNum}`,
      numeroRecibo: `RD-${anioNum}-Q${quincenaNum}${mesStr}-${emp.id.replace('emp_', '').padStart(2, '0')}`,
      empleadoNombre: emp.nombre,
      cedula: emp.cedula,
      cargo: emp.cargo,
      codTrabajador: `RD-${emp.id.replace('emp_', '').padStart(3, '0')}`,
      banco: emp.banco,
      tipoPago: emp.tipoPago,
      numeroCuenta: emp.numeroCuenta,
      tipoCuenta: emp.tipoCuenta,
      quincena: quincenaNum,
      mes: mesNum,
      anio: anioNum,
      periodoInicio: pIni,
      periodoFin: pFin,
      monedaPrincipal: 'USD',
      tasaCambio,
      sueldoBaseMensual: emp.sueldoMensual,
      sueldoQuincenalBase: sueldoDevengado,
      modalidadLiquidacion: isMensual ? 'mensual_completo' : 'quincenal',
      diasLaborados: diasLab,
      diasDescanso: diasDesc,
      conceptos,
      totalDevengado,
      totalDeducciones,
      netoPagarUsd: netoUsd,
      netoPagarVes: netoVes,
      estado: 'borrador',
      createdAt: new Date().toISOString()
    };
  };

  // Unir la lista oficial de trabajadores con los recibos guardados para la quincena seleccionada
  const currentQuincenaList = useMemo(() => {
    return plantillaPersonal.map(emp => {
      // Buscar si ya existe un recibo emitido o guardado para este empleado en esta quincena
      const existing = recibos.find(r => 
        r.quincena === selectedQuincena && 
        r.mes === selectedMes && 
        r.anio === selectedAnio &&
        (r.empleadoNombre.toLowerCase().trim() === emp.nombre.toLowerCase().trim() ||
         (r.cedula && emp.cedula && r.cedula.trim() === emp.cedula.trim()))
      );
      if (existing) {
        if (existing.estado !== 'pagado' && tasaCambio && existing.tasaCambio !== tasaCambio) {
          return {
            ...existing,
            tasaCambio,
            netoPagarVes: Math.round((existing.netoPagarUsd || 0) * tasaCambio * 100) / 100
          };
        }
        return existing;
      }
      return construirReciboBorrador(emp, selectedQuincena, selectedMes, selectedAnio);
    });
  }, [plantillaPersonal, recibos, selectedQuincena, selectedMes, selectedAnio, tasaCambio]);

  // Filtrado de la quincena actual
  const filteredCurrentList = useMemo(() => {
    return currentQuincenaList.filter(r => {
      const matchSearch = r.empleadoNombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.cedula.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.cargo.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (viewFilter === 'pagados') return r.estado === 'pagado';
      if (viewFilter === 'pendientes') return r.estado !== 'pagado';
      return true;
    });
  }, [currentQuincenaList, searchQuery, viewFilter]);

  // Totales y KPIs de la quincena
  const kpis = useMemo(() => {
    let totalNominaUsd = 0;
    let pagadosCount = 0;
    let pendientesCount = 0;
    let totalDevengado = 0;
    let totalDeducciones = 0;

    currentQuincenaList.forEach(r => {
      totalNominaUsd += r.netoPagarUsd || 0;
      totalDevengado += r.totalDevengado || 0;
      totalDeducciones += r.totalDeducciones || 0;
      if (r.estado === 'pagado') {
        pagadosCount++;
      } else if (r.netoPagarUsd > 0) {
        pendientesCount++;
      }
    });

    const totalNominaVes = Math.round(totalNominaUsd * tasaCambio * 100) / 100;
    return {
      totalNominaUsd,
      totalNominaVes,
      pagadosCount,
      pendientesCount,
      totalDevengado,
      totalDeducciones,
      totalPersonal: currentQuincenaList.length
    };
  }, [currentQuincenaList, tasaCambio]);

  // Manejador para abrir el Centro de Pago & Liquidación
  const handleAbrirPagar = (recibo: ReciboNomina) => {
    const currentTasa = tasaCambio || 877.90;
    const netoUsd = recibo.netoPagarUsd;
    const netoVes = Math.round(netoUsd * currentTasa * 100) / 100;
    const empInfo = plantillaPersonal.find(p => 
      p.nombre.toLowerCase().trim() === recibo.empleadoNombre.toLowerCase().trim() ||
      (p.cedula && recibo.cedula && p.cedula.trim() === recibo.cedula.trim())
    );
    const numCta = recibo.numeroCuenta || empInfo?.numeroCuenta || '';
    setInlineCuentaVal(numCta);
    setEditingInlineCuenta(false);

    // Limpiar cualquier concepto vacío heredado (con montos 0)
    const rawConceptos = recibo.conceptos || [];
    const conceptosLimpios = rawConceptos.filter((c, idx) => 
      idx === 0 || 
      (c.devengado !== undefined && c.devengado > 0) || 
      (c.deduccion !== undefined && c.deduccion > 0)
    );

    setEditingRecibo({
      ...JSON.parse(JSON.stringify(recibo)),
      conceptos: conceptosLimpios.length > 0 ? conceptosLimpios : rawConceptos,
      numeroCuenta: numCta,
      tipoCuenta: recibo.tipoCuenta || empInfo?.tipoCuenta || 'Corriente',
      tasaCambio: currentTasa,
      netoPagarVes: netoVes
    });
    setShowConceptosAccordion(false);
  };

  // Copiar solo el número de cuenta al portapapeles (solo 20 dígitos)
  const handleCopiarCuenta = (cuenta: string) => {
    if (!cuenta) return;
    const cleanDigits = cuenta.replace(/\D/g, '');
    navigator.clipboard.writeText(cleanDigits || cuenta);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  // Copiar cédula limpia para transferencias (solo números)
  const handleCopiarCedula = (cedula: string) => {
    if (!cedula) return;
    const cleanDigits = cedula.replace(/[^\d]/g, '');
    navigator.clipboard.writeText(cleanDigits || cedula);
    setCopiedCedula(true);
    setTimeout(() => setCopiedCedula(false), 2500);
  };

  // Copiar monto neto en Bolívares para transferencias
  const handleCopiarMonto = (monto: number) => {
    navigator.clipboard.writeText(monto.toFixed(2));
    setCopiedMonto(true);
    setTimeout(() => setCopiedMonto(false), 2500);
  };

  // Guardar cuenta bancaria inline directamente desde el modal de pago
  const handleGuardarCuentaInline = async () => {
    if (!editingRecibo) return;
    const cleanVal = inlineCuentaVal.trim();
    if (!cleanVal) return;

    setEditingRecibo(prev => prev ? ({ ...prev, numeroCuenta: cleanVal }) : null);

    const updatedPlantilla = plantillaPersonal.map(p => {
      if (
        p.nombre.toLowerCase().trim() === editingRecibo.empleadoNombre.toLowerCase().trim() ||
        (p.cedula && editingRecibo.cedula && p.cedula.trim() === editingRecibo.cedula.trim())
      ) {
        return { ...p, numeroCuenta: cleanVal };
      }
      return p;
    });
    setPlantillaPersonal(updatedPlantilla);
    await supabaseSavePlantillaNomina(updatedPlantilla);
    setEditingInlineCuenta(false);
  };

  // Alternar entre Quincenal (50%) y Mensual Completo (100% • El Último)
  const handleToggleModalidadLiquidacion = (nuevaModalidad: 'quincenal' | 'mensual_completo') => {
    if (!editingRecibo) return;
    const currentTasa = tasaCambio || editingRecibo.tasaCambio || 877.90;
    const conceptos = [...editingRecibo.conceptos];
    const sueldoBase = editingRecibo.sueldoBaseMensual;

    const esMensual = nuevaModalidad === 'mensual_completo';
    const nuevoSueldo = esMensual ? sueldoBase : Math.round((sueldoBase / 2) * 100) / 100;
    const nuevoConceptoTexto = esMensual ? 'Sueldo Mensual Completo (El Último)' : 'Sueldo Quincenal';
    const nuevoDht = esMensual ? '30 DIAS' : '11 DIAS';

    if (conceptos.length > 0) {
      conceptos[0] = {
        ...conceptos[0],
        concepto: nuevoConceptoTexto,
        dht: nuevoDht,
        devengado: nuevoSueldo
      };
    }

    let totalDev = 0;
    let totalDed = 0;
    conceptos.forEach(c => {
      totalDev += Number(c.devengado || 0);
      totalDed += Number(c.deduccion || 0);
    });

    const netoUsd = Math.max(0, totalDev - totalDed);
    const netoVes = Math.round(netoUsd * currentTasa * 100) / 100;

    setEditingRecibo({
      ...editingRecibo,
      modalidadLiquidacion: nuevaModalidad,
      sueldoQuincenalBase: nuevoSueldo,
      conceptos,
      totalDevengado: totalDev,
      totalDeducciones: totalDed,
      netoPagarUsd: netoUsd,
      netoPagarVes: netoVes
    });
  };

  // Manejo de carga de Capture Bancario (opcional)
  const handleCaptureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingRecibo) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setEditingRecibo(prev => prev ? ({
        ...prev,
        comprobanteBase64: base64,
        comprobanteNombre: file.name
      }) : null);
    };
    reader.readAsDataURL(file);
  };

  // Copiar datos del empleado para pagar rápido en el banco
  const handleCopiarDatos = (texto: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(texto);
      setCopiedData(true);
      setTimeout(() => setCopiedData(false), 2000);
    }
  };

  // Recalcular montos en el modal de edición
  const handleConceptoChange = (idx: number, field: 'devengado' | 'deduccion' | 'concepto' | 'dht', value: any) => {
    if (!editingRecibo) return;
    const updated = { ...editingRecibo };
    const conceptos = [...updated.conceptos];
    conceptos[idx] = {
      ...conceptos[idx],
      [field]: field === 'devengado' || field === 'deduccion' ? (Number(value) || 0) : value
    };

    let totalDev = 0;
    let totalDed = 0;
    conceptos.forEach(c => {
      totalDev += Number(c.devengado || 0);
      totalDed += Number(c.deduccion || 0);
    });

    const netoUsd = Math.max(0, totalDev - totalDed);
    const netoVes = Math.round(netoUsd * (updated.tasaCambio || tasaCambio) * 100) / 100;

    updated.conceptos = conceptos;
    updated.totalDevengado = totalDev;
    updated.totalDeducciones = totalDed;
    updated.netoPagarUsd = netoUsd;
    updated.netoPagarVes = netoVes;

    setEditingRecibo(updated);
  };

  // Agregar un nuevo concepto personalizado (ej: Bono de Éxito, Ajuste)
  const handleAddConcepto = () => {
    if (!editingRecibo) return;
    const newConcepto: ConceptoNomina = {
      id: `c_custom_${Date.now()}`,
      concepto: 'Nuevo Concepto / Bono',
      dht: '',
      devengado: 0,
      deduccion: 0
    };
    setEditingRecibo({
      ...editingRecibo,
      conceptos: [...editingRecibo.conceptos, newConcepto]
    });
  };

  // Eliminar concepto
  const handleRemoveConcepto = (idx: number) => {
    if (!editingRecibo) return;
    const conceptos = editingRecibo.conceptos.filter((_, i) => i !== idx);
    let totalDev = 0;
    let totalDed = 0;
    conceptos.forEach(c => {
      totalDev += Number(c.devengado || 0);
      totalDed += Number(c.deduccion || 0);
    });
    const netoUsd = Math.max(0, totalDev - totalDed);
    const netoVes = Math.round(netoUsd * (editingRecibo.tasaCambio || tasaCambio) * 100) / 100;

    setEditingRecibo({
      ...editingRecibo,
      conceptos,
      totalDevengado: totalDev,
      totalDeducciones: totalDed,
      netoPagarUsd: netoUsd,
      netoPagarVes: netoVes
    });
  };

  // Guardar cambios como Borrador
  const handleSaveBorrador = async () => {
    if (!editingRecibo) return;
    setIsSaving(true);
    try {
      await supabaseSaveReciboNomina(editingRecibo);
      await fetchRecibos();
      setEditingRecibo(null);
      setSystemAlert({
        isOpen: true,
        type: 'success',
        title: 'Borrador Guardado',
        message: `Los cambios para ${editingRecibo.empleadoNombre} han sido guardados correctamente.`
      });
    } catch (err: any) {
      setSystemAlert({
        isOpen: true,
        type: 'error',
        title: 'Error al Guardar',
        message: err.message || 'No se pudo guardar el borrador.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Acción principal: Emitir y Marcar como Pagado
  const handleEmitirYMarcarPagado = async (reciboTarget: ReciboNomina) => {
    // 1. Validar que la referencia bancaria no esté vacía (obligatoria para transferencias y pagos móviles)
    if (reciboTarget.tipoPago !== 'Efectivo' && (!reciboTarget.referenciaPago || !reciboTarget.referenciaPago.trim())) {
      setSystemAlert({
        isOpen: true,
        type: 'warning',
        title: 'Referencia Bancaria Requerida',
        message: `Debes ingresar el número de referencia bancaria emitida por el banco (${reciboTarget.banco || 'Banco'}) para confirmar el pago de ${reciboTarget.empleadoNombre}.`
      });
      return;
    }

    const nowStr = new Date().toLocaleString('es-VE', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', hour12: true 
    });

    // 2. Limpiar conceptos con montos vacíos antes de emitir
    const conceptosFinales = (reciboTarget.conceptos || []).filter((c, idx) => 
      idx === 0 || 
      (c.devengado !== undefined && c.devengado > 0) || 
      (c.deduccion !== undefined && c.deduccion > 0)
    );

    const tasaFinal = reciboTarget.tasaCambio || tasaCambio || 877.90;
    const netoVesFinal = Math.round((reciboTarget.netoPagarUsd || 0) * tasaFinal * 100) / 100;

    const reciboPagado: ReciboNomina = {
      ...reciboTarget,
      conceptos: conceptosFinales,
      tasaCambio: tasaFinal,
      netoPagarVes: netoVesFinal,
      estado: 'pagado',
      fechaPago: nowStr,
      emitidoPor: currentLoggedUser,
      notificacionEnviada: true
    };

    setIsSaving(true);
    try {
      // 1. Guardar en Supabase / Base de datos y disparar notificación al empleado
      await supabaseSaveReciboNomina(reciboPagado);
      
      // 2. Generar y descargar el PDF oficial inmediatamente
      await exportarReciboNominaPDF(reciboPagado);

      // 3. Abrir WhatsApp automáticamente si la casilla está activada
      if (autoOpenWhatsApp) {
        setTimeout(() => {
          handleEnviarWhatsApp(reciboPagado);
        }, 400);
      }

      // 4. Refrescar datos
      await fetchRecibos();
      if (editingRecibo) {
        setEditingRecibo(null);
      }

      // 5. Abrir modal interactivo para enviar por WhatsApp o Correo con 1 clic
      setNotificacionModal(reciboPagado);
    } catch (err: any) {
      setSystemAlert({
        isOpen: true,
        type: 'error',
        title: 'Error en Emisión',
        message: err.message || 'Ocurrió un error al procesar el pago.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Descargar PDF de recibo ya emitido
  const handleDescargarPdf = async (recibo: ReciboNomina) => {
    try {
      await exportarReciboNominaPDF(recibo);
    } catch (e) {
      setSystemAlert({
        isOpen: true,
        type: 'error',
        title: 'Error de Descarga',
        message: 'No se pudo compilar el PDF del recibo.'
      });
    }
  };

  // Generar texto formal y detallado para WhatsApp o Correo Electrónico
  const generarTextoNotificacion = (recibo: ReciboNomina) => {
    const netoBs = (recibo.netoPagarVes || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 });
    const netoUsd = (recibo.netoPagarUsd || 0).toFixed(2);
    const tasa = (recibo.tasaCambio || tasaCambio || 877.90).toFixed(2);
    const periodo = `del ${recibo.periodoInicio} al ${recibo.periodoFin}`;
    const modalidad = recibo.modalidadLiquidacion === 'mensual_completo' ? 'Sueldo Mensual Completo' : `Quincena (${recibo.quincena === 1 ? '1ra' : '2da'})`;
    const refTxt = recibo.referenciaPago ? `\n* Referencia Bancaria: ${recibo.referenciaPago}` : '';
    const numCta = recibo.numeroCuenta ? recibo.numeroCuenta.replace(/\D/g, '') : '';
    const cuentaTxt = numCta.length >= 4 
      ? `\n* Cuenta Destino: ${recibo.banco} (terminada en ••${numCta.slice(-4)})` 
      : (recibo.banco ? `\n* Banco Receptor: ${recibo.banco}` : '');
    const fechaTxt = recibo.fechaPago ? `\n* Fecha y Hora: ${recibo.fechaPago}` : '';

    return `ROMÁN & DELGADO — ASESORES JURÍDICOS
Comprobante de Liquidación de Nómina

Estimado(a) ${recibo.empleadoNombre}:
Le informamos que se ha procesado exitosamente la liquidación correspondiente a:

* Período: ${periodo}
* Modalidad: ${modalidad}
* Monto Liquidado: Bs. ${netoBs} (Ref. $ ${netoUsd})
* Tasa Oficial BCV: Bs. ${tasa}
* Método de Pago: ${recibo.tipoPago}${cuentaTxt}${refTxt}${fechaTxt}

El recibo oficial en PDF ha sido generado formalmente con membrete del despacho. Agradecemos acusar recibo al constatar los fondos en su cuenta.

Atentamente,
Jefatura — Román & Delgado`;
  };

  // Enviar notificación formal por WhatsApp a 1 clic (sin necesidad de tener usuario)
  const handleEnviarWhatsApp = (recibo: ReciboNomina) => {
    const empItem = plantillaPersonal.find(p => 
      p.nombre.toLowerCase().trim() === recibo.empleadoNombre.toLowerCase().trim() ||
      (p.cedula && recibo.cedula && p.cedula.trim() === recibo.cedula.trim())
    );
    let tel = recibo.empleadoTelefono || empItem?.telefono || '';
    if (!tel) {
      const inputTel = window.prompt(`Ingresa el número de WhatsApp para ${recibo.empleadoNombre} (ej: 04141234567):`);
      if (!inputTel) return;
      tel = inputTel;
    }

    const clean = tel.replace(/\D/g, '');
    let finalPhone = clean;
    if (finalPhone.startsWith('0')) {
      finalPhone = '58' + finalPhone.slice(1);
    } else if (!finalPhone.startsWith('58')) {
      finalPhone = '58' + finalPhone;
    }

    const text = encodeURIComponent(generarTextoNotificacion(recibo));
    window.open(`https://wa.me/${finalPhone}?text=${text}`, '_blank');
  };

  // Enviar notificación formal por Correo Electrónico a 1 clic
  const handleEnviarEmail = (recibo: ReciboNomina) => {
    const empItem = plantillaPersonal.find(p => 
      p.nombre.toLowerCase().trim() === recibo.empleadoNombre.toLowerCase().trim() ||
      (p.cedula && recibo.cedula && p.cedula.trim() === recibo.cedula.trim())
    );
    let email = recibo.empleadoEmail || empItem?.email || '';
    if (!email) {
      const inputEmail = window.prompt(`Ingresa el correo electrónico para ${recibo.empleadoNombre}:`);
      if (!inputEmail) return;
      email = inputEmail;
    }

    const subject = encodeURIComponent(`Comprobante de Pago de Nómina • ${recibo.periodoInicio} al ${recibo.periodoFin} • Román & Delgado`);
    const body = encodeURIComponent(generarTextoNotificacion(recibo));
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  // Eliminar recibo (solo jefatura)
  const handleEliminarRecibo = (reciboTarget: ReciboNomina) => {
    setSystemAlert({
      isOpen: true,
      type: 'warning',
      title: '¿Eliminar Recibo de Nómina?',
      message: `¿Estás seguro de eliminar el registro de pago de ${reciboTarget.empleadoNombre}? Esta acción no se puede deshacer.`,
      showCancel: true,
      confirmText: 'Sí, Eliminar',
      onConfirm: async () => {
        try {
          await supabaseEliminarReciboNomina(reciboTarget);
          await fetchRecibos();
        } catch (e) {}
      }
    });
  };

  // Abrir modal para agregar trabajador
  const handleAbrirAgregarTrabajador = () => {
    setEditingWorker(null);
    setWorkerForm({
      nombre: '',
      cedula: 'V-',
      cargo: '',
      sueldoMensual: 200,
      banco: 'Banesco',
      tipoPago: 'Pago Móvil',
      numeroCuenta: '',
      tipoCuenta: 'Corriente',
      frecuenciaPago: 'quincenal',
      telefono: '',
      email: ''
    });
    setWorkerModalOpen(true);
  };

  // Abrir modal para editar trabajador existente
  const handleAbrirEditarTrabajador = (emp: PlantillaEmpleadoNomina) => {
    setEditingWorker(emp);
    setWorkerForm({
      nombre: emp.nombre,
      cedula: emp.cedula,
      cargo: emp.cargo,
      sueldoMensual: emp.sueldoMensual,
      banco: emp.banco || 'Banesco',
      tipoPago: emp.tipoPago || 'Pago Móvil',
      numeroCuenta: emp.numeroCuenta || '',
      tipoCuenta: emp.tipoCuenta || 'Corriente',
      frecuenciaPago: emp.frecuenciaPago || 'quincenal',
      telefono: emp.telefono || '',
      email: emp.email || ''
    });
    setWorkerModalOpen(true);
  };

  // Guardar nuevo o editar trabajador en plantilla
  const handleGuardarTrabajador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerForm.nombre.trim() || !workerForm.cedula.trim()) {
      setSystemAlert({
        isOpen: true,
        type: 'warning',
        title: 'Datos Incompletos',
        message: 'Por favor ingresa el nombre y la cédula del trabajador.'
      });
      return;
    }

    let updatedList: PlantillaEmpleadoNomina[];
    if (editingWorker) {
      updatedList = plantillaPersonal.map(w => w.id === editingWorker.id ? {
        ...w,
        nombre: workerForm.nombre.trim(),
        cedula: workerForm.cedula.trim(),
        cargo: workerForm.cargo.trim() || 'Personal',
        sueldoMensual: Number(workerForm.sueldoMensual) || 0,
        banco: workerForm.banco,
        tipoPago: workerForm.tipoPago,
        numeroCuenta: workerForm.numeroCuenta.trim(),
        tipoCuenta: workerForm.tipoCuenta,
        frecuenciaPago: workerForm.frecuenciaPago || 'quincenal',
        telefono: workerForm.telefono.trim(),
        email: workerForm.email.trim()
      } : w);
    } else {
      const newWorker: PlantillaEmpleadoNomina = {
        id: `emp_${Date.now()}`,
        nombre: workerForm.nombre.trim(),
        cedula: workerForm.cedula.trim(),
        cargo: workerForm.cargo.trim() || 'Personal',
        sueldoMensual: Number(workerForm.sueldoMensual) || 0,
        banco: workerForm.banco,
        tipoPago: workerForm.tipoPago,
        numeroCuenta: workerForm.numeroCuenta.trim(),
        tipoCuenta: workerForm.tipoCuenta,
        frecuenciaPago: workerForm.frecuenciaPago || 'quincenal',
        telefono: workerForm.telefono.trim(),
        email: workerForm.email.trim()
      };
      updatedList = [...plantillaPersonal, newWorker];
    }

    setPlantillaPersonal(updatedList);
    await supabaseSavePlantillaNomina(updatedList);
    setWorkerModalOpen(false);

    setSystemAlert({
      isOpen: true,
      type: 'success',
      title: editingWorker ? 'Trabajador Actualizado' : 'Trabajador Agregado',
      message: `${workerForm.nombre} ha sido ${editingWorker ? 'actualizado' : 'incorporado'} exitosamente a la nómina.`
    });
  };

  // Quitar trabajador de la nómina activa
  const handleQuitarTrabajador = (emp: PlantillaEmpleadoNomina) => {
    setSystemAlert({
      isOpen: true,
      type: 'warning',
      title: '¿Quitar de Nómina?',
      message: `¿Deseas remover a "${emp.nombre}" de la nómina? No se eliminarán los recibos pasados que ya hayan sido pagados en el historial.`,
      showCancel: true,
      confirmText: 'Sí, Quitar',
      onConfirm: async () => {
        const updated = plantillaPersonal.filter(w => w.id !== emp.id);
        setPlantillaPersonal(updated);
        await supabaseSavePlantillaNomina(updated);
        setSystemAlert({
          isOpen: true,
          type: 'info',
          title: 'Trabajador Removido',
          message: `${emp.nombre} ha sido removido de la nómina activa.`
        });
      }
    });
  };

  // Historial global de recibos emitidos (todas las quincenas)
  const recibosHistorial = useMemo(() => {
    return recibos.filter(r => r.estado === 'pagado');
  }, [recibos]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header con Estética Ejecutiva */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-600/20 via-emerald-600/10 to-transparent rounded-full blur-3xl -z-0 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Módulo de Jefatura • Román & Delgado
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Wallet className="w-8 h-8 text-emerald-400" /> Control y Liquidación de Nómina
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Edita montos, descansos, préstamos y bonos. Al marcar como pagado, se descarga el recibo oficial en PDF y se envía la notificación inmediata al portal del empleado.
            </p>
          </div>

          {/* Configuración de Tasa BCV Oficial */}
          <div className="bg-slate-800/90 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-4 shrink-0 shadow-lg shadow-emerald-950/20">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Tasa Oficial del Día (BCV)</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">En Vivo</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-extrabold text-lg">Bs.</span>
                <input
                  type="number"
                  step="0.01"
                  value={tasaCambio}
                  onChange={(e) => setTasaCambio(Math.max(1, Number(e.target.value) || 1))}
                  className="w-28 bg-slate-900 border border-emerald-500/40 rounded-xl px-2.5 py-1 text-sm font-black text-emerald-300 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  title="Tasa oficial del BCV del día"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
                      const data = await res.json();
                      if (data?.promedio) {
                        setTasaCambio(data.promedio);
                        localStorage.setItem('rd_bcv_usd', String(data.promedio));
                        window.dispatchEvent(new CustomEvent('rd_bcv_updated', { detail: data.promedio }));
                      }
                    } catch {}
                  }}
                  title="Actualizar con la tasa oficial BCV de hoy"
                  className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-700/60 rounded-xl transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Selector de Período y Pestañas */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Quincena */}
            <div className="inline-flex bg-slate-800 p-1 rounded-2xl border border-slate-700">
              <button
                onClick={() => setSelectedQuincena(1)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedQuincena === 1 ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                1ra Quincena (1 al 15)
              </button>
              <button
                onClick={() => setSelectedQuincena(2)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedQuincena === 2 ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                2da Quincena (16 al fin)
              </button>
            </div>

            {/* Mes */}
            <select
              value={selectedMes}
              onChange={(e) => setSelectedMes(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-blue-500 cursor-pointer"
            >
              {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </select>

            {/* Año */}
            <select
              value={selectedAnio}
              onChange={(e) => setSelectedAnio(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-blue-500 cursor-pointer"
            >
              {[2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <span className="text-xs text-slate-400 font-medium ml-2">
              Período: <strong className="text-white">{periodoInicio}</strong> al <strong className="text-white">{periodoFin}</strong>
            </span>
          </div>

          {/* Navegación entre Quincena Actual e Historial */}
          <div className="flex items-center gap-2 bg-slate-800/80 p-1 rounded-2xl border border-slate-700/80">
            <button
              onClick={() => setActiveTab('quincena_actual')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'quincena_actual' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Quincena en Curso
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'historial' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Historial General ({recibosHistorial.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'quincena_actual' && (
        <>
          {/* 2. KPIs y Métricas de la Quincena */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI: Total Quincena en Bolívares */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Nómina Quincenal</span>
                <div className="p-2.5 bg-emerald-50 rounded-2xl text-emerald-600">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                Bs. {kpis.totalNominaVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> Ref. $ {kpis.totalNominaUsd.toLocaleString('es-VE', { minimumFractionDigits: 2 })} (Tasa: {tasaCambio.toFixed(2)})
              </div>
            </div>

            {/* KPI: Progreso de Pagos */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Estado de Liquidación</span>
                <div className="p-2.5 bg-blue-50 rounded-2xl text-blue-600">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {kpis.pagadosCount} / {kpis.totalPersonal} <span className="text-xs font-bold text-slate-500">personal pagado</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(kpis.pagadosCount / Math.max(1, kpis.totalPersonal)) * 100}%` }}
                />
              </div>
            </div>

            {/* KPI: Total Asignaciones */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Devengado Base</span>
                <div className="p-2.5 bg-indigo-50 rounded-2xl text-indigo-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                $ {kpis.totalDevengado.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-xs text-slate-500 font-medium mt-1 block">Sueldos quincenales e incrementos</span>
            </div>

            {/* KPI: Retenciones y Préstamos */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Deducciones</span>
                <div className="p-2.5 bg-rose-50 rounded-2xl text-rose-600">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-600 mt-2">
                $ {kpis.totalDeducciones.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-xs text-slate-500 font-medium mt-1 block">Leyes (IVSS/Banavih) y préstamos</span>
            </div>
          </div>

          {/* 3. Acciones de Nómina, Búsqueda y Filtros */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={handleAbrirAgregarTrabajador}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-md shadow-blue-600/25 transition-all cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" /> + Agregar Trabajador a Nómina
              </button>
              <span className="text-xs font-bold text-slate-400 hidden sm:inline">
                {plantillaPersonal.length} miembros registrados
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, cédula o cargo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setViewFilter('todos')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    viewFilter === 'todos' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos ({currentQuincenaList.length})
                </button>
                <button
                  onClick={() => setViewFilter('pendientes')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    viewFilter === 'pendientes' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Pendientes ({kpis.pendientesCount})
                </button>
                <button
                  onClick={() => setViewFilter('pagados')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    viewFilter === 'pagados' ? 'bg-emerald-600 text-white font-black' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Pagados ({kpis.pagadosCount})
                </button>
              </div>
            </div>
          </div>

          {/* 4. Lista y Tabla de Trabajadores de la Quincena (Responsivo Móvil + Escritorio) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            {/* VISTA MÓVIL OPTIMIZADA PARA IPHONE / SMARTPHONES */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredCurrentList.map((recibo) => {
                const isPagado = recibo.estado === 'pagado';
                const empItem = plantillaPersonal.find(p => 
                  p.nombre.toLowerCase().trim() === recibo.empleadoNombre.toLowerCase().trim() ||
                  (p.cedula && recibo.cedula && p.cedula.trim() === recibo.cedula.trim())
                );
                const isMensual = empItem?.frecuenciaPago === 'mensual_ultimo' || recibo.modalidadLiquidacion === 'mensual_completo';
                const isCobraFinMesQ1 = isMensual && recibo.quincena === 1 && !isPagado && recibo.netoPagarUsd === 0;
                const numCta = recibo.numeroCuenta || empItem?.numeroCuenta;
                const cleanCta = numCta ? numCta.replace(/\D/g, '') : '';
                const ctaLabel = cleanCta.length >= 4 ? ` • Cta: ••${cleanCta.slice(-4)}` : (numCta ? ` • Cta: ${numCta}` : '');

                return (
                  <div key={`m_${recibo.id}`} className="p-4 bg-white space-y-3">
                    {/* Encabezado: Nombre, Cédula y Estado */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-slate-900 text-sm truncate">{recibo.empleadoNombre}</h4>
                        <div className="text-[11px] text-slate-500 font-medium flex flex-wrap items-center gap-1 mt-0.5">
                          <span className="font-bold text-slate-700">{recibo.cedula}</span>
                          <span>•</span>
                          <span className="text-slate-600">{recibo.cargo}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {recibo.tipoPago} ({recibo.banco}{ctaLabel})
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isPagado ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Pagado
                          </span>
                        ) : isCobraFinMesQ1 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">
                            Cobra Fin de Mes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                            <Clock className="w-3 h-3 text-amber-600" /> Pendiente
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Modalidad si cobra fin de mes */}
                    {isMensual && (
                      <div className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-md inline-block">
                        {isCobraFinMesQ1 ? 'Cobra el último (Mes Único)' : 'Mes Completo (100%)'}
                      </div>
                    )}

                    {/* Bloque de Montos y Equivalencia */}
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Neto a Liquidar (Bs.)</span>
                        <div className="text-lg font-black text-emerald-600">
                          Bs. {recibo.netoPagarVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Equiv. USD</span>
                        <div className="text-xs font-bold text-slate-700">
                          $ {recibo.netoPagarUsd.toFixed(2)} USD
                        </div>
                        <span className="text-[9px] text-slate-400 block">Base: ${recibo.sueldoBaseMensual}/mes</span>
                      </div>
                    </div>

                    {/* Botones de Acción para iPhone / Móvil */}
                    <div className="flex items-center gap-2 pt-1">
                      {isPagado ? (
                        <>
                          <button
                            onClick={() => handleDescargarPdf(recibo)}
                            className="flex-1 min-h-[42px] py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>
                          <button
                            onClick={() => handleEnviarWhatsApp(recibo)}
                            className="min-h-[42px] px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer shadow-xs"
                            title="Enviar por WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>WhatsApp</span>
                          </button>
                          <button
                            onClick={() => handleEnviarEmail(recibo)}
                            className="min-h-[42px] px-3 py-2 bg-sky-50 text-sky-700 border border-sky-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                            title="Enviar por Correo"
                          >
                            <Mail className="w-4 h-4 text-sky-600" />
                          </button>
                          {(recibo.comprobanteBase64 || recibo.comprobanteUrl) && (
                            <button
                              onClick={() => setPreviewCaptureModal({
                                url: recibo.comprobanteBase64 || recibo.comprobanteUrl || '',
                                title: `Comprobante de Pago • ${recibo.empleadoNombre}`
                              })}
                              className="min-h-[42px] px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                              title="Ver capture"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEliminarRecibo(recibo)}
                            className="min-h-[42px] p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                            title="Eliminar recibo"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleAbrirPagar(recibo)}
                            className={`flex-1 min-h-[42px] py-2 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95 ${
                              isCobraFinMesQ1
                                ? 'bg-slate-700 hover:bg-slate-800'
                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                            }`}
                          >
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                            <span>{isCobraFinMesQ1 ? 'Adelantar / Pagar' : 'Pagar & Emitir'}</span>
                          </button>
                          {empItem && (
                            <button
                              onClick={() => handleAbrirEditarTrabajador(empItem)}
                              className="min-h-[42px] p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                              title="Editar ficha del trabajador"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VISTA ESCRITORIO / PANTALLAS GRANDES (TABLE) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Trabajador & Cargo</th>
                    <th className="py-4 px-4 text-center">Cédula</th>
                    <th className="py-4 px-4 text-right">Sueldo Base</th>
                    <th className="py-4 px-4 text-right">Devengado</th>
                    <th className="py-4 px-4 text-right">Deducciones</th>
                    <th className="py-4 px-4 text-right">Neto a Pagar (Bs. / $)</th>
                    <th className="py-4 px-4 text-center">Estado</th>
                    <th className="py-4 px-6 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredCurrentList.map((recibo) => {
                    const isPagado = recibo.estado === 'pagado';
                    const empItem = plantillaPersonal.find(p => 
                      p.nombre.toLowerCase().trim() === recibo.empleadoNombre.toLowerCase().trim() ||
                      (p.cedula && recibo.cedula && p.cedula.trim() === recibo.cedula.trim())
                    );
                    const isMensual = empItem?.frecuenciaPago === 'mensual_ultimo' || recibo.modalidadLiquidacion === 'mensual_completo';
                    const isCobraFinMesQ1 = isMensual && recibo.quincena === 1 && !isPagado && recibo.netoPagarUsd === 0;

                    return (
                      <tr key={recibo.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Nombre y Cargo */}
                        <td className="py-4 px-6">
                          <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                            <span>{recibo.empleadoNombre}</span>
                            {isMensual && (
                              isCobraFinMesQ1 ? (
                                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-md text-[10px] font-bold">
                                  Cobra el último (Mes Único)
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded-md text-[10px] font-bold">
                                  Mes Completo (100%)
                                </span>
                              )
                            )}
                          </div>
                          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-bold">{recibo.cargo}</span>
                            {(() => {
                              const numCta = recibo.numeroCuenta || empItem?.numeroCuenta;
                              const cleanCta = numCta ? numCta.replace(/\D/g, '') : '';
                              const ctaLabel = cleanCta.length >= 4 ? ` • Cta: ••${cleanCta.slice(-4)}` : (numCta ? ` • Cta: ${numCta}` : '');
                              return (
                                <span>• {recibo.tipoPago} ({recibo.banco}{ctaLabel})</span>
                              );
                            })()}
                          </div>
                        </td>

                        {/* Cédula */}
                        <td className="py-4 px-4 text-center font-bold text-slate-700 whitespace-nowrap">
                          {recibo.cedula}
                        </td>

                        {/* Sueldo Base */}
                        <td className="py-4 px-4 text-right font-medium text-slate-600">
                          $ {recibo.sueldoBaseMensual.toFixed(2)}
                          {isMensual ? (
                            <span className="text-[10px] text-amber-700 font-bold block">(Pago Único Fin de Mes)</span>
                          ) : (
                            <span className="text-[10px] text-slate-400 block">($ {(recibo.sueldoBaseMensual / 2).toFixed(2)} qna)</span>
                          )}
                        </td>

                        {/* Devengado */}
                        <td className="py-4 px-4 text-right font-bold text-emerald-600">
                          $ {recibo.totalDevengado.toFixed(2)}
                        </td>

                        {/* Deducciones */}
                        <td className="py-4 px-4 text-right font-bold text-rose-500">
                          {recibo.totalDeducciones > 0 ? `$ -${recibo.totalDeducciones.toFixed(2)}` : '—'}
                        </td>

                        {/* Neto a Pagar (Bs. Protagonista) */}
                        <td className="py-4 px-4 text-right">
                          <div className="font-black text-slate-900 text-sm">
                            Bs. {recibo.netoPagarVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] font-bold text-slate-500">
                            Ref. $ {recibo.netoPagarUsd.toFixed(2)}
                          </div>
                        </td>

                        {/* Estado */}
                        <td className="py-4 px-4 text-center">
                          {isPagado ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Pagado
                            </span>
                          ) : isCobraFinMesQ1 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-[10px] font-bold tracking-wider">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Cobra Fin de Mes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                              <Clock className="w-3.5 h-3.5 text-amber-600" /> Pendiente
                            </span>
                          )}
                        </td>

                        {/* Acciones: Flujo Unificado en Pagar & Emitir */}
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isPagado ? (
                              <>
                                {/* Botón Descargar Recibo PDF */}
                                <button
                                  onClick={() => handleDescargarPdf(recibo)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs shadow-md shadow-emerald-600/20 cursor-pointer"
                                  title="Descargar Recibo Oficial en PDF (Doble Talón)"
                                >
                                  <Download className="w-3.5 h-3.5" /> Recibo PDF
                                </button>

                                {/* Botón WhatsApp */}
                                <button
                                  onClick={() => handleEnviarWhatsApp(recibo)}
                                  className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-1 transition-all text-xs shadow-xs cursor-pointer"
                                  title="Enviar comprobante formal por WhatsApp a este trabajador"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                                </button>

                                {/* Botón Correo */}
                                <button
                                  onClick={() => handleEnviarEmail(recibo)}
                                  className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl font-bold transition-all text-xs cursor-pointer"
                                  title="Enviar comprobante por Correo Electrónico"
                                >
                                  <Mail className="w-3.5 h-3.5 text-sky-600" />
                                </button>

                                {/* Botón Ver Capture si existe */}
                                {(recibo.comprobanteBase64 || recibo.comprobanteUrl) && (
                                  <button
                                    onClick={() => setPreviewCaptureModal({
                                      url: recibo.comprobanteBase64 || recibo.comprobanteUrl || '',
                                      title: `Comprobante de Pago • ${recibo.empleadoNombre}`
                                    })}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1 transition-all text-xs cursor-pointer"
                                    title="Ver capture o comprobante bancario adjunto"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-emerald-600" /> Capture
                                  </button>
                                )}
                              </>
                            ) : (
                              /* Botón Principal: Pagar & Emitir */
                              <button
                                onClick={() => handleAbrirPagar(recibo)}
                                className={`px-3.5 py-1.5 text-white rounded-xl font-black flex items-center gap-1.5 transition-all text-xs shadow-md cursor-pointer ${
                                  isCobraFinMesQ1
                                    ? 'bg-slate-700 hover:bg-slate-800 shadow-slate-700/20'
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                                }`}
                                title={isCobraFinMesQ1 ? 'Adelantar o liquidar nómina' : 'Pagar, ingresar referencia, capture y emitir recibo oficial'}
                              >
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-300" /> 
                                {isCobraFinMesQ1 ? 'Adelantar / Pagar' : 'Pagar & Emitir'}
                              </button>
                            )}

                            {/* Editar datos base del trabajador */}
                            {empItem && (
                              <button
                                onClick={() => handleAbrirEditarTrabajador(empItem)}
                                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                                title="Editar datos base del trabajador (sueldo mensual, modalidad de cobro, banco, cargo)"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Quitar de nómina */}
                            {empItem && (
                              <button
                                onClick={() => handleQuitarTrabajador(empItem)}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Quitar este trabajador de la nómina"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {isPagado && (
                              <button
                                onClick={() => handleEliminarRecibo(recibo)}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Anular recibo emitido"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredCurrentList.length === 0 && (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto text-slate-400 mb-4">
                    <Users className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-800">No hay trabajadores en esta lista</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    {searchQuery ? 'No se encontraron resultados para tu búsqueda.' : 'No hay personal registrado en este estado. Puedes registrar un nuevo trabajador con el botón superior.'}
                  </p>
                  <div className="mt-5 flex items-center justify-center gap-3">
                    <button
                      onClick={handleAbrirAgregarTrabajador}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" /> + Agregar Trabajador a Nómina
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 5. Historial General de Nóminas */}
      {activeTab === 'historial' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" /> Histórico General de Recibos de Pago Emitidos
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Consulta y reimprime todos los comprobantes de pago generados para la firma.
              </p>
            </div>

            <button
              onClick={fetchRecibos}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </button>
          </div>

          {recibosHistorial.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <Wallet className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
              <p className="text-slate-700 font-bold text-sm">No hay recibos pagados archivados todavía</p>
              <p className="text-slate-400 text-xs mt-1">Cuando emitas pagos en la quincena actual, quedarán registrados aquí permanentemente.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Nº Recibo</th>
                    <th className="py-3 px-4">Trabajador</th>
                    <th className="py-3 px-4">Período</th>
                    <th className="py-3 px-4 text-right">Neto Pagado ($)</th>
                    <th className="py-3 px-4 text-right">Neto (Bs.)</th>
                    <th className="py-3 px-4">Fecha de Pago</th>
                    <th className="py-3 px-4 text-center">Descargar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recibosHistorial.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.numeroRecibo}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{r.empleadoNombre}</td>
                      <td className="py-3 px-4 text-slate-600">{r.periodoInicio} al {r.periodoFin}</td>
                      <td className="py-3 px-4 text-right font-black text-emerald-600">$ {r.netoPagarUsd.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-600">Bs. {r.netoPagarVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-slate-500">{r.fechaPago || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDescargarPdf(r)}
                          className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. MODAL UNIFICADO: PAGAR & EMITIR NÓMINA (CON BS. DESTACADO, CAPTURE Y REFERENCIA) */}
      {editingRecibo && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 border border-slate-200">
            {/* Modal Header */}
            <div className="bg-slate-900 p-6 text-white flex justify-between items-start">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> Liquidación, Pago y Emisión de Nómina
                </div>
                <h3 className="text-xl sm:text-2xl font-black flex items-center gap-2">
                  <Wallet className="w-6 h-6 text-emerald-400" /> {editingRecibo.empleadoNombre}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  C.I. {editingRecibo.cedula} • {editingRecibo.cargo} • Recibo Nº {editingRecibo.numeroRecibo}
                </p>
              </div>
              <button
                onClick={() => setEditingRecibo(null)}
                className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* SELECTOR DE MODALIDAD DE COBRO: QUINCENAL (50%) VS MENSUAL COMPLETO (100% • EL ÚLTIMO) */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-2.5">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" /> Modalidad de Pago de este Recibo
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    Sueldo Mensual Base: <strong className="text-white">$ {editingRecibo.sueldoBaseMensual.toFixed(2)}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleToggleModalidadLiquidacion('quincenal')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      editingRecibo.modalidadLiquidacion !== 'mensual_completo'
                        ? 'bg-blue-600/30 border-blue-500 text-white ring-2 ring-blue-500/40 shadow-sm'
                        : 'bg-slate-900/50 border-slate-700/60 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${editingRecibo.modalidadLiquidacion !== 'mensual_completo' ? 'bg-blue-400 shadow-sm shadow-blue-400/50' : 'bg-slate-600'}`} />
                        Pago Quincenal (50%)
                      </span>
                      <span className="text-xs font-black text-white">
                        $ {(editingRecibo.sueldoBaseMensual / 2).toFixed(2)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      15 días de labor • Pago habitual fraccionado (15 y Último)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleModalidadLiquidacion('mensual_completo')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      editingRecibo.modalidadLiquidacion === 'mensual_completo'
                        ? 'bg-amber-500/25 border-amber-500 text-white ring-2 ring-amber-500/40 shadow-sm'
                        : 'bg-slate-900/50 border-slate-700/60 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${editingRecibo.modalidadLiquidacion === 'mensual_completo' ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-slate-600'}`} />
                        Un Solo Pago • Mes Completo (100%)
                      </span>
                      <span className="text-xs font-black text-amber-300">
                        $ {editingRecibo.sueldoBaseMensual.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      30 días completos • Para quien cobra todo junto a fin de mes (El Último)
                    </span>
                  </button>
                </div>
              </div>

              {/* BLOQUE PRINCIPAL: MONTO A TRANSFERIR EN BOLÍVARES (PROTAGONISTA) */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 border border-emerald-500/40 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 block mb-1">
                      Monto Total a Transferir (Bolívares - Tasa Oficial BCV)
                    </span>
                    <div className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">
                      Bs. {editingRecibo.netoPagarVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-300 font-bold mt-2 flex flex-wrap items-center gap-2">
                      <span>Equiv: <strong className="text-white">$ {editingRecibo.netoPagarUsd.toFixed(2)} USD</strong></span>
                      <span className="text-slate-500">•</span>
                      <span>Tasa BCV: <strong className="text-white">{editingRecibo.tasaCambio?.toFixed(2) || tasaCambio.toFixed(2)} Bs./$</strong></span>
                    </div>
                  </div>

                  {/* Ajustador Rápido de Tasa si se requiere recalcular */}
                  <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Ajustar Tasa (Bs./$)</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-emerald-400 text-xs font-bold">Bs.</span>
                      <input
                        type="number"
                        step="0.01"
                        value={editingRecibo.tasaCambio || tasaCambio}
                        onChange={(e) => {
                          const newTasa = Math.max(1, Number(e.target.value) || 1);
                          const newNetoVes = Math.round(editingRecibo.netoPagarUsd * newTasa * 100) / 100;
                          setEditingRecibo({
                            ...editingRecibo,
                            tasaCambio: newTasa,
                            netoPagarVes: newNetoVes
                          });
                        }}
                        className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-xs font-bold text-white text-right outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* BLOQUE DE DATOS BANCARIOS DEL TRABAJADOR (PARA TRANSFERIR AL INSTANTE) */}
              {(() => {
                const empInfo = plantillaPersonal.find(p => 
                  p.nombre.toLowerCase().trim() === editingRecibo.empleadoNombre.toLowerCase().trim() ||
                  (p.cedula && editingRecibo.cedula && p.cedula.trim() === editingRecibo.cedula.trim())
                );
                const isTransfer = editingRecibo.tipoPago === 'Transferencia';
                const currentCuenta = editingRecibo.numeroCuenta || empInfo?.numeroCuenta || '';
                const copiaTexto = isTransfer
                  ? `Beneficiario: ${editingRecibo.empleadoNombre}\nCédula: ${editingRecibo.cedula}\nBanco: ${editingRecibo.banco}\nTipo de Cuenta: ${editingRecibo.tipoCuenta || empInfo?.tipoCuenta || 'Corriente'}\nCuenta (20 Dígitos): ${currentCuenta || 'No registrada'}\nMonto a Transferir: Bs. ${editingRecibo.netoPagarVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} (Ref: $ ${editingRecibo.netoPagarUsd.toFixed(2)})`
                  : `Beneficiario: ${editingRecibo.empleadoNombre}\nCédula: ${editingRecibo.cedula}\nBanco: ${editingRecibo.banco}\nMétodo: ${editingRecibo.tipoPago}\nTeléfono Pago Móvil: ${empInfo?.telefono || 'No registrado'}\nMonto a Pagar: Bs. ${editingRecibo.netoPagarVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} (Ref: $ ${editingRecibo.netoPagarUsd.toFixed(2)})`;

                return (
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        {isTransfer ? <Building2 className="w-4 h-4 text-blue-600" /> : <Users className="w-4 h-4 text-blue-600" />}
                        {isTransfer ? 'Datos para Transferencia Bancaria' : 'Datos Bancarios para el Pago'}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isTransfer && currentCuenta && (
                          <button
                            type="button"
                            onClick={() => handleCopiarCuenta(currentCuenta)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                          >
                            {copiedAccount ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Copy className="w-3.5 h-3.5 text-blue-500" />}
                            <span>{copiedAccount ? '¡Cuenta Copiada!' : 'Copiar Cuenta'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopiarCedula(editingRecibo.cedula)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        >
                          {copiedCedula ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                          <span>{copiedCedula ? '¡Cédula Copiada!' : 'Copiar Cédula'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopiarMonto(editingRecibo.netoPagarVes)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        >
                          {copiedMonto ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-emerald-600" />}
                          <span>{copiedMonto ? '¡Monto Copiado!' : 'Copiar Monto Bs.'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopiarDatos(copiaTexto)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        >
                          {copiedData ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                          <span>{copiedData ? '¡Copiado!' : 'Copiar Todo'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Método</span>
                        <span className="font-extrabold text-slate-800">{editingRecibo.tipoPago}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Banco Receptor</span>
                        <span className="font-extrabold text-slate-800">{editingRecibo.banco}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Cédula del Titular</span>
                        <span className="font-extrabold text-slate-800">{editingRecibo.cedula}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          {isTransfer ? 'Tipo de Cuenta' : 'Teléfono / Pago Móvil'}
                        </span>
                        <span className="font-extrabold text-slate-800">
                          {isTransfer ? (editingRecibo.tipoCuenta || empInfo?.tipoCuenta || 'Corriente') : (empInfo?.telefono || 'Consultar con empleado')}
                        </span>
                      </div>
                    </div>

                    {/* Si es Transferencia: Mostrar y permitir registrar o modificar la cuenta bancaria de 20 dígitos */}
                    {isTransfer && (
                      <div className="mt-2 bg-slate-900 text-white rounded-xl p-3 border border-slate-800">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Número de Cuenta Bancaria (20 Dígitos)
                            </span>
                            {currentCuenta && !editingInlineCuenta ? (
                              <div className="font-mono text-sm sm:text-base font-black text-emerald-400 tracking-wider mt-0.5 select-all">
                                {currentCuenta}
                              </div>
                            ) : !editingInlineCuenta ? (
                              <div className="text-xs text-amber-300 font-bold mt-0.5">
                                No se ha registrado el número de cuenta de 20 dígitos
                              </div>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2">
                            {editingInlineCuenta ? (
                              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                                <input
                                  type="text"
                                  maxLength={24}
                                  value={inlineCuentaVal}
                                  onChange={(e) => setInlineCuentaVal(e.target.value)}
                                  placeholder="0134-0000-00-0000000000"
                                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-white outline-none focus:border-blue-500 w-56"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={handleGuardarCuentaInline}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                                >
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingInlineCuenta(false)}
                                  className="px-2 py-1 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setInlineCuentaVal(currentCuenta);
                                  setEditingInlineCuenta(true);
                                }}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold border border-slate-700 inline-flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3 text-slate-400" /> {currentCuenta ? 'Modificar Cuenta' : 'Registrar Cuenta'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* BLOQUE DE COMPROBANTE: NÚMERO DE REFERENCIA Y ADJUNTAR CAPTURE (OPCIONAL) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Referencia Bancaria (Obligatoria para transferencias / pago móvil) */}
                {(() => {
                  const isRefValida = editingRecibo.tipoPago === 'Efectivo' || (editingRecibo.referenciaPago && editingRecibo.referenciaPago.trim().length > 0);
                  const isRefRequerida = editingRecibo.tipoPago !== 'Efectivo';

                  return (
                    <div className={`p-4 rounded-2xl border transition-all ${
                      !isRefValida 
                        ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20' 
                        : 'bg-slate-50 border-slate-200'
                    } space-y-2`}>
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-black uppercase text-slate-800 flex items-center gap-1">
                          <span>Número de Referencia Bancaria</span>
                          {isRefRequerida && <span className="text-rose-600 font-black">*</span>}
                        </label>
                        {isRefRequerida && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isRefValida 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-rose-100 text-rose-700 font-extrabold animate-pulse'
                          }`}>
                            {isRefValida ? 'Referencia ingresada' : 'Requerido para emitir'}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required={isRefRequerida}
                        value={editingRecibo.referenciaPago || ''}
                        onChange={(e) => setEditingRecibo({ ...editingRecibo, referenciaPago: e.target.value })}
                        className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none shadow-xs transition-colors ${
                          !isRefValida 
                            ? 'border-amber-400 focus:border-rose-500' 
                            : 'border-slate-300 focus:border-emerald-500'
                        }`}
                        placeholder="Ej: 849201 (Transferencia o Pago Móvil)"
                      />
                      {!isRefValida ? (
                        <p className="text-[11px] text-amber-800 font-bold flex items-center gap-1">
                          <span>Debes ingresar la referencia bancaria para poder confirmar y emitir el pago.</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          Aparecerá en el recibo PDF oficial y en la notificación instantánea del trabajador.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* 2. Adjuntar Capture / Comprobante de Pago (Opcional) */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <label className="text-xs font-black uppercase text-slate-700 block">
                    Capture / Comprobante de Pago <span className="text-slate-400 font-medium lowercase">(opcional)</span>
                  </label>
                  
                  {editingRecibo.comprobanteBase64 || editingRecibo.comprobanteUrl ? (
                    <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-emerald-300 shadow-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <img 
                          src={editingRecibo.comprobanteBase64 || editingRecibo.comprobanteUrl} 
                          alt="Thumbnail Capture" 
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 block truncate">
                            {editingRecibo.comprobanteNombre || 'Capture_Pago_Bancario.png'}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-bold block">Comprobante listo para enviar</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewCaptureModal({
                            url: editingRecibo.comprobanteBase64 || editingRecibo.comprobanteUrl || '',
                            title: `Capture de Pago • ${editingRecibo.empleadoNombre}`
                          })}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
                          title="Ver capture a tamaño completo"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingRecibo({
                            ...editingRecibo,
                            comprobanteBase64: undefined,
                            comprobanteUrl: undefined,
                            comprobanteNombre: undefined
                          })}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Quitar comprobante"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 w-full p-2.5 bg-white border border-dashed border-slate-300 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/30 transition-all cursor-pointer text-slate-600 text-xs font-bold shadow-xs">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>Subir Capture o Foto del Pago</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleCaptureUpload} 
                        className="hidden" 
                      />
                    </label>
                  )}
                  <p className="text-[11px] text-slate-500">
                    El trabajador podrá previsualizarlo y descargarlo directamente desde su portal.
                  </p>
                </div>
              </div>

              {/* BLOQUE 4: ACORDEÓN DESPLEGABLE DE AJUSTE DE CONCEPTOS (OPCIONAL) */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <button
                  type="button"
                  onClick={() => setShowConceptosAccordion(!showConceptosAccordion)}
                  className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                      ¿Deseas verificar o ajustar conceptos, bonos o deducciones?
                    </span>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-md text-[10px] font-bold">
                      Opcional
                    </span>
                  </div>
                  {showConceptosAccordion ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {showConceptosAccordion && (
                  <div className="p-4 space-y-4 border-t border-slate-200 animate-in fade-in duration-150">
                    <div className="flex justify-between items-center">
                      <p className="text-[11px] text-slate-500">
                        Modifica los montos en dólares ($). El total neto en Bolívares (Bs.) se recalculará automáticamente.
                      </p>
                      <button
                        type="button"
                        onClick={handleAddConcepto}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar Concepto / Bono
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                      <div className="grid grid-cols-12 bg-slate-100 p-2 font-bold text-slate-600 text-[10px] uppercase">
                        <div className="col-span-5">Concepto</div>
                        <div className="col-span-2 text-center">Días / Tasa</div>
                        <div className="col-span-2 text-right">Asignación ($)</div>
                        <div className="col-span-2 text-right">Deducción ($)</div>
                        <div className="col-span-1 text-center">Quitar</div>
                      </div>

                      {editingRecibo.conceptos.map((concepto, idx) => (
                        <div key={concepto.id || idx} className="grid grid-cols-12 p-2 items-center gap-2 hover:bg-slate-50">
                          <div className="col-span-5">
                            <input
                              type="text"
                              value={concepto.concepto}
                              onChange={(e) => handleConceptoChange(idx, 'concepto', e.target.value)}
                              className="w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-blue-500 px-1 py-0.5 text-xs font-bold text-slate-800 outline-none"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={concepto.dht || ''}
                              onChange={(e) => handleConceptoChange(idx, 'dht', e.target.value)}
                              placeholder="—"
                              className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[11px] text-center font-medium text-slate-600 outline-none"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              step="0.01"
                              value={concepto.devengado ?? ''}
                              onChange={(e) => handleConceptoChange(idx, 'devengado', e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-emerald-50/50 border border-emerald-200 rounded px-2 py-0.5 text-xs font-bold text-emerald-700 text-right outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              step="0.01"
                              value={concepto.deduccion ?? ''}
                              onChange={(e) => handleConceptoChange(idx, 'deduccion', e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-rose-50/50 border border-rose-200 rounded px-2 py-0.5 text-xs font-bold text-rose-700 text-right outline-none focus:border-rose-500"
                            />
                          </div>
                          <div className="col-span-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveConcepto(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer (Optimizado para Pantallas de iPhone y Escritorio) */}
            <div className="bg-slate-50 p-4 px-4 sm:px-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingRecibo(null)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 font-bold text-xs transition-colors cursor-pointer text-center"
                >
                  Cancelar
                </button>

                <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={autoOpenWhatsApp}
                    onChange={(e) => setAutoOpenWhatsApp(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                  />
                  <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Abrir WhatsApp automáticamente con el comprobante
                  </span>
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveBorrador}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 text-center"
                >
                  Guardar Borrador
                </button>

                {(() => {
                  const isRefValida = editingRecibo.tipoPago === 'Efectivo' || (editingRecibo.referenciaPago && editingRecibo.referenciaPago.trim().length > 0);

                  return (
                    <button
                      type="button"
                      onClick={() => handleEmitirYMarcarPagado(editingRecibo)}
                      disabled={isSaving || !isRefValida}
                      className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                        isRefValida && !isSaving
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 cursor-pointer'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-80 shadow-none'
                      }`}
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span>{isRefValida ? 'Confirmar Pago & Descargar Recibo PDF' : 'Falta Nº de Referencia para Emitir'}</span>
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Previsualización de Capture de Jefatura */}
      {previewCaptureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-sm sm:text-base truncate">{previewCaptureModal.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCaptureModal(null)}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex items-center justify-center bg-slate-950/50 min-h-[250px]">
              <img 
                src={previewCaptureModal.url} 
                alt="Capture de pago bancario" 
                className="max-w-full max-h-[70vh] object-contain rounded-2xl border border-slate-800 shadow-md"
              />
            </div>
            <div className="p-3 px-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/90">
              <a
                href={previewCaptureModal.url}
                download="Comprobante_Pago.png"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" /> Descargar Imagen
              </a>
              <button
                type="button"
                onClick={() => setPreviewCaptureModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Agregar / Editar Trabajador en Plantilla */}
      {workerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-blue-500/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {editingWorker ? 'Editar Ficha del Trabajador' : 'Agregar Trabajador a Nómina'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingWorker ? 'Modifica los datos contractuales y bancarios' : 'Registra un miembro del despacho para liquidar su nómina'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWorkerModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleGuardarTrabajador}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Nombre Completo */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={workerForm.nombre}
                    onChange={(e) => setWorkerForm({ ...workerForm, nombre: e.target.value })}
                    placeholder="Ej: Carmen Luisa Delgado"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Cédula y Cargo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                      Cédula de Identidad *
                    </label>
                    <input
                      type="text"
                      required
                      value={workerForm.cedula}
                      onChange={(e) => setWorkerForm({ ...workerForm, cedula: e.target.value })}
                      placeholder="Ej: V-12.338.408"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                      Cargo / Puesto
                    </label>
                    <input
                      type="text"
                      value={workerForm.cargo}
                      onChange={(e) => setWorkerForm({ ...workerForm, cargo: e.target.value })}
                      placeholder="Ej: Abogada Asociada, Asistente"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Modalidad y Frecuencia de Cobro */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                    Frecuencia de Pago y Liquidación
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setWorkerForm({ ...workerForm, frecuenciaPago: 'quincenal' })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        workerForm.frecuenciaPago !== 'mensual_ultimo'
                          ? 'border-blue-500 bg-blue-50/80 text-blue-950 ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100/70'
                      }`}
                    >
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${workerForm.frecuenciaPago !== 'mensual_ultimo' ? 'bg-blue-600' : 'bg-slate-300'}`}></span>
                        Quincenal (15 y Último)
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                        Cobra 50% cada quincena ($ {((Number(workerForm.sueldoMensual) || 0) / 2).toFixed(2)})
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWorkerForm({ ...workerForm, frecuenciaPago: 'mensual_ultimo' })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        workerForm.frecuenciaPago === 'mensual_ultimo'
                          ? 'border-amber-500 bg-amber-50/80 text-amber-950 ring-2 ring-amber-500/20'
                          : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100/70'
                      }`}
                    >
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${workerForm.frecuenciaPago === 'mensual_ultimo' ? 'bg-amber-600' : 'bg-slate-300'}`}></span>
                        Un Solo Pago (El Último)
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                        Cobra 100% a fin de mes ($ {(Number(workerForm.sueldoMensual) || 0).toFixed(2)})
                      </span>
                    </button>
                  </div>
                </div>

                {/* Sueldo Mensual Base */}
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                      Sueldo Base Mensual ($ USD) *
                    </label>
                    <span className="text-[11px] font-bold text-emerald-700">
                      {workerForm.frecuenciaPago === 'mensual_ultimo'
                        ? `Pago único a fin de mes: $ ${(Number(workerForm.sueldoMensual) || 0).toFixed(2)}`
                        : `Quincenal: $ ${((Number(workerForm.sueldoMensual) || 0) / 2).toFixed(2)}`
                      }
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 font-extrabold text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={workerForm.sueldoMensual || ''}
                      onChange={(e) => setWorkerForm({ ...workerForm, sueldoMensual: Number(e.target.value) || 0 })}
                      placeholder="200.00"
                      className="w-full bg-white border border-emerald-300 rounded-xl pl-8 pr-4 py-2.5 text-sm font-black text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <span className="text-[11px] text-emerald-700/80 mt-1 block">
                    {workerForm.frecuenciaPago === 'mensual_ultimo'
                      ? 'Este trabajador cobra la totalidad mensual en un solo pago a fin de mes (16 al último día). En la primera quincena no acumula cobro.'
                      : `En cada quincena se calculará automáticamente el 50% de este sueldo base ($ ${((Number(workerForm.sueldoMensual) || 0) / 2).toFixed(2)}).`
                    }
                  </span>
                </div>

                {/* Método de Pago */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    Método de Pago Principal *
                  </label>
                  <select
                    value={workerForm.tipoPago}
                    onChange={(e) => setWorkerForm({ ...workerForm, tipoPago: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Transferencia">Transferencia Bancaria (Cuenta 20 Dígitos)</option>
                    <option value="Pago Móvil">Pago Móvil (Teléfono + Cédula)</option>
                    <option value="Efectivo">Efectivo en Dólares ($ USD)</option>
                    <option value="Zelle">Zelle</option>
                    <option value="Otro">Otro Método</option>
                  </select>
                </div>

                {/* DETALLE SEGÚN MÉTODO: TRANSFERENCIA BANCARIA */}
                {workerForm.tipoPago === 'Transferencia' && (
                  <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-blue-600" /> Datos de Transferencia Bancaria
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        workerForm.numeroCuenta.replace(/\D/g, '').length === 20
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {workerForm.numeroCuenta.replace(/\D/g, '').length}/20 dígitos {workerForm.numeroCuenta.replace(/\D/g, '').length === 20 ? '' : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">
                          Banco Receptor *
                        </label>
                        <input
                          type="text"
                          required
                          value={workerForm.banco}
                          onChange={(e) => setWorkerForm({ ...workerForm, banco: e.target.value })}
                          placeholder="Ej: Banesco, Mercantil, Venezuela"
                          className="w-full bg-white border border-blue-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">
                          Tipo de Cuenta *
                        </label>
                        <select
                          value={workerForm.tipoCuenta}
                          onChange={(e) => setWorkerForm({ ...workerForm, tipoCuenta: e.target.value as any })}
                          className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 cursor-pointer"
                        >
                          <option value="Corriente">Corriente</option>
                          <option value="Ahorro">Ahorro</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">
                          Cédula del Titular *
                        </label>
                        <input
                          type="text"
                          required
                          value={workerForm.cedula}
                          onChange={(e) => setWorkerForm({ ...workerForm, cedula: e.target.value })}
                          placeholder="Ej: V-12.338.408"
                          className="w-full bg-white border border-blue-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">
                        Número de Cuenta Bancaria (20 Dígitos) *
                      </label>
                      <input
                        type="text"
                        maxLength={24}
                        value={workerForm.numeroCuenta}
                        onChange={(e) => setWorkerForm({ ...workerForm, numeroCuenta: e.target.value })}
                        placeholder="Ej: 0134-0000-00-0000000000 (20 dígitos)"
                        className="w-full bg-white border border-blue-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-black text-slate-900 tracking-wider outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Este número se mostrará en el Centro de Pagos con un botón de 1 clic para copiarlo y pegarlo directamente en el portal del banco.
                      </span>
                    </div>
                  </div>
                )}

                {/* DETALLE SEGÚN MÉTODO: PAGO MÓVIL */}
                {workerForm.tipoPago === 'Pago Móvil' && (
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-emerald-600" /> Datos de Pago Móvil
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Cédula + Teléfono
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">
                          Banco Receptor *
                        </label>
                        <input
                          type="text"
                          required
                          value={workerForm.banco}
                          onChange={(e) => setWorkerForm({ ...workerForm, banco: e.target.value })}
                          placeholder="Ej: Banesco, Venezuela, Mercantil"
                          className="w-full bg-white border border-emerald-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">
                          Teléfono Pago Móvil *
                        </label>
                        <input
                          type="text"
                          value={workerForm.telefono}
                          onChange={(e) => setWorkerForm({ ...workerForm, telefono: e.target.value })}
                          placeholder="0414-1234567"
                          className="w-full bg-white border border-emerald-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* OTROS MÉTODOS (EFECTIVO / ZELLE / OTRO) */}
                {workerForm.tipoPago !== 'Transferencia' && workerForm.tipoPago !== 'Pago Móvil' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">
                        Banco / Plataforma / Detalles
                      </label>
                      <input
                        type="text"
                        value={workerForm.banco}
                        onChange={(e) => setWorkerForm({ ...workerForm, banco: e.target.value })}
                        placeholder={workerForm.tipoPago === 'Zelle' ? 'Correo o teléfono Zelle' : 'Detalles de entrega'}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Teléfono y Correo de Contacto General */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {workerForm.tipoPago !== 'Pago Móvil' && (
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                        Teléfono de Contacto (Opcional)
                      </label>
                      <input
                        type="text"
                        value={workerForm.telefono}
                        onChange={(e) => setWorkerForm({ ...workerForm, telefono: e.target.value })}
                        placeholder="0414-1234567"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                  <div className={workerForm.tipoPago === 'Pago Móvil' ? 'sm:col-span-2' : ''}>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                      Correo Electrónico (Para envío de recibos / avisos)
                    </label>
                    <input
                      type="email"
                      value={workerForm.email}
                      onChange={(e) => setWorkerForm({ ...workerForm, email: e.target.value })}
                      placeholder="empleado@gmail.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between items-center gap-3">
                <button
                  type="button"
                  onClick={() => setWorkerModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" /> {editingWorker ? 'Actualizar Ficha' : 'Guardar e Incorporar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Envío de Notificación Inmediata por WhatsApp / Correo */}
      {notificacionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">Pago Emitido Exitosamente</h3>
                  <p className="text-[11px] text-slate-400">Recibo oficial generado en PDF</p>
                </div>
              </div>
              <button 
                onClick={() => setNotificacionModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trabajador Acreditado</span>
                <div className="font-extrabold text-slate-900 text-base mt-0.5">{notificacionModal.empleadoNombre}</div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200/80">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Monto Liquidado</span>
                    <span className="text-lg font-black text-emerald-600">
                      Bs. {notificacionModal.netoPagarVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Ref. USD</span>
                    <span className="text-sm font-bold text-slate-800">$ {notificacionModal.netoPagarUsd.toFixed(2)}</span>
                  </div>
                </div>
                {notificacionModal.referenciaPago && (
                  <div className="mt-2 text-[11px] font-mono text-slate-600 font-bold">
                    Ref. Bancaria: <span className="text-emerald-700">{notificacionModal.referenciaPago}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-600 font-medium">
                El comprobante en PDF ya ha sido descargado en tu dispositivo. Puedes enviar la notificación detallada al trabajador a través de:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleEnviarWhatsApp(notificacionModal)}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 transition-all cursor-pointer active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Enviar por WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEnviarEmail(notificacionModal)}
                  className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-sky-600/25 transition-all cursor-pointer active:scale-95"
                >
                  <Mail className="w-4 h-4" />
                  <span>Enviar por Correo</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setNotificacionModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alerta del Sistema */}
      <SystemAlertModal
        isOpen={systemAlert.isOpen}
        type={systemAlert.type}
        title={systemAlert.title}
        message={systemAlert.message}
        showCancel={systemAlert.showCancel}
        confirmText={systemAlert.confirmText}
        onClose={() => setSystemAlert(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          if (systemAlert.onConfirm) systemAlert.onConfirm();
          setSystemAlert(prev => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
}
