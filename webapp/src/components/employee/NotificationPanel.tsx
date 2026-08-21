import React, { useState, useMemo } from 'react';
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
  Send, 
  Loader2, 
  CornerDownRight, 
  MessageCircle 
} from 'lucide-react';
import api from '../../lib/api';

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

const QUICK_REPLIES = [
  '⚡ Listo jefe, ya lo revisé y quedó corregido.',
  '📎 Ya adjunté el documento / comprobante en el sistema.',
  '⏱️ En proceso, lo concluyo en el transcurso de la jornada.',
  '👍 Enterada de la observación, muchas gracias.',
  '❓ Tengo una duda con respecto a este punto.'
];

export default function NotificationPanel({ notifications, setNotifications }: NotificationPanelProps) {
  const [filterTab, setFilterTab] = useState<'unread' | 'read' | 'all'>('unread');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  // Estados para el sistema de respuesta bidireccional a Jefatura
  const [openReplyNotifId, setOpenReplyNotifId] = useState<string | number | null>(null);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [sendingReplyId, setSendingReplyId] = useState<string | number | null>(null);
  const [localRepliesMap, setLocalRepliesMap] = useState<Record<string, any[]>>(() => {
    try {
      return JSON.parse(localStorage.getItem('rd_local_employee_replies') || '{}');
    } catch (e) {
      return {};
    }
  });

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

  const handleSendReply = async (notif: Notification) => {
    const notifKey = String(notif.id);
    const text = (replyTextMap[notifKey] || '').trim();
    if (!text) return;

    setSendingReplyId(notif.id);
    const nowStr = new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true });
    const fullDateStr = new Date().toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
    const userName = localStorage.getItem('rd_user_name') || 'Empleado';

    const newReplyItem = {
      id: `rep_${Date.now()}`,
      mensaje: text,
      fecha: `${fullDateStr}, ${nowStr}`,
      author: userName
    };

    try {
      await api.post('/rd-intranet/v1/responder-mensaje', {
        notif_id: notif.id,
        post_id: notif.post_id || (typeof notif.id === 'number' ? notif.id : 0),
        mensaje: text,
        titulo: notif.title,
        date: notif.date || new Date().toISOString().split('T')[0]
      });

      // Guardar localmente para renderizado inmediato
      const updatedReplies = {
        ...localRepliesMap,
        [notifKey]: [...(localRepliesMap[notifKey] || []), newReplyItem]
      };
      setLocalRepliesMap(updatedReplies);
      localStorage.setItem('rd_local_employee_replies', JSON.stringify(updatedReplies));

      // Limpiar texto de respuesta
      setReplyTextMap(prev => ({ ...prev, [notifKey]: '' }));
      setOpenReplyNotifId(null);

      // Marcar automáticamente como leída
      handleMarkAsRead(notif.id);
    } catch (error) {
      console.error('Error enviando respuesta a jefatura:', error);
      // Fallback offline
      const updatedReplies = {
        ...localRepliesMap,
        [notifKey]: [...(localRepliesMap[notifKey] || []), newReplyItem]
      };
      setLocalRepliesMap(updatedReplies);
      localStorage.setItem('rd_local_employee_replies', JSON.stringify(updatedReplies));
      setReplyTextMap(prev => ({ ...prev, [notifKey]: '' }));
      setOpenReplyNotifId(null);
      handleMarkAsRead(notif.id);
    } finally {
      setSendingReplyId(null);
    }
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
            const isReplyOpen = openReplyNotifId === notif.id;
            const replies = [...(notif.respuestas || []), ...(localRepliesMap[notifKey] || [])];

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

                  {/* Botones de Acción: Responder y Marcar Leído */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setOpenReplyNotifId(isReplyOpen ? null : notif.id)}
                      className={`px-3.5 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                        isReplyOpen 
                          ? 'bg-slate-900 text-white shadow-sm' 
                          : 'bg-white hover:bg-slate-100 text-blue-700 border border-blue-200 hover:border-blue-300'
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{isReplyOpen ? 'Cerrar Respuesta' : 'Responder'}</span>
                    </button>

                    {isUnread ? (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                        title="Marcar como atendido"
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

                {/* HILO DE RESPUESTAS ENVIADAS */}
                {replies.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <CornerDownRight className="w-3 h-3 text-blue-500" /> Conversación & Respuestas:
                    </p>
                    <div className="space-y-1.5">
                      {replies.map((rep, rIdx) => (
                        <div key={rIdx} className="bg-emerald-50/80 border border-emerald-200 p-2.5 rounded-xl flex items-start justify-between gap-3 text-xs">
                          <div className="space-y-0.5">
                            <span className="font-bold text-emerald-900 flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 
                              {rep.author || 'Tú'}:
                            </span>
                            <p className="text-slate-800 font-medium pl-4">{rep.mensaje}</p>
                          </div>
                          <span className="text-[10px] text-emerald-700 font-bold shrink-0">{rep.fecha}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CAJA INTERACTIVA PARA RESPONDER A JEFATURA */}
                {isReplyOpen && (
                  <div className="mt-3.5 pt-3.5 border-t border-slate-200/80 space-y-3 bg-slate-50/90 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-4 sm:p-5 rounded-b-2xl animate-in fade-in duration-200">
                    <div>
                      <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-blue-600" /> Responder a {notif.sender || 'Jefatura'}
                      </h5>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Tu respuesta se enviará inmediatamente al panel de control de Jefatura vinculado a esta bitácora.
                      </p>
                    </div>

                    {/* Chips de Respuestas Rápidas */}
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_REPLIES.map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => setReplyTextMap(prev => ({ ...prev, [notifKey]: chip }))}
                          className="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-800 border border-slate-200 hover:border-blue-300 rounded-lg text-[11px] font-medium transition-all text-left cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>

                    {/* Textarea para Escribir Respuesta */}
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        value={replyTextMap[notifKey] || ''}
                        onChange={(e) => setReplyTextMap(prev => ({ ...prev, [notifKey]: e.target.value }))}
                        placeholder="Escribe tu respuesta a Jefatura..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none shadow-inner"
                      />

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {(replyTextMap[notifKey] || '').length} caracteres
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setOpenReplyNotifId(null)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSendReply(notif)}
                            disabled={sendingReplyId === notif.id || !(replyTextMap[notifKey] || '').trim()}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-transform hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
                          >
                            {sendingReplyId === notif.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Enviando...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                <span>Enviar Respuesta</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
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

    </div>
  );
}
