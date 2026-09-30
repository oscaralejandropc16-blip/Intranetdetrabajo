import { useState, useRef, useEffect } from 'react';
import { Palette, ChevronDown, Check, Sparkles } from 'lucide-react';
import { 
  THEMES, 
  getActiveFestiveTheme, 
  getSavedThemeMode, 
  setFestiveThemeMode, 
  type ThemeMode, 
  type FestiveThemeId 
} from '../../lib/themeManager';

export default function ThemeSelectorDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<ThemeMode>(() => getSavedThemeMode());
  const [activeTheme, setActiveTheme] = useState<FestiveThemeId>(() => getActiveFestiveTheme());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Escuchar cambios de tema
  useEffect(() => {
    const handleChange = () => {
      setCurrentMode(getSavedThemeMode());
      setActiveTheme(getActiveFestiveTheme());
    };
    window.addEventListener('rd_festive_theme_changed', handleChange);
    window.addEventListener('rd_simulated_date_changed', handleChange);
    return () => {
      window.removeEventListener('rd_festive_theme_changed', handleChange);
      window.removeEventListener('rd_simulated_date_changed', handleChange);
    };
  }, []);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectMode = (mode: ThemeMode) => {
    setFestiveThemeMode(mode);
    setCurrentMode(mode);
    setActiveTheme(getActiveFestiveTheme());
    setIsOpen(false);
  };

  const currentThemeConfig = THEMES[activeTheme];

  return (
    <div ref={dropdownRef} className="relative inline-block text-left select-none">
      {/* Botón Disparador del Selector de Temas */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-xl border text-xs font-bold transition-all duration-300 cursor-pointer shadow-sm ${
          activeTheme === 'halloween'
            ? 'bg-orange-500/15 hover:bg-orange-500/25 border-orange-500/40 text-orange-300 shadow-[0_0_12px_rgba(249,115,22,0.3)]'
            : activeTheme === 'abogado'
            ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/50 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
            : activeTheme === 'navidad'
            ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
            : activeTheme === 'patria'
            ? 'bg-blue-600/15 hover:bg-blue-600/25 border-yellow-400/40 text-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.3)]'
            : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
        }`}
        title="Cambiar Tema Visual o Festivo"
        aria-label="Selector de Tema Visual"
      >
        <Palette className="w-3.5 h-3.5 shrink-0 opacity-80" />
        <span className="hidden sm:inline font-bold truncate max-w-[110px]">
          {currentMode === 'auto' ? `${currentThemeConfig.shortName} (Auto)` : currentThemeConfig.shortName}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform opacity-70 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Menú Desplegable con todos los temas */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-slate-900/95 backdrop-blur-2xl border border-slate-700 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150 text-white">
          <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Temas Visuales KANT
            </span>
            <span className="text-[9px] text-amber-400 font-bold">Adaptativo</span>
          </div>

          {/* Opción Automática */}
          <button
            type="button"
            onClick={() => handleSelectMode('auto')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
              currentMode === 'auto' 
                ? 'bg-amber-500/20 text-amber-300 font-black border border-amber-500/40 shadow-sm' 
                : 'hover:bg-slate-800/80 text-slate-300'
            }`}
          >
            <div className="min-w-0">
              <p className="text-xs font-bold flex items-center gap-1.5">
                <span>🤖 Automático por Calendario</span>
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                Detecta Halloween, Día del Abogado y Navidad según la fecha.
              </p>
            </div>
            {currentMode === 'auto' && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1.5" />}
          </button>

          <div className="h-px bg-slate-800 my-1"></div>

          {/* Temas Específicos */}
          {[
            { id: 'halloween', name: 'Noche de Halloween', icon: '🎃', desc: 'Naranja calabaza, morado místico y perrito brujo' },
            { id: 'abogado', name: 'Día Nacional del Abogado', icon: '⚖️', desc: 'Oro justicia, azul alta corte y birrete de jurista' },
            { id: 'navidad', name: 'Navidad & Fin de Año', icon: '🎄', desc: 'Verde esmeralda, rojo rubí y gorro de Santa' },
            { id: 'patria', name: 'Fechas Patrias (5 de Julio)', icon: '🇻🇪', desc: 'Tricolor patrio, amarillo oro y estrellas' },
            { id: 'default', name: 'Clásico Corporativo', icon: '👔', desc: 'Estilo ejecutivo sobrio para la jornada habitual' }
          ].map(t => {
            const isSelected = currentMode === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectMode(t.id as ThemeMode)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-amber-500/20 text-amber-300 font-black border border-amber-500/40 shadow-sm' 
                    : 'hover:bg-slate-800/80 text-slate-300'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <span>{t.icon}</span>
                    <span>{t.name}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {t.desc}
                  </p>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
