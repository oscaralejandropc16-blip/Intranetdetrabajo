import React, { useState, useEffect } from 'react';
import { BookOpen, Send, Search, PlusCircle, CheckCircle2, Bookmark, Award, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../lib/api';

export const TabInvestigaciones: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'explorar' | 'subir'>('explorar');
  const [investigaciones, setInvestigaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state para los 6 campos solicitados
  const [formData, setFormData] = useState({
    tema: '',
    resumen: '',
    sentencia: '',
    libros: '',
    articulos_cientificos: '',
    opinion_rd: ''
  });

  const fetchInvestigaciones = async () => {
    setLoading(true);
    try {
      const res = await api.get('/rd-intranet/v1/investigaciones');
      if (res.data && Array.isArray(res.data)) {
        setInvestigaciones(res.data);
      }
    } catch (err) {
      console.error('Error cargando investigaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestigaciones();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tema.trim() || !formData.resumen.trim()) {
      setMessage({ type: 'error', text: 'El Tema y el Resumen son campos obligatorios.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      await api.post('/rd-intranet/v1/investigaciones', formData);
      setMessage({ type: 'success', text: '¡Investigación y sentencia guardada con éxito en el Repositorio Jurídico KANT!' });
      setFormData({
        tema: '',
        resumen: '',
        sentencia: '',
        libros: '',
        articulos_cientificos: '',
        opinion_rd: ''
      });
      fetchInvestigaciones();
      setTimeout(() => {
        setActiveTab('explorar');
        setMessage(null);
      }, 2000);
    } catch (err) {
      console.error('Error guardando investigación:', err);
      setMessage({ type: 'error', text: 'Ocurrió un error al guardar. Por favor verifica tu conexión y prueba de nuevo.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInvestigaciones = investigaciones.filter(inv => {
    const q = searchTerm.toLowerCase();
    return (
      (inv.tema && inv.tema.toLowerCase().includes(q)) ||
      (inv.resumen && inv.resumen.toLowerCase().includes(q)) ||
      (inv.sentencia && inv.sentencia.toLowerCase().includes(q)) ||
      (inv.user && inv.user.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Header Glassmorphism */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-slate-800 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 backdrop-blur-md rounded-lg border border-amber-500/30 text-amber-400 text-xs font-bold tracking-wider uppercase mb-3">
              <Bookmark className="w-3.5 h-3.5" /> Doctrina & Jurisprudencia
            </div>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight flex items-center gap-3">
              <BookOpen className="w-9 h-9 text-amber-500 shrink-0" /> Repositorio Jurídico KANT
            </h2>
            <p className="text-slate-300 text-base lg:text-lg mt-2">
              Espacio oficial para que los abogados de Román & Delgado compartan investigaciones de sentencias, resúmenes, referencias bibliográficas y opinión doctrinal.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full sm:w-auto shrink-0 pt-2 xl:pt-0">
            <button
              onClick={() => setActiveTab('explorar')}
              className={`flex-1 sm:flex-none px-6 py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap shadow-sm ${
                activeTab === 'explorar'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
              }`}
            >
              <Search className="w-4 h-4 shrink-0" /> Explorar ({investigaciones.length})
            </button>
            <button
              onClick={() => setActiveTab('subir')}
              className={`flex-1 sm:flex-none px-6 py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap shadow-sm ${
                activeTab === 'subir'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
              }`}
            >
              <PlusCircle className="w-4 h-4 shrink-0" /> Subir Investigación
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-5 rounded-2xl border font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
          message.type === 'success'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
            : 'bg-rose-50 border-rose-300 text-rose-800 shadow-sm'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" /> : <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* SUBVISTA: EXPLORAR REPOSITORIO */}
      {activeTab === 'explorar' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 lg:p-10 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por tema, sentencia, autor o palabras clave..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all font-medium text-slate-800 text-sm outline-none"
              />
            </div>
            <button
              onClick={fetchInvestigaciones}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm flex items-center gap-2 transition-colors self-end sm:self-auto"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </button>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-500 font-medium">Cargando base de datos doctrinal KANT...</div>
          ) : filteredInvestigaciones.length === 0 ? (
            <div className="p-16 text-center bg-slate-50 rounded-2xl border border-slate-200">
              <BookOpen className="w-14 h-14 text-slate-300 mx-auto mb-3" />
              <p className="text-lg font-bold text-slate-700">No se encontraron investigaciones o sentencias</p>
              <p className="text-sm text-slate-400 mt-1">Sé el primero en aportar doctrina jurídica al equipo presionando "Subir Investigación".</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredInvestigaciones.map((inv) => (
                <div key={inv.id} className="bg-slate-50/70 p-6 sm:p-7 rounded-2xl border border-slate-200/80 hover:border-amber-400/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-center gap-3 mb-3">
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-black uppercase tracking-wider">
                        Investigación R&D
                      </span>
                      <span className="text-xs font-semibold text-slate-400">{inv.date}</span>
                    </div>

                    <h3 className="text-xl font-extrabold text-slate-900 leading-tight mb-2">{inv.tema || 'Sin Título'}</h3>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-4">👨‍⚖️ Por: {inv.user}</p>

                    <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/70 text-sm">
                      {inv.resumen && (
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1">📌 Resumen / Hechos:</p>
                          <p className="text-slate-600 line-clamp-3 leading-relaxed">{inv.resumen}</p>
                        </div>
                      )}
                      {inv.sentencia && (
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1 mt-3">⚖️ Sentencia / Jurisprudencia:</p>
                          <p className="text-slate-600 line-clamp-2">{inv.sentencia}</p>
                        </div>
                      )}
                      {inv.opinion_rd && (
                        <div>
                          <p className="text-xs font-black text-amber-700 uppercase tracking-wider mb-1 mt-3">💡 Opinión y Análisis R&D:</p>
                          <p className="text-slate-700 font-medium italic line-clamp-2 bg-amber-50/50 p-2 rounded-lg border border-amber-100/60">{inv.opinion_rd}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/60 flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Libros & Artículos adjuntos</span>
                    <button
                      onClick={() => alert(`📌 TEMA: ${inv.tema}\n\n👨‍⚖️ AUTOR: ${inv.user}\n\n📝 RESUMEN / HECHOS:\n${inv.resumen}\n\n⚖️ SENTENCIA:\n${inv.sentencia}\n\n📚 LIBROS:\n${inv.libros}\n\n🔬 ARTICULOS CIENTIFICOS:\n${inv.articulos_cientificos}\n\n💡 OPINION JURIDICA R&D:\n${inv.opinion_rd}`)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow transition-colors"
                    >
                      Ver Estudio Completo
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBVISTA: SUBIR NUEVA INVESTIGACIÓN */}
      {activeTab === 'subir' && (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 lg:p-10 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
              <PlusCircle className="w-7 h-7 text-amber-500" /> Registrar Nueva Investigación o Sentencia
            </h3>
            <p className="text-slate-500 font-medium mt-1 text-sm">
              Completa los 6 campos doctrinales para enriquecer el Repositorio Jurídico KANT del bufete.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* 1. TEMA */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                1. Tema de la Investigación <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="tema"
                value={formData.tema}
                onChange={handleChange}
                placeholder="Ej: Validez del pacto comisorio en contratos de garantía o responsabilidad civil extracontractual..."
                required
                className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-semibold text-slate-800 text-base shadow-sm"
              />
            </div>

            {/* 2. RESUMEN */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                2. Resumen Ejecutivo / Hechos Relevantes <span className="text-rose-500">*</span>
              </label>
              <textarea
                name="resumen"
                value={formData.resumen}
                onChange={handleChange}
                rows={4}
                placeholder="Detalla de forma sintética los hechos, el planteamiento central o el problema jurídico investigado..."
                required
                className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-medium text-slate-700 text-base shadow-sm resize-y"
              />
            </div>

            {/* 3. SENTENCIA */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                3. Sentencia / Jurisprudencia Aplicable
              </label>
              <textarea
                name="sentencia"
                value={formData.sentencia}
                onChange={handleChange}
                rows={3}
                placeholder="Ej: Sala de Casación Civil del TSJ, Sentencia N° 123 del 14/05/2024, Ponente Dr. Rodríguez. Extracto o criterio vinculante..."
                className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-medium text-slate-700 text-base shadow-sm resize-y"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 4. LIBROS */}
              <div>
                <label className="block text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                  4. Libros y Referencias Bibliográficas
                </label>
                <textarea
                  name="libros"
                  value={formData.libros}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Ej: KUMMEROW, Gert. 'Bienes y Derechos Reales'. Ed. Paredes, pág. 142..."
                  className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-medium text-slate-700 text-base shadow-sm resize-y"
                />
              </div>

              {/* 5. ARTICULOS CIENTIFICOS */}
              <div>
                <label className="block text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                  5. Artículos Científicos y Publicaciones Doctrina
                </label>
                <textarea
                  name="articulos_cientificos"
                  value={formData.articulos_cientificos}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Ej: Revista de la Facultad de Ciencias Jurídicas UCV, Vol. 45, 'El levantamiento del velo corporativo'..."
                  className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-medium text-slate-700 text-base shadow-sm resize-y"
                />
              </div>
            </div>

            {/* 6. OPINION R&D */}
            <div>
              <label className="block text-sm font-extrabold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-600" /> 6. Opinión Jurídica & Recomendación R&D
              </label>
              <textarea
                name="opinion_rd"
                value={formData.opinion_rd}
                onChange={handleChange}
                rows={4}
                placeholder="Aporta el análisis crítico de Román & Delgado: ¿Cómo aplica esta doctrina a nuestros asuntos? ¿Cuál es la estrategia o conclusión recomendada por el bufete?"
                className="w-full p-4 border-2 border-amber-300 bg-amber-50/30 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-semibold text-slate-800 text-base shadow-sm resize-y"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('explorar')}
              className="px-8 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-extrabold shadow-xl transition-all flex items-center justify-center gap-3 text-lg hover:-translate-y-0.5"
            >
              <Send className={`w-5 h-5 ${isSubmitting ? 'animate-bounce' : ''}`} />
              {isSubmitting ? 'Guardando en KANT...' : 'Publicar Investigación'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
