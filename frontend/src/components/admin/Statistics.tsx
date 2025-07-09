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
import { fr, ar } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

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
  anneeScolaire: {
    id: number;
    libelle?: string;
  };
}

interface User {
  id: number;
  nom: string;
  prenom: string;
  role: string;
  genre?: 'masculin' | 'feminin' | null;
}

interface StudentWithClass extends User {
  classe?: Classe;
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
  date_eval: string;
  matiere?: { id: number; nom: string };
  classe_id?: number;
  trimestreId?: number;
  classe?: {
    id: number;
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
  date: string;
  etudiant_id: number;
  justification?: string | null;
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

const COLORS_PIE = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CF2', '#FF6699'];

export function Statistics() {
  const { t, language } = useLanguage();
  const getAlignmentClass = () => language === 'ar' ? 'text-right' : 'text-left';
  const [academicYears, setAcademicYears] = useState<AnneeAcademique[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>('');
  const [classesForYear, setClassesForYear] = useState<Classe[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [classSearchTerm, setClassSearchTerm] = useState('');
const [studentSearchTerm, setStudentSearchTerm] = useState('');

  const [termsForYear, setTermsForYear] = useState<Trimestre[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('all');
  const [studentsInYear, setStudentsInYear] = useState<StudentWithClass[]>([]);
  const [gradesInYear, setGradesInYear] = useState<Note[]>([]);
  const [absencesInYear, setAbsencesInYear] = useState<Absence[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [coefficients, setCoefficients] = useState<CoefficientClasse[]>([]);
  const getTextAlignment = (language: string) => {
  return language === 'ar' ? 'text-right' : 'text-left';
};
const translateTerm = (termName: string): string => {
  switch(termName.toLowerCase()) {
    case 'trimestre 1':
    case 'term 1':
      return t.gradeManagement.term1;
    case 'trimestre 2': 
    case 'term 2':
      return t.gradeManagement.term2;
    case 'trimestre 3':
    case 'term 3':
      return t.gradeManagement.term3;
    default:
      return termName;
  }
};
const translateSubject = (subjectName: string): string => {
  const cleanedName = subjectName.toLowerCase().trim();
  
  // Correspondance exacte
  const exactMatch = Object.entries(t.schedule.subjects).find(
    ([key]) => cleanedName === key.toLowerCase()
  );
  if (exactMatch) return exactMatch[1];

  // Correspondance partielle
  const partialMatch = Object.entries(t.schedule.subjects).find(
    ([key]) => cleanedName.includes(key.toLowerCase())
  );
  if (partialMatch) return partialMatch[1];

  // Cas particuliers
  if (cleanedName.includes('math')) return t.schedule.subjects.math;
  if (cleanedName.includes('physique') || cleanedName.includes('physics')) return t.schedule.subjects.physics;
  if (cleanedName.includes('arab')) return t.schedule.subjects.arabic;
  
  // Par défaut, retourner le nom original
  return subjectName;
};

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

  // Helper functions with language support
  const formatAcademicYearDisplay = (annee: { libelle: string; date_debut?: string; date_fin?: string }): string => {
    if (!annee || !annee.date_debut || !annee.date_fin) {
      return annee.libelle || t.common.unknownYear;
    }
    const startYear = new Date(annee.date_debut).getFullYear();
    const endYear = new Date(annee.date_fin).getFullYear();
    return annee.libelle && annee.libelle.includes(String(startYear)) && annee.libelle.includes(String(endYear)) 
      ? annee.libelle 
      : `${annee.libelle || ''} (${startYear}-${endYear})`.trim();
  };

  const calculateSchoolDays = (startDateStr: string, endDateStr: string): number => {
    try {
      const start = parseISO(startDateStr);
      const end = parseISO(endDateStr);

      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        console.warn("Invalid dates for school day calculation:", startDateStr, endDateStr);
        return 0;
      }

      let count = 0;
      let currentDate = new Date(start.valueOf());
      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          count++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return count;
    } catch (e) {
      console.error("Error calculating school days:", e, { startDateStr, endDateStr });
      return 0;
    }
  };

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
      toast({ 
        title: t.common.error, 
        description: err.message, 
        variant: "destructive" 
      });
      setError(`${t.common.errorLoading}: ${endpoint}`);
      return [];
    } finally {
      if (setLoadingKey) setLoading(prev => ({ ...prev, [setLoadingKey]: false }));
    }
  }, [t]);

  // Fetch Academic Years and set default
  useEffect(() => {
    const fetchInitialYears = async () => {
      const years: AnneeAcademique[] = await fetchData('annees-academiques', 'academicYears');
      setAcademicYears(years);
      
      if (years.length > 0) {
        try {
          const config = await fetchData('configuration');
          const activeYearId = config?.annee_scolaire?.id || config?.annee_academique_active_id;
          
          if (activeYearId && years.some(y => y.id === activeYearId)) {
            setSelectedAcademicYearId(String(activeYearId));
          } else {
            const sortedYears = [...years].sort((a, b) => 
              new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime());
            setSelectedAcademicYearId(String(sortedYears[0]?.id || years[0]?.id));
          }
        } catch (configError) {
          console.warn("Could not fetch configuration for active year, defaulting.", configError);
          const sortedYears = [...years].sort((a, b) => 
            new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime());
          setSelectedAcademicYearId(String(sortedYears[0]?.id || years[0]?.id));
        }
      }
      setLoading(prev => ({ ...prev, initial: false, academicYears: false }));
    };
    
    fetchInitialYears();
  }, [fetchData, t]);

  // Fetch data dependent on selectedAcademicYearId
  useEffect(() => {
    if (!selectedAcademicYearId) return;

    const yearId = parseInt(selectedAcademicYearId);

    const loadYearData = async () => {
      setClassesForYear([]);
      setSelectedClassId('all');
      setTermsForYear([]);
      setSelectedTermId('all');

      // 1. Fetch Classes
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

      // 6. Fetch Coefficients
      setLoading(prev => ({ ...prev, coefficients: true }));
      const allCoeffs: CoefficientClasse[] = await fetchData(`coefficientclasse?_expand=matiere&_expand=classe`);
      const mappedCoeffs = allCoeffs.map(c => ({
        ...c,
        classe_id: c.classe?.id ?? c.classe_id,
        matiere_id: c.matiere?.id ?? c.matiere_id,
      }));
      const classIdsForYear = filteredClasses.map(cls => cls.id);
      const yearCoeffs = mappedCoeffs.filter(c => classIdsForYear.includes(Number(c.classe_id)));
      setCoefficients(yearCoeffs);
      setLoading(prev => ({ ...prev, coefficients: false }));
    };

    loadYearData();
  }, [selectedAcademicYearId, fetchData, academicYears, t]);

  // Calculate student subject average for term with language support
  const calculateStudentSubjectAverageForTerm = useCallback((
    studentId: number,
    subjectId: number,
    termId: number,
    academicYearId: number,
    allNotesForYear: Note[],
    allEvalsForYear: Evaluation[],
    allTermsForAcademicYear: Trimestre[]
  ): number => {
    const currentTermObj = allTermsForAcademicYear.find(t => t.id === termId);
    if (!currentTermObj) return 0;

    let currentTrimestreNumero = 0;
    if (currentTermObj.nom.toLowerCase().includes("trimestre 1") || currentTermObj.nom.includes("1")) currentTrimestreNumero = 1;
    else if (currentTermObj.nom.toLowerCase().includes("trimestre 2") || currentTermObj.nom.includes("2")) currentTrimestreNumero = 2;
    else if (currentTermObj.nom.toLowerCase().includes("trimestre 3") || currentTermObj.nom.includes("3")) currentTrimestreNumero = 3;
    if (currentTrimestreNumero === 0) return 0;

    const studentNotesForSubjectCurrentTerm = allNotesForYear.filter(note =>
      note.etudiant?.id === studentId &&
      note.evaluation?.matiere?.id === subjectId &&
      note.evaluation?.trimestreId === termId
    );

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
    let compoT1Note: number | null = null;
    let compoT2Note: number | null = null;

    if (currentTrimestreNumero === 2 || currentTrimestreNumero === 3) {
      const trimestre1Obj = allTermsForAcademicYear.find(t => 
        (t.nom.toLowerCase().includes("trimestre 1") || t.nom.includes("1")) && 
        t.anneeScolaire.id === academicYearId
      );
      if (trimestre1Obj) {
        const compoT1Eval = allEvalsForYear.find(e =>
          e.matiere?.id === subjectId &&
          e.trimestreId === trimestre1Obj.id &&
          (e.type?.toLowerCase().includes("composition") || e.type?.toLowerCase().includes("compo")) &&
          e.classe?.annee_scolaire_id === academicYearId
        );
        if (compoT1Eval) {
          const noteT1 = allNotesForYear.find(n => n.etudiant?.id === studentId && n.evaluation?.id === compoT1Eval.id);
          compoT1Note = noteT1 ? noteT1.note : null;
        }
      }
    }

    if (currentTrimestreNumero === 3) {
      const trimestre2Obj = allTermsForAcademicYear.find(t => 
        (t.nom.toLowerCase().includes("trimestre 2") || t.nom.includes("2")) && 
        t.anneeScolaire.id === academicYearId
      );
      if (trimestre2Obj) {
        const compoT2Eval = allEvalsForYear.find(e =>
          e.matiere?.id === subjectId &&
          e.trimestreId === trimestre2Obj.id &&
          (e.type?.toLowerCase().includes("composition") || e.type?.toLowerCase().includes("compo")) &&
          e.classe?.annee_scolaire_id === academicYearId
        );
        if (compoT2Eval) {
          const noteT2 = allNotesForYear.find(n => n.etudiant?.id === studentId && n.evaluation?.id === compoT2Eval.id);
          compoT2Note = noteT2 ? noteT2.note : null;
        }
      }
    }

    let moyenneMatiere = 0;
    if (currentTrimestreNumero === 1) {
      let somme = 0;
      let poids = 0;
      if (countDevoirsCurrentTerm > 0) { somme += avgDevoirsCurrentTerm * 3; poids += 3; }
      if (compositionNoteValueCurrentTerm !== null) { somme += compositionNoteValueCurrentTerm; poids += 1; }
      moyenneMatiere = poids > 0 ? somme / poids : 0;
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

  // Memoized data processing for charts
  const studentDistributionData = useMemo((): NameValueColorChartItem[] => {
    if (loading.students || studentsInYear.length === 0) return [];
    
    const distribution: { [key: string]: number } = {};
    studentsInYear.forEach(student => {
      const niveau = student.classe?.niveau || t.common.unknownClass;
      distribution[niveau] = (distribution[niveau] || 0) + 1;
    });
    
    return Object.entries(distribution).map(([name, value], index) => ({
      name,
      value,
      color: COLORS_PIE[index % COLORS_PIE.length],
    }));
  }, [studentsInYear, loading.students, t]);

  const studentsForFilter = useMemo(() => {
    if (!selectedAcademicYearId) return [];
    if (selectedClassId === 'all') return [];
    return studentsInYear.filter(student => String(student.classe?.id) === selectedClassId);
  }, [studentsInYear, selectedClassId, selectedAcademicYearId]);

  const genderDistributionData = useMemo((): NameValueColorChartItem[] => {
  if (loading.students || studentsInYear.length === 0) return [];

  const studentsToProcess = selectedClassId === 'all'
    ? studentsInYear
    : studentsInYear.filter(s => String(s.classe?.id) === selectedClassId);

  if (studentsToProcess.length === 0) return [];

  // Initialisation avec les traductions
  const distribution = {
    [t.common.gender.female]: 0, 
    [t.common.gender.male]: 0, 
    [t.common.gender.other]: 0 
  };

  studentsToProcess.forEach(student => {
    switch(student.genre) {
      case 'feminin':
        distribution[t.common.gender.female]++;
        break;
      case 'masculin':
        distribution[t.common.gender.male]++;
        break;
      default:
        distribution[t.common.gender.other]++;
    }
  });

  return [
    { 
      name: t.common.gender.female, 
      value: distribution[t.common.gender.female], 
      color: '#FF8042' 
    },
    { 
      name: t.common.gender.male, 
      value: distribution[t.common.gender.male], 
      color: '#0088FE' 
    },
    { 
      name: t.common.gender.other, 
      value: distribution[t.common.gender.other], 
      color: '#FFBB28' 
    },
  ].filter(item => item.value > 0);
}, [studentsInYear, loading.students, selectedClassId, t]);

  const filteredGrades = useMemo(() => {
    if (!selectedAcademicYearId) return [];
    const yearIdNum = parseInt(selectedAcademicYearId);

    let tempGrades = gradesInYear.filter(grade => {
      const evalYearId = grade.evaluation?.classe?.annee_scolaire_id ?? grade.evaluation?.annee_scolaire_id;
      return evalYearId === yearIdNum;
    });

    const currentTerm = termsForYear.find(t => String(t.id) === selectedTermId);
    if (currentTerm && selectedTermId !== 'all') {
      const termIdNum = parseInt(selectedTermId);
      tempGrades = tempGrades.filter(grade =>
        grade.evaluation?.trimestreId === termIdNum
      );
    }

    return tempGrades;
  }, [gradesInYear, selectedAcademicYearId, selectedTermId, termsForYear]);

  const classAveragesData = useMemo((): GradeChartItem[] => {
    if (loading.grades || loading.students || loading.classes || loading.coefficients || 
        studentsInYear.length === 0 || !selectedAcademicYearId || !selectedTermId) {
      return [];
    }

    const yearIdNum = parseInt(selectedAcademicYearId);
    const termIdNum = selectedTermId === 'all' ? null : parseInt(selectedTermId);
    const allEvalsForYear = gradesInYear.map(g => g.evaluation).filter((e): e is Evaluation => e !== undefined);

    // Fallback to simple average if "Année complète" is selected
    if (!termIdNum) {
      if (selectedStudentId !== 'all') {
        const studentIdNum = parseInt(selectedStudentId);
        const student = studentsInYear.find(s => s.id === studentIdNum);
        if (!student || !student.classe) return [];

        const studentClassCoefficients = coefficients.filter(c => Number(c.classe_id) === Number(student.classe?.id));
        const subjectIdsInClass = Array.from(new Set(
          studentClassCoefficients.filter(c => c.matiere_id != null).map(c => c.matiere_id as number)
        ));
        
        let sumAnnualStudentAverage = 0;
        let countTermsForStudent = 0;

        termsForYear.forEach(term => {
          let termTotalWeighted = 0;
          let termTotalCoeff = 0;
          subjectIdsInClass.forEach(subjectId => {
            const coeff = studentClassCoefficients.find(c => c.matiere_id === subjectId)?.coefficient || 1;
            const avg = calculateStudentSubjectAverageForTerm(
              student.id, subjectId, term.id, yearIdNum, gradesInYear,
              allEvalsForYear,
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

        const finalAnnualAverage = countTermsForStudent > 0 ? 
          parseFloat((sumAnnualStudentAverage / countTermsForStudent).toFixed(2)) : 0;
        return finalAnnualAverage > 0 ? 
          [{ name: `${student.prenom} ${student.nom} (${t.statistics.annualAverage})`, moyenne: finalAnnualAverage }] : [];
      }

      // Calculate average for all classes
      const gradesByClass: { [classId: number]: { sumAnnualAverages: number; count: number; className: string } } = {};

      classesForYear.forEach(classe => {
        const studentsInThisClass = studentsInYear.filter(s => s.classe?.id === classe.id);
        if (studentsInThisClass.length === 0) return;

        const classCoefficients = coefficients.filter(c => Number(c.classe_id) === Number(classe.id));
        const subjectIdsInClass = Array.from(new Set(
          classCoefficients.filter(c => c.matiere_id != null).map(c => c.matiere_id as number)
        ));

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
                allEvalsForYear,
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

      return Object.values(gradesByClass)
        .map(data => ({
          name: data.className,
          moyenne: data.count > 0 ? parseFloat((data.sumAnnualAverages / data.count).toFixed(2)) : 0,
        }))
        .filter(item => item.moyenne > 0);
    }

    // Complex average calculation for a specific term
    let classesToProcess = classesForYear;
    if (selectedClassId !== 'all') {
      classesToProcess = classesForYear.filter(c => String(c.id) === selectedClassId);
    } else if (selectedStudentId !== 'all') {
      const student = studentsInYear.find(s => String(s.id) === selectedStudentId);
      classesToProcess = student?.classe ? [student.classe] : [];
    }

    const studentOverallAveragesByClass: { [classId: string]: { 
      sumOfStudentAverages: number; 
      studentCount: number; 
      className: string 
    } } = {};

    classesToProcess.forEach(classe => {
      const studentsInThisClass = studentsInYear.filter(s => s.classe?.id === classe.id);
      const studentsForThisClassAverage = selectedStudentId === 'all'
        ? studentsInThisClass
        : studentsInThisClass.filter(s => String(s.id) === selectedStudentId);
      if (studentsForThisClassAverage.length === 0) return;

      const classCoefficients = coefficients.filter(c => Number(c.classe_id) === Number(classe.id));
      let sumOfStudentAveragesInClass = 0;
      let countOfStudentsWithAveragesInClass = 0;

      studentsForThisClassAverage.forEach(student => {
        let studentTotalWeightedScore = 0;
        let studentTotalCoefficients = 0;

        const subjectIdsInClass = Array.from(new Set(
          classCoefficients.filter(c => c.matiere_id != null).map(c => c.matiere_id as number)
        ));

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

          studentTotalWeightedScore += subjectAverage * subjectCoeff;
          studentTotalCoefficients += subjectCoeff;
        });

        if (studentTotalCoefficients > 0) {
          const studentOverallAverage = studentTotalWeightedScore / studentTotalCoefficients;
          sumOfStudentAveragesInClass += studentOverallAverage;
          countOfStudentsWithAveragesInClass++;
        }
      });

      if (countOfStudentsWithAveragesInClass > 0) {
        studentOverallAveragesByClass[String(classe.id)] = {
          sumOfStudentAverages: sumOfStudentAveragesInClass,
          studentCount: countOfStudentsWithAveragesInClass,
          className: classe.nom,
        };
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
    loading, calculateStudentSubjectAverageForTerm, t
  ]);

  const subjectAverageData = useMemo((): SubjectSuccessRateItem[] => {
    if (loading.grades || loading.students || loading.coefficients || !selectedAcademicYearId) {
      return [];
    }

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

    let relevantSubjectIds: number[] = [];
    if (selectedClassId !== 'all') {
      relevantSubjectIds = Array.from(new Set(
        coefficients
          .filter(c => Number(c.classe_id) === Number(selectedClassId))
          .map(c => c.matiere_id)
          .filter(id => id != null)
      )) as number[];
    } else {
      relevantSubjectIds = Array.from(new Set(
        coefficients.map(c => c.matiere_id).filter(id => id != null)
      )) as number[];
    }

    const averagesBySubject: { [subjectId: number]: { 
      totalStudentSubjectAverages: number; 
      studentCount: number; 
      subjectName: string 
    } } = {};

    relevantSubjectIds.forEach(subjectId => {
      const matiereInfo = coefficients.find(c => c.matiere_id === subjectId)?.matiere || 
        allEvalsForYear.find(e => e.matiere?.id === subjectId)?.matiere;
      if (!matiereInfo) return;

      averagesBySubject[subjectId] = {
        totalStudentSubjectAverages: 0,
        studentCount: 0,
        subjectName: matiereInfo.nom,
      };

      studentsToProcess.forEach(student => {
        if (selectedClassId === 'all') {
          const studentClassCoeffs = coefficients.filter(c => 
            Number(c.classe_id) === Number(student.classe?.id));
          if (!studentClassCoeffs.some(c => c.matiere_id === subjectId)) {
            return; 
          }
        }
        
        const studentSubjectAverage = isAllYear
          ? (() => {
              const notes = gradesInYear.filter(
                n => n.etudiant?.id === student.id && n.evaluation?.matiere?.id === subjectId
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
    .map(data => ({ 
      name: translateSubject(data.subjectName), // Utilisation de la fonction de traduction
      taux: data.studentCount > 0 ? parseFloat((data.totalStudentSubjectAverages / data.studentCount).toFixed(2)) : 0, 
    }))
    .filter(item => item.taux > 0);
  }, [
    gradesInYear, studentsInYear, coefficients, termsForYear,
    selectedAcademicYearId, selectedClassId, selectedTermId, selectedStudentId,
    calculateStudentSubjectAverageForTerm, loading.grades, loading.students, loading.coefficients, loading.terms
  ]);

  const averageEvolutionData = useMemo(() => {
    if (loading.grades || loading.students || loading.terms || loading.coefficients || 
        studentsInYear.length === 0 || !selectedAcademicYearId || termsForYear.length === 0) {
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
    
    return termsForYear.map(term => {
      const termIdNum = term.id;
      let totalOfStudentOverallAveragesForTerm = 0;
      let countOfStudentsWithAveragesForTerm = 0;

      studentsToProcess.forEach(student => {
        const studentClassId = student.classe?.id;
        if (!studentClassId) return;

        const studentClassCoefficients = coefficients.filter(c => c.classe_id === studentClassId);
        if (studentClassCoefficients.length === 0) return;

        let studentTotalWeightedScore = 0;
        let studentTotalCoefficients = 0;
        const subjectIdsInClass = Array.from(new Set(
          studentClassCoefficients.filter(c => c.matiere_id != null).map(c => c.matiere_id as number)
        ));

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
      name: translateTerm(term.nom), // Utilisation de la fonction de traduction
      moyenne: countOfStudentsWithAveragesForTerm > 0
        ? parseFloat((totalOfStudentOverallAveragesForTerm / countOfStudentsWithAveragesForTerm).toFixed(2))
        : 0,
    };
  }).filter(item => item.moyenne > 0);

  }, [
    gradesInYear, termsForYear, selectedAcademicYearId, selectedClassId, selectedStudentId, 
    studentsInYear, coefficients, calculateStudentSubjectAverageForTerm, loading.grades, 
    loading.terms, loading.coefficients, loading.students
  ]);

  const filteredAbsences = useMemo(() => {
    let tempAbsences = absencesInYear;
    if (!selectedAcademicYearId) return [];

    const yearIdNum = parseInt(selectedAcademicYearId);
    const currentTerm = termsForYear.find(t => String(t.id) === selectedTermId);

    let studentsToFilterAbsencesFor = studentsInYear;
    if (selectedClassId !== 'all') {
      const classIdNum = parseInt(selectedClassId);
      studentsToFilterAbsencesFor = studentsToFilterAbsencesFor.filter(s => 
        s.classe?.id === classIdNum && s.classe?.annee_scolaire_id === yearIdNum);
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
    
    let classesToProcess = classesForYear;
    if (selectedClassId !== 'all') {
      classesToProcess = classesForYear.filter(c => String(c.id) === selectedClassId);
    } else if (selectedStudentId !== 'all') {
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

    if (schoolDaysInPeriod === 0) return [];

    const attendanceByClass: { [classId: string]: { 
      totalPossible: number; 
      totalAbsences: number; 
      totalNonJustifiedAbsences: number; 
      className: string 
    } } = {};

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
    selectedClassId, loading.absences, loading.students, loading.classes
  ]);

  const monthlyAbsenceEvolutionData = useMemo(() => {
    if (loading.absences || filteredAbsences.length === 0) return [];
    
    let studentsToConsider = studentsInYear;
    if (selectedClassId !== 'all') {
      studentsToConsider = studentsToConsider.filter(s => String(s.classe?.id) === selectedClassId);
    }
    if (selectedStudentId !== 'all') {
      studentsToConsider = studentsToConsider.filter(s => String(s.id) === selectedStudentId);
    }

    if (studentsToConsider.length === 0) return [];

    const schoolDaysPerMonth = 20;
    const absencesByMonthAndTotalPossible: {
      [monthYearKey: string]: { totalAbsences: number; nonJustifiedAbsences: number; totalPossible: number }
    } = {};

    filteredAbsences.forEach(absence => {
      const month = getMonth(parseISO(absence.date));
      const year = getYear(parseISO(absence.date));
      const monthYearKey = format(new Date(year, month), 'MMM yyyy', { 
        locale: language === 'ar' ? ar : fr 
      });

      if (!absencesByMonthAndTotalPossible[monthYearKey]) {
        absencesByMonthAndTotalPossible[monthYearKey] = {
          totalAbsences: 0,
          nonJustifiedAbsences: 0,
          totalPossible: studentsToConsider.length * schoolDaysPerMonth,
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
      .sort((a, b) => parseISO(`01 ${a.name}`).getTime() - parseISO(`01 ${b.name}`).getTime());
  }, [filteredAbsences, studentsInYear, selectedClassId, selectedStudentId, loading.absences, language]);

  if (loading.initial || loading.academicYears) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
        <p className="mt-4 text-lg">{t.common.loadingInitialData}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-red-500">
        <AlertCircle className="h-16 w-16" />
        <p className="mt-4 text-lg">{t.common.error}: {error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          {t.common.tryAgain}
        </Button>
      </div>
    );
  }

  return (
<div
  className="p-6 h-[calc(100vh-80px)] overflow-y-auto"
  dir={language === 'ar' ? 'rtl' : 'ltr'}
>
 <h1 className={`text-2xl font-bold mb-6 ${getTextAlignment(language)}`}>
    {t.statistics.title}
  </h1>      
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="flex flex-row flex-wrap w-full gap-2 sm:gap-4 justify-center">
          <TabsTrigger
            value="overview"
            className="flex-1 sm:flex-none border bg-gray-100 text-gray-800 shadow-md sm:border-0 sm:bg-transparent sm:text-inherit sm:shadow-none"
          >
            {t.statistics.tabs.overview}
          </TabsTrigger>
          <TabsTrigger
            value="grades"
            className="flex-1 sm:flex-none border bg-gray-100 text-gray-800 shadow-md sm:border-0 sm:bg-transparent sm:text-inherit sm:shadow-none"
          >
            {t.statistics.tabs.grades}
          </TabsTrigger>
          <TabsTrigger
            value="attendance"
            className="flex-1 sm:flex-none border bg-gray-100 text-gray-800 shadow-md sm:border-0 sm:bg-transparent sm:text-inherit sm:shadow-none"
          >
            {t.statistics.tabs.attendance}
          </TabsTrigger>
        </TabsList>
        
        <div className="block sm:hidden h-4"></div>
        
        <Card className="mb-6">
  <CardHeader className={getAlignmentClass()}>
            <CardTitle className={getAlignmentClass()}>{t.statistics.filters.title}</CardTitle>
    <CardDescription className={getAlignmentClass()}>{t.statistics.filters.description}</CardDescription> </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className={`space-y-2 ${getAlignmentClass()}`}>
 <label className={`text-sm font-medium block ${getAlignmentClass()}`}>
          {t.statistics.filters.academicYear}
        </label>
        <Select 
    onValueChange={setSelectedAcademicYearId} 
    value={selectedAcademicYearId}
    dir={language === 'ar' ? 'rtl' : 'ltr'}
  >                            
          <SelectTrigger className={getAlignmentClass()}>

                    <SelectValue placeholder={t.statistics.filters.selectYear} />
                  </SelectTrigger>
          <SelectContent className={getAlignmentClass()}>
                    {academicYears.map((year) => (
              <SelectItem key={year.id} value={String(year.id)}                 className={getAlignmentClass()}
>
                        {formatAcademicYearDisplay(year)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
      <div className={`space-y-2 ${getAlignmentClass()}`}>
                <label className={`text-sm font-medium block ${getAlignmentClass()}`}>{t.statistics.filters.term}</label>
                <Select onValueChange={setSelectedTermId} value={selectedTermId}>
  <SelectTrigger>
    <SelectValue placeholder={t.statistics.filters.selectTerm} />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">{t.statistics.filters.fullYear}</SelectItem>
    {termsForYear.map((term) => (
      <SelectItem key={term.id} value={String(term.id)}>
        {translateTerm(term.nom)}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
              </div>
              
      <div className={`space-y-2 ${getAlignmentClass()}`}>
  <label className={`text-sm font-medium block ${getAlignmentClass()}`}>
    {t.statistics.filters.class}
  </label>
  <Select onValueChange={setSelectedClassId} value={selectedClassId}>
    <SelectTrigger className={getAlignmentClass()}>
      <SelectValue placeholder={t.statistics.filters.selectClass} />
    </SelectTrigger>
    <SelectContent className={getAlignmentClass()}>
      {/* Barre de recherche */}
      <div className="px-2 py-1">
        <input
          type="text"
          placeholder={t.statistics.filters.searchClass}
          className="w-full p-2 border rounded"
          value={classSearchTerm}
          onChange={(e) => setClassSearchTerm(e.target.value)}
        />
      </div>
      
      <SelectItem value="all">{t.statistics.filters.allClasses}</SelectItem>
      {classesForYear
        .filter(cls => 
          cls.nom.toLowerCase().includes(classSearchTerm.toLowerCase())
        )
        .map((cls) => (
          <SelectItem 
            key={cls.id} 
            value={String(cls.id)} 
            className={getAlignmentClass()}
          >
            {cls.nom}
          </SelectItem>
        ))}
    </SelectContent>
  </Select>
</div>
              
      <div className={`space-y-2 ${getAlignmentClass()}`}>
  <label className={`text-sm font-medium block ${getAlignmentClass()}`}>
    {t.statistics.filters.student}
  </label>
  <Select
    onValueChange={setSelectedStudentId}
    value={selectedStudentId}
    disabled={selectedClassId === 'all' || studentsForFilter.length === 0}
  >
    <SelectTrigger className={getAlignmentClass()}>
      <SelectValue placeholder={t.statistics.filters.selectStudent} />
    </SelectTrigger>
    <SelectContent className={getAlignmentClass()}>
      {/* Barre de recherche */}
      <div className="px-2 py-1">
        <input
          type="text"
          placeholder={t.statistics.filters.searchStudent}
          className="w-full p-2 border rounded"
          value={studentSearchTerm}
          onChange={(e) => setStudentSearchTerm(e.target.value)}
        />
      </div>
      
      <SelectItem value="all">{t.statistics.filters.allStudents}</SelectItem>
      {studentsForFilter
        .filter(student => 
          `${student.prenom} ${student.nom}`
            .toLowerCase()
            .includes(studentSearchTerm.toLowerCase())
        )
        .map((student) => (
          <SelectItem 
            key={student.id} 
            value={String(student.id)} 
            className={getAlignmentClass()}
          >
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
  <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${language === 'ar' ? 'md:[&>*:nth-child(odd)]:rtl-flip' : ''}`}>
            <Card>
              <CardHeader className={getAlignmentClass()}>
    <CardTitle className={getAlignmentClass()}>
      {t.statistics.charts.studentDistribution}</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {loading.students ? (
                  <Loader2 className="m-auto h-8 w-8 animate-spin" />
                ) : studentDistributionData.length > 0 ? (
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
                         <Legend 
          layout={language === 'ar' ? 'vertical' : 'horizontal'}
          align={language === 'ar' ? 'right' : 'left'}
          wrapperStyle={{
            textAlign: language === 'ar' ? 'right' : 'left'
          }}
        />
                      </Pie>
                      <Tooltip />
                      <Legend />
</PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500">
                    {t.statistics.noData.studentDistribution}
                  </p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className={getAlignmentClass()}> {/* Appliquer ici */}
    <CardTitle className={getAlignmentClass()}>{t.statistics.charts.genderDistribution}</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {loading.students ? (
                  <Loader2 className="m-auto h-8 w-8 animate-spin" />
                ) : genderDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
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
                ) : (
                  <p className="text-center text-gray-500">
                    {t.statistics.noData.genderDistribution}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="grades" className="space-y-6">
          <Card>
            <CardHeader className={getAlignmentClass()}> {/* Appliquer ici */}
    <CardTitle className={getAlignmentClass()}>{t.statistics.charts.classAverages}</CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              {loading.grades || loading.classes ? (
                <Loader2 className="m-auto h-8 w-8 animate-spin" />
              ) : classAveragesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
<BarChart 
                    data={classAveragesData} 
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >

                    <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="name" />
                
    <YAxis domain={[0, 20]} />

                    <Tooltip />
                      <Legend />
                   <Bar 
                      dataKey="moyenne" 
                      fill="#3b82f6" 
                      name={t.statistics.charts.averageOutOf20} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500">
                  {t.statistics.noData.classAverages}
                </p>
              )}
            </CardContent>
          </Card>

  <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${language === 'ar' ? 'md:[&>*:nth-child(odd)]:rtl-flip' : ''}`}>
            <Card>
              <CardHeader className={getAlignmentClass()}> {/* Appliquer ici */}
    <CardTitle className={getAlignmentClass()}>{t.statistics.charts.subjectAverages}</CardTitle>
              </CardHeader>
              <CardContent className="h-96">
                {loading.grades || loading.coefficients || loading.students || loading.terms ? (
                  <Loader2 className="m-auto h-8 w-8 animate-spin" />
                ) : subjectAverageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={subjectAverageData} 
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 20]} />
                      <Tooltip />
                      <Bar 
                        dataKey="taux" 
                        name={t.statistics.charts.average} 
                        fill="#ff8042" 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500">
                    {t.statistics.noData.subjectAverages}
                  </p>
                )}
              </CardContent>
            </Card>
            
            <Card>
             <CardHeader className={getAlignmentClass()}> {/* Appliquer ici */}
    <CardTitle className={getAlignmentClass()}>{t.statistics.charts.averageEvolution}</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {loading.grades || loading.terms ? (
                  <Loader2 className="m-auto h-8 w-8 animate-spin" />
                ) : averageEvolutionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={averageEvolutionData} 
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 20]} />
                      <Tooltip />
                      <Legend />
                    <Line 
                        type="monotone" 
                        dataKey="moyenne" 
                        name={t.statistics.charts.average} 
                        stroke="#8884d8" 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500">
                    {t.statistics.noData.averageEvolution}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="attendance" className="space-y-6">
          <Card>
            <CardHeader className={getAlignmentClass()}> {/* Appliquer ici */}
    <CardTitle className={getAlignmentClass()}>{t.statistics.charts.attendanceRate}</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              {loading.absences || loading.students || loading.classes ? (
                <Loader2 className="m-auto h-8 w-8 animate-spin" />
              ) : classAttendanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={classAttendanceData} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} unit="%"/>
                    <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
<Bar 
                      dataKey="tauxAssiduite" 
                      name={t.statistics.charts.attendanceRatePercent} 
                      stackId="a" 
                      fill="#ff8042" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500">
                  {t.statistics.noData.attendanceRate}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className={getAlignmentClass()}> {/* Appliquer ici */}
    <CardTitle className={getAlignmentClass()}>{t.statistics.charts.attendanceEvolution}</CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              {loading.absences ? (
                <Loader2 className="m-auto h-8 w-8 animate-spin" />
              ) : monthlyAbsenceEvolutionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={monthlyAbsenceEvolutionData} 
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} unit="%"/>
                    <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                  <Line 
                      type="monotone"
                      dataKey="tauxAssiduite" 
                      name={t.statistics.charts.attendanceRatePercent} 
                      stroke="#ff8042"
                      dot={{ r: 5, fill: "#ff8042", stroke: "#ff8042" }}
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500">
                  {t.statistics.noData.attendanceEvolution}
                </p>
              )}
            </CardContent>
          </Card>
          
          <Card className="mt-4 bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-700">
            <CardContent className={`pt-4 text-sm text-blue-700 dark:text-blue-200 ${getAlignmentClass()}`}>
    <p className={getAlignmentClass()}>

                <strong>{t.statistics.attendanceNote.title}:</strong>{" "}
                {t.statistics.attendanceNote.description}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Statistics;