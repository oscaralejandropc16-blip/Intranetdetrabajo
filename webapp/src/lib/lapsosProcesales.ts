import type { ControlProcesalExpediente, EtapaProcesalItem, ComputoResultado } from '../types/expedientes';

export interface PlantillaMateria {
  id: string;
  nombre: string;
  descripcion: string;
  etapas: EtapaProcesalItem[];
}

export const PLANTILLAS_PROCESALES: PlantillaMateria[] = [
  {
    id: 'civil_ordinario',
    nombre: 'Civil Ordinario (CPC)',
    descripcion: 'Procedimiento ordinario según el Código de Procedimiento Civil venezolano',
    etapas: [
      { id: 'civ_emp', nombre: 'Emplazamiento / Citación', diasHabiles: 20, descripcion: 'Lapso de comparecencia tras la citación' },
      { id: 'civ_cp', nombre: 'Cuestiones Previas', diasHabiles: 20, descripcion: 'Oposición de cuestiones previas dentro del emplazamiento' },
      { id: 'civ_cont', nombre: 'Contestación de la Demanda', diasHabiles: 5, descripcion: 'Al día siguiente del vencimiento del emplazamiento o subsanación' },
      { id: 'civ_prom', nombre: 'Promoción de Pruebas', diasHabiles: 15, descripcion: '15 días de despacho para promover todas las pruebas de las partes' },
      { id: 'civ_opos', nombre: 'Oposición a Pruebas', diasHabiles: 3, descripcion: '3 días de despacho para contradecir las pruebas de la contraparte' },
      { id: 'civ_adm', nombre: 'Admisión de Pruebas', diasHabiles: 3, descripcion: '3 días de despacho para que el juez admita o deseche pruebas' },
      { id: 'civ_evac', nombre: 'Evacuación de Pruebas', diasHabiles: 30, descripcion: '30 días de despacho para practicar testimoniales, experticias, etc.' },
      { id: 'civ_inf', nombre: 'Presentación de Informes', diasHabiles: 15, descripcion: 'Al 15to día de despacho tras concluir evacuación' },
      { id: 'civ_obs', nombre: 'Observaciones a Informes', diasHabiles: 8, descripcion: '8 días de despacho siguientes a la presentación de informes' },
      { id: 'civ_sent', nombre: 'Lapso para Sentencia Definitiva', diasHabiles: 60, descripcion: '60 días continuos para publicación de sentencia definitiva' }
    ]
  },
  {
    id: 'procedimiento_breve',
    nombre: 'Procedimiento Breve (CPC)',
    descripcion: 'Juicios de cuantía menor y procedimientos breves (Art. 881 CPC)',
    etapas: [
      { id: 'brv_cit', nombre: 'Emplazamiento al 2do día', diasHabiles: 2, descripcion: 'Comparecencia al segundo día de despacho tras citación' },
      { id: 'brv_cont', nombre: 'Contestación y Cuestiones Previas', diasHabiles: 2, descripcion: 'Contestación oral o escrita en el acto' },
      { id: 'brv_prob', nombre: 'Lapso Probatorio Conjunto', diasHabiles: 10, descripcion: '10 días de despacho para promover y evacuar pruebas' },
      { id: 'brv_sent', nombre: 'Sentencia Breve', diasHabiles: 5, descripcion: '5 días de despacho para dictar fallo' }
    ]
  },
  {
    id: 'via_ejecutiva',
    nombre: 'Vía Ejecutiva / Intimación',
    descripcion: 'Cobro de bolívares, letras de cambio, hipotecas y títulos ejecutivos',
    etapas: [
      { id: 'int_notif', nombre: 'Intimación y Medidas', diasHabiles: 10, descripcion: 'Decreto intimatorio y notificación del demandado' },
      { id: 'int_opos', nombre: 'Oposición a la Intimación', diasHabiles: 10, descripcion: '10 días de despacho para formular oposición formal' },
      { id: 'int_prob', nombre: 'Articulación Probatoria', diasHabiles: 8, descripcion: '8 días de despacho en caso de oposición' },
      { id: 'int_rem', nombre: 'Carteles y Remate Ejecutivo', diasHabiles: 15, descripcion: 'Fijación de carteles y justiprecio para remate' },
      { id: 'int_sent', nombre: 'Sentencia de Remate', diasHabiles: 30, descripcion: 'Adjudicación o resolución de oposición' }
    ]
  },
  {
    id: 'laboral_loptra',
    nombre: 'Laboral (LOPTRA)',
    descripcion: 'Tribunales de Sustanciación, Mediación y Juicio del Trabajo',
    etapas: [
      { id: 'lab_med', nombre: 'Audiencia Preliminar de Mediación', diasHabiles: 30, descripcion: 'Fase de conciliación ante tribunal de sustanciación' },
      { id: 'lab_cont', nombre: 'Contestación de la Demanda', diasHabiles: 5, descripcion: '5 días de despacho tras concluir preliminar sin acuerdo' },
      { id: 'lab_rem', nombre: 'Remisión a Tribunal de Juicio', diasHabiles: 5, descripcion: 'Envío del expediente al juez de juicio' },
      { id: 'lab_aud', nombre: 'Audiencia de Juicio Oral', diasHabiles: 30, descripcion: 'Fijación de audiencia oral de evacuación' },
      { id: 'lab_fallo', nombre: 'Publicación de Sentencia', diasHabiles: 5, descripcion: '5 días de despacho para publicar texto íntegro del fallo' }
    ]
  },
  {
    id: 'divorcio_familia',
    nombre: 'Familia / Divorcio',
    descripcion: 'Mutuo acuerdo (185-A), desafecto o contencioso',
    etapas: [
      { id: 'div_adm', nombre: 'Admisión y Citación / Ratificación', diasHabiles: 10, descripcion: 'Admisión y comparecencia de los cónyuges' },
      { id: 'div_med', nombre: 'Audiencia de Conciliación', diasHabiles: 15, descripcion: 'Comparecencia ante juez de familia o LOPNNA' },
      { id: 'div_prob', nombre: 'Lapso Probatorio (si contencioso)', diasHabiles: 15, descripcion: 'Promoción y evacuación de pruebas' },
      { id: 'div_sent', nombre: 'Sentencia y Emisión de Oficios', diasHabiles: 15, descripcion: 'Oficio al Registro Civil para nota marginal' }
    ]
  },
  {
    id: 'personalizado',
    nombre: 'Trámite Personalizado / Libre',
    descripcion: 'Configuración libre de etapas y lapsos a la medida',
    etapas: [
      { id: 'cust_tram', nombre: 'Trámite en curso', diasHabiles: 15, descripcion: 'Lapso configurable por el abogado' }
    ]
  }
];

export const MOTIVOS_SIN_DESPACHO_COMUNES = [
  'Falta de despacho por falta de Juez titular o accidental (Tribunal Acéfalo)',
  'Suspensión de despacho por contingencia eléctrica / técnica en sede judicial',
  'Paro judicial o asamblea de trabajadores del tribunal',
  'Día feriado judicial no laborable decretado por el TSJ / DEM',
  'Despacho cerrado por remodelación o fumigación de la sede',
  'Tribunal en inventario de causas / inspección judicial'
];

/**
 * Devuelve true si la fecha cae en Sábado (6) o Domingo (0).
 */
export function esFinDeSemana(fechaStr: string): boolean {
  try {
    const parts = fechaStr.split('-').map(Number);
    if (parts.length < 3) return false;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const day = d.getDay();
    return day === 0 || day === 6; // Domingo o Sábado
  } catch {
    return false;
  }
}

/**
 * Convierte un objeto Date a string YYYY-MM-DD
 */
export function aIsoFecha(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Formatea una fecha YYYY-MM-DD al formato amigable español (ej: 09 nov 2026)
 */
export function formatearFechaCorta(fechaIso: string): string {
  if (!fechaIso) return '—';
  try {
    const parts = fechaIso.split('-').map(Number);
    if (parts.length < 3) return fechaIso;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return fechaIso;
  }
}

/**
 * Obtiene la plantilla más adecuada según el texto de la materia/procedimiento
 */
export function sugerirPlantillaPorMateria(materiaOProcedimiento: string = ''): PlantillaMateria {
  const str = materiaOProcedimiento.toLowerCase();
  if (str.includes('laboral') || str.includes('trabajo') || str.includes('loptra')) {
    return PLANTILLAS_PROCESALES.find(p => p.id === 'laboral_loptra') || PLANTILLAS_PROCESALES[0];
  }
  if (str.includes('divorcio') || str.includes('familia') || str.includes('partición') || str.includes('lopnna')) {
    return PLANTILLAS_PROCESALES.find(p => p.id === 'divorcio_familia') || PLANTILLAS_PROCESALES[0];
  }
  if (str.includes('ejecutiv') || str.includes('intim') || str.includes('cobro') || str.includes('embargo') || str.includes('hipoteca')) {
    return PLANTILLAS_PROCESALES.find(p => p.id === 'via_ejecutiva') || PLANTILLAS_PROCESALES[0];
  }
  if (str.includes('breve') || str.includes('arrendamiento')) {
    return PLANTILLAS_PROCESALES.find(p => p.id === 'procedimiento_breve') || PLANTILLAS_PROCESALES[0];
  }
  return PLANTILLAS_PROCESALES.find(p => p.id === 'civil_ordinario') || PLANTILLAS_PROCESALES[0];
}

/**
 * Algoritmo de cómputo de lapsos procesales por días de despacho efectivo.
 * Considera:
 * - Días hábiles (Lunes a Viernes).
 * - Exclusión de Sábados y Domingos.
 * - Exclusión de días marcados como "Sin Despacho" (diasSinDespacho).
 * - Proyección exacta del día de vencimiento.
 */
export function calcularComputoProcesal(
  control?: ControlProcesalExpediente,
  fechaCorteIso?: string
): ComputoResultado {
  const hoyIso = fechaCorteIso || aIsoFecha(new Date());

  if (!control || !control.fechaInicioEtapa || !control.diasHabilesTotales || control.diasHabilesTotales <= 0) {
    return {
      diasConsumidos: 0,
      diasTotales: control?.diasHabilesTotales || 0,
      diasRestantes: control?.diasHabilesTotales || 0,
      porcentajeProgreso: 0,
      estado: 'sin_iniciar',
      fechaEstimadaVencimiento: null,
      diasSinDespachoCount: (control?.diasSinDespacho || []).length,
      diasSinDespachoEnRango: []
    };
  }

  const fechaInicioIso = control.fechaInicioEtapa;
  const diasTotales = control.diasHabilesTotales;
  const sinDespachoSet = new Set(control.diasSinDespacho || []);

  const [startY, startM, startD] = fechaInicioIso.split('-').map(Number);
  let cursor = new Date(startY, startM - 1, startD);

  let diasConsumidos = 0;
  let diasDespachoContados = 0;
  let fechaVencimientoIso: string | null = null;
  const sinDespachoEnRango: string[] = [];

  // Seguridad contra bucle infinito
  let safetyLoop = 0;
  const maxDaysToScan = 365;

  while (safetyLoop < maxDaysToScan) {
    safetyLoop++;
    const currentIso = aIsoFecha(cursor);
    const dayOfWeek = cursor.getDay();
    const esFinSemana = dayOfWeek === 0 || dayOfWeek === 6;
    const esSinDespacho = sinDespachoSet.has(currentIso);

    // Solo computa si no es fin de semana
    if (!esFinSemana) {
      if (esSinDespacho) {
        sinDespachoEnRango.push(currentIso);
      } else {
        // Es un día de despacho efectivo
        diasDespachoContados++;

        // Si la fecha evaluada es anterior o igual a hoy (o fechaCorte), cuenta como consumido
        if (currentIso <= hoyIso) {
          diasConsumidos++;
        }

        // Si acabamos de alcanzar el total de días de despacho requeridos por el lapso
        if (diasDespachoContados === diasTotales && !fechaVencimientoIso) {
          fechaVencimientoIso = currentIso;
        }
      }
    }

    // Si ya pasamos hoy y ya encontramos la fecha de vencimiento, podemos terminar
    if (currentIso > hoyIso && fechaVencimientoIso) {
      break;
    }

    // Avanzar un día
    cursor.setDate(cursor.getDate() + 1);
  }

  const diasRestantes = Math.max(0, diasTotales - diasConsumidos);
  const porcentaje = Math.min(100, Math.round((diasConsumidos / diasTotales) * 100));

  let estado: ComputoResultado['estado'] = 'holgado';
  if (diasConsumidos >= diasTotales) {
    estado = 'vencido';
  } else if (diasRestantes <= 2) {
    estado = 'urgente';
  } else if (diasRestantes <= 5) {
    estado = 'alerta';
  } else {
    estado = 'holgado';
  }

  return {
    diasConsumidos,
    diasTotales,
    diasRestantes,
    porcentajeProgreso: porcentaje,
    estado,
    fechaEstimadaVencimiento: fechaVencimientoIso,
    diasSinDespachoCount: (control.diasSinDespacho || []).length,
    diasSinDespachoEnRango: sinDespachoEnRango
  };
}

/**
 * Genera el texto estándar de actuación cuando se marca o desmarca un día sin despacho
 */
export function generarTextoActuacionSinDespacho(
  fechaIso: string,
  juzgado: string = 'Tribunal',
  motivo?: string,
  marcadoSinDespacho: boolean = true
): string {
  const fCorta = formatearFechaCorta(fechaIso);
  if (marcadoSinDespacho) {
    const razon = motivo ? ` (Motivo: ${motivo})` : '';
    return `CONSTANCIA DE NO DESPACHO: En fecha ${fCorta} no hubo despacho en ${juzgado}${razon}. Se suspende el curso de los lapsos procesales para este día hábil.`;
  } else {
    return `RECTIFICACIÓN DE DESPACHO: En fecha ${fCorta} se restablece cómputo de despacho en ${juzgado}.`;
  }
}

/**
 * Genera el texto estándar de actuación cuando se cambia o inicia una etapa procesal
 */
export function generarTextoCambioEtapa(
  etapaNombre: string,
  diasHabiles: number,
  fechaInicioIso: string
): string {
  const fCorta = formatearFechaCorta(fechaInicioIso);
  return `APERTURA DE ETAPA PROCESAL: Se fija etapa '${etapaNombre.toUpperCase()}' con un lapso legal de ${diasHabiles} días de despacho a partir del ${fCorta}.`;
}
