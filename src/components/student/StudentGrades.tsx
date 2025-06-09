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
  nom: string; // Ex: "Trimestre 1", "Trimestre 2"
  date_debut: string;
  date_fin: string;
}

interface Evaluation {
  id: number;
  type: string; // Changed to string to accommodate "Devoir 1", "Composition 1", etc. from ENUM
  matiere?: Matiere;
  classeId: number;
  classe?: Classe;
  professeur_id: number;
  professeur?: AuthUser;
  date_eval: string;
  trimestreId?: number; // Crucial for linking evaluations to terms
  annee_scolaire_id: number;
  anneeScolaire?: AnneeAcademique;
}

interface Note {
  id: number;
  eleveId: number;
  evaluationId: number;
  evaluation?: Evaluation; // The complete evaluation object is expected here
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

// Interface pour le traitement des notes par matière
interface StudentSubjectGrades {
  subject: string;
  matiereId: number;
  coefficient: number;
  devoir1Note: number | null; // This will hold the "first" devoir for the selected term
  devoir2Note: number | null; // This will hold the "second" devoir for the selected term
  compositionNote: number | null; // This will hold the "composition" for the selected term
  average: number;
  classAvg: number; // Placeholder for now, needs actual fetching
}

interface ProgressData {
  name: string;
  moyenne: number;
  moyenneClasse: number;
}

// --- Fonctions d'API ---
const API_BASE_URL = 'http://localhost:3000';

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

    if (activeAnneeScolaireId !== undefined) {
      return activeAnneeScolaireId;
    }

    toast({
      title: "Configuration manquante",
      description: "L'ID de l'année académique active n'a pas pu être trouvé. Vérifiez la configuration API.",
      variant: "destructive",
    });
    return null;
  } catch (error) {
    toast({
      title: "Erreur de configuration",
      description: `Impossible de charger l'année académique active. Détails: ${error instanceof Error ? error.message : String(error)}.`,
      variant: "destructive",
    });
    console.error('Error fetching active academic year ID:', error);
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
    const eleveId = currentInscription.utilisateur?.id; // Assuming utilisateur.id is the eleveId

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
    console.error('Error fetching user inscription and class info:', error);
    return null;
  }
};

const fetchNotesForEleve = async (eleveId: number): Promise<Note[]> => {
  try {
    // Ensure _expand=evaluation is used to get the nested evaluation object
    // And _expand=evaluation.matiere to get the nested matiere object within evaluation
    const response = await fetch(`${API_BASE_URL}/api/notes?eleveId=${eleveId}&_expand=evaluation&_expand=evaluation.matiere`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}. Response: ${errorText}`);
    }
    const notes = await response.json();
    return notes;
  } catch (error) {
    toast({
      title: "Erreur de chargement",
      description: `Impossible de charger les notes de l'élève. Détails: ${error instanceof Error ? error.message : String(error)}.`,
      variant: "destructive",
    });
    console.error('Error fetching notes for eleve:', error);
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
    const matieres = await response.json();
    return matieres;
  } catch (error) {
    toast({
      title: "Erreur de chargement",
      description: `Impossible de charger la liste des matières. Détails: ${error instanceof Error ? error.message : String(error)}.`,
      variant: "destructive",
    });
    console.error('Error fetching all matieres:', error);
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
    console.error('Error fetching all trimestre names:', error);
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
    const trimestres: TrimestreData[] = await response.json();
    return trimestres;
  } catch (error) {
    toast({
      title: "Erreur de chargement",
      description: `Impossible de charger les objets trimestres. Détails: ${error instanceof Error ? error.message : String(error)}.`,
      variant: "destructive",
    });
    console.error('Error fetching all trimestre objects:', error);
    return [];
  }
};

// --- Composant StudentGrades ---
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

  const [processedGrades, setProcessedGrades] = useState<{ [term: string]: StudentSubjectGrades[] }>({});
  const [generalAverages, setGeneralAverages] = useState<{ [term: string]: number }>({});
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [subjectComparisonData, setSubjectComparisonData] = useState<any[]>([]);

  // Effect 1: Load active academic year ID, all possible terms (names & objects), and all matieres
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
          // Set the default selected term to the last one (e.g., "Trimestre 3")
          setSelectedTerm(termsNames[termsNames.length - 1]);
        } else {
          setSelectedTerm('Aucun trimestre');
        }
      } catch (error) {
        // Errors are already handled by toast in the fetch functions
      } finally {
        setLoading(false);
      }
    };
    loadInitialAppConfig();
  }, []);

  // Effect 2: Load initial student/class info once activeAcademicYearId is known
  useEffect(() => {
    const loadStudentInfo = async () => {
      if (activeAcademicYearId === null) {
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
          setEleveId(info.eleveId);
        } else {
          setEleveId(null);
        }
      } catch (error) {
        // Errors already handled by toast
      } finally {
        setLoading(false);
      }
    };
    loadStudentInfo();
  }, [userId, activeAcademicYearId]);

  // Effect 3: Fetch student notes once eleveId is available
  useEffect(() => {
    const getStudentNotes = async () => {
      if (eleveId) {
        setLoading(true);
        const notes = await fetchNotesForEleve(eleveId);
        setAllStudentNotes(notes);
        setLoading(false);
      } else if (activeAcademicYearId !== null && !loading) {
        // If eleveId is null and not loading, clear notes to reflect no data
        setAllStudentNotes([]);
        setLoading(false);
      }
    };
    getStudentNotes();
  }, [eleveId, activeAcademicYearId]);

  // Effect 4: Process notes and calculate averages whenever relevant data changes
  useEffect(() => {
    // This condition ensures all necessary data is loaded before processing
    if (!studentClassId || !studentAnneeScolaireId || allMatiere.length === 0 || allPossibleTerms.length === 0 || allTrimestreObjects.length === 0) {
      // It's possible allStudentNotes is empty but other data is fine, so don't block
      // if (allStudentNotes.length === 0 && eleveId !== null) { /* don't clear, wait for notes */ }
      setProcessedGrades({});
      setGeneralAverages({});
      setProgressData([]);
      setSubjectComparisonData([]);
      return;
    }

    const processNotes = async () => {
      const gradesByTerm: { [term: string]: StudentSubjectGrades[] } = {};
      const generalAveragesCalc: { [term: string]: number } = {};

      const termsToProcess = allPossibleTerms.length > 0 ? allPossibleTerms : ["Aucun trimestre"];

      // Define how evaluation types map to generic "Devoir 1", "Devoir 2", "Composition" slots per term
      // This is crucial for correctly mapping your ENUM types to the display columns
      const termEvaluationMap: { [key: string]: { devoir1: string, devoir2: string, composition: string } } = {
        'Trimestre 1': { devoir1: 'Devoir 1', devoir2: 'Devoir 2', composition: 'Composition 1' },
        'Trimestre 2': { devoir1: 'Devoir 3', devoir2: 'Devoir 4', composition: 'Composition 2' },
        'Trimestre 3': { devoir1: 'Devoir 5', devoir2: 'Devoir 6', composition: 'Composition 3' },
      };

      for (const term of termsToProcess) {
        const currentTermObject = allTrimestreObjects.find(t => t.nom === term);
        const currentTermId = currentTermObject?.id;

        // Skip processing if term ID is not found (should not happen if `allTrimestreObjects` is correctly populated)
        if (currentTermId === undefined) {
          continue;
        }

        const gradesForCurrentTerm: StudentSubjectGrades[] = [];
        let totalWeightedTermScore = 0;
        let totalCoefficientTerm = 0;

        for (const matiereInfo of allMatiere) {
          const matiereId = matiereInfo.id;
          const subjectName = matiereInfo.nom;
          const subjectCoefficient = matiereInfo.coefficient;

          let devoir1Note: number | null = null;
          let devoir2Note: number | null = null;
          let compositionNote: number | null = null;

          let devoirsSum = 0;
          let devoirsCount = 0;
          let compositionsSum = 0;
          let compositionsCount = 0;

          const notesForSubjectAndTerm = allStudentNotes.filter(note => {
            // Ensure evaluation object and its properties exist
            if (!note.evaluation || !note.evaluation.matiere || note.evaluation.trimestreId === undefined) {
              return false;
            }

            const matiereIdMatch = note.evaluation.matiere.id === matiereId;
            const trimestreIdMatch = note.evaluation.trimestreId === currentTermId;

            return matiereIdMatch && trimestreIdMatch;
          });

          notesForSubjectAndTerm.forEach(note => {
            const evaluationType = note.evaluation?.type; // e.g., "Devoir 1", "Devoir 3", "Composition 1"

            const currentTermEvaluations = termEvaluationMap[term];

            if (currentTermEvaluations) {
              // Use strict equality for evaluation types based on the defined map
              if (evaluationType === currentTermEvaluations.devoir1) {
                devoir1Note = note.note;
                devoirsSum += note.note;
                devoirsCount++;
              } else if (evaluationType === currentTermEvaluations.devoir2) {
                devoir2Note = note.note;
                devoirsSum += note.note;
                devoirsCount++;
              } else if (evaluationType === currentTermEvaluations.composition) {
                compositionNote = note.note;
                compositionsSum += note.note;
                compositionsCount++;
              }
            }
          });

          let subjectAverage = 0;
          const hasDevoirs = devoirsCount > 0;
          const hasComposition = compositionsCount > 0;

          if (hasDevoirs && hasComposition) {
            // Average of devoirs (40%) + composition (60%)
            subjectAverage = (devoirsSum / devoirsCount) * 0.4 + (compositionsSum / compositionsCount) * 0.6;
          } else if (hasComposition) {
            // If only composition exists, average is just composition score
            subjectAverage = compositionsSum / compositionsCount;
          } else if (hasDevoirs) {
            // If only devoirs exist, average is just devoirs average
            subjectAverage = devoirsSum / devoirsCount;
          }
          subjectAverage = parseFloat(subjectAverage.toFixed(1));

          // In a real application, you would fetch or calculate class average here
          // For now, it's a simple placeholder, slightly varied for demo purposes
          const classAvg = parseFloat((subjectAverage > 0 ? (subjectAverage + (Math.random() * 2 - 1)) : 0).toFixed(1));

          gradesForCurrentTerm.push({
            subject: subjectName,
            matiereId: matiereId,
            coefficient: subjectCoefficient,
            devoir1Note: devoir1Note,
            devoir2Note: devoir2Note,
            compositionNote: compositionNote,
            average: subjectAverage,
            classAvg: classAvg,
          });

          // Only contribute to general average if there are any grades for the subject
          if (hasDevoirs || hasComposition) {
            totalWeightedTermScore += subjectAverage * subjectCoefficient;
            totalCoefficientTerm += subjectCoefficient;
          }
        }
        gradesByTerm[term] = gradesForCurrentTerm;
        generalAveragesCalc[term] = totalCoefficientTerm > 0 ? parseFloat((totalWeightedTermScore / totalCoefficientTerm).toFixed(1)) : 0;
      }
      setProcessedGrades(gradesByTerm);
      setGeneralAverages(generalAveragesCalc);

      // Prepare progress data for charts
      const newProgressData: ProgressData[] = allPossibleTerms.map(term => ({
        name: term,
        moyenne: generalAveragesCalc[term] || 0,
        // Simulate class average for now; replace with actual data
        moyenneClasse: parseFloat((generalAveragesCalc[term] ? (generalAveragesCalc[term] + (Math.random() * 2 - 1.5)) : 0).toFixed(1)),
      }));
      setProgressData(newProgressData);

      // Prepare subject comparison data for charts (for the currently selected term)
      const currentTermGrades = gradesByTerm[selectedTerm];
      if (currentTermGrades) {
        setSubjectComparisonData(currentTermGrades.map(subject => ({
          name: subject.subject.substring(0, Math.min(subject.subject.length, 5)), // Shorten subject name for chart, max 5 chars
          moyenne: subject.average,
          moyenneClasse: subject.classAvg,
        })));
      } else {
        setSubjectComparisonData([]);
      }
    };

    processNotes();
  }, [allStudentNotes, selectedTerm, studentClassId, studentAnneeScolaireId, allMatiere, allPossibleTerms, allTrimestreObjects]);

  const currentSelectedGrades = processedGrades[selectedTerm] || [];
  const currentSelectedAverage = generalAverages[selectedTerm] || 0;

  const downloadReport = () => {
    toast({
      title: "Téléchargement",
      description: `Le bulletin de ${selectedTerm} est en cours de téléchargement.`,
    });
    // Implement actual download logic here (e.g., generate PDF)
  };

  const printReport = () => {
    toast({
      title: "Impression",
      description: `Le bulletin de ${selectedTerm} est envoyé à l'imprimante.`,
    });
    // Implement actual print logic here
  };

  /**
   * Helper function to get Devoir and Composition names for table headers
   * based on the selected term, matching the ENUM values.
   */
  const getEvaluationHeaders = (term: string) => {
    // This map directly reflects the values from your termEvaluationMap above
    // ensuring consistency between data processing and display.
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
        // Fallback for terms not explicitly mapped or 'Aucun trimestre'
        return {
          devoir1: 'Devoir 1',
          devoir2: 'Devoir 2',
          composition: 'Composition',
        };
    }
  };

  const { devoir1, devoir2, composition } = getEvaluationHeaders(selectedTerm);


  // --- RENDERING LOGIC ---
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
        <p className="mt-2 text-sm">Veuillez vérifier les données de l'API (`/api/inscriptions`) ou si l'élève est bien inscrit pour l'année scolaire ID `{activeAcademicYearId}`.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Mes Notes & Bulletins</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-2">Moyenne Générale ({selectedTerm})</h3>
            <p className="text-3xl font-bold text-blue-600">{currentSelectedAverage.toFixed(1)}</p>
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
              {/* This would ideally come from backend data or be dynamically generated */}
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
                      {/* Dynamic Headers based on selectedTerm */}
                      <TableHead className="text-center">{devoir1}</TableHead>
                      <TableHead className="text-center">{devoir2}</TableHead>
                      <TableHead className="text-center">{composition}</TableHead>
                      {/* End Dynamic Headers */}
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
                          <TableCell className="text-center font-semibold">{grade.average.toFixed(1)}/20</TableCell>
                          <TableCell className="text-center text-gray-600">{grade.classAvg.toFixed(1)}/20</TableCell>
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