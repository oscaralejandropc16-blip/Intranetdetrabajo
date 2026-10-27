/**
 * Tipos de datos para el Módulo de Recibos de Honorarios y Facturación de Clientes
 * Román & Delgado — Sistema KANT
 */

export type TipoReciboCliente = 'Honorarios Profesionales' | 'Provisión de Gastos' | 'Consulta Legal';

export type MetodoPagoCliente = 
  | 'Efectivo Divisas ($)' 
  | 'Efectivo Bolívares (Bs.)' 
  | 'Transferencia Bancaria' 
  | 'Pago Móvil' 
  | 'Zelle' 
  | 'Otro';

export interface ReciboCliente {
  id: string;
  numeroRecibo: string;          // ej: "RD-REC-2026-001"
  tipoRecibo: TipoReciboCliente;  // Honorarios o Gastos
  clienteNombre: string;         // ej: "Aquiles..."
  clienteCedula: string;         // ej: "V-12.345.678"
  clienteTelefono?: string;
  clienteEmail?: string;
  clienteDireccion?: string;
  expedienteRelacionado?: string;// Nro o Asunto del caso
  concepto: string;              // Descripción del servicio legal o trámite
  monto: number;                 // Cantidad recibida
  moneda: 'USD' | 'VES';         // Dólares o Bolívares
  tasaBcv?: number;              // Tasa oficial en Bs/$ si aplica
  montoEquivalente?: number;     // Equivalente calculado
  metodoPago: MetodoPagoCliente; // Efectivo, Cuenta, Pago Móvil, Zelle
  bancoDestino?: string;         // Banesco, Mercantil, etc.
  referenciaPago?: string;       // Nro de referencia bancaria o comprobante
  fecha: string;                 // YYYY-MM-DD
  hora?: string;                 // HH:MM AM/PM
  abogadoReceptor: string;       // Abogado que atendió y recibió el dinero
  estado: 'Emitido' | 'Anulado';
  notasInternas?: string;
  created_at: string;
}

export interface ResumenRecibos {
  totalUsd: number;
  totalVes: number;
  totalEmitidos: number;
  totalHonorarios: number;
  totalGastos: number;
}
