import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, FolderSearch, Building, Check, Sparkles } from 'lucide-react';

export interface ExpedienteItem {
  id?: string | number;
  numeroExpediente: string;
  partes: string;
  organismoTribunal?: string;
  tribunal?: string;
  juzgado?: string;
  tipo?: string;
  materia?: string;
  isNewToday?: boolean;
}

interface ExpedienteSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exp: ExpedienteItem) => void;
  expedientes: ExpedienteItem[];
  currentValue?: string;
}

export default function ExpedienteSelectorModal({
  isOpen,
  onClose,
  onSelect,
  expedientes,
  currentValue = ''
}: ExpedienteSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'Todos' | 'Judicial' | 'Administrativo' | 'Hoy'>('Todos');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTipoFilter('Todos');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtrado y deduplicación inteligente
  const filteredList = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const cleanTerm = term.replace(/[^a-z0-9]/g, '');

    return expedientes.filter(exp => {
      const num = (exp.numeroExpediente || '').toLowerCase();
      const cleanNum = num.replace(/[^a-z0-9]/g, '');
      const partes = (exp.partes || '').toLowerCase();
      const tribunal = (exp.organismoTribunal || exp.tribunal || exp.juzgado || '').toLowerCase();
      const tipo = (exp.tipo || exp.materia || '').toLowerCase();

      // Filtro de categoría / tipo
      if (tipoFilter === 'Judicial' && !tipo.includes('judicial') && !num.includes('rd-j')) return false;
      if (tipoFilter === 'Administrativo' && !tipo.includes('administrativo') && !num.includes('rd-ad')) return false;
      if (tipoFilter === 'Hoy' && !exp.isNewToday) return false;

      // Filtro de búsqueda
      if (!term) return true;

      const directMatch = num.includes(term) || partes.includes(term) || tribunal.includes(term);
      const cleanMatch = cleanTerm.length >= 2 && (cleanNum.includes(cleanTerm) || cleanTerm.includes(cleanNum));

      return directMatch || cleanMatch;
    });
  }, [expedientes, searchTerm, tipoFilter]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-start justify-between gap-4 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <FolderSearch className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-black tracking-tight">Catálogo de Expedientes y Asuntos</h3>
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold rounded-full border border-blue-400/30">
                {expedientes.length} disponibles
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Haz clic en cualquier expediente para seleccionarlo y rellenar automáticamente la actuación.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Búsqueda y Filtros Rápidos */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por N° expediente (ej: 010, 57.380, RD-J) o partes..."
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Chips de filtro */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filtrar:</span>
            {(['Todos', 'Judicial', 'Administrativo', 'Hoy'] as const).map(tipo => (
              <button
                key={tipo}
                onClick={() => setTipoFilter(tipo)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  tipoFilter === tipo
                    ? 'bg-blue-600 text-white shadow-sm font-black'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tipo === 'Hoy' ? (
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-400" /> Nuevos de Hoy
                  </span>
                ) : tipo}
              </button>
            ))}
            <span className="ml-auto text-xs font-semibold text-slate-400">
              Mostrando {filteredList.length} de {expedientes.length}
            </span>
          </div>
        </div>

        {/* Lista de Expedientes */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 divide-y divide-slate-100">
          {filteredList.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FolderSearch className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">No se encontraron expedientes</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No coincide ningún registro con "{searchTerm}". Intenta buscar por los dígitos o por el nombre de las partes.
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-3.5 py-1.5 bg-blue-50 text-blue-600 font-bold text-xs rounded-xl hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            filteredList.map((exp, idx) => {
              const isSelected = currentValue && (
                exp.numeroExpediente.toLowerCase().trim() === currentValue.toLowerCase().trim()
              );
              const tribunal = exp.organismoTribunal || exp.tribunal || exp.juzgado || '';

              return (
                <div
                  key={exp.id || `${exp.numeroExpediente}-${idx}`}
                  onClick={() => {
                    onSelect(exp);
                    onClose();
                  }}
                  className={`pt-2.5 first:pt-0 p-3 rounded-2xl border transition-all cursor-pointer group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 shadow-sm'
                      : 'bg-white border-transparent hover:border-blue-300 hover:bg-slate-50/80 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-xs px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-mono tracking-wide">
                        {exp.numeroExpediente}
                      </span>
                      {exp.isNewToday && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Sparkles className="w-2.5 h-2.5 text-emerald-600" /> Ingreso de Hoy
                        </span>
                      )}
                      {exp.tipo && (
                        <span className="text-[10px] font-bold text-slate-500 px-2 py-0.5 rounded bg-slate-100">
                          {exp.tipo}
                        </span>
                      )}
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" /> Seleccionado
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors leading-tight line-clamp-1">
                      {exp.partes || 'Partes no especificadas'}
                    </h4>

                    {tribunal && (
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 truncate">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{tribunal}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 group-hover:bg-blue-600 group-hover:text-white'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSelected ? 'Elegido' : 'Seleccionar'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pie */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Tip: También puedes escribir el número directamente en el campo.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
