import { useState, useMemo, useEffect } from 'react';
import { 
  X, Calendar, Sparkles, Scale, Flag, PartyPopper, 
  Briefcase, Search
} from 'lucide-react';
import { 
  getEfemerideDelDia, 
  getProximasEfemerides, 
  getEfemeridesPorMes
} from '../../lib/efemeridesVenezuela';

interface EfemeridesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate?: Date;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function EfemeridesModal({
  isOpen,
  onClose,
  currentDate = new Date()
}: EfemeridesModalProps) {
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sincronizar mes inicial al abrir
  useEffect(() => {
    if (isOpen) {
      setSelectedMonth(currentDate.getMonth() + 1);
    }
  }, [isOpen, currentDate]);

  // Efeméride de hoy
  const todayEfemeride = useMemo(() => {
    return getEfemerideDelDia(currentDate);
  }, [currentDate]);

  // Próximas 5 efemérides
  const proximas = useMemo(() => {
    return getProximasEfemerides(currentDate, 45).slice(0, 4);
  }, [currentDate]);

  // Efemérides del mes seleccionado con filtros
  const filteredList = useMemo(() => {
    let list = getEfemeridesPorMes(selectedMonth);

    if (categoryFilter !== 'todas') {
      list = list.filter(e => e.categoria === categoryFilter);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(e => 
        e.titulo.toLowerCase().includes(q) || 
        e.descripcion.toLowerCase().includes(q) ||
        e.mensajeKant.toLowerCase().includes(q)
      );
    }

    return list;
  }, [selectedMonth, categoryFilter, searchQuery]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in select-none"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-amber-400/40 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header con Aura y Glow Neón */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-between gap-3 relative">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(245,158,11,0.3)] shrink-0">
              🇻🇪
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                  Efemérides & Feriados de Venezuela <Sparkles className="w-4 h-4 text-amber-400" />
                </h3>
                <span className="px-2 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[9px] font-black uppercase tracking-wider">
                  KANT Legal
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Fechas patrias, días del derecho, festividades culturales y celebraciones venezolanas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Cuerpo Desplazable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 scrollbar-thin">
          
          {/* Tarjeta Destacada: Efeméride de Hoy (o la más próxima) */}
          {todayEfemeride ? (
            <div className="bg-gradient-to-br from-amber-500/20 via-slate-900 to-amber-950/30 border border-amber-400/50 p-4 sm:p-5 rounded-3xl shadow-xl relative overflow-hidden glow-amber-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl sm:text-4xl filter drop-shadow-md">{todayEfemeride.icono}</span>
                  <div>
                    <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded-full uppercase tracking-wider">
                      ¡Efeméride de Hoy!
                    </span>
                    <h4 className="text-base sm:text-lg font-black text-white mt-1">
                      {todayEfemeride.titulo}
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {todayEfemeride.descripcion}
                    </p>
                  </div>
                </div>

                {todayEfemeride.esFeriado && (
                  <span className="px-2.5 py-1 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md shrink-0">
                    Feriado Nacional
                  </span>
                )}
              </div>

              {/* Mensaje de Kant */}
              <div className="mt-3 pt-3 border-t border-amber-400/20 flex items-center gap-2 text-xs text-amber-200 bg-amber-950/40 p-2.5 rounded-xl border border-amber-400/30">
                <span className="text-base shrink-0">🐾</span>
                <span className="font-medium italic">{todayEfemeride.mensajeKant}</span>
              </div>
            </div>
          ) : (
            proximas.length > 0 && (
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-2xl sm:text-3xl shrink-0 p-2 bg-slate-800/80 rounded-2xl border border-slate-700">
                    {proximas[0].icono}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      Próxima Celebración en Venezuela ({proximas[0].fechaStr})
                    </span>
                    <h4 className="text-sm font-black text-white truncate">
                      {proximas[0].titulo}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {proximas[0].descripcion}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black rounded-xl shrink-0 self-end sm:self-auto">
                  {proximas[0].diasFaltantes === 1 ? '¡Mañana!' : `En ${proximas[0].diasFaltantes} días`}
                </span>
              </div>
            )
          )}

          {/* Barra de Filtros y Búsqueda */}
          <div className="space-y-3">
            {/* Selector de Meses Horizontal */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {MONTH_NAMES.map((name, idx) => {
                const monthNum = idx + 1;
                const isSelected = selectedMonth === monthNum;
                const isCurrent = (currentDate.getMonth() + 1) === monthNum;

                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedMonth(monthNum)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                        : isCurrent
                        ? 'bg-slate-800 text-amber-300 border border-amber-400/40 hover:bg-slate-700'
                        : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                    }`}
                  >
                    <span>{name}</span>
                    {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  </button>
                );
              })}
            </div>

            {/* Categorías y Buscador */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-wrap">
                {[
                  { id: 'todas', label: 'Todas', icon: Sparkles },
                  { id: 'juridica', label: 'Jurídicas ⚖️', icon: Scale },
                  { id: 'patria', label: 'Patrias 🇻🇪', icon: Flag },
                  { id: 'festiva', label: 'Festivas 🎃', icon: PartyPopper },
                  { id: 'profesional', label: 'Profesionales', icon: Briefcase }
                ].map(cat => {
                  const isCat = categoryFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        isCat
                          ? 'bg-slate-800 text-amber-300 border border-amber-400/50'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Buscador */}
              <div className="relative min-w-[180px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar efeméride..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Listado de Efemérides del Mes */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold border-b border-slate-800 pb-1.5">
              <span>Efemérides de {MONTH_NAMES[selectedMonth - 1]} ({filteredList.length})</span>
              <span className="text-[10px] text-amber-400">Plataforma KANT</span>
            </div>

            {filteredList.length === 0 ? (
              <div className="text-center py-10 bg-slate-950/40 rounded-2xl border border-slate-800/80">
                <span className="text-3xl block mb-2">📜</span>
                <p className="text-xs text-slate-400 font-medium">
                  No se encontraron efemérides registradas con los filtros actuales.
                </p>
              </div>
            ) : (
              filteredList.map((ef) => {
                const isToday = todayEfemeride?.id === ef.id;

                return (
                  <div
                    key={ef.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isToday
                        ? 'bg-amber-500/10 border-amber-400/60 shadow-md ring-1 ring-amber-400/30'
                        : ef.categoria === 'juridica'
                        ? 'bg-slate-950/80 border-amber-500/30 hover:border-amber-500/50'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Badge con Día del Mes */}
                      <div className="w-11 h-11 rounded-2xl bg-slate-800/90 border border-slate-700 flex flex-col items-center justify-center shrink-0 shadow-inner">
                        <span className="text-xs font-black text-amber-400 leading-none">{ef.dia}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">
                          {MONTH_NAMES[ef.mes - 1].slice(0, 3)}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base shrink-0">{ef.icono}</span>
                          <h5 className="text-xs sm:text-sm font-black text-white leading-tight">
                            {ef.titulo}
                          </h5>

                          {ef.esFeriado && (
                            <span className="px-2 py-0.2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-md text-[9px] font-bold uppercase tracking-wider">
                              Feriado
                            </span>
                          )}

                          {ef.categoria === 'juridica' && (
                            <span className="px-2 py-0.2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md text-[9px] font-bold uppercase tracking-wider">
                              Derecho & Justicia
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {ef.descripcion}
                        </p>

                        {/* Mensaje de Kant */}
                        {ef.mensajeKant && (
                          <p className="text-[11px] text-amber-300/90 font-medium italic mt-1.5 flex items-center gap-1">
                            <span>🐾 Kant:</span>
                            <span>"{ef.mensajeKant}"</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 3. Próximas Fechas Destacadas del Año */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-4 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Próximas Fechas Clave para la Firma
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {proximas.map(p => (
                <div key={p.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-lg">{p.icono}</span>
                    <div className="truncate">
                      <p className="font-bold text-white truncate">{p.titulo}</p>
                      <p className="text-[10px] text-slate-400">{p.fechaStr}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 shrink-0">
                    {p.diasFaltantes === 0 ? '¡Hoy!' : p.diasFaltantes === 1 ? 'Mañana' : `En ${p.diasFaltantes}d`}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* 4. Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>🐾 KANT con la historia y tradiciones de Venezuela</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-md"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
