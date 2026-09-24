import axios from 'axios';

const localApiHost = typeof window !== 'undefined' && window.location.hostname === '127.0.0.1'
  ? '127.0.0.1'
  : 'localhost';
const configuredApiBase = import.meta.env.VITE_API_URL;
const API_BASE = configuredApiBase
  ? configuredApiBase.replace(/^http:\/\/(localhost|127\.0\.0\.1)(?=:8000)/, `http://${localApiHost}`)
  : `http://${localApiHost}:8000/api`;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const csrfCookie = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('csrftoken='));
  if (csrfCookie) {
    config.headers['X-CSRFToken'] = decodeURIComponent(csrfCookie.split('=')[1]);
  }
  return config;
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
