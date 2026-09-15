import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        window.location.href = '/signup';
      } else if (error.response.status === 403) {
        console.error('Permission denied:', error.response.data);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE };
