export interface Parent {
  id: string; // UUID
  nom: string;
  prenom?: string;
  telephone: string;
  email: string;
  role: 'parent';
  adresse?: string | null;
  actif?: boolean;
  dateCreation?: string;
}

