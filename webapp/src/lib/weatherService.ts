/**
 * Servicio de Monitoreo de Clima Multiciudad (Venezuela)
 * Román & Delgado Abogados - Sistema KANT
 * 
 * Arquitectura de 3 niveles para máxima disponibilidad:
 * 1. Open-Meteo API (Primario con AbortController timeout de 4s)
 * 2. wttr.in API (Secundario para contingencia de bloqueos de red)
 * 3. Modelo Climatológico Local por Hora (Garantía de visualización inmediata sin pantallas en blanco)
 */

export interface CityWeather {
  name: string;
  state: string;
  lat: number;
  lon: number;
  temp?: number;
  conditionCode?: number;
  conditionText?: string;
  humidity?: number;
  windSpeed?: number;
  loading?: boolean;
}

export const CITIES: CityWeather[] = [
  { name: 'Maracay', state: 'Aragua', lat: 10.2469, lon: -67.5958 },
  { name: 'Caracas', state: 'Distrito Capital', lat: 10.4806, lon: -66.9036 },
  { name: 'Valencia', state: 'Carabobo', lat: 10.1620, lon: -68.0077 },
  { name: 'Boca de Aroa', state: 'Falcón', lat: 10.7483, lon: -68.3075 },
  { name: 'La Guaira', state: 'Vargas', lat: 10.6014, lon: -66.9322 },
  { name: 'Maracaibo', state: 'Zulia', lat: 10.6544, lon: -71.6372 }
];

const DEFAULT_CITY_METRICS: Record<string, { baseTemp: number; conditionCode: number; conditionText: string; humidity: number }> = {
  'Valencia': { baseTemp: 28, conditionCode: 1, conditionText: 'Parcialmente Nublado', humidity: 68 },
  'Maracay': { baseTemp: 29, conditionCode: 0, conditionText: 'Despejado', humidity: 62 },
  'Caracas': { baseTemp: 24, conditionCode: 2, conditionText: 'Clima Agradable', humidity: 70 },
  'Boca de Aroa': { baseTemp: 30, conditionCode: 0, conditionText: 'Soleado / Costa', humidity: 75 },
  'La Guaira': { baseTemp: 30, conditionCode: 0, conditionText: 'Soleado / Litoral', humidity: 74 },
  'Maracaibo': { baseTemp: 33, conditionCode: 0, conditionText: 'Caluroso / Soleado', humidity: 68 }
};

/**
 * Genera el clima estimado de respaldo según la hora oficial del día en Venezuela
 */
export function getFallbackWeatherForCity(city: CityWeather, date: Date = new Date()): CityWeather {
  const metrics = DEFAULT_CITY_METRICS[city.name] || {
    baseTemp: 28,
    conditionCode: 1,
    conditionText: 'Parcialmente Nublado',
    humidity: 68
  };

  const hour = date.getHours();
  // Curva diurna de temperatura tropical venezolana
  let delta = 0;
  if (hour >= 12 && hour <= 15) {
    delta = 2; // Máxima temperatura de la tarde
  } else if (hour >= 16 && hour <= 19) {
    delta = 0; // Atardecer templado
  } else if (hour >= 20 || hour <= 5) {
    delta = -4; // Madrugada fresca
  } else {
    delta = 1; // Media mañana
  }

  const temp = metrics.baseTemp + delta;

  return {
    ...city,
    temp,
    conditionCode: metrics.conditionCode,
    conditionText: metrics.conditionText,
    humidity: metrics.humidity,
    windSpeed: 10
  };
}

/**
 * Carga inicial inmediata de datos de clima desde localStorage o fallback climatológico
 */
export function getInitialWeatherData(): Record<string, CityWeather> {
  const result: Record<string, CityWeather> = {};

  // 1. Intentar cargar desde caché persistente
  try {
    const cached = localStorage.getItem('rd_weather_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') {
        CITIES.forEach(c => {
          if (parsed[c.name] && typeof parsed[c.name].temp === 'number') {
            result[c.name] = { ...c, ...parsed[c.name] };
          }
        });
      }
    }
  } catch (e) {
    // ignore
  }

  // 2. Para cualquier ciudad faltante, poblar inmediatamente con el modelo de respaldo
  const now = new Date();
  CITIES.forEach(c => {
    if (!result[c.name] || result[c.name].temp === undefined) {
      result[c.name] = getFallbackWeatherForCity(c, now);
    }
  });

  return result;
}

/**
 * Obtiene el clima en tiempo real intentando múltiples proveedores con tolerancia a fallos
 */
export async function fetchLiveCityWeather(city: CityWeather): Promise<CityWeather> {
  // --- TIER 1: Open-Meteo API ---
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true&hourly=relativehumidity_2m`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const current = data.current_weather;
      if (current && typeof current.temperature === 'number') {
        const temp = Math.round(current.temperature);
        const code = current.weathercode ?? 0;
        const wind = Math.round(current.windspeed || 0);

        let hum: number | undefined = undefined;
        if (data.hourly && Array.isArray(data.hourly.relativehumidity_2m) && data.hourly.relativehumidity_2m.length > 0) {
          const hour = new Date().getHours();
          hum = data.hourly.relativehumidity_2m[hour] || data.hourly.relativehumidity_2m[0];
        }

        const conditionInfo = parseWmoWeatherCode(code);
        return {
          ...city,
          temp,
          conditionCode: code,
          conditionText: conditionInfo,
          humidity: hum,
          windSpeed: wind
        };
      }
    }
  } catch {
    // Open-Meteo no respondió a tiempo o bloqueado por red local
  }

  // --- TIER 2: wttr.in Contingencia ---
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const url = `https://wttr.in/${encodeURIComponent(city.name)},Venezuela?format=j1`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const current = data.current_condition?.[0];
      if (current && current.temp_C) {
        const temp = parseInt(current.temp_C, 10);
        const wttrCode = parseInt(current.weatherCode, 10) || 113;
        const code = mapWttrToWmo(wttrCode);
        const conditionText = current.lang_es?.[0]?.value || current.weatherDesc?.[0]?.value || parseWmoWeatherCode(code);
        const hum = parseInt(current.humidity, 10) || undefined;
        const wind = parseInt(current.windspeedKmph, 10) || undefined;

        return {
          ...city,
          temp,
          conditionCode: code,
          conditionText: conditionText.length > 25 ? parseWmoWeatherCode(code) : conditionText,
          humidity: hum,
          windSpeed: wind
        };
      }
    }
  } catch {
    // wttr.in tampoco respondió
  }

  // --- TIER 3: Modelo Climatológico Local Garantizado ---
  return getFallbackWeatherForCity(city, new Date());
}

/**
 * Traduce códigos estándar WMO de Open-Meteo a texto formal en español
 */
export function parseWmoWeatherCode(code: number = 0): string {
  if (code === 0) return 'Despejado';
  if (code <= 3) return 'Parcialmente Nublado';
  if (code <= 48) return 'Neblina / Nublado';
  if (code <= 67 || (code >= 80 && code <= 82)) return 'Lluvias / Chubascos';
  if (code >= 95) return 'Tormenta Eléctrica';
  return 'Soleado';
}

/**
 * Mapeo de códigos wttr.in a WMO
 */
function mapWttrToWmo(wttrCode: number): number {
  if (wttrCode === 113) return 0; // Clear / Sunny
  if (wttrCode === 116) return 2; // Partly cloudy
  if (wttrCode === 119 || wttrCode === 122) return 3; // Overcast / Cloudy
  if (wttrCode >= 176 && wttrCode <= 300) return 61; // Rain
  if (wttrCode >= 386) return 95; // Thunderstorm
  return 1;
}
