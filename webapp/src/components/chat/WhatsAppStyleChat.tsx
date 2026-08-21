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
  Search,
  Trash2
} from 'lucide-react';
import api from '../../lib/api';
import SystemAlertModal from '../common/SystemAlertModal';

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
  onMessageDeleted?: (id: string, text?: string) => void;
}

// Función infalible para determinar si un mensaje fue emitido por Jefatura
export const checkIsFromBoss = (author?: string, role?: string): boolean => {
  const clean = (author || '').toLowerCase().trim();
  if (clean.includes('carmen') || role === 'empleado') return false;
  if (role === 'jefatura' || role === 'admin') return true;
  return clean.includes('delgado') || 
         clean.includes('roman') || 
         clean.includes('jefe') || 
         clean.includes('jefatura') || 
         clean.includes('admin') || 
         clean === 'luis' || 
         clean.startsWith('luis ') || 
         clean === 'victor' || 
         clean.startsWith('victor ');
};

export const WhatsAppStyleChat: React.FC<WhatsAppStyleChatProps> = ({
  isOpen,
  onClose,
  currentUser,
  isJefatura,
  targetUser = 'Jefatura',
  reportContext,
  activeThreadId,
  initialMessages = [],
  onMessageSent,
  onMarkAtendido,
  onMessageDeleted
}) => {
  const getCleanDeletedList = (): string[] => {
    try {
      const raw = JSON.parse(localStorage.getItem('rd_deleted_chat_messages') || '[]');
      return Array.isArray(raw) ? raw.filter((id: any) => typeof id === 'string') : [];
    } catch (e) {
      return [];
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const deletedList = getCleanDeletedList();
    return initialMessages.filter(m => !deletedList.includes(m.id));
  });

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [viewFilter, setViewFilter] = useState<'todos' | 'pendientes' | 'atendidos'>('todos');
  const [filterSearch, setFilterSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    msgId: string;
    msgText?: string;
  }>({ isOpen: false, msgId: '', msgText: '' });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sincronizar mensajes iniciales
  useEffect(() => {
    if (initialMessages) {
      const deletedList = getCleanDeletedList();
      setMessages(initialMessages.filter(m => !deletedList.includes(m.id)));
    }
  }, [initialMessages]);

  // Scroll al final al abrir el chat o recibir mensajes
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

  // Auto-marcar como leídos al abrir la conversación
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      let hasChanges = false;
      const updated = messages.map(m => {
        const fromBoss = checkIsFromBoss(m.author, m.author_role);
        
        if (isJefatura) {
          // Si el jefe abre el chat, lee los mensajes del empleado
          if (!fromBoss && !m.leido_por_jefe) {
            hasChanges = true;
            return { ...m, leido_por_jefe: true };
          }
        } else {
          // Si el empleado abre el chat, lee los mensajes del jefe
          if (fromBoss && !m.leido_por_empleado) {
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
            const fromBoss = checkIsFromBoss(item.author, item.author_role);
            if (isJefatura && !fromBoss) {
              return { ...item, leido_por_jefe: true };
            } else if (!isJefatura && fromBoss) {
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
      id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      notif_id: activeThreadId || (reportContext ? `thread_${reportContext.id || reportContext.date}` : undefined),
      post_id: reportContext?.id || 0,
      author: isJefatura ? (currentUser || 'Luis Delgado') : (currentUser || 'Carmen Luisa'),
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

    // Notificar componente padre
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
      // 1. Quitar de cola global
      const q = JSON.parse(localStorage.getItem('rd_all_employee_replies_queue') || '[]');
      const filteredQ = q.filter((m: any) => m.id !== msgId);
      localStorage.setItem('rd_all_employee_replies_queue', JSON.stringify(filteredQ));

      // 2. Quitar de mapa local
      const mapRaw = localStorage.getItem('rd_local_employee_replies');
      if (mapRaw) {
        const map = JSON.parse(mapRaw);
        Object.keys(map).forEach(k => {
          if (Array.isArray(map[k])) {
            map[k] = map[k].filter((m: any) => m.id !== msgId);
          }
        });
        localStorage.setItem('rd_local_employee_replies', JSON.stringify(map));
      }

      // 3. Agregar a lista negra de eliminados solo el ID único
      const delList: string[] = JSON.parse(localStorage.getItem('rd_deleted_chat_messages') || '[]');
      if (msgId && !delList.includes(msgId)) {
        delList.push(msgId);
        localStorage.setItem('rd_deleted_chat_messages', JSON.stringify(delList));
      }
    } catch (e) {}

    // Notificar componente padre
    if (onMessageDeleted) {
      onMessageDeleted(msgId, msgText);
    }

    try {
      await api.post('/rd-intranet/v1/eliminar-mensaje-chat', { id: msgId, mensaje: msgText });
    } catch (e) {}
  };

  // Filtrado y ordenamiento cronológico ascendente (más antiguos arriba, más nuevos abajo)
  const filteredMessages = messages.filter(m => {
    if (viewFilter === 'pendientes' && m.atendido) return false;
    if (viewFilter === 'atendidos' && !m.atendido) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      return m.mensaje.toLowerCase().includes(q) || m.author.toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => {
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
    return (a.fecha || '').localeCompare(b.fecha || '');
  });

  const pendingCount = messages.filter(m => {
    if (m.atendido) return false;
    const fromBoss = checkIsFromBoss(m.author, m.author_role);
    if (isJefatura) {
      return !fromBoss && !m.leido_por_jefe;
    } else {
      return fromBoss && !m.leido_por_empleado;
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
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#1f2c34] rounded-full"></span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  {isJefatura ? (targetUser || 'Carmen Luisa') : (targetUser || 'Luis Delgado / Jefatura')}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  isJefatura ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {isJefatura ? 'Empleado' : 'Jefatura'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Bitácora: <span className="text-emerald-300 font-semibold">{reportContext?.date || 'General'}</span></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Segmented Filter Pills */}
            <div className="hidden sm:flex items-center bg-[#111b21] p-0.5 rounded-xl border border-white/5 text-[11px]">
              <button
                type="button"
                onClick={() => setViewFilter('todos')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  viewFilter === 'todos' ? 'bg-[#2a3942] text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({messages.length})
              </button>
              <button
                type="button"
                onClick={() => setViewFilter('pendientes')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  viewFilter === 'pendientes' ? 'bg-[#2a3942] text-amber-400 shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pendientes ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setViewFilter('atendidos')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  viewFilter === 'atendidos' ? 'bg-[#2a3942] text-emerald-400 shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Atendidos ({attendedCount})
              </button>
            </div>

            <button
              onClick={() => setFilterSearch(filterSearch ? '' : ' ')}
              title="Buscar en mensajes"
              className={`p-2 rounded-full transition-colors cursor-pointer ${filterSearch ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title="Cerrar chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SEARCH BAR SI ESTÁ ACTIVO */}
        {filterSearch !== '' && (
          <div className="bg-[#111b21] px-4 py-2 border-b border-white/5 flex items-center gap-2 animate-in slide-in-from-top-1">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar en esta conversación..."
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

        {/* CHAT MESSAGES BODY */}
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
              const fromBoss = checkIsFromBoss(msg.author, msg.author_role);
              
              // REGLA FUNDAMENTAL DE ALINEACIÓN:
              // Si Luis Delgado (Jefe) está viendo la pantalla: los mensajes del jefe son "Tú" (isMe = true, derecha en verde).
              // Si Carmen Luisa (Empleado) está viendo la pantalla: los mensajes de Carmen son "Tú" (isMe = true, derecha en verde).
              const isMe = isJefatura ? fromBoss : !fromBoss;

              const headerLabel = isMe
                ? 'Tú'
                : (isJefatura 
                    ? (msg.author || targetUser || 'Carmen Luisa') 
                    : (msg.author || targetUser || 'Luis Delgado / Jefatura'));

              const canDelete = isMe || isJefatura;

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
                        {headerLabel}
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
                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({
                              isOpen: true,
                              msgId: msg.id,
                              msgText: msg.mensaje
                            });
                          }}
                          title={isMe ? 'Eliminar tu mensaje' : 'Eliminar mensaje (Jefatura)'}
                          className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 rounded transition-all cursor-pointer mr-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
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

                    {/* Acciones de Jefatura (Marcar como Atendido en burbuja) */}
                    {isJefatura && !isMe && (
                      <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-end">
                        <button
                          onClick={() => handleToggleAtendido(msg.id)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                            msg.atendido 
                              ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' 
                              : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {msg.atendido ? 'Atendido' : 'Marcar como Atendido'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* QUICK REPLY PRESETS */}
        <div className="bg-[#111b21] px-3 py-2 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
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

      {/* MODAL DE CONFIRMACIÓN MODERNO Y ELEGANTE */}
      <SystemAlertModal
        isOpen={deleteConfirm.isOpen}
        type="warning"
        title="¿Eliminar Mensaje?"
        message="¿Estás seguro de que deseas eliminar este mensaje? Se removerá permanentemente de la conversación."
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        showCancel={true}
        onClose={() => setDeleteConfirm({ isOpen: false, msgId: '', msgText: '' })}
        onConfirm={() => {
          handleDeleteMessage(deleteConfirm.msgId, deleteConfirm.msgText);
          setDeleteConfirm({ isOpen: false, msgId: '', msgText: '' });
        }}
      />
    </div>
  );
};

export default WhatsAppStyleChat;
