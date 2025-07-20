export interface Admin {
  id: number;
  email: string;
  role: 'superadmin';
  nom?: string; // Le nom peut être optionnel pour un superadmin
  prenom?: string;
}

