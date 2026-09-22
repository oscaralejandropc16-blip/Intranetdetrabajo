import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Send, 
  CheckCheck, 
  MessageSquare, 
  ShieldCheck, 
  User, 
  CheckCircle2, 
  Search, 
  Trash2, 
  X, 
  Sparkles,
  RefreshCw,
  Users
} from 'lucide-react';
import api from '../../lib/api';
import SystemAlertModal from '../common/SystemAlertModal';

export interface LiveChatMessage {
  id: string;
  notif_id?: string;
  post_id?: number | string;
  author: string;
  author_role?: 'jefatura' | 'empleado' | 'admin';
  recipient?: string;
  mensaje: string;
  titulo?: string;
  fecha: string;
  fecha_timestamp?: number;
  fecha_bitacora?: string;
  leido_por_jefe?: boolean;
  leido_por_empleado?: boolean;
  atendido?: boolean;
}

export interface ConversationItem {
  employee: string;
  role: string;
  unreadCountJefe: number;
  unreadCountEmpleado: number;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageIsMe: boolean;
  totalMessages: number;
}

interface LiveChatModuleProps {
  isJefatura: boolean;
  currentUser?: string;
  initialEmployee?: string;
  onUnreadCountChange?: (count: number) => void;
  className?: string;
  compactMode?: boolean;
}

// Determinar si un autor/rol corresponde a Jefatura
export const isUserBoss = (author?: string, role?: string): boolean => {
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

// Reproducir un sutil tono de notificación cuando entra un nuevo mensaje
const playNotificationSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    // Ignorar si el navegador bloquea audio sin interacción previa
  }
};

export const LiveChatModule: React.FC<LiveChatModuleProps> = ({
  isJefatura,
  currentUser,
  initialEmployee = 'Carmen Luisa',
  onUnreadCountChange,
  className = '',
  compactMode = false
}) => {
  // Lista de empleados registrados por defecto
  const [conversations, setConversations] = useState<ConversationItem[]>([
    {
      employee: 'Carmen Luisa',
      role: 'Empleado / Asistente Legal',
      unreadCountJefe: 0,
      unreadCountEmpleado: 0,
      lastMessage: 'Canal oficial abierto',
      lastMessageTime: '',
      lastMessageIsMe: false,
      totalMessages: 0
    }
  ]);

  const [activeEmployee, setActiveEmployee] = useState<string>(initialEmployee);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'todos' | 'pendientes' | 'atendidos'>('todos');
  const [searchConversation, setSearchConversation] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    msgId: string;
    msgText?: string;
  }>({ isOpen: false, msgId: '', msgText: '' });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef<number>(0);
  const initialFetchDoneRef = useRef<boolean>(false);

  const effectiveCurrentUser = currentUser || (isJefatura ? 'Luis Delgado' : 'Carmen Luisa');

  // Función para obtener la lista de mensajes del backend y sincronizar localStorage
  const fetchMessages = useCallback(async (silent = true) => {
    if (!silent) setIsRefreshing(true);
    try {
      // 1. Obtener mensajes del servidor
      const empQuery = isJefatura ? activeEmployee : (effectiveCurrentUser || 'Carmen Luisa');
      const response = await api.get('/rd-intranet/v1/chat/messages', {
        params: { employee: empQuery }
      });

      let serverMsgs: LiveChatMessage[] = [];
      if (Array.isArray(response.data)) {
        serverMsgs = response.data;
      }

      // 2. Combinar con cola local para resiliencia offline/inmediata
      const qRaw = localStorage.getItem('rd_all_employee_replies_queue');
      let localQ: LiveChatMessage[] = [];
      if (qRaw) {
        try {
          const parsed = JSON.parse(qRaw);
          if (Array.isArray(parsed)) localQ = parsed;
        } catch (e) {}
      }

      // 3. Filtrar eliminados
      const deletedList: string[] = JSON.parse(localStorage.getItem('rd_deleted_chat_messages') || '[]');

      const combined = [...serverMsgs, ...localQ]
        .filter(m => m && m.id && !deletedList.includes(m.id) && (!m.mensaje || !deletedList.includes(m.mensaje.trim())))
        // Deduplicar por ID único o contenido+fecha exacta
        .filter((msg, idx, self) => idx === self.findIndex(t => (t.id && t.id === msg.id) || (t.mensaje === msg.mensaje && t.fecha === msg.fecha)));

      // Detectar si hay mensajes nuevos de la otra persona para reproducir sonido
      if (initialFetchDoneRef.current && combined.length > prevMessagesCountRef.current) {
        const lastAdded = combined[0];
        if (lastAdded) {
          const isFromBoss = isUserBoss(lastAdded.author, lastAdded.author_role);
          const isOtherParty = isJefatura ? !isFromBoss : isFromBoss;
          if (isOtherParty) {
            playNotificationSound();
          }
        }
      }

      prevMessagesCountRef.current = combined.length;
      initialFetchDoneRef.current = true;
      setMessages(combined);

      // Calcular no leídos
      let unread = 0;
      combined.forEach(m => {
        const fromBoss = isUserBoss(m.author, m.author_role);
        if (isJefatura && !fromBoss && !m.leido_por_jefe) {
          unread++;
        } else if (!isJefatura && fromBoss && !m.leido_por_empleado) {
          unread++;
        }
      });

      if (onUnreadCountChange) {
        onUnreadCountChange(unread);
      }
    } catch (err) {
      console.warn('Sincronizando chat con almacenamiento local:', err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [activeEmployee, effectiveCurrentUser, isJefatura, onUnreadCountChange]);

  // Cargar lista de conversaciones (para Jefatura)
  const fetchConversations = useCallback(async () => {
    if (!isJefatura) return;
    try {
      const res = await api.get('/rd-intranet/v1/chat/conversations');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setConversations(res.data);
      }
    } catch (e) {
      // ignore
    }
  }, [isJefatura]);

  // Marcar automáticamente como leídos los mensajes que veo en pantalla
  const markAsRead = useCallback(async () => {
    if (messages.length === 0) return;

    let needsUpdate = false;
    const updated = messages.map(m => {
      const fromBoss = isUserBoss(m.author, m.author_role);
      if (isJefatura) {
        if (!fromBoss && !m.leido_por_jefe) {
          needsUpdate = true;
          return { ...m, leido_por_jefe: true };
        }
      } else {
        if (fromBoss && !m.leido_por_empleado) {
          needsUpdate = true;
          return { ...m, leido_por_empleado: true };
        }
      }
      return m;
    });

    if (needsUpdate) {
      setMessages(updated);
      try {
        // Actualizar cola local
        const qRaw = localStorage.getItem('rd_all_employee_replies_queue');
        if (qRaw) {
          const qList = JSON.parse(qRaw);
          if (Array.isArray(qList)) {
            const updatedQ = qList.map((item: any) => {
              const fromBoss = isUserBoss(item.author, item.author_role);
              if (isJefatura && !fromBoss) return { ...item, leido_por_jefe: true };
              if (!isJefatura && fromBoss) return { ...item, leido_por_empleado: true };
              return item;
            });
            localStorage.setItem('rd_all_employee_replies_queue', JSON.stringify(updatedQ));
          }
        }

        // Llamar al backend para persistir doble check azul en WordPress
        await api.post('/rd-intranet/v1/chat/mark-read', {
          is_jefatura: isJefatura,
          employee: activeEmployee
        });
      } catch (e) {}
    }
  }, [activeEmployee, isJefatura, messages]);

  // Polling periódico cada 2.5 segundos para sincronía en vivo
  useEffect(() => {
    fetchMessages(true);
    fetchConversations();

    const interval = setInterval(() => {
      fetchMessages(true);
      fetchConversations();
    }, 2500);

    return () => clearInterval(interval);
  }, [fetchConversations, fetchMessages]);

  // Auto-marcar como leído cada vez que cambian los mensajes o el empleado seleccionado
  useEffect(() => {
    markAsRead();
  }, [messages.length, activeEmployee, markAsRead]);

  // Scroll al final al recibir mensajes o cambiar de chat
  useEffect(() => {
    const t = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
    return () => clearTimeout(t);
  }, [messages.length, activeEmployee, filterMode]);

  // Enviar un mensaje nuevo
  const handleSend = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isSending) return;

    setIsSending(true);
    const nowStr = new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = new Date().toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
    const fullDate = `${dateStr}, ${nowStr}`;

    const newMsg: LiveChatMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      author: effectiveCurrentUser,
      author_role: isJefatura ? 'jefatura' : 'empleado',
      recipient: isJefatura ? activeEmployee : 'Jefatura',
      mensaje: textToSend,
      fecha: fullDate,
      fecha_timestamp: Math.floor(Date.now() / 1000),
      fecha_bitacora: new Date().toISOString().split('T')[0],
      titulo: 'Mensaje Directo',
      leido_por_jefe: isJefatura,
      leido_por_empleado: !isJefatura,
      atendido: false
    };

    // Actualización optimista inmediata en UI
    const updatedMessages = [newMsg, ...messages];
    setMessages(updatedMessages);
    setInputText('');

    // Guardar en cola local
    try {
      const qRaw = localStorage.getItem('rd_all_employee_replies_queue');
      const qList = qRaw ? JSON.parse(qRaw) : [];
      localStorage.setItem('rd_all_employee_replies_queue', JSON.stringify([newMsg, ...qList].slice(0, 200)));
    } catch (e) {}

    // Enviar al backend de WordPress
    try {
      await api.post('/rd-intranet/v1/chat/send', {
        id: newMsg.id,
        mensaje: newMsg.mensaje,
        author: newMsg.author,
        author_role: newMsg.author_role,
        is_jefatura: isJefatura,
        recipient: newMsg.recipient,
        date: newMsg.fecha_bitacora
      });
      // Refrescar conversaciones si es jefe
      fetchConversations();
    } catch (err) {
      console.warn('Mensaje guardado localmente (offline):', err);
    } finally {
      setIsSending(false);
    }
  };

  // Alternar estatus de Atendido (para Jefatura)
  const handleToggleAtendido = (msgId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return { ...m, atendido: !m.atendido, leido_por_jefe: true };
      }
      return m;
    }));
  };

  // Eliminar mensaje
  const handleDeleteMessage = async (msgId: string, msgText?: string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));

    try {
      // 1. Quitar de la cola local
      const qRaw = localStorage.getItem('rd_all_employee_replies_queue');
      if (qRaw) {
        const qList = JSON.parse(qRaw);
        const filteredQ = qList.filter((m: any) => m.id !== msgId);
        localStorage.setItem('rd_all_employee_replies_queue', JSON.stringify(filteredQ));
      }

      // 2. Agregar a lista negra de eliminados
      const delList: string[] = JSON.parse(localStorage.getItem('rd_deleted_chat_messages') || '[]');
      if (msgId && !delList.includes(msgId)) {
        delList.push(msgId);
        localStorage.setItem('rd_deleted_chat_messages', JSON.stringify(delList));
      }

      // 3. Notificar al backend
      await api.post('/rd-intranet/v1/chat/delete', { id: msgId, mensaje: msgText });
      fetchConversations();
    } catch (e) {}
  };

  // Filtrado y ordenamiento cronológico (más antiguos arriba, más recientes abajo)
  const filteredMessages = useMemo(() => {
    return messages
      .filter(m => {
        // Filtrar por empleado activo si es modo jefatura
        if (isJefatura && activeEmployee) {
          const author = (m.author || '').toLowerCase();
          const recipient = (m.recipient || '').toLowerCase();
          const emp = activeEmployee.toLowerCase();
          const isFromBoss = isUserBoss(m.author, m.author_role);

          if (isFromBoss) {
            const matchesRecipient = !recipient || recipient.includes(emp) || emp.includes(recipient);
            if (!matchesRecipient) return false;
          } else {
            const matchesAuthor = author.includes(emp) || emp.includes(author);
            if (!matchesAuthor) return false;
          }
        }

        // Filtro por Atendidos / Pendientes
        if (filterMode === 'pendientes' && m.atendido) return false;
        if (filterMode === 'atendidos' && !m.atendido) return false;

        // Buscador de texto
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          return (m.mensaje || '').toLowerCase().includes(q) || (m.author || '').toLowerCase().includes(q);
        }

        return true;
      })
      .sort((a, b) => {
        const parseIdTime = (id: string) => {
          if (!id) return 0;
          const parts = id.split('_');
          if (parts.length >= 2) {
            const num = parseInt(parts[1], 10);
            if (!isNaN(num) && num > 1000000) return num;
          }
          return 0;
        };
        const tA = (a.fecha_timestamp ? a.fecha_timestamp * 1000 : 0) || parseIdTime(a.id);
        const tB = (b.fecha_timestamp ? b.fecha_timestamp * 1000 : 0) || parseIdTime(b.id);
        if (tA && tB && tA !== tB) return tA - tB;
        return (a.fecha || '').localeCompare(b.fecha || '');
      });
  }, [activeEmployee, filterMode, isJefatura, messages, searchQuery]);

  // Presets de respuestas rápidas
  const quickPresets = isJefatura ? [
    '👍 Entendido y revisado.',
    '⚡ Por favor envíame el soporte.',
    '✍️ Revisa las correcciones indicadas.',
    '✅ Aprobado, excelente trabajo.',
    '❓ ¿En qué estatus quedó este caso?'
  ] : [
    '⚡ Listo jefe, ya corregí este punto.',
    '📎 Ya adjunté el comprobante en la bitácora.',
    '❓ Tengo una duda con respecto a este expediente.',
    '⏱️ En proceso, finalizo en la tarde.',
    '👍 Entendido perfectamente.'
  ];

  const pendingCount = messages.filter(m => {
    if (m.atendido) return false;
    const fromBoss = isUserBoss(m.author, m.author_role);
    return isJefatura ? (!fromBoss && !m.leido_por_jefe) : (fromBoss && !m.leido_por_empleado);
  }).length;

  const attendedCount = messages.filter(m => m.atendido).length;

  // Filtrado de contactos para el sidebar de Jefatura
  const filteredConversations = conversations.filter(c => {
    if (!searchConversation) return true;
    return c.employee.toLowerCase().includes(searchConversation.toLowerCase()) || 
           c.lastMessage.toLowerCase().includes(searchConversation.toLowerCase());
  });

  return (
    <div className={`bg-[#0b141a] rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col md:flex-row text-white ${className}`} style={{ minHeight: compactMode ? '580px' : '700px', height: '100%' }}>
      
      {/* SIDEBAR DE CONVERSACIONES (SOLO JEFATURA) */}
      {isJefatura && (
        <div className="w-full md:w-80 lg:w-96 bg-[#111b21] border-r border-white/5 flex flex-col shrink-0">
          
          {/* Header del Sidebar */}
          <div className="p-3.5 bg-[#1f2c34] border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm ring-2 ring-emerald-400/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Canal Jefatura</h3>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  En línea • Supervisión
                </p>
              </div>
            </div>

            <button
              onClick={() => fetchMessages(false)}
              title="Actualizar mensajes"
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>

          {/* Buscador de Empleados / Chats */}
          <div className="p-2.5 border-b border-white/5 bg-[#111b21]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar conversación..."
                value={searchConversation}
                onChange={(e) => setSearchConversation(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#202c33] rounded-xl text-xs text-white placeholder-slate-400 outline-none border border-transparent focus:border-emerald-500/40 transition-all font-normal"
              />
              {searchConversation && (
                <button onClick={() => setSearchConversation('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs">
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Lista de Chats / Empleados */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {filteredConversations.map((conv, cIdx) => {
              const isActive = activeEmployee.toLowerCase() === conv.employee.toLowerCase();
              return (
                <button
                  key={cIdx}
                  type="button"
                  onClick={() => setActiveEmployee(conv.employee)}
                  className={`w-full p-3 flex items-start gap-3 text-left transition-colors cursor-pointer relative ${
                    isActive ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]/60'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[#202c33] border border-white/10 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                      {conv.employee.charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#111b21] rounded-full"></span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="text-xs font-bold text-white truncate">{conv.employee}</h4>
                      {conv.lastMessageTime && (
                        <span className="text-[10px] text-slate-400 shrink-0">{conv.lastMessageTime.split(',')[1] || conv.lastMessageTime}</span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                      {conv.lastMessageIsMe && (
                        <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] shrink-0 inline" />
                      )}
                      <span>{conv.lastMessage || 'Conversación activa'}</span>
                    </p>
                  </div>

                  {conv.unreadCountJefe > 0 && (
                    <span className="px-1.5 py-0.5 bg-emerald-500 text-slate-950 font-black rounded-full text-[10px] shadow-sm shrink-0 self-center">
                      {conv.unreadCountJefe}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer de Estado */}
          <div className="p-3 bg-[#182229] border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>{conversations.length} Contacto(s)</span>
            </span>
            {pendingCount > 0 && (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                {pendingCount} sin leer
              </span>
            )}
          </div>
        </div>
      )}

      {/* ÁREA PRINCIPAL DE CHAT (VENTANA DE CONVERSACIÓN) */}
      <div className="flex-1 flex flex-col bg-[#0b141a] relative overflow-hidden">
        
        {/* WHATSAPP-STYLE HEADER */}
        <div className="bg-[#1f2c34] px-4 py-3 sm:px-5 sm:py-3.5 border-b border-white/5 flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-emerald-400/30">
                {isJefatura ? <User className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#1f2c34] rounded-full"></span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  {isJefatura ? activeEmployee : 'Dr. Luis Delgado / Jefatura Jurídica'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  isJefatura ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {isJefatura ? 'Empleado' : 'Jefatura Oficial'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-emerald-300 font-medium">En línea en la Intranet</span>
              </p>
            </div>
          </div>

          {/* Botones de Control y Filtros */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Segmented Filter Pills */}
            <div className="hidden sm:flex items-center bg-[#111b21] p-0.5 rounded-xl border border-white/5 text-[11px]">
              <button
                type="button"
                onClick={() => setFilterMode('todos')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterMode === 'todos' ? 'bg-[#2a3942] text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({filteredMessages.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('pendientes')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filterMode === 'pendientes' ? 'bg-[#2a3942] text-amber-400 shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pendientes ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('atendidos')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterMode === 'atendidos' ? 'bg-[#2a3942] text-emerald-400 shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Atendidos ({attendedCount})
              </button>
            </div>

            <button
              onClick={() => setSearchQuery(searchQuery ? '' : ' ')}
              title="Buscar en mensajes"
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                searchQuery ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={() => fetchMessages(false)}
              title="Sincronizar mensajes"
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* SEARCH BAR ACTIVA */}
        {searchQuery !== '' && (
          <div className="bg-[#111b21] px-4 py-2 border-b border-white/5 flex items-center gap-2 animate-in slide-in-from-top-1">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar en esta conversación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white text-xs">
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
          {/* Security & Confidentiality notice */}
          <div className="flex justify-center">
            <div className="bg-[#182229] border border-white/5 rounded-xl px-3.5 py-1.5 text-center shadow-sm max-w-sm">
              <p className="text-[10px] text-amber-300/80 font-medium flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Canal oficial confidencial de Román & Delgado • Encriptación interna
              </p>
            </div>
          </div>

          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium">No hay mensajes aún en esta conversación.</p>
              <p className="text-[11px] text-slate-500">Escribe abajo o selecciona una respuesta rápida para iniciar el diálogo.</p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const fromBoss = isUserBoss(msg.author, msg.author_role);
              
              // REGLA DE ALINEACIÓN:
              // Si el usuario logueado es Jefe: mensajes del jefe a la DERECHA en verde (`isMe = true`).
              // Si el usuario logueado es Empleado: mensajes del empleado a la DERECHA en verde (`isMe = true`).
              const isMe = isJefatura ? fromBoss : !fromBoss;

              // REGLA DE DOBLE CHECK AZUL:
              // Un mensaje propio (isMe) está LEÍDO si:
              // - Si soy jefe: el empleado lo leyó (`msg.leido_por_empleado === true` o `msg.atendido === true`).
              // - Si soy empleado: el jefe lo leyó (`msg.leido_por_jefe === true` o `msg.atendido === true`).
              const isReadByRecipient = isMe && (
                msg.atendido === true || 
                (isJefatura ? msg.leido_por_empleado : msg.leido_por_jefe)
              );

              const headerLabel = isMe
                ? 'Tú'
                : (isJefatura 
                    ? (msg.author || activeEmployee || 'Carmen Luisa') 
                    : (msg.author || 'Dr. Luis Delgado / Jefatura'));

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
                    {/* Header de la burbuja */}
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

                    {/* Footer con hora, checks de lectura y botón de eliminar */}
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

                      {/* ICONOS DE ESTADO DE LECTURA (DOBLE CHECK AZUL COMO WHATSAPP) */}
                      {isMe && (
                        isReadByRecipient ? (
                          <span title="Leído por el destinatario (Doble Check Azul)">
                            <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] shrink-0" />
                          </span>
                        ) : (
                          <span title="Enviado / Entregado (Doble Check Gris)">
                            <CheckCheck className="w-3.5 h-3.5 text-white/60 shrink-0" />
                          </span>
                        )
                      )}
                    </div>

                    {/* Acciones de Jefatura (Marcar como Atendido) */}
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
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 pl-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> Rápidas:
          </span>
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
            placeholder={isJefatura ? `Escribe un mensaje a ${activeEmployee}...` : "Escribe tu mensaje a Jefatura..."}
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

      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR MENSAJE */}
      <SystemAlertModal
        isOpen={deleteConfirm.isOpen}
        type="warning"
        title="¿Eliminar Mensaje?"
        message="¿Estás seguro de que deseas eliminar este mensaje? Se removerá de forma permanente de la conversación."
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

export default LiveChatModule;
