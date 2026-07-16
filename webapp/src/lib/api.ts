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
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rd_jwt_token');
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Eludir WAF de Namecheap/EasyWP (waf-block: request) enviando como x-www-form-urlencoded
    if (
      config.method &&
      ['post', 'put', 'patch'].includes(config.method.toLowerCase()) &&
      config.data &&
      typeof config.data === 'object' &&
      !(config.data instanceof URLSearchParams) &&
      !(config.data instanceof FormData)
    ) {
      const params = new URLSearchParams();
      // Guardar también el payload completo en JSON por seguridad
      params.append('payload_json', JSON.stringify(config.data));

      Object.entries(config.data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(
            key,
            typeof value === 'object' ? JSON.stringify(value) : String(value)
          );
        }
      });

      config.data = params;
      if (config.headers) {
        config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
