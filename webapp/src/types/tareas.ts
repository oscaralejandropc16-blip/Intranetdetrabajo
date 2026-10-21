export interface TareaAsignada {
  id: number;
  asignado_por: string;
  asignado_a: string;
  asignado_a_nombre?: string;
  titulo: string;
  descripcion?: string;
  expediente_asociado?: string;
  fecha_limite?: string;
  prioridad: 'urgente' | 'alta' | 'normal' | 'baja';
  estado: 'pendiente' | 'en_progreso' | 'en_proceso' | 'completada' | 'cancelada';
  respuesta_empleado?: string | null;
  completada_en?: string | null;
  created_at: string;
}
