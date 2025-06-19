import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileDown, Printer } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { User as AuthUser } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';

// --- Interfaces de Données ---
interface AnneeAcademique {
  id: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
}

interface Classe {
  id: number;
  nom: string;
  niveau?: string;
  annee_scolaire_id: number;
}

interface Matiere {
  id: number;
  nom: string;
  coefficient: number;
}

interface TrimestreData {
  id: number;
  nom: string;
  date_debut: string;
  date_fin: string;
  anneeScolaire?: {
    id: number;
    libelle: string;
  };
}

interface Evaluation {
  id: number;
  type: string;
  matiere?: Matiere;
  classeId: number;
  professeur_id: number;
  professeur?: AuthUser;
  date_eval: string;
  trimestreId?: number;
  annee_scolaire_id: number;
  anneeScolaire?: AnneeAcademique;
}

interface Note {
  id: number;
  eleveId: number;
  evaluationId: number;
  evaluation?: Evaluation;
  note: number;
}

interface Inscription {
  id: number;
  utilisateurId?: number;
  classeId?: number;
  anneeAcademiqueId?: number;
  utilisateur?: AuthUser;
  classe?: Classe;
  annee_scolaire?: AnneeAcademique;
}

interface Configuration {
  id: number;
  annee_scolaire?: AnneeAcademique;
  annee_academique_active_id?: number;
}

interface Coefficient {
  id: number;
  classe_id: number;
  matiere_id: number;
  coefficient: number;
}

interface StudentSubjectGrades {
  subject: string;
  matiereId: number;
  coefficient: number;
  devoir1Note: number | null;
  devoir2Note: number | null;
  compositionNote: number | null;
  average: number | null;
  classAvg: number | null;
}

interface ProgressData {
  name: string;
  moyenne: number;
  moyenneClasse: number;
}

interface ClassAverages {
  [term: string]: {
    [matiereId: number]: number;
  };
}

const API_BASE_URL = 'http://localhost:3000';

const fetchCoefficientsForClass = async (classId: number): Promise<Coefficient[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/coefficientclasse?classeId=${classId}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} for coefficients. Response: ${errorText}`);
    }
    const rawCoefficients: any[] = await response.json();
    return rawCoefficients.map(cc => ({
      id: cc.id,
      matiere_id: cc.matiere?.id || cc.matiere_id,
      classe_id: cc.classe?.id || cc.classe_id,
      coefficient: parseFloat(cc.coefficient),
    }));
  } catch (error) {
    toast({
      title: "Erreur de chargement des coefficients",
      description: `Impossible de charger les coefficients pour la classe. Détails: ${error instanceof Error ? error.message : String(error)}.`,
      variant: "destructive",
    });
    return [];
  }
};

const fetchActiveAcademicYearId = async (): Promise<number | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/configuration`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} for configuration. Response: ${errorText}`);
    }
    const configData: Configuration | Configuration[] = await response.json();

    let activeAnneeScolaireId: number | undefined;
    if (Array.isArray(configData) && configData.length > 0) {
      activeAnneeScolaireId = configData[0].annee_academique_active_id || configData[0].annee_scolaire?.id;
    } else if (configData && !Array.isArray(configData)) {
      activeAnneeScolaireId = configData.annee_academique_active_id || configData.annee_scolaire?.id;
    }

    return activeAnneeScolaireId !== undefined ? activeAnneeScolaireId : null;
  } catch (error) {
    toast({
      title: "Erreur de configuration",
      description: `Impossible de charger l'année académique active. Détails: ${error instanceof Error ? error.message : String(error)}.`,
      variant: "destructive",
    });
    return null;
  }
};

const fetchUserInscriptionAndClassInfo = async (userId: number, activeAnneeAcademiqueId: number): Promise<{ studentName: string; className: string; classId: number; anneeScolaireId: number; eleveId: number } | null> => {
  try {
    const userResponse = await fetch(`${API_BASE_URL}/api/users/${userId}`);
    if (!userResponse.ok) {
      throw new Error(`HTTP error! status: ${userResponse.status} for user ${userId}`);
    }
    const user: AuthUser = await userResponse.json();

    const inscriptionResponse = await fetch(`${API_BASE_URL}/api/inscriptions?utilisateurId=${userId}&anneeAcademiqueId=${activeAnneeAcademiqueId}&_expand=classe&_expand=annee_scolaire&_expand=utilisateur`);
    if (!inscriptionResponse.ok) {
      throw new Error(`HTTP error! status: ${inscriptionResponse.status} for inscription`);
    }
    const inscriptions: Inscription[] = await inscriptionResponse.json();

    if (inscriptions.length === 0) {
      toast({
        title: "Inscription introuvable",
        description: "L'élève n'est pas inscrit pour l'année scolaire active ou l'inscription n'a pas été trouvée.",
        variant: "destructive",
      });
      return null;
    }

    const currentInscription = inscriptions[0];
    const classId = currentInscription.classe?.id;
    const anneeScolaireId = currentInscription.annee_scolaire?.id;
    const eleveId = currentInscription.utilisateur?.id;

    if (classId === undefined || anneeScolaireId === undefined || eleveId === undefined) {
      toast({
        title: "Données d'inscription incomplètes",
        description: "Les informations essentielles (classe, année, élève) sont manquantes dans l'inscription.",
        variant: "destructive",
      });
      return null;
    }
    return {
      studentName: user.nom || 'Nom Inconnu',
      className: currentInscription.classe?.nom || 'Classe Inconnue',
      classId: classId,
      anneeScolaireId: anneeScolaireId,
      eleveId: eleveId,
    };
  } catch (error) {
    toast({
      title: "Erreur de chargement",
      description: `Impossible de charger les informations de l'élève. Détails: ${error instanceof Error ? error.message : String(error)}.`,
      variant: "destructive",
    });
    return null;
  }
};

const fetchNotesForEleve = async (eleveId: number): Promise<Note[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/notes?_expand=evaluation&_expand=evaluation.matiere&_cacheBust=${Date.now()}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}. Response: ${errorText}`);
    }
    const allNotesFromApi: any[] = await response.json();
    
    const studentApiNotes = allNotesFromApi.filter(note => {
      if (note.etudiant && typeof note.etudiant.id !== 'undefined') {
        return String(note.etudiant.id) === String(eleveId);
      }
      if (typeof note.etudiant_id !== 'undefined') {
        return String(note.etudiant_id) === String(eleveId);
      }
      return false;
    });

    return studentApiNotes.map(apiNote => ({
      id: parseInt(apiNote.id, 10),
      eleveId: eleveId,
      evaluationId: parseInt(apiNote.evaluation?.id, 10),
      evaluation: apiNote.evaluation,
      note: parseFloat(apiNote.note),
    }));
  } catch (error) {
    toast({
      title: "Erreur de chargement",
      description: `Impossible de charger les notes de l'élève. Détails: ${error instanceof Error ? error.message : String(error)}.`,
      variant: "destructive",
    });
    return [];
  }
};

const fetchAllMatiere = async (): Promise<Matiere[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/matieres`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}. Response: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    toast({
      title: "Erreur de chargement",
      description: `Impossible de charger la liste des matières. Détails: ${error instanceof Error ? error.message : String(error)}.`,
      variant: "destructive",
    });
    return [];
  }
};

const fetchAllTrimestresNames = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/trimestres`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}. Response: ${errorText}`);
    }
    const trimestres: TrimestreData[] = await response.json();
    const terms = Array.from(new Set(trimestres.map(t => t.nom))).filter(Boolean) as string[];

    terms.sort((a, b) => {
      const numA = parseInt(a.replace('Trimestre ', '') || '0');
      const numB = parseInt(b.replace('Trimestre ', '') || '0');
      if (numA !== 0 && numB !== 0) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });
    return terms;
  } catch (error) {
    toast({
      title: "Erreur de chargement",
      description: `Impossible de charger la liste des noms de trimestres. Détails: ${error instanceof Error ? error.message : String(error)}.`,
      variant: "destructive",
    });
    return [];
  }
};

const fetchAllTrimestreObjects = async (): Promise<TrimestreData[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/trimestres`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}. Response: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    toast({
      title: "Erreur de chargement",
      description: `Impossible de charger les objets trimestres. Détails: ${error instanceof Error ? error.message : String(error)}.`,
      variant: "destructive",
    });
    return [];
  }
};

const fetchAllStudentsInClass = async (classId: number, anneeScolaireId: number): Promise<Inscription[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/inscriptions?classeId=${classId}&anneeAcademiqueId=${anneeScolaireId}&_expand=utilisateur`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}. Response: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    toast({
      title: "Erreur de chargement",
      description: `Impossible de charger la liste des élèves de la classe. Détails: ${error instanceof Error ? error.message : String(error)}.`,
      variant: "destructive",
    });

    return [];
  }
};

const fetchAllNotesForClass = async (classId: number, anneeScolaireId: number): Promise<Note[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/notes?_expand=evaluation&_expand=evaluation.matiere&_expand=evaluation.classe&_cacheBust=${Date.now()}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}. Response: ${errorText}`);
    }
    const allNotesFromApi: any[] = await response.json();
    

    // Décommenter pour voir des exemples de notes brutes et leurs IDs d'évaluation
    allNotesFromApi.forEach(n => {
      // Log actual fields from API for an evaluation, assuming trimestreId 6 is of interest
      if (n.evaluation && (n.evaluation.trimestreId === 6 || n.evaluation.trimestre_id === 6)) { 
        
       }
     });

    // Filter notes for the specific class and academic year
    const classNotesFromApi = allNotesFromApi.filter((apiNote: any) => {
      // Get classId and anneeScolaireId from the expanded evaluation.classe object
      // This matches the backend service configuration loading evaluation.classe
      const apiEvalClasseId = apiNote.evaluation?.classe?.id;
      const apiEvalAnneeScolaireId = apiNote.evaluation?.classe?.annee_scolaire_id;

      const matchesClass = apiEvalClasseId === classId;
      const matchesYear = apiEvalAnneeScolaireId === anneeScolaireId;
      
      const currentTrimestreId = apiNote.evaluation?.trimestreId || apiNote.evaluation?.trimestre_id;

      // Enhanced logging for T3 notes (assuming ID 6) - Adjust ID if needed
      if (currentTrimestreId === 6) {
        if (!matchesClass || !matchesYear) {
          
        } else {
          
        }
       }
      return matchesClass && matchesYear;
    });    
    
    const t3NotesInFiltered = classNotesFromApi.filter(n => (n.evaluation?.trimestreId === 6 || n.evaluation?.trimestre_id === 6));

    return classNotesFromApi.map((apiNote: any) => {
      let studentIdVal: number | undefined;
      if (apiNote.etudiant && typeof apiNote.etudiant.id !== 'undefined') {
        studentIdVal = parseInt(String(apiNote.etudiant.id), 10);
      } else if (typeof apiNote.etudiant_id !== 'undefined') {
        studentIdVal = parseInt(String(apiNote.etudiant_id), 10);
      }

      // Map evaluation from API (potentially snake_case) to frontend Evaluation interface (camelCase)
      const feEvaluation: Evaluation | undefined = apiNote.evaluation ? {
        id: parseInt(apiNote.evaluation.id, 10), // Assuming id is always present and correct
        type: apiNote.evaluation.type,
        matiere: apiNote.evaluation.matiere,
        // Get classeId from the expanded evaluation.classe.id
        // This matches the backend service configuration
        classeId: apiNote.evaluation.classe?.id ? parseInt(apiNote.evaluation.classe.id, 10) : undefined,
        professeur_id: parseInt(apiNote.evaluation.professeur_id, 10), // Assuming professeur_id is snake_case from API
        professeur: apiNote.evaluation.professeur,
        date_eval: apiNote.evaluation.date_eval,
        // Map trimestreId from trimestre_id (API) or trimestreId (API) to trimestreId (frontend)
        trimestreId: apiNote.evaluation.trimestreId || apiNote.evaluation.trimestre_id ? 
                      parseInt(apiNote.evaluation.trimestreId || apiNote.evaluation.trimestre_id, 10) : undefined,
        // Get annee_scolaire_id from the expanded evaluation.classe.annee_scolaire_id
        // OR if evaluation itself has annee_scolaire_id, prioritize that.
        // Based on previous logs, evaluation.annee_scolaire_id was undefined, so we rely on evaluation.classe.annee_scolaire_id
        annee_scolaire_id: apiNote.evaluation.classe?.annee_scolaire_id ?
                            parseInt(apiNote.evaluation.classe.annee_scolaire_id, 10) :
                            (apiNote.evaluation.annee_scolaire_id ? parseInt(apiNote.evaluation.annee_scolaire_id, 10) : undefined),
        anneeScolaire: apiNote.evaluation.anneeScolaire,
      } : undefined;

      return {
        id: parseInt(apiNote.id, 10),
        eleveId: studentIdVal as number, 
        evaluationId: feEvaluation ? feEvaluation.id : parseInt(apiNote.evaluation?.id, 10), // Fallback
        evaluation: feEvaluation, // Use the mapped evaluation object
        note: parseFloat(apiNote.note),
      };
    }).filter(note =>
      typeof note.eleveId === 'number' && !isNaN(note.eleveId) &&
      note.evaluation !== undefined &&
      typeof note.evaluation.classeId === 'number' && !isNaN(note.evaluation.classeId) && // Check mapped classeId
      typeof note.evaluation.annee_scolaire_id === 'number' && !isNaN(note.evaluation.annee_scolaire_id) // Check mapped annee_scolaire_id
    );
  } catch (error) {
    toast({
      title: "Erreur de chargement",
      description: `Impossible de charger les notes de la classe. Détails: ${error instanceof Error ? error.message : String(error)}.`,
      variant: "destructive",
    });
    return [];
  }
};

interface StudentGradesProps {
  userId: number;
}

export function StudentGrades({ userId }: StudentGradesProps) {
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [studentName, setStudentName] = useState<string>('Chargement...');
  const [className, setClassName] = useState<string>('Chargement...');
  const [studentClassId, setStudentClassId] = useState<number | null>(null);
  const [studentAnneeScolaireId, setStudentAnneeScolaireId] = useState<number | null>(null);
  const [eleveId, setEleveId] = useState<number | null>(null);
  const [allPossibleTerms, setAllPossibleTerms] = useState<string[]>([]);
  const [allTrimestreObjects, setAllTrimestreObjects] = useState<TrimestreData[]>([]);
  const [activeAcademicYearId, setActiveAcademicYearId] = useState<number | null>(null);
  const [allStudentNotes, setAllStudentNotes] = useState<Note[]>([]);
  const [allMatiere, setAllMatiere] = useState<Matiere[]>([]);
  const [classCoefficients, setClassCoefficients] = useState<Coefficient[]>([]);
  const [classStudents, setClassStudents] = useState<Inscription[]>([]);
  const [classNotes, setClassNotes] = useState<Note[]>([]);
  
  const [processedGrades, setProcessedGrades] = useState<{ [term: string]: StudentSubjectGrades[] }>({});
  const [generalAverages, setGeneralAverages] = useState<{ [term: string]: number }>({});
  const [classAverages, setClassAverages] = useState<ClassAverages>({});
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [subjectComparisonData, setSubjectComparisonData] = useState<any[]>([]);
  const { addNotification } = useNotifications();

  useEffect(() => {
    setStudentName('Chargement...');
    setClassName('Chargement...');
    setStudentClassId(null);
    setStudentAnneeScolaireId(null);
    setEleveId(null);
    setAllStudentNotes([]);
    setClassCoefficients([]);
    setClassStudents([]);
    setClassNotes([]);
    setProcessedGrades({});
    setGeneralAverages({});
    setClassAverages({});
    setProgressData([]);
    setSubjectComparisonData([]);
  }, [userId]);

  useEffect(() => {
    const loadInitialAppConfig = async () => {
      setLoading(true);
      try {
        const [yearId, matieres, termsNames, termsObjects] = await Promise.all([
          fetchActiveAcademicYearId(),
          fetchAllMatiere(),
          fetchAllTrimestresNames(),
          fetchAllTrimestreObjects(),
        ]);

        setActiveAcademicYearId(yearId);
        setAllMatiere(matieres);
        setAllPossibleTerms(termsNames);
        setAllTrimestreObjects(termsObjects);

        if (termsNames.length > 0) {
          setSelectedTerm(termsNames[termsNames.length - 1]);
        } else {
          setSelectedTerm('Aucun trimestre');
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    loadInitialAppConfig();
  }, []);

  useEffect(() => {
    const loadStudentInfo = async () => {
      if (activeAcademicYearId === null || userId === undefined) {
        setEleveId(null);
        setAllStudentNotes([]);
        return;
      }
      setLoading(true);
      try {
        const info = await fetchUserInscriptionAndClassInfo(userId, activeAcademicYearId);
        if (info) {
          setStudentName(info.studentName);
          setClassName(info.className);
          setStudentClassId(info.classId);
          setStudentAnneeScolaireId(info.anneeScolaireId);
          setEleveId(userId);
          
          // Load class data (students and coefficients)
          const [coeffs, students] = await Promise.all([
            fetchCoefficientsForClass(info.classId),
            fetchAllStudentsInClass(info.classId, info.anneeScolaireId)
          ]);
          setClassCoefficients(coeffs);
          setClassStudents(students);
          
          // Load all notes for the class
          const notes = await fetchAllNotesForClass(info.classId, info.anneeScolaireId);
          setClassNotes(notes);
        } else {
          setAllStudentNotes([]);
          setEleveId(null);
          setStudentName('N/A');
          setClassName('N/A');
          setStudentClassId(null);
          setStudentAnneeScolaireId(null);
          setClassCoefficients([]);
          setClassStudents([]);
          setClassNotes([]);
          
          toast({
            title: "Informations d'inscription introuvables",
            description: "Impossible de récupérer les détails d'inscription pour afficher les notes.",
            variant: "default",
          });
        }
      } catch (error) {
        setEleveId(null);
        setAllStudentNotes([]);
        setClassCoefficients([]);
        setClassStudents([]);
        setClassNotes([]);
      } finally {
        setLoading(false);
      }
    };
    loadStudentInfo();
  }, [userId, activeAcademicYearId]);

  useEffect(() => {
    const getStudentNotes = async () => {
      if (typeof eleveId === 'number') {
        setLoading(true);
        try {
          const notes = await fetchNotesForEleve(eleveId);
          setAllStudentNotes(notes);
        } catch (error) {
          setAllStudentNotes([]);
        } finally {
          setLoading(false);
        }
      } else {
        setAllStudentNotes([]);
      }
    };
    if (activeAcademicYearId !== null && userId !== undefined) {
      getStudentNotes();
    } else {
      setAllStudentNotes([]);
    }
  }, [eleveId, activeAcademicYearId, userId]);

  useEffect(() => {
    const termEvaluationMap: { [key: string]: { devoir1: string, devoir2: string, composition: string } } = {
      'Trimestre 1': { devoir1: 'Devoir 1', devoir2: 'Devoir 2', composition: 'Composition 1' },
      'Trimestre 2': { devoir1: 'Devoir 3', devoir2: 'Devoir 4', composition: 'Composition 2' },
      'Trimestre 3': { devoir1: 'Devoir 5', devoir2: 'Devoir 6', composition: 'Composition 3' },
    };

    if (!studentClassId || !studentAnneeScolaireId || allMatiere.length === 0 || 
        allPossibleTerms.length === 0 || allTrimestreObjects.length === 0 || 
        classCoefficients.length === 0 || classStudents.length === 0) {
      setProcessedGrades({});
      setGeneralAverages({});
      setClassAverages({});
      setProgressData([]);
      setSubjectComparisonData([]);
      return;
    }

    const processNotes = async () => {
      const gradesByTerm: { [term: string]: StudentSubjectGrades[] } = {};
      const generalAveragesCalc: { [term: string]: number } = {};
      const classAveragesCalc: ClassAverages = {};
      
      // First, calculate class averages for each term and subject
      for (const term of allPossibleTerms) {
        const currentTermObject = allTrimestreObjects.find(t => 
          t.nom === term && t.anneeScolaire?.id === studentAnneeScolaireId
        );
        const currentTermId = currentTermObject?.id;

        if (currentTermId === undefined) {
          continue;
        }

        // Initialize class averages for this term
        classAveragesCalc[term] = {};

        // For each subject, calculate the class average
        for (const matiereInfo of allMatiere) {
          const matiereId = matiereInfo.id;
          let totalMatiereAverage = 0;
          let studentCountWithMatiere = 0;

          // Calculate average for each student in this subject and term
          for (const student of classStudents) {
            if (!student.utilisateur?.id) {
              continue;
            }

            const studentNotesForTerm = classNotes.filter(note => 
              note.eleveId === student.utilisateur.id && 
              note.evaluation?.trimestreId === currentTermId &&
              note.evaluation?.matiere?.id === matiereId
            );


            // if (studentNotesForTerm.length === 0) continue; // Don't skip yet, might have notes but not all 3
            // Calculate student's average for this subject and term
            let devoir1Note: number | null = null;
            let devoir2Note: number | null = null;
            let compositionNote: number | null = null;

            studentNotesForTerm.forEach(note => {
              const evaluationType = note.evaluation?.type;
              const currentTermEvaluations = termEvaluationMap[term];
              if (currentTermEvaluations) {
                if (evaluationType === currentTermEvaluations.devoir1) {
                  devoir1Note = note.note;
                } else if (evaluationType === currentTermEvaluations.devoir2) {
                  devoir2Note = note.note;
                } else if (evaluationType === currentTermEvaluations.composition) {
                  compositionNote = note.note;
                }
              }
            });

            if (devoir1Note !== null && devoir2Note !== null && compositionNote !== null) {
              const avgDevoirs = (devoir1Note + devoir2Note) / 2;
              const currentTrimestreNumero = parseInt(term.replace('Trimestre ', ''));

              let subjectAverage: number | null = null;
              if (currentTrimestreNumero === 1) {
                subjectAverage = (avgDevoirs * 3 + compositionNote) / 4;
              } else if (currentTrimestreNumero === 2) {
                // For term 2, we need composition from term 1
                const term1Obj = allTrimestreObjects.find(t => 
                  t.nom === "Trimestre 1" && t.anneeScolaire?.id === studentAnneeScolaireId
                );
                if (term1Obj) {
                  const compoT1EvalType = termEvaluationMap["Trimestre 1"]?.composition;
                  const compoT1NoteObj = classNotes.find(n =>
                    n.eleveId === student.utilisateur.id &&
                    n.evaluation?.matiere?.id === matiereId &&
                    n.evaluation?.trimestreId === term1Obj.id &&
                    n.evaluation?.type === compoT1EvalType
                  );
                  const compoT1Note = compoT1NoteObj ? compoT1NoteObj.note : null;
                  
                  if (compoT1Note !== null) {
                    subjectAverage = (avgDevoirs * 3 + compositionNote + compoT1Note) / 5;
                  }
                }
              } else if (currentTrimestreNumero === 3) {
                // For term 3, we need compositions from terms 1 and 2
                const term1Obj = allTrimestreObjects.find(t => 
                  t.nom === "Trimestre 1" && t.anneeScolaire?.id === studentAnneeScolaireId
                );
                const term2Obj = allTrimestreObjects.find(t => 
                  t.nom === "Trimestre 2" && t.anneeScolaire?.id === studentAnneeScolaireId
                );
                
                if (term1Obj && term2Obj) {
                  const compoT1EvalType = termEvaluationMap["Trimestre 1"]?.composition;
                  const compoT2EvalType = termEvaluationMap["Trimestre 2"]?.composition;
                  
                  const compoT1NoteObj = classNotes.find(n =>
                    n.eleveId === student.utilisateur.id &&
                    n.evaluation?.matiere?.id === matiereId &&
                    n.evaluation?.trimestreId === term1Obj.id &&
                    n.evaluation?.type === compoT1EvalType
                  );
                  const compoT2NoteObj = classNotes.find(n =>
                    n.eleveId === student.utilisateur.id &&
                    n.evaluation?.matiere?.id === matiereId &&
                    n.evaluation?.trimestreId === term2Obj.id &&
                    n.evaluation?.type === compoT2EvalType
                  );
                  
                  const compoT1Note = compoT1NoteObj ? compoT1NoteObj.note : null;
                  const compoT2Note = compoT2NoteObj ? compoT2NoteObj.note : null;
                  
                  if (compoT1Note !== null && compoT2Note !== null) {
                    subjectAverage = (avgDevoirs * 3 + compositionNote + compoT1Note + compoT2Note) / 6;
                  }
                }
              }

              if (subjectAverage !== null) {
                totalMatiereAverage += subjectAverage;
                studentCountWithMatiere++;
              }
            }
          }

          // Calculate class average for this subject and term
          if (studentCountWithMatiere > 0) {
            classAveragesCalc[term][matiereId] = parseFloat((totalMatiereAverage / studentCountWithMatiere).toFixed(2));
          } else {
            classAveragesCalc[term][matiereId] = null; // Explicitement null si aucune moyenne
          }
        }
      }

      // Now process the current student's grades
      for (const term of allPossibleTerms) {
        const currentTermObject = allTrimestreObjects.find(t => 
          t.nom === term && t.anneeScolaire?.id === studentAnneeScolaireId
        );
        const currentTermId = currentTermObject?.id;

        if (currentTermId === undefined) continue;

        const gradesForCurrentTerm: StudentSubjectGrades[] = [];
        let totalWeightedTermScore = 0;
        let totalCoefficientTerm = 0;

        for (const matiereInfo of allMatiere) {
          const matiereId = matiereInfo.id;
          const subjectName = matiereInfo.nom;
          const foundCoefficientObj = classCoefficients.find(c => 
            String(c.matiere_id) === String(matiereId) && 
            String(c.classe_id) === String(studentClassId)
          );
          const subjectCoefficient = foundCoefficientObj?.coefficient || 1;

          let devoir1Note: number | null = null;
          let devoir2Note: number | null = null;
          let compositionNote: number | null = null;

          const notesForSubjectAndTerm = allStudentNotes.filter(note => {
            if (!note.evaluation || !note.evaluation.matiere || note.evaluation.trimestreId === undefined) {
              return false;
            }
            return note.evaluation.matiere.id === matiereId && 
                   note.evaluation.trimestreId === currentTermId;
          });

          notesForSubjectAndTerm.forEach(note => {
            const evaluationType = note.evaluation?.type;
            const currentTermEvaluations = termEvaluationMap[term];
            if (currentTermEvaluations) {
              if (evaluationType === currentTermEvaluations.devoir1) {
                devoir1Note = note.note;
              } else if (evaluationType === currentTermEvaluations.devoir2) {
                devoir2Note = note.note;
              } else if (evaluationType === currentTermEvaluations.composition) {
                compositionNote = note.note;
              }
            }
          });

          let subjectAverage: number | null = null;
          if (devoir1Note !== null && devoir2Note !== null && compositionNote !== null) {
            const avgDevoirs = (devoir1Note + devoir2Note) / 2;
            const currentTrimestreNumero = parseInt(term.replace('Trimestre ', ''));

            if (currentTrimestreNumero === 1) {
              subjectAverage = (avgDevoirs * 3 + compositionNote) / 4;
            } else if (currentTrimestreNumero === 2) {
              const term1Obj = allTrimestreObjects.find(t => 
                t.nom === "Trimestre 1" && t.anneeScolaire?.id === studentAnneeScolaireId
              );
              if (term1Obj) {
                const compoT1EvalType = termEvaluationMap["Trimestre 1"]?.composition;
                const noteObj = allStudentNotes.find(n =>
                  n.evaluation?.matiere?.id === matiereId &&
                  n.evaluation?.trimestreId === term1Obj.id &&
                  n.evaluation?.type === compoT1EvalType
                );
                const compoT1Note = noteObj ? noteObj.note : null;
                
                if (compoT1Note !== null) {
                  subjectAverage = (avgDevoirs * 3 + compositionNote + compoT1Note) / 5;
                }
              }
            } else if (currentTrimestreNumero === 3) {
              const term1Obj = allTrimestreObjects.find(t => 
                t.nom === "Trimestre 1" && t.anneeScolaire?.id === studentAnneeScolaireId
              );
              const term2Obj = allTrimestreObjects.find(t => 
                t.nom === "Trimestre 2" && t.anneeScolaire?.id === studentAnneeScolaireId
              );
              
              if (term1Obj && term2Obj) {
                const compoT1EvalType = termEvaluationMap["Trimestre 1"]?.composition;
                const compoT2EvalType = termEvaluationMap["Trimestre 2"]?.composition;
                
                const compoT1NoteObj = allStudentNotes.find(n =>
                  n.evaluation?.matiere?.id === matiereId &&
                  n.evaluation?.trimestreId === term1Obj.id &&
                  n.evaluation?.type === compoT1EvalType
                );
                const compoT2NoteObj = allStudentNotes.find(n =>
                  n.evaluation?.matiere?.id === matiereId &&
                  n.evaluation?.trimestreId === term2Obj.id &&
                  n.evaluation?.type === compoT2EvalType
                );
                
                const compoT1Note = compoT1NoteObj ? compoT1NoteObj.note : null;
                const compoT2Note = compoT2NoteObj ? compoT2NoteObj.note : null;
                
                if (compoT1Note !== null && compoT2Note !== null) {
                  subjectAverage = (avgDevoirs * 3 + compositionNote + compoT1Note + compoT2Note) / 6;
                }
              }
            }

            if (subjectAverage !== null) {
              subjectAverage = parseFloat(subjectAverage.toFixed(2));
              totalWeightedTermScore += subjectAverage * subjectCoefficient;
              totalCoefficientTerm += subjectCoefficient;
            }
          }

          gradesForCurrentTerm.push({
            subject: subjectName,
            matiereId: matiereId,
            coefficient: subjectCoefficient,
            devoir1Note,
            devoir2Note,
            compositionNote,
            average: subjectAverage,
            classAvg: classAveragesCalc[term]?.[matiereId] || null,
          });
        }

        gradesByTerm[term] = gradesForCurrentTerm;
        generalAveragesCalc[term] = totalCoefficientTerm > 0 ? 
          parseFloat((totalWeightedTermScore / totalCoefficientTerm).toFixed(2)) : 0;
      }

      setProcessedGrades(gradesByTerm);
      setGeneralAverages(generalAveragesCalc);
      setClassAverages(classAveragesCalc);

      // Prepare progress data
      const newProgressData: ProgressData[] = allPossibleTerms.map(term => {
        // Calculate class general average for the term
        let classGeneralAverage = 0;
        let totalCoefficient = 0;
        
        if (classAveragesCalc[term]) {
          for (const matiereId in classAveragesCalc[term]) {
            const coeff = classCoefficients.find(c => 
              c.matiere_id === parseInt(matiereId) && c.classe_id === studentClassId
            )?.coefficient || 1;
            
            classGeneralAverage += classAveragesCalc[term][matiereId] * coeff;
            totalCoefficient += coeff;
          }
          
          if (totalCoefficient > 0 && !isNaN(classGeneralAverage / totalCoefficient)) {
            classGeneralAverage = parseFloat((classGeneralAverage / totalCoefficient).toFixed(2));
          }
        }
        
        return {
          name: term,
          moyenne: generalAveragesCalc[term] || 0,
          moyenneClasse: classGeneralAverage > 0 && !isNaN(classGeneralAverage) ? classGeneralAverage : 0, // Assurer un nombre pour le graphique
        };
      });
      setProgressData(newProgressData);

      // Prepare subject comparison data
      const currentTermGrades = gradesByTerm[selectedTerm];
      if (currentTermGrades) {
        setSubjectComparisonData(currentTermGrades.map(subject => ({
          name: subject.subject.substring(0, Math.min(subject.subject.length, 5)),
          moyenne: subject.average !== null ? subject.average : 0,
          moyenneClasse: subject.classAvg !== null ? subject.classAvg : 0,
        })));
      } else {
        setSubjectComparisonData([]);
      }
    };

    processNotes();
  }, [
    allStudentNotes, 
    selectedTerm, 
    studentClassId, 
    studentAnneeScolaireId, 
    allMatiere, 
    allPossibleTerms, 
    allTrimestreObjects, 
    classCoefficients,
    classStudents,
    classNotes
  ]);


  const currentSelectedGrades = processedGrades[selectedTerm] || [];
  const currentSelectedAverage = generalAverages[selectedTerm] || 0;

 

const downloadReport = () => {
  toast({
    title: "Téléchargement",
    description: `Le bulletin de ${selectedTerm} est en cours de téléchargement.`,
  });
};

const printReport = () => {
  toast({
    title: "Impression",
    description: `Le bulletin de ${selectedTerm} est envoyé à l'imprimante.`,
  });
};

const getEvaluationHeaders = (term: string) => {
  switch (term) {
    case 'Trimestre 1':
      return {
        devoir1: 'Devoir 1',
        devoir2: 'Devoir 2',
        composition: 'Composition 1',
      };
    case 'Trimestre 2':
      return {
        devoir1: 'Devoir 3',
        devoir2: 'Devoir 4',
        composition: 'Composition 2',
      };
    case 'Trimestre 3':
      return {
        devoir1: 'Devoir 5',
        devoir2: 'Devoir 6',
        composition: 'Composition 3',
      };
    default:
      return {
        devoir1: 'Devoir 1',
        devoir2: 'Devoir 2',
        composition: 'Composition',
      };
  }
};

const { devoir1, devoir2, composition } = getEvaluationHeaders(selectedTerm);

if (loading || activeAcademicYearId === null) {
  return (
    <div className="p-6 text-center text-gray-500">
      Chargement des informations de l'élève et des notes...
    </div>
  );
}

if (eleveId === null) {
  return (
    <div className="p-6 text-center text-red-500">
      <h2 className="text-xl font-semibold mb-2">Impossible de charger les notes.</h2>
      <p>Aucune inscription trouvée pour cet élève pour l'année scolaire active.</p>
    </div>
  );
}

return (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-6">Mes Notes</h1>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-2">Moyenne Générale ({selectedTerm})</h3>
          <p className="text-3xl font-bold text-blue-600">{currentSelectedAverage.toFixed(2)}</p>
          <p className="text-sm text-gray-600">/20</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-2">Rang dans la classe</h3>
          <p className="text-3xl font-bold text-green-600">N/A</p>
          <p className="text-sm text-gray-600">sur - élèves</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-2">Appréciation générale</h3>
          <p className="text-md text-gray-600">
            Aucune appréciation disponible pour le moment.
          </p>
        </CardContent>
      </Card>
    </div>

    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <Select
          value={selectedTerm}
          onValueChange={setSelectedTerm}
          disabled={allPossibleTerms.length === 0 && selectedTerm === 'Aucun trimestre'}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sélectionner un trimestre" />
          </SelectTrigger>
          <SelectContent>
            {allPossibleTerms.length > 0 ? (
              allPossibleTerms.map((term) => (
                <SelectItem key={term} value={term}>
                  {term}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="Aucun trimestre" disabled>Aucun trimestre disponible</SelectItem>
            )}
          </SelectContent>
        </Select>

        <h2 className="text-lg font-semibold">
          Notes {selectedTerm}
        </h2>
      </div>
    </div>

    <Tabs defaultValue="grades" className="space-y-4">
      <TabsList>
        <TabsTrigger value="grades">Détail des notes</TabsTrigger>
        <TabsTrigger value="charts">Graphiques</TabsTrigger>
      </TabsList>

      <TabsContent value="grades">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matière</TableHead>
                    <TableHead className="text-center">Coef.</TableHead>
                    <TableHead className="text-center">{devoir1}</TableHead>
                    <TableHead className="text-center">{devoir2}</TableHead>
                    <TableHead className="text-center">{composition}</TableHead>
                    <TableHead className="text-center">Moyenne</TableHead>
                    <TableHead className="text-center">Moyenne classe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentSelectedGrades.length === 0 && allMatiere.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        {selectedTerm === 'Aucun trimestre'
                          ? "Aucun trimestre disponible. Veuillez vérifier les données d'évaluation."
                          : `Aucune matière ni note disponible pour le ${selectedTerm}.`}
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentSelectedGrades.map((grade, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{grade.subject}</TableCell>
                        <TableCell className="text-center">{grade.coefficient}</TableCell>
                        <TableCell className="text-center">
                          {grade.devoir1Note !== null ? `${grade.devoir1Note}/20` : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {grade.devoir2Note !== null ? `${grade.devoir2Note}/20` : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {grade.compositionNote !== null ? `${grade.compositionNote}/20` : '-'}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {grade.average !== null ? `${grade.average.toFixed(2)}/20` : '-'}
                        </TableCell>
                        <TableCell className="text-center text-gray-600">
                          {grade.classAvg !== null ? `${grade.classAvg.toFixed(2)}/20` : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="charts">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Évolution des moyennes</CardTitle>
              <CardDescription>Progression sur les trimestres</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {progressData.length > 0 ? (
                  <LineChart
                    data={progressData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 20]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="moyenne"
                      name="Ma moyenne"
                      stroke="#3b82f6"
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="moyenneClasse"
                      name="Moyenne classe"
                      stroke="#9ca3af"
                    />
                  </LineChart>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Pas assez de données pour afficher l'évolution des moyennes.
                  </div>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comparaison par matière</CardTitle>
              <CardDescription>Trimestre actuel</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {subjectComparisonData.length > 0 ? (
                  <BarChart
                    data={subjectComparisonData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 20]} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="moyenne"
                      name="Ma moyenne"
                      fill="#3b82f6"
                    />
                    <Bar
                      dataKey="moyenneClasse"
                      name="Moyenne classe"
                      fill="#9ca3af"
                    />
                  </BarChart>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Aucune donnée de matière pour ce trimestre pour la comparaison.
                  </div>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  </div>
);
}