import React, { useState } from 'react';
import { 
  X, User, FileText, Upload, Trash2, Eye, DollarSign, 
  Award, CheckCircle2, Save, Plus, Download, Briefcase, FileCheck, Loader2
} from 'lucide-react';
import type { 
  PlantillaEmpleadoNomina, 
  DocumentoPersonal, 
  NovedadPersonal, 
  ReciboNomina,
  DepartamentoPersonal,
  TipoContratacion
} from '../../types/nomina';
import { supabaseUploadFile } from '../../lib/supabaseAdapter';
import { exportarReciboNominaPDF } from '../../lib/pdfExportNomina';

interface ModalExpedienteEmpleadoProps {
  empleado: PlantillaEmpleadoNomina;
  recibosHistoricos: ReciboNomina[];
  onClose: () => void;
  onSaveEmpleado: (updated: PlantillaEmpleadoNomina) => Promise<void>;
}

export default function ModalExpedienteEmpleado({
  empleado,
  recibosHistoricos,
  onClose,
  onSaveEmpleado
}: ModalExpedienteEmpleadoProps) {
  const currentLoggedUser = localStorage.getItem('rd_user_name') || 'Jefatura';

  const [activeTab, setActiveTab] = useState<'ficha' | 'documentos' | 'novedades' | 'pagos'>('ficha');
  const [formData, setFormData] = useState<PlantillaEmpleadoNomina>({
    ...empleado,
    rif: empleado.rif || '',
    departamento: empleado.departamento || 'Legal',
    tipoContratacion: empleado.tipoContratacion || 'Nomina Interna',
    fechaIngreso: empleado.fechaIngreso || '',
    telefonoEmergencia: empleado.telefonoEmergencia || '',
    direccionHabitacion: empleado.direccionHabitacion || '',
    resumenPerfil: empleado.resumenPerfil || '',
    documentos: empleado.documentos || [],
    novedades: empleado.novedades || []
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingDocTipo, setUploadingDocTipo] = useState<string | null>(null);

  // Formulario de nueva novedad
  const [novedadTipo, setNovedadTipo] = useState<NovedadPersonal['tipo']>('aumento');
  const [novedadTitulo, setNovedadTitulo] = useState('');
  const [novedadDesc, setNovedadDesc] = useState('');

  // Guardar cambios en la ficha general
  const handleGuardarFicha = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveEmpleado(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error guardando expediente:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Subir documento al archivador digital
  const handleSubirDocumento = async (tipo: DocumentoPersonal['tipo'], file: File) => {
    setUploadingDocTipo(tipo);
    try {
      let fileUrl = '';
      let base64 = '';

      // 1. Intentar subir a Supabase Storage
      try {
        const cleanName = `${empleado.id}_${tipo}_${Date.now()}`;
        fileUrl = await supabaseUploadFile('evidencias', file, 'expedientes_personal', cleanName);
      } catch (err) {
        console.warn('Storage upload fallback to base64 reader:', err);
      }

      // 2. Si no hay URL directa o es imagen/pdf pequeño, obtener base64 para respaldo
      const reader = new FileReader();
      const readPromise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
      base64 = await readPromise;

      const newDoc: DocumentoPersonal = {
        id: `doc_${tipo}_${Date.now()}`,
        tipo,
        nombre: file.name,
        url: fileUrl || base64,
        base64: fileUrl ? undefined : base64,
        formato: file.type || 'application/pdf',
        tamanio: `${(file.size / 1024).toFixed(1)} KB`,
        uploadedAt: new Date().toISOString()
      };

      const updatedDocs = [...(formData.documentos || []).filter(d => d.tipo !== tipo), newDoc];
      const updatedProfile = { ...formData, documentos: updatedDocs };
      setFormData(updatedProfile);
      await onSaveEmpleado(updatedProfile);
    } catch (e) {
      console.error('Error subiendo documento:', e);
    } finally {
      setUploadingDocTipo(null);
    }
  };

  // Eliminar documento
  const handleEliminarDocumento = async (tipo: string) => {
    const updatedDocs = (formData.documentos || []).filter(d => d.tipo !== tipo);
    const updatedProfile = { ...formData, documentos: updatedDocs };
    setFormData(updatedProfile);
    await onSaveEmpleado(updatedProfile);
  };

  // Agregar novedad
  const handleAgregarNovedad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novedadTitulo.trim() || !novedadDesc.trim()) return;

    const nueva: NovedadPersonal = {
      id: `nov_${Date.now()}`,
      fecha: new Date().toLocaleDateString('es-VE'),
      tipo: novedadTipo,
      titulo: novedadTitulo.trim(),
      descripcion: novedadDesc.trim(),
      registradoPor: currentLoggedUser
    };

    const updatedNovedades = [nueva, ...(formData.novedades || [])];
    const updatedProfile = { ...formData, novedades: updatedNovedades };
    setFormData(updatedProfile);
    setNovedadTitulo('');
    setNovedadDesc('');
    await onSaveEmpleado(updatedProfile);
  };

  // Eliminar novedad
  const handleEliminarNovedad = async (id: string) => {
    const updatedNovedades = (formData.novedades || []).filter(n => n.id !== id);
    const updatedProfile = { ...formData, novedades: updatedNovedades };
    setFormData(updatedProfile);
    await onSaveEmpleado(updatedProfile);
  };

  // Tipos de documentos estándar exigidos por RRHH
  const standardDocs: { tipo: DocumentoPersonal['tipo']; label: string; desc: string }[] = [
    { tipo: 'cedula', label: 'Cédula de Identidad', desc: 'Copia legible y vigente del documento de identidad' },
    { tipo: 'rif', label: 'RIF Actualizado', desc: 'Comprobante digital del RIF emitido por el SENIAT' },
    { tipo: 'residencia', label: 'Constancia de Residencia', desc: 'Constancia emitida por junta comunal o CNE' },
    { tipo: 'contrato', label: 'Contrato / Convenio de Honorarios', desc: 'Contrato firmado de trabajo o prestación de servicios' },
    { tipo: 'cv', label: 'Currículum Vitae (Hoja de Vida)', desc: 'Resumen curricular con experiencia laboral verificada' },
    { tipo: 'titulo', label: 'Títulos / Certificados', desc: 'Títulos universitarios, colegiatura o acreditaciones' },
  ];

  // Recibos pagados a este empleado
  const recibosEmpleado = recibosHistoricos.filter(r => 
    r.empleadoNombre.toLowerCase().trim() === empleado.nombre.toLowerCase().trim() ||
    (r.cedula && empleado.cedula && r.cedula.trim() === empleado.cedula.trim())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* 1. Header Ejecutivo */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
              {empleado.nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white truncate">{empleado.nombre}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  formData.tipoContratacion === 'Nomina Interna' 
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                }`}>
                  {formData.tipoContratacion || 'Nomina Interna'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {formData.departamento || 'Legal'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {empleado.cargo} • Cédula: <strong className="text-slate-200">{empleado.cedula}</strong>
                {formData.rif && ` • RIF: ${formData.rif}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {saveSuccess && (
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-400/40 flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" /> Guardado
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cerrar expediente"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Barra de Pestañas Internas */}
        <div className="flex overflow-x-auto gap-2 p-2 bg-slate-100 border-b border-slate-200 scrollbar-none shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('ficha')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ficha'
                ? 'bg-white text-slate-900 font-black shadow-xs ring-1 ring-slate-300'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <User className="w-4 h-4 text-blue-600" />
            <span>Ficha & Datos Laborales</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documentos')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'documentos'
                ? 'bg-white text-slate-900 font-black shadow-xs ring-1 ring-slate-300'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Archivador Digital ({formData.documentos?.length || 0}/6)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('novedades')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'novedades'
                ? 'bg-white text-slate-900 font-black shadow-xs ring-1 ring-slate-300'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>Libro de Novedades ({formData.novedades?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pagos')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'pagos'
                ? 'bg-white text-slate-900 font-black shadow-xs ring-1 ring-slate-300'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <DollarSign className="w-4 h-4 text-teal-600" />
            <span>Historial de Pagos ({recibosEmpleado.length})</span>
          </button>
        </div>

        {/* 3. Contenido de las Pestañas */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: FICHA GENERAL & DATOS LABORALES */}
          {activeTab === 'ficha' && (
            <form onSubmit={handleGuardarFicha} className="space-y-6">
              
              {/* Sección 1: Datos Personales & Civiles */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" /> Identificación y Contacto
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Cédula de Identidad *</label>
                    <input
                      type="text"
                      required
                      value={formData.cedula}
                      onChange={e => setFormData({ ...formData, cedula: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Número de RIF</label>
                    <input
                      type="text"
                      placeholder="V-12345678-0"
                      value={formData.rif || ''}
                      onChange={e => setFormData({ ...formData, rif: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Teléfono Principal / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="0414-1234567"
                      value={formData.telefono || ''}
                      onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Teléfono de Emergencia</label>
                    <input
                      type="text"
                      placeholder="0412-9876543 (Familiar)"
                      value={formData.telefonoEmergencia || ''}
                      onChange={e => setFormData({ ...formData, telefonoEmergencia: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      placeholder="empleado@romanydelgado.com"
                      value={formData.email || ''}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2 md:col-span-3">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Dirección de Habitación (Domicilio)</label>
                    <input
                      type="text"
                      placeholder="Urb. El Parral, Valencia, Edo. Carabobo"
                      value={formData.direccionHabitacion || ''}
                      onChange={e => setFormData({ ...formData, direccionHabitacion: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Sección 2: Relación Laboral & Contractual */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-600" /> Cargo, Departamento y Contratación
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Cargo Oficial *</label>
                    <input
                      type="text"
                      required
                      value={formData.cargo}
                      onChange={e => setFormData({ ...formData, cargo: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Departamento / Área *</label>
                    <select
                      value={formData.departamento || 'Legal'}
                      onChange={e => setFormData({ ...formData, departamento: e.target.value as DepartamentoPersonal })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Legal">Legal / Asesoría Jurídica</option>
                      <option value="Marketing">Marketing & Redes Sociales</option>
                      <option value="Contabilidad">Contabilidad & Finanzas</option>
                      <option value="Servicios Generales">Servicios Generales & Mantenimiento</option>
                      <option value="Sistemas">Sistemas & Tecnología</option>
                      <option value="Administración">Administración & Jefatura</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Tipo de Contratación *</label>
                    <select
                      value={formData.tipoContratacion || 'Nomina Interna'}
                      onChange={e => setFormData({ ...formData, tipoContratacion: e.target.value as TipoContratacion })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Nomina Interna">Nómina Interna (Personal Fijo)</option>
                      <option value="Honorarios Profesionales">Honorarios Profesionales (Contrato de Servicios)</option>
                      <option value="Servicios Externos">Servicios Externos / Consultoría</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Fecha de Ingreso</label>
                    <input
                      type="date"
                      value={formData.fechaIngreso || ''}
                      onChange={e => setFormData({ ...formData, fechaIngreso: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Sueldo / Honorarios Mensuales ($ USD) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={formData.sueldoMensual}
                      onChange={e => setFormData({ ...formData, sueldoMensual: Number(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-emerald-600 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Frecuencia de Liquidación</label>
                    <select
                      value={formData.frecuenciaPago || 'quincenal'}
                      onChange={e => setFormData({ ...formData, frecuenciaPago: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="quincenal">Quincenal (15 y Último)</option>
                      <option value="mensual_ultimo">Pago Único Mensual (Cobra el último)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 md:col-span-3">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Síntesis Curricular / Resumen del Perfil</label>
                    <textarea
                      rows={2}
                      placeholder="Breve resumen de habilidades, funciones y alcance del servicio prestado en el despacho..."
                      value={formData.resumenPerfil || ''}
                      onChange={e => setFormData({ ...formData, resumenPerfil: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Botón Guardar */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs shadow-md shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Guardar Ficha del Trabajador</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: ARCHIVADOR DIGITAL DE DOCUMENTOS */}
          {activeTab === 'documentos' && (
            <div className="space-y-6">
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900">
                  <strong className="block font-bold mb-0.5">Expediente Legal & Contractual del Personal:</strong>
                  Carga los documentos obligatorios de {empleado.nombre} en formato PDF o Imagen. Quedarán archivados en la nube con acceso permanente para Jefatura.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {standardDocs.map(item => {
                  const doc = (formData.documentos || []).find(d => d.tipo === item.tipo);
                  const isUploading = uploadingDocTipo === item.tipo;

                  return (
                    <div 
                      key={item.tipo} 
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                        doc 
                          ? 'bg-emerald-50/40 border-emerald-300 shadow-xs' 
                          : 'bg-slate-50/70 border-dashed border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h5 className="font-extrabold text-sm text-slate-900">{item.label}</h5>
                          {doc ? (
                            <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Cargado
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded-full">
                              Pendiente
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mb-3">{item.desc}</p>

                        {doc && (
                          <div className="bg-white p-2.5 rounded-xl border border-emerald-200 mb-3 text-xs flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-800 truncate" title={doc.nombre}>
                              {doc.nombre}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">{doc.tamanio || 'PDF'}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                        {doc ? (
                          <>
                            <a
                              href={doc.url || doc.base64}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ver Documento
                            </a>
                            <button
                              type="button"
                              onClick={() => handleEliminarDocumento(item.tipo)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar documento del expediente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <label className={`flex-1 py-2 px-3 bg-white hover:bg-slate-100 text-blue-600 border border-blue-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            {isUploading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Subiendo...
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5" /> Cargar {item.label}
                              </>
                            )}
                            <input
                              type="file"
                              accept=".pdf,image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                  handleSubirDocumento(item.tipo, e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: LIBRO DE NOVEDADES DEL TRABAJADOR */}
          {activeTab === 'novedades' && (
            <div className="space-y-6">
              
              {/* Formulario de Nueva Novedad */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-600" /> Registrar Novedad o Evento Laboral
                </h4>
                <form onSubmit={handleAgregarNovedad} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Tipo de Evento</label>
                      <select
                        value={novedadTipo}
                        onChange={e => setNovedadTipo(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="aumento">Aumento / Ajuste Salarial</option>
                        <option value="permiso">Permiso / Licencia</option>
                        <option value="reposo">Reposo Médico</option>
                        <option value="felicitacion">Felicitación / Reconocimiento</option>
                        <option value="acuerdo">Acuerdo Especial / Bono</option>
                        <option value="observacion">Observación / Llamado de Atención</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Título del Registro</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Ajuste de honorarios a $140 acordado en reunión..."
                        value={novedadTitulo}
                        onChange={e => setNovedadTitulo(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Descripción / Detalles de la Novedad</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Explica detalladamente la causa, acuerdo, condiciones o detalles pertinentes..."
                      value={novedadDesc}
                      onChange={e => setNovedadDesc(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Registrar en Expediente</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Lista Cronológica de Novedades */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                  Historial Cronológico de Novedades ({formData.novedades?.length || 0})
                </h4>

                {(!formData.novedades || formData.novedades.length === 0) ? (
                  <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-slate-200/60">
                    No se han registrado novedades para este trabajador aún.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.novedades.map(nov => (
                      <div key={nov.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              nov.tipo === 'aumento' ? 'bg-emerald-100 text-emerald-800' :
                              nov.tipo === 'felicitacion' ? 'bg-amber-100 text-amber-800' :
                              nov.tipo === 'reposo' || nov.tipo === 'permiso' ? 'bg-blue-100 text-blue-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {nov.tipo}
                            </span>
                            <span className="text-[11px] font-bold text-slate-400">{nov.fecha}</span>
                            <span className="text-[11px] text-slate-400">• Por: {nov.registradoPor}</span>
                          </div>
                          <h5 className="font-extrabold text-sm text-slate-900">{nov.titulo}</h5>
                          <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap">{nov.descripcion}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEliminarNovedad(nov.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                          title="Eliminar novedad"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: HISTORIAL DE PAGOS & RECIBOS EMITIDOS */}
          {activeTab === 'pagos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Recibos Emitidos y Pagados a {empleado.nombre}
                  </h4>
                  <p className="text-[11px] text-slate-500">Historial verificado con timbre oficial del despacho</p>
                </div>
                <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-xs rounded-xl">
                  {recibosEmpleado.length} Recibos Oficiales
                </span>
              </div>

              {recibosEmpleado.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200/60 text-slate-400 text-xs italic">
                  Aún no se han emitido pagos registrados para este empleado.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 font-bold uppercase text-[10px] text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">N° Recibo</th>
                        <th className="py-3 px-4">Período / Quincena</th>
                        <th className="py-3 px-4">Fecha de Pago</th>
                        <th className="py-3 px-4 text-right">Monto Liquidado</th>
                        <th className="py-3 px-4">Ref. Bancaria</th>
                        <th className="py-3 px-4 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recibosEmpleado.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">{r.numeroRecibo}</td>
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            Q{r.quincena} • Mes {r.mes}/{r.anio} ({r.periodoInicio} al {r.periodoFin})
                          </td>
                          <td className="py-3 px-4 text-slate-600">{r.fechaPago || '—'}</td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-black text-emerald-600 block">
                              Bs. {r.netoPagarVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              Ref. $ {r.netoPagarUsd.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 font-medium">
                            {r.referenciaPago || '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => exportarReciboNominaPDF(r)}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px]"
                              title="Descargar PDF oficial con sello"
                            >
                              <Download className="w-3.5 h-3.5" /> PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

        {/* 4. Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Cerrar Expediente
          </button>
        </div>

      </div>
    </div>
  );
}
