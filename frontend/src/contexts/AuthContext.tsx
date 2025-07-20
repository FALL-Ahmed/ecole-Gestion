import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { User } from '@/types/user';
import { Parent } from '@/types/parent';
import { Admin } from '@/types/admin';

type AuthUser = User | Parent | Admin;

interface AuthContextType {
  user: AuthUser | null;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
  isParent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');

        if (storedUser && storedToken) {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && parsedUser.id && parsedUser.email && parsedUser.role) {
            setUser(parsedUser as AuthUser);
            setToken(storedToken);
          }
        }
      } catch (error) {
        console.error("Erreur lors de l'initialisation de l'authentification:", error);
        // Nettoyage en cas d'erreur
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('portalType'); // Vider le portail à la déconnexion
  }, []);

  const value = useMemo(() => {
    const isAuthenticated = !!token;
    const isParent = user?.role === 'parent';
    return {
      user,
      setUser,
      token,
      setToken,
      logout,
      isAuthenticated,
      isLoading,
      isParent,
    };
  }, [user, token, isLoading, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
}