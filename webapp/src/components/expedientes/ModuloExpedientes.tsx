import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, FileText, Calendar, AlertCircle, Eye, FolderSearch, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, Scale, Download, X, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExpedienteJudicial, AudienciaSemanal, AsuntoNuevo, SeguimientoPendiente } from '../../types/expedientes';
import {
  getStoredExpedientes,
  getStoredAudiencias,
  saveStoredAudiencias,
  getStoredAsuntosNuevos,
  saveStoredAsuntosNuevos,
  getStoredSeguimientos,
  saveStoredSeguimientos
} from './mockExpedientesData';
import api, { submitToServer } from '../../lib/api';
import DetalleExpedienteModal from './DetalleExpedienteModal';
import PlanificacionSemanal from './PlanificacionSemanal';
import BadgeLapsoProcesal from './BadgeLapsoProcesal';
import { calcularComputoProcesal } from '../../lib/lapsosProcesales';
import { checkIsJefatura } from '../../App';

interface ModuloExpedientesProps {
  isAdmin?: boolean;
}

export default function ModuloExpedientes({ isAdmin: propIsAdmin }: ModuloExpedientesProps = {}) {
  const currentUserName = localStorage.getItem('rd_user_name') || '';
  const isJefe = propIsAdmin !== undefined
    ? propIsAdmin
    : checkIsJefatura(currentUserName, localStorage.getItem('rd_is_admin') === 'true');
  const [expedientes, setExpedientes] = useState<ExpedienteJudicial[]>(() => {
    try {
      const cached = localStorage.getItem('rd_cached_expedientes');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.sort((a: any, b: any) => {
            const dateA = a.actuaciones?.[0]?.fecha || a.ultimaActualizacion || a.fechaRegistro || '';
            const dateB = b.actuaciones?.[0]?.fecha || b.ultimaActualizacion || b.fechaRegistro || '';
            return dateB.localeCompare(dateA);
          });
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error al leer caché de expedientes:', e);
    }
    const initial = getStoredExpedientes();
    initial.sort((a: any, b: any) => {
      const dateA = a.actuaciones?.[0]?.fecha || a.ultimaActualizacion || a.fechaRegistro || '';
      const dateB = b.actuaciones?.[0]?.fecha || b.ultimaActualizacion || b.fechaRegistro || '';
      return dateB.localeCompare(dateA);
    });
    return initial;
  });
  const [audiencias, setAudiencias] = useState<AudienciaSemanal[]>(() => getStoredAudiencias());
  const [asuntosNuevos, setAsuntosNuevos] = useState<AsuntoNuevo[]>(() => getStoredAsuntosNuevos());
  const [seguimientos, setSeguimientos] = useState<SeguimientoPendiente[]>(() => getStoredSeguimientos());
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem('rd_cached_expedientes');
      return !cached || JSON.parse(cached).length === 0;
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<'expedientes' | 'planificacion'>('expedientes');
  const [searchTerm, setSearchTerm] = useState('');
  const [juzgadoFilter, setJuzgadoFilter] = useState('Todos');
  const [estatusFilter, setEstatusFilter] = useState('Todos');
  const [lapsoFilter, setLapsoFilter] = useState('Todos');

  // Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedExpediente, setSelectedExpediente] = useState<ExpedienteJudicial | null>(null);
  const [showNuevoExpedienteModal, setShowNuevoExpedienteModal] = useState(false);

  // Estados para detección y eliminación de duplicados (exclusivo para Jefatura)
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState<boolean>(false);
  const [confirmDeleteExp, setConfirmDeleteExp] = useState<ExpedienteJudicial | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

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
      if (expedientes.length === 0) {
        setIsLoading(true);
      }
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
          try {
            const localExpedientes: ExpedienteJudicial[] = JSON.parse(localData);
            // Verificar si hay expedientes locales que no están en el servidor
            const missingOnServer = localExpedientes.filter(
              local => !serverExpedientes.some(server => server.numeroExpediente === local.numeroExpediente)
            );

            if (missingOnServer.length > 0) {
              console.log(`Sincronizando ${missingOnServer.length} expedientes locales al servidor...`);
              await submitToServer('/rd-intranet/v1/expedientes', { expedientes: missingOnServer });

              // Refetch after sync
              const newRes = await api.get('/rd-intranet/v1/expedientes');
              if (Array.isArray(newRes.data)) serverExpedientes = newRes.data;
              else if (Array.isArray(newRes)) serverExpedientes = newRes as any;
            }
          } catch (e) {
            console.error('Error sincronizando expedientes locales:', e);
          }
          // Limpiar local storage de expedientes ya que ahora usamos el servidor
          localStorage.removeItem('rd_expedientes');
        }

        if (serverExpedientes.length > 0) {
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

            const localMatch = expedientes.find(e => e.numeroExpediente === exp.numeroExpediente || e.id === exp.id);
            return {
              ...exp,
              id: exp.id || 'exp-' + Math.random(),
              juzgado: exp.juzgado || 'Desconocido',
              procedimiento: exp.procedimiento || (exp as any).tipo || 'General',
              estatusActual: exp.estatusActual || 'EN TRÁMITE',
              sede: exp.sede || 'Desconocida',
              fechaRegistro: exp.fechaRegistro || (acts[0] ? acts[0].fecha : new Date().toISOString().split('T')[0]),
              ultimaActualizacion: acts[0] ? acts[0].fecha : (exp.ultimaActualizacion || new Date().toISOString().split('T')[0]),
              responsableAsignado: userStr || exp.responsableAsignado || 'Sistema',
              actuaciones: acts,
              controlProcesal: exp.controlProcesal || localMatch?.controlProcesal
            };
          }) as ExpedienteJudicial[];

          // Ordenar del más nuevo al más viejo
          formatted.sort((a, b) => {
            const dateA = a.actuaciones[0]?.fecha || a.ultimaActualizacion || a.fechaRegistro || '';
            const dateB = b.actuaciones[0]?.fecha || b.ultimaActualizacion || b.fechaRegistro || '';
            return dateB.localeCompare(dateA);
          });

          setExpedientes(formatted);
          try {
            localStorage.setItem('rd_cached_expedientes', JSON.stringify(formatted));
          } catch (err) {
            console.warn('Error al guardar expedientes en caché:', err);
          }
        }
      } catch (err) {
        console.error('Error fetching expedientes:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAndSync();
    const handleRemoteUpdate = () => fetchAndSync();
    window.addEventListener('rd_expedientes_updated', handleRemoteUpdate);
    return () => window.removeEventListener('rd_expedientes_updated', handleRemoteUpdate);
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
    try {
      localStorage.setItem('rd_cached_expedientes', JSON.stringify(newArr));
    } catch (e) {
      console.warn('Error guardando en caché:', e);
    }

    // Guardar en el servidor
    try {
      await submitToServer('/rd-intranet/v1/expedientes', { expedientes: [updated] });
    } catch (e) {
      console.error('Error al actualizar expediente:', e);
    }
  };

  // Manejar eliminación de expediente (exclusivo para jefatura)
  const handleDeleteExpediente = async (exp: ExpedienteJudicial) => {
    if (!isJefe) {
      setActionFeedback('Acción restringida: Solo el personal de jefatura tiene permisos para eliminar expedientes del sistema.');
      setTimeout(() => setActionFeedback(null), 4000);
      return;
    }
    // 1. Actualización optimista local
    const filtered = expedientes.filter(e => e.id !== exp.id && e.numeroExpediente !== exp.numeroExpediente);
    setExpedientes(filtered);
    if (selectedExpediente?.id === exp.id || selectedExpediente?.numeroExpediente === exp.numeroExpediente) {
      setSelectedExpediente(null);
    }

    try {
      localStorage.setItem('rd_cached_expedientes', JSON.stringify(filtered));
      const stored = localStorage.getItem('rd_expedientes_list_v1');
      if (stored) {
        const parsed = JSON.parse(stored).filter((e: any) => e.id !== exp.id && e.numeroExpediente !== exp.numeroExpediente);
        localStorage.setItem('rd_expedientes_list_v1', JSON.stringify(parsed));
      }
    } catch (e) {
      console.warn('Error actualizando caché al eliminar:', e);
    }

    // 2. Eliminar en Supabase
    try {
      await submitToServer('/rd-intranet/v1/delete-expediente', { id: exp.id, numero: exp.numeroExpediente });
    } catch (e) {
      console.error('Error eliminando expediente en servidor:', e);
    }

    window.dispatchEvent(new CustomEvent('rd_expedientes_updated'));
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

    const updatedList = [newExp, ...expedientes];
    setExpedientes(updatedList);
    try {
      localStorage.setItem('rd_cached_expedientes', JSON.stringify(updatedList));
    } catch (e) {
      console.warn('Error guardando en caché:', e);
    }
    setShowNuevoExpedienteModal(false);
    setNumExp('');

    // Guardar en servidor
    submitToServer('/rd-intranet/v1/expedientes', { expedientes: [newExp] })
      .catch(e => console.error('Error creando expediente:', e));

    setPartes('');
    setProcedimiento('');
  };

  // Detección inteligente de duplicados / casos repetidos
  const duplicatesAnalysis = useMemo(() => {
    const normalize = (str?: string) => {
      if (!str) return '';
      return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
    };

    const map = new Map<string, { matches: ExpedienteJudicial[]; reason: string }>();

    for (let i = 0; i < expedientes.length; i++) {
      const a = expedientes[i];
      const normPartesA = normalize(a.partes);
      const normNumA = normalize(a.numeroExpediente);

      const conflictingMatches: ExpedienteJudicial[] = [];
      let detectedReason = '';

      for (let j = 0; j < expedientes.length; j++) {
        if (i === j) continue;
        const b = expedientes[j];
        const normPartesB = normalize(b.partes);
        const normNumB = normalize(b.numeroExpediente);

        let isMatch = false;
        let reason = '';

        // 1. Mismo número exacto de expediente o correlativo
        if (normNumA.length >= 3 && normNumA === normNumB) {
          isMatch = true;
          reason = `Número de expediente idéntico (#${b.numeroExpediente})`;
        }
        // 2. Mismas partes procesales exactas (mínimo 4 caracteres normalizados)
        else if (normPartesA.length >= 4 && normPartesA === normPartesB) {
          isMatch = true;
          reason = `Mismas partes procesales exactas ("${b.partes}")`;
        }

        if (isMatch) {
          conflictingMatches.push(b);
          if (!detectedReason) detectedReason = reason;
        }
      }

      if (conflictingMatches.length > 0) {
        map.set(a.id, { matches: conflictingMatches, reason: detectedReason });
        if (a.numeroExpediente) {
          map.set(a.numeroExpediente, { matches: conflictingMatches, reason: detectedReason });
        }
      }
    }

    const duplicatesList = expedientes.filter(exp =>
      map.has(exp.id) || (exp.numeroExpediente ? map.has(exp.numeroExpediente) : false)
    );

    return {
      duplicatesMap: map,
      duplicatesList,
      totalDuplicates: duplicatesList.length
    };
  }, [expedientes]);

  // Filtrado dinámico con búsqueda flexible inteligente (bidireccional)
  const filteredExpedientes = expedientes.filter((item) => {
    // Si el filtro de duplicados está activo (exclusivo jefatura)
    if (showDuplicatesOnly) {
      const isDup = duplicatesAnalysis.duplicatesMap.has(item.id) ||
        (item.numeroExpediente ? duplicatesAnalysis.duplicatesMap.has(item.numeroExpediente) : false);
      if (!isDup) return false;
    }

    const rawSearch = searchTerm.trim().toLowerCase();
    const matchJuzgado = juzgadoFilter === 'Todos' || item.juzgado === juzgadoFilter;
    const matchEstatus = estatusFilter === 'Todos' || item.estatusActual === estatusFilter;

    let matchLapso = true;
    if (lapsoFilter !== 'Todos') {
      const comp = calcularComputoProcesal(item.controlProcesal);
      if (lapsoFilter === 'urgente') matchLapso = comp.estado === 'urgente';
      else if (lapsoFilter === 'alerta') matchLapso = comp.estado === 'alerta' || comp.estado === 'urgente';
      else if (lapsoFilter === 'sin_despacho') matchLapso = (item.controlProcesal?.diasSinDespacho || []).length > 0;
      else if (lapsoFilter === 'vencido') matchLapso = comp.estado === 'vencido';
      else if (lapsoFilter === 'con_etapa') matchLapso = !!item.controlProcesal?.etapaActualNombre;
      else if (lapsoFilter === 'sin_etapa') matchLapso = !item.controlProcesal?.etapaActualNombre;
    }

    if (!rawSearch) {
      return matchJuzgado && matchEstatus && matchLapso;
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
      (item.actuaciones[0]?.registradoPor || '').toLowerCase().includes(rawSearch) ||
      (item.controlProcesal?.etapaActualNombre || '').toLowerCase().includes(rawSearch);

    // 2. Coincidencia numérica bidireccional despojando caracteres especiales
    const numericMatch =
      (searchDigits.length >= 2 && expDigits.length >= 2 && (searchDigits.includes(expDigits) || expDigits.includes(searchDigits))) ||
      (searchDigits.length >= 2 && correlativeDigits.length >= 2 && (searchDigits.includes(correlativeDigits) || correlativeDigits.includes(searchDigits))) ||
      (cleanSearch.length >= 2 && (cleanNumExp.includes(cleanSearch) || cleanCorrelativo.includes(cleanSearch) || cleanSearch.includes(cleanNumExp) || cleanSearch.includes(cleanCorrelativo)));

    const matchSearch = directMatch || numericMatch;

    return matchSearch && matchJuzgado && matchEstatus && matchLapso;
  });

  // Resetear a la primera página si cambian los filtros o la búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, juzgadoFilter, estatusFilter, lapsoFilter, showDuplicatesOnly]);

  // Orden estricto del más nuevo al más viejo
  const sortedExpedientes = [...filteredExpedientes].sort((a, b) => {
    const dateA = a.actuaciones[0]?.fecha || a.ultimaActualizacion || a.fechaRegistro || '';
    const dateB = b.actuaciones[0]?.fecha || b.ultimaActualizacion || b.fechaRegistro || '';
    return dateB.localeCompare(dateA);
  });

  // Cálculos de paginación
  const totalPages = Math.max(1, Math.ceil(sortedExpedientes.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedExpedientes = itemsPerPage >= 9999 ? sortedExpedientes : sortedExpedientes.slice(startIndex, endIndex);

  const getStatusBadgeStyle = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes('SENTENCIADO')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s.includes('FIJADO') || s.includes('AUDIENCIA')) return 'bg-sky-50 text-sky-700 border-sky-200';
    if (s.includes('ESPERA') || s.includes('PENDIENTE')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (s.includes('ACÉFALO') || s.includes('SUSPENDIDO')) return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-purple-50 text-purple-700 border-purple-200';
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
      <div className="bg-white border border-blue-200 p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-md shadow-blue-950/8 space-y-3.5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#172554] to-[#1d4ed8] flex items-center justify-center text-white shadow-md shadow-blue-900/20 flex-shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight truncate">
                Gestión de Expedientes Judiciales
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Control de causas, historial de actuaciones y agenda de audiencias
              </p>
            </div>
          </div>

          {/* Navegación por pestañas de alto nivel */}
          <div className="flex flex-wrap items-center bg-blue-100/90 p-1 rounded-xl border border-blue-200 w-full lg:w-auto flex-shrink-0 gap-1">
            <button
              onClick={() => {
                setActiveTab('expedientes');
                setShowDuplicatesOnly(false);
              }}
              className={`flex-1 lg:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'expedientes' && !showDuplicatesOnly
                  ? 'bg-[#1e3a8a] text-white shadow-sm font-bold'
                  : 'text-slate-700 hover:text-[#1e3a8a] hover:bg-white/75'
                }`}
            >
              <FolderSearch className="w-3.5 h-3.5" />
              <span>Expedientes</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${activeTab === 'expedientes' && !showDuplicatesOnly
                  ? 'bg-blue-700/60 text-white'
                  : 'bg-slate-200 text-slate-700'
                }`}>
                {isLoading && expedientes.length === 0 ? '...' : expedientes.length}
              </span>
            </button>

            {isJefe && (
              <button
                onClick={() => {
                  setActiveTab('expedientes');
                  if (duplicatesAnalysis.totalDuplicates === 0) {
                    setActionFeedback('¡Excelente! No se detectaron expedientes repetidos ni duplicados.');
                    setTimeout(() => setActionFeedback(null), 3500);
                  } else {
                    setShowDuplicatesOnly(prev => !prev);
                  }
                }}
                className={`flex-1 lg:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${showDuplicatesOnly
                    ? 'bg-rose-600 text-white shadow-xs font-bold ring-1 ring-rose-500'
                    : duplicatesAnalysis.totalDuplicates > 0
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                title="Detector de expedientes repetidos o duplicados (Exclusivo Jefatura)"
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${duplicatesAnalysis.totalDuplicates > 0 ? 'text-rose-600' : 'text-slate-500'}`} />
                <span>
                  {duplicatesAnalysis.totalDuplicates > 0
                    ? `Repetidos (${duplicatesAnalysis.totalDuplicates})`
                    : 'Sin Repetidos'}
                </span>
              </button>
            )}

            <button
              onClick={() => {
                setActiveTab('planificacion');
                setShowDuplicatesOnly(false);
              }}
              className={`flex-1 lg:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'planificacion'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Agenda & Audiencias</span>
            </button>
          </div>
        </div>

        {/* Buscador inteligente si estamos en vista de Expedientes */}
        {activeTab === 'expedientes' && (
          <div className="bg-[#eef4ff] border border-blue-200 p-3 sm:p-3.5 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
            <div className="lg:col-span-4 sm:col-span-2 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por N° expediente, partes, tribunal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-16 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-2xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-semibold"
                >
                  Limpiar
                </button>
              )}
            </div>

            <div className="lg:col-span-2 sm:col-span-1">
              <select
                value={juzgadoFilter}
                onChange={(e) => setJuzgadoFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold outline-none cursor-pointer hover:border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs truncate"
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

            <div className="lg:col-span-2 sm:col-span-1">
              <select
                value={estatusFilter}
                onChange={(e) => setEstatusFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold outline-none cursor-pointer hover:border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs truncate"
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

            <div className="lg:col-span-2 sm:col-span-1">
              <select
                value={lapsoFilter}
                onChange={(e) => setLapsoFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-bold outline-none cursor-pointer hover:border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs truncate"
              >
                <option value="Todos">Todos los Lapsos</option>
                <option value="urgente">Urgentes (≤ 2 días hábiles)</option>
                <option value="alerta">Por Vencer (≤ 5 días)</option>
                <option value="sin_despacho">Con Días Sin Despacho</option>
                <option value="vencido">Lapsos Vencidos</option>
                <option value="con_etapa">Con Etapa Asignada</option>
                <option value="sin_etapa">Sin Etapa Asignada</option>
              </select>
            </div>

            <div className="lg:col-span-2 sm:col-span-1 flex gap-2">
              <button
                onClick={handleDownloadPdf}
                title="Generar PDF Imprimible idéntico al reporte de Word"
                className="flex-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">PDF</span>
              </button>

              <button
                onClick={() => setShowNuevoExpedienteModal(true)}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo</span>
              </button>
            </div>
          </div>
        )}

        {/* Banner Informativo cuando el filtro de duplicados está activo */}
        {showDuplicatesOnly && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-900 shadow-2xs animate-in fade-in duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl mt-0.5 border border-rose-200 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-black text-rose-950 tracking-tight">
                    Detector de Expedientes Repetidos Activo
                  </h4>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-extrabold shadow-2xs">
                    {duplicatesAnalysis.totalDuplicates} {duplicatesAnalysis.totalDuplicates === 1 ? 'caso repetido' : 'casos repetidos'}
                  </span>
                </div>
                <p className="text-xs text-rose-800 max-w-2xl">
                  Se muestran únicamente los expedientes que tienen partes procesales, clientes o números correlativos repetidos. Revisa cuál es el expediente oficial y presiona <strong>"Eliminar Duplicado"</strong> para descartar la copia sobrante permanentemente de Supabase.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDuplicatesOnly(false)}
              className="px-3.5 py-2 rounded-xl bg-white border border-rose-200 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-2xs"
            >
              Ver todos los expedientes
            </button>
          </div>
        )}
      </div>

      {/* VISTA 1: TABLA Y TARJETAS DE EXPEDIENTES */}
      {activeTab === 'expedientes' && (
        <div className="space-y-4">

          <div className="flex justify-between items-center px-1">
            {isLoading && expedientes.length === 0 ? (
              <p className="text-xs text-blue-600 font-medium flex items-center gap-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping inline-block" />
                Conectando con la base de datos de expedientes...
              </p>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-slate-500 font-semibold">
                  Mostrando <strong className="text-slate-900 font-bold">{sortedExpedientes.length > 0 ? startIndex + 1 : 0} - {Math.min(endIndex, sortedExpedientes.length)}</strong> de {sortedExpedientes.length} expedientes {sortedExpedientes.length !== expedientes.length ? `(filtrados de ${expedientes.length})` : 'registrados'}
                </p>
                {totalPages > 1 && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
                    Página {safeCurrentPage} de {totalPages}
                  </span>
                )}
              </div>
            )}
          </div>

          {isLoading && expedientes.length === 0 ? (
            <div className="bg-white border border-slate-200/90 p-12 rounded-3xl text-center space-y-4 shadow-xs animate-in fade-in duration-300">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900">Sincronizando Expedientes Judiciales...</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Conectando con la base de datos central en tiempo real. Un momento por favor.
                </p>
              </div>
            </div>
          ) : sortedExpedientes.length === 0 ? (
            <div className="bg-white border border-slate-200/90 p-12 rounded-3xl text-center space-y-3 shadow-xs">
              <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-base font-bold text-slate-900">No se encontraron expedientes</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchTerm
                  ? `No hay ningún expediente que coincida con el término "${searchTerm}". Intenta buscar por otro número de expediente o parte procesal.`
                  : 'No hay expedientes con los filtros seleccionados.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {paginatedExpedientes.map((exp) => {
                const ultimaAct = exp.actuaciones[0];
                const expDigits = (exp.numeroExpediente.match(/\d+/g) || []).join('');
                const correlativoBadge = exp.codigoCorrelativo || `RD-J-2026-${expDigits || '0000'}`;
                const autorName = ultimaAct?.registradoPor || exp.responsableAsignado || (exp as any).usuario || 'Sistema';
                const dupInfo = duplicatesAnalysis.duplicatesMap.get(exp.id) ||
                  (exp.numeroExpediente ? duplicatesAnalysis.duplicatesMap.get(exp.numeroExpediente) : undefined);

                return (
                  <div
                    key={exp.id}
                    onClick={() => setSelectedExpediente(exp)}
                    className={`bg-white p-5 rounded-2xl transition-all duration-200 shadow-sm shadow-blue-950/5 hover:shadow-md group cursor-pointer space-y-4 border ${dupInfo
                        ? 'border-rose-300 hover:border-rose-400 bg-rose-50/20'
                        : 'border-blue-200 hover:border-blue-400'
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-blue-50 text-blue-700 font-extrabold text-xs px-3 py-1 rounded-lg border border-blue-200/80 tracking-wider shadow-2xs">
                          EXP #{exp.numeroExpediente}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600">
                          Ref: {correlativoBadge}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600">
                          {exp.juzgado}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          Sede: {exp.sede}
                        </span>
                        {dupInfo && (
                          <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 shadow-2xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            DUPLICADO
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Nota: Se eliminó el BadgeLapsoProcesal duplicado de la cabecera */}
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusBadgeStyle(exp.estatusActual)}`}>
                          {exp.estatusActual}
                        </span>
                      </div>
                    </div>

                    {/* Alerta visible en la tarjeta si tiene duplicado */}
                    {dupInfo && (
                      <div className="bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-rose-800">
                        <div className="flex items-center gap-2 font-bold">
                          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                          <span>Expediente Repetido / Duplicado: {dupInfo.reason}</span>
                        </div>
                        <span className="text-[11px] text-rose-700 font-mono font-semibold">
                          Coincide con #{dupInfo.matches.map(m => m.numeroExpediente).join(', ')}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      {/* Partes y Procedimiento */}
                      <div className="md:col-span-4 space-y-0.5">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Partes Procesales</p>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                          {exp.partes}
                        </h3>
                        <p className="text-xs text-blue-600 font-medium flex items-center gap-1 pt-0.5">
                          <FileText className="w-3.5 h-3.5" /> {exp.procedimiento}
                        </p>
                      </div>

                      {/* Control y Estado del Lapso Procesal */}
                      <div className="md:col-span-3 flex flex-col justify-center">
                        <BadgeLapsoProcesal
                          control={exp.controlProcesal}
                          onOpenConfig={() => setSelectedExpediente(exp)}
                        />
                      </div>

                      {/* Última Actuación Destacada */}
                      <div className="md:col-span-3 space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-bold uppercase tracking-wider">Última Actuación</span>
                          <span className="text-blue-600 font-semibold">{ultimaAct?.fecha || exp.ultimaActualizacion}</span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium line-clamp-2">
                          {ultimaAct ? ultimaAct.actuacion : 'Sin actuaciones registradas'}
                        </p>
                        <div className="text-[11px] text-slate-600 font-semibold pt-1 border-t border-slate-200/80 flex items-center justify-between">
                          <span className="text-slate-400 font-medium">Registrado por:</span>
                          <span className="text-slate-800 font-bold">{autorName}</span>
                        </div>
                      </div>

                      {/* Botón Ver Ficha y Eliminar (Solo Jefatura) */}
                      <div className="md:col-span-2 flex items-center justify-end gap-2 flex-wrap">
                        {isJefe && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteExp(exp);
                            }}
                            className={`font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer ${dupInfo
                                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                                : 'p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200'
                              }`}
                            title={dupInfo ? 'Eliminar este expediente duplicado definitivamente (Solo Jefatura)' : 'Eliminar este expediente del sistema (Solo Jefatura)'}
                          >
                            <Trash2 className="w-4 h-4" />
                            {dupInfo && <span>Eliminar Duplicado</span>}
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedExpediente(exp);
                          }}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Ficha</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Barra de Navegación y Paginación */}
          {sortedExpedientes.length > 0 && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 pb-2 border-t border-slate-200/80 bg-white p-4 rounded-2xl shadow-xs">
              {/* Selector de cantidad por página y resumen */}
              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap justify-center sm:justify-start">
                <div className="flex items-center gap-1.5">
                  <span>Mostrar:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-slate-50 border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs outline-none cursor-pointer hover:border-blue-400 transition-colors shadow-2xs"
                  >
                    <option value={5}>5 expedientes</option>
                    <option value={10}>10 expedientes</option>
                    <option value={20}>20 expedientes</option>
                    <option value={50}>50 expedientes</option>
                    <option value={9999}>Ver todos ({sortedExpedientes.length})</option>
                  </select>
                </div>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600 font-medium">
                  Expedientes <strong className="text-slate-900">{startIndex + 1}</strong> a <strong className="text-slate-900">{Math.min(endIndex, sortedExpedientes.length)}</strong> de <strong className="text-blue-600">{sortedExpedientes.length}</strong>
                </span>
              </div>

              {/* Controles de navegación */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={safeCurrentPage === 1}
                    title="Primera página"
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={safeCurrentPage === 1}
                    title="Página anterior"
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>

                  {/* Botones numéricos de página */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - safeCurrentPage) <= 1
                      );
                    })
                    .map((page, idx, array) => {
                      const prevPage = array[idx - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;

                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && (
                            <span className="px-1.5 text-slate-400 text-xs font-bold">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center ${safeCurrentPage === page
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs'
                              }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={safeCurrentPage === totalPages}
                    title="Página siguiente"
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span className="hidden sm:inline">Siguiente</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safeCurrentPage === totalPages}
                    title="Última página"
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              )}
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
          onDeleteExpediente={isJefe ? handleDeleteExpediente : undefined}
        />
      )}

      {/* Modal Crear Nuevo Expediente */}
      {showNuevoExpedienteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white border border-blue-200 w-full max-w-lg rounded-3xl shadow-2xl shadow-blue-950/25 overflow-hidden text-slate-900 animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-[#172554] via-[#1e3a8a] to-[#1d4ed8] text-white p-5 sm:p-6 flex justify-between items-center border-b border-blue-800/60">
              <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-sky-200" />
                </div>
                Registrar Nuevo Expediente
              </h3>
              <button
                onClick={() => setShowNuevoExpedienteModal(false)}
                className="text-white bg-white/15 hover:bg-white/25 border border-white/25 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpediente} className="p-6 sm:p-7 space-y-4">
              <div>
                <label className="text-xs text-slate-600 font-bold uppercase block mb-1">
                  N° de Expediente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 57.380 o Prov-V-2026-00100"
                  value={numExp}
                  onChange={(e) => setNumExp(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 font-bold uppercase block mb-1">
                  Tribunal / Juzgado *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Tribunal 2do de Primera Instancia"
                  value={juzgado}
                  onChange={(e) => setJuzgado(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 font-bold uppercase block mb-1">
                  Partes Procesales *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. José De Sousa contra Francisco Texeira"
                  value={partes}
                  onChange={(e) => setPartes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 font-bold uppercase block mb-1">
                  Procedimiento / Materia
                </label>
                <input
                  type="text"
                  placeholder="Ej: Divorcio Mutuo Acuerdo, Cobro de Bolívares..."
                  value={procedimiento}
                  onChange={(e) => setProcedimiento(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 font-bold uppercase block mb-1">
                    Estatus Inicial
                  </label>
                  <input
                    type="text"
                    value={estatus}
                    onChange={(e) => setEstatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 font-bold uppercase block mb-1">
                    Sede
                  </label>
                  <input
                    type="text"
                    value={sede}
                    onChange={(e) => setSede(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNuevoExpedienteModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Guardar Expediente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación Definitiva (Jefatura) */}
      {confirmDeleteExp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white/98 border border-rose-200 w-full max-w-md p-6 sm:p-7 rounded-3xl shadow-2xl shadow-blue-950/15 space-y-4 text-slate-900">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900">¿Eliminar Expediente del Sistema?</h3>
              <p className="text-xs text-slate-500">
                Esta acción borrará este expediente de forma permanente de Supabase y de todos los dispositivos del despacho.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">N° Expediente:</span>
                <span className="text-blue-600 font-black">#{confirmDeleteExp.numeroExpediente}</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-500 font-semibold flex-shrink-0">Partes Procesales:</span>
                <span className="text-slate-900 font-medium text-right truncate max-w-[220px]">{confirmDeleteExp.partes}</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-500 font-semibold flex-shrink-0">Tribunal / Sede:</span>
                <span className="text-slate-700 text-right truncate max-w-[220px]">{confirmDeleteExp.juzgado} ({confirmDeleteExp.sede})</span>
              </div>
              {(() => {
                const dup = duplicatesAnalysis.duplicatesMap.get(confirmDeleteExp.id) ||
                  (confirmDeleteExp.numeroExpediente ? duplicatesAnalysis.duplicatesMap.get(confirmDeleteExp.numeroExpediente) : undefined);
                if (dup) {
                  return (
                    <div className="pt-2 border-t border-slate-200 text-[11px] text-rose-700 font-medium">
                      <strong>Motivo de duplicidad:</strong> {dup.reason}. Se conservará el otro expediente correspondiente.
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteExp(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const toDelete = confirmDeleteExp;
                  setConfirmDeleteExp(null);
                  await handleDeleteExpediente(toDelete);
                  setActionFeedback(`Expediente #${toDelete.numeroExpediente} eliminado correctamente.`);
                  setTimeout(() => setActionFeedback(null), 3500);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificación Toast de Éxito */}
      {actionFeedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionFeedback}</span>
        </div>
      )}
    </div>
  );
}
