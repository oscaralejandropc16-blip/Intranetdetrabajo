import axios from 'axios';

// URL base de tu instalación de WordPress en EasyWP
const BASE_URL = 'https://romanydelgado.com/wp-json';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token JWT y eludir WAF convirtiendo POST/PUT a x-www-form-urlencoded
// Interceptor para agregar el token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rd_jwt_token');
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Eludir WAF convirtiendo POST/PUT a x-www-form-urlencoded
    if ((config.method === 'post' || config.method === 'put') && config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      config.data = `payload_json=${encodeURIComponent(JSON.stringify(config.data))}`;
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

export async function uploadPdfInChunks(postId: number, pdfBase64: string): Promise<any> {
  if (!pdfBase64 || postId <= 0) return;
  
  // Limpiar el encabezado data: si existe (para evitar DOMException en atob)
  const base64Data = pdfBase64.includes('base64,') ? pdfBase64.split('base64,')[1] : pdfBase64;
  
  // Decodificar Base64 a Blob
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'application/pdf' });
  
  // Usar FormData puro
  const formData = new FormData();
  formData.append('post_id', String(postId));
  formData.append('pdf_file', blob, `bitacora_${postId}.pdf`);
  
  const token = localStorage.getItem('rd_jwt_token');
  
  // Usamos fetch nativo en lugar de Axios para garantizar que el navegador establezca el Content-Type multipart/form-data correcto con su 'boundary'
  const response = await fetch(`${api.defaults.baseURL}/rd-intranet/v1/upload-pdf`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Error al subir PDF');
  }
  
  return await response.json();
}

export async function uploadEvidenceFile(postId: number, file: File, note: string): Promise<any> {
  const formData = new FormData();
  formData.append('post_id', String(postId));
  formData.append('evidence_file', file);
  formData.append('note', note);
  
  const token = localStorage.getItem('rd_jwt_token');
  
  const response = await fetch(`${api.defaults.baseURL}/rd-intranet/v1/upload-evidence`, {
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
