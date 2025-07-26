export interface ChildDto {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  classe?: {
    id: number;
    nom: string;
  };
  anneeScolaire?: {
    id: number;
    libelle: string;
  };
  blocId: number;
  photoUrl?: string | null; // Champ optionnel pour la photo
}