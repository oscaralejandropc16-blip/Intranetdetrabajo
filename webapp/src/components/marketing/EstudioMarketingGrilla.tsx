import React, { useState, useMemo } from 'react';
import { 
  Sparkles, Plus, Video, Image as ImageIcon, Layers,
  ExternalLink, CheckCircle2, Clock, Trash2, Edit3, 
  Copy, Check, Share2, MessageSquare, Folder, ArrowUpRight,
  Heart, Bookmark, Send, Scale, FileText, X, Smartphone
} from 'lucide-react';
import type { Actuacion } from '../../types/libros';
import SystemAlertModal from '../common/SystemAlertModal';

// Icono SVG personalizado de Instagram
const InstagramIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

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
  pilar: string;
  hook: string;
  copy: string;
  driveUrl: string;
  estado: 'Borrador' | 'En Revisión Jefatura' | 'Aprobado para Publicar' | 'Publicado' | 'Requiere Ajustes';
  feedbackJefatura?: string;
  fechaProgramada?: string;
}

// Pilares oficiales basados en la cuenta @romanydelgado y sus historias destacadas
const PILARES_OFICIALES = [
  { id: 'Ley & Orden / Tips Legales', label: 'Ley & Orden / Tips Legales', icon: '⚖️', desc: 'Qué hacer en situaciones jurídicas cotidianas' },
  { id: 'Procesal Civil & Inmuebles', label: 'Procesal Civil & Inmuebles', icon: '🏛️', desc: 'Contratos, desalojos, compras y demandas civiles' },
  { id: 'Derecho Penal & Litigios', label: 'Derecho Penal & Litigios', icon: '🛡️', desc: 'Defensa técnica penal, audiencias y flagrancia' },
  { id: 'Derecho Corporativo & Mercantil', label: 'Corporativo & Empresas', icon: '🏢', desc: 'Empresas, actas, registros y asesoría de negocios' },
  { id: 'Medios, Prensa & Autoridad', label: 'Medios & Prensa', icon: '📰', desc: 'Apariciones públicas, entrevistas y sentencias' },
  { id: 'Marca Socios (Víctor & Luis)', label: 'Marca Socios (Víctor & Luis)', icon: '👔', desc: 'Liderazgo, valores del despacho y reflexiones' },
  { id: 'Casos de Éxito & Clientes', label: 'Clientes & Casos de Éxito', icon: '🌟', desc: 'Resultados favorables y testimonios reales' },
  { id: 'Preguntas Frecuentes (FAQ)', label: 'Preguntas Frecuentes (FAQ)', icon: '❓', desc: 'Dudas legales recurrentes resueltas en 60s' },
];

// Hashtags oficiales de Román & Delgado
const HASHTAGS_SUGERIDOS = [
  '#RomanyDelgado',
  '#AbogadosValencia',
  '#DerechoVenezolano',
  '#AsesoriaLegal',
  '#DerechoInmobiliario',
  '#DerechoPenal',
  '#TribunalesCarabobo',
  '#AbogadosVenezuela',
  '#DerechoCorporativo',
  '#ValenciaVenezuela'
];

// CTAs oficiales con WhatsApp real de la bio (@romanydelgado: +58 414-4996967)
const CTAS_SUGERIDOS = [
  '📲 Agenda tu consulta jurídica por WhatsApp directo: wa.me/584144996967',
  '⚖️ ¿Tienes un caso similar? Escríbenos por mensaje privado para asesoría personalizada.',
  '💬 Comenta "ASESORÍA" y nuestro equipo de abogados se comunicará contigo de inmediato.',
  '📌 Guarda este post para consultarlo cuando lo necesites y compártelo.',
  '📍 Agenda tu cita presencial en nuestro despacho en Valencia, Carabobo.'
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
  const [modalTab, setModalTab] = useState<'editor' | 'preview'>('editor');

  // Estado para alertas y confirmaciones del sistema
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: 'warning' | 'error' | 'success' | 'info';
    title: string;
    message: string;
    showCancel?: boolean;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'warning',
    title: '',
    message: ''
  });

  // Formulario del contenido
  const [formData, setFormData] = useState<MarketingPost>({
    id: '',
    hora: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false }),
    canal: 'Instagram',
    formato: 'Reel',
    pilar: 'Ley & Orden / Tips Legales',
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
        pilar: 'Ley & Orden / Tips Legales',
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
      pilar: 'Ley & Orden / Tips Legales',
      hook: '',
      copy: '',
      driveUrl: '',
      estado: 'En Revisión Jefatura',
      feedbackJefatura: '',
      fechaProgramada: new Date().toISOString().split('T')[0]
    });
    setModalTab('editor');
    setModalOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEditar = (p: MarketingPost) => {
    setEditingId(p.id);
    setFormData({ ...p });
    setModalTab('editor');
    setModalOpen(true);
  };

  // Guardar contenido en la bitácora
  const handleGuardarContenido = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hook.trim()) {
      setAlertConfig({
        isOpen: true,
        type: 'warning',
        title: 'Título Gancho Requerido',
        message: 'Por favor ingresa el título gancho (Hook) de la publicación antes de guardar. Este es el titular clave para captar la atención del público.',
        showCancel: false,
        confirmText: 'Entendido',
        isDestructive: false
      });
      return;
    }

    const cleanDrive = formData.driveUrl.trim();
    const formattedAsunto = `[${formData.canal}] ${formData.formato} • ${formData.hook}`;
    const formattedPartes = `Pilar: ${formData.pilar}${cleanDrive ? ` | Drive: ${cleanDrive}` : ''}`;
    const cleanCopy = formData.copy.trim();

    const enrichedActuacion: any = {
      id: editingId || formData.id || `mkt_${Date.now()}`,
      hora: formData.hora,
      numeroAsunto: formattedAsunto,
      partes: formattedPartes,
      actuacion: cleanCopy,
      estado: formData.estado === 'Aprobado para Publicar' || formData.estado === 'Publicado' ? 'Completada' : 'En trámite',
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

  // Solicitar confirmación para eliminar contenido (Aviso mejorado sin confirm nativo)
  const handleSolicitarEliminarPost = (post: MarketingPost) => {
    setAlertConfig({
      isOpen: true,
      type: 'warning',
      title: '¿Eliminar contenido de la grilla?',
      message: `Estás a punto de eliminar la siguiente publicación:\n\n• Gancho: "${post.hook}"\n• Canal: ${post.canal} | Formato: ${post.formato}\n• Pilar: ${post.pilar}\n\n¿Qué pasará al confirmar?\nEste contenido se removerá permanentemente de tu grilla de marketing y de la bitácora de trabajo de hoy. Esta acción no se puede deshacer.`,
      showCancel: true,
      confirmText: 'Sí, eliminar contenido',
      cancelText: 'Conservar contenido',
      isDestructive: true,
      onConfirm: () => {
        setActuaciones(prev => prev.filter(a => a.id !== post.id));
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
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
      copy: prev.copy ? `${prev.copy.trim()}\n\n${cta}` : cta
    }));
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HERO HEADER: ESTUDIO DE MARKETING & REDES SOCIALES */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Glow de ambientación Instagram + Gold */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-500/10 via-purple-600/10 to-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-pink-500 via-purple-500 to-amber-500 text-white rounded-full text-xs font-black tracking-wide shadow-sm">
                <Sparkles className="w-3.5 h-3.5" /> ESTUDIO SOCIAL MEDIA & MARKETING
              </span>
              <a
                href="https://instagram.com/romanydelgado/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/30 rounded-full text-xs font-bold transition-all"
              >
                <InstagramIcon className="w-3.5 h-3.5 text-pink-400" />
                <span>@romanydelgado</span>
                <span className="text-[10px] text-pink-400/80 font-normal">• 1,272 seguidores</span>
                <ArrowUpRight className="w-3 h-3 text-pink-400" />
              </a>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Grilla de Contenido & Redes Sociales
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              Planificación oficial de posts, reels, historias y carruseles para la firma <strong className="text-amber-400">Román & Delgado | Despacho de Abogados</strong>. Redacta copies, vincula artes de Google Drive y recibe la aprobación directa de Jefatura.
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

        {/* 2. ACCESOS DIRECTOS Y RECURSOS OFICIALES */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Canales & Enlaces:</span>
            <a
              href="https://instagram.com/romanydelgado/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 text-pink-300 border border-pink-500/30 rounded-xl text-xs font-bold transition-all"
            >
              <InstagramIcon className="w-3.5 h-3.5" />
              <span>Instagram Oficial (@romanydelgado)</span>
              <ArrowUpRight className="w-3 h-3 text-pink-400" />
            </a>
            <a
              href="https://wa.me/584144996967"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all"
            >
              <span>📲 WhatsApp Consultas (+58 414-4996967)</span>
              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            </a>
            <a
              href="https://drive.google.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all"
            >
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span>Google Drive (Artes & Videos)</span>
              <ArrowUpRight className="w-3 h-3 text-amber-400" />
            </a>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>Identidad:</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-bold">#0f172a Obsidian</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold">#f59e0b Oro RD</span>
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
                          <InstagramIcon className="w-3 h-3 text-pink-600" /> {post.canal}
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
                          onClick={() => handleSolicitarEliminarPost(post)}
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

      {/* 6. MODAL REDISEÑADO: ESTUDIO PROFESIONAL INSTAGRAM @romanydelgado */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-950 text-white rounded-3xl max-w-6xl w-full border border-slate-800 shadow-2xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header del Modal con Identidad @romanydelgado */}
            <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Avatar Instagram con anillo de degradado */}
                <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-md">
                  <div className="w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center text-amber-400 font-black text-xs border border-slate-900">
                    <Scale className="w-5 h-5" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                      <span>{editingId ? 'Editar Contenido' : 'Nuevo Contenido'}</span>
                      <span className="text-xs text-pink-400 font-bold bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20">
                        @romanydelgado
                      </span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    Román & Delgado | Despacho de Abogados • Estudio Creativo de Redes
                  </p>
                </div>
              </div>

              {/* Botón de Tabs para móvil (Editor vs Simulador) y Botón Cerrar */}
              <div className="flex items-center gap-2">
                <div className="flex md:hidden bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setModalTab('editor')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${modalTab === 'editor' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
                  >
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab('preview')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${modalTab === 'preview' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>En Vivo</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Cuerpo del Modal: 2 Columnas (Editor a la izquierda, Simulador Instagram a la derecha) */}
            <form onSubmit={handleGuardarContenido} className="flex-1 overflow-y-auto flex flex-col md:flex-row [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-900 [&::-webkit-scrollbar-thumb]:bg-slate-700 hover:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
              
              {/* COLUMNA IZQUIERDA: CONTROLES DEL EDITOR */}
              <div className={`p-5 sm:p-6 space-y-5 md:w-7/12 border-b md:border-b-0 md:border-r border-slate-800/80 overflow-y-auto ${modalTab === 'preview' ? 'hidden md:block' : 'block'}`}>
                
                {/* 1. Selector de Formato con Pills Visuales */}
                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-purple-400" />
                    <span>Formato del Contenido</span>
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { id: 'Reel', label: 'Reel', icon: <Video className="w-4 h-4" />, badge: '9:16' },
                      { id: 'Carrusel', label: 'Carrusel', icon: <Layers className="w-4 h-4" />, badge: 'Slides' },
                      { id: 'Post Estático', label: 'Post 1:1', icon: <ImageIcon className="w-4 h-4" />, badge: 'Arte' },
                      { id: 'Historia', label: 'Historia', icon: <Clock className="w-4 h-4" />, badge: '24h' },
                      { id: 'Flyer / Evento', label: 'Flyer', icon: <Sparkles className="w-4 h-4" />, badge: 'Aviso' },
                      { id: 'Guion / Video Largo', label: 'Guion', icon: <FileText className="w-4 h-4" />, badge: 'Largo' },
                    ].map(f => {
                      const isSelected = formData.formato === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, formato: f.id as any })}
                          className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            isSelected
                              ? 'bg-gradient-to-b from-purple-600/30 to-purple-600/10 border-purple-500 text-white shadow-md shadow-purple-500/20 ring-1 ring-purple-500/40'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <div className={isSelected ? 'text-purple-400' : 'text-slate-500'}>{f.icon}</div>
                          <span className="text-[11px] font-black">{f.label}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-md ${isSelected ? 'bg-purple-500/30 text-purple-200 font-bold' : 'text-slate-500'}`}>
                            {f.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Canal de Difusión & Hora */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-pink-400" />
                      <span>Canal Oficial</span>
                    </label>
                    <select
                      value={formData.canal}
                      onChange={(e) => setFormData({ ...formData, canal: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm font-bold text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="Instagram">Instagram Feed / Reels (@romanydelgado)</option>
                      <option value="Instagram Stories">Instagram Stories (24h)</option>
                      <option value="TikTok">TikTok Despacho</option>
                      <option value="LinkedIn">LinkedIn Corporativo Román & Delgado</option>
                      <option value="Facebook">Facebook Despacho</option>
                      <option value="Web Blog">Web & Blog Informativo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Hora de Publicación</span>
                    </label>
                    <input
                      type="time"
                      value={formData.hora}
                      onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm font-bold text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* 3. Pilar de Contenido Estratégico */}
                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pilar de Contenido (Línea Editorial)</span>
                  </label>
                  <select
                    value={formData.pilar}
                    onChange={(e) => setFormData({ ...formData, pilar: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm font-semibold text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  >
                    {PILARES_OFICIALES.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.icon} {p.label} — {p.desc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Título Gancho (Hook) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Título Gancho (Hook de Impacto) *</span>
                    </label>
                    <span className="text-[10px] text-purple-300 font-bold bg-purple-500/10 px-2 py-0.5 rounded-full">
                      Primeros 3 segundos
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.hook}
                    onChange={(e) => setFormData({ ...formData, hook: e.target.value })}
                    placeholder="Ej: 3 cosas que NUNCA debes firmar sin la presencia de un abogado..."
                    className="w-full px-4 py-3 bg-slate-900/90 border border-slate-800 rounded-2xl text-sm font-bold text-white placeholder-slate-500 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-inner"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Este titular detendrá el scroll de los usuarios en Instagram y aparecerá destacado sobre el arte o video.
                  </span>
                </div>

                {/* 5. Copywriting del Post */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copywriting del Post (Texto Completo)</span>
                    </label>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                      <span>{formData.copy.length} caracteres</span>
                      <span>•</span>
                      <span>{formData.copy.trim() ? Math.ceil(formData.copy.trim().split(/\s+/).length / 3) : 0}s lectura</span>
                    </div>
                  </div>
                  <textarea
                    rows={6}
                    value={formData.copy}
                    onChange={(e) => setFormData({ ...formData, copy: e.target.value })}
                    placeholder="Escribe el cuerpo del copy aquí, desarrollando la idea jurídica, el contexto legal, los puntos clave y el llamado a la acción..."
                    className="w-full p-4 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs sm:text-sm font-medium text-slate-200 placeholder-slate-500 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 leading-relaxed font-sans shadow-inner [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700"
                  />

                  {/* Herramientas de Inserción Rápida: CTAs y Hashtags */}
                  <div className="mt-2.5 p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800/80 space-y-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-1.5 flex items-center gap-1">
                        <span>📲 + Insertar Llamado a la Acción (CTA) Oficial:</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {CTAS_SUGERIDOS.map((cta, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleInsertCTA(cta)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 rounded-xl text-[10px] font-medium transition-all text-left cursor-pointer"
                          >
                            {cta.slice(0, 52)}...
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-pink-400 block mb-1.5 flex items-center gap-1">
                        <span>🏷️ + Hashtags Oficiales Román & Delgado:</span>
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {HASHTAGS_SUGERIDOS.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleInsertHashtag(tag)}
                            className="px-2 py-0.5 bg-purple-500/10 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Enlace a Google Drive o Canva */}
                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-blue-400" />
                    <span>Enlace a Google Drive / Canva (Video o Arte)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="url"
                        value={formData.driveUrl}
                        onChange={(e) => setFormData({ ...formData, driveUrl: e.target.value })}
                        placeholder="https://drive.google.com/drive/folders/... o Canva"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm font-medium text-white placeholder-slate-500 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      />
                      <Folder className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    </div>
                    {formData.driveUrl && (
                      <a
                        href={formData.driveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* 7. Estado de Aprobación & Observaciones de Jefatura */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
                  <div>
                    <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                      Estado de Aprobación
                    </label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm font-bold text-white outline-none focus:border-purple-500"
                    >
                      <option value="En Revisión Jefatura">🟡 En Revisión por Jefatura</option>
                      <option value="Aprobado para Publicar">🟢 Aprobado por Jefatura (Listo)</option>
                      <option value="Publicado">🔵 Publicado en Instagram</option>
                      <option value="Borrador">⚪ Borrador en Redacción</option>
                      <option value="Requiere Ajustes">🔴 Requiere Ajustes / Corrección</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1.5">
                      Feedback de Jefatura (Víctor / Luis)
                    </label>
                    <input
                      type="text"
                      value={formData.feedbackJefatura}
                      onChange={(e) => setFormData({ ...formData, feedbackJefatura: e.target.value })}
                      placeholder="Observaciones de Víctor Román o Luis Delgado..."
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm font-medium text-white placeholder-slate-500 outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

              </div>

              {/* COLUMNA DERECHA: SIMULADOR EN VIVO INSTAGRAM @romanydelgado */}
              <div className={`p-5 sm:p-6 md:w-5/12 bg-slate-900/40 flex flex-col justify-between space-y-4 ${modalTab === 'editor' ? 'hidden md:flex' : 'flex'}`}>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-pink-400" />
                      <span>Simulador en Vivo Instagram</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Feed Real @romanydelgado
                    </span>
                  </div>

                  {/* FRAME DE TELÉFONO / CARD DE INSTAGRAM */}
                  <div className="bg-slate-950 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
                    
                    {/* Top Bar de la Publicación */}
                    <div className="p-3.5 border-b border-slate-800/60 flex items-center justify-between bg-slate-900/40">
                      <div className="flex items-center gap-2.5">
                        <div className="p-[1.5px] rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600">
                          <div className="w-7 h-7 rounded-full bg-slate-950 flex items-center justify-center text-amber-400 text-[10px] font-black">
                            <Scale className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-black text-white">romanydelgado</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                            <span className="text-[10px] text-purple-300 font-bold">Siguiendo</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block -mt-0.5">
                            Valencia, Carabobo
                          </span>
                        </div>
                      </div>
                      <span className="text-slate-500 text-xs font-black cursor-pointer">•••</span>
                    </div>

                    {/* Canvas / Arte Visual Simulado */}
                    <div className="aspect-square bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-6 flex flex-col justify-between relative overflow-hidden border-y border-slate-800/80">
                      <div className="absolute -top-12 -right-12 w-36 h-36 bg-purple-500/15 rounded-full blur-2xl" />
                      <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl" />

                      {/* Header dentro del Arte */}
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-wider text-purple-300 border border-white/10 flex items-center gap-1">
                          {formData.formato === 'Reel' ? <Video className="w-3 h-3 text-purple-400" /> :
                           formData.formato === 'Carrusel' ? <Layers className="w-3 h-3 text-blue-400" /> :
                           <ImageIcon className="w-3 h-3 text-emerald-400" />}
                          {formData.formato}
                        </span>

                        <span className="px-2 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-md text-[9px] font-bold">
                          {formData.pilar.slice(0, 24)}
                        </span>
                      </div>

                      {/* Titular Gancho (Hook) en el centro del arte */}
                      <div className="relative z-10 text-center py-4">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-md">
                          <Scale className="w-5 h-5" />
                        </div>
                        <h4 className="text-base sm:text-lg font-black text-white leading-snug drop-shadow-md">
                          {formData.hook || 'Escribe un Gancho de Impacto en el editor...'}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-2 block">
                          Román & Delgado | Abogados
                        </span>
                      </div>

                      {/* Pie del Arte: Audio simulado / Drive */}
                      <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span className="bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-slate-300">
                          🎵 Audio original • romanydelgado
                        </span>
                        {formData.driveUrl && (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Drive OK
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botones de Interacción Instagram */}
                    <div className="p-3.5 space-y-2.5 bg-slate-900/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white">
                          <Heart className="w-5 h-5 hover:text-rose-500 cursor-pointer transition-colors" />
                          <MessageSquare className="w-5 h-5 hover:text-purple-400 cursor-pointer transition-colors" />
                          <Send className="w-5 h-5 hover:text-blue-400 cursor-pointer transition-colors" />
                        </div>
                        <Bookmark className="w-5 h-5 text-white hover:text-amber-400 cursor-pointer transition-colors" />
                      </div>

                      <div className="text-xs font-black text-white">
                        1,272 Me gusta
                      </div>

                      {/* Texto del Copywriting con Formato Instagram */}
                      <div className="text-xs text-slate-300 leading-relaxed max-h-36 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-700">
                        <span className="font-black text-white mr-1.5">romanydelgado</span>
                        <span className="font-bold text-purple-300">{formData.hook}</span>
                        {formData.copy && (
                          <div className="mt-1.5 text-slate-300 whitespace-pre-wrap font-sans text-xs">
                            {formData.copy}
                          </div>
                        )}
                      </div>

                      {/* Botón Acción Rápida WhatsApp */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Hace 1 hora • Ver traducción</span>
                        <a
                          href="https://wa.me/584144996967"
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 font-bold hover:underline"
                        >
                          📲 wa.me/584144996967
                        </a>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Resumen del Post */}
                <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Programado para:</span>
                    <span className="font-bold text-white">{formData.fechaProgramada || 'Hoy'} - {formData.hora}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Estado en Bitácora:</span>
                    <span className={`font-bold ${formData.estado === 'Aprobado para Publicar' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {formData.estado}
                    </span>
                  </div>
                </div>

              </div>

            </form>

            {/* Pie del Modal con Botones de Acción */}
            <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-900/80 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleGuardarContenido}
                  className="px-6 py-2.5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-xl font-black text-xs shadow-lg shadow-purple-500/25 cursor-pointer transition-all active:scale-95 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingId ? 'Guardar Cambios' : 'Agregar a la Grilla Oficial'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 7. MODAL DE AVISOS Y CONFIRMACIONES DEL SISTEMA (Sin Popups Nativos) */}
      <SystemAlertModal
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        showCancel={alertConfig.showCancel}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        isDestructive={alertConfig.isDestructive}
        badgeText={alertConfig.isDestructive ? 'confirmación requerida' : undefined}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={alertConfig.onConfirm}
      />

    </div>
  );
}
