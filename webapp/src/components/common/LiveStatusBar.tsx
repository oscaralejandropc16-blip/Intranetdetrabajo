import { useState, useEffect } from 'react';
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

interface CityWeather {
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

const CITIES: CityWeather[] = [
  { name: 'Caracas', state: 'Distrito Capital', lat: 10.4806, lon: -66.9036 },
  { name: 'Boca de Aroa', state: 'Falcón', lat: 10.7483, lon: -68.3075 },
  { name: 'Valencia', state: 'Carabobo', lat: 10.1620, lon: -68.0077 },
  { name: 'La Guaira', state: 'Vargas', lat: 10.6014, lon: -66.9322 },
  { name: 'Maracaibo', state: 'Zulia', lat: 10.6544, lon: -71.6372 }
];

export default function LiveStatusBar() {
  // 1. Estado del Reloj y Fecha
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

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
  const [selectedCityIndex, setSelectedCityIndex] = useState<number>(0);
  const [weatherData, setWeatherData] = useState<Record<string, CityWeather>>({});
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);

  // Efecto Reloj en Vivo (cada 1 segundo)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Efecto Carga de Divisas (Dólar / Euro Oficiales)
  const fetchRates = async () => {
    setLoadingRates(true);
    try {
      // 1. Tasa USD Oficial
      const resUsd = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      if (resUsd.ok) {
        const dataUsd = await resUsd.json();
        if (dataUsd && dataUsd.promedio) {
          setDolarRate(dataUsd.promedio);
          localStorage.setItem('rd_bcv_usd', dataUsd.promedio.toString());
        }
      }

      // 2. Tasa EUR Oficial
      const resEur = await fetch('https://ve.dolarapi.com/v1/euros/oficial');
      if (resEur.ok) {
        const dataEur = await resEur.json();
        if (dataEur && dataEur.promedio) {
          setEuroRate(dataEur.promedio);
          localStorage.setItem('rd_bcv_eur', dataEur.promedio.toString());
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

  // Efecto Carga de Clima (Open-Meteo API)
  const fetchCityWeather = async (city: CityWeather) => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true&hourly=relativehumidity_2m`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const current = data.current_weather;
        const temp = current ? Math.round(current.temperature) : undefined;
        const code = current ? current.weathercode : 0;
        const wind = current ? Math.round(current.windspeed) : undefined;

        // Obtener humedad aproximada de la hora actual
        let hum: number | undefined = undefined;
        if (data.hourly && data.hourly.relativehumidity_2m && data.hourly.relativehumidity_2m.length > 0) {
          const hour = new Date().getHours();
          hum = data.hourly.relativehumidity_2m[hour] || data.hourly.relativehumidity_2m[0];
        }

        const conditionInfo = getWeatherInfo(code);

        setWeatherData(prev => ({
          ...prev,
          [city.name]: {
            ...city,
            temp,
            conditionCode: code,
            conditionText: conditionInfo.text,
            humidity: hum,
            windSpeed: wind
          }
        }));
      }
    } catch (e) {
      console.warn(`Error obteniendo clima para ${city.name}:`, e);
    }
  };

  useEffect(() => {
    // Cargar clima de la ciudad actual seleccionada y de todas en segundo plano
    CITIES.forEach(c => fetchCityWeather(c));
    const weatherInterval = setInterval(() => {
      CITIES.forEach(c => fetchCityWeather(c));
    }, 600000); // Cada 10 minutos
    return () => clearInterval(weatherInterval);
  }, []);

  const getWeatherInfo = (code: number = 0) => {
    if (code === 0) return { text: 'Despejado', icon: <Sun className="w-5 h-5 text-amber-400 animate-spin-slow" /> };
    if (code <= 3) return { text: 'Parcialmente Nublado', icon: <CloudSun className="w-5 h-5 text-amber-300" /> };
    if (code <= 48) return { text: 'Neblina / Nublado', icon: <Cloud className="w-5 h-5 text-slate-300" /> };
    if (code <= 67 || (code >= 80 && code <= 82)) return { text: 'Lluvias / Chubascos', icon: <CloudRain className="w-5 h-5 text-blue-400" /> };
    if (code >= 95) return { text: 'Tormenta Eléctrica', icon: <CloudLightning className="w-5 h-5 text-amber-400" /> };
    return { text: 'Soleado', icon: <Sun className="w-5 h-5 text-amber-400" /> };
  };

  const activeCity = CITIES[selectedCityIndex];
  const activeWeatherData = weatherData[activeCity.name] || activeCity;
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
    <div className="w-full bg-slate-900/90 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-3 sm:p-4 text-white shadow-xl mb-6 relative overflow-hidden">
      {/* Luz ambiental de fondo */}
      <div className="absolute top-0 right-1/4 w-72 h-20 bg-amber-500/10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-72 h-20 bg-blue-500/10 blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* SECCIÓN 1: RELOJ DIGITAL & FECHA EN VIVO */}
        <div className="flex items-center gap-3.5 bg-slate-950/60 border border-white/5 px-4 py-2.5 rounded-xl shadow-inner flex-1 sm:flex-none">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight leading-none">
                {formattedTime}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                VET
              </span>
            </div>
            <p className="text-xs text-slate-400 capitalize font-medium mt-0.5">
              {formattedDate}
            </p>
          </div>
        </div>

        {/* SECCIÓN 2: COTIZACIÓN OFICIAL DEL DÓLAR ($) Y EURO (€) */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          {/* Tarjeta USD */}
          <div className="flex items-center gap-3 bg-emerald-950/40 border border-emerald-500/30 px-3.5 py-2 rounded-xl flex-1 sm:flex-none shadow-sm hover:border-emerald-500/50 transition-all">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0 font-bold text-sm">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">USD BCV</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <p className="text-base font-black text-white font-mono">
                {dolarRate ? `Bs. ${dolarRate.toFixed(2)}` : 'Bs. --'}
              </p>
            </div>
          </div>

          {/* Tarjeta EUR */}
          <div className="flex items-center gap-3 bg-blue-950/40 border border-blue-500/30 px-3.5 py-2 rounded-xl flex-1 sm:flex-none shadow-sm hover:border-blue-500/50 transition-all">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 flex-shrink-0 font-bold text-sm">
              <Euro className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">EUR BCV</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              </div>
              <p className="text-base font-black text-white font-mono">
                {euroRate ? `Bs. ${euroRate.toFixed(2)}` : 'Bs. --'}
              </p>
            </div>
          </div>

          {/* Botón Refrescar Tasas */}
          <button
            onClick={fetchRates}
            disabled={loadingRates}
            title="Actualizar Cotizaciones BCV"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loadingRates ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>

        {/* SECCIÓN 3: MONITOR DE CLIMA MULTICIUDAD (Caracas, Boca de Aroa, Valencia, La Guaira, Maracaibo) */}
        <div className="relative flex items-center gap-3 bg-slate-950/60 border border-white/5 px-4 py-2 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
              {weatherIconInfo.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                  className="text-xs font-black text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{activeCity.name}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCityDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">({activeCity.state})</span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-lg font-black text-white font-mono">
                  {activeWeatherData.temp !== undefined ? `${activeWeatherData.temp}°C` : '--°C'}
                </span>
                <span className="text-[11px] text-slate-300 font-medium truncate max-w-[130px] sm:max-w-none">
                  {activeWeatherData.conditionText || 'Cargando...'}
                </span>
                {activeWeatherData.humidity !== undefined && (
                  <span className="text-[10px] text-blue-300 font-bold hidden md:inline">
                    💧 {activeWeatherData.humidity}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Menú Desplegable de Selección de Ciudades */}
          {isCityDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                Seleccionar Ciudad
              </div>
              {CITIES.map((c, index) => {
                const cWeather = weatherData[c.name];
                const isSelected = selectedCityIndex === index;
                return (
                  <button
                    key={c.name}
                    onClick={() => {
                      setSelectedCityIndex(index);
                      setIsCityDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                      isSelected 
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md' 
                        : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-amber-400'}`} />
                      <div>
                        <p className="text-xs font-bold leading-tight">{c.name}</p>
                        <p className={`text-[10px] ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>{c.state}</p>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs font-black">
                      {cWeather && cWeather.temp !== undefined ? `${cWeather.temp}°C` : '--'}
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
