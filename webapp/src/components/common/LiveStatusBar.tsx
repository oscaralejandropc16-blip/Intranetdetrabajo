import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  DollarSign,
  Euro,
  Sun,
  CloudSun,
  CloudRain,
  CloudLightning,
  Cloud,
  MapPin,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { syncServerTime, getServerDateSync } from '../../lib/supabaseAdapter';
import {
  getActiveDate,
  getSimulatedDate
} from '../../lib/efemeridesVenezuela';
import {
  CITIES,
  type CityWeather,
  getInitialWeatherData,
  fetchLiveCityWeather,
  getFallbackWeatherForCity
} from '../../lib/weatherService';

export default function LiveStatusBar() {
  // 1. Estado del Reloj y Fecha (tiempo real oficial o fecha de prueba)
  const [simulatedDate, setSimulatedDateState] = useState<string | null>(() => getSimulatedDate());
  const [currentTime, setCurrentTime] = useState<Date>(() => getActiveDate());

  // 2. Estado de Divisas ($ y €)
  const [dolarRate, setDolarRate] = useState<number | null>(() => {
    const saved = localStorage.getItem('rd_bcv_usd');
    return saved ? parseFloat(saved) : null;
  });
  const [euroRate, setEuroRate] = useState<number | null>(() => {
    const saved = localStorage.getItem('rd_bcv_eur');
    return saved ? parseFloat(saved) : null;
  });
  const [loadingRates, setLoadingRates] = useState<boolean>(false);

  // 3. Estado del Clima
  const [selectedCityIndex, setSelectedCityIndex] = useState<number>(() => {
    const saved = localStorage.getItem('rd_weather_city_idx');
    if (saved !== null) {
      const idx = parseInt(saved, 10);
      if (!isNaN(idx) && idx >= 0 && idx < 6) return idx;
    }
    const pref = localStorage.getItem('rd_preferred_city') || '';
    if (pref.toLowerCase().includes('valencia')) return 2;
    if (pref.toLowerCase().includes('maracay')) return 0;
    if (pref.toLowerCase().includes('caracas') && !pref.includes('NetUno') && !pref.includes('Red IP')) return 1;
    return 2; // Valencia (sede principal) por defecto
  });
  const [weatherData, setWeatherData] = useState<Record<string, CityWeather>>(() => getInitialWeatherData());
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);

  // Efecto Reloj en Vivo sincronizado con la hora oficial del servidor o simulador
  useEffect(() => {
    const handleSimChange = () => {
      const sim = getSimulatedDate();
      setSimulatedDateState(sim);
      if (sim) {
        setCurrentTime(getActiveDate());
      } else {
        setCurrentTime(getServerDateSync());
      }
    };

    window.addEventListener('rd_simulated_date_changed', handleSimChange);

    if (!simulatedDate) {
      syncServerTime().then(d => setCurrentTime(d));
    }

    const timer = setInterval(() => {
      const sim = getSimulatedDate();
      if (!sim) {
        setCurrentTime(getServerDateSync());
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      window.removeEventListener('rd_simulated_date_changed', handleSimChange);
    };
  }, [simulatedDate]);

  // Efecto Carga de Divisas (Dólar / Euro Oficiales)
  const fetchRates = async () => {
    setLoadingRates(true);
    try {
      // 1. Tasa USD Oficial con timeout
      const ctrlUsd = new AbortController();
      const tIdUsd = setTimeout(() => ctrlUsd.abort(), 3500);
      const resUsd = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', { signal: ctrlUsd.signal });
      clearTimeout(tIdUsd);

      if (resUsd.ok) {
        const dataUsd = await resUsd.json();
        if (dataUsd && dataUsd.promedio) {
          setDolarRate(dataUsd.promedio);
          try {
            localStorage.setItem('rd_bcv_usd', dataUsd.promedio.toString());
            localStorage.setItem('rd_live_bcv_rate', dataUsd.promedio.toString());
          } catch { }
          window.dispatchEvent(new CustomEvent('rd_bcv_updated', { detail: dataUsd.promedio }));
        }
      }

      // 2. Tasa EUR Oficial con timeout
      const ctrlEur = new AbortController();
      const tIdEur = setTimeout(() => ctrlEur.abort(), 3500);
      const resEur = await fetch('https://ve.dolarapi.com/v1/euros/oficial', { signal: ctrlEur.signal });
      clearTimeout(tIdEur);

      if (resEur.ok) {
        const dataEur = await resEur.json();
        if (dataEur && dataEur.promedio) {
          setEuroRate(dataEur.promedio);
          try {
            localStorage.setItem('rd_bcv_eur', dataEur.promedio.toString());
          } catch { }
        }
      }
    } catch (error) {
      console.warn('No se pudo conectar a la API de divisas, usando respaldo:', error);
      // Valores de respaldo si la conexión externa falla
      if (!dolarRate) setDolarRate(36.50);
      if (!euroRate) setEuroRate(39.80);
    } finally {
      setLoadingRates(false);
    }
  };

  useEffect(() => {
    fetchRates();
    const ratesInterval = setInterval(fetchRates, 300000); // Cada 5 minutos
    return () => clearInterval(ratesInterval);
  }, []);

  // Refrescar Clima en Vivo con tolerancia a fallos
  const refreshWeather = useCallback(async () => {
    const currentCity = CITIES[selectedCityIndex] || CITIES[2];
    try {
      const liveCurrent = await fetchLiveCityWeather(currentCity);
      setWeatherData(prev => {
        const next = { ...prev, [currentCity.name]: liveCurrent };
        try { localStorage.setItem('rd_weather_cache', JSON.stringify(next)); } catch { }
        return next;
      });
    } catch { }

    // Cargar las demás ciudades en segundo plano
    CITIES.forEach(c => {
      if (c.name !== currentCity.name) {
        fetchLiveCityWeather(c).then(live => {
          setWeatherData(prev => {
            const next = { ...prev, [c.name]: live };
            try { localStorage.setItem('rd_weather_cache', JSON.stringify(next)); } catch { }
            return next;
          });
        }).catch(() => { });
      }
    });
  }, [selectedCityIndex]);

  useEffect(() => {
    refreshWeather();
    const weatherInterval = setInterval(refreshWeather, 300000); // Cada 5 minutos
    return () => clearInterval(weatherInterval);
  }, [refreshWeather]);

  const handleRefreshAll = () => {
    fetchRates();
    refreshWeather();
  };

  const getWeatherInfo = (code: number = 0) => {
    if (code === 0) return { text: 'Despejado', icon: <Sun className="w-4 h-4 text-sky-500 animate-spin-slow" /> };
    if (code <= 3) return { text: 'Parcialmente Nublado', icon: <CloudSun className="w-4 h-4 text-blue-500" /> };
    if (code <= 48) return { text: 'Neblina / Nublado', icon: <Cloud className="w-4 h-4 text-slate-500" /> };
    if (code <= 67 || (code >= 80 && code <= 82)) return { text: 'Lluvias / Chubascos', icon: <CloudRain className="w-4 h-4 text-blue-600" /> };
    if (code >= 95) return { text: 'Tormenta Eléctrica', icon: <CloudLightning className="w-4 h-4 text-indigo-600" /> };
    return { text: 'Soleado', icon: <Sun className="w-4 h-4 text-sky-500" /> };
  };

  // Cerrar menú de ciudades al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.city-dropdown-container')) {
        setIsCityDropdownOpen(false);
      }
    };
    if (isCityDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCityDropdownOpen]);

  const activeCity = CITIES[selectedCityIndex] || CITIES[2];
  const activeWeatherData = weatherData[activeCity.name] || getFallbackWeatherForCity(activeCity, currentTime);
  const weatherIconInfo = getWeatherInfo(activeWeatherData.conditionCode);

  const formattedDate = currentTime.toLocaleDateString('es-VE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formattedTime = currentTime.toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <div className={`w-full bg-white border border-blue-200 rounded-2xl px-3.5 py-2.5 text-slate-800 shadow-md shadow-blue-950/8 mb-4 relative ${isCityDropdownOpen ? 'z-50' : 'z-30'} transition-all`}>
      <div className="relative z-10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 flex-wrap">

        {/* SECCIÓN 1: RELOJ DIGITAL & FECHA EN VIVO */}
        <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200/80 px-3 py-1.5 rounded-xl flex-1 min-w-[180px] transition-all">
          <div className="w-7 h-7 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-sky-200 animate-spin" style={{ animationDuration: '60s' }} />
          </div>
          <div className="min-w-0 flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <span className="text-sm font-extrabold text-slate-900 tracking-tight leading-none font-mono">
              {formattedTime}
            </span>
            <span className="text-blue-400 text-xs hidden sm:inline">•</span>
            <span className="text-[11px] text-slate-700 capitalize font-semibold truncate">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* SECCIÓN 2: COTIZACIÓN OFICIAL DEL DÓLAR ($) Y EURO (€) */}
        <div className="flex items-center gap-1.5 justify-between md:justify-center w-full md:w-auto">
          {/* Tarjeta USD BCV */}
          <div className="flex items-center gap-2 bg-emerald-50/80 border border-emerald-200 px-2.5 py-1.5 rounded-xl min-w-0 transition-all">
            <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-[10px]">
              <DollarSign className="w-3 h-3" />
            </div>
            <div className="flex items-baseline gap-1 min-w-0">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-800">USD</span>
              <span className="text-xs font-extrabold text-slate-900 font-mono">
                {dolarRate ? `Bs. ${dolarRate.toFixed(2)}` : 'Bs. --'}
              </span>
            </div>
          </div>

          {/* Tarjeta EUR BCV */}
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-xl min-w-0 transition-all">
            <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-[10px]">
              <Euro className="w-3 h-3" />
            </div>
            <div className="flex items-baseline gap-1 min-w-0">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-800">EUR</span>
              <span className="text-xs font-extrabold text-slate-900 font-mono">
                {euroRate ? `Bs. ${euroRate.toFixed(2)}` : 'Bs. --'}
              </span>
            </div>
          </div>

          {/* Botón Refrescar Tasas y Clima */}
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={loadingRates}
            title="Actualizar Cotizaciones BCV y Clima en Vivo"
            className="p-2 rounded-xl bg-blue-100/80 hover:bg-blue-200 border border-blue-200 text-blue-800 transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 transition-transform ${loadingRates ? 'animate-spin text-blue-700' : 'group-hover:rotate-180'}`} />
          </button>
        </div>

        {/* SECCIÓN 3: MONITOR DE CLIMA MULTICIUDAD */}
        <div className="relative city-dropdown-container shrink-0 min-w-[160px]">
          <button
            type="button"
            onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
            className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 hover:border-blue-300 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer text-left w-full group"
            title="Haz clic para cambiar de ciudad"
          >
            <div className="w-6 h-6 rounded-lg bg-white border border-blue-200 flex items-center justify-center shrink-0 shadow-2xs">
              {weatherIconInfo.icon}
            </div>
            <div className="min-w-0 flex-1 flex items-center gap-1.5">
              <span className="text-xs font-bold text-blue-800 truncate">
                {activeCity.name}
              </span>
              <span className="text-xs font-extrabold text-slate-900 font-mono">
                {activeWeatherData.temp !== undefined ? `${activeWeatherData.temp}°C` : '28°C'}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform text-blue-600 shrink-0 ml-auto ${isCityDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Menú Desplegable de Selección de Ciudades */}
          {isCityDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-blue-200 rounded-2xl shadow-2xl shadow-blue-950/20 ring-1 ring-blue-100 z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150 max-h-[380px] overflow-y-auto">
              <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-blue-100 flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-blue-800 font-bold">
                  <MapPin className="w-3.5 h-3.5" /> Ciudades Disponibles
                </span>
                <span className="text-slate-500 text-[9px] font-bold">Pronóstico en Vivo</span>
              </div>
              {CITIES.map((c, index) => {
                const cWeather = weatherData[c.name] || getFallbackWeatherForCity(c, currentTime);
                const isSelected = selectedCityIndex === index;
                const cIconInfo = getWeatherInfo(cWeather.conditionCode);
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      setSelectedCityIndex(index);
                      localStorage.setItem('rd_weather_city_idx', String(index));
                      localStorage.setItem('rd_preferred_city', c.name);
                      setIsCityDropdownOpen(false);
                      fetchLiveCityWeather(c).then(live => {
                        setWeatherData(prev => {
                          const next = { ...prev, [c.name]: live };
                          try { localStorage.setItem('rd_weather_cache', JSON.stringify(next)); } catch { }
                          return next;
                        });
                      });
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${isSelected
                      ? 'bg-[#1e3a8a] text-white font-bold shadow-md'
                      : 'hover:bg-blue-50 text-slate-800'
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-100/70 text-blue-700 border border-blue-200'}`}>
                        {cIconInfo.icon}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold leading-tight truncate">{c.name}</p>
                        <p className={`text-[10px] truncate ${isSelected ? 'text-sky-200 font-semibold' : 'text-slate-500'}`}>
                          {c.state} • {cWeather.conditionText || 'Parcialmente Nublado'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs font-black shrink-0 ml-2">
                      {cWeather.temp !== undefined ? `${cWeather.temp}°C` : '28°C'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
