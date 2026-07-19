export interface Actuacion {
  id: string;
  hora: string;
  numeroAsunto: string;
  partes: string;
  actuacion: string;
  observaciones: string;
}

export interface Ingreso {
  id: string;
  numeroExpediente: string;
  fechaIngreso: string;
  horaIngreso: string;
  tipo: string;
  organismoTribunal?: string;
  partes: string;
  resumen: string;
  observaciones: string;
}

export interface Programacion {
  id: string;
  fecha: string;
  hora: string;
  organismoTribunal: string;
  tipoActuacion: string;
  resumen: string;
  observaciones: string;
}
