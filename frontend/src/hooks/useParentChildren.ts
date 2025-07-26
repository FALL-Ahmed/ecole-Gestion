import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { Child } from '@/components/parent/ChildSelector';
import apiClient from '@/lib/apiClient';

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
        const response = await apiClient.get(`/parents/${user.id}/children`);
        const childrenData: Child[] = response.data;
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
