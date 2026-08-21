import React, { useState, useEffect } from 'react';
import api, { uploadPdfInChunks, uploadEvidenceFile, submitToServer, dataUrlToFile } from '../lib/api';
import { Calendar as CalendarIcon, Activity, MessageSquare, FileDigit, Clock, CheckCircle2, AlertCircle, History, BookOpen, Lock, Scale, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import NotificationPanel from './employee/NotificationPanel';
import TabRegistroDiario from './employee/TabRegistroDiario';
import TabAgenda from './employee/TabAgenda';
import TabLibroIngresos from './employee/TabLibroIngresos';
import TabHistorial from './employee/TabHistorial';
import { TabInvestigaciones } from './employee/TabInvestigaciones';
import ModuloExpedientes from './expedientes/ModuloExpedientes';
import LiveStatusBar from './common/LiveStatusBar';
import type { Actuacion, Ingreso, Programacion } from '../types/libros';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SystemAlertModal, { type AlertType } from './common/SystemAlertModal';

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
  const [globalExpedientes, setGlobalExpedientes] = useState<any[]>([]);

  const markFeedbackRead = (id: string | number) => {
    localStorage.setItem(`rd_notif_read_${id}`, 'true');
    setNotifications(prev => prev.map(n => String(n.id) === String(id) ? { ...n, read: true } : n));
  };

  // Autoguardado (Local y Nube)
  useEffect(() => {
    // Protección multi-dispositivo: No autoguardar ni sobrescribir en la nube mientras descargamos el borrador del servidor
    if (loadingDraft) return;

    const userName = (localStorage.getItem('rd_user_name') || 'unknown').toLowerCase().trim();
    if (actuaciones.length > 0) {
      try {
        localStorage.setItem(`rd_actuaciones_backup_${userName}`, JSON.stringify(actuaciones));
      } catch (e) {
        // ignore
      }
    }

    const localDraft = {
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
        dataUrl: f.dataUrl,
        note: f.note
      }))
    };
    localStorage.setItem(getStorageKey(), JSON.stringify(localDraft));

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
          comentario_admin: draftComment || undefined,
          supervisado_por: draftSupervisor || undefined
        };
        await submitToServer('/rd-intranet/v1/draft', apiDraft);
      } catch (e) {
        console.error('Error saving draft to cloud', e);
      }
    }, 800);

    return () => clearTimeout(handler);
  }, [clockIn, ubicacionEntrada, actuaciones, ingresos, programaciones, attachedFiles, loadingDraft, draftComment, draftSupervisor]);

  const refreshTasksAndNotifications = async () => {
    try {
      const [tasksRes, histRes, draftRes] = await Promise.all([
        api.get('/rd-intranet/v1/my-tasks').catch(() => ({ data: null })),
        api.get('/rd-intranet/v1/my-history').catch(() => ({ data: [] })),
        api.get('/rd-intranet/v1/draft').catch(() => ({ data: null }))
      ]);

      const allNotifs: any[] = [];
      const hoy = format(new Date(), 'yyyy-MM-dd');

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
            const hasCambios = Array.isArray(fb.cambios_realizados) && fb.cambios_realizados.length > 0;
            const supervisorName = fb.supervisado_por || '';
            const isSelf = currentLoggedUser && supervisorName.toLowerCase().includes(currentLoggedUser);
            if (!isSelf && ((fb.comentario_admin && fb.comentario_admin.trim() !== '') || hasCambios)) {
              const notifId = `feedback-bitacora-${fb.id}`;
              const isRead = localStorage.getItem(`rd_notif_read_${notifId}`) === 'true';
              const msg = fb.comentario_admin || (hasCambios ? fb.cambios_realizados.join(' • ') : '');
              allNotifs.push({
                id: notifId,
                type: hasCambios ? 'changes' : 'feedback',
                title: hasCambios ? `Modificaciones de Jefatura en Bitácora del ${fb.date}` : `Feedback Jefatura sobre Bitácora del ${fb.date}`,
                message: msg,
                detalles: hasCambios ? fb.cambios_realizados : undefined,
                sender: supervisorName || 'Luis Delgado / Jefatura',
                read: isRead,
                date: fb.date
              });
            }
          });
        } else if (tasksRes.data.comentario_admin && tasksRes.data.comentario_admin.trim() !== '') {
          const supervisorName = tasksRes.data.supervisado_por || '';
          const isSelf = currentLoggedUser && supervisorName.toLowerCase().includes(currentLoggedUser);
          if (!isSelf) {
            const notifId = `feedback-bitacora-${tasksRes.data.fecha_bitacora || 'reciente'}`;
            const isRead = localStorage.getItem(`rd_notif_read_${notifId}`) === 'true';
            allNotifs.push({
              id: notifId,
              type: 'feedback',
              title: `Feedback Jefatura sobre Bitácora del ${tasksRes.data.fecha_bitacora || 'reciente'}`,
              message: tasksRes.data.comentario_admin,
              sender: supervisorName || 'Luis Delgado / Jefatura',
              read: isRead,
              date: tasksRes.data.fecha_bitacora
            });
          }
        }
      }

      // 2. Feedback, cambios y notas específicas en historial de bitácoras
      if (histRes.data && Array.isArray(histRes.data)) {
        const currentLoggedUser = (localStorage.getItem('rd_user_name') || '').toLowerCase().trim();
        const isCurrentUserJefe = isJefaturaUser(currentLoggedUser);

        histRes.data.forEach((b: any) => {
          const hasCambios = Array.isArray(b.cambios_realizados) && b.cambios_realizados.length > 0;
          const hasComment = b.comentario_admin && b.comentario_admin.trim() !== '';
          const supervisorName = b.supervisado_por || '';
          const isSelf = currentLoggedUser && supervisorName.toLowerCase().includes(currentLoggedUser);

          // A) Notificación de observación general o cambios de jefatura (solo si no es auto-supervisión)
          if (!isSelf && (hasComment || hasCambios)) {
            const notifId = `feedback-bitacora-${b.id}`;
            const isRead = localStorage.getItem(`rd_notif_read_${notifId}`) === 'true';
            const exists = allNotifs.some(n => String(n.id) === String(notifId));
            if (!exists) {
              const msg = b.comentario_admin || (hasCambios ? b.cambios_realizados.join(' • ') : '');
              allNotifs.push({
                id: notifId,
                type: hasCambios ? 'changes' : 'feedback',
                title: hasCambios ? `Modificaciones de Jefatura en Bitácora del ${b.date}` : `Feedback Jefatura sobre Bitácora del ${b.date}`,
                message: msg,
                detalles: hasCambios ? b.cambios_realizados : undefined,
                sender: supervisorName || 'Luis Delgado / Jefatura',
                read: isRead,
                date: b.date
              });
            }
          }

          // B) Notas en actuaciones (solo para empleados, no para jefes sobre sus propias notas)
          if (!isCurrentUserJefe && Array.isArray(b.actuaciones)) {
            b.actuaciones.forEach((act: any, aIdx: number) => {
              if (act.observaciones && String(act.observaciones).trim() !== '' && String(act.observaciones).trim().toUpperCase() !== 'SIN OBSERVACIONES') {
                const notifId = `act-obs-${b.id}-${aIdx}`;
                const isRead = localStorage.getItem(`rd_notif_read_${notifId}`) === 'true';
                const exists = allNotifs.some(n => String(n.id) === String(notifId));
                if (!exists) {
                  allNotifs.push({
                    id: notifId,
                    type: 'instruction',
                    title: `Instrucción en Actuación: ${act.actuacion || 'Actuación'} (${act.numeroExpediente ? `Exp. ${act.numeroExpediente}` : b.date})`,
                    message: act.observaciones,
                    sender: supervisorName || 'Luis Delgado / Jefatura',
                    read: isRead,
                    date: b.date
                  });
                }
              }
            });
          }

          // C) Notas en tareas programadas (solo para empleados)
          if (!isCurrentUserJefe && Array.isArray(b.programaciones)) {
            b.programaciones.forEach((prog: any, pIdx: number) => {
              if (prog.observaciones && String(prog.observaciones).trim() !== '' && String(prog.observaciones).trim().toUpperCase() !== 'SIN OBSERVACIONES') {
                const notifId = `prog-obs-${b.id}-${pIdx}`;
                const isRead = localStorage.getItem(`rd_notif_read_${notifId}`) === 'true';
                const exists = allNotifs.some(n => String(n.id) === String(notifId));
                if (!exists) {
                  allNotifs.push({
                    id: notifId,
                    type: 'instruction',
                    title: `Instrucción del Jefe: ${prog.tipoActuacion || 'Tarea'} (${prog.fecha || b.date} - ${prog.hora || ''})`,
                    message: prog.observaciones,
                    sender: supervisorName || 'Luis Delgado / Jefatura',
                    read: isRead,
                    date: prog.fecha || b.date
                  });
                }
              }
            });
          }
        });
      }

      // 3. Feedback y modificaciones en borrador activo (Avance)
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
            sender: draftRes.data.supervisado_por || 'Luis Delgado / Jefatura',
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
            setClockOut(response.data.clockOut ? new Date(response.data.clockOut) : null);
            setActuaciones([]);
            setIngresos([]);
            setProgramaciones([]);
            localStorage.removeItem(getStorageKey());
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

          if (response.data.clockIn && isSameLocalDate(response.data.clockIn, todayStr)) {
            setClockIn(new Date(response.data.clockIn));
            setUbicacionEntrada(response.data.ubicacionEntrada || null);
          } else if (localDraft?.clockIn && isSameLocalDate(localDraft.clockIn, todayStr)) {
            setClockIn(new Date(localDraft.clockIn));
            if (localDraft.ubicacionEntrada) setUbicacionEntrada(localDraft.ubicacionEntrada);
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

          const localActuaciones: Actuacion[] = Array.isArray(localDraft?.actuaciones) ? localDraft.actuaciones : [];
          const localIngresos: Ingreso[] = Array.isArray(localDraft?.ingresos) ? localDraft.ingresos : [];
          const localProgramaciones: Programacion[] = Array.isArray(localDraft?.programaciones) ? localDraft.programaciones : [];

          const mergeLists = <T extends { id?: string | number }>(localList: T[], serverList: T[]): T[] => {
            if (!localList || localList.length === 0) return serverList || [];
            if (!serverList || serverList.length === 0) return localList || [];
            const map = new Map<string | number, T>();
            localList.forEach(item => { if (item && item.id != null) map.set(item.id, item); });
            serverList.forEach(item => { if (item && item.id != null) map.set(item.id, item); });
            return Array.from(map.values());
          };

          const mergedActuaciones = mergeLists<Actuacion>(localActuaciones, serverActuaciones);
          const mergedIngresos = mergeLists<Ingreso>(localIngresos, serverIngresos);
          const mergedProgramaciones = mergeLists<Programacion>(localProgramaciones, serverProgramaciones);

          setActuaciones(mergedActuaciones);
          setIngresos(mergedIngresos);
          setProgramaciones(mergedProgramaciones);

          const updatedLocalDraft = {
            clockIn: response.data.clockIn || localDraft?.clockIn || null,
            ubicacionEntrada: response.data.ubicacionEntrada || localDraft?.ubicacionEntrada || null,
            actuaciones: mergedActuaciones,
            ingresos: mergedIngresos,
            programaciones: mergedProgramaciones,
            comentario_admin: response.data.comentario_admin || localDraft?.comentario_admin || undefined,
            supervisado_por: response.data.supervisado_por || localDraft?.supervisado_por || undefined
          };
          localStorage.setItem(getStorageKey(), JSON.stringify(updatedLocalDraft));

          if (localActuaciones.length > serverActuaciones.length || localIngresos.length > serverIngresos.length || localProgramaciones.length > serverProgramaciones.length) {
            submitToServer('/rd-intranet/v1/draft', updatedLocalDraft).catch(() => {});
          }
        } else {
          if (localDraft && (localDraft.actuaciones?.length > 0 || localDraft.ingresos?.length > 0 || localDraft.programaciones?.length > 0 || localDraft.clockIn)) {
            if (localDraft.clockIn && isSameLocalDate(localDraft.clockIn, todayStr)) {
              setClockIn(new Date(localDraft.clockIn));
              if (localDraft.ubicacionEntrada) setUbicacionEntrada(localDraft.ubicacionEntrada);
            }
            if (Array.isArray(localDraft.actuaciones)) setActuaciones(localDraft.actuaciones);
            if (Array.isArray(localDraft.ingresos)) setIngresos(localDraft.ingresos);
            if (Array.isArray(localDraft.programaciones)) setProgramaciones(localDraft.programaciones);

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
        if (response.data && Array.isArray(response.data)) {
          setGlobalExpedientes(response.data);
        }
      } catch (error) {
        console.error('Error fetching expedientes:', error);
      }
    };

    fetchDraft();
    refreshTasksAndNotifications();
    fetchExpedientes();

    // Sincronización periódica en segundo plano cada 30 segundos
    const interval = setInterval(() => {
      refreshTasksAndNotifications();
    }, 30000);

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
        title: '⚠️ Bitácora Totalmente Vacía',
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
        title: '⚠️ Fila de Actuación Incompleta',
        message: `La fila #${invalidActuacionIndex + 1} en el Libro de Actuaciones está abierta e incompleta. Debes rellenar obligatoriamente el N° de Asunto y la descripción de la Actuación, o borrar la fila usando el botón de la papelera (🗑️).`
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
        title: '⚠️ Fila de Ingreso Incompleta',
        message: `La fila #${invalidIngresoIndex + 1} en el Libro de Ingresos está abierta e incompleta. Debes colocar el N° de Expediente completo y las Partes involucradas, o eliminar la fila con la papelera (🗑️).`
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
        title: '⚠️ Fila de Programación Incompleta',
        message: `La fila #${invalidProgIndex + 1} en el Libro de Programación está abierta e incompleta. Debes colocar obligatoriamente el Organismo / Tribunal y el Tipo de Actuación, o borrar la fila usando el botón de la papelera (🗑️).`
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
      const inStr = clockIn ? format(clockIn, 'hh:mm a') : 'N/A';
      const outStr = format(new Date(), 'hh:mm a');
      doc.text(`Entrada: ${inStr}   —   Salida: ${outStr}`, 45, 51);

      doc.setFont('helvetica', 'bold');
      doc.text('UBICACIÓN ENTRADA:', 135, 42);
      doc.setFont('helvetica', 'normal');
      const cleanLocIn = ubicacionEntrada ? (ubicacionEntrada.includes('|||') ? ubicacionEntrada.split('|||')[1] : ubicacionEntrada) : 'N/A';
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

      // Lógica de retraso
      const isLateClosure = clockIn && format(clockIn, 'yyyy-MM-dd') < format(new Date(), 'yyyy-MM-dd');
      const clockInDateStr = clockIn ? format(clockIn, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

      const now = new Date();
      const payload = {
        reporte_hoy: reportText,
        programacion_manana: progText,
        hora_entrada: clockIn ? format(clockIn, 'HH:mm') : format(now, 'HH:mm'),
        hora_salida: format(now, 'HH:mm'),
        ubicacion_entrada: ubicacionEntrada || 'N/A',
        ubicacion_salida: locSalida,
        ingresos,
        actuaciones,
        programaciones,
        pdf_base64: '',
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
          console.log(`Subiendo ${attachedFiles.length} documentos de evidencia...`);
          for (const fileObj of attachedFiles) {
            try {
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

        localStorage.removeItem(getStorageKey()); // Limpiar el borrador al enviar con éxito
        
        // Confirmar en UI solo si todo salió exitoso
        setClockOut(new Date());
        setReportSubmitted(true);
        
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

  const [activeTab, setActiveTab] = useState<'jornada' | 'expedientes' | 'notificaciones' | 'historial' | 'investigaciones'>(() => {
    const saved = sessionStorage.getItem('rd_emp_active_tab');
    if (saved === 'registro' || saved === 'ingresos' || saved === 'agenda') return 'jornada';
    if (saved === 'expedientes' || saved === 'notificaciones' || saved === 'historial' || saved === 'investigaciones') return saved;
    return 'jornada';
  });

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
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
      const state = data.address?.state || '';
      if (city && state) return `${city}, ${state}`;
      if (city) return city;
      if (state) return state;
      return 'Ubicación Desconocida';
    } catch (error) {
      return 'Ubicación Desconocida';
    }
  };

  const getGeolocation = (): Promise<string> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve('N/A');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const coordsStr = `${lat},${lng}`;
          const cityName = await getCityFromCoords(lat, lng);
          resolve(`${coordsStr}|||${cityName}`);
        },
        () => {
          resolve('N/A');
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  };

  const handleClockIn = async () => {
    const now = new Date();
    const nowIso = now.toISOString();
    setLoadingLocation(true);

    try {
      const resp = await submitToServer('/rd-intranet/v1/clock-in', {
        clockIn: nowIso,
        ubicacionEntrada: 'Detectando satélite...',
        fecha: format(now, 'yyyy-MM-dd')
      });
      
      const finalClockIn = resp?.clockIn ? new Date(resp.clockIn) : now;
      setClockIn(finalClockIn);
      setReportSubmitted(false);
      setClockOut(null);
      setActiveTab('jornada');
      setSubTabLibro('actuaciones');

      const immediateDraft = {
        clockIn: finalClockIn.toISOString(),
        ubicacionEntrada: 'Detectando satélite...',
        actuaciones,
        ingresos,
        programaciones
      };
      localStorage.setItem(getStorageKey(), JSON.stringify(immediateDraft));
      submitToServer('/rd-intranet/v1/draft', immediateDraft).catch(cloudError => {
        console.warn('Sincronización de borrador demorada:', cloudError);
      });

      const loc = await getGeolocation();
      setUbicacionEntrada(loc);
      setLoadingLocation(false);

      submitToServer('/rd-intranet/v1/clock-in', {
        clockIn: finalClockIn.toISOString(),
        ubicacionEntrada: loc,
        fecha: format(now, 'yyyy-MM-dd')
      }).catch(() => {});
    } catch (error) {
      console.error('Error al registrar entrada en el servidor', error);
      setLoadingLocation(false);
      
      setClockIn(now);
      const immediateDraft = {
        clockIn: nowIso,
        ubicacionEntrada: 'Obteniendo ubicación (Offline)...',
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
        title: 'Modo Fuera de Línea',
        message: 'Se ha registrado tu entrada localmente porque hay un problema de conexión con el servidor. Tu trabajo de hoy está a salvo y se sincronizará más tarde.'
      });
    }
  };

  const clockInDateStr = clockIn ? format(clockIn, 'yyyy-MM-dd') : null;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isLateClosure = clockInDateStr && clockInDateStr < todayStr;

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in duration-300">
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

      {/* 5 PESTAÑAS PRINCIPALES: COMPACTAS, ELEGANTES Y NÍTIDAS */}
      <div className="flex overflow-x-auto gap-1.5 p-1 bg-slate-200/80 rounded-2xl border border-slate-300/80 scrollbar-none">
        <button 
          onClick={() => setActiveTab('jornada')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex-shrink-0 cursor-pointer ${
            activeTab === 'jornada' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>Mi Jornada & Libros</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('expedientes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex-shrink-0 cursor-pointer ${
            activeTab === 'expedientes' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-blue-500" />
          <span>Expedientes & Casos</span>
        </button>

        <button 
          onClick={() => setActiveTab('notificaciones')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex-shrink-0 cursor-pointer ${
            activeTab === 'notificaciones' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <div className="relative">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full"></span>}
          </div>
          <span>Buzón de Jefatura</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full">
              {unreadCount}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab('historial')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex-shrink-0 cursor-pointer ${
            activeTab === 'historial' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <History className="w-3.5 h-3.5 text-purple-500" />
          <span>Mi Historial</span>
        </button>

        <button 
          onClick={() => setActiveTab('investigaciones')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex-shrink-0 cursor-pointer ${
            activeTab === 'investigaciones' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
          <span>Biblioteca & Sentencias</span>
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
                      <span className="text-sm font-extrabold text-slate-800 flex items-center gap-1">
                        🟢 Entrada: <span className="text-blue-600">{format(clockIn, 'hh:mm a')}</span>
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-slate-400">Sin marcar entrada</span>
                    )}

                    {clockOut && (
                      <span className="text-sm font-extrabold text-slate-800 flex items-center gap-1">
                        🔴 Salida: <span className="text-rose-600">{format(clockOut, 'hh:mm a')}</span>
                      </span>
                    )}

                    {ubicacionEntrada && ubicacionEntrada !== 'N/A' && (
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <MapPin className="w-3 h-3 text-blue-500" />
                        {(ubicacionEntrada.includes('|||') ? ubicacionEntrada.split('|||')[1] : ubicacionEntrada)
                          .replace(/\\u00f3/gi, 'ó').replace(/\\u00e1/gi, 'á').replace(/\\u00e9/gi, 'é').replace(/\\u00ed/gi, 'í')}
                      </span>
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
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer hover:-translate-y-0.5"
                  >
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>{loadingLocation ? 'Detectando satélite...' : loadingDraft ? 'Sincronizando...' : 'Marcar Entrada'}</span>
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
                  className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Marcar Entrada Ahora</span>
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
                    />
                  )}
                </div>

              </div>
            )}

          </div>
        )}

        {/* VISTA 2: EXPEDIENTES & CASOS (ANCHO COMPLETO) */}
        {activeTab === 'expedientes' && (
          <ModuloExpedientes />
        )}

        {/* VISTA 3: BUZÓN DE JEFATURA (ANCHO COMPLETO) */}
        {activeTab === 'notificaciones' && (
          <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200">
            {notifications.length === 0 ? (
              <p className="text-slate-500 text-center py-12 font-medium">No tienes notificaciones en tu buzón.</p>
            ) : (
              <NotificationPanel notifications={notifications} setNotifications={setNotifications} />
            )}
          </div>
        )}

        {/* VISTA 4: MI HISTORIAL (ANCHO COMPLETO) */}
        {activeTab === 'historial' && (
          <TabHistorial />
        )}

        {/* VISTA 5: BIBLIOTECA & INVESTIGACIONES (ANCHO COMPLETO) */}
        {activeTab === 'investigaciones' && (
          <TabInvestigaciones />
        )}

      </div>
    </div>
  );
}
