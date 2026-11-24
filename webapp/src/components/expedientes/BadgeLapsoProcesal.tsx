import { Calendar, Clock, AlertTriangle, ShieldCheck, Flame } from 'lucide-react';
import type { ControlProcesalExpediente } from '../../types/expedientes';
import { calcularComputoProcesal, formatearFechaCorta } from '../../lib/lapsosProcesales';

interface BadgeLapsoProcesalProps {
  control?: ControlProcesalExpediente;
  onOpenConfig?: () => void;
  compact?: boolean;
}

export default function BadgeLapsoProcesal({ control, onOpenConfig, compact = false }: BadgeLapsoProcesalProps) {
  if (!control || !control.etapaActualNombre) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenConfig?.();
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-300 border-dashed transition-all cursor-pointer"
        title="Configurar etapa procesal y cómputo de lapsos"
      >
        <Calendar className="w-3.5 h-3.5 text-slate-500" />
        <span>+ Etapa procesal</span>
      </button>
    );
  }

  const computo = calcularComputoProcesal(control);
  const { diasConsumidos, diasTotales, diasRestantes, estado, fechaEstimadaVencimiento, diasSinDespachoCount } = computo;

  const getStyle = () => {
    switch (estado) {
      case 'vencido':
        return {
          wrapper: 'bg-rose-50/90 text-rose-800 border-rose-200 hover:bg-rose-100/70',
          dot: 'bg-rose-500 animate-ping',
          icon: <Flame className="w-3.5 h-3.5 text-rose-600" />,
          badge: 'bg-rose-100 text-rose-700 border border-rose-200',
          label: 'Lapso Vencido'
        };
      case 'urgente':
        return {
          wrapper: 'bg-rose-50/70 text-rose-800 border-rose-200 hover:bg-rose-100/60',
          dot: 'bg-rose-500',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,
          badge: 'bg-rose-100 text-rose-700 border border-rose-200',
          label: `¡Urgente! Quedan ${diasRestantes}d`
        };
      case 'alerta':
        return {
          wrapper: 'bg-indigo-50/90 text-indigo-900 border-indigo-200 hover:bg-indigo-100/70',
          dot: 'bg-indigo-500',
          icon: <Clock className="w-3.5 h-3.5 text-indigo-600" />,
          badge: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
          label: `Atención: Quedan ${diasRestantes}d`
        };
      case 'holgado':
      default:
        return {
          wrapper: 'bg-emerald-50/90 text-emerald-900 border-emerald-200 hover:bg-emerald-100/70',
          dot: 'bg-emerald-500',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />,
          badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
          label: `En término (${diasRestantes}d restantes)`
        };
    }
  };

  const style = getStyle();

  if (compact) {
    return (
      <div 
        onClick={(e) => {
          e.stopPropagation();
          onOpenConfig?.();
        }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${style.wrapper} cursor-pointer hover:brightness-105 transition-all`}
        title={`Etapa: ${control.etapaActualNombre} | ${diasConsumidos}/${diasTotales} días de despacho | Vence: ${formatearFechaCorta(fechaEstimadaVencimiento || '')}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        <span className="truncate max-w-[120px] font-bold">{control.etapaActualNombre}</span>
        <span className="font-mono opacity-80">{diasConsumidos}/{diasTotales}d</span>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onOpenConfig?.();
      }}
      className={`group relative flex flex-col gap-1.5 p-3 rounded-xl border ${style.wrapper} transition-all cursor-pointer shadow-2xs hover:shadow-xs`}
      title="Clic para ver o gestionar el cómputo de días y calendario"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {style.icon}
          <span className="text-xs font-extrabold text-slate-900 truncate max-w-[160px]">
            {control.etapaActualNombre}
          </span>
        </div>
        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${style.badge}`}>
          {diasRestantes === 0 ? 'Concluido' : `${diasRestantes} días`}
        </span>
      </div>

      {/* Barra de progreso de días de despacho */}
      <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden flex items-center">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            estado === 'vencido' || estado === 'urgente'
              ? 'bg-rose-500'
              : estado === 'alerta'
              ? 'bg-indigo-500'
              : 'bg-emerald-500'
          }`}
          style={{ width: `${Math.min(100, Math.max(5, (diasConsumidos / diasTotales) * 100))}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
        <span>{diasConsumidos}/{diasTotales} días hábiles</span>
        {diasSinDespachoCount > 0 ? (
          <span className="text-indigo-700 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            {diasSinDespachoCount} sin despacho
          </span>
        ) : (
          <span>Vence: {formatearFechaCorta(fechaEstimadaVencimiento || '')}</span>
        )}
      </div>
    </div>
  );
}
