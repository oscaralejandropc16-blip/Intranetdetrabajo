import React from 'react';
import { CalendarIcon, Plus, X, Clock, Activity } from 'lucide-react';
import type { Programacion } from '../../types/libros';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface TabAgendaProps {
  programaciones: Programacion[];
  setProgramaciones: React.Dispatch<React.SetStateAction<Programacion[]>>;
  reportSubmitted: boolean;
  allFutureTasks?: any[];
}

export default function TabAgenda({
  programaciones,
  setProgramaciones,
  reportSubmitted,
  allFutureTasks = []
}: TabAgendaProps) {

  const decodeAccents = (str?: any) => {
    if (!str) return '';
    if (typeof str !== 'string') return String(str);
    return str
      .replace(/\\u00e1|u00e1/g, 'á').replace(/\\u00c1|u00c1/g, 'Á')
      .replace(/\\u00e9|u00e9/g, 'é').replace(/\\u00c9|u00c9/g, 'É')
      .replace(/\\u00ed|u00ed/g, 'í').replace(/\\u00cd|u00cd/g, 'Í')
      .replace(/\\u00f3|u00f3/g, 'ó').replace(/\\u00d3|u00d3/g, 'Ó')
      .replace(/\\u00fa|u00fa/g, 'ú').replace(/\\u00da|u00da/g, 'Ú')
      .replace(/\\u00f1|u00f1/g, 'ñ').replace(/\\u00d1|u00d1/g, 'Ñ')
      .replace(/\\u00bf|u00bf/g, '¿').replace(/\\u00a1|u00a1/g, '¡');
  };

  const handleAddRow = () => {
    // Por defecto, sugerimos planificar para el día siguiente
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const newProg: Programacion = {
      id: Math.random().toString(36).substring(7),
      fecha: tomorrow,
      hora: '09:00',
      organismoTribunal: '',
      tipoActuacion: '',
      resumen: '',
      observaciones: ''
    };
    setProgramaciones([...programaciones, newProg]);
  };

  const handleRemoveRow = (id: string) => {
    setProgramaciones(programaciones.filter(p => p.id !== id));
  };

  const updateField = (id: string, field: keyof Programacion, value: string) => {
    setProgramaciones(programaciones.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <CalendarIcon className="w-7 h-7 text-amber-500" />
            Libro de Programación
          </h3>
          <p className="text-slate-500 font-medium mt-1">Revisa tu agenda próxima y planifica nuevas actividades.</p>
        </div>
      </div>

      {/* MI AGENDA PRÓXIMA (Línea de tiempo) */}
      <div className="mb-12 border-b border-slate-100 pb-12">
        <h4 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" /> Mi Calendario Próximo
        </h4>
        
        {(() => {
          // Agrupar tareas por fecha
          const groupedTasks = allFutureTasks.reduce((acc, task) => {
            if (!acc[task.fecha]) acc[task.fecha] = [];
            acc[task.fecha].push(task);
            return acc;
          }, {} as Record<string, any[]>);
          
          if (Object.keys(groupedTasks).length === 0) {
            return (
              <div className="text-center p-8 text-slate-500 italic font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                No tienes actividades programadas para el futuro.
              </div>
            );
          }
          
          return (
            <div className="space-y-8">
              {Object.keys(groupedTasks).sort().map(dateStr => {
                const dateObj = new Date(`${dateStr}T12:00:00`);
                let dateLabel = format(dateObj, 'EEEE, d \'de\' MMMM', { locale: es });
                if (dateStr === format(new Date(), 'yyyy-MM-dd')) dateLabel = 'HOY - ' + dateLabel;
                if (dateStr === format(addDays(new Date(), 1), 'yyyy-MM-dd')) dateLabel = 'MAÑANA - ' + dateLabel;
                
                return (
                  <div key={dateStr} className="relative">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="px-4 py-2 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-xs rounded-xl shadow-sm border border-slate-200">
                        {dateLabel}
                      </div>
                      <div className="h-px bg-slate-100 flex-1"></div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pl-4 lg:pl-6 border-l-2 border-slate-200">
                      {groupedTasks[dateStr].map((task: any, i: number) => (
                        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 relative overflow-hidden group hover:border-amber-300 transition-colors">
                          {task.observaciones && <div className="absolute top-0 right-0 w-12 h-12 bg-amber-100 rotate-45 translate-x-6 -translate-y-6 z-0"></div>}
                          <div className="relative z-10">
                            <div className="flex justify-between items-start mb-2">
                              <span className="bg-slate-100 text-slate-700 font-bold text-xs px-2 py-1 rounded-md">
                                {task.hora}
                              </span>
                            </div>
                            
                            <p className="font-bold text-slate-800 text-sm mb-1">{decodeAccents(task.tipoActuacion)}</p>
                            <p className="text-xs text-slate-500 font-medium mb-3 flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5 text-blue-500 shrink-0" /> {decodeAccents(task.organismoTribunal)}
                            </p>
                            
                            {task.observaciones && (
                              <div className="mt-3 pt-3 border-t border-slate-100 bg-amber-50/50 -mx-4 -mb-4 px-4 pb-4">
                                <span className="font-bold text-amber-700 block mb-0.5 text-xs">Nota de Jefatura:</span>
                                <p className="text-xs text-amber-800">{decodeAccents(task.observaciones)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* NUEVA PROGRAMACIÓN */}
      <div className="flex justify-between items-end mb-4">
        <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Plus className="w-5 h-5 text-amber-500" /> Añadir Nuevas Tareas (Bitácora de Hoy)
        </h4>
        {!reportSubmitted && (
          <button 
            onClick={handleAddRow}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2.5 px-5 rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nueva Programación
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-xs border-b border-slate-200">
            <tr>
              <th className="px-4 py-4 min-w-[150px]">Fecha</th>
              <th className="px-4 py-4 w-32">Hora</th>
              <th className="px-4 py-4 min-w-[200px]">Organismo / Tribunal</th>
              <th className="px-4 py-4 min-w-[200px]">Tipo de Actuación</th>
              <th className="px-4 py-4 min-w-[250px]">Resumen</th>
              <th className="px-4 py-4 min-w-[200px]">Observaciones</th>
              {!reportSubmitted && <th className="px-4 py-4 text-center">Acción</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {programaciones.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500 font-medium">
                  No has planificado tareas futuras. Haz clic en "Nueva Programación" para agendar.
                </td>
              </tr>
            ) : (
              programaciones.map((prog) => (
                <tr key={prog.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 align-top">
                    <input 
                      type="date" 
                      value={prog.fecha}
                      disabled={reportSubmitted}
                      onChange={(e) => updateField(prog.id, 'fecha', e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/50 outline-none text-slate-700 bg-white font-medium"
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input 
                      type="time" 
                      value={prog.hora}
                      disabled={reportSubmitted}
                      onChange={(e) => updateField(prog.id, 'hora', e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/50 outline-none text-slate-700 bg-white"
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input 
                      type="text" 
                      value={prog.organismoTribunal}
                      disabled={reportSubmitted}
                      onChange={(e) => updateField(prog.id, 'organismoTribunal', e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/50 outline-none text-slate-700 bg-white"
                      placeholder="Ej: Registro Principal"
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input 
                      type="text" 
                      value={prog.tipoActuacion}
                      disabled={reportSubmitted}
                      onChange={(e) => updateField(prog.id, 'tipoActuacion', e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/50 outline-none text-slate-700 bg-white"
                      placeholder="Ej: Introducir documento"
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <textarea 
                      value={prog.resumen}
                      disabled={reportSubmitted}
                      onChange={(e) => updateField(prog.id, 'resumen', e.target.value)}
                      rows={2}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/50 outline-none text-slate-700 resize-none bg-white"
                      placeholder="Resumen de la visita..."
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <textarea 
                      value={prog.observaciones}
                      disabled={reportSubmitted}
                      onChange={(e) => updateField(prog.id, 'observaciones', e.target.value)}
                      rows={2}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/50 outline-none text-slate-700 resize-none bg-white"
                      placeholder="Notas adicionales..."
                    />
                  </td>
                  {!reportSubmitted && (
                    <td className="px-4 py-3 align-top text-center">
                      <button 
                        onClick={() => handleRemoveRow(prog.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100 cursor-pointer"
                        title="Eliminar programación"
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
    </div>
  );
}
