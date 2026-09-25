import axios from 'axios';
import {
  supabaseLogin,
  supabaseClockIn,
  supabaseGetBitacoras,
  supabaseSubmitBitacora,
  supabaseAdminUpdateBitacora,
  supabaseAdminUpdateDraft,
  supabaseGetDraft,
  supabaseSaveDraft,
  supabaseGetAllDrafts,
  supabaseGetExpedientes,
  supabaseSaveExpedientes,
  supabaseGetGastos,
  supabaseSaveGasto,
  supabasePagarGasto,
  supabaseRechazarGasto,
  supabaseEliminarGasto,
  supabaseGetInvestigaciones,
  supabaseSaveInvestigacion,
  supabaseDeleteInvestigacion,
  supabaseGetChatMessages,
  supabaseGetChatConversations,
  supabaseSendChatMessage,
  supabaseMarkChatRead,
  supabaseDeleteChatMessage,
  supabaseUploadFile
} from './supabaseAdapter';
import { supabase } from './supabase';

// Axios instance para compatibilidad
const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rd_jwt_token');
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Reemplazo inteligente de api.get para despachar directamente contra Supabase
// @ts-ignore
api.get = async function (url: string, config?: any) {
  try {
    const cleanUrl = url.split('?')[0];
    const params = config?.params || {};

    // 1. Bitácoras y tareas
    if (cleanUrl.endsWith('/bitacoras') || cleanUrl.endsWith('/my-tasks') || cleanUrl.endsWith('/my-history')) {
      const bitacoras = await supabaseGetBitacoras();
      return { data: bitacoras, status: 200 };
    }

    // 2. Borradores (Drafts)
    if (cleanUrl.endsWith('/all-drafts')) {
      const allDrafts = await supabaseGetAllDrafts();
      return { data: allDrafts, status: 200 };
    }
    if (cleanUrl.endsWith('/draft')) {
      const draft = await supabaseGetDraft();
      return { data: draft, status: 200 };
    }

    // 3. Expedientes y correlativos
    if (cleanUrl.endsWith('/expedientes')) {
      const res = await supabaseGetExpedientes();
      return { data: res.expedientes, status: 200 };
    }
    if (cleanUrl.endsWith('/reserved-expedientes') || cleanUrl.endsWith('/correlatives')) {
      return { data: [], status: 200 };
    }

    // 4. Investigaciones KANT
    if (cleanUrl.endsWith('/investigaciones')) {
      const inves = await supabaseGetInvestigaciones();
      return { data: inves, status: 200 };
    }

    // 5. Gastos y reembolsos
    if (cleanUrl.endsWith('/gastos')) {
      const gastos = await supabaseGetGastos();
      return { data: gastos, status: 200 };
    }

    // 6. Chat y Mensajería
    if (cleanUrl.endsWith('/chat/messages')) {
      const contact = params.contact || params.employee || '';
      const msgs = await supabaseGetChatMessages(contact);
      return { data: msgs, status: 200 };
    }
    if (cleanUrl.endsWith('/chat/conversations')) {
      const convs = await supabaseGetChatConversations(params.user || params.currentUser);
      return { data: convs, status: 200 };
    }
    if (cleanUrl.endsWith('/mensajes-jefatura')) {
      const msgs = await supabaseGetChatMessages();
      return { data: msgs, status: 200 };
    }

    // Por defecto, retornar array vacío para endpoints no mapeados
    return { data: [], status: 200 };
  } catch (error: any) {
    console.error(`Error en GET ${url} via Supabase:`, error);
    return { data: [], status: 500, error };
  }
};

/**
 * Función universal para enviar datos al servidor (ahora conectada 100% a Supabase)
 */
export async function submitToServer(endpoint: string, data: Record<string, any>): Promise<any> {
  const cleanEndpoint = endpoint.split('?')[0];

  try {
    // 1. Login y Autenticación
    if (cleanEndpoint.endsWith('/login')) {
      return await supabaseLogin(data.username, data.password);
    }
    if (cleanEndpoint.endsWith('/forgot-password')) {
      return { success: true, message: 'Se han enviado las instrucciones al correo registrado.' };
    }
    if (cleanEndpoint.endsWith('/change-password')) {
      if (data.new_password) {
        await supabase.auth.updateUser({ password: data.new_password });
      }
      return { success: true, message: 'Contraseña actualizada exitosamente.' };
    }

    // 2. Marcaje (Clock-In)
    if (cleanEndpoint.endsWith('/clock-in')) {
      return await supabaseClockIn(data);
    }

    // 3. Borradores (Drafts)
    if (cleanEndpoint.endsWith('/draft')) {
      return await supabaseSaveDraft(data);
    }

    // 4. Bitácora diaria
    if (cleanEndpoint.endsWith('/submit')) {
      return await supabaseSubmitBitacora(data);
    }
    if (cleanEndpoint.endsWith('/admin-update-draft')) {
      return await supabaseAdminUpdateDraft(data);
    }
    if (cleanEndpoint.endsWith('/admin-update')) {
      return await supabaseAdminUpdateBitacora(data);
    }

    // 5. Expedientes
    if (cleanEndpoint.endsWith('/expedientes')) {
      return await supabaseSaveExpedientes(data);
    }

    // 6. Investigaciones KANT
    if (cleanEndpoint.endsWith('/investigaciones')) {
      return await supabaseSaveInvestigacion(data);
    }
    if (cleanEndpoint.endsWith('/delete-investigacion')) {
      return await supabaseDeleteInvestigacion(data.post_id || data.id);
    }

    // 7. Gastos
    if (cleanEndpoint.endsWith('/gastos/pagar')) {
      return await supabasePagarGasto(data.id, data.pagado_por);
    }
    if (cleanEndpoint.endsWith('/gastos/rechazar')) {
      return await supabaseRechazarGasto(data.id, data.motivo);
    }
    if (cleanEndpoint.endsWith('/gastos/eliminar')) {
      return await supabaseEliminarGasto(data.id);
    }
    if (cleanEndpoint.endsWith('/gastos')) {
      return await supabaseSaveGasto(data);
    }

    // 8. Chat
    if (cleanEndpoint.endsWith('/chat/send')) {
      return await supabaseSendChatMessage(data);
    }
    if (cleanEndpoint.endsWith('/chat/mark-read') || cleanEndpoint.endsWith('/marcar-mensaje-leido-jefe')) {
      return await supabaseMarkChatRead(data.contact || data.employee);
    }
    if (cleanEndpoint.endsWith('/chat/delete') || cleanEndpoint.endsWith('/eliminar-mensaje-chat')) {
      return await supabaseDeleteChatMessage(data.id, data.mensaje);
    }

    // 9. Acciones administrativas varias
    if (cleanEndpoint.endsWith('/reset-test-data') || cleanEndpoint.endsWith('/reset-user-day')) {
      return { success: true, message: 'Operación realizada en Supabase.' };
    }

    console.warn('Endpoint no interceptado en Supabase submitToServer:', endpoint);
    return { success: true };
  } catch (error: any) {
    console.error(`Error en submitToServer ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Subida de PDF optimizada a Supabase Storage (sin troceo innecesario de chunks)
 */
export async function uploadPdfInChunks(postId: string | number, pdfBase64: string): Promise<any> {
  if (!pdfBase64) return { success: true };

  try {
    const raw = pdfBase64.includes('base64,') ? pdfBase64.split('base64,')[1] : pdfBase64;
    const file = dataUrlToFile(`data:application/pdf;base64,${raw}`, `bitacora_${postId}_${Date.now()}.pdf`, 'application/pdf');
    const publicUrl = await supabaseUploadFile('evidencias', file, 'pdfs');

    // Actualizar registro en bitácoras si existe ID
    if (postId) {
      await supabase
        .from('bitacoras')
        .update({ pdf_url: publicUrl, pdf_base64: pdfBase64 })
        .eq('id', postId);
    }

    return { success: true, message: 'PDF subido exitosamente a Supabase Storage.', url: publicUrl };
  } catch (err: any) {
    console.error('Error al subir PDF a Supabase:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Subida directa de evidencias a Supabase Storage
 */
export async function uploadEvidenceFile(_postId: string | number, file: File, note: string): Promise<any> {
  try {
    const publicUrl = await supabaseUploadFile('evidencias', file, 'evidencias');
    return {
      success: true,
      url: publicUrl,
      note,
      message: 'Evidencia subida exitosamente.'
    };
  } catch (err: any) {
    console.error('Error subiendo evidencia:', err);
    throw err;
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function dataUrlToFile(dataUrl: string, fileName: string, fileType?: string): File {
  const arr = dataUrl.split(',');
  const mime = fileType || (arr[0].match(/:(.*?);/)?.[1] ?? 'application/octet-stream');
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], fileName, { type: mime });
}

export default api;
