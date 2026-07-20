import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type AlertType = 'success' | 'warning' | 'error' | 'info';

export interface SystemAlertModalProps {
  isOpen: boolean;
  type: AlertType;
  title: string;
  message: string;
  onClose: () => void;
  showCancel?: boolean;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function SystemAlertModal({
  isOpen,
  type,
  title,
  message,
  onClose,
  showCancel = false,
  onConfirm,
  confirmText = 'Entendido',
  cancelText = 'Cancelar'
}: SystemAlertModalProps) {
  if (!isOpen) return null;

  const getConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-in zoom-in duration-300" />,
          bgColor: 'from-emerald-500/10 to-emerald-500/5',
          borderColor: 'border-emerald-500/30',
          badgeText: 'éxito',
          badgeBg: 'bg-emerald-500/20 text-emerald-300',
          buttonBg: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-12 h-12 text-amber-400 animate-in zoom-in duration-300 animate-pulse" />,
          bgColor: 'from-amber-500/10 to-amber-500/5',
          borderColor: 'border-amber-500/30',
          badgeText: 'atención',
          badgeBg: 'bg-amber-500/20 text-amber-300',
          buttonBg: 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25',
        };
      case 'error':
        return {
          icon: <XCircle className="w-12 h-12 text-rose-400 animate-in zoom-in duration-300" />,
          bgColor: 'from-rose-500/10 to-rose-500/5',
          borderColor: 'border-rose-500/30',
          badgeText: 'error del sistema',
          badgeBg: 'bg-rose-500/20 text-rose-300',
          buttonBg: 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/25',
        };
      default:
        return {
          icon: <Info className="w-12 h-12 text-blue-400 animate-in zoom-in duration-300" />,
          bgColor: 'from-blue-500/10 to-blue-500/5',
          borderColor: 'border-blue-500/30',
          badgeText: 'información',
          badgeBg: 'bg-blue-500/20 text-blue-300',
          buttonBg: 'bg-blue-500 hover:bg-blue-400 text-white shadow-blue-500/25',
        };
    }
  };

  const config = getConfig();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-3xl bg-slate-900 border ${config.borderColor} shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200`}
      >
        {/* Glow de fondo */}
        <div
          className={`absolute -top-24 -right-24 w-48 h-48 rounded-full bg-gradient-to-br ${config.bgColor} blur-3xl pointer-events-none`}
        />

        {/* Botón X de cerrar en la esquina */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-full p-2 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado e Icono */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-inner">
            {config.icon}
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${config.badgeBg}`}
          >
            {config.badgeText}
          </span>

          <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
            {title}
          </h3>

          <p className="text-slate-300 text-sm md:text-base font-medium leading-relaxed max-h-60 overflow-y-auto pr-2 whitespace-pre-wrap text-left [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-800/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-500">
            {message}
          </p>
        </div>

        {/* Botones de acción */}
        <div className={`mt-8 flex ${showCancel ? 'flex-col sm:flex-row gap-3' : 'flex-col'}`}>
          {showCancel && (
            <button
              onClick={onClose}
              className="w-full py-4 px-6 rounded-2xl font-extrabold text-base transition-all duration-200 cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={() => {
              if (onConfirm) onConfirm();
              else onClose();
            }}
            className={`w-full py-4 px-6 rounded-2xl font-extrabold text-base transition-all duration-200 shadow-lg cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 ${config.buttonBg}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
