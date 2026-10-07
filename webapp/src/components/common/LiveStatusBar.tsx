import { useState, useEffect, useMemo, useCallback } from 'react';
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
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { syncServerTime, getServerDateSync } from '../../lib/supabaseAdapter';
import { 
  getEfemerideDelDia, 
  getProximasEfemerides,
  getActiveDate,
  getSimulatedDate,
  setSimulatedDate
} from '../../lib/efemeridesVenezuela';
import EfemeridesModal from './EfemeridesModal';
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

  // 4. Estado de Efemérides de Venezuela
  const [isEfemeridesModalOpen, setIsEfemeridesModalOpen] = useState(false);

  const todayEfemeride = useMemo(() => {
    return getEfemerideDelDia(currentTime);
  }, [currentTime]);

  const proximaEfemeride = useMemo(() => {
    if (todayEfemeride) return null;
    const proximas = getProximasEfemerides(currentTime, 30);
    return proximas.length > 0 ? proximas[0] : null;
  }, [currentTime, todayEfemeride]);

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
          } catch {}
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
          } catch {}
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
        try { localStorage.setItem('rd_weather_cache', JSON.stringify(next)); } catch {}
        return next;
      });
    } catch {}

    // Cargar las demás ciudades en segundo plano
    CITIES.forEach(c => {
      if (c.name !== currentCity.name) {
        fetchLiveCityWeather(c).then(live => {
          setWeatherData(prev => {
            const next = { ...prev, [c.name]: live };
            try { localStorage.setItem('rd_weather_cache', JSON.stringify(next)); } catch {}
            return next;
          });
        }).catch(() => {});
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
    if (code === 0) return { text: 'Despejado', icon: <Sun className="w-5 h-5 text-amber-400 animate-spin-slow" /> };
    if (code <= 3) return { text: 'Parcialmente Nublado', icon: <CloudSun className="w-5 h-5 text-amber-300" /> };
    if (code <= 48) return { text: 'Neblina / Nublado', icon: <Cloud className="w-5 h-5 text-slate-300" /> };
    if (code <= 67 || (code >= 80 && code <= 82)) return { text: 'Lluvias / Chubascos', icon: <CloudRain className="w-5 h-5 text-blue-400" /> };
    if (code >= 95) return { text: 'Tormenta Eléctrica', icon: <CloudLightning className="w-5 h-5 text-amber-400" /> };
    return { text: 'Soleado', icon: <Sun className="w-5 h-5 text-amber-400" /> };
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
    <div className={`w-full bg-slate-900/90 backdrop-blur-2xl border border-slate-800/90 rounded-2xl p-2.5 sm:p-3 text-white shadow-xl mb-4 relative ${isCityDropdownOpen ? 'z-50' : 'z-30'} transition-all`}>
      {/* Luz ambiental de fondo (Aurora Glow) */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
        <div className="absolute -top-10 right-1/4 w-80 h-24 bg-gradient-to-r from-amber-500/15 via-yellow-400/10 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '6s' }}></div>
        <div className="absolute -bottom-10 left-1/4 w-80 h-24 bg-gradient-to-r from-emerald-500/10 via-blue-500/15 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '8s' }}></div>
      </div>

      <div className="relative z-10 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5 sm:gap-3 flex-wrap">
        
        {/* SECCIÓN 1: RELOJ DIGITAL & FECHA EN VIVO CON GLOW */}
        <div className="flex items-center gap-3 bg-slate-950/80 border border-amber-500/20 hover:border-amber-500/40 px-3.5 py-1.5 rounded-xl shadow-inner flex-1 min-w-[200px] transition-all duration-300 group">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.25)] shrink-0 group-hover:scale-105 transition-transform">
            <Clock className="w-4 h-4 animate-spin" style={{ animationDuration: '60s' }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-black text-white tracking-tight leading-none truncate font-mono">
                {formattedTime}
              </span>
              <span translate="no" className="text-[8px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-1 py-0.2 rounded border border-amber-500/40 shrink-0 notranslate shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                VEN
              </span>
            </div>
            <p className="text-[10px] text-slate-400 capitalize font-medium truncate mt-0.5">
              {formattedDate}
            </p>
          </div>
        </div>

        {/* SECCIÓN EFEMÉRIDES DE VENEZUELA (INTERACTIVA) */}
        <button
          type="button"
          onClick={() => setIsEfemeridesModalOpen(true)}
          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all duration-300 cursor-pointer text-left group shrink-0 ${
            todayEfemeride 
              ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/30' 
              : 'bg-slate-950/80 hover:bg-slate-950 border-white/10 hover:border-amber-400/50 shadow-inner'
          }`}
          title="Ver Efemérides de Venezuela y Feriados Legales"
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform ${
            todayEfemeride 
              ? 'bg-amber-500/30 border border-amber-400/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]' 
              : 'bg-slate-800/80 border border-slate-700'
          }`}>
            {todayEfemeride ? todayEfemeride.icono : '🇻🇪'}
          </div>
          <div className="min-w-0 max-w-[190px] sm:max-w-[220px]">
            <div className="flex items-center gap-1.5">
              <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                simulatedDate
                  ? 'bg-purple-500 text-white border-purple-400 font-black animate-pulse'
                  : todayEfemeride 
                    ? 'bg-amber-400 text-slate-950 border-amber-300' 
                    : 'bg-slate-800 text-amber-300 border-amber-500/30'
              }`}>
                {simulatedDate ? '🧪 PRUEBA VZLA' : todayEfemeride ? 'HOY EN VENEZUELA' : 'EFEMÉRIDES VZLA'}
              </span>
              {simulatedDate && (
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSimulatedDate(null);
                  }}
                  className="text-[7.5px] font-bold text-purple-200 bg-purple-900/90 hover:bg-purple-800 px-1 py-0.2 rounded border border-purple-400/40 cursor-pointer"
                  title="Restablecer a fecha real automática"
                >
                  Restablecer
                </span>
              )}
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0 opacity-80 group-hover:opacity-100" />
            </div>
            <p className="text-[11px] font-bold text-white leading-tight truncate mt-0.5">
              {todayEfemeride 
                ? todayEfemeride.titulo 
                : proximaEfemeride 
                  ? `${proximaEfemeride.icono} ${proximaEfemeride.titulo}` 
                  : 'Explorar Fechas Patrias & Legales'}
            </p>
          </div>
        </button>

        {/* SECCIÓN 2: COTIZACIÓN OFICIAL DEL DÓLAR ($) Y EURO (€) CON GLOW NEÓN RESPONSIVE */}
        <div className="flex items-center gap-1.5 sm:gap-2 justify-between md:justify-center w-full md:w-auto">
          {/* Tarjeta USD BCV Neón */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-emerald-950/50 hover:bg-emerald-950/70 border border-emerald-500/40 hover:border-emerald-400 px-2.5 sm:px-3 py-1.5 rounded-xl flex-1 sm:flex-none shadow-[0_0_15px_-2px_rgba(16,185,129,0.3)] hover:shadow-[0_0_24px_rgba(16,185,129,0.5)] min-w-0 transition-all duration-300 group cursor-default">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-emerald-500/25 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shrink-0 font-bold text-xs shadow-[0_0_8px_rgba(16,185,129,0.4)] group-hover:scale-110 transition-transform">
              <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[7.5px] sm:text-[8px] font-black uppercase tracking-wider text-emerald-400 truncate">USD BCV</span>
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-[11px] sm:text-sm font-black text-white leading-tight font-mono tracking-tight truncate">
                {dolarRate ? `Bs. ${dolarRate.toFixed(2)}` : 'Bs. --'}
              </p>
            </div>
          </div>

          {/* Tarjeta EUR BCV Neón */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-blue-950/50 hover:bg-blue-950/70 border border-blue-500/40 hover:border-blue-400 px-2.5 sm:px-3 py-1.5 rounded-xl flex-1 sm:flex-none shadow-[0_0_15px_-2px_rgba(59,130,246,0.3)] hover:shadow-[0_0_24px_rgba(59,130,246,0.5)] min-w-0 transition-all duration-300 group cursor-default">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-blue-500/25 border border-blue-400/50 flex items-center justify-center text-blue-300 shrink-0 font-bold text-xs shadow-[0_0_8px_rgba(59,130,246,0.4)] group-hover:scale-110 transition-transform">
              <Euro className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[7.5px] sm:text-[8px] font-black uppercase tracking-wider text-blue-400 truncate">EUR BCV</span>
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                </span>
              </div>
              <p className="text-[11px] sm:text-sm font-black text-white leading-tight font-mono tracking-tight truncate">
                {euroRate ? `Bs. ${euroRate.toFixed(2)}` : 'Bs. --'}
              </p>
            </div>
          </div>

          {/* Botón Refrescar Tasas y Clima con Glow en Hover */}
          <button
            onClick={handleRefreshAll}
            disabled={loadingRates}
            title="Actualizar Cotizaciones BCV y Clima en Vivo"
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 hover:border-amber-400/50 text-slate-300 hover:text-amber-400 hover:shadow-[0_0_12px_rgba(245,158,11,0.3)] transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 transition-transform ${loadingRates ? 'animate-spin text-amber-400' : 'group-hover:rotate-180'}`} />
          </button>
        </div>

        {/* SECCIÓN 3: MONITOR DE CLIMA MULTICIUDAD */}
        <div className="relative city-dropdown-container shrink-0 min-w-[175px] sm:min-w-[200px]">
          <button
            onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
            className="flex items-center gap-2.5 bg-slate-950/80 hover:bg-slate-950 border border-white/10 hover:border-amber-400/50 px-3 py-1.5 rounded-xl transition-all duration-300 cursor-pointer text-left w-full shadow-sm hover:shadow-[0_0_15px_rgba(245,158,11,0.25)] group"
            title="Haz clic para cambiar de ciudad"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_8px_rgba(245,158,11,0.2)]">
              {weatherIconInfo.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-black text-amber-400 flex items-center gap-1 uppercase tracking-wider truncate">
                  <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>{activeCity.name}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform text-amber-400 shrink-0 ${isCityDropdownOpen ? 'rotate-180' : ''}`} />
                </span>
                <span className="text-[9px] text-slate-400 font-medium hidden xl:inline">({activeCity.state})</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.2">
                <span className="text-xs sm:text-sm font-black text-white leading-none">
                  {activeWeatherData.temp !== undefined ? `${activeWeatherData.temp}°C` : '28°C'}
                </span>
                <span className="text-[10px] text-slate-300 font-medium truncate max-w-[110px] sm:max-w-none">
                  {activeWeatherData.conditionText || 'Parcialmente Nublado'}
                </span>
              </div>
            </div>
          </button>

          {/* Menú Desplegable de Selección de Ciudades */}
          {isCityDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-slate-900/98 border border-slate-700/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] ring-1 ring-white/10 z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl max-h-[380px] overflow-y-auto">
              <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <MapPin className="w-3.5 h-3.5" /> Ciudades Disponibles
                </span>
                <span className="text-slate-400 text-[9px] font-bold">Pronóstico en Vivo</span>
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
                          try { localStorage.setItem('rd_weather_cache', JSON.stringify(next)); } catch {}
                          return next;
                        });
                      });
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md' 
                        : 'hover:bg-slate-800/80 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800/90 text-amber-400'}`}>
                        {cIconInfo.icon}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold leading-tight truncate">{c.name}</p>
                        <p className={`text-[10px] truncate ${isSelected ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
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
      
      {/* Modal Interactivo de Efemérides & Feriados de Venezuela */}
      <EfemeridesModal
        isOpen={isEfemeridesModalOpen}
        onClose={() => setIsEfemeridesModalOpen(false)}
        currentDate={currentTime}
      />
    </div>
  );
}
