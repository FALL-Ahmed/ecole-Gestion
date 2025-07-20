import axios from 'axios';

// VITE_API_URL doit être l'URL de base de votre backend.
// Exemples :
// - Local: http://localhost:3000
// - Production (Hostinger): https://api.madrastak.net
const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Cet "intercepteur" ajoute automatiquement le token d'authentification
// à chaque requête sortante. Plus besoin de le faire manuellement !
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

