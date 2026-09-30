import { useState, useRef } from 'react';
import { Sparkles, X, ShieldCheck, Heart } from 'lucide-react';

interface KantMascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSpeechOnClick?: boolean;
  className?: string;
  userName?: string;
  soundEnabled?: boolean;
  roleBadge?: string;
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
  soundEnabled = true
}: KantMascotProps) {
  const [isExcited, setIsExcited] = useState(false);
  const [showSpeech, setShowSpeech] = useState(false);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [showHearts, setShowHearts] = useState(false);
  const clickCount = useRef(0);

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
      setCurrentQuoteIndex((prev) => (prev + 1) % KANT_QUOTES.length);
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
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      {/* Halo y Aura de Glow Dinámico Dorado/Ámbar */}
      <div 
        className={`absolute rounded-full bg-gradient-to-r from-amber-400/30 via-yellow-300/25 to-amber-500/30 blur-md pointer-events-none transition-all duration-500 ${auraSize} ${
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

      {/* Contenedor Interactivo del Perrito */}
      <button
        type="button"
        onClick={handleClick}
        title="¡Hola! Soy Kant 🐾 Haz clic para interactuar"
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
        <div className="hidden w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black text-xs items-center justify-center shadow-md">
          🐾
        </div>
      </button>

      {/* Globo de Diálogo Interactivo (Speech Bubble) Responsive */}
      {showSpeech && (
        <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2.5 z-50 w-64 sm:w-72 max-w-[calc(100vw-1.5rem)] bg-slate-900/95 backdrop-blur-xl border border-amber-400/40 rounded-2xl p-3.5 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-200">
          {/* Triángulo indicador hacia el perrito */}
          <div className="absolute -top-1.5 left-5 sm:left-1/2 sm:-translate-x-1/2 w-3 h-3 bg-slate-900 border-t border-l border-amber-400/40 rotate-45"></div>

          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 text-amber-400 font-black text-xs uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Kant dice:</span>
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
            {KANT_QUOTES[currentQuoteIndex]}
          </p>

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
  unreadReplies = 0 
}: { 
  pendingReviews?: number; 
  pendingGastos?: number;
  unreadReplies?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const totalAlerts = pendingReviews + pendingGastos + unreadReplies;

  if (isDismissed) return null;

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-40 flex flex-col items-end gap-2 font-sans select-none max-w-[calc(100vw-1.5rem)]">
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
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="py-3 space-y-2 text-xs">
            <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-300 font-medium">📋 Bitácoras por revisar:</span>
              <span className="font-black text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                {pendingReviews}
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-300 font-medium">🧾 Gastos por liquidar:</span>
              <span className="font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                {pendingGastos}
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-300 font-medium">💬 Mensajes de equipo:</span>
              <span className="font-black text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-md border border-blue-500/30">
                {unreadReplies}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span className="text-amber-400 font-bold">🐾 Siempre a tu lado</span>
            <button
              onClick={() => setIsDismissed(true)}
              className="hover:text-rose-400 transition-colors cursor-pointer"
            >
              Ocultar guardián
            </button>
          </div>
        </div>
      )}

      {/* Botón Flotante con Perrito Animado */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-2.5 bg-slate-900/90 hover:bg-slate-900 border border-amber-400/40 hover:border-amber-400 p-2 pr-3.5 rounded-full shadow-2xl backdrop-blur-xl transition-all duration-300 hover:scale-105 glow-pulse-amber cursor-pointer"
        title="KANT Guardián - Clic para ver estado"
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
    </div>
  );
}
