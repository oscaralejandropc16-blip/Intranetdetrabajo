import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  FolderSearch, FileText, Download, ExternalLink, Search, 
  Eye, Calendar, User, Paperclip, RefreshCw, 
  Grid, List, Scale, X, Loader2, Image as ImageIcon, Video,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Edit2, Trash2, Save
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { checkIsJefatura } from '../../lib/supabaseAdapter';
import SystemAlertModal, { type AlertType } from '../common/SystemAlertModal';

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
  const currentLoggedUser = localStorage.getItem('rd_user_name') || '';
  const isAdmin = checkIsJefatura(currentLoggedUser, localStorage.getItem('rd_is_admin') === 'true');

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'todos' | 'documento' | 'evidencia'>('todos');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  // Estados de Edición y Eliminación (Exclusivos para Jefatura)
  const [docToEdit, setDocToEdit] = useState<DocumentItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editExpediente, setEditExpediente] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editCategory, setEditCategory] = useState<'documento' | 'evidencia'>('documento');
  const [savingEdit, setSavingEdit] = useState(false);

  const [systemAlert, setSystemAlert] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
    showCancel?: boolean;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9); // 9 por página (3x3 en cuadrícula)

  // Cargar exclusivamente los archivos adjuntos y evidencias asociadas a ASUNTOS / EXPEDIENTES
  const fetchAllDocuments = async () => {
    setLoading(true);
    try {
      const allDocs: DocumentItem[] = [];

      // 1. Incorporar los adjuntos legítimos de casos judiciales y administrativos de Luis y Carmen
      HISTORICAL_CASE_ATTACHMENTS.forEach(doc => allDocs.push({ ...doc }));

      // 2. Cargar evidencias y adjuntos en tiempo real (sin descargar pdf_base64 masivos)
      const { data: bitacoras } = await supabase
        .from('bitacoras')
        .select('id, user_name, fecha, pdf_url, actuaciones, evidences, created_at')
        .order('fecha', { ascending: false })
        .limit(120);

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

      // 3. Deduplicar por URL y nombre aplicando eliminaciones y ediciones de Jefatura
      const seen = new Set<string>();
      const deduped: DocumentItem[] = [];
      const deletedIds: string[] = (() => {
        try { return JSON.parse(localStorage.getItem('rd_deleted_library_docs') || '[]'); } catch { return []; }
      })();
      const customEdits: Record<string, any> = (() => {
        try { return JSON.parse(localStorage.getItem('rd_custom_library_docs') || '{}'); } catch { return {}; }
      })();

      for (const d of allDocs) {
        if (deletedIds.includes(d.id)) continue;
        const key = d.url.length > 50 ? d.url.slice(-70) : `${d.name}_${d.author}`;
        if (!seen.has(key)) {
          seen.add(key);
          if (customEdits[d.id]) {
            Object.assign(d, customEdits[d.id]);
          }
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

  // --- CONTROL DE ACCESO EXCLUSIVO: MODIFICAR Y ELIMINAR (SOLO JEFATURA) ---
  const handleStartEdit = (doc: DocumentItem) => {
    if (!isAdmin) return;
    setDocToEdit(doc);
    setEditName(doc.name);
    setEditExpediente(doc.expediente);
    setEditNote(doc.note || '');
    setEditCategory(doc.category);
  };

  const handleSaveEdit = async () => {
    if (!docToEdit || !isAdmin) return;
    if (!editName.trim()) {
      setSystemAlert({
        isOpen: true,
        type: 'warning',
        title: 'Nombre Requerido',
        message: 'El nombre del archivo no puede estar vacío.'
      });
      return;
    }

    setSavingEdit(true);
    try {
      // 1. Guardar en mapa de ediciones en localStorage
      const customEdits = JSON.parse(localStorage.getItem('rd_custom_library_docs') || '{}');
      customEdits[docToEdit.id] = {
        name: editName.trim(),
        expediente: editExpediente.trim() || 'General / Diligencia',
        note: editNote.trim(),
        category: editCategory
      };
      localStorage.setItem('rd_custom_library_docs', JSON.stringify(customEdits));

      // 2. Si proviene de una bitácora en Supabase, actualizar en la tabla bitacoras
      if (docToEdit.sourceId) {
        try {
          const { data: bitacora } = await supabase
            .from('bitacoras')
            .select('id, evidences, attachedFiles')
            .eq('id', docToEdit.sourceId)
            .maybeSingle();

          if (bitacora) {
            let evs = Array.isArray(bitacora.evidences) ? bitacora.evidences : [];
            if (typeof bitacora.evidences === 'string') {
              try { evs = JSON.parse(bitacora.evidences); } catch {}
            }

            let attached = Array.isArray(bitacora.attachedFiles) ? bitacora.attachedFiles : [];
            if (typeof bitacora.attachedFiles === 'string') {
              try { attached = JSON.parse(bitacora.attachedFiles); } catch {}
            }

            let updated = false;
            evs = evs.map((e: any) => {
              if (e.url === docToEdit.url || e.name === docToEdit.name) {
                updated = true;
                return { ...e, name: editName.trim(), note: editNote.trim(), expediente: editExpediente.trim() };
              }
              return e;
            });

            attached = attached.map((a: any) => {
              if (a.url === docToEdit.url || a.name === docToEdit.name) {
                updated = true;
                return { ...a, name: editName.trim(), note: editNote.trim(), expediente: editExpediente.trim() };
              }
              return a;
            });

            if (updated) {
              await supabase
                .from('bitacoras')
                .update({ evidences: evs, attachedFiles: attached })
                .eq('id', docToEdit.sourceId);
            }
          }
        } catch (dbErr) {
          console.warn('Advertencia actualizando bitácora en Supabase:', dbErr);
        }
      }

      // 3. Actualizar estado reactivo
      setDocuments(prev => prev.map(d => {
        if (d.id === docToEdit.id) {
          return {
            ...d,
            name: editName.trim(),
            expediente: editExpediente.trim() || 'General / Diligencia',
            note: editNote.trim(),
            category: editCategory
          };
        }
        return d;
      }));

      setDocToEdit(null);
      setSystemAlert({
        isOpen: true,
        type: 'success',
        title: 'Archivo Modificado',
        message: 'Los datos del documento fueron actualizados exitosamente en la biblioteca oficial.'
      });
    } catch (err) {
      console.error('Error al modificar archivo:', err);
      setSystemAlert({
        isOpen: true,
        type: 'error',
        title: 'Error al Guardar',
        message: 'No se pudo guardar la modificación del archivo.'
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = (doc: DocumentItem) => {
    if (!isAdmin) return;
    setSystemAlert({
      isOpen: true,
      type: 'warning',
      title: 'Eliminar Archivo (Acción de Jefatura)',
      message: `¿Estás seguro de que deseas eliminar definitivamente el archivo "${doc.name}"? Esta acción lo removerá de la biblioteca y de los expedientes asociados.`,
      showCancel: true,
      confirmText: 'Sí, Eliminar Definitivamente',
      cancelText: 'Cancelar',
      onConfirm: () => executeDeleteDoc(doc)
    });
  };

  const executeDeleteDoc = async (doc: DocumentItem) => {
    try {
      const deletedIds = JSON.parse(localStorage.getItem('rd_deleted_library_docs') || '[]');
      if (!deletedIds.includes(doc.id)) {
        deletedIds.push(doc.id);
        localStorage.setItem('rd_deleted_library_docs', JSON.stringify(deletedIds));
      }

      if (doc.sourceId) {
        try {
          const { data: bitacora } = await supabase
            .from('bitacoras')
            .select('id, evidences, attachedFiles')
            .eq('id', doc.sourceId)
            .maybeSingle();

          if (bitacora) {
            let evs = Array.isArray(bitacora.evidences) ? bitacora.evidences : [];
            if (typeof bitacora.evidences === 'string') {
              try { evs = JSON.parse(bitacora.evidences); } catch {}
            }

            let attached = Array.isArray(bitacora.attachedFiles) ? bitacora.attachedFiles : [];
            if (typeof bitacora.attachedFiles === 'string') {
              try { attached = JSON.parse(bitacora.attachedFiles); } catch {}
            }

            const filteredEvs = evs.filter((e: any) => e.url !== doc.url && e.name !== doc.name);
            const filteredAttached = attached.filter((a: any) => a.url !== doc.url && a.name !== doc.name);

            await supabase
              .from('bitacoras')
              .update({ evidences: filteredEvs, attachedFiles: filteredAttached })
              .eq('id', doc.sourceId);
          }
        } catch (dbErr) {
          console.warn('Error al actualizar bitácora en Supabase:', dbErr);
        }
      }

      setDocuments(prev => prev.filter(d => d.id !== doc.id));

      setSystemAlert({
        isOpen: true,
        type: 'success',
        title: 'Archivo Eliminado',
        message: `El archivo "${doc.name}" fue eliminado definitivamente de la plataforma.`
      });
    } catch (err) {
      console.error('Error eliminando archivo:', err);
      setSystemAlert({
        isOpen: true,
        type: 'error',
        title: 'Error al Eliminar',
        message: 'No se pudo eliminar el archivo. Intenta nuevamente.'
      });
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

  // Resetear a página 1 al cambiar filtros o búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedAuthor]);

  // Cálculos de Paginación
  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDocuments = itemsPerPage >= 9999 ? filteredDocuments : filteredDocuments.slice(startIndex, endIndex);

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
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        iconBg: 'bg-blue-50 text-blue-600 border border-blue-200',
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
      
      {/* 1. ENCABEZADO INSTITUCIONAL (EJECUTIVO DE ALTO CONTRASTE) */}
      <div className="bg-white rounded-3xl border border-blue-200 shadow-md shadow-blue-950/8 p-6 lg:p-7 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-blue-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 text-[#1e3a8a] border border-blue-200 text-xs font-bold uppercase tracking-wider mb-2.5">
              <FolderSearch className="w-3.5 h-3.5 text-blue-700" />
              <span>Archivo de Expedientes & Casos</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#172554] to-[#1d4ed8] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-900/20">
                <FolderSearch className="w-6 h-6" />
              </span>
              Biblioteca de Adjuntos & Expedientes
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl font-medium leading-relaxed">
              Consulta, descarga y audita todos los documentos probatorios, poderes, sentencias, oficios y anexos vinculados a asuntos y actuaciones del despacho.
            </p>
          </div>

          <button
            onClick={fetchAllDocuments}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 font-bold text-xs transition-all border border-slate-200 shadow-2xs cursor-pointer"
            title="Sincronizar biblioteca con la nube"
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar Archivos</span>
          </button>
        </div>

        {/* METRICS CARDS (LIGHT EJECUTIVO) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-6">
          <div className="bg-slate-50/80 border border-slate-200/90 p-4 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-200/60 text-slate-700 flex items-center justify-center shrink-0">
              <Paperclip className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500 block tracking-wider">Total Adjuntos</span>
              <p className="text-2xl font-black text-slate-900">{stats.total}</p>
              <span className="text-[10px] text-slate-400 font-medium">Vinculados a casos</span>
            </div>
          </div>

          <div className="bg-blue-50/50 border border-blue-200/80 p-4 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-blue-700 block tracking-wider">Documentos & PDFs</span>
              <p className="text-2xl font-black text-blue-900">{stats.documentos}</p>
              <span className="text-[10px] text-blue-700/80 font-medium">Poderes, sentencias y oficios</span>
            </div>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-200/80 p-4 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <ImageIcon className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-emerald-700 block tracking-wider">Evidencias & Fotos</span>
              <p className="text-2xl font-black text-emerald-900">{stats.evidencias}</p>
              <span className="text-[10px] text-emerald-700/80 font-medium">Soportes de diligencias</span>
            </div>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-200/80 p-4 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-indigo-700" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-indigo-700 block tracking-wider">Personal Activo</span>
              <p className="text-2xl font-black text-indigo-900">{stats.totalAuthors}</p>
              <span className="text-[10px] text-indigo-700/80 font-medium">Abogados y jefatura</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE HERRAMIENTAS: BÚSQUEDA Y FILTROS */}
      <div className="bg-white rounded-3xl p-5 shadow-md shadow-blue-950/8 border border-blue-200 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Campo de Búsqueda */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre de archivo, Nº de asunto/expediente, fecha o empleado..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por Autor / Empleado */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl">
              <User className="w-4 h-4 text-slate-500 shrink-0" />
              <select
                value={selectedAuthor}
                onChange={(e) => setSelectedAuthor(e.target.value)}
                className="bg-transparent text-slate-700 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="todos">Todos los Empleados ({authorsList.length})</option>
                {authorsList.map((author) => (
                  <option key={author} value={author}>{author}</option>
                ))}
              </select>
            </div>

            {/* Alternador de vista: Grid vs Table */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                title="Vista Cuadrícula"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
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
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm' 
                : 'bg-blue-50/70 text-slate-600 hover:bg-blue-50 border border-blue-100'
            }`}
          >
            Todos ({documents.length})
          </button>

          <button
            onClick={() => setSelectedCategory('documento')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'documento' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
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

          {(searchQuery || selectedCategory !== 'todos' || selectedAuthor !== 'todos') && (
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('todos'); setSelectedAuthor('todos'); }}
              className="ml-auto px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Restablecer filtros"
            >
              <span>Limpiar filtros</span>
            </button>
          )}
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
          {paginatedDocuments.map((doc) => {
            const typeInfo = getDocTypeInfo(doc);
            const IconComponent = typeInfo.icon;

            return (
              <div 
                key={doc.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden shadow-2xs"
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
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${typeInfo.iconBg}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="overflow-hidden flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate" title={doc.name}>
                        {doc.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="capitalize font-bold text-slate-700">{doc.author}</span>
                      </p>
                    </div>
                  </div>

                  {/* Información extra: Asunto Obligatorio y Nota */}
                  <div className="mt-3.5 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 font-bold text-blue-700 mb-1">
                      <Scale className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border border-blue-200/80">
                        Asunto: {doc.expediente}
                      </span>
                    </div>
                    {doc.note && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 italic mt-1 font-medium">
                        "{doc.note}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Pie con Acciones */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 font-mono font-medium">
                    {formatFileSize(doc.size)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Botones Exclusivos para Jefatura */}
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(doc)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                          title="Modificar archivo (Jefatura)"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(doc)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                          title="Eliminar archivo definitivamente (Jefatura)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                      title="Previsualizar documento"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={doc.name}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm shadow-blue-600/20 active:scale-95 cursor-pointer"
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
        <div className="bg-white rounded-3xl border border-blue-200 overflow-hidden shadow-md shadow-blue-950/8">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#dbeafe] text-[#1e3a8a] uppercase text-[10px] font-extrabold tracking-wider border-b border-blue-200">
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
                {paginatedDocuments.map((doc) => {
                  const typeInfo = getDocTypeInfo(doc);
                  const IconComponent = typeInfo.icon;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${typeInfo.iconBg}`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 truncate max-w-xs sm:max-w-md group-hover:text-blue-600 transition-colors" title={doc.name}>
                              {doc.name}
                            </p>
                            {doc.note && (
                              <p className="text-[10px] text-slate-400 italic truncate max-w-xs">{doc.note}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${typeInfo.badgeClass}`}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md">
                          {doc.expediente}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 capitalize font-bold text-slate-800">
                        {doc.author}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {doc.date}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {formatFileSize(doc.size)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Botones Exclusivos para Jefatura */}
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(doc)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Modificar archivo (Jefatura)"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConfirmDelete(doc)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar archivo (Jefatura)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Previsualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={doc.name}
                            className="p-1.5 text-slate-700 hover:text-white hover:bg-blue-600 rounded-lg transition-colors cursor-pointer"
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

      {/* 3.1 BARRA DE PAGINACIÓN */}
      {!loading && filteredDocuments.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Selector de cantidad y rango */}
          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap justify-center sm:justify-start">
            <div className="flex items-center gap-1.5">
              <span className="font-medium">Mostrar:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 text-slate-800 font-bold px-2.5 py-1.5 rounded-xl text-xs outline-none cursor-pointer hover:border-slate-300 transition-colors"
              >
                <option value={6}>6 archivos</option>
                <option value={9}>9 archivos (3x3)</option>
                <option value={18}>18 archivos</option>
                <option value={36}>36 archivos</option>
                <option value={9999}>Ver todos ({filteredDocuments.length})</option>
              </select>
            </div>
            <span className="text-slate-300">|</span>
            <span className="font-medium">
              Archivos <strong className="text-slate-800">{startIndex + 1}</strong> a <strong className="text-slate-800">{Math.min(endIndex, filteredDocuments.length)}</strong> de <strong className="text-blue-600">{filteredDocuments.length}</strong>
            </span>
          </div>

          {/* Botones de navegación */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage === 1}
                title="Primera página"
                className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={safeCurrentPage === 1}
                title="Página anterior"
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Anterior</span>
              </button>

              {/* Botones numéricos */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  return (
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - safeCurrentPage) <= 1
                  );
                })
                .map((page, idx, array) => {
                  const prevPage = array[idx - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;

                  return (
                    <div key={page} className="flex items-center gap-1">
                      {showEllipsis && <span className="px-1 text-slate-400 text-xs font-bold">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-8 h-8 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          safeCurrentPage === page
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 font-black'
                            : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  );
                })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={safeCurrentPage === totalPages}
                title="Página siguiente"
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage === totalPages}
                title="Última página"
                className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. MODAL VISOR DE PREVISUALIZACIÓN DE DOCUMENTOS */}
      {previewDoc && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl shadow-blue-950/25 border border-blue-200 w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header del Visor */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#172554] via-[#1e3a8a] to-[#1d4ed8] text-white flex items-center justify-between gap-3 border-b border-blue-800/60">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <FileText className="w-5 h-5 text-sky-200" />
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-extrabold text-sm text-white truncate" title={previewDoc.name}>{previewDoc.name}</h3>
                  <p className="text-[11px] text-blue-100/85 flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span>Cargado por:</span> <strong className="text-white capitalize">{previewDoc.author}</strong>
                    <span>&bull;</span>
                    <span className="bg-white/15 text-sky-100 border border-white/25 px-2 py-0.5 rounded-md font-bold text-[11px]">Asunto: {previewDoc.expediente}</span>
                    <span>&bull;</span>
                    <span>{previewDoc.date}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!previewDoc.url.includes('supabase.co/storage') && (
                  <>
                    <a
                      href={previewDoc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold transition-all flex items-center gap-1.5"
                      title="Abrir en pestaña nueva"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Pestaña Nueva</span>
                    </a>
                    <a
                      href={previewDoc.url}
                      download={previewDoc.name}
                      className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-[#1e3a8a] text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                      title="Descargar archivo a tu equipo"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar</span>
                    </a>
                  </>
                )}
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-white bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl transition-colors cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenedor del Visor */}
            <div className="flex-1 bg-slate-100 p-2 sm:p-4 overflow-hidden flex items-center justify-center relative">
              {previewDoc.url.includes('supabase.co/storage') ? (
                <div className="max-w-lg w-full bg-white rounded-3xl border border-amber-200 shadow-lg p-6 sm:p-8 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-base sm:text-lg font-extrabold text-slate-900">
                      Archivo almacenado en el servidor anterior (Supabase Storage)
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Este adjunto histórico (<strong>{previewDoc.name}</strong>) no se perdió: sigue guardado en Supabase, pero su descarga pública quedó temporalmente pausada por la cuota gratuita mensual hasta el <strong>20 de diciembre de 2026</strong>.
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Si necesitas este archivo con urgencia hoy, el administrador puede descargarlo directamente desde <strong>Supabase Dashboard &rarr; Storage &rarr; evidencias</strong>. Los archivos nuevos subidos desde hoy ya se guardan en Neon sin bloqueo.
                    </p>
                  </div>
                </div>
              ) : previewDoc.type.includes('video') || previewDoc.url.endsWith('.mp4') ? (
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
                  src={
                    previewDoc.url.startsWith('https://romanydelgado.com/wp-content/uploads/')
                      ? `/api/wp-pdf?url=${encodeURIComponent(previewDoc.url)}`
                      : previewDoc.url
                  }
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
        </div>,
        document.body
      )}

      {/* 5. MODAL DE MODIFICACIÓN DE ARCHIVO (EXCLUSIVO PARA JEFATURA) */}
      {docToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl shadow-blue-950/25 border border-blue-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header del Modal */}
            <div className="p-5 bg-gradient-to-r from-[#172554] via-[#1e3a8a] to-[#1d4ed8] text-white flex items-center justify-between border-b border-blue-800/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white shrink-0 shadow-sm">
                  <Edit2 className="w-5 h-5 text-sky-200" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-100 bg-white/15 px-2 py-0.5 rounded border border-white/25">
                    Solo Jefatura
                  </span>
                  <h3 className="font-extrabold text-base text-white mt-0.5">Modificar Archivo Oficial</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDocToEdit(null)}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nombre del Archivo
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="Ej: Poder Inversiones Ox.pdf"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Asunto / N° Expediente
                </label>
                <input
                  type="text"
                  value={editExpediente}
                  onChange={(e) => setEditExpediente(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="Ej: RD-J-2026-57371"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Categoría
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
                >
                  <option value="documento">Documento Legal (PDF)</option>
                  <option value="evidencia">Evidencias & Fotos</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nota / Descripción Explicativa
                </label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                  placeholder="Indica el motivo o detalle relevante de este documento..."
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDocToEdit(null)}
                  disabled={savingEdit}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs transition-all shadow-sm shadow-blue-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Modificación</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ALERTAS Y CONFIRMACIÓN DE ACCIONES */}
      <SystemAlertModal
        isOpen={systemAlert.isOpen}
        type={systemAlert.type}
        title={systemAlert.title}
        message={systemAlert.message}
        showCancel={systemAlert.showCancel}
        confirmText={systemAlert.confirmText}
        cancelText={systemAlert.cancelText}
        onConfirm={systemAlert.onConfirm}
        onClose={() => setSystemAlert(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
