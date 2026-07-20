import { Plus, X, FileDigit } from 'lucide-react';
import type { Ingreso } from '../../types/libros';
import { format } from 'date-fns';
import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

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

  const [globalCorrelatives, setGlobalCorrelatives] = useState<Record<string, string[]>>({});

  useEffect(() => {
    // Cargar correlativos usados globales
    const fetchCorrelatives = async () => {
      try {
        const response = await api.get('/rd-intranet/v1/correlatives');
        if (response.data) {
          setGlobalCorrelatives(response.data);
        }
      } catch (error) {
        console.error('Error cargando correlativos globales', error);
      }
    };
    fetchCorrelatives();
  }, []);

  const handleAddRow = () => {
    const year = new Date().getFullYear();
    const newIngreso: Ingreso = {
      id: Math.random().toString(36).substring(7),
      numeroExpediente: `RD-J-${year}-`,
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
    setIngresos(ingresos.filter(i => i.id !== id));
  };

  const updateField = (id: string, field: keyof Ingreso, value: string) => {
    setIngresos(ingresos.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleTipoChange = (id: string, nuevoTipo: string) => {
    const year = new Date().getFullYear();
    const nomenclatura = NOMENCLATURAS.find(n => n.tipo === nuevoTipo);
    
    setIngresos(currentIngresos => {
      // Find the specific record
      const record = currentIngresos.find(i => i.id === id);
      if (!record || !nomenclatura) return currentIngresos;

      const expectedPrefix = nomenclatura.prefix.replace('{year}', year.toString());
      let finalExpediente = expectedPrefix;

      if (nuevoTipo !== 'Judicial') {
        // Auto-generate for non-Judicial combining local and global state
        const sameTypeLocal = currentIngresos.filter(i => i.tipo === nuevoTipo && i.id !== id);
        let max = 0;
        
        // Check local
        sameTypeLocal.forEach(i => {
          const parts = i.numeroExpediente.split('-');
          const num = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(num) && num > max) max = num;
        });

        // Check global
        const sameTypeGlobal = globalCorrelatives[nuevoTipo] || [];
        sameTypeGlobal.forEach(numero => {
          const parts = numero.split('-');
          const num = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(num) && num > max) max = num;
        });

        const nextNum = (max + 1).toString().padStart(3, '0');
        finalExpediente = expectedPrefix + nextNum;
      } else {
        // Keep existing sequential for Judicial if it exists
        const parts = record.numeroExpediente.split('-');
        const lastPart = parts[parts.length - 1];
        const hasSequential = lastPart && !isNaN(Number(lastPart));
        finalExpediente = expectedPrefix + (hasSequential ? lastPart : '');
      }

      return currentIngresos.map(ingreso => 
        ingreso.id === id 
          ? { ...ingreso, tipo: nuevoTipo, numeroExpediente: finalExpediente }
          : ingreso
      );
    });
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
                      const globalList = globalCorrelatives[ingreso.tipo] || [];
                      const isGlobalDuplicate = globalList.includes(inputValue);
                      const isDuplicate = ingreso.tipo === 'Judicial' && (isLocalDuplicate || isGlobalDuplicate);
                      const isAutoGenerated = ingreso.tipo !== 'Judicial';

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
                            <p className="text-[10px] text-rose-500 mt-1 font-bold">¡Este número ya está en la lista!</p>
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
