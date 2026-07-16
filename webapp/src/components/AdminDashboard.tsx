import { useState, useEffect } from 'react';
import { Search, Filter, AlertCircle, FileText, CheckCircle2, MessageSquare, X, Clock, Calendar as CalendarIcon, CheckCircle, Bell, Activity } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../lib/api';

const MOCK_REPORTS = [
  { id: 1, user: 'carmen luisa', date: '2026-07-15', clockIn: '08:00 AM', clockOut: '05:00 PM', status: 'Enviado', unread: true, content: 'TAREAS COMPLETADAS HOY:\n- [2 hrs] Llamada con cliente nuevo\n- [1 hrs] Redacción de correo\n\nACTIVIDADES PROGRAMADAS:\n- Visita a registro mercantil', files: [{name: 'Borrador_Alianza.pdf', size: '2.4 MB'}, {name: 'Reporte_Ventas.xlsx', size: '1.1 MB'}], progress: 100 },
  { id: 2, user: 'Empleado 2', date: '2026-07-15', clockIn: '08:15 AM', clockOut: null, status: 'En Curso', unread: false, content: '', files: [], progress: 45 },
  { id: 3, user: 'Empleado 3', date: '2026-07-15', clockIn: '07:50 AM', clockOut: '04:30 PM', status: 'Enviado', unread: true, content: 'TAREAS COMPLETADAS HOY:\n- [4 hrs] Revisión de contratos\n\nACTIVIDADES PROGRAMADAS:\n- Redactar minuta', files: [{name: 'Contrato_Firmado.pdf', size: '4.5 MB'}], progress: 100 },
];

export default function AdminDashboard() {
  const [reports, setReports] = useState<any[]>(MOCK_REPORTS);
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
  const [activeView, setActiveView] = useState<'bitacoras' | 'agenda'>('bitacoras');

  useEffect(() => {
    const fetchBitacoras = async () => {
      try {
        const response = await api.get('/rd-intranet/v1/bitacoras');
        if (response.data && Array.isArray(response.data)) {
          setReports(response.data.length > 0 ? response.data : MOCK_REPORTS);
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
      await api.post('/rd-intranet/v1/admin-update', {
        post_id: selectedReport.id,
        comentario_admin: adminComment,
        programaciones: adminProgramaciones
      });
      alert('Comentario y modificaciones guardadas. Se ha notificado al empleado.');
      
      setReports(reports.map(r => r.id === selectedReport.id ? { ...r, status: 'Revisado', unread: false, programaciones: adminProgramaciones } : r));
      setSelectedReport(null);
    } catch (error) {
      console.error('Error al guardar comentario', error);
      alert('Error de red al intentar guardar.');
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

  const handleResetData = async () => {
    if (confirm('¿Estás seguro de que deseas borrar TODAS las bitácoras y resetear los correlativos? Esta acción no se puede deshacer y es solo para limpiar datos de prueba.')) {
      try {
        await api.post('/rd-intranet/v1/reset-test-data', {});
        alert('Datos de prueba borrados exitosamente.');
        window.location.reload();
      } catch (error) {
        alert('Error al intentar borrar datos.');
      }
    }
  };

  const allScheduledTasks = reports
    .flatMap(r => (r.programaciones || []).map((p: any) => ({ ...p, user: r.user, sourceReport: r })))
    .filter(t => t.fecha >= format(new Date(), 'yyyy-MM-dd'))
    .sort((a, b) => {
      const dateA = new Date(`${a.fecha}T${a.hora || '00:00'}`);
      const dateB = new Date(`${b.fecha}T${b.hora || '00:00'}`);
      return dateA.getTime() - dateB.getTime();
    });

  const groupedTasks = allScheduledTasks.reduce((acc, task) => {
    if (!acc[task.fecha]) acc[task.fecha] = [];
    acc[task.fecha].push(task);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      
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
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-2">Centro de Mando</h2>
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
                {pendingReview > 0 && <span className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-slate-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-slate-950 p-4 flex justify-between items-center text-white border-b border-white/5">
                    <span className="font-bold text-sm tracking-widest uppercase text-amber-500 flex items-center gap-2"><Bell className="w-4 h-4"/> Notificaciones</span>
                    <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2 space-y-2">
                    {reports.filter(r => r.unread).length === 0 ? (
                       <div className="p-6 text-center text-slate-400 text-sm font-medium">No tienes notificaciones pendientes</div>
                    ) : (
                       reports.filter(r => r.unread).map(r => (
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
      <div className="flex gap-4">
        <button 
          onClick={() => setActiveView('bitacoras')}
          className={`flex-1 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${activeView === 'bitacoras' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          <FileText className="w-5 h-5" /> Revisión de Bitácoras
        </button>
        <button 
          onClick={() => setActiveView('agenda')}
          className={`flex-1 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${activeView === 'agenda' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          <CalendarIcon className="w-5 h-5" /> Agenda Global (Línea de Tiempo)
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
                        <Clock className="w-4 h-4 text-rose-400" /> Salida: {report.clockOut || 'Pendiente'}
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
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end rounded-b-3xl">
           <button onClick={handleResetData} className="text-xs font-bold text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-500 px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
             <AlertCircle className="w-4 h-4" /> Resetear Datos de Prueba
           </button>
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
            {Object.keys(groupedTasks).length === 0 ? (
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pl-4 lg:pl-8 border-l-2 border-amber-200">
                    {groupedTasks[dateStr].map((task: any, i: number) => (
                      <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-amber-400 transition-colors p-5 relative overflow-hidden group">
                        {task.observaciones && <div className="absolute top-0 right-0 w-16 h-16 bg-amber-100 rotate-45 translate-x-8 -translate-y-8 z-0"></div>}
                        <div className="relative z-10 flex flex-col h-full">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs uppercase border border-slate-200">
                                {task.user.substring(0, 2)}
                              </div>
                              <span className="font-bold text-slate-800 capitalize">{task.user}</span>
                            </div>
                            <span className="bg-slate-100 text-slate-600 font-bold text-xs px-2.5 py-1 rounded-md flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5"/> {task.hora}
                            </span>
                          </div>
                          
                          <p className="font-bold text-slate-800 mb-1">{task.tipoActuacion}</p>
                          <p className="text-sm text-slate-500 font-medium mb-4 flex items-center gap-1.5 line-clamp-2">
                            <Activity className="w-4 h-4 text-blue-500 shrink-0" /> {task.organismoTribunal}
                          </p>
                          
                          <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
                            {task.observaciones && (
                              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-2.5 rounded-lg font-medium">
                                <span className="font-bold block mb-0.5">Nota del Jefe:</span>
                                {task.observaciones}
                              </div>
                            )}
                            <button 
                              onClick={() => { setSelectedReport(task.sourceReport); setAdminComment(''); setAdminProgramaciones(task.sourceReport.programaciones || []); }}
                              className="w-full text-center py-2 bg-slate-50 hover:bg-slate-900 text-slate-600 hover:text-amber-400 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors border border-slate-200 hover:border-slate-800"
                            >
                              Editar Tarea en Bitácora
                            </button>
                          </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Hora de Entrada</p>
                    <p className="text-xl font-bold text-slate-800">{selectedReport.clockIn}</p>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Hora de Salida</p>
                    <p className="text-xl font-bold text-slate-800">{selectedReport.clockOut || 'Jornada Activa'}</p>
                  </div>
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
                        <tr><th className="p-3">Tipo / N°</th><th className="p-3">Partes</th><th className="p-3">Resumen</th><th className="p-3">Observaciones</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedReport.ingresos.map((ing: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              <span className="font-bold text-slate-800 block">{ing.tipo}</span>
                              <span className="font-bold text-blue-600 text-xs">{ing.numeroExpediente}</span>
                            </td>
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
              {(selectedReport.pdfBase64 || (selectedReport.files && selectedReport.files.length > 0)) && (
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 text-lg mb-4">
                    <FileText className="w-5 h-5 text-blue-500" /> Documentos de la Jornada
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Botón para descargar el PDF principal generado automáticamente */}
                    {selectedReport.pdfBase64 && (
                      <a 
                        href={selectedReport.pdfBase64} 
                        download={`Bitacora_${selectedReport.user}_${selectedReport.date}.pdf`}
                        className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl hover:border-amber-400 hover:bg-amber-100 transition-colors cursor-pointer group"
                      >
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-amber-200 group-hover:border-amber-400 transition-colors shadow-sm">
                          <FileText className="w-5 h-5 text-amber-500 group-hover:text-amber-600 transition-colors" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold text-slate-800 truncate">Reporte_Libros.pdf</p>
                          <p className="text-xs text-amber-700 font-bold">Generado automáticamente • Descargar</p>
                        </div>
                      </a>
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
              )}

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
            <div className="bg-white p-6 sm:p-8 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-4 rounded-b-3xl">
              <button onClick={() => setSelectedReport(null)} className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-lg">
                Cerrar
              </button>
              <button onClick={handleSaveComment} className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-bold shadow-xl transition-all flex items-center justify-center gap-3 text-lg hover:-translate-y-1">
                <CheckCircle2 className="w-6 h-6" /> Aprobar y Notificar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
