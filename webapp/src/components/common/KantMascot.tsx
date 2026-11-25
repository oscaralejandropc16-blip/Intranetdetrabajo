import { useState, useRef, useEffect, useMemo } from 'react';
import { X, ShieldCheck, Heart, ChevronRight, EyeOff } from 'lucide-react';
import {
  getEfemerideDelDia,
  getActiveDate,
  getDisfrazParaEfemeride
} from '../../lib/efemeridesVenezuela';
import KantCostumeOverlay from './KantCostumeOverlay';
import {
  getActiveFestiveTheme,
  type FestiveThemeId
} from '../../lib/themeManager';

interface KantMascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSpeechOnClick?: boolean;
  className?: string;
  userName?: string;
  soundEnabled?: boolean;
  roleBadge?: string;
  alignSpeech?: 'left' | 'center' | 'right';
  asDiv?: boolean;
}

const KANT_QUOTES = [
  '¡Guau! 🐾 Plataforma KANT activa y 100% al día.',
  '✨ ¡Excelente jornada de trabajo en Román & Delgado!',
  '🐶 Bitácoras, tasas BCV y gastos monitoreados en tiempo real.',
  '⚖️ ¡Cada caso y cliente cuenta! Seguimos avanzando con excelencia.',
  '🦴 ¿Sabías que las tasas BCV se actualizan automáticamente?',
  '🚀 ¡Todo en orden, jefe! Listo para supervisar el equipo.'
];

// Generador de sonido sintético amigable (Guau/Chime) sin dependencias externas
function playPlayfulChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Nota 1 (tono agudo y alegre)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.35);

    // Nota 2 armónica (segundo rebote estilo ladrido juguetón)
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
        osc2.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.15); // C6

        gain2.gain.setValueAtTime(0.12, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.3);
      } catch {
        // audio context safety
      }
    }, 90);
  } catch {
    // Si el navegador bloquea audio, no interrumpe la UI
  }
}

export default function KantMascot({
  size = 'sm',
  showSpeechOnClick = true,
  className = '',
  userName = '',
  soundEnabled = true,
  alignSpeech = size === 'sm' ? 'left' : 'center',
  asDiv = false
}: KantMascotProps) {
  const [isExcited, setIsExcited] = useState(false);
  const [showSpeech, setShowSpeech] = useState(false);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [showHearts, setShowHearts] = useState(false);
  const clickCount = useRef(0);
  const mascotRef = useRef<HTMLDivElement>(null);

  // Escuchar fecha activa (tiempo real del sistema o simulación en pruebas)
  const [currentDate, setCurrentDate] = useState<Date>(() => getActiveDate());
  // Tema festivo activo (automático o seleccionado manualmente)
  const [festiveTheme, setFestiveTheme] = useState<FestiveThemeId>(() => getActiveFestiveTheme());

  useEffect(() => {
    const handleDateChange = () => {
      setCurrentDate(getActiveDate());
      setFestiveTheme(getActiveFestiveTheme());
    };
    window.addEventListener('rd_simulated_date_changed', handleDateChange);
    window.addEventListener('rd_festive_theme_changed', handleDateChange);
    return () => {
      window.removeEventListener('rd_simulated_date_changed', handleDateChange);
      window.removeEventListener('rd_festive_theme_changed', handleDateChange);
    };
  }, []);

  // Efeméride de hoy para personalizar frases de Kant automáticamente
  const todayEfemeride = useMemo(() => {
    return getEfemerideDelDia(currentDate);
  }, [currentDate]);

  // Atuendo / Disfraz automático de Kant ("colocarse así")
  const disfrazInfo = useMemo(() => {
    return getDisfrazParaEfemeride(todayEfemeride);
  }, [todayEfemeride]);

  const activeQuotes = useMemo(() => {
    if (todayEfemeride && todayEfemeride.mensajeKant) {
      return [
        todayEfemeride.mensajeKant,
        ...KANT_QUOTES
      ];
    }
    return KANT_QUOTES;
  }, [todayEfemeride]);

  // Resetear índice de frase cuando cambia la efeméride
  useEffect(() => {
    setCurrentQuoteIndex(0);
  }, [todayEfemeride]);

  // Cerrar el globo de diálogo al hacer clic afuera
  useEffect(() => {
    if (!showSpeech) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (mascotRef.current && !mascotRef.current.contains(e.target as Node)) {
        setShowSpeech(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showSpeech]);

  const handleClick = () => {
    // Activa salto alegre
    setIsExcited(true);
    setTimeout(() => setIsExcited(false), 700);

    // Muestra partículas de corazón/chispas
    setShowHearts(true);
    setTimeout(() => setShowHearts(false), 1200);

    // Reproduce sonido alegre si está habilitado
    if (soundEnabled) {
      playPlayfulChime();
    }

    if (showSpeechOnClick) {
      clickCount.current += 1;
      setCurrentQuoteIndex((prev) => (prev + 1) % activeQuotes.length);
      setShowSpeech(true);
    }
  };

  // Dimensiones según tamaño
  const sizeClasses = {
    sm: 'h-9 w-9 sm:h-10 sm:w-10',
    md: 'h-14 w-14 sm:h-16 sm:w-16',
    lg: 'h-36 sm:h-44 md:h-52 w-auto',
    xl: 'h-52 sm:h-64 w-auto'
  }[size];

  return (
    <div ref={mascotRef} className={`relative inline-flex items-center justify-center select-none ${className}`}>


      {/* Partículas de Corazoncitos al hacer clic */}
      {showHearts && (
        <div className="absolute -top-4 pointer-events-none flex items-center gap-1 z-30 animate-bounce">
          <Heart className="w-4 h-4 text-rose-400 fill-rose-400 drop-shadow-md" />
        </div>
      )}

      {/* Contenedor Interactivo del Perrito con su Disfraz Automático */}
      {asDiv ? (
        <div
          className={`relative transition-transform duration-300 group flex items-center justify-center pointer-events-none select-none ${isExcited ? 'dog-excited' : 'dog-idle'
            }`}
        >
          <img
            src="/dog_logo.png"
            alt="KANT Mascota"
            className={`${sizeClasses} object-contain transition-all duration-300 drop-shadow-xs`}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextElementSibling) {
                e.currentTarget.nextElementSibling.classList.remove('hidden');
              }
            }}
          />
          <KantCostumeOverlay theme={festiveTheme} costumeType={disfrazInfo?.tipo} size={size} isExcited={isExcited} />
          <div className="hidden w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xs items-center justify-center shadow-md">
            K
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          aria-label="Kant Mascota"
          className={`relative cursor-pointer transition-transform duration-300 active:scale-95 group focus:outline-none flex items-center justify-center ${isExcited ? 'dog-excited' : 'dog-idle'
            }`}
        >
          <img
            src="/dog_logo.png"
            alt="KANT Mascota"
            className={`${sizeClasses} object-contain transition-all duration-300 drop-shadow-xs group-hover:scale-105`}
            onError={(e) => {
              // Respaldo de iniciales si la imagen fallara
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextElementSibling) {
                e.currentTarget.nextElementSibling.classList.remove('hidden');
              }
            }}
          />

          {/* Atuendo Vectorial de Alta Definición si hay Tema Festivo Activo o Efeméride Especial */}
          <KantCostumeOverlay theme={festiveTheme} costumeType={disfrazInfo?.tipo} size={size} isExcited={isExcited} />

          <div className="hidden w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xs items-center justify-center shadow-md">
            K
          </div>
        </button>
      )}

      {/* Globo de Diálogo Interactivo (Speech Bubble) Responsive */}
      {showSpeech && (
        <div
          className={`absolute top-full mt-2.5 z-[100] w-64 sm:w-72 max-w-[calc(100vw-2rem)] bg-white/98 backdrop-blur-2xl border border-blue-100 rounded-2xl p-3.5 shadow-2xl shadow-blue-950/15 text-left animate-in fade-in zoom-in-95 duration-200 ${alignSpeech === 'left'
            ? 'left-0'
            : alignSpeech === 'right'
              ? 'right-0'
              : 'left-1/2 -translate-x-1/2'
            }`}
        >
          {/* Triángulo indicador hacia el perrito */}
          <div
            className={`absolute -top-1.5 w-3 h-3 bg-white border-t border-l border-blue-100 rotate-45 ${alignSpeech === 'left'
              ? 'left-4'
              : alignSpeech === 'right'
                ? 'right-4'
                : 'left-1/2 -translate-x-1/2'
              }`}
          />

          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 text-blue-700 font-black text-xs uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>{disfrazInfo ? 'KANT celebra:' : 'KANT dice:'}</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSpeech(false);
              }}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-700 font-medium leading-relaxed">
            {activeQuotes[currentQuoteIndex]}
          </p>

          {disfrazInfo?.badgeLabel && (
            <div className="mt-2 flex items-center justify-between gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200/80">
              <span className="flex items-center gap-1.5 truncate">
                <ShieldCheck className="w-3 h-3 text-blue-600 shrink-0" />
                <span className="truncate">{disfrazInfo.badgeLabel}</span>
              </span>
            </div>
          )}

          <div className="mt-2.5 pt-2 border-t border-blue-50 flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {userName ? `Hola, ${userName}` : 'KANT Guardián'}
            </span>
            <span className="text-blue-600 font-bold hover:underline cursor-pointer" onClick={handleClick}>
              Siguiente tip
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Widget Flotante Opcional: Kant Companion / Asistente Guardián Responsive
export function KantFloatingCompanion({
  pendingReviews = 0,
  pendingGastos = 0,
  unreadReplies = 0,
  onNavigate
}: {
  pendingReviews?: number;
  pendingGastos?: number;
  unreadReplies?: number;
  onNavigate?: (tab: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    return localStorage.getItem('rd_kant_guardian_minimized') === 'true';
  });
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem('rd_kant_guardian_dismissed') === 'true';
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const totalAlerts = pendingReviews + pendingGastos + unreadReplies;

  // Cerrar al hacer clic o tocar afuera ("dar a un lado")
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isMinimized;
    setIsMinimized(next);
    localStorage.setItem('rd_kant_guardian_minimized', String(next));
    if (next) setIsOpen(false);
  };

  const handleDismiss = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsDismissed(true);
    sessionStorage.setItem('rd_kant_guardian_dismissed', 'true');
    setIsOpen(false);
  };

  if (isDismissed) {
    // Mini botón discreto en la esquina inferior para restaurar
    return (
      <button
        onClick={() => {
          setIsDismissed(false);
          sessionStorage.removeItem('rd_kant_guardian_dismissed');
        }}
        className="fixed bottom-2 right-2 z-40 bg-white/90 hover:bg-white text-blue-600 p-1.5 rounded-full border border-blue-200 text-[10px] font-bold shadow-lg backdrop-blur-md opacity-70 hover:opacity-100 transition-all cursor-pointer flex items-center gap-1"
        aria-label="Restaurar Kant Guardián"
      >
        <img src="/dog_logo.png" alt="KANT" className="w-4 h-4 object-contain" />
        {totalAlerts > 0 && (
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        )}
      </button>
    );
  }

  // Estado Minimizado (A un lado, estilo pestaña en el borde derecho para no estorbar)
  if (isMinimized) {
    return (
      <div
        ref={containerRef}
        className="fixed bottom-4 right-0 z-40 flex items-center transition-all duration-300"
      >
        <button
          onClick={handleToggleMinimize}
          className="bg-white/95 hover:bg-blue-50 border-l border-y border-blue-200 pl-2.5 pr-2 py-1.5 rounded-l-2xl shadow-xl backdrop-blur-xl flex items-center gap-1.5 text-blue-700 cursor-pointer hover:pl-3.5 transition-all group"
          aria-label="Expandir KANT Guardián"
        >
          <img src="/dog_logo.png" alt="KANT" className="w-4 h-4 object-contain" />
          {totalAlerts > 0 && (
            <span className="min-w-[16px] h-[16px] px-1 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-pulse">
              {totalAlerts}
            </span>
          )}
          <span className="text-[10px] font-black hidden group-hover:inline transition-all text-blue-700">
            KANT
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-40 flex flex-col items-end gap-2 font-sans select-none max-w-[calc(100vw-1.5rem)]"
    >
      {/* Menú Desplegable de Resumen KANT Guardián */}
      {isOpen && (
        <div className="w-[calc(100vw-2rem)] sm:w-72 max-w-xs bg-white border border-blue-200 rounded-3xl p-3.5 sm:p-4 shadow-2xl shadow-blue-950/20 text-slate-900 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-blue-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#172554] to-[#1d4ed8] flex items-center justify-center text-white shadow-sm">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black tracking-wide text-slate-900">KANT Guardián</h4>
                <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Sistema en línea
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleMinimize}
                title="Poner a un lado (minimizar al borde)"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-blue-50 transition-colors cursor-pointer"
                aria-label="Minimizar al borde"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Cerrar menú"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-blue-50 transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="py-3 space-y-2 text-xs">
            <button
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('bitacoras');
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between bg-blue-50/70 hover:bg-blue-50 p-2 rounded-xl border border-blue-100 hover:border-blue-200 transition-all text-left cursor-pointer active:scale-98"
            >
              <span className="text-slate-700 font-semibold">Bitácoras por revisar:</span>
              <span className="font-black text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                {pendingReviews}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('gastos');
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between bg-emerald-50/60 hover:bg-emerald-50 p-2 rounded-xl border border-emerald-100 hover:border-emerald-200 transition-all text-left cursor-pointer active:scale-98"
            >
              <span className="text-slate-700 font-semibold">Gastos por liquidar:</span>
              <span className="font-black text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                {pendingGastos}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('chat');
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between bg-indigo-50/60 hover:bg-indigo-50 p-2 rounded-xl border border-indigo-100 hover:border-indigo-200 transition-all text-left cursor-pointer active:scale-98"
            >
              <span className="text-slate-700 font-semibold">Mensajes de equipo:</span>
              <span className="font-black text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                {unreadReplies}
              </span>
            </button>
          </div>

          <div className="pt-2 border-t border-blue-50 flex items-center justify-between text-[10px] text-slate-500">
            <button
              onClick={handleToggleMinimize}
              className="text-blue-600 hover:underline cursor-pointer flex items-center gap-1 font-semibold"
            >
              <ChevronRight className="w-3 h-3" /> Poner a un lado
            </button>
            <button
              onClick={handleDismiss}
              className="hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1"
            >
              <EyeOff className="w-3 h-3" /> Ocultar guardián
            </button>
          </div>
        </div>
      )}

      {/* Botón Flotante con Perrito Animado y Acciones de Ocultar/Minimizar */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group relative flex items-center gap-2.5 bg-white/95 hover:bg-white border border-blue-100 hover:border-blue-200 p-2 pr-3.5 rounded-full shadow-xl shadow-blue-950/10 transition-all duration-300 hover:scale-105 cursor-pointer"
          aria-label="KANT Guardián"
        >
          <div className="relative">
            <KantMascot size="sm" showSpeechOnClick={false} soundEnabled={false} asDiv={true} />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center border-2 border-white shadow-md animate-pulse">
                {totalAlerts}
              </span>
            )}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-[11px] font-black text-blue-700 leading-tight flex items-center gap-1">
              KANT Guardián <ShieldCheck className="w-3 h-3 text-blue-600" />
            </p>
            <p className="text-[9px] text-slate-500 font-medium">
              {totalAlerts > 0 ? `${totalAlerts} pendientes` : 'Todo al día'}
            </p>
          </div>
        </button>

        {/* Botón rápido para poner a un lado sin abrir menú */}
        <button
          onClick={handleToggleMinimize}
          className="w-6 h-6 rounded-full bg-white/90 hover:bg-blue-50 text-slate-500 hover:text-blue-700 border border-blue-100 flex items-center justify-center shadow-md transition-all cursor-pointer opacity-80 hover:opacity-100"
          title="Poner a un lado"
          aria-label="Poner a un lado"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
