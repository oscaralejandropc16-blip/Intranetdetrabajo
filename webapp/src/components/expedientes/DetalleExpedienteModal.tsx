import React, { useState } from 'react';
import { X, Calendar, Clock, User, Building, FileText, Plus, CheckCircle2, History, Send, BadgeCheck, Trash2 } from 'lucide-react';
import type { ExpedienteJudicial, ActuacionHistorial } from '../../types/expedientes';
import { sortHistoryDesc } from '../../lib/supabaseAdapter';
import SystemAlertModal from '../common/SystemAlertModal';
import CalendarioLapsosProcesales from './CalendarioLapsosProcesales';

interface DetalleExpedienteModalProps {
  expediente: ExpedienteJudicial;
  onClose: () => void;
  onUpdateExpediente: (updated: ExpedienteJudicial) => void;
  onDeleteExpediente?: (expediente: ExpedienteJudicial) => void;
}

export default function DetalleExpedienteModal({
  expediente,
  onClose,
  onUpdateExpediente,
  onDeleteExpediente
}: DetalleExpedienteModalProps) {
  const [tabActiva, setTabActiva] = useState<'lapsos' | 'actuaciones'>('lapsos');
  const [nuevaActuacion, setNuevaActuacion] = useState('');
  const [nuevoEstatus, setNuevoEstatus] = useState(expediente.estatusActual);
  const [observaciones, setObservaciones] = useState('');
  const [registradoPor] = useState(() => localStorage.getItem('rd_user_name') || 'Usuario');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

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
    if (s.includes('SENTENCIADO')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s.includes('FIJADO') || s.includes('AUDIENCIA')) return 'bg-sky-50 text-sky-700 border-sky-200';
    if (s.includes('ESPERA') || s.includes('PENDIENTE')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (s.includes('ACÉFALO') || s.includes('SUSPENDIDO')) return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-purple-50 text-purple-700 border-purple-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white border-t sm:border border-blue-200 w-full max-w-4xl max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-blue-950/25 overflow-hidden relative animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 safe-area-pb text-slate-900">
        {/* Drag handle móvil */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 bg-[#172554]">
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>

        {/* Cabecera del Modal */}
        <div className="bg-gradient-to-r from-[#172554] via-[#1e3a8a] to-[#1d4ed8] text-white p-4 sm:p-5 border-b border-blue-800/60 flex justify-between items-start">
          <div className="space-y-1.5 pr-6">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="bg-white text-[#1e3a8a] font-extrabold text-[11px] px-2.5 py-0.5 rounded-md border border-blue-200 tracking-wider shadow-2xs">
                EXPEDIENTE #{expediente.numeroExpediente}
              </span>
              <span className="text-sky-100 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white/15 border border-white/25">
                Sede {expediente.sede}
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeStyle(expediente.estatusActual)}`}>
                {expediente.estatusActual}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
              {expediente.partes}
            </h2>
            <p className="text-xs text-blue-100/85 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-white font-medium">
                <Building className="w-3.5 h-3.5 text-sky-300" /> {expediente.juzgado}
              </span>
              <span className="text-white/40">•</span>
              <span className="flex items-center gap-1 text-sky-200 font-medium">
                <FileText className="w-3.5 h-3.5" /> {expediente.procedimiento}
              </span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-white bg-white/15 hover:bg-white/25 border border-white/25 p-1.5 rounded-xl transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo con Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

          {/* Tarjeta de Resumen Rápido */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 p-2.5 sm:p-3 rounded-xl shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200/60 flex items-center justify-center text-blue-600 flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Responsable</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{expediente.responsableAsignado || 'Sin asignar'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 p-2.5 sm:p-3 rounded-xl shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-sky-100 border border-sky-200/60 flex items-center justify-center text-sky-600 flex-shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Última Actualización</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{expediente.ultimaActualizacion}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 p-2.5 sm:p-3 rounded-xl shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200/60 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <BadgeCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Estatus Legal</p>
                <p className="text-xs sm:text-sm font-semibold text-emerald-700 truncate">{expediente.estatusActual}</p>
              </div>
            </div>
          </div>

          {/* Pestañas de Navegación del Modal con soporte responsive móvil/tablet */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setTabActiva('lapsos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${tabActiva === 'lapsos'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span><span className="hidden sm:inline">Calendario & </span>Lapsos Procesales</span>
              {expediente.controlProcesal?.etapaActualNombre && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold max-w-[120px] truncate ${
                  tabActiva === 'lapsos' ? 'bg-blue-700/70 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {expediente.controlProcesal.etapaActualNombre}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTabActiva('actuaciones')}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${tabActiva === 'actuaciones'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
            >
              <History className="w-3.5 h-3.5 shrink-0" />
              <span><span className="hidden sm:inline">Historial de </span>Actuaciones</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                tabActiva === 'actuaciones' ? 'bg-blue-700/70 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {expediente.actuaciones?.length || 0}
              </span>
            </button>
          </div>

          {/* Contenido Pestaña 1: Calendario & Lapsos Procesales */}
          {tabActiva === 'lapsos' && (
            <CalendarioLapsosProcesales
              expediente={expediente}
              onUpdateExpediente={onUpdateExpediente}
              currentUser={registradoPor}
            />
          )}

          {/* Contenido Pestaña 2: Formulario & Historial de Actuaciones */}
          {tabActiva === 'actuaciones' && (
            <div className="space-y-6">
              {/* Formulario: Registrar Nueva Actuación / Novedad */}
              <div className="bg-slate-50 border border-slate-200/90 p-5 rounded-2xl space-y-4 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Registrar Nueva Actuación / Novedad
                  </h3>
                </div>

                {successMsg && (
                  <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <form onSubmit={handleAddActuacion} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-600 font-bold uppercase tracking-wider block mb-1">
                        Última Actuación Realizada *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Realizada Audiencia, Recibidos Oficios, No hubo despacho..."
                        value={nuevaActuacion}
                        onChange={(e) => setNuevaActuacion(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-600 font-bold uppercase tracking-wider block mb-1">
                        Nuevo Estatus Resultante del Expediente
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. SENTENCIADO, FIJADO EL CARTEL, POR RETIRAR COPIAS..."
                        value={nuevoEstatus}
                        onChange={(e) => setNuevoEstatus(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 font-bold uppercase tracking-wider block mb-1">
                      Observaciones Adicionales / Instrucciones de Seguimiento
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Detalles adicionales, números de oficio, notas para el equipo..."
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none shadow-2xs"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting || !nuevaActuacion.trim()}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm cursor-pointer"
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
                    <History className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Historial de Actuaciones ({expediente.actuaciones.length})
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Orden Cronológico Reversivo</span>
                </div>

                {expediente.actuaciones.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-center text-slate-500 text-sm">
                    No hay actuaciones registradas en la bitácora aún.
                  </div>
                ) : (
                  <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-5">
                    {[...expediente.actuaciones].sort(sortHistoryDesc).map((act) => (
                      <div key={act.id} className="relative group">
                        {/* Punto del Timeline */}
                        <div className="absolute -left-[31px] top-2 w-4 h-4 rounded-full bg-white border-2 border-blue-600 group-hover:bg-blue-600 transition-colors shadow-2xs"></div>

                        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl space-y-2 hover:border-blue-400/60 transition-all shadow-2xs">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="font-bold text-blue-600 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" /> {act.fecha}
                              </span>
                              {act.hora && (
                                <span className="flex items-center gap-1 text-slate-500 font-medium">
                                  <Clock className="w-3.5 h-3.5" /> {act.hora}
                                </span>
                              )}
                              {act.registradoPor && (
                                <span className="text-slate-400">| Por: <strong className="text-slate-700">{act.registradoPor}</strong></span>
                              )}
                            </div>

                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                              Resultante: {act.estatusResultante}
                            </span>
                          </div>

                          <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                            {act.actuacion}
                          </p>

                          {act.observaciones && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 italic">
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
          )}

        </div>

        {/* Pie del Modal */}
        <div className="bg-white p-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
          {onDeleteExpediente ? (
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" /> Eliminar Expediente
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-4 py-1.5 rounded-xl text-xs transition-all cursor-pointer shadow-sm shadow-blue-500/20"
          >
            Cerrar Ficha
          </button>
        </div>

      </div>

      {/* Modal de confirmación profesional para eliminar expediente */}
      <SystemAlertModal
        isOpen={confirmDeleteOpen}
        type="warning"
        title="¿Eliminar Expediente Definitivamente?"
        message={`¿Estás seguro de que deseas eliminar permanentemente el expediente #${expediente.numeroExpediente}?\n\nPartes: ${expediente.partes}\nTribunal: ${expediente.juzgado || 'No especificado'}\n\n¿Qué pasará al confirmar? Se borrará este expediente y su historial de actuaciones de la base de datos de Román & Delgado. Esta acción es irreversible.`}
        showCancel={true}
        confirmText="Sí, eliminar definitivamente"
        cancelText="Conservar expediente"
        isDestructive={true}
        badgeText="eliminación permanente"
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          setConfirmDeleteOpen(false);
          if (onDeleteExpediente) {
            onDeleteExpediente(expediente);
          }
          onClose();
        }}
      />
    </div>
  );
}
