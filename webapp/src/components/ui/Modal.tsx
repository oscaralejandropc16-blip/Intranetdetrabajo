import React, { useEffect, useCallback, useRef } from 'react';
import { cn } from './cn';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Modal max-width on desktop */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Title shown in the modal header */
  title?: string;
  /** Description below title */
  description?: string;
  /** Icon/element shown next to the title */
  icon?: React.ReactNode;
  /** Whether to show the close (X) button */
  showClose?: boolean;
  /** Whether clicking the backdrop closes the modal */
  closeOnBackdrop?: boolean;
  /** Whether pressing Escape closes the modal */
  closeOnEscape?: boolean;
  /** On mobile (<640px), render as a bottom sheet instead of centered */
  mobileSheet?: boolean;
  /** Additional class for the modal panel */
  className?: string;
  /** Footer content (action buttons, etc.) */
  footer?: React.ReactNode;
}

const sizeStyles: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-5xl',
};

export function Modal({
  isOpen,
  onClose,
  children,
  size = 'md',
  title,
  description,
  icon,
  showClose = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  mobileSheet = true,
  className,
  footer,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [isOpen]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Focus trap: focus the panel when opened
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full bg-white border border-blue-200 shadow-2xl shadow-blue-950/25 outline-none overflow-hidden',
          // Desktop: centered modal with scale animation
          'sm:rounded-2xl sm:mx-4 sm:animate-in sm:zoom-in-95 sm:fade-in sm:duration-200',
          // Mobile: bottom sheet with slide-up (when mobileSheet is true)
          mobileSheet
            ? 'rounded-t-3xl max-h-[92vh] animate-in slide-in-from-bottom duration-300'
            : 'rounded-2xl mx-4 animate-in zoom-in-95 fade-in duration-200 max-h-[90vh]',
          sizeStyles[size],
          className
        )}
      >
        {/* Drag handle for mobile sheet */}
        {mobileSheet && (
          <div className="sm:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-slate-300 rounded-full" />
          </div>
        )}

        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-4 sm:pt-5 pb-3">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-600 shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h2 id="modal-title" className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5 truncate">
                    {description}
                  </p>
                )}
              </div>
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className={cn(
          'overflow-y-auto',
          'px-5 sm:px-6',
          title ? 'pb-5 sm:pb-6' : 'py-5 sm:py-6',
          footer ? '' : 'pb-6 sm:pb-7',
          // Max height accounting for header and footer
          'max-h-[calc(92vh-140px)] sm:max-h-[calc(85vh-140px)]'
        )}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
