// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

export type Role = 'admin' | 'professeur' | 'eleve';
export type Genre = 'garçon' | 'fille';

export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: Role; // 'admin', 'professeur', 'eleve'
  genre?: Genre | null;
  adresse?: string | null;
  tuteurNom?: string | null;
  tuteurTelephone?: string | null;
  photoUrl?: string | null;
  classe?: {
    id: number;
    nom: string;
  } | null;
  actif?: boolean;
  dateInscription?: string | null;
}

interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean; // Ajout de l'état de chargement
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Initialisé à true

  useEffect(() => {
    const loadUserFromLocalStorage = () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error("Erreur lors de la lecture de l'utilisateur depuis localStorage:", error);
        localStorage.removeItem('user'); // Nettoyer les données corrompues
      } finally {
        setIsLoading(false); // Indique que le chargement initial est terminé
      }
    };

    loadUserFromLocalStorage();
  }, []);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    // Une redirection pourrait être gérée ici ou dans les composants consommateurs
  };

  const isAuthenticated = !!user; // true si user n'est pas null

  return (
    <AuthContext.Provider value={{ user, setUser, logout, isAuthenticated, isLoading }}>
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