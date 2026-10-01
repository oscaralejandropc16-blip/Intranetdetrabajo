import { useState, useEffect, useMemo } from 'react';
import { 
  FolderSearch, FileText, Download, ExternalLink, Search, 
  Eye, Calendar, User, Paperclip, RefreshCw, 
  Grid, List, Scale, X, Loader2, Image as ImageIcon, Video
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

export interface DocumentItem {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
  category: 'documento' | 'evidencia';
  author: string;
  date: string;
  note?: string;
  expediente: string;
  sourceId?: string | number;
}

// Expedientes y documentos probatorios legítimos de casos judiciales y administrativos
// (Se excluyen estrictamente las leyes, códigos, gacetas y archivos web que no correspondan a un caso)
const HISTORICAL_CASE_ATTACHMENTS: DocumentItem[] = [
  {
    id: 'doc-case-7479',
    name: 'Poder Leo (CamScanner)',
    url: 'https://romanydelgado.com/wp-content/uploads/2026/07/CamScanner-08-07-2026-10.22.pdf',
    type: 'application/pdf',
    category: 'documento',
    author: 'Luis Delgado',
    date: '2026-07-08',
    expediente: 'RD-AD-2026-001',
    note: 'Poder de representación legal consignado en actuaciones del caso'
  },
  {
    id: 'doc-case-7477',
    name: 'Ejercicio Unilateral 2024-4019',
    url: 'https://romanydelgado.com/wp-content/uploads/2026/07/CamScanner-08-07-2026-10.13.pdf',
    type: 'application/pdf',
    category: 'documento',
    author: 'Luis Delgado',
    date: '2026-07-08',
    expediente: '2024-4019',
    note: 'Documento probatorio y consignación de escrito ante tribunal'
  },
  {
    id: 'doc-case-7475',
    name: 'Carta de Solicitud SIDUNEA',
    url: 'https://romanydelgado.com/wp-content/uploads/2026/07/SOLICITUD-DE-CLAVE-ACCESO-SIDUNEA.pdf',
    type: 'application/pdf',
    category: 'documento',
    author: 'Luis Delgado',
    date: '2026-07-08',
    expediente: 'RD-AD-2026-004',
    note: 'Solicitud formal de clave de acceso al sistema SIDUNEA'
  },
  {
    id: 'doc-case-7451',
    name: 'INFORME 3447 (Tribunal)',
    url: 'https://romanydelgado.com/wp-content/uploads/2026/07/Informes-consignado-hoy-02-07.pdf',
    type: 'application/pdf',
    category: 'documento',
    author: 'Luis Delgado',
    date: '2026-07-06',
    expediente: 'Exp. 3447',
    note: 'Informes consignados en el tribunal de la causa'
  },
  {
    id: 'doc-case-7444',
    name: 'Sentencia de Autorización Judicial de Viaje',
    url: 'https://romanydelgado.com/wp-content/uploads/2026/07/Image-to-PDF-20260701-16.53.17.pdf',
    type: 'application/pdf',
    category: 'documento',
    author: 'Carmen Luisa',
    date: '2026-07-01',
    expediente: 'RD-J-2026-0094',
    note: 'Sentencia dictada por tribunal de protección de niños, niñas y adolescentes'
  },
  {
    id: 'doc-case-7329',
    name: 'Notificación IPOSTEL (Diligencia Courier)',
    url: 'https://romanydelgado.com/wp-content/uploads/2026/06/Notificacion-de-curier.pdf',
    type: 'application/pdf',
    category: 'documento',
    author: 'Luis Delgado',
    date: '2026-06-30',
    expediente: 'RD-AD-2026-004',
    note: 'Comprobante de notificación entregado vía IPOSTEL'
  },
  {
    id: 'doc-case-7327',
    name: 'Notificación de Courier',
    url: 'https://romanydelgado.com/wp-content/uploads/2026/06/Notificacion-Courier.pdf',
    type: 'application/pdf',
    category: 'documento',
    author: 'Luis Delgado',
    date: '2026-06-30',
    expediente: 'RD-AD-2026-004',
    note: 'Constancia de notificación remitida por servicio de encomiendas'
  },
  {
    id: 'doc-case-7316',
    name: 'Guía de Envío Courier',
    url: 'https://romanydelgado.com/wp-content/uploads/2026/06/Courier.pdf',
    type: 'application/pdf',
    category: 'documento',
    author: 'Luis Delgado',
    date: '2026-06-23',
    expediente: 'RD-AD-2026-004',
    note: 'Soporte y guía oficial de correspondencia de caso'
  }
];

export default function ModuloBibliotecaArchivos() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'todos' | 'documento' | 'evidencia'>('todos');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  // Cargar exclusivamente los archivos adjuntos y evidencias asociadas a ASUNTOS / EXPEDIENTES
  const fetchAllDocuments = async () => {
    setLoading(true);
    try {
      const allDocs: DocumentItem[] = [];

      // 1. Incorporar los adjuntos legítimos de casos judiciales y administrativos de Luis y Carmen
      HISTORICAL_CASE_ATTACHMENTS.forEach(doc => allDocs.push({ ...doc }));

      // 2. Cargar evidencias y adjuntos en tiempo real desde Supabase (bitácoras y actuaciones de empleados)
      const { data: bitacoras } = await supabase
        .from('bitacoras')
        .select('*')
        .order('fecha', { ascending: false });

      if (bitacoras && Array.isArray(bitacoras)) {
        bitacoras.forEach((b: any) => {
          const rawUser = b.user_name || 'Empleado';
          const cleanUser = rawUser.trim();
          const fechaStr = b.fecha || format(new Date(), 'yyyy-MM-dd');

          // Asunto o número de expediente si tiene
          let expNum = '';
          let defaultActuacionNote = '';
          if (Array.isArray(b.actuaciones) && b.actuaciones.length > 0) {
            const firstWithExp = b.actuaciones.find((a: any) => a.numeroAsunto || a.expediente) || b.actuaciones[0];
            if (firstWithExp) {
              expNum = firstWithExp.numeroAsunto || firstWithExp.expediente || '';
              const parts = [
                firstWithExp.actuacion,
                firstWithExp.observaciones,
                firstWithExp.partes ? `Partes: ${firstWithExp.partes}` : ''
              ].filter(Boolean);
              if (parts.length > 0) defaultActuacionNote = parts.join(' - ');
            }
          }

          // Solo evidencias y archivos adjuntos (SIN bitacora_pdf y SIN gastos)
          let evs: any[] = [];
          if (Array.isArray(b.evidences)) evs = b.evidences;
          else if (typeof b.evidences === 'string') {
            try { evs = JSON.parse(b.evidences); } catch (e) {}
          }
          if (Array.isArray(b.attachedFiles)) {
            evs = [...evs, ...b.attachedFiles];
          }

          evs.forEach((ev: any, idx: number) => {
            const fileUrl = ev.url || ev.dataUrl;
            if (fileUrl) {
              const isPdf = (ev.type && ev.type.includes('pdf')) || (ev.name && ev.name.toLowerCase().endsWith('.pdf'));
              allDocs.push({
                id: `ev_${b.id}_${idx}_${ev.name || 'doc'}`,
                name: ev.name || `Adjunto_${cleanUser}_${idx + 1}.pdf`,
                url: fileUrl,
                type: ev.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
                size: ev.size,
                category: isPdf ? 'documento' : 'evidencia',
                author: cleanUser,
                date: ev.uploaded_at ? ev.uploaded_at.split('T')[0] : fechaStr,
                expediente: expNum || 'General / Diligencia',
                sourceId: b.id,
                note: ev.note || defaultActuacionNote || 'Documento adjunto a las actuaciones'
              });
            }
          });
        });
      }

      // 3. Deduplicar por URL y nombre
      const seen = new Set<string>();
      const deduped: DocumentItem[] = [];
      for (const d of allDocs) {
        const key = d.url.length > 50 ? d.url.slice(-70) : `${d.name}_${d.author}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(d);
        }
      }

      // Ordenar cronológicamente descendente
      deduped.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      setDocuments(deduped);
    } catch (err) {
      console.error('Error cargando biblioteca de archivos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDocuments();
  }, []);

  // Lista única de autores para el filtro
  const authorsList = useMemo(() => {
    const list = Array.from(new Set(documents.map(d => d.author).filter(Boolean)));
    return list.sort();
  }, [documents]);

  // Filtrado reactivo en tiempo real
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // 1. Filtro por categoría (Documentos/PDFs vs Evidencias/Fotos)
      if (selectedCategory === 'documento') {
        const isPdf = doc.category === 'documento' || doc.type.includes('pdf') || doc.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) return false;
      } else if (selectedCategory === 'evidencia') {
        const isPdf = doc.category === 'documento' || doc.type.includes('pdf') || doc.name.toLowerCase().endsWith('.pdf');
        if (isPdf) return false;
      }

      // 2. Filtro por autor
      if (selectedAuthor !== 'todos' && doc.author.toLowerCase() !== selectedAuthor.toLowerCase()) {
        return false;
      }

      // 3. Filtro por búsqueda de texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = doc.name.toLowerCase().includes(q);
        const matchesAuthor = doc.author.toLowerCase().includes(q);
        const matchesExp = (doc.expediente || '').toLowerCase().includes(q);
        const matchesNote = (doc.note || '').toLowerCase().includes(q);
        const matchesDate = doc.date.toLowerCase().includes(q);
        return matchesName || matchesAuthor || matchesExp || matchesNote || matchesDate;
      }

      return true;
    });
  }, [documents, selectedCategory, selectedAuthor, searchQuery]);

  // KPIs
  const stats = useMemo(() => {
    const total = documents.length;
    const documentos = documents.filter(d => d.category === 'documento' || d.type.includes('pdf') || d.name.toLowerCase().endsWith('.pdf')).length;
    const evidencias = documents.filter(d => !(d.category === 'documento' || d.type.includes('pdf') || d.name.toLowerCase().endsWith('.pdf'))).length;
    const totalAuthors = new Set(documents.map(d => d.author.toLowerCase())).size;

    return { total, documentos, evidencias, totalAuthors };
  }, [documents]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return 'Archivo Digital';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const getDocTypeInfo = (doc: DocumentItem) => {
    const isPdf = doc.type.includes('pdf') || doc.name.toLowerCase().endsWith('.pdf');
    const isImg = doc.type.includes('image') || /\.(jpe?g|png|gif|webp)$/i.test(doc.url);
    const isVid = doc.type.includes('video') || doc.url.endsWith('.mp4');

    if (isPdf) {
      return {
        label: 'Documento Legal (PDF)',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        iconBg: 'bg-rose-50 text-rose-600 border border-rose-200',
        icon: FileText
      };
    }
    if (isImg) {
      return {
        label: 'Soporte Fotográfico',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
        icon: ImageIcon
      };
    }
    if (isVid) {
      return {
        label: 'Evidencia Video',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
        iconBg: 'bg-purple-50 text-purple-600 border border-purple-200',
        icon: Video
      };
    }
    return {
      label: 'Archivo Adjunto',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-200',
      icon: Paperclip
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. ENCABEZADO INSTITUCIONAL */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-700">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-bold uppercase tracking-wider mb-2">
              <FolderSearch className="w-3.5 h-3.5 text-indigo-400" />
              <span>Archivo de Expedientes & Casos</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Biblioteca de Adjuntos & Expedientes
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
              Consulta, descarga y audita todos los documentos probatorios, poderes, sentencias, oficios y anexos vinculados a asuntos y actuaciones del despacho.
            </p>
          </div>

          <button
            onClick={fetchAllDocuments}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs transition-all border border-white/20 shadow-md cursor-pointer backdrop-blur-md"
            title="Sincronizar biblioteca con la nube"
          >
            <RefreshCw className={`w-4 h-4 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar Archivos</span>
          </button>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-700/80">
          <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Total Adjuntos</span>
            <p className="text-2xl font-black text-white mt-0.5">{stats.total}</p>
            <span className="text-[10px] text-indigo-300 font-medium">Vinculados a casos</span>
          </div>

          <div className="bg-indigo-500/10 backdrop-blur-xs p-3.5 rounded-2xl border border-indigo-500/20">
            <span className="text-[10px] font-bold uppercase text-indigo-300 block tracking-wider">Documentos & PDFs</span>
            <p className="text-2xl font-black text-indigo-400 mt-0.5">{stats.documentos}</p>
            <span className="text-[10px] text-indigo-300/80 font-medium">Poderes, sentencias y oficios</span>
          </div>

          <div className="bg-emerald-500/10 backdrop-blur-xs p-3.5 rounded-2xl border border-emerald-500/20">
            <span className="text-[10px] font-bold uppercase text-emerald-300 block tracking-wider">Evidencias & Fotos</span>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">{stats.evidencias}</p>
            <span className="text-[10px] text-emerald-300/80 font-medium">Soportes de diligencias</span>
          </div>

          <div className="bg-amber-500/10 backdrop-blur-xs p-3.5 rounded-2xl border border-amber-500/20">
            <span className="text-[10px] font-bold uppercase text-amber-300 block tracking-wider">Personal Activo</span>
            <p className="text-2xl font-black text-amber-400 mt-0.5">{stats.totalAuthors}</p>
            <span className="text-[10px] text-amber-300/80 font-medium">Abogados y jefatura</span>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE HERRAMIENTAS: BÚSQUEDA Y FILTROS */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Campo de Búsqueda */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre de archivo, Nº de asunto/expediente, fecha o empleado..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl text-xs sm:text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por Autor / Empleado */}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedAuthor}
              onChange={(e) => setSelectedAuthor(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl px-3.5 py-2.5 outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-2xs"
            >
              <option value="todos">Todos los Empleados ({authorsList.length})</option>
              {authorsList.map((author) => (
                <option key={author} value={author}>{author}</option>
              ))}
            </select>

            {/* Alternador de vista: Grid vs Table */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                title="Vista Cuadrícula"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                title="Vista Tabla Detallada"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Chips de Categorías */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('todos')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedCategory === 'todos' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({documents.length})
          </button>

          <button
            onClick={() => setSelectedCategory('documento')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'documento' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Documentos & PDFs ({stats.documentos})
          </button>

          <button
            onClick={() => setSelectedCategory('evidencia')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'evidencia' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Evidencias & Fotos ({stats.evidencias})
          </button>
        </div>
      </div>

      {/* 3. CONTENIDO: LISTA O GRILLA DE DOCUMENTOS */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-bold text-slate-700">Consultando expedientes y adjuntos...</p>
          <span className="text-xs text-slate-400">Indexando documentos vinculados a asuntos</span>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <FolderSearch className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No hay archivos para mostrar</h3>
          <p className="text-xs text-slate-500 max-w-md">
            {searchQuery 
              ? `No hay archivos que coincidan con la búsqueda "${searchQuery}".`
              : 'No hay documentos registrados bajo los filtros seleccionados.'}
          </p>
          {(searchQuery || selectedCategory !== 'todos' || selectedAuthor !== 'todos') && (
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('todos'); setSelectedAuthor('todos'); }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* VISTA CUADRÍCULA (CARDS MODERNAS) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const typeInfo = getDocTypeInfo(doc);
            const IconComponent = typeInfo.icon;

            return (
              <div 
                key={doc.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  {/* Categoría y Fecha */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${typeInfo.badgeClass}`}>
                      {typeInfo.label}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {doc.date}
                    </span>
                  </div>

                  {/* Nombre del Archivo e Ícono */}
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${typeInfo.iconBg}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="overflow-hidden flex-1">
                      <h4 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors truncate" title={doc.name}>
                        {doc.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="capitalize font-bold text-slate-700">{doc.author}</span>
                      </p>
                    </div>
                  </div>

                  {/* Información extra: Asunto Obligatorio y Nota */}
                  <div className="mt-3.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-700 mb-1">
                      <Scale className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="bg-indigo-100/70 text-indigo-800 px-2 py-0.5 rounded-md text-[11px]">
                        Asunto: {doc.expediente}
                      </span>
                    </div>
                    {doc.note && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 italic mt-1">
                        "{doc.note}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Pie con Acciones */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {formatFileSize(doc.size)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                      title="Previsualizar documento"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={doc.name}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                      title="Abrir o Descargar archivo"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA TABLA (LISTA DETALLADA) */
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Archivo / Adjunto</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4">Asunto / Expediente</th>
                  <th className="py-3.5 px-4">Cargado Por</th>
                  <th className="py-3.5 px-4">Fecha</th>
                  <th className="py-3.5 px-4">Tamaño</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredDocuments.map((doc) => {
                  const typeInfo = getDocTypeInfo(doc);
                  const IconComponent = typeInfo.icon;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${typeInfo.iconBg}`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 truncate max-w-xs sm:max-w-md group-hover:text-indigo-600 transition-colors" title={doc.name}>
                              {doc.name}
                            </p>
                            {doc.note && (
                              <p className="text-[10px] text-slate-400 italic truncate max-w-xs">{doc.note}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${typeInfo.badgeClass}`}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-md">
                          {doc.expediente}
                        </span>
                      </td>
                      <td className="py-3 px-4 capitalize font-bold text-slate-800">
                        {doc.author}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {doc.date}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {formatFileSize(doc.size)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Previsualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={doc.name}
                            className="p-1.5 text-slate-700 hover:text-white hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                            title="Descargar archivo"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. MODAL VISOR DE PREVISUALIZACIÓN DE DOCUMENTOS */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header del Visor */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-sm text-white truncate" title={previewDoc.name}>{previewDoc.name}</h3>
                  <p className="text-[11px] text-slate-400">
                    Cargado por: <span className="font-bold text-white capitalize">{previewDoc.author}</span> • Asunto: <span className="text-amber-400 font-bold">{previewDoc.expediente}</span> • {previewDoc.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Abrir en pestaña nueva"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pestaña Nueva</span>
                </a>
                <a
                  href={previewDoc.url}
                  download={previewDoc.name}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  title="Descargar archivo a tu equipo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenedor del Visor */}
            <div className="flex-1 bg-slate-100 p-2 sm:p-4 overflow-hidden flex items-center justify-center relative">
              {previewDoc.type.includes('video') || previewDoc.url.endsWith('.mp4') ? (
                <video
                  src={previewDoc.url}
                  controls
                  className="max-h-full max-w-full rounded-xl shadow-md"
                />
              ) : previewDoc.url.startsWith('data:image') || previewDoc.type.includes('image') || /\.(jpe?g|png|gif|webp)$/i.test(previewDoc.url) ? (
                <img 
                  src={previewDoc.url} 
                  alt={previewDoc.name} 
                  className="max-h-full max-w-full object-contain rounded-xl shadow-md"
                />
              ) : (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.name}
                  className="w-full h-full rounded-2xl border border-slate-300 shadow-sm bg-white"
                />
              )}
            </div>

            {/* Footer con Metadatos */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 px-5">
              <span>{previewDoc.note || 'Documento oficial archivado'}</span>
              <span className="font-mono font-bold text-slate-700">{formatFileSize(previewDoc.size)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
