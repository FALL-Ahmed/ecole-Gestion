export type UserRole = 'admin' | 'professeur' | 'eleve' | 'superadmin' | 'parent';

export interface User {
  id: number | string; // L'ID du parent est un UUID (string)
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
  genre?: 'masculin' | 'feminin' | null;
  adresse?: string | null;
  tuteurNom?: string | null;
  tuteurTelephone?: string | null;
  photoUrl?: string | null;
  parentId?: string;
  actif: boolean;
  inscriptions?: Inscription[];
  parentEmail?: string;
}

export interface Classe {
  id: number;
  nom: string;
  niveau: 'primaire' | 'collège' | 'lycée';
  annee_scolaire_id: number;
  inscriptions?: Inscription[];
}

export interface AnneeScolaire {
  id: number;
  libelle: string;
}

export interface Inscription {
  id: number;
  utilisateur: User;
  classe: Classe;
  annee_scolaire: AnneeScolaire;
  date_inscription: string;
  actif: boolean;
}

