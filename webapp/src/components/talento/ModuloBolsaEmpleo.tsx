import { useState, useEffect, useCallback } from 'react';
import { 
  Briefcase, Search, Filter, RefreshCw, ExternalLink, 
  MessageCircle, Mail, FileText, Clock, 
  Trash2, AlertCircle, MessageSquare, Save
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface CandidatoBolsa {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  cargo: string;
  cv_url: string;
  estado: 'nuevo' | 'contactado' | 'en_revision' | 'descartado';
  notas: string | null;
  created_at: string;
}

export default function ModuloBolsaEmpleo() {
  const [candidatos, setCandidatos] = useState<CandidatoBolsa[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCargo, setFiltroCargo] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // 1. Cargar postulantes desde Supabase (Optimizada para plan gratuito)
  const fetchCandidatos = useCallback(async (isSilent = false) => {
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!isSilent) setRefreshing(true);
    
    try {
      const { data, error } = await supabase
        .from('candidatos_bolsa')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al cargar candidatos:', error);
      } else if (data) {
        setCandidatos(data as CandidatoBolsa[]);
      }
    } catch (err) {
      console.error('Fallo de red al consultar candidatos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidatos();

    // Actualización inteligente al volver a la pestaña (cumple directiva de ahorro de egress)
    const handleVisibility = () => {
      if (!document.hidden) fetchCandidatos(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchCandidatos]);

  // 2. Cambiar estado del candidato (Nuevo -> Contactado -> En Revisión -> Descartado)
  const handleCambiarEstado = async (id: number, nuevoEstado: CandidatoBolsa['estado']) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('candidatos_bolsa')
        .update({ estado: nuevoEstado })
        .eq('id', id);

      if (!error) {
        setCandidatos(prev => prev.map(c => c.id === id ? { ...c, estado: nuevoEstado } : c));
      } else {
        alert('No se pudo actualizar el estado: ' + error.message);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  // 3. Guardar notas internas de Jefatura
  const handleSaveNotes = async (id: number) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('candidatos_bolsa')
        .update({ notas: tempNotes })
        .eq('id', id);

      if (!error) {
        setCandidatos(prev => prev.map(c => c.id === id ? { ...c, notas: tempNotes } : c));
        setEditingNotesId(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  // 4. Eliminar candidato (Exclusivo Jefatura)
  const handleDeleteCandidato = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la postulación de ${nombre}? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      const { error } = await supabase
        .from('candidatos_bolsa')
        .delete()
        .eq('id', id);

      if (!error) {
        setCandidatos(prev => prev.filter(c => c.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 5. Filtrado de candidatos
  const candidatosFiltrados = candidatos.filter(c => {
    const matchesSearch = 
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.telefono.includes(searchTerm);
    
    const matchesCargo = filtroCargo === 'Todos' || c.cargo === filtroCargo;
    const matchesEstado = filtroEstado === 'Todos' || c.estado === filtroEstado;

    return matchesSearch && matchesCargo && matchesEstado;
  });

  // Métricas rápidas
  const totalPostulados = candidatos.length;
  const totalNuevos = candidatos.filter(c => c.estado === 'nuevo').length;
  const totalContactados = candidatos.filter(c => c.estado === 'contactado').length;

  const cargosDisponibles = Array.from(new Set(candidatos.map(c => c.cargo))).filter(Boolean);

  // Formato de enlace a WhatsApp
  const getWhatsAppLink = (c: CandidatoBolsa) => {
    let cleanPhone = c.telefono.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '58' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('58') && cleanPhone.length === 10) {
      cleanPhone = '58' + cleanPhone;
    }
    const mensaje = encodeURIComponent(
      `Hola ${c.nombre}, te escribimos de Román & Delgado respecto a tu postulación para el área de ${c.cargo} recibida a través de nuestra web.`
    );
    return `https://wa.me/${cleanPhone}?text=${mensaje}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER PRINCIPAL */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 lg:p-8 rounded-3xl border border-slate-700/80 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Talento Humano & Reclutamiento
            </div>
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-amber-400" />
              Bolsa de Empleo &amp; Postulaciones
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Panel exclusivo de Jefatura para revisar credenciales, contactar a postulantes vía WhatsApp o correo y gestionar su proceso de selección.
            </p>
          </div>

          <button
            onClick={() => fetchCandidatos()}
            disabled={refreshing}
            className="self-start md:self-center px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-400 hover:text-amber-300 border border-slate-600 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        {/* METRICAS RESUMEN */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-700/60">
          <div className="bg-slate-800/60 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-700/50">
            <span className="text-xs font-semibold text-slate-400 block uppercase">Total Postulados</span>
            <span className="text-2xl font-black text-white">{totalPostulados}</span>
          </div>
          <div className="bg-amber-500/10 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-amber-500/30">
            <span className="text-xs font-bold text-amber-400 block uppercase">Nuevos por Responder</span>
            <span className="text-2xl font-black text-amber-300">{totalNuevos}</span>
          </div>
          <div className="bg-emerald-500/10 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-emerald-500/30 col-span-2 sm:col-span-1">
            <span className="text-xs font-bold text-emerald-400 block uppercase">Contactados / Respondidos</span>
            <span className="text-2xl font-black text-emerald-300">{totalContactados}</span>
          </div>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, correo o teléfono..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-2.5 items-center">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={filtroCargo}
              onChange={e => setFiltroCargo(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="Todos">Todas las áreas</option>
              {cargosDisponibles.map(cargo => (
                <option key={cargo} value={cargo}>{cargo}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="Todos">Todos los estados</option>
              <option value="nuevo">🟡 Nuevos</option>
              <option value="contactado">🟢 Contactados / Respondidos</option>
              <option value="en_revision">🔵 En Entrevista / Revisión</option>
              <option value="descartado">⚪ Descartados</option>
            </select>
          </div>
        </div>
      </div>

      {/* LISTA DE CANDIDATOS */}
      {loading ? (
        <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-600 font-bold text-sm">Consultando base de postulaciones...</p>
        </div>
      ) : candidatosFiltrados.length === 0 ? (
        <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-slate-800 font-bold text-lg mb-1">No se encontraron postulantes</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            {searchTerm || filtroCargo !== 'Todos' || filtroEstado !== 'Todos'
              ? 'Intenta ajustar los filtros de búsqueda.'
              : 'Aún no hay currículums registrados a través del formulario de la web.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {candidatosFiltrados.map(c => {
            const fechaFormateada = c.created_at ? (() => {
              try {
                return format(new Date(c.created_at), "d 'de' MMMM, yyyy - hh:mm a", { locale: es });
              } catch {
                return c.created_at;
              }
            })() : 'Fecha no registrada';

            return (
              <div 
                key={c.id} 
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 ${
                  c.estado === 'nuevo' 
                    ? 'border-amber-400/80 bg-gradient-to-r from-amber-50/40 via-white to-white' 
                    : 'border-slate-200/90'
                }`}
              >
                {/* DATOS DEL CANDIDATO */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-900 text-amber-400 font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                    {c.nombre.substring(0, 2).toUpperCase()}
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-base leading-tight truncate">
                        {c.nombre}
                      </h4>

                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
                        {c.cargo}
                      </span>

                      {/* BADGE DE ESTADO */}
                      {c.estado === 'nuevo' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-sm animate-pulse">
                          🟡 Nuevo
                        </span>
                      )}
                      {c.estado === 'contactado' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          🟢 Respondido / Contactado
                        </span>
                      )}
                      {c.estado === 'en_revision' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-300">
                          🔵 En Entrevista
                        </span>
                      )}
                      {c.estado === 'descartado' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-300">
                          ⚪ Descartado
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span><strong>Correo:</strong> {c.email}</span>
                      <span><strong>Teléfono:</strong> {c.telefono}</span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        {fechaFormateada}
                      </span>
                    </div>

                    {/* NOTAS INTERNAS DE JEFATURA */}
                    {editingNotesId === c.id ? (
                      <div className="mt-2 flex gap-2 max-w-lg">
                        <input
                          type="text"
                          value={tempNotes}
                          onChange={e => setTempNotes(e.target.value)}
                          placeholder="Añadir nota interna (ej. 'Llamar el viernes')..."
                          className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-amber-300 rounded-lg outline-none focus:bg-white"
                        />
                        <button
                          onClick={() => handleSaveNotes(c.id)}
                          disabled={updatingId === c.id}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1 shadow-sm cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" /> Guardar
                        </button>
                        <button
                          onClick={() => setEditingNotesId(null)}
                          className="px-2 py-1.5 text-slate-500 hover:text-slate-800 text-xs cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-2">
                        {c.notas ? (
                          <p className="text-xs text-amber-900 bg-amber-50/80 border border-amber-200/80 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5">
                            <MessageSquare className="w-3 h-3 text-amber-600 shrink-0" />
                            <span><strong>Nota Jefatura:</strong> {c.notas}</span>
                          </p>
                        ) : null}
                        <button
                          onClick={() => {
                            setEditingNotesId(c.id);
                            setTempNotes(c.notas || '');
                          }}
                          className="text-[11px] text-slate-400 hover:text-amber-600 underline font-medium cursor-pointer"
                        >
                          {c.notas ? 'Editar nota' : '+ Añadir nota interna'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* ACCIONES DIRECTAS: WHATSAPP, CORREO, CV Y CAMBIO DE ESTADO */}
                <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                  
                  {/* BOTÓN WHATSAPP */}
                  <a
                    href={getWhatsAppLink(c)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      if (c.estado === 'nuevo') handleCambiarEstado(c.id, 'contactado');
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                    title="Escribir directo por WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>

                  {/* BOTÓN CORREO */}
                  <a
                    href={`mailto:${c.email}?subject=${encodeURIComponent(`Postulación Román & Delgado - ${c.cargo}`)}`}
                    onClick={() => {
                      if (c.estado === 'nuevo') handleCambiarEstado(c.id, 'contactado');
                    }}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                    title="Enviar correo"
                  >
                    <Mail className="w-4 h-4 text-slate-500" />
                    <span>Correo</span>
                  </a>

                  {/* BOTÓN VER / DESCARGAR CV */}
                  <a
                    href={c.cv_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    title="Abrir Currículum Vitae adjunto"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Ver CV</span>
                    <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                  </a>

                  {/* CAMBIAR ESTADO RÁPIDO */}
                  <select
                    value={c.estado}
                    onChange={e => handleCambiarEstado(c.id, e.target.value as CandidatoBolsa['estado'])}
                    disabled={updatingId === c.id}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 rounded-xl px-2.5 py-2 outline-none cursor-pointer"
                  >
                    <option value="nuevo">🟡 Pendiente</option>
                    <option value="contactado">🟢 Contactado</option>
                    <option value="en_revision">🔵 En Entrevista</option>
                    <option value="descartado">⚪ Descartado</option>
                  </select>

                  {/* ELIMINAR */}
                  <button
                    onClick={() => handleDeleteCandidato(c.id, c.nombre)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                    title="Eliminar postulación"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
