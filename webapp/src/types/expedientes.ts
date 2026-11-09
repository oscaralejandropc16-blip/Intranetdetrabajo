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
  materia?: string; // ej. Civil Ordinario, Laboral, etc.
  estatusActual: string; // ej. SENTENCIADO, FIJADO EL CARTEL
  sede: string; // ej. Valencia, Caracas
  fechaRegistro: string;
  ultimaActualizacion: string;
  cliente?: string;
  responsableAsignado?: string;
  actuaciones: ActuacionHistorial[];
  observacionesGenerales?: string;
  controlProcesal?: ControlProcesalExpediente;
}

export interface EtapaProcesalItem {
  id: string;
  nombre: string;
  diasHabiles: number; // días de despacho
  descripcion?: string;
}

export interface DetalleDiaSinDespacho {
  fecha: string; // YYYY-MM-DD
  motivo?: string; // ej. Paro judicial, Falta de juez, etc.
  registradoPor?: string;
  registradoEn?: string; // ISO string
}

export interface ControlProcesalExpediente {
  materia?: string; // ej. Civil Ordinario, Procedimiento Breve, Laboral, Divorcio, Personalizado
  etapaActualId?: string;
  etapaActualNombre?: string;
  fechaInicioEtapa?: string; // YYYY-MM-DD
  diasHabilesTotales?: number; // total de días de despacho del lapso
  diasSinDespacho?: string[]; // lista de fechas YYYY-MM-DD sin despacho
  detallesSinDespacho?: Record<string, DetalleDiaSinDespacho>;
  etapasPersonalizadas?: EtapaProcesalItem[];
  notasProcesales?: string;
  fechaLimiteEstimada?: string; // calculada automáticamente
}

export interface ComputoResultado {
  diasConsumidos: number; // días de despacho transcurridos
  diasTotales: number;
  diasRestantes: number;
  porcentajeProgreso: number;
  estado: 'holgado' | 'alerta' | 'urgente' | 'vencido' | 'sin_iniciar';
  fechaEstimadaVencimiento: string | null;
  diasSinDespachoCount: number;
  diasSinDespachoEnRango: string[];
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
