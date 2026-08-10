import React, { useState } from 'react';
import { X, Calendar, Clock, User, Building, FileText, Plus, CheckCircle2, History, Send, BadgeCheck } from 'lucide-react';
import type { ExpedienteJudicial, ActuacionHistorial } from '../../types/expedientes';

interface DetalleExpedienteModalProps {
  expediente: ExpedienteJudicial;
  onClose: () => void;
  onUpdateExpediente: (updated: ExpedienteJudicial) => void;
}

export default function DetalleExpedienteModal({ expediente, onClose, onUpdateExpediente }: DetalleExpedienteModalProps) {
  const [nuevaActuacion, setNuevaActuacion] = useState('');
  const [nuevoEstatus, setNuevoEstatus] = useState(expediente.estatusActual);
  const [observaciones, setObservaciones] = useState('');
  const [registradoPor] = useState(() => localStorage.getItem('rd_user_name') || 'Usuario');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleAddActuacion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaActuacion.trim()) return;

    setIsSubmitting(true);
    setSuccessMsg('');

    const todayStr = new Date().toISOString().split('T')[0];
    const nowTimeStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const newAct: ActuacionHistorial = {
      id: 'act-' + Date.now(),
      fecha: todayStr,
      hora: nowTimeStr,
      actuacion: nuevaActuacion.trim(),
      estatusResultante: nuevoEstatus.trim() || expediente.estatusActual,
      registradoPor: registradoPor || 'Abogado en ejercicio',
      observaciones: observaciones.trim() || undefined
    };

    const updatedExpediente: ExpedienteJudicial = {
      ...expediente,
      estatusActual: nuevoEstatus.trim() || expediente.estatusActual,
      ultimaActualizacion: todayStr,
      actuaciones: [newAct, ...expediente.actuaciones]
    };

    setTimeout(() => {
      onUpdateExpediente(updatedExpediente);
      setIsSubmitting(false);
      setSuccessMsg('¡Nueva actuación registrada exitosamente!');
      setNuevaActuacion('');
      setObservaciones('');
      setTimeout(() => setSuccessMsg(''), 3000);
    }, 400);
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes('SENTENCIADO')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (s.includes('FIJADO') || s.includes('AUDIENCIA')) return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
    if (s.includes('ESPERA') || s.includes('PENDIENTE')) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    if (s.includes('ACÉFALO') || s.includes('SUSPENDIDO')) return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
        
        {/* Cabecera del Modal */}
        <div className="bg-slate-950 p-5 sm:p-6 border-b border-slate-800 flex justify-between items-start">
          <div className="space-y-1.5 pr-8">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-md tracking-wider">
                EXPEDIENTE #{expediente.numeroExpediente}
              </span>
              <span className="text-slate-400 text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                Sede {expediente.sede}
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeStyle(expediente.estatusActual)}`}>
                {expediente.estatusActual}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {expediente.partes}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-slate-300 font-medium">
                <Building className="w-3.5 h-3.5 text-amber-400" /> {expediente.juzgado}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <FileText className="w-3.5 h-3.5" /> {expediente.procedimiento}
              </span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo con Scroll */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">

          {/* Tarjeta de Resumen Rápido */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/60 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Responsable</p>
                <p className="text-sm font-semibold text-slate-200">{expediente.responsableAsignado || 'Sin asignar'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Última Actualización</p>
                <p className="text-sm font-semibold text-slate-200">{expediente.ultimaActualizacion}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <BadgeCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Estatus Legal</p>
                <p className="text-sm font-bold text-emerald-400">{expediente.estatusActual}</p>
              </div>
            </div>
          </div>

          {/* Formulario: Registrar Nueva Actuación / Novedad */}
          <div className="bg-slate-950/90 border border-amber-500/30 p-5 rounded-2xl space-y-4 shadow-inner">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Registrar Nueva Actuación / Novedad
              </h3>
            </div>

            {successMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/40 p-3.5 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddActuacion} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                    Última Actuación Realizada *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Realizada Audiencia, Recibidos Oficios, No hubo despacho..."
                    value={nuevaActuacion}
                    onChange={(e) => setNuevaActuacion(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 text-sm focus:ring-2 focus:ring-amber-500/50 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                    Nuevo Estatus Resultante del Expediente
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. SENTENCIADO, FIJADO EL CARTEL, POR RETIRAR COPIAS..."
                    value={nuevoEstatus}
                    onChange={(e) => setNuevoEstatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 text-sm focus:ring-2 focus:ring-amber-500/50 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                  Observaciones Adicionales / Instrucciones de Seguimiento
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles adicionales, números de oficio, notas para el equipo..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 text-sm focus:ring-2 focus:ring-amber-500/50 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !nuevaActuacion.trim()}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Guardando...' : 'Guardar Actuación'}
                </button>
              </div>
            </form>
          </div>

          {/* Historial / Línea de Tiempo de Actuaciones */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Historial de Actuaciones ({expediente.actuaciones.length})
                </h3>
              </div>
              <span className="text-xs text-slate-400">Orden Cronológico Reversivo</span>
            </div>

            {expediente.actuaciones.length === 0 ? (
              <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl text-center text-slate-500 text-sm">
                No hay actuaciones registradas en la bitácora aún.
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-6">
                {expediente.actuaciones.map((act) => (
                  <div key={act.id} className="relative group">
                    {/* Punto del Timeline */}
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-amber-400 group-hover:bg-amber-400 transition-colors"></div>

                    <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2 hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="font-semibold text-amber-400 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> {act.fecha}
                          </span>
                          {act.hora && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <Clock className="w-3.5 h-3.5" /> {act.hora}
                            </span>
                          )}
                          {act.registradoPor && (
                            <span className="text-slate-500">| Por: {act.registradoPor}</span>
                          )}
                        </div>

                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          Resultante: {act.estatusResultante}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-white leading-relaxed">
                        {act.actuacion}
                      </p>

                      {act.observaciones && (
                        <p className="text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 italic">
                          "{act.observaciones}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Pie del Modal */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-5 py-2 rounded-xl text-xs transition-colors cursor-pointer"
          >
            Cerrar Ficha
          </button>
        </div>

      </div>
    </div>
  );
}
