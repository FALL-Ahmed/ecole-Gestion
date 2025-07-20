import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_URL}/api`;

interface Child {
  id: number;
  prenom: string;
  nom: string;
  classe: {
    id: number;
    nom: string;
  };
}

export function useParentChildren() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState<boolean>(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadChildren = async () => {
      if (!user?.id || user.role !== 'parent') {
        setLoading(false);
        setError(t.common.accessDenied);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/parents/${user.id}/children`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const childrenData: Child[] = await response.json();
        setChildren(childrenData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        toast({
          title: t.common.errorLoading,
          description: `${t.parent.grades.errorFetchChildren} ${errorMessage}`,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    loadChildren();
  }, [user, t]);

  return { children, loading, error };
}

