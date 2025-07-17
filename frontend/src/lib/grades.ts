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
  if (!currentTerm) {
    return {
      finalAverage: 0,
      weightedHomeworkAverage: 0,
      devoir1Note: null,
      devoir2Note: null,
      compositionNote: null
    };
  }

  const termName = currentTerm.nom;
  const currentTermConfig = termEvaluationMap[termName as keyof typeof termEvaluationMap];
  if (!currentTermConfig) {
    return {
      finalAverage: 0,
      weightedHomeworkAverage: 0,
      devoir1Note: null,
      devoir2Note: null,
      compositionNote: null
    };
  }

  // Filtrer les notes de l'élève pour cette matière et ce trimestre
  const studentNotes = allNotes.filter(note => 
    note.etudiant.id === studentId && 
    note.evaluation.matiere_id === subjectId &&
    note.evaluation.trimestre === termId
  );

  let devoir1Note: number | null = null;
  let devoir2Note: number | null = null;
  let compositionNote: number | null = null;

  // Trouver les notes pour chaque type d'évaluation
 studentNotes.forEach(note => {
  const evaluationLibelle = note.evaluation.libelle || note.evaluation.type;
  if (evaluationLibelle === currentTermConfig.devoir1) {
    devoir1Note = note.note;
  } else if (evaluationLibelle === currentTermConfig.devoir2) {
    devoir2Note = note.note;
  } else if (evaluationLibelle === currentTermConfig.composition) {
    compositionNote = note.note;
  }
});

  // Si toutes les notes ne sont pas disponibles, retourner 0
  if (devoir1Note === null || devoir2Note === null || compositionNote === null) {
    return {
      finalAverage: 0,
      weightedHomeworkAverage: 0,
      devoir1Note,
      devoir2Note,
      compositionNote
    };
  }

  const currentTrimestreNumero = parseInt(termName.replace('Trimestre ', ''));
  const avgDevoirs = (devoir1Note + devoir2Note) / 2;
  let finalAverage = 0;

  // Calcul selon le trimestre
  if (currentTrimestreNumero === 1) {
    finalAverage = (avgDevoirs * 3 + compositionNote) / 4;
  } else if (currentTrimestreNumero === 2) {
    // Trouver la note de composition du trimestre 1
    const term1 = allTrimestres.find(t => t.nom === 'Trimestre 1');
    if (term1) {
      const compoT1Note = allNotes.find(n => 
        n.etudiant.id === studentId &&
        n.evaluation.matiere_id === subjectId &&
        n.evaluation.trimestre === term1.id &&
        n.evaluation.type === termEvaluationMap['Trimestre 1'].composition
      )?.note;

      if (compoT1Note !== undefined) {
        finalAverage = (avgDevoirs * 3 + compositionNote + compoT1Note) / 5;
      }
    }
  } else if (currentTrimestreNumero === 3) {
    // Trouver les notes de composition des trimestres 1 et 2
    const term1 = allTrimestres.find(t => t.nom === 'Trimestre 1');
    const term2 = allTrimestres.find(t => t.nom === 'Trimestre 2');

    if (term1 && term2) {
      const compoT1Note = allNotes.find(n =>
        n.etudiant.id === studentId &&
        n.evaluation.matiere_id === subjectId &&
        n.evaluation.trimestre === term1.id &&
        n.evaluation.type === termEvaluationMap['Trimestre 1'].composition
      )?.note;

      const compoT2Note = allNotes.find(n =>
        n.etudiant.id === studentId &&
        n.evaluation.matiere_id === subjectId &&
        n.evaluation.trimestre === term2.id &&
        n.evaluation.type === termEvaluationMap['Trimestre 2'].composition
      )?.note;

      if (compoT1Note !== undefined && compoT2Note !== undefined) {
        finalAverage = (avgDevoirs * 3 + compositionNote + compoT1Note + compoT2Note) / 6;
      }
    }
  }

  return {
    finalAverage: parseFloat(finalAverage.toFixed(2)),
    weightedHomeworkAverage: parseFloat(avgDevoirs.toFixed(2)),
    devoir1Note,
    devoir2Note,
    compositionNote
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