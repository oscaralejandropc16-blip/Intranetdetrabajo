import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  X, 
  Check,
  CheckCheck, 
  MessageSquare, 
  ShieldCheck, 
  User, 
  CheckCircle2, 
  RotateCcw,
  Search,
  Trash2
} from 'lucide-react';
import api from '../../lib/api';

export interface ChatMessage {
  id: string;
  notif_id?: string;
  post_id?: number | string;
  author: string;
  author_role?: 'jefatura' | 'empleado' | 'admin';
  mensaje: string;
  fecha: string;
  fecha_bitacora?: string;
  titulo?: string;
  leido_por_jefe?: boolean;
  leido_por_empleado?: boolean;
  atendido?: boolean;
}

interface WhatsAppStyleChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
  isJefatura: boolean;
  targetUser?: string;
  reportContext?: any;
  activeThreadId?: string;
  initialMessages?: ChatMessage[];
  onMessageSent?: (msg: ChatMessage) => void;
  onMarkAtendido?: (id: string) => void;
}

export const WhatsAppStyleChat: React.FC<WhatsAppStyleChatProps> = ({
  isOpen,
  onClose,
  currentUser,
  isJefatura,
  targetUser = 'Empleado',
  reportContext,
  activeThreadId,
  initialMessages = [],
  onMessageSent,
  onMarkAtendido
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [viewFilter, setViewFilter] = useState<'todos' | 'pendientes' | 'atendidos'>('todos');
  const [filterSearch, setFilterSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sincronizar mensajes iniciales
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Scroll automático al final cuando llegan mensajes o abre el chat
  useEffect(() => {
    if (isOpen) {
      const t1 = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
      const t2 = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isOpen, messages.length, viewFilter]);

  // Auto-marcar mensajes del interlocutor como leídos al abrir el chat
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      let hasChanges = false;
      const updated = messages.map(m => {
        const cleanAuth = (m.author || '').toLowerCase().trim();
        const isFromBoss = m.author_role === 'jefatura' || m.author_role === 'admin' || cleanAuth.includes('luis') || cleanAuth.includes('jefe') || cleanAuth.includes('admin') || cleanAuth.includes('victor') || cleanAuth.includes('delgado');
        
        if (isJefatura) {
          // El jefe lee los mensajes del empleado
          if (!isFromBoss && !m.leido_por_jefe) {
            hasChanges = true;
            return { ...m, leido_por_jefe: true };
          }
        } else {
          // El empleado lee los mensajes del jefe
          if (isFromBoss && !m.leido_por_empleado) {
            hasChanges = true;
            return { ...m, leido_por_empleado: true };
          }
        }
        return m;
      });

      if (hasChanges) {
        setMessages(updated);
        try {
          const q = JSON.parse(localStorage.getItem('rd_all_employee_replies_queue') || '[]');
          const updatedQ = q.map((item: any) => {
            const cleanAuth = (item.author || '').toLowerCase().trim();
            const isFromBoss = item.author_role === 'jefatura' || item.author_role === 'admin' || cleanAuth.includes('luis') || cleanAuth.includes('jefe') || cleanAuth.includes('admin') || cleanAuth.includes('victor') || cleanAuth.includes('delgado');
            if (isJefatura && !isFromBoss) {
              return { ...item, leido_por_jefe: true };
            } else if (!isJefatura && isFromBoss) {
              return { ...item, leido_por_empleado: true };
            }
            return item;
          });
          localStorage.setItem('rd_all_employee_replies_queue', JSON.stringify(updatedQ));
        } catch (e) {}

        try {
          api.post('/rd-intranet/v1/marcar-mensajes-leidos-chat', {
            is_jefatura: isJefatura,
            date: reportContext?.date
          });
        } catch (e) {}
      }
    }
  }, [isJefatura, isOpen]);

  if (!isOpen) return null;

  const quickPresets = isJefatura ? [
    '👍 Entendido y revisado.',
    '⚡ Por favor envíame el soporte.',
    '✍️ Revisa las correcciones indicadas.',
    '✅ Aprobado, excelente trabajo.',
    '❓ ¿En qué estatus quedó esta diligencia?'
  ] : [
    '⚡ Listo jefe, ya corregí este punto.',
    '📎 Ya adjunté el comprobante en la bitácora.',
    '❓ Tengo una duda con respecto a este expediente.',
    '⏱️ En proceso, finalizo en la tarde.',
    '👍 Entendido perfectamente.'
  ];

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isSending) return;

    setIsSending(true);
    const nowStr = new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = new Date().toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
    const fullDate = `${dateStr}, ${nowStr}`;

    const newMsg: ChatMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      notif_id: activeThreadId || (reportContext ? `thread_${reportContext.id || reportContext.date}` : undefined),
      post_id: reportContext?.id || 0,
      author: currentUser || (isJefatura ? 'Luis Delgado' : 'Carmen Luisa'),
      author_role: isJefatura ? 'jefatura' : 'empleado',
      mensaje: textToSend,
      fecha: fullDate,
      fecha_bitacora: reportContext?.date || new Date().toISOString().split('T')[0],
      titulo: reportContext ? `Bitácora ${reportContext.date}` : 'Mensaje Directo',
      leido_por_jefe: isJefatura,
      leido_por_empleado: !isJefatura,
      atendido: false
    };

    // Actualizar estado local inmediato
    const updated = [...messages, newMsg];
    setMessages(updated);
    setInputText('');

    // Guardar en cola local
    try {
      const q = JSON.parse(localStorage.getItem('rd_all_employee_replies_queue') || '[]');
      localStorage.setItem('rd_all_employee_replies_queue', JSON.stringify([newMsg, ...q].slice(0, 150)));
    } catch (e) {}

    // Notificar al componente padre
    if (onMessageSent) {
      onMessageSent(newMsg);
    }

    // Enviar a WordPress REST API
    try {
      await api.post('/rd-intranet/v1/responder-mensaje', {
        notif_id: newMsg.notif_id,
        post_id: newMsg.post_id,
        mensaje: newMsg.mensaje,
        titulo: newMsg.titulo,
        date: newMsg.fecha_bitacora,
        author_role: newMsg.author_role
      });
    } catch (err) {
      console.warn('Mensaje almacenado en cola local:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleAtendido = (msgId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return { ...m, atendido: !m.atendido, leido_por_jefe: true };
      }
      return m;
    }));
    if (onMarkAtendido) {
      onMarkAtendido(msgId);
    }
  };

  const handleDeleteMessage = async (msgId: string, msgText?: string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    try {
      const q = JSON.parse(localStorage.getItem('rd_all_employee_replies_queue') || '[]');
      const filtered = q.filter((m: any) => m.id !== msgId && m.mensaje !== msgText);
      localStorage.setItem('rd_all_employee_replies_queue', JSON.stringify(filtered));

      const delList = JSON.parse(localStorage.getItem('rd_deleted_chat_messages') || '[]');
      delList.push(msgId);
      if (msgText) delList.push(msgText);
      localStorage.setItem('rd_deleted_chat_messages', JSON.stringify(delList));
    } catch (e) {}

    try {
      await api.post('/rd-intranet/v1/eliminar-mensaje-chat', { id: msgId, mensaje: msgText });
    } catch (e) {}
  };

  // Filtrado de mensajes
  const filteredMessages = messages.filter(m => {
    if (viewFilter === 'pendientes' && m.atendido) return false;
    if (viewFilter === 'atendidos' && !m.atendido) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      return m.mensaje.toLowerCase().includes(q) || m.author.toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => {
    // 1. Extraer timestamp numérico del ID si existe (ej: chat_172426... o rep_172426...)
    const parseIdTime = (id: string) => {
      if (!id) return 0;
      const parts = id.split('_');
      if (parts.length >= 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > 1000000) return num;
      }
      return 0;
    };
    const tA = parseIdTime(a.id);
    const tB = parseIdTime(b.id);
    if (tA && tB && tA !== tB) return tA - tB;

    // 2. Extraer fecha/hora si está disponible
    return (a.fecha || '').localeCompare(b.fecha || '');
  });

  const pendingCount = messages.filter(m => {
    if (m.atendido) return false;
    const cleanAuth = (m.author || '').toLowerCase().trim();
    const isFromBoss = m.author_role === 'jefatura' || m.author_role === 'admin' || cleanAuth.includes('luis') || cleanAuth.includes('jefe') || cleanAuth.includes('admin') || cleanAuth.includes('victor') || cleanAuth.includes('delgado');
    if (isJefatura) {
      return !isFromBoss && !m.leido_por_jefe;
    } else {
      return isFromBoss && !m.leido_por_empleado;
    }
  }).length;
  const attendedCount = messages.filter(m => m.atendido).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[#0b141a] rounded-3xl shadow-2xl border border-white/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ height: '88vh', maxHeight: '780px' }}
      >
        {/* WHATSAPP-STYLE HEADER */}
        <div className="bg-[#1f2c34] px-4 py-3 sm:px-5 sm:py-3.5 border-b border-white/5 flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-emerald-400/30">
                {isJefatura ? (
                  <User className="w-5 h-5" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#1f2c34]" title="En línea"></span>
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-white truncate flex items-center gap-2">
                {targetUser}
                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {isJefatura ? 'Empleado' : 'Jefatura'}
                </span>
              </h3>
              <p className="text-[11px] text-emerald-400/90 font-medium truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {reportContext ? `Bitácora: ${reportContext.date}` : 'Canal Directo de Supervisión'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Sub-filtro de Atendidos / Pendientes */}
            <div className="flex items-center bg-[#111b21] p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setViewFilter('todos')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${viewFilter === 'todos' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
              >
                Todos ({messages.length})
              </button>
              <button
                onClick={() => setViewFilter('pendientes')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${viewFilter === 'pendientes' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
              >
                Pendientes ({pendingCount})
              </button>
              <button
                onClick={() => setViewFilter('atendidos')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${viewFilter === 'atendidos' ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
              >
                Atendidos ({attendedCount})
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
              title="Cerrar Chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SEARCH BAR SUB-HEADER (SI HAY MUCHOS MENSAJES) */}
        {messages.length > 5 && (
          <div className="px-4 py-2 bg-[#111b21] border-b border-white/5 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar en la conversación..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
            />
            {filterSearch && (
              <button onClick={() => setFilterSearch('')} className="text-slate-400 hover:text-white text-xs">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* CHAT MESSAGES BODY (WHATSAPP WALLPAPER PATTERN STYLE) */}
        <div 
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 relative"
          style={{
            backgroundColor: '#0b141a',
            backgroundImage: 'radial-gradient(#1f2c34 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        >
          {/* Security / Encryption style notice */}
          <div className="flex justify-center">
            <div className="bg-[#182229] border border-white/5 rounded-xl px-3.5 py-1.5 text-center shadow-sm max-w-sm">
              <p className="text-[10px] text-amber-300/80 font-medium flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Canal oficial de Jefatura y supervisión KANT en tiempo real.
              </p>
            </div>
          </div>

          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium">No hay mensajes en esta sección.</p>
              <p className="text-[11px] text-slate-500">Escribe abajo o usa una respuesta rápida para iniciar el diálogo.</p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const cleanAuthor = (msg.author || '').toLowerCase().trim();
              const cleanTarget = (targetUser || '').toLowerCase().trim();

              const isEmployeeAuthor = (
                msg.author_role === 'empleado' ||
                cleanAuthor.includes('carmen') ||
                cleanAuthor.includes('empleado') ||
                (cleanTarget && cleanAuthor === cleanTarget)
              );

              const isJefeAuthor = (
                msg.author_role === 'jefatura' ||
                msg.author_role === 'admin' ||
                cleanAuthor.includes('luis') ||
                cleanAuthor.includes('jefe') ||
                cleanAuthor.includes('admin') ||
                cleanAuthor.includes('roman') ||
                cleanAuthor.includes('delgado')
              );

              let isMe = false;
              if (isJefatura) {
                // Si quien está viendo el chat es Jefatura (Luis Delgado):
                if (isEmployeeAuthor) {
                  isMe = false;
                } else if (isJefeAuthor) {
                  isMe = true;
                } else {
                  isMe = cleanAuthor !== cleanTarget;
                }
              } else {
                // Si quien está viendo el chat es el Empleado (Carmen Luisa):
                if (isEmployeeAuthor) {
                  isMe = true;
                } else if (isJefeAuthor) {
                  isMe = false;
                } else {
                  isMe = cleanAuthor.includes('carmen') || cleanAuthor === (currentUser || '').toLowerCase().trim();
                }
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 sm:p-3.5 shadow-md relative transition-all ${
                      isMe 
                        ? 'bg-[#005c4b] text-white rounded-tr-xs' 
                        : 'bg-[#202c33] text-slate-100 rounded-tl-xs'
                    } ${msg.atendido ? 'ring-1 ring-emerald-400/40' : ''}`}
                  >
                    {/* Header del mensaje */}
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${isMe ? 'text-emerald-200' : 'text-amber-400'}`}>
                        {isMe ? 'Tú' : (msg.author || (isJefatura ? targetUser : 'Jefatura'))}
                      </span>
                      {msg.atendido && (
                        <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Atendido
                        </span>
                      )}
                    </div>

                    {/* Texto del mensaje */}
                    <p className="text-xs sm:text-sm font-normal leading-relaxed whitespace-pre-wrap select-text">
                      {msg.mensaje}
                    </p>

                    {/* Footer con hora, checks y botón de eliminar */}
                    <div className="flex items-center justify-end gap-1.5 mt-1 text-[9.5px] text-white/60 font-medium">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('¿Deseas eliminar este mensaje?')) {
                            handleDeleteMessage(msg.id, msg.mensaje);
                          }
                        }}
                        title="Eliminar este mensaje"
                        className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 rounded transition-all cursor-pointer mr-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <span>{msg.fecha}</span>
                      {isMe && (
                        (msg.atendido || (isJefatura ? msg.leido_por_empleado : msg.leido_por_jefe)) ? (
                          <span title="Leído por el destinatario (Doble check azul)">
                            <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] shrink-0" />
                          </span>
                        ) : (
                          <span title="Enviado (Un check gris)">
                            <Check className="w-3 h-3 text-white/60 shrink-0" />
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Acciones contextuales para Jefatura (Marcar Atendido / Reabrir) */}
                  {isJefatura && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex items-center gap-1 px-1">
                      <button
                        onClick={() => handleToggleAtendido(msg.id)}
                        className="text-[10px] text-slate-400 hover:text-emerald-400 font-bold flex items-center gap-1 cursor-pointer bg-[#182229] px-2 py-0.5 rounded-md border border-white/5"
                      >
                        {msg.atendido ? (
                          <>
                            <RotateCcw className="w-2.5 h-2.5 text-amber-400" /> Reabrir
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> Marcar como Atendido
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* QUICK REACTION CHIPS (WHATSAPP PRESETS) */}
        <div className="px-3 py-2 bg-[#182229] border-t border-white/5 flex gap-1.5 overflow-x-auto scrollbar-none">
          {quickPresets.map((preset, pIdx) => (
            <button
              key={pIdx}
              onClick={() => handleSend(preset)}
              className="flex-shrink-0 px-2.5 py-1 rounded-full bg-[#202c33] hover:bg-emerald-600/30 hover:border-emerald-500/40 text-slate-300 hover:text-white border border-white/5 text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* WHATSAPP-STYLE INPUT BAR */}
        <div className="bg-[#1f2c34] p-3 sm:p-3.5 border-t border-white/5 flex items-center gap-2">
          <input
            type="text"
            placeholder={isJefatura ? `Escribe un mensaje a ${targetUser}...` : "Escribe tu respuesta a Jefatura..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 bg-[#2a3942] text-white placeholder-slate-400 text-xs sm:text-sm px-4 py-2.5 rounded-2xl outline-none border border-transparent focus:border-emerald-500/50 transition-all font-normal"
          />

          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isSending}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
              inputText.trim() && !isSending
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white scale-105 active:scale-95'
                : 'bg-[#2a3942] text-slate-500 cursor-not-allowed'
            }`}
            title="Enviar mensaje"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
