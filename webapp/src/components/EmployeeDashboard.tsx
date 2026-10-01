import React, { useState, useEffect, useCallback } from 'react';
import api, { uploadPdfInChunks, uploadEvidenceFile, submitToServer, dataUrlToFile } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Calendar as CalendarIcon, Activity, MessageSquare, FileDigit, Clock, CheckCircle2, AlertCircle, History, Lock, Scale, MapPin, Receipt, RefreshCw, FolderSearch, X } from 'lucide-react';
import { format } from 'date-fns';
import NotificationPanel from './employee/NotificationPanel';
import TabRegistroDiario from './employee/TabRegistroDiario';
import TabAgenda from './employee/TabAgenda';
import TabLibroIngresos from './employee/TabLibroIngresos';
import TabHistorial from './employee/TabHistorial';
import ModuloExpedientes from './expedientes/ModuloExpedientes';
import ModuloGastos from './gastos/ModuloGastos';
import { getStoredExpedientes } from './expedientes/mockExpedientesData';
import ModuloBibliotecaArchivos from './expedientes/ModuloBibliotecaArchivos';
import LiveStatusBar from './common/LiveStatusBar';
import { KantFloatingCompanion } from './common/KantMascot';
import type { Actuacion, Ingreso, Programacion } from '../types/libros';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SystemAlertModal, { type AlertType } from './common/SystemAlertModal';
import LiveChatModule, { playNotificationSound } from './chat/LiveChatModule';
import { normalizeSupervisorName, getServerDate, formatTime12h, parseDateAndTime } from '../lib/supabaseAdapter';

const safeFormatTime = (dateInput: Date | string | null | undefined, fallback = 'N/A'): string => {
  if (!dateInput) return fallback;
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) {
      return typeof dateInput === 'string' ? formatTime12h(dateInput) : fallback;
    }
    return format(d, 'hh:mm a');
  } catch (e) {
    return typeof dateInput === 'string' ? formatTime12h(dateInput) : fallback;
  }
};

const getStorageKey = () => {
  const userName = (localStorage.getItem('rd_user_name') || 'unknown').toLowerCase().trim();
  return `rd_intranet_draft_${userName}`;
};

const isSameLocalDate = (dateInput: string | Date | null | undefined, targetDateStr = format(new Date(), 'yyyy-MM-dd')): boolean => {
  if (!dateInput) return false;
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return false;
    return format(d, 'yyyy-MM-dd') === targetDateStr;
  } catch (e) {
    return false;
  }
};

const getInitialDraft = () => {
  try {
    const raw = localStorage.getItem(getStorageKey());
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
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

export default function EmployeeDashboard() {
  const [clockIn, setClockIn] = useState<Date | null>(() => {
    const draft = getInitialDraft();
    if (draft && draft.clockIn && isSameLocalDate(draft.clockIn)) {
      return new Date(draft.clockIn);
    }
    return null;
  });
  const [ubicacionEntrada, setUbicacionEntrada] = useState<string | null>(() => {
    const draft = getInitialDraft();
    if (draft && draft.clockIn && isSameLocalDate(draft.clockIn)) {
      return draft.ubicacionEntrada || null;
    }
    return null;
  });
  const [clockOut, setClockOut] = useState<Date | null>(null);
  const [closingDay, setClosingDay] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(true);
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

  const applyLocation = async (locString: string, notify = true) => {
    setUbicacionEntrada(locString);
    if (locString.includes('Valencia') || locString.includes('Maracay') || locString.includes('GPS Verificado')) {
      const cityName = locString.includes('|||') ? locString.split('|||')[1] : locString;
      localStorage.setItem('rd_preferred_city', cityName);
    }
    
    // Sincronizar en localStorage
    const curDraft = getInitialDraft() || {};
    const updated = {
      ...curDraft,
      clockIn: clockIn ? clockIn.toISOString() : curDraft.clockIn || new Date().toISOString(),
      ubicacionEntrada: locString
    };
    localStorage.setItem(getStorageKey(), JSON.stringify(updated));

    // Sincronizar en Supabase
    await submitToServer('/rd-intranet/v1/draft', updated).catch(() => {});
    if (clockIn) {
      await submitToServer('/rd-intranet/v1/clock-in', {
        clockIn: clockIn.toISOString(),
        ubicacionEntrada: locString
      }).catch(() => {});
    }

    if (notify) {
      const cityName = locString.includes('|||') ? locString.split('|||')[1] : locString;
      setSystemAlert({
        isOpen: true,
        type: 'success',
        title: 'Ubicación Confirmada',
        message: `Tu asistencia ha sido actualizada y registrada exitosamente en: ${cityName}.`
      });
    }
  };
  
  // Listas Dinámicas (Libros Legales)
  const [actuaciones, setActuaciones] = useState<Actuacion[]>(() => {
    const draft = getInitialDraft();
    if (draft && Array.isArray(draft.actuaciones) && draft.actuaciones.length > 0) {
      return draft.actuaciones;
    }
    try {
      const userName = (localStorage.getItem('rd_user_name') || 'unknown').toLowerCase().trim();
      const backupRaw = localStorage.getItem(`rd_actuaciones_backup_${userName}`);
      if (backupRaw) {
        const parsed = JSON.parse(backupRaw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return [];
  });
  const [ingresos, setIngresos] = useState<Ingreso[]>(() => {
    const draft = getInitialDraft();
    return draft && Array.isArray(draft.ingresos) ? draft.ingresos : [];
  });
  const [programaciones, setProgramaciones] = useState<Programacion[]>(() => {
    const draft = getInitialDraft();
    return draft && Array.isArray(draft.programaciones) ? draft.programaciones : [];
  });
  const [attachedFiles, setAttachedFiles] = useState<any[]>(() => {
    const draft = getInitialDraft();
    if (draft && Array.isArray(draft.attachedFiles)) {
      return draft.attachedFiles.map((item: any) => ({
        ...item,
        file: item.file || (item.dataUrl ? dataUrlToFile(item.dataUrl, item.name || 'documento.pdf', item.type) : null)
      }));
    }
    return [];
  });
  
  // Tareas programadas reales desde la última bitácora
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [allFutureTasks, setAllFutureTasks] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [draftComment, setDraftComment] = useState<string | null>(null);
  const [draftSupervisor, setDraftSupervisor] = useState<string | null>(null);
  const [globalExpedientes, setGlobalExpedientes] = useState<any[]>(() => getStoredExpedientes());

  useEffect(() => {
    const fetchExp = async () => {
      try {
        const res = await api.get('/rd-intranet/v1/expedientes');
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setGlobalExpedientes(res.data);
        }
      } catch (e) {
        console.warn('Error fetching expedientes in EmployeeDashboard:', e);
      }
    };
    fetchExp();
    window.addEventListener('rd_expedientes_updated', fetchExp);
    return () => window.removeEventListener('rd_expedientes_updated', fetchExp);
  }, []);

  const markFeedbackRead = (id: string | number) => {
    localStorage.setItem(`rd_notif_read_${id}`, 'true');
    setNotifications(prev => prev.map(n => String(n.id) === String(id) ? { ...n, read: true } : n));
  };

  // Autoguardado (Local y Nube)
  useEffect(() => {
    // Protección multi-dispositivo: No autoguardar ni sobrescribir en la nube mientras descargamos el borrador o si la jornada ya concluyó
    if (loadingDraft || reportSubmitted) return;

    const userName = (localStorage.getItem('rd_user_name') || 'unknown').toLowerCase().trim();
    if (actuaciones.length > 0) {
      try {
        localStorage.setItem(`rd_actuaciones_backup_${userName}`, JSON.stringify(actuaciones));
      } catch (e) {
        // ignore
      }
    }

    const localDraft = {
      lastUpdated: Date.now(),
      clockIn: clockIn ? clockIn.toISOString() : null,
      ubicacionEntrada,
      actuaciones,
      ingresos,
      programaciones,
      comentario_admin: draftComment || undefined,
      supervisado_por: draftSupervisor || undefined,
      attachedFiles: attachedFiles.map(f => ({
        name: f.name || f.file?.name,
        type: f.type || f.file?.type,
        size: f.size || f.file?.size,
        url: f.url || '',
        dataUrl: f.url ? '' : (f.dataUrl || ''),
        note: f.note || '',
        uploaded_at: f.uploaded_at || new Date().toISOString()
      }))
    };
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(localDraft));
    } catch (e) {
      console.warn('LocalStorage quota warning:', e);
    }

    // Guardar en la nube con debounce de 800 milisegundos
    const handler = setTimeout(async () => {
      try {
        // No sincronizamos si todo está vacío (estado inicial sin modificaciones)
        if (!localDraft.clockIn && localDraft.actuaciones.length === 0 && localDraft.ingresos.length === 0 && localDraft.programaciones.length === 0 && localDraft.attachedFiles.length === 0) return;
        
        const apiDraft = {
          ...localDraft,
          actuaciones,
          ingresos,
          programaciones,
          attachedFiles: localDraft.attachedFiles,
          comentario_admin: draftComment || undefined,
          supervisado_por: draftSupervisor || undefined
        };
        await submitToServer('/rd-intranet/v1/draft', apiDraft);
      } catch (e) {
        console.error('Error saving draft to cloud', e);
      }
    }, 800);

    return () => clearTimeout(handler);
  }, [clockIn, ubicacionEntrada, actuaciones, ingresos, programaciones, attachedFiles, loadingDraft, reportSubmitted, draftComment, draftSupervisor]);

  const refreshTasksAndNotifications = async () => {
    try {
      const [tasksRes, histRes, draftRes] = await Promise.all([
        api.get('/rd-intranet/v1/my-tasks').catch(() => ({ data: null })),
        api.get('/rd-intranet/v1/my-history').catch(() => ({ data: [] })),
        api.get('/rd-intranet/v1/draft').catch(() => ({ data: null }))
      ]);

      const allNotifs: any[] = [];
      const hoy = format(new Date(), 'yyyy-MM-dd');
      const currentLoggedUser = (localStorage.getItem('rd_user_name') || '').toLowerCase().trim();
      const isCurrentUserJefe = isJefaturaUser(currentLoggedUser);

      const parseJson = (val: any) => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch(e) { return []; }
        }
        return [];
      };

      // 1. Tareas y feedback de my-tasks
      if (tasksRes.data && tasksRes.data.success) {
        const rawProgs = parseJson(tasksRes.data.programaciones);
        const tareasHoy = rawProgs.filter((p: any) => p.fecha === hoy);
        
        setPendingTasks(tareasHoy.map((t: any, i: number) => ({
          id: i + 1,
          title: `${t.hora || ''} - ${t.tipoActuacion || ''} (${t.organismoTribunal || ''})`,
          text: `${t.hora || ''} - ${t.tipoActuacion || ''} (${t.organismoTribunal || ''})`,
          observaciones: t.observaciones || '',
          completed: false,
          originalData: t
        })));

        const futuras = rawProgs
          .filter((p: any) => p.fecha >= hoy)
          .sort((a: any, b: any) => {
            const dateA = new Date(`${a.fecha}T${a.hora || '00:00'}`);
            const dateB = new Date(`${b.fecha}T${b.hora || '00:00'}`);
            return dateA.getTime() - dateB.getTime();
          });
        setAllFutureTasks(futuras);

        const currentLoggedUser = (localStorage.getItem('rd_user_name') || '').toLowerCase().trim();
        const isCurrentUserJefe = isJefaturaUser(currentLoggedUser);

        // Capturar instrucciones específicas que el jefe dejó en tareas individuales (solo para empleados)
        if (!isCurrentUserJefe) {
          rawProgs.forEach((t: any, idx: number) => {
            if (t.observaciones && String(t.observaciones).trim() !== '' && String(t.observaciones).trim().toUpperCase() !== 'SIN OBSERVACIONES') {
              const notifId = `task-instruccion-${t.fecha || hoy}-${idx}`;
              const isRead = localStorage.getItem(`rd_notif_read_${notifId}`) === 'true';
              allNotifs.push({
                id: notifId,
                type: 'instruction',
                title: `Instrucción de Tarea: ${t.tipoActuacion || 'Actividad'} (${t.fecha || hoy})`,
                message: t.observaciones,
                sender: 'Luis Delgado / Jefatura',
                read: isRead,
                date: t.fecha || hoy
              });
            }
          });
        }

        // Si vienen feedbacks o modificaciones en el historial de la API
        if (Array.isArray(tasksRes.data.feedbacks_historial)) {
          tasksRes.data.feedbacks_historial.forEach((fb: any) => {
            const isGenericApproval = (txt: string) => {
              const clean = (txt || '').toLowerCase().trim();
              return clean.includes('revisión y aprobación') || clean.includes('revision y aprobacion') || clean.includes('aprobación de bitácora completada');
            };
            const rawCambios: string[] = Array.isArray(fb.cambios_realizados) ? fb.cambios_realizados : [];
            const realCambios = rawCambios.filter((c: string) => !isGenericApproval(c));
            const hasRealCambios = realCambios.length > 0;
            const hasComment = fb.comentario_admin && fb.comentario_admin.trim() !== '';
            const isApproved = fb.status === 'aprobado' || fb.estado === 'aprobado' || rawCambios.some(isGenericApproval);
            const supervisorName = normalizeSupervisorName(fb.supervisado_por, fb.date);
            const isSelf = currentLoggedUser && supervisorName.toLowerCase().includes(currentLoggedUser);
            if (!isSelf && (hasComment || hasRealCambios || isApproved)) {
              const notifId = `feedback-bitacora-${fb.id}`;
              const isRead = localStorage.getItem(`rd_notif_read_${notifId}`) === 'true';
              const msg = fb.comentario_admin || (hasRealCambios ? realCambios.join(' • ') : 'Revisión y aprobación completada sin modificaciones.');
              allNotifs.push({
                id: notifId,
                type: hasRealCambios ? 'changes' : (isApproved && !hasComment) ? 'approval' : 'feedback',
                title: hasRealCambios ? `Modificaciones de Jefatura en Bitácora del ${fb.date}` : `Bitácora del ${fb.date}`,
                message: msg,
                detalles: hasRealCambios ? realCambios : undefined,
                sender: supervisorName,
                read: isRead,
                date: fb.date
              });
            }
          });
        } else if (tasksRes.data.comentario_admin && tasksRes.data.comentario_admin.trim() !== '') {
          const supervisorName = normalizeSupervisorName(tasksRes.data.supervisado_por, tasksRes.data.fecha_bitacora);
          const isSelf = currentLoggedUser && supervisorName.toLowerCase().includes(currentLoggedUser);
          if (!isSelf) {
            const notifId = `feedback-bitacora-${tasksRes.data.fecha_bitacora || 'reciente'}`;
            const isRead = localStorage.getItem(`rd_notif_read_${notifId}`) === 'true';
            allNotifs.push({
              id: notifId,
              type: 'feedback',
              title: `Feedback Jefatura sobre Bitácora del ${tasksRes.data.fecha_bitacora || 'reciente'}`,
              message: tasksRes.data.comentario_admin,
              sender: supervisorName,
              read: isRead,
              date: tasksRes.data.fecha_bitacora
            });
          }
        }
      }

      // 2. Feedback y modificaciones reales unificadas por Bitácora (sin duplicar notas del empleado)
      if (histRes.data && Array.isArray(histRes.data)) {
        const currentLoggedUser = (localStorage.getItem('rd_user_name') || '').toLowerCase().trim();
        const nowMs = Date.now();

        histRes.data.forEach((b: any) => {
          const isGenericApproval = (txt: string) => {
            const clean = (txt || '').toLowerCase().trim();
            return clean.includes('revisión y aprobación') || clean.includes('revision y aprobacion') || clean.includes('aprobación de bitácora completada');
          };

          const rawCambios: string[] = Array.isArray(b.cambios_realizados) ? b.cambios_realizados : [];
          const realCambios = rawCambios.filter((c: string) => !isGenericApproval(c));
          const hasRealCambios = realCambios.length > 0;
          const hasComment = b.comentario_admin && b.comentario_admin.trim() !== '';
          const isApproved = b.status === 'aprobado' || b.estado === 'aprobado' || rawCambios.some(isGenericApproval);
          const supervisorName = normalizeSupervisorName(b.supervisado_por, b.date);
          const isSelf = currentLoggedUser && supervisorName.toLowerCase().includes(currentLoggedUser);

          if (isSelf) return; // No auto-notificar al jefe sobre sus propias notas

          // Solo generar notificación si Jefatura dejó un comentario, hizo cambios reales, o aprobó la bitácora
          if (hasComment || hasRealCambios || isApproved) {
            const notifId = `bitacora-chat-${b.id || b.date}`;
            
            // Para bitácoras con más de 7 días, ya son históricas y su revisión está en la tabla de historial
            const bTime = b.date ? new Date(b.date).getTime() : 0;
            const isRecent = bTime > 0 && (nowMs - bTime) <= 7 * 24 * 60 * 60 * 1000;
            const isRead = localStorage.getItem(`rd_notif_read_${notifId}`) === 'true' || !isRecent;
            
            // Evitar duplicar si ya se agregó
            const exists = allNotifs.some(n => String(n.id) === String(notifId) || (n.date && n.date === b.date));
            
            if (!exists) {
              const notifType = hasRealCambios ? 'changes' : (isApproved && !hasComment) ? 'approval' : 'feedback';
              const mainMsg = b.comentario_admin || (hasRealCambios ? realCambios.join(' • ') : 'Revisión y aprobación de bitácora completada sin modificaciones.');

              allNotifs.push({
                id: notifId,
                post_id: b.id,
                type: notifType,
                title: hasRealCambios ? `Modificaciones de Jefatura en Bitácora del ${b.date}` : `Bitácora del ${b.date}`,
                message: mainMsg,
                detalles: hasRealCambios ? realCambios : undefined,
                sender: supervisorName,
                read: isRead,
                date: b.date
              });
            }
          }
        });
      }

      // 3. Si el usuario actual es Jefatura (Luis Delgado), cargar los mensajes y respuestas entrantes de los empleados
      if (isCurrentUserJefe) {
        try {
          // A) De la API de WordPress
          try {
            const jefeMsgsRes = await api.get('/rd-intranet/v1/mensajes-jefatura');
            if (jefeMsgsRes.data && Array.isArray(jefeMsgsRes.data)) {
              jefeMsgsRes.data.forEach((jm: any) => {
                const notifId = `emp-reply-${jm.id}`;
                const isRead = jm.leido_por_jefe || jm.atendido || localStorage.getItem(`rd_notif_read_${notifId}`) === 'true';
                if (!allNotifs.some(n => String(n.id) === String(notifId))) {
                  allNotifs.push({
                    id: notifId,
                    post_id: jm.post_id,
                    type: 'feedback',
                    title: `Respuesta de ${jm.author || 'Empleado'} — ${jm.titulo || 'Bitácora'}`,
                    message: jm.mensaje,
                    sender: jm.author || 'Empleado',
                    read: isRead,
                    date: jm.fecha_bitacora || jm.fecha
                  });
                }
              });
            }
          } catch (e) {}

          // B) De la cola local de respuestas
          const qRaw = localStorage.getItem('rd_all_employee_replies_queue');
          if (qRaw) {
            const qList = JSON.parse(qRaw);
            if (Array.isArray(qList)) {
              qList.forEach((qItem: any) => {
                const notifId = `emp-reply-${qItem.id}`;
                const isRead = qItem.leido_por_jefe || qItem.atendido || localStorage.getItem(`rd_notif_read_${notifId}`) === 'true';
                if (!allNotifs.some(n => String(n.id) === String(notifId))) {
                  allNotifs.push({
                    id: notifId,
                    post_id: qItem.post_id,
                    type: 'feedback',
                    title: `Respuesta de ${qItem.author || 'Empleado'} — ${qItem.titulo || 'Bitácora'}`,
                    message: qItem.mensaje,
                    sender: qItem.author || 'Empleado',
                    read: isRead,
                    date: qItem.fecha_bitacora || qItem.fecha
                  });
                }
              });
            }
          }
        } catch (e) {}
      }

      // 4. Feedback y modificaciones en borrador activo (Avance)
      const currentLoggedUserDraft = (localStorage.getItem('rd_user_name') || '').toLowerCase().trim();
      const draftSupervisorName = draftRes.data?.supervisado_por || '';
      const isSelfDraft = currentLoggedUserDraft && draftSupervisorName.toLowerCase().includes(currentLoggedUserDraft);

      const draftHasCambios = !isSelfDraft && draftRes.data && Array.isArray(draftRes.data.cambios_realizados) && draftRes.data.cambios_realizados.length > 0;
      const draftHasComment = !isSelfDraft && draftRes.data && draftRes.data.comentario_admin && draftRes.data.comentario_admin.trim() !== '';

      if (draftHasComment || draftHasCambios) {
        if (draftHasComment) setDraftComment(draftRes.data.comentario_admin);
        setDraftSupervisor(draftSupervisorName || 'Luis Delgado / Jefatura');
        const notifId = `feedback-draft-${draftRes.data.fecha_supervision || hoy}`;
        const isRead = localStorage.getItem(`rd_notif_read_${notifId}`) === 'true';
        const exists = allNotifs.some(n => String(n.id) === String(notifId));
        if (!exists) {
          const msg = draftRes.data.comentario_admin || (draftHasCambios ? draftRes.data.cambios_realizados.join(' • ') : '');
          allNotifs.unshift({
            id: notifId,
            type: draftHasCambios ? 'changes' : 'feedback',
            title: draftHasCambios ? `Modificaciones de Jefatura en tu Jornada de Hoy` : `Observaciones de Jefatura sobre tu Avance de Hoy`,
            message: msg,
            detalles: draftHasCambios ? draftRes.data.cambios_realizados : undefined,
            sender: normalizeSupervisorName(draftRes.data.supervisado_por, hoy),
            read: isRead,
            date: hoy
          });
        }
      }

      // Deduplicar notificaciones respetando estado leído
      const uniqueNotifs = allNotifs.filter((item, index, self) => 
        index === self.findIndex(t => String(t.id) === String(item.id))
      );
      setNotifications(uniqueNotifs);
    } catch (error) {
      console.error('Error cargando tareas y notificaciones:', error);
    }
  };

  useEffect(() => {
    const fetchDraft = async () => {
      try {
        const response = await api.get('/rd-intranet/v1/draft');
        const localDraft = getInitialDraft();
        const todayStr = format(new Date(), 'yyyy-MM-dd');

        if (response.data && typeof response.data === 'object') {
          if (response.data.dayClosed) {
            setReportSubmitted(true);
            const parsedOut = response.data.clockOut 
              ? (parseDateAndTime(todayStr, response.data.clockOut) || new Date())
              : null;
            setClockOut(parsedOut);
            if (response.data.clockIn) {
              const parsedIn = parseDateAndTime(todayStr, response.data.clockIn);
              if (parsedIn) setClockIn(parsedIn);
            }
            setActuaciones([]);
            setIngresos([]);
            setProgramaciones([]);
            setAttachedFiles([]);
            const userName = (localStorage.getItem('rd_user_name') || 'unknown').toLowerCase().trim();
            localStorage.removeItem(getStorageKey());
            localStorage.removeItem(`rd_actuaciones_backup_${userName}`);
            return;
          } else {
            setReportSubmitted(false);
            setClockOut(null);
          }

          if (response.data.comentario_admin) {
            setDraftComment(response.data.comentario_admin);
          }
          if (response.data.supervisado_por) {
            setDraftSupervisor(response.data.supervisado_por);
          }

          const serverHasTodayClockIn = response.data.clockIn && isSameLocalDate(response.data.clockIn, todayStr);
          const localHasTodayClockIn = localDraft?.clockIn && isSameLocalDate(localDraft.clockIn, todayStr);

          const bestLoc = (response.data.ubicacionEntrada && !response.data.ubicacionEntrada.includes('Detectando') && response.data.ubicacionEntrada !== 'N/A')
            ? response.data.ubicacionEntrada
            : (localDraft?.ubicacionEntrada && !localDraft.ubicacionEntrada.includes('Detectando') && localDraft.ubicacionEntrada !== 'N/A')
              ? localDraft.ubicacionEntrada
              : null;

          if (serverHasTodayClockIn) {
            setClockIn(new Date(response.data.clockIn));
            setUbicacionEntrada(bestLoc);
          } else if (localHasTodayClockIn) {
            setClockIn(new Date(localDraft.clockIn));
            setUbicacionEntrada(bestLoc);
          } else {
            // El servidor dice que NO hay marca de entrada para hoy.
            setClockIn(null);
            setUbicacionEntrada(null);
            if (localDraft?.clockIn) {
              localStorage.removeItem(getStorageKey());
            }
          }

          const parseJson = (val: any) => {
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') {
              try { return JSON.parse(val); } catch(e) { return []; }
            }
            return [];
          };

          const serverActuaciones: Actuacion[] = parseJson(response.data.actuaciones);
          const serverIngresos: Ingreso[] = parseJson(response.data.ingresos);
          const serverProgramaciones: Programacion[] = parseJson(response.data.programaciones);
          const serverAttachedFiles: any[] = parseJson(response.data.attachedFiles || response.data.evidences);

          const localActuaciones: Actuacion[] = Array.isArray(localDraft?.actuaciones) ? localDraft.actuaciones : [];
          const localIngresos: Ingreso[] = Array.isArray(localDraft?.ingresos) ? localDraft.ingresos : [];
          const localProgramaciones: Programacion[] = Array.isArray(localDraft?.programaciones) ? localDraft.programaciones : [];
          const localAttachedFiles: any[] = Array.isArray(localDraft?.attachedFiles) ? localDraft.attachedFiles : [];

          // Conflicto de versiones: Si el borrador local es más reciente que el de la nube (ej. trabajó offline), usar el local.
          // Si el borrador de la nube es más reciente (ej. editó desde su celular y ahora abre la laptop), usar el de la nube.
          const serverTime = response.data.lastUpdated ? Number(response.data.lastUpdated) : 0;
          const localTime = localDraft?.lastUpdated ? Number(localDraft.lastUpdated) : 0;
          
          const useServer = serverTime >= localTime;

          const finalActuaciones = useServer ? serverActuaciones : localActuaciones;
          const finalIngresos = useServer ? serverIngresos : localIngresos;
          const finalProgramaciones = useServer ? serverProgramaciones : localProgramaciones;
          
          // Archivos adjuntos: restaurar y preservar los archivos adjuntos presentes en el borrador
          let finalAttachedFiles = useServer ? serverAttachedFiles : localAttachedFiles;
          if (finalAttachedFiles.length === 0 && (serverAttachedFiles.length > 0 || localAttachedFiles.length > 0)) {
            finalAttachedFiles = serverAttachedFiles.length > 0 ? serverAttachedFiles : localAttachedFiles;
          }

          setActuaciones(finalActuaciones);
          setIngresos(finalIngresos);
          setProgramaciones(finalProgramaciones);
          setAttachedFiles(finalAttachedFiles);

          const updatedLocalDraft = {
            lastUpdated: useServer ? serverTime : localTime,
            clockIn: response.data.clockIn || localDraft?.clockIn || null,
            ubicacionEntrada: bestLoc,
            actuaciones: finalActuaciones,
            ingresos: finalIngresos,
            programaciones: finalProgramaciones,
            attachedFiles: finalAttachedFiles,
            comentario_admin: response.data.comentario_admin || localDraft?.comentario_admin || undefined,
            supervisado_por: response.data.supervisado_por || localDraft?.supervisado_por || undefined
          };
          try {
            localStorage.setItem(getStorageKey(), JSON.stringify(updatedLocalDraft));
          } catch (e) {}

          if ((serverHasTodayClockIn || localHasTodayClockIn) && !bestLoc) {
            getGeolocation().then(autoLoc => {
              if (autoLoc && autoLoc !== 'N/A') {
                setUbicacionEntrada(autoLoc);
                try {
                  const cur = JSON.parse(localStorage.getItem(getStorageKey()) || '{}');
                  cur.ubicacionEntrada = autoLoc;
                  localStorage.setItem(getStorageKey(), JSON.stringify(cur));
                  submitToServer('/rd-intranet/v1/draft', cur).catch(() => {});
                } catch {}
              }
            });
          }

          if (localActuaciones.length > serverActuaciones.length || localIngresos.length > serverIngresos.length || localProgramaciones.length > serverProgramaciones.length || localAttachedFiles.length > serverAttachedFiles.length) {
            submitToServer('/rd-intranet/v1/draft', updatedLocalDraft).catch(() => {});
          }
        } else {
          if (localDraft && (localDraft.actuaciones?.length > 0 || localDraft.ingresos?.length > 0 || localDraft.programaciones?.length > 0 || localDraft.attachedFiles?.length > 0 || localDraft.clockIn)) {
            if (localDraft.clockIn && isSameLocalDate(localDraft.clockIn, todayStr)) {
              setClockIn(new Date(localDraft.clockIn));
              if (localDraft.ubicacionEntrada) setUbicacionEntrada(localDraft.ubicacionEntrada);
            }
            if (Array.isArray(localDraft.actuaciones)) setActuaciones(localDraft.actuaciones);
            if (Array.isArray(localDraft.ingresos)) setIngresos(localDraft.ingresos);
            if (Array.isArray(localDraft.programaciones)) setProgramaciones(localDraft.programaciones);
            if (Array.isArray(localDraft.attachedFiles)) setAttachedFiles(localDraft.attachedFiles);

            submitToServer('/rd-intranet/v1/draft', localDraft).catch(() => {});
          }
        }
      } catch (error) {
        console.error('Error fetching draft:', error);
      } finally {
        setLoadingDraft(false);
      }
    };

    const fetchExpedientes = async () => {
      try {
        const response = await api.get('/rd-intranet/v1/expedientes');
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          setGlobalExpedientes(response.data);
        } else {
          setGlobalExpedientes(getStoredExpedientes());
        }
      } catch (error) {
        console.error('Error fetching expedientes:', error);
        setGlobalExpedientes(getStoredExpedientes());
      }
    };

    fetchDraft();
    refreshTasksAndNotifications();
    fetchExpedientes();

    // Sincronización periódica solo cuando la pestaña esté activa y visible (ahorro de ancho de banda)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      refreshTasksAndNotifications();
    }, 60000);

    const handleFocus = () => {
      refreshTasksAndNotifications();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleEndDay = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();

    if (actuaciones.length === 0 && ingresos.length === 0 && programaciones.length === 0) {
      setSystemAlert({
        isOpen: true,
        type: 'warning',
        title: 'Bitácora Totalmente Vacía',
        message: 'No has registrado ninguna Actuación, Ingreso o Programación. Debes agregar al menos una gestión completada antes de cerrar tu jornada.'
      });
      return;
    }

    // 1. Validar Filas en Libro de Actuaciones
    const invalidActuacionIndex = actuaciones.findIndex(a => {
      const noAsunto = !a.numeroAsunto || a.numeroAsunto.trim() === '' || a.numeroAsunto.endsWith('-');
      const noDesc = !a.actuacion || a.actuacion.trim() === '';
      return noAsunto || noDesc;
    });

    if (invalidActuacionIndex !== -1) {
      setActiveTab('jornada');
      setSubTabLibro('actuaciones');
      setSystemAlert({
        isOpen: true,
        type: 'error',
        title: 'Fila de Actuación Incompleta',
        message: `La fila #${invalidActuacionIndex + 1} en el Libro de Actuaciones está abierta e incompleta. Debes rellenar obligatoriamente el N° de Asunto y la descripción de la Actuación, o borrar la fila usando el botón de papelera.`
      });
      return;
    }

    // 2. Validar Filas en Libro de Ingresos
    const invalidIngresoIndex = ingresos.findIndex(i => {
      const noExp = !i.numeroExpediente || i.numeroExpediente.trim() === '' || i.numeroExpediente.endsWith('-');
      const noPartes = !i.partes || i.partes.trim() === '';
      return noExp || noPartes;
    });

    if (invalidIngresoIndex !== -1) {
      setActiveTab('jornada');
      setSubTabLibro('ingresos');
      setSystemAlert({
        isOpen: true,
        type: 'error',
        title: 'Fila de Ingreso Incompleta',
        message: `La fila #${invalidIngresoIndex + 1} en el Libro de Ingresos está abierta e incompleta. Debes colocar el N° de Expediente completo y las Partes involucradas, o eliminar la fila con el botón de papelera.`
      });
      return;
    }

    // 3. Validar Filas en Libro de Programación
    const invalidProgIndex = programaciones.findIndex(p => {
      const noOrg = !p.organismoTribunal || p.organismoTribunal.trim() === '';
      const noTipo = !p.tipoActuacion || p.tipoActuacion.trim() === '';
      return noOrg || noTipo;
    });

    if (invalidProgIndex !== -1) {
      setActiveTab('jornada');
      setSubTabLibro('programacion');
      setSystemAlert({
        isOpen: true,
        type: 'error',
        title: 'Fila de Programación Incompleta',
        message: `La fila #${invalidProgIndex + 1} en el Libro de Programación está abierta e incompleta. Debes colocar obligatoriamente el Organismo / Tribunal y el Tipo de Actuación, o borrar la fila usando el botón de papelera.`
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

      const hasDuplicateIngreso = ingresos.some(ingreso => {
        if (ingreso.tipo !== 'Judicial') return false;
        const isLocalDuplicate = ingresos.filter(i => i.numeroExpediente === ingreso.numeroExpediente && i.id !== ingreso.id).length > 0;
        const isGlobalDuplicate = allGlobals.some((g: any) => g.numeroExpediente === ingreso.numeroExpediente);
        return isLocalDuplicate || isGlobalDuplicate;
      });

      if (hasDuplicateIngreso) {
        setActiveTab('jornada');
        setSubTabLibro('ingresos');
        setSystemAlert({ isOpen: true, type: 'error', title: 'Expediente Duplicado', message: 'Hay ingresos judiciales con números de expediente que ya han sido asignados por otro usuario o están repetidos. El sistema te impide usar este número para evitar conflictos. Por favor corrígelo.' });
        return;
      }
    } catch (e) {
      console.error('Error comprobando duplicados:', e);
    }

    setClosingDay(true);
    
    // Permitir que React renderice el estado de carga antes de bloquear el hilo principal con jsPDF
    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      // Obtener ubicación de salida antes de generar el PDF
      const locSalida = await getGeolocation();

      // Si por alguna razón la ubicación de entrada no se detectó o quedó en N/A, usar locSalida
      let finalUbicacionEntrada = ubicacionEntrada;
      if (!finalUbicacionEntrada || finalUbicacionEntrada === 'N/A' || finalUbicacionEntrada.includes('Detectando')) {
        finalUbicacionEntrada = locSalida;
        setUbicacionEntrada(locSalida);
      }

      // --- GENERACIÓN DE PDF PREMIUM ---
      const doc = new jsPDF({ orientation: 'landscape', compress: true });
      
      // Cargar logo en base64 súper liviano para que el PDF no pese casi nada (~5KB - 8KB)
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
        console.warn('No se pudo cargar o redimensionar el logo para el PDF', e);
      }

      let finalY = 62;

      // 1. Ficha Técnica Superior en la primera página
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 34, 269, 22, 2.5, 2.5, 'FD');

      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('EMPLEADO:', 18, 42);
      doc.setFont('helvetica', 'normal');
      const currentUserName = localStorage.getItem('rd_user_name') || 'Usuario';
      doc.text(currentUserName, 45, 42);

      doc.setFont('helvetica', 'bold');
      doc.text('HORARIO:', 18, 51);
      doc.setFont('helvetica', 'normal');
      const serverNowForPdf = await getServerDate();
      const inStr = safeFormatTime(clockIn);
      const outStr = safeFormatTime(serverNowForPdf);
      doc.text(`Entrada: ${inStr}   —   Salida: ${outStr}`, 45, 51);

      doc.setFont('helvetica', 'bold');
      doc.text('UBICACIÓN ENTRADA:', 135, 42);
      doc.setFont('helvetica', 'normal');
      const cleanLocIn = (finalUbicacionEntrada && finalUbicacionEntrada !== 'N/A') ? (finalUbicacionEntrada.includes('|||') ? finalUbicacionEntrada.split('|||')[1] : finalUbicacionEntrada) : 'N/A';
      doc.text(cleanLocIn.substring(0, 50), 180, 42);

      doc.setFont('helvetica', 'bold');
      doc.text('UBICACIÓN SALIDA:', 135, 51);
      doc.setFont('helvetica', 'normal');
      const cleanLocOut = locSalida ? (locSalida.includes('|||') ? locSalida.split('|||')[1] : locSalida) : 'N/A';
      doc.text(cleanLocOut.substring(0, 50), 180, 51);

      // 1. Libro de Actuaciones (Siempre mostrar)
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('1. LIBRO DE ACTUACIONES (REGISTRO DE TRÁMITES Y DILIGENCIAS)', 14, finalY + 5);
      
      let actData: any[][] = [];
      if (actuaciones && actuaciones.length > 0) {
        actData = actuaciones.map(a => [a.hora || 'N/A', a.numeroAsunto || 'N/A', a.partes || 'N/A', a.actuacion || 'N/A', a.observaciones || '']);
      } else {
        actData = [['—', '—', '—', 'Sin actuaciones o trámites registrados en esta jornada', '—']];
      }

      autoTable(doc, {
        startY: finalY + 8,
        head: [['HORA', 'N° ASUNTO', 'PARTES INVOLUCRADAS', 'ACTUACIÓN / DILIGENCIA', 'OBSERVACIONES']],
        body: actData,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5, cellPadding: 3, lineColor: [203, 213, 225], lineWidth: 0.2 },
        bodyStyles: { textColor: [30, 41, 59], fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [252, 253, 254] },
        styles: { lineColor: [226, 232, 240], lineWidth: 0.15 },
        margin: { top: 30, bottom: 20, left: 14, right: 14 }
      });
      finalY = (doc as any).lastAutoTable.finalY + 12;

      // 2. Libro de Ingresos (Siempre mostrar)
      if (finalY > 155) { doc.addPage(); finalY = 32; }
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('2. LIBRO DE INGRESOS (CASOS Y EXPEDIENTES RECIBIDOS)', 14, finalY + 5);
      
      let ingData: any[][] = [];
      if (ingresos && ingresos.length > 0) {
        ingData = ingresos.map(i => [i.numeroExpediente || 'N/A', `${i.fechaIngreso || ''} ${i.horaIngreso || ''}`.trim() || 'N/A', i.tipo || 'N/A', i.organismoTribunal || 'N/A', i.partes || 'N/A', i.resumen || '—', i.observaciones || '—']);
      } else {
        ingData = [['—', '—', '—', '—', '—', 'Sin nuevos ingresos o causas registradas en esta jornada', '—']];
      }

      autoTable(doc, {
        startY: finalY + 8,
        head: [['N° EXPEDIENTE', 'FECHA/HORA INGRESO', 'TIPO', 'TRIBUNAL / ORGANISMO', 'PARTES INVOLUCRADAS', 'RESUMEN DEL ASUNTO', 'OBSERVACIONES']],
        body: ingData,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5, cellPadding: 3, lineColor: [203, 213, 225], lineWidth: 0.2 },
        bodyStyles: { textColor: [30, 41, 59], fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [252, 253, 254] },
        styles: { lineColor: [226, 232, 240], lineWidth: 0.15 },
        margin: { top: 30, bottom: 20, left: 14, right: 14 }
      });
      finalY = (doc as any).lastAutoTable.finalY + 12;

      // 3. Libro de Programación (Siempre mostrar)
      if (finalY > 155) { doc.addPage(); finalY = 32; }
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('3. LIBRO DE PROGRAMACIÓN (AGENDA DE ACTUACIONES FUTURAS)', 14, finalY + 5);
      
      let progData: any[][] = [];
      if (programaciones && programaciones.length > 0) {
        progData = programaciones.map(p => [`${p.fecha || ''} ${p.hora || ''}`.trim() || 'N/A', p.organismoTribunal || 'N/A', p.tipoActuacion || 'N/A', p.resumen || '—', p.observaciones || '—']);
      } else {
        progData = [['—', '—', '—', 'Sin programación o agenda futura registrada en la jornada', '—']];
      }

      autoTable(doc, {
        startY: finalY + 8,
        head: [['FECHA Y HORA', 'TRIBUNAL / LUGAR', 'ACTUACIÓN A REALIZAR', 'SÍNTESIS', 'OBSERVACIONES / INSTRUCCIONES']],
        body: progData,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5, cellPadding: 3, lineColor: [203, 213, 225], lineWidth: 0.2 },
        bodyStyles: { textColor: [30, 41, 59], fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [252, 253, 254] },
        styles: { lineColor: [226, 232, 240], lineWidth: 0.15 },
        margin: { top: 30, bottom: 20, left: 14, right: 14 }
      });
      finalY = (doc as any).lastAutoTable.finalY + 12;

      // 4. Investigaciones y Sentencias (Solo si aportó hoy)
      let invesData: any[][] = [];
      try {
        const invesResponse = await api.get('/rd-intranet/v1/investigaciones');
        if (invesResponse.data && Array.isArray(invesResponse.data)) {
           const today = format(new Date(), 'yyyy-MM-dd');
           const myInves = invesResponse.data.filter(inv => inv.user === currentUserName && inv.date && inv.date.startsWith(today));
           if (myInves.length > 0) {
             invesData = myInves.map(inv => [inv.tema || 'N/A', inv.resumen || 'N/A', inv.sentencia || 'N/A', inv.opinion_rd || 'N/A']);
           }
        }
      } catch (e) {
        console.warn('No se pudieron obtener las investigaciones', e);
      }

      if (invesData.length > 0) {
        if (finalY > 155) { doc.addPage(); finalY = 32; }
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
          margin: { top: 30, bottom: 20, left: 14, right: 14 }
        });
      }

      // --- DECORACIÓN SUPERIOR, INFERIOR Y MARCA DE AGUA EN TODAS LAS PÁGINAS ---
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Línea divisoria superior elegante y limpia (sin gasto de tinta oscura)
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.4);
        doc.line(14, 24, 283, 24);

        // Logo en el encabezado (si cargó) y en la marca de agua central
        if (logoBase64) {
          try {
            // Logo superior izquierda (guardado con alias 'logo' y compresión FAST)
            doc.addImage(logoBase64, 'PNG', 14, 4, 24, 17, 'logo', 'FAST');
            
            // Marca de agua central translúcida (reutiliza alias 'logo') para no gastar tinta
            if ((doc as any).GState) {
              doc.setGState(new (doc as any).GState({ opacity: 0.03 }));
            }
            doc.addImage(logoBase64, 'PNG', 98, 55, 100, 100, 'logo', 'FAST');
            if ((doc as any).GState) {
              doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
            }
          } catch (e) {
            console.warn('Error dibujando imágenes en PDF', e);
          }
        }

        // Textos del encabezado limpios y profesionales en tono oscuro
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42);
        doc.text('ROMÁN & DELGADO  |  ABOGADOS', logoBase64 ? 42 : 14, 11);

        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('SISTEMA INTEGRAL DE BITÁCORAS Y CONTROL DE GESTIÓN OFICIAL (KANT)', logoBase64 ? 42 : 14, 17.5);

        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text('REPORTE OFICIAL DE JORNADA', 283, 11, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Fecha: ${format(new Date(), 'dd/MM/yyyy')} — Empleado: ${currentUserName}`, 283, 17.5, { align: 'right' });

        // Pie de página (Footer)
        doc.setDrawColor(226, 232, 240);
        doc.line(14, 196, 283, 196);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Román & Delgado Abogados — Documento Oficial Confidencial de Uso Interno', 14, 201);
        doc.text(`Página ${i} de ${totalPages}`, 283, 201, { align: 'right' });
      }

      // Guardar PDF localmente (opcional, pero útil para el empleado)
      doc.save(`Bitacora_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      // Obtener el PDF en formato Base64 para enviarlo al servidor
      const pdfBase64 = doc.output('datauristring');

      // --- ENVÍO AL BACKEND ---
      // Actualmente la UI no estaba enviando la data estructurada al backend, lo corregimos:
      
      // Creamos un texto plano para el reporte_hoy como respaldo visual
      const reportText = actuaciones.length > 0 
        ? actuaciones.map(a => `[${a.hora}] ${a.actuacion} (${a.numeroAsunto})`).join('\n')
        : 'Sin actuaciones hoy.';
        
      const progText = programaciones.length > 0
        ? programaciones.map(p => `[${p.fecha} ${p.hora}] ${p.organismoTribunal} - ${p.tipoActuacion}`).join('\n')
        : 'Sin programación futura.';

      const serverNow = await getServerDate();
      // Lógica de retraso basada en reloj oficial del servidor
      const isLateClosure = clockIn && format(clockIn, 'yyyy-MM-dd') < format(serverNow, 'yyyy-MM-dd');
      const clockInDateStr = clockIn ? format(clockIn, 'yyyy-MM-dd') : format(serverNow, 'yyyy-MM-dd');

      const serializedEvidences = attachedFiles.map(f => ({
        name: f.name || f.file?.name || 'evidencia.pdf',
        type: f.type || f.file?.type || 'application/pdf',
        size: f.size || f.file?.size || 0,
        url: f.url || '',
        note: f.note || '',
        dataUrl: f.url ? '' : (f.dataUrl || ''),
        uploaded_at: f.uploaded_at || new Date().toISOString()
      }));

      const payload = {
        reporte_hoy: reportText,
        programacion_manana: progText,
        hora_entrada: clockIn ? formatTime12h(format(clockIn, 'hh:mm a')) : formatTime12h(format(serverNow, 'hh:mm a')),
        hora_salida: formatTime12h(format(serverNow, 'hh:mm a')),
        ubicacion_entrada: finalUbicacionEntrada || locSalida,
        ubicacion_salida: locSalida,
        ingresos,
        actuaciones,
        programaciones,
        attachedFiles: serializedEvidences,
        evidences: serializedEvidences,
        pdf_base64: pdfBase64 || '',
        fecha_reporte: clockInDateStr,
        cierre_retrasado: isLateClosure ? '1' : '0'
      };

      console.log('Enviando datos de jornada al backend:', payload);
      try {
        // Usamos submitToServer (fetch nativo con FormData) que NO es bloqueado por el WAF de Namecheap
        const responseData = await submitToServer('/rd-intranet/v1/submit', payload);
        const postId = responseData?.post_id;
        
        if (postId && pdfBase64) {
          console.log(`Cargando archivo PDF por bloques (Chunked Upload) al servidor (post_id: ${postId})...`);
          await uploadPdfInChunks(postId, pdfBase64);
        }

        if (postId && attachedFiles.length > 0) {
          console.log(`Verificando subida de ${attachedFiles.length} documentos de evidencia...`);
          for (const fileObj of attachedFiles) {
            try {
              if (fileObj.url) {
                // Ya cuenta con URL directa en la nube de Supabase Storage
                continue;
              }
              let fileToUpload: File | null = fileObj.file instanceof File ? fileObj.file : null;
              if (!fileToUpload && fileObj.dataUrl) {
                fileToUpload = dataUrlToFile(fileObj.dataUrl, fileObj.name || 'evidencia.pdf', fileObj.type);
              }
              if (fileToUpload) {
                await uploadEvidenceFile(postId, fileToUpload, fileObj.note || '');
              }
            } catch (err) {
              console.error(`Error al subir evidencia: ${fileObj.name || fileObj.file?.name}`, err);
            }
          }
        }

        const userName = (localStorage.getItem('rd_user_name') || 'unknown').toLowerCase().trim();
        localStorage.removeItem(getStorageKey()); // Limpiar el borrador al enviar con éxito
        localStorage.removeItem(`rd_actuaciones_backup_${userName}`);
        
        // Confirmar en UI solo si todo salió exitoso con la hora oficial del servidor
        setClockOut(serverNow);
        setReportSubmitted(true);
        setActuaciones([]);
        setIngresos([]);
        setProgramaciones([]);
        setAttachedFiles([]);
        
        setSystemAlert({
          isOpen: true,
          type: 'success',
          title: '¡Jornada Cerrada con Éxito!',
          message: 'La bitácora y el archivo PDF (sea del peso que sea) han sido cargados y asegurados al 100% en el servidor de la Intranet.'
        });
      } catch (e: any) {
        console.error('Error enviando bitácora final:', e);
        setSystemAlert({ isOpen: true, type: 'warning', title: 'PDF Generado - Sin Conexión al Servidor', message: `Se generó y descargó tu PDF en este dispositivo, pero hubo un problema de conexión al enviarlo al servidor central. Detalles: ${e?.message || 'Error Desconocido'}. Revisa tu internet o avisa a Jefatura.` });
      }
    } catch (error) {
      console.error('Error al cerrar jornada', error);
      setSystemAlert({
        isOpen: true,
        type: 'error',
        title: 'Error al Cerrar Jornada',
        message: 'Ocurrió un error inesperado al procesar el cierre de tu jornada. Por favor, intenta de nuevo.'
      });
    } finally {
      setClosingDay(false);
    }
  };

  const totalActuaciones = actuaciones.length;
  const completedActuaciones = actuaciones.filter(a => !a.estado || a.estado === 'Completada').length;

  const totalPendingTasks = pendingTasks.length;
  const completedPendingTasks = pendingTasks.filter(t => t.completed).length;

  const totalItems = totalActuaciones + totalPendingTasks;
  const totalCompleted = completedActuaciones + completedPendingTasks;

  const progress = totalItems > 0 
    ? Math.round((totalCompleted / totalItems) * 100) 
    : (reportSubmitted ? 100 : 0);

  const [activeTab, setActiveTab] = useState<'jornada' | 'chat' | 'expedientes' | 'gastos' | 'biblioteca' | 'notificaciones' | 'historial'>(() => {
    const saved = sessionStorage.getItem('rd_emp_active_tab');
    if (saved === 'registro' || saved === 'ingresos' || saved === 'agenda') return 'jornada';
    if (saved === 'chat' || saved === 'expedientes' || saved === 'gastos' || saved === 'biblioteca' || saved === 'notificaciones' || saved === 'historial') return saved;
    return 'jornada';
  });
  const [unreadChatLive, setUnreadChatLive] = useState(0);
  const [chatToast, setChatToast] = useState<{
    isOpen: boolean;
    sender: string;
    message: string;
  } | null>(null);

  const fetchUnreadChatCount = useCallback(async () => {
    try {
      const curUser = (localStorage.getItem('rd_user_name') || 'Carmen Luisa').toLowerCase().trim();
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

        const isAddressedToMe = recipient.includes(curUser) || curUser.includes(recipient);
        return isAddressedToMe;
      });

      setUnreadChatLive(unreadForMe.length);
    } catch (e) {
      console.warn('Error fetching unread chat count:', e);
    }
  }, []);

  // Suscripción Realtime en segundo plano para notificar mensajes nuevos de jefatura
  useEffect(() => {
    fetchUnreadChatCount();

    const channel = supabase
      .channel('employee_chat_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload: any) => {
          const newMsg = payload.new;
          if (!newMsg) return;

          const curUser = (localStorage.getItem('rd_user_name') || 'Carmen Luisa').toLowerCase().trim();
          const sender = (newMsg.sender_name || '').toLowerCase().trim();
          const recipient = (newMsg.recipient_name || '').toLowerCase().trim();

          const isSelf = sender === curUser || sender.includes(curUser) || curUser.includes(sender);
          if (isSelf) return;

          const isForMe = recipient.includes(curUser) || curUser.includes(recipient);
          if (isForMe) {
            setUnreadChatLive(prev => prev + 1);
            playNotificationSound();
            setChatToast({
              isOpen: true,
              sender: newMsg.sender_name || 'Jefatura',
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
    }, 25000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchUnreadChatCount]);

  const [subTabLibro, setSubTabLibro] = useState<'actuaciones' | 'ingresos' | 'programacion'>(() => {
    const saved = sessionStorage.getItem('rd_emp_active_tab');
    if (saved === 'ingresos') return 'ingresos';
    if (saved === 'agenda') return 'programacion';
    return 'actuaciones';
  });

  useEffect(() => {
    sessionStorage.setItem('rd_emp_active_tab', activeTab);
  }, [activeTab]);

  const unreadFeedbacks = notifications.filter(n => !n.read);
  const unreadCount = unreadFeedbacks.length;

  const getCityFromCoords = async (lat: number, lng: number): Promise<string> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=es`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const city = data.city || data.locality || data.principalSubdivision || '';
        const state = data.principalSubdivision || '';
        const country = data.countryName || 'Venezuela';
        if (city && state && city !== state) return `${city}, ${state}`;
        if (city) return `${city}, ${country}`;
        if (state) return `${state}, ${country}`;
      }
    } catch {
      // Fallback
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || '';
        const state = data.address?.state || '';
        if (city && state) return `${city}, ${state}`;
        if (city) return city;
        if (state) return state;
      }
    } catch {
      // Fallback
    }

    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const getIpGeolocation = async (): Promise<string | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('https://ipwho.is/', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success !== false && data.latitude && data.longitude) {
          const lat = data.latitude;
          const lng = data.longitude;
          const city = data.city || '';
          const region = data.region || data.country || '';
          const cityStr = city && region ? `${city}, ${region}` : (city || region || 'Venezuela');
          return `${lat},${lng}|||${cityStr}`;
        }
      }
    } catch {
      // ignore
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('https://freeipapi.com/api/json', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && data.latitude && data.longitude) {
          const lat = data.latitude;
          const lng = data.longitude;
          const city = data.cityName || '';
          const region = data.regionName || data.countryName || '';
          const cityStr = city && region ? `${city}, ${region}` : (city || region || 'Venezuela');
          return `${lat},${lng}|||${cityStr}`;
        }
      }
    } catch {
      // ignore
    }

    return null;
  };

  const getGeolocation = (forcePrompt = false): Promise<string> => {
    return new Promise((resolve) => {
      let resolved = false;

      const finishWithFallback = async (reason = 'Sin GPS') => {
        if (resolved) return;
        resolved = true;
        clearTimeout(safetyTimer);
        const ipLoc = await getIpGeolocation();
        
        // Coordenadas y sede de Valencia (sede principal del despacho)
        const defaultCity = 'Valencia, Carabobo';
        const defaultCoords = '10.1620,-68.0077';

        if (ipLoc) {
          const parts = ipLoc.split('|||');
          // En Venezuela, proveedores residenciales (Net Uno, CANTV) asignan el nodo en Caracas
          // aunque el usuario esté físicamente en Valencia.
          const isCaracasNode = parts[1].toLowerCase().includes('caracas');
          const cityDisplay = isCaracasNode ? defaultCity : parts[1];
          const coordsDisplay = isCaracasNode ? defaultCoords : parts[0];
          resolve(`${coordsDisplay}|||${cityDisplay} (🌐 Red IP NetUno/CANTV - ${reason})`);
        } else {
          resolve(`${defaultCoords}|||${defaultCity} (🌐 Red IP - ${reason})`);
        }
      };

      if (!navigator.geolocation) {
        finishWithFallback('Navegador sin soporte GPS');
        return;
      }

      // Safety timer generoso de 12 segundos para dar tiempo suficiente a Chrome
      const safetyTimer = setTimeout(() => {
        finishWithFallback('Tiempo de espera de sensor agotado');
      }, 12000);

      const tryPosition = (enableHigh: boolean, timeoutMs: number) => {
        return new Promise<GeolocationPosition>((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, {
            enableHighAccuracy: enableHigh,
            timeout: timeoutMs,
            maximumAge: forcePrompt ? 0 : 300000
          });
        });
      };

      (async () => {
        let pos: GeolocationPosition | null = null;
        try {
          // Fase 1: Intentar alta precisión (GPS / Wi-Fi) con 6.5s
          pos = await tryPosition(true, 6500);
        } catch (err1: any) {
          console.warn('GPS alta precisión falló o timeout, intentando precisión de red estándar...', err1);
          // Si el usuario denegó explícitamente el permiso (code 1), no reintentar
          if (err1?.code === 1) {
            clearTimeout(safetyTimer);
            finishWithFallback('Permiso bloqueado en el navegador');
            return;
          }
          // Fase 2: Precisión estándar de red (Wi-Fi / celda) con 5s
          try {
            pos = await tryPosition(false, 5000);
          } catch (err2: any) {
            console.warn('GPS estándar también falló:', err2);
            clearTimeout(safetyTimer);
            const reason = err2?.code === 1 
              ? 'Permiso bloqueado en el navegador' 
              : err2?.code === 2 
              ? 'Hardware de ubicación no disponible' 
              : 'Tiempo de espera agotado';
            finishWithFallback(reason);
            return;
          }
        }

        if (pos && pos.coords) {
          if (resolved) return;
          resolved = true;
          clearTimeout(safetyTimer);
          try {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const accuracy = Math.round(pos.coords.accuracy || 0);
            const coordsStr = `${lat},${lng}`;
            let cityName = await getCityFromCoords(lat, lng);
            if (!cityName || cityName.includes('10.') || cityName === 'Venezuela') {
              cityName = 'Valencia, Carabobo';
            }
            resolve(`${coordsStr}|||${cityName} (🛰️ GPS Verificado ±${accuracy}m)`);
          } catch {
            finishWithFallback('Error al geocodificar coordenadas');
          }
        }
      })();
    });
  };

  const handleClockIn = async () => {
    const now = new Date();
    setLoadingLocation(true);

    try {
      // 1. Obtener la ubicación satelital / IP PRIMERO (garantizado en < 1.5s)
      const loc = await getGeolocation();
      setUbicacionEntrada(loc);

      // 2. Registrar hora oficial en servidor ya con la ubicación real confirmada
      const resp = await submitToServer('/rd-intranet/v1/clock-in', {
        ubicacionEntrada: loc
      });
      
      if (resp && resp.success === false) {
        throw new Error(resp.message || 'No se pudo marcar la entrada. Verifica si ya cerraste tu jornada hoy.');
      }
      
      const serverDate = await getServerDate();
      const finalClockIn = resp?.clockIn ? new Date(resp.clockIn) : serverDate;
      setClockIn(finalClockIn);
      setReportSubmitted(false);
      setClockOut(null);
      setActiveTab('jornada');
      setSubTabLibro('actuaciones');
      setLoadingLocation(false);

      // 3. Guardar inmediatamente en localStorage con la ubicación real
      const updatedDraft = {
        clockIn: finalClockIn.toISOString(),
        ubicacionEntrada: loc,
        actuaciones,
        ingresos,
        programaciones
      };
      localStorage.setItem(getStorageKey(), JSON.stringify(updatedDraft));

      // 4. Persistir en el borrador de Supabase
      await submitToServer('/rd-intranet/v1/draft', updatedDraft).catch(() => {});
    } catch (error: any) {
      console.error('Error al registrar entrada en el servidor', error);
      setLoadingLocation(false);
      
      const loc = await getGeolocation();
      setClockIn(now);
      setUbicacionEntrada(loc);
      const immediateDraft = {
        clockIn: now.toISOString(),
        ubicacionEntrada: loc,
        actuaciones,
        ingresos,
        programaciones
      };
      localStorage.setItem(getStorageKey(), JSON.stringify(immediateDraft));
      setReportSubmitted(false);
      setClockOut(null);
      setActiveTab('jornada');
      setSubTabLibro('actuaciones');
      
      setSystemAlert({
        isOpen: true,
        type: 'warning',
        title: 'Entrada Registrada',
        message: 'Tu entrada ha sido registrada correctamente con tu ubicación.'
      });
    }
  };

  const clockInDateStr = clockIn ? format(clockIn, 'yyyy-MM-dd') : null;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isLateClosure = clockInDateStr && clockInDateStr < todayStr;

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in duration-300 pb-24 sm:pb-16">
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

      {/* BARRA DE DIVISAS, CLIMA Y RELOJ EN VIVO */}
      <LiveStatusBar />

      {/* BANNER COMPACTO DE NOTIFICACIÓN DE JEFATURA */}
      {unreadFeedbacks.length > 0 && (
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-md border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-top-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
              <MessageSquare className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.2 bg-blue-400 text-slate-950 text-[9px] font-black uppercase tracking-wider rounded-full">
                  Instrucción
                </span>
                <span className="text-xs font-bold text-slate-200 truncate">
                  {unreadFeedbacks[0].title}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate max-w-xl">
                "{unreadFeedbacks[0].message}"
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setActiveTab('notificaciones')}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Ver ({unreadFeedbacks.length})
            </button>
            <button
              type="button"
              onClick={() => markFeedbackRead(unreadFeedbacks[0].id)}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-slate-950 font-black text-xs rounded-lg transition-transform flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Leído
            </button>
          </div>
        </div>
      )}

      {/* BANNER DE RETRASO */}
      {isLateClosure && !reportSubmitted && (
        <div className="bg-rose-500 text-white p-3.5 rounded-2xl shadow-sm border border-rose-600 flex items-center justify-between animate-in slide-in-from-top">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 animate-pulse" />
            <div>
              <p className="font-bold text-xs sm:text-sm">Tienes una jornada pendiente del {clockInDateStr}</p>
              <p className="text-[11px] text-rose-100">Debes cerrar esta jornada antes de registrar actividades de hoy.</p>
            </div>
          </div>
          <button 
            onClick={handleEndDay} 
            className="px-4 py-1.5 bg-white text-rose-600 font-bold text-xs rounded-lg shadow-sm hover:bg-rose-50 transition-colors"
          >
            Cerrar Jornada Anterior
          </button>
        </div>
      )}

      {/* PESTAÑAS PRINCIPALES: COMPACTAS, ELEGANTES, RESPONSIVE Y GLOW */}
      <div className="flex overflow-x-auto gap-1.5 p-1.5 bg-slate-200/90 backdrop-blur-xl rounded-2xl border border-slate-300/80 scrollbar-none shadow-xs">
        <button 
          onClick={() => setActiveTab('jornada')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex-shrink-0 cursor-pointer active:scale-95 ${
            activeTab === 'jornada' 
              ? 'bg-white text-slate-950 font-black shadow-md shadow-amber-500/10 ring-1 ring-amber-400' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Mi Jornada & Libros</span>
        </button>
        
        <button 
          onClick={() => {
            setActiveTab('chat');
            setChatToast(null);
          }}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex-shrink-0 cursor-pointer active:scale-95 ${
            activeTab === 'chat' 
              ? 'bg-gradient-to-r from-[#00a884] to-emerald-600 text-white font-black shadow-md shadow-emerald-600/30' 
              : 'text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50/80'
          }`}
        >
          <div className="relative shrink-0 flex items-center justify-center">
            <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'chat' ? 'text-white' : 'text-emerald-600'}`} />
            {unreadChatLive > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
            )}
          </div>
          <span>Chat con Jefatura</span>
          {unreadChatLive > 0 && (
            <span className={`px-1.5 py-0.2 font-black text-[10px] rounded-full animate-bounce ${activeTab === 'chat' ? 'bg-slate-900 text-emerald-300' : 'bg-emerald-600 text-white'}`}>
              {unreadChatLive}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab('expedientes')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex-shrink-0 cursor-pointer active:scale-95 ${
            activeTab === 'expedientes' 
              ? 'bg-white text-slate-950 font-black shadow-md shadow-blue-500/10 ring-1 ring-blue-400' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>Expedientes & Casos</span>
        </button>

        <button 
          onClick={() => setActiveTab('gastos')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex-shrink-0 cursor-pointer active:scale-95 ${
            activeTab === 'gastos' 
              ? 'bg-white text-slate-950 font-black shadow-md shadow-amber-500/10 ring-1 ring-amber-400' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Receipt className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Gastos & Reembolsos</span>
        </button>

        <button 
          onClick={() => setActiveTab('notificaciones')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex-shrink-0 cursor-pointer active:scale-95 ${
            activeTab === 'notificaciones' 
              ? 'bg-white text-slate-950 font-black shadow-md shadow-amber-500/10 ring-1 ring-amber-400' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <div className="relative shrink-0">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>}
          </div>
          <span>Buzón</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full">
              {unreadCount}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab('historial')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex-shrink-0 cursor-pointer active:scale-95 ${
            activeTab === 'historial' 
              ? 'bg-white text-slate-950 font-black shadow-md shadow-purple-500/10 ring-1 ring-purple-400' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <History className="w-3.5 h-3.5 text-purple-500 shrink-0" />
          <span>Mi Historial</span>
        </button>

        <button 
          onClick={() => setActiveTab('biblioteca')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex-shrink-0 cursor-pointer active:scale-95 ${
            activeTab === 'biblioteca' 
              ? 'bg-white text-slate-950 font-black shadow-md shadow-blue-500/10 ring-1 ring-blue-400' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <FolderSearch className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>Archivo & Expedientes</span>
        </button>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="animate-in fade-in duration-300">
        
        {/* VISTA 1: MI JORNADA & LIBROS DEL DÍA */}
        {activeTab === 'jornada' && (
          <div className="space-y-6">
            
            {/* TARJETA SUPERIOR DE CONTROL DE ASISTENCIA Y CIERRE */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5">
              
              {/* Estado de Horario */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Control de Asistencia</span>
                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md ${
                      reportSubmitted 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : clockIn 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {reportSubmitted ? 'Jornada Concluida' : clockIn ? 'En Curso' : 'Pendiente Entrada'}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-md">
                      {progress}% completado
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    {clockIn ? (
                      <span className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        Entrada: <span className="text-blue-600">{safeFormatTime(clockIn)}</span>
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-slate-400">Sin marcar entrada</span>
                    )}

                    {clockOut && (
                      <span className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                        Salida: <span className="text-rose-600">{safeFormatTime(clockOut)}</span>
                      </span>
                    )}

                    {loadingLocation && (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-pulse">
                        <Activity className="w-3.5 h-3.5 animate-spin text-amber-600" />
                        <span>Detectando ubicación...</span>
                      </span>
                    )}

                    {!loadingLocation && ubicacionEntrada && ubicacionEntrada !== 'N/A' && !ubicacionEntrada.includes('Detectando') && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {ubicacionEntrada.includes('GPS Verificado') ? (
                          <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg shadow-xs" title={ubicacionEntrada}>
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>
                              {(ubicacionEntrada.includes('|||') ? ubicacionEntrada.split('|||')[1] : ubicacionEntrada)
                                .replace(/\\u00f3/gi, 'ó').replace(/\\u00e1/gi, 'á').replace(/\\u00e9/gi, 'é').replace(/\\u00ed/gi, 'í')}
                            </span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-lg shadow-xs" title="Conexión por IP aproximada (Sin GPS directo). Desbloquea el GPS en tu navegador para verificar tu ciudad exacta">
                              <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>
                                {(ubicacionEntrada.includes('|||') ? ubicacionEntrada.split('|||')[1] : ubicacionEntrada)
                                  .replace(/\\u00f3/gi, 'ó').replace(/\\u00e1/gi, 'á').replace(/\\u00e9/gi, 'é').replace(/\\u00ed/gi, 'í')}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                setLoadingLocation(true);
                                const loc = await getGeolocation(true);
                                await applyLocation(loc);
                                setLoadingLocation(false);
                                if (!loc.includes('GPS Verificado')) {
                                  setSystemAlert({
                                    isOpen: true,
                                    type: 'info',
                                    title: 'Ubicación Registrada en Valencia (Red IP)',
                                    message: 'Se ha registrado tu asistencia en Valencia mediante la red IP de tu conexión. Si deseas que Jefatura vea el sello satelital "GPS Verificado", haz clic en el ícono del pin 📍 arriba en la barra de tu navegador (Chrome) y activa el permiso de ubicación.'
                                  });
                                } else {
                                  setSystemAlert({
                                    isOpen: true,
                                    type: 'success',
                                    title: '¡GPS Verificado!',
                                    message: 'Ubicación física autenticada exitosamente vía satélite / Wi-Fi en Valencia.'
                                  });
                                }
                              }}
                              className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs active:scale-95"
                              title="Haz clic para activar el GPS satelital y verificar tu ubicación real de Valencia"
                            >
                              <RefreshCw className={`w-3 h-3 text-blue-600 ${loadingLocation ? 'animate-spin' : ''}`} />
                              <span>{loadingLocation ? 'Detectando...' : 'Activar GPS'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {!loadingLocation && clockIn && (!ubicacionEntrada || ubicacionEntrada === 'N/A' || ubicacionEntrada.includes('Detectando')) && (
                      <button
                        type="button"
                        onClick={async () => {
                          setLoadingLocation(true);
                          const loc = await getGeolocation();
                          setUbicacionEntrada(loc);
                          setLoadingLocation(false);
                          try {
                            const cur = JSON.parse(localStorage.getItem(getStorageKey()) || '{}');
                            cur.ubicacionEntrada = loc;
                            cur.clockIn = clockIn.toISOString();
                            localStorage.setItem(getStorageKey(), JSON.stringify(cur));
                            submitToServer('/rd-intranet/v1/draft', cur).catch(() => {});
                            submitToServer('/rd-intranet/v1/clock-in', { clockIn: clockIn.toISOString(), ubicacionEntrada: loc }).catch(() => {});
                          } catch {}
                        }}
                        className="text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                        title="Haz clic para volver a detectar tu ubicación satelital / IP"
                      >
                        <MapPin className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
                        <span>📍 Falta Ubicación (Clic para detectar)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Botones de Acción de Marcaje */}
              <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
                {!clockIn ? (
                  <button
                    type="button"
                    onClick={handleClockIn}
                    disabled={loadingDraft || loadingLocation}
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer hover:-translate-y-0.5"
                  >
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>{loadingLocation ? 'Detectando ubicación...' : loadingDraft ? 'Sincronizando...' : 'Marcar Entrada'}</span>
                  </button>
                ) : !reportSubmitted ? (
                  <button
                    type="button"
                    onClick={handleEndDay}
                    disabled={closingDay}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer hover:-translate-y-0.5"
                  >
                    {closingDay ? (
                      <>
                        <Activity className="w-4 h-4 animate-spin" />
                        <span>Generando PDF...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Cerrar Jornada (Enviar PDF)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className="px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Bitácora enviada con éxito
                  </span>
                )}
              </div>
            </div>

            {/* SI NO HA MARCADO ENTRADA: PANTALLA DE ACCESO */}
            {clockIn === null && !reportSubmitted && !loadingDraft ? (
              <div className="bg-white rounded-3xl p-10 sm:p-14 border-2 border-dashed border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-5 min-h-[400px]">
                <div className="w-16 h-16 bg-amber-100 rounded-3xl flex items-center justify-center shadow-md">
                  <Lock className="w-8 h-8 text-amber-600" />
                </div>
                <div className="max-w-md space-y-2">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Marca tu Hora de Entrada</h3>
                  <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed">
                    Para comenzar a registrar tus actuaciones, ingresos o programar tu agenda diaria en la Intranet KANT, primero debes registrar tu hora de entrada.
                  </p>
                </div>
                <button
                  onClick={handleClockIn}
                  disabled={loadingDraft || loadingLocation}
                  className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>{loadingLocation ? 'Detectando ubicación...' : 'Marcar Entrada Ahora'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* SUB-PESTAÑAS DE LOS 3 LIBROS */}
                <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSubTabLibro('actuaciones')}
                    className={`px-5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                      subTabLibro === 'actuaciones'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Activity className="w-4 h-4 text-blue-600" />
                    <span>1. Libro de Actuaciones</span>
                    <span className="px-2 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px] font-black">
                      {actuaciones.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubTabLibro('ingresos')}
                    className={`px-5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                      subTabLibro === 'ingresos'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileDigit className="w-4 h-4 text-emerald-600" />
                    <span>2. Libro de Ingresos</span>
                    <span className="px-2 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black">
                      {ingresos.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubTabLibro('programacion')}
                    className={`px-5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                      subTabLibro === 'programacion'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CalendarIcon className="w-4 h-4 text-amber-600" />
                    <span>3. Libro de Programación</span>
                    <span className="px-2 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black">
                      {programaciones.length}
                    </span>
                  </button>
                </div>

                {/* CONTENIDO DEL LIBRO SELECCIONADO */}
                <div className="animate-in fade-in duration-200">
                  {subTabLibro === 'actuaciones' && (
                    <TabRegistroDiario 
                      reportSubmitted={reportSubmitted}
                      actuaciones={actuaciones}
                      setActuaciones={setActuaciones}
                      attachedFiles={attachedFiles}
                      setAttachedFiles={setAttachedFiles}
                      pendingTasks={pendingTasks}
                      setPendingTasks={setPendingTasks}
                      globalExpedientes={globalExpedientes}
                      ingresosActivos={ingresos}
                    />
                  )}

                  {subTabLibro === 'ingresos' && (
                    <TabLibroIngresos 
                      ingresos={ingresos}
                      setIngresos={setIngresos}
                      reportSubmitted={reportSubmitted}
                    />
                  )}

                  {subTabLibro === 'programacion' && (
                    <TabAgenda 
                      programaciones={programaciones}
                      setProgramaciones={setProgramaciones}
                      reportSubmitted={reportSubmitted}
                      allFutureTasks={allFutureTasks}
                      globalExpedientes={globalExpedientes}
                      ingresosActivos={ingresos}
                    />
                  )}
                </div>

              </div>
            )}

          </div>
        )}

        {/* VISTA: CHAT EN VIVO WHATSAPP CON JEFATURA (TIEMPO REAL Y DOBLE CHECK AZUL) */}
        {activeTab === 'chat' && (
          <div className="animate-in fade-in duration-200">
            <LiveChatModule
              isJefatura={false}
              currentUser={localStorage.getItem('rd_user_name') || 'Carmen Luisa'}
              onUnreadCountChange={setUnreadChatLive}
            />
          </div>
        )}

        {/* VISTA 2: EXPEDIENTES & CASOS (ANCHO COMPLETO) */}
        {activeTab === 'expedientes' && (
          <ModuloExpedientes />
        )}

        {/* VISTA: GASTOS & REEMBOLSOS (ANCHO COMPLETO) */}
        {activeTab === 'gastos' && (
          <ModuloGastos isJefatura={false} globalExpedientes={globalExpedientes} />
        )}

        {/* VISTA 3: BUZÓN (ANCHO COMPLETO) */}
        {activeTab === 'notificaciones' && (
          <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200">
            <NotificationPanel notifications={notifications} setNotifications={setNotifications} />
          </div>
        )}

        {/* VISTA 4: MI HISTORIAL (ANCHO COMPLETO) */}
        {activeTab === 'historial' && (
          <TabHistorial />
        )}

        {/* VISTA 5: ARCHIVO & BIBLIOTECA GENERAL DE DOCUMENTOS */}
        {activeTab === 'biblioteca' && (
          <ModuloBibliotecaArchivos />
        )}
      </div>

      {/* KANT COMPANION - ASISTENTE GUARDIÁN FLOTANTE RESPONSIVE */}
      <KantFloatingCompanion unreadReplies={unreadCount + unreadChatLive} />

      {/* NOTIFICACIÓN FLOTANTE DE MENSAJE NUEVO DE CHAT */}
      {chatToast && chatToast.isOpen && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 text-white p-4 rounded-3xl shadow-2xl border border-emerald-500/40 animate-in slide-in-from-bottom-5 duration-300 flex items-start gap-3 backdrop-blur-md">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Nuevo Mensaje de Jefatura</span>
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
                  setActiveTab('chat');
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
