import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_URL}/api`;

// --- Interfaces (can be moved to a central types file) ---
interface AnneeAcademique { id: number; libelle: string; }
interface Classe { id: number; nom: string; }
interface Matiere { id: number; nom: string; }
interface Trimestre { id: number; nom: string; }
interface Affectation { id: number; classe: Classe; matiere: Matiere; }

export function useProfessorData() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [activeAnnee, setActiveAnnee] = useState<AnneeAcademique | null>(null);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [trimestres, setTrimestres] = useState<Trimestre[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);

      try {
        // 1. Get active academic year from configuration
        const configRes = await fetch(`${API_BASE_URL}/configuration`);
        const configData = await configRes.json();
        const anneeId = configData?.annee_scolaire?.id || configData[0]?.annee_scolaire?.id;
        if (!anneeId) throw new Error(t.common.missingConfig);

        // 2. Fetch all required data in parallel
        const [anneeRes, affectationsRes, trimestresRes] = await Promise.all([
          fetch(`${API_BASE_URL}/annees-academiques/${anneeId}`),
          fetch(`${API_BASE_URL}/affectations?professeur_id=${user.id}&annee_scolaire_id=${anneeId}&include=classe,matiere`),
          fetch(`${API_BASE_URL}/trimestres?anneeScolaireId=${anneeId}`),
        ]);

        setActiveAnnee(await anneeRes.json());
        setAffectations(await affectationsRes.json());
        setTrimestres(await trimestresRes.json());

      } catch (err) {
        const errorMessage = (err as Error).message;
        setError(errorMessage);
        toast({ title: t.common.error, description: errorMessage, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [user, t]);

  return { activeAnnee, affectations, trimestres, isLoading, error };
}

