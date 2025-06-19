
export interface Chapter {
  id: number;
  titre: string; // Changed from title
  description: string;
 matiere_id: number;
  classe_id: number;
  date_debut_prevue: string; // Changed from plannedStartDate
  date_fin_prevue: string;   // Changed from plannedEndDate
  date_debut_reel?: string | null;   // Changed from actualStartDate, made nullable
  date_fin_reel?: string | null;     // Changed from actualEndDate, made nullable
  statut: 'planifié' | 'en_cours' | 'terminé'; // Changed from status
  // materials: number; // Removed as it's not in the provided DB schema
}

// Optional: Interface for display purposes if you fetch and join matiere/classe names
export interface ChapterDisplay extends Chapter {
  subjectName?: string;
  className?: string;
}

export interface Matiere {
  id: number;
  nom: string;
}

export interface Classe {
  id: number;
  nom: string;
}

