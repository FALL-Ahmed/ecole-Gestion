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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from '@/hooks/use-toast';
import { useNotifications } from '@/contexts/NotificationContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMediaQuery } from '@/hooks/use-media-query';
import apiClient from '@/lib/apiClient';

// --- Interfaces de Données ---
interface AnneeAcademique {
  id: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
}
interface AuthUser {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: 'admin' | 'eleve' | 'professeur' | 'parent' | 'tuteur';
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

interface StudentGradesProps {
  userId: number;
}

const SubjectGradeCard = ({ grade, headers, t }: { grade: StudentSubjectGrades, headers: { devoir1: string, devoir2: string, composition: string }, t: any }) => (
  <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between p-4 bg-muted/30 dark:bg-muted/10">
      <CardTitle className="text-lg font-bold">{grade.subject}</CardTitle>
      <Badge variant="outline">{t.reportManagement.coefficient}: {grade.coefficient}</Badge>
    </CardHeader>
    <CardContent className="p-6 space-y-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-sm font-medium text-muted-foreground h-10 flex items-center justify-center">{headers.devoir1}</p>
          <p className="text-lg font-bold">{grade.devoir1Note !== null ? grade.devoir1Note : '-'}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground h-10 flex items-center justify-center">{headers.devoir2}</p>
          <p className="text-lg font-bold">{grade.devoir2Note !== null ? grade.devoir2Note : '-'}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground h-10 flex items-center justify-center">{headers.composition}</p>
          <p className="text-lg font-bold">{grade.compositionNote !== null ? grade.compositionNote : '-'}</p>
        </div>
      </div>
      <div className="border-t pt-4 mt-4 flex justify-between items-center">
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">{t.reportManagement.subjectAvg}</p>
          <p className="text-xl font-extrabold text-blue-600">{grade.average !== null ? grade.average.toFixed(2) : '-'}</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">{t.studentGrades.classAverage}</p>
          <p className="text-lg font-semibold text-gray-600">{grade.classAvg !== null ? grade.classAvg.toFixed(2) : '-'}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const fetchTaughtSubjects = async (classId: number, anneeScolaireId: number): Promise<Matiere[]> => {
  try {
    const response = await apiClient.get(`/affectations?classe_id=${classId}&annee_scolaire_id=${anneeScolaireId}&_expand=matiere`);
    const affectations = response.data;
    const taughtMatieresMap = new Map<number, Matiere>();
    affectations.forEach((aff: any) => {
      if (aff.matiere && aff.matiere.id) {
        taughtMatieresMap.set(aff.matiere.id, { id: aff.matiere.id, nom: aff.matiere.nom });
      }
    });
    return Array.from(taughtMatieresMap.values());
  } catch (error: any) {
    toast({
      title: "Erreur de chargement",
      description: "Impossible de charger les matières enseignées.",
      variant: "destructive",
    });
    return [];
  }
};
export function StudentGrades({ userId }: StudentGradesProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  // Affiche les cartes sur mobile et tablettes (jusqu'à 1024px)
  const useCardLayout = useMediaQuery('(max-width: 1024px)');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [studentName, setStudentName] = useState<string>(t.common.loading);
  const [className, setClassName] = useState<string>(t.common.loading);
  const [studentClassId, setStudentClassId] = useState<number | null>(null);
  const [studentAnneeScolaireId, setStudentAnneeScolaireId] = useState<number | null>(null);
  const [eleveId, setEleveId] = useState<number | null>(null);
  const [allPossibleTerms, setAllPossibleTerms] = useState<string[]>([]);
  const [allTrimestreObjects, setAllTrimestreObjects] = useState<TrimestreData[]>([]);
  const [activeAcademicYearId, setActiveAcademicYearId] = useState<number | null>(null);
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

  const translateSubject = useCallback((subjectName: string): string => {
    if (!subjectName) return t.common.unknownSubject;

    const subjectMap: { [key: string]: string } = {
      'Mathématiques': t.schedule.subjects.math,
      'Physique Chimie': t.schedule.subjects.physics,
      'Arabe': t.schedule.subjects.arabic,
      'Français': t.schedule.subjects.french,
      'Anglais': t.schedule.subjects.english,
      'Éducation Islamique': t.schedule.subjects.islamic,
      'Histoire Géographie': t.schedule.subjects.history,
      'Éducation Civique': t.schedule.subjects.civics,
      'Éducation Physique et Sportive': t.schedule.subjects.sport,
      'Philosophie': t.schedule.subjects.philosophy,
      'Sciences Naturelles': t.schedule.subjects.naturalSciences,
      'Technologie/Informatique': t.schedule.subjects.technology,
    };
    return subjectMap[subjectName] || subjectName;
  }, [t]);

  const translateTerm = useCallback((termName: string): string => {
    if (!termName) return '';
    const termMap: { [key: string]: string } = {
      'Trimestre 1': t. gradeManagement.term1,
      'Trimestre 2': t. gradeManagement.term2,
      'Trimestre 3': t. gradeManagement.term3,
    };
    return termMap[termName] || termName;
  }, [t]);

  const fetchCoefficientsForClass = async (classId: number): Promise<Coefficient[]> => {
    try {
      const response = await apiClient.get(`/coefficientclasse?classeId=${classId}`);
      const rawCoefficients: any[] = response.data;
      return rawCoefficients.map(cc => ({
        id: cc.id,
        matiere_id: cc.matiere?.id || cc.matiere_id,
        classe_id: cc.classe?.id || cc.classe_id,
        coefficient: parseFloat(cc.coefficient),
      }));
    } catch (error: any) {
      toast({
        title: t.gradeManagement.errorLoadingCoefficients,
        description: `${t.gradeManagement.errorLoadingCoefficientsDesc} ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
      return [];
    }
  };

  const fetchActiveAcademicYearId = async (): Promise<number | null> => {
    try {
      const response = await apiClient.get('/configuration');
      const configData: Configuration | Configuration[] = response.data;

      let activeAnneeScolaireId: number | undefined;
      if (Array.isArray(configData) && configData.length > 0) {
        activeAnneeScolaireId = configData[0].annee_academique_active_id || configData[0].annee_scolaire?.id;
      } else if (configData && !Array.isArray(configData)) {
        activeAnneeScolaireId = configData.annee_academique_active_id || configData.annee_scolaire?.id;
      }

      return activeAnneeScolaireId !== undefined ? activeAnneeScolaireId : null;
    } catch (error: any) {
      toast({
        title: t.settings.errorLoadingCurrentYear,
        description: `${t.settings.errorFetchingCurrentYear} ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
      return null;
    }
  };

  const fetchUserInscriptionAndClassInfo = async (userId: number, activeAnneeAcademiqueId: number): Promise<{ studentName: string; className: string; classId: number; anneeScolaireId: number; eleveId: number } | null> => {
    try {
      const userResponse = await apiClient.get(`/users/${userId}`);
      const user: AuthUser = userResponse.data;
      const inscriptionResponse = await apiClient.get(`/inscriptions?utilisateurId=${userId}&anneeAcademiqueId=${activeAnneeAcademiqueId}&_expand=classe&_expand=annee_scolaire&_expand=utilisateur`);
      const inscriptions: Inscription[] = inscriptionResponse.data;

      if (inscriptions.length === 0) {
        toast({
          title: t.userManagement.noActiveRegistration,
          description: t.userManagement.noActiveRegistrationDesc,
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
          title: t.userManagement.errorLoadingEnrollments,
          description: t.userManagement.incompleteRegistration,
          variant: "destructive",
        });
        return null;
      }
      return {
        studentName: user.nom || t.common.unknown,
        className: currentInscription.classe?.nom || t.common.unknownClass,
        classId: classId,
        anneeScolaireId: anneeScolaireId,
        eleveId: eleveId,
      };
    } catch (error: any) {
      toast({
        title: t.common.errorLoading,
        description: `${t.studentMaterials.errorLoadingStudents} ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
      return null;
    }
  };

  

  const fetchAllTrimestresNames = async (): Promise<string[]> => {
    try {
      const response = await apiClient.get('/trimestres');
      const trimestres: TrimestreData[] = response.data;
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
    } catch (error: any) {
      toast({
        title: t.common.errorLoading,
        description: `${t.reports.errorLoadingTerms} ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
      return [];
    }
  };

  const fetchAllTrimestreObjects = async (): Promise<TrimestreData[]> => {
    try {
      const response = await apiClient.get('/trimestres');
      return response.data;
    } catch (error: any) {
      toast({
        title: t.common.errorLoading,
        description: `${t.reports.errorLoadingTerms} ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
      return [];
    }
  };

  const fetchAllStudentsInClass = async (classId: number, anneeScolaireId: number): Promise<Inscription[]> => {
    try {
      const response = await apiClient.get(`/inscriptions?classeId=${classId}&anneeAcademiqueId=${anneeScolaireId}&_expand=utilisateur`);
      return response.data;
    } catch (error: any) {
      toast({
        title: t.common.errorLoading,
        description: `${t.userManagement.errorLoadingEnrollments} ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
      return [];
    }
  };

  const fetchAllNotesForClass = async (classId: number, anneeScolaireId: number): Promise<Note[]> => {
    try {
      // 1. Fetch evaluations filtered by class and year for reliability
      const evalUrl = `/evaluations?classe_id=${classId}&annee_scolaire_id=${anneeScolaireId}`;
      console.log(`[StudentGrades] Fetching evaluations from: ${evalUrl}`);
      const evaluationsResponse = await apiClient.get(evalUrl);
      const evaluationsForClass: { id: number }[] = evaluationsResponse.data;
      console.log(`[StudentGrades] Évaluations trouvées pour la classe ${classId}:`, evaluationsForClass);
      const evaluationIds = evaluationsForClass.map(e => e.id);

    
      if (evaluationIds.length === 0) {
        return []; // No evaluations for this class, so no notes.
      }
      // 2. Fetch all notes and filter them by the relevant evaluation IDs
      const notesResponse = await apiClient.get(`/notes?_expand=evaluation&_expand=evaluation.matiere&_expand=evaluation.classe&_cacheBust=${Date.now()}`);
      const allNotesFromApi: any[] = notesResponse.data;

      const classNotesFromApi = allNotesFromApi.filter(note => evaluationIds.includes(note.evaluation?.id));
      console.log(`[StudentGrades] Notes trouvées pour la classe ${classId} (après filtrage):`, classNotesFromApi);

      return classNotesFromApi.map((apiNote: any) => {
        let studentIdVal: number | undefined;
        if (apiNote.etudiant && typeof apiNote.etudiant.id !== 'undefined') {
          studentIdVal = parseInt(String(apiNote.etudiant.id), 10);
        } else if (typeof apiNote.etudiant_id !== 'undefined') {
          studentIdVal = parseInt(String(apiNote.etudiant_id), 10);
        }

        const feEvaluation: Evaluation | undefined = apiNote.evaluation ? {
          id: parseInt(apiNote.evaluation.id, 10),
          type: apiNote.evaluation.type,
          matiere: apiNote.evaluation.matiere,
          classeId: apiNote.evaluation.classe?.id ? parseInt(apiNote.evaluation.classe.id, 10) : undefined,
          professeur_id: parseInt(apiNote.evaluation.professeur_id, 10),
          professeur: apiNote.evaluation.professeur,
          date_eval: apiNote.evaluation.date_eval,
                    trimestreId: apiNote.evaluation?.trimestre?.id ? parseInt(String(apiNote.evaluation.trimestre.id), 10) : undefined,
          annee_scolaire_id: apiNote.evaluation.classe?.annee_scolaire_id ?
                              parseInt(apiNote.evaluation.classe.annee_scolaire_id, 10) :
                              (apiNote.evaluation.annee_scolaire_id ? parseInt(apiNote.evaluation.annee_scolaire_id, 10) : undefined),
          anneeScolaire: apiNote.evaluation.anneeScolaire,
        } : undefined;

        return {
          id: parseInt(apiNote.id, 10),
          eleveId: studentIdVal as number, 
          evaluationId: feEvaluation ? feEvaluation.id : parseInt(apiNote.evaluation?.id, 10),
          evaluation: feEvaluation,
          note: parseFloat(apiNote.note),
        };
      }).filter(note =>
        typeof note.eleveId === 'number' && !isNaN(note.eleveId) &&
        note.evaluation !== undefined &&
        typeof note.evaluation.classeId === 'number' && !isNaN(note.evaluation.classeId) &&
        typeof note.evaluation.annee_scolaire_id === 'number' && !isNaN(note.evaluation.annee_scolaire_id)
      );
    } catch (error) {
      toast({
        title: t.common.errorLoading,
        description: `${t.gradeManagement.errorLoadingGrades} ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
      return [];
    }
  };

  useEffect(() => {
    setStudentName(t.common.loading);
    setClassName(t.common.loading);
    setStudentClassId(null);
    setStudentAnneeScolaireId(null);
    setEleveId(null);
    setClassCoefficients([]);
    setClassStudents([]);
    setClassNotes([]);
    setProcessedGrades({});
    setGeneralAverages({});
    setClassAverages({});
    setProgressData([]);
    setSubjectComparisonData([]);
  }, [userId, t]);

  useEffect(() => {
    const loadInitialAppConfig = async () => {
      setLoading(true);
      try {
        const [yearId, termsNames, termsObjects] = await Promise.all([
          fetchActiveAcademicYearId(),
          fetchAllTrimestresNames(),
          fetchAllTrimestreObjects(),
        ]);

        setActiveAcademicYearId(yearId);
        setAllPossibleTerms(termsNames);
        setAllTrimestreObjects(termsObjects);

        if (termsNames.length > 0) {
          setSelectedTerm(termsNames[termsNames.length - 1]);
        } else {
          setSelectedTerm(t.common.noDataAvailable);
        }
      } catch (error) {
        toast({
          title: t.common.errorLoadingInitialData,
          description: t.common.errorLoadingInitialDataDesc,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    loadInitialAppConfig();
  }, [t]);

  useEffect(() => {
    const loadStudentInfo = async () => {
      if (activeAcademicYearId === null || userId === undefined) {
        setEleveId(null);
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
          
          const [coeffs, students, taughtSubjects] = await Promise.all([
            fetchCoefficientsForClass(info.classId),
            fetchAllStudentsInClass(info.classId, info.anneeScolaireId),
            fetchTaughtSubjects(info.classId, info.anneeScolaireId)
          ]);
          setClassCoefficients(coeffs);
          setClassStudents(students);
          setAllMatiere(taughtSubjects);
          
          const notes = await fetchAllNotesForClass(info.classId, info.anneeScolaireId);
          setClassNotes(notes);
          console.log('%c[StudentGrades] Données de contexte chargées', 'color: green; font-weight: bold;', {
            'Infos Élève': info,
            'Coefficients': coeffs,
            'Élèves de la classe': students,
            'Notes de la classe': notes,
          });
        }
      } catch (error) {
        setEleveId(null);
        setClassCoefficients([]);
        setClassStudents([]);
        setClassNotes([]);
      } finally {
        setLoading(false);
      }
    };
    loadStudentInfo();
  }, [userId, activeAcademicYearId, t]);

  

  useEffect(() => {
     console.log('%c[StudentGrades] Déclenchement du calcul des notes (processNotes). Dépendances:', 'color: blue; font-weight: bold;', {
        selectedTerm, studentClassId, studentAnneeScolaireId, allMatiere, allPossibleTerms, allTrimestreObjects, classCoefficients, classStudents, classNotes
    });
    const termEvaluationMap: { [key: string]: { devoir1: string, devoir2: string, composition: string } } = {
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

        classAveragesCalc[term] = {};

        for (const matiereInfo of allMatiere) {
          const matiereId = matiereInfo.id;
          let totalMatiereAverage = 0;
          let studentCountWithMatiere = 0;

          for (const student of classStudents) {
            if (!student.utilisateur?.id) {
              continue;
            }

            const studentNotesForTerm = classNotes.filter(note => {
              if (!note.evaluation || note.eleveId !== student.utilisateur.id || note.evaluation.matiere?.id !== matiereId) {
                return false;
              }
              const evalDate = new Date(note.evaluation.date_eval);
              const termStartDate = new Date(currentTermObject.date_debut);
              const termEndDate = new Date(currentTermObject.date_fin);
              return evalDate >= termStartDate && evalDate <= termEndDate;
            });

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

          if (studentCountWithMatiere > 0) {
            classAveragesCalc[term][matiereId] = parseFloat((totalMatiereAverage / studentCountWithMatiere).toFixed(2));
          } else {
            classAveragesCalc[term][matiereId] = null;
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

const allStudentNotes = classNotes.filter(note => note.eleveId === eleveId);
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
          const devoirs = [devoir1Note, devoir2Note].filter(n => n !== null) as number[];
          const avgDevoirs = devoirs.length > 0 ? devoirs.reduce((sum, note) => sum + note, 0) / devoirs.length : null;

          const currentTrimestreNumero = parseInt(term.replace('Trimestre ', ''));

          if (currentTrimestreNumero === 1) {
            let somme = 0;
            let poids = 0;
            if (avgDevoirs !== null) {
              somme += avgDevoirs * 3;
              poids += 3;
            }
            if (compositionNote !== null) {
              somme += compositionNote;
              poids += 1;
            }
            subjectAverage = poids > 0 ? somme / poids : null;
          } else if (currentTrimestreNumero === 2) {
            const term1Obj = allTrimestreObjects.find(t =>
              t.nom === "Trimestre 1" && t.anneeScolaire?.id === studentAnneeScolaireId
            );
            let compoT1Note: number | null = null;
            if (term1Obj) {
              const compoT1EvalType = termEvaluationMap["Trimestre 1"]?.composition;
              const noteObj = allStudentNotes.find(n =>
                n.evaluation?.matiere?.id === matiereId &&
                n.evaluation?.trimestreId === term1Obj.id &&
                n.evaluation?.type === compoT1EvalType
              );
              compoT1Note = noteObj ? noteObj.note : null;
            }

            let somme = 0;
            let poids = 0;
            if (avgDevoirs !== null) { somme += avgDevoirs * 3; poids += 3; }
            if (compositionNote !== null) { somme += compositionNote * 2; poids += 2; }
            if (compoT1Note !== null) { somme += compoT1Note; poids += 1; }
            subjectAverage = poids > 0 ? somme / poids : null;

          } else if (currentTrimestreNumero === 3) {
            const term1Obj = allTrimestreObjects.find(t => 
              t.nom === "Trimestre 1" && t.anneeScolaire?.id === studentAnneeScolaireId
            );
            const term2Obj = allTrimestreObjects.find(t => 
              t.nom === "Trimestre 2" && t.anneeScolaire?.id === studentAnneeScolaireId
            );
            let compoT1Note: number | null = null, compoT2Note: number | null = null;

            if (term1Obj) {
              const compoT1EvalType = termEvaluationMap["Trimestre 1"]?.composition;
              const compoT1NoteObj = allStudentNotes.find(n =>
                n.evaluation?.matiere?.id === matiereId &&
                n.evaluation?.trimestreId === term1Obj.id &&
                n.evaluation?.type === compoT1EvalType
              );
              compoT1Note = compoT1NoteObj ? compoT1NoteObj.note : null;
            }
            if (term2Obj) {
              const compoT2EvalType = termEvaluationMap["Trimestre 2"]?.composition;
              const compoT2NoteObj = allStudentNotes.find(n =>
                n.evaluation?.matiere?.id === matiereId &&
                n.evaluation?.trimestreId === term2Obj.id &&
                n.evaluation?.type === compoT2EvalType
              );
              compoT2Note = compoT2NoteObj ? compoT2NoteObj.note : null;
            }

            let somme = 0;
            let poids = 0;
            if (avgDevoirs !== null) { somme += avgDevoirs * 3; poids += 3; }
            if (compositionNote !== null) { somme += compositionNote * 3; poids += 3; }
            if (compoT1Note !== null) { somme += compoT1Note; poids += 1; }
            if (compoT2Note !== null) { somme += compoT2Note * 2; poids += 2; }
            subjectAverage = poids > 0 ? somme / poids : null;
          }

          if (subjectAverage !== null) {
            subjectAverage = parseFloat(subjectAverage.toFixed(2));
            totalWeightedTermScore += subjectAverage * subjectCoefficient;
            totalCoefficientTerm += subjectCoefficient;
          }

          gradesForCurrentTerm.push({
            subject: translateSubject(subjectName),
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
        let classGeneralAverage = 0;
        let totalCoefficient = 0;
        
        if (classAveragesCalc[term]) {
          for (const matiereIdStr in classAveragesCalc[term]) {
            const classAverageForSubject = classAveragesCalc[term][parseInt(matiereIdStr)];
            if (classAverageForSubject !== null) {
              const coeff = classCoefficients.find(c => c.matiere_id === parseInt(matiereIdStr))?.coefficient || 1;
              classGeneralAverage += classAverageForSubject * coeff;
              totalCoefficient += coeff;
            }
          }
          
          if (totalCoefficient > 0 && !isNaN(classGeneralAverage / totalCoefficient)) {
            classGeneralAverage = parseFloat((classGeneralAverage / totalCoefficient).toFixed(2));
          }
        }
        
        return {
          name: translateTerm(term),
          moyenne: generalAveragesCalc[term] || 0,
          moyenneClasse: classGeneralAverage > 0 && !isNaN(classGeneralAverage) ? classGeneralAverage : 0,
        };
      });
      setProgressData(newProgressData);

      // Prepare subject comparison data
      const currentTermGrades = gradesByTerm[selectedTerm];
      if (currentTermGrades) {
        setSubjectComparisonData(currentTermGrades.map(subject => ({
          name: subject.subject,
          moyenne: subject.average !== null ? subject.average : 0,
          moyenneClasse: subject.classAvg !== null ? subject.classAvg : 0,
        })));
      } else {
        setSubjectComparisonData([]);
      }
    };

    processNotes();
  }, [
    eleveId,

    selectedTerm, 
    studentClassId, 
    studentAnneeScolaireId, 
    allMatiere, 
    allPossibleTerms, 
    allTrimestreObjects, 
    classCoefficients,
    classStudents,
    classNotes,
    t,
    translateSubject, translateTerm
  ]);

  const currentSelectedGrades = processedGrades[selectedTerm] || [];
  const currentSelectedAverage = generalAverages[selectedTerm] || 0;

  const getEvaluationHeaders = (term: string) => {
    switch (term) {
      case 'Trimestre 1':
        return {
          devoir1: t.gradeInput.test1,
          devoir2: t.gradeInput.test2,
          composition: t.gradeInput.exam1,
        };
      case 'Trimestre 2':
        return {
          devoir1: t.gradeInput.test3,
          devoir2: t.gradeInput.test4,
          composition: t.gradeInput.exam2,
        };
      case 'Trimestre 3':
        return {
          devoir1: t.gradeInput.test5,
          devoir2: t.gradeInput.test6,
          composition: t.gradeInput.exam3,
        };
      default:
        return {
          devoir1: t.gradeInput.test1,
          devoir2: t.gradeInput.test2,
          composition: t.gradeInput.exam1,
        };
    }
  };

  const { devoir1, devoir2, composition } = getEvaluationHeaders(selectedTerm);

  if (loading || activeAcademicYearId === null) {
    return (
      <div className="p-6 text-center text-gray-500" dir={isRTL ? 'rtl' : 'ltr'}>
        {t.common.loadingData}
      </div>
    );
  }

  if (eleveId === null) {
    return (
      <div className="p-6 text-center text-red-500" dir={isRTL ? 'rtl' : 'ltr'}>
        <h2 className="text-xl font-semibold mb-2">{t.common.errorLoading}</h2>
        <p>{t.userManagement.noActiveRegistrationDesc}</p>
      </div>
    );
  }

  return (
    <div className="p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <h1 className={`text-2xl font-bold mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t.studentGrades.title}
      </h1>

      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex flex-col md:flex-row items-start md:items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Select
            value={selectedTerm}
            onValueChange={setSelectedTerm}
            disabled={allPossibleTerms.length === 0 && selectedTerm === t.common.noDataAvailable}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t.common.selectATrimester} />
            </SelectTrigger>
            <SelectContent>
              {allPossibleTerms.length > 0 ? (
                allPossibleTerms.map((term) => (
                  <SelectItem key={term} value={term}>
                    {translateTerm(term)}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value={t.common.noDataAvailable} disabled>
                  {t.common.noDataAvailable}
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          <h2 className="text-lg font-semibold">
            {t.studentGrades.gradesFor} {translateTerm(selectedTerm)}
          </h2>
        </div>

      </div>

      <Tabs defaultValue="grades" className="space-y-4">
        <TabsList className={`w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
          <TabsTrigger value="grades">{t.studentGrades.gradeDetails}</TabsTrigger>
          <TabsTrigger value="charts">{t.studentGrades.charts}</TabsTrigger>
        </TabsList>

        <TabsContent value="grades">
          {useCardLayout ? (
            <div className="space-y-4">
              {currentSelectedGrades.length > 0 ? (
                currentSelectedGrades.map((grade, index) => (
                  <SubjectGradeCard key={index} grade={grade} headers={{ devoir1, devoir2, composition }} t={t} />
                ))
              ) : (
                <Card>
                  <CardContent className="text-center text-gray-500 py-8">
                    {selectedTerm === t.common.noDataAvailable
                      ? t.reports.noStudentOrGradeHint
                      : `${t.reports.noStudentOrGrade} ${translateTerm(selectedTerm)}.`}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {isRTL ? (
                          <>
                            <TableHead className="text-center">{t.studentGrades.classAverage}</TableHead>
                            <TableHead className="text-center">{t.reportManagement.subjectAvg}</TableHead>
                            <TableHead className="text-center">{composition}</TableHead>
                            <TableHead className="text-center">{devoir2}</TableHead>
                            <TableHead className="text-center">{devoir1}</TableHead>
                            <TableHead className="text-center">{t.reportManagement.coefficient}</TableHead>
                            <TableHead className="text-right">{t.reportManagement.subject}</TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead className="text-left">{t.reportManagement.subject}</TableHead>
                            <TableHead className="text-center">{t.reportManagement.coefficient}</TableHead>
                            <TableHead className="text-center">{devoir1}</TableHead>
                            <TableHead className="text-center">{devoir2}</TableHead>
                            <TableHead className="text-center">{composition}</TableHead>
                            <TableHead className="text-center">{t.reportManagement.subjectAvg}</TableHead>
                            <TableHead className="text-center">{t.studentGrades.classAverage}</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentSelectedGrades.length === 0 && allMatiere.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                            {selectedTerm === t.common.noDataAvailable
                              ? t.reports.noStudentOrGradeHint
                              : `${t.reports.noStudentOrGrade} ${selectedTerm}.`}
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentSelectedGrades.map((grade, index) => (
                          <TableRow key={index}>
                            {isRTL ? (
                              <>
                                <TableCell className="text-center text-gray-600">{grade.classAvg !== null ? `${grade.classAvg.toFixed(2)}/20` : '-'}</TableCell>
                                <TableCell className="text-center font-semibold">{grade.average !== null ? `${grade.average.toFixed(2)}/20` : '-'}</TableCell>
                                <TableCell className="text-center">{grade.compositionNote !== null ? `${grade.compositionNote}/20` : '-'}</TableCell>
                                <TableCell className="text-center">{grade.devoir2Note !== null ? `${grade.devoir2Note}/20` : '-'}</TableCell>
                                <TableCell className="text-center">{grade.devoir1Note !== null ? `${grade.devoir1Note}/20` : '-'}</TableCell>
                                <TableCell className="text-center">{grade.coefficient}</TableCell>
                                <TableCell className="font-medium text-right">{grade.subject}</TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell className="font-medium text-left">{grade.subject}</TableCell>
                                <TableCell className="text-center">{grade.coefficient}</TableCell>
                                <TableCell className="text-center">{grade.devoir1Note !== null ? `${grade.devoir1Note}/20` : '-'}</TableCell>
                                <TableCell className="text-center">{grade.devoir2Note !== null ? `${grade.devoir2Note}/20` : '-'}</TableCell>
                                <TableCell className="text-center">{grade.compositionNote !== null ? `${grade.compositionNote}/20` : '-'}</TableCell>
                                <TableCell className="text-center font-semibold">{grade.average !== null ? `${grade.average.toFixed(2)}/20` : '-'}</TableCell>
                                <TableCell className="text-center text-gray-600">{grade.classAvg !== null ? `${grade.classAvg.toFixed(2)}/20` : '-'}</TableCell>
                              </>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="charts">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t.studentGrades.averageEvolutionTitle}</CardTitle>
                <CardDescription>{t.studentGrades.averageEvolutionDesc}</CardDescription>
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
                        name={t.studentGrades.myAverage}
                        stroke="#3b82f6"
                        activeDot={{ r: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="moyenneClasse"
                        name={t.studentGrades.classAverage}
                        stroke="#9ca3af"
                      />
                    </LineChart>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      {t.studentGrades.noDataForEvolution}
                    </div>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.studentGrades.subjectComparisonTitle}</CardTitle>
                <CardDescription>{t.studentGrades.subjectComparisonDesc}</CardDescription>
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
                        name={t.studentGrades.myAverage}
                        fill="#3b82f6"
                      />
                      <Bar
                        dataKey="moyenneClasse"
                        name={t.studentGrades.classAverage}
                        fill="#9ca3af"
                      />
                    </BarChart>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      {t.studentGrades.noDataForComparison}
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

export default StudentGrades;