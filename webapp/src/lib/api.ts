import axios from 'axios';

// URL base de tu instalación de WordPress en EasyWP
const BASE_URL = 'https://romanydelgado.com/wp-json';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token JWT a todas las peticiones de Axios (GET principalmente)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rd_jwt_token');
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de respuesta para capturar 401/403 de sesión o tokens falsos y redirigir al login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const token = localStorage.getItem('rd_jwt_token');

    // Si el servidor indica no autorizado o sesión inválida (y estamos usando un token falso o caducado)
    if (
      (status === 401 || token === 'dev-token-12345') &&
      !window.location.pathname.includes('/login') &&
      !error.config?.url?.includes('/jwt-auth/v1/token')
    ) {
      console.warn('Sesión caducada o token inválido detectado. Redirigiendo a Login...');
      localStorage.removeItem('rd_jwt_token');
      localStorage.removeItem('rd_user_name');
      localStorage.removeItem('rd_user_email');
      localStorage.removeItem('rd_is_admin');
      window.location.href = '/login';
      return new Promise(() => {}); // Detener propagación de errores adicionales hacia componentes
    }

    return Promise.reject(error);
  }
);

/**
 * Función universal para enviar datos al servidor usando fetch nativo.
 * fetch nativo con FormData NO es bloqueado por el WAF de Namecheap,
 * mientras que Axios sí lo es por las cabeceras adicionales que inyecta.
 * Confirmado con prueba directa desde consola del navegador.
 */
export async function submitToServer(endpoint: string, data: Record<string, any>, retries = 3): Promise<any> {
  const token = localStorage.getItem('rd_jwt_token');
  const formData = new FormData();

  // Convertir cada campo del objeto a FormData
  Object.entries(data).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'object') {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  });

  let lastErr: any;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        let errorMsg = `Error del servidor: ${response.status}`;
        try {
          const errorJson = await response.json();
          if (errorJson.message) errorMsg = `${response.status}: ${errorJson.message}`;
        } catch(e) {}
        throw new Error(errorMsg);
      }

      return await response.json();
    } catch (e: any) {
      lastErr = e;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 800 * attempt));
      }
    }
  }
  throw lastErr;
}

export async function uploadPdfInChunks(postId: number, pdfBase64: string): Promise<any> {
  if (!pdfBase64 || postId <= 0) return;
  
  // Limpiar el encabezado data: si existe (para evitar DOMException en atob)
  const base64Data = pdfBase64.includes('base64,') ? pdfBase64.split('base64,')[1] : pdfBase64;
  
  // Dividir en fragmentos seguros de 256 KB para evitar bloqueos del WAF o timeouts
  const chunkSize = 256 * 1024;
  const totalChunks = Math.ceil(base64Data.length / chunkSize);

  if (totalChunks > 1) {
    for (let i = 0; i < totalChunks; i++) {
      const chunk = base64Data.substring(i * chunkSize, (i + 1) * chunkSize);
      await submitToServer('/rd-intranet/v1/upload-pdf', {
        post_id: postId,
        chunk_base64: chunk,
        chunk_index: i,
        total_chunks: totalChunks
      });
    }
    return { success: true, message: 'PDF subido por partes exitosamente.' };
  } else {
    // Si es un archivo pequeño, enviarlo directo con reintentos
    return await submitToServer('/rd-intranet/v1/upload-pdf', {
      post_id: postId,
      chunk_base64: base64Data,
      chunk_index: 0,
      total_chunks: 1
    });
  }
}

export async function uploadEvidenceFile(postId: number, file: File, note: string): Promise<any> {
  const formData = new FormData();
  formData.append('post_id', String(postId));
  formData.append('evidence_file', file);
  formData.append('note', note);
  
  const token = localStorage.getItem('rd_jwt_token');
  
  const response = await fetch(`${BASE_URL}/rd-intranet/v1/upload-evidence`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Error al subir evidencia');
  }
  
  return await response.json();
}

export default api;
