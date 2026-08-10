import React, { useState, useEffect } from 'react';
import { Search, Plus, FileText, Calendar, AlertCircle, Eye, FolderSearch, ChevronRight, Scale, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExpedienteJudicial, AudienciaSemanal, AsuntoNuevo, SeguimientoPendiente } from '../../types/expedientes';
import {
  getStoredAudiencias,
  saveStoredAudiencias,
  getStoredAsuntosNuevos,
  saveStoredAsuntosNuevos,
  getStoredSeguimientos,
  saveStoredSeguimientos
} from './mockExpedientesData';
import api from '../../lib/api';
import DetalleExpedienteModal from './DetalleExpedienteModal';
import PlanificacionSemanal from './PlanificacionSemanal';

export default function ModuloExpedientes() {
  const [expedientes, setExpedientes] = useState<ExpedienteJudicial[]>([]);
  const [audiencias, setAudiencias] = useState<AudienciaSemanal[]>(() => getStoredAudiencias());
  const [asuntosNuevos, setAsuntosNuevos] = useState<AsuntoNuevo[]>(() => getStoredAsuntosNuevos());
  const [seguimientos, setSeguimientos] = useState<SeguimientoPendiente[]>(() => getStoredSeguimientos());
  const [isLoading, setIsLoading] = useState(true);

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

  // Cargar desde API y Sincronizar datos locales
  useEffect(() => {
    const fetchAndSync = async () => {
      try {
        const response = await api.get('/rd-intranet/v1/expedientes');
        let serverExpedientes: ExpedienteJudicial[] = [];
        if (Array.isArray(response.data)) {
          serverExpedientes = response.data;
        } else if (Array.isArray(response)) {
          serverExpedientes = response as any;
        }

        // Sincronización silenciosa de datos locales al servidor
        const localData = localStorage.getItem('rd_expedientes');
        if (localData) {
          const localExpedientes: ExpedienteJudicial[] = JSON.parse(localData);
          // Verificar si hay expedientes locales que no están en el servidor
          const missingOnServer = localExpedientes.filter(
            local => !serverExpedientes.some(server => server.numeroExpediente === local.numeroExpediente)
          );

          if (missingOnServer.length > 0) {
            console.log(`Sincronizando ${missingOnServer.length} expedientes locales al servidor...`);
            await api.post('/rd-intranet/v1/expedientes', { expedientes: missingOnServer });
            
            // Refetch after sync
            const newRes = await api.get('/rd-intranet/v1/expedientes');
            if (Array.isArray(newRes.data)) serverExpedientes = newRes.data;
            else if (Array.isArray(newRes)) serverExpedientes = newRes as any;
          }
          // Limpiar local storage de expedientes ya que ahora usamos el servidor
          localStorage.removeItem('rd_expedientes');
        }

        // Merge: if any server expedientes are simple bitacora ones, map them properly.
        // We do this by ensuring the shape matches ExpedienteJudicial
        const formatted = serverExpedientes.map(exp => {
          const userStr = (exp as any).usuario || (exp as any).registradoPor || exp.responsableAsignado;
          let acts = exp.actuaciones || [];
          
          // Si no tiene actuaciones estructuradas, generamos una inicial usando el resumen o la bitácora
          if (acts.length === 0) {
            const txt = (exp as any).actuacion || (exp as any).resumenActuacion || (exp as any).detalles || 'Ingreso inicial de expediente';
            acts = [{
              id: 'act-init-' + Math.random(),
              fecha: exp.ultimaActualizacion || exp.fechaRegistro || new Date().toISOString().split('T')[0],
              actuacion: txt,
              estatusResultante: exp.estatusActual || 'EN TRÁMITE',
              registradoPor: userStr || 'Sistema'
            }];
          }

          return {
            ...exp,
            id: exp.id || 'exp-' + Math.random(),
            juzgado: exp.juzgado || 'Desconocido',
            procedimiento: exp.procedimiento || (exp as any).tipo || 'General',
            estatusActual: exp.estatusActual || 'EN TRÁMITE',
            sede: exp.sede || 'Desconocida',
            fechaRegistro: exp.fechaRegistro || new Date().toISOString().split('T')[0],
            ultimaActualizacion: exp.ultimaActualizacion || new Date().toISOString().split('T')[0],
            responsableAsignado: userStr || exp.responsableAsignado || 'Sistema',
            actuaciones: acts
          };
        }) as ExpedienteJudicial[];

        setExpedientes(formatted);
      } catch (err) {
        console.error('Error fetching expedientes:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAndSync();
  }, []);

  // Persistir audiencias y seguimientos locales (fase futura para conectarlos al servidor)

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
  const handleUpdateExpediente = async (updated: ExpedienteJudicial) => {
    const newArr = expedientes.map(e => e.id === updated.id ? updated : e);
    setExpedientes(newArr);
    setSelectedExpediente(updated);
    
    // Guardar en el servidor
    try {
      await api.post('/rd-intranet/v1/expedientes', { expedientes: [updated] });
    } catch (e) {
      console.error('Error al actualizar expediente:', e);
    }
  };

  // Agregar nuevo expediente
  const handleCreateExpediente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numExp || !partes) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const cleanNum = numExp.replace(/[^0-9]/g, '') || String(Math.floor(Math.random() * 90000 + 10000));
    const generatedCorrelativo = `RD-J-${new Date().getFullYear()}-${cleanNum}`;

    const newExp: ExpedienteJudicial = {
      id: 'exp-' + Date.now(),
      numeroExpediente: numExp.trim(),
      codigoCorrelativo: generatedCorrelativo,
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
    
    // Guardar en servidor
    api.post('/rd-intranet/v1/expedientes', { expedientes: [newExp] })
      .catch(e => console.error('Error creando expediente:', e));
    
    setPartes('');
    setProcedimiento('');
  };

  // Filtrado dinámico con búsqueda flexible inteligente (bidireccional)
  const filteredExpedientes = expedientes.filter((item) => {
    const rawSearch = searchTerm.trim().toLowerCase();
    if (!rawSearch) {
      const matchJuzgado = juzgadoFilter === 'Todos' || item.juzgado === juzgadoFilter;
      const matchEstatus = estatusFilter === 'Todos' || item.estatusActual === estatusFilter;
      return matchJuzgado && matchEstatus;
    }

    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanSearch = normalize(rawSearch);
    
    const expDigits = (item.numeroExpediente.match(/\d+/g) || []).join('');
    const cleanNumExp = normalize(item.numeroExpediente);
    const itemCorrelativo = item.codigoCorrelativo || `RD-J-2026-${expDigits || '0000'}`;
    const cleanCorrelativo = normalize(itemCorrelativo);
    const correlativeDigits = (itemCorrelativo.match(/\d+/g) || []).join('');

    const searchDigits = (rawSearch.match(/\d+/g) || []).join('');

    // 1. Coincidencia directa de texto en cualquier campo
    const directMatch =
      item.numeroExpediente.toLowerCase().includes(rawSearch) ||
      itemCorrelativo.toLowerCase().includes(rawSearch) ||
      item.partes.toLowerCase().includes(rawSearch) ||
      item.juzgado.toLowerCase().includes(rawSearch) ||
      item.procedimiento.toLowerCase().includes(rawSearch) ||
      item.estatusActual.toLowerCase().includes(rawSearch) ||
      (item.responsableAsignado || '').toLowerCase().includes(rawSearch) ||
      (item.actuaciones[0]?.registradoPor || '').toLowerCase().includes(rawSearch);

    // 2. Coincidencia numérica bidireccional despojando caracteres especiales
    const numericMatch =
      (searchDigits.length >= 2 && expDigits.length >= 2 && (searchDigits.includes(expDigits) || expDigits.includes(searchDigits))) ||
      (searchDigits.length >= 2 && correlativeDigits.length >= 2 && (searchDigits.includes(correlativeDigits) || correlativeDigits.includes(searchDigits))) ||
      (cleanSearch.length >= 2 && (cleanNumExp.includes(cleanSearch) || cleanCorrelativo.includes(cleanSearch) || cleanSearch.includes(cleanNumExp) || cleanSearch.includes(cleanCorrelativo)));

    const matchSearch = directMatch || numericMatch;
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

  const handleDownloadPdf = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Encabezado calcado del formato físico original de Word
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      doc.text('Dr. Víctor Román & Dr. Luis Delgado', pageWidth / 2, 14, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text('Despacho de Abogados - Román & Delgado', pageWidth / 2, 19, { align: 'center' });
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(217, 119, 6); // Ámbar / Oro
      doc.text('RELACIÓN DE EXPEDIENTES JUDICIALES', pageWidth / 2, 25, { align: 'center' });

      const monthName = new Date().toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(`SEDE VALENCIA  -  MES: ${monthName} ${new Date().getFullYear()}`, pageWidth - 14, 25, { align: 'right' });

      // Filas formateadas
      const tableRows = filteredExpedientes.map(exp => {
        const ultimaAct = exp.actuaciones[0]?.actuacion || 'Sin actuaciones registradas';
        return [
          exp.numeroExpediente,
          exp.juzgado,
          exp.partes,
          exp.procedimiento,
          ultimaAct,
          exp.estatusActual
        ];
      });

      autoTable(doc, {
        startY: 29,
        head: [['Expediente', 'Juzgado', 'Partes', 'Procedimiento', 'Actuación', 'Estatus']],
        body: tableRows,
        theme: 'grid',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5,
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59],
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 28, fontStyle: 'bold', halign: 'center' },
          1: { cellWidth: 32 },
          2: { cellWidth: 62, fontStyle: 'bold' },
          3: { cellWidth: 45 },
          4: { cellWidth: 68 },
          5: { cellWidth: 35, fontStyle: 'bold', halign: 'center' }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        }
      });

      doc.save(`RELACION_EXPEDIENTES_VALENCIA_${monthName}_${new Date().getFullYear()}.pdf`);
    } catch (e) {
      console.error('Error al generar PDF impreso de expedientes', e);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Cabecera Principal del Módulo */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 p-4 sm:p-6 rounded-3xl shadow-xl space-y-4 overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md flex-shrink-0">
              <Scale className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
                Gestión de Expedientes Judiciales
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Consulta por N° de Expediente, historial de actuaciones y agenda de audiencias
              </p>
            </div>
          </div>

          {/* Navegación por pestañas de alto nivel */}
          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 w-full lg:w-auto flex-shrink-0">
            <button
              onClick={() => setActiveTab('expedientes')}
              className={`flex-1 lg:flex-none px-3.5 sm:px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
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
              className={`flex-1 lg:flex-none px-3.5 sm:px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'planificacion'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Agenda & Audiencias
            </button>
          </div>
        </div>

        {/* Buscador inteligente si estamos en vista de Expedientes */}
        {activeTab === 'expedientes' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-2">
            <div className="lg:col-span-4 sm:col-span-2 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Ingresa el N° de Expediente (ej: 57.380, Prov-V...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/90 border border-slate-700/80 rounded-2xl text-white placeholder:text-slate-500 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500/50 outline-none transition-all"
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

            <div className="lg:col-span-3 sm:col-span-1">
              <select
                value={juzgadoFilter}
                onChange={(e) => setJuzgadoFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950/90 border border-slate-700/80 rounded-2xl text-white text-xs font-semibold outline-none cursor-pointer"
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

            <div className="lg:col-span-3 sm:col-span-1">
              <select
                value={estatusFilter}
                onChange={(e) => setEstatusFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950/90 border border-slate-700/80 rounded-2xl text-white text-xs font-semibold outline-none cursor-pointer"
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

            <div className="lg:col-span-2 sm:col-span-2 flex gap-2">
              <button
                onClick={handleDownloadPdf}
                title="Generar PDF Imprimible idéntico al reporte de Word"
                className="flex-1 bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-400 font-bold py-2.5 rounded-2xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Imprimir / PDF</span>
              </button>

              <button
                onClick={() => setShowNuevoExpedienteModal(true)}
                className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-2.5 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
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

          {isLoading ? (
            <div className="bg-slate-950/60 border border-slate-800 p-12 rounded-3xl text-center space-y-3">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm font-semibold text-white">Sincronizando con el servidor...</p>
            </div>
          ) : filteredExpedientes.length === 0 ? (
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
                const expDigits = (exp.numeroExpediente.match(/\d+/g) || []).join('');
                const correlativoBadge = exp.codigoCorrelativo || `RD-J-2026-${expDigits || '0000'}`;
                const autorName = ultimaAct?.registradoPor || exp.responsableAsignado || (exp as any).usuario || 'Sistema';

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
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-400">
                          Ref: {correlativoBadge}
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
                      <div className="md:col-span-5 space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-bold uppercase tracking-wider">Última Actuación</span>
                          <span className="text-slate-500 font-normal">{exp.ultimaActualizacion}</span>
                        </div>
                        <p className="text-xs text-slate-200 font-medium line-clamp-2">
                          {ultimaAct ? ultimaAct.actuacion : 'Sin actuaciones registradas'}
                        </p>
                        <div className="text-[11px] text-amber-400/90 font-semibold pt-1 border-t border-slate-800/50 flex items-center justify-between">
                          <span className="text-slate-400 font-medium">Registrado por:</span>
                          <span className="text-white font-bold">{autorName}</span>
                        </div>
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
