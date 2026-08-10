export interface ActuacionHistorial {
  id: string;
  fecha: string; // YYYY-MM-DD
  hora?: string;
  actuacion: string;
  estatusResultante: string;
  registradoPor?: string;
  observaciones?: string;
  documentoUrl?: string;
}

export interface ExpedienteJudicial {
  id: string;
  numeroExpediente: string; // ej. 57.380
  codigoCorrelativo?: string; // ej. RD-J-2026-12779
  juzgado: string; // ej. Tribunal 2do
  partes: string; // ej. José Sindonio De Sousa Texeira contra Francisco Texeira
  procedimiento: string; // ej. Reconocimiento de contenido y firma
  estatusActual: string; // ej. SENTENCIADO, FIJADO EL CARTEL
  sede: string; // ej. Valencia, Caracas
  fechaRegistro: string;
  ultimaActualizacion: string;
  responsableAsignado?: string;
  actuaciones: ActuacionHistorial[];
  observacionesGenerales?: string;
}

export interface AudienciaSemanal {
  id: string;
  expedienteId?: string;
  numeroExpediente: string;
  juzgado: string;
  partes: string;
  fechaAudiencia: string; // YYYY-MM-DD
  horaAudiencia: string; // HH:mm
  tipoAudiencia: string; // ej. Audiencia Preliminar, Juicio Oral, Conciliación
  estatus: 'Programada' | 'Realizada' | 'Diferida' | 'Cancelada';
  abogadoAsignado: string;
  notas?: string;
}

export interface AsuntoNuevo {
  id: string;
  cliente: string;
  materia: string;
  tribunalDestino: string;
  fechaEstimadaIntroduccion: string;
  estatus: 'Borrador' | 'En revisión' | 'Listo para introducir' | 'Ingresado';
  responsable: string;
  detalles: string;
}

export interface SeguimientoPendiente {
  id: string;
  numeroExpediente: string;
  descripcion: string; // ej. Retirar oficios de SUDEBAN
  fechaLimite: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  estatus: 'Pendiente' | 'En proceso' | 'Completado';
  asignadoA: string;
}
