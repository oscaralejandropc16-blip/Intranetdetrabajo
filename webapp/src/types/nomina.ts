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
  comprobanteUrl?: string;
  comprobanteBase64?: string;
  comprobanteNombre?: string;
  
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
  modalidadLiquidacion?: 'quincenal' | 'mensual_completo';
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
  frecuenciaPago?: 'quincenal' | 'mensual_ultimo'; // 'quincenal' (15 y último) o 'mensual_ultimo' (un solo pago a fin de mes)
  telefono?: string;
  email?: string;
}

// Plantilla oficial del Despacho Román & Delgado (Equipo Real)
export const EMPLEADOS_NOMINA_DEFAULT: PlantillaEmpleadoNomina[] = [
  { id: 'emp_oscar', nombre: 'Oscar Alejandro Pérez Calzadilla', cedula: 'V-24.891.023', cargo: 'Sistemas & Tecnología', sueldoMensual: 250, banco: 'Banesco', tipoPago: 'Pago Móvil', email: 'oscarpc' },
  { id: 'emp_carmen', nombre: 'Carmen Luisa Delgado', cedula: 'V-12.338.408', cargo: 'Abogada / Gestión de Despacho', sueldoMensual: 200, banco: 'Banesco', tipoPago: 'Pago Móvil', email: 'abgcarmendelgado.990@gmail.com' },
  { id: 'emp_mariela', nombre: 'Mariela Isabel', cedula: 'V-15.421.890', cargo: 'Abogada Asociada', sueldoMensual: 250, banco: 'Banesco', tipoPago: 'Pago Móvil' },
  { id: 'emp_hector', nombre: 'Héctor', cedula: 'V-22.189.543', cargo: 'Asistente Legal / Procurador', sueldoMensual: 200, banco: 'Venezuela', tipoPago: 'Pago Móvil' },
  { id: 'emp_victor', nombre: 'Víctor Román', cedula: 'V-18.531.909', cargo: 'Socio Director', sueldoMensual: 500, banco: 'Banesco', tipoPago: 'Transferencia' },
  { id: 'emp_luis', nombre: 'Luis Delgado', cedula: 'V-25.451.018', cargo: 'Socio Director', sueldoMensual: 500, banco: 'Mercantil', tipoPago: 'Transferencia' },
];

// Plantilla de Ejemplo Solcargo (Modelo de referencia opcional)
export const PLANTILLA_EJEMPLO_SOLCARGO: PlantillaEmpleadoNomina[] = [
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
