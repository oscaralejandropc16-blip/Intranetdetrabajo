import React, { useState, useMemo } from 'react';
import { 
  Sparkles, Plus, Video, Image as ImageIcon, Layers,
  ExternalLink, CheckCircle2, Clock, Trash2, Edit3, 
  Copy, Check, Share2, MessageSquare, Folder, ArrowUpRight
} from 'lucide-react';
import type { Actuacion } from '../../types/libros';

interface EstudioMarketingGrillaProps {
  actuaciones: Actuacion[];
  setActuaciones: React.Dispatch<React.SetStateAction<Actuacion[]>>;
  reportSubmitted: boolean;
}

// Estructura interna de un contenido de marketing
export interface MarketingPost {
  id: string;
  hora: string;
  canal: 'Instagram' | 'Instagram Stories' | 'TikTok' | 'LinkedIn' | 'Facebook' | 'Web Blog';
  formato: 'Reel' | 'Carrusel' | 'Post Estático' | 'Historia' | 'Flyer / Evento' | 'Guion / Video Largo';
  pilar: 'Tips Legales' | 'Casos de Éxito & Autoridad' | 'Marca Socios (Víctor & Luis)' | 'Servicios del Despacho' | 'Actualidad & Gacetas';
  hook: string;
  copy: string;
  driveUrl: string;
  estado: 'Borrador' | 'En Revisión Jefatura' | 'Aprobado para Publicar' | 'Publicado' | 'Requiere Ajustes';
  feedbackJefatura?: string;
  fechaProgramada?: string;
}

// Hashtags oficiales sugeridos para Román & Delgado
const HASHTAGS_SUGERIDOS = [
  '#RomanyDelgado',
  '#AbogadosValencia',
  '#DerechoVenezolano',
  '#AsesoriaLegal',
  '#DerechoInmobiliario',
  '#TribunalesCarabobo',
  '#AbogadosVenezuela',
  '#DerechoLaboral',
  '#ConsultoriaJuridica',
  '#ValenciaVenezuela'
];

// Call To Action (CTA) sugeridos para copies de Instagram
const CTAS_SUGERIDOS = [
  '¿Tienes un caso similar? Escríbenos al enlace de nuestro perfil para una asesoría jurídica personalizada.',
  'Guarda este post para consultarlo cuando lo necesites y compártelo con alguien que deba saberlo.',
  'Comenta "CONSULTA" y nuestro equipo de abogados se comunicará contigo de inmediato.',
  'Agenda tu cita en nuestro despacho en Valencia a través del enlace de la biografía.'
];

export default function EstudioMarketingGrilla({
  actuaciones,
  setActuaciones,
  reportSubmitted
}: EstudioMarketingGrillaProps) {

  // Modal de Creación / Edición
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filtroCanal, setFiltroCanal] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  // Formulario del contenido
  const [formData, setFormData] = useState<MarketingPost>({
    id: '',
    hora: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false }),
    canal: 'Instagram',
    formato: 'Reel',
    pilar: 'Tips Legales',
    hook: '',
    copy: '',
    driveUrl: '',
    estado: 'En Revisión Jefatura',
    feedbackJefatura: '',
    fechaProgramada: new Date().toISOString().split('T')[0]
  });

  // Convertir las actuaciones de la bitácora al modelo estructurado de Marketing
  const posts: MarketingPost[] = useMemo(() => {
    return actuaciones.map(act => {
      // Intentar recuperar datos estructurados si existen en el objeto
      const anyAct = act as any;
      if (anyAct.marketingData) {
        return anyAct.marketingData;
      }

      // Parsear desde campos estándar
      const canalMatch = act.numeroAsunto.match(/\[(.*?)\]/);
      const canalParsed = (canalMatch ? canalMatch[1] : 'Instagram') as any;
      
      let formato: any = 'Reel';
      if (act.numeroAsunto.toLowerCase().includes('carrusel') || act.partes?.toLowerCase().includes('carrusel')) formato = 'Carrusel';
      else if (act.numeroAsunto.toLowerCase().includes('historia')) formato = 'Historia';
      else if (act.numeroAsunto.toLowerCase().includes('post') || act.numeroAsunto.toLowerCase().includes('estático')) formato = 'Post Estático';

      // Extraer enlace de drive de partes o actuación
      let driveUrl = '';
      const driveRegex = /(https?:\/\/[^\s]+(?:drive\.google|canva|dropbox|figma)[^\s]*)/i;
      const matchPartes = (act.partes || '').match(driveRegex);
      const matchAct = (act.actuacion || '').match(driveRegex);
      if (matchPartes) driveUrl = matchPartes[1];
      else if (matchAct) driveUrl = matchAct[1];

      // Hook
      const hookParsed = act.numeroAsunto.replace(/\[.*?\]\s*/g, '').replace(/^(Reel|Carrusel|Post|Historia)\s*[-•:]\s*/i, '').trim();

      return {
        id: act.id,
        hora: act.hora || '09:00',
        canal: canalParsed.includes('TikTok') ? 'TikTok' : canalParsed.includes('LinkedIn') ? 'LinkedIn' : canalParsed.includes('Story') ? 'Instagram Stories' : 'Instagram',
        formato,
        pilar: 'Tips Legales',
        hook: hookParsed || act.numeroAsunto || 'Contenido de Redes Sociales',
        copy: act.actuacion || '',
        driveUrl,
        estado: (act.estado === 'Completada' ? 'Aprobado para Publicar' : act.estado === 'En trámite' ? 'En Revisión Jefatura' : 'Borrador') as any,
        feedbackJefatura: act.observaciones || ''
      };
    });
  }, [actuaciones]);

  // Contadores KPIs
  const stats = useMemo(() => {
    return {
      total: posts.length,
      enRevision: posts.filter(p => p.estado === 'En Revisión Jefatura').length,
      aprobados: posts.filter(p => p.estado === 'Aprobado para Publicar').length,
      publicados: posts.filter(p => p.estado === 'Publicado').length,
      conDrive: posts.filter(p => !!p.driveUrl).length
    };
  }, [posts]);

  // Filtrado de la grilla
  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      if (filtroCanal !== 'todos' && !p.canal.toLowerCase().includes(filtroCanal.toLowerCase())) return false;
      if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false;
      return true;
    });
  }, [posts, filtroCanal, filtroEstado]);

  // Abrir modal para crear nuevo
  const handleOpenNuevo = () => {
    setEditingId(null);
    setFormData({
      id: `mkt_${Date.now()}`,
      hora: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false }),
      canal: 'Instagram',
      formato: 'Reel',
      pilar: 'Tips Legales',
      hook: '',
      copy: '',
      driveUrl: '',
      estado: 'En Revisión Jefatura',
      feedbackJefatura: '',
      fechaProgramada: new Date().toISOString().split('T')[0]
    });
    setModalOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEditar = (p: MarketingPost) => {
    setEditingId(p.id);
    setFormData({ ...p });
    setModalOpen(true);
  };

  // Guardar contenido (mapea directamente al array de actuaciones para persistir automáticamente en Supabase)
  const handleGuardarContenido = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hook.trim()) return;

    // Crear la representación en Actuacion oficial para compatibilidad con la base de datos y PDF
    const cleanDrive = formData.driveUrl.trim();
    const formattedAsunto = `[${formData.canal}] ${formData.formato} • ${formData.hook}`;
    const formattedPartes = `Pilar: ${formData.pilar}${cleanDrive ? ` | Drive: ${cleanDrive}` : ''}`;
    const cleanCopy = formData.copy.trim();

    // Guardar también el objeto enriquecido
    const enrichedActuacion: any = {
      id: editingId || formData.id || `mkt_${Date.now()}`,
      hora: formData.hora,
      numeroAsunto: formattedAsunto,
      partes: formattedPartes,
      actuacion: cleanCopy,
      estado: formData.estado === 'Aprobado para Publicar' ? 'Completada' : formData.estado === 'Publicado' ? 'Completada' : 'En trámite',
      observaciones: formData.feedbackJefatura || '',
      marketingData: { ...formData, id: editingId || formData.id || `mkt_${Date.now()}` }
    };

    if (editingId) {
      setActuaciones(prev => prev.map(a => a.id === editingId ? enrichedActuacion : a));
    } else {
      setActuaciones(prev => [...prev, enrichedActuacion]);
    }

    setModalOpen(false);
  };

  // Eliminar contenido
  const handleEliminarPost = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este contenido de la grilla?')) {
      setActuaciones(prev => prev.filter(a => a.id !== id));
    }
  };

  // Cambiar estado rápido
  const handleCambiarEstadoRapido = (post: MarketingPost, nuevoEstado: MarketingPost['estado']) => {
    const updatedPost = { ...post, estado: nuevoEstado };
    const enrichedActuacion: any = {
      id: post.id,
      hora: post.hora,
      numeroAsunto: `[${post.canal}] ${post.formato} • ${post.hook}`,
      partes: `Pilar: ${post.pilar}${post.driveUrl ? ` | Drive: ${post.driveUrl}` : ''}`,
      actuacion: post.copy,
      estado: nuevoEstado === 'Aprobado para Publicar' || nuevoEstado === 'Publicado' ? 'Completada' : 'En trámite',
      observaciones: post.feedbackJefatura || '',
      marketingData: updatedPost
    };
    setActuaciones(prev => prev.map(a => a.id === post.id ? enrichedActuacion : a));
  };

  // Copiar copy al portapapeles
  const handleCopiarCopy = (post: MarketingPost) => {
    const textToCopy = `${post.hook}\n\n${post.copy}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Insertar hashtag en el textarea
  const handleInsertHashtag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      copy: prev.copy ? `${prev.copy.trim()} ${tag}` : tag
    }));
  };

  // Insertar CTA en el textarea
  const handleInsertCTA = (cta: string) => {
    setFormData(prev => ({
      ...prev,
      copy: prev.copy ? `${prev.copy.trim()}\n\n👉 ${cta}` : `👉 ${cta}`
    }));
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HERO HEADER: ESTUDIO DE MARKETING & REDES SOCIALES */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-500/20 relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white rounded-full text-xs font-black tracking-wide shadow-sm">
                <Sparkles className="w-3.5 h-3.5" /> ESTUDIO DE MARKETING & SOCIAL MEDIA
              </span>
              <span className="text-xs text-indigo-200 font-bold bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
                Román & Delgado Abogados
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Grilla de Contenido & Redes Sociales
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              Espacio oficial para redactar los copies de Instagram, organizar los guiones de reels, carruseles, registrar carpetas de Google Drive y recibir feedback de la Jefatura (Víctor Román & Luis Delgado).
            </p>
          </div>

          {/* Botón Principal de Creación */}
          {!reportSubmitted && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleOpenNuevo}
                className="px-6 py-3.5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:via-purple-500 hover:to-indigo-500 text-white font-black rounded-2xl shadow-lg shadow-purple-500/25 transition-all transform active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer text-sm"
              >
                <Plus className="w-5 h-5" />
                <span>+ Nuevo Contenido / Post</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. ACCESOS RÁPIDOS Y RECURSOS DE MARCA */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Canales Oficiales:</span>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 text-pink-300 border border-pink-500/30 rounded-xl text-xs font-bold transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>@romanydelgado_abogados</span>
              <ArrowUpRight className="w-3 h-3 text-pink-400" />
            </a>
            <a
              href="https://drive.google.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all"
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Google Drive (Artes & Videos)</span>
              <ArrowUpRight className="w-3 h-3 text-amber-400" />
            </a>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>Paleta de Marca:</span>
            <span className="w-4 h-4 rounded-full bg-slate-900 border border-white/30" title="Azul Profundo #0f172a" />
            <span className="w-4 h-4 rounded-full bg-amber-500 border border-white/30" title="Dorado KANT #f59e0b" />
            <span className="w-4 h-4 rounded-full bg-blue-600 border border-white/30" title="Azul Legal #2563eb" />
          </div>
        </div>
      </div>

      {/* 3. KPIS & METRICAS DE LA GRILLA */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Contenidos</div>
          <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>{stats.total}</span>
            <span className="text-xs text-slate-400 font-bold">posts</span>
          </div>
        </div>

        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 shadow-xs">
          <div className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> En Revisión Jefatura
          </div>
          <div className="text-2xl font-black text-amber-900">
            {stats.enRevision}
          </div>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Aprobados / Listos
          </div>
          <div className="text-2xl font-black text-emerald-900">
            {stats.aprobados}
          </div>
        </div>

        <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 shadow-xs">
          <div className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Folder className="w-3.5 h-3.5 text-blue-600" /> Con Drive Vinculado
          </div>
          <div className="text-2xl font-black text-blue-900">
            {stats.conDrive}
          </div>
        </div>
      </div>

      {/* 4. FILTROS RÁPIDOS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 p-2 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 px-2">Canal:</span>
          {['todos', 'Instagram', 'TikTok', 'LinkedIn'].map((canal) => (
            <button
              key={canal}
              type="button"
              onClick={() => setFiltroCanal(canal)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                filtroCanal === canal
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {canal === 'todos' ? 'Todos los Canales' : canal}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 px-2">Estado:</span>
          {['todos', 'En Revisión Jefatura', 'Aprobado para Publicar', 'Publicado'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFiltroEstado(st)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                filtroEstado === st
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'todos' ? 'Todos los Estados' : st}
            </button>
          ))}
        </div>
      </div>

      {/* 5. LISTADO DE CONTENIDOS EN FORMATO CARDS VISUALES */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-800">No hay publicaciones en la grilla para este filtro</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Comienza agregando tu primer reel, carrusel o post para revisión de la jefatura haciendo clic en el botón superior.
            </p>
            {!reportSubmitted && (
              <button
                type="button"
                onClick={handleOpenNuevo}
                className="mt-4 px-5 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 cursor-pointer"
              >
                + Crear Primer Contenido
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPosts.map((post) => {
              const isAprobado = post.estado === 'Aprobado para Publicar';
              const isRevision = post.estado === 'En Revisión Jefatura';
              const isPublicado = post.estado === 'Publicado';

              return (
                <div 
                  key={post.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-purple-300 transition-all shadow-xs hover:shadow-md flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Canal Badge */}
                        <span className="px-2.5 py-1 bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-purple-700 border border-purple-200/60 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Share2 className="w-3 h-3" /> {post.canal}
                        </span>

                        {/* Formato Badge */}
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1">
                          {post.formato === 'Reel' ? <Video className="w-3 h-3 text-purple-600" /> :
                           post.formato === 'Carrusel' ? <Layers className="w-3 h-3 text-blue-600" /> :
                           <ImageIcon className="w-3 h-3 text-emerald-600" />}
                          {post.formato}
                        </span>

                        {/* Hora */}
                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {post.hora}
                        </span>
                      </div>

                      {/* Estado Badge */}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 shrink-0 ${
                        isAprobado 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs' 
                          : isRevision 
                          ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse' 
                          : isPublicado 
                          ? 'bg-blue-50 text-blue-700 border-blue-300' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {isAprobado ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3" />}
                        {post.estado}
                      </span>
                    </div>

                    {/* Titular Gancho (Hook) */}
                    <h4 className="text-base font-black text-slate-900 group-hover:text-purple-700 transition-colors mb-2 leading-snug">
                      {post.hook}
                    </h4>

                    {/* Pilar de Contenido */}
                    <div className="text-[11px] font-bold text-slate-500 mb-3 flex items-center gap-1">
                      <span className="text-slate-400">Pilar:</span>
                      <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-bold">
                        {post.pilar}
                      </span>
                    </div>

                    {/* Copywriting Preview */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70 text-xs text-slate-700 font-normal leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto mb-3 font-sans">
                      {post.copy || <span className="text-slate-400 italic">Sin texto de copy registrado aún...</span>}
                    </div>

                    {/* Feedback de Jefatura (Víctor Román / Luis Delgado) */}
                    {post.feedbackJefatura && (
                      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 text-xs mb-3 flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-extrabold text-amber-900 text-[11px]">Feedback de Jefatura:</div>
                          <div className="text-amber-800 font-medium text-xs mt-0.5">{post.feedbackJefatura}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acciones & Enlaces al Pie de la Tarjeta */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* Botón Enlace a Drive */}
                      {post.driveUrl ? (
                        <a
                          href={post.driveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="Abrir carpeta de Google Drive / Canva con el arte o video"
                        >
                          <Folder className="w-3.5 h-3.5 text-blue-600" />
                          <span>Ver en Drive</span>
                          <ExternalLink className="w-3 h-3 text-blue-500" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Sin enlace de Drive</span>
                      )}

                      {/* Botón Copiar Texto para Instagram */}
                      <button
                        type="button"
                        onClick={() => handleCopiarCopy(post)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Copiar titular y copy para pegar en Instagram o publicar"
                      >
                        {copiedId === post.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copiar Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {!reportSubmitted && (
                      <div className="flex items-center gap-1">
                        {/* Marcar Aprobado / Publicado */}
                        {post.estado !== 'Publicado' && (
                          <button
                            type="button"
                            onClick={() => handleCambiarEstadoRapido(post, isAprobado ? 'Publicado' : 'Aprobado para Publicar')}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              isAprobado 
                                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                            title={isAprobado ? 'Marcar como publicado en redes' : 'Marcar como aprobado por Jefatura'}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isAprobado ? 'Publicado' : 'Aprobar'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEditar(post)}
                          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-xl transition-colors cursor-pointer"
                          title="Editar contenido"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEliminarPost(post.id)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                          title="Eliminar contenido de la grilla"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. MODAL PROFESIONAL DE CREACIÓN / EDICIÓN DE CONTENIDO */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {editingId ? 'Editar Contenido de Redes' : 'Nuevo Contenido para Instagram / Redes'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Diseña el gancho, el copy y añade el enlace de Drive para aprobación de Jefatura.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarContenido} className="space-y-4">
              
              {/* Canal y Formato */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Canal / Red Social *
                  </label>
                  <select
                    value={formData.canal}
                    onChange={(e) => setFormData({ ...formData, canal: e.target.value as any })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="Instagram">Instagram (Feed / Reel)</option>
                    <option value="Instagram Stories">Instagram Stories</option>
                    <option value="TikTok">TikTok</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Web Blog">Web & Blog Despacho</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Formato del Contenido *
                  </label>
                  <select
                    value={formData.formato}
                    onChange={(e) => setFormData({ ...formData, formato: e.target.value as any })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="Reel">🎬 Reel / Video Corto</option>
                    <option value="Carrusel">📚 Carrusel Educativo (Varias Slides)</option>
                    <option value="Post Estático">🖼️ Post Estático / Infografía</option>
                    <option value="Historia">⚡ Historia Interactiva</option>
                    <option value="Flyer / Evento">📣 Flyer de Evento / Noticia</option>
                    <option value="Guion / Video Largo">🎙️ Guion Video Largo / YouTube</option>
                  </select>
                </div>
              </div>

              {/* Pilar y Hora */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Pilar de Contenido *
                  </label>
                  <select
                    value={formData.pilar}
                    onChange={(e) => setFormData({ ...formData, pilar: e.target.value as any })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="Tips Legales">⚖️ Tips Legales & Qué hacer si...</option>
                    <option value="Casos de Éxito & Autoridad">🏛️ Casos de Éxito & Autoridad</option>
                    <option value="Marca Socios (Víctor & Luis)">👔 Marca Socios (Víctor Román & Luis Delgado)</option>
                    <option value="Servicios del Despacho">💼 Servicios del Despacho & Consultas</option>
                    <option value="Actualidad & Gacetas">📰 Actualidad Jurídica & Gacetas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Hora Sugerida de Publicación
                  </label>
                  <input
                    type="time"
                    value={formData.hora}
                    onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
              </div>

              {/* Título Gancho (Hook) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Título Gancho (Hook) *
                  <span className="text-[11px] font-medium text-slate-400 block normal-case">
                    El titular que detiene el scroll en Instagram en los primeros 3 segundos.
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.hook}
                  onChange={(e) => setFormData({ ...formData, hook: e.target.value })}
                  placeholder="Ej: 3 cosas que NUNCA debes firmar sin la presencia de un abogado..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                />
              </div>

              {/* Copywriting Completo */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Copywriting del Post (Texto Completo) *
                  </label>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {formData.copy.length} caracteres
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={formData.copy}
                  onChange={(e) => setFormData({ ...formData, copy: e.target.value })}
                  placeholder="Escribe el cuerpo del copy aquí, desarrollando la idea, el contexto legal, los puntos clave y los llamados a la acción..."
                  className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-normal text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 leading-relaxed font-sans"
                />

                {/* Accesos Rápidos de Copywriting: CTAs y Hashtags */}
                <div className="mt-2 space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      + Insertar Llamado a la Acción (CTA) en 1 Clic:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {CTAS_SUGERIDOS.map((cta, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleInsertCTA(cta)}
                          className="px-2 py-1 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 hover:border-purple-300 rounded-lg text-[10px] font-medium transition-all text-left"
                        >
                          👉 {cta.slice(0, 48)}...
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      + Hashtags Sugeridos del Despacho:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {HASHTAGS_SUGERIDOS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleInsertHashtag(tag)}
                          className="px-2 py-0.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200/60 rounded-md text-[10px] font-bold transition-all"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Enlace de Google Drive / Canva */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Enlace a Google Drive / Canva / Carpeta del Video o Arte
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={formData.driveUrl}
                      onChange={(e) => setFormData({ ...formData, driveUrl: e.target.value })}
                      placeholder="https://drive.google.com/drive/folders/... o Canva"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                    <Folder className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                  {formData.driveUrl && (
                    <a
                      href={formData.driveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Probar
                    </a>
                  )}
                </div>
              </div>

              {/* Estado y Feedback de Jefatura */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Estado de Aprobación
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="En Revisión Jefatura">🟡 En Revisión por Jefatura</option>
                    <option value="Aprobado para Publicar">🟢 Aprobado por Jefatura (Listo)</option>
                    <option value="Publicado">🔵 Publicado en Instagram / Redes</option>
                    <option value="Borrador">⚪ Borrador en Redacción</option>
                    <option value="Requiere Ajustes">🔴 Requiere Ajustes / Corrección</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Feedback / Observaciones de Jefatura
                  </label>
                  <input
                    type="text"
                    value={formData.feedbackJefatura}
                    onChange={(e) => setFormData({ ...formData, feedbackJefatura: e.target.value })}
                    placeholder="Comentarios de Víctor Román o Luis Delgado..."
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
              </div>

              {/* Botones del Modal */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-xl font-black text-xs shadow-md shadow-purple-500/20 cursor-pointer transition-all active:scale-95"
                >
                  {editingId ? 'Guardar Cambios' : 'Agregar a la Grilla'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
