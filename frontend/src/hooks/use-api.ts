// src/hooks/use-api.ts
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  showToast?: boolean;
}

export function useApi() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  const request = async <T>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
    const {
      method = 'GET',
      headers = {},
      body,
      showToast = true
    } = options;

    setIsLoading(true);
    setError(null);

    try {
      const url = `${BASE_URL}/${endpoint.replace(/^\//, '')}`;
      const config: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        credentials: 'include'
      };

      if (body) {
        config.body = JSON.stringify(body);
      }

      const response = await fetch(url, config);

      if (!response.ok) {
        let errorMessage = t.apiErrors.default;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `${t.apiErrors.status} ${response.status}`;
        }

        throw new Error(errorMessage);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as unknown as T;
      }

      return await response.json() as T;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t.apiErrors.default;
      setError(errorMessage);
      
      if (showToast) {
        toast({
          title: t.common.error,
          description: errorMessage,
          variant: 'destructive'
        });
      }

      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const get = async <T>(endpoint: string, params?: Record<string, any>, options?: Omit<ApiOptions, 'method'>): Promise<T> => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request<T>(`${endpoint}${queryString}`, { ...options, method: 'GET' });
  };

  const post = async <T>(endpoint: string, data: any, options?: Omit<ApiOptions, 'method' | 'body'>): Promise<T> => {
    return request<T>(endpoint, { ...options, method: 'POST', body: data });
  };

  const put = async <T>(endpoint: string, data: any, options?: Omit<ApiOptions, 'method' | 'body'>): Promise<T> => {
    return request<T>(endpoint, { ...options, method: 'PUT', body: data });
  };

  const patch = async <T>(endpoint: string, data: any, options?: Omit<ApiOptions, 'method' | 'body'>): Promise<T> => {
    return request<T>(endpoint, { ...options, method: 'PATCH', body: data });
  };

  const del = async <T>(endpoint: string, options?: Omit<ApiOptions, 'method'>): Promise<T> => {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  };

  return {
    isLoading,
    error,
    get,
    post,
    put,
    patch,
    delete: del,
    resetError: () => setError(null)
  };
}