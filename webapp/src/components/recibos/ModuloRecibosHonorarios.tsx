import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Receipt,
  Plus,
  FileText,
  DollarSign,
  Search,
  Download,
  Share2,
  Trash2,
  Lightbulb,
  RefreshCw,
  ShieldCheck,
  Copy,
  Check,
  Coins,
  User,
  X,
  Scale,
  FileDown,
  Eye,
  Banknote,
  CheckSquare,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  Building2,
  Hash,
  Mail,
  Phone,
  Briefcase
} from 'lucide-react';
import type { ReciboCliente, TipoReciboCliente, MetodoPagoCliente } from '../../types/recibos';
import {
  supabaseLoadHonorariosData,
  supabaseEmitirReciboCliente,
  supabaseDeleteReciboCliente,
  supabaseGetExpedientes,
  checkIsJefatura,
  checkIsSistemas,
  sortHistoryDesc
} from '../../lib/supabaseAdapter';
import { exportarReciboClientePDF } from '../../lib/pdfExportReciboCliente';
import SystemAlertModal, { type AlertType } from '../common/SystemAlertModal';

interface ModuloRecibosHonorariosProps {
  currentUser?: string;
  isJefatura?: boolean;
  globalExpedientes?: any[];
}

const CONTRATO_TEMPLATE = `CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES LEGALES

Entre la firma jurídica ROMÁN & DELGADO, domiciliada en Valencia, Estado Carabobo, representada en este acto por los abogados en ejercicio VÍCTOR ROMÁN y LUIS DELGADO, inscritos en el Instituto de Previsión Social del Abogado (INPREABOGADO) bajo los Nros. [___] y [___], en lo sucesivo denominados "LOS ABOGADOS", por una parte; y por la otra el ciudadano(a):
NOMBRE COMPLETO: [Nombre del Cliente]
CÉDULA DE IDENTIDAD / RIF: [V-__________]
DOMICILIO: [Dirección de habitación o comercial]
TELÉFONO / CORREO: [Teléfono y email]
En lo sucesivo denominado "EL CLIENTE", se ha convenido celebrar el presente Contrato de Servicios Profesionales sujeto a las siguientes cláusulas:

PRIMERA (OBJETO): "LOS ABOGADOS" se comprometen a prestar sus servicios profesionales de asesoría, representación y asistencia jurídica a favor de "EL CLIENTE" en el asunto relativo a:
[Describir el caso o trámite: ej. Redacción de documento de compraventa, demanda civil, asistencia procesal, etc.].

SEGUNDA (HONORARIOS PACTADOS): De conformidad con lo dispuesto en el artículo 22 de la Ley de Abogados y las normas de ética profesional, las partes acuerdan fijar la suma de:
MONTO TOTAL: _________________ DÓLARES DE LOS ESTADOS UNIDOS DE AMÉRICA ($ USD) [o su equivalente en Bolívares a la tasa oficial del Banco Central de Venezuela a la fecha efectiva del pago].

TERCERA (FORMA DE PAGO): El monto de los honorarios antes estipulado será cancelado por "EL CLIENTE" de la siguiente manera:
[  ] Pago Único de Contado a la suscripción del presente contrato.
[  ] Pago Fraccionado: Un anticipo del [___]% ($_____) y el saldo restante pagadero en [___] cuotas de ($_____) en fechas: _______________.
Método de Pago: [Efectivo / Transferencia Bancaria Nacional / Pago Móvil / Divisas / Zelle].

CUARTA (GASTOS OPERATIVOS Y JUDICIALES): Queda expresamente convenido que los honorarios profesionales pactados en la Cláusula Segunda NO incluyen los gastos de tramitación, aranceles judiciales, timbres fiscales, copias fotostáticas, traslados, expensas de registros, notarías o tribunales. Dichos conceptos serán cubiertos íntegramente por "EL CLIENTE" mediante los correspondientes recibos de anticipo o rendición de gastos (Anexo A).

QUINTA (CONFIDENCIALIDAD Y DEBER DE INFORMACIÓN): "LOS ABOGADOS" guardarán estricto secreto profesional sobre todos los hechos y documentos suministrados por "EL CLIENTE", obligándose a mantenerlo debidamente informado sobre el estado y avance de las gestiones encomendadas.

SEXTA (JURISDICCIÓN): Para todos los efectos legales derivados de este contrato, las partes eligen como domicilio especial y excluyente la ciudad de Valencia, Estado Carabobo, a la jurisdicción de cuyos tribunales declaran someterse.

Se firman dos (2) ejemplares de un mismo tenor y a un solo efecto, en Valencia, a los _____ días del mes de _____________ de 2026.

_________________________________             _________________________________
       POR ROMÁN & DELGADO                                  EL CLIENTE
    Abg. Víctor Román / Luis Delgado                     C.I. V-_______________`;

const ANEXO_GASTOS_TEMPLATE = `========================================================================
             ROMÁN & DELGADO — ESCRITORIO JURÍDICO
              RECIBO Y ANEXO DE FONDOS PARA GASTOS
========================================================================
RECIBO NRO: RD-GST-2026-______                   FECHA: ___/___/2026

HEMOS RECIBIDO DEL CLIENTE: _____________________________________________
CÉDULA DE IDENTIDAD / RIF: V-_________________  EXPEDIENTE: ____________

LA CANTIDAD DE: __________________________ [USD $ / Bs.]
EN LETRAS: _____________________________________________________________
FORMA DE RECEPCIÓN: [  ] Efectivo Divisas  [  ] Cuenta / Transf.  [  ] Pago Móvil
REFERENCIA BANCARIA: ___________________________________________________

DESTINADO EXCLUSIVAMENTE A LOS SIGUIENTES GASTOS DE GESTIÓN:
[  ] Aranceles y tasas judiciales / tribunales.
[  ] Gastos de Notaría Pública / Registro Principal o Mercantil.
[  ] Timbres fiscales, estampillas y papel sellado.
[  ] Fotocopias certificadas, traslados y movilización operativa.
[  ] Otros: ____________________________________________________________

NOTA: Este monto NO constituye pago de honorarios profesionales de los abogados;
representa una provisión para gastos de tramitación sujeta a soporte y rendición.

RECIBIDO POR EL BUFETE:                      ENTREGADO CONFORME POR EL CLIENTE:
Firma: ________________________              Firma: __________________________
Abg. Responsable: _____________              C.I. V-__________________________`;

const CONTRATO_HTML = `
<div class='membrete'>
  <h2 style='margin:0; font-size:14pt; letter-spacing:1px;'>ROMÁN & DELGADO — ESCRITORIO JURÍDICO</h2>
  <p style='margin:3px 0 0 0; font-size:10pt; color:#666;'>Valencia, Estado Carabobo • RIF: J-40892839-1 • Inpreabogado: 184.290 / 201.442</p>
</div>
<h1>CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES</h1>
<p>Entre la firma jurídica <strong>ROMÁN & DELGADO</strong>, domiciliada en Valencia, Estado Carabobo, representada en este acto por los abogados en ejercicio <strong>VÍCTOR ROMÁN</strong> y <strong>LUIS DELGADO</strong>, inscritos en el Inpreabogado, en lo sucesivo denominados <strong>"LOS ABOGADOS"</strong>, por una parte; y por la otra el ciudadano(a):</p>
<p class='no-indent'>
<strong>NOMBRE COMPLETO:</strong> [Nombre del Cliente]<br>
<strong>CÉDULA DE IDENTIDAD / RIF:</strong> [V-__________]<br>
<strong>DOMICILIO:</strong> [Dirección de habitación o comercial]<br>
<strong>TELÉFONO / CORREO:</strong> [Teléfono y email]
</p>
<p>En lo sucesivo denominado <strong>"EL CLIENTE"</strong>, se ha convenido celebrar el presente Contrato de Servicios Profesionales sujeto a las siguientes cláusulas:</p>
<p><span class='clausula'>PRIMERA (OBJETO):</span> "LOS ABOGADOS" se comprometen a prestar sus servicios profesionales de asesoría, representación y asistencia jurídica a favor de "EL CLIENTE" en el asunto relativo a: [Describir el caso o trámite].</p>
<p><span class='clausula'>SEGUNDA (HONORARIOS PACTADOS):</span> De conformidad con lo dispuesto en el artículo 22 de la Ley de Abogados y las normas de ética profesional, las partes acuerdan fijar la suma de: MONTO TOTAL: _________________ DÓLARES DE LOS ESTADOS UNIDOS DE AMÉRICA ($ USD) [o su equivalente en Bolívares a la tasa oficial del Banco Central de Venezuela a la fecha efectiva del pago].</p>
<p><span class='clausula'>TERCERA (FORMA DE PAGO):</span> El monto de los honorarios antes estipulado será cancelado por "EL CLIENTE" de la siguiente manera: [  ] Pago Único de Contado a la suscripción. [  ] Pago Fraccionado: Un anticipo y saldo restante pagadero en cuotas.</p>
<p><span class='clausula'>CUARTA (GASTOS OPERATIVOS Y JUDICIALES):</span> Queda expresamente convenido que los honorarios profesionales pactados en la Cláusula Segunda NO incluyen los gastos de tramitación, aranceles judiciales, timbres fiscales, copias fotostáticas, traslados, expensas de registros, notarías o tribunales. Dichos conceptos serán cubiertos íntegramente por "EL CLIENTE" mediante los correspondientes recibos de anticipo o rendición de gastos (Anexo A).</p>
<p><span class='clausula'>QUINTA (CONFIDENCIALIDAD Y DEBER DE INFORMACIÓN):</span> "LOS ABOGADOS" guardarán estricto secreto profesional sobre todos los hechos y documentos suministrados por "EL CLIENTE", obligándose a mantenerlo debidamente informado sobre el estado y avance de las gestiones encomendadas.</p>
<p><span class='clausula'>SEXTA (JURISDICCIÓN):</span> Para todos los efectos legales derivados de este contrato, las partes eligen como domicilio especial y excluyente la ciudad de Valencia, Estado Carabobo, a la jurisdicción de cuyos tribunales declaran someterse.</p>
<p>Se firman dos (2) ejemplares de un mismo tenor y a un solo efecto, en Valencia, a los _____ días del mes de _____________ de 2026.</p>
<table class='firmas'>
  <tr>
    <td>
      <div class='linea-firma'></div>
      <strong>POR ROMÁN & DELGADO</strong><br>
      Abg. Víctor Román / Luis Delgado
    </td>
    <td>
      <div class='linea-firma'></div>
      <strong>EL CLIENTE</strong><br>
      C.I. V-_________________
    </td>
  </tr>
</table>
`;

const ANEXO_GASTOS_HTML = `
<div class='membrete'>
  <h2 style='margin:0; font-size:14pt; letter-spacing:1px;'>ROMÁN & DELGADO — ESCRITORIO JURÍDICO</h2>
  <p style='margin:3px 0 0 0; font-size:10pt; color:#666;'>RECIBO Y ANEXO DE FONDOS PARA GASTOS (ANEXO A) • RIF: J-40892839-1</p>
</div>
<h1>RECIBO Y ANEXO DE FONDOS PARA GASTOS DE GESTIÓN</h1>
<p class='no-indent'>
<strong>RECIBO NRO:</strong> RD-GST-2026-______ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>FECHA:</strong> ___/___/2026<br><br>
<strong>HEMOS RECIBIDO DEL CLIENTE:</strong> _____________________________________________<br>
<strong>CÉDULA DE IDENTIDAD / RIF:</strong> V-_________________ &nbsp;&nbsp;&nbsp;&nbsp; <strong>EXPEDIENTE:</strong> ____________<br><br>
<strong>LA CANTIDAD DE:</strong> __________________________ [USD $ / Bs.]<br>
<strong>EN LETRAS:</strong> _____________________________________________________________<br>
<strong>FORMA DE RECEPCIÓN:</strong> [  ] Efectivo Divisas &nbsp;&nbsp; [  ] Cuenta / Transf. &nbsp;&nbsp; [  ] Pago Móvil<br>
<strong>REFERENCIA BANCARIA:</strong> ___________________________________________________
</p>
<p class='no-indent'>
<strong>DESTINADO EXCLUSIVAMENTE A LOS SIGUIENTES GASTOS DE GESTIÓN:</strong><br>
[  ] Aranceles y tasas judiciales / tribunales competentes.<br>
[  ] Gastos de Notaría Pública / Registro Principal o Mercantil.<br>
[  ] Timbres fiscales, estampillas y papel sellado oficial.<br>
[  ] Fotocopias certificadas, traslados y movilización operativa.<br>
[  ] Otras expensas procesales justificadas.
</p>
<div class='alerta-legal'>
<strong>NOTA LEGAL:</strong> De conformidad con los Artículos 22 y 25 de la Ley de Abogados, este monto NO constituye pago de honorarios profesionales de los abogados; representa una provisión para gastos de tramitación sujeta a soporte y rendición de cuentas.
</div>
<table class='firmas'>
  <tr>
    <td>
      <div class='linea-firma'></div>
      <strong>RECIBIDO POR EL BUFETE</strong><br>
      Abg. Responsable
    </td>
    <td>
      <div class='linea-firma'></div>
      <strong>ENTREGADO CONFORME POR EL CLIENTE</strong><br>
      C.I. V-__________________________
    </td>
  </tr>
</table>
`;

const downloadDocFile = (filename: string, title: string, htmlBody: string) => {
  const fullHtml = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>${title}</title>
<style>
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; color: #111; margin: 2.5cm; }
  h1 { text-align: center; font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 15px 0 25px 0; }
  h2 { text-align: center; font-size: 12pt; font-weight: bold; text-transform: uppercase; margin: 15px 0; }
  p { text-align: justify; margin-bottom: 14px; text-indent: 25px; }
  p.no-indent { text-indent: 0; }
  .membrete { text-align: center; font-size: 10pt; line-height: 1.3; margin-bottom: 25px; border-bottom: 2px solid #8b6b23; padding-bottom: 12px; }
  .clausula { font-weight: bold; }
  .alerta-legal { background: #fdf8eb; border: 1px solid #d4a737; padding: 10px; margin: 15px 0; font-size: 10.5pt; }
  .firmas { margin-top: 60px; width: 100%; border-collapse: collapse; }
  .firmas td { width: 50%; text-align: center; vertical-align: top; padding: 10px; }
  .linea-firma { width: 75%; border-top: 1px solid #111; margin: 45px auto 8px auto; }
</style>
</head>
<body>
${htmlBody}
</body>
</html>`;

  const blob = new Blob(['\ufeff' + fullHtml], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const getInitialBcvRate = (): string => {
  try {
    const saved = localStorage.getItem('rd_bcv_usd') || localStorage.getItem('rd_live_bcv_rate');
    if (saved && !isNaN(parseFloat(saved)) && parseFloat(saved) > 0) {
      return parseFloat(saved).toFixed(2);
    }
  } catch { }
  return '887.30';
};

// Formateador inteligente de Cédula y RIF (V-, J-, E-, G-)
const formatCedulaRifInput = (raw: string, prev: string = ''): string => {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Si el usuario está borrando hacia atrás y quedó solo el prefijo, permitir vaciarlo
  if (trimmed.length < prev.length) {
    if (['V', 'J', 'E', 'G', 'P'].includes(trimmed.toUpperCase())) {
      return '';
    }
    return trimmed.toUpperCase();
  }

  const upper = trimmed.toUpperCase();

  // Si escribió una sola letra válida: V, J, E, G, P -> autocolocar guión
  if (['V', 'J', 'E', 'G', 'P'].includes(upper)) {
    return `${upper}-`;
  }

  // Si empezó escribiendo números directamente -> asumir V-
  if (/^[0-9]/.test(upper)) {
    const digits = upper.replace(/[^0-9]/g, '');
    return `V-${digits}`;
  }

  // Si tiene prefijo
  const match = upper.match(/^([VJEGP])[-_\s]*(.*)$/);
  if (match) {
    const prefix = match[1];
    let digits = match[2].replace(/[^0-9]/g, '');
    if (!digits) return `${prefix}-`;

    // Si es RIF jurídico (J o G) y tiene 9 dígitos -> J-40892839-1
    if ((prefix === 'J' || prefix === 'G' || prefix === 'P') && digits.length >= 9) {
      const cuerpo = digits.slice(0, 8);
      const verificador = digits.slice(8, 9);
      return `${prefix}-${cuerpo}-${verificador}`;
    }

    if (digits.length > 9) {
      digits = digits.slice(0, 9);
    }
    return `${prefix}-${digits}`;
  }

  return upper;
};

// Formateador inteligente de Teléfono
const formatTelefonoInput = (raw: string, prev: string = ''): string => {
  if (!raw) return '';
  if (raw.length < prev.length) return raw;

  let digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';

  // Si escribió 414, 424, 412... sin el 0 inicial, autocompletar el 0
  if (/^[42][1246]/.test(digits) && digits.length >= 3) {
    digits = '0' + digits;
  }

  if (digits.length > 4) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 11)}`;
  }

  return digits;
};

export default function ModuloRecibosHonorarios({
  currentUser,
  isJefatura = false,
  globalExpedientes = []
}: ModuloRecibosHonorariosProps) {
  const loggedUser = currentUser || localStorage.getItem('rd_user_name') || 'Román & Delgado';

  // Detección de perfil Administrador / Jefatura (Solo administradores pueden anular recibos)
  const isAdminUser = useMemo(() => {
    if (isJefatura) return true;
    const storedUser = currentUser || localStorage.getItem('rd_user_name') || '';
    const storedAdmin = localStorage.getItem('rd_is_admin') === 'true';
    return checkIsJefatura(storedUser, storedAdmin) || checkIsSistemas(storedUser);
  }, [isJefatura, currentUser]);

  // Sub-pestaña activa
  const [subTab, setSubTab] = useState<'emitir' | 'historial' | 'contratos'>('emitir');

  // Estado de recibos
  const [recibos, setRecibos] = useState<ReciboCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [nextCorrelativo, setNextCorrelativo] = useState<string>(`RD-REC-${new Date().getFullYear()}-001`);
  const [correlativoLoaded, setCorrelativoLoaded] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Expedientes de la firma
  const [expedientesList, setExpedientesList] = useState<any[]>(() => {
    if (Array.isArray(globalExpedientes) && globalExpedientes.length > 0) {
      return globalExpedientes;
    }
    return [];
  });
  const [isCustomExpediente, setIsCustomExpediente] = useState(false);
  const [loadingBcv, setLoadingBcv] = useState(false);

  // Filtros de búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMoneda, setFilterMoneda] = useState<'todas' | 'USD' | 'VES'>('todas');
  const [filterTipo, setFilterTipo] = useState<'todos' | 'Honorarios Profesionales' | 'Provisión de Gastos'>('todos');

  // Paginación del Historial
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterMoneda, filterTipo]);

  // Formulario de emisión
  const [formData, setFormData] = useState({
    tipoRecibo: 'Honorarios Profesionales' as TipoReciboCliente,
    clienteNombre: '',
    clienteCedula: '',
    clienteTelefono: '',
    clienteEmail: '',
    expedienteRelacionado: '',
    concepto: '',
    monto: '',
    moneda: 'USD' as 'USD' | 'VES',
    tasaBcv: getInitialBcvRate(),
    metodoPago: 'Efectivo Divisas ($)' as MetodoPagoCliente,
    bancoDestino: '',
    referenciaPago: '',
    fecha: new Date().toISOString().split('T')[0],
    notasInternas: ''
  });

  // Alerta modal
  const [alert, setAlert] = useState<{
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

  // Estado para copiar plantillas y modos de visualización
  const [copiedContract, setCopiedContract] = useState(false);
  const [copiedGastos, setCopiedGastos] = useState(false);
  const [viewModeContract, setViewModeContract] = useState<'documento' | 'texto'>('documento');
  const [viewModeGastos, setViewModeGastos] = useState<'documento' | 'texto'>('documento');

  // Cargar datos al montar
  const loadRecibos = async (showErrorModal = false) => {
    setLoading(true);
    try {
      const res = await supabaseLoadHonorariosData();
      setRecibos(res.recibos);
      setNextCorrelativo(res.nextCorrelativo);
      if (res.cloudSynced) {
        setCorrelativoLoaded(true);
        setSyncError(null);
      } else {
        const msg = res.error || 'No se pudo sincronizar el correlativo con la base de datos.';
        setCorrelativoLoaded(false);
        setSyncError(msg);
        if (showErrorModal) {
          setAlert({
            isOpen: true,
            type: 'error',
            title: 'Error de Conexión con Base de Datos',
            message: msg,
          });
        }
      }
    } catch (e: any) {
      const msg = e?.message || 'Error al cargar recibos desde la base de datos.';
      console.error('Error al cargar recibos:', e);
      setCorrelativoLoaded(false);
      setSyncError(msg);
      if (showErrorModal) {
        setAlert({
          isOpen: true,
          type: 'error',
          title: 'Error al Cargar Recibos',
          message: msg,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Refrescar Tasa Oficial BCV en vivo (con timeout seguro para evitar bloqueos)
  const refreshLiveBcv = useCallback(async () => {
    setLoadingBcv(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data && data.promedio) {
          const rateStr = Number(data.promedio).toFixed(2);
          setFormData(prev => ({ ...prev, tasaBcv: rateStr }));
          try {
            localStorage.setItem('rd_bcv_usd', data.promedio.toString());
            localStorage.setItem('rd_live_bcv_rate', data.promedio.toString());
          } catch { }
        }
      }
    } catch {
      // Si hay timeout o error de red, conserva la tasa actual sin bloquear la UI
    } finally {
      clearTimeout(timer);
      setLoadingBcv(false);
    }
  }, []);

  useEffect(() => {
    loadRecibos();

    // Cargar expedientes si no fueron provistos en props
    if (!globalExpedientes || globalExpedientes.length === 0) {
      supabaseGetExpedientes().then(res => {
        if (res && res.expedientes && Array.isArray(res.expedientes)) {
          setExpedientesList(res.expedientes);
        }
      }).catch(err => {
        console.warn('Error cargando expedientes para recibos:', err);
      });
    } else {
      setExpedientesList(globalExpedientes);
    }

    // Refrescar tasa oficial BCV
    refreshLiveBcv();

    const handleBcvUpdate = (e: any) => {
      const rate = e.detail;
      if (rate && !isNaN(rate) && rate > 0) {
        setFormData(prev => ({ ...prev, tasaBcv: Number(rate).toFixed(2) }));
      }
    };
    window.addEventListener('rd_bcv_updated', handleBcvUpdate);
    return () => window.removeEventListener('rd_bcv_updated', handleBcvUpdate);
  }, [globalExpedientes, refreshLiveBcv]);

  // Selección inteligente de expediente desde la lista
  const handleSelectExpediente = (val: string) => {
    if (val === '__custom__') {
      setIsCustomExpediente(true);
      setFormData(prev => ({ ...prev, expedienteRelacionado: '' }));
      return;
    }
    setIsCustomExpediente(false);
    setFormData(prev => {
      const next = { ...prev, expedienteRelacionado: val };
      if (val) {
        const found = expedientesList.find(x => {
          const num = x.numeroExpediente || x.numero || '';
          const tit = x.partes || x.titulo || x.cliente || '';
          const label = num ? `${num} • ${tit}` : tit;
          return label === val || (num && val.startsWith(num));
        });
        if (found) {
          if (!prev.clienteNombre && found.cliente && found.cliente !== 'Román & Delgado') {
            next.clienteNombre = found.cliente;
          }
        }
      }
      return next;
    });
  };

  // Presets de conceptos rápidos
  const handleSelectPreset = (conceptoText: string) => {
    setFormData(prev => ({ ...prev, concepto: conceptoText }));
  };

  // Forma de pago en efectivo físico (divisas o bolívares)
  const isEfectivo = formData.metodoPago === 'Efectivo Divisas ($)' || formData.metodoPago === 'Efectivo Bolívares (Bs.)';

  // Guardar y emitir recibo
  const handleEmitirRecibo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clienteNombre.trim() || !formData.clienteCedula.trim() || !formData.monto) {
      setAlert({
        isOpen: true,
        type: 'warning',
        title: 'Campos Requeridos',
        message: 'Por favor ingresa el nombre del cliente, la cédula y el monto del recibo.'
      });
      return;
    }

    const montoNum = parseFloat(formData.monto.replace(',', '.'));
    if (isNaN(montoNum) || montoNum <= 0) {
      setAlert({
        isOpen: true,
        type: 'warning',
        title: 'Monto Inválido',
        message: 'Por favor ingresa un monto numérico mayor a cero.'
      });
      return;
    }

    setIsSaving(true);
    try {
      let correlativoParaEmitir = nextCorrelativo;
      if (!correlativoLoaded) {
        const syncCheck = await supabaseLoadHonorariosData();
        setRecibos(syncCheck.recibos);
        setNextCorrelativo(syncCheck.nextCorrelativo);
        if (!syncCheck.cloudSynced) {
          const errMsg = syncCheck.error || 'No se pudo verificar el correlativo oficial en la base de datos.';
          setSyncError(errMsg);
          setAlert({
            isOpen: true,
            type: 'error',
            title: 'Sin Conexión con Base de Datos',
            message: `No es posible emitir la factura sin confirmar el correlativo en la base de datos.\n\nDetalle: ${errMsg}`,
          });
          return;
        }
        setCorrelativoLoaded(true);
        setSyncError(null);
        correlativoParaEmitir = syncCheck.nextCorrelativo;
      }

      const now = new Date();
      const horaStr = now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true });
      const tasaNum = formData.tasaBcv ? parseFloat(formData.tasaBcv.replace(',', '.')) : undefined;

      const nuevoRecibo: ReciboCliente = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        numeroRecibo: correlativoParaEmitir,
        tipoRecibo: formData.tipoRecibo,
        clienteNombre: formData.clienteNombre.trim(),
        clienteCedula: formData.clienteCedula.trim().toUpperCase(),
        clienteTelefono: formData.clienteTelefono.trim() || undefined,
        clienteEmail: formData.clienteEmail.trim() || undefined,
        expedienteRelacionado: formData.expedienteRelacionado.trim() || undefined,
        concepto: formData.concepto.trim() || (formData.tipoRecibo === 'Honorarios Profesionales' ? 'Honorarios profesionales por asesoría y servicios jurídicos.' : 'Provisión para gastos de tramitación y aranceles judiciales.'),
        monto: montoNum,
        moneda: formData.moneda,
        tasaBcv: tasaNum,
        montoEquivalente: (formData.moneda === 'USD' && tasaNum) ? montoNum * tasaNum : undefined,
        metodoPago: formData.metodoPago,
        bancoDestino: isEfectivo ? undefined : (formData.bancoDestino.trim() || undefined),
        referenciaPago: isEfectivo ? undefined : (formData.referenciaPago.trim() || undefined),
        fecha: formData.fecha || now.toISOString().split('T')[0],
        hora: horaStr,
        abogadoReceptor: loggedUser,
        estado: 'Emitido',
        notasInternas: formData.notasInternas.trim() || undefined,
        created_at: now.toISOString()
      };

      // 1. Guardar factura y actualizar correlativo atómicamente en PostgreSQL
      const savedResult = await supabaseEmitirReciboCliente(nuevoRecibo);
      const savedRecibo = savedResult.recibo;

      setRecibos(prev => [
        savedRecibo,
        ...prev.filter(r => r.id !== savedRecibo.id && r.numeroRecibo !== savedRecibo.numeroRecibo)
      ]);
      setNextCorrelativo(savedResult.nextCorrelativo);
      setCorrelativoLoaded(true);
      setSyncError(null);

      // 2. Reiniciar formulario solo tras confirmar guardado en BD
      setFormData({
        tipoRecibo: 'Honorarios Profesionales',
        clienteNombre: '',
        clienteCedula: '',
        clienteTelefono: '',
        clienteEmail: '',
        expedienteRelacionado: '',
        concepto: '',
        monto: '',
        moneda: 'USD',
        tasaBcv: formData.tasaBcv || getInitialBcvRate(),
        metodoPago: 'Efectivo Divisas ($)',
        bancoDestino: '',
        referenciaPago: '',
        fecha: new Date().toISOString().split('T')[0],
        notasInternas: ''
      });
      setIsCustomExpediente(false);

      // 3. Mostrar alerta de éxito confirmada
      const reasignadoMsg = savedRecibo.numeroRecibo !== correlativoParaEmitir
        ? `\n\nNota: El correlativo fue ajustado automáticamente a ${savedRecibo.numeroRecibo} para evitar duplicados.`
        : '';
      setAlert({
        isOpen: true,
        type: 'success',
        title: '¡Recibo Emitido con Éxito!',
        message: `Se guardó en la base de datos el recibo ${savedRecibo.numeroRecibo} por ${savedRecibo.moneda === 'USD' ? `$${savedRecibo.monto}` : `Bs. ${savedRecibo.monto}`}. El PDF oficial se descargó automáticamente.${reasignadoMsg}`
      });

      // 4. Generar y descargar el PDF con el número correlativo definitivo confirmado por Postgres
      exportarReciboClientePDF(savedRecibo).catch(pdfErr => {
        console.warn('Descarga de PDF diferida:', pdfErr);
      });

    } catch (err: any) {
      const errMsg = err?.message || 'Error desconocido al guardar en la base de datos.';
      console.error('Error emitiendo recibo de honorarios:', err);
      setSyncError(errMsg);
      setAlert({
        isOpen: true,
        type: 'error',
        title: 'Error al Emitir Recibo',
        message: `No se pudo guardar la factura ni el correlativo en la base de datos.\n\nDetalle: ${errMsg}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Anular recibo (Estrictamente restringido a Administradores y Jefatura)
  const handleAnular = (recibo: ReciboCliente) => {
    if (!isAdminUser) {
      setAlert({
        isOpen: true,
        type: 'error',
        title: 'Acceso Restringido',
        message: 'Solo el personal de Jefatura y Administradores (Víctor Román, Luis Delgado u Óscar) tienen autorización para anular o eliminar recibos oficiales del bufete.'
      });
      return;
    }

    setAlert({
      isOpen: true,
      type: 'warning',
      title: '¿Anular Recibo?',
      message: `¿Estás seguro de que deseas anular el recibo ${recibo.numeroRecibo} de ${recibo.clienteNombre}? Esta acción eliminará el registro contable de forma definitiva.`,
      showCancel: true,
      onConfirm: async () => {
        try {
          await supabaseDeleteReciboCliente(recibo.id, recibo.numeroRecibo, recibo.cloudId);
          setRecibos(prev => prev.filter(r => r.id !== recibo.id && r.numeroRecibo !== recibo.numeroRecibo));
          setAlert({
            isOpen: true,
            type: 'info',
            title: 'Recibo Anulado',
            message: `El recibo ${recibo.numeroRecibo} ha sido eliminado del sistema contable.`
          });
        } catch (err: any) {
          setAlert({
            isOpen: true,
            type: 'error',
            title: 'Error al Anular Recibo',
            message: `No se pudo eliminar el recibo en la base de datos.\n\nDetalle: ${err?.message || 'Error desconocido'}`
          });
        }
      }
    });
  };

  // Compartir resumen por WhatsApp
  const handleShareWhatsApp = (recibo: ReciboCliente) => {
    const montoTxt = recibo.moneda === 'USD' ? `$${recibo.monto}` : `Bs. ${recibo.monto}`;
    const text = `*COMPROBANTE DE PAGO — ROMÁN & DELGADO*\n` +
      `*Recibo Nº:* ${recibo.numeroRecibo}\n` +
      `*Cliente:* ${recibo.clienteNombre} (${recibo.clienteCedula})\n` +
      `*Tipo:* ${recibo.tipoRecibo}\n` +
      `*Monto Recibido:* ${montoTxt}\n` +
      `*Forma de Pago:* ${recibo.metodoPago}${recibo.referenciaPago ? ` (Ref: ${recibo.referenciaPago})` : ''}\n` +
      `*Concepto:* ${recibo.concepto}\n` +
      `*Fecha:* ${recibo.fecha}\n` +
      `*Atendido por:* ${recibo.abogadoReceptor}\n\n` +
      `_Román & Delgado — Escritorio Jurídico Oficial_`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Copiar plantilla de contrato
  const handleCopyTemplate = (text: string, isContract: boolean) => {
    navigator.clipboard.writeText(text);
    if (isContract) {
      setCopiedContract(true);
      setTimeout(() => setCopiedContract(false), 2000);
    } else {
      setCopiedGastos(true);
      setTimeout(() => setCopiedGastos(false), 2000);
    }
  };

  // Filtrado de recibos para historial (ordenados de la fecha más reciente a la más vieja)
  const filteredRecibos = useMemo(() => {
    return recibos
      .filter(r => {
        // Filtro por moneda
        if (filterMoneda !== 'todas' && r.moneda !== filterMoneda) return false;
        // Filtro por tipo
        if (filterTipo !== 'todos' && r.tipoRecibo !== filterTipo) return false;
        // Filtro por texto
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = (r.clienteNombre || '').toLowerCase().includes(q);
          const matchCed = (r.clienteCedula || '').toLowerCase().includes(q);
          const matchNum = (r.numeroRecibo || '').toLowerCase().includes(q);
          const matchConcepto = (r.concepto || '').toLowerCase().includes(q);
          return matchName || matchCed || matchNum || matchConcepto;
        }
        return true;
      })
      .sort(sortHistoryDesc);
  }, [filterMoneda, filterTipo, recibos, searchQuery]);

  // Paginación calculada del historial
  const totalPages = Math.max(1, Math.ceil(filteredRecibos.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredRecibos.length);
  const paginatedRecibos = itemsPerPage >= 9999 ? filteredRecibos : filteredRecibos.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    const valid = Math.max(1, Math.min(totalPages, page));
    setCurrentPage(valid);
    const el = document.getElementById('historial-recibos-card');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Resumen de totales
  const totals = useMemo(() => {
    let usd = 0;
    let ves = 0;
    let honorariosCount = 0;
    let gastosCount = 0;

    recibos.forEach(r => {
      if (r.moneda === 'USD') usd += r.monto;
      else ves += r.monto;

      if (r.tipoRecibo === 'Honorarios Profesionales') honorariosCount++;
      else gastosCount++;
    });

    return {
      totalUsd: usd,
      totalVes: ves,
      count: recibos.length,
      honorariosCount,
      gastosCount
    };
  }, [recibos]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">

      {/* HEADER EJECUTIVO DE FACTURACIÓN & RECIBOS */}
      <div className="bg-white rounded-3xl p-6 lg:p-7 shadow-md shadow-blue-950/8 border border-blue-200 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-5 border-b border-blue-100">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100/80 text-[#1e3a8a] border border-blue-200">
                <Receipt className="w-3.5 h-3.5 text-blue-700" />
                <span>Román &amp; Delgado &bull; Facturación</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold">
                Sistema KANT
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#172554] to-[#1d4ed8] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-900/20">
                <Receipt className="w-6 h-6" />
              </span>
              <span>Recibos de Honorarios &amp; Clientes</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 max-w-2xl leading-relaxed">
              Emisión de comprobantes oficiales con correlativo automático, talón dual en PDF y modelos contractuales del despacho.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center shrink-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50/70 border border-indigo-200/80 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Correlativo:</span>
              <span className="text-xs sm:text-sm font-black text-indigo-950 font-mono">{nextCorrelativo}</span>
            </div>

            <button
              type="button"
              onClick={() => loadRecibos(true)}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-200 font-bold text-xs flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
              title="Sincronizar recibos con la nube"
            >
              <RefreshCw className={`w-4 h-4 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* NAVEGACIÓN PRINCIPAL DE PESTAÑAS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5">
          <div className="flex items-center gap-1.5 p-1.5 bg-blue-100/85 rounded-2xl border border-blue-200 overflow-x-auto scrollbar-none flex-nowrap shadow-2xs">
            <button
              type="button"
              onClick={() => setSubTab('emitir')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 ${subTab === 'emitir'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Emitir Recibo</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('historial')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 ${subTab === 'historial'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm font-black'
                : 'text-slate-600 hover:text-blue-700 hover:bg-white/80'
                }`}
            >
              <Receipt className="w-4 h-4 shrink-0" />
              <span>Historial ({recibos.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('contratos')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 ${subTab === 'contratos'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Contratos &amp; Modelos</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Emisor activo: <strong className="text-slate-800">{loggedUser}</strong></span>
          </div>
        </div>
      </div>

      {/* ALERTA DE ERROR DE SINCRONIZACIÓN CON BASE DE DATOS */}
      {syncError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-900 shadow-2xs">
          <div className="space-y-0.5">
            <p className="font-black text-rose-800 uppercase tracking-wider text-[11px]">
              Error de Base de Datos (Honorarios)
            </p>
            <p className="font-medium text-rose-700 break-words">{syncError}</p>
          </div>
          <button
            type="button"
            onClick={() => loadRecibos(true)}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 cursor-pointer transition-all"
          >
            Reintentar Conexión
          </button>
        </div>
      )}

      {/* MÉTRICAS RÁPIDAS DE FACTURACIÓN (4 TARJETAS KPI EJECUTIVAS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block truncate">Total Recaudado ($)</span>
            <p className="text-lg sm:text-2xl font-black text-slate-900 tabular-nums truncate mt-0.5">
              $ {totals.totalUsd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-emerald-700 font-semibold block truncate">Divisas USD / Zelle</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-700 flex items-center justify-center shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block truncate">Total en Bolívares</span>
            <p className="text-lg sm:text-2xl font-black text-slate-900 tabular-nums truncate mt-0.5">
              Bs. {totals.totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-blue-700 font-semibold block truncate">Pago Móvil &amp; Transf.</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block truncate">Recibos Emitidos</span>
            <p className="text-lg sm:text-2xl font-black text-slate-900 tabular-nums truncate mt-0.5">
              {totals.count}
            </p>
            <span className="text-[10px] text-slate-500 font-medium block truncate">
              {totals.honorariosCount} honorarios &bull; {totals.gastosCount} gastos
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block truncate">Siguiente Correlativo</span>
            <p className="text-sm sm:text-lg font-black text-indigo-900 tracking-tight font-mono whitespace-nowrap truncate mt-0.5">
              {nextCorrelativo}
            </p>
            <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              Secuencia oficial activa
            </span>
          </div>
        </div>
      </div>

      {/* PESTAÑA 1: ESTUDIO DE EMISIÓN DE RECIBO (FORMULARIO + VISTA PREVIA EN VIVO) */}
      {subTab === 'emitir' && (() => {
        const parsedMonto = parseFloat((formData.monto || '').replace(',', '.'));
        const parsedTasa = parseFloat((formData.tasaBcv || '').replace(',', '.'));
        const validMonto = !isNaN(parsedMonto) && parsedMonto > 0 ? parsedMonto : 0;
        const validTasa = !isNaN(parsedTasa) && parsedTasa > 0 ? parsedTasa : 0;
        const equivBs = formData.moneda === 'USD' && validMonto > 0 && validTasa > 0 ? validMonto * validTasa : 0;

        return (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* COLUMNA IZQUIERDA: FORMULARIO ESTRUCTURADO */}
            <div className="xl:col-span-8 bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-5 border-b border-slate-100">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2.5">
                    <Receipt className="w-5 h-5 text-blue-600 shrink-0" />
                    <span>Emitir Nuevo Recibo Oficial</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Completa los datos del cliente y del pago. El correlativo es automático y se descargará el PDF en dos talones.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200/80 px-3.5 py-2 rounded-xl whitespace-nowrap shrink-0">
                  <Hash className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Nº Asignado:</span>
                  <span className="text-xs sm:text-sm font-black text-indigo-950 font-mono">{nextCorrelativo}</span>
                </div>
              </div>

              <form id="form-emitir-recibo" onSubmit={handleEmitirRecibo} className="space-y-6">

                {/* SELECTOR DE TIPO DE RECIBO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tipoRecibo: 'Honorarios Profesionales' }))}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3.5 active:scale-95 ${formData.tipoRecibo === 'Honorarios Profesionales'
                      ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-white'
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${formData.tipoRecibo === 'Honorarios Profesionales' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
                      }`}>
                      <Scale className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider truncate">Honorarios Profesionales</h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-2 sm:line-clamp-none">Asesorías, consultas, redacción de documentos y juicios.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tipoRecibo: 'Provisión de Gastos' }))}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3.5 active:scale-95 ${formData.tipoRecibo === 'Provisión de Gastos'
                      ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-white'
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${formData.tipoRecibo === 'Provisión de Gastos' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
                      }`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider truncate">Provisión de Gastos</h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-2 sm:line-clamp-none">Aranceles de tribunal, notaría, timbres fiscales y copias.</p>
                    </div>
                  </button>
                </div>

                {/* SECCIÓN 1: DATOS DEL CLIENTE */}
                <div className="bg-slate-50/70 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </span>
                    <span>1. Datos del Cliente y Asunto Legal</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Nombre Completo del Cliente *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Aquiles Pérez / Inversiones Los Llanos C.A."
                        value={formData.clienteNombre}
                        onChange={(e) => setFormData(prev => ({ ...prev, clienteNombre: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Cédula o RIF *</label>
                      <input
                        type="text"
                        required
                        placeholder="V-14566378 / J-40182938-1"
                        value={formData.clienteCedula}
                        onChange={(e) => {
                          const formatted = formatCedulaRifInput(e.target.value, formData.clienteCedula);
                          setFormData(prev => ({ ...prev, clienteCedula: formatted }));
                        }}
                        className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Teléfono / WhatsApp</label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="0414-1234567"
                          value={formData.clienteTelefono}
                          onChange={(e) => {
                            const formatted = formatTelefonoInput(e.target.value, formData.clienteTelefono);
                            setFormData(prev => ({ ...prev, clienteTelefono: formatted }));
                          }}
                          className="w-full pl-9 pr-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-0.5">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          Expediente o Caso Relacionado (Opcional)
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsCustomExpediente(!isCustomExpediente)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                        >
                          {isCustomExpediente ? 'Ver lista de expedientes' : 'Escribir manualmente'}
                        </button>
                      </div>

                      {isCustomExpediente ? (
                        <input
                          type="text"
                          placeholder="Ej: RD-J-2026-004 • Divorcio 148-A"
                          value={formData.expedienteRelacionado}
                          onChange={(e) => setFormData(prev => ({ ...prev, expedienteRelacionado: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-blue-300 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      ) : (
                        <select
                          value={formData.expedienteRelacionado}
                          onChange={(e) => handleSelectExpediente(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                        >
                          <option value="">-- Seleccionar de la lista ({expedientesList.length} disponibles) --</option>
                          {expedientesList.map((exp: any, idx: number) => {
                            const num = exp.numeroExpediente || exp.numero || `EXP-${idx + 1}`;
                            const tit = exp.partes || exp.titulo || exp.cliente || 'Sin título';
                            const cliente = exp.cliente ? ` (${exp.cliente})` : '';
                            const fullVal = `${num} • ${tit}`;
                            return (
                              <option key={exp.id || idx} value={fullVal}>
                                {num} - {tit.slice(0, 45)}{tit.length > 45 ? '...' : ''}{cliente}
                              </option>
                            );
                          })}
                          <option value="__custom__">Escribir otro expediente manualmente...</option>
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Correo Electrónico (Opcional)</label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="email"
                          placeholder="cliente@correo.com"
                          value={formData.clienteEmail}
                          onChange={(e) => setFormData(prev => ({ ...prev, clienteEmail: e.target.value }))}
                          className="w-full pl-9 pr-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECCIÓN 2: DETALLES ECONÓMICOS Y FORMA DE PAGO */}
                <div className="bg-slate-50/70 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <DollarSign className="w-3.5 h-3.5" />
                    </span>
                    <span>2. Monto y Forma de Pago</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Moneda *</label>
                      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/70 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => {
                            const currentMetodo = prev.metodoPago as string;
                            const newMetodo: MetodoPagoCliente = currentMetodo === 'Pago Móvil' || currentMetodo === 'Efectivo Bolívares (Bs.)' ? 'Efectivo Divisas ($)' : prev.metodoPago;
                            const isCash = newMetodo === 'Efectivo Divisas ($)' || newMetodo === 'Efectivo Bolívares (Bs.)';
                            return {
                              ...prev,
                              moneda: 'USD',
                              metodoPago: newMetodo,
                              ...(isCash ? { bancoDestino: '', referenciaPago: '' } : {})
                            };
                          })}
                          className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${formData.moneda === 'USD'
                            ? 'bg-emerald-600 text-white shadow-xs font-black'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            }`}
                        >
                          <DollarSign className="w-3.5 h-3.5 shrink-0" />
                          <span>USD</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => {
                            const currentMetodo = prev.metodoPago as string;
                            const newMetodo: MetodoPagoCliente = currentMetodo === 'Efectivo Divisas ($)' || currentMetodo === 'Zelle' ? 'Pago Móvil' : prev.metodoPago;
                            const isCash = newMetodo === 'Efectivo Divisas ($)' || newMetodo === 'Efectivo Bolívares (Bs.)';
                            return {
                              ...prev,
                              moneda: 'VES',
                              metodoPago: newMetodo,
                              ...(isCash ? { bancoDestino: '', referenciaPago: '' } : {})
                            };
                          })}
                          className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${formData.moneda === 'VES'
                            ? 'bg-blue-600 text-white shadow-xs font-black'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            }`}
                        >
                          <Coins className="w-3.5 h-3.5 shrink-0" />
                          <span>Bs.</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Monto Recibido *</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">
                          {formData.moneda === 'USD' ? '$' : 'Bs.'}
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="100.00"
                          value={formData.monto}
                          onChange={(e) => setFormData(prev => ({ ...prev, monto: e.target.value }))}
                          className="w-full pl-9 pr-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-black text-slate-900 tabular-nums outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Forma de Pago *</label>
                      <select
                        value={formData.metodoPago}
                        onChange={(e) => {
                          const newMetodo = e.target.value as MetodoPagoCliente;
                          const isCash = newMetodo === 'Efectivo Divisas ($)' || newMetodo === 'Efectivo Bolívares (Bs.)';
                          setFormData(prev => ({
                            ...prev,
                            metodoPago: newMetodo,
                            ...(isCash ? { bancoDestino: '', referenciaPago: '' } : {})
                          }));
                        }}
                        className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                      >
                        {formData.moneda === 'USD' ? (
                          <>
                            <option value="Efectivo Divisas ($)">Efectivo Divisas ($)</option>
                            <option value="Zelle">Zelle</option>
                            <option value="Transferencia Bancaria">Transferencia Internacional</option>
                            <option value="Otro">Otro medio en divisas</option>
                          </>
                        ) : (
                          <>
                            <option value="Pago Móvil">Pago Móvil</option>
                            <option value="Transferencia Bancaria">Transferencia Bancaria (Bs.)</option>
                            <option value="Efectivo Bolívares (Bs.)">Efectivo Bolívares (Bs.)</option>
                            <option value="Otro">Otro medio en Bs.</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Fecha del Recibo *</label>
                      <input
                        type="date"
                        required
                        value={formData.fecha}
                        onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Fila extra: Banco y Referencia bancaria */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-0.5">
                    {isEfectivo ? (
                      <div className={`col-span-1 ${formData.moneda === 'USD' ? 'sm:col-span-2' : 'sm:col-span-2 lg:col-span-3'} p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center gap-3 text-xs text-emerald-950 shadow-2xs`}>
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-700">
                          <Banknote className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-emerald-950 flex items-center gap-2 flex-wrap">
                            <span>Pago en Efectivo Físico</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-200/80 text-emerald-900 uppercase tracking-wide">
                              {formData.moneda === 'USD' ? 'Divisas ($)' : 'Bolívares (Bs.)'}
                            </span>
                          </p>
                          <p className="text-[11px] text-emerald-800/90 mt-0.5 font-medium">
                            Recepción directa en efectivo. No requiere banco ni referencia bancaria.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Banco / Cuenta de Destino</label>
                          <div className="relative">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              placeholder="Banesco / Banco de Venezuela / Zelle"
                              value={formData.bancoDestino}
                              onChange={(e) => setFormData(prev => ({ ...prev, bancoDestino: e.target.value }))}
                              className="w-full pl-9 pr-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Nº Referencia / Comprobante</label>
                          <input
                            type="text"
                            placeholder="Ref. 00892839 / Comprobante Zelle"
                            value={formData.referenciaPago}
                            onChange={(e) => setFormData(prev => ({ ...prev, referenciaPago: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                          />
                        </div>
                      </>
                    )}

                    {formData.moneda === 'USD' && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold text-slate-700 block">
                            Tasa Oficial BCV
                          </label>
                          <button
                            type="button"
                            onClick={refreshLiveBcv}
                            disabled={loadingBcv}
                            title="Actualizar tasa oficial BCV en vivo"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                          >
                            <RefreshCw className={`w-3 h-3 ${loadingBcv ? 'animate-spin' : ''}`} />
                            {loadingBcv ? 'Actualizando...' : 'Actualizar BCV'}
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="887.30"
                          value={formData.tasaBcv}
                          onChange={(e) => setFormData(prev => ({ ...prev, tasaBcv: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-900 font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                        {equivBs > 0 && (
                          <span className="text-[11px] text-emerald-700 font-bold block mt-1.5">
                            Equivalente: Bs. {equivBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* SECCIÓN 3: CONCEPTO DETALLADO Y SUGERENCIAS RÁPIDAS */}
                <div className="bg-slate-50/70 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </span>
                      <span>3. Concepto Detallado del Pago</span>
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">Se imprimirá textualmente en el recibo</span>
                  </div>

                  {/* Botones de sugerencias rápidas */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                      <Lightbulb className="w-3.5 h-3.5 text-blue-600" /> Sugerencias:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('Abono a honorarios profesionales por redacción de documento y trámites legales.')}
                      className="px-3 py-1.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-2xs"
                    >
                      Abono Redacción
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('Pago de honorarios profesionales por consulta legal personalizada y estudio de expediente.')}
                      className="px-3 py-1.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-2xs"
                    >
                      Consulta Legal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('Provisión de fondos para aranceles judiciales, timbres fiscales y copias certificadas en tribunal.')}
                      className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-2xs"
                    >
                      Gastos Tribunal / Copias
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Describe detalladamente el concepto de los honorarios o gastos recibidos..."
                    value={formData.concepto}
                    onChange={(e) => setFormData(prev => ({ ...prev, concepto: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all leading-relaxed"
                  />
                </div>

                {/* BOTÓN DE ACCIÓN FINAL (VISIBLE EN FORMULARIO) */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Atendido por: <strong className="text-slate-800">{loggedUser}</strong></span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving || (loading && !correlativoLoaded)}
                    className="w-full sm:w-auto px-7 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2.5"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                        <span>Emitiendo y Descargando PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 shrink-0" />
                        <span>Emitir Recibo Oficial y Descargar PDF</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>

            {/* COLUMNA DERECHA: VISTA PREVIA EN VIVO DEL COMPROBANTE */}
            <div className="xl:col-span-4 xl:sticky xl:top-6">
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
                {/* Encabezado del talón preliminar */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-4 text-white flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300 block">
                      Vista Previa en Vivo
                    </span>
                    <h4 className="text-sm font-black tracking-tight truncate">Román &amp; Delgado</h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-200 font-mono text-xs font-bold whitespace-nowrap shrink-0">
                    {nextCorrelativo}
                  </span>
                </div>

                {/* Cuerpo visual del recibo */}
                <div className="p-5 space-y-4">
                  {/* Tipo y Fecha */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${formData.tipoRecibo === 'Honorarios Profesionales'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                      {formData.tipoRecibo}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formData.fecha}
                    </span>
                  </div>

                  {/* Caja de Monto Principal */}
                  <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 text-center space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Monto a Recibir
                    </span>
                    <p className="text-3xl font-black text-slate-900 tabular-nums tracking-tight">
                      {formData.moneda === 'USD'
                        ? `$ ${validMonto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `Bs. ${validMonto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      }
                    </p>
                    {equivBs > 0 && (
                      <span className="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                        Equiv: Bs. {equivBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>

                  {/* Resumen de Datos */}
                  <div className="space-y-2.5 text-xs divide-y divide-slate-100">
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-slate-500 font-medium">Cliente:</span>
                      <span className="font-bold text-slate-900 text-right truncate max-w-[180px]">
                        {formData.clienteNombre.trim() || 'Por definir'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2.5">
                      <span className="text-slate-500 font-medium">Cédula / RIF:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {formData.clienteCedula.trim() || 'V-00000000'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2.5">
                      <span className="text-slate-500 font-medium">Método de Pago:</span>
                      <span className="font-bold text-slate-800 text-right">
                        {formData.metodoPago}
                      </span>
                    </div>

                    {!isEfectivo && formData.referenciaPago && (
                      <div className="flex items-center justify-between gap-2 pt-2.5">
                        <span className="text-slate-500 font-medium">Referencia:</span>
                        <span className="font-mono font-bold text-blue-700 truncate max-w-[160px]">
                          {formData.referenciaPago}
                        </span>
                      </div>
                    )}

                    {formData.expedienteRelacionado && (
                      <div className="flex items-center justify-between gap-2 pt-2.5">
                        <span className="text-slate-500 font-medium shrink-0">Expediente:</span>
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px] truncate max-w-[170px]">
                          {formData.expedienteRelacionado}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Concepto preliminar */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Concepto en Comprobante:
                    </span>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed line-clamp-3 italic">
                      "{formData.concepto.trim() || (formData.tipoRecibo === 'Honorarios Profesionales' ? 'Honorarios profesionales por asesoría y servicios jurídicos.' : 'Provisión para gastos de tramitación y aranceles judiciales.')}"
                    </p>
                  </div>

                  {/* Sello inferior */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>PDF Dual (Original + Copia)</span>
                    </span>
                    <span className="font-semibold text-slate-400">Listo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* PESTAÑA 2: HISTORIAL DE RECIBOS EMITIDOS */}
      {subTab === 'historial' && (
        <div id="historial-recibos-card" className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-2xs space-y-5 scroll-mt-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-5 border-b border-slate-100">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-blue-600 shrink-0" />
                <span>Historial de Recibos Emitidos</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Registro oficial con búsqueda por cliente, cédula, expediente o número correlativo.
              </p>
            </div>

            {/* Buscador y Filtros Responsive */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar cliente, cédula o Nº..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:flex items-center gap-2">
                <select
                  value={filterMoneda}
                  onChange={(e) => setFilterMoneda(e.target.value as any)}
                  className="w-full sm:w-auto px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="todas">Moneda: Todas</option>
                  <option value="USD">Solo Dólares ($)</option>
                  <option value="VES">Solo Bolívares (Bs.)</option>
                </select>

                <select
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value as any)}
                  className="w-full sm:w-auto px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="todos">Tipo: Todos</option>
                  <option value="Honorarios Profesionales">Honorarios</option>
                  <option value="Provisión de Gastos">Gastos</option>
                </select>
              </div>

              {(searchQuery || filterMoneda !== 'todas' || filterTipo !== 'todos') && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setFilterMoneda('todas'); setFilterTipo('todos'); }}
                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  title="Restablecer filtros"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpiar</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => loadRecibos(true)}
                title="Actualizar lista"
                className="p-2.5 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-xl border border-slate-200 transition-colors cursor-pointer self-end sm:self-auto"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>
          </div>

          {filteredRecibos.length === 0 ? (
            <div className="py-14 text-center text-slate-500 space-y-3 bg-slate-50/70 rounded-2xl border border-slate-200/70">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mx-auto text-blue-600 shadow-2xs border border-slate-200">
                <Receipt className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">No se encontraron recibos emitidos</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery || filterMoneda !== 'todas' || filterTipo !== 'todos'
                  ? 'Prueba modificando tus criterios de búsqueda o restableciendo los filtros.'
                  : 'Aún no se han emitido recibos registrados en la plataforma.'}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedRecibos.map((recibo) => {
                  const isUSD = recibo.moneda === 'USD';
                  return (
                    <div
                      key={recibo.id}
                      className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 hover:border-blue-300 bg-white hover:shadow-sm transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs"
                    >
                      <div className="flex items-start gap-3.5 min-w-0 w-full md:w-auto">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border ${isUSD
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                          {isUSD ? '$' : 'Bs'}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg whitespace-nowrap">
                              {recibo.numeroRecibo}
                            </span>
                            <span className="text-sm font-black text-slate-900 truncate">
                              {recibo.clienteNombre}
                            </span>
                            <span className="text-xs text-slate-500 font-mono font-semibold">
                              ({recibo.clienteCedula})
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${recibo.tipoRecibo === 'Honorarios Profesionales'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                              {recibo.tipoRecibo}
                            </span>
                            {recibo.expedienteRelacionado && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                <Briefcase className="w-3 h-3 text-slate-500" />
                                <span className="truncate max-w-[160px]">{recibo.expedienteRelacionado}</span>
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-700 line-clamp-2 sm:line-clamp-1 font-medium">
                            {recibo.concepto}
                          </p>

                          <div className="flex items-center gap-2.5 text-[11px] text-slate-500 font-medium flex-wrap">
                            <span>Fecha: <strong className="text-slate-700">{recibo.fecha}</strong></span>
                            <span>&bull;</span>
                            <span>Método: <strong className="text-slate-700">{recibo.metodoPago}</strong></span>
                            {recibo.referenciaPago && (
                              <>
                                <span>&bull;</span>
                                <span className="truncate max-w-[150px]">Ref: <strong className="text-slate-700 font-mono">{recibo.referenciaPago}</strong></span>
                              </>
                            )}
                            <span>&bull;</span>
                            <span>Atendido por: <strong className="text-slate-700">{recibo.abogadoReceptor}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <div className="text-left md:text-right">
                          <span className="text-lg font-black text-slate-900 tabular-nums block">
                            {isUSD
                              ? `$ ${recibo.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                              : `Bs. ${recibo.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}
                          </span>
                          {recibo.montoEquivalente && isUSD && (
                            <span className="text-[11px] text-emerald-700 font-semibold block">
                              Equiv: Bs. {recibo.montoEquivalente.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => exportarReciboClientePDF(recibo)}
                            title="Descargar PDF Oficial"
                            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-blue-600/20 active:scale-95"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(recibo)}
                            title="Compartir por WhatsApp"
                            className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200/70 transition-all cursor-pointer active:scale-95"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {isAdminUser && (
                            <button
                              type="button"
                              onClick={() => handleAnular(recibo)}
                              title="Anular / Eliminar recibo (Solo Administradores)"
                              className="p-2.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/70 transition-all cursor-pointer active:scale-95"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* BARRA DE PAGINACIÓN DEL HISTORIAL */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
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
                      <option value={5}>5 recibos</option>
                      <option value={10}>10 recibos</option>
                      <option value={20}>20 recibos</option>
                      <option value={9999}>Ver todos ({filteredRecibos.length})</option>
                    </select>
                  </div>
                  <span className="text-slate-300">|</span>
                  <span className="font-medium text-slate-600">
                    Mostrando <strong className="text-slate-900">{filteredRecibos.length === 0 ? 0 : startIndex + 1}</strong> a <strong className="text-slate-900">{endIndex}</strong> de <strong className="text-blue-600">{filteredRecibos.length}</strong> recibos
                  </span>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    <button
                      type="button"
                      onClick={() => handlePageChange(1)}
                      disabled={safeCurrentPage === 1}
                      title="Primera página"
                      className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePageChange(safeCurrentPage - 1)}
                      disabled={safeCurrentPage === 1}
                      title="Página anterior"
                      className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
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
                            {showEllipsis && <span className="px-1 text-slate-400 text-xs font-bold">...</span>}
                            <button
                              type="button"
                              onClick={() => handlePageChange(page)}
                              className={`w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center ${safeCurrentPage === page
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                                : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}

                    <button
                      type="button"
                      onClick={() => handlePageChange(safeCurrentPage + 1)}
                      disabled={safeCurrentPage === totalPages}
                      title="Página siguiente"
                      className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="hidden sm:inline">Siguiente</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePageChange(totalPages)}
                      disabled={safeCurrentPage === totalPages}
                      title="Última página"
                      className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* PESTAÑA 3: MODELOS DE CONTRATOS Y ANEXOS DE GASTOS */}
      {subTab === 'contratos' && (
        <div className="space-y-6">
          {/* Banner de bienvenida y directrices de la sección */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-sm shadow-indigo-600/20 shrink-0">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Modelos Jurídicos Institucionales
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Documentos oficiales listos conforme a la Ley de Abogados y el Código de Ética de Venezuela.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Papel Membretado Oficial
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200/80 text-xs font-bold text-blue-700 shadow-2xs">
                <FileDown className="w-3.5 h-3.5 text-blue-600" />
                Descarga en Word (.doc)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* FORMATO 1: CONTRATO DE PRESTACIÓN DE SERVICIOS */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                {/* Header de la tarjeta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0 border border-blue-200">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Contrato de Prestación de Servicios</h4>
                      <span className="text-[11px] text-slate-500 font-medium">Modelo oficial para causas legales y clientes</span>
                    </div>
                  </div>

                  {/* Acciones: Alternar vista, Descargar Word y Copiar */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setViewModeContract(prev => prev === 'documento' ? 'texto' : 'documento')}
                      title="Alternar entre vista de documento membretado o texto plano"
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      {viewModeContract === 'documento' ? <FileText className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{viewModeContract === 'documento' ? 'Ver Texto' : 'Ver Hoja'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadDocFile(
                        'Contrato_Servicios_Profesionales_Roman_y_Delgado.doc',
                        'Contrato de Servicios Profesionales - Román & Delgado',
                        CONTRATO_HTML
                      )}
                      title="Descargar editable en Microsoft Word (.doc)"
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200/70 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <FileDown className="w-3.5 h-3.5 shrink-0" />
                      <span>Word (.doc)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyTemplate(CONTRATO_TEMPLATE, true)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-blue-600/20 active:scale-95"
                    >
                      {copiedContract ? <Check className="w-3.5 h-3.5 text-white shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                      <span>{copiedContract ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                {/* VISTA HOJA MEMBRETADA (DEFAULT) vs VISTA TEXTO PLANO */}
                {viewModeContract === 'documento' ? (
                  <div className="bg-slate-100/70 p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-inner">
                    <div className="bg-white rounded-xl p-5 sm:p-7 shadow-2xs border border-slate-200/80 max-h-96 sm:max-h-[460px] overflow-y-auto space-y-4 text-xs sm:text-[12.5px] leading-relaxed text-slate-800 font-sans">

                      {/* Membrete Oficial */}
                      <div className="text-center pb-3 border-b-2 border-blue-600/30 space-y-0.5">
                        <div className="flex items-center justify-center gap-2 text-slate-900 font-serif font-black tracking-widest text-sm sm:text-base uppercase">
                          <Scale className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>ROMÁN &amp; DELGADO</span>
                        </div>
                        <p className="text-[10px] tracking-wider uppercase font-bold text-blue-700">
                          Escritorio Jurídico &amp; Asesoría Corporativa
                        </p>
                        <p className="text-[9px] text-slate-400">
                          Valencia, Estado Carabobo &bull; RIF: J-40892839-1 &bull; Inpreabogado: 184.290 / 201.442
                        </p>
                      </div>

                      {/* Título Oficial */}
                      <h5 className="text-center font-black text-slate-900 text-xs sm:text-sm tracking-wide uppercase pt-1">
                        CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES LEGALES
                      </h5>

                      {/* Preámbulo */}
                      <p className="text-justify text-slate-700">
                        Entre la firma jurídica <strong>ROMÁN &amp; DELGADO</strong>, domiciliada en Valencia, Estado Carabobo, representada en este acto por los abogados en ejercicio <strong>VÍCTOR ROMÁN</strong> y <strong>LUIS DELGADO</strong>, en lo sucesivo denominados <strong>«LOS ABOGADOS»</strong>, por una parte; y por la otra el ciudadano(a):
                      </p>

                      {/* Tarjeta de Datos del Cliente */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/90 space-y-1.5 text-[11.5px]">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-bold text-slate-700">Nombre Completo:</span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-blue-900 font-semibold">[Nombre del Cliente]</span>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-bold text-slate-700">Cédula / RIF:</span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-blue-900 font-semibold">[V-__________]</span>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-bold text-slate-700">Domicilio:</span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-blue-900 font-semibold">[Dirección de habitación o mercantil]</span>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-bold text-slate-700">Teléfono / Correo:</span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-blue-900 font-semibold">[Teléfono y correo electrónico]</span>
                        </div>
                      </div>

                      <p className="text-justify text-slate-700">
                        En lo sucesivo denominado <strong>«EL CLIENTE»</strong>, se ha convenido celebrar el presente Contrato de Servicios Profesionales sujeto a las siguientes cláusulas:
                      </p>

                      {/* Cláusulas */}
                      <div className="space-y-2.5 pt-1">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <strong className="text-blue-900 block mb-1">CLÁUSULA PRIMERA (OBJETO):</strong>
                          <p className="text-slate-600 text-[11.5px]">
                            «LOS ABOGADOS» se comprometen a prestar sus servicios profesionales de asesoría, representación y asistencia jurídica a favor de «EL CLIENTE» en el asunto relativo a la causa, juicio o redacción encomendada.
                          </p>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <strong className="text-blue-900 block mb-1">CLÁUSULA SEGUNDA (HONORARIOS PACTADOS):</strong>
                          <p className="text-slate-600 text-[11.5px]">
                            De conformidad con el artículo 22 de la Ley de Abogados y normas de ética profesional, las partes fijan de mutuo acuerdo la remuneración estipulada en dólares ($ USD) o su equivalente en bolívares a la tasa oficial del Banco Central de Venezuela a la fecha de pago.
                          </p>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <strong className="text-blue-900 block mb-1">CLÁUSULA TERCERA (FORMA DE PAGO):</strong>
                          <p className="text-slate-600 text-[11.5px]">
                            El monto pactado será cancelado mediante Pago Único de Contado a la suscripción del instrumento, o de forma Fraccionada en un anticipo y cuotas sucesivas a través de los canales bancarios oficiales del bufete.
                          </p>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <strong className="text-blue-900 block mb-1">CLÁUSULA CUARTA (GASTOS OPERATIVOS Y JUDICIALES):</strong>
                          <p className="text-slate-600 text-[11.5px]">
                            Queda convenido que los honorarios profesionales pactados NO incluyen aranceles judiciales, timbres fiscales, traslados, fotocopias ni expensas de registros o notarías, los cuales son cubiertos por «EL CLIENTE» mediante el Anexo de Provisión de Gastos (Anexo A).
                          </p>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <strong className="text-blue-900 block mb-1">CLÁUSULA QUINTA (SECRETO PROFESIONAL):</strong>
                          <p className="text-slate-600 text-[11.5px]">
                            «LOS ABOGADOS» guardarán estricto secreto profesional sobre todos los hechos y documentos aportados, manteniendo informado permanentemente a «EL CLIENTE».
                          </p>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <strong className="text-blue-900 block mb-1">CLÁUSULA SEXTA (JURISDICCIÓN):</strong>
                          <p className="text-slate-600 text-[11.5px]">
                            Para todos los efectos legales, las partes eligen como domicilio especial y excluyente los tribunales de la ciudad de Valencia, Estado Carabobo.
                          </p>
                        </div>
                      </div>

                      {/* Firmas Oficiales */}
                      <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 text-center">
                        <div className="space-y-1">
                          <div className="w-3/4 mx-auto border-b border-slate-400 pt-6"></div>
                          <p className="font-bold text-slate-800 text-[11px]">POR ROMÁN &amp; DELGADO</p>
                          <p className="text-[9.5px] text-slate-400">Abg. Víctor Román / Luis Delgado</p>
                        </div>
                        <div className="space-y-1">
                          <div className="w-3/4 mx-auto border-b border-slate-400 pt-6"></div>
                          <p className="font-bold text-slate-800 text-[11px]">EL CLIENTE</p>
                          <p className="text-[9.5px] text-slate-400">C.I. V-_________________</p>
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50/55 text-slate-800 p-4 rounded-2xl font-mono text-xs leading-relaxed max-h-96 sm:max-h-[460px] overflow-y-auto whitespace-pre-wrap select-all border border-blue-100 shadow-2xs">
                    {CONTRATO_TEMPLATE}
                  </div>
                )}
              </div>

              {/* Pie de recomendación */}
              <div className="pt-2 flex items-center gap-2 text-xs text-slate-500 font-medium">
                <Lightbulb className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Haz clic en <strong>Copiar</strong> o descarga en <strong>Word (.doc)</strong> para editar e imprimir.</span>
              </div>
            </div>

            {/* FORMATO 2: RECIBO Y ANEXO DE GASTOS JUDICIALES */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                {/* Header de la tarjeta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0 border border-emerald-200">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Anexo y Provisión de Gastos</h4>
                      <span className="text-[11px] text-slate-500 font-medium">Comprobante oficial de fondos para aranceles y movilización</span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setViewModeGastos(prev => prev === 'documento' ? 'texto' : 'documento')}
                      title="Alternar entre vista de comprobante membretado o texto plano"
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      {viewModeGastos === 'documento' ? <FileText className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{viewModeGastos === 'documento' ? 'Ver Texto' : 'Ver Hoja'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadDocFile(
                        'Anexo_Provision_Gastos_Roman_y_Delgado.doc',
                        'Anexo y Provisión de Gastos - Román & Delgado',
                        ANEXO_GASTOS_HTML
                      )}
                      title="Descargar editable en Microsoft Word (.doc)"
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200/70 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <FileDown className="w-3.5 h-3.5 shrink-0" />
                      <span>Word (.doc)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyTemplate(ANEXO_GASTOS_TEMPLATE, false)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      {copiedGastos ? <Check className="w-3.5 h-3.5 text-white shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                      <span>{copiedGastos ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                {/* VISTA HOJA MEMBRETADA (DEFAULT) vs VISTA TEXTO PLANO */}
                {viewModeGastos === 'documento' ? (
                  <div className="bg-slate-100/70 p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-inner">
                    <div className="bg-white rounded-xl p-5 sm:p-7 shadow-2xs border border-slate-200/80 max-h-96 sm:max-h-[460px] overflow-y-auto space-y-4 text-xs sm:text-[12.5px] leading-relaxed text-slate-800 font-sans">

                      {/* Membrete Oficial */}
                      <div className="text-center pb-3 border-b-2 border-emerald-600/30 space-y-0.5">
                        <div className="flex items-center justify-center gap-2 text-slate-900 font-serif font-black tracking-widest text-sm sm:text-base uppercase">
                          <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>ROMÁN &amp; DELGADO</span>
                        </div>
                        <p className="text-[10px] tracking-wider uppercase font-bold text-emerald-700">
                          Recibo y Anexo 'A': Provisión de Fondos para Gastos
                        </p>
                        <p className="text-[9px] text-slate-400">
                          Valencia, Estado Carabobo &bull; RIF: J-40892839-1
                        </p>
                      </div>

                      {/* Datos del Comprobante */}
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/70">
                        <span>Recibo Nº: <strong className="text-slate-900 font-mono">RD-GST-2026-______</strong></span>
                        <span>Fecha: <strong className="text-slate-900">___/___/2026</strong></span>
                      </div>

                      {/* Cuadro de Información del Cliente */}
                      <div className="bg-emerald-50/40 rounded-xl p-3 border border-emerald-200/60 space-y-1.5 text-[11.5px]">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-bold text-emerald-950">Cliente Receptor:</span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-900 font-semibold">[Nombre del Cliente]</span>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-bold text-emerald-950">Cédula / RIF:</span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-900 font-semibold">[V-__________]</span>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-bold text-emerald-950">Expediente Asignado:</span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-900 font-semibold">[Nº Expediente / Asunto]</span>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-bold text-emerald-950">Monto Recibido:</span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-900 font-bold">[USD $ / Bs. _______]</span>
                        </div>
                      </div>

                      {/* Lista de Gastos Autorizados */}
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-2">
                          Destinado Exclusivamente a los Siguientes Gastos de Gestión:
                        </span>
                        <div className="space-y-1.5 text-[11.5px]">
                          <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-slate-700 font-medium">Aranceles y tasas judiciales de Tribunales de la República.</span>
                          </div>
                          <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-slate-700 font-medium">Derechos y aranceles de Notaría Pública y Registros.</span>
                          </div>
                          <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-slate-700 font-medium">Timbres fiscales, estampillas tributarias y papel sellado.</span>
                          </div>
                          <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-slate-700 font-medium">Fotocopias certificadas, traslados y movilización operativa.</span>
                          </div>
                        </div>
                      </div>

                      {/* Nota Legal Destacada */}
                      <div className="bg-blue-50/70 rounded-xl p-3.5 border border-blue-200 text-[11px] text-slate-800 space-y-1">
                        <strong className="flex items-center gap-1.5 font-black text-blue-900 uppercase tracking-wide">
                          <Scale className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                          <span>Advertencia Jurídica (Ley de Abogados):</span>
                        </strong>
                        <p className="leading-relaxed">
                          Este monto <strong>NO constituye pago de honorarios profesionales</strong> de los abogados de la firma. Corresponde exclusivamente a una provisión para gastos de tramitación sujeta a presentación de soportes, facturas y rendición de cuentas.
                        </p>
                      </div>

                      {/* Firmas Oficiales */}
                      <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 text-center">
                        <div className="space-y-1">
                          <div className="w-3/4 mx-auto border-b border-slate-400 pt-6"></div>
                          <p className="font-bold text-slate-800 text-[11px]">RECIBIDO POR EL BUFETE</p>
                          <p className="text-[9.5px] text-slate-400">Abg. Responsable</p>
                        </div>
                        <div className="space-y-1">
                          <div className="w-3/4 mx-auto border-b border-slate-400 pt-6"></div>
                          <p className="font-bold text-slate-800 text-[11px]">ENTREGADO CONFORME</p>
                          <p className="text-[9.5px] text-slate-400">Firma del Cliente &bull; C.I.</p>
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50/55 text-slate-800 p-4 rounded-2xl font-mono text-xs leading-relaxed max-h-96 sm:max-h-[460px] overflow-y-auto whitespace-pre-wrap select-all border border-blue-100 shadow-2xs">
                    {ANEXO_GASTOS_TEMPLATE}
                  </div>
                )}
              </div>

              {/* Pie de recomendación */}
              <div className="pt-2 flex items-center gap-2 text-xs text-slate-500 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Separa siempre los gastos de los honorarios para rendición contable clara.</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE ALERTA DEL SISTEMA */}
      <SystemAlertModal
        isOpen={alert.isOpen}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        showCancel={alert.showCancel}
        confirmText={alert.showCancel ? 'Sí, Anular' : 'Entendido'}
        cancelText="Volver"
        onConfirm={alert.onConfirm}
        onClose={() => setAlert(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
}
