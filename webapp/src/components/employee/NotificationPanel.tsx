import React, { useState, useMemo } from 'react';
import { 
  MessageSquare, 
  AlertCircle, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  CheckCheck, 
  Filter, 
  Inbox, 
  Sparkles,
  RotateCcw,
  Calendar,
  Layers
} from 'lucide-react';

export interface Notification {
  id: string | number;
  type: string;
  title: string;
  message: string;
  sender: string;
  read: boolean;
  date?: string;
  detalles?: string[];
}

interface NotificationPanelProps {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

export default function NotificationPanel({ notifications, setNotifications }: NotificationPanelProps) {
  const [filterTab, setFilterTab] = useState<'unread' | 'read' | 'all'>('unread');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  const handleMarkAsRead = (id: string | number) => {
    const newNotifs = notifications.map(n => {
      if (String(n.id) === String(id)) {
        localStorage.setItem(`rd_notif_read_${n.id}`, 'true');
        return { ...n, read: true };
      }
      return n;
    });
    setNotifications(newNotifs);
  };

  const handleMarkAsUnread = (id: string | number) => {
    const newNotifs = notifications.map(n => {
      if (String(n.id) === String(id)) {
        localStorage.removeItem(`rd_notif_read_${n.id}`);
        return { ...n, read: false };
      }
      return n;
    });
    setNotifications(newNotifs);
  };

  const handleMarkAllAsRead = () => {
    const newNotifs = notifications.map(n => {
      localStorage.setItem(`rd_notif_read_${n.id}`, 'true');
      return { ...n, read: true };
    });
    setNotifications(newNotifs);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.filter(n => n.read).length;
  const totalCount = notifications.length;

  // Filtrado reactivo
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      // 1. Filtro por estado de lectura
      if (filterTab === 'unread' && n.read) return false;
      if (filterTab === 'read' && !n.read) return false;

      // 2. Filtro por tipo
      if (typeFilter !== 'all') {
        if (typeFilter === 'changes' && n.type !== 'changes') return false;
        if (typeFilter === 'instruction' && n.type !== 'instruction') return false;
        if (typeFilter === 'feedback' && n.type !== 'feedback') return false;
      }

      // 3. Buscador por texto
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const inTitle = (n.title || '').toLowerCase().includes(query);
        const inMessage = (n.message || '').toLowerCase().includes(query);
        const inSender = (n.sender || '').toLowerCase().includes(query);
        const inDate = (n.date || '').toLowerCase().includes(query);
        const inDetalles = Array.isArray(n.detalles) && n.detalles.some(d => d.toLowerCase().includes(query));
        return inTitle || inMessage || inSender || inDate || inDetalles;
      }

      return true;
    });
  }, [notifications, filterTab, typeFilter, searchQuery]);

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedList = filteredNotifications.slice((validCurrentPage - 1) * itemsPerPage, validCurrentPage * itemsPerPage);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'changes':
        return (
          <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-wider rounded-full border border-rose-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Modificación Jefatura
          </span>
        );
      case 'instruction':
        return (
          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider rounded-full border border-amber-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Instrucción de Tarea
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 bg-blue-100 text-blue-900 text-[10px] font-black uppercase tracking-wider rounded-full border border-blue-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Observación Bitácora
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. BARRA DE CONTROL SUPERIOR: Pestañas de Lectura & Acciones Rápidas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        
        {/* Pestañas de Estado */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => { setFilterTab('unread'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              filterTab === 'unread'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>No Leídos</span>
            <span className={`px-2 py-0.2 text-[10px] rounded-full font-black ${
              filterTab === 'unread' ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-800'
            }`}>
              {unreadCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setFilterTab('read'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              filterTab === 'read'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Leídos</span>
            <span className={`px-2 py-0.2 text-[10px] rounded-full font-black ${
              filterTab === 'read' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {readCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setFilterTab('all'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              filterTab === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Todos</span>
            <span className={`px-2 py-0.2 text-[10px] rounded-full font-black ${
              filterTab === 'all' ? 'bg-slate-950 text-amber-400' : 'bg-slate-200 text-slate-700'
            }`}>
              {totalCount}
            </span>
          </button>
        </div>

        {/* Botón Marcar Todos Como Leídos */}
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-blue-600 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 shadow-sm self-start md:self-auto cursor-pointer"
            title="Marcar todos los mensajes pendientes como leídos"
          >
            <CheckCheck className="w-4 h-4 text-blue-600" />
            <span>Marcar todos como leídos</span>
          </button>
        )}
      </div>

      {/* 2. FILTROS SECUNDARIOS: Buscador y Selector de Tipo */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Buscador */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Buscar por texto, fecha (2026-07-27), expediente o emisor..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
          />
        </div>

        {/* Filtro por Categoría */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
          >
            <option value="all">Todas las categorías</option>
            <option value="instruction">Instrucciones de Tareas</option>
            <option value="changes">Modificaciones de Jefatura</option>
            <option value="feedback">Observaciones de Bitácora</option>
          </select>
        </div>
      </div>

      {/* 3. LISTA DE MENSAJES */}
      {paginatedList.length === 0 ? (
        <div className="bg-slate-50 rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 space-y-4 animate-in fade-in">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mx-auto">
            <Inbox className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-lg font-black text-slate-800">
              {filterTab === 'unread' ? '¡Estás al día!' : 'No hay mensajes en esta vista'}
            </h4>
            <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
              {filterTab === 'unread' 
                ? 'No tienes instrucciones o correcciones pendientes por revisar.' 
                : 'No se encontraron mensajes que coincidan con los filtros aplicados.'}
            </p>
          </div>
          {(searchQuery || typeFilter !== 'all') && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setTypeFilter('all'); }}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {paginatedList.map((notif) => {
            const isUnread = !notif.read;

            return (
              <div 
                key={notif.id} 
                className={`border-2 rounded-3xl p-5 sm:p-6 transition-all relative overflow-hidden group ${
                  isUnread
                    ? notif.type === 'changes'
                      ? 'bg-rose-50/70 border-rose-300 shadow-sm hover:border-rose-400'
                      : notif.type === 'instruction'
                        ? 'bg-amber-50/70 border-amber-300 shadow-sm hover:border-amber-400'
                        : 'bg-blue-50/80 border-blue-300 shadow-sm hover:border-blue-400'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  
                  {/* Contenido Principal */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                      isUnread
                        ? notif.type === 'changes'
                          ? 'bg-rose-500 text-white'
                          : notif.type === 'instruction'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {notif.type === 'changes' ? (
                        <Sparkles className="w-5 h-5" />
                      ) : notif.type === 'instruction' ? (
                        <AlertCircle className="w-5 h-5" />
                      ) : (
                        <MessageSquare className="w-5 h-5" />
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {getTypeBadge(notif.type)}
                        {notif.date && (
                          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" /> {notif.date}
                          </span>
                        )}
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" title="Mensaje No Leído"></span>
                        )}
                      </div>

                      <h4 className={`text-base sm:text-lg font-black tracking-tight break-words ${
                        isUnread ? 'text-slate-900' : 'text-slate-800'
                      }`}>
                        {notif.title}
                      </h4>

                      {/* Mensaje Principal o Detalles */}
                      {Array.isArray(notif.detalles) && notif.detalles.length > 0 ? (
                        <div className="mt-2 space-y-1.5 p-3 rounded-2xl bg-white/90 border border-slate-200/80 shadow-inner">
                          <p className="text-xs font-bold text-slate-900">Modificaciones registradas por Jefatura:</p>
                          <ul className="text-xs sm:text-sm text-slate-800 font-semibold space-y-1 pl-4 list-disc">
                            {notif.detalles.map((d, i) => (
                              <li key={i} className="break-words leading-relaxed">{d}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className={`text-xs sm:text-sm leading-relaxed break-words font-medium ${
                          isUnread ? 'text-slate-800' : 'text-slate-600'
                        }`}>
                          "{notif.message}"
                        </p>
                      )}

                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pt-1">
                        Emisor: <span className="text-slate-800 font-extrabold">{notif.sender || 'Luis Delgado / Jefatura'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Acciones de Lectura */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {isUnread ? (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(notif.id)}
                        className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer hover:-translate-y-0.5 ${
                          notif.type === 'changes'
                            ? 'bg-rose-600 hover:bg-rose-700 text-white'
                            : notif.type === 'instruction'
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Marcar Leído</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMarkAsUnread(notif.id)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Volver a marcar como pendiente"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Marcar No Leído</span>
                      </button>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. BARRA DE PAGINACIÓN INFERIOR */}
      {filteredNotifications.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200/80">
          
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500">
              Mostrando {((validCurrentPage - 1) * itemsPerPage) + 1} - {Math.min(validCurrentPage * itemsPerPage, filteredNotifications.length)} de {filteredNotifications.length} mensajes
            </span>

            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer"
            >
              <option value={5}>5 por pág.</option>
              <option value={10}>10 por pág.</option>
              <option value={20}>20 por pág.</option>
            </select>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={validCurrentPage === 1}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    validCurrentPage === page
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={validCurrentPage === totalPages}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
