import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Calendar as CalendarIcon, Activity, Briefcase, MessageSquare, FileDigit, Clock, CheckCircle2, AlertCircle, History } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import NotificationPanel from './employee/NotificationPanel';
import TabRegistroDiario from './employee/TabRegistroDiario';
import TabAgenda from './employee/TabAgenda';
import TabLibroIngresos from './employee/TabLibroIngresos';
import TabHistorial from './employee/TabHistorial';
import type { Actuacion, Ingreso, Programacion } from '../types/libros';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SystemAlertModal, { type AlertType } from './common/SystemAlertModal';

const STORAGE_KEY = 'rd_intranet_draft';

export default function EmployeeDashboard() {
  const [clockIn, setClockIn] = useState<Date | null>(() => {
    const draft = localStorage.getItem(STORAGE_KEY);
    if (draft) {
      const parsed = JSON.parse(draft);
      return parsed.clockIn ? new Date(parsed.clockIn) : null;
    }
    return null;
  });
  const [ubicacionEntrada, setUbicacionEntrada] = useState<string | null>(() => {
    const draft = localStorage.getItem(STORAGE_KEY);
    if (draft) {
      const parsed = JSON.parse(draft);
      return parsed.ubicacionEntrada || null;
    }
    return null;
  });
  const [clockOut, setClockOut] = useState<Date | null>(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [systemAlert, setSystemAlert] = useState<{ isOpen: boolean; type: AlertType; title: string; message: string }>({
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

    const draft = {
      clockIn: clockIn ? clockIn.toISOString() : null,
      ubicacionEntrada,
      actuaciones,
      ingresos,
      programaciones
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));

    // Guardar en la nube con debounce de 800 milisegundos
    const handler = setTimeout(async () => {
      try {
        // No sincronizamos si todo está vacío (estado inicial sin modificaciones)
        if (!draft.clockIn && draft.actuaciones.length === 0 && draft.ingresos.length === 0 && draft.programaciones.length === 0) return;
        await api.post('/rd-intranet/v1/draft', draft);
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
          if (response.data.clockIn) setClockIn(new Date(response.data.clockIn));
          if (response.data.ubicacionEntrada) setUbicacionEntrada(response.data.ubicacionEntrada);
          if (response.data.actuaciones && Array.isArray(response.data.actuaciones)) setActuaciones(response.data.actuaciones);
          if (response.data.ingresos && Array.isArray(response.data.ingresos)) setIngresos(response.data.ingresos);
          if (response.data.programaciones && Array.isArray(response.data.programaciones)) setProgramaciones(response.data.programaciones);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(response.data));
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

      // --- GENERACIÓN DE PDF ---
      const doc = new jsPDF('landscape');
      
      const primaryColor: [number, number, number] = [30, 41, 59]; // slate-800
      
      // Header General
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('REPORTE DIARIO DE ACTIVIDADES', 14, 20);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Fecha: ${format(new Date(), 'dd/MM/yyyy')}`, 14, 28);
      doc.text(`Empleado: Carmen Luisa`, 14, 34);
      doc.text(`Entrada: ${clockIn ? format(clockIn, 'HH:mm') : 'N/A'} - Salida: ${format(new Date(), 'HH:mm')}`, 14, 40);

      let finalY = 50;

      // 1. Libro de Actuaciones
      if (actuaciones.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('LIBRO DE ACTUACIONES', 14, finalY);
        
        const actData = actuaciones.map(a => [a.hora, a.numeroAsunto, a.partes, a.actuacion, a.observaciones]);
        autoTable(doc, {
          startY: finalY + 5,
          head: [['HORA', 'NUMERO DE ASUNTO', 'PARTES', 'ACTUACIÓN', 'OBSERVACIONES']],
          body: actData,
          theme: 'grid',
          headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 9 }
        });
        finalY = (doc as any).lastAutoTable.finalY + 15;
      }

      // 2. Libro de Ingresos
      if (ingresos.length > 0) {
        if (finalY > 160) { doc.addPage(); finalY = 20; }
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('LIBRO DE INGRESOS', 14, finalY);
        
        const ingData = ingresos.map(i => [i.numeroExpediente, `${i.fechaIngreso} ${i.horaIngreso}`, i.tipo, i.partes, i.resumen, i.observaciones]);
        autoTable(doc, {
          startY: finalY + 5,
          head: [['N° DE EXPEDIENTE', 'FECHA/HORA DE INGRESO', 'TIPO', 'PARTES', 'RESUMEN', 'OBSERVACIONES']],
          body: ingData,
          theme: 'grid',
          headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 9 }
        });
        finalY = (doc as any).lastAutoTable.finalY + 15;
      }

      // 3. Libro de Programación
      if (programaciones.length > 0) {
        if (finalY > 160) { doc.addPage(); finalY = 20; }
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('LIBRO DE PROGRAMACIÓN', 14, finalY);
        
        const progData = programaciones.map(p => [p.fecha, p.hora, p.organismoTribunal, p.tipoActuacion, p.resumen, p.observaciones]);
        autoTable(doc, {
          startY: finalY + 5,
          head: [['FECHA', 'HORA', 'ORGANISMO/TRIBUNAL', 'TIPO DE ACTUACIÓN', 'RESUMEN', 'OBSERVACIONES']],
          body: progData,
          theme: 'grid',
          headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 9 }
        });
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

      // Obtener ubicación de salida
      const locSalida = await getGeolocation();

      // Lógica de retraso
      const isLateClosure = clockIn && format(clockIn, 'yyyy-MM-dd') < format(new Date(), 'yyyy-MM-dd');
      const clockInDateStr = clockIn ? format(clockIn, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

      const payload = {
        reporte_hoy: reportText,
        programacion_manana: progText,
        hora_entrada: clockIn ? format(clockIn, 'HH:mm') : 'N/A',
        ubicacion_entrada: ubicacionEntrada || 'N/A',
        ubicacion_salida: locSalida,
        ingresos: ingresos,
        actuaciones: actuaciones,
        programaciones: programaciones,
        pdf_base64: pdfBase64,
        fecha_reporte: clockInDateStr,
        cierre_retrasado: isLateClosure
      };

      console.log('Enviando al backend:', payload);
      try {
        await api.post('/rd-intranet/v1/submit', payload);
        localStorage.removeItem(STORAGE_KEY); // Limpiar el borrador al enviar con éxito
        setSystemAlert({
          isOpen: true,
          type: 'success',
          title: '¡Jornada Cerrada con Éxito!',
          message: 'La bitácora y el archivo PDF han sido enviados correctamente a Jefatura, y los números de expediente fueron registrados globalmente en la Intranet.'
        });
      } catch (apiError) {
        console.error('Error enviando a la API real, revisa tu conexión a WP', apiError);
        setSystemAlert({
          isOpen: true,
          type: 'warning',
          title: 'PDF Generado - Sin Conexión al Servidor',
          message: 'Se generó y descargó tu PDF de respaldo en este dispositivo, pero hubo un problema de conexión al enviarlo al servidor central. Revisa tu internet o avisa a Jefatura.'
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

  const [activeTab, setActiveTab] = useState<'registro' | 'agenda' | 'ingresos' | 'notificaciones' | 'historial'>('ingresos');
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
        onClose={() => setSystemAlert({ ...systemAlert, isOpen: false })}
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
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-2">Mi Portal Diario</h2>
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
                disabled={clockIn !== null || loadingDraft}
                className={`w-full py-4 px-4 rounded-2xl flex flex-col items-center justify-center font-bold transition-all duration-300 text-sm ${
                  loadingDraft
                    ? 'bg-amber-50 text-amber-700 cursor-wait border-2 border-amber-200'
                    : clockIn 
                    ? 'bg-emerald-50 text-emerald-700 cursor-not-allowed border-2 border-emerald-100'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 border-2 border-slate-900 cursor-pointer'
                }`}
              >
                <span className="flex items-center gap-2 mb-1">
                  {loadingDraft ? <Clock className="w-5 h-5 animate-spin text-amber-600" /> : clockIn ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  {loadingDraft ? 'Sincronizando...' : clockIn ? 'Entrada Registrada' : 'Marcar Entrada'}
                </span>
                {clockIn && (
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <span className="text-emerald-900 bg-emerald-200/50 px-3 py-1 rounded-lg text-xs tracking-wider">{format(clockIn, 'hh:mm a')}</span>
                    {loadingLocation ? (
                      <span className="text-emerald-700 text-[10px] tracking-wide uppercase font-bold text-center leading-tight animate-pulse">
                        📍 Obteniendo ciudad...
                      </span>
                    ) : ubicacionEntrada && ubicacionEntrada !== 'N/A' ? (
                      <span className="text-emerald-700 text-[10px] tracking-wide uppercase font-bold text-center leading-tight">
                        📍 {ubicacionEntrada.includes('|||') ? ubicacionEntrada.split('|||')[1] : ubicacionEntrada}
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
                  clockOut
                    ? 'bg-rose-50 text-rose-700 border-rose-100'
                    : 'bg-slate-50 text-slate-400 border-slate-100 border-dashed'
                }`}
              >
                <span className="flex items-center gap-2 mb-1">
                  {clockOut ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5 opacity-50" />}
                  {clockOut ? 'Salida Registrada' : 'Salida Pendiente'}
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
        </div>
      </div>
    </div>
  );
}
