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
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-amber-300 border border-slate-700 border-dashed transition-all"
        title="Configurar etapa procesal y cómputo de lapsos"
      >
        <Calendar className="w-3 h-3 text-slate-500" />
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
          wrapper: 'bg-rose-950/40 text-rose-300 border-rose-500/40',
          dot: 'bg-rose-500 animate-ping',
          icon: <Flame className="w-3.5 h-3.5 text-rose-400" />,
          label: 'Lapso Vencido'
        };
      case 'urgente':
        return {
          wrapper: 'bg-rose-900/30 text-rose-300 border-rose-500/30',
          dot: 'bg-rose-500',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
          label: `¡Urgente! Quedan ${diasRestantes}d`
        };
      case 'alerta':
        return {
          wrapper: 'bg-amber-950/40 text-amber-300 border-amber-500/40',
          dot: 'bg-amber-400',
          icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
          label: `Atención: Quedan ${diasRestantes}d`
        };
      case 'holgado':
      default:
        return {
          wrapper: 'bg-emerald-950/30 text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-400',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
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
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${style.wrapper} cursor-pointer hover:brightness-110 transition-all`}
        title={`Etapa: ${control.etapaActualNombre} | ${diasConsumidos}/${diasTotales} días de despacho | Vence: ${formatearFechaCorta(fechaEstimadaVencimiento || '')}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        <span className="truncate max-w-[110px]">{control.etapaActualNombre}</span>
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
      className={`group relative flex flex-col gap-1 p-2 rounded-xl border ${style.wrapper} bg-gradient-to-r from-slate-900/90 to-slate-900/40 hover:from-slate-800/90 transition-all cursor-pointer`}
      title="Clic para ver o gestionar el cómputo de días y calendario"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {style.icon}
          <span className="text-xs font-bold text-white truncate max-w-[150px]">
            {control.etapaActualNombre}
          </span>
        </div>
        <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-950/60 border border-slate-700/50">
          {diasRestantes === 0 ? 'Concluido' : `${diasRestantes} días`}
        </span>
      </div>

      {/* Barra de progreso de días de despacho */}
      <div className="w-full bg-slate-950/80 rounded-full h-1.5 overflow-hidden flex items-center">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            estado === 'vencido' || estado === 'urgente'
              ? 'bg-rose-500'
              : estado === 'alerta'
              ? 'bg-amber-400'
              : 'bg-emerald-400'
          }`}
          style={{ width: `${Math.min(100, Math.max(5, (diasConsumidos / diasTotales) * 100))}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
        <span>{diasConsumidos}/{diasTotales} días hábiles</span>
        {diasSinDespachoCount > 0 ? (
          <span className="text-amber-400 font-semibold flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            {diasSinDespachoCount} sin despacho
          </span>
        ) : (
          <span>Vence: {formatearFechaCorta(fechaEstimadaVencimiento || '')}</span>
        )}
      </div>
    </div>
  );
}
