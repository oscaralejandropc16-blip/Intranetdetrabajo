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
  empleadoTelefono?: string;
  cedula: string;
  cargo: string;
  codTrabajador?: string;
  banco: string;
  tipoPago: 'Transferencia' | 'Pago Móvil' | 'Efectivo' | 'Zelle' | 'Otro';
  numeroCuenta?: string; // Número de cuenta bancaria (20 dígitos en Venezuela)
  tipoCuenta?: 'Corriente' | 'Ahorro';
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

export interface DocumentoPersonal {
  id: string;
  tipo: 'cedula' | 'rif' | 'residencia' | 'contrato' | 'cv' | 'titulo' | 'otro';
  nombre: string;
  url?: string;
  base64?: string;
  formato?: string;
  tamanio?: string;
  uploadedAt: string;
}

export interface NovedadPersonal {
  id: string;
  fecha: string;
  tipo: 'aumento' | 'permiso' | 'reposo' | 'observacion' | 'felicitacion' | 'acuerdo';
  titulo: string;
  descripcion: string;
  registradoPor: string;
}

export type DepartamentoPersonal = 'Legal' | 'Marketing' | 'Contabilidad' | 'Servicios Generales' | 'Sistemas' | 'Administración';
export type TipoContratacion = 'Nomina Interna' | 'Honorarios Profesionales' | 'Servicios Externos';

export interface PlantillaEmpleadoNomina {
  id: string;
  nombre: string;
  cedula: string;
  rif?: string;
  cargo: string;
  departamento?: DepartamentoPersonal;
  tipoContratacion?: TipoContratacion;
  fechaIngreso?: string;
  sueldoMensual: number;
  banco: string;
  tipoPago: 'Transferencia' | 'Pago Móvil' | 'Efectivo' | 'Zelle' | 'Otro';
  frecuenciaPago?: 'quincenal' | 'mensual_ultimo'; // 'quincenal' (15 y último) o 'mensual_ultimo' (un solo pago a fin de mes)
  numeroCuenta?: string; // Número de cuenta bancaria (20 dígitos)
  tipoCuenta?: 'Corriente' | 'Ahorro';
  telefono?: string;
  telefonoEmergencia?: string;
  email?: string;
  direccionHabitacion?: string;
  resumenPerfil?: string;
  documentos?: DocumentoPersonal[];
  novedades?: NovedadPersonal[];
}

// Plantilla oficial del Despacho Román & Delgado (Personal Empleado y Asociados)
export const EMPLEADOS_NOMINA_DEFAULT: PlantillaEmpleadoNomina[] = [
  { 
    id: 'emp_oscar', 
    nombre: 'Oscar Alejandro Pérez Calzadilla', 
    cedula: 'V-26.946.187', 
    cargo: 'Sistemas & Tecnología', 
    departamento: 'Sistemas',
    tipoContratacion: 'Honorarios Profesionales',
    sueldoMensual: 100, 
    banco: 'Banesco', 
    tipoPago: 'Pago Móvil', 
    telefono: '0414-1234567', 
    email: 'oscarpc20@romanydelgado.com' 
  },
  { 
    id: 'emp_carmen', 
    nombre: 'Carmen Luisa Delgado', 
    cedula: 'V-20.444.081', 
    cargo: 'Abogada / Gestión de Despacho', 
    departamento: 'Legal',
    tipoContratacion: 'Nomina Interna',
    sueldoMensual: 440, 
    banco: 'Venezuela', 
    tipoPago: 'Pago Móvil', 
    telefono: '0414-9876543', 
    email: 'abgcarmendelgado.990@gmail.com' 
  },
  { 
    id: 'emp_mariela', 
    nombre: 'Mariela Isabel', 
    cedula: 'V-15.421.890', 
    cargo: 'Asistente', 
    departamento: 'Legal',
    tipoContratacion: 'Nomina Interna',
    sueldoMensual: 80, 
    banco: 'Banesco', 
    tipoPago: 'Pago Móvil', 
    telefono: '0412-5556677',
    email: 'marielaisabel2030@gmail.com'
  },
  { 
    id: 'emp_hector', 
    nombre: 'Héctor Ramos', 
    cedula: 'V-22.189.543', 
    cargo: 'Asistente Legal / Procurador', 
    departamento: 'Legal',
    tipoContratacion: 'Nomina Interna',
    sueldoMensual: 64, 
    banco: 'Venezuela', 
    tipoPago: 'Pago Móvil', 
    telefono: '0416-1112233',
    email: 'hectorbann@gmail.com'
  },
  { 
    id: 'emp_doris', 
    nombre: 'Doris Rangel', 
    cedula: 'V-13.988.872', 
    cargo: 'Coordinador de Servicio & Mantenimiento', 
    departamento: 'Servicios Generales',
    tipoContratacion: 'Nomina Interna',
    sueldoMensual: 350, 
    banco: 'Tesoro', 
    tipoPago: 'Pago Móvil', 
    telefono: '0414-0000000',
    email: 'dorisrangel@romanydelgado.com'
  },
  { 
    id: 'emp_david', 
    nombre: 'Anthony David Moya', 
    cedula: 'V-27.123.456', 
    cargo: 'Asesor de Marketing & Redes Sociales', 
    departamento: 'Marketing',
    tipoContratacion: 'Honorarios Profesionales',
    sueldoMensual: 140, 
    banco: 'Tesoro', 
    tipoPago: 'Pago Móvil', 
    telefono: '0412-5415895',
    email: 'davidmoya@romanydelgado.com'
  },
  { 
    id: 'emp_contador', 
    nombre: 'Contador / Asesor Contable', 
    cedula: 'V-10.555.777', 
    cargo: 'Contador Público / Finanzas', 
    departamento: 'Contabilidad',
    tipoContratacion: 'Honorarios Profesionales',
    sueldoMensual: 200, 
    banco: 'Banesco', 
    tipoPago: 'Transferencia', 
    telefono: '0414-7778899',
    email: 'contabilidad@romanydelgado.com'
  }
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
