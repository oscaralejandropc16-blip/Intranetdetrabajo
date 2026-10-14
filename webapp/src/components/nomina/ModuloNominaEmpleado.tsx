import { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, Download, CheckCircle2, 
  FileText, Search, RefreshCw, Sparkles 
} from 'lucide-react';
import { type ReciboNomina } from '../../types/nomina';
import { supabaseGetRecibosNomina } from '../../lib/supabaseAdapter';
import { exportarReciboNominaPDF } from '../../lib/pdfExportNomina';
import SystemAlertModal, { type AlertType } from '../common/SystemAlertModal';

export default function ModuloNominaEmpleado() {
  const currentUserName = localStorage.getItem('rd_user_name') || 'Carmen Luisa';

  const [recibos, setRecibos] = useState<ReciboNomina[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [systemAlert, setSystemAlert] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const fetchMisRecibos = async () => {
    setLoading(true);
    try {
      // Filtrar estrictamente por el nombre del usuario conectado
      const data = await supabaseGetRecibosNomina(currentUserName);
      // Solo mostrar aquellos en estado 'pagado'
      const pagados = data.filter(r => r.estado === 'pagado');
      setRecibos(pagados);
    } catch (err) {
      console.error('Error cargando recibos del empleado:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMisRecibos();
  }, [currentUserName]);

  // Recibo más reciente (última quincena pagada)
  const ultimoRecibo = useMemo(() => {
    if (recibos.length === 0) return null;
    return recibos[0];
  }, [recibos]);

  // Filtrado por buscador
  const filteredRecibos = useMemo(() => {
    return recibos.filter(r => {
      const q = searchQuery.toLowerCase();
      return r.numeroRecibo.toLowerCase().includes(q) ||
             r.periodoInicio.includes(q) ||
             r.periodoFin.includes(q) ||
             (r.mes && String(r.mes).includes(q));
    });
  }, [recibos, searchQuery]);

  // Descarga de PDF
  const handleDescargar = async (recibo: ReciboNomina) => {
    setDownloadingId(recibo.id);
    try {
      await exportarReciboNominaPDF(recibo);
    } catch (e: any) {
      setSystemAlert({
        isOpen: true,
        type: 'error',
        title: 'Error de Descarga',
        message: 'No se pudo generar el archivo PDF del recibo.'
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Encabezado */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-600/20 via-blue-600/10 to-transparent rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Portal del Trabajador • Román & Delgado
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Wallet className="w-8 h-8 text-emerald-400" /> Mis Recibos de Nómina
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
              Consulta el desglose de tus pagos quincenales, asignaciones, retenciones de ley y descarga tus comprobantes oficiales con membrete formal.
            </p>
          </div>

          <button
            onClick={fetchMisRecibos}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border border-slate-700 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </button>
        </div>
      </div>

      {/* 2. Tarjeta Destacada de Último Pago */}
      {ultimoRecibo && (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/30 text-emerald-300 rounded-full text-[11px] font-black uppercase tracking-wider mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Último Pago Acreditado
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Quincena del {ultimoRecibo.periodoInicio} al {ultimoRecibo.periodoFin}
              </h3>
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                <span>Recibo Nº {ultimoRecibo.numeroRecibo}</span>
                <span>•</span>
                <span>Acreditado vía {ultimoRecibo.tipoPago} ({ultimoRecibo.banco})</span>
                {ultimoRecibo.fechaPago && (
                  <>
                    <span>•</span>
                    <span>Fecha: {ultimoRecibo.fechaPago}</span>
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
              {/* Monto */}
              <div className="bg-slate-800/80 backdrop-blur-md px-6 py-3.5 rounded-2xl border border-slate-700/80 text-left sm:text-right w-full sm:w-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Monto Neto Acreditado</span>
                <span className="text-2xl font-black text-emerald-400 block">$ {ultimoRecibo.netoPagarUsd.toFixed(2)}</span>
                {ultimoRecibo.netoPagarVes > 0 && (
                  <span className="text-xs font-bold text-slate-300 block">Bs. {ultimoRecibo.netoPagarVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                )}
              </div>

              {/* Botón Descargar */}
              <button
                onClick={() => handleDescargar(ultimoRecibo)}
                disabled={downloadingId === ultimoRecibo.id}
                className="w-full sm:w-auto px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-2xl text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-5 h-5 text-slate-950" />
                <span>{downloadingId === ultimoRecibo.id ? 'Descargando...' : 'Descargar Recibo (PDF)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Listado Completo de Historial */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" /> Histórico de Recibos y Comprobantes
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Todos tus recibos oficiales quedan guardados y listos para descargar en cualquier momento.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por fecha, mes o recibo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {filteredRecibos.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-bold text-sm">No hay recibos de nómina emitidos aún</p>
            <p className="text-slate-400 text-xs mt-1">
              Apenas la Jefatura procese y emita tu pago quincenal, recibirás una notificación y el comprobante aparecerá disponible aquí.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecibos.map(recibo => (
              <div 
                key={recibo.id}
                className="bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 p-5 transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2.5 py-0.5 bg-slate-200 text-slate-700 rounded-md font-mono text-[10px] font-bold">
                      {recibo.numeroRecibo}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Pagado
                    </span>
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-sm">
                    Quincena {recibo.quincena} • Mes {recibo.mes}/{recibo.anio}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {recibo.periodoInicio} al {recibo.periodoFin}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Devengado</span>
                      <span className="font-bold text-emerald-600">$ {recibo.totalDevengado.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Deducciones</span>
                      <span className="font-bold text-rose-500">
                        {recibo.totalDeducciones > 0 ? `$ -${recibo.totalDeducciones.toFixed(2)}` : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-black text-slate-700">Neto Cobrado:</span>
                    <div className="text-right">
                      <span className="text-base font-black text-emerald-600 block">$ {recibo.netoPagarUsd.toFixed(2)}</span>
                      {recibo.netoPagarVes > 0 && (
                        <span className="text-[10px] font-bold text-slate-400 block">Bs. {recibo.netoPagarVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200">
                  <button
                    onClick={() => handleDescargar(recibo)}
                    disabled={downloadingId === recibo.id}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>{downloadingId === recibo.id ? 'Descargando...' : 'Descargar Recibo (PDF)'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Alerta */}
      <SystemAlertModal
        isOpen={systemAlert.isOpen}
        type={systemAlert.type}
        title={systemAlert.title}
        message={systemAlert.message}
        onClose={() => setSystemAlert(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
