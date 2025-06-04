// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

export type Role = 'admin' | 'professeur' | 'eleve'; // Match enum UserRole
export type Genre = 'garçon' | 'fille';

export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    // Redirection éventuelle
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, setUser, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
