import React, { useState, useEffect } from 'react';
import api, { uploadPdfInChunks } from '../lib/api';
import { Calendar as CalendarIcon, Activity, Briefcase, MessageSquare, FileDigit, Clock, CheckCircle2, AlertCircle, History, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import NotificationPanel from './employee/NotificationPanel';
import TabRegistroDiario from './employee/TabRegistroDiario';
import TabAgenda from './employee/TabAgenda';
import TabLibroIngresos from './employee/TabLibroIngresos';
import TabHistorial from './employee/TabHistorial';
import { TabInvestigaciones } from './employee/TabInvestigaciones';
import type { Actuacion, Ingreso, Programacion } from '../types/libros';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SystemAlertModal, { type AlertType } from './common/SystemAlertModal';

const STORAGE_KEY = 'rd_intranet_draft';

export default function EmployeeDashboard() {
  const [clockIn, setClockIn] = useState<Date | null>(() => {
    const draft = localStorage.getItem(STORAGE_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.clockIn && typeof parsed.clockIn === 'string') {
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          if (parsed.clockIn.slice(0, 10) !== todayStr) {
            localStorage.removeItem(STORAGE_KEY);
            return null;
          }
          return new Date(parsed.clockIn);
        }
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [ubicacionEntrada, setUbicacionEntrada] = useState<string | null>(() => {
    const draft = localStorage.getItem(STORAGE_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.clockIn && typeof parsed.clockIn === 'string') {
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          if (parsed.clockIn.slice(0, 10) !== todayStr) {
            return null;
          }
        }
        return parsed.ubicacionEntrada || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [clockOut, setClockOut] = useState<Date | null>(null);
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
    const draft = localStorage.getItem(STORAGE_KEY);
    return draft ? JSON.parse(draft).actuaciones || [] : [];
  });
  const [ingresos, setIngresos] = useState<Ingreso[]>(() => {
    const draft = localStorage.getItem(STORAGE_KEY);
    return draft ? JSON.parse(draft).ingresos || [] : [];
  });
  const [programaciones, setProgramaciones] = useState<Programacion[]>(() => {
    const draft = localStorage.getItem(STORAGE_KEY);
    return draft ? JSON.parse(draft).programaciones || [] : [];
  });
  const [attachedFiles, setAttachedFiles] = useState<{file: any, note: string}[]>([]);
  
  // Tareas programadas reales desde la última bitácora
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [allFutureTasks, setAllFutureTasks] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [globalExpedientes, setGlobalExpedientes] = useState<any[]>([]);

  // Autoguardado (Local y Nube)
  useEffect(() => {
    // Protección multi-dispositivo: No autoguardar ni sobrescribir en la nube mientras descargamos el borrador del servidor
    if (loadingDraft) return;

    const localDraft = {
      clockIn: clockIn ? clockIn.toISOString() : null,
      ubicacionEntrada,
      actuaciones,
      ingresos,
      programaciones
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localDraft));

    // Guardar en la nube con debounce de 800 milisegundos
    const handler = setTimeout(async () => {
      try {
        // No sincronizamos si todo está vacío (estado inicial sin modificaciones)
        if (!localDraft.clockIn && localDraft.actuaciones.length === 0 && localDraft.ingresos.length === 0 && localDraft.programaciones.length === 0) return;
        
        const apiDraft = {
          ...localDraft,
          actuaciones,
          ingresos,
          programaciones
        };
        await api.post('/rd-intranet/v1/draft', apiDraft);
      } catch (e) {
        console.error('Error saving draft to cloud', e);
      }
    }, 800);

    return () => clearTimeout(handler);
  }, [clockIn, ubicacionEntrada, actuaciones, ingresos, programaciones, loadingDraft]);

  useEffect(() => {
    const fetchDraft = async () => {
      try {
        const response = await api.get('/rd-intranet/v1/draft');
        if (response.data && typeof response.data === 'object') {
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          if (response.data.dayClosed) {
            setReportSubmitted(true);
            if (response.data.clockOut) {
              setClockOut(new Date(response.data.clockOut));
            }
          }
          if (response.data.clockIn) {
            if (String(response.data.clockIn).slice(0, 10) !== todayStr) {
              setClockIn(null);
              setUbicacionEntrada(null);
              localStorage.removeItem(STORAGE_KEY);
              return;
            }
            setClockIn(new Date(response.data.clockIn));
          }
          if (response.data.ubicacionEntrada) setUbicacionEntrada(response.data.ubicacionEntrada);
          const parseJson = (val: any) => {
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') {
              try { return JSON.parse(val); } catch(e) { return []; }
            }
            return [];
          };
          const parsedActuaciones = parseJson(response.data.actuaciones);
          const parsedIngresos = parseJson(response.data.ingresos);
          const parsedProgramaciones = parseJson(response.data.programaciones);
          
          if (parsedActuaciones.length > 0) setActuaciones(parsedActuaciones);
          if (parsedIngresos.length > 0) setIngresos(parsedIngresos);
          if (parsedProgramaciones.length > 0) setProgramaciones(parsedProgramaciones);
          
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            ...response.data,
            actuaciones: parsedActuaciones,
            ingresos: parsedIngresos,
            programaciones: parsedProgramaciones
          }));
        }
      } catch (error) {
        console.error('Error fetching draft:', error);
      } finally {
        setLoadingDraft(false);
      }
    };
    fetchDraft();

    const fetchMyTasks = async () => {
      try {
        const response = await api.get('/rd-intranet/v1/my-tasks');
        if (response.data && response.data.success) {
          const hoy = format(new Date(), 'yyyy-MM-dd');
          
          // Filtrar tareas planificadas para hoy (o dejar todas si prefieres, pero filtramos hoy por contexto)
          const tareasHoy = (response.data.programaciones || []).filter((p: any) => p.fecha === hoy);
          
          setPendingTasks(tareasHoy.map((t: any, i: number) => ({
            id: i + 1,
            text: `${t.hora} - ${t.tipoActuacion} (${t.organismoTribunal}) ${t.observaciones ? '⚠️ NOTA DEL JEFE: ' + t.observaciones : ''}`,
            completed: false,
            originalData: t
          })));

          // Filtrar todas las tareas futuras (hoy en adelante) para la Agenda Personal
          const futuras = (response.data.programaciones || [])
            .filter((p: any) => p.fecha >= hoy)
            .sort((a: any, b: any) => {
              const dateA = new Date(`${a.fecha}T${a.hora || '00:00'}`);
              const dateB = new Date(`${b.fecha}T${b.hora || '00:00'}`);
              return dateA.getTime() - dateB.getTime();
            });
          setAllFutureTasks(futuras);

          // Si hay comentario del jefe en la última bitácora
          if (response.data.comentario_admin) {
            setNotifications([{
              id: 1,
              type: 'feedback',
              title: `Feedback Jefatura sobre Bitácora del ${response.data.fecha_bitacora}`,
              message: response.data.comentario_admin,
              sender: 'Revisión Administrativa',
              read: false
            }]);
          }
        }
      } catch (error) {
        console.error('Error cargando mis tareas:', error);
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
    fetchMyTasks();
    fetchExpedientes();
  }, []);

  const handleEndDay = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    try {
      setClockOut(new Date());
      setReportSubmitted(true);

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
        cierre_retrasado: isLateClosure
      };

      console.log('Enviando datos de jornada al backend:', payload);
      try {
        const response = await api.post('/rd-intranet/v1/submit', payload);
        const postId = response.data?.post_id;
        
        if (postId && pdfBase64) {
          console.log(`Cargando archivo PDF por bloques (Chunked Upload) al servidor (post_id: ${postId})...`);
          await uploadPdfInChunks(postId, pdfBase64);
        }

        localStorage.removeItem(STORAGE_KEY); // Limpiar el borrador al enviar con éxito
        setSystemAlert({
          isOpen: true,
          type: 'success',
          title: '¡Jornada Cerrada con Éxito!',
          message: 'La bitácora y el archivo PDF (sea del peso que sea) han sido cargados y asegurados al 100% en el servidor de la Intranet.'
        });
      } catch (apiError) {
        console.error('Error enviando a la API real, revisa tu conexión a WP', apiError);
        setSystemAlert({
          isOpen: true,
          type: 'warning',
          title: 'PDF Generado - Sin Conexión al Servidor',
          message: 'Se generó y descargó tu PDF en este dispositivo, pero hubo un problema de conexión al enviarlo al servidor central. Revisa tu internet o avisa a Jefatura.'
        });
      }
    } catch (error) {
      console.error('Error al cerrar jornada', error);
      setSystemAlert({
        isOpen: true,
        type: 'error',
        title: 'Error al Cerrar Jornada',
        message: 'Ocurrió un error inesperado al procesar el cierre de tu jornada. Por favor, intenta de nuevo.'
      });
    }
  };

  const tasksCompleted = pendingTasks.filter(t => t.completed).length;
  const progress = Math.round((tasksCompleted / pendingTasks.length) * 100) || 0;

  const [activeTab, setActiveTab] = useState<'registro' | 'agenda' | 'ingresos' | 'notificaciones' | 'historial' | 'investigaciones'>('ingresos');
  const unreadCount = notifications.filter(n => !n.read).length;

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
    try {
      setLoadingLocation(true);
      const now = new Date();
      const nowIso = now.toISOString();
      
      const immediatePayload = {
        clockIn: nowIso,
        ubicacionEntrada: 'Obteniendo ubicación...',
        fecha: format(now, 'yyyy-MM-dd')
      };

      // 1. Sellar inmutablemente en el servidor primero (la única verdad absoluta de la asistencia)
      const res = await api.post('/rd-intranet/v1/clock-in', immediatePayload);
      let finalClockIn = now;
      if (res.data && res.data.already_registered && res.data.clockIn) {
        finalClockIn = new Date(res.data.clockIn);
      } else if (res.data && res.data.clockIn) {
        finalClockIn = new Date(res.data.clockIn);
      }
      
      // 2. Solo al confirmar que el servidor lo guardó, actualizamos el estado visual y el borrador
      setClockIn(finalClockIn);
      const immediateDraft = {
        clockIn: finalClockIn.toISOString(),
        ubicacionEntrada: 'Obteniendo ubicación...',
        actuaciones,
        ingresos,
        programaciones
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(immediateDraft));
      
      api.post('/rd-intranet/v1/draft', immediateDraft).catch(cloudError => {
        console.warn('Sincronización de borrador demorada:', cloudError);
      });

      const loc = await getGeolocation();
      setUbicacionEntrada(loc);
      setLoadingLocation(false);

      // Actualizar la ubicación una vez resuelta por el satélite/mapa
      api.post('/rd-intranet/v1/clock-in', {
        clockIn: finalClockIn.toISOString(),
        ubicacionEntrada: loc,
        fecha: format(now, 'yyyy-MM-dd')
      }).catch(() => {});
    } catch (error) {
      console.error('Error al registrar entrada en el servidor', error);
      setLoadingLocation(false);
      setSystemAlert({
        isOpen: true,
        type: 'error',
        title: 'Error al Sellar Entrada en Servidor',
        message: 'No se pudo registrar tu hora de entrada en la base de datos oficial de WordPress. Por favor verifica tu conexión a internet, o que el plugin esté actualizado, y recarga la página antes de reintentar.'
      });
    }
  };

  const clockInDateStr = clockIn ? format(clockIn, 'yyyy-MM-dd') : null;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isLateClosure = clockInDateStr && clockInDateStr < todayStr;

  return (
    <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-700">
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

      {/* BANNER DE RETRASO */}
      {isLateClosure && !reportSubmitted && (
        <div className="bg-rose-500 text-white p-4 rounded-2xl shadow-lg border border-rose-600 flex items-center justify-between animate-in slide-in-from-top">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 animate-pulse" />
            <div>
              <p className="font-bold text-lg">Tienes una jornada pendiente del {clockInDateStr}</p>
              <p className="text-sm text-rose-100">Debes cerrar esta jornada antes de poder registrar actividades del día de hoy.</p>
            </div>
          </div>
          <button 
            onClick={handleEndDay} 
            className="px-6 py-2 bg-white text-rose-600 font-bold rounded-xl shadow-md hover:bg-rose-50 transition-colors"
          >
            Cerrar Jornada Anterior
          </button>
        </div>
      )}

      {/* Header Premium con Stats */}
      <div className="bg-slate-900 rounded-3xl p-8 lg:p-10 text-white shadow-2xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-semibold tracking-wider text-slate-200 uppercase">Jornada Activa</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-2">Mi Jornada <span className="text-amber-400">KANT</span></h2>
            <p className="text-slate-400 text-lg font-medium capitalize flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-amber-400" />
              {format(new Date(), "EEEE, d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto items-stretch">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex-1 lg:w-40 text-center">
              <Activity className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{progress}%</p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">Progreso Hoy</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex-1 lg:w-40 text-center">
              <Briefcase className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{pendingTasks.length - tasksCompleted}</p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">Pendientes</p>
            </div>
          </div>
        </div>

        {/* Navegación por Pestañas */}
        <div className="relative z-10 flex flex-wrap gap-2 bg-white/5 p-2 rounded-2xl backdrop-blur-md border border-white/10">
          
          <button 
            onClick={() => setActiveTab('ingresos')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all flex-1 sm:flex-none justify-center cursor-pointer ${activeTab === 'ingresos' ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
          >
            <FileDigit className="w-5 h-5" />
            Libro de Ingresos
          </button>
          
          <button 
            onClick={() => setActiveTab('registro')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all flex-1 sm:flex-none justify-center cursor-pointer ${activeTab === 'registro' ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
          >
            <Activity className="w-5 h-5" />
            Libro de Actuaciones
          </button>

          <button 
            onClick={() => setActiveTab('agenda')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all flex-1 sm:flex-none justify-center cursor-pointer ${activeTab === 'agenda' ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
          >
            <CalendarIcon className="w-5 h-5" />
            Libro de Programación
          </button>
          
          <button 
            onClick={() => setActiveTab('notificaciones')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all flex-1 sm:flex-none justify-center cursor-pointer ${activeTab === 'notificaciones' ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5" />
              {unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-rose-500 rounded-full border-2 border-slate-900"></span>}
            </div>
            Notificaciones {unreadCount > 0 && `(${unreadCount})`}
          </button>

          <button 
            onClick={() => setActiveTab('historial')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all flex-1 sm:flex-none justify-center cursor-pointer ${activeTab === 'historial' ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
          >
            <History className="w-5 h-5" />
            Mi Historial
          </button>

          <button 
            onClick={() => setActiveTab('investigaciones')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all flex-1 sm:flex-none justify-center cursor-pointer ${activeTab === 'investigaciones' ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
          >
            <BookOpen className="w-5 h-5" />
            Investigaciones & Sentencias
          </button>
        </div>
      </div>

      {/* Estructura Principal con Panel Fijo (Sidebar) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6">
        
        {/* PANEL FIJO IZQUIERDO: Asistencia y Cierre */}
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 sticky top-6 flex flex-col min-h-[400px]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Horario</h3>
                <p className="text-sm text-slate-500 font-medium">Panel de Control</p>
              </div>
            </div>
            
            <div className="space-y-4 flex-1">
              <button
                type="button"
                onClick={handleClockIn}
                disabled={clockIn !== null || loadingDraft || reportSubmitted}
                className={`w-full py-4 px-4 rounded-2xl flex flex-col items-center justify-center font-bold transition-all duration-300 text-sm ${
                  loadingDraft
                    ? 'bg-amber-50 text-amber-700 cursor-wait border-2 border-amber-200'
                    : reportSubmitted
                    ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-2 border-slate-200'
                    : clockIn 
                    ? 'bg-emerald-50 text-emerald-700 cursor-not-allowed border-2 border-emerald-100'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 border-2 border-slate-900 cursor-pointer'
                }`}
              >
                <span className="flex items-center gap-2 mb-1">
                  {loadingDraft ? <Clock className="w-5 h-5 animate-spin text-amber-600" /> : reportSubmitted ? <CheckCircle2 className="w-5 h-5 text-slate-500" /> : clockIn ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  {loadingDraft ? 'Sincronizando...' : reportSubmitted ? 'Jornada de Hoy Concluida' : clockIn ? 'Entrada Registrada' : 'Marcar Entrada'}
                </span>
                {clockIn && (
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <span className="text-emerald-900 bg-emerald-200/50 px-3 py-1 rounded-lg text-xs tracking-wider">{format(clockIn, 'hh:mm a')}</span>
                    {loadingLocation || (ubicacionEntrada && ubicacionEntrada.toLowerCase().includes('obteniendo')) ? (
                      <span className="text-emerald-700 text-[10px] tracking-wide uppercase font-bold text-center leading-tight animate-pulse">
                        📍 Buscando ciudad satelital...
                      </span>
                    ) : ubicacionEntrada && ubicacionEntrada !== 'N/A' ? (
                      <span className="text-emerald-700 text-[10px] tracking-wide uppercase font-bold text-center leading-tight">
                        📍 {(ubicacionEntrada.includes('|||') ? ubicacionEntrada.split('|||')[1] : ubicacionEntrada)
                            .replace(/\\u00f3/gi, 'ó')
                            .replace(/\\u00e1/gi, 'á')
                            .replace(/\\u00e9/gi, 'é')
                            .replace(/\\u00ed/gi, 'í')
                            .replace(/\\u00fa/gi, 'ú')
                            .replace(/\\u00f1/gi, 'ñ')}
                      </span>
                    ) : (
                      <span className="text-amber-600 text-[10px] tracking-wide uppercase font-medium text-center leading-tight">
                        ⚠️ GPS no detectado o denegado
                      </span>
                    )}
                  </div>
                )}
              </button>

              <div className={`w-full py-4 px-4 rounded-2xl flex flex-col items-center justify-center font-bold transition-all duration-300 text-sm border-2 ${
                  (clockOut || reportSubmitted)
                    ? 'bg-rose-50 text-rose-700 border-rose-100'
                    : 'bg-slate-50 text-slate-400 border-slate-100 border-dashed'
                }`}
              >
                <span className="flex items-center gap-2 mb-1">
                  {(clockOut || reportSubmitted) ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5 opacity-50" />}
                  {(clockOut || reportSubmitted) ? 'Salida Registrada' : 'Salida Pendiente'}
                </span>
                {clockOut && <span className="text-rose-900 bg-rose-200/50 px-3 py-1 rounded-lg text-xs tracking-wider mt-1">{format(clockOut, 'hh:mm a')}</span>}
              </div>
            </div>

            {reportSubmitted && (
              <div className="mt-4 mb-4 p-4 bg-amber-50 rounded-xl border border-amber-200 flex flex-col gap-2 text-amber-800 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mx-auto" />
                <p className="font-medium text-center leading-tight">Bitácora cerrada y enviada.</p>
              </div>
            )}

            {/* BOTÓN GIGANTE DE CERRAR JORNADA AL FONDO DEL PANEL */}
            <div className="mt-auto pt-6 border-t border-slate-100">
              <button 
                type="button"
                onClick={handleEndDay}
                disabled={reportSubmitted || clockIn === null}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex flex-col items-center justify-center gap-1"
              >
                {reportSubmitted ? (
                  <>
                    <CheckCircle2 className="w-6 h-6" />
                    <span>Bitácora Enviada</span>
                  </>
                ) : (
                  <>
                    <span>Cerrar Jornada</span>
                    <span className="text-xs font-medium opacity-80">(Guardar y Enviar PDF)</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Botón de Limpiar Día Manual (Ayuda) */}
            <div className="mt-4 pb-2">
              <button 
                type="button"
                onClick={() => {
                  setSystemAlert({
                    isOpen: true,
                    type: 'warning',
                    title: '¿Reiniciar Jornada?',
                    message: 'Si la jefatura eliminó o reabrió tu bitácora, debes confirmar para limpiar los datos locales y volver a marcar tu entrada. \n\n¿Deseas reiniciar tu día desde cero?',
                    showCancel: true,
                    confirmText: 'Sí, Reiniciar Día',
                    cancelText: 'Cancelar',
                    onConfirm: async () => {
                      setClockIn(null);
                      setClockOut(null);
                      setReportSubmitted(false);
                      setActuaciones([]);
                      setIngresos([]);
                      setProgramaciones([]);
                      setUbicacionEntrada(null);
                      localStorage.removeItem(STORAGE_KEY);
                      
                      try {
                        // Forzar guardado vacío en el servidor para limpiar su caché
                        await api.post('/rd-intranet/v1/draft', {
                          clockIn: null,
                          ubicacionEntrada: null,
                          actuaciones: [],
                          ingresos: [],
                          programaciones: []
                        });
                      } catch (e) {}

                      setSystemAlert({
                        isOpen: true,
                        type: 'success',
                        title: 'Día Reiniciado',
                        message: 'Tus datos se han limpiado. Ya puedes volver a marcar entrada y registrar tu jornada.',
                        onConfirm: () => setSystemAlert(prev => ({ ...prev, isOpen: false }))
                      });
                    }
                  });
                }}
                className="w-full text-xs font-bold text-slate-400 hover:text-amber-600 transition-colors underline underline-offset-2 flex justify-center items-center gap-1 cursor-pointer"
              >
                ¿Problemas? Limpiar y Reiniciar Día
              </button>
            </div>
          </div>
        </div>

        {/* ÁREA DINÁMICA DERECHA: Contenido de la pestaña */}
        <div className="xl:col-span-9 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'registro' && (
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
          
          {activeTab === 'agenda' && (
            <TabAgenda 
              programaciones={programaciones}
              setProgramaciones={setProgramaciones}
              reportSubmitted={reportSubmitted}
              allFutureTasks={allFutureTasks}
            />
          )}

          {activeTab === 'ingresos' && (
            <TabLibroIngresos 
              ingresos={ingresos}
              setIngresos={setIngresos}
              reportSubmitted={reportSubmitted}
            />
          )}

          {activeTab === 'notificaciones' && (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 min-h-[500px]">
              <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <MessageSquare className="w-7 h-7 text-blue-500" /> 
                Buzón de Mensajes
              </h3>
              {notifications.length === 0 ? (
                <p className="text-slate-500 text-center py-10">No tienes notificaciones.</p>
              ) : (
                <NotificationPanel notifications={notifications} setNotifications={setNotifications} />
              )}
            </div>
          )}

          {activeTab === 'historial' && (
            <TabHistorial />
          )}

          {activeTab === 'investigaciones' && (
            <TabInvestigaciones />
          )}
        </div>
      </div>
    </div>
  );
}
