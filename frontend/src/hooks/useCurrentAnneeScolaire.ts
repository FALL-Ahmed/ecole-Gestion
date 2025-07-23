import { useState, useEffect } from 'react';
import api from '@/lib/apiClient';
import { AnneeScolaire } from '@/types/user'; // Assurez-vous que ce type existe
import { useLanguage } from '@/contexts/LanguageContext';
import { AxiosError } from 'axios';

export function useCurrentAnneeScolaire() {
  const { t } = useLanguage();
  const [anneeScolaire, setAnneeScolaire] = useState<AnneeScolaire | null>(null);
  const [loadingAnnee, setLoading] = useState(true);
  const [errorAnnee, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentAnneeScolaire = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/configuration');
        const configData = response.data;

        // La réponse peut être un objet ou un tableau d'objets
        const annee = configData?.annee_scolaire || (Array.isArray(configData) && configData.length > 0 ? configData[0]?.annee_scolaire : null);

        if (annee) {
          setAnneeScolaire(annee);
        } else {
          throw new Error(t.common.activeYearNotFound);
        }
      } catch (err) {
        const defaultError = t.common.errorLoadingYear;
        if (err instanceof AxiosError && err.response?.status === 404) {
          setError(t.common.missingConfig);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(defaultError);
        }
        console.error("Erreur lors de la récupération de l'année scolaire active:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentAnneeScolaire();
  }, [t]);

  return { anneeScolaire, loadingAnnee, errorAnnee };
}
