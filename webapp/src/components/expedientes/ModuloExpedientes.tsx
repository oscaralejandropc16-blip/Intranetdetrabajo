import React, { useState, useEffect } from 'react';
import { Search, Plus, FileText, Calendar, AlertCircle, Eye, FolderSearch, ChevronRight, Scale } from 'lucide-react';
import type { ExpedienteJudicial, AudienciaSemanal, AsuntoNuevo, SeguimientoPendiente } from '../../types/expedientes';
import {
  getStoredExpedientes,
  saveStoredExpedientes,
  getStoredAudiencias,
  saveStoredAudiencias,
  getStoredAsuntosNuevos,
  saveStoredAsuntosNuevos,
  getStoredSeguimientos,
  saveStoredSeguimientos
} from './mockExpedientesData';
import DetalleExpedienteModal from './DetalleExpedienteModal';
import PlanificacionSemanal from './PlanificacionSemanal';

export default function ModuloExpedientes() {
  const [expedientes, setExpedientes] = useState<ExpedienteJudicial[]>(() => getStoredExpedientes());
  const [audiencias, setAudiencias] = useState<AudienciaSemanal[]>(() => getStoredAudiencias());
  const [asuntosNuevos, setAsuntosNuevos] = useState<AsuntoNuevo[]>(() => getStoredAsuntosNuevos());
  const [seguimientos, setSeguimientos] = useState<SeguimientoPendiente[]>(() => getStoredSeguimientos());

  const [activeTab, setActiveTab] = useState<'expedientes' | 'planificacion'>('expedientes');
  const [searchTerm, setSearchTerm] = useState('');
  const [juzgadoFilter, setJuzgadoFilter] = useState('Todos');
  const [estatusFilter, setEstatusFilter] = useState('Todos');
  
  const [selectedExpediente, setSelectedExpediente] = useState<ExpedienteJudicial | null>(null);
  const [showNuevoExpedienteModal, setShowNuevoExpedienteModal] = useState(false);

  // Campos para Nuevo Expediente
  const [numExp, setNumExp] = useState('');
  const [juzgado, setJuzgado] = useState('Tribunal 2do');
  const [partes, setPartes] = useState('');
  const [procedimiento, setProcedimiento] = useState('');
  const [estatus, setEstatus] = useState('EN TRÁMITE');
  const [sede, setSede] = useState('Valencia');

  // Persistir cambios
  useEffect(() => {
    saveStoredExpedientes(expedientes);
  }, [expedientes]);

  useEffect(() => {
    saveStoredAudiencias(audiencias);
  }, [audiencias]);

  useEffect(() => {
    saveStoredAsuntosNuevos(asuntosNuevos);
  }, [asuntosNuevos]);

  useEffect(() => {
    saveStoredSeguimientos(seguimientos);
  }, [seguimientos]);

  // Manejar actualización de expediente desde el modal
  const handleUpdateExpediente = (updated: ExpedienteJudicial) => {
    const newArr = expedientes.map(e => e.id === updated.id ? updated : e);
    setExpedientes(newArr);
    setSelectedExpediente(updated);
  };

  // Agregar nuevo expediente
  const handleCreateExpediente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numExp || !partes) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const newExp: ExpedienteJudicial = {
      id: 'exp-' + Date.now(),
      numeroExpediente: numExp.trim(),
      juzgado: juzgado.trim(),
      partes: partes.trim(),
      procedimiento: procedimiento.trim() || 'General',
      estatusActual: estatus.trim() || 'EN TRÁMITE',
      sede,
      fechaRegistro: todayStr,
      ultimaActualizacion: todayStr,
      responsableAsignado: localStorage.getItem('rd_user_name') || 'Abogado Asignado',
      actuaciones: [
        {
          id: 'act-init-' + Date.now(),
          fecha: todayStr,
          actuacion: 'Registro de expediente en el sistema intranet.',
          estatusResultante: estatus.trim() || 'EN TRÁMITE',
          registradoPor: localStorage.getItem('rd_user_name') || 'Sistema'
        }
      ]
    };

    setExpedientes([newExp, ...expedientes]);
    setShowNuevoExpedienteModal(false);
    setNumExp('');
    setPartes('');
    setProcedimiento('');
  };

  // Filtrado dinámico
  const filteredExpedientes = expedientes.filter((item) => {
    const matchSearch =
      item.numeroExpediente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.partes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.juzgado.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.procedimiento.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.estatusActual.toLowerCase().includes(searchTerm.toLowerCase());

    const matchJuzgado = juzgadoFilter === 'Todos' || item.juzgado === juzgadoFilter;
    const matchEstatus = estatusFilter === 'Todos' || item.estatusActual === estatusFilter;

    return matchSearch && matchJuzgado && matchEstatus;
  });

  const getStatusBadgeStyle = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes('SENTENCIADO')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (s.includes('FIJADO') || s.includes('AUDIENCIA')) return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
    if (s.includes('ESPERA') || s.includes('PENDIENTE')) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    if (s.includes('ACÉFALO') || s.includes('SUSPENDIDO')) return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
  };

  return (
    <div className="space-y-6">
      
      {/* Cabecera Principal del Módulo */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 p-5 sm:p-7 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Control de Expedientes y Planificación Semanal
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Consulta por N° de Expediente, historial de actuaciones y control de audiencias
              </p>
            </div>
          </div>

          {/* Navegación por pestañas de alto nivel */}
          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('expedientes')}
              className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'expedientes'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FolderSearch className="w-4 h-4" />
              Expedientes ({expedientes.length})
            </button>

            <button
              onClick={() => setActiveTab('planificacion')}
              className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'planificacion'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Planificación Semanal
            </button>
          </div>
        </div>

        {/* Buscador inteligente si estamos en vista de Expedientes */}
        {activeTab === 'expedientes' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
            <div className="md:col-span-4 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Ingresa el N° de Expediente (ej: 57.380, Prov-V...), Partes o Tribunal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950/90 border border-slate-700/80 rounded-2xl text-white placeholder:text-slate-500 text-sm focus:ring-2 focus:ring-amber-500/50 outline-none transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs font-bold"
                >
                  Limpiar
                </button>
              )}
            </div>

            <div className="md:col-span-3">
              <select
                value={juzgadoFilter}
                onChange={(e) => setJuzgadoFilter(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-950/90 border border-slate-700/80 rounded-2xl text-white text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="Todos">Todos los Juzgados</option>
                <option value="Tribunal 2do">Tribunal 2do</option>
                <option value="Tribunal 4to">Tribunal 4to</option>
                <option value="1 Juicio TP">1 Juicio TP</option>
                <option value="Tribunal 7mo MSE">Tribunal 7mo MSE</option>
                <option value="Tribunal 1ro MSE">Tribunal 1ro MSE</option>
                <option value="Juicio 6">Juicio 6</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                value={estatusFilter}
                onChange={(e) => setEstatusFilter(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-950/90 border border-slate-700/80 rounded-2xl text-white text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="Todos">Todos los Estatus</option>
                <option value="SENTENCIADO">SENTENCIADO</option>
                <option value="FIJADO EL CARTEL">FIJADO EL CARTEL</option>
                <option value="EN ESPERA DE PRONUNCIAMIENTO">EN ESPERA DE PRONUNCIAMIENTO</option>
                <option value="SENTENCIADO Y OFICIADO">SENTENCIADO Y OFICIADO</option>
                <option value="TRIBUNAL ACÉFALO">TRIBUNAL ACÉFALO</option>
                <option value="POR RETIRAR COPIAS">POR RETIRAR COPIAS</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <button
                onClick={() => setShowNuevoExpedienteModal(true)}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-3 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Nuevo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VISTA 1: TABLA Y TARJETAS DE EXPEDIENTES */}
      {activeTab === 'expedientes' && (
        <div className="space-y-4">
          
          <div className="flex justify-between items-center px-1">
            <p className="text-xs text-slate-400 font-semibold">
              Mostrando <strong className="text-amber-400">{filteredExpedientes.length}</strong> de {expedientes.length} expedientes registrados
            </p>
          </div>

          {filteredExpedientes.length === 0 ? (
            <div className="bg-slate-950/60 border border-slate-800 p-12 rounded-3xl text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500/50 mx-auto" />
              <h4 className="text-base font-bold text-white">No se encontraron expedientes</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No hay ningún expediente que coincida con el término "{searchTerm}". Intenta buscar por otro número de expediente o parte procesal.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredExpedientes.map((exp) => {
                const ultimaAct = exp.actuaciones[0];
                return (
                  <div
                    key={exp.id}
                    onClick={() => setSelectedExpediente(exp)}
                    className="bg-slate-950/80 border border-slate-800/80 hover:border-amber-500/50 p-5 rounded-2xl transition-all duration-200 shadow-md hover:shadow-xl group cursor-pointer space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800/60 pb-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="bg-amber-500 text-slate-950 font-black text-xs px-3 py-1 rounded-lg tracking-wider">
                          EXP #{exp.numeroExpediente}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                          {exp.juzgado}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          Sede: {exp.sede}
                        </span>
                      </div>

                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusBadgeStyle(exp.estatusActual)}`}>
                        {exp.estatusActual}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Partes y Procedimiento */}
                      <div className="md:col-span-5 space-y-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Partes Procesales</p>
                        <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                          {exp.partes}
                        </h3>
                        <p className="text-xs text-amber-400/90 font-medium flex items-center gap-1 pt-0.5">
                          <FileText className="w-3.5 h-3.5" /> {exp.procedimiento}
                        </p>
                      </div>

                      {/* Última Actuación Destacada */}
                      <div className="md:col-span-5 space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
                          <span>Última Actuación</span>
                          <span className="text-slate-500 font-normal">{exp.ultimaActualizacion}</span>
                        </p>
                        <p className="text-xs text-slate-200 font-medium line-clamp-2">
                          {ultimaAct ? ultimaAct.actuacion : 'Sin actuaciones registradas'}
                        </p>
                      </div>

                      {/* Botón Ver Ficha */}
                      <div className="md:col-span-2 flex items-center justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedExpediente(exp);
                          }}
                          className="bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1.5 border border-slate-700/80 group-hover:border-amber-500/40"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Ver Ficha</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: PLANIFICACIÓN SEMANAL */}
      {activeTab === 'planificacion' && (
        <PlanificacionSemanal
          audiencias={audiencias}
          asuntosNuevos={asuntosNuevos}
          seguimientos={seguimientos}
          onAddAudiencia={(aud) => setAudiencias([aud, ...audiencias])}
          onAddAsuntoNuevo={(asn) => setAsuntosNuevos([asn, ...asuntosNuevos])}
          onAddSeguimiento={(seg) => setSeguimientos([seg, ...seguimientos])}
          onToggleSeguimientoEstatus={(id) => {
            setSeguimientos(
              seguimientos.map(s =>
                s.id === id ? { ...s, estatus: s.estatus === 'Completado' ? 'Pendiente' : 'Completado' } : s
              )
            );
          }}
        />
      )}

      {/* Modal Ficha Detallada de Expediente */}
      {selectedExpediente && (
        <DetalleExpedienteModal
          expediente={selectedExpediente}
          onClose={() => setSelectedExpediente(null)}
          onUpdateExpediente={handleUpdateExpediente}
        />
      )}

      {/* Modal Crear Nuevo Expediente */}
      {showNuevoExpedienteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg p-6 sm:p-8 rounded-3xl shadow-2xl space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                Registrar Nuevo Expediente
              </h3>
              <button
                onClick={() => setShowNuevoExpedienteModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExpediente} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase block mb-1">
                  N° de Expediente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 57.380 o Prov-V-2026-00100"
                  value={numExp}
                  onChange={(e) => setNumExp(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase block mb-1">
                  Tribunal / Juzgado *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Tribunal 2do de Primera Instancia"
                  value={juzgado}
                  onChange={(e) => setJuzgado(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase block mb-1">
                  Partes Procesales *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. José De Sousa contra Francisco Texeira"
                  value={partes}
                  onChange={(e) => setPartes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase block mb-1">
                  Procedimiento / Materia
                </label>
                <input
                  type="text"
                  placeholder="Ej: Divorcio Mutuo Acuerdo, Cobro de Bolívares..."
                  value={procedimiento}
                  onChange={(e) => setProcedimiento(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-semibold uppercase block mb-1">
                    Estatus Inicial
                  </label>
                  <input
                    type="text"
                    value={estatus}
                    onChange={(e) => setEstatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-semibold uppercase block mb-1">
                    Sede
                  </label>
                  <input
                    type="text"
                    value={sede}
                    onChange={(e) => setSede(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNuevoExpedienteModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20"
                >
                  Guardar Expediente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
