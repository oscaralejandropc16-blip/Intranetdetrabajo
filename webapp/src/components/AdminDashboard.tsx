import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, AlertCircle, FileText, CheckCircle2, MessageSquare, X, Clock, Calendar as CalendarIcon, CheckCircle, Activity, MapPin, BookOpen, History, Send, Download, ChevronDown, ChevronUp, Zap, Loader2, Trash2, ShieldCheck, Lock, Paperclip, File, Scale, RotateCcw, ChevronLeft, ChevronRight, Receipt, FolderSearch } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import api, { uploadPdfInChunks, uploadEvidenceFile, submitToServer, dataUrlToFile } from '../lib/api';
import { supabase } from '../lib/supabase';
import SystemAlertModal, { type AlertType } from './common/SystemAlertModal';
import TabRegistroDiario from './employee/TabRegistroDiario';
import TabLibroIngresos from './employee/TabLibroIngresos';
import TabAgenda from './employee/TabAgenda';
import TabHistorial from './employee/TabHistorial';
import ModuloExpedientes from './expedientes/ModuloExpedientes';
import ModuloGastos from './gastos/ModuloGastos';
import ModuloBibliotecaArchivos from './expedientes/ModuloBibliotecaArchivos';
import LiveStatusBar from './common/LiveStatusBar';
import { KantFloatingCompanion } from './common/KantMascot';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WhatsAppStyleChat, checkIsFromBoss } from './chat/WhatsAppStyleChat';
import LiveChatModule, { playNotificationSound } from './chat/LiveChatModule';
import AttendanceReportModal from './common/AttendanceReportModal';
import { normalizeSupervisorName, formatTime12h } from '../lib/supabaseAdapter';

const ensureArray = (val: any): any[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      return [];
    }
  }
  return [];
};

const isJefaturaUser = (userName: string) => {
  if (!userName) return false;
  const lower = userName.toLowerCase().trim();
  const jefaturaExact = [
    'victor', 'victor roman', 'víctor román', 
    'luis', 'luis delgado', 
    'romanydelgado', 'romanydelgado@gmail.com',
    'admin', 'jefatura'
  ];
  return jefaturaExact.some(j => lower === j || lower.startsWith('luis delgado') || lower.startsWith('victor roman') || lower.startsWith('romanydelgado'));
};

export default function AdminDashboard() {
  const [reports, setReports] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('rd_cached_admin_reports');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.sort((a: any, b: any) => {
            const dateA = a.date || a.fecha || '';
            const dateB = b.date || b.fecha || '';
            if (dateA !== dateB) return dateB.localeCompare(dateA);
            return (Number(b.id) || 0) - (Number(a.id) || 0);
          });
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  });
  const [allDrafts, setAllDrafts] = useState<any[]>([]);
  const [allInvestigaciones, setAllInvestigaciones] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const isReportApproved = Boolean(
    selectedReport && (
      selectedReport.status === 'Revisado' ||
      selectedReport.status === 'Aprobado' ||
      (selectedReport.estado || '').toLowerCase().includes('aprob') ||
      (selectedReport.estado || '').toLowerCase().includes('revis') ||
      (typeof selectedReport.supervisado_por === 'string' && selectedReport.supervisado_por.trim().length > 0)
    )
  );
  const [adminComment, setAdminComment] = useState('');
  const [adminProgramaciones, setAdminProgramaciones] = useState<any[]>([]);
  const [adminActuaciones, setAdminActuaciones] = useState<any[]>([]);
  const [adminIngresos, setAdminIngresos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para interactividad de la UI
  const getLocalEmployeeMessages = () => {
    const list: any[] = [];
    const attendedIds: string[] = [];
    try {
      const att = localStorage.getItem('rd_jefe_attended_replies');
      if (att) attendedIds.push(...JSON.parse(att));
    } catch (e) {}

    try {
      const q = localStorage.getItem('rd_all_employee_replies_queue');
      if (q) {
        const parsedQ = JSON.parse(q);
        if (Array.isArray(parsedQ)) {
          parsedQ.forEach((item: any) => {
            const isAtt = item.atendido === true || attendedIds.includes(String(item.id));
            list.push({
              ...item,
              atendido: isAtt,
              leido_por_jefe: isAtt || item.leido_por_jefe === true
            });
          });
        }
      }
      const mapRaw = localStorage.getItem('rd_local_employee_replies');
      if (mapRaw) {
        const parsedMap = JSON.parse(mapRaw);
        Object.entries(parsedMap).forEach(([notifKey, items]: [string, any]) => {
          if (Array.isArray(items)) {
            items.forEach((item: any) => {
              const isAtt = item.atendido === true || attendedIds.includes(String(item.id));
              if (!list.some(m => String(m.id) === String(item.id) || (m.mensaje === item.mensaje && m.fecha === item.fecha))) {
                list.push({
                  id: item.id || `rep_${Date.now()}`,
                  notif_id: notifKey,
                  titulo: item.titulo || 'Instrucción de Jefatura',
                  mensaje: item.mensaje,
                  fecha: item.fecha,
                  fecha_bitacora: item.fecha_bitacora || format(new Date(), 'yyyy-MM-dd'),
                  author: item.author || 'Carmen Luisa',
                  leido_por_jefe: isAtt || item.leido_por_jefe === true || false,
                  atendido: isAtt
                });
              }
            });
          }
        });
      }
    } catch (e) {}
    return list;
  };

  const [repliesFilter, setRepliesFilter] = useState<'pendientes' | 'atendidos' | 'todos'>('pendientes');
  const [chatConfig, setChatConfig] = useState<{
    isOpen: boolean;
    targetUser: string;
    reportContext?: any;
    initialMessages: any[];
  }>({
    isOpen: false,
    targetUser: 'Empleado',
    initialMessages: []
  });
  const [employeeMessages, setEmployeeMessages] = useState<any[]>(() => getLocalEmployeeMessages());

  const markEmployeeReplyRead = async (replyId: string) => {
    // 1. Guardar persistentemente en rd_jefe_attended_replies
    try {
      const existing = JSON.parse(localStorage.getItem('rd_jefe_attended_replies') || '[]');
      const updated = Array.from(new Set([...existing, String(replyId)]));
      localStorage.setItem('rd_jefe_attended_replies', JSON.stringify(updated));
    } catch (e) {}

    // 2. Actualizar estado reactivo en pantalla
    setEmployeeMessages(prev => prev.map(m => {
      if (String(m.id) === String(replyId)) {
        return { ...m, leido_por_jefe: true, atendido: true };
      }
      return m;
    }));

    // 3. Actualizar en cola local
    try {
      const q = JSON.parse(localStorage.getItem('rd_all_employee_replies_queue') || '[]');
      const updatedQ = q.map((item: any) => String(item.id) === String(replyId) ? { ...item, leido_por_jefe: true, atendido: true } : item);
      localStorage.setItem('rd_all_employee_replies_queue', JSON.stringify(updatedQ));
    } catch (e) {}

    // 4. Actualizar en mapa local
    try {
      const mapRaw = localStorage.getItem('rd_local_employee_replies');
      if (mapRaw) {
        const parsedMap = JSON.parse(mapRaw);
        Object.keys(parsedMap).forEach(k => {
          if (Array.isArray(parsedMap[k])) {
            parsedMap[k] = parsedMap[k].map((item: any) => String(item.id) === String(replyId) ? { ...item, leido_por_jefe: true, atendido: true } : item);
          }
        });
        localStorage.setItem('rd_local_employee_replies', JSON.stringify(parsedMap));
      }
    } catch (e) {}

    try {
      await submitToServer('/rd-intranet/v1/marcar-mensaje-leido-jefe', { reply_id: replyId, atendido: true });
    } catch (e) {}
  };

  const handleOpenChatForReply = (msg: any, extraMessages?: any[]) => {
    const targetUser = (msg.author_role === 'empleado' || (msg.author && msg.author.toLowerCase().includes('carmen'))) ? 'Carmen Luisa' : (msg.author || 'Carmen Luisa');
    const dateKey = msg.fecha_bitacora || msg.date || '';

    const userMsgs = employeeMessages.filter(m => {
      const a = (m.author || '').toLowerCase().trim();
      const t = targetUser.toLowerCase().trim();
      const sameUser = a === t || a.includes(t) || t.includes(a);
      const sameDate = !dateKey || !m.fecha_bitacora || m.fecha_bitacora === dateKey;
      return sameUser && sameDate;
    });

    const reportMatch = reports.find(r => (dateKey && r.date === dateKey) || (r.id == msg.post_id) || ((r.user || '').toLowerCase().includes(targetUser.toLowerCase()) && r.date === dateKey));

    const finalMsgs = extraMessages && extraMessages.length > 0 ? extraMessages : (userMsgs.length > 0 ? userMsgs : [msg]);

    setChatConfig({
      isOpen: true,
      targetUser,
      reportContext: reportMatch || { date: dateKey || format(new Date(), 'yyyy-MM-dd'), id: msg.post_id },
      initialMessages: finalMsgs
    });
  };

  const handleOpenReportForReply = (msg: any) => {
    if (!msg) return;
    const authorClean = (msg.author || '').toLowerCase().trim();
    const dateClean = msg.fecha_bitacora || '';
    const postId = Number(msg.post_id) || 0;

    let targetRep: any = null;

    // 1. Coincidencia por Post ID
    if (postId > 0) {
      targetRep = reports.find(r => Number(r.id) === postId);
    }

    // 2. Coincidencia por Usuario y Fecha exacta
    if (!targetRep && authorClean && dateClean) {
      targetRep = reports.find(r => {
        const rUser = (r.user || '').toLowerCase().trim();
        return (rUser === authorClean || rUser.includes(authorClean) || authorClean.includes(rUser)) && r.date === dateClean;
      });
    }

    // 3. Coincidencia por Usuario (la bitácora más reciente de ese empleado)
    if (!targetRep && authorClean) {
      const userReports = reports.filter(r => {
        const rUser = (r.user || '').toLowerCase().trim();
        return rUser === authorClean || rUser.includes(authorClean) || authorClean.includes(rUser);
      });
      if (userReports.length > 0) {
        userReports.sort((a, b) => b.date.localeCompare(a.date));
        targetRep = userReports[0];
      }
    }

    // 4. Si no tiene bitácora guardada aún, abrir un contenedor virtual
    if (!targetRep) {
      targetRep = {
        id: postId || `virtual_${Date.now()}`,
        user: msg.author || 'Carmen Luisa',
        date: dateClean || format(new Date(), 'yyyy-MM-dd'),
        status: 'Enviado',
        progress: 100,
        clockIn: '08:00',
        clockOut: '17:00',
        actuaciones: [],
        ingresos: [],
        programaciones: [],
        evidences: [],
        comentario_admin: '',
        respuestas_hilo: [msg]
      };
    }

    setSelectedReport(targetRep);
    setAdminComment(targetRep.comentario_admin || '');
    setAdminProgramaciones(ensureArray(targetRep.programaciones));
    setAdminActuaciones(ensureArray(targetRep.actuaciones));
    setAdminIngresos(ensureArray(targetRep.ingresos));
  };
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [datePreset, setDatePreset] = useState('Todos');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [activeView, setActiveView] = useState<'bitacoras' | 'chat' | 'buzon' | 'agenda' | 'expedientes' | 'gastos' | 'mis_libros' | 'historial' | 'biblioteca'>(() => {
    const saved = sessionStorage.getItem('rd_admin_active_view');
    if (saved === 'agenda') return 'bitacoras';
    return (saved as any) || 'bitacoras';
  });
  const [unreadChatLive, setUnreadChatLive] = useState(0);
  const [chatToast, setChatToast] = useState<{
    isOpen: boolean;
    sender: string;
    message: string;
  } | null>(null);

  const fetchUnreadChatCount = useCallback(async () => {
    try {
      const curUser = (localStorage.getItem('rd_user_name') || 'Luis Delgado').toLowerCase().trim();
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, sender_name, recipient_name, mensaje, created_at, leido')
        .eq('leido', false)
        .order('created_at', { ascending: false });

      if (error || !data) return;

      const unreadForMe = data.filter((m: any) => {
        const sender = (m.sender_name || '').toLowerCase().trim();
        const recipient = (m.recipient_name || '').toLowerCase().trim();
        const isSelf = sender === curUser || sender.includes(curUser) || curUser.includes(sender);
        if (isSelf) return false;

        const isAddressedToMe = recipient.includes(curUser) || curUser.includes(recipient) || recipient.includes('jefatura') || recipient.includes('socio') || recipient.includes('admin');
        return isAddressedToMe;
      });

      setUnreadChatLive(unreadForMe.length);
    } catch (e) {
      console.warn('Error fetching unread chat count:', e);
    }
  }, []);

  // Suscripción Realtime en segundo plano para notificar mensajes nuevos al jefe
  useEffect(() => {
    fetchUnreadChatCount();

    const channel = supabase
      .channel('admin_chat_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload: any) => {
          const newMsg = payload.new;
          if (!newMsg) return;

          const curUser = (localStorage.getItem('rd_user_name') || 'Luis Delgado').toLowerCase().trim();
          const sender = (newMsg.sender_name || '').toLowerCase().trim();
          const recipient = (newMsg.recipient_name || '').toLowerCase().trim();

          const isSelf = sender === curUser || sender.includes(curUser) || curUser.includes(sender);
          if (isSelf) return;

          const isForMe = recipient.includes(curUser) || curUser.includes(recipient) || recipient.includes('jefatura') || recipient.includes('socio') || recipient.includes('admin');
          if (isForMe) {
            setUnreadChatLive(prev => prev + 1);
            playNotificationSound();
            setChatToast({
              isOpen: true,
              sender: newMsg.sender_name || 'Empleado',
              message: newMsg.mensaje || 'Nuevo mensaje recibido'
            });

            setTimeout(() => {
              setChatToast(prev => (prev?.sender === newMsg.sender_name ? null : prev));
            }, 10000);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        () => {
          fetchUnreadChatCount();
        }
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchUnreadChatCount();
    }, 90000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchUnreadChatCount]);

  const [allGastos, setAllGastos] = useState<any[]>([]);
  const [globalExpedientes, setGlobalExpedientes] = useState<any[]>([]);
  const [bossSubTab, setBossSubTab] = useState<'actuaciones' | 'ingresos' | 'programacion' | 'cierre'>(() => {
    const saved = sessionStorage.getItem('rd_admin_boss_sub_tab');
    if (saved === 'investigaciones' || !saved) return 'actuaciones';
    return (saved as any) || 'actuaciones';
  });

  useEffect(() => {
    const fetchGlobalExpedientes = async () => {
      try {
        const res = await api.get('/rd-intranet/v1/expedientes');
        if (res.data && Array.isArray(res.data)) {
          setGlobalExpedientes(res.data);
        }
      } catch (e) {
        console.warn('Error fetching expedientes in AdminDashboard:', e);
      }
    };
    fetchGlobalExpedientes();
    window.addEventListener('rd_expedientes_updated', fetchGlobalExpedientes);
    return () => window.removeEventListener('rd_expedientes_updated', fetchGlobalExpedientes);
  }, []);

  // Sincronizar en tiempo real cuando se leen o atienden mensajes en el chat
  useEffect(() => {
    const handleSync = (e?: any) => {
      const ids: string[] = e?.detail?.ids || [];
      if (ids.length > 0) {
        setEmployeeMessages(prev => prev.map(m => {
          if (ids.includes(String(m.id))) {
            return { ...m, leido_por_jefe: true, atendido: true };
          }
          return m;
        }));
      } else {
        setEmployeeMessages(getLocalEmployeeMessages());
      }
    };
    window.addEventListener('rd_chat_read', handleSync);
    window.addEventListener('rd_employee_messages_updated', handleSync);
    return () => {
      window.removeEventListener('rd_chat_read', handleSync);
      window.removeEventListener('rd_employee_messages_updated', handleSync);
    };
  }, []);

  useEffect(() => {
    sessionStorage.setItem('rd_admin_active_view', activeView);
  }, [activeView]);

  useEffect(() => {
    sessionStorage.setItem('rd_admin_boss_sub_tab', bossSubTab);
  }, [bossSubTab]);

  // Claves scoped por jefe para aislar borradores de Luis y Victor
  const currentBossName = (localStorage.getItem('rd_user_name') || '').toLowerCase().trim();
  const bossKey = currentBossName.replace(/[^a-z0-9]/g, '_');
  const bossActuacionesKey = `rd_jefe_actuaciones_${bossKey}`;
  const bossIngresosKey = `rd_jefe_ingresos_${bossKey}`;
  const bossProgramacionKey = `rd_jefe_programacion_${bossKey}`;

  // Estado local para Libros de Jefatura (sin horario/GPS)
  const [actuacionesJefe, setActuacionesJefe] = useState<any[]>(() => {
    // 1. Intentar cargar de la clave scoped del jefe
    if (bossKey) {
      const savedScoped = localStorage.getItem(bossActuacionesKey);
      if (savedScoped) {
        try { return JSON.parse(savedScoped); } catch (e) { return []; }
      }
    }
    // 2. Si no hay clave scoped, revisar legacy y descartar si contiene actuaciones de Carmen
    const savedLegacy = localStorage.getItem('rd_jefe_actuaciones');
    if (savedLegacy) {
      try {
        const parsed = JSON.parse(savedLegacy);
        const str = JSON.stringify(parsed).toUpperCase();
        const hasCarmenData = str.includes('WILLIAM BELLO') || str.includes('ALAYETO') || str.includes('DILCIA');
        if (hasCarmenData && currentBossName.includes('luis')) {
          localStorage.removeItem('rd_jefe_actuaciones');
          localStorage.removeItem('rd_admin_draft_actuaciones');
          return [];
        }
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [ingresosJefe, setIngresosJefe] = useState<any[]>(() => {
    if (bossKey) {
      const savedScoped = localStorage.getItem(bossIngresosKey);
      if (savedScoped) {
        try { return JSON.parse(savedScoped); } catch (e) { return []; }
      }
    }
    const saved = localStorage.getItem('rd_jefe_ingresos');
    return saved ? JSON.parse(saved) : [];
  });
  const [programacionesJefe, setProgramacionesJefe] = useState<any[]>(() => {
    if (bossKey) {
      const savedScoped = localStorage.getItem(bossProgramacionKey);
      if (savedScoped) {
        try { return JSON.parse(savedScoped); } catch (e) { return []; }
      }
    }
    const saved = localStorage.getItem('rd_jefe_programacion');
    return saved ? JSON.parse(saved) : [];
  });
  const [attachedFilesJefe, setAttachedFilesJefe] = useState<any[]>(() => {
    const saved = localStorage.getItem('rd_jefe_attachedFiles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => ({
            ...item,
            file: item.file || (item.dataUrl ? dataUrlToFile(item.dataUrl, item.name || 'documento.pdf', item.type) : null)
          }));
        }
      } catch (e) {}
    }
    return [];
  });
  const [pendingTasksJefe, setPendingTasksJefe] = useState<any[]>([]);
  const [jefeReportSubmitted, setJefeReportSubmitted] = useState<boolean>(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return localStorage.getItem('rd_jefe_submitted_' + todayStr) === 'true';
  });
  const [submittingJefe, setSubmittingJefe] = useState(false);

  useEffect(() => {
    if (bossKey) {
      localStorage.setItem(bossActuacionesKey, JSON.stringify(actuacionesJefe));
    }
    localStorage.setItem('rd_jefe_actuaciones', JSON.stringify(actuacionesJefe));
  }, [actuacionesJefe, bossActuacionesKey, bossKey]);

  useEffect(() => {
    if (bossKey) {
      localStorage.setItem(bossIngresosKey, JSON.stringify(ingresosJefe));
    }
    localStorage.setItem('rd_jefe_ingresos', JSON.stringify(ingresosJefe));
  }, [ingresosJefe, bossIngresosKey, bossKey]);

  useEffect(() => {
    if (bossKey) {
      localStorage.setItem(bossProgramacionKey, JSON.stringify(programacionesJefe));
    }
    localStorage.setItem('rd_jefe_programacion', JSON.stringify(programacionesJefe));
  }, [programacionesJefe, bossProgramacionKey, bossKey]);

  useEffect(() => {
    const serialized = attachedFilesJefe.map(f => ({
      name: f.name || f.file?.name,
      type: f.type || f.file?.type,
      size: f.size || f.file?.size,
      url: f.url || '',
      dataUrl: f.url ? '' : (f.dataUrl || ''),
      note: f.note || '',
      uploaded_at: f.uploaded_at || new Date().toISOString()
    }));
    try {
      localStorage.setItem('rd_jefe_attachedFiles', JSON.stringify(serialized));
    } catch (e) {}
  }, [attachedFilesJefe]);

  // Sincronizar y cargar borrador del servidor para el Jefe (sin pisar datos locales guardados)
  useEffect(() => {
    const fetchDraft = async () => {
      try {
        const response = await api.get('/rd-intranet/v1/draft', {
          params: { user: currentBossName }
        });
        if (response.data && typeof response.data === 'object') {
          const parseJson = (val: any) => {
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') {
              try { return JSON.parse(val); } catch (e) { return []; }
            }
            return [];
          };
          const parsedActuaciones = parseJson(response.data.actuaciones);
          const parsedIngresos = parseJson(response.data.ingresos);
          const parsedProgramaciones = parseJson(response.data.programaciones);
          const parsedAttachedFiles = parseJson(response.data.attachedFiles || response.data.evidences);

          const mergeLists = <T extends { id?: string | number }>(localList: T[], serverList: T[]): T[] => {
            if (!localList || localList.length === 0) return serverList || [];
            if (!serverList || serverList.length === 0) return localList || [];
            const map = new Map<string | number, T>();
            serverList.forEach(item => { if (item && item.id != null) map.set(item.id, item); });
            localList.forEach(item => { if (item && item.id != null) map.set(item.id, item); });
            return Array.from(map.values());
          };

          setActuacionesJefe(prev => mergeLists(prev, parsedActuaciones));
          setIngresosJefe(prev => mergeLists(prev, parsedIngresos));
          setProgramacionesJefe(prev => mergeLists(prev, parsedProgramaciones));
          if (parsedAttachedFiles.length > 0) {
            setAttachedFilesJefe(prev => {
              if (prev.length > 0) return prev;
              return parsedAttachedFiles;
            });
          }
        }
      } catch (error) {
        console.error('Error fetching admin draft:', error);
      }
    };
    fetchDraft();
  }, []);

  // Guardar automáticamente en el local storage y nube (Auto-Draft) para el Jefe
  useEffect(() => {
    localStorage.setItem('rd_admin_draft_actuaciones', JSON.stringify(actuacionesJefe));
    localStorage.setItem('rd_admin_draft_ingresos', JSON.stringify(ingresosJefe));
    localStorage.setItem('rd_admin_draft_programaciones', JSON.stringify(programacionesJefe));

    const handler = setTimeout(async () => {
      try {
        if (actuacionesJefe.length === 0 && ingresosJefe.length === 0 && programacionesJefe.length === 0 && attachedFilesJefe.length === 0) return;
        const bossDraft = {
          user: currentBossName,
          user_name: currentBossName,
          actuaciones: actuacionesJefe,
          ingresos: ingresosJefe,
          programaciones: programacionesJefe,
          attachedFiles: attachedFilesJefe.map(f => ({
            name: f.name || f.file?.name,
            type: f.type || f.file?.type,
            size: f.size || f.file?.size,
            url: f.url || '',
            note: f.note || '',
            uploaded_at: f.uploaded_at || new Date().toISOString()
          }))
        };
        await submitToServer('/rd-intranet/v1/draft', bossDraft);
      } catch (e) {
        console.warn('Error saving boss draft to cloud:', e);
      }
    }, 800);
    return () => clearTimeout(handler);
  }, [actuacionesJefe, ingresosJefe, programacionesJefe, attachedFilesJefe, currentBossName]);

  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [dismissedNotifs] = useState<number[]>([]);
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const [systemAlert, setSystemAlert] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
    showCancel?: boolean;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  useEffect(() => {
    let retryTimer: any;
    const fetchBitacoras = async (isRetry = false) => {
      try {
        const response = await api.get('/rd-intranet/v1/bitacoras');
        if (response.data && Array.isArray(response.data)) {
          const parsedData = response.data.map((r: any) => {
            const parseJson = (val: any) => {
              if (Array.isArray(val)) return val;
              if (typeof val === 'string') {
                try { return JSON.parse(val); } catch (e) { return []; }
              }
              return [];
            };
            const acts = parseJson(r.actuaciones);
            const progs = parseJson(r.programaciones);
            
            // Opción 1: Cálculo dinámico del porcentaje de progreso según Estado de Actuaciones + Programaciones
            const totalActs = acts.length;
            const completedActs = acts.filter((a: any) => !a.estado || a.estado === 'Completada' || a.completado || a.completed).length;

            const totalProgs = progs.length;
            const completedProgs = progs.filter((p: any) => p.completado || p.completed || p.status === 'completado').length;

            const totalItems = totalActs + totalProgs;
            const totalCompleted = completedActs + completedProgs;

            let computedProgress = 0;
            if (totalItems > 0) {
              computedProgress = Math.round((totalCompleted / totalItems) * 100);
            } else if (r.status === 'Enviado' || r.status === 'Revisado') {
              computedProgress = 100;
            }

            const isJefatura = isJefaturaUser(r.user || r.author_name || r.usuario || r.post_title || '');
            const isLate = !isJefatura && (r.cierreRetrasado === true || r.cierre_retrasado === '1');

            let clockInVal = r.clockIn || r.hora_entrada || 'N/A';
            let clockOutVal = r.clockOut || r.hora_salida || 'Pendiente';

            if (isJefatura) {
              clockInVal = 'N/A (Jefatura)';
              if (!clockOutVal || clockOutVal === '00:00' || clockOutVal === 'Pendiente' || clockOutVal === 'N/A (Jefatura)') {
                clockOutVal = r.hora_salida && r.hora_salida !== '00:00' && r.hora_salida !== 'N/A (Jefatura)' ? r.hora_salida : 'Registrada';
              }
            }

            return {
              ...r,
              actuaciones: acts,
              ingresos: parseJson(r.ingresos),
              programaciones: progs,
              evidences: parseJson(r.evidences),
              respuestas_hilo: parseJson(r.respuestas_hilo),
              progress: computedProgress,
              cierreRetrasado: isLate,
              clockIn: clockInVal,
              clockOut: clockOutVal,
              isJefatura
            };
          });
          
          // Deduplicación inteligente: agrupar por usuario y fecha (conservando el más completo o con comentarios)
          const dedupedData = parsedData.filter((item, index, self) => {
            const key = ((item.user || item.author_name || item.usuario || '').toLowerCase().trim()) + '_' + item.date;
            return index === self.findIndex(t => (((t.user || t.author_name || t.usuario || '').toLowerCase().trim()) + '_' + t.date) === key);
          });
          
          // Ordenar siempre del más reciente al más viejo (DESC)
          dedupedData.sort((a: any, b: any) => {
            const dateA = a.date || a.fecha || '';
            const dateB = b.date || b.fecha || '';
            if (dateA !== dateB) return dateB.localeCompare(dateA);
            return (Number(b.id) || 0) - (Number(a.id) || 0);
          });

          if (dedupedData.length > 0) {
            setReports(dedupedData);
            try {
              localStorage.setItem('rd_cached_admin_reports', JSON.stringify(dedupedData));
            } catch (e) {}
          } else if (reports.length === 0) {
            setReports(dedupedData);
          }
          
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          const currentLoggedUser = (localStorage.getItem('rd_user_name') || '').toLowerCase().trim();
          const isReopenedToday = localStorage.getItem('rd_jefe_reopened_' + todayStr) === 'true';
          
          const todayReport = parsedData.find(r => {
            if (r.date !== todayStr) return false;
            const reportUser = (r.user || r.usuario || r.author_name || '').toLowerCase().trim();
            // NUNCA asignar reportes de empleados al despacho de jefatura
            if (reportUser.includes('carmen') || reportUser.includes('mariela') || reportUser.includes('hector') || reportUser.includes('oscar')) {
              return false;
            }
            if (currentLoggedUser.includes('luis')) {
              return reportUser.includes('luis') && !reportUser.includes('carmen');
            }
            if (currentLoggedUser.includes('victor')) {
              return reportUser.includes('victor');
            }
            return reportUser === currentLoggedUser;
          });

          if (todayReport && !isReopenedToday) {
            setJefeReportSubmitted(true);
            localStorage.setItem('rd_jefe_submitted_' + todayStr, 'true');
          } else if (!todayReport) {
            setJefeReportSubmitted(false);
            localStorage.removeItem('rd_jefe_submitted_' + todayStr);
          }

          if (todayReport) {
            if (todayReport.actuaciones && Array.isArray(todayReport.actuaciones) && todayReport.actuaciones.length > 0) {
              setActuacionesJefe(prev => (prev.length === 0 ? todayReport.actuaciones : prev));
            }
            if (todayReport.ingresos && Array.isArray(todayReport.ingresos) && todayReport.ingresos.length > 0) {
              setIngresosJefe(prev => (prev.length === 0 ? todayReport.ingresos : prev));
            }
            if (todayReport.programaciones && Array.isArray(todayReport.programaciones) && todayReport.programaciones.length > 0) {
              setProgramacionesJefe(prev => (prev.length === 0 ? todayReport.programaciones : prev));
            }
          }

          if (parsedData.length === 0 && !isRetry) {
            retryTimer = setTimeout(() => fetchBitacoras(true), 1500);
          }
        }

        // También obtener borradores (Adelantos) para la Agenda Global
        const draftsRes = await api.get('/rd-intranet/v1/all-drafts');
        if (draftsRes.data && Array.isArray(draftsRes.data)) {
          const parsedDrafts = draftsRes.data.map((d: any) => ({
            ...d,
            actuaciones: ensureArray(d.actuaciones),
            ingresos: ensureArray(d.ingresos),
            programaciones: ensureArray(d.programaciones)
          }));
          setAllDrafts(parsedDrafts);
        }

        // Obtener investigaciones globales para cruzar con las bitácoras
        const invesRes = await api.get('/rd-intranet/v1/investigaciones');
        if (invesRes.data && Array.isArray(invesRes.data)) {
          setAllInvestigaciones(invesRes.data);
        }

        // Obtener relaciones de gastos globales
        try {
          const gastosRes = await api.get('/rd-intranet/v1/gastos');
          if (gastosRes.data && Array.isArray(gastosRes.data)) {
            setAllGastos(gastosRes.data);
          }
        } catch (e) {}


      } catch (error) {
        console.error('Error fetching bitacoras', error);
        if (!isRetry) {
          retryTimer = setTimeout(() => fetchBitacoras(true), 1500);
        }
      } finally {
        api.get('/rd-intranet/v1/mensajes-jefatura').then(res => {
          const localList = getLocalEmployeeMessages();
          const serverList = Array.isArray(res.data) ? res.data : [];
          const merged = [...serverList];
          localList.forEach(localItem => {
            if (!merged.some(m => m.id === localItem.id || (m.mensaje === localItem.mensaje && m.fecha === localItem.fecha))) {
              merged.unshift(localItem);
            }
          });
          setEmployeeMessages(merged);
        }).catch(() => {
          setEmployeeMessages(getLocalEmployeeMessages());
        });
        setLoading(false);
      }
    };
    fetchBitacoras();
    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchBitacoras(true);
    }, 60000);
    return () => {
      clearInterval(intervalId);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  const handleSaveComment = async () => {
    try {
      const updatedReport = {
        ...selectedReport,
        actuaciones: adminActuaciones,
        ingresos: adminIngresos,
        programaciones: adminProgramaciones,
        comentario_admin: adminComment
      };
      let newPdfBase64 = '';
      try {
        const resPdf = await generateFallbackReportPdf(updatedReport, true);
        if (resPdf && typeof resPdf === 'string') {
          newPdfBase64 = resPdf;
        }
      } catch (e) {
        console.warn('No se pudo regenerar base64 PDF al aprobar:', e);
      }

      // Detectar cambios detallados realizados por el jefe para notificarlos puntualmente al empleado
      const cambios: string[] = [];
      
      // 1. Instrucciones y cambios en programación
      if (Array.isArray(adminProgramaciones)) {
        adminProgramaciones.forEach((prog: any, idx: number) => {
          const originalProg = Array.isArray(selectedReport?.programaciones) ? selectedReport.programaciones[idx] : null;
          if (prog.observaciones && String(prog.observaciones).trim() !== '') {
            cambios.push(`Instrucción en tarea (${prog.hora || 'Programada'} - ${prog.tipoActuacion || 'Actividad'}): "${prog.observaciones}"`);
          }
          if (originalProg && (originalProg.tipoActuacion !== prog.tipoActuacion || originalProg.hora !== prog.hora || originalProg.organismoTribunal !== prog.organismoTribunal)) {
            cambios.push(`Modificación en programación (${prog.hora || ''}): ${prog.tipoActuacion || ''} en ${prog.organismoTribunal || ''}`);
          }
        });
        if (Array.isArray(selectedReport?.programaciones) && adminProgramaciones.length > selectedReport.programaciones.length) {
          cambios.push(`Se asignaron ${adminProgramaciones.length - selectedReport.programaciones.length} nuevas tareas programadas.`);
        }
      }

      // 2. Cambios en actuaciones
      if (Array.isArray(adminActuaciones)) {
        adminActuaciones.forEach((act: any, idx: number) => {
          const origAct = Array.isArray(selectedReport?.actuaciones) ? selectedReport.actuaciones[idx] : null;
          if (origAct && (origAct.actuacion !== act.actuacion || origAct.observaciones !== act.observaciones || origAct.numeroExpediente !== act.numeroExpediente)) {
            cambios.push(`Corrección en actuación (${act.hora || ''} - Exp. ${act.numeroExpediente || 'N/A'}): ${act.actuacion || ''}`);
          }
        });
      }

      // 3. Comentario general de jefatura
      if (adminComment && adminComment.trim() !== '') {
        cambios.push(`Observación General de Jefatura: "${adminComment}"`);
      }

      const rawBoss = (localStorage.getItem('rd_user_name') || '').toLowerCase();
      const reviewerName = rawBoss.includes('victor') ? 'Víctor Román' : 'Luis Delgado';
      const formData = new FormData();
      if (selectedReport.isDraft) {
        formData.append('target_user_id', selectedReport.user_id);
      } else {
        formData.append('post_id', selectedReport.id);
      }
      formData.append('comentario_admin', adminComment);
      formData.append('supervisado_por', reviewerName);
      formData.append('programaciones', JSON.stringify(adminProgramaciones));
      formData.append('actuaciones', JSON.stringify(adminActuaciones));
      formData.append('ingresos', JSON.stringify(adminIngresos));
      formData.append('cambios_realizados', JSON.stringify(cambios));

      const urlPath = selectedReport.isDraft ? '/rd-intranet/v1/admin-update-draft' : '/rd-intranet/v1/admin-update';
      await submitToServer(urlPath, {
        id: selectedReport.id,
        post_id: selectedReport.id,
        target_user: selectedReport.user,
        target_user_id: selectedReport.user_id,
        user: selectedReport.user,
        user_name: selectedReport.user,
        estado: 'aprobado',
        status: 'aprobado',
        comentario_admin: adminComment,
        supervisado_por: reviewerName,
        programaciones: adminProgramaciones,
        actuaciones: adminActuaciones,
        ingresos: adminIngresos,
        cambios_realizados: cambios
      });

      if (!selectedReport.isDraft) {

        if (newPdfBase64) {
          try {
            await uploadPdfInChunks(selectedReport.id, newPdfBase64);
          } catch (e) {
            throw new Error('Error al subir el PDF (uploadPdfInChunks failed)');
          }
        }
      }
      setSystemAlert({
        isOpen: true,
        type: 'success',
        title: '¡Comentario y Cambios Guardados!',
        message: 'Las observaciones de Jefatura y modificaciones en la programación han sido registradas en el PDF oficial y se ha notificado al empleado.'
      });

      if (selectedReport.isDraft) {
        setAllDrafts(allDrafts.map(d => d.user_id === selectedReport.user_id ? { ...d, programaciones: adminProgramaciones, comentario_admin: adminComment, supervisado_por: reviewerName } : d));
      } else {
        setReports(reports.map(r => r.id === selectedReport.id ? { ...r, status: 'Revisado', unread: false, programaciones: adminProgramaciones, comentario_admin: adminComment, supervisado_por: reviewerName, pdfBase64: newPdfBase64 || r.pdfBase64 } : r));
      }
      setSelectedReport(null);
    } catch (error) {
      console.error('Error al guardar comentario', error);
      setSystemAlert({
        isOpen: true,
        type: 'error',
        title: 'Error de Red o Conexión',
        message: 'Fallo: ' + (error instanceof Error ? error.message : 'Error desconocido')
      });
    }
  };

  const updateProgramacionField = (index: number, field: string, value: string) => {
    const updated = [...adminProgramaciones];
    updated[index] = { ...updated[index], [field]: value };
    setAdminProgramaciones(updated);
  };

  const updateActuacionField = (index: number, field: string, value: string) => {
    const updated = [...adminActuaciones];
    updated[index] = { ...updated[index], [field]: value };
    setAdminActuaciones(updated);
  };

  const handleAddActuacion = () => {
    setAdminActuaciones([...adminActuaciones, {
      id: Math.random().toString(36).substring(7),
      hora: format(new Date(), 'HH:mm'),
      numeroAsunto: '',
      partes: '',
      actuacion: '',
      observaciones: ''
    }]);
  };

  const handleRemoveActuacion = (index: number) => {
    setAdminActuaciones(adminActuaciones.filter((_, i) => i !== index));
  };

  const updateIngresoField = (index: number, field: string, value: string) => {
    const updated = [...adminIngresos];
    updated[index] = { ...updated[index], [field]: value };
    setAdminIngresos(updated);
  };

  const handleAddIngreso = () => {
    setAdminIngresos([...adminIngresos, {
      id: Math.random().toString(36).substring(7),
      fechaIngreso: format(new Date(), 'yyyy-MM-dd'),
      horaIngreso: format(new Date(), 'HH:mm'),
      tipo: 'Judicial',
      numeroExpediente: '',
      organismoTribunal: '',
      partes: '',
      resumen: '',
      observaciones: ''
    }]);
  };

  const handleRemoveIngreso = (index: number) => {
    setAdminIngresos(adminIngresos.filter((_, i) => i !== index));
  };

  const handleAddProgramacion = () => {
    setAdminProgramaciones([...adminProgramaciones, {
      id: Math.random().toString(36).substring(7),
      fecha: format(new Date(), 'yyyy-MM-dd'),
      hora: '08:00',
      organismoTribunal: '',
      tipoActuacion: '',
      resumen: '',
      observaciones: ''
    }]);
  };

  const handleRemoveProgramacion = (index: number) => {
    setAdminProgramaciones(adminProgramaciones.filter((_, i) => i !== index));
  };

  const generateFallbackReportPdf = async (report: any, returnBase64 = false): Promise<string | void> => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', compress: true });

      let logoBase64: string | null = null;
      try {
        logoBase64 = await new Promise<string | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 120;
            let w = img.width || 120;
            let h = img.height || 120;
            if (w > maxDim || h > maxDim) {
              if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
              else { w = Math.round((w * maxDim) / h); h = maxDim; }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL('image/png', 0.8));
            } else { resolve(null); }
          };
          img.onerror = () => resolve(null);
          img.src = '/logo.png';
        });
      } catch (e) {
        console.warn('No se pudo cargar o redimensionar el logo para PDF', e);
      }

      if (logoBase64 && (doc as any).GState) {
        try {
          doc.setGState(new (doc as any).GState({ opacity: 0.07 }));
          doc.addImage(logoBase64, 'PNG', 98, 55, 100, 100, 'logo', 'FAST');
          doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
        } catch (e) { }
      }

      let finalY = 32;

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('Román & Delgado Abogados — Bitácora e Informe de Gestión Diario', 14, finalY);

      finalY += 10;
      autoTable(doc, {
        startY: finalY,
        head: [['EMPLEADO / ABOGADO', 'FECHA DE JORNADA', 'HORARIO REGISTRADO', 'ESTADO REVISIÓN']],
        body: [[
          report.user || 'Empleado',
          report.date || 'N/A',
          `${formatTime12h(report.clockIn)} — ${formatTime12h(report.clockOut)}`,
          report.status || 'Enviado'
        ]],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, cellPadding: 3.5 },
        bodyStyles: { fontSize: 9.5, textColor: [15, 23, 42], fontStyle: 'bold', cellPadding: 4 },
        margin: { left: 14, right: 14 }
      });
      finalY = (doc as any).lastAutoTable.finalY + 8;

      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      const cleanLocIn = report.ubicacionEntrada ? (report.ubicacionEntrada.includes('|||') ? report.ubicacionEntrada.split('|||')[1] : report.ubicacionEntrada) : 'N/A';
      doc.text(`Ubicación Entrada: ${String(cleanLocIn).substring(0, 60)}`, 14, finalY);
      const cleanLocOut = report.ubicacionSalida ? (report.ubicacionSalida.includes('|||') ? report.ubicacionSalida.split('|||')[1] : report.ubicacionSalida) : 'N/A';
      doc.text(`Ubicación Salida: ${String(cleanLocOut).substring(0, 60)}`, 145, finalY);
      finalY += 8;

      // Utility for parsing potentially stringified JSON arrays
      const parseJsonArray = (data: any) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (typeof data === 'string') {
          try {
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            return [];
          }
        }
        return [];
      };

      const parsedActuaciones = parseJsonArray(report.actuaciones);
      const parsedIngresos = parseJsonArray(report.ingresos);
      const parsedProgramaciones = parseJsonArray(report.programaciones);

      // 1. Libro de Actuaciones (Siempre mostrar)
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('1. LIBRO DE ACTUACIONES DIARIAS (REGISTRO DE TRÁMITES Y DILIGENCIAS)', 14, finalY + 5);

      let actData: any[][] = [];
      if (parsedActuaciones.length > 0) {
        actData = parsedActuaciones.map((a: any) => [a.hora || 'N/A', a.numeroAsunto || 'N/A', a.partes || 'N/A', a.actuacion || 'N/A', a.observaciones || '']);
      } else if (report.content && typeof report.content === 'string' && report.content.trim() !== '') {
        let cleanContent = report.content.replace(/<[^>]*>?/gm, '').trim();
        if (cleanContent.includes('PROGRAMACIÓN FUTURA:')) {
          cleanContent = cleanContent.split('PROGRAMACIÓN FUTURA:')[0].replace('REPORTE HOY:', '').trim();
        }
        if (cleanContent === '' || cleanContent.toLowerCase().includes('sin actuaciones hoy')) {
          actData = [['—', '—', '—', 'Sin actuaciones o trámites registrados en esta jornada', '—']];
        } else {
          actData = [['—', '—', '—', cleanContent || 'Sin detalle adicional', '—']];
        }
      } else {
        actData = [['—', '—', '—', 'Sin actuaciones o trámites registrados en esta jornada', '—']];
      }

      autoTable(doc, {
        startY: finalY + 8,
        head: [['HORA', 'N° ASUNTO', 'PARTES INVOLUCRADAS', 'ACTUACIÓN / DILIGENCIA', 'OBSERVACIONES']],
        body: actData,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5, cellPadding: 3, lineColor: [203, 213, 225], lineWidth: 0.2 },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 3 },
        alternateRowStyles: { fillColor: [252, 253, 254] },
        styles: { lineColor: [226, 232, 240], lineWidth: 0.15 },
        margin: { left: 14, right: 14 }
      });
      finalY = (doc as any).lastAutoTable.finalY + 12;

      // 2. Libro de Ingresos (Siempre mostrar)
      if (finalY > 155) { doc.addPage('landscape'); finalY = 32; }
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('2. LIBRO DE INGRESOS (CAUSAS Y ASUNTOS ASIGNADOS)', 14, finalY + 5);

      let ingData: any[][] = [];
      if (parsedIngresos.length > 0) {
        ingData = parsedIngresos.map((i: any) => [i.tipo || 'N/A', i.numeroExpediente || 'N/A', i.organismoTribunal || 'N/A', i.partes || 'N/A', i.resumen || 'N/A', i.observaciones || '']);
      } else {
        ingData = [['—', '—', '—', '—', 'Sin nuevos ingresos o causas registradas en esta jornada', '—']];
      }

      autoTable(doc, {
        startY: finalY + 8,
        head: [['TIPO ASUNTO', 'N° EXPEDIENTE', 'TRIBUNAL / ORGANISMO', 'PARTES', 'SÍNTESIS DEL ASUNTO', 'OBSERVACIONES']],
        body: ingData,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5, cellPadding: 3, lineColor: [203, 213, 225], lineWidth: 0.2 },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 3 },
        alternateRowStyles: { fillColor: [252, 253, 254] },
        styles: { lineColor: [226, 232, 240], lineWidth: 0.15 },
        margin: { left: 14, right: 14 }
      });
      finalY = (doc as any).lastAutoTable.finalY + 12;

      // 3. Libro de Programación (Siempre mostrar)
      if (finalY > 155) { doc.addPage('landscape'); finalY = 32; }
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('3. LIBRO DE PROGRAMACIÓN (AGENDA DE ACTUACIONES FUTURAS)', 14, finalY + 5);

      let progData: any[][] = [];
      if (parsedProgramaciones.length > 0) {
        progData = parsedProgramaciones.map((p: any) => [`${p.fecha || ''} ${p.hora || ''}`.trim() || 'N/A', p.organismoTribunal || 'N/A', p.tipoActuacion || 'N/A', p.resumen || '—', p.observaciones || '—']);
      } else {
        progData = [['—', '—', '—', 'Sin programación o agenda futura registrada en la jornada', '—']];
      }

      autoTable(doc, {
        startY: finalY + 8,
        head: [['FECHA Y HORA', 'TRIBUNAL / LUGAR', 'ACTUACIÓN A REALIZAR', 'SÍNTESIS', 'OBSERVACIONES / INSTRUCCIONES']],
        body: progData,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5, cellPadding: 3, lineColor: [203, 213, 225], lineWidth: 0.2 },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 3 },
        alternateRowStyles: { fillColor: [252, 253, 254] },
        styles: { lineColor: [226, 232, 240], lineWidth: 0.15 },
        margin: { left: 14, right: 14 }
      });

      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('SISTEMA INTEGRAL DE BITÁCORAS Y CONTROL DE GESTIÓN OFICIAL (KANT)', logoBase64 ? 42 : 14, 17.5);
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text('REPORTE OFICIAL DE JORNADA', 283, 11, { align: 'right' });
        doc.setDrawColor(226, 232, 240);
        doc.line(14, 196, 283, 196);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Román & Delgado Abogados — Documento Oficial Confidencial de Uso Interno (Plataforma KANT)', 14, 201);
        doc.text(`Página ${i} de ${totalPages}`, 283, 201, { align: 'right' });
      }

      if (returnBase64) {
        return doc.output('datauristring');
      }

      doc.save(`Bitacora_${report.user || 'Empleado'}_${report.date || ''}_OFICIAL.pdf`);
    } catch (err) {
      console.error('Error al regenerar PDF desde datos oficiales:', err);
      if (!returnBase64) {
        setSystemAlert({
          isOpen: true,
          type: 'error',
          title: 'Error de PDF',
          message: 'Hubo un error al reconstruir el PDF oficial. Intenta nuevamente o verifica la conexión.'
        });
      }
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  let filteredReports = reports.filter(r => ((r.user || r.author_name || r.usuario || '').toLowerCase().includes((searchTerm || '').toLowerCase())));

  if (statusFilter !== 'Todos') {
    filteredReports = filteredReports.filter(r => r.status === statusFilter);
  }

  if (datePreset !== 'Todos') {
    const today = new Date();
    if (datePreset === 'Hoy') {
      filteredReports = filteredReports.filter(r => r.date === format(today, 'yyyy-MM-dd'));
    } else if (datePreset === 'Ayer') {
      filteredReports = filteredReports.filter(r => r.date === format(subDays(today, 1), 'yyyy-MM-dd'));
    } else if (datePreset === 'Últimos 7 días') {
      const sevenDaysAgo = format(subDays(today, 7), 'yyyy-MM-dd');
      filteredReports = filteredReports.filter(r => r.date >= sevenDaysAgo);
    }
  }

  // Ordenar siempre del más reciente al más viejo (DESC)
  filteredReports.sort((a, b) => {
    const dateA = a.date || a.fecha || '';
    const dateB = b.date || b.fecha || '';
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / itemsPerPage));
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const paginatedReports = filteredReports.slice((validCurrentPage - 1) * itemsPerPage, validCurrentPage * itemsPerPage);

  const pendingReview = reports.filter(r => !r.isJefatura && r.status === 'Enviado').length;
  const inProgress = reports.filter(r => !r.isJefatura && r.status === 'En Curso').length;

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      await submitToServer('/rd-intranet/v1/reset-test-data', {});
      localStorage.clear();
      setShowResetModal(false);
      window.location.reload();
    } catch (error) {
      console.error('Error al intentar borrar datos', error);
      setIsResetting(false);
      setShowResetModal(false);
      setSystemAlert({
        isOpen: true,
        type: 'error',
        title: 'Error al Limpiar Datos',
        message: 'No se pudieron eliminar las bitácoras de prueba. Verifica los permisos de administrador en la consola o el servidor.'
      });
    }
  };

  // Combinar programaciones de bitácoras enviadas + adelantos (borradores)
  const draftTasks = allDrafts.flatMap(d => {
    const progs = ensureArray(d.programaciones);
    return progs.map((p: any) => ({
      ...p,
      user: d.user,
      isDraft: true,
      user_id: d.user_id,
      sourceReport: { isDraft: true, user_id: d.user_id, user: d.user, programaciones: progs, comentario_admin: d.comentario_admin }
    }));
  });

  const allScheduledTasks = reports
    .flatMap(r => {
      const progs = ensureArray(r.programaciones);
      return progs.map((p: any) => ({ ...p, user: r.user, sourceReport: r, isDraft: false }));
    })
    .concat(draftTasks)
    .filter(t => t.fecha >= format(new Date(), 'yyyy-MM-dd'))
    .sort((a, b) => {
      const dateA = new Date(`${a.fecha}T${a.hora || '00:00'}`);
      const dateB = new Date(`${b.fecha}T${b.hora || '00:00'}`);
      return dateA.getTime() - dateB.getTime();
    });

  const groupedTasks = allScheduledTasks.reduce((acc, task) => {
    if (!acc[task.fecha]) acc[task.fecha] = {};
    if (!acc[task.fecha][task.user]) acc[task.fecha][task.user] = {
      user: task.user,
      isDraft: task.isDraft,
      sourceReport: task.sourceReport,
      tasks: []
    };
    acc[task.fecha][task.user].tasks.push(task);
    return acc;
  }, {} as Record<string, Record<string, any>>);





  // Agrupar mensajes del buzón por Bitácora y Empleado (100% consistente y sin mensajes de prueba)
  const deletedMsgList: string[] = (() => {
    try { return JSON.parse(localStorage.getItem('rd_deleted_chat_messages') || '[]'); } catch(e) { return []; }
  })();

  const cleanEmployeeMessages = employeeMessages.filter(msg => {
    const txt = (msg.mensaje || '').trim();
    if (txt.includes('Tengo una duda con respecto a este punto') || txt === 'probando') return false;
    if (deletedMsgList.includes(msg.id) || deletedMsgList.includes(msg.mensaje)) return false;
    return true;
  });

  const groupedConversationsMap: Record<string, {
    key: string;
    fecha_bitacora: string;
    author: string;
    lastMessage: any;
    messages: any[];
    hasPending: boolean;
    allAtendido: boolean;
    totalCount: number;
    post_id?: any;
  }> = {};

  cleanEmployeeMessages.forEach(msg => {
    let dateKey = msg.fecha_bitacora || '';
    if (!dateKey && msg.fecha && msg.fecha.includes('2026-')) {
      const match = msg.fecha.match(/\d{4}-\d{2}-\d{2}/);
      if (match) dateKey = match[0];
    }
    if (!dateKey && msg.post_id) {
      const matchedRep = reports.find(r => String(r.id) === String(msg.post_id));
      if (matchedRep) dateKey = matchedRep.date;
    }
    if (!dateKey) {
      dateKey = format(new Date(), 'yyyy-MM-dd');
    }

    let employeeOwner = 'Carmen Luisa';
    const isBoss = checkIsFromBoss(msg.author, msg.author_role);

    if (!isBoss && (msg.author || '').trim() !== '') {
      employeeOwner = msg.author;
    } else if (msg.post_id) {
      const matchedRep = reports.find(r => String(r.id) === String(msg.post_id));
      if (matchedRep && matchedRep.user) employeeOwner = matchedRep.user;
    } else if (dateKey) {
      const matchedRep = reports.find(r => r.date === dateKey);
      if (matchedRep && matchedRep.user) employeeOwner = matchedRep.user;
    }

    const groupKey = `${employeeOwner.toLowerCase().trim()}_${dateKey}`;

    if (!groupedConversationsMap[groupKey]) {
      groupedConversationsMap[groupKey] = {
        key: groupKey,
        fecha_bitacora: dateKey,
        author: employeeOwner,
        lastMessage: msg,
        messages: [],
        hasPending: false,
        allAtendido: true,
        totalCount: 0,
        post_id: msg.post_id
      };
    }

    groupedConversationsMap[groupKey].messages.push(msg);
    groupedConversationsMap[groupKey].totalCount += 1;

    // Solo es pendiente si es un mensaje de un empleado que NO ha sido marcado como atendido ni leído
    if (!msg.atendido && !msg.leido_por_jefe && !isBoss) {
      groupedConversationsMap[groupKey].hasPending = true;
      groupedConversationsMap[groupKey].allAtendido = false;
    }

    groupedConversationsMap[groupKey].lastMessage = msg;
  });

  const allChatGroups = Object.values(groupedConversationsMap);
  const pendingChatGroups = allChatGroups.filter(g => g.hasPending);
  const attendedChatGroups = allChatGroups.filter(g => !g.hasPending);

  const unreadEmployeeReplies = pendingChatGroups;

  // 2. Notificaciones de Bitácoras por Revisar del Equipo
  const activeNotifications = reports.filter(r =>
    !r.isJefatura &&
    r.status === 'Enviado' &&
    !dismissedNotifs.includes(r.id)
  );

  const pendingGastosList = allGastos.filter(g => g.estatus === 'Pendiente');
  const pendingGastosCount = pendingGastosList.length;

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in duration-500 pb-24 sm:pb-16">
      <SystemAlertModal
        isOpen={systemAlert.isOpen}
        type={systemAlert.type}
        title={systemAlert.title}
        message={systemAlert.message}
        showCancel={systemAlert.showCancel}
        onConfirm={systemAlert.onConfirm}
        confirmText={systemAlert.confirmText}
        cancelText={systemAlert.cancelText}
        onClose={() => setSystemAlert({ ...systemAlert, isOpen: false, showCancel: false })}
      />

      {/* BARRA DE DIVISAS ($ / € BCV), CLIMA MULTICIUDAD Y RELOJ EN VIVO */}
      <LiveStatusBar />


      {/* Header Ejecutivo Compacto, Moderno y con Glow KANT */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 rounded-2xl p-4 sm:p-5 text-white shadow-xl border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden transition-all glow-amber-sm">
        {/* Línea de luz superior dorada neón */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
        {/* Luz ambiental difusa */}
        <div className="absolute -top-12 -right-12 w-64 h-24 bg-amber-500/10 blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/30 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                Centro de Mando <span className="text-amber-400 font-black text-glow-amber">KANT</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]">
                Jefatura
              </span>
            </div>
            <p className="text-xs text-slate-300/80 font-medium mt-0.5">Supervisión en tiempo real de bitácoras, agenda y asistencia del equipo.</p>
          </div>
        </div>

        {/* Badges de Estado y Notificaciones Compactas con Glow */}
        <div className="flex items-center gap-2.5 self-end md:self-center shrink-0 flex-wrap relative z-10">
          <div className="px-3 py-1.5 bg-emerald-950/40 border border-emerald-500/40 hover:border-emerald-400 rounded-xl flex items-center gap-2 text-xs shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-all">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-400 font-bold text-[11px]">Activos:</span>
            <span className="font-black text-white font-mono">{inProgress}</span>
          </div>

          <div className="px-3 py-1.5 bg-amber-950/40 border border-amber-500/40 hover:border-amber-400 rounded-xl flex items-center gap-2 text-xs shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="text-amber-300 font-bold text-[11px]">Por Revisar:</span>
            <span className="font-black text-amber-300 font-mono">{pendingReview}</span>
          </div>
        </div>
      </div>

      {/* Tabs Vistas con Segmented Control Moderno, Compacto y Glow */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/90 shadow-md scrollbar-none relative z-10 mx-auto w-full">
        {/* 1. MI BITÁCORA PERSONAL (JEFATURA) */}
        <button
          onClick={() => setActiveView('mis_libros')}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm transition-all duration-300 cursor-pointer active:scale-95 ${
            activeView === 'mis_libros' 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black shadow-[0_4px_20px_-2px_rgba(59,130,246,0.5)] ring-1 ring-blue-400 scale-[1.02]' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-blue-50/80 font-bold'
          }`}
        >
          <BookOpen className={`w-4 h-4 ${activeView === 'mis_libros' ? 'text-white' : 'text-blue-600'}`} /> Mi Bitácora Diaria
        </button>

        {/* 2. REVISIÓN DE BITÁCORAS DEL EQUIPO */}
        <button
          onClick={() => setActiveView('bitacoras')}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm transition-all duration-300 cursor-pointer active:scale-95 ${
            activeView === 'bitacoras' 
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black shadow-[0_4px_22px_-2px_rgba(245,158,11,0.55)] ring-1 ring-amber-300 scale-[1.02]' 
              : 'text-slate-500 hover:text-slate-900 hover:bg-amber-50/60 font-bold'
          }`}
        >
          <FileText className={`w-4 h-4 ${activeView === 'bitacoras' ? 'text-slate-950' : 'text-slate-400'}`} /> Revisión de Equipo
          {pendingReview > 0 && (
            <span className={`px-2 py-0.5 font-black rounded-full text-[10px] shadow-sm ml-1 ${activeView === 'bitacoras' ? 'bg-slate-950 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]' : 'bg-amber-500 text-slate-900'}`}>
              {pendingReview}
            </span>
          )}
        </button>

        {/* 3. CHAT EN VIVO */}
        <button
          onClick={() => {
            setActiveView('chat');
            setChatToast(null);
          }}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm transition-all duration-300 cursor-pointer active:scale-95 ${
            activeView === 'chat' 
              ? 'bg-gradient-to-r from-[#00a884] to-emerald-600 text-white font-black shadow-[0_4px_20px_-2px_rgba(0,168,132,0.5)] ring-1 ring-emerald-400 scale-[1.02]' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-emerald-50/80 font-bold'
          }`}
        >
          <div className="relative shrink-0 flex items-center justify-center">
            <MessageSquare className={`w-4 h-4 ${activeView === 'chat' ? 'text-white' : 'text-emerald-600'}`} />
            {unreadChatLive > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
            )}
          </div>
          <span>Chat en Vivo (WhatsApp)</span>
          {unreadChatLive > 0 && (
            <span className={`px-2 py-0.5 font-black rounded-full text-[11px] shadow-sm ml-1 animate-bounce ${activeView === 'chat' ? 'bg-slate-900 text-emerald-300' : 'bg-emerald-600 text-white'}`}>
              {unreadChatLive}
            </span>
          )}
        </button>

        {/* 4. EXPEDIENTES & CASOS */}
        <button
          onClick={() => setActiveView('expedientes')}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm transition-all duration-300 cursor-pointer active:scale-95 ${
            activeView === 'expedientes' 
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black shadow-[0_4px_22px_-2px_rgba(245,158,11,0.55)] ring-1 ring-amber-300 scale-[1.02]' 
              : 'text-slate-500 hover:text-slate-900 hover:bg-amber-50/60 font-bold'
          }`}
        >
          <Scale className={`w-4 h-4 ${activeView === 'expedientes' ? 'text-slate-950' : 'text-slate-400'}`} /> Expedientes & Casos
        </button>

        {/* 6. GASTOS & REEMBOLSOS */}
        <button
          onClick={() => setActiveView('gastos')}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm transition-all duration-300 cursor-pointer active:scale-95 ${
            activeView === 'gastos' 
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black shadow-[0_4px_22px_-2px_rgba(245,158,11,0.55)] ring-1 ring-amber-300 scale-[1.02]' 
              : 'text-slate-500 hover:text-slate-900 hover:bg-amber-50/60 font-bold'
          }`}
        >
          <Receipt className={`w-4 h-4 ${activeView === 'gastos' ? 'text-slate-950' : 'text-slate-400'}`} /> Gastos & Reembolsos
          {pendingGastosCount > 0 && (
            <span className={`px-2 py-0.5 font-black rounded-full text-[10px] shadow-[0_0_10px_rgba(239,68,68,0.5)] ml-1 ${activeView === 'gastos' ? 'bg-slate-900 text-rose-300' : 'bg-red-500 text-white animate-pulse'}`}>
              {pendingGastosCount}
            </span>
          )}
        </button>

        {/* ARCHIVO & BIBLIOTECA GENERAL DE EXPEDIENTES Y EVIDENCIAS */}
        <button
          onClick={() => setActiveView('biblioteca')}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm transition-all duration-300 cursor-pointer active:scale-95 ${
            activeView === 'biblioteca' 
              ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white font-black shadow-[0_4px_22px_-2px_rgba(99,102,241,0.55)] ring-1 ring-indigo-400 scale-[1.02]' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-indigo-50/60 font-bold'
          }`}
        >
          <FolderSearch className={`w-4 h-4 ${activeView === 'biblioteca' ? 'text-white' : 'text-indigo-600'}`} /> Archivo & Biblioteca
        </button>

        {/* 7. MI HISTORIAL DE JEFATURA */}
        <button
          onClick={() => setActiveView('historial')}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm transition-all duration-300 cursor-pointer active:scale-95 ${
            activeView === 'historial' 
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black shadow-[0_4px_22px_-2px_rgba(245,158,11,0.55)] ring-1 ring-amber-300 scale-[1.02]' 
              : 'text-slate-500 hover:text-slate-900 hover:bg-amber-50/60 font-bold'
          }`}
        >
          <History className={`w-4 h-4 ${activeView === 'historial' ? 'text-slate-950' : 'text-slate-400'}`} /> Mi Historial de Jefatura
        </button>
      </div>

      {/* Main Content Area */}
      {activeView === 'bitacoras' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200">

          {/* Controles y Búsqueda Compactos */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-50/70">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-2.5 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar bitácora por empleado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-medium text-slate-700 bg-white"
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <button
                  onClick={() => setShowDateFilter(!showDateFilter)}
                  className="w-full bg-white border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
                >
                  <CalendarIcon className="w-4 h-4 text-amber-500" /> {datePreset === 'Todos' ? 'Filtrar por Fecha' : datePreset}
                </button>

                {showDateFilter && (
                  <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-40 animate-in fade-in slide-in-from-top-1">
                    <div className="p-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fechas Rápidas</div>
                    {['Todos', 'Hoy', 'Ayer', 'Últimos 7 días'].map(preset => (
                      <button
                        key={preset}
                        onClick={() => { setDatePreset(preset); setShowDateFilter(false); }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors border-b border-slate-100 last:border-0 ${datePreset === preset ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative flex-1 md:flex-none">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="w-full bg-white border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
                >
                  <Filter className="w-4 h-4 text-blue-500" /> {statusFilter === 'Todos' ? 'Filtrar por Estado' : statusFilter}
                </button>

                {showFilters && (
                  <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-40 animate-in fade-in slide-in-from-top-1">
                    <div className="p-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</div>
                    {['Todos', 'En Curso', 'Enviado', 'Revisado'].map(status => (
                      <button
                        key={status}
                        onClick={() => { setStatusFilter(status); setShowFilters(false); }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors border-b border-slate-100 last:border-0 ${statusFilter === status ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowAttendanceModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer whitespace-nowrap"
                title="Generar reporte consolidado de horas de entrada y salida (PDF)"
              >
                <FileText className="w-4 h-4" /> Reporte Horas Asistencia (PDF)
              </button>
            </div>
          </div>

          {/* Vista Móvil (Tarjetas Responsivas para Teléfonos) */}
          <div className="md:hidden p-3.5 space-y-3">
            {loading ? (
              <div className="text-center p-12 bg-slate-50/50 rounded-2xl border border-slate-100">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-2" />
                <p className="text-slate-500 text-xs font-medium animate-pulse">Cargando bitácoras...</p>
              </div>
            ) : paginatedReports.length === 0 ? (
              <div className="text-center p-8 bg-slate-50/50 rounded-2xl border border-slate-100 text-slate-500 text-xs font-medium">
                No hay bitácoras para los filtros seleccionados.
              </div>
            ) : (
              paginatedReports.map((report) => (
                <div 
                  key={report.id}
                  className={`bg-white rounded-2xl p-4 border transition-all shadow-xs ${
                    report.unread ? 'border-amber-400/60 bg-amber-50/10' : 'border-slate-200'
                  }`}
                >
                  {/* Fila Superior: Empleado, Fecha y Estado */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-black text-xs uppercase border-2 border-white shadow-xs">
                          {String(report?.user || 'US').substring(0, 2)}
                        </div>
                        {report.unread && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white"></span>}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-slate-900 capitalize text-sm truncate">{report.user}</h4>
                        <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3 text-slate-400" /> {report.date}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                      report.status === 'En Curso' ? 'bg-blue-100 text-blue-700' :
                      report.status === 'Enviado' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {report.status === 'En Curso' && <Activity className="w-3 h-3" />}
                      {report.status === 'Enviado' && <AlertCircle className="w-3 h-3" />}
                      {report.status === 'Revisado' && <CheckCircle2 className="w-3 h-3" />}
                      {report.status}
                    </span>
                  </div>

                  {/* Horas de Jornada */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Entrada</span>
                      <span className="font-bold text-slate-700 flex items-center gap-1 mt-0.5 text-[11px]">
                        <Clock className="w-3 h-3 text-emerald-500" />
                        {isJefaturaUser(report.user) ? 'N/A (Jefatura)' : formatTime12h(report.clockIn)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Salida</span>
                      <span className="font-bold text-slate-700 flex items-center gap-1 mt-0.5 text-[11px]">
                        <Clock className="w-3 h-3 text-rose-500" />
                        {report.clockOut && report.clockOut !== '00:00' ? formatTime12h(report.clockOut) : 'Registrada'}
                      </span>
                    </div>
                  </div>

                  {/* Progreso */}
                  {report.progress !== undefined && (
                    <div className="mb-3">
                      <div className="flex justify-between items-center text-[10px] font-bold mb-1">
                        <span className="text-slate-400 uppercase tracking-wider">Progreso Tareas</span>
                        <span className="text-slate-700">{report.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full ${report.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                          style={{ width: `${report.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Botones de Acción Móviles */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReport(report);
                        setAdminComment(report.comentario_admin || '');
                        setAdminProgramaciones(ensureArray(report.programaciones));
                        setAdminActuaciones(ensureArray(report.actuaciones));
                        setAdminIngresos(ensureArray(report.ingresos));
                      }}
                      className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400" /> Inspeccionar
                    </button>
                    {report.pdfBase64 ? (
                      <a
                        href={report.pdfBase64.startsWith('data:') || report.pdfBase64.startsWith('http') ? report.pdfBase64 : `data:application/pdf;base64,${report.pdfBase64}`}
                        download={`Bitacora_${report.user}_${report.date}.pdf`}
                        className="py-2 px-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-black transition-colors border border-emerald-300 shadow-xs flex items-center justify-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => generateFallbackReportPdf(report)}
                        className="py-2 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-black transition-colors border border-amber-300 shadow-xs flex items-center justify-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> PDF
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Tabla de Registros (Vista Escritorio / Tablets) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="p-6">Empleado / Fecha</th>
                  <th className="p-6">Jornada</th>
                  <th className="p-6 w-48">Progreso</th>
                  <th className="p-6">Estado</th>
                  <th className="p-6">PDF Oficial</th>
                  <th className="p-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center p-16">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                        <p className="text-slate-500 font-medium animate-pulse">Conectando con la base de datos central...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedReports.map((report) => (
                  <tr key={report.id} className={`hover:bg-slate-50/80 transition-colors group ${report.unread ? 'bg-amber-50/10' : ''}`}>
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold uppercase tracking-wider text-sm border-2 border-white shadow-sm">
                            {String(report?.user || 'Usuario').substring(0, 2)}
                          </div>
                          {report.unread && <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white"></span>}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 capitalize text-lg">{report.user}</p>
                          <p className="text-sm text-slate-500 font-medium flex items-center gap-1">
                            <CalendarIcon className="w-3.5 h-3.5" /> {report.date}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      {isJefaturaUser(report.user) ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                            Entrada: N/A (Jefatura)
                          </div>
                          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                            <Clock className="w-4 h-4 text-rose-500" />
                            Salida: {report.clockOut && report.clockOut !== '00:00' && report.clockOut !== 'N/A (Jefatura)' ? formatTime12h(report.clockOut) : 'Registrada'}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Clock className="w-4 h-4 text-emerald-500" /> Entrada: {formatTime12h(report.clockIn)}
                          </div>
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                            <Clock className="w-4 h-4 text-rose-400" />
                            Salida: {report.clockOut ? formatTime12h(report.clockOut) : 'Pendiente'}
                            {report.cierreRetrasado && (
                              <span className="ml-1 text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full uppercase tracking-widest font-black">
                                Cerrada con Retraso
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="p-6">
                      {report.progress !== undefined ? (
                        <div className="w-full">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tareas Hoy</span>
                            <span className="text-[11px] font-bold text-slate-700">{report.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                            <div
                              className={`h-2 rounded-full transition-all duration-1000 ${report.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500 relative overflow-hidden'
                                }`}
                              style={{ width: `${report.progress}%` }}
                            >
                              {report.progress < 100 && (
                                <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite] -translate-x-full" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }}></div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 font-medium">No medido</span>
                      )}
                    </td>
                    <td className="p-6">
                      <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide
                      ${report.status === 'En Curso' ? 'bg-blue-100 text-blue-700' : ''}
                      ${report.status === 'Enviado' ? 'bg-amber-100 text-amber-700' : ''}
                      ${report.status === 'Revisado' ? 'bg-emerald-100 text-emerald-700' : ''}
                    `}>
                        {report.status === 'En Curso' && <Activity className="w-3.5 h-3.5" />}
                        {report.status === 'Enviado' && <AlertCircle className="w-3.5 h-3.5" />}
                        {report.status === 'Revisado' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {report.status}
                      </span>
                    </td>
                    <td className="p-6">
                      {report.pdfBase64 ? (
                        <a
                          href={report.pdfBase64.startsWith('data:') || report.pdfBase64.startsWith('http') ? report.pdfBase64 : `data:application/pdf;base64,${report.pdfBase64}`}
                          download={`Bitacora_${report.user}_${report.date}.pdf`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold transition-colors border border-emerald-300 shadow-sm"
                          title="Haz clic para descargar el PDF completo"
                        >
                          <Download className="w-4 h-4" /> PDF
                        </a>
                      ) : (
                        <button
                          onClick={() => generateFallbackReportPdf(report)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-extrabold transition-colors border border-amber-300 shadow-sm"
                          title="Generar y descargar documento oficial PDF al instante con los datos registrados del empleado"
                        >
                          <FileText className="w-3.5 h-3.5" /> Generar PDF
                        </button>
                      )}
                    </td>
                    <td className="p-6 text-right">
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setAdminComment(report.comentario_admin || '');
                          setAdminProgramaciones(ensureArray(report.programaciones));
                          setAdminActuaciones(ensureArray(report.actuaciones));
                          setAdminIngresos(ensureArray(report.ingresos));
                        }}
                        className="inline-flex items-center gap-2 bg-white border-2 border-slate-200 hover:border-slate-800 hover:bg-slate-800 hover:text-white text-slate-700 font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm group-hover:shadow-md"
                      >
                        <FileText className="w-4 h-4" /> Inspeccionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Footer de Paginación Inteligente */}
          <div className="p-4 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row justify-between items-center gap-3 rounded-b-3xl text-xs text-slate-500 font-medium px-6">
            <div className="flex items-center gap-3 flex-wrap">
              <span>
                Mostrando <strong className="text-slate-800">{filteredReports.length === 0 ? 0 : (validCurrentPage - 1) * itemsPerPage + 1}</strong> - <strong className="text-slate-800">{Math.min(validCurrentPage * itemsPerPage, filteredReports.length)}</strong> de <strong className="text-slate-800">{filteredReports.length}</strong> bitácoras
              </span>

              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                <span className="text-[11px] text-slate-400 font-bold">Por página:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-2xs"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={validCurrentPage === 1}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
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
                        ? 'bg-amber-500 text-slate-950 shadow-2xs font-black'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={validCurrentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                >
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA: BUZÓN & CONVERSACIONES DE JEFATURA */}
      {activeView === 'buzon' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
                <MessageSquare className="w-6 h-6 text-emerald-600" />
                Buzón & Conversaciones del Equipo
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Canal oficial en vivo para resolver dudas, revisar aclaratorias y responder a los empleados por Bitácora.
              </p>
            </div>

            {/* Subfiltros de estado */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 self-stretch sm:self-auto">
              <button
                type="button"
                onClick={() => setRepliesFilter('pendientes')}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  repliesFilter === 'pendientes' ? 'bg-amber-500 text-slate-950 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pendientes ({pendingChatGroups.length})
              </button>
              <button
                type="button"
                onClick={() => setRepliesFilter('atendidos')}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  repliesFilter === 'atendidos' ? 'bg-teal-700 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Atendidos ({attendedChatGroups.length})
              </button>
              <button
                type="button"
                onClick={() => setRepliesFilter('todos')}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  repliesFilter === 'todos' ? 'bg-slate-900 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({allChatGroups.length})
              </button>
            </div>
          </div>

          {/* Lista de Conversaciones Agrupadas por Bitácora y Empleado */}
          {(() => {
            const filteredGroups = repliesFilter === 'pendientes'
              ? pendingChatGroups
              : repliesFilter === 'atendidos'
                ? attendedChatGroups
                : allChatGroups;

            if (filteredGroups.length === 0) {
              return (
                <div className="py-16 text-center text-slate-400 space-y-3 bg-slate-50/60 rounded-3xl border border-slate-200/60">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mx-auto text-slate-400 shadow-xs border border-slate-200">
                    <MessageSquare className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">
                    {repliesFilter === 'pendientes' 
                      ? '¡Todo al día! No tienes conversaciones ni dudas pendientes de tus empleados.'
                      : 'No hay conversaciones en este registro.'}
                  </p>
                  <p className="text-xs text-slate-400">
                    Cuando un empleado envíe mensajes o dudas sobre una bitácora, aparecerán agrupadas aquí.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 gap-4">
                {filteredGroups.map((group) => {
                  const isUnread = group.hasPending;
                  return (
                    <div
                      key={group.key}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group ${
                        isUnread
                          ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm uppercase shrink-0 shadow-sm border border-slate-800">
                          {String(group.author || 'EM').substring(0, 2)}
                        </div>
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-sm capitalize">{group.author}</span>
                            <span className="text-[11px] text-slate-600 font-bold bg-slate-100 px-2.5 py-0.5 rounded-lg flex items-center gap-1 border border-slate-200">
                              <CalendarIcon className="w-3 h-3 text-amber-500" /> Bitácora {group.fecha_bitacora}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                              {group.totalCount} {group.totalCount === 1 ? 'mensaje' : 'mensajes'}
                            </span>
                            {group.hasPending ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                                Pendiente
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-teal-600" /> Atendido
                              </span>
                            )}
                          </div>
                          
                          {/* Último mensaje del hilo */}
                          <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200/80 text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                              Último mensaje recibido:
                            </span>
                            "{group.lastMessage?.mensaje || 'Sin texto'}"
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción del hilo */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap sm:flex-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenChatForReply(group.lastMessage, group.messages)}
                          className="px-4 py-2 bg-[#075E54] hover:bg-[#128C7E] text-white font-black text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                          title="Abrir conversación tipo WhatsApp con este empleado"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Abrir Chat ({group.totalCount})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenReportForReply(group.lastMessage)}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                          title="Inspeccionar la bitácora oficial de este día"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-400" />
                          <span>Ver Bitácora</span>
                        </button>

                        {group.hasPending ? (
                          <button
                            type="button"
                            onClick={() => {
                              // Marcar todos los mensajes del grupo como atendidos
                              group.messages.forEach(m => markEmployeeReplyRead(m.id));
                            }}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Marcar todos los mensajes de esta bitácora como atendidos"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Atendido</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                const att = JSON.parse(localStorage.getItem('rd_jefe_attended_replies') || '[]');
                                const groupIds = group.messages.map(m => String(m.id));
                                const updated = att.filter((id: string) => !groupIds.includes(String(id)));
                                localStorage.setItem('rd_jefe_attended_replies', JSON.stringify(updated));
                              } catch (e) {}
                              setEmployeeMessages(prev => prev.map(m => group.messages.some(gm => String(gm.id) === String(m.id)) ? { ...m, atendido: false, leido_por_jefe: false } : m));
                            }}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
                            title="Reabrir conversación para marcarla como pendiente"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* VISTA: CHAT EN VIVO WHATSAPP (MULTI-EMPLEADO CON DOBLE CHECK AZUL) */}
      {activeView === 'chat' && (
        <div className="animate-in fade-in duration-200">
          <LiveChatModule 
            isJefatura={true}
            currentUser={localStorage.getItem('rd_user_name') || 'Luis Delgado'}
            onUnreadCountChange={setUnreadChatLive}
          />
        </div>
      )}

      {/* VISTA: AGENDA GLOBAL */}
      {activeView === 'agenda' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 lg:p-10">
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3"><CalendarIcon className="w-7 h-7 text-amber-500" /> Planificación del Equipo</h3>
              <p className="text-slate-500 font-medium">Línea de tiempo de todas las tareas futuras programadas.</p>
            </div>
          </div>

          <div className="space-y-10">
            {loading ? (
              <div className="text-center p-12 text-slate-500 font-medium bg-slate-50 rounded-2xl border border-slate-100 animate-pulse flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-amber-500 animate-spin"></div>
                Sincronizando agenda con la base de datos central...
              </div>
            ) : Object.keys(groupedTasks).length === 0 ? (
              <div className="text-center p-12 text-slate-500 italic font-medium bg-slate-50 rounded-2xl border border-slate-100">
                No hay actividades futuras programadas por los empleados.
              </div>
            ) : Object.keys(groupedTasks).sort().map(dateStr => {
              const dateObj = new Date(`${dateStr}T12:00:00`);
              let dateLabel = format(dateObj, 'EEEE, d \'de\' MMMM', { locale: es });
              if (dateStr === format(new Date(), 'yyyy-MM-dd')) dateLabel = 'HOY - ' + dateLabel;

              return (
                <div key={dateStr} className="relative">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="px-4 py-2 bg-slate-900 text-amber-400 font-bold uppercase tracking-widest text-sm rounded-xl shadow-md border border-slate-800">
                      {dateLabel}
                    </div>
                    <div className="h-px bg-slate-200 flex-1"></div>
                  </div>

                  <div className="flex flex-col gap-4 pl-2 lg:pl-6 border-l-2 border-amber-200">
                    {Object.values(groupedTasks[dateStr]).map((userGroup: any, i: number) => (
                      <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-amber-400 transition-colors p-4 md:p-5 relative overflow-hidden group">

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 pb-4 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-sm uppercase border border-slate-200 shrink-0">
                              {String(userGroup?.user || 'Usuario').substring(0, 2)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 capitalize block">{userGroup.user}</span>
                              <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border inline-block mt-1 ${userGroup.isDraft ? 'bg-amber-50 text-amber-600 border-amber-200' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                                {userGroup.isDraft ? 'AVANCE / BORRADOR' : 'BITÁCORA CONFIRMADA'}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedReport(userGroup.sourceReport);
                              setAdminComment(userGroup.sourceReport.comentario_admin || '');
                              setAdminProgramaciones(ensureArray(userGroup.sourceReport.programaciones));
                              setAdminActuaciones(ensureArray(userGroup.sourceReport.actuaciones));
                              setAdminIngresos(ensureArray(userGroup.sourceReport.ingresos));
                            }}
                            className="w-full sm:w-auto px-5 py-2.5 bg-slate-50 hover:bg-slate-900 text-slate-600 hover:text-amber-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors border border-slate-200 hover:border-slate-800 whitespace-nowrap"
                          >
                            {userGroup.isDraft ? 'Editar Avance' : 'Editar Tareas'}
                          </button>
                        </div>

                        <div className="flex flex-col">
                          {(expandedUsers[`${dateStr}-${userGroup.user}`] ? userGroup.tasks : userGroup.tasks.slice(0, 3)).map((task: any, tIdx: number) => (
                            <div key={tIdx} className="flex gap-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors px-2 group/task">
                              <div className="w-12 shrink-0 pt-0.5">
                                <span className="text-slate-700 font-bold text-[13px] tracking-tight">{task.hora}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 text-[13px] leading-tight">{task.tipoActuacion}</p>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mt-1">
                                  <MapPin className="w-3 h-3 text-blue-500" />
                                  <span className="truncate">{task.organismoTribunal}</span>
                                </div>
                                {task.observaciones && task.observaciones.trim().toUpperCase() !== 'SIN OBSERVACIONES' && (
                                  <div className="mt-2 text-[11px] font-medium text-slate-600 bg-amber-50/50 px-2.5 py-1.5 rounded-lg border border-amber-100/50 inline-flex items-start gap-1.5 w-full md:w-auto">
                                    <span className="font-bold text-amber-700 uppercase tracking-wider shrink-0 text-[9px] pt-0.5">Nota:</span>
                                    <span className="line-clamp-2 md:line-clamp-none">{task.observaciones}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          {userGroup.tasks.length > 3 && (
                            <button
                              onClick={() => setExpandedUsers(prev => ({ ...prev, [`${dateStr}-${userGroup.user}`]: !prev[`${dateStr}-${userGroup.user}`] }))}
                              className="w-full mt-3 py-3 flex items-center justify-center gap-2 bg-gradient-to-b from-slate-50/30 to-slate-100 hover:to-blue-50 text-slate-500 hover:text-blue-600 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all border border-slate-100 hover:border-blue-200 group"
                            >
                              {expandedUsers[`${dateStr}-${userGroup.user}`] ? (
                                <>Ocultar Tareas <ChevronUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" /></>
                              ) : (
                                <>Ver {userGroup.tasks.length - 3} Tareas Más <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" /></>
                              )}
                            </button>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA: MIS LIBROS (JEFATURA SIN HORARIO / SIN GPS) */}
      {activeView === 'mis_libros' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-md border border-blue-500/20 mb-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span className="text-xs font-bold tracking-widest text-blue-600 uppercase">Régimen Especial Jefatura</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <BookOpen className="w-7 h-7 text-blue-600" /> Mis Libros y Registros de Gestión
              </h3>
              <p className="text-slate-500 font-medium mt-1">
                Organiza tus actuaciones, casos recibidos y agenda ejecutiva. Sin marcaje de entrada, salida o GPS.
              </p>
            </div>

            {/* Sub-Tabs de Libros de Jefe */}
            <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button
                onClick={() => setBossSubTab('actuaciones')}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${bossSubTab === 'actuaciones' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Activity className="w-4 h-4" /> Actuaciones Diarias
              </button>
              <button
                onClick={() => setBossSubTab('ingresos')}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${bossSubTab === 'ingresos' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <FileText className="w-4 h-4" /> Libro de Ingresos
              </button>
              <button
                onClick={() => setBossSubTab('programacion')}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${bossSubTab === 'programacion' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <CalendarIcon className="w-4 h-4" /> Programación
              </button>
              <button
                onClick={() => setBossSubTab('cierre')}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${bossSubTab === 'cierre' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-600 hover:bg-blue-50 font-extrabold'}`}
              >
                <Send className="w-4 h-4" /> Generar Bitácora PDF
              </button>
            </div>
          </div>

          {jefeReportSubmitted && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-3xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in duration-500">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-extrabold uppercase tracking-wider rounded-full">
                    Bitácora de Hoy Concluida
                  </span>
                  <h4 className="text-xl font-bold text-slate-800 mt-1">Tu jornada de hoy ya fue enviada oficialmente</h4>
                  <p className="text-slate-500 text-sm font-medium">
                    Los registros están bloqueados para evitar duplicados o sobrescrituras. Si necesitas agregar o modificar gestiones de hoy, pulsa Reabrir Jornada.
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  const todayStr = format(new Date(), 'yyyy-MM-dd');
                  const currentLoggedUser = (localStorage.getItem('rd_user_name') || '').toLowerCase().trim();
                  
                  const todayReport = reports.find(r => {
                    if (r.date !== todayStr) return false;
                    const rUser = (r.user || r.usuario || r.author_name || '').toLowerCase().trim();
                    if (rUser.includes('carmen') || rUser.includes('mariela') || rUser.includes('hector') || rUser.includes('oscar')) {
                      return false;
                    }
                    if (currentLoggedUser.includes('luis')) {
                      return rUser.includes('luis') && !rUser.includes('carmen');
                    }
                    if (currentLoggedUser.includes('victor')) {
                      return rUser.includes('victor');
                    }
                    return rUser === currentLoggedUser;
                  });

                  if (todayReport) {
                    if (todayReport.actuaciones && Array.isArray(todayReport.actuaciones) && todayReport.actuaciones.length > 0) {
                      setActuacionesJefe(todayReport.actuaciones);
                    }
                    if (todayReport.ingresos && Array.isArray(todayReport.ingresos) && todayReport.ingresos.length > 0) {
                      setIngresosJefe(todayReport.ingresos);
                    }
                    if (todayReport.programaciones && Array.isArray(todayReport.programaciones) && todayReport.programaciones.length > 0) {
                      setProgramacionesJefe(todayReport.programaciones);
                    }
                  }

                  setJefeReportSubmitted(false);
                  localStorage.removeItem('rd_jefe_submitted_' + todayStr);
                  localStorage.setItem('rd_jefe_reopened_' + todayStr, 'true');
                  setSystemAlert({
                    isOpen: true,
                    type: 'success',
                    title: 'Jornada Reabierta',
                    message: 'Tu jornada de hoy ha sido reabierta. Se han restaurado tus registros anteriores para que puedas continuar modificándolos.'
                  });
                }}
                className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm rounded-xl border border-slate-300 shadow-sm hover:shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-amber-500" />
                <span>Reabrir Jornada de Hoy</span>
              </button>
            </div>
          )}

          {bossSubTab === 'actuaciones' && (
            <TabRegistroDiario
              reportSubmitted={jefeReportSubmitted}
              actuaciones={actuacionesJefe}
              setActuaciones={setActuacionesJefe}
              attachedFiles={attachedFilesJefe}
              setAttachedFiles={setAttachedFilesJefe}
              pendingTasks={pendingTasksJefe}
              setPendingTasks={setPendingTasksJefe}
              globalExpedientes={globalExpedientes}
              ingresosActivos={ingresosJefe}
            />
          )}

          {bossSubTab === 'ingresos' && (
            <TabLibroIngresos
              ingresos={ingresosJefe}
              setIngresos={setIngresosJefe}
              reportSubmitted={jefeReportSubmitted}
            />
          )}

          {bossSubTab === 'programacion' && (
            <TabAgenda
              programaciones={programacionesJefe}
              setProgramaciones={setProgramacionesJefe}
              reportSubmitted={jefeReportSubmitted}
              isAdmin={true}
            />
          )}

          {bossSubTab === 'cierre' && (
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 text-center space-y-6 max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Send className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-2xl font-bold text-slate-800 mb-2">Cierre de Gestión y Generación Oficial</h4>
                <p className="text-slate-500 font-medium">
                  Al generar tu bitácora, se compilarán tus Actuaciones ({actuacionesJefe.length}), Ingresos ({ingresosJefe.length}) y Programación ({programacionesJefe.length}) en un PDF oficial membretado bajo modalidad ejecutiva sin horarios ni ubicación.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                <button
                  onClick={async () => {
                    if (actuacionesJefe.length === 0 && ingresosJefe.length === 0 && programacionesJefe.length === 0) {
                      setSystemAlert({
                        isOpen: true,
                        type: 'warning',
                        title: 'Registros Vacíos',
                        message: 'Debes registrar al menos una actuación, un ingreso o una programación para generar la bitácora de jefatura.'
                      });
                      return;
                    }

                    // 1. Validar Filas en Libro de Actuaciones (Jefatura)
                    const invalidActuacionIndex = actuacionesJefe.findIndex(a => {
                      const noAsunto = !a.numeroAsunto || a.numeroAsunto.trim() === '' || a.numeroAsunto.endsWith('-');
                      const noDesc = !a.actuacion || a.actuacion.trim() === '';
                      return noAsunto || noDesc;
                    });

                    if (invalidActuacionIndex !== -1) {
                      setBossSubTab('actuaciones');
                      setSystemAlert({
                        isOpen: true,
                        type: 'error',
                        title: 'Fila de Actuación Incompleta',
                        message: `La fila #${invalidActuacionIndex + 1} en tu Libro de Actuaciones está abierta e incompleta. Debes rellenar obligatoriamente el N° de Asunto y la descripción de la Actuación, o eliminar la fila con el botón de papelera.`
                      });
                      return;
                    }

                    // 2. Validar Filas en Libro de Ingresos (Jefatura)
                    const invalidIngresoIndex = ingresosJefe.findIndex(i => {
                      const noExp = !i.numeroExpediente || i.numeroExpediente.trim() === '' || i.numeroExpediente.endsWith('-');
                      const noPartes = !i.partes || i.partes.trim() === '';
                      return noExp || noPartes;
                    });

                    if (invalidIngresoIndex !== -1) {
                      setBossSubTab('ingresos');
                      setSystemAlert({
                        isOpen: true,
                        type: 'error',
                        title: 'Fila de Ingreso Incompleta',
                        message: `La fila #${invalidIngresoIndex + 1} en tu Libro de Ingresos está abierta e incompleta. Debes colocar el N° de Expediente completo y las Partes involucradas, o eliminar la fila con el botón de papelera.`
                      });
                      return;
                    }

                    // 3. Validar Filas en Libro de Programación (Jefatura)
                    const invalidProgIndex = programacionesJefe.findIndex(p => {
                      const noOrg = !p.organismoTribunal || p.organismoTribunal.trim() === '';
                      const noTipo = !p.tipoActuacion || p.tipoActuacion.trim() === '';
                      return noOrg || noTipo;
                    });

                    if (invalidProgIndex !== -1) {
                      setBossSubTab('programacion');
                      setSystemAlert({
                        isOpen: true,
                        type: 'error',
                        title: 'Fila de Programación Incompleta',
                        message: `La fila #${invalidProgIndex + 1} en tu Libro de Programación está abierta e incompleta. Debes indicar obligatoriamente el Organismo / Tribunal y el Tipo de Actuación, o eliminar la fila con el botón de papelera.`
                      });
                      return;
                    }

                    try {
                      const [expRes, resRes] = await Promise.all([
                        api.get('/rd-intranet/v1/expedientes'),
                        api.get('/rd-intranet/v1/reserved-expedientes').catch(() => ({ data: [] }))
                      ]);
                      const globals = expRes.data || [];
                      const reserved = resRes.data || [];
                      const allGlobals = [...globals, ...reserved];

                      const jefeName = localStorage.getItem('rd_user_name') || 'victor';
                      const hasDuplicateIngreso = ingresosJefe.some(ingreso => {
                        if (ingreso.tipo !== 'Judicial') return false;
                        const isLocalDuplicate = ingresosJefe.filter(i => i.numeroExpediente === ingreso.numeroExpediente && i.id !== ingreso.id).length > 0;
                        const isGlobalDuplicate = allGlobals.some((g: any) => {
                          if (g.numeroExpediente !== ingreso.numeroExpediente) return false;
                          const owner = (g.usuario || g.user || '').toLowerCase().trim();
                          const me = jefeName.toLowerCase().trim();
                          if (owner && me && (owner === me || owner.includes(me) || me.includes(owner))) {
                            return false;
                          }
                          return true;
                        });
                        return isLocalDuplicate || isGlobalDuplicate;
                      });

                      if (hasDuplicateIngreso) {
                        setBossSubTab('ingresos');
                        setSystemAlert({ isOpen: true, type: 'error', title: 'Expediente Duplicado', message: 'Hay ingresos judiciales con números de expediente que ya han sido asignados por otro usuario o están repetidos. El sistema te impide usar este número para evitar conflictos. Por favor corrígelo.' });
                        return;
                      }
                    } catch (e) {
                      console.error('Error comprobando duplicados:', e);
                    }

                    setSubmittingJefe(true);

                    // Permitir que React renderice el estado de carga antes de bloquear el hilo principal con jsPDF
                    await new Promise(resolve => setTimeout(resolve, 150));

                    try {
                      const doc = new jsPDF({ format: 'a4', unit: 'mm' });
                      let finalY = 36;

                      doc.setDrawColor(203, 213, 225);
                      doc.setLineWidth(0.4);
                      doc.line(14, 24, 283, 24);

                      doc.setFont('helvetica', 'bold');
                      doc.setFontSize(15);
                      doc.setTextColor(15, 23, 42);
                      doc.text('BITÁCORA DE GESTIÓN Y LIBROS - JEFATURA', 14, 15);
                      doc.setFontSize(8.5);
                      doc.setFont('helvetica', 'normal');
                      doc.setTextColor(100, 116, 139);
                      doc.text('ROMÁN & DELGADO ABOGADOS / ADMINISTRACIÓN OFICIAL', 14, 21);

                      doc.setFillColor(252, 253, 254);
                      doc.setDrawColor(226, 232, 240);
                      doc.roundedRect(14, 33, 182, 22, 3, 3, 'FD');

                      doc.setFontSize(10);
                      doc.setTextColor(15, 23, 42);
                      doc.setFont('helvetica', 'bold');
                      const jefeName = localStorage.getItem('rd_user_name') || 'Jefe Administrador';
                      doc.text(`TITULAR / JEFATURA: ${jefeName.toUpperCase()}`, 19, 41);
                      doc.text(`FECHA DE GESTIÓN: ${format(new Date(), 'dd/MM/yyyy')}`, 115, 41);

                      doc.setFontSize(8.5);
                      doc.setTextColor(100, 116, 139);
                      doc.text('MODALIDAD: RÉGIMEN ADMINISTRATIVO EJECUTIVO (SIN MARCADO DE HORARIOS NI GPS)', 19, 49);

                      finalY = 63;

                      if (actuacionesJefe.length > 0) {
                        doc.setFontSize(10.5);
                        doc.setTextColor(15, 23, 42);
                        doc.setFont('helvetica', 'bold');
                        doc.text('1. LIBRO DE ACTUACIONES DIARIAS (GESTIÓN ADMINISTRATIVA)', 14, finalY + 5);

                        const actData = actuacionesJefe.map(a => [a.hora, a.numeroAsunto, a.partes, a.actuacion, a.observaciones]);
                        autoTable(doc, {
                          startY: finalY + 8,
                          head: [['HORA', 'N° ASUNTO / EXP.', 'PARTES INVOLUCRADAS', 'ACTUACIÓN / GESTIÓN REALIZADA', 'OBSERVACIONES']],
                          body: actData,
                          theme: 'grid',
                          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5, cellPadding: 3, lineColor: [203, 213, 225], lineWidth: 0.2 },
                          bodyStyles: { textColor: [30, 41, 59], fontSize: 8, cellPadding: 3 },
                          alternateRowStyles: { fillColor: [252, 253, 254] },
                          styles: { lineColor: [226, 232, 240], lineWidth: 0.15 },
                          margin: { left: 14, right: 14 }
                        });
                        finalY = (doc as any).lastAutoTable.finalY + 12;
                      }

                      if (ingresosJefe.length > 0) {
                        if (finalY > 230) { doc.addPage(); finalY = 36; }
                        doc.setFontSize(10.5);
                        doc.setTextColor(15, 23, 42);
                        doc.setFont('helvetica', 'bold');
                        doc.text('2. LIBRO DE INGRESOS (CASOS Y EXPEDIENTES RECIBIDOS)', 14, finalY + 5);

                        const ingData = ingresosJefe.map(i => [i.numeroExpediente, `${i.fechaIngreso} ${i.horaIngreso}`, i.tipo, i.organismoTribunal || 'N/A', i.partes, i.resumen, i.observaciones]);
                        autoTable(doc, {
                          startY: finalY + 8,
                          head: [['N° EXPEDIENTE', 'FECHA/HORA', 'TIPO', 'TRIBUNAL / ORGANISMO', 'PARTES INVOLUCRADAS', 'RESUMEN', 'OBSERVACIONES']],
                          body: ingData,
                          theme: 'grid',
                          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5, cellPadding: 3, lineColor: [203, 213, 225], lineWidth: 0.2 },
                          bodyStyles: { textColor: [30, 41, 59], fontSize: 8, cellPadding: 3 },
                          alternateRowStyles: { fillColor: [252, 253, 254] },
                          styles: { lineColor: [226, 232, 240], lineWidth: 0.15 },
                          margin: { left: 14, right: 14 }
                        });
                        finalY = (doc as any).lastAutoTable.finalY + 12;
                      }

                      if (programacionesJefe.length > 0) {
                        if (finalY > 230) { doc.addPage(); finalY = 36; }
                        doc.setFontSize(10.5);
                        doc.setTextColor(15, 23, 42);
                        doc.setFont('helvetica', 'bold');
                        doc.text('3. LIBRO DE PROGRAMACIÓN (AGENDA Y AUDIENCIAS FUTURAS)', 14, finalY + 5);

                        const progData = programacionesJefe.map(p => [p.fecha, p.hora, p.organismoTribunal, p.tipoActuacion, p.resumen, p.observaciones]);
                        autoTable(doc, {
                          startY: finalY + 8,
                          head: [['FECHA', 'HORA', 'ORGANISMO/TRIBUNAL', 'TIPO DE ACTUACIÓN', 'RESUMEN', 'OBSERVACIONES']],
                          body: progData,
                          theme: 'grid',
                          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5, cellPadding: 3, lineColor: [203, 213, 225], lineWidth: 0.2 },
                          bodyStyles: { textColor: [30, 41, 59], fontSize: 8, cellPadding: 3 },
                          alternateRowStyles: { fillColor: [252, 253, 254] },
                          styles: { lineColor: [226, 232, 240], lineWidth: 0.15 },
                          margin: { left: 14, right: 14 }
                        });
                        finalY = (doc as any).lastAutoTable.finalY + 12;
                      }

                      let invesData: any[][] = [];
                      try {
                        const invesResponse = await api.get('/rd-intranet/v1/investigaciones');
                        if (invesResponse.data && Array.isArray(invesResponse.data)) {
                          const today = format(new Date(), 'yyyy-MM-dd');
                          const myInves = invesResponse.data.filter(inv => inv.user === jefeName && inv.date && inv.date.startsWith(today));
                          if (myInves.length > 0) {
                            invesData = myInves.map(inv => [inv.tema || 'N/A', inv.resumen || 'N/A', inv.sentencia || 'N/A', inv.opinion_rd || 'N/A']);
                          }
                        }
                      } catch (e) {
                        console.warn('No se pudieron obtener las investigaciones', e);
                      }

                      if (invesData.length > 0) {
                        if (finalY > 230) { doc.addPage(); finalY = 36; }
                        doc.setFontSize(10.5);
                        doc.setTextColor(15, 23, 42);
                        doc.setFont('helvetica', 'bold');
                        doc.text('4. APORTES A LA BIBLIOTECA VIRTUAL (INVESTIGACIONES Y SENTENCIAS)', 14, finalY + 5);

                        autoTable(doc, {
                          startY: finalY + 8,
                          head: [['TEMA / TÍTULO', 'RESUMEN / HECHOS', 'SENTENCIA / JURISPRUDENCIA', 'OPINIÓN Y ANÁLISIS R&D']],
                          body: invesData,
                          theme: 'grid',
                          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5, cellPadding: 3, lineColor: [203, 213, 225], lineWidth: 0.2 },
                          bodyStyles: { textColor: [30, 41, 59], fontSize: 8, cellPadding: 3 },
                          alternateRowStyles: { fillColor: [252, 253, 254] },
                          styles: { lineColor: [226, 232, 240], lineWidth: 0.15 },
                          margin: { left: 14, right: 14 }
                        });
                      }

                      doc.save(`Bitacora_Jefatura_${jefeName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
                      const pdfBase64 = doc.output('datauristring');
                      const serializedEvidencesJefe = attachedFilesJefe.map(f => ({
                        name: f.name || f.file?.name || 'evidencia.pdf',
                        type: f.type || f.file?.type || 'application/pdf',
                        size: f.size || f.file?.size || 0,
                        note: f.note || '',
                        url: f.url || '',
                        dataUrl: f.url ? '' : (f.dataUrl || '')
                      }));

                      const payload = {
                        fecha_reporte: format(new Date(), 'yyyy-MM-dd'),
                        hora_entrada: 'N/A (Jefatura)',
                        hora_salida: format(new Date(), 'HH:mm'),
                        actuaciones: actuacionesJefe,
                        ingresos: ingresosJefe,
                        programaciones: programacionesJefe,
                        attachedFiles: serializedEvidencesJefe,
                        evidences: serializedEvidencesJefe,
                        reporte_hoy: 'Bitácora Oficial de Gestión - Régimen de Jefatura / Administración',
                        bitacora_pdf_base64: '',
                        pdf_base64: '',
                        ubicacion_entrada: 'Régimen de Jefatura (Sin GPS)',
                        ubicacion_salida: 'Régimen de Jefatura (Sin GPS)',
                        cierre_retrasado: false,
                        estado_revision: 'Jefatura'
                      };

                      const responseData = await submitToServer('/rd-intranet/v1/submit', payload);
                      const postId = responseData?.post_id;
                      if (postId && pdfBase64) {
                        console.log(`Cargando archivo PDF de Jefatura por bloques al servidor (post_id: ${postId})...`);
                        await uploadPdfInChunks(postId, pdfBase64);
                      }

                      // Subir evidencias si existen y no cuentan con url en la nube
                      if (attachedFilesJefe.length > 0 && postId) {
                        for (let i = 0; i < attachedFilesJefe.length; i++) {
                          try {
                            const item = attachedFilesJefe[i];
                            if (item.url) continue;
                            let fileToUpload: File | null = item.file instanceof File ? item.file : null;
                            if (!fileToUpload && item.dataUrl) {
                              fileToUpload = dataUrlToFile(item.dataUrl, item.name || 'evidencia.pdf', item.type);
                            }
                            if (fileToUpload) {
                              await uploadEvidenceFile(postId, fileToUpload, item.note || '');
                            }
                          } catch (err) {
                            console.error('Error subiendo evidencia de jefatura:', err);
                          }
                        }
                      }

                      // Limpiar el borrador de jefatura para iniciar un nuevo día
                      localStorage.removeItem('rd_jefe_actuaciones');
                      localStorage.removeItem('rd_jefe_ingresos');
                      localStorage.removeItem('rd_jefe_programacion');
                      localStorage.removeItem('rd_jefe_attachedFiles');
                      setActuacionesJefe([]);
                      setIngresosJefe([]);
                      setProgramacionesJefe([]);
                      setAttachedFilesJefe([]);

                      setJefeReportSubmitted(true);
                      const todayStr = format(new Date(), 'yyyy-MM-dd');
                      localStorage.setItem('rd_jefe_submitted_' + todayStr, 'true');
                      localStorage.removeItem('rd_jefe_reopened_' + todayStr);
                      setSystemAlert({
                        isOpen: true,
                        type: 'success',
                        title: '¡Bitácora de Jefatura Guardada!',
                        message: 'Tu bitácora y registros oficiales de jefatura se han generado en PDF y archivado en el sistema con éxito.',
                        onConfirm: () => {
                          setSystemAlert(prev => ({ ...prev, isOpen: false }));
                          window.location.reload();
                        }
                      });
                    } catch (error) {
                      console.error('Error al generar bitácora de jefatura:', error);
                      setSystemAlert({
                        isOpen: true,
                        type: 'error',
                        title: 'Error de Envío',
                        message: 'No se pudo guardar la bitácora de jefatura en el servidor.'
                      });
                    } finally {
                      setSubmittingJefe(false);
                    }
                  }}
                  disabled={submittingJefe || jefeReportSubmitted}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-50 cursor-pointer"
                >
                  {submittingJefe ? (
                    <span>Generando y Guardando...</span>
                  ) : jefeReportSubmitted ? (
                    <>
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" /> Bitácora del Día Generada
                    </>
                  ) : (
                    <>
                      <Download className="w-6 h-6" /> Descargar PDF y Guardar Registro
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VISTA: EXPEDIENTES Y PLANIFICACIÓN SEMANAL */}
      {activeView === 'expedientes' && (
        <ModuloExpedientes isAdmin={true} />
      )}

      {/* VISTA: GASTOS Y REEMBOLSOS (DESEMBOLSOS DE TRÁMITES) */}
      {activeView === 'gastos' && (
        <ModuloGastos isJefatura={true} />
      )}

      {/* VISTA: ARCHIVO & BIBLIOTECA GENERAL DE EXPEDIENTES Y EVIDENCIAS */}
      {activeView === 'biblioteca' && (
        <div className="animate-in fade-in duration-200">
          <ModuloBibliotecaArchivos />
        </div>
      )}

      {/* VISTA: MI HISTORIAL DE JEFATURA */}
      {activeView === 'historial' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 lg:p-10">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <History className="w-7 h-7 text-blue-600" /> Mi Historial de Bitácoras de Jefatura
            </h3>
            <p className="text-slate-500 font-medium mt-1">Consulta y descarga los reportes PDF de gestión que has generado anteriormente.</p>
          </div>
          <TabHistorial />
        </div>
      )}

      {/* Modal de Revisión y Edición con Glassmorphism Responsive */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-300">

            {/* Modal Header */}
            <div className="bg-slate-900 p-4 sm:p-8 flex justify-between items-start text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 sm:gap-4 mb-2">
                  <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/10 flex items-center justify-center text-sm sm:text-xl font-bold border border-white/20 uppercase tracking-widest shrink-0">
                    {String(selectedReport?.user || 'Usuario').substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-2xl font-black flex items-center gap-2 flex-wrap">
                      <span className="capitalize">Bitácora de {selectedReport.user || 'Empleado'}</span>
                      {isReportApproved ? (
                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-emerald-500/30 uppercase tracking-widest font-black flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" /> Aprobada
                        </span>
                      ) : (
                        <span className="bg-amber-500/20 text-amber-400 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-amber-500/30 uppercase tracking-widest font-black shadow-2xs">
                          Revisión
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-xl text-xs font-black flex items-center gap-1 shadow-2xs">
                        <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
                        {selectedReport.date || selectedReport.fecha_bitacora || selectedReport.fecha || format(new Date(), 'yyyy-MM-dd')}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const msg = {
                            author: selectedReport.user,
                            post_id: selectedReport.id,
                            fecha_bitacora: selectedReport.date || selectedReport.fecha_bitacora || selectedReport.fecha,
                            mensaje: selectedReport.comentario_admin || 'Conversación oficial sobre esta bitácora'
                          };
                          handleOpenChatForReply(msg);
                        }}
                        className="px-2.5 py-0.5 bg-[#075E54] hover:bg-[#128C7E] text-white text-xs font-black rounded-xl transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                        title="Abrir chat tipo WhatsApp vinculado a esta bitácora"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Chat Bitácora</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedReport(null)} className="relative z-10 p-1.5 sm:p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 sm:p-8 overflow-y-auto flex-1 space-y-4 sm:space-y-8 bg-slate-50/50">

              {/* Info General (Cards) */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-center">
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-emerald-500" /> Entrada</p>
                  <p className="text-base sm:text-xl font-bold text-slate-800">{formatTime12h(selectedReport.clockIn)}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><MapPin className="w-4 h-4 text-emerald-500" /> GPS Entrada</p>
                    {selectedReport.ubicacionEntrada?.includes('GPS Verificado') ? (
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-full uppercase tracking-wider">
                        🛰️ Verificado
                      </span>
                    ) : selectedReport.ubicacionEntrada?.includes('Red IP') ? (
                      <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-black rounded-full uppercase tracking-wider">
                        ⚠️ Red IP
                      </span>
                    ) : null}
                  </div>
                  {selectedReport.ubicacionEntrada && selectedReport.ubicacionEntrada !== 'N/A' ? (
                    <div className="flex flex-col items-start gap-1">
                      {selectedReport.ubicacionEntrada.includes('|||') && (
                        <span className="text-xs font-bold text-slate-700 leading-tight">{selectedReport.ubicacionEntrada.split('|||')[1]}</span>
                      )}
                      <a href={`https://www.google.com/maps/search/?api=1&query=${selectedReport.ubicacionEntrada.split('|||')[0]}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 py-1 px-2.5 rounded-lg w-max transition-colors flex items-center gap-1 mt-0.5">
                        Ver en Google Maps
                      </a>
                    </div>
                  ) : <p className="text-sm font-bold text-slate-400">No registrada</p>}
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Clock className="w-4 h-4 text-rose-500" /> Salida</p>
                  <p className="text-xl font-bold text-slate-800">{selectedReport.clockOut ? formatTime12h(selectedReport.clockOut) : 'Activa'}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><MapPin className="w-4 h-4 text-rose-500" /> GPS Salida</p>
                    {selectedReport.ubicacionSalida?.includes('GPS Verificado') ? (
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-full uppercase tracking-wider">
                        🛰️ Verificado
                      </span>
                    ) : selectedReport.ubicacionSalida?.includes('Red IP') ? (
                      <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-black rounded-full uppercase tracking-wider">
                        ⚠️ Red IP
                      </span>
                    ) : null}
                  </div>
                  {selectedReport.ubicacionSalida && selectedReport.ubicacionSalida !== 'N/A' ? (
                    <div className="flex flex-col items-start gap-1">
                      {selectedReport.ubicacionSalida.includes('|||') && (
                        <span className="text-xs font-bold text-slate-700 leading-tight">{selectedReport.ubicacionSalida.split('|||')[1]}</span>
                      )}
                      <a href={`https://www.google.com/maps/search/?api=1&query=${selectedReport.ubicacionSalida.split('|||')[0]}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 py-1 px-2.5 rounded-lg w-max transition-colors flex items-center gap-1 mt-0.5">
                        Ver en Google Maps
                      </a>
                    </div>
                  ) : <p className="text-sm font-bold text-slate-400">No registrada</p>}
                </div>
              </div>

              {/* LIBRO DE ACTUACIONES (REALIZADO) */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                    <CheckCircle className="w-5 h-5 text-emerald-500" /> Libro de Actuaciones (Hoy)
                  </h4>
                  <button onClick={handleAddActuacion} className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1">+ Añadir Actuación</button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs border-b border-slate-200">
                      <tr>
                        <th className="p-2 min-w-[120px]">Hora</th>
                        <th className="p-2 min-w-[150px]">Nº Asunto / Exp.</th>
                        <th className="p-2 min-w-[150px]">Partes Involucradas</th>
                        <th className="p-2 min-w-[200px]">Actuación / Gestión</th>
                        <th className="p-2 min-w-[200px]">Observaciones</th>
                        <th className="p-2 w-10 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminActuaciones.length === 0 ? (
                        <tr><td colSpan={6} className="p-6 text-center text-slate-500 italic font-medium">El empleado no dejó actuaciones. Añade tú las tareas si es necesario.</td></tr>
                      ) : adminActuaciones.map((act: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-2 align-top">
                            <input type="time" value={act.hora || ''} onChange={(e) => updateActuacionField(i, 'hora', e.target.value)} className="w-full p-2 text-xs border border-slate-200 rounded outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 bg-white" />
                          </td>
                          <td className="p-2 align-top">
                            <input type="text" value={act.numeroAsunto || ''} onChange={(e) => updateActuacionField(i, 'numeroAsunto', e.target.value)} className="w-full p-2 text-xs border border-slate-200 rounded outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 bg-white" placeholder="Nº Asunto" />
                          </td>
                          <td className="p-2 align-top">
                            <textarea value={act.partes || ''} onChange={(e) => updateActuacionField(i, 'partes', e.target.value)} className="w-full p-2 text-xs border border-slate-200 rounded outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 bg-white resize-none" rows={3} placeholder="Partes" />
                          </td>
                          <td className="p-2 align-top">
                            <textarea value={act.actuacion || ''} onChange={(e) => updateActuacionField(i, 'actuacion', e.target.value)} className="w-full p-2 text-xs border border-slate-200 rounded outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 bg-white resize-none" rows={3} placeholder="Actuación" />
                          </td>
                          <td className="p-2 align-top">
                            <textarea value={act.observaciones || ''} onChange={(e) => updateActuacionField(i, 'observaciones', e.target.value)} className="w-full p-2 text-xs border border-slate-200 rounded outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 bg-white resize-none" rows={3} placeholder="Observaciones" />
                          </td>
                          <td className="p-2 align-top text-center">
                            <button onClick={() => handleRemoveActuacion(i)} className="text-slate-400 hover:text-rose-500 p-1 bg-white hover:bg-rose-50 rounded transition-colors"><Trash2 className="w-4 h-4 mx-auto" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ARCHIVOS Y EVIDENCIAS ADJUNTAS */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                    <Paperclip className="w-5 h-5 text-blue-600" /> Archivos Adjuntos a las Actuaciones
                  </h4>
                  <button
                    onClick={() => { setSelectedReport(null); setActiveView('biblioteca'); }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <FolderSearch className="w-3.5 h-3.5" />
                    <span>Ver en Archivo Central</span>
                  </button>
                </div>
                {(() => {
                  let evList: any[] = [];
                  if (Array.isArray(selectedReport.evidences) && selectedReport.evidences.length > 0) {
                    evList = selectedReport.evidences;
                  } else if (Array.isArray(selectedReport.attachedFiles) && selectedReport.attachedFiles.length > 0) {
                    evList = selectedReport.attachedFiles;
                  } else if (typeof selectedReport.evidences === 'string' && selectedReport.evidences.length > 2) {
                    try { evList = JSON.parse(selectedReport.evidences); } catch (e) {}
                  }

                  return evList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {evList.map((ev: any, idx: number) => {
                        const fileUrl = ev.url || ev.dataUrl || '#';
                        const fileName = ev.name || `documento_adjunto_${idx + 1}.pdf`;
                        return (
                          <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/90 rounded-2xl border border-slate-200 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden pr-2">
                              <div className="bg-rose-100 text-rose-600 p-2.5 rounded-xl shrink-0 shadow-2xs">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="overflow-hidden">
                                <p className="font-bold text-xs text-slate-900 truncate" title={fileName}>{fileName}</p>
                                {ev.note && <p className="text-[11px] text-slate-500 truncate mt-0.5">Nota: "{ev.note}"</p>}
                                {ev.size && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{(ev.size / 1024).toFixed(1)} KB</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={fileName}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors shadow-2xs"
                              >
                                Ver / Descargar
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500 text-sm font-medium italic">
                      Sin archivos adjuntos registrados por el empleado en esta jornada.
                    </div>
                  );
                })()}
              </div>

              {/* LIBRO DE INGRESOS (REALIZADO) */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-blue-200 shadow-sm overflow-hidden relative">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5 text-blue-500" /> Libro de Ingresos (Nuevos Casos)
                  </h4>
                  <button onClick={handleAddIngreso} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1">+ Añadir Ingreso</button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs border-b border-slate-200">
                      <tr>
                        <th className="p-2 min-w-[120px]">Tipo / Exp.</th>
                        <th className="p-2 min-w-[150px]">Tribunal / Organismo</th>
                        <th className="p-2 min-w-[150px]">Partes</th>
                        <th className="p-2 min-w-[200px]">Resumen</th>
                        <th className="p-2 min-w-[200px]">Observaciones</th>
                        <th className="p-2 w-10 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminIngresos.length === 0 ? (
                        <tr><td colSpan={6} className="p-6 text-center text-slate-500 italic font-medium">El empleado no dejó ingresos. Añade tú los ingresos si es necesario.</td></tr>
                      ) : adminIngresos.map((ing: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-2 align-top">
                            <select value={ing.tipo || 'Judicial'} onChange={(e) => updateIngresoField(i, 'tipo', e.target.value)} className="w-full p-2 text-xs border border-slate-200 rounded outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 bg-white mb-1">
                              <option value="Judicial">Judicial</option>
                              <option value="Administrativo">Administrativo</option>
                              <option value="Notaría/Registro">Notaría/Registro</option>
                              <option value="Archivo Muerto">Archivo Muerto</option>
                              <option value="LetsSmart">LetsSmart</option>
                            </select>
                            <input type="text" value={ing.numeroExpediente || ''} onChange={(e) => updateIngresoField(i, 'numeroExpediente', e.target.value)} className="w-full p-2 text-xs border border-slate-200 rounded outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 bg-white" placeholder="Nº Exp." />
                          </td>
                          <td className="p-2 align-top">
                            <textarea value={ing.organismoTribunal || ''} onChange={(e) => updateIngresoField(i, 'organismoTribunal', e.target.value)} className="w-full p-2 text-xs border border-slate-200 rounded outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 bg-white resize-none" rows={3} placeholder="Tribunal" />
                          </td>
                          <td className="p-2 align-top">
                            <textarea value={ing.partes || ''} onChange={(e) => updateIngresoField(i, 'partes', e.target.value)} className="w-full p-2 text-xs border border-slate-200 rounded outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 bg-white resize-none" rows={3} placeholder="Partes" />
                          </td>
                          <td className="p-2 align-top">
                            <textarea value={ing.resumen || ''} onChange={(e) => updateIngresoField(i, 'resumen', e.target.value)} className="w-full p-2 text-xs border border-slate-200 rounded outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 bg-white resize-none" rows={3} placeholder="Resumen" />
                          </td>
                          <td className="p-2 align-top">
                            <textarea value={ing.observaciones || ''} onChange={(e) => updateIngresoField(i, 'observaciones', e.target.value)} className="w-full p-2 text-xs border border-slate-200 rounded outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 bg-white resize-none" rows={3} placeholder="Observaciones" />
                          </td>
                          <td className="p-2 align-top text-center">
                            <button onClick={() => handleRemoveIngreso(i)} className="text-slate-400 hover:text-rose-500 p-1 bg-white hover:bg-rose-50 rounded transition-colors"><Trash2 className="w-4 h-4 mx-auto" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* LIBRO DE PROGRAMACIÓN (EDITABLE) */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-amber-200 shadow-sm overflow-hidden relative">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                    <CalendarIcon className="w-5 h-5 text-amber-500" /> Libro de Programación (Futuro)
                  </h4>
                  <button onClick={handleAddProgramacion} className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1">+ Añadir Tarea</button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs border-b border-slate-200">
                      <tr>
                        <th className="p-2 min-w-[140px]">Fecha/Hora</th>
                        <th className="p-2 min-w-[180px]">Tribunal/Lugar</th>
                        <th className="p-2 min-w-[180px]">Actuación a realizar</th>
                        <th className="p-2 min-w-[200px]">Instrucciones del Jefe</th>
                        <th className="p-2 w-10 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminProgramaciones.length === 0 ? (
                        <tr><td colSpan={5} className="p-6 text-center text-slate-500 italic font-medium">El empleado no dejó programación. Añade tú las tareas si es necesario.</td></tr>
                      ) : adminProgramaciones.map((prog: any, i: number) => (
                        <tr key={i} className="hover:bg-amber-50/30 transition-colors">
                          <td className="p-2 space-y-1 align-top">
                            <input type="date" value={prog.fecha || ''} onChange={(e) => updateProgramacionField(i, 'fecha', e.target.value)} className="w-full p-2 text-xs border border-slate-200 rounded outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 bg-white" />
                            <input type="time" value={prog.hora || ''} onChange={(e) => updateProgramacionField(i, 'hora', e.target.value)} className="w-full p-2 text-xs border border-slate-200 rounded outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 bg-white" />
                          </td>
                          <td className="p-2 align-top">
                            <textarea value={prog.organismoTribunal || ''} onChange={(e) => updateProgramacionField(i, 'organismoTribunal', e.target.value)} className="w-full p-2 text-xs border border-slate-200 rounded outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 bg-white resize-none" rows={3} placeholder="Órgano / Tribunal" />
                          </td>
                          <td className="p-2 align-top">
                            <textarea value={prog.tipoActuacion || ''} onChange={(e) => updateProgramacionField(i, 'tipoActuacion', e.target.value)} className="w-full p-2 text-xs border border-slate-200 rounded outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 bg-white resize-none" rows={3} placeholder="Descripción de la tarea" />
                          </td>
                          <td className="p-2 align-top">
                            <textarea value={prog.observaciones || ''} onChange={(e) => updateProgramacionField(i, 'observaciones', e.target.value)} placeholder="Ej: Asegúrate de llevar el sello..." className="w-full p-2 text-xs border border-amber-300 bg-amber-50 rounded outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 resize-none placeholder:text-amber-700/50 text-slate-800 font-medium" rows={3} />
                          </td>
                          <td className="p-2 text-center align-top pt-3">
                            <button onClick={() => handleRemoveProgramacion(i)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200" title="Eliminar Tarea"><X className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Investigaciones del Empleado */}
              {allInvestigaciones.filter(inv => inv.user === selectedReport.user && inv.date && inv.date.startsWith(selectedReport.date)).length > 0 && (
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 text-lg mb-4">
                    <BookOpen className="w-5 h-5 text-amber-500" /> Investigaciones Aportadas (KANT)
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {allInvestigaciones.filter(inv => inv.user === selectedReport.user && inv.date && inv.date.startsWith(selectedReport.date)).map((inv: any, idx: number) => (
                      <div key={idx} className="bg-amber-50 p-4 border border-amber-200 rounded-xl">
                        <p className="font-bold text-slate-800 mb-2">{inv.tema}</p>
                        <p className="text-sm text-slate-600 line-clamp-2">{inv.resumen}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Archivos Adjuntos y PDF de Jornada */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 text-lg mb-4">
                  <FileText className="w-5 h-5 text-blue-500" /> Documentos de la Jornada
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Botón para descargar el PDF principal generado automáticamente */}
                  {selectedReport.pdfBase64 ? (
                    <a
                      href={selectedReport.pdfBase64.startsWith('data:') || selectedReport.pdfBase64.startsWith('http') ? selectedReport.pdfBase64 : `data:application/pdf;base64,${selectedReport.pdfBase64}`}
                      download={`Bitacora_${selectedReport.user}_${selectedReport.date}.pdf`}
                      className="flex items-center gap-3 p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl hover:border-emerald-500 hover:bg-emerald-100 transition-all cursor-pointer group shadow-sm"
                    >
                      <div className="w-10 h-10 bg-emerald-600 text-white rounded-lg flex items-center justify-center shadow-md">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-slate-900 truncate">Bitacora_{selectedReport.user}.pdf</p>
                        <p className="text-xs text-emerald-800 font-extrabold flex items-center gap-1"><Download className="w-4 h-4 mr-1" /> Ver / Descargar PDF Oficial</p>
                      </div>
                    </a>
                  ) : (
                    <button
                      onClick={() => generateFallbackReportPdf({
                        ...selectedReport,
                        programaciones: adminProgramaciones || selectedReport.programaciones,
                        comentario_admin: adminComment || selectedReport.comentario_admin
                      })}
                      className="col-span-1 sm:col-span-2 flex items-center justify-between p-4 bg-amber-50 border-2 border-amber-300 rounded-xl hover:border-amber-500 hover:bg-amber-100 transition-all cursor-pointer group shadow-sm text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500 text-slate-950 rounded-lg flex items-center justify-center shadow-md shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900">Bitacora_{selectedReport.user}_{selectedReport.date}.pdf</p>
                          <p className="text-xs text-amber-900 font-bold flex items-center gap-1">
                            <Zap className="w-4 h-4 mr-1" /> Generar y Descargar Documento Oficial PDF (Reconstruido desde datos KANT)
                          </p>
                        </div>
                      </div>
                      <span className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl font-black text-xs shrink-0 ml-2 shadow-sm">
                        <Download className="w-4 h-4 inline mr-1" /> GENERAR PDF
                      </span>
                    </button>
                  )}

                  {selectedReport.evidences && selectedReport.evidences.map((ev: any, index: number) => (
                    <a key={index} href={ev.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer group">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200 group-hover:border-blue-300 transition-colors shrink-0">
                        <Download className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-slate-700 truncate" title={ev.name}>{ev.name}</p>
                        <p className="text-xs text-slate-500 font-medium truncate" title={ev.note || 'Documento adjunto'}>{ev.note || 'Documento adjunto'} • Clic para ver/descargar</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Feedback Administrativo y Aprobación */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                {isJefaturaUser(selectedReport.user) && (
                  <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 mb-4 flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
                    <div>
                      <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase tracking-wider rounded-full">
                        Régimen Jefatura / Directivo
                      </span>
                      <p className="text-xs text-slate-700 font-medium mt-1">
                        Bitácora emitida por Jefatura. Habilitada para revisión, edición de actuaciones/ingresos/programación y aprobación por cualquier miembro de la Dirección.
                      </p>
                    </div>
                  </div>
                )}
                <h4 className="font-bold text-slate-800 flex items-center gap-2 text-lg mb-2">
                  <MessageSquare className="w-5 h-5 text-blue-500" /> Feedback Administrativo / Observaciones
                </h4>
                <p className="text-sm text-slate-500 font-medium mb-4">Añade comentarios o observaciones oficiales. Se registrarán en el reporte PDF y se notificará.</p>
                <textarea
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  placeholder="Escribe tus observaciones aquí..."
                  rows={4}
                  className="w-full p-4 text-lg border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none shadow-inner"
                />

                {/* HILO DE CONVERSACIÓN / RESPUESTAS DEL EMPLEADO */}
                {(() => {
                  const selUser = (selectedReport.user || '').toLowerCase().trim();
                  const matchedReplies = [
                    ...(Array.isArray(selectedReport.respuestas_hilo) ? selectedReport.respuestas_hilo : []),
                    ...employeeMessages.filter(m => {
                      const mAuthor = (m.author || '').toLowerCase().trim();
                      const sameUser = selUser && mAuthor && (selUser === mAuthor || selUser.includes(mAuthor) || mAuthor.includes(selUser));
                      const samePost = m.post_id && selectedReport.id && String(m.post_id) === String(selectedReport.id);
                      return samePost || sameUser;
                    })
                  ].filter((rep, idx, self) => idx === self.findIndex(t => (t.id && t.id === rep.id) || (t.mensaje === rep.mensaje && t.fecha === rep.fecha)));

                  if (matchedReplies.length === 0) return null;

                  return (
                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-emerald-600" /> 
                          Hilo de Conversación & Respuestas de {selectedReport.user}
                        </h5>
                        <button
                          onClick={() => handleOpenChatForReply({
                            author: selectedReport.user,
                            post_id: selectedReport.id,
                            fecha_bitacora: selectedReport.date
                          })}
                          className="px-3 py-1.5 bg-[#075E54] hover:bg-[#128C7E] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-300" /> Abrir Chat WhatsApp
                        </button>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {matchedReplies.map((rep: any, rIdx: number) => (
                          <div key={rIdx} className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-black text-emerald-900 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {rep.author || selectedReport.user}:
                              </span>
                              <span className="text-[10px] text-emerald-700 font-bold">{rep.fecha}</span>
                            </div>
                            <p className="text-xs text-slate-800 font-medium pl-4">
                              "{rep.mensaje}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                {/* ZONA DE ADMINISTRACIÓN PROTEGIDA (OCULTA POR DEFECTO PARA EVITAR CLICKS ACCIDENTALES) */}
                <div className="pt-6 border-t border-slate-200/80">
                  <details className="group border border-slate-200 rounded-2xl bg-white p-4 transition-all">
                    <summary className="cursor-pointer text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center justify-between select-none list-none">
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-slate-400 group-open:text-rose-500" />
                        <span>Opciones avanzadas de administración (Zona Protegida)</span>
                      </span>
                      <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                      <div>
                        <p className="text-xs font-bold text-rose-800 mb-0.5">
                          {selectedReport.isDraft ? 'Descartar este avance borrador' : 'Reapertura de jornada'}
                        </p>
                        <p className="text-[11px] text-slate-500 max-w-md">
                          {selectedReport.isDraft 
                            ? 'Elimina únicamente este borrador de avance en caso de que el empleado lo haya enviado por error.' 
                            : 'Elimina esta bitácora del sistema y permite al empleado marcar entrada nuevamente para este día.'}
                        </p>
                      </div>
                      {!selectedReport.isDraft ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSystemAlert({
                              isOpen: true,
                              type: 'warning',
                              title: '¿Confirmar Reapertura?',
                              message: `¿Estás seguro de reabrir y reiniciar la jornada de ${selectedReport.user} para el día ${selectedReport.date}? Esto eliminará su bitácora de ese día y le permitirá marcar entrada nuevamente.`,
                              showCancel: true,
                              confirmText: 'Sí, Reabrir Jornada',
                              cancelText: 'Cancelar',
                              onConfirm: async () => {
                                setSystemAlert(prev => ({ ...prev, isOpen: false }));
                                try {
                                  await submitToServer('/rd-intranet/v1/reset-user-day', { 
                                    post_id: selectedReport.id, 
                                    date: selectedReport.date,
                                    user: selectedReport.user,
                                    user_id: selectedReport.user_id
                                  });
                                  setReports(prev => prev.filter(r => r.id !== selectedReport.id));
                                  setSystemAlert({
                                    isOpen: true,
                                    type: 'success',
                                    title: 'Jornada Reabierta / Eliminada',
                                    message: 'La jornada ha sido eliminada y reabierta exitosamente en la base de datos.',
                                    onConfirm: () => {
                                      setSelectedReport(null);
                                      window.location.reload();
                                    }
                                  });
                                } catch (e) {
                                  setSystemAlert({
                                    isOpen: true,
                                    type: 'error',
                                    title: 'Error de Servidor',
                                    message: 'No se pudo reabrir la jornada. Intenta de nuevo más tarde.'
                                  });
                                }
                              }
                            });
                          }}
                          className="px-4 py-2.5 rounded-xl font-bold text-rose-700 bg-white hover:bg-rose-100 border border-rose-300 transition-colors text-xs flex items-center gap-2 shadow-xs cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Reabrir Jornada / Eliminar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSystemAlert({
                              isOpen: true,
                              type: 'warning',
                              title: '¿Descartar Avance?',
                              message: `¿Estás seguro de que deseas descartar el avance de ${selectedReport.user}? Se borrarán las tareas que envió como prueba, pero NO se cerrará su sesión ni se afectará su asistencia.`,
                              showCancel: true,
                              confirmText: 'Sí, Descartar',
                              cancelText: 'Cancelar',
                              onConfirm: async () => {
                                setSystemAlert(prev => ({ ...prev, isOpen: false }));
                                try {
                                  await submitToServer('/rd-intranet/v1/admin-update-draft', {
                                    target_user_id: selectedReport.user_id,
                                    target_user: selectedReport.user,
                                    user: selectedReport.user,
                                    comentario_admin: '',
                                    programaciones: []
                                  });
                                  setSystemAlert({
                                    isOpen: true,
                                    type: 'success',
                                    title: 'Avance Descartado',
                                    message: 'Las tareas de avance han sido borradas correctamente de tu panel.',
                                    showCancel: false,
                                    onConfirm: () => {
                                      setAllDrafts(allDrafts.filter(d => d.user_id !== selectedReport.user_id));
                                      setSelectedReport(null);
                                      setSystemAlert(prev => ({ ...prev, isOpen: false }));
                                    }
                                  });
                                } catch (e) {
                                  setSystemAlert({
                                    isOpen: true,
                                    type: 'error',
                                    title: 'Error al Descartar',
                                    message: 'No se pudo descartar el avance en este momento. Inténtalo de nuevo.'
                                  });
                                }
                              }
                            });
                          }}
                          className="px-4 py-2.5 rounded-xl font-bold text-rose-700 bg-white hover:bg-rose-100 border border-rose-300 transition-colors text-xs flex items-center gap-2 shadow-xs cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Descartar Avance
                        </button>
                      )}
                    </div>
                  </details>
                </div>
              </div>

            </div>

            {/* Modal Footer (Limpio y seguro sin botones destructivos expuestos) */}
            <div className="bg-white p-6 sm:p-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 rounded-b-3xl">
              {isReportApproved ? (
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm w-full sm:w-auto shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Bitácora ya revisada y aprobada{selectedReport.supervisado_por ? ` por ${normalizeSupervisorName(selectedReport.supervisado_por, selectedReport.date)}` : ''}.</span>
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-medium hidden sm:block">
                  Al aprobar se notificará al empleado y se actualizará el estado de la bitácora.
                </div>
              )}

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button 
                  type="button"
                  onClick={() => setSelectedReport(null)} 
                  className="flex-1 sm:flex-none px-8 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm cursor-pointer"
                >
                  Cerrar
                </button>

                {!isReportApproved ? (
                  <button 
                    type="button"
                    onClick={handleSaveComment} 
                    className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-xl font-bold shadow-xl transition-all flex items-center justify-center gap-2.5 text-sm hover:-translate-y-0.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Aprobar y Notificar
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={handleSaveComment} 
                    className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-6 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
                    title="Actualizar observaciones o cambios realizados"
                  >
                    Guardar Modificaciones
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Reseteo */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">¿Borrar todos los datos?</h3>
              <p className="text-slate-500 font-medium mb-8">Esta acción eliminará de WordPress todas las bitácoras y correlativos de prueba. No se puede deshacer.</p>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowResetModal(false)}
                  disabled={isResetting}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmReset}
                  disabled={isResetting}
                  className="flex-1 py-3 px-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isResetting ? <span className="animate-pulse">Borrando...</span> : 'Sí, borrar todo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL CHAT TIPO WHATSAPP */}
      <WhatsAppStyleChat
        isOpen={chatConfig.isOpen}
        onClose={() => setChatConfig({ ...chatConfig, isOpen: false })}
        currentUser={localStorage.getItem('rd_user_name') || 'Luis Delgado'}
        isJefatura={true}
        targetUser={chatConfig.targetUser}
        reportContext={chatConfig.reportContext}
        initialMessages={chatConfig.initialMessages}
        onMessageSent={(newMsg) => {
          setEmployeeMessages(prev => [newMsg, ...prev]);
        }}
        onMarkAtendido={(msgId) => {
          markEmployeeReplyRead(msgId);
        }}
      />

      {/* MODAL REPORTE OFICIAL DE ASISTENCIA Y CONTROL HORARIO */}
      <AttendanceReportModal
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        initialEmployee="Carmen Luisa"
      />

      {/* KANT COMPANION - ASISTENTE GUARDIÁN FLOTANTE */}
      <KantFloatingCompanion 
        pendingReviews={activeNotifications.length} 
        pendingGastos={pendingGastosCount} 
        unreadReplies={unreadEmployeeReplies.length + unreadChatLive} 
        onNavigate={(tab: any) => setActiveView(tab)}
      />

      {/* NOTIFICACIÓN FLOTANTE DE MENSAJE NUEVO DE CHAT */}
      {chatToast && chatToast.isOpen && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 text-white p-4 rounded-3xl shadow-2xl border border-emerald-500/40 animate-in slide-in-from-bottom-5 duration-300 flex items-start gap-3 backdrop-blur-md">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Nuevo Mensaje de Chat</span>
              <button 
                onClick={() => setChatToast(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="font-bold text-sm text-white truncate mt-0.5 capitalize">
              {chatToast.sender}
            </p>
            <p className="text-xs text-slate-300 line-clamp-2 mt-0.5 italic">
              "{chatToast.message}"
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveView('chat');
                  setChatToast(null);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Abrir Chat</span>
              </button>
              <button
                onClick={() => setChatToast(null)}
                className="px-3 py-1.5 text-slate-400 hover:text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

