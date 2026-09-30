import { useState, useRef, useEffect, useMemo } from 'react';
import { Sparkles, X, ShieldCheck, Heart, ChevronRight, EyeOff } from 'lucide-react';
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
  alignSpeech = size === 'sm' ? 'left' : 'center'
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

  // Auto-saludo automático si hoy es un día especial de efeméride
  useEffect(() => {
    if (!todayEfemeride || !showSpeechOnClick) return;
    
    // Identificador único para saludar automáticamente una vez por sesión
    const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;
    const sessionKey = `rd_kant_auto_greeted_${todayEfemeride.id}_${dateKey}`;
    const alreadyGreeted = sessionStorage.getItem(sessionKey);

    if (!alreadyGreeted) {
      const timer = setTimeout(() => {
        setIsExcited(true);
        setTimeout(() => setIsExcited(false), 900);
        setShowHearts(true);
        setTimeout(() => setShowHearts(false), 1500);
        if (soundEnabled) {
          playPlayfulChime();
        }
        setShowSpeech(true);
        sessionStorage.setItem(sessionKey, 'true');
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [todayEfemeride, currentDate, soundEnabled, showSpeechOnClick]);

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

  const auraSize = {
    sm: 'w-10 h-10 -inset-0.5',
    md: 'w-16 h-16 -inset-1',
    lg: 'w-48 h-48 -inset-3',
    xl: 'w-64 h-64 -inset-4'
  }[size];

  return (
    <div ref={mascotRef} className={`relative inline-flex items-center justify-center select-none ${className}`}>
      {/* Halo y Aura de Glow Dinámico que cambia según el disfraz/efeméride */}
      <div 
        className={`absolute rounded-full bg-gradient-to-r ${disfrazInfo?.auraClass || 'from-amber-400/30 via-yellow-300/25 to-amber-500/30'} blur-md pointer-events-none transition-all duration-500 ${auraSize} ${
          isExcited ? 'opacity-100 scale-125' : 'opacity-70 group-hover:opacity-100'
        }`}
      />

      {/* Partículas flotantes de chispas en hover */}
      <div className="absolute -top-1 -right-1 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
      </div>

      {/* Partículas de Corazoncitos al hacer clic */}
      {showHearts && (
        <div className="absolute -top-4 pointer-events-none flex items-center gap-1 z-30 animate-bounce">
          <Heart className="w-4 h-4 text-rose-400 fill-rose-400 drop-shadow-md" />
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
        </div>
      )}

      {/* Contenedor Interactivo del Perrito con su Disfraz Automático */}
      <button
        type="button"
        onClick={handleClick}
        aria-label="Kant Mascota"
        className={`relative cursor-pointer transition-transform duration-300 active:scale-95 group focus:outline-none flex items-center justify-center ${
          isExcited ? 'dog-excited' : 'dog-idle'
        }`}
      >
        <img
          src="/dog_logo.png"
          alt="KANT Mascota"
          className={`${sizeClasses} object-contain transition-all duration-300 drop-shadow-[0_4px_10px_rgba(245,158,11,0.35)] group-hover:drop-shadow-[0_6px_18px_rgba(245,158,11,0.65)] group-hover:scale-105`}
          onError={(e) => {
            // Respaldo de iniciales si la imagen fallara
            e.currentTarget.style.display = 'none';
            if (e.currentTarget.nextElementSibling) {
              e.currentTarget.nextElementSibling.classList.remove('hidden');
            }
          }}
        />

        {/* Atuendo Vectorial de Alta Definición si hay Tema Festivo Activo */}
        <KantCostumeOverlay theme={festiveTheme} size={size} isExcited={isExcited} />

        {/* Respaldo de Accesorios Automáticos si el tema es default pero hay efeméride con emoji */}
        {festiveTheme === 'default' && disfrazInfo && (
          <>
            {/* Sombrero / Adorno de cabeza */}
            {disfrazInfo.sombreroEmoji && (
              <span 
                className="absolute -top-2.5 -right-1 text-sm sm:text-base pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-bounce select-none"
                style={{ animationDuration: '3s' }}
                title={disfrazInfo.badgeLabel}
              >
                {disfrazInfo.sombreroEmoji}
              </span>
            )}
            {/* Accesorio de patas / pecho */}
            {disfrazInfo.accesorioEmoji && (
              <span 
                className="absolute -bottom-1 -left-1 text-xs sm:text-sm pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] select-none"
                title={disfrazInfo.badgeLabel}
              >
                {disfrazInfo.accesorioEmoji}
              </span>
            )}
          </>
        )}

        <div className="hidden w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black text-xs items-center justify-center shadow-md">
          🐾
        </div>
      </button>

      {/* Globo de Diálogo Interactivo (Speech Bubble) Responsive */}
      {showSpeech && (
        <div 
          className={`absolute top-full mt-2.5 z-50 w-64 sm:w-72 max-w-[calc(100vw-2rem)] bg-slate-900/95 backdrop-blur-xl border border-amber-400/40 rounded-2xl p-3.5 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-200 ${
            alignSpeech === 'left' 
              ? 'left-0' 
              : alignSpeech === 'right' 
                ? 'right-0' 
                : 'left-1/2 -translate-x-1/2'
          }`}
        >
          {/* Triángulo indicador hacia el perrito */}
          <div 
            className={`absolute -top-1.5 w-3 h-3 bg-slate-900 border-t border-l border-amber-400/40 rotate-45 ${
              alignSpeech === 'left' 
                ? 'left-4' 
                : alignSpeech === 'right' 
                  ? 'right-4' 
                  : 'left-1/2 -translate-x-1/2'
            }`}
          />

          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 text-amber-400 font-black text-xs uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{todayEfemeride && currentQuoteIndex === 0 ? 'Kant celebra:' : 'Kant dice:'}</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSpeech(false);
              }}
              className="text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-200 font-medium leading-relaxed">
            {activeQuotes[currentQuoteIndex]}
          </p>

          {todayEfemeride && (
            <div className="mt-2 flex items-center justify-between gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30">
              <span className="flex items-center gap-1.5 truncate">
                <span className="text-xs">{todayEfemeride.icono}</span>
                <span className="truncate">{todayEfemeride.titulo}</span>
              </span>
              {disfrazInfo?.badgeLabel && (
                <span className="text-[9px] uppercase tracking-wider text-amber-300 bg-slate-950/80 px-1.5 py-0.5 rounded border border-amber-400/40 shrink-0 font-black">
                  {disfrazInfo.badgeLabel}
                </span>
              )}
            </div>
          )}

          <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {userName ? `Hola, ${userName}` : 'KANT Guardián'}
            </span>
            <span className="text-amber-400/80 font-bold hover:underline cursor-pointer" onClick={handleClick}>
              Siguiente tip 🐾
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
        className="fixed bottom-2 right-2 z-40 bg-slate-900/60 hover:bg-slate-900 text-amber-400 p-1.5 rounded-full border border-amber-400/30 text-[10px] font-bold shadow-lg backdrop-blur-md opacity-40 hover:opacity-100 transition-all cursor-pointer flex items-center gap-1"
        aria-label="Restaurar Kant Guardián"
      >
        <span>🐾</span>
        {totalAlerts > 0 && (
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
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
          className="bg-slate-900/95 hover:bg-slate-900 border-l border-y border-amber-400/60 pl-2.5 pr-1.5 py-1.5 rounded-l-2xl shadow-xl backdrop-blur-xl flex items-center gap-1.5 text-amber-300 cursor-pointer hover:pl-3.5 transition-all group"
          aria-label="Expandir KANT Guardián"
        >
          <span className="text-sm">🐾</span>
          {totalAlerts > 0 && (
            <span className="min-w-[16px] h-[16px] px-1 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-pulse">
              {totalAlerts}
            </span>
          )}
          <span className="text-[10px] font-black hidden group-hover:inline transition-all text-amber-400">
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
        <div className="w-[calc(100vw-2rem)] sm:w-72 max-w-xs bg-slate-900/95 backdrop-blur-2xl border border-amber-400/40 rounded-3xl p-3.5 sm:p-4 shadow-2xl text-white animate-in fade-in slide-in-from-bottom-3 duration-200 glow-amber-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black tracking-wide text-white">KANT Guardián</h4>
                <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Sistema en línea
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleMinimize}
                title="Poner a un lado (minimizar al borde)"
                className="p-1 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Minimizar al borde"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Cerrar menú"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
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
              className="w-full flex items-center justify-between bg-slate-950/60 hover:bg-amber-500/10 p-2 rounded-xl border border-slate-800 hover:border-amber-500/30 transition-all text-left cursor-pointer active:scale-98"
            >
              <span className="text-slate-300 font-medium">📋 Bitácoras por revisar:</span>
              <span className="font-black text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                {pendingReviews}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('gastos');
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between bg-slate-950/60 hover:bg-emerald-500/10 p-2 rounded-xl border border-slate-800 hover:border-emerald-500/30 transition-all text-left cursor-pointer active:scale-98"
            >
              <span className="text-slate-300 font-medium">🧾 Gastos por liquidar:</span>
              <span className="font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                {pendingGastos}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('chat');
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between bg-slate-950/60 hover:bg-blue-500/10 p-2 rounded-xl border border-slate-800 hover:border-blue-500/30 transition-all text-left cursor-pointer active:scale-98"
            >
              <span className="text-slate-300 font-medium">💬 Mensajes de equipo:</span>
              <span className="font-black text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-md border border-blue-500/30">
                {unreadReplies}
              </span>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <button
              onClick={handleToggleMinimize}
              className="text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <ChevronRight className="w-3 h-3" /> Poner a un lado
            </button>
            <button
              onClick={handleDismiss}
              className="hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
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
          className="group relative flex items-center gap-2.5 bg-slate-900/90 hover:bg-slate-900 border border-amber-400/40 hover:border-amber-400 p-2 pr-3.5 rounded-full shadow-2xl backdrop-blur-xl transition-all duration-300 hover:scale-105 glow-pulse-amber cursor-pointer"
          aria-label="KANT Guardián"
        >
          <div className="relative">
            <KantMascot size="sm" showSpeechOnClick={false} soundEnabled={false} />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center border-2 border-slate-900 shadow-md animate-pulse">
                {totalAlerts}
              </span>
            )}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-[11px] font-black text-amber-300 leading-tight flex items-center gap-1">
              KANT Guardián <Sparkles className="w-3 h-3 text-amber-400" />
            </p>
            <p className="text-[9px] text-slate-400 font-medium">
              {totalAlerts > 0 ? `${totalAlerts} pendientes` : 'Todo al día'}
            </p>
          </div>
        </button>

        {/* Botón rápido para poner a un lado sin abrir menú */}
        <button
          onClick={handleToggleMinimize}
          className="w-6 h-6 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-700/80 flex items-center justify-center shadow-md transition-all cursor-pointer opacity-70 hover:opacity-100"
          title="Poner a un lado"
          aria-label="Poner a un lado"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
