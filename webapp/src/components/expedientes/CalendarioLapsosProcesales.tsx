import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  X,
  CalendarX,
  RotateCcw
} from 'lucide-react';
import type { ExpedienteJudicial, ControlProcesalExpediente, ActuacionHistorial } from '../../types/expedientes';
import {
  PLANTILLAS_PROCESALES,
  sugerirPlantillaPorMateria,
  calcularComputoProcesal,
  aIsoFecha,
  esFinDeSemana,
  formatearFechaCorta,
  generarTextoActuacionSinDespacho,
  generarTextoCambioEtapa,
  MOTIVOS_SIN_DESPACHO_COMUNES
} from '../../lib/lapsosProcesales';

interface CalendarioLapsosProcesalesProps {
  expediente: ExpedienteJudicial;
  onUpdateExpediente: (updated: ExpedienteJudicial) => void;
  currentUser?: string;
}

export default function CalendarioLapsosProcesales({
  expediente,
  onUpdateExpediente,
  currentUser = 'Abogado'
}: CalendarioLapsosProcesalesProps) {
  const hoyIso = aIsoFecha(new Date());

  // Estado del mes visualizado en el calendario
  const [currentDate, setCurrentDate] = useState(() => {
    const startIso = expediente.controlProcesal?.fechaInicioEtapa || hoyIso;
    const parts = startIso.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, 1);
  });

  // Modal para configurar / cambiar etapa
  const [modalConfigAbierto, setModalConfigAbierto] = useState(false);
  const [plantillaSeleccionadaId, setPlantillaSeleccionadaId] = useState(() => {
    return sugerirPlantillaPorMateria(expediente.procedimiento || expediente.materia || '').id;
  });
  const [etapaNombreInput, setEtapaNombreInput] = useState(
    expediente.controlProcesal?.etapaActualNombre || 'Promoción de Pruebas'
  );
  const [diasHabilesInput, setDiasHabilesInput] = useState<number>(
    expediente.controlProcesal?.diasHabilesTotales || 15
  );
  const [fechaInicioInput, setFechaInicioInput] = useState(
    expediente.controlProcesal?.fechaInicioEtapa || hoyIso
  );
  const [notasProcesalesInput, setNotasProcesalesInput] = useState(
    expediente.controlProcesal?.notasProcesales || ''
  );

  // Modal para registrar motivo de "Sin Despacho" al hacer clic en un día
  const [diaSeleccionadoModal, setDiaSeleccionadoModal] = useState<string | null>(null);
  const [motivoSinDespacho, setMotivoSinDespacho] = useState(MOTIVOS_SIN_DESPACHO_COMUNES[0]);
  const [feedbackMensaje, setFeedbackMensaje] = useState<string | null>(null);

  const control: ControlProcesalExpediente = useMemo(() => {
    if (expediente.controlProcesal && expediente.controlProcesal.etapaActualNombre) {
      return expediente.controlProcesal;
    }
    // Plantilla por defecto sugerida según la causa
    const sugerida = sugerirPlantillaPorMateria(expediente.procedimiento || expediente.materia || '');
    const etapaInicial = sugerida.etapas[3] || sugerida.etapas[0]; // ej: Pruebas o inicial
    return {
      materia: sugerida.nombre,
      etapaActualId: etapaInicial.id,
      etapaActualNombre: etapaInicial.nombre,
      fechaInicioEtapa: hoyIso,
      diasHabilesTotales: etapaInicial.diasHabiles,
      diasSinDespacho: [],
      detallesSinDespacho: {},
      notasProcesales: 'Iniciado automáticamente por el sistema.'
    };
  }, [expediente.controlProcesal, expediente.procedimiento, expediente.materia, hoyIso]);

  const computo = useMemo(() => calcularComputoProcesal(control), [control]);

  // Manejar cambio de mes
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleIrAHoy = () => {
    const parts = hoyIso.split('-').map(Number);
    setCurrentDate(new Date(parts[0], parts[1] - 1, 1));
  };

  // Guardar configuración de etapa procesal
  const handleGuardarConfigEtapa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!etapaNombreInput.trim() || diasHabilesInput <= 0) return;

    const nuevoControl: ControlProcesalExpediente = {
      ...control,
      etapaActualNombre: etapaNombreInput.trim(),
      diasHabilesTotales: Number(diasHabilesInput),
      fechaInicioEtapa: fechaInicioInput,
      notasProcesales: notasProcesalesInput.trim()
    };

    // Crear actuación automática formal en el historial
    const nowTimeStr = new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    const textoActuacion = generarTextoCambioEtapa(
      nuevoControl.etapaActualNombre!,
      nuevoControl.diasHabilesTotales!,
      nuevoControl.fechaInicioEtapa!
    );

    const nuevaAct: ActuacionHistorial = {
      id: 'act-lapso-' + Date.now(),
      fecha: hoyIso,
      hora: nowTimeStr,
      actuacion: textoActuacion,
      estatusResultante: nuevoControl.etapaActualNombre!.toUpperCase(),
      registradoPor: currentUser,
      observaciones: notasProcesalesInput ? `Nota: ${notasProcesalesInput}` : 'Apertura de cómputo de lapso procesal'
    };

    const updated: ExpedienteJudicial = {
      ...expediente,
      controlProcesal: nuevoControl,
      ultimaActualizacion: hoyIso,
      actuaciones: [nuevaAct, ...(expediente.actuaciones || [])]
    };

    onUpdateExpediente(updated);
    setModalConfigAbierto(false);
    setFeedbackMensaje(`¡Etapa '${nuevoControl.etapaActualNombre}' iniciada con éxito!`);
    setTimeout(() => setFeedbackMensaje(null), 4000);
  };

  // Alternar día como "Sin Despacho"
  const handleToggleSinDespacho = (fechaIso: string, motivoTexto?: string) => {
    const sinDespachoSet = new Set(control.diasSinDespacho || []);
    const yaMarcado = sinDespachoSet.has(fechaIso);
    const nuevosDetalles = { ...(control.detallesSinDespacho || {}) };

    if (yaMarcado) {
      sinDespachoSet.delete(fechaIso);
      delete nuevosDetalles[fechaIso];
    } else {
      sinDespachoSet.add(fechaIso);
      nuevosDetalles[fechaIso] = {
        fecha: fechaIso,
        motivo: motivoTexto || motivoSinDespacho,
        registradoPor: currentUser,
        registradoEn: new Date().toISOString()
      };
    }

    const nuevosDias = Array.from(sinDespachoSet).sort();
    const nuevoControl: ControlProcesalExpediente = {
      ...control,
      diasSinDespacho: nuevosDias,
      detallesSinDespacho: nuevosDetalles
    };

    // Registrar actuación automática
    const nowTimeStr = new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    const textoActuacion = generarTextoActuacionSinDespacho(
      fechaIso,
      expediente.juzgado,
      motivoTexto || motivoSinDespacho,
      !yaMarcado
    );

    const nuevaAct: ActuacionHistorial = {
      id: 'act-despacho-' + Date.now(),
      fecha: hoyIso,
      hora: nowTimeStr,
      actuacion: textoActuacion,
      estatusResultante: expediente.estatusActual,
      registradoPor: currentUser,
      observaciones: yaMarcado ? 'Día rectificado en calendario' : `Motivo: ${motivoTexto || motivoSinDespacho}`
    };

    const updated: ExpedienteJudicial = {
      ...expediente,
      controlProcesal: nuevoControl,
      ultimaActualizacion: hoyIso,
      actuaciones: [nuevaAct, ...(expediente.actuaciones || [])]
    };

    onUpdateExpediente(updated);
    setDiaSeleccionadoModal(null);
    setFeedbackMensaje(
      yaMarcado
        ? `Se restableció el despacho del ${formatearFechaCorta(fechaIso)}.`
        : `Día ${formatearFechaCorta(fechaIso)} registrado como 'Sin Despacho'. Lapso extendido 1 día hábil.`
    );
    setTimeout(() => setFeedbackMensaje(null), 4000);
  };

  // Botón directo: "Hoy no hubo despacho"
  const handleHoyNoHuboDespacho = () => {
    const sinDespachoSet = new Set(control.diasSinDespacho || []);
    if (sinDespachoSet.has(hoyIso)) {
      handleToggleSinDespacho(hoyIso);
    } else {
      handleToggleSinDespacho(hoyIso, MOTIVOS_SIN_DESPACHO_COMUNES[0]);
    }
  };

  // Generación de la grilla de días del mes
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Domingo, 1 = Lunes...
  // Ajustar para que la semana empiece en Lunes (0 = Lunes, 6 = Domingo)
  const startingCol = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const sinDespachoSet = useMemo(() => new Set(control.diasSinDespacho || []), [control.diasSinDespacho]);
  const fechaInicioEtapa = control.fechaInicioEtapa || hoyIso;
  const fechaVencimiento = computo.fechaEstimadaVencimiento;

  return (
    <div className="bg-slate-50/60 rounded-2xl border border-slate-200/90 p-4 sm:p-6 space-y-6 text-slate-900 shadow-2xs">
      {/* Notificación de Feedback */}
      {feedbackMensaje && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-2xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMensaje}</span>
          </div>
          <button onClick={() => setFeedbackMensaje(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cabecera del Panel Procesal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200/80">
              {control.materia || 'Control Procesal'}
            </span>
            <span className="text-xs text-slate-500">
              Iniciado el: <strong className="text-slate-800 font-semibold">{formatearFechaCorta(control.fechaInicioEtapa || hoyIso)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              Etapa: <span className="text-blue-700">{control.etapaActualNombre}</span>
            </h3>
            <button
              onClick={() => {
                setEtapaNombreInput(control.etapaActualNombre || '');
                setDiasHabilesInput(control.diasHabilesTotales || 15);
                setFechaInicioInput(control.fechaInicioEtapa || hoyIso);
                setNotasProcesalesInput(control.notasProcesales || '');
                setModalConfigAbierto(true);
              }}
              className="px-2 py-0.5 rounded-lg bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-700 border border-slate-200 shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
            >
              <Edit3 className="w-3 h-3 text-blue-600" />
              <span>Cambiar Etapa</span>
            </button>
          </div>
        </div>

        {/* Botón Acción Rápida: Hoy no hubo despacho con soporte móvil */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={handleHoyNoHuboDespacho}
            className={`w-full md:w-auto justify-center px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${sinDespachoSet.has(hoyIso)
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
              }`}
            title="Marcar o desmarcar si el tribunal tuvo despacho el día de hoy"
          >
            <CalendarX className="w-3.5 h-3.5 shrink-0" />
            <span>
              {sinDespachoSet.has(hoyIso) ? 'Hoy: SIN DESPACHO (Restablecer)' : 'Hoy no hubo despacho'}
            </span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas del Cómputo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Consumidos */}
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Días Transcurridos</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg sm:text-xl font-bold text-slate-900">{computo.diasConsumidos}</span>
            <span className="text-xs text-slate-500 font-medium">/ {computo.diasTotales} días hábiles</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block font-medium">{computo.porcentajeProgreso}% del lapso</span>
        </div>

        {/* Restantes */}
        <div className={`p-2.5 sm:p-3 rounded-xl border shadow-2xs ${computo.estado === 'vencido' || computo.estado === 'urgente'
            ? 'bg-rose-50 border-rose-200'
            : computo.estado === 'alerta'
              ? 'bg-indigo-50 border-indigo-200'
              : 'bg-emerald-50 border-emerald-200'
          }`}>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Días Restantes</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-lg sm:text-xl font-bold ${computo.estado === 'vencido' || computo.estado === 'urgente'
                ? 'text-rose-700'
                : computo.estado === 'alerta'
                  ? 'text-indigo-700'
                  : 'text-emerald-700'
              }`}>
              {computo.diasRestantes}
            </span>
            <span className="text-xs text-slate-500 font-medium">días hábiles</span>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider block mt-0.5 ${computo.estado === 'vencido' || computo.estado === 'urgente'
              ? 'text-rose-700'
              : computo.estado === 'alerta'
                ? 'text-indigo-700'
                : 'text-emerald-700'
            }`}>
            {computo.estado === 'vencido'
              ? 'Lapso Vencido'
              : computo.estado === 'urgente'
                ? 'Lapso Urgente'
                : computo.estado === 'alerta'
                  ? 'Por Vencer'
                  : 'En Término'}
          </span>
        </div>

        {/* Días Sin Despacho */}
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Días Sin Despacho</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg sm:text-xl font-bold text-rose-600">{computo.diasSinDespachoCount}</span>
            <span className="text-xs text-slate-500 font-medium">días suspendidos</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block font-medium">+ {computo.diasSinDespachoCount} días prorrogados</span>
        </div>

        {/* Vencimiento Estimado */}
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Vencimiento Estimado</span>
          <div className="mt-0.5">
            <span className="text-sm sm:text-base font-bold text-slate-900 block truncate">
              {formatearFechaCorta(computo.fechaEstimadaVencimiento || '')}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block font-medium">Ajustado por contingencias</span>
        </div>
      </div>

      {/* Barra de Progreso Visual */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500 font-medium">
          <span>Progreso del Lapso Procesal</span>
          <span>{computo.diasConsumidos} de {computo.diasTotales} días de despacho</span>
        </div>
        <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${computo.estado === 'vencido' || computo.estado === 'urgente'
                ? 'bg-rose-500'
                : computo.estado === 'alerta'
                  ? 'bg-indigo-500'
                  : 'bg-blue-600'
              }`}
            style={{ width: `${Math.min(100, Math.max(4, computo.porcentajeProgreso))}%` }}
          />
        </div>
      </div>

      {/* Calendario de Días de Despacho */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Controles de Navegación del Calendario */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-bold text-slate-900 capitalize">
              {monthNames[month]} {year}
            </h4>
            <button
              onClick={handleIrAHoy}
              className="px-2 py-0.5 text-[11px] rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
            >
              Mes Actual
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Mes anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Mes siguiente"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Encabezados de Días de la Semana con soporte móvil */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5 text-center text-[10px] sm:text-xs font-semibold text-slate-400">
          <span>Lun</span>
          <span>Mar</span>
          <span>Mié</span>
          <span>Jue</span>
          <span>Vie</span>
          <span className="text-slate-400">Sáb</span>
          <span className="text-slate-400">Dom</span>
        </div>

        {/* Celdas del Calendario */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {/* Espacios vacíos antes del primer día */}
          {Array.from({ length: startingCol }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10 sm:h-12 rounded-xl bg-slate-50/50 border border-slate-100" />
          ))}

          {/* Días del mes */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const currentDayIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const esFDS = esFinDeSemana(currentDayIso);
            const esHoy = currentDayIso === hoyIso;
            const esInicio = currentDayIso === fechaInicioEtapa;
            const esVencimiento = currentDayIso === fechaVencimiento;
            const esSinDespacho = sinDespachoSet.has(currentDayIso);
            const estaEnRango = currentDayIso >= fechaInicioEtapa && (!fechaVencimiento || currentDayIso <= fechaVencimiento);

            let bgClass = 'bg-white border-slate-200 hover:border-blue-400 text-slate-700 hover:bg-blue-50/30';
            if (esFDS) {
              bgClass = 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed';
            } else if (esSinDespacho) {
              bgClass = 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100';
            } else if (esVencimiento) {
              bgClass = 'bg-rose-600 border-rose-600 text-white hover:bg-rose-700 shadow-sm';
            } else if (estaEnRango) {
              bgClass = 'bg-blue-50/40 border-blue-200 hover:border-blue-400 text-slate-900';
            }

            return (
              <button
                key={currentDayIso}
                type="button"
                disabled={esFDS}
                onClick={() => {
                  if (esFDS) return;
                  setDiaSeleccionadoModal(currentDayIso);
                }}
                className={`h-10 sm:h-12 rounded-xl border p-1 flex flex-col justify-between transition-all relative text-left group ${bgClass} ${esHoy ? 'ring-2 ring-blue-600' : ''
                  }`}
              >
                {/* Cabecera del día */}
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[11px] sm:text-xs font-bold leading-none ${esHoy ? 'text-blue-700 font-black' : ''}`}>
                    {dayNum}
                  </span>
                  {esHoy && (
                    <span className="text-[7px] sm:text-[8px] font-bold uppercase px-1 py-0.2 rounded bg-blue-600 text-white leading-tight">
                      Hoy
                    </span>
                  )}
                  {esVencimiento && (
                    <span className="text-[7px] sm:text-[8px] font-bold uppercase px-1 py-0.2 rounded bg-white text-rose-600 animate-pulse leading-tight">
                      Fin
                    </span>
                  )}
                  {esInicio && !esHoy && (
                    <span className="text-[7px] sm:text-[8px] font-bold uppercase px-1 py-0.2 rounded bg-slate-800 text-white leading-tight">
                      Ini
                    </span>
                  )}
                </div>

                {/* Contenido / Estado del día */}
                <div className="w-full">
                  {esSinDespacho ? (
                    <span className="text-[8px] sm:text-[9px] font-bold text-rose-700 flex items-center justify-center sm:justify-start gap-0.5 leading-none bg-rose-100 px-0.5 py-0.2 rounded border border-rose-200">
                      <CalendarX className="w-2 h-2 shrink-0" />
                      <span className="hidden sm:inline truncate">Sin Desp.</span>
                    </span>
                  ) : esFDS ? (
                    <span className="text-[7px] sm:text-[8px] text-slate-400 block text-center">FDS</span>
                  ) : estaEnRango ? (
                    <span className="text-[7px] sm:text-[8px] text-slate-400 group-hover:text-blue-700 transition-colors block truncate text-center sm:text-left">
                      {currentDayIso <= hoyIso ? 'Consumido' : 'Hábil'}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {/* Leyenda del Calendario */}
        <div className="flex items-center gap-3.5 flex-wrap mt-3 pt-2.5 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-white border border-slate-300" />
            <span>Hábil</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-50 border border-rose-300" />
            <span className="text-rose-700 font-semibold">Sin Despacho</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-600" />
            <span className="text-rose-700 font-semibold">Vencimiento</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded ring-2 ring-blue-600 bg-white" />
            <span className="text-blue-700 font-semibold">Hoy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-200" />
            <span>FDS</span>
          </div>
        </div>
      </div>

      {/* Historial de días sin despacho registrados */}
      {(control.diasSinDespacho || []).length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <CalendarX className="w-4 h-4 text-rose-600" />
            Registro de Días Sin Despacho en este Expediente ({control.diasSinDespacho?.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {control.diasSinDespacho?.map(fecha => {
              const det = control.detallesSinDespacho?.[fecha];
              return (
                <div
                  key={fecha}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-rose-700 block">
                      {formatearFechaCorta(fecha)}
                    </span>
                    <span className="text-[11px] text-slate-600 truncate block">
                      {det?.motivo || 'Falta de despacho en tribunal'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleSinDespacho(fecha)}
                    className="text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-100 p-1 rounded-lg transition-colors cursor-pointer"
                    title="Eliminar marca de no despacho"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal para configurar / cambiar etapa procesal */}
      {modalConfigAbierto && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white border border-blue-200 w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl shadow-2xl shadow-blue-950/25 overflow-hidden text-slate-900 my-auto animate-in zoom-in-95 duration-200">
            <div className="shrink-0 flex items-center justify-between bg-gradient-to-r from-[#172554] via-[#1e3a8a] to-[#1d4ed8] text-white p-4 sm:p-5 border-b border-blue-800/60">
              <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-4 h-4 text-sky-200" />
                </span>
                Configurar Etapa Procesal y Lapsos
              </h3>
              <button
                onClick={() => setModalConfigAbierto(false)}
                className="text-white bg-white/15 hover:bg-white/25 border border-white/25 p-1.5 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarConfigEtapa} className="p-4 sm:p-6 pb-0 space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* Selector de Plantilla */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Plantilla según Materia / Procedimiento
                </label>
                <select
                  value={plantillaSeleccionadaId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    setPlantillaSeleccionadaId(selId);
                    const selPlantilla = PLANTILLAS_PROCESALES.find(p => p.id === selId);
                    if (selPlantilla && selPlantilla.etapas.length > 0) {
                      setEtapaNombreInput(selPlantilla.etapas[0].nombre);
                      setDiasHabilesInput(selPlantilla.etapas[0].diasHabiles);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                >
                  {PLANTILLAS_PROCESALES.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Selector rápido de Etapa sugerida de la plantilla */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Etapa Procesal Sugerida
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200">
                  {PLANTILLAS_PROCESALES.find(p => p.id === plantillaSeleccionadaId)?.etapas.map(et => (
                    <button
                      key={et.id}
                      type="button"
                      onClick={() => {
                        setEtapaNombreInput(et.nombre);
                        setDiasHabilesInput(et.diasHabiles);
                      }}
                      className={`text-left p-2.5 rounded-xl text-xs transition-all border cursor-pointer ${etapaNombreInput === et.nombre
                          ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      <span className="block truncate font-bold">{et.nombre}</span>
                      <span className="text-[10px] text-slate-500">{et.diasHabiles} días hábiles</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre de la Etapa (Editable libremente) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nombre de la Etapa Actual
                </label>
                <input
                  type="text"
                  value={etapaNombreInput}
                  onChange={(e) => setEtapaNombreInput(e.target.value)}
                  placeholder="Ej: Lapso de Promoción de Pruebas"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Total días hábiles de despacho */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Días de Despacho (Lapso Legal)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={diasHabilesInput}
                    onChange={(e) => setDiasHabilesInput(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-bold"
                    required
                  />
                </div>

                {/* Fecha de Inicio */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Fecha de Inicio del Lapso
                  </label>
                  <input
                    type="date"
                    value={fechaInicioInput}
                    onChange={(e) => setFechaInicioInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Notas u observaciones procesales */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Observaciones Procesales (Opcional)
                </label>
                <textarea
                  value={notasProcesalesInput}
                  onChange={(e) => setNotasProcesalesInput(e.target.value)}
                  placeholder="Detalles sobre el cómputo, auto de apertura o contingencias..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3.5 bg-white/95 backdrop-blur-sm border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalConfigAbierto(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar e Iniciar Etapa</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal interactivo al hacer clic en un día del calendario */}
      {diaSeleccionadoModal && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-900/35 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 w-full max-w-md max-h-[90vh] overflow-y-auto my-auto rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarX className="w-5 h-5 text-rose-600" />
                Día: {formatearFechaCorta(diaSeleccionadoModal)}
              </h3>
              <button
                onClick={() => setDiaSeleccionadoModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {sinDespachoSet.has(diaSeleccionadoModal) ? (
              <div className="space-y-4">
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs">
                  <p className="font-bold">Este día está actualmente marcado como SIN DESPACHO.</p>
                  <p className="text-slate-700 mt-1">
                    Motivo registrado: {control.detallesSinDespacho?.[diaSeleccionadoModal]?.motivo || 'Falta de despacho en tribunal'}
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setDiaSeleccionadoModal(null)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => handleToggleSinDespacho(diaSeleccionadoModal)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Restablecer Despacho (Hubo Despacho)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  ¿Deseas marcar este día como <strong>"Sin Despacho"</strong> en el <strong>{expediente.juzgado}</strong>? El lapso procesal se postergará automáticamente un día hábil.
                </p>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Selecciona o escribe el motivo:
                  </label>
                  <select
                    value={motivoSinDespacho}
                    onChange={(e) => setMotivoSinDespacho(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 mb-2 font-medium"
                  >
                    {MOTIVOS_SIN_DESPACHO_COMUNES.map((m, idx) => (
                      <option key={idx} value={m}>{m}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={motivoSinDespacho}
                    onChange={(e) => setMotivoSinDespacho(e.target.value)}
                    placeholder="Otro motivo..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setDiaSeleccionadoModal(null)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleToggleSinDespacho(diaSeleccionadoModal, motivoSinDespacho)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <CalendarX className="w-4 h-4" />
                    <span>Confirmar: Sin Despacho</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
