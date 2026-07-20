import React from 'react';
import { CheckCircle2, Plus, X, UploadCloud, File, MessageSquare, Trash2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import type { Actuacion } from '../../types/libros';

interface TabRegistroDiarioProps {
  reportSubmitted: boolean;
  actuaciones: Actuacion[];
  setActuaciones: React.Dispatch<React.SetStateAction<Actuacion[]>>;
  attachedFiles: {file: any, note: string}[];
  setAttachedFiles: (f: {file: any, note: string}[]) => void;
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



  const handleToggleTask = (id: number) => {
    if (reportSubmitted) return;
    setPendingTasks((tasks: any) => tasks.map((t: any) => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({ file, note: '' }));
      setAttachedFiles([...attachedFiles, ...newFiles]);
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
      observaciones: ''
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
          const matchingExpediente = allCombinedExpedientes.find(e => e.numeroExpediente === value);
          if (matchingExpediente && !updated.partes) {
            updated.partes = matchingExpediente.partes;
          }
        }
        return updated;
      }
      return a;
    }));
  };

  // Combinar expedientes globales con los ingresos de esta misma sesión
  const allCombinedExpedientes = [
    ...globalExpedientes,
    ...ingresosActivos
  ].filter((v, i, a) => a.findIndex(t => t.numeroExpediente === v.numeroExpediente) === i); // Deduplicar

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-white p-6 lg:p-10 rounded-3xl shadow-sm border border-slate-200 space-y-10">
          
          {/* Sección: Tareas Programadas (Checklist de ayer) */}
          <section>
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <h3 className="text-xl font-bold text-slate-800">Mi Agenda para Hoy</h3>
            </div>
            <p className="text-sm text-slate-500 font-medium mb-4">Actividades planificadas previamente.</p>
            
            <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-3">
              {pendingTasks.map((task) => (
                <label key={task.id} className={`group flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${task.completed ? 'bg-emerald-50/50 border-emerald-500 shadow-sm' : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'}`}>
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
                  <span className={`font-semibold text-base lg:text-lg ${task.completed ? 'text-emerald-700 line-through opacity-75' : 'text-slate-700'}`}>
                    {task.text}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Sección: Libro de Actuaciones */}
          <section>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-bold text-slate-800">Libro de Actuaciones</h3>
                </div>
                <p className="text-sm text-slate-500 font-medium">Registra detalladamente tus gestiones y actuaciones de hoy.</p>
              </div>
              {!reportSubmitted && (
                <button 
                  type="button"
                  onClick={handleAddActuacion}
                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Nueva Actuación
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 w-32">Hora</th>
                    <th className="px-3 py-3 min-w-[250px]">N° Asunto</th>
                    <th className="px-3 py-3 min-w-[180px]">Partes</th>
                    <th className="px-3 py-3 min-w-[200px]">Actuación</th>
                    <th className="px-3 py-3 min-w-[200px]">Observaciones</th>
                    {!reportSubmitted && <th className="px-3 py-3 w-12 text-center"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {actuaciones.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-medium">
                        No has registrado ninguna actuación. Haz clic en "Nueva Actuación".
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
                          <input 
                            type="text" 
                            list="expedientes-list"
                            value={actuacion.numeroAsunto}
                            disabled={reportSubmitted}
                            required
                            onChange={(e) => updateActuacionField(actuacion.id, 'numeroAsunto', e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-700 bg-white"
                            placeholder="Ej. RD-J-2026..."
                          />
                          <datalist id="expedientes-list">
                            {allCombinedExpedientes.map((exp, idx) => (
                              <option key={idx} value={exp.numeroExpediente}>{exp.partes}</option>
                            ))}
                          </datalist>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <textarea 
                            value={actuacion.partes}
                            disabled={reportSubmitted}
                            onChange={(e) => updateActuacionField(actuacion.id, 'partes', e.target.value)}
                            rows={2}
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-700 resize-none bg-white"
                            placeholder="Ej. Parte A vs. Parte B"
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <textarea 
                            value={actuacion.actuacion}
                            disabled={reportSubmitted}
                            onChange={(e) => updateActuacionField(actuacion.id, 'actuacion', e.target.value)}
                            rows={3}
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-700 resize-none bg-white"
                            placeholder="Describe qué se hizo"
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <textarea 
                            value={actuacion.observaciones}
                            disabled={reportSubmitted}
                            onChange={(e) => updateActuacionField(actuacion.id, 'observaciones', e.target.value)}
                            rows={3}
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-700 resize-none bg-white"
                            placeholder="Notas o estatus"
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

          {/* Sección: Evidencias y Documentos con Notas */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <UploadCloud className="w-6 h-6 text-slate-400" />
              <h3 className="text-xl font-bold text-slate-800">Documentos y Evidencias</h3>
            </div>
            <p className="text-sm text-slate-500 font-medium mb-4">Sube los documentos en los que trabajaste hoy y agrégales una nota para que tu jefe sepa de qué tratan.</p>

            <div className="border-2 border-dashed border-slate-300 bg-slate-50/50 rounded-2xl p-8 text-center hover:bg-slate-100 hover:border-slate-400 transition-all group mb-6 relative">
              <input type="file" id="evidencia" disabled={reportSubmitted} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" multiple onChange={handleFileUpload} />
              <div className="flex flex-col items-center gap-4 pointer-events-none">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 transition-all">
                  <UploadCloud className="w-8 h-8 text-slate-600" />
                </div>
                <div>
                  <span className="font-bold text-lg block text-slate-700">Selecciona o arrastra varios archivos a la vez</span>
                  <span className="text-sm text-slate-500 font-bold mt-1 block">PDF, JPG, PNG, DOCX (Sin límite de peso)</span>
                </div>
              </div>
            </div>

            {/* Lista de archivos seleccionados con input para notas */}
            {attachedFiles.length > 0 && (
              <div className="space-y-4">
                {attachedFiles.map((fileObj, index) => (
                  <div key={index} className="bg-white border-2 border-slate-200 rounded-xl p-4 flex flex-col xl:flex-row gap-4 items-start xl:items-center shadow-sm">
                    <div className="flex items-center gap-3 w-full xl:w-1/3">
                      <div className="bg-slate-100 p-3 rounded-lg"><File className="w-6 h-6 text-slate-500"/></div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-slate-700 truncate">{fileObj.file.name}</p>
                        <p className="text-xs text-slate-500 font-medium">{(fileObj.file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <div className="flex-1 w-full relative">
                      <MessageSquare className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                      <input 
                        type="text" 
                        disabled={reportSubmitted}
                        placeholder="Añade una nota o descripción a este documento..." 
                        value={fileObj.note}
                        onChange={(e) => updateFileNote(index, e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-700 text-sm"
                      />
                    </div>
                    {!reportSubmitted && (
                      <button type="button" onClick={() => removeFile(index)} className="text-slate-400 hover:text-red-500 bg-white border border-slate-200 p-3 rounded-lg hover:bg-red-50 transition-colors cursor-pointer w-full xl:w-auto flex justify-center">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

      </div>
    </div>
  );
}
