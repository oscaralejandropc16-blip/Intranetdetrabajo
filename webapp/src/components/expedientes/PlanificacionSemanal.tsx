import React, { useState } from 'react';
import { Calendar, Clock, Plus, CheckCircle2, Building, FileText, CheckSquare } from 'lucide-react';
import type { AudienciaSemanal, AsuntoNuevo, SeguimientoPendiente } from '../../types/expedientes';

interface PlanificacionSemanalProps {
  audiencias: AudienciaSemanal[];
  asuntosNuevos: AsuntoNuevo[];
  seguimientos: SeguimientoPendiente[];
  onAddAudiencia: (aud: AudienciaSemanal) => void;
  onAddAsuntoNuevo: (asn: AsuntoNuevo) => void;
  onAddSeguimiento: (seg: SeguimientoPendiente) => void;
  onToggleSeguimientoEstatus: (id: string) => void;
}

export default function PlanificacionSemanal({
  audiencias,
  asuntosNuevos,
  seguimientos,
  onAddAudiencia,
  onAddAsuntoNuevo,
  onAddSeguimiento,
  onToggleSeguimientoEstatus
}: PlanificacionSemanalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'audiencias' | 'asuntos' | 'seguimientos'>('audiencias');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [formType, setFormType] = useState<'audiencia' | 'asunto' | 'seguimiento'>('audiencia');
  
  // Form campos Audiencia
  const [audExpediente, setAudExpediente] = useState('');
  const [audJuzgado, setAudJuzgado] = useState('');
  const [audPartes, setAudPartes] = useState('');
  const [audFecha, setAudFecha] = useState(new Date().toISOString().split('T')[0]);
  const [audHora, setAudHora] = useState('09:00');
  const [audTipo] = useState('Audiencia Preliminar');
  const [audAbogado] = useState('');

  // Form campos Asunto Nuevo
  const [asnCliente, setAsnCliente] = useState('');
  const [asnMateria, setAsnMateria] = useState('');
  const [asnTribunal, setAsnTribunal] = useState('');
  const [asnFecha] = useState(new Date().toISOString().split('T')[0]);
  const [asnResponsable] = useState('');

  // Form campos Seguimiento
  const [segExpediente, setSegExpediente] = useState('');
  const [segDesc, setSegDesc] = useState('');
  const [segPrioridad, setSegPrioridad] = useState<'Alta' | 'Media' | 'Baja'>('Alta');
  const [segAsignado] = useState('');

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (formType === 'audiencia') {
      if (!audExpediente || !audJuzgado) return;
      const newAud: AudienciaSemanal = {
        id: 'aud-' + Date.now(),
        numeroExpediente: audExpediente,
        juzgado: audJuzgado,
        partes: audPartes || 'Partes sin especificar',
        fechaAudiencia: audFecha,
        horaAudiencia: audHora,
        tipoAudiencia: audTipo,
        estatus: 'Programada',
        abogadoAsignado: audAbogado || 'Abogado asignado'
      };
      onAddAudiencia(newAud);
    } else if (formType === 'asunto') {
      if (!asnCliente || !asnMateria) return;
      const newAsn: AsuntoNuevo = {
        id: 'asn-' + Date.now(),
        cliente: asnCliente,
        materia: asnMateria,
        tribunalDestino: asnTribunal || 'Tribunal por asignar',
        fechaEstimadaIntroduccion: asnFecha,
        estatus: 'Listo para introducir',
        responsable: asnResponsable || 'Abogado a cargo',
        detalles: 'Registrado desde la planificación semanal.'
      };
      onAddAsuntoNuevo(newAsn);
    } else {
      if (!segDesc) return;
      const newSeg: SeguimientoPendiente = {
        id: 'seg-' + Date.now(),
        numeroExpediente: segExpediente || 'Sin expediente',
        descripcion: segDesc,
        fechaLimite: new Date().toISOString().split('T')[0],
        prioridad: segPrioridad,
        estatus: 'Pendiente',
        asignadoA: segAsignado || 'Asistente Legal'
      };
      onAddSeguimiento(newSeg);
    }
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Selector de sub-sección y Botón Agregar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/80 p-3 sm:p-4 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveSubTab('audiencias')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'audiencias'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Audiencias Fijadas ({audiencias.length})
          </button>

          <button
            onClick={() => setActiveSubTab('asuntos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'asuntos'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Asuntos Nuevos por Introducir ({asuntosNuevos.length})
          </button>

          <button
            onClick={() => setActiveSubTab('seguimientos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'seguimientos'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            Seguimientos de Oficina ({seguimientos.length})
          </button>
        </div>

        <button
          onClick={() => {
            setFormType(activeSubTab === 'audiencias' ? 'audiencia' : activeSubTab === 'asuntos' ? 'asunto' : 'seguimiento');
            setShowAddModal(true);
          }}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Nuevo Registro
        </button>
      </div>

      {/* SUB-VISTA 1: AUDIENCIAS */}
      {activeSubTab === 'audiencias' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {audiencias.length === 0 ? (
            <div className="col-span-2 bg-slate-900/50 border border-slate-800 p-8 rounded-2xl text-center text-slate-500 text-sm">
              No hay audiencias fijadas para esta semana.
            </div>
          ) : (
            audiencias.map((aud) => (
              <div key={aud.id} className="bg-slate-950/90 border border-slate-800 p-5 rounded-2xl space-y-3 hover:border-amber-500/40 transition-all shadow-md">
                <div className="flex justify-between items-start">
                  <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold px-2.5 py-1 rounded-lg">
                    EXP #{aud.numeroExpediente}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-sky-400" /> {aud.fechaAudiencia} - {aud.horaAudiencia}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">{aud.partes}</h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                    <Building className="w-3.5 h-3.5 text-amber-400" /> {aud.juzgado}
                  </p>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1">
                  <p className="text-slate-300 font-medium"><span className="text-slate-500 font-bold uppercase">Tipo:</span> {aud.tipoAudiencia}</p>
                  <p className="text-slate-300 font-medium"><span className="text-slate-500 font-bold uppercase">Abogado:</span> {aud.abogadoAsignado}</p>
                  {aud.notas && <p className="text-amber-300/80 italic mt-1 font-sans">"{aud.notas}"</p>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SUB-VISTA 2: ASUNTOS NUEVOS POR INTRODUCIR */}
      {activeSubTab === 'asuntos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {asuntosNuevos.length === 0 ? (
            <div className="col-span-2 bg-slate-900/50 border border-slate-800 p-8 rounded-2xl text-center text-slate-500 text-sm">
              No hay asuntos nuevos por introducir programados.
            </div>
          ) : (
            asuntosNuevos.map((asn) => (
              <div key={asn.id} className="bg-slate-950/90 border border-slate-800 p-5 rounded-2xl space-y-3 hover:border-amber-500/40 transition-all shadow-md">
                <div className="flex justify-between items-start">
                  <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-lg">
                    {asn.estatus}
                  </span>
                  <span className="text-xs text-slate-400">
                    Est. Ingreso: <strong className="text-white">{asn.fechaEstimadaIntroduccion}</strong>
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">{asn.cliente}</h4>
                  <p className="text-xs text-amber-400 font-semibold mt-0.5">{asn.materia}</p>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1">
                  <p className="text-slate-300"><span className="text-slate-500 font-bold uppercase">Tribunal:</span> {asn.tribunalDestino}</p>
                  <p className="text-slate-300"><span className="text-slate-500 font-bold uppercase">Responsable:</span> {asn.responsable}</p>
                  <p className="text-slate-400 italic mt-1">{asn.detalles}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SUB-VISTA 3: SEGUIMIENTOS DE OFICINA */}
      {activeSubTab === 'seguimientos' && (
        <div className="space-y-3">
          {seguimientos.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl text-center text-slate-500 text-sm">
              No hay seguimientos registrados.
            </div>
          ) : (
            seguimientos.map((seg) => (
              <div
                key={seg.id}
                onClick={() => onToggleSeguimientoEstatus(seg.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  seg.estatus === 'Completado'
                    ? 'bg-slate-950/40 border-slate-800 text-slate-500'
                    : 'bg-slate-950/90 border-slate-800 hover:border-slate-700 text-white'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${
                    seg.estatus === 'Completado'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : 'border-slate-700 hover:border-amber-400'
                  }`}>
                    {seg.estatus === 'Completado' && <CheckCircle2 className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-400">EXP #{seg.numeroExpediente}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                        seg.prioridad === 'Alta' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        Prioridad {seg.prioridad}
                      </span>
                    </div>
                    <p className={`text-sm font-semibold mt-0.5 ${seg.estatus === 'Completado' ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                      {seg.descripcion}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Asignado a: {seg.asignadoA}</p>
                  </div>
                </div>

                <span className={`text-xs font-bold px-3 py-1 rounded-xl border ${
                  seg.estatus === 'Completado'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  {seg.estatus}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal para Agregar Nuevo Registro */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg p-6 rounded-3xl shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white uppercase tracking-wide">
              Registrar {formType === 'audiencia' ? 'Audiencia Fijada' : formType === 'asunto' ? 'Asunto Nuevo' : 'Seguimiento'}
            </h3>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {formType === 'audiencia' && (
                <>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold uppercase block mb-1">N° Expediente *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 57.380"
                      value={audExpediente}
                      onChange={(e) => setAudExpediente(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold uppercase block mb-1">Tribunal / Juzgado *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Tribunal 2do"
                      value={audJuzgado}
                      onChange={(e) => setAudJuzgado(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold uppercase block mb-1">Partes Involucradas</label>
                    <input
                      type="text"
                      placeholder="Ej. Pedro Pérez vs. María Gómez"
                      value={audPartes}
                      onChange={(e) => setAudPartes(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 font-semibold uppercase block mb-1">Fecha</label>
                      <input
                        type="date"
                        value={audFecha}
                        onChange={(e) => setAudFecha(e.target.value)}
                        className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold uppercase block mb-1">Hora</label>
                      <input
                        type="time"
                        value={audHora}
                        onChange={(e) => setAudHora(e.target.value)}
                        className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {formType === 'asunto' && (
                <>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold uppercase block mb-1">Cliente / Solicitante *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre del cliente"
                      value={asnCliente}
                      onChange={(e) => setAsnCliente(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold uppercase block mb-1">Materia / Procedimiento *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Divorcio, Cobro de Bolívares..."
                      value={asnMateria}
                      onChange={(e) => setAsnMateria(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold uppercase block mb-1">Tribunal Destino</label>
                    <input
                      type="text"
                      placeholder="Ej. Tribunal 1ro MSE"
                      value={asnTribunal}
                      onChange={(e) => setAsnTribunal(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none"
                    />
                  </div>
                </>
              )}

              {formType === 'seguimiento' && (
                <>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold uppercase block mb-1">Descripción de la Gestión *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Retirar oficio de embargo"
                      value={segDesc}
                      onChange={(e) => setSegDesc(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 font-semibold uppercase block mb-1">N° Expediente Asociado</label>
                      <input
                        type="text"
                        placeholder="Ej. 57.380"
                        value={segExpediente}
                        onChange={(e) => setSegExpediente(e.target.value)}
                        className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold uppercase block mb-1">Prioridad</label>
                      <select
                        value={segPrioridad}
                        onChange={(e) => setSegPrioridad(e.target.value as 'Alta' | 'Media' | 'Baja')}
                        className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none cursor-pointer"
                      >
                        <option value="Alta">Alta</option>
                        <option value="Media">Media</option>
                        <option value="Baja">Baja</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 text-slate-950 text-xs font-bold rounded-xl"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
