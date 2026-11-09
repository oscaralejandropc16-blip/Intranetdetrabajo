import React, { useState, useMemo } from 'react';
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
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-6 space-y-6 text-white shadow-xl">
      {/* Notificación de Feedback */}
      {feedbackMensaje && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs sm:text-sm font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMensaje}</span>
          </div>
          <button onClick={() => setFeedbackMensaje(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cabecera del Panel Procesal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {control.materia || 'Control Procesal'}
            </span>
            <span className="text-xs text-slate-400">
              Iniciado el: <strong className="text-slate-200">{formatearFechaCorta(control.fechaInicioEtapa || hoyIso)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-amber-400" />
              Etapa: <span className="text-amber-400">{control.etapaActualNombre}</span>
            </h3>
            <button
              onClick={() => {
                setEtapaNombreInput(control.etapaActualNombre || '');
                setDiasHabilesInput(control.diasHabilesTotales || 15);
                setFechaInicioInput(control.fechaInicioEtapa || hoyIso);
                setNotasProcesalesInput(control.notasProcesales || '');
                setModalConfigAbierto(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Cambiar Etapa</span>
            </button>
          </div>
        </div>

        {/* Botón Acción Rápida: Hoy no hubo despacho */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleHoyNoHuboDespacho}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md ${
              sinDespachoSet.has(hoyIso)
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 ring-2 ring-amber-400/50'
                : 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-600/40 hover:border-rose-500'
            }`}
            title="Marcar o desmarcar si el tribunal tuvo despacho el día de hoy"
          >
            <CalendarX className="w-4 h-4" />
            <span>
              {sinDespachoSet.has(hoyIso) ? 'Hoy marcado: SIN DESPACHO (Quitar)' : 'Hoy no hubo despacho'}
            </span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas del Cómputo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Consumidos */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <span className="text-[11px] font-medium text-slate-400 block">Días Transcurridos</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-white">{computo.diasConsumidos}</span>
            <span className="text-xs text-slate-400">/ {computo.diasTotales} días hábiles</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{computo.porcentajeProgreso}% del lapso</span>
        </div>

        {/* Restantes */}
        <div className={`p-3 rounded-xl border ${
          computo.estado === 'vencido'
            ? 'bg-rose-950/40 border-rose-500/40'
            : computo.estado === 'urgente'
            ? 'bg-rose-950/30 border-rose-500/30'
            : computo.estado === 'alerta'
            ? 'bg-amber-950/30 border-amber-500/30'
            : 'bg-slate-950/60 border-slate-800/80'
        }`}>
          <span className="text-[11px] font-medium text-slate-400 block">Días Restantes</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl sm:text-2xl font-black ${
              computo.estado === 'vencido' || computo.estado === 'urgente'
                ? 'text-rose-400'
                : computo.estado === 'alerta'
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}>
              {computo.diasRestantes}
            </span>
            <span className="text-xs text-slate-400">días hábiles</span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider block mt-0.5">
            {computo.estado === 'vencido'
              ? '⚠️ Lapso Vencido'
              : computo.estado === 'urgente'
              ? '🔥 Lapso Urgente'
              : computo.estado === 'alerta'
              ? '⏱️ Por Vencer'
              : '✅ En Término'}
          </span>
        </div>

        {/* Días Sin Despacho */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <span className="text-[11px] font-medium text-slate-400 block">Días Sin Despacho</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-amber-400">{computo.diasSinDespachoCount}</span>
            <span className="text-xs text-slate-400">días suspendidos</span>
          </div>
          <span className="text-[10px] text-amber-400/80 mt-0.5 block">+ {computo.diasSinDespachoCount} días prorrogados</span>
        </div>

        {/* Vencimiento Estimado */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <span className="text-[11px] font-medium text-slate-400 block">Vencimiento Estimado</span>
          <div className="mt-1">
            <span className="text-base sm:text-lg font-black text-white block truncate">
              {formatearFechaCorta(computo.fechaEstimadaVencimiento || '')}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Ajustado por contingencias</span>
        </div>
      </div>

      {/* Barra de Progreso Visual */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-400 font-medium">
          <span>Progreso del Lapso Procesal</span>
          <span>{computo.diasConsumidos} de {computo.diasTotales} días de despacho consumidos</span>
        </div>
        <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              computo.estado === 'vencido' || computo.estado === 'urgente'
                ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                : computo.estado === 'alerta'
                ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
            }`}
            style={{ width: `${Math.min(100, Math.max(4, computo.porcentajeProgreso))}%` }}
          />
        </div>
      </div>

      {/* Calendario de Días de Despacho */}
      <div className="bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-slate-800">
        {/* Controles de Navegación del Calendario */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h4 className="text-base sm:text-lg font-bold text-white capitalize">
              {monthNames[month]} {year}
            </h4>
            <button
              onClick={handleIrAHoy}
              className="px-2 py-0.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Mes Actual
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Encabezados de Días de la Semana */}
        <div className="grid grid-cols-7 gap-1.5 mb-2 text-center text-xs font-bold text-slate-400">
          <span>Lun</span>
          <span>Mar</span>
          <span>Mié</span>
          <span>Jue</span>
          <span>Vie</span>
          <span className="text-slate-400">Sáb</span>
          <span className="text-slate-400">Dom</span>
        </div>

        {/* Celdas del Calendario */}
        <div className="grid grid-cols-7 gap-1.5">
          {/* Espacios vacíos antes del primer día */}
          {Array.from({ length: startingCol }).map((_, i) => (
            <div key={`empty-${i}`} className="h-14 sm:h-16 rounded-xl bg-slate-900/20 border border-slate-900/40" />
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

            let bgClass = 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300';
            if (esFDS) {
              bgClass = 'bg-slate-950/40 border-slate-900 text-slate-400 cursor-not-allowed';
            } else if (esSinDespacho) {
              bgClass = 'bg-amber-950/50 border-amber-500/60 text-amber-200 hover:bg-amber-900/60';
            } else if (esVencimiento) {
              bgClass = 'bg-rose-950/60 border-rose-500 text-rose-200 hover:bg-rose-900/60 shadow-lg shadow-rose-950/40';
            } else if (estaEnRango) {
              bgClass = 'bg-slate-900 border-slate-700 hover:border-amber-400/60 text-white';
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
                className={`h-14 sm:h-16 rounded-xl border p-1 sm:p-1.5 flex flex-col justify-between transition-all relative text-left group ${bgClass} ${
                  esHoy ? 'ring-2 ring-sky-400' : ''
                }`}
              >
                {/* Cabecera del día */}
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs sm:text-sm font-bold ${esHoy ? 'text-sky-400 font-black' : ''}`}>
                    {dayNum}
                  </span>
                  {esHoy && (
                    <span className="text-[9px] font-black uppercase px-1 rounded bg-sky-500 text-slate-950">
                      Hoy
                    </span>
                  )}
                  {esVencimiento && (
                    <span className="text-[9px] font-black uppercase px-1 rounded bg-rose-500 text-white animate-pulse">
                      Fin
                    </span>
                  )}
                  {esInicio && !esHoy && (
                    <span className="text-[9px] font-black uppercase px-1 rounded bg-amber-500 text-slate-950">
                      Inicio
                    </span>
                  )}
                </div>

                {/* Contenido / Estado del día */}
                <div className="w-full">
                  {esSinDespacho ? (
                    <span className="text-[10px] font-extrabold text-amber-400 flex items-center gap-0.5 leading-none bg-amber-950/80 px-1 py-0.5 rounded border border-amber-500/30">
                      <CalendarX className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">Sin Desp.</span>
                    </span>
                  ) : esFDS ? (
                    <span className="text-[9px] text-slate-400 block text-center">FDS</span>
                  ) : estaEnRango ? (
                    <span className="text-[9px] text-slate-400 group-hover:text-amber-400 transition-colors">
                      {currentDayIso <= hoyIso ? '✓ Despacho' : 'Hábil'}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {/* Leyenda del Calendario */}
        <div className="flex items-center gap-4 flex-wrap mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-900 border border-slate-700" />
            <span>Día de despacho hábil</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-950 border border-amber-500/60" />
            <span className="text-amber-300 font-semibold">Sin Despacho (Lapso pausado)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-950 border border-rose-500" />
            <span className="text-rose-300 font-semibold">Fecha límite proyectada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded ring-2 ring-sky-400 bg-slate-900" />
            <span className="text-sky-300">Día de hoy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-950 border border-slate-900" />
            <span>Fin de semana</span>
          </div>
        </div>
      </div>

      {/* Historial de días sin despacho registrados */}
      {(control.diasSinDespacho || []).length > 0 && (
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <CalendarX className="w-4 h-4 text-amber-400" />
            Registro de Días Sin Despacho en este Expediente ({control.diasSinDespacho?.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {control.diasSinDespacho?.map(fecha => {
              const det = control.detallesSinDespacho?.[fecha];
              return (
                <div
                  key={fecha}
                  className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-amber-300 block">
                      {formatearFechaCorta(fecha)}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate block">
                      {det?.motivo || 'Falta de despacho en tribunal'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleSinDespacho(fecha)}
                    className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 p-1 rounded transition-colors"
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
      {modalConfigAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-amber-400" />
                Configurar Etapa Procesal y Lapsos
              </h3>
              <button
                onClick={() => setModalConfigAbierto(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarConfigEtapa} className="space-y-4">
              {/* Selector de Plantilla */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  {PLANTILLAS_PROCESALES.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Selector rápido de Etapa sugerida de la plantilla */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Etapa Procesal Sugerida
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-1 bg-slate-950/80 rounded-xl border border-slate-800">
                  {PLANTILLAS_PROCESALES.find(p => p.id === plantillaSeleccionadaId)?.etapas.map(et => (
                    <button
                      key={et.id}
                      type="button"
                      onClick={() => {
                        setEtapaNombreInput(et.nombre);
                        setDiasHabilesInput(et.diasHabiles);
                      }}
                      className={`text-left p-2 rounded-lg text-xs transition-all border ${
                        etapaNombreInput === et.nombre
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                          : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <span className="block truncate">{et.nombre}</span>
                      <span className="text-[10px] text-slate-400">{et.diasHabiles} días hábiles</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre de la Etapa (Editable libremente) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nombre de la Etapa Actual
                </label>
                <input
                  type="text"
                  value={etapaNombreInput}
                  onChange={(e) => setEtapaNombreInput(e.target.value)}
                  placeholder="Ej: Lapso de Promoción de Pruebas"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Total días hábiles de despacho */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Días de Despacho (Lapso Legal)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={diasHabilesInput}
                    onChange={(e) => setDiasHabilesInput(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                    required
                  />
                </div>

                {/* Fecha de Inicio */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Fecha de Inicio del Lapso
                  </label>
                  <input
                    type="date"
                    value={fechaInicioInput}
                    onChange={(e) => setFechaInicioInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Notas u observaciones procesales */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Observaciones Procesales (Opcional)
                </label>
                <textarea
                  value={notasProcesalesInput}
                  onChange={(e) => setNotasProcesalesInput(e.target.value)}
                  placeholder="Detalles sobre el cómputo, auto de apertura o contingencias..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalConfigAbierto(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar e Iniciar Etapa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal interactivo al hacer clic en un día del calendario */}
      {diaSeleccionadoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarX className="w-5 h-5 text-amber-400" />
                Día: {formatearFechaCorta(diaSeleccionadoModal)}
              </h3>
              <button
                onClick={() => setDiaSeleccionadoModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {sinDespachoSet.has(diaSeleccionadoModal) ? (
              <div className="space-y-4">
                <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-200 text-xs">
                  <p className="font-bold">Este día está actualmente marcado como SIN DESPACHO.</p>
                  <p className="text-slate-300 mt-1">
                    Motivo registrado: {control.detallesSinDespacho?.[diaSeleccionadoModal]?.motivo || 'Falta de despacho en tribunal'}
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setDiaSeleccionadoModal(null)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => handleToggleSinDespacho(diaSeleccionadoModal)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Restablecer Despacho (Hubo Despacho)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-300">
                  ¿Deseas marcar este día como <strong>"Sin Despacho"</strong> en el <strong>{expediente.juzgado}</strong>? El lapso procesal se postergará automáticamente un día hábil.
                </p>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Selecciona o escribe el motivo:
                  </label>
                  <select
                    value={motivoSinDespacho}
                    onChange={(e) => setMotivoSinDespacho(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 mb-2"
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setDiaSeleccionadoModal(null)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleToggleSinDespacho(diaSeleccionadoModal, motivoSinDespacho)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1.5"
                  >
                    <CalendarX className="w-4 h-4" />
                    <span>Confirmar: Sin Despacho</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
