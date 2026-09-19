import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      const url = error.config?.url || '';
      
      if (url.includes('/users/me/') || url.includes('/cart/') || url.includes('/notifications/')) {
        return Promise.reject(error);
      }

      if (error.response.status === 401 && !isRedirecting && !window.location.pathname.includes('/signup')) {
        isRedirecting = true;
        window.location.href = '/account';
        setTimeout(() => { isRedirecting = false; }, 2000);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE };
