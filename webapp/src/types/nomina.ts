export interface ConceptoNomina {
  id: string;
  concepto: string;
  dht?: string; // Días / Horas / Tasa (ej. "11 DIAS", "4 DIAS", "2 Lunes", "1.00%")
  devengado?: number;
  deduccion?: number;
}

export interface ReciboNomina {
  id: string;
  numeroRecibo: string; // ej: "RD-2026-0001"
  empleadoNombre: string;
  empleadoEmail?: string;
  cedula: string;
  cargo: string;
  codTrabajador?: string;
  banco: string;
  tipoPago: 'Transferencia' | 'Pago Móvil' | 'Efectivo' | 'Zelle' | 'Otro';
  referenciaPago?: string;
  
  // Período
  quincena: 1 | 2;
  mes: number; // 1-12
  anio: number;
  periodoInicio: string; // YYYY-MM-DD
  periodoFin: string; // YYYY-MM-DD

  // Moneda y montos
  monedaPrincipal: 'USD' | 'VES';
  tasaCambio: number; // Tasa oficial referencial (ej: 499.61 o BCV)
  sueldoBaseMensual: number;
  sueldoQuincenalBase: number;
  diasLaborados: number; // por defecto 11
  diasDescanso: number; // por defecto 4
  
  // Desglose
  conceptos: ConceptoNomina[];
  totalDevengado: number;
  totalDeducciones: number;
  netoPagarUsd: number;
  netoPagarVes: number;

  // Estado y emisión
  estado: 'borrador' | 'pagado';
  fechaPago?: string; // YYYY-MM-DD HH:mm
  emitidoPor?: string;
  observaciones?: string;
  notificacionEnviada?: boolean;
  createdAt: string;
}

export interface PlantillaEmpleadoNomina {
  id: string;
  nombre: string;
  cedula: string;
  cargo: string;
  sueldoMensual: number;
  banco: string;
  tipoPago: 'Transferencia' | 'Pago Móvil' | 'Efectivo' | 'Zelle' | 'Otro';
}

// Plantilla extraída directamente de la base de datos oficial del Excel de Román & Delgado
export const EMPLEADOS_NOMINA_DEFAULT: PlantillaEmpleadoNomina[] = [
  { id: 'emp_1', nombre: 'Victor Roman', cedula: 'V-18.531.909', cargo: 'Socio Director', sueldoMensual: 500, banco: 'Banesco', tipoPago: 'Transferencia' },
  { id: 'emp_2', nombre: 'Luis Delgado', cedula: 'V-25.451.018', cargo: 'Socio Director', sueldoMensual: 500, banco: 'Mercantil', tipoPago: 'Transferencia' },
  { id: 'emp_3', nombre: 'Carlos Almeida', cedula: 'V-9.820.585', cargo: 'Abogado Asociado', sueldoMensual: 700, banco: 'Banesco', tipoPago: 'Transferencia' },
  { id: 'emp_4', nombre: 'Olberlys Hernandez', cedula: 'V-17.458.419', cargo: 'Asistente Legal', sueldoMensual: 400, banco: 'Banesco', tipoPago: 'Pago Móvil' },
  { id: 'emp_5', nombre: 'Elizabeth Brea', cedula: 'V-9.901.781', cargo: 'Asistente Legal', sueldoMensual: 400, banco: 'Mercantil', tipoPago: 'Pago Móvil' },
  { id: 'emp_6', nombre: 'Yudith Alejandra Romero', cedula: 'V-20.665.919', cargo: 'Abogado Senior', sueldoMensual: 500, banco: 'Banesco', tipoPago: 'Transferencia' },
  { id: 'emp_7', nombre: 'Susana Brazon', cedula: 'V-4.626.273', cargo: 'Asistente Administrativo', sueldoMensual: 300, banco: 'Venezuela', tipoPago: 'Pago Móvil' },
  { id: 'emp_8', nombre: 'Carmen Luisa', cedula: 'V-12.338.408', cargo: 'Asistente Legal', sueldoMensual: 200, banco: 'Banesco', tipoPago: 'Pago Móvil' },
  { id: 'emp_9', nombre: 'German Goite', cedula: 'V-11.420.086', cargo: 'Procurador / Asistente', sueldoMensual: 240, banco: 'Banesco', tipoPago: 'Pago Móvil' },
  { id: 'emp_10', nombre: 'Yolly Gonzalez', cedula: 'V-12.668.575', cargo: 'Asistente', sueldoMensual: 200, banco: 'Venezuela', tipoPago: 'Pago Móvil' },
  { id: 'emp_11', nombre: 'Simon Linares Espinoza', cedula: 'V-17.555.818', cargo: 'Asistente', sueldoMensual: 250, banco: 'Banesco', tipoPago: 'Pago Móvil' },
  { id: 'emp_12', nombre: 'Robin Perez', cedula: 'V-8.634.386', cargo: 'Consultor Jurídico', sueldoMensual: 1000, banco: 'Banesco', tipoPago: 'Transferencia' },
];
