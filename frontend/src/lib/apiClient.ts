import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
});

// Intercepteur de requête pour ajouter le token d'authentification
apiClient.interceptors.request.use(
  (config) => {
    // Récupérer le token depuis le localStorage
    const token = localStorage.getItem('token');

    // Si le token existe, l'ajouter à l'en-tête Authorization
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
