/**
 * Gestor Profesional de Tematización Efemérica Automática (KANT Adaptive Theme Engine)
 * Román & Delgado Abogados
 */

import { getActiveDate } from './efemeridesVenezuela';

export type FestiveThemeId = 'default' | 'halloween' | 'abogado' | 'navidad' | 'patria' | 'chocolate';
export type ThemeMode = 'auto' | FestiveThemeId;

export interface ThemeConfig {
  id: FestiveThemeId;
  name: string;
  shortName: string;
  badge: string;
  themeClass: string;
  accentPrimary: string;
  accentSecondary: string;
  navbarTopLine: string;
  cardBorderHover: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
}

export const THEMES: Record<FestiveThemeId, ThemeConfig> = {
  default: {
    id: 'default',
    name: 'Azul Pastel Corporativo KANT',
    shortName: 'Ejecutivo',
    badge: 'Corporativo',
    themeClass: 'theme-default',
    accentPrimary: '#2563eb',
    accentSecondary: '#38bdf8',
    navbarTopLine: 'from-sky-300/70 via-blue-500/75 to-indigo-400/70',
    cardBorderHover: 'hover:border-blue-300/80',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200/80',
    description: 'Estilo ejecutivo Cloud Blue pastel con superficies luminosas para la gestión jurídica moderna.'
  },
  halloween: {
    id: 'halloween',
    name: 'Noche de Halloween Ejecutiva',
    shortName: 'Halloween',
    badge: 'Edición Especial',
    themeClass: 'theme-halloween',
    accentPrimary: '#7c3aed',
    accentSecondary: '#6366f1',
    navbarTopLine: 'from-indigo-400 via-violet-500 to-sky-400',
    cardBorderHover: 'hover:border-violet-300/80',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-700',
    badgeBorder: 'border-violet-200/80',
    description: 'Acentos violeta e índigo sobrio sobre lienzo claro corporativo.'
  },
  abogado: {
    id: 'abogado',
    name: 'Día Nacional del Abogado',
    shortName: 'Día del Abogado',
    badge: 'Día del Abogado',
    themeClass: 'theme-abogado',
    accentPrimary: '#1d4ed8',
    accentSecondary: '#4f46e5',
    navbarTopLine: 'from-sky-400 via-blue-600 to-indigo-500',
    cardBorderHover: 'hover:border-indigo-300/80',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200/80',
    description: 'Paleta solemne de alta corte: azul diplomático e índigo institucional.'
  },
  navidad: {
    id: 'navidad',
    name: 'Navidad & Fin de Año',
    shortName: 'Navidad',
    badge: 'Temporada Festiva',
    themeClass: 'theme-navidad',
    accentPrimary: '#059669',
    accentSecondary: '#e11d48',
    navbarTopLine: 'from-emerald-400 via-teal-500 to-rose-400',
    cardBorderHover: 'hover:border-emerald-300/80',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200/80',
    description: 'Verde esmeralda y carmesí sutil con frescura pastel decembrina.'
  },
  patria: {
    id: 'patria',
    name: 'Fechas Patrias de Venezuela',
    shortName: 'Fechas Patrias',
    badge: 'Efeméride Nacional',
    themeClass: 'theme-patria',
    accentPrimary: '#2563eb',
    accentSecondary: '#dc2626',
    navbarTopLine: 'from-sky-400 via-blue-600 to-rose-500',
    cardBorderHover: 'hover:border-sky-300/80',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200/80',
    description: 'Acentos azul republicano y carmesí institucional sobre fondo ejecutivo claro.'
  },
  chocolate: {
    id: 'chocolate',
    name: 'Día Nacional del Cacao y Chocolate',
    shortName: 'Cacao & Cultura',
    badge: 'Cultura Nacional',
    themeClass: 'theme-chocolate',
    accentPrimary: '#0284c7',
    accentSecondary: '#be123c',
    navbarTopLine: 'from-sky-400 via-indigo-500 to-rose-400',
    cardBorderHover: 'hover:border-sky-300/80',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200/80',
    description: 'Paleta conmemorativa con detalles azul cielo y borgoña suave.'
  }
};

/**
 * Detecta automáticamente qué tema corresponde según la fecha del calendario
 */
export function determineAutoTheme(targetDate: Date = getActiveDate()): FestiveThemeId {
  const month = targetDate.getMonth() + 1; // 1-12
  const day = targetDate.getDate(); // 1-31

  // 1. Temporada de Halloween (Octubre 24 al 31)
  if (month === 10 && day >= 24) {
    return 'halloween';
  }

  // 2. Semana del Día Nacional del Abogado (Junio 20 al 25)
  if (month === 6 && day >= 20 && day <= 25) {
    return 'abogado';
  }

  // 3. Temporada Navideña (Diciembre 1 al 31, y primera semana de Enero hasta Reyes)
  if (month === 12 || (month === 1 && day <= 6)) {
    return 'navidad';
  }

  // 4. Fechas Patrias (5 de Julio, 19 de Abril, 24 de Junio, 24 de Julio, 12 de Octubre)
  if (
    (month === 7 && (day === 5 || day === 24)) ||
    (month === 4 && day === 19) ||
    (month === 6 && day === 24) ||
    (month === 10 && day === 12)
  ) {
    return 'patria';
  }

  // 5. Día Nacional del Cacao y Chocolate Venezolano (1 de Octubre) & Día Internacional del Chocolate (13 de Septiembre)
  if ((month === 10 && day === 1) || (month === 9 && day === 13)) {
    return 'chocolate';
  }

  return 'default';
}

/**
 * Retorna el tema festivo activo 100% automáticamente según el calendario y efemérides
 */
export function getActiveFestiveTheme(): FestiveThemeId {
  // Limpiar cualquier residuo de modo manual previo si existiera
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('rd_theme_mode')) {
      localStorage.removeItem('rd_theme_mode');
    }
  } catch (e) { }

  return determineAutoTheme();
}

/**
 * Obtiene el modo de tema guardado (siempre 'auto' por diseño automático)
 */
export function getSavedThemeMode(): ThemeMode {
  return 'auto';
}

/**
 * Notifica a los componentes cuando cambia la fecha o el estado del tema
 */
export function setFestiveThemeMode(_mode: ThemeMode = 'auto'): void {
  applyThemeToDOM();
  window.dispatchEvent(new CustomEvent('rd_festive_theme_changed', { detail: 'auto' }));
}

/**
 * Aplica las clases CSS globales al elemento raíz de la página
 */
export function applyThemeToDOM(): FestiveThemeId {
  const activeTheme = getActiveFestiveTheme();

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    // Remover clases temáticas anteriores
    root.classList.remove('theme-default', 'theme-halloween', 'theme-abogado', 'theme-navidad', 'theme-patria', 'theme-chocolate');
    // Agregar la clase activa
    root.classList.add(THEMES[activeTheme]?.themeClass || 'theme-default');
  }

  return activeTheme;
}
