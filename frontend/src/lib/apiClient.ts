import axios from 'axios';
import { toast } from '@/components/ui/use-toast';

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

// Intercepteur de réponse pour gérer les erreurs globales (ex: 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Si le token est invalide ou expiré
      // On déconnecte l'utilisateur et on le redirige vers la page de connexion.
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Affiche une notification
      toast({
        title: "Session expirée",
        description: "Veuillez vous reconnecter.",
        variant: "destructive",
      });

      // Redirige vers la page de connexion
      // Le `setTimeout` évite des problèmes de rendu avec le toast
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
