import { useState, useEffect } from 'react';
import { Search, Filter, AlertCircle, FileText, CheckCircle2, MessageSquare, X, Clock, Calendar as CalendarIcon, CheckCircle, Bell, Activity, MapPin, BookOpen, History, Send, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import api, { uploadPdfInChunks } from '../lib/api';
import SystemAlertModal, { type AlertType } from './common/SystemAlertModal';
import TabRegistroDiario from './employee/TabRegistroDiario';
import TabLibroIngresos from './employee/TabLibroIngresos';
import TabAgenda from './employee/TabAgenda';
import TabHistorial from './employee/TabHistorial';
import { TabInvestigaciones } from './employee/TabInvestigaciones';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminDashboard() {
  const [reports, setReports] = useState<any[]>([]);
  const [allDrafts, setAllDrafts] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [adminComment, setAdminComment] = useState('');
  const [adminProgramaciones, setAdminProgramaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para interactividad de la UI
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [datePreset, setDatePreset] = useState('Todos');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [activeView, setActiveView] = useState<'bitacoras' | 'agenda' | 'mis_libros' | 'historial'>('bitacoras');
  const [bossSubTab, setBossSubTab] = useState<'actuaciones' | 'ingresos' | 'programacion' | 'investigaciones' | 'cierre'>('actuaciones');
  
  // Estado local para Libros de Jefatura (sin horario/GPS)
  const [actuacionesJefe, setActuacionesJefe] = useState<any[]>(() => {
    const saved = localStorage.getItem('rd_jefe_actuaciones');
    return saved ? JSON.parse(saved) : [];
  });
  const [ingresosJefe, setIngresosJefe] = useState<any[]>(() => {
    const saved = localStorage.getItem('rd_jefe_ingresos');
    return saved ? JSON.parse(saved) : [];
  });
  const [programacionesJefe, setProgramacionesJefe] = useState<any[]>(() => {
    const saved = localStorage.getItem('rd_jefe_programacion');
    return saved ? JSON.parse(saved) : [];
  });
  const [attachedFilesJefe, setAttachedFilesJefe] = useState<{file: any, note: string}[]>([]);
  const [pendingTasksJefe, setPendingTasksJefe] = useState<any[]>([]);
  const [jefeReportSubmitted, setJefeReportSubmitted] = useState(false);
  const [submittingJefe, setSubmittingJefe] = useState(false);

  useEffect(() => {
    localStorage.setItem('rd_jefe_actuaciones', JSON.stringify(actuacionesJefe));
  }, [actuacionesJefe]);

  useEffect(() => {
    localStorage.setItem('rd_jefe_ingresos', JSON.stringify(ingresosJefe));
  }, [ingresosJefe]);

  useEffect(() => {
    localStorage.setItem('rd_jefe_programacion', JSON.stringify(programacionesJefe));
  }, [programacionesJefe]);

  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [dismissedNotifs, setDismissedNotifs] = useState<number[]>([]);
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
    const fetchBitacoras = async () => {
      try {
        const response = await api.get('/rd-intranet/v1/bitacoras');
        if (response.data && Array.isArray(response.data)) {
          const parsedData = response.data.map((r: any) => {
            const parseJson = (val: any) => {
              if (Array.isArray(val)) return val;
              if (typeof val === 'string') {
                try { return JSON.parse(val); } catch(e) { return []; }
              }
              return [];
            };
            return {
              ...r,
              actuaciones: parseJson(r.actuaciones),
              ingresos: parseJson(r.ingresos),
              programaciones: parseJson(r.programaciones)
            };
          });
          setReports(parsedData);
        }

        // También obtener borradores (Adelantos) para la Agenda Global
        const draftsRes = await api.get('/rd-intranet/v1/all-drafts');
        if (draftsRes.data && Array.isArray(draftsRes.data)) {
          setAllDrafts(draftsRes.data);
        }
      } catch (error) {
        console.error('Error fetching bitacoras', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBitacoras();
  }, []);

  const handleSaveComment = async () => {
    try {
      const updatedReport = {
        ...selectedReport,
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

      if (selectedReport.isDraft) {
        // Enviar a la nueva API de borradores
        await api.post('/rd-intranet/v1/admin-update-draft', {
          target_user_id: selectedReport.user_id,
          comentario_admin: adminComment,
          programaciones: adminProgramaciones
        });
      } else {
        await api.post('/rd-intranet/v1/admin-update', {
          post_id: selectedReport.id,
          comentario_admin: adminComment,
          programaciones: adminProgramaciones,
          pdf_base64: newPdfBase64
        });
      }
      setSystemAlert({
        isOpen: true,
        type: 'success',
        title: '¡Comentario y Cambios Guardados!',
        message: 'Las observaciones de Jefatura y modificaciones en la programación han sido registradas en el PDF oficial y se ha notificado al empleado.'
      });
      
      if (selectedReport.isDraft) {
        setAllDrafts(allDrafts.map(d => d.user_id === selectedReport.user_id ? { ...d, programaciones: adminProgramaciones, comentario_admin: adminComment } : d));
      } else {
        setReports(reports.map(r => r.id === selectedReport.id ? { ...r, status: 'Revisado', unread: false, programaciones: adminProgramaciones, pdfBase64: newPdfBase64 || r.pdfBase64 } : r));
      }
      setSelectedReport(null);
    } catch (error) {
      console.error('Error al guardar comentario', error);
      setSystemAlert({
        isOpen: true,
        type: 'error',
        title: 'Error de Red o Conexión',
        message: 'No se pudieron guardar las modificaciones en el servidor. Por favor verifica tu conexión y vuelve a intentarlo.'
      });
    }
  };

  const updateProgramacionField = (index: number, field: string, value: string) => {
    const updated = [...adminProgramaciones];
    updated[index] = { ...updated[index], [field]: value };
    setAdminProgramaciones(updated);
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
        } catch (e) {}
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
          `${report.clockIn || 'N/A'} — ${report.clockOut || 'N/A'}`,
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

  let filteredReports = reports.filter(r => r.user.toLowerCase().includes(searchTerm.toLowerCase()));
  
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

  const pendingReview = reports.filter(r => r.status === 'Enviado').length;
  const inProgress = reports.filter(r => r.status === 'En Curso').length;

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      await api.post('/rd-intranet/v1/reset-test-data', {});
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
  const draftTasks = allDrafts.flatMap(d => (d.programaciones || []).map((p: any) => ({
    ...p,
    user: d.user,
    isDraft: true,
    user_id: d.user_id,
    sourceReport: { isDraft: true, user_id: d.user_id, user: d.user, programaciones: d.programaciones, comentario_admin: d.comentario_admin }
  })));
  
  const allScheduledTasks = reports
    .flatMap(r => (r.programaciones || []).map((p: any) => ({ ...p, user: r.user, sourceReport: r, isDraft: false })))
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

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const activeNotifications = reports.filter(r => 
    r.status === 'Enviado' && 
    r.date === todayStr && 
    !dismissedNotifs.includes(r.id)
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
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
      
      {/* Header Premium Glassmorphism */}
      <div className="bg-slate-900 rounded-3xl p-8 lg:p-10 text-white shadow-2xl border border-slate-800 relative">
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 backdrop-blur-md rounded-md border border-amber-500/20 mb-4">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-xs font-bold tracking-widest text-amber-500 uppercase">Jefatura</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-2">Centro de Mando KANT</h2>
            <p className="text-slate-400 text-lg font-medium">Supervisión en tiempo real de bitácoras y asistencia del equipo.</p>
          </div>
          
          {/* Stats & Notifications Row */}
          <div className="flex items-center gap-4 w-full lg:w-auto">
            {/* Stat Cards */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 text-center flex-1 lg:w-32">
              <p className="text-3xl font-bold text-white">{inProgress}</p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">Activos Hoy</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 text-center flex-1 lg:w-32 relative">
              {pendingReview > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shadow-lg animate-bounce">{pendingReview}</span>}
              <p className="text-3xl font-bold text-amber-400">{pendingReview}</p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">Por Revisar</p>
            </div>

            {/* Notification Bell */}
            <div className="relative ml-2">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-5 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl hover:bg-white/10 transition-colors"
              >
                <Bell className="w-7 h-7 text-amber-400" />
                {activeNotifications.length > 0 && <span className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-slate-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-slate-950 p-4 flex justify-between items-center text-white border-b border-white/5">
                    <span className="font-bold text-sm tracking-widest uppercase text-amber-500 flex items-center gap-2">
                      <Bell className="w-4 h-4"/> Notificaciones
                    </span>
                    <div className="flex items-center gap-3">
                      {activeNotifications.length > 0 && (
                        <button 
                          onClick={() => setDismissedNotifs([...dismissedNotifs, ...activeNotifications.map(n => n.id)])} 
                          className="text-xs font-bold text-slate-400 hover:text-amber-500 transition-colors uppercase tracking-wider"
                        >
                          Vaciar
                        </button>
                      )}
                      <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2 space-y-2">
                    {activeNotifications.length === 0 ? (
                       <div className="p-6 text-center text-slate-400 text-sm font-medium">No tienes notificaciones pendientes para hoy</div>
                    ) : (
                       activeNotifications.map(r => (
                         <div key={r.id} className="p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 hover:border-amber-500/30 cursor-pointer transition-all group" onClick={() => {setSelectedReport(r); setShowNotifications(false);}}>
                           <p className="text-sm font-bold text-white capitalize">{r.user} <span className="font-medium text-slate-400 normal-case block mt-0.5">ha enviado su bitácora</span></p>
                           <p className="text-xs text-amber-500 font-bold mt-2 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Requiere revisión urgente</p>
                         </div>
                       ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Vistas */}
      <div className="flex flex-wrap gap-4">
        <button 
          onClick={() => setActiveView('bitacoras')}
          className={`flex-1 min-w-[200px] p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${activeView === 'bitacoras' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          <FileText className="w-5 h-5" /> Revisión de Bitácoras
        </button>
        <button 
          onClick={() => setActiveView('agenda')}
          className={`flex-1 min-w-[200px] p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${activeView === 'agenda' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          <CalendarIcon className="w-5 h-5" /> Agenda Global (Línea de Tiempo)
        </button>
        <button 
          onClick={() => setActiveView('mis_libros')}
          className={`flex-1 min-w-[200px] p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${activeView === 'mis_libros' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          <BookOpen className="w-5 h-5" /> Mis Libros (Jefatura)
        </button>
        <button 
          onClick={() => setActiveView('historial')}
          className={`flex-1 min-w-[200px] p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${activeView === 'historial' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          <History className="w-5 h-5" /> Mi Historial de Jefatura
        </button>
      </div>

      {/* Main Content Area */}
      {activeView === 'bitacoras' && (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200">
        
        {/* Controles y Búsqueda */}
        <div className="p-6 lg:p-8 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar bitácora por empleado..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-medium text-slate-700" 
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <button 
                onClick={() => setShowDateFilter(!showDateFilter)}
                className="w-full bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
              >
                <CalendarIcon className="w-5 h-5 text-amber-500" /> {datePreset === 'Todos' ? 'Filtrar por Fecha' : datePreset}
              </button>
              
              {showDateFilter && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-40 animate-in fade-in slide-in-from-top-1">
                  <div className="p-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">Fechas Rápidas</div>
                  {['Todos', 'Hoy', 'Ayer', 'Últimos 7 días'].map(preset => (
                    <button 
                      key={preset}
                      onClick={() => { setDatePreset(preset); setShowDateFilter(false); }}
                      className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors border-b border-slate-100 last:border-0 ${datePreset === preset ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50'}`}
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
                className="w-full bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
              >
                <Filter className="w-5 h-5 text-blue-500" /> {statusFilter === 'Todos' ? 'Filtrar por Estado' : statusFilter}
              </button>
              
              {showFilters && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-40 animate-in fade-in slide-in-from-top-1">
                  <div className="p-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</div>
                  {['Todos', 'En Curso', 'Enviado', 'Revisado'].map(status => (
                    <button 
                      key={status}
                      onClick={() => { setStatusFilter(status); setShowFilters(false); }}
                      className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors border-b border-slate-100 last:border-0 ${statusFilter === status ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabla de Registros */}
        <div className="overflow-x-auto">
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
                <tr><td colSpan={4} className="text-center p-12 text-slate-500 font-medium">Conectando con la base de datos central...</td></tr>
              ) : filteredReports.map((report) => (
                <tr key={report.id} className={`hover:bg-slate-50/80 transition-colors group ${report.unread ? 'bg-amber-50/10' : ''}`}>
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold uppercase tracking-wider text-sm border-2 border-white shadow-sm">
                          {report.user.substring(0, 2)}
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
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <Clock className="w-4 h-4 text-emerald-500" /> Entrada: {report.clockIn}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                        <Clock className="w-4 h-4 text-rose-400" /> 
                        Salida: {report.clockOut || 'Pendiente'}
                        {report.cierreRetrasado && (
                           <span className="ml-1 text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full uppercase tracking-widest font-black">
                             Cerrada con Retraso
                           </span>
                        )}
                      </div>
                    </div>
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
                            className={`h-2 rounded-full transition-all duration-1000 ${
                              report.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500 relative overflow-hidden'
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
                        ⬇️ PDF
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
                      onClick={() => { setSelectedReport(report); setAdminComment(''); setAdminProgramaciones(report.programaciones || []); }}
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
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center rounded-b-3xl text-xs text-slate-400 font-medium px-6">
           <span>Mostrando registros oficiales de bitácora en la base de datos central KANT</span>
        </div>
      </div>
      )}

      {/* VISTA: AGENDA GLOBAL */}
      {activeView === 'agenda' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 lg:p-10">
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3"><CalendarIcon className="w-7 h-7 text-amber-500"/> Planificación del Equipo</h3>
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
                              {userGroup.user.substring(0, 2)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 capitalize block">{userGroup.user}</span>
                              <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border inline-block mt-1 ${userGroup.isDraft ? 'bg-amber-50 text-amber-600 border-amber-200' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                                {userGroup.isDraft ? 'AVANCE / BORRADOR' : 'BITÁCORA CONFIRMADA'}
                              </span>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => { setSelectedReport(userGroup.sourceReport); setAdminComment(userGroup.sourceReport.comentario_admin || ''); setAdminProgramaciones(userGroup.sourceReport.programaciones || []); }}
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
                onClick={() => setBossSubTab('investigaciones')}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${bossSubTab === 'investigaciones' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <BookOpen className="w-4 h-4" /> Investigaciones
              </button>
              <button 
                onClick={() => setBossSubTab('cierre')}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${bossSubTab === 'cierre' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-600 hover:bg-blue-50 font-extrabold'}`}
              >
                <Send className="w-4 h-4" /> Generar Bitácora PDF
              </button>
            </div>
          </div>

          {bossSubTab === 'actuaciones' && (
            <TabRegistroDiario 
              reportSubmitted={jefeReportSubmitted}
              actuaciones={actuacionesJefe}
              setActuaciones={setActuacionesJefe}
              attachedFiles={attachedFilesJefe}
              setAttachedFiles={setAttachedFilesJefe}
              pendingTasks={pendingTasksJefe}
              setPendingTasks={setPendingTasksJefe}
              globalExpedientes={[]}
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

          {bossSubTab === 'investigaciones' && (
            <TabInvestigaciones />
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
                      const currentUserObj = JSON.parse(localStorage.getItem('rd_user') || '{}');
                      const jefeName = currentUserObj.name || currentUserObj.username || 'Jefe Administrador';
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
                        doc.text('▪  1. LIBRO DE ACTUACIONES DIARIAS (GESTIÓN ADMINISTRATIVA)', 14, finalY + 5);

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
                        doc.text('▪  2. LIBRO DE INGRESOS (CASOS Y EXPEDIENTES RECIBIDOS)', 14, finalY + 5);

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
                        doc.text('▪  3. LIBRO DE PROGRAMACIÓN (AGENDA Y AUDIENCIAS FUTURAS)', 14, finalY + 5);

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
                      }

                      doc.save(`Bitacora_Jefatura_${jefeName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
                      const pdfBase64 = doc.output('datauristring');
                      const response = await api.post('/rd-intranet/v1/submit', {
                        fecha: format(new Date(), 'yyyy-MM-dd'),
                        hora_entrada: 'N/A (Jefatura)',
                        hora_salida: 'N/A (Jefatura)',
                        actuaciones_json: JSON.stringify(actuacionesJefe),
                        ingresos_json: JSON.stringify(ingresosJefe),
                        programaciones_json: JSON.stringify(programacionesJefe),
                        contenido_bitacora: 'Bitácora Oficial de Gestión - Régimen de Jefatura / Administración',
                        bitacora_pdf_base64: '',
                        pdf_base64: '',
                        ubicacion_entrada: 'Régimen de Jefatura (Sin GPS)',
                        ubicacion_salida: 'Régimen de Jefatura (Sin GPS)',
                        cierre_retrasado: false,
                        estado_revision: 'Jefatura'
                      });
                      const postId = response.data?.post_id;
                      if (postId && pdfBase64) {
                        console.log(`Cargando archivo PDF de Jefatura por bloques al servidor (post_id: ${postId})...`);
                        await uploadPdfInChunks(postId, pdfBase64);
                      }

                      // Limpiar el borrador de jefatura para iniciar un nuevo día
                      localStorage.removeItem('rd_jefe_actuaciones');
                      localStorage.removeItem('rd_jefe_ingresos');
                      localStorage.removeItem('rd_jefe_programacion');
                      setActuacionesJefe([]);
                      setIngresosJefe([]);
                      setProgramacionesJefe([]);

                      setJefeReportSubmitted(true);
                      setSystemAlert({
                        isOpen: true,
                        type: 'success',
                        title: '¡Bitácora de Jefatura Guardada!',
                        message: 'Tu bitácora y registros oficiales de jefatura se han generado en PDF y archivado en el sistema con éxito.'
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

      {/* Modal de Revisión y Edición con Glassmorphism */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="bg-slate-900 p-6 sm:p-8 flex justify-between items-start text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xl font-bold border border-white/20 uppercase tracking-widest">
                    {selectedReport.user.substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold flex items-center gap-3">
                      Bitácora de {selectedReport.user}
                      <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded-md border border-amber-500/30 uppercase tracking-widest font-bold">Modo Revisión</span>
                    </h3>
                    <p className="text-slate-400 font-medium">{selectedReport.date}</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedReport(null)} className="relative z-10 p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-8 bg-slate-50/50">
              
              {/* Info General (Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Clock className="w-4 h-4 text-emerald-500"/> Entrada</p>
                  <p className="text-xl font-bold text-slate-800">{selectedReport.clockIn}</p>
                </div>
                
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-emerald-500"/> GPS Entrada</p>
                  {selectedReport.ubicacionEntrada && selectedReport.ubicacionEntrada !== 'N/A' ? (
                    <div className="flex flex-col items-start gap-1">
                      {selectedReport.ubicacionEntrada.includes('|||') && (
                        <span className="text-xs font-bold text-slate-700">{selectedReport.ubicacionEntrada.split('|||')[1]}</span>
                      )}
                      <a href={`https://www.google.com/maps/search/?api=1&query=${selectedReport.ubicacionEntrada.split('|||')[0]}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 py-1 px-2 rounded w-max transition-colors">
                        Ver en Mapa
                      </a>
                    </div>
                  ) : <p className="text-sm font-bold text-slate-400">No registrada</p>}
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Clock className="w-4 h-4 text-rose-500"/> Salida</p>
                  <p className="text-xl font-bold text-slate-800">{selectedReport.clockOut || 'Activa'}</p>
                </div>
                
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-rose-500"/> GPS Salida</p>
                  {selectedReport.ubicacionSalida && selectedReport.ubicacionSalida !== 'N/A' ? (
                    <div className="flex flex-col items-start gap-1">
                      {selectedReport.ubicacionSalida.includes('|||') && (
                        <span className="text-xs font-bold text-slate-700">{selectedReport.ubicacionSalida.split('|||')[1]}</span>
                      )}
                      <a href={`https://www.google.com/maps/search/?api=1&query=${selectedReport.ubicacionSalida.split('|||')[0]}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 py-1 px-2 rounded w-max transition-colors">
                        Ver en Mapa
                      </a>
                    </div>
                  ) : <p className="text-sm font-bold text-slate-400">No registrada</p>}
                </div>
              </div>

              {/* LIBRO DE ACTUACIONES (REALIZADO) */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 text-lg mb-4">
                  <CheckCircle className="w-5 h-5 text-emerald-500" /> Libro de Actuaciones (Hoy)
                </h4>
                {(!selectedReport.actuaciones || selectedReport.actuaciones.length === 0) ? (
                  <p className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded-lg">No hay actuaciones registradas.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs border-b border-slate-200">
                        <tr><th className="p-3">Expediente</th><th className="p-3">Fecha/Hora</th><th className="p-3">Órgano/Tribunal</th><th className="p-3">Actuación</th><th className="p-3">Observaciones</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedReport.actuaciones.map((act: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="p-3 font-medium text-slate-800">{act.expediente}</td>
                            <td className="p-3 text-slate-500">{act.fecha} {act.hora}</td>
                            <td className="p-3 text-slate-600">{act.organismoTribunal}</td>
                            <td className="p-3 text-slate-600">{act.tipoActuacion}<br/><span className="text-xs text-slate-400">{act.resumen}</span></td>
                            <td className="p-3 text-slate-500 text-xs">{act.observaciones}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* LIBRO DE INGRESOS (REALIZADO) */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 text-lg mb-4">
                  <FileText className="w-5 h-5 text-blue-500" /> Libro de Ingresos (Nuevos Casos)
                </h4>
                {(!selectedReport.ingresos || selectedReport.ingresos.length === 0) ? (
                  <p className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded-lg">No hay nuevos ingresos registrados.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs border-b border-slate-200">
                        <tr><th className="p-3">Tipo / N°</th><th className="p-3">Tribunal / Organismo</th><th className="p-3">Partes</th><th className="p-3">Resumen</th><th className="p-3">Observaciones</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedReport.ingresos.map((ing: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              <span className="font-bold text-slate-800 block">{ing.tipo}</span>
                              <span className="font-bold text-blue-600 text-xs">{ing.numeroExpediente}</span>
                            </td>
                            <td className="p-3 text-slate-700 font-bold text-xs">{ing.organismoTribunal || 'N/A'}</td>
                            <td className="p-3 text-slate-600 font-medium">{ing.partes}</td>
                            <td className="p-3 text-slate-600 text-xs">{ing.resumen}</td>
                            <td className="p-3 text-slate-500 text-xs">{ing.observaciones}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
                        <p className="text-xs text-emerald-800 font-extrabold flex items-center gap-1">⬇️ Ver / Descargar PDF Oficial</p>
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
                            ⚡ Generar y Descargar Documento Oficial PDF (Reconstruido desde datos KANT)
                          </p>
                        </div>
                      </div>
                      <span className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl font-black text-xs shrink-0 ml-2 shadow-sm">
                        ⬇️ GENERAR PDF
                      </span>
                    </button>
                  )}

                  {selectedReport.files && selectedReport.files.map((file: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer group">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200 group-hover:border-blue-300 transition-colors">
                        <FileText className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-slate-700 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500 font-medium">{file.size} • Haz clic para descargar</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 text-lg mb-2">
                  <MessageSquare className="w-5 h-5 text-blue-500" /> Feedback Administrativo
                </h4>
                <p className="text-sm text-slate-500 font-medium mb-4">Añade comentarios o instrucciones. El empleado recibirá una notificación.</p>
                <textarea 
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  placeholder="Escribe tus observaciones aquí..."
                  rows={4}
                  className="w-full p-4 text-lg border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none shadow-inner"
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-white p-6 sm:p-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 rounded-b-3xl">
              {!selectedReport.isDraft ? (
                <button 
                  onClick={() => {
                    setSystemAlert({
                      isOpen: true,
                      type: 'warning',
                      title: '¿Confirmar Reapertura?',
                      message: `¿Estás seguro de reabrir y reiniciar la jornada exclusiva de ${selectedReport.user} para el día ${selectedReport.date}? Esto eliminará su bitácora de ese día y le permitirá marcar entrada nuevamente.`,
                      showCancel: true,
                      confirmText: 'Sí, Reabrir Jornada',
                      cancelText: 'Cancelar',
                      onConfirm: async () => {
                        setSystemAlert(prev => ({ ...prev, isOpen: false }));
                        try {
                          await api.post('/rd-intranet/v1/reset-user-day', { post_id: selectedReport.id, date: selectedReport.date });
                          setSystemAlert({
                            isOpen: true,
                            type: 'success',
                            title: 'Jornada Reabierta',
                            message: 'La jornada ha sido reabierta exitosamente. La pantalla se actualizará.',
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
                  className="w-full sm:w-auto px-6 py-4 rounded-xl font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors text-sm flex items-center justify-center gap-2 shadow-sm"
                >
                  ⚙️ Eliminar Bitácora / Reiniciar Día
                </button>
              ) : (
                <button 
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
                          await api.post('/rd-intranet/v1/admin-update-draft', {
                            target_user_id: selectedReport.user_id,
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
                  className="w-full sm:w-auto px-6 py-4 rounded-xl font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors text-sm flex items-center justify-center gap-2 shadow-sm"
                >
                  🗑️ Descartar Avance
                </button>
              )}

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button onClick={() => setSelectedReport(null)} className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-lg">
                  Cerrar
                </button>
                <button onClick={handleSaveComment} className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-bold shadow-xl transition-all flex items-center justify-center gap-3 text-lg hover:-translate-y-1">
                  <CheckCircle2 className="w-6 h-6" /> Aprobar y Notificar
                </button>
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
    </div>
  );
}
