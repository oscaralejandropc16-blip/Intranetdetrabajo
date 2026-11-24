import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Calendar, Scale, Flag, PartyPopper,
  Briefcase, Search, BookOpen
} from 'lucide-react';
import {
  getEfemerideDelDia,
  getProximasEfemerides,
  getEfemeridesPorMes,
  getDisfrazParaEfemeride
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
  const activeModalDate = currentDate;
  const currentMonth = activeModalDate.getMonth() + 1; // 1-12
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sincronizar mes inicial al abrir
  useEffect(() => {
    if (isOpen) {
      setSelectedMonth(activeModalDate.getMonth() + 1);
    }
  }, [isOpen, activeModalDate]);

  // Efeméride de hoy
  const todayEfemeride = useMemo(() => {
    return getEfemerideDelDia(activeModalDate);
  }, [activeModalDate]);

  const todayDisfraz = useMemo(() => {
    return getDisfrazParaEfemeride(todayEfemeride);
  }, [todayEfemeride]);

  // Próximas 5 efemérides
  const proximas = useMemo(() => {
    return getProximasEfemerides(activeModalDate, 45).slice(0, 4);
  }, [activeModalDate]);

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

  // Cerrar al presionar la tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-slate-900/50 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-5 animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="bg-white border-t sm:border border-blue-200 rounded-t-3xl sm:rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl shadow-blue-950/25 overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 text-slate-900 safe-area-pb"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle móvil */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 bg-[#172554]">
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>

        {/* 1. Header Zafiro Corporativo */}
        <div className="p-4 sm:p-5 border-b border-blue-800/60 bg-gradient-to-r from-[#172554] via-[#1e3a8a] to-[#1d4ed8] text-white flex items-center justify-between gap-3 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white shrink-0 shadow-sm">
              <Flag className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-1.5">
                  Efemérides & Feriados de Venezuela
                </h3>
                <span className="px-2.5 py-0.5 bg-white/15 text-sky-100 border border-white/25 rounded-full text-[9px] font-extrabold uppercase tracking-wider">
                  KANT Legal
                </span>
              </div>
              <p className="text-xs text-blue-100/85 mt-0.5 font-medium">
                Fechas patrias, días del derecho, festividades culturales y celebraciones venezolanas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white bg-white/15 hover:bg-white/25 border border-white/25 transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Cuerpo Desplazable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-kant-canvas">

          {/* Tarjeta Destacada: Efeméride de Hoy (o la más próxima) */}
          {todayEfemeride ? (
            <div className="bg-white border border-blue-200 p-5 rounded-3xl shadow-md shadow-blue-950/8 relative overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-blue-100 shadow-xs flex items-center justify-center text-2xl shrink-0">
                    {todayEfemeride.icono}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-full uppercase tracking-wider shadow-xs">
                        Efeméride de Hoy
                      </span>
                      {todayDisfraz?.badgeLabel && (
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[10px] rounded-full uppercase tracking-wider">
                          {todayDisfraz.badgeLabel}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1.5 leading-snug">
                      {todayEfemeride.titulo}
                    </h3>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed font-normal">
                      {todayEfemeride.descripcion}
                    </p>
                  </div>
                </div>

                {todayEfemeride.esFeriado && (
                  <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0">
                    Feriado Nacional
                  </span>
                )}
              </div>

              {/* Mensaje de Kant */}
              <div className="mt-3.5 p-3 rounded-2xl bg-white/90 border border-blue-100 flex items-center gap-2.5 shadow-2xs">
                <img src="/dog_logo.png" alt="KANT" className="w-6 h-6 object-contain shrink-0" />
                <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                  <strong className="text-blue-700 font-bold">Mensaje de KANT: </strong>
                  "{todayEfemeride.mensajeKant}"
                </p>
              </div>
            </div>
          ) : (
            proximas.length > 0 && (
              <div className="bg-white border border-blue-100 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="text-3xl shrink-0 p-2.5 bg-blue-50 rounded-2xl border border-blue-100">
                    {proximas[0].icono}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold text-blue-600 uppercase tracking-wider">
                      Próxima Celebración en Venezuela ({proximas[0].fechaStr})
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-0.5">
                      {proximas[0].titulo}
                    </h4>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                      {proximas[0].descripcion}
                    </p>
                  </div>
                </div>
                <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl shrink-0 self-end sm:self-auto">
                  {proximas[0].diasFaltantes === 1 ? 'Mañana' : `En ${proximas[0].diasFaltantes} días`}
                </span>
              </div>
            )
          )}

          {/* Barra de Filtros y Búsqueda */}
          <div className="space-y-3 bg-white/90 p-4 rounded-2xl border border-blue-100 shadow-2xs">
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
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${isSelected
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                      : isCurrent
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                        : 'bg-slate-50 text-slate-600 hover:text-blue-700 hover:bg-blue-50/70 border border-slate-200/80'
                      }`}
                  >
                    <span>{name}</span>
                    {isCurrent && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-600'}`} />}
                  </button>
                );
              })}
            </div>

            {/* Categorías y Buscador */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-wrap">
                {[
                  { id: 'todas', label: 'Todas', icon: Calendar },
                  { id: 'juridica', label: 'Jurídicas', icon: Scale },
                  { id: 'patria', label: 'Patrias', icon: Flag },
                  { id: 'festiva', label: 'Festivas', icon: PartyPopper },
                  { id: 'profesional', label: 'Profesionales', icon: Briefcase }
                ].map(cat => {
                  const isCat = categoryFilter === cat.id;
                  const CatIcon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${isCat
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                        : 'bg-white text-slate-600 hover:text-blue-700 hover:bg-blue-50/50 border border-slate-200'
                        }`}
                    >
                      <CatIcon className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Buscador */}
              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar efeméride..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 focus:bg-white border border-blue-100 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Listado de Efemérides del Mes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 font-bold border-b border-blue-100 pb-2">
              <span>Efemérides de {MONTH_NAMES[selectedMonth - 1]} ({filteredList.length})</span>
              <span className="text-[11px] text-blue-600">Plataforma KANT</span>
            </div>

            {filteredList.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-3xl border border-blue-100">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-2.5">
                  <BookOpen className="w-6 h-6" />
                </div>
                <p className="text-sm text-slate-600 font-medium">
                  No se encontraron efemérides registradas con los filtros actuales.
                </p>
              </div>
            ) : (
              filteredList.map((ef) => {
                const isToday = todayEfemeride?.id === ef.id;

                return (
                  <div
                    key={ef.id}
                    className={`p-4 sm:p-4.5 rounded-2xl border transition-all ${isToday
                      ? 'bg-gradient-to-r from-blue-50/90 via-white to-indigo-50/60 border-blue-300 shadow-md ring-1 ring-blue-200'
                      : ef.categoria === 'juridica'
                        ? 'bg-white border-blue-100 hover:border-blue-300 shadow-xs'
                        : 'bg-white border-blue-100/80 hover:border-blue-200 shadow-2xs'
                      }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Badge con Día del Mes */}
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/80 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                        <span className="text-lg font-black text-slate-900 leading-none">{ef.dia}</span>
                        <span className="text-[10px] font-bold text-blue-700 uppercase mt-1">
                          {MONTH_NAMES[ef.mes - 1].slice(0, 3)}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xl shrink-0">{ef.icono}</span>
                          <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                            {ef.titulo}
                          </h4>

                          {ef.esFeriado && (
                            <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold uppercase tracking-wider">
                              Feriado
                            </span>
                          )}

                          {ef.categoria === 'juridica' && (
                            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold uppercase tracking-wider">
                              Derecho & Justicia
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-slate-600 mt-2 leading-relaxed font-normal">
                          {ef.descripcion}
                        </p>

                        {/* Mensaje de Kant */}
                        {ef.mensajeKant && (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center gap-2">
                            <img src="/dog_logo.png" alt="KANT" className="w-5 h-5 object-contain shrink-0" />
                            <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                              <strong className="text-blue-700 font-bold not-italic">KANT: </strong>
                              "{ef.mensajeKant}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 3. Próximas Fechas Destacadas del Año */}
          <div className="bg-white border border-blue-100 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <h4 className="text-sm font-black uppercase tracking-wider text-blue-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Próximas Fechas Clave para la Firma
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {proximas.map(p => (
                <div key={p.id} className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0 p-2 bg-white rounded-xl border border-blue-100">{p.icono}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm leading-snug">{p.titulo}</p>
                      <p className="text-xs text-blue-700 font-medium mt-0.5">{p.fechaStr}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-700 bg-white px-3 py-1 rounded-xl border border-blue-200 shrink-0 shadow-2xs">
                    {p.diasFaltantes === 0 ? 'Hoy' : p.diasFaltantes === 1 ? 'Mañana' : `En ${p.diasFaltantes} días`}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* 4. Footer */}
        <div className="p-3.5 sm:p-4 border-t border-blue-100 bg-white flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2 font-medium">
            <img src="/dog_logo.png" alt="KANT" className="w-4 h-4 object-contain" />
            <span>KANT con la historia y tradiciones de Venezuela</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/20 active:scale-98"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
