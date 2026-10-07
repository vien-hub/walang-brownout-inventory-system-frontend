import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Send the login token with every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the token expired or was removed, go back to the login page
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthCall = url.includes('/login') || url.includes('/register');
    if (error.response?.status === 401 && !isAuthCall && localStorage.getItem('auth_token')) {
      ['auth_token', 'user_authenticated', 'current_user'].forEach((k) => localStorage.removeItem(k));
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
