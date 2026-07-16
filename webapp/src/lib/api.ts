import axios from 'axios';

// URL base de tu instalación de WordPress en EasyWP
const BASE_URL = 'https://romanydelgado.com/wp-json';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token JWT a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rd_jwt_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
