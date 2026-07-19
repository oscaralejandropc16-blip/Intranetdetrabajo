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
  const CHUNK_SIZE = 40000; // 40 KB por fragmento para evitar ModSecurity WAF
  const totalChunks = Math.ceil(pdfBase64.length / CHUNK_SIZE);
  
  let lastResponse = null;
  for (let i = 0; i < totalChunks; i++) {
    const chunkData = pdfBase64.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    
    // Enviar como JSON puro ahora que eliminamos el interceptor problemático
    lastResponse = await api.post('/rd-intranet/v1/upload-pdf', {
      post_id: postId,
      chunk_index: i,
      total_chunks: totalChunks,
      chunk_data: chunkData
    });
    
    if (i < totalChunks - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  return lastResponse?.data;
}

export default api;
