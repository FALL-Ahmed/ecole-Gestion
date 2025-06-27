import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { toast } from '@/hooks/use-toast';
import { format, parseISO, getMonth, getYear } from 'date-fns';
import { fr } from 'date-fns/locale';
// Utilisez la variable d'environnement VITE_API_BASE_URL configurée sur Vercel
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_URL}/api`;
// --- Interface Definitions ---
interface AnneeAcademique {
  id: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
}

interface Classe {
  id: number;
  nom: string;
  niveau: string;
  annee_scolaire_id: number;
}

interface Trimestre {
  id: number;
  nom: string;
  date_debut: string;
  date_fin: string;
anneeScolaire: { // Align with other components for consistency
    id: number;
    libelle?: string; // Optional, but good to have if available
  };}

interface User {
  id: number;
  nom: string;
  prenom: string;
  role: string;
  genre?: 'masculin' | 'feminin' | null;
}

interface StudentWithClass extends User {
  classe?: Classe; // Added during student data processing
}
interface Inscription {
  id: number;
  utilisateur: User;
  classe: Classe;
  annee_scolaire: AnneeAcademique;
}

interface CoefficientClasse {
  id: number;
  matiere_id: number;
  classe_id: number;
  coefficient: number;
  matiere?: { id: number; nom: string };
  classe?: { id: number; nom: string; annee_scolaire_id?: number };
}

interface Evaluation {
  annee_scolaire_id: number;
  id: number;
  type: string;
  date_eval: string; // Corrected to match API response ('date_eval')
  matiere?: { id: number; nom: string };
  classe_id?: number;
// annee_scolaire_id is not directly on evaluation in the expanded note,
  // it's nested within evaluation.classe
  trimestreId?: number;
// Add the nested 'classe' structure as seen in the API log
  classe?: {
    id: number; // Or other properties of classe if needed
    annee_scolaire_id: number;
  };
}

interface Note {
  id: number;
  note: number;
  etudiant?: { id: number };
  evaluation?: Evaluation;
}

interface Absence {
  id: number;
  date: string; // YYYY-MM-DD
  etudiant_id: number;
  justification?: string | null; // Pour déterminer si l'absence est justifiée
  // Add other relevant fields if needed for stats, e.g., matiere_id
}

// Chart data types
interface NameValueChartItem {
  name: string;
  value: number;
}
interface NameValueColorChartItem extends NameValueChartItem {
  color: string;
}
interface AttendanceChartItem {
  name: string;
  tauxAssiduite: number;
  tauxAbsenceNonJustifiee: number;
}
interface GradeChartItem {
  name: string;
  moyenne: number;
}
interface SubjectSuccessRateItem {
  name: string;
  taux: number;
}

// Helper function to format academic year display
const formatAcademicYearDisplay = (annee: { libelle: string; date_debut?: string; date_fin?: string }): string => {
  if (!annee || !annee.date_debut || !annee.date_fin) {
    return annee.libelle || "Année inconnue";
  }
  const startYear = new Date(annee.date_debut).getFullYear();
  const endYear = new Date(annee.date_fin).getFullYear();
  return annee.libelle && annee.libelle.includes(String(startYear)) && annee.libelle.includes(String(endYear)) ? annee.libelle : `${annee.libelle || ''} (${startYear}-${endYear})`.trim();
};

// --- Helper Functions ---
const COLORS_PIE = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CF2', '#FF6699'];

const calculateSchoolDays = (startDateStr: string, endDateStr: string): number => {
  try {
    const start = parseISO(startDateStr);
    const end = parseISO(endDateStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      console.warn("Invalid dates for school day calculation:", startDateStr, endDateStr);
      return 0;
    }
    let count = 0;
    let currentDate = new Date(start.valueOf()); // Clone start date
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay(); // 0 (Sunday) to 6 (Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday and Saturday
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return count;
  } catch (e) {
    console.error("Error calculating school days:", e, { startDateStr, endDateStr });
    return 0; // Fallback
  }
};

export function Statistics() {
  const [academicYears, setAcademicYears] = useState<AnneeAcademique[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>('');

  const [classesForYear, setClassesForYear] = useState<Classe[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all'); // 'all' or class ID

  const [termsForYear, setTermsForYear] = useState<Trimestre[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('all'); // 'all' or term ID

  const [studentsInYear, setStudentsInYear] = useState<StudentWithClass[]>([]);
  const [gradesInYear, setGradesInYear] = useState<Note[]>([]);
  const [absencesInYear, setAbsencesInYear] = useState<Absence[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all'); // 'all' ou ID de l'élève
  const [coefficients, setCoefficients] = useState<CoefficientClasse[]>([]);

  const [loading, setLoading] = useState({
    initial: true,
    academicYears: true,
    classes: false,
    terms: false,
    students: false,
    grades: false,
    absences: false,
        coefficients: false,

  });
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>('overview');

  const fetchData = useCallback(async (endpoint: string, setLoadingKey?: keyof typeof loading) => {
    if (setLoadingKey) setLoading(prev => ({ ...prev, [setLoadingKey]: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/${endpoint}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch ${endpoint}: ${response.status} - ${errorText}`);
      }
      return await response.json();
    } catch (err: any) {
      console.error(`Error fetching ${endpoint}:`, err);
      toast({ title: "Erreur de chargement", description: err.message, variant: "destructive" });
      setError(`Impossible de charger: ${endpoint}`);
      return [];
    } finally {
      if (setLoadingKey) setLoading(prev => ({ ...prev, [setLoadingKey]: false }));
    }
  }, []);

  // Fetch Academic Years and set default
  useEffect(() => {
    const fetchInitialYears = async () => {
      const years: AnneeAcademique[] = await fetchData('annees-academiques', 'academicYears');
      setAcademicYears(years);
      if (years.length > 0) {
        // Try to find current year from configuration
        try {
          const config = await fetchData('configuration');
          const activeYearId = config?.annee_scolaire?.id || config?.annee_academique_active_id;
          if (activeYearId && years.some(y => y.id === activeYearId)) {
            setSelectedAcademicYearId(String(activeYearId));
          } else {
            // Fallback to the latest year by date_debut or just the first one
             const sortedYears = [...years].sort((a, b) => new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime());
            setSelectedAcademicYearId(String(sortedYears[0]?.id || years[0]?.id));
          }
        } catch (configError) {
          console.warn("Could not fetch configuration for active year, defaulting.", configError);
          const sortedYears = [...years].sort((a, b) => new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime());
          setSelectedAcademicYearId(String(sortedYears[0]?.id || years[0]?.id));
        }
      }
      setLoading(prev => ({ ...prev, initial: false, academicYears: false }));
    };
    fetchInitialYears();
  }, [fetchData]);

  // Fetch data dependent on selectedAcademicYearId
  useEffect(() => {
  if (!selectedAcademicYearId) return;

  const yearId = parseInt(selectedAcademicYearId);

  const loadYearData = async () => {
    setClassesForYear([]);
    setSelectedClassId('all');
    setTermsForYear([]);
    setSelectedTermId('all');

    // 1. Fetch Classes (et attendre le résultat)
    const allClasses: Classe[] = await fetchData('classes', 'classes');
    const filteredClasses = allClasses.filter(cls => cls.annee_scolaire_id === yearId);
    setClassesForYear(filteredClasses);

    // 2. Fetch Terms
    fetchData(`trimestres?anneeScolaireId=${yearId}`, 'terms').then(setTermsForYear);

    // 3. Fetch Students
    setLoading(prev => ({ ...prev, students: true }));
    fetchData(`inscriptions?anneeScolaireId=${yearId}&_expand=utilisateur&_expand=classe`)
      .then((inscriptions: Inscription[]) => {
        const students: StudentWithClass[] = inscriptions.map(insc => ({
          ...insc.utilisateur,
          classe: insc.classe,
        }));
        setStudentsInYear(students);
      })
      .finally(() => setLoading(prev => ({ ...prev, students: false })));

    // 4. Fetch Grades
    setLoading(prev => ({ ...prev, grades: true }));
    fetchData(`notes?_expand=evaluation`)
      .then(data => {
        console.log(`[Statistics.tsx] Fetched grades for year ${yearId} (raw from API, count: ${data.length}):`, data.slice(0, 5));
        setGradesInYear(data);
      })
      .finally(() => setLoading(prev => ({ ...prev, grades: false })));

    // 5. Fetch Absences
    const selectedYear = academicYears.find(ay => ay.id === yearId);
    if (selectedYear) {
      setLoading(prev => ({ ...prev, absences: true }));
      fetchData(`absences?annee_scolaire_id=${yearId}&date_gte=${selectedYear.date_debut}&date_lte=${selectedYear.date_fin}`)
        .then(setAbsencesInYear)
        .finally(() => setLoading(prev => ({ ...prev, absences: false })));
    }

    // 6. Fetch Coefficients (après avoir les classes)
    setLoading(prev => ({ ...prev, coefficients: true }));
    const allCoeffs: CoefficientClasse[] = await fetchData(`coefficientclasse?_expand=matiere&_expand=classe`);
    console.log("[Coeffs] Raw Coefficients fetched from API (allCoeffs):", JSON.stringify(allCoeffs, null, 2)); // Log tous les coeffs bruts
   // Mapping correct pour garantir la présence de classe_id et matiere_id
const mappedCoeffs = allCoeffs.map(c => ({
  ...c,
  classe_id: c.classe?.id ?? c.classe_id,
  matiere_id: c.matiere?.id ?? c.matiere_id,
}));
    const classIdsForYear = filteredClasses.map(cls => cls.id);
    console.log("[Coeffs] classIdsForYear used for filtering coefficients:", classIdsForYear);
   const yearCoeffs = mappedCoeffs.filter(c => classIdsForYear.includes(Number(c.classe_id)));
console.log("[Coeffs] Coefficients after filtering by classIdsForYear (yearCoeffs):", JSON.stringify(yearCoeffs, null, 2));
setCoefficients(yearCoeffs);
console.log("[Coeffs] State `coefficients` set with count:", yearCoeffs.length);
setLoading(prev => ({ ...prev, coefficients: false }));
  };

  loadYearData();
}, [selectedAcademicYearId, fetchData, academicYears]);


  // --- Memoized data processing for charts ---
// Helper function to calculate a student's average for a specific subject and term
  const calculateStudentSubjectAverageForTerm = useCallback((
    studentId: number,
    subjectId: number,
    termId: number,
    academicYearId: number,
    allNotesForYear: Note[],
    allEvalsForYear: Evaluation[],
    allTermsForAcademicYear: Trimestre[]
  ): number => {
     // --- DEBUG LOGS ---
    console.log(`[calcAvg] Student: ${studentId}, Subject: ${subjectId}, Term: ${termId}, Year: ${academicYearId}`);
    console.log(`[calcAvg] allNotesForYear count: ${allNotesForYear.length}, allEvalsForYear count: ${allEvalsForYear.length}, allTermsForAcademicYear count: ${allTermsForAcademicYear.length}`);

    const currentTermObj = allTermsForAcademicYear.find(t => t.id === termId); // termId est le trimestre pour lequel on calcule
 if (!currentTermObj) {
      console.warn(`[calcAvg] Current term object not found for termId: ${termId}`);
      return 0;
    }
    let currentTrimestreNumero = 0;
    if (currentTermObj.nom.toLowerCase().includes("trimestre 1") || currentTermObj.nom.includes("1")) currentTrimestreNumero = 1;
    else if (currentTermObj.nom.toLowerCase().includes("trimestre 2") || currentTermObj.nom.includes("2")) currentTrimestreNumero = 2;
    else if (currentTermObj.nom.toLowerCase().includes("trimestre 3") || currentTermObj.nom.includes("3")) currentTrimestreNumero = 3;
    if (currentTrimestreNumero === 0) {
      console.warn(`[calcAvg] Could not determine trimestre number for term: ${currentTermObj.nom}`);
      return 0;
    }
    console.log(`[calcAvg] currentTrimestreNumero: ${currentTrimestreNumero}`);




    const studentNotesForSubjectCurrentTerm = allNotesForYear.filter(note =>
      note.etudiant?.id === studentId &&
      note.evaluation?.matiere?.id === subjectId &&
      note.evaluation?.trimestreId === termId
    );
     console.log(`[calcAvg] studentNotesForSubjectCurrentTerm (count: ${studentNotesForSubjectCurrentTerm.length}):`, studentNotesForSubjectCurrentTerm.slice(0,2));

    let totalPointsDevoirsCurrentTerm = 0;
    let countDevoirsCurrentTerm = 0;
    let compositionNoteValueCurrentTerm: number | null = null;


    studentNotesForSubjectCurrentTerm.forEach(note => {
      const evalType = note.evaluation?.type?.toLowerCase() || "";
      if (evalType.includes("devoir")) {
        totalPointsDevoirsCurrentTerm += note.note;
        countDevoirsCurrentTerm++;
      
      } else if (evalType.includes("composition") || evalType.includes("compo")) {
        compositionNoteValueCurrentTerm = note.note;
      }
    });

    const avgDevoirsCurrentTerm = countDevoirsCurrentTerm > 0 ? totalPointsDevoirsCurrentTerm / countDevoirsCurrentTerm : 0;
    console.log(`[calcAvg] avgDevoirsCurrentTerm: ${avgDevoirsCurrentTerm}, compositionNoteValueCurrentTerm: ${compositionNoteValueCurrentTerm}`);

    let compoT1Note: number | null = null;
    let compoT2Note: number | null = null;

    if (currentTrimestreNumero === 2 || currentTrimestreNumero === 3) {
  const trimestre1Obj = allTermsForAcademicYear.find(t => 
        (t.nom.toLowerCase().includes("trimestre 1") || t.nom.includes("1")) && 
        t.anneeScolaire.id === academicYearId
      );      if (trimestre1Obj) {
                console.log(`[calcAvg] Found trimestre1Obj for T1 compo:`, trimestre1Obj);

        const compoT1Eval = allEvalsForYear.find(e =>
          e.matiere?.id === subjectId &&
          e.trimestreId === trimestre1Obj.id &&
          (e.type?.toLowerCase().includes("composition") || e.type?.toLowerCase().includes("compo")) &&
          e.classe?.annee_scolaire_id === academicYearId // Assurer que l'évaluation est de la bonne année scolaire
        );
        if (compoT1Eval) {
                     console.log(`[calcAvg] Found compoT1Eval:`, compoT1Eval);

          const noteT1 = allNotesForYear.find(n => n.etudiant?.id === studentId && n.evaluation?.id === compoT1Eval.id);
          compoT1Note = noteT1 ? noteT1.note : null;
                    console.log(`[calcAvg] compoT1Note: ${compoT1Note}`);

        }
 } else {
       console.warn(`[calcAvg] Trimestre 1 object not found for year ${academicYearId} to fetch T1 compo.`);
      }    }

    if (currentTrimestreNumero === 3) {
const trimestre2Obj = allTermsForAcademicYear.find(t => 
        (t.nom.toLowerCase().includes("trimestre 2") || t.nom.includes("2")) && 
        t.anneeScolaire.id === academicYearId
      );      if (trimestre2Obj) {
                console.log(`[calcAvg] Found trimestre2Obj for T2 compo:`, trimestre2Obj);

        const compoT2Eval = allEvalsForYear.find(e =>
          e.matiere?.id === subjectId &&
          e.trimestreId === trimestre2Obj.id &&
          (e.type?.toLowerCase().includes("composition") || e.type?.toLowerCase().includes("compo")) &&
          e.classe?.annee_scolaire_id === academicYearId // Assurer que l'évaluation est de la bonne année scolaire
        );
        if (compoT2Eval) {
                    console.log(`[calcAvg] Found compoT2Eval:`, compoT2Eval);

          const noteT2 = allNotesForYear.find(n => n.etudiant?.id === studentId && n.evaluation?.id === compoT2Eval.id);
          compoT2Note = noteT2 ? noteT2.note : null;
                    console.log(`[calcAvg] compoT2Note: ${compoT2Note}`);

        }
            } else {
        // console.warn(`[calcAvg] Trimestre 2 object not found for year ${academicYearId} to fetch T2 compo.`);
      }

    }

    let moyenneMatiere = 0;
    if (currentTrimestreNumero === 1) {
       let somme = 0;
      let poids = 0;
      if (countDevoirsCurrentTerm > 0) { somme += avgDevoirsCurrentTerm * 3; poids += 3; }
      if (compositionNoteValueCurrentTerm !== null) { somme += compositionNoteValueCurrentTerm; poids += 1; }
      moyenneMatiere = poids > 0 ? somme / poids : 0;
          console.log(`[calcAvg] Final - Somme: ${somme}, Poids: ${poids}, MoyenneMatiere: ${moyenneMatiere.toFixed(2)}`);

    } else if (currentTrimestreNumero === 2) {
      let somme = 0;
      let poids = 0;
      if (countDevoirsCurrentTerm > 0) { somme += avgDevoirsCurrentTerm * 3; poids += 3; }
      if (compositionNoteValueCurrentTerm !== null) { somme += compositionNoteValueCurrentTerm; poids += 1; }
      if (compoT1Note !== null) { somme += compoT1Note; poids += 1; }
      moyenneMatiere = poids > 0 ? somme / poids : 0;
    } else if (currentTrimestreNumero === 3) {
           let somme = 0;
      let poids = 0;
      if (countDevoirsCurrentTerm > 0) { somme += avgDevoirsCurrentTerm * 3; poids += 3; }
      if (compositionNoteValueCurrentTerm !== null) { somme += compositionNoteValueCurrentTerm; poids += 1; }
      if (compoT1Note !== null) { somme += compoT1Note; poids += 1; }
      if (compoT2Note !== null) { somme += compoT2Note; poids += 1; }
      moyenneMatiere = poids > 0 ? somme / poids : 0;
    }

    return parseFloat(moyenneMatiere.toFixed(2));
  }, []);


  const studentDistributionData = useMemo((): NameValueColorChartItem[] => {
    if (loading.students || studentsInYear.length === 0) return [];
    const distribution: { [key: string]: number } = {};
    studentsInYear.forEach(student => {
      const niveau = student.classe?.niveau || 'N/A';
      distribution[niveau] = (distribution[niveau] || 0) + 1;
    });
    return Object.entries(distribution).map(([name, value], index) => ({
      name,
      value,
      color: COLORS_PIE[index % COLORS_PIE.length],
    }));
  }, [studentsInYear, loading.students]);

  const studentsForFilter = useMemo(() => {
    if (!selectedAcademicYearId) return [];
    if (selectedClassId === 'all') {
      // Pour l'instant, on ne peuple le filtre élève que si une classe est sélectionnée
      // Si vous souhaitez afficher tous les élèves de l'année ici:
      // return studentsInYear;
      return [];
    }
    return studentsInYear.filter(student => String(student.classe?.id) === selectedClassId);
  }, [studentsInYear, selectedClassId, selectedAcademicYearId]);

  const genderDistributionData = useMemo((): NameValueColorChartItem[] => {
    if (loading.students || studentsInYear.length === 0) return [];

    const studentsToProcess = selectedClassId === 'all'
      ? studentsInYear
      : studentsInYear.filter(s => String(s.classe?.id) === selectedClassId);

    if (studentsToProcess.length === 0) return [];

    const distribution: { [key: string]: number } = { Filles: 0, Garçons: 0, Autre: 0 };
    studentsToProcess.forEach(student => {
      if (student.genre === 'feminin') distribution.Filles++;
      else if (student.genre === 'masculin') distribution.Garçons++;
      else distribution.Autre++;
    });

    return [
      { name: 'Filles', value: distribution.Filles, color: '#FF8042' },
      { name: 'Garçons', value: distribution.Garçons, color: '#0088FE' },
      { name: 'Autre', value: distribution.Autre, color: '#FFBB28' },
    ].filter(item => item.value > 0);
  }, [studentsInYear, loading.students, selectedClassId]); // selectedStudentId n'est pas pertinent ici directement, car on filtre studentsToProcess


  const filteredGrades = useMemo(() => {
     console.log("[Statistics.tsx] --- filteredGrades useMemo ---");
    // console.log("gradesInYear (before filter, first 5):", JSON.stringify(gradesInYear.slice(0, 5), null, 2));
    console.log("[Statistics.tsx] gradesInYear raw count (before filter):", gradesInYear.length);
    if (gradesInYear.length > 0) {
      console.log("[Statistics.tsx] First grade object in gradesInYear:", JSON.stringify(gradesInYear[0], null, 2));
    }
    console.log("[Statistics.tsx] selectedAcademicYearId for filtering:", selectedAcademicYearId);

    let tempGrades = gradesInYear;
if (!selectedAcademicYearId) {
      console.log("[Statistics.tsx] No selectedAcademicYearId, returning empty for filteredGrades");
      return [];
    }
    const yearIdNum = parseInt(selectedAcademicYearId);

    // Filter grades by the selected academic year first
tempGrades = gradesInYear.filter(grade => {
      // Correction : l'année scolaire est dans grade.evaluation.classe.annee_scolaire_id
  const evalYearId = grade.evaluation?.classe?.annee_scolaire_id ?? grade.evaluation?.annee_scolaire_id;
  return evalYearId === yearIdNum;
});
    console.log("[Statistics.tsx] tempGrades after year filter count:", tempGrades.length);


    const currentTerm = termsForYear.find(t => String(t.id) === selectedTermId);

   // Apply term filter only if a specific term is selected
    if (currentTerm && selectedTermId !== 'all') {
      const termIdNum = parseInt(selectedTermId);
      tempGrades = tempGrades.filter(grade =>
        grade.evaluation?.trimestreId === termIdNum
      );
      console.log("[Statistics.tsx] tempGrades after termId filter count:", tempGrades.length);
    }

    // --- AJOUT DES LOGS DE DEBUG SUGGÉRÉS ---
    console.log("[DEBUG] selectedTermId:", selectedTermId);
    console.log("[DEBUG] filteredGrades (final):", tempGrades.map(g => ({
      id: g.id,
      note: g.note,
      etudiant: g.etudiant?.id,
      matiere: g.evaluation?.matiere?.id,
      trimestre: g.evaluation?.trimestreId, // Vérifiez ce champ !
      date_eval: g.evaluation?.date_eval // Vérifiez ce champ !
    })));
    // --- FIN DES LOGS DE DEBUG ---

    console.log("[Statistics.tsx] Final filteredGrades to be returned, count:", tempGrades.length);
    
    return tempGrades;
  }, [gradesInYear, selectedAcademicYearId, selectedTermId, termsForYear]); // selectedClassId est géré par studentsToProcess dans les graphiques

  const classAveragesData = useMemo((): GradeChartItem[] => {
    console.log("--- classAveragesData useMemo (new logic) ---");
    console.log("[classAveragesData] All Coefficients Loaded:", JSON.stringify(coefficients, null, 2)); // Log pour voir tous les coefficients
    console.log("[classAveragesData] Coefficients count:", coefficients.length); // Log coefficients count

    if (loading.grades || loading.students || loading.classes || loading.coefficients || studentsInYear.length === 0 || !selectedAcademicYearId || !selectedTermId) {
      return []; // selectedStudentId n'est pas une condition pour retourner vide ici
    }

    const yearIdNum = parseInt(selectedAcademicYearId);
    const termIdNum = selectedTermId === 'all' ? null : parseInt(selectedTermId);

    // Fallback to simple average if "Année complète" is selected
    // ...dans classAveragesData useMemo...
    if (!termIdNum) { // "Année complète"
      // Si un élève est sélectionné, on affiche sa moyenne annuelle générale.
      // Sinon, on affiche la moyenne de chaque classe.
      if (selectedStudentId !== 'all') {
        const studentIdNum = parseInt(selectedStudentId);
        const student = studentsInYear.find(s => s.id === studentIdNum);
        if (!student || !student.classe) return [];

        const studentClassCoefficients = coefficients.filter(c => Number(c.classe_id) === Number(student.classe?.id));
        const subjectIdsInClass = Array.from(new Set(studentClassCoefficients.filter(c => c.matiere_id != null).map(c => c.matiere_id as number)));
        
        let sumAnnualStudentAverage = 0;
        let countTermsForStudent = 0;

        termsForYear.forEach(term => {
          let termTotalWeighted = 0;
          let termTotalCoeff = 0;
          subjectIdsInClass.forEach(subjectId => {
            const coeff = studentClassCoefficients.find(c => c.matiere_id === subjectId)?.coefficient || 1;
            const avg = calculateStudentSubjectAverageForTerm(
              student.id, subjectId, term.id, yearIdNum, gradesInYear,
              gradesInYear.map(g => g.evaluation).filter((e): e is Evaluation => e !== undefined),
              termsForYear
            );
            termTotalWeighted += avg * coeff;
            termTotalCoeff += coeff;
          });
          if (termTotalCoeff > 0) {
            sumAnnualStudentAverage += termTotalWeighted / termTotalCoeff;
            countTermsForStudent++;
          }
        });

        const finalAnnualAverage = countTermsForStudent > 0 ? parseFloat((sumAnnualStudentAverage / countTermsForStudent).toFixed(2)) : 0;
        return finalAnnualAverage > 0 ? [{ name: `${student.prenom} ${student.nom} (Moy. Annuelle)`, moyenne: finalAnnualAverage }] : [];
      }
      // Sinon (tous les élèves), on calcule la moyenne par classe comme avant
  // Nouvelle logique : moyenne des moyennes générales des 3 trimestres
  const gradesByClass: { [classId: number]: { sumAnnualAverages: number; count: number; className: string } } = {};

  classesForYear.forEach(classe => {
    const studentsInThisClass = studentsInYear.filter(s => s.classe?.id === classe.id);
    if (studentsInThisClass.length === 0) return;

    const classCoefficients = coefficients.filter(c => Number(c.classe_id) === Number(classe.id));
    const subjectIdsInClass = Array.from(new Set(classCoefficients.filter(c => c.matiere_id != null).map(c => c.matiere_id as number)));

    let sumAnnualAverages = 0;
    let countStudents = 0;

    studentsInThisClass.forEach(student => {
      let sumTrimestreMoyennes = 0;
      let countTrimestres = 0;

      termsForYear.forEach(term => {
        let totalWeighted = 0;
        let totalCoeff = 0;
        subjectIdsInClass.forEach(subjectId => {
          const coeff = classCoefficients.find(c => c.matiere_id === subjectId)?.coefficient || 1;
          const avg = calculateStudentSubjectAverageForTerm(
            student.id,
            subjectId,
            term.id,
            parseInt(selectedAcademicYearId),
            gradesInYear,
            gradesInYear.map(g => g.evaluation).filter((e): e is Evaluation => e !== undefined),
            termsForYear
          );
          totalWeighted += avg * coeff;
          totalCoeff += coeff;
        });
        if (totalCoeff > 0) {
          sumTrimestreMoyennes += totalWeighted / totalCoeff;
          countTrimestres++;
        }
      });

      if (countTrimestres > 0) {
        const annualAverage = sumTrimestreMoyennes / countTrimestres;
        sumAnnualAverages += annualAverage;
        countStudents++;
      }
    });

    if (countStudents > 0) {
      gradesByClass[classe.id] = {
        sumAnnualAverages,
        count: countStudents,
        className: classe.nom,
      };
    }
  });

  const result = Object.values(gradesByClass)
    .map(data => ({
      name: data.className,
      moyenne: data.count > 0 ? parseFloat((data.sumAnnualAverages / data.count).toFixed(2)) : 0,
    }))
    .filter(item => item.moyenne > 0);

  return result;
}

    // Complex average calculation for a specific term
   
    let classesToProcess = classesForYear;
    if (selectedClassId !== 'all') {
      classesToProcess = classesForYear.filter(c => String(c.id) === selectedClassId);
    } else if (selectedStudentId !== 'all') {
      // Si un élève est sélectionné et "Toutes les classes", on se concentre sur la classe de cet élève
      const student = studentsInYear.find(s => String(s.id) === selectedStudentId);
      classesToProcess = student?.classe ? [student.classe] : [];
    }
const allEvalsForYear = gradesInYear.map(g => g.evaluation).filter((e): e is Evaluation => e !== undefined);
console.log("[classAveragesData] allEvalsForYear count:", allEvalsForYear.length);

const studentOverallAveragesByClass: { [classId: string]: { sumOfStudentAverages: number; studentCount: number; className: string } } = {};

classesToProcess.forEach(classe => {
  const studentsInThisClass = studentsInYear.filter(s => s.classe?.id === classe.id);
  
  const studentsForThisClassAverage = selectedStudentId === 'all'
    ? studentsInThisClass
    : studentsInThisClass.filter(s => String(s.id) === selectedStudentId);
  if (studentsForThisClassAverage.length === 0) return;
  console.log(`[classAveragesData] Processing class: ${classe.nom}, students count: ${studentsInThisClass.length}`);

const classCoefficients = coefficients.filter(c => Number(c.classe_id) === Number(classe.id));     console.log(`[classAveragesData] Class ${classe.nom}, coefficients count: ${classCoefficients.length}, coefficients data:`, classCoefficients);
  let sumOfStudentAveragesInClass = 0;
  let countOfStudentsWithAveragesInClass = 0;


  // ...dans classAveragesData useMemo...

studentsForThisClassAverage.forEach(student => {
  let studentTotalWeightedScore = 0;
  let studentTotalCoefficients = 0;

  // Get unique subject IDs for the student's class from coefficients
  const subjectIdsInClass = Array.from(new Set(classCoefficients.filter(c => c.matiere_id != null).map(c => c.matiere_id as number)));
  let debugSubjects: any[] = [];
  console.log(`[classAveragesData] Student ${student.id} in Class ${classe.nom}, Subject IDs with coefficients:`, subjectIdsInClass);

  subjectIdsInClass.forEach(subjectId => {
    const subjectCoeff = classCoefficients.find(c => c.matiere_id === subjectId)?.coefficient || 1;
    const subjectAverage = termIdNum
      ? calculateStudentSubjectAverageForTerm(
          student.id,
          subjectId,
          termIdNum,
          yearIdNum,
          gradesInYear,
          allEvalsForYear,
          termsForYear
        )
      : 0;

    // Toujours ajouter le coefficient, même si la moyenne est 0
    studentTotalWeightedScore += subjectAverage * subjectCoeff;
    studentTotalCoefficients += subjectCoeff;
    debugSubjects.push({ subjectId, subjectCoeff, subjectAverage });
  });

  if (studentTotalCoefficients > 0) {
    const studentOverallAverage = studentTotalWeightedScore / studentTotalCoefficients;
    sumOfStudentAveragesInClass += studentOverallAverage;
    countOfStudentsWithAveragesInClass++;
    console.log(`[Moyenne élève] Classe: ${classe.nom}, Élève: ${student.nom} ${student.prenom}, Moyenne: ${studentOverallAverage.toFixed(2)}, Détail:`, debugSubjects);
  }
});

  if (countOfStudentsWithAveragesInClass > 0) {
    studentOverallAveragesByClass[String(classe.id)] = {
      sumOfStudentAverages: sumOfStudentAveragesInClass,
      studentCount: countOfStudentsWithAveragesInClass,
      className: classe.nom,
    };
        console.log(`[Moyenne classe] ${classe.nom} : Moyenne générale = ${(sumOfStudentAveragesInClass / countOfStudentsWithAveragesInClass).toFixed(2)} sur ${countOfStudentsWithAveragesInClass} élèves`);

  }
});

    return Object.values(studentOverallAveragesByClass)
  .map(data => ({
    name: data.className,
    moyenne: data.studentCount > 0 ? parseFloat((data.sumOfStudentAverages / data.studentCount).toFixed(2)) : 0,
  }))
  .filter(item => item.moyenne > 0);
}, [
    filteredGrades, gradesInYear, studentsInYear, classesForYear, termsForYear, coefficients,
    selectedAcademicYearId, selectedClassId, selectedTermId, selectedStudentId, academicYears,
    loading, calculateStudentSubjectAverageForTerm
  ]);

   const subjectAverageData = useMemo((): SubjectSuccessRateItem[] => {
if (loading.grades || loading.students || loading.coefficients || !selectedAcademicYearId) {
      return [];
    }
    console.log("--- subjectAverageData useMemo ---");

    const yearIdNum = parseInt(selectedAcademicYearId);
    const termIdNum = parseInt(selectedTermId);
    const isAllYear = selectedTermId === 'all';
    const allEvalsForYear = gradesInYear.map(g => g.evaluation).filter((e): e is Evaluation => e !== undefined);
    
    let studentsToProcess = studentsInYear;
    if (selectedClassId !== 'all') {
      studentsToProcess = studentsToProcess.filter(s => String(s.classe?.id) === selectedClassId);
    }
    if (selectedStudentId !== 'all') {
      studentsToProcess = studentsToProcess.filter(s => String(s.id) === selectedStudentId);
    }

    if (studentsToProcess.length === 0) return [];

    let relevantSubjectIds: number[] = []; // Subject IDs that have coefficients in the relevant classes
   if (selectedClassId !== 'all') {
  relevantSubjectIds = Array.from(new Set(
    coefficients
      .filter(c => Number(c.classe_id) === Number(selectedClassId))
      .map(c => c.matiere_id)
      .filter(id => id != null)
  )) as number[];
} else {
  relevantSubjectIds = Array.from(new Set(coefficients.map(c => c.matiere_id).filter(id => id != null))) as number[];
}

    const averagesBySubject: { [subjectId: number]: { totalStudentSubjectAverages: number; studentCount: number; subjectName: string } } = {};

    relevantSubjectIds.forEach(subjectId => {
      const matiereInfo = coefficients.find(c => c.matiere_id === subjectId)?.matiere || allEvalsForYear.find(e => e.matiere?.id === subjectId)?.matiere;
      if (!matiereInfo) return;

      averagesBySubject[subjectId] = {
        totalStudentSubjectAverages: 0,
        studentCount: 0,
        subjectName: matiereInfo.nom,
      };

      studentsToProcess.forEach(student => {
        if (selectedClassId === 'all') {
const studentClassCoeffs = coefficients.filter(c => Number(c.classe_id) === Number(student.classe?.id));          if (!studentClassCoeffs.some(c => c.matiere_id === subjectId)) {
            return; 
          }
        }
        const studentSubjectAverage = isAllYear
  ? (() => {
      // Moyenne simple sur toutes les notes de la matière pour l'élève sur l'année
      const notes = gradesInYear.filter(
        n =>
          n.etudiant?.id === student.id &&
          n.evaluation?.matiere?.id === subjectId
      );
      if (notes.length === 0) return 0;
      const sum = notes.reduce((acc, n) => acc + n.note, 0);
      return parseFloat((sum / notes.length).toFixed(2));
    })()
  : calculateStudentSubjectAverageForTerm(
      student.id, subjectId, termIdNum, yearIdNum, gradesInYear, allEvalsForYear, termsForYear
    );

        if (studentSubjectAverage > 0) { 
          averagesBySubject[subjectId].totalStudentSubjectAverages += studentSubjectAverage;
          averagesBySubject[subjectId].studentCount++;
        }
      });
    });

    return Object.values(averagesBySubject)
      .map(data => ({ name: data.subjectName, taux: data.studentCount > 0 ? parseFloat((data.totalStudentSubjectAverages / data.studentCount).toFixed(2)) : 0, }))
      .filter(item => item.taux > 0);
}, [
    gradesInYear, studentsInYear, coefficients, termsForYear,
    selectedAcademicYearId, selectedClassId, selectedTermId, selectedStudentId,
    calculateStudentSubjectAverageForTerm, loading.grades, loading.students, loading.coefficients, loading.terms
  ]);
 

  const averageEvolutionData = useMemo(() => {
    console.log("--- averageEvolutionData useMemo (new logic) ---");
    if (loading.grades || loading.students || loading.terms || loading.coefficients || studentsInYear.length === 0 || !selectedAcademicYearId || termsForYear.length === 0) {
      return [];
    }

    const yearIdNum = parseInt(selectedAcademicYearId);
    const allEvalsForYear = gradesInYear.map(g => g.evaluation).filter((e): e is Evaluation => e !== undefined);

    let studentsToProcess = studentsInYear;
    if (selectedClassId !== 'all') {
      studentsToProcess = studentsToProcess.filter(s => String(s.classe?.id) === selectedClassId);
    }
    if (selectedStudentId !== 'all') {
      studentsToProcess = studentsToProcess.filter(s => String(s.id) === selectedStudentId);
    }

    if (studentsToProcess.length === 0) return [];
        console.log("[averageEvolutionData] Students to process count:", studentsToProcess.length);



    
    return termsForYear.map(term => {
      const termIdNum = term.id;
      let totalOfStudentOverallAveragesForTerm = 0;
      let countOfStudentsWithAveragesForTerm = 0;

      studentsToProcess.forEach(student => {
        const studentClassId = student.classe?.id;
        if (!studentClassId) return;

        const studentClassCoefficients = coefficients.filter(c => c.classe_id === studentClassId);
        console.log(`[averageEvolutionData] Student ${student.id}, Term ${term.nom}, Class ${studentClassId}, Coefficients count: ${studentClassCoefficients.length}, coefficients data:`, studentClassCoefficients);
        if (studentClassCoefficients.length === 0) return; // Skip student if their class has no coefficients

        let studentTotalWeightedScore = 0;
        let studentTotalCoefficients = 0;
        const subjectIdsInClass = Array.from(new Set(studentClassCoefficients.filter(c => c.matiere_id != null).map(c => c.matiere_id as number)));
        console.log(`[averageEvolutionData] Student ${student.id}, Term ${term.nom}, Subject IDs in class:`, subjectIdsInClass);

        subjectIdsInClass.forEach(subjectId => {
          const subjectCoeff = studentClassCoefficients.find(c => c.matiere_id === subjectId)?.coefficient || 1;
          const subjectAverage = calculateStudentSubjectAverageForTerm(
            student.id,
            subjectId,
            termIdNum,
            yearIdNum,
            gradesInYear,
            allEvalsForYear,
            termsForYear
          );
          // Toujours ajouter le coefficient, même si subjectAverage = 0
  studentTotalWeightedScore += subjectAverage * subjectCoeff;
  studentTotalCoefficients += subjectCoeff;
});

        if (studentTotalCoefficients > 0) {
          const studentOverallAverage = studentTotalWeightedScore / studentTotalCoefficients;
          totalOfStudentOverallAveragesForTerm += studentOverallAverage;
          countOfStudentsWithAveragesForTerm++;
        }
      });



      return {
        name: term.nom,
        moyenne: countOfStudentsWithAveragesForTerm > 0
          ? parseFloat((totalOfStudentOverallAveragesForTerm / countOfStudentsWithAveragesForTerm).toFixed(2))
          : 0,      };
        }).filter(item => item.moyenne > 0); // Filter out terms with 0 average
  }, [gradesInYear, termsForYear, selectedAcademicYearId, selectedClassId, selectedStudentId, studentsInYear, coefficients, calculateStudentSubjectAverageForTerm, loading.grades, loading.terms, loading.coefficients, loading.students]);


  const filteredAbsences = useMemo(() => {
    let tempAbsences = absencesInYear;
     if (!selectedAcademicYearId) return [];

    const yearIdNum = parseInt(selectedAcademicYearId);
    // Assuming absencesInYear is already filtered by academic year from its fetch.
    // If not, add: tempAbsences = absencesInYear.filter(abs => abs.annee_scolaire_id === yearIdNum);

    const currentTerm = termsForYear.find(t => String(t.id) === selectedTermId);

    let studentsToFilterAbsencesFor = studentsInYear;
    if (selectedClassId !== 'all') {
      const classIdNum = parseInt(selectedClassId);
      studentsToFilterAbsencesFor = studentsToFilterAbsencesFor.filter(s => s.classe?.id === classIdNum && s.classe?.annee_scolaire_id === yearIdNum);
    }
    if (selectedStudentId !== 'all') {
      studentsToFilterAbsencesFor = studentsToFilterAbsencesFor.filter(s => String(s.id) === selectedStudentId);
    }

    const studentIdsToConsider = studentsToFilterAbsencesFor.map(s => s.id);
tempAbsences = tempAbsences.filter(absence => studentIdsToConsider.includes(absence.etudiant_id));
    
   if (currentTerm && selectedTermId !== 'all') {
      try {
        const termStartDate = parseISO(currentTerm.date_debut);
        const termEndDate = parseISO(currentTerm.date_fin);

        if (isNaN(termStartDate.getTime()) || isNaN(termEndDate.getTime())) {
          console.warn(`Invalid date format for term ${currentTerm.nom} in absences: S=${currentTerm.date_debut}, E=${currentTerm.date_fin}`);
          return tempAbsences;
        }
        
        tempAbsences = tempAbsences.filter(absence => {
          if (!absence.date) return false;
          try {
            const absenceDate = parseISO(absence.date);
            if (isNaN(absenceDate.getTime())) return false;
            return absenceDate >= termStartDate && absenceDate <= termEndDate;
          } catch (e) { return false; }
        });
      } catch (e) {
         console.warn(`Error parsing term dates for ${currentTerm.nom} in absences`, e);
      }

    }
    return tempAbsences;
 }, [absencesInYear, selectedAcademicYearId, selectedClassId, selectedStudentId, selectedTermId, termsForYear, studentsInYear]);


  const classAttendanceData = useMemo((): AttendanceChartItem[] => {
    if (loading.absences || loading.students || loading.classes || studentsInYear.length === 0) return [];
    // Filtrer les classes à traiter en fonction de selectedClassId
    let classesToProcess = classesForYear;
    if (selectedClassId !== 'all') {
      classesToProcess = classesForYear.filter(c => String(c.id) === selectedClassId);
    } else if (selectedStudentId !== 'all') {
      // Si un élève est sélectionné et "Toutes les classes", on se concentre sur la classe de cet élève
      const student = studentsInYear.find(s => String(s.id) === selectedStudentId);
      classesToProcess = student?.classe ? [student.classe] : [];
    }

  const selectedYear = academicYears.find(ay => String(ay.id) === selectedAcademicYearId);
    const selectedTerm = termsForYear.find(t => String(t.id) === selectedTermId);

    let schoolDaysInPeriod = 0;
    if (selectedTermId === 'all' && selectedYear) {
      schoolDaysInPeriod = calculateSchoolDays(selectedYear.date_debut, selectedYear.date_fin);
    } else if (selectedTerm) {
      schoolDaysInPeriod = calculateSchoolDays(selectedTerm.date_debut, selectedTerm.date_fin);
    }

    if (schoolDaysInPeriod === 0) return []; // Not enough info to calculate

    const attendanceByClass: { [classId: string]: { totalPossible: number; totalAbsences: number; totalNonJustifiedAbsences: number; className: string } } = {};

   
  
    classesToProcess.forEach(classe => {
      const studentsInThisClass = studentsInYear.filter(s => s.classe?.id === classe.id);
      
      const studentsForThisClassAttendance = selectedStudentId === 'all'
        ? studentsInThisClass
        : studentsInThisClass.filter(s => String(s.id) === selectedStudentId);
      if (studentsForThisClassAttendance.length === 0) return;

      let currentClassTotalAbsences = 0;
      let currentClassNonJustifiedAbsences = 0;

      studentsInThisClass.forEach(student => {
         const studentAbsences = filteredAbsences.filter(abs => abs.etudiant_id === student.id);
        currentClassTotalAbsences += studentAbsences.length;
        currentClassNonJustifiedAbsences += studentAbsences.filter(
          abs => !abs.justification || abs.justification.trim() === ''
        ).length;
      });
     // N = studentsInThisClass.length, M = schoolDaysInPeriod
      const totalPossibleJoursEleve = studentsForThisClassAttendance.length * schoolDaysInPeriod;

      attendanceByClass[String(classe.id)] = {
        
      className: classe.nom,
       totalPossible: totalPossibleJoursEleve,
        totalAbsences: currentClassTotalAbsences,
        totalNonJustifiedAbsences: currentClassNonJustifiedAbsences,
      };
    });

     return Object.values(attendanceByClass).map(data => {
      const tauxAssiduite = data.totalPossible > 0
        ? parseFloat((( (data.totalPossible - data.totalAbsences) / data.totalPossible) * 100).toFixed(2))
        : 0;
      const tauxAbsenceNonJustifiee = data.totalPossible > 0
        ? parseFloat(((data.totalNonJustifiedAbsences / data.totalPossible) * 100).toFixed(2))
        : 0;
      return {
        name: data.className,
        tauxAssiduite: tauxAssiduite,
        tauxAbsenceNonJustifiee: tauxAbsenceNonJustifiee,
      };
    });
  }, [
    filteredAbsences, studentsInYear, classesForYear, 
    selectedAcademicYearId, selectedTermId, selectedStudentId, termsForYear, academicYears,
     selectedClassId, // Ajout de selectedClassId comme dépendance
    loading.absences, loading.students, loading.classes
  ]);

  const monthlyAbsenceEvolutionData = useMemo(() => {
    if (loading.absences || filteredAbsences.length === 0) return [];
    const absencesByMonth: { [month: string]: number } = {};
    let studentsToConsider = studentsInYear;
    if (selectedClassId !== 'all') {
      studentsToConsider = studentsToConsider.filter(s => String(s.classe?.id) === selectedClassId);
    }
    if (selectedStudentId !== 'all') {
      studentsToConsider = studentsToConsider.filter(s => String(s.id) === selectedStudentId);
    }

    if (studentsToConsider.length === 0) return [];

       const schoolDaysPerMonth = 20; // M (jours scolaires par mois)

    const absencesByMonthAndTotalPossible: {
      [monthYearKey: string]: { totalAbsences: number; nonJustifiedAbsences: number; totalPossible: number }
    } = {};


    filteredAbsences.forEach(absence => {
       const month = getMonth(parseISO(absence.date));
      const year = getYear(parseISO(absence.date));
      const monthYearKey = format(new Date(year, month), 'MMM yyyy', { locale: fr });

      if (!absencesByMonthAndTotalPossible[monthYearKey]) {
        absencesByMonthAndTotalPossible[monthYearKey] = {
          totalAbsences: 0,
          nonJustifiedAbsences: 0,
          totalPossible: studentsToConsider.length * schoolDaysPerMonth, // N * M
        };
      }
      absencesByMonthAndTotalPossible[monthYearKey].totalAbsences++;
      if (!absence.justification || absence.justification.trim() === '') {
        absencesByMonthAndTotalPossible[monthYearKey].nonJustifiedAbsences++;
      }
    });

    return Object.entries(absencesByMonthAndTotalPossible)
      .map(([monthYearKey, data]) => {
        const tauxAssiduite = data.totalPossible > 0
        ? parseFloat((((data.totalPossible - data.totalAbsences) / data.totalPossible) * 100).toFixed(2))
        
        : 0;
     return {
          name: monthYearKey,
          tauxAssiduite: tauxAssiduite,
        };
      })
      .sort((a, b) => { // Sort by date
        return parseISO(`01 ${a.name}`).getTime() - parseISO(`01 ${b.name}`).getTime(); // Parse as first day of month for sorting
      });
  }, [filteredAbsences, studentsInYear, selectedClassId, selectedStudentId, loading.absences]);



  if (loading.initial || loading.academicYears) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
        <p className="mt-4 text-lg">Chargement des données initiales...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-red-500">
        <AlertCircle className="h-16 w-16" />
        <p className="mt-4 text-lg">Erreur: {error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Statistiques</h1>
<Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
 <TabsList className="flex flex-row flex-wrap w-full gap-2 sm:gap-4 justify-center mb-8">
  <TabsTrigger
    value="overview"
    className="flex-1 sm:flex-none border bg-gray-100 text-gray-800 shadow-md sm:border-0 sm:bg-transparent sm:text-inherit sm:shadow-none"
  >
    Vue d'ensemble
  </TabsTrigger>
  <TabsTrigger
    value="grades"
    className="flex-1 sm:flex-none border bg-gray-100 text-gray-800 shadow-md sm:border-0 sm:bg-transparent sm:text-inherit sm:shadow-none"
  >
    Notes et réussite
  </TabsTrigger>
  <TabsTrigger
    value="attendance"
    className="flex-1 sm:flex-none border bg-gray-100 text-gray-800 shadow-md sm:border-0 sm:bg-transparent sm:text-inherit sm:shadow-none"
  >
    Assiduité
  </TabsTrigger>
</TabsList>
<div className="h-4 sm:h-8"></div>

<Card className="mb-6">
  <CardHeader>
    <CardTitle>Filtres</CardTitle>
    <CardDescription>Visualisez les statistiques par période et par classe</CardDescription>
  </CardHeader>
  <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Année Scolaire</label>
              <Select onValueChange={setSelectedAcademicYearId} value={selectedAcademicYearId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une année" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year.id} value={String(year.id)}>{formatAcademicYearDisplay(year)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Période (Trimestre)</label>
              <Select onValueChange={setSelectedTermId} value={selectedTermId} disabled={termsForYear.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Année complète</SelectItem>
                  {termsForYear.map((term) => (
                    <SelectItem key={term.id} value={String(term.id)}>
                      {term.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Classe</label>
              <Select onValueChange={setSelectedClassId} value={selectedClassId} disabled={classesForYear.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les classes</SelectItem>
                  {classesForYear.map((cls) => (
                    <SelectItem key={cls.id} value={String(cls.id)}>
                      {cls.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Élève</label>
              <Select
                onValueChange={setSelectedStudentId}
                value={selectedStudentId}
                disabled={selectedClassId === 'all' || studentsForFilter.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un élève" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les élèves</SelectItem>
                  {studentsForFilter.map((student) => (
                    <SelectItem key={student.id} value={String(student.id)}>
                      {student.prenom} {student.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Répartition des élèves par niveau</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {loading.students ? <Loader2 className="m-auto h-8 w-8 animate-spin" /> : studentDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={studentDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {studentDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-gray-500">Aucune donnée de répartition des élèves.</p>}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Répartition des élèves par genre</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                 {loading.students ? <Loader2 className="m-auto h-8 w-8 animate-spin" /> : genderDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderDistributionData}
                        cx="50%"
                        cy="50%"
                                                labelLine={false} // Assurez-vous que labelLine est false si vous ne voulez pas de lignes de connexion

                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {genderDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-gray-500">Aucune donnée de répartition par genre.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="grades" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Moyenne générale par classe</CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              {loading.grades || loading.classes ? <Loader2 className="m-auto h-8 w-8 animate-spin" /> : classAveragesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classAveragesData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 20]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="moyenne" fill="#3b82f6" name="Moyenne sur 20" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-500">Aucune donnée de moyenne par classe.</p>}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Moyenne par matière</CardTitle>
              </CardHeader>
                            <CardContent className="h-96"> {/* Increased height for better readability */}
                {loading.grades || loading.coefficients || loading.students || loading.terms ? <Loader2 className="m-auto h-8 w-8 animate-spin" /> : subjectAverageData.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
  <BarChart data={subjectAverageData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
    <XAxis dataKey="name" />
    <YAxis domain={[0, 20]} />
    <Tooltip />
    <Bar dataKey="taux" name="Moyenne" fill="#ff8042" />
  </BarChart>
</ResponsiveContainer>
                ) : <p className="text-center text-gray-500">Aucune donnée de moyenne par matière.</p>}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Évolution des moyennes par trimestre</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {loading.grades || loading.terms ? <Loader2 className="m-auto h-8 w-8 animate-spin" /> : averageEvolutionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={averageEvolutionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 20]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="moyenne" name="Moyenne" stroke="#8884d8" activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-gray-500">Aucune donnée d'évolution des moyennes.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="attendance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Taux d'assiduité par classe</CardTitle>
            </CardHeader>
            <CardContent className="h-80"> {/* Adjusted height */}
              {loading.absences || loading.students || loading.classes ? <Loader2 className="m-auto h-8 w-8 animate-spin" /> : classAttendanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classAttendanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} unit="%"/>
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    <Bar dataKey="tauxAssiduite" name="Taux d'assiduité (%)" stackId="a" fill="#ff8042" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-500">Aucune donnée d'assiduité par classe.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Évolution de l'assiduité au cours de l'année</CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              {loading.absences ? <Loader2 className="m-auto h-8 w-8 animate-spin" /> : monthlyAbsenceEvolutionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
 <LineChart 
                    data={monthlyAbsenceEvolutionData.sort((a, b) => {
                           
                            return 0; // Placeholder if data is already sorted by useMemo
                          })} 
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} unit="%"/>
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
<Line 
                    type="monotone"
                      dataKey="tauxAssiduite" 
                      name="Taux d'assiduité (%)" 
                     
                      stroke="#ff8042" // Couleur de la ligne
  dot={{ r: 5, fill: "#ff8042", stroke: "#ff8042" }} // <-- cercle rempli orange
                      activeDot={{ r: 8 }} 
                    />                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-500">Aucune donnée d'évolution des absences.</p>}
            </CardContent>
          </Card>
           {/* Reminder for attendance data interpretation */}
          <Card className="mt-4 bg-blue-50 border-blue-200">
            <CardContent className="pt-4 text-sm text-blue-700">
              <p><strong>Note sur l'assiduité :</strong> Les pourcentages d'assiduité sont calculés sur la base des absences enregistrées et d'une estimation du nombre de jours scolaires (20 jours/mois pour l'évolution mensuelle). Pour une précision accrue, l'intégration d'un calendrier scolaire détaillé est recommandée.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
