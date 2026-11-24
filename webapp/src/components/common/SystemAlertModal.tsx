import { useEffect } from 'react';
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
  isDestructive?: boolean;
  badgeText?: string;
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
  cancelText = 'Cancelar',
  isDestructive = false,
  badgeText
}: SystemAlertModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-600 animate-in zoom-in duration-300" />,
          iconBox: 'bg-emerald-50 border-emerald-200/80',
          borderColor: 'border-blue-200',
          badgeText: 'Confirmado',
          badgeBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
          buttonBg: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-600 animate-in zoom-in duration-300" />,
          iconBox: 'bg-indigo-50 border-indigo-200/80',
          borderColor: 'border-indigo-200',
          badgeText: 'Atención',
          badgeBg: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
          buttonBg: 'bg-gradient-to-r from-[#172554] to-[#1d4ed8] hover:from-[#1e3a8a] hover:to-[#2563eb] text-white shadow-blue-900/25',
        };
      case 'error':
        return {
          icon: <XCircle className="w-10 h-10 sm:w-12 sm:h-12 text-rose-600 animate-in zoom-in duration-300" />,
          iconBox: 'bg-rose-50 border-rose-200/80',
          borderColor: 'border-rose-200',
          badgeText: 'Error del Sistema',
          badgeBg: 'bg-rose-50 text-rose-700 border border-rose-200/80',
          buttonBg: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20',
        };
      default:
        return {
          icon: <Info className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 animate-in zoom-in duration-300" />,
          iconBox: 'bg-blue-50 border-blue-200/80',
          borderColor: 'border-blue-200',
          badgeText: 'Información',
          badgeBg: 'bg-blue-50 text-blue-700 border border-blue-200/80',
          buttonBg: 'bg-gradient-to-r from-[#172554] to-[#1d4ed8] hover:from-[#1e3a8a] hover:to-[#2563eb] text-white shadow-blue-900/25',
        };
    }
  };

  const config = getConfig();
  const finalBadgeText = badgeText || config.badgeText;
  const finalButtonBg = isDestructive
    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25'
    : config.buttonBg;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white border-t sm:border ${config.borderColor} shadow-2xl shadow-blue-950/25 p-5 sm:p-8 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 safe-area-pb`}
      >
        {/* Drag handle móvil */}
        <div className="sm:hidden flex justify-center pb-2">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Botón X de cerrar en la esquina */}
        <button
          onClick={onClose}
          className="absolute top-4 sm:top-5 right-4 sm:right-5 text-slate-400 hover:text-slate-700 bg-slate-100/80 hover:bg-blue-50 rounded-full p-2 transition-colors cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Encabezado e Icono */}
        <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4 pt-1 sm:pt-0">
          <div className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs ${config.iconBox}`}>
            {config.icon}
          </div>

          <span
            className={`px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold uppercase tracking-widest ${config.badgeBg}`}
          >
            {finalBadgeText}
          </span>

          <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h3>

          <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed max-h-56 overflow-y-auto pr-2 whitespace-pre-wrap text-left">
            {message}
          </p>
        </div>

        {/* Botones de acción */}
        <div className={`mt-6 sm:mt-8 flex ${showCancel ? 'flex-col sm:flex-row gap-2.5 sm:gap-3' : 'flex-col'}`}>
          {showCancel && (
            <button
              onClick={onClose}
              className="w-full py-3.5 sm:py-4 px-5 sm:px-6 rounded-2xl font-bold text-sm transition-all duration-200 cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 active:scale-95"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={() => {
              if (onConfirm) onConfirm();
              else onClose();
            }}
            className={`w-full py-3.5 sm:py-4 px-5 sm:px-6 rounded-2xl font-bold text-sm transition-all duration-200 shadow-lg cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${finalButtonBg}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
