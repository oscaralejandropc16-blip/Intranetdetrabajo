export type CategoriaGasto = 
  | 'Fotocopias' 
  | 'Taxis / Traslados' 
  | 'Aranceles / Tasas' 
  | 'Timbres Fiscales' 
  | 'Almuerzo / Refrigerio' 
  | 'Papelería' 
  | 'Estacionamiento' 
  | 'Gestión Externa' 
  | 'Otro';

export type MonedaGasto = 'USD' | 'VES';

export type EstatusGasto = 'Borrador' | 'Pendiente' | 'Pagado' | 'Rechazado';

export type MetodoPagoGasto = 
  | 'Efectivo USD' 
  | 'Efectivo Bs' 
  | 'Transferencia Bs' 
  | 'Pago Móvil' 
  | 'Zelle' 
  | 'Binance / USDT' 
  | 'Otro';

export interface GastoItem {
  id: string;
  tramiteExpediente: string; // Ej: RD-J-2026-12779 o Gestión Notaría 2da
  categoria: CategoriaGasto;
  descripcion: string;
  moneda: MonedaGasto;
  monto: number;
  montoUsd: number;
  montoVes: number;
  comprobanteUrl?: string;
  comprobanteBase64?: string;
  comprobanteName?: string;
  fechaGasto: string; // YYYY-MM-DD
  horaGasto?: string; // HH:mm
}

export interface RelacionGastos {
  id: string | number;
  titulo: string;
  empleado: string;
  empleadoEmail?: string;
  fechaCreacion: string; // YYYY-MM-DD
  periodo: 'Semanal' | 'Quincenal' | 'Mensual' | 'Específico';
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string; // YYYY-MM-DD
  tasaBcv: number;
  items: GastoItem[];
  totalUsd: number;
  totalVes: number;
  estatus: EstatusGasto;
  fechaPago?: string;
  metodoPago?: MetodoPagoGasto;
  referenciaPago?: string;
  comentariosJefatura?: string;
  pagadoPor?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FiltroGastosPeriodo {
  tipo: 'todas' | 'esta_semana' | 'semana_anterior' | 'primera_quincena' | 'segunda_quincena' | 'este_mes' | 'personalizado';
  fechaInicio?: string;
  fechaFin?: string;
  empleado?: string;
  estatus?: 'todos' | EstatusGasto;
  busqueda?: string;
}
