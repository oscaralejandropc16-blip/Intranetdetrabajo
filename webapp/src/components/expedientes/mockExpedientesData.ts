import type { ExpedienteJudicial, AudienciaSemanal, AsuntoNuevo, SeguimientoPendiente } from '../../types/expedientes';

export const INITIAL_EXPEDIENTES: ExpedienteJudicial[] = [
  {
    id: 'exp-1',
    numeroExpediente: '57.380',
    codigoCorrelativo: 'RD-J-2026-57380',
    juzgado: 'Tribunal 2do',
    partes: 'José Sindonio De Sousa Texeira contra Francisco Texeira',
    procedimiento: 'Reconocimiento de contenido y firma',
    estatusActual: 'SENTENCIADO',
    sede: 'Valencia',
    fechaRegistro: '2026-08-01',
    ultimaActualizacion: '2026-08-08',
    responsableAsignado: 'Dr. Víctor Román',
    observacionesGenerales: 'Expediente con sentencia firme homologada.',
    actuaciones: [
      {
        id: 'act-1-1',
        fecha: '2026-08-08',
        hora: '10:30',
        actuacion: 'RECIBIDAS COPIAS CERTIFICADAS DE LA HOMOLOGACIÓN.-',
        estatusResultante: 'SENTENCIADO',
        registradoPor: 'Dra. Patricia Silva',
        observaciones: 'Se archivó copia en expediente físico de oficina.'
      },
      {
        id: 'act-1-0',
        fecha: '2026-08-02',
        hora: '09:00',
        actuacion: 'Solicitud de homologación de acuerdo formalizada en tribunal.',
        estatusResultante: 'EN TRÁMITE',
        registradoPor: 'Abog. Luis Delgado'
      }
    ]
  },
  {
    id: 'exp-2',
    numeroExpediente: '57.371',
    codigoCorrelativo: 'RD-J-2026-57371',
    juzgado: 'Tribunal 2do',
    partes: 'Sousa y Gomes',
    procedimiento: 'Cobro de Bolívares por vía ejecutiva',
    estatusActual: 'FIJADO EL CARTEL',
    sede: 'Valencia',
    fechaRegistro: '2026-08-01',
    ultimaActualizacion: '2026-08-07',
    responsableAsignado: 'Abog. Luis Delgado',
    actuaciones: [
      {
        id: 'act-2-1',
        fecha: '2026-08-07',
        hora: '11:15',
        actuacion: 'SOLICITUD DE EMBARGO EJECUTIVO',
        estatusResultante: 'FIJADO EL CARTEL',
        registradoPor: 'Abog. Luis Delgado',
        observaciones: 'Se fijó cartel de remate en cartelera del tribunal.'
      }
    ]
  },
  {
    id: 'exp-3',
    numeroExpediente: '56.748',
    codigoCorrelativo: 'RD-J-2026-56748',
    juzgado: 'Tribunal 2do',
    partes: 'Pedro Linares',
    procedimiento: 'Acción Reivindicatoria',
    estatusActual: 'EN ESPERA DE PRONUNCIAMIENTO',
    sede: 'Valencia',
    fechaRegistro: '2026-07-15',
    ultimaActualizacion: '2026-08-06',
    responsableAsignado: 'Dr. Víctor Román',
    actuaciones: [
      {
        id: 'act-3-1',
        fecha: '2026-08-06',
        hora: '12:00',
        actuacion: 'SOLICITUD DE SENTENCIA DEFINITIVA',
        estatusResultante: 'EN ESPERA DE PRONUNCIAMIENTO',
        registradoPor: 'Dr. Víctor Román',
        observaciones: 'Causa vista para fallo.'
      }
    ]
  },
  {
    id: 'exp-4',
    numeroExpediente: '12.779',
    codigoCorrelativo: 'RD-J-2026-12779',
    juzgado: 'Tribunal 4to',
    partes: 'Montero-Contreras',
    procedimiento: 'Divorcio Mutuo Acuerdo',
    estatusActual: 'SENTENCIADO Y OFICIADO',
    sede: 'Valencia',
    fechaRegistro: '2026-06-10',
    ultimaActualizacion: '2026-08-05',
    responsableAsignado: 'Dra. Patricia Silva',
    actuaciones: [
      {
        id: 'act-4-1',
        fecha: '2026-08-05',
        hora: '10:00',
        actuacion: 'RECIBIDAS COPIAS CERTIFICADAS DE LA SENTENCIA Y EMISIÓN DE OFICIOS AL REGISTRO CIVIL',
        estatusResultante: 'SENTENCIADO Y OFICIADO',
        registradoPor: 'Dra. Patricia Silva'
      }
    ]
  },
  {
    id: 'exp-5',
    numeroExpediente: 'Prov-V-2023-001113',
    codigoCorrelativo: 'RD-J-2026-001113',
    juzgado: '1 Juicio TP',
    partes: 'Karyl Zapata contra Orlando Cordero',
    procedimiento: 'Partición Judicial',
    estatusActual: 'TRÁMITE DE OFICIOS SUDEBAN',
    sede: 'Valencia',
    fechaRegistro: '2023-11-12',
    ultimaActualizacion: '2026-08-09',
    responsableAsignado: 'Abog. Luis Delgado',
    actuaciones: [
      {
        id: 'act-5-1',
        fecha: '2026-08-09',
        hora: '09:45',
        actuacion: 'SE RETIRARON LOS OFICIOS DIRIGIDOS A SUDEBAN Y AL REGISTRO MERCANTIL PRIMERO DEL ESTADO CARABOBO',
        estatusResultante: 'TRÁMITE DE OFICIOS SUDEBAN',
        registradoPor: 'Abog. Luis Delgado',
        observaciones: 'Pendiente entrega física en la entidad bancaria.'
      }
    ]
  },
  {
    id: 'exp-6',
    numeroExpediente: 'Prov-J-2025-002403',
    codigoCorrelativo: 'RD-J-2026-002403',
    juzgado: 'Tribunal 7mo MSE',
    partes: 'Nataly Feres',
    procedimiento: 'Divorcio',
    estatusActual: 'TRIBUNAL ACÉFALO',
    sede: 'Valencia',
    fechaRegistro: '2025-04-20',
    ultimaActualizacion: '2026-08-08',
    responsableAsignado: 'Dr. Víctor Román',
    actuaciones: [
      {
        id: 'act-6-1',
        fecha: '2026-08-08',
        hora: '11:00',
        actuacion: 'NO HUBO DESPACHO (DESPACHO SUSPENDIDO POR FALTA DE JUEZ APODERADO)',
        estatusResultante: 'TRIBUNAL ACÉFALO',
        registradoPor: 'Asistente Legal',
        observaciones: 'Verificar nueva designación de juez la próxima semana.'
      }
    ]
  },
  {
    id: 'exp-7',
    numeroExpediente: 'Prov-J-2026-001974',
    codigoCorrelativo: 'RD-J-2026-001974',
    juzgado: 'Tribunal 1ro MSE',
    partes: 'Tulio Zambrano contra Gabriela González',
    procedimiento: 'Divorcio',
    estatusActual: 'POR RETIRAR COPIAS',
    sede: 'Valencia',
    fechaRegistro: '2026-03-15',
    ultimaActualizacion: '2026-08-09',
    responsableAsignado: 'Dra. Patricia Silva',
    actuaciones: [
      {
        id: 'act-7-1',
        fecha: '2026-08-09',
        hora: '10:30',
        actuacion: 'REALIZADA AUDIENCIA PRELIMINAR DE CONCILIACIÓN',
        estatusResultante: 'POR RETIRAR COPIAS',
        registradoPor: 'Dra. Patricia Silva',
        observaciones: 'Acuerdo homologado. Pendiente emisión de copias simples.'
      }
    ]
  },
  {
    id: 'exp-8',
    numeroExpediente: 'CI-2023-71923',
    codigoCorrelativo: 'RD-J-2026-71923',
    juzgado: 'Juicio 6',
    partes: 'Laura Pompa',
    procedimiento: 'Invasión',
    estatusActual: 'SENTENCIADO',
    sede: 'Valencia',
    fechaRegistro: '2023-09-01',
    ultimaActualizacion: '2026-08-07',
    responsableAsignado: 'Dr. Víctor Román',
    actuaciones: [
      {
        id: 'act-8-1',
        fecha: '2026-08-07',
        hora: '14:00',
        actuacion: 'SE RETIRARON LAS COPIAS CERTIFICADAS DE LA SENTENCIA DE SOBRESEIMIENTO',
        estatusResultante: 'SENTENCIADO',
        registradoPor: 'Dr. Víctor Román',
        observaciones: 'Causa sobreseída definitivamente.'
      }
    ]
  }
];

export const INITIAL_AUDIENCIAS: AudienciaSemanal[] = [
  {
    id: 'aud-1',
    expedienteId: 'exp-7',
    numeroExpediente: 'Prov-J-2026-001974',
    juzgado: 'Tribunal 1ro MSE',
    partes: 'Tulio Zambrano vs. Gabriela González',
    fechaAudiencia: '2026-08-12',
    horaAudiencia: '09:30',
    tipoAudiencia: 'Audiencia de Pruebas',
    estatus: 'Programada',
    abogadoAsignado: 'Dra. Patricia Silva',
    notas: 'Llevar los originales de la prueba documental.'
  },
  {
    id: 'aud-2',
    expedienteId: 'exp-2',
    numeroExpediente: '57.371',
    juzgado: 'Tribunal 2do',
    partes: 'Sousa y Gomes',
    fechaAudiencia: '2026-08-14',
    horaAudiencia: '10:30',
    tipoAudiencia: 'Ejecución de Embargo',
    estatus: 'Programada',
    abogadoAsignado: 'Abog. Luis Delgado',
    notas: 'Coordinar traslado del tribunal y depositario judicial.'
  }
];

export const INITIAL_ASUNTOS_NUEVOS: AsuntoNuevo[] = [
  {
    id: 'asn-1',
    cliente: 'Corporación Inmobiliaria del Centro C.A.',
    materia: 'Desalojo de Inmueble Comercial',
    tribunalDestino: 'Tribunal de Municipio Valencia',
    fechaEstimadaIntroduccion: '2026-08-13',
    estatus: 'Listo para introducir',
    responsable: 'Abog. Luis Delgado',
    detalles: 'Libel de demanda revisado y aranceles pagados.'
  },
  {
    id: 'asn-2',
    cliente: 'Roberto Mendonça',
    materia: 'Cumplimiento de Contrato de Compraventa',
    tribunalDestino: 'Tribunal 3ro de Primera Instancia Civil',
    fechaEstimadaIntroduccion: '2026-08-15',
    estatus: 'En revisión',
    responsable: 'Dr. Víctor Román',
    detalles: 'Falta anexo de poder notariado legalizado.'
  }
];

export const INITIAL_SEGUIMIENTOS: SeguimientoPendiente[] = [
  {
    id: 'seg-1',
    numeroExpediente: 'Prov-V-2023-001113',
    descripcion: 'Consignar oficio de retención en sede principal de SUDEBAN',
    fechaLimite: '2026-08-11',
    prioridad: 'Alta',
    estatus: 'En proceso',
    asignadoA: 'Abog. Luis Delgado'
  },
  {
    id: 'seg-2',
    numeroExpediente: 'Prov-J-2026-001974',
    descripcion: 'Retirar copias simples certificadas en el Tribunal 1ro MSE',
    fechaLimite: '2026-08-12',
    prioridad: 'Media',
    estatus: 'Pendiente',
    asignadoA: 'Dra. Patricia Silva'
  },
  {
    id: 'seg-3',
    numeroExpediente: 'Prov-J-2025-002403',
    descripcion: 'Verificar si se nombró nuevo Juez accidental en Tribunal 7mo MSE',
    fechaLimite: '2026-08-13',
    prioridad: 'Baja',
    estatus: 'Pendiente',
    asignadoA: 'Asistente Legal'
  }
];

// Helper functions for Local Storage persistence
const LOCAL_STORAGE_KEY_EXP = 'rd_expedientes_list_v1';
const LOCAL_STORAGE_KEY_AUD = 'rd_audiencias_list_v1';
const LOCAL_STORAGE_KEY_ASN = 'rd_asuntos_nuevos_v1';
const LOCAL_STORAGE_KEY_SEG = 'rd_seguimientos_v1';

export function getStoredExpedientes(): ExpedienteJudicial[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_EXP);
    if (raw) {
      const parsed: ExpedienteJudicial[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let needsSave = false;
        const migrated = parsed.map(item => {
          const baseMatch = INITIAL_EXPEDIENTES.find(init => init.numeroExpediente === item.numeroExpediente || init.id === item.id);
          const expDigits = (item.numeroExpediente.match(/\d+/g) || []).join('');
          const defaultCorrelativo = baseMatch?.codigoCorrelativo || `RD-J-2026-${expDigits || '0000'}`;

          if (!item.codigoCorrelativo) {
            needsSave = true;
            return { ...item, codigoCorrelativo: defaultCorrelativo };
          }
          return item;
        });

        if (needsSave) {
          localStorage.setItem(LOCAL_STORAGE_KEY_EXP, JSON.stringify(migrated));
        }

        return migrated;
      }
    }
  } catch (e) {
    console.error('Error cargando expedientes guardados', e);
  }
  return INITIAL_EXPEDIENTES;
}

export function saveStoredExpedientes(data: ExpedienteJudicial[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_EXP, JSON.stringify(data));
  } catch (e) {
    console.error('Error guardando expedientes', e);
  }
}

export function getStoredAudiencias(): AudienciaSemanal[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_AUD);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error cargando audiencias guardadas', e);
  }
  return INITIAL_AUDIENCIAS;
}

export function saveStoredAudiencias(data: AudienciaSemanal[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_AUD, JSON.stringify(data));
  } catch (e) {
    console.error('Error guardando audiencias', e);
  }
}

export function getStoredAsuntosNuevos(): AsuntoNuevo[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_ASN);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error cargando asuntos nuevos', e);
  }
  return INITIAL_ASUNTOS_NUEVOS;
}

export function saveStoredAsuntosNuevos(data: AsuntoNuevo[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_ASN, JSON.stringify(data));
  } catch (e) {
    console.error('Error guardando asuntos nuevos', e);
  }
}

export function getStoredSeguimientos(): SeguimientoPendiente[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_SEG);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error cargando seguimientos', e);
  }
  return INITIAL_SEGUIMIENTOS;
}

export function saveStoredSeguimientos(data: SeguimientoPendiente[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_SEG, JSON.stringify(data));
  } catch (e) {
    console.error('Error guardando seguimientos', e);
  }
}
