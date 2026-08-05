import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de Peticiones: Inyecta el token Bearer si existe
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Respuestas: Manejo global de expiración de sesión (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Si la sesión expiró o el token es inválido
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/auth/login' && window.location.pathname !== '/admin/login') {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// Helper: los endpoints de /api/auth/* devuelven el error en "mensaje";
// el resto de la API usa "detail". Úsalo en los catch de las pantallas
// de login/otp/activar/recuperar/restablecer.
export const getErrorMessage = (err, fallback = 'Ocurrió un error inesperado') =>
  err?.response?.data?.mensaje ?? err?.response?.data?.detail ?? fallback;

export default api;