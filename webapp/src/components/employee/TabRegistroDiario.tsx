import React, { useState, useMemo } from 'react';
import { CheckCircle2, Clock, XCircle, Plus, X, UploadCloud, MessageSquare, Trash2, FileText, AlertCircle, RotateCw, FolderSearch, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Actuacion } from '../../types/libros';
import { fileToDataUrl } from '../../lib/api';
import { supabaseUploadFile, getUserDepartment } from '../../lib/supabaseAdapter';
import ExpedienteSelectorModal from '../common/ExpedienteSelectorModal';
import EstudioMarketingGrilla from '../marketing/EstudioMarketingGrilla';

interface TabRegistroDiarioProps {
  reportSubmitted: boolean;
  actuaciones: Actuacion[];
  setActuaciones: React.Dispatch<React.SetStateAction<Actuacion[]>>;
  attachedFiles: any[];
  setAttachedFiles: (f: any[]) => void;
  pendingTasks: any[];
  setPendingTasks: (t: any) => void;
  globalExpedientes?: any[];
  ingresosActivos?: any[];
}

export default function TabRegistroDiario({
  reportSubmitted,
  actuaciones, setActuaciones, attachedFiles, setAttachedFiles,
  pendingTasks, setPendingTasks,
  globalExpedientes = [],
  ingresosActivos = []
}: TabRegistroDiarioProps) {

  const currentUserName = localStorage.getItem('rd_user_name') || localStorage.getItem('rd_user_email') || '';
  const userDept = useMemo(() => getUserDepartment(currentUserName), [currentUserName]);

  const deptConfig = useMemo(() => {
    switch (userDept) {
      case 'Marketing':
        return {
          title: 'Grilla de Contenido & Marketing Digital',
          subtitle: 'Registra los contenidos a trabajar, copies, formatos y enlaces de Drive para revisión y aprobación de Jefatura.',
          btnNew: '+ Nuevo Contenido de Marketing',
          col1: 'Hora',
          col2: 'Canal / Red Social *',
          col2Placeholder: 'Ej: Instagram (@romanydelgado), TikTok, LinkedIn, Web...',
          col3: 'Formato / Tipo',
          col3Placeholder: 'Ej: Reel, Carrusel, Historia, Post, Guion...',
          col4: 'Copywriting / Enlace Drive / Pieza Visual *',
          col4Placeholder: 'Texto del copy, guión o enlace a la carpeta de Google Drive...',
          col5: 'Estatus',
          col6: 'Feedback / Aprobación Jefatura',
          col6Placeholder: 'Observaciones de Víctor Román / Luis Delgado, fecha de publicación...',
          emptyText: 'No has registrado ningún contenido hoy. Haz clic en "+ Nuevo Contenido de Marketing".',
          showExpedienteSelector: false,
          attachmentsTitle: 'Material Visual & Archivos de Marketing',
          attachmentsSubtitle: 'Anexa piezas gráficas, capturas de métricas, guiones o videos de referencia para tus publicaciones de hoy.',
          attachmentsDropzoneText: 'Haz clic o arrastra imágenes, videos o guiones para anexar a la grilla'
        };
      case 'Servicios Generales':
        return {
          title: 'Bitácora de Servicios Generales, Sede & Mantenimiento',
          subtitle: 'Control de mantenimiento, limpieza, insumos, compras y estado de las instalaciones del despacho.',
          btnNew: '+ Nueva Tarea / Mantenimiento',
          col1: 'Hora',
          col2: 'Área / Espacio *',
          col2Placeholder: 'Ej: Sala de Juntas, Oficinas, Cocina, Baños...',
          col3: 'Insumo / Tipo',
          col3Placeholder: 'Ej: Limpieza profunda, Reparación, Insumos café...',
          col4: 'Detalle de Labor / Insumo Requerido *',
          col4Placeholder: 'Qué labor se realizó o qué insumos hace falta reponer...',
          col5: 'Estatus',
          col6: 'Prioridad / Observaciones',
          col6Placeholder: 'Notas para Jefatura, urgencia o estado de compra...',
          emptyText: 'No has registrado ninguna labor hoy. Haz clic en "+ Nueva Tarea / Mantenimiento".',
          showExpedienteSelector: false,
          attachmentsTitle: 'Comprobantes & Fotos de Mantenimiento',
          attachmentsSubtitle: 'Anexa fotografías de las áreas atendidas, facturas de compras o comprobantes de insumos de hoy.',
          attachmentsDropzoneText: 'Haz clic o arrastra fotos o facturas para anexar a la bitácora'
        };
      case 'Contabilidad':
        return {
          title: 'Bitácora de Contabilidad, Finanzas & SENIAT',
          subtitle: 'Registro diario de conciliaciones bancarias, cierres, impuestos SENIAT, retenciones y balances.',
          btnNew: '+ Nueva Operación / Asiento',
          col1: 'Hora',
          col2: 'Cuenta / Entidad *',
          col2Placeholder: 'Ej: Banesco, SENIAT, Facturación, Nómina...',
          col3: 'Partida / Proveedor',
          col3Placeholder: 'Ej: Declaración IVA, ISLR, Pago Servicios...',
          col4: 'Detalle Contable / Monto *',
          col4Placeholder: 'Descripción de la operación, monto o trámite fiscal...',
          col5: 'Estatus',
          col6: 'Comprobantes / Notas',
          col6Placeholder: 'N° de transferencia, observaciones para Jefatura...',
          emptyText: 'No has registrado ninguna operación hoy. Haz clic en "+ Nueva Operación / Asiento".',
          showExpedienteSelector: false,
          attachmentsTitle: 'Soportes Contables & Facturas SENIAT',
          attachmentsSubtitle: 'Anexa facturas, planillas de pago SENIAT, comprobantes de retención o estados de cuenta bancarios.',
          attachmentsDropzoneText: 'Haz clic o arrastra facturas, planillas o soportes para anexar'
        };
      case 'Sistemas':
        return {
          title: 'Bitácora de Sistemas, Plataforma KANT & Infraestructura',
          subtitle: 'Registro de desarrollo web, servidores, base de datos Supabase, integraciones y soporte técnico.',
          btnNew: '+ Nueva Tarea de Sistemas',
          col1: 'Hora',
          col2: 'Módulo / Servidor *',
          col2Placeholder: 'Ej: Nómina, Supabase, Bitácoras, Auth, Servidores...',
          col3: 'Componente / Tarea',
          col3Placeholder: 'Ej: Bugfix, Feature, Optimización, Script, Backup...',
          col4: 'Detalle Técnico / Cambios Implementados *',
          col4Placeholder: 'Descripción de los cambios o solución implementada...',
          col5: 'Estatus',
          col6: 'Notas de Despliegue',
          col6Placeholder: 'Commit, pull request o notas técnicas...',
          emptyText: 'No has registrado ninguna tarea técnica hoy. Haz clic en "+ Nueva Tarea de Sistemas".',
          showExpedienteSelector: false,
          attachmentsTitle: 'Archivos & Soportes Técnicos',
          attachmentsSubtitle: 'Anexa logs de error, capturas de pantalla, diagramas de arquitectura o scripts de soporte para tus tareas de hoy.',
          attachmentsDropzoneText: 'Haz clic o arrastra capturas, logs o archivos técnicos para anexar'
        };
      default:
        return {
          title: 'Libro de Actuaciones',
          subtitle: 'Registra detalladamente tus gestiones y actuaciones de hoy.',
          btnNew: 'Nueva Actuación',
          col1: 'Hora',
          col2: 'N° Asunto *',
          col2Placeholder: 'Ej. RD-J-2026...',
          col3: 'Partes',
          col3Placeholder: 'Ej. Parte A vs. Parte B',
          col4: 'Actuación *',
          col4Placeholder: 'Describe qué se hizo *',
          col5: 'Estado',
          col6: 'Observaciones',
          col6Placeholder: 'Notas o estatus',
          emptyText: 'No has registrado ninguna actuación. Haz clic en "Nueva Actuación".',
          showExpedienteSelector: true,
          attachmentsTitle: 'Archivos Adjuntos a las Actuaciones',
          attachmentsSubtitle: 'Anexa documentos o imágenes de soporte para tus actuaciones de hoy. Quedarán archivados y podrás consultarlos (tú y la jefatura) en cualquier momento desde el historial.',
          attachmentsDropzoneText: 'Haz clic o arrastra archivos aquí para anexar a la bitácora'
        };
    }
  }, [userDept]);

  const [activeSelectorRowId, setActiveSelectorRowId] = useState<string | null>(null);

  const handleToggleTask = (id: number) => {
    if (reportSubmitted) return;
    setPendingTasks((tasks: any) => tasks.map((t: any) => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const [uploadingFiles, setUploadingFiles] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadingFiles(true);
      const selected = Array.from(e.target.files);
      const newFiles = await Promise.all(
        selected.map(async (file) => {
          let cloudUrl = '';
          try {
            cloudUrl = await supabaseUploadFile('evidencias', file, 'evidencias');
          } catch (uploadErr) {
            console.warn('Subida directa a Supabase Storage falló, usando dataUrl fallback:', uploadErr);
          }

          let dataUrl = '';
          if (!cloudUrl && file.size < 4 * 1024 * 1024) {
            try {
              dataUrl = await fileToDataUrl(file);
            } catch (err) {
              console.warn('Error convirtiendo archivo a dataUrl:', err);
            }
          }

          return {
            file,
            name: file.name,
            type: file.type,
            size: file.size,
            url: cloudUrl || '',
            dataUrl: dataUrl || '',
            note: '',
            uploaded_at: new Date().toISOString()
          };
        })
      );
      setAttachedFiles([...attachedFiles, ...newFiles]);
      setUploadingFiles(false);
      e.target.value = '';
    }
  };

  const updateFileNote = (index: number, note: string) => {
    const updated = [...attachedFiles];
    updated[index].note = note;
    setAttachedFiles(updated);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  const handleAddActuacion = () => {
    const newActuacion: Actuacion = {
      id: Math.random().toString(36).substring(7),
      hora: format(new Date(), 'HH:mm'),
      numeroAsunto: '',
      partes: '',
      actuacion: '',
      observaciones: '',
      estado: 'Completada'
    };
    setActuaciones([...actuaciones, newActuacion]);
  };

  const handleRemoveActuacion = (id: string) => {
    setActuaciones(actuaciones.filter(a => a.id !== id));
  };

  const updateActuacionField = (id: string, field: keyof Actuacion, value: string) => {
    setActuaciones(actuaciones.map(a => {
      if (a.id === id) {
        const updated = { ...a, [field]: value };
        // Auto-completar partes si es numeroAsunto
        if (field === 'numeroAsunto') {
          const matchingExpediente = allCombinedExpedientes.find((e: any) => e.numeroExpediente === value);
          if (matchingExpediente && !updated.partes) {
            updated.partes = matchingExpediente.partes;
          }
        }
        return updated;
      }
      return a;
    }));
  };

  // Combinar expedientes globales con los ingresos de esta misma sesión (deduplicación inteligente)
  const allCombinedExpedientes = useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();

    const normalize = (val: string) => (val || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Ingresos registrados en esta sesión / día (prioridad máxima con distintivo)
    (ingresosActivos || []).forEach(ing => {
      const num = (ing.numeroExpediente || '').trim();
      const norm = normalize(num);
      if (num && norm.length >= 2 && !seen.has(norm)) {
        seen.add(norm);
        list.push({
          id: ing.id,
          numeroExpediente: num,
          partes: ing.partes || '',
          organismoTribunal: ing.organismoTribunal || '',
          tipo: ing.tipo || 'Judicial',
          isNewToday: true
        });
      }
    });

    // 2. Expedientes globales del sistema
    (globalExpedientes || []).forEach(exp => {
      const num = (exp.numeroExpediente || exp.numero || exp.codigoCorrelativo || '').trim();
      const norm = normalize(num);
      if (num && norm.length >= 2 && !seen.has(norm)) {
        seen.add(norm);
        list.push({
          id: exp.id,
          numeroExpediente: num,
          partes: exp.partes || exp.titulo || '',
          organismoTribunal: exp.organismoTribunal || exp.tribunal || exp.juzgado || '',
          tipo: exp.tipo || exp.materia || 'Judicial',
          isNewToday: false
        });
      }
    });

    return list;
  }, [globalExpedientes, ingresosActivos]);

  const handleSelectExpedienteForActuacion = (exp: any) => {
    if (!activeSelectorRowId) return;
    setActuaciones(prev => prev.map(a => {
      if (a.id === activeSelectorRowId) {
        return {
          ...a,
          numeroAsunto: exp.numeroExpediente,
          partes: exp.partes || a.partes
        };
      }
      return a;
    }));
    setActiveSelectorRowId(null);
  };

  if (userDept === 'Marketing') {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-300">
        <EstudioMarketingGrilla 
          actuaciones={actuaciones}
          setActuaciones={setActuaciones}
          reportSubmitted={reportSubmitted}
        />

        {/* Sección: Subida de Artes, Diseños y Archivos Adjuntos a la Bitácora */}
        <div className="mt-8 bg-white p-6 lg:p-8 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <UploadCloud className="w-6 h-6 text-purple-600" />
              <h3 className="text-xl font-bold text-slate-800">
                Material Visual, Miniaturas & Adjuntos de Marketing
                <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-semibold border border-slate-200 ml-2">Opcional</span>
              </h3>
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium mb-4">
            Anexa artes gráficos, capturas de pantalla de métricas de Instagram o miniaturas de los posts para que queden archivados formalmente en tu bitácora de hoy.
          </p>

          <div className="border-2 border-dashed border-purple-200 bg-purple-50/20 rounded-2xl p-8 text-center hover:bg-purple-50/50 hover:border-purple-300 transition-all group mb-6 relative">
            <input type="file" id="evidencia_mkt" disabled={reportSubmitted} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" multiple onChange={handleFileUpload} />
            <div className="flex flex-col items-center gap-3 pointer-events-none">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xs border border-purple-200 text-purple-600">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div>
                <span className="font-bold text-base block text-slate-700">Arrastra imágenes, artes o documentos de marketing aquí</span>
                <span className="text-xs text-slate-400 font-bold mt-0.5 block">Admite JPG, PNG, MP4, PDF, Word o capturas</span>
              </div>
            </div>
          </div>

          {/* Listado de archivos adjuntos */}
          {attachedFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Artes y Archivos Adjuntados ({attachedFiles.length}):</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="font-bold text-slate-800 truncate">{file.name || file.file?.name}</span>
                    </div>
                    {!reportSubmitted && (
                      <button type="button" onClick={() => removeFile(idx)} className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-white p-6 lg:p-10 rounded-3xl shadow-sm border border-slate-200 space-y-10">
          
          {/* Sección: Tareas Programadas (Checklist de ayer) */}
          <section>
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <h3 className="text-xl font-bold text-slate-800">Mi Agenda para Hoy</h3>
            </div>
            <p className="text-sm text-slate-500 font-medium mb-4">Actividades planificadas previamente e instrucciones asignadas por Jefatura.</p>
            
            <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-3">
              {pendingTasks.length === 0 ? (
                <div className="text-center py-6 text-slate-400 italic text-sm font-medium">
                  No hay tareas programadas para hoy.
                </div>
              ) : pendingTasks.map((task) => {
                const note = task.observaciones || task.originalData?.observaciones;
                return (
                  <label key={task.id} className={`group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${task.completed ? 'bg-emerald-50/50 border-emerald-500 shadow-sm' : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'}`}>
                    <div className="flex items-center gap-3 self-start sm:self-center">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-md border-2 transition-colors ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-slate-300 group-hover:border-emerald-400'}`}>
                        {task.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <input 
                        type="checkbox" 
                        checked={task.completed}
                        disabled={reportSubmitted}
                        onChange={() => handleToggleTask(task.id)}
                        className="hidden" 
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <span className={`font-bold text-base lg:text-lg block ${task.completed ? 'text-emerald-700 line-through opacity-75' : 'text-slate-800'}`}>
                        {task.title || task.text}
                      </span>
                      {note && (
                        <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 shadow-sm">
                          <div className="p-1 bg-amber-200 text-amber-900 rounded-lg shrink-0 mt-0.5">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 block">
                              INSTRUCCIÓN / CORRECCIÓN DE JEFATURA:
                            </span>
                            <p className="text-xs sm:text-sm font-semibold text-amber-950 mt-0.5 leading-relaxed">
                              {note}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Sección: Libro de Actuaciones */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-bold text-slate-800">{deptConfig.title}</h3>
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">{deptConfig.subtitle}</p>
                </div>
              </div>
              {!reportSubmitted && (
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={handleAddActuacion}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-5 rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 text-xs sm:text-sm cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4" /> {deptConfig.btnNew}
                  </button>
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 w-28">{deptConfig.col1}</th>
                    <th className="px-3 py-3 min-w-[200px]">{deptConfig.col2} <span className="text-rose-500 font-black">*</span></th>
                    <th className="px-3 py-3 min-w-[160px]">{deptConfig.col3}</th>
                    <th className="px-3 py-3 min-w-[200px]">{deptConfig.col4}</th>
                    <th className="px-3 py-3 w-36">{deptConfig.col5}</th>
                    <th className="px-3 py-3 min-w-[180px]">{deptConfig.col6}</th>
                    {!reportSubmitted && <th className="px-3 py-3 w-12 text-center"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {actuaciones.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500 font-medium">
                        {deptConfig.emptyText}
                      </td>
                    </tr>
                  ) : (
                    actuaciones.map((actuacion) => (
                      <tr key={actuacion.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-3 align-top">
                          <input 
                            type="time" 
                            value={actuacion.hora}
                            disabled={reportSubmitted}
                            onChange={(e) => updateActuacionField(actuacion.id, 'hora', e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-700 bg-white"
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex items-center relative">
                            <input 
                              type="text" 
                              value={actuacion.numeroAsunto}
                              disabled={reportSubmitted}
                              required
                              onChange={(e) => updateActuacionField(actuacion.id, 'numeroAsunto', e.target.value)}
                              className={`w-full p-2 border ${deptConfig.showExpedienteSelector ? 'rounded-l-lg' : 'rounded-lg'} focus:ring-2 outline-none font-semibold text-slate-800 transition-colors ${
                                !actuacion.numeroAsunto || actuacion.numeroAsunto.trim() === ''
                                    ? 'border-rose-300 bg-rose-50/20 focus:ring-rose-400 focus:border-rose-400'
                                    : 'border-slate-200 focus:ring-blue-500/50 bg-white'
                              }`}
                              placeholder={deptConfig.col2Placeholder}
                            />
                            {!reportSubmitted && deptConfig.showExpedienteSelector && (
                              <button
                                type="button"
                                onClick={() => setActiveSelectorRowId(actuacion.id)}
                                className="px-2.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-r-lg border border-l-0 border-slate-200 transition-all flex items-center justify-center cursor-pointer shrink-0 hover:scale-105 active:scale-95 group/bicho"
                                title="Abrir catálogo de expedientes registrados para seleccionar"
                              >
                                <FolderSearch className="w-4 h-4 text-blue-600 group-hover/bicho:text-blue-700" />
                              </button>
                            )}
                          </div>
                          {!reportSubmitted && deptConfig.showExpedienteSelector && (
                            <button
                              type="button"
                              onClick={() => setActiveSelectorRowId(actuacion.id)}
                              className="text-[10px] text-blue-600 hover:text-blue-800 font-bold mt-1 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <FolderSearch className="w-3 h-3" /> Seleccionar ({allCombinedExpedientes.length} disponibles)
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <textarea 
                            value={actuacion.partes}
                            disabled={reportSubmitted}
                            onChange={(e) => updateActuacionField(actuacion.id, 'partes', e.target.value)}
                            rows={2}
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-700 resize-none bg-white"
                            placeholder={deptConfig.col3Placeholder}
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <textarea 
                            value={actuacion.actuacion}
                            disabled={reportSubmitted}
                            onChange={(e) => updateActuacionField(actuacion.id, 'actuacion', e.target.value)}
                            rows={3}
                            className={`w-full p-2 border rounded-lg focus:ring-2 outline-none text-slate-700 font-medium resize-none transition-colors ${
                              !actuacion.actuacion || actuacion.actuacion.trim() === ''
                                ? 'border-rose-300 bg-rose-50/20 focus:ring-rose-400 focus:border-rose-400'
                                : 'border-slate-200 focus:ring-blue-500/50 bg-white'
                            }`}
                            placeholder={deptConfig.col4Placeholder}
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          {(() => {
                            const currentStatus = actuacion.estado || 'Completada';
                            return (
                              <button
                                type="button"
                                disabled={reportSubmitted}
                                onClick={() => {
                                  if (reportSubmitted) return;
                                  const nextStatus = 
                                    currentStatus === 'Completada' ? 'En trámite' :
                                    currentStatus === 'En trámite' ? 'Pendiente' : 'Completada';
                                  updateActuacionField(actuacion.id, 'estado', nextStatus);
                                }}
                                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-between gap-2 transition-all border shadow-sm ${
                                  reportSubmitted ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
                                } ${
                                  currentStatus === 'Completada' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100/80 hover:border-emerald-400' :
                                  currentStatus === 'En trámite' ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100/80 hover:border-amber-400' :
                                  'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100/80 hover:border-rose-400'
                                }`}
                                title="Haz clic para alternar el estado: Completada, En trámite o Pendiente"
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  {currentStatus === 'Completada' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                                  {currentStatus === 'En trámite' && <Clock className="w-4 h-4 text-amber-600 shrink-0" />}
                                  {currentStatus === 'Pendiente' && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                                  <span className="truncate">{currentStatus}</span>
                                </div>
                                {!reportSubmitted && (
                                  <RotateCw className="w-3 h-3 opacity-50 shrink-0 ml-1" />
                                )}
                              </button>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <textarea 
                            value={actuacion.observaciones}
                            disabled={reportSubmitted}
                            onChange={(e) => updateActuacionField(actuacion.id, 'observaciones', e.target.value)}
                            rows={3}
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-700 resize-none bg-white"
                            placeholder={deptConfig.col6Placeholder}
                          />
                        </td>
                        {!reportSubmitted && (
                          <td className="px-3 py-3 align-top text-center">
                            <button 
                              type="button"
                              onClick={() => handleRemoveActuacion(actuacion.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                              title="Eliminar fila"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Sección: Evidencias y Documentos con Notas (Opcional) */}
          <section>
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-3">
                <UploadCloud className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold text-slate-800">{deptConfig.attachmentsTitle} <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-semibold border border-slate-200 ml-2">Opcional</span></h3>
              </div>
            </div>
            <p className="text-sm text-slate-500 font-medium mb-4">{deptConfig.attachmentsSubtitle}</p>

            <div className="border-2 border-dashed border-slate-300 bg-slate-50/50 rounded-2xl p-8 text-center hover:bg-slate-100 hover:border-slate-400 transition-all group mb-6 relative">
              <input type="file" id="evidencia" disabled={reportSubmitted} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" multiple onChange={handleFileUpload} />
              <div className="flex flex-col items-center gap-4 pointer-events-none">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 transition-all group-hover:scale-105">
                  <UploadCloud className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <span className="font-bold text-lg block text-slate-700">{deptConfig.attachmentsDropzoneText}</span>
                  <span className="text-sm text-slate-500 font-bold mt-1 block">Admite PDF, Word (.doc, .docx), Imágenes (JPG, PNG), Excel (.xlsx), TXT</span>
                </div>
              </div>
            </div>

            {/* Indicador de subida activa a la nube */}
            {uploadingFiles && (
              <div className="mb-4 p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 text-blue-700 animate-pulse text-sm font-semibold">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span>Subiendo y respaldando archivo(s) en la nube de forma segura...</span>
              </div>
            )}

            {/* Lista de archivos seleccionados con input para notas */}
            {attachedFiles.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {attachedFiles.length} documento{attachedFiles.length > 1 ? 's' : ''} adjunto{attachedFiles.length > 1 ? 's' : ''} a esta jornada
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Borrador respaldado en la nube
                  </span>
                </div>

                {attachedFiles.map((fileObj, index) => (
                  <div key={index} className="bg-white border-2 border-slate-200 hover:border-slate-300 rounded-xl p-4 flex flex-col xl:flex-row gap-4 items-start xl:items-center shadow-xs transition-colors">
                    <div className="flex items-center gap-3 w-full xl:w-2/5 min-w-0">
                      <div className="bg-blue-50 text-blue-600 p-3 rounded-xl shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="overflow-hidden min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800 text-sm truncate" title={fileObj.name || fileObj.file?.name}>
                            {fileObj.name || fileObj.file?.name || 'Archivo adjunto'}
                          </p>
                          {fileObj.url && (
                            <span className="shrink-0 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-md">
                              En la nube ✓
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          {fileObj.size ? (fileObj.size / 1024).toFixed(1) + ' KB' : (fileObj.file?.size ? (fileObj.file.size / 1024).toFixed(1) + ' KB' : 'Borrador')}
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 w-full relative">
                      <MessageSquare className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        disabled={reportSubmitted}
                        placeholder="Añade una nota o descripción a este documento..." 
                        value={fileObj.note || ''}
                        onChange={(e) => updateFileNote(index, e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-700 text-xs sm:text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end xl:self-center">
                      {fileObj.url && (
                        <a
                          href={fileObj.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition-colors border border-indigo-200/80 cursor-pointer"
                          title="Abrir y verificar documento"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Ver</span>
                        </a>
                      )}
                      {!reportSubmitted && (
                        <button 
                          type="button" 
                          onClick={() => removeFile(index)} 
                          className="text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 border border-slate-200 p-2 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar adjunto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

      </div>

      {/* Modal Interactivo de Selección de Expediente (El bichito de expedientes) */}
      <ExpedienteSelectorModal
        isOpen={!!activeSelectorRowId}
        onClose={() => setActiveSelectorRowId(null)}
        onSelect={handleSelectExpedienteForActuacion}
        expedientes={allCombinedExpedientes}
        currentValue={actuaciones.find(a => a.id === activeSelectorRowId)?.numeroAsunto || ''}
      />
    </div>
  );
}
