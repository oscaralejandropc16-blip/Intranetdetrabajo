import React, { useState, useMemo, useEffect } from 'react';
import { 
  MessageSquare, 
  AlertCircle, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  CheckCheck, 
  Inbox, 
  Sparkles, 
  RotateCcw, 
  Calendar, 
  CornerDownRight,
  ShieldCheck
} from 'lucide-react';
import { WhatsAppStyleChat } from '../chat/WhatsAppStyleChat';

export interface Notification {
  id: string | number;
  post_id?: number | string;
  type: string;
  title: string;
  message: string;
  sender: string;
  read: boolean;
  date?: string;
  detalles?: string[];
  respuestas?: Array<{
    id: string;
    mensaje: string;
    fecha: string;
    author: string;
  }>;
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

  // Estados para el chat tipo WhatsApp y respuestas
  const [activeChatNotif, setActiveChatNotif] = useState<Notification | null>(null);
  const [localRepliesMap, setLocalRepliesMap] = useState<Record<string, any[]>>(() => {
    try {
      return JSON.parse(localStorage.getItem('rd_local_employee_replies') || '{}');
    } catch (e) {
      return {};
    }
  });

  // Limpieza de mensajes de prueba previos
  useEffect(() => {
    try {
      const qRaw = localStorage.getItem('rd_all_employee_replies_queue');
      if (qRaw) {
        const qList = JSON.parse(qRaw);
        if (Array.isArray(qList)) {
          const cleaned = qList.filter((m: any) => {
            const txt = (m.mensaje || '').trim();
            return !txt.includes('Tengo una duda con respecto a este punto') && txt !== 'probando';
          });
          localStorage.setItem('rd_all_employee_replies_queue', JSON.stringify(cleaned));
        }
      }

      const mapRaw = localStorage.getItem('rd_local_employee_replies');
      if (mapRaw) {
        const map = JSON.parse(mapRaw);
        let changed = false;
        Object.keys(map).forEach(k => {
          if (Array.isArray(map[k])) {
            const initialLen = map[k].length;
            map[k] = map[k].filter((m: any) => {
              const txt = (m.mensaje || '').trim();
              return !txt.includes('Tengo una duda con respecto a este punto') && txt !== 'probando';
            });
            if (map[k].length !== initialLen) changed = true;
          }
        });
        if (changed) {
          localStorage.setItem('rd_local_employee_replies', JSON.stringify(map));
          setLocalRepliesMap(map);
        }
      }
    } catch (e) {}
  }, []);

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
          <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider rounded-full border border-blue-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Observación de Bitácora
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* 1. BARRA SUPERIOR DE FILTROS, PESTAÑAS Y BÚSQUEDA */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
        
        {/* Pestañas de Estado de Lectura */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => { setFilterTab('unread'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              filterTab === 'unread' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>No Leídos</span>
            {unreadCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                filterTab === 'unread' ? 'bg-white text-blue-700' : 'bg-rose-500 text-white'
              }`}>
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => { setFilterTab('read'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              filterTab === 'read' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>Leídos</span>
            <span className="text-[10px] opacity-70">({readCount})</span>
          </button>

          <button
            type="button"
            onClick={() => { setFilterTab('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              filterTab === 'all' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>Todos</span>
            <span className="text-[10px] opacity-70">({totalCount})</span>
          </button>
        </div>

        {/* Buscador y Filtro por Categoría */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Buscar en mensajes, remitente, caso o fecha..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer shadow-xs"
            >
              <option value="all">Todas las Categorías</option>
              <option value="instruction">Instrucciones de Tarea</option>
              <option value="changes">Modificaciones de Jefatura</option>
              <option value="feedback">Observaciones de Bitácora</option>
            </select>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                title="Marcar todos como leídos"
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-blue-600 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Marcar todos</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* 2. LISTADO DE MENSAJES Y RESPUESTAS */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-slate-50/50 rounded-3xl p-10 sm:p-14 border border-dashed border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-700">
              {filterTab === 'unread' ? '¡Bandeja al día!' : 'No hay mensajes'}
            </h4>
            <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
              {filterTab === 'unread' 
                ? 'No tienes instrucciones o correcciones pendientes por responder.' 
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
            const notifKey = String(notif.id);
            const notifDate = notif.date || '';

            // Obtener todas las respuestas combinando mapa local y cola global
            let globalQueueReplies: any[] = [];
            try {
              const qRaw = localStorage.getItem('rd_all_employee_replies_queue');
              if (qRaw) {
                const qList = JSON.parse(qRaw);
                if (Array.isArray(qList)) {
                  globalQueueReplies = qList.filter((item: any) => {
                    const sameNotif = item.notif_id && (String(item.notif_id) === notifKey || String(item.notif_id).includes(notifDate));
                    const samePost = item.post_id && notif.post_id && String(item.post_id) === String(notif.post_id);
                    const sameDate = item.fecha_bitacora && notifDate && item.fecha_bitacora === notifDate;
                    return sameNotif || samePost || sameDate;
                  });
                }
              }
            } catch (e) {}

            const replies = [
              ...(notif.respuestas || []),
              ...(localRepliesMap[notifKey] || []),
              ...globalQueueReplies
            ].filter((rep, idx, self) => idx === self.findIndex(t => (t.id && t.id === rep.id) || (t.mensaje === rep.mensaje && t.fecha === rep.fecha)))
            .sort((a, b) => {
              const parseIdTime = (id: string) => {
                if (!id) return 0;
                const parts = id.split('_');
                return parts.length >= 2 ? parseInt(parts[1], 10) || 0 : 0;
              };
              const tA = parseIdTime(a.id);
              const tB = parseIdTime(b.id);
              if (tA && tB && tA !== tB) return tA - tB;
              return (a.fecha || '').localeCompare(b.fecha || '');
            });

            return (
              <div 
                key={notif.id} 
                className={`border rounded-2xl p-4 sm:p-5 transition-all relative overflow-hidden group ${
                  isUnread
                    ? notif.type === 'changes'
                      ? 'bg-rose-50/60 border-rose-200 shadow-xs'
                      : notif.type === 'instruction'
                        ? 'bg-amber-50/60 border-amber-200 shadow-xs'
                        : 'bg-blue-50/70 border-blue-200 shadow-xs'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  
                  {/* Contenido Principal */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                      isUnread
                        ? notif.type === 'changes'
                          ? 'bg-rose-500 text-white'
                          : notif.type === 'instruction'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {notif.type === 'changes' ? (
                        <Sparkles className="w-4 h-4" />
                      ) : notif.type === 'instruction' ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <MessageSquare className="w-4 h-4" />
                      )}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {getTypeBadge(notif.type)}
                        {notif.date && (
                          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" /> {notif.date}
                          </span>
                        )}
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" title="Mensaje No Leído"></span>
                        )}
                      </div>

                      <h4 className="text-sm sm:text-base font-black tracking-tight text-slate-900 break-words">
                        {notif.title}
                      </h4>

                      {/* Mensaje Principal o Detalles */}
                      {Array.isArray(notif.detalles) && notif.detalles.length > 0 ? (
                        <div className="mt-1.5 space-y-1 p-2.5 rounded-xl bg-white border border-slate-200/80">
                          <p className="text-[11px] font-bold text-slate-900">Modificaciones registradas por Jefatura:</p>
                          <ul className="text-xs text-slate-700 font-medium space-y-0.5 pl-4 list-disc">
                            {notif.detalles.map((d, i) => (
                              <li key={i} className="break-words leading-relaxed">{d}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-xs leading-relaxed break-words font-medium text-slate-700 bg-white/70 p-2 rounded-lg border border-slate-200/50">
                          "{notif.message}"
                        </p>
                      )}

                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pt-0.5">
                        Emisor: <span className="text-slate-800 font-extrabold">{notif.sender || 'Luis Delgado / Jefatura'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Botones de Acción: Chat Unificado y Marcar Leído */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveChatNotif(notif)}
                      className="px-4 py-2 bg-[#075E54] hover:bg-[#128C7E] text-white font-black text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5"
                      title="Abrir hilo de conversación oficial con Jefatura"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-300" />
                      <span>Abrir Conversación</span>
                      {replies.length > 0 && (
                        <span className="px-1.5 py-0.2 bg-emerald-400 text-slate-950 font-black rounded-full text-[9px]">
                          {replies.length}
                        </span>
                      )}
                    </button>

                    {isUnread ? (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Marcar bitácora como atendida"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Leído</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMarkAsUnread(notif.id)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
                        title="Volver a marcar como pendiente"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                </div>

                {/* HILO DE RESPUESTAS RECIENTES (PREVIEW RÁPIDO) */}
                {replies.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <CornerDownRight className="w-3.5 h-3.5 text-emerald-600" /> Última actividad en esta Bitácora:
                    </p>
                    <div className="space-y-1.5">
                      {replies.slice(-2).map((rep, rIdx) => {
                        const cleanAuth = (rep.author || '').toLowerCase().trim();
                        const isFromBoss = rep.author_role === 'jefatura' || rep.author_role === 'admin' || cleanAuth.includes('luis') || cleanAuth.includes('jefe') || cleanAuth.includes('admin') || cleanAuth.includes('victor') || cleanAuth.includes('delgado');
                        return (
                          <div 
                            key={rIdx} 
                            className={`p-2.5 rounded-xl border flex items-start justify-between gap-3 text-xs transition-all ${
                              isFromBoss 
                                ? 'bg-amber-50/90 border-amber-300/80 shadow-2xs' 
                                : 'bg-emerald-50/80 border-emerald-200 shadow-2xs'
                            }`}
                          >
                            <div className="space-y-0.5 min-w-0">
                              <span className={`font-black flex items-center gap-1.5 text-[11px] ${isFromBoss ? 'text-amber-950' : 'text-emerald-950'}`}>
                                {isFromBoss ? (
                                  <>
                                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>{rep.author || 'Luis Delgado (Jefatura)'}:</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Tú ({rep.author || 'Carmen Luisa'}):</span>
                                  </>
                                )}
                              </span>
                              <p className="text-slate-800 font-medium pl-5 truncate">{rep.mensaje}</p>
                            </div>
                            <span className={`text-[10px] font-bold shrink-0 ${isFromBoss ? 'text-amber-800' : 'text-emerald-700'}`}>{rep.fecha}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* 4. BARRA DE PAGINACIÓN INFERIOR */}
      {filteredNotifications.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200/80">
          
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
                  className={`w-7 h-7 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    validCurrentPage === page
                      ? 'bg-blue-600 text-white shadow-xs'
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

      {/* MODAL CHAT TIPO WHATSAPP PARA EMPLEADOS */}
      {activeChatNotif && (
        <WhatsAppStyleChat
          isOpen={true}
          onClose={() => setActiveChatNotif(null)}
          currentUser={localStorage.getItem('rd_user_name') || 'Carmen Luisa'}
          isJefatura={false}
          targetUser={activeChatNotif.sender || 'Luis Delgado / Jefatura'}
          reportContext={{ date: activeChatNotif.date || new Date().toISOString().split('T')[0], id: activeChatNotif.post_id }}
          activeThreadId={String(activeChatNotif.id)}
          initialMessages={[
            // 1. Mensaje original de Jefatura como primera burbuja
            ...(activeChatNotif.message ? [{
              id: `orig_${activeChatNotif.id}`,
              author: activeChatNotif.sender || 'Luis Delgado / Jefatura',
              author_role: 'jefatura' as const,
              mensaje: activeChatNotif.message,
              fecha: activeChatNotif.date || 'Instrucción Original',
              atendido: false
            }] : []),
            // 2. Respuestas enviadas por ambas partes
            ...((() => {
              const notifKey = String(activeChatNotif.id);
              const targetDate = activeChatNotif.date || '';
              const targetPostId = activeChatNotif.post_id ? String(activeChatNotif.post_id) : '';
              let globalReplies: any[] = [];
              try {
                const qRaw = localStorage.getItem('rd_all_employee_replies_queue');
                if (qRaw) {
                  const qList = JSON.parse(qRaw);
                  if (Array.isArray(qList)) {
                    globalReplies = qList.filter((item: any) => {
                      const sameNotif = item.notif_id && (String(item.notif_id) === notifKey || String(item.notif_id).includes(targetDate));
                      const samePost = item.post_id && targetPostId && String(item.post_id) === targetPostId;
                      const sameDate = item.fecha_bitacora && targetDate && item.fecha_bitacora === targetDate;
                      return sameNotif || samePost || sameDate;
                    });
                  }
                }
              } catch (e) {}
              const deletedList = (() => {
                try { return JSON.parse(localStorage.getItem('rd_deleted_chat_messages') || '[]'); } catch(e) { return []; }
              })();

              return [
                ...(localRepliesMap[notifKey] || []),
                ...globalReplies
              ].filter(m => !deletedList.includes(m.id) && (!m.mensaje || !deletedList.includes(m.mensaje)));
            })()).map(r => ({
              id: r.id || `rep_${Date.now()}`,
              author: r.author || 'Carmen Luisa',
              author_role: r.author_role || (r.author?.toLowerCase().includes('luis') ? 'jefatura' as const : 'empleado' as const),
              mensaje: r.mensaje,
              fecha: r.fecha,
              atendido: r.atendido
            }))
          ].filter((rep, idx, self) => idx === self.findIndex(t => (t.id && t.id === rep.id) || (t.mensaje === rep.mensaje && t.fecha === rep.fecha)))}
          onMessageSent={(newMsg) => {
            const notifKey = String(activeChatNotif.id);
            const updated = {
              ...localRepliesMap,
              [notifKey]: [...(localRepliesMap[notifKey] || []), newMsg]
            };
            setLocalRepliesMap(updated);
            localStorage.setItem('rd_local_employee_replies', JSON.stringify(updated));
          }}
          onMessageDeleted={(delId, delText) => {
            const notifKey = String(activeChatNotif.id);
            const currentList = localRepliesMap[notifKey] || [];
            const filtered = currentList.filter((m: any) => m.id !== delId && m.mensaje !== delText);
            const updated = {
              ...localRepliesMap,
              [notifKey]: filtered
            };
            setLocalRepliesMap(updated);
            localStorage.setItem('rd_local_employee_replies', JSON.stringify(updated));
          }}
        />
      )}

    </div>
  );
}
