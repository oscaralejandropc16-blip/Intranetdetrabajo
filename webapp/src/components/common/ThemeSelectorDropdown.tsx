import { useState, useRef, useEffect } from 'react';
import { Palette, ChevronDown, Check, Calendar, Scale, Flag, Briefcase } from 'lucide-react';
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
        className={`flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs ${activeTheme === 'halloween'
          ? 'bg-violet-50 hover:bg-violet-100 border-violet-200 text-violet-700'
          : activeTheme === 'abogado'
            ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
            : activeTheme === 'navidad'
              ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
              : activeTheme === 'patria'
                ? 'bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-700'
                : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700'
          }`}
        title="Cambiar Tema Visual o Festivo"
        aria-label="Selector de Tema Visual"
      >
        <Palette className="w-3.5 h-3.5 shrink-0 opacity-85" />
        <span className="hidden sm:inline font-bold truncate max-w-[110px]">
          {currentMode === 'auto' ? `${currentThemeConfig.shortName} (Auto)` : currentThemeConfig.shortName}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform opacity-70 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Menú Desplegable con todos los temas */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white/98 backdrop-blur-2xl border border-blue-100 rounded-2xl shadow-2xl shadow-blue-950/15 z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150 text-slate-800">
          <div className="px-3 py-1.5 border-b border-blue-50 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Palette className="w-3 h-3 text-blue-600" /> Temas Visuales KANT
            </span>
            <span className="text-[9px] text-blue-600 font-bold">Adaptativo</span>
          </div>

          {/* Opción Automática */}
          <button
            type="button"
            onClick={() => handleSelectMode('auto')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${currentMode === 'auto'
              ? 'bg-blue-50 text-blue-800 font-bold border border-blue-200 shadow-2xs'
              : 'hover:bg-blue-50/60 text-slate-700'
              }`}
          >
            <div className="min-w-0">
              <p className="text-xs font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Automático por Calendario</span>
              </p>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                Adapta la paleta automáticamente según la fecha y efemérides.
              </p>
            </div>
            {currentMode === 'auto' && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1.5" />}
          </button>

          <div className="h-px bg-blue-50 my-1"></div>

          {/* Temas Específicos */}
          {[
            { id: 'default', name: 'Cloud Blue Corporativo', icon: Briefcase, desc: 'Azul pastel suave y superficies luminosas de oficina' },
            { id: 'abogado', name: 'Día Nacional del Abogado', icon: Scale, desc: 'Azul diplomático e índigo solemne institucional' },
            { id: 'navidad', name: 'Navidad & Fin de Año', icon: Calendar, desc: 'Verde esmeralda y carmesí suave decembrino' },
            { id: 'patria', name: 'Fechas Patrias', icon: Flag, desc: 'Azul republicano con detalles institucionales' },
            { id: 'halloween', name: 'Edición Especial Violeta', icon: Calendar, desc: 'Acentos violeta e índigo sobre lienzo claro' }
          ].map(t => {
            const isSelected = currentMode === t.id;
            const IconComp = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectMode(t.id as ThemeMode)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${isSelected
                  ? 'bg-blue-50 text-blue-800 font-bold border border-blue-200 shadow-2xs'
                  : 'hover:bg-blue-50/60 text-slate-700'
                  }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <IconComp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{t.name}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {t.desc}
                  </p>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
