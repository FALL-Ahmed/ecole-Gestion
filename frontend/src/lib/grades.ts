// grades.ts
/**
 * Fichier centralisé pour les calculs de moyennes
 */

// --- Interfaces basées sur vos entités TypeORM ---
export interface Note {
  id: number;
  note: number;
  evaluation: {
    id: number;
    matiere_id: number;
    matiere?: {
      id: number;
      nom: string;
    };
    type: 'Devoir' | 'Composition';
    classe_id: number;
    date_eval: string;
    trimestre: number;
    libelle?: string;
  };
  etudiant: {
    id: number;
    nom?: string;
    prenom?: string;
  };
}

export interface Evaluation {
  id: number;
  type: string;
  matiere_id: number;
  classe_id: number;
  date_eval: string;
  trimestre: number;
  libelle?: string;
}

export interface Trimestre {
  id: number;
  nom: string;
  date_debut: string;
  date_fin: string;
  anneeScolaire?: {
    id: number;
    libelle?: string;
  };
}

export interface Coefficient {
  id: number;
  matiere_id: number;
  classe_id: number;
  coefficient: number;
}

/**
 * Configuration des types d'évaluations par trimestre
 */
export const termEvaluationMap = {
  'Trimestre 1': {
    devoir1: 'Devoir 1',
    devoir2: 'Devoir 2',
    composition: 'Composition 1',
  },
  'Trimestre 2': {
    devoir1: 'Devoir 3',
    devoir2: 'Devoir 4',
    composition: 'Composition 2',
  },
  'Trimestre 3': {
    devoir1: 'Devoir 5',
    devoir2: 'Devoir 6',
    composition: 'Composition 3',
  },
};

/**
 * Calcule la moyenne d'une matière pour un trimestre donné
 */
export function calculateSubjectAverage(
  studentId: number,
  subjectId: number,
  termId: number,
  allNotes: Note[],
  allTrimestres: Trimestre[]
): {
  finalAverage: number;
  weightedHomeworkAverage?: number;
  devoir1Note: number | null;
  devoir2Note: number | null;
  compositionNote: number | null;
} {
  const currentTerm = allTrimestres.find(t => t.id === termId);
  if (!currentTerm || !currentTerm.anneeScolaire) {
    return {
      finalAverage: 0,
      devoir1Note: null,
      devoir2Note: null,
      compositionNote: null
    };
  }

  const currentTrimestreNumero = parseInt(currentTerm.nom.replace(/\D/g, ''), 10);
  if (isNaN(currentTrimestreNumero)) {
    return {
      finalAverage: 0,
      devoir1Note: null,
      devoir2Note: null,
      compositionNote: null
    };
  }

  // Filtrer les notes de l'élève pour la matière et le trimestre courant
  const studentNotesForSubjectCurrentTerm = allNotes.filter(note =>
    note.etudiant.id === studentId &&
    note.evaluation.matiere_id === subjectId &&
    note.evaluation.trimestre === termId
  );

  const devoirsCurrentTerm = studentNotesForSubjectCurrentTerm
    .filter(note => (note.evaluation.libelle || note.evaluation.type).toLowerCase().includes('devoir'))
    .map(n => n.note);
  
  const compositionCurrentTerm = studentNotesForSubjectCurrentTerm.find(note =>
    (note.evaluation.libelle || note.evaluation.type).toLowerCase().includes('composition')
  )?.note ?? null;

  const avgDevoirsCurrentTerm = devoirsCurrentTerm.length > 0 
    ? devoirsCurrentTerm.reduce((a, b) => a + b, 0) / devoirsCurrentTerm.length 
    : null;

  // Calcul de la moyenne finale pondérée
  let somme = 0;
  let poids = 0;

  if (currentTrimestreNumero === 1) {
    if (avgDevoirsCurrentTerm !== null) { somme += avgDevoirsCurrentTerm * 3; poids += 3; }
    if (compositionCurrentTerm !== null) { somme += compositionCurrentTerm * 1; poids += 1; }
  } else if (currentTrimestreNumero === 2) {
    // Récupérer la note de composition du trimestre 1
    let compoT1Note: number | null = null;
    const term1 = allTrimestres.find(t => t.nom === 'Trimestre 1' && t.anneeScolaire?.id === currentTerm.anneeScolaire?.id);
    if (term1) {
      compoT1Note = allNotes.find(n =>
        n.etudiant.id === studentId &&
        n.evaluation.matiere_id === subjectId &&
        n.evaluation.trimestre === term1.id &&
        (n.evaluation.libelle || n.evaluation.type).toLowerCase().includes('composition')
      )?.note ?? null;
    }

    // Appliquer la pondération T2: (Devoirs T2 * 3) + (Compo T2 * 2) + (Compo T1 * 1)
    if (avgDevoirsCurrentTerm !== null) { somme += avgDevoirsCurrentTerm * 3; poids += 3; }
    if (compositionCurrentTerm !== null) { somme += compositionCurrentTerm * 2; poids += 2; }
    if (compoT1Note !== null) { somme += compoT1Note * 1; poids += 1; }
  } else if (currentTrimestreNumero === 3) {
    // Récupérer les notes de composition des trimestres 1 et 2
    let compoT1Note: number | null = null;
    const term1 = allTrimestres.find(t => t.nom === 'Trimestre 1' && t.anneeScolaire?.id === currentTerm.anneeScolaire?.id);
    if (term1) {
      compoT1Note = allNotes.find(n =>
        n.etudiant.id === studentId &&
        n.evaluation.matiere_id === subjectId &&
        n.evaluation.trimestre === term1.id &&
        (n.evaluation.libelle || n.evaluation.type).toLowerCase().includes('composition')
      )?.note ?? null;
    }

    let compoT2Note: number | null = null;
    const term2 = allTrimestres.find(t => t.nom === 'Trimestre 2' && t.anneeScolaire?.id === currentTerm.anneeScolaire?.id);
    if (term2) {
      compoT2Note = allNotes.find(n =>
        n.etudiant.id === studentId &&
        n.evaluation.matiere_id === subjectId &&
        n.evaluation.trimestre === term2.id &&
        (n.evaluation.libelle || n.evaluation.type).toLowerCase().includes('composition')
      )?.note ?? null;
    }

    // Appliquer la pondération T3: (Devoirs T3 * 3) + (Compo T3 * 3) + (Compo T2 * 2) + (Compo T1 * 1)
    if (avgDevoirsCurrentTerm !== null) { somme += avgDevoirsCurrentTerm * 3; poids += 3; }
    if (compositionCurrentTerm !== null) { somme += compositionCurrentTerm * 3; poids += 3; }
    if (compoT2Note !== null) { somme += compoT2Note * 2; poids += 2; }
    if (compoT1Note !== null) { somme += compoT1Note * 1; poids += 1; }
  }

  const finalAverage = poids > 0 ? parseFloat((somme / poids).toFixed(2)) : 0;

  return {
    finalAverage,
    weightedHomeworkAverage: avgDevoirsCurrentTerm !== null ? parseFloat(avgDevoirsCurrentTerm.toFixed(2)) : undefined,
    devoir1Note: devoirsCurrentTerm.length > 0 ? devoirsCurrentTerm[0] : null,
    devoir2Note: devoirsCurrentTerm.length > 1 ? devoirsCurrentTerm[1] : null,
    compositionNote: compositionCurrentTerm
  };
}

/**
 * Calcule la moyenne générale pondérée
 */
export function calculateGeneralAverage(subjects: {
  finalAverage: number;
  coefficient: number;
  subjectName: string;
}[]): number {
  if (subjects.length === 0) return 0;

  const { totalPoints, totalCoefficients } = subjects.reduce(
    (acc, subject) => ({
      totalPoints: acc.totalPoints + (subject.finalAverage * subject.coefficient),
      totalCoefficients: acc.totalCoefficients + subject.coefficient
    }),
    { totalPoints: 0, totalCoefficients: 0 }
  );

  return totalCoefficients > 0 
    ? parseFloat((totalPoints / totalCoefficients).toFixed(2))
    : 0;
}