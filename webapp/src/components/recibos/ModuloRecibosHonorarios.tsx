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
  Sparkles, 
  RefreshCw, 
  ShieldCheck, 
  Copy, 
  Check, 
  Coins, 
  User, 
  X,
  Scale,
  FileDown,
  Eye
} from 'lucide-react';
import type { ReciboCliente, TipoReciboCliente, MetodoPagoCliente } from '../../types/recibos';
import { 
  supabaseGetRecibosClientes, 
  supabaseSaveReciboCliente, 
  supabaseDeleteReciboCliente, 
  supabaseGetNextCorrelativoRecibo,
  supabaseGetExpedientes
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
  } catch {}
  return '887.30';
};

export default function ModuloRecibosHonorarios({
  currentUser,
  isJefatura = false,
  globalExpedientes = []
}: ModuloRecibosHonorariosProps) {
  const loggedUser = currentUser || localStorage.getItem('rd_user_name') || 'Román & Delgado';

  // Sub-pestaña activa
  const [subTab, setSubTab] = useState<'emitir' | 'historial' | 'contratos'>('emitir');

  // Estado de recibos
  const [recibos, setRecibos] = useState<ReciboCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [nextCorrelativo, setNextCorrelativo] = useState<string>('RD-REC-2026-001');

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
  const loadRecibos = async () => {
    setLoading(true);
    try {
      const data = await supabaseGetRecibosClientes();
      setRecibos(data);
      const nextNum = await supabaseGetNextCorrelativoRecibo();
      setNextCorrelativo(nextNum);
    } catch (e) {
      console.warn('Error al cargar recibos:', e);
    } finally {
      setLoading(false);
    }
  };

  // Refrescar Tasa Oficial BCV en vivo
  const refreshLiveBcv = useCallback(async () => {
    setLoadingBcv(true);
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      if (res.ok) {
        const data = await res.json();
        if (data && data.promedio) {
          const rateStr = Number(data.promedio).toFixed(2);
          setFormData(prev => ({ ...prev, tasaBcv: rateStr }));
          try {
            localStorage.setItem('rd_bcv_usd', data.promedio.toString());
            localStorage.setItem('rd_live_bcv_rate', data.promedio.toString());
          } catch {}
        }
      }
    } catch (e) {
      console.warn('Error obteniendo tasa BCV en vivo:', e);
    } finally {
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
      const now = new Date();
      const horaStr = now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true });
      const tasaNum = formData.tasaBcv ? parseFloat(formData.tasaBcv.replace(',', '.')) : undefined;

      const nuevoRecibo: ReciboCliente = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        numeroRecibo: nextCorrelativo,
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
        bancoDestino: formData.bancoDestino.trim() || undefined,
        referenciaPago: formData.referenciaPago.trim() || undefined,
        fecha: formData.fecha || now.toISOString().split('T')[0],
        hora: horaStr,
        abogadoReceptor: loggedUser,
        estado: 'Emitido',
        notasInternas: formData.notasInternas.trim() || undefined,
        created_at: now.toISOString()
      };

      await supabaseSaveReciboCliente(nuevoRecibo);
      setRecibos(prev => [nuevoRecibo, ...prev]);

      // Generar y descargar el PDF de inmediato
      try {
        await exportarReciboClientePDF(nuevoRecibo);
      } catch (pdfErr) {
        console.warn('Error generando PDF automático:', pdfErr);
      }

      // Reiniciar formulario y calcular siguiente correlativo
      const nextNum = await supabaseGetNextCorrelativoRecibo();
      setNextCorrelativo(nextNum);
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
        tasaBcv: getInitialBcvRate(),
        metodoPago: 'Efectivo Divisas ($)',
        bancoDestino: '',
        referenciaPago: '',
        fecha: new Date().toISOString().split('T')[0],
        notasInternas: ''
      });
      setIsCustomExpediente(false);

      setAlert({
        isOpen: true,
        type: 'success',
        title: '¡Recibo Emitido con Éxito!',
        message: `Se generó el recibo ${nuevoRecibo.numeroRecibo} por ${nuevoRecibo.moneda === 'USD' ? `$${nuevoRecibo.monto}` : `Bs. ${nuevoRecibo.monto}`}. El PDF oficial se descargó automáticamente.`
      });

    } catch (err: any) {
      setAlert({
        isOpen: true,
        type: 'error',
        title: 'Error al Emitir',
        message: 'No se pudo guardar el recibo. Intenta nuevamente.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Anular recibo
  const handleAnular = (recibo: ReciboCliente) => {
    setAlert({
      isOpen: true,
      type: 'warning',
      title: '¿Anular Recibo?',
      message: `¿Estás seguro de que deseas anular el recibo ${recibo.numeroRecibo} de ${recibo.clienteNombre}? Esta acción quedará registrada en el historial.`,
      showCancel: true,
      onConfirm: async () => {
        await supabaseDeleteReciboCliente(recibo.id, recibo.numeroRecibo);
        setRecibos(prev => prev.filter(r => r.id !== recibo.id));
        setAlert({
          isOpen: true,
          type: 'info',
          title: 'Recibo Anulado',
          message: `El recibo ${recibo.numeroRecibo} ha sido removido del registro oficial.`
        });
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

  // Filtrado de recibos para historial
  const filteredRecibos = useMemo(() => {
    return recibos.filter(r => {
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
    });
  }, [filterMoneda, filterTipo, recibos, searchQuery]);

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
      
      {/* HEADER SUPERIOR CON LOGO Y TÍTULO */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 sm:gap-5 relative overflow-hidden">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-600 to-yellow-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 shrink-0">
            <Receipt className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-700 border border-amber-500/20">
                Román & Delgado • Facturación
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Sistema KANT</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight mt-1 truncate">
              Recibos de Honorarios & Clientes
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium line-clamp-2 sm:line-clamp-none">
              Emisión de comprobantes oficiales con correlativo automático, talón de cliente y modelos contractuales.
            </p>
          </div>
        </div>

        {/* SELECTOR DE PESTAÑAS PRINCIPALES (RESPONSIVE TOUCH & SCROLL) */}
        <div className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-slate-100 rounded-2xl border border-slate-200 overflow-x-auto scrollbar-none flex-nowrap shrink-0">
          <button
            type="button"
            onClick={() => setSubTab('emitir')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap active:scale-95 ${
              subTab === 'emitir' 
                ? 'bg-amber-500 text-slate-950 shadow-sm font-black' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Emitir Recibo</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('historial')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap active:scale-95 ${
              subTab === 'historial' 
                ? 'bg-slate-900 text-white shadow-sm font-black' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Historial ({recibos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('contratos')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap active:scale-95 ${
              subTab === 'contratos' 
                ? 'bg-blue-600 text-white shadow-sm font-black' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Contratos & Modelos</span>
          </button>
        </div>
      </div>

      {/* MÉTRICAS RÁPIDAS DE FACTURACIÓN (RESPONSIVE FLUID GRID) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-bold mb-1">
            <span>Total Recaudado ($)</span>
            <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
          </div>
          <p className="text-base sm:text-2xl font-black text-slate-900 truncate">
            $ {totals.totalUsd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 font-medium block truncate">En divisas USD / Zelle</span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-bold mb-1">
            <span>Total en Bolívares</span>
            <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
          </div>
          <p className="text-base sm:text-2xl font-black text-slate-900 truncate">
            Bs. {totals.totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 font-medium block truncate">Pago Móvil y transferencias</span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-bold mb-1">
            <span>Recibos Emitidos</span>
            <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
          </div>
          <p className="text-base sm:text-2xl font-black text-slate-900 truncate">
            {totals.count}
          </p>
          <span className="text-[10px] text-slate-400 font-medium block truncate">Comprobantes en registro</span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-bold mb-1">
            <span>Siguiente Correlativo</span>
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 shrink-0" />
          </div>
          <p className="text-sm sm:text-lg font-black text-amber-700 tracking-tight font-mono truncate">
            {nextCorrelativo}
          </p>
          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            Secuencia activa
          </span>
        </div>
      </div>

      {/* PESTAÑA 1: FORMULARIO DE EMISIÓN DE RECIBO */}
      {subTab === 'emitir' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-slate-200 shadow-sm space-y-5 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600 shrink-0" />
                Emitir Nuevo Recibo Oficial
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Llena los datos del cliente y el monto. El correlativo se asigna de forma automática y se descarga el PDF en dos talones.
              </p>
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-2 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-xl w-full sm:w-auto">
              <span className="text-xs font-bold text-amber-800">Nº Asignado:</span>
              <span className="text-xs sm:text-sm font-black text-amber-950 font-mono tracking-wider">{nextCorrelativo}</span>
            </div>
          </div>

          <form onSubmit={handleEmitirRecibo} className="space-y-5 sm:space-y-6">
            
            {/* SELECTOR DE TIPO DE RECIBO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, tipoRecibo: 'Honorarios Profesionales' }))}
                className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 sm:gap-3.5 active:scale-95 ${
                  formData.tipoRecibo === 'Honorarios Profesionales'
                    ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/30'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                  formData.tipoRecibo === 'Honorarios Profesionales' ? 'bg-amber-500 text-slate-950' : 'bg-white text-slate-600 border border-slate-200'
                }`}>
                  ⚖️
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider truncate">Honorarios Profesionales</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-1 sm:line-clamp-none">Asesorías, consultas, redacción de documentos y juicios.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, tipoRecibo: 'Provisión de Gastos' }))}
                className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 sm:gap-3.5 active:scale-95 ${
                  formData.tipoRecibo === 'Provisión de Gastos'
                    ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-400/30'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                  formData.tipoRecibo === 'Provisión de Gastos' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}>
                  📑
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider truncate">Provisión de Gastos</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-1 sm:line-clamp-none">Aranceles de tribunal, notaría, timbres fiscales y copias.</p>
                </div>
              </button>
            </div>

            {/* SECCIÓN 1: DATOS DEL CLIENTE */}
            <div className="bg-slate-50/60 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-slate-200 space-y-3.5 sm:space-y-4">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                1. Datos del Cliente y Asunto Legal
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Nombre Completo del Cliente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Aquiles Pérez / Inversiones Los Llanos C.A."
                    value={formData.clienteNombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, clienteNombre: e.target.value }))}
                    className="w-full px-3.5 py-2.5 sm:py-2 bg-white rounded-xl border border-slate-200 text-sm sm:text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Cédula de Identidad o RIF *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: V-14.892.450 / J-40182938-1"
                    value={formData.clienteCedula}
                    onChange={(e) => setFormData(prev => ({ ...prev, clienteCedula: e.target.value }))}
                    className="w-full px-3.5 py-2.5 sm:py-2 bg-white rounded-xl border border-slate-200 text-sm sm:text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ej: 0414-1234567"
                    value={formData.clienteTelefono}
                    onChange={(e) => setFormData(prev => ({ ...prev, clienteTelefono: e.target.value }))}
                    className="w-full px-3.5 py-2.5 sm:py-2 bg-white rounded-xl border border-slate-200 text-sm sm:text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5 pt-0.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-600 block">
                      Expediente o Caso Relacionado (Opcional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomExpediente(!isCustomExpediente)}
                      className="text-[10.5px] font-bold text-amber-600 hover:text-amber-700 underline cursor-pointer"
                    >
                      {isCustomExpediente ? '← Ver lista' : '✍️ Escribir manual'}
                    </button>
                  </div>

                  {isCustomExpediente ? (
                    <input
                      type="text"
                      placeholder="Ej: RD-J-2026-004 • Divorcio 148-A"
                      value={formData.expedienteRelacionado}
                      onChange={(e) => setFormData(prev => ({ ...prev, expedienteRelacionado: e.target.value }))}
                      className="w-full px-3.5 py-2.5 sm:py-2 bg-white rounded-xl border border-amber-300 text-sm sm:text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all"
                    />
                  ) : (
                    <select
                      value={formData.expedienteRelacionado}
                      onChange={(e) => handleSelectExpediente(e.target.value)}
                      className="w-full px-3 py-2.5 sm:py-2 bg-white rounded-xl border border-slate-200 text-sm sm:text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all"
                    >
                      <option value="">-- Seleccionar de la lista ({expedientesList.length} disponibles) --</option>
                      {expedientesList.map((exp: any, idx: number) => {
                        const num = exp.numeroExpediente || exp.numero || `EXP-${idx + 1}`;
                        const tit = exp.partes || exp.titulo || exp.cliente || 'Sin título';
                        const cliente = exp.cliente ? ` (${exp.cliente})` : '';
                        const fullVal = `${num} • ${tit}`;
                        return (
                          <option key={exp.id || idx} value={fullVal}>
                            📁 {num} - {tit.slice(0, 45)}{tit.length > 45 ? '...' : ''}{cliente}
                          </option>
                        );
                      })}
                      <option value="__custom__">✍️ Escribir otro expediente manualmente...</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Correo Electrónico (Opcional)</label>
                  <input
                    type="email"
                    placeholder="Ej: cliente@correo.com"
                    value={formData.clienteEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, clienteEmail: e.target.value }))}
                    className="w-full px-3.5 py-2.5 sm:py-2 bg-white rounded-xl border border-slate-200 text-sm sm:text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: DETALLES ECONÓMICOS Y FORMA DE PAGO */}
            <div className="bg-slate-50/60 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-slate-200 space-y-3.5 sm:space-y-4">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                2. Monto y Forma de Pago
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Moneda *</label>
                  <select
                    value={formData.moneda}
                    onChange={(e) => setFormData(prev => ({ ...prev, moneda: e.target.value as 'USD' | 'VES' }))}
                    className="w-full px-3.5 py-2.5 sm:py-2 bg-white rounded-xl border border-slate-200 text-sm sm:text-xs font-bold text-slate-800 outline-none focus:border-amber-500 transition-all"
                  >
                    <option value="USD">Dólares ($ USD)</option>
                    <option value="VES">Bolívares (Bs. VES)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Monto Recibido *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      {formData.moneda === 'USD' ? '$' : 'Bs.'}
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="100.00"
                      value={formData.monto}
                      onChange={(e) => setFormData(prev => ({ ...prev, monto: e.target.value }))}
                      className="w-full pl-8 pr-3.5 py-2.5 sm:py-2 bg-white rounded-xl border border-slate-200 text-sm sm:text-xs font-black text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Forma de Pago *</label>
                  <select
                    value={formData.metodoPago}
                    onChange={(e) => setFormData(prev => ({ ...prev, metodoPago: e.target.value as MetodoPagoCliente }))}
                    className="w-full px-3.5 py-2.5 sm:py-2 bg-white rounded-xl border border-slate-200 text-sm sm:text-xs font-bold text-slate-800 outline-none focus:border-amber-500 transition-all"
                  >
                    <option value="Efectivo Divisas ($)">Efectivo Divisas ($)</option>
                    <option value="Efectivo Bolívares (Bs.)">Efectivo Bolívares (Bs.)</option>
                    <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                    <option value="Pago Móvil">Pago Móvil</option>
                    <option value="Zelle">Zelle</option>
                    <option value="Otro">Otro medio</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Fecha del Recibo *</label>
                  <input
                    type="date"
                    required
                    value={formData.fecha}
                    onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
                    className="w-full px-3.5 py-2.5 sm:py-2 bg-white rounded-xl border border-slate-200 text-sm sm:text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              {/* Fila extra: Banco y Referencia bancaria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5 pt-0.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Banco / Cuenta de Destino</label>
                  <input
                    type="text"
                    placeholder="Ej: Banesco / Banco de Venezuela / Zelle"
                    value={formData.bancoDestino}
                    onChange={(e) => setFormData(prev => ({ ...prev, bancoDestino: e.target.value }))}
                    className="w-full px-3.5 py-2.5 sm:py-2 bg-white rounded-xl border border-slate-200 text-sm sm:text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Nº Referencia / Comprobante</label>
                  <input
                    type="text"
                    placeholder="Ej: Ref. 00892839 / Comprobante Zelle"
                    value={formData.referenciaPago}
                    onChange={(e) => setFormData(prev => ({ ...prev, referenciaPago: e.target.value }))}
                    className="w-full px-3.5 py-2.5 sm:py-2 bg-white rounded-xl border border-slate-200 text-sm sm:text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 transition-all"
                  />
                </div>

                {formData.moneda === 'USD' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-600 block">
                        Tasa Oficial BCV Referencial
                      </label>
                      <button
                        type="button"
                        onClick={refreshLiveBcv}
                        disabled={loadingBcv}
                        title="Actualizar tasa oficial BCV en vivo"
                        className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-600 hover:text-amber-700 transition-colors cursor-pointer"
                      >
                        <RefreshCw className={`w-2.5 h-2.5 ${loadingBcv ? 'animate-spin' : ''}`} />
                        {loadingBcv ? 'Actualizando...' : 'Actualizar BCV'}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="887.30"
                        value={formData.tasaBcv}
                        onChange={(e) => setFormData(prev => ({ ...prev, tasaBcv: e.target.value }))}
                        className="w-full px-3.5 py-2.5 sm:py-2 bg-white rounded-xl border border-slate-200 text-sm sm:text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 transition-all"
                      />
                    </div>
                    {formData.monto && Number(formData.monto) > 0 && formData.tasaBcv && Number(formData.tasaBcv) > 0 && (
                      <span className="text-[10.5px] text-emerald-600 font-bold block mt-1">
                        ≈ Bs. {(Number(formData.monto) * Number(formData.tasaBcv)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* SECCIÓN 3: CONCEPTO DETALLADO Y SUGERENCIAS RÁPIDAS */}
            <div className="bg-slate-50/60 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  3. Concepto Detallado del Pago
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Se imprimirá textualmente en el recibo</span>
              </div>

              {/* Botones de sugerencias rápidas (Scrollable en móviles pequeños) */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Rápidas:
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('Abono a honorarios profesionales por redacción de documento y trámites legales.')}
                  className="px-2.5 py-1.5 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 rounded-lg text-xs sm:text-[10.5px] font-semibold transition-all cursor-pointer active:scale-95"
                >
                  Abono Redacción
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('Pago de honorarios profesionales por consulta legal personalizada y estudio de expediente.')}
                  className="px-2.5 py-1.5 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 rounded-lg text-xs sm:text-[10.5px] font-semibold transition-all cursor-pointer active:scale-95"
                >
                  Consulta Legal
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('Provisión de fondos para aranceles judiciales, timbres fiscales y copias certificadas en tribunal.')}
                  className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 rounded-lg text-xs sm:text-[10.5px] font-semibold transition-all cursor-pointer active:scale-95"
                >
                  Gastos Tribunal / Copias
                </button>
              </div>

              <textarea
                rows={3}
                placeholder="Describe el concepto de los honorarios o gastos recibidos..."
                value={formData.concepto}
                onChange={(e) => setFormData(prev => ({ ...prev, concepto: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-sm sm:text-xs font-medium text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all leading-relaxed"
              />
            </div>

            {/* BOTÓN DE ACCIÓN FINAL */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3.5 sm:gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium w-full sm:w-auto justify-center sm:justify-start">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Atendido por: <strong className="text-slate-800">{loggedUser}</strong></span>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-6 sm:px-8 py-3.5 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-slate-950 font-black text-sm rounded-xl sm:rounded-2xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2.5"
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
      )}

      {/* PESTAÑA 2: HISTORIAL DE RECIBOS EMITIDOS */}
      {subTab === 'historial' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-slate-200 shadow-sm space-y-4 sm:space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3.5 sm:gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600 shrink-0" />
                Historial de Recibos Emitidos
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Registro oficial con búsqueda por cliente, cédula o número de recibo correlativo.
              </p>
            </div>

            {/* Buscador y Filtros Responsive */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar cliente, cédula o Nº..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 rounded-xl border border-slate-200 text-sm sm:text-xs font-medium text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:flex items-center gap-2">
                <select
                  value={filterMoneda}
                  onChange={(e) => setFilterMoneda(e.target.value as any)}
                  className="w-full sm:w-auto px-2.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="todas">Moneda: Todas</option>
                  <option value="USD">Solo Dólares ($)</option>
                  <option value="VES">Solo Bolívares (Bs.)</option>
                </select>

                <select
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value as any)}
                  className="w-full sm:w-auto px-2.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="todos">Tipo: Todos</option>
                  <option value="Honorarios Profesionales">Honorarios</option>
                  <option value="Provisión de Gastos">Gastos</option>
                </select>
              </div>

              <button
                onClick={loadRecibos}
                title="Actualizar lista"
                className="p-2 text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer self-end sm:self-auto"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
              </button>
            </div>
          </div>

          {filteredRecibos.length === 0 ? (
            <div className="py-12 sm:py-16 text-center text-slate-400 space-y-3 bg-slate-50/60 rounded-2xl border border-slate-200/60">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mx-auto text-slate-400 shadow-xs border border-slate-200">
                <Receipt className="w-6 h-6 text-amber-500" />
              </div>
              <p className="text-sm font-bold text-slate-700">No se encontraron recibos emitidos</p>
              <p className="text-xs text-slate-400">
                {searchQuery ? 'Prueba con otro término de búsqueda.' : 'Aún no se han emitido recibos en este período.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecibos.map((recibo) => {
                const isUSD = recibo.moneda === 'USD';
                return (
                  <div
                    key={recibo.id}
                    className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 sm:gap-4 shadow-2xs"
                  >
                    <div className="flex items-start gap-3 min-w-0 w-full md:w-auto">
                      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 shadow-xs ${
                        isUSD ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}>
                        {isUSD ? '$' : 'Bs'}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                          <span className="font-mono text-[11px] sm:text-xs font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            {recibo.numeroRecibo}
                          </span>
                          <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                            {recibo.clienteNombre}
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold">
                            ({recibo.clienteCedula})
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            recibo.tipoRecibo === 'Honorarios Profesionales'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {recibo.tipoRecibo}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 sm:line-clamp-1 mb-1 font-normal">
                          {recibo.concepto}
                        </p>

                        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-slate-400 font-medium flex-wrap">
                          <span>Fecha: <strong className="text-slate-600">{recibo.fecha}</strong></span>
                          <span>•</span>
                          <span>Método: <strong className="text-slate-600">{recibo.metodoPago}</strong></span>
                          {recibo.referenciaPago && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[120px] sm:max-w-none">Ref: <strong className="text-slate-600">{recibo.referenciaPago}</strong></span>
                            </>
                          )}
                          <span>•</span>
                          <span>Atendido por: <strong className="text-slate-600">{recibo.abogadoReceptor}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto shrink-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <div className="text-left md:text-right">
                        <span className="text-base sm:text-lg font-black text-slate-900 block">
                          {isUSD ? `$ ${recibo.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` : `Bs. ${recibo.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}
                        </span>
                        {recibo.montoEquivalente && isUSD && (
                          <span className="text-[10px] text-slate-400 block">
                            Equiv: Bs. {recibo.montoEquivalente.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => exportarReciboClientePDF(recibo)}
                          title="Descargar PDF Oficial"
                          className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-700 transition-all cursor-pointer font-bold text-xs flex items-center gap-1 shadow-2xs active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">PDF</span>
                        </button>

                        <button
                          onClick={() => handleShareWhatsApp(recibo)}
                          title="Compartir por WhatsApp"
                          className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 transition-all cursor-pointer active:scale-95"
                        >
                          <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>

                        {isJefatura && (
                          <button
                            onClick={() => handleAnular(recibo)}
                            title="Anular / Eliminar recibo"
                            className="p-2 sm:p-2.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 3: MODELOS DE CONTRATOS Y ANEXOS DE GASTOS */}
      {subTab === 'contratos' && (
        <div className="space-y-6">
          {/* Banner de bienvenida y directrices de la sección */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-50/60 to-blue-50/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-amber-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-sm shrink-0">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Modelos Jurídicos Institucionales
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  Documentos oficiales listos conforme a la Ley de Abogados y el Código de Ética de Venezuela.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Papel Membretado Oficial
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
                <FileDown className="w-3.5 h-3.5 text-blue-600" />
                Descarga en Word (.doc)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            
            {/* FORMATO 1: CONTRATO DE PRESTACIÓN DE SERVICIOS */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3.5">
                {/* Header de la tarjeta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0 border border-amber-200">
                      ⚖️
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Contrato de Prestación de Servicios</h4>
                      <span className="text-[10px] text-slate-500 font-medium">Modelo oficial para causas legales y clientes</span>
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
                      {viewModeContract === 'documento' ? <FileText className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
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
                      className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <FileDown className="w-3.5 h-3.5 shrink-0" />
                      <span>Word (.doc)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyTemplate(CONTRATO_TEMPLATE, true)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                    >
                      {copiedContract ? <Check className="w-3.5 h-3.5 text-slate-950 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                      <span>{copiedContract ? '¡Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                {/* VISTA HOJA MEMBRETADA (DEFAULT) vs VISTA TEXTO PLANO */}
                {viewModeContract === 'documento' ? (
                  <div className="bg-slate-100/70 p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-inner">
                    <div className="bg-white rounded-xl p-5 sm:p-7 shadow-xs border border-slate-200/80 max-h-96 sm:max-h-[460px] overflow-y-auto space-y-4 text-xs sm:text-[12.5px] leading-relaxed text-slate-800 font-sans">
                      
                      {/* Membrete Oficial */}
                      <div className="text-center pb-3 border-b-2 border-amber-500/30 space-y-0.5">
                        <div className="flex items-center justify-center gap-1.5 text-slate-900 font-serif font-black tracking-widest text-sm sm:text-base uppercase">
                          <span>⚖️ ROMÁN & DELGADO</span>
                        </div>
                        <p className="text-[10px] tracking-wider uppercase font-bold text-amber-700">
                          Escritorio Jurídico & Asesoría Corporativa
                        </p>
                        <p className="text-[9px] text-slate-400">
                          Valencia, Estado Carabobo • RIF: J-40892839-1 • Inpreabogado: 184.290 / 201.442
                        </p>
                      </div>

                      {/* Título Oficial */}
                      <h5 className="text-center font-black text-slate-900 text-xs sm:text-sm tracking-wide uppercase pt-1">
                        CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES LEGALES
                      </h5>

                      {/* Preámbulo */}
                      <p className="text-justify text-slate-700">
                        Entre la firma jurídica <strong>ROMÁN & DELGADO</strong>, domiciliada en Valencia, Estado Carabobo, representada en este acto por los abogados en ejercicio <strong>VÍCTOR ROMÁN</strong> y <strong>LUIS DELGADO</strong>, en lo sucesivo denominados <strong>«LOS ABOGADOS»</strong>, por una parte; y por la otra el ciudadano(a):
                      </p>

                      {/* Tarjeta de Datos del Cliente */}
                      <div className="bg-amber-50/40 rounded-xl p-3 border border-amber-200/60 space-y-1.5 text-[11.5px]">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-bold text-amber-950">Nombre Completo:</span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-900 font-semibold">[Nombre del Cliente]</span>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-bold text-amber-950">Cédula / RIF:</span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-900 font-semibold">[V-__________]</span>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-bold text-amber-950">Domicilio:</span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-900 font-semibold">[Dirección de habitación o mercantil]</span>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-bold text-amber-950">Teléfono / Correo:</span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-900 font-semibold">[Teléfono y correo electrónico]</span>
                        </div>
                      </div>

                      <p className="text-justify text-slate-700">
                        En lo sucesivo denominado <strong>«EL CLIENTE»</strong>, se ha convenido celebrar el presente Contrato de Servicios Profesionales sujeto a las siguientes cláusulas:
                      </p>

                      {/* Cláusulas */}
                      <div className="space-y-2.5 pt-1">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <strong className="text-amber-900 block mb-1">CLÁUSULA PRIMERA (OBJETO):</strong>
                          <p className="text-slate-600 text-[11.5px]">
                            «LOS ABOGADOS» se comprometen a prestar sus servicios profesionales de asesoría, representación y asistencia jurídica a favor de «EL CLIENTE» en el asunto relativo a la causa, juicio o redacción encomendada.
                          </p>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <strong className="text-amber-900 block mb-1">CLÁUSULA SEGUNDA (HONORARIOS PACTADOS):</strong>
                          <p className="text-slate-600 text-[11.5px]">
                            De conformidad con el artículo 22 de la Ley de Abogados y normas de ética profesional, las partes fijan de mutuo acuerdo la remuneración estipulada en dólares ($ USD) o su equivalente en bolívares a la tasa oficial del Banco Central de Venezuela a la fecha de pago.
                          </p>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <strong className="text-amber-900 block mb-1">CLÁUSULA TERCERA (FORMA DE PAGO):</strong>
                          <p className="text-slate-600 text-[11.5px]">
                            El monto pactado será cancelado mediante Pago Único de Contado a la suscripción del instrumento, o de forma Fraccionada en un anticipo y cuotas sucesivas a través de los canales bancarios oficiales del bufete.
                          </p>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <strong className="text-amber-900 block mb-1">CLÁUSULA CUARTA (GASTOS OPERATIVOS Y JUDICIALES):</strong>
                          <p className="text-slate-600 text-[11.5px]">
                            Queda convenido que los honorarios profesionales pactados NO incluyen aranceles judiciales, timbres fiscales, traslados, fotocopias ni expensas de registros o notarías, los cuales son cubiertos por «EL CLIENTE» mediante el Anexo de Provisión de Gastos (Anexo A).
                          </p>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <strong className="text-amber-900 block mb-1">CLÁUSULA QUINTA (SECRETO PROFESIONAL):</strong>
                          <p className="text-slate-600 text-[11.5px]">
                            «LOS ABOGADOS» guardarán estricto secreto profesional sobre todos los hechos y documentos aportados, manteniendo informado permanentemente a «EL CLIENTE».
                          </p>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <strong className="text-amber-900 block mb-1">CLÁUSULA SEXTA (JURISDICCIÓN):</strong>
                          <p className="text-slate-600 text-[11.5px]">
                            Para todos los efectos legales, las partes eligen como domicilio especial y excluyente los tribunales de la ciudad de Valencia, Estado Carabobo.
                          </p>
                        </div>
                      </div>

                      {/* Firmas Oficiales */}
                      <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 text-center">
                        <div className="space-y-1">
                          <div className="w-3/4 mx-auto border-b border-slate-400 pt-6"></div>
                          <p className="font-bold text-slate-800 text-[11px]">POR ROMÁN & DELGADO</p>
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
                  <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-xs leading-relaxed max-h-96 sm:max-h-[460px] overflow-y-auto whitespace-pre-wrap select-all border border-slate-800 shadow-inner">
                    {CONTRATO_TEMPLATE}
                  </div>
                )}
              </div>

              {/* Pie de recomendación */}
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>💡 Haz clic en <strong>Copiar</strong> o descarga en <strong>Word (.doc)</strong> para editar e imprimir.</span>
              </div>
            </div>

            {/* FORMATO 2: RECIBO Y ANEXO DE GASTOS JUDICIALES */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3.5">
                {/* Header de la tarjeta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0 border border-emerald-200">
                      📑
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Anexo y Provisión de Gastos</h4>
                      <span className="text-[10px] text-slate-500 font-medium">Comprobante oficial de fondos para aranceles y movilización</span>
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
                      {viewModeGastos === 'documento' ? <FileText className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
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
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <FileDown className="w-3.5 h-3.5 shrink-0" />
                      <span>Word (.doc)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyTemplate(ANEXO_GASTOS_TEMPLATE, false)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                    >
                      {copiedGastos ? <Check className="w-3.5 h-3.5 text-white shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                      <span>{copiedGastos ? '¡Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                {/* VISTA HOJA MEMBRETADA (DEFAULT) vs VISTA TEXTO PLANO */}
                {viewModeGastos === 'documento' ? (
                  <div className="bg-slate-100/70 p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-inner">
                    <div className="bg-white rounded-xl p-5 sm:p-7 shadow-xs border border-slate-200/80 max-h-96 sm:max-h-[460px] overflow-y-auto space-y-4 text-xs sm:text-[12.5px] leading-relaxed text-slate-800 font-sans">
                      
                      {/* Membrete Oficial */}
                      <div className="text-center pb-3 border-b-2 border-emerald-500/30 space-y-0.5">
                        <div className="flex items-center justify-center gap-1.5 text-slate-900 font-serif font-black tracking-widest text-sm sm:text-base uppercase">
                          <span>📑 ROMÁN & DELGADO</span>
                        </div>
                        <p className="text-[10px] tracking-wider uppercase font-bold text-emerald-700">
                          Recibo y Anexo 'A': Provisión de Fondos para Gastos
                        </p>
                        <p className="text-[9px] text-slate-400">
                          Valencia, Estado Carabobo • RIF: J-40892839-1
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
                          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-emerald-600 font-bold">☑️</span>
                            <span className="text-slate-700 font-medium">Aranceles y tasas judiciales de Tribunales de la República.</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-emerald-600 font-bold">☑️</span>
                            <span className="text-slate-700 font-medium">Derechos y aranceles de Notaría Pública y Registros.</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-emerald-600 font-bold">☑️</span>
                            <span className="text-slate-700 font-medium">Timbres fiscales, estampillas tributarias y papel sellado.</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-emerald-600 font-bold">☑️</span>
                            <span className="text-slate-700 font-medium">Fotocopias certificadas, traslados y movilización operativa.</span>
                          </div>
                        </div>
                      </div>

                      {/* Nota Legal Destacada */}
                      <div className="bg-amber-50/80 rounded-xl p-3 border border-amber-300/80 text-[11px] text-amber-900 space-y-1">
                        <strong className="block font-black text-amber-950 uppercase tracking-wide">
                          ⚖️ Advertencia Jurídica (Ley de Abogados):
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
                          <p className="text-[9.5px] text-slate-400">Firma del Cliente • C.I.</p>
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-xs leading-relaxed max-h-96 sm:max-h-[460px] overflow-y-auto whitespace-pre-wrap select-all border border-slate-800 shadow-inner">
                    {ANEXO_GASTOS_TEMPLATE}
                  </div>
                )}
              </div>

              {/* Pie de recomendación */}
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>💡 Separa siempre los gastos de los honorarios para rendición contable clara.</span>
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
