// Fichier g�n�r� automatiquement - types.ts
export interface Classe {
  id: string;
  nom: string;
  niveau?: string;
}

export interface Matiere {
  id: string;
  nom: string;
}

export interface AnneeScolaire {
  id: string;
  libelle: string;
  date_debut: string;
  date_fin: string;
}

export interface Professeur {
  id: string;
  nom: string;
  prenom: string;
  role?: string;
}

export interface Coefficient {
  id: string;
  classe: Classe;
  matiere: Matiere;
  coefficient: number;
}

export interface Trimestre {
  id: string;
  nom: string;
  date_debut: string;
  date_fin: string;
  anneeScolaire: {
    id: number;
    libelle: string;
    date_debut: string;
    date_fin: string;
  };
}

export interface Affectation {
  id: string;
  professeur: Professeur;
  matiere: Matiere;
  classe: Classe;
  annee_scolaire: AnneeScolaire;
}

export interface GroupedAffectation {
  professeur: Professeur;
  matieres: {
    [matiereId: string]: {
      matiere: Matiere;
      classes: Classe[];
      annee: AnneeScolaire;
    };
  };
}