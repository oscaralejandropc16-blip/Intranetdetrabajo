/**
 * Gestor Profesional de Tematización Efemérica Automática (KANT Adaptive Theme Engine)
 * Román & Delgado Abogados
 */

import { getActiveDate } from './efemeridesVenezuela';

export type FestiveThemeId = 'default' | 'halloween' | 'abogado' | 'navidad' | 'patria';
export type ThemeMode = 'auto' | FestiveThemeId;

export interface ThemeConfig {
  id: FestiveThemeId;
  name: string;
  shortName: string;
  badge: string;
  themeClass: string;
  accentPrimary: string;
  accentSecondary: string;
  glowColor: string;
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
    name: 'Clásico Román & Delgado',
    shortName: 'Clásico',
    badge: '👔 Corporativo',
    themeClass: 'theme-default',
    accentPrimary: '#f59e0b',
    accentSecondary: '#0ea5e9',
    glowColor: 'rgba(245, 158, 11, 0.3)',
    navbarTopLine: 'from-transparent via-amber-500/40 to-transparent',
    cardBorderHover: 'hover:border-amber-400/50',
    badgeBg: 'bg-slate-800',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/30',
    description: 'Estilo clásico ejecutivo formal para la rutina jurídica diaria.'
  },
  halloween: {
    id: 'halloween',
    name: 'Noche de Halloween',
    shortName: 'Halloween',
    badge: '🎃 Modo Halloween',
    themeClass: 'theme-halloween',
    accentPrimary: '#f97316',
    accentSecondary: '#a855f7',
    glowColor: 'rgba(249, 115, 22, 0.45)',
    navbarTopLine: 'from-orange-500 via-purple-500 to-amber-500',
    cardBorderHover: 'hover:border-orange-500/60',
    badgeBg: 'bg-orange-500/20',
    badgeText: 'text-orange-300',
    badgeBorder: 'border-orange-500/40',
    description: 'Acentos naranja calabaza y púrpura místico con fondo oscuro de máximo contraste.'
  },
  abogado: {
    id: 'abogado',
    name: 'Día Nacional del Abogado',
    shortName: 'Día del Abogado',
    badge: '⚖️ Día del Abogado',
    themeClass: 'theme-abogado',
    accentPrimary: '#fbbf24',
    accentSecondary: '#3b82f6',
    glowColor: 'rgba(251, 191, 36, 0.5)',
    navbarTopLine: 'from-amber-400 via-blue-600 to-amber-400',
    cardBorderHover: 'hover:border-amber-400/60',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-400/50',
    description: 'Paleta solemne de alta corte: oro justicia y azul diplomático institucional.'
  },
  navidad: {
    id: 'navidad',
    name: 'Navidad & Fin de Año',
    shortName: 'Navidad',
    badge: '🎄 Modo Navidad',
    themeClass: 'theme-navidad',
    accentPrimary: '#10b981',
    accentSecondary: '#ef4444',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    navbarTopLine: 'from-emerald-500 via-red-500 to-amber-400',
    cardBorderHover: 'hover:border-emerald-400/60',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/40',
    description: 'Verde pino esmeralda y rojo rubí festivo con destellos dorados.'
  },
  patria: {
    id: 'patria',
    name: 'Fechas Patrias de Venezuela',
    shortName: 'Fechas Patrias',
    badge: '🇻🇪 Fechas Patrias',
    themeClass: 'theme-patria',
    accentPrimary: '#facc15',
    accentSecondary: '#2563eb',
    glowColor: 'rgba(250, 204, 21, 0.45)',
    navbarTopLine: 'from-yellow-400 via-blue-600 to-red-500',
    cardBorderHover: 'hover:border-yellow-400/60',
    badgeBg: 'bg-yellow-500/20',
    badgeText: 'text-yellow-300',
    badgeBorder: 'border-yellow-500/40',
    description: 'Tricolor patrio con azul republicano, amarillo oro y rojo independencia.'
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

  return 'default';
}

/**
 * Obtiene el modo de tema guardado ('auto' por defecto)
 */
export function getSavedThemeMode(): ThemeMode {
  const saved = localStorage.getItem('rd_theme_mode');
  if (saved && (saved === 'auto' || saved in THEMES)) {
    return saved as ThemeMode;
  }
  return 'auto';
}

/**
 * Retorna el tema activo real (si está en 'auto', resuelve según el calendario)
 */
export function getActiveFestiveTheme(): FestiveThemeId {
  const mode = getSavedThemeMode();
  if (mode !== 'auto') {
    return mode;
  }
  return determineAutoTheme();
}

/**
 * Cambia el modo de tema y notifica a todos los componentes
 */
export function setFestiveThemeMode(mode: ThemeMode): void {
  localStorage.setItem('rd_theme_mode', mode);
  applyThemeToDOM();
  window.dispatchEvent(new CustomEvent('rd_festive_theme_changed', { detail: mode }));
}

/**
 * Aplica las clases CSS globales al elemento raíz de la página
 */
export function applyThemeToDOM(): FestiveThemeId {
  const activeTheme = getActiveFestiveTheme();
  
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    // Remover clases temáticas anteriores
    root.classList.remove('theme-default', 'theme-halloween', 'theme-abogado', 'theme-navidad', 'theme-patria');
    // Agregar la clase activa
    root.classList.add(THEMES[activeTheme].themeClass);
  }

  return activeTheme;
}
