import { Plus, X, FileDigit, CheckCircle2 } from 'lucide-react';
import type { Ingreso } from '../../types/libros';
import { format } from 'date-fns';
import React, { useState, useEffect, useMemo } from 'react';
import api, { submitToServer } from '../../lib/api';

interface TabLibroIngresosProps {
  ingresos: Ingreso[];
  setIngresos: React.Dispatch<React.SetStateAction<Ingreso[]>>;
  reportSubmitted: boolean;
}

const NOMENCLATURAS = [
  { tipo: 'Judicial', prefix: 'RD-J-{year}-' },
  { tipo: 'Administrativo', prefix: 'RD-AD-{year}-' },
  { tipo: 'Archivo Muerto', prefix: 'RD-AM-{year}-' },
  { tipo: 'LetsSmart', prefix: 'RD-LsS-{year}-' }
];

export default function TabLibroIngresos({
  ingresos,
  setIngresos,
  reportSubmitted
}: TabLibroIngresosProps) {


  const [globalExpedientesInfo, setGlobalExpedientesInfo] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    // Cargar correlativos usados globales
    const fetchCorrelatives = async () => {
      try {
        const [, expRes, reservedRes] = await Promise.all([
          api.get('/rd-intranet/v1/correlatives').catch(() => ({ data: [] })),
          api.get('/rd-intranet/v1/expedientes').catch(() => ({ data: [] })),
          api.get('/rd-intranet/v1/reserved-expedientes').catch(() => ({ data: [] }))
        ]);
        const closed = expRes.data && Array.isArray(expRes.data) ? expRes.data : [];
        const reserved = reservedRes.data && Array.isArray(reservedRes.data) ? reservedRes.data : [];
        setGlobalExpedientesInfo([...closed, ...reserved]);
      } catch (error) {
        console.error('Error cargando correlativos globales', error);
      }
    };
    
    fetchCorrelatives();
    
    const handleRemoteUpdate = () => fetchCorrelatives();
    window.addEventListener('rd_expedientes_updated', handleRemoteUpdate);
    
    // Polling optimizado cada 120 segundos solo si la pestaña está visible (ahorro de Egress)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchCorrelatives();
    }, 120000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('rd_expedientes_updated', handleRemoteUpdate);
    };
  }, []);

  // Cálculo inteligente del siguiente correlativo por tipo
  const getNextSequential = (tipo: string, currentList: Ingreso[]) => {
    const year = new Date().getFullYear();
    const nomenclatura = NOMENCLATURAS.find(n => n.tipo === tipo);
    const prefix = (nomenclatura?.prefix || 'RD-J-{year}-').replace('{year}', year.toString());
    
    let max = 0;

    // Buscar en ingresos locales
    currentList.forEach(i => {
      if (i.tipo === tipo && i.numeroExpediente) {
        const parts = i.numeroExpediente.split('-');
        const last = parts[parts.length - 1];
        const num = parseInt(last, 10);
        if (!isNaN(num) && num < 10000 && num > max) max = num;
      }
    });

    // Buscar en expedientes globales
    globalExpedientesInfo.forEach(g => {
      const gTipo = g.tipo || g.materia;
      const gNum = g.numeroExpediente || g.numero;
      if (gNum) {
        const matchesTipo = gTipo === tipo || 
          (tipo === 'Judicial' && gNum.startsWith(`RD-J-${year}-`)) ||
          (tipo === 'Administrativo' && gNum.startsWith(`RD-AD-${year}-`));
        if (matchesTipo) {
          const parts = gNum.split('-');
          const last = parts[parts.length - 1];
          const num = parseInt(last, 10);
          if (!isNaN(num) && num < 10000 && num > max) max = num;
        }
      }
    });

    const nextNum = (max + 1).toString().padStart(3, '0');
    return { prefix, nextNum, full: prefix + nextNum, max };
  };

  const judicialSeq = useMemo(() => getNextSequential('Judicial', ingresos), [ingresos, globalExpedientesInfo]);
  const adminSeq = useMemo(() => getNextSequential('Administrativo', ingresos), [ingresos, globalExpedientesInfo]);

  // Auto-sincronización en segundo plano hacia Supabase (Expedientes y Casos)
  useEffect(() => {
    if (reportSubmitted) return;

    const timer = setTimeout(async () => {
      const year = new Date().getFullYear();
      const validIngresosToSync = ingresos.filter(ing => {
        const num = (ing.numeroExpediente || '').trim();
        const hasNumber = num.length > `RD-X-${year}-`.length || /\d{2,}/.test(num);
        return hasNumber && (ing.partes?.trim() || ing.organismoTribunal?.trim());
      });

      if (validIngresosToSync.length === 0) return;

      try {
        const currentUserName = localStorage.getItem('rd_user_name') || 'Usuario';
        const payload = validIngresosToSync.map(ing => ({
          numeroExpediente: ing.numeroExpediente.trim(),
          partes: ing.partes?.trim() || 'Nuevo ingreso',
          organismoTribunal: ing.organismoTribunal?.trim() || '',
          tribunal: ing.organismoTribunal?.trim() || '',
          tipo: ing.tipo || 'Judicial',
          materia: ing.tipo || 'Judicial',
          resumen: ing.resumen || '',
          observaciones: ing.observaciones || '',
          usuario: currentUserName
        }));

        await submitToServer('/rd-intranet/v1/expedientes', { expedientes: payload });
        setSyncStatus('Sincronizado automáticamente con Expedientes & Casos');
        window.dispatchEvent(new CustomEvent('rd_expedientes_updated'));
        setTimeout(() => setSyncStatus(null), 3500);
      } catch (err) {
        console.warn('Error auto-sincronizando ingresos a expedientes:', err);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [ingresos, reportSubmitted]);

  const handleAddRow = () => {
    const seq = getNextSequential('Judicial', ingresos);
    const newIngreso: Ingreso = {
      id: Math.random().toString(36).substring(7),
      numeroExpediente: seq.full,
      fechaIngreso: format(new Date(), 'yyyy-MM-dd'),
      horaIngreso: format(new Date(), 'HH:mm'),
      tipo: 'Judicial',
      organismoTribunal: '',
      partes: '',
      resumen: '',
      observaciones: ''
    };
    setIngresos([...ingresos, newIngreso]);
  };

  const handleRemoveRow = (id: string) => {
    const target = ingresos.find(i => i.id === id);
    if (target?.numeroExpediente) {
      submitToServer('/rd-intranet/v1/delete-expediente', { numero: target.numeroExpediente })
        .catch(e => console.warn('Error eliminando correlativo descartado:', e));
    }
    setIngresos(ingresos.filter(i => i.id !== id));
  };

  const updateField = (id: string, field: keyof Ingreso, value: string) => {
    setIngresos(ingresos.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleTipoChange = (id: string, nuevoTipo: string) => {
    const prev = ingresos.find(i => i.id === id);
    if (prev?.numeroExpediente && (prev.partes?.trim() || prev.organismoTribunal?.trim())) {
      submitToServer('/rd-intranet/v1/delete-expediente', { numero: prev.numeroExpediente })
        .catch(e => console.warn('Error eliminando correlativo anterior:', e));
    }
    const seq = getNextSequential(nuevoTipo, ingresos.filter(i => i.id !== id));
    setIngresos(currentIngresos =>
      currentIngresos.map(ingreso =>
        ingreso.id === id
          ? { ...ingreso, tipo: nuevoTipo, numeroExpediente: seq.full }
          : ingreso
      )
    );
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <FileDigit className="w-7 h-7 text-blue-600" />
            Libro de Ingresos
          </h3>
          <p className="text-slate-500 font-medium mt-1">Registra aquí los nuevos expedientes y casos recibidos hoy.</p>
        </div>
        {!reportSubmitted && (
          <button 
            onClick={handleAddRow}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5" /> Nuevo Ingreso
          </button>
        )}
      </div>

      {/* Banner de Correlativos Oficiales en Tiempo Real */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 border border-blue-100 rounded-2xl p-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
            <FileDigit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-800">Control de Correlativos en Tiempo Real</span>
              {syncStatus && (
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-300 animate-in fade-in">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {syncStatus}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Al guardar un expediente aquí, se registra automáticamente en Expedientes & Casos y en Actuaciones Diarias.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-stretch md:self-auto">
          <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-2">
            <span className="text-slate-400 font-bold text-xs">Siguiente Judicial:</span>
            <span className="font-mono font-black text-blue-700 text-xs">
              {judicialSeq.full}
            </span>
          </div>
          <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-2">
            <span className="text-slate-400 font-bold text-xs">Siguiente Admin:</span>
            <span className="font-mono font-black text-indigo-700 text-xs">
              {adminSeq.full}
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-xs border-b border-slate-200">
            <tr>
              <th className="px-4 py-4 min-w-[150px]">Tipo de Ingreso</th>
              <th className="px-4 py-4 whitespace-nowrap min-w-[250px]">N° Expediente</th>
              <th className="px-4 py-4 whitespace-nowrap">Fecha/Hora</th>
              <th className="px-4 py-4 min-w-[180px]">Tribunal / Organismo</th>
              <th className="px-4 py-4 min-w-[200px]">Partes</th>
              <th className="px-4 py-4 min-w-[250px]">Resumen</th>
              <th className="px-4 py-4 min-w-[200px]">Observaciones</th>
              {!reportSubmitted && <th className="px-4 py-4 text-center">Acción</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ingresos.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-500 font-medium">
                  No se han registrado nuevos ingresos de expedientes hoy.
                </td>
              </tr>
            ) : (
              ingresos.map((ingreso) => (
                <tr key={ingreso.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 align-top">
                    <select
                      value={ingreso.tipo}
                      disabled={reportSubmitted}
                      onChange={(e) => handleTipoChange(ingreso.id, e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-700 bg-white font-medium cursor-pointer"
                    >
                      {NOMENCLATURAS.map(n => (
                        <option key={n.tipo} value={n.tipo}>{n.tipo}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {(() => {
                      const year = new Date().getFullYear();
                      const prefix = NOMENCLATURAS.find(n => n.tipo === ingreso.tipo)?.prefix.replace('{year}', year.toString()) || '';
                      const inputValue = ingreso.numeroExpediente.startsWith(prefix) ? ingreso.numeroExpediente.substring(prefix.length) : ingreso.numeroExpediente;
                      
                      // Check for duplicates locally and globally
                      const isLocalDuplicate = ingresos.filter(i => i.numeroExpediente === ingreso.numeroExpediente && i.id !== ingreso.id && inputValue.length > 0).length > 0;
                      
                      const currentUserName = (localStorage.getItem('rd_user_name') || '').toLowerCase().trim();
                      const duplicateInfo = globalExpedientesInfo.find(g => 
                        g.numeroExpediente === ingreso.numeroExpediente && 
                        g.usuario && 
                        g.usuario.toLowerCase().trim() !== currentUserName
                      );
                      const isGlobalDuplicate = !!duplicateInfo;
                      
                      const isDuplicate = ingreso.tipo === 'Judicial' && (isLocalDuplicate || isGlobalDuplicate);
                      const isAutoGenerated = ingreso.tipo !== 'Judicial';
                      
                      let duplicateMessage = '¡Este número ya está en la lista!';
                      if (isGlobalDuplicate && duplicateInfo?.usuario) {
                        duplicateMessage = `¡Apartado por ${duplicateInfo.usuario}!`;
                      }

                      return (
                        <>
                          <div className="flex relative">
                            <span className="bg-slate-100 text-slate-500 px-3 py-2.5 border border-r-0 border-slate-200 rounded-l-lg font-bold whitespace-nowrap select-none flex items-center justify-center">
                              {prefix}
                            </span>
                            <input 
                              type="text" 
                              value={inputValue}
                              disabled={reportSubmitted || isAutoGenerated}
                              required
                              onChange={(e) => updateField(ingreso.id, 'numeroExpediente', prefix + e.target.value)}
                              className={`w-full p-2.5 border rounded-r-lg focus:ring-2 outline-none font-bold placeholder:font-normal placeholder:text-slate-400 transition-colors ${isDuplicate ? 'border-rose-400 text-rose-600 focus:ring-rose-500/50 bg-rose-50' : isAutoGenerated ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-white border-slate-200 text-blue-700 focus:ring-blue-500/50'}`}
                              placeholder="001"
                            />
                          </div>
                          {isDuplicate ? (
                            <p className="text-[10px] text-rose-500 mt-1 font-bold">{duplicateMessage}</p>
                          ) : isAutoGenerated ? (
                            <p className="text-[10px] text-amber-600 mt-1 font-bold">Generado automáticamente</p>
                          ) : (
                            <p className="text-[10px] text-slate-400 mt-1 font-medium">Solo escribe el correlativo</p>
                          )}
                        </>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 align-top space-y-2">
                    <input 
                      type="date" 
                      value={ingreso.fechaIngreso}
                      disabled={reportSubmitted}
                      onChange={(e) => updateField(ingreso.id, 'fechaIngreso', e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-700 bg-white"
                    />
                    <input 
                      type="time" 
                      value={ingreso.horaIngreso}
                      disabled={reportSubmitted}
                      onChange={(e) => updateField(ingreso.id, 'horaIngreso', e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-700 bg-white"
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input 
                      type="text" 
                      value={ingreso.organismoTribunal || ''}
                      disabled={reportSubmitted}
                      onChange={(e) => updateField(ingreso.id, 'organismoTribunal', e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-700 bg-white placeholder:text-slate-400 font-medium"
                      placeholder="Ej: Primero Civil, Notaría 1ª..."
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <textarea 
                      value={ingreso.partes}
                      disabled={reportSubmitted}
                      onChange={(e) => updateField(ingreso.id, 'partes', e.target.value)}
                      rows={2}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-700 resize-none bg-white"
                      placeholder="Ej: Juan Pérez vs. Banco X..."
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <textarea 
                      value={ingreso.resumen}
                      disabled={reportSubmitted}
                      onChange={(e) => updateField(ingreso.id, 'resumen', e.target.value)}
                      rows={3}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-700 resize-none bg-white"
                      placeholder="Breve resumen del caso..."
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <textarea 
                      value={ingreso.observaciones}
                      disabled={reportSubmitted}
                      onChange={(e) => updateField(ingreso.id, 'observaciones', e.target.value)}
                      rows={3}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-700 resize-none bg-white"
                      placeholder="Observaciones adicionales..."
                    />
                  </td>
                  {!reportSubmitted && (
                    <td className="px-4 py-3 align-top text-center">
                      <button 
                        onClick={() => handleRemoveRow(ingreso.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100 cursor-pointer"
                        title="Eliminar registro"
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
