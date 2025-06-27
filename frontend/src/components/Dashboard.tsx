import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { Users, BookOpen, GraduationCap, TrendingUp, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';

// --- Interface Definitions for Type Safety ---
interface UserData { // Renamed from User to UserData to avoid conflict with AuthContext's User
  id: number; // Changed to number as per other files
  role: 'eleve' | 'professeur' | 'admin';
  nom: string;
  prenom: string;
}

interface NoteApiData {
  id: string; // Keep as string for now, as API might return string IDs
  note: number | null; // Peut être null ou undefined
  etudiant?: { id: number }; // Changed to number
  etudiant_id?: number;      // Changed to number
  evaluation?: { id: number }; // Changed to number
  evaluationId?: number; // Added for easier access
}

interface EvaluationApiData {
  id: number; // Changed to number
  type: string;
  date_eval: string; // La date peut être une chaîne de caractères vide ou invalide
  matiere?: { id: number; nom: string }; // Changed to number
  anneeScolaire?: { id: number }; // Changed to number
  trimestreId?: number; // Added for trimester filtering
  trimestre_id?: number; // Added for trimester filtering (snake_case)
}

interface AnneeAcademiqueDetails { // Pour stocker les détails de l'année académique active
  id: number; // Changed to number
  libelle: string;
  date_debut: string;
  date_fin: string;
}

interface AbsenceAPI { // Interface pour les données d'absence brutes de l'API
  id: number;
  date: string;
  heure_debut: string;
  heure_fin: string;
  justifie: boolean;
  justification: string;
  etudiant?: { id: number; nom: string; prenom: string };
  matiere?: { id: number; nom: string };
  classe?: { id: number; nom: string };
  anneeScolaire?: { id: number; libelle: string };
}

interface MatiereApiData {
  id: number; // Changed to number
  nom: string;
  coefficient?: number; // Added coefficient for grade calculation
}

interface ConfigurationApiData {
  annee_scolaire?: { id: number }; // Changed to number
  annee_academique_active_id?: number; // Added for configuration
}

interface ClasseData {
  id: number;
  nom: string;
  niveau?: string;
  annee_scolaire_id?: number;
}

interface InscriptionData {
  id: number;
  utilisateurId: number;
  classeId: number;
  anneeScolaireId: number;
  actif: boolean;
  classe?: ClasseData;
  utilisateur?: UserData;
}

interface AffectationData {
  id: number;
  professeur: UserData;
  matiere: MatiereApiData;
  classe: ClasseData;
  annee_scolaire_id: number;
}

interface EmploiDuTempsEntry {
  id: number;
  jour: string;
  heure_debut: string;
  heure_fin: string;
  classe_id: number;
  matiere_id: number;
  professeur_id: number;
  annee_academique_id: number;
}

interface TrimestreData {
  id: number;
  nom: string;
  date_debut: string;
  date_fin: string;
  anneeScolaire?: { id: number; libelle: string };
}

interface Coefficient {
  id: number;
  classe_id: number;
  matiere_id: number;
  coefficient: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_URL}/api`;

const NOTIFIED_ABSENCE_IDS_KEY_PREFIX = 'notified_absence_ids_';

// Structure enrichie pour l'affichage des notes
interface EnrichedNote {
  id: string;
  evaluationId: string; // Pour le tri par ordre d'ajout
  subject: string;
  type: string;
  score: number | null; // Peut être null si la note n'est pas présente
  date: string; // La date brute de l'évaluation
}

// --- Dashboard Specific Interfaces ---
interface StatsDataItem {
  name: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}

interface StudentDistributionItem {
  name: string;
  value: number;
  color: string;
}
interface ProfessorStudentTrackingItem {
studentId: number;
  studentName: string;  className: string;
 averageT1: number | null;
  averageT2: number | null;
  averageT3: number | null;
  evolutionT1_T2: number | null;
  evolutionT2_T3: number | null;
  unjustifiedAbsencesT1: number;
  unjustifiedAbsencesT2: number;
  unjustifiedAbsencesT3: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
// ...existing code...

// ...existing code...
  const [notifiedNoteIds, setNotifiedNoteIds] = useState<Set<string>>(new Set());
  const [latestNotes, setLatestNotes] = useState<EnrichedNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState<boolean>(true);
  const [errorNotes, setErrorNotes] = useState<string | null>(null);

  // Admin specific states
  const [activeAcademicYearDetails, setActiveAcademicYearDetails] = useState<AnneeAcademiqueDetails | null>(null);
  const [adminStats, setAdminStats] = useState<StatsDataItem[]>([]);
  const [adminStudentDistribution, setAdminStudentDistribution] = useState<StudentDistributionItem[]>([]);
  const [loadingAdminData, setLoadingAdminData] = useState(true);
  const [selectedAdminClassId, setSelectedAdminClassId] = useState<string>('all');
  const [allAdminClasses, setAllAdminClasses] = useState<ClasseData[]>([]);

  const [adminError, setAdminError] = useState<string | null>(null);

  // Professor specific states
   const [professorAffectations, setProfessorAffectations] = useState<AffectationData[]>([]);
  const [professorInscriptions, setProfessorInscriptions] = useState<InscriptionData[]>([]);
  const [professorEmploiDuTemps, setProfessorEmploiDuTemps] = useState<EmploiDuTempsEntry[]>([]);
 
  const [professorClassesCount, setProfessorClassesCount] = useState<number | null>(null);
  const [professorStudentsCount, setProfessorStudentsCount] = useState<number | null>(null);
  const [professorTodayCoursesCount, setProfessorTodayCoursesCount] = useState<number | null>(null);
  const [professorStudentTrackingData, setProfessorStudentTrackingData] = useState<ProfessorStudentTrackingItem[]>([]);
  const [professorClasses, setProfessorClasses] = useState<ClasseData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  
  const [allTrimesters, setAllTrimesters] = useState<TrimestreData[]>([]);
  const [loadingProfessorData, setLoadingProfessorData] = useState(true);
  const [loadingTrackingData, setLoadingTrackingData] = useState(true);
  const [professorError, setProfessorError] = useState<string | null>(null);
const filteredProfessorClasses = useMemo(
  () =>
    professorClasses.filter(
      (cls) => cls.annee_scolaire_id === activeAcademicYearDetails?.id
    ),
  [professorClasses, activeAcademicYearDetails]
);

const filteredStudentTrackingData = useMemo(() => {
  if (selectedClassId === 'all') {
    return []; // Per request, do not show data when 'all' is selected
  }
  const selectedClass = filteredProfessorClasses.find(cls => cls.id.toString() === selectedClassId);
  if (!selectedClass) {
    return [];
  }
  // Filter the main data source based on the selected class name
  return professorStudentTrackingData.filter(student => student.className === selectedClass.nom);
}, [selectedClassId, professorStudentTrackingData, filteredProfessorClasses]);
  // Common initial data fetch (active academic year, trimesters)
  useEffect(() => {
    const fetchInitialConfig = async () => {
      try {
        const configRes = await axios.get<ConfigurationApiData>(`${API_BASE_URL}/configuration`);
        let activeAnneeId: number | undefined;
        if (Array.isArray(configRes.data) && configRes.data.length > 0) {
          activeAnneeId = configRes.data[0].annee_academique_active_id || configRes.data[0].annee_scolaire?.id;
        } else if (configRes.data && !Array.isArray(configRes.data)) {
          activeAnneeId = configRes.data.annee_academique_active_id || configRes.data.annee_scolaire?.id;
        }

        if (activeAnneeId) {
          const yearDetailsRes = await axios.get<AnneeAcademiqueDetails>(`${API_BASE_URL}/annees-academiques/${activeAnneeId}`);
          setActiveAcademicYearDetails(yearDetailsRes.data);

          const trimestersRes = await axios.get<TrimestreData[]>(`${API_BASE_URL}/trimestres?anneeScolaireId=${activeAnneeId}`);
          setAllTrimesters(trimestersRes.data);
         
        } else {
          console.warn("No active academic year found in configuration.");
        }
      } catch (err) {
        console.error("Error fetching initial config:", err);
        // Handle error appropriately, maybe set a global error state or toast
      }
    };
    fetchInitialConfig();
  }, []);

  // Admin Dashboard Data Fetch
  useEffect(() => {
    if (user?.role !== 'admin' || !activeAcademicYearDetails) {
      setLoadingAdminData(false);
      return;
    }

    const fetchAdminData = async () => {
      setLoadingAdminData(true);
      setAdminError(null);
      try {
    const [ // Fetch all necessary data for admin dashboard
          usersRes,
          classesRes,
          inscriptionsRes, // Inscriptions for the active academic year
          affectationsRes, // Affectations for the active academic year (to count professors)
          notesRes,
          evaluationsRes,
          coefficientsRes,
          matieresRes
        ] = await Promise.all([          axios.get<UserData[]>(`${API_BASE_URL}/users`),
          axios.get<ClasseData[]>(`${API_BASE_URL}/classes`),
          axios.get<InscriptionData[]>(`${API_BASE_URL}/inscriptions?anneeScolaireId=${activeAcademicYearDetails.id}&_expand=classe&_expand=utilisateur`),
          axios.get<AffectationData[]>(`${API_BASE_URL}/affectations?annee_scolaire_id=${activeAcademicYearDetails.id}&_expand=professeur`), // Fetch affectations for professors
                    axios.get<NoteApiData[]>(`${API_BASE_URL}/notes?_expand=evaluation`),
          axios.get<EvaluationApiData[]>(`${API_BASE_URL}/evaluations?anneeScolaire.id=${activeAcademicYearDetails.id}`),
          axios.get<Coefficient[]>(`${API_BASE_URL}/coefficientclasse`),
          axios.get<MatiereApiData[]>(`${API_BASE_URL}/matieres`),
        ]);
        

        const allUsers = usersRes.data;
        const allClasses = classesRes.data;
        const allInscriptions = inscriptionsRes.data;
                const allAffectations = affectationsRes.data; // New: Affectations data

        const allNotes = notesRes.data;
        const allEvaluations = evaluationsRes.data;
        const allCoefficients = coefficientsRes.data;
        const allMatieres = matieresRes.data;

         // Filter classes for the current academic year for the dropdown
        const classesForCurrentYear = allClasses.filter(cls => cls.annee_scolaire_id === activeAcademicYearDetails.id);
        setAllAdminClasses(classesForCurrentYear);

        // Apply class filter to relevant data
        let filteredInscriptions = allInscriptions;
        let filteredAffectations = allAffectations;
        let studentsToEvaluate = allInscriptions.filter(insc => insc.utilisateur?.role === 'eleve');

        if (selectedAdminClassId !== 'all') {
          const selectedClassIdNum = parseInt(selectedAdminClassId);
          filteredInscriptions = allInscriptions.filter(insc => insc.classeId === selectedClassIdNum);
          filteredAffectations = allAffectations.filter(aff => aff.classe.id === selectedClassIdNum);
          studentsToEvaluate = studentsToEvaluate.filter(insc => insc.classeId === selectedClassIdNum);
        }

        const totalStudents = new Set(filteredInscriptions.filter(insc => insc.utilisateur?.role === 'eleve').map(insc => insc.utilisateurId)).size;
        const totalProfessors = new Set(filteredAffectations.map(aff => aff.professeur.id)).size;
        // Le nombre total de classes pour l'année ne doit pas changer avec le filtre.
        const totalClassesForYear = classesForCurrentYear.length;

        // --- Success Rate Calculation (now filtered) ---
     
               // --- Success Rate Calculation ---
        let successfulStudents = 0;
        const studentsWithFinalGrade = [];

        const termEvaluationMap: { [key: number]: { devoir1: string, devoir2: string, composition: string } } = {};
        const trimestersByName: { [key: string]: TrimestreData | undefined } = {};
        allTrimesters.forEach(t => {
          trimestersByName[t.nom] = t;
          if (t.nom.includes('Trimestre')) {
            const termNum = parseInt(t.nom.replace('Trimestre ', ''));
            if (termNum === 1) termEvaluationMap[t.id] = { devoir1: 'Devoir 1', devoir2: 'Devoir 2', composition: 'Composition 1' };
            if (termNum === 2) termEvaluationMap[t.id] = { devoir1: 'Devoir 3', devoir2: 'Devoir 4', composition: 'Composition 2' };
            if (termNum === 3) termEvaluationMap[t.id] = { devoir1: 'Devoir 5', devoir2: 'Devoir 6', composition: 'Composition 3' };
          }
        });


        for (const studentInscription of studentsToEvaluate) {
          if (!studentInscription.utilisateur) continue;

          const studentId = studentInscription.utilisateur.id;
          const studentClassId = studentInscription.classeId;

          const generalAveragesData: { [key: string]: { totalWeightedScore: number; totalCoefficient: number } } = {
            'Trimestre 3': { totalWeightedScore: 0, totalCoefficient: 0 },
          };

          const classSubjects = allCoefficients
            .filter(c => c.classe_id === studentClassId)
            .map(c => allMatieres.find(m => m.id === c.matiere_id))
            .filter((m): m is MatiereApiData => !!m);

          for (const matiere of classSubjects) {
            const matiereId = matiere.id;
            const matiereCoefficient = allCoefficients.find(c => c.classe_id === studentClassId && c.matiere_id === matiereId)?.coefficient || 1;

            const studentNotesForSubject = allNotes.filter(note => {
              const evalId = note.evaluation?.id || note.evaluationId;
              const evaluation = allEvaluations.find(e => e.id === evalId);
              return (
                (note.etudiant_id === studentId || note.etudiant?.id === studentId) &&
                evaluation?.matiere?.id === matiereId
              );
            });

            const term1Obj = trimestersByName['Trimestre 1'];
            const term2Obj = trimestersByName['Trimestre 2'];
            
            const compoT1NoteObj = studentNotesForSubject.find(n => {
              const evalId = n.evaluation?.id || n.evaluationId;
              const evaluation = allEvaluations.find(e => e.id === evalId);
              return term1Obj && evaluation?.trimestreId === term1Obj.id && evaluation?.type === termEvaluationMap[term1Obj.id]?.composition;
            });
            const compoT1Note = compoT1NoteObj ? compoT1NoteObj.note : null;

            const compoT2NoteObj = studentNotesForSubject.find(n => {
              const evalId = n.evaluation?.id || n.evaluationId;
              const evaluation = allEvaluations.find(e => e.id === evalId);
              return term2Obj && evaluation?.trimestreId === term2Obj.id && evaluation?.type === termEvaluationMap[term2Obj.id]?.composition;
            });
            const compoT2Note = compoT2NoteObj ? compoT2NoteObj.note : null;

            const trimester = trimestersByName['Trimestre 3'];
            if (trimester) {
              const trimesterId = trimester.id;
              const termEvalTypes = termEvaluationMap[trimesterId];
              if (termEvalTypes) {
                const notesForTrimester = studentNotesForSubject.filter(note => {
                  const evalId = note.evaluation?.id || note.evaluationId;
                  const evaluation = allEvaluations.find(e => e.id === evalId);
                  return evaluation?.trimestreId === trimesterId || evaluation?.trimestre_id === trimesterId;
                });

                let devoir1Note: number | null = null;
                let devoir2Note: number | null = null;
                let compositionNote: number | null = null;

                notesForTrimester.forEach(note => {
                  const evalId = note.evaluation?.id || note.evaluationId;
                  const evaluation = allEvaluations.find(e => e.id === evalId);
                  const evalType = evaluation?.type;
                  if (evalType === termEvalTypes.devoir1) devoir1Note = note.note;
                  if (evalType === termEvalTypes.devoir2) devoir2Note = note.note;
                  if (evalType === termEvalTypes.composition) compositionNote = note.note;
                });

                let subjectAverage: number | null = null;
                if (devoir1Note !== null && devoir2Note !== null && compositionNote !== null) {
                  const avgDevoirs = (devoir1Note + devoir2Note) / 2;
                  if (compoT1Note !== null && compoT2Note !== null) {
                    subjectAverage = (avgDevoirs * 3 + compositionNote + compoT1Note + compoT2Note) / 6;
                  }
                }

                if (subjectAverage !== null) {
                  generalAveragesData['Trimestre 3'].totalWeightedScore += subjectAverage * matiereCoefficient;
                  generalAveragesData['Trimestre 3'].totalCoefficient += matiereCoefficient;
                }
              }
            }
          }

          const averageT3 = generalAveragesData['Trimestre 3'].totalCoefficient > 0
            ? generalAveragesData['Trimestre 3'].totalWeightedScore / generalAveragesData['Trimestre 3'].totalCoefficient
            : null;
          
          if (averageT3 !== null) {
            studentsWithFinalGrade.push(averageT3);
            if (averageT3 >= 10) {
              successfulStudents++;
            }
          }
        }

        const successRate = studentsWithFinalGrade.length > 0
          ? (successfulStudents / studentsWithFinalGrade.length) * 100
          : 0;

        setAdminStats([
          { name: 'Élèves', value: totalStudents, icon: Users, color: 'bg-blue-500' },
          { name: 'Professeurs', value: totalProfessors, icon: BookOpen, color: 'bg-green-500' },
          { name: 'Classes Totales', value: totalClassesForYear, icon: GraduationCap, color: 'bg-purple-500' },
          { name: 'Taux de Réussite', value: `${successRate.toFixed(0)}%`, icon: TrendingUp, color: 'bg-orange-500' }
        ]);


        const distributionMap = new Map<string, number>();
        filteredInscriptions.forEach(inscription => {
          const level = inscription.classe?.niveau || inscription.classe?.nom || 'Inconnu';
          distributionMap.set(level, (distributionMap.get(level) || 0) + 1);
        });

        const distributionData: StudentDistributionItem[] = Array.from(distributionMap.entries()).map(([name, value], index) => ({
          name,
          value,
          color: ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#a4de6c', '#d0ed57', '#83a6ed', '#8dd1e1'][index % 8],
        }));
        setAdminStudentDistribution(distributionData);

      } catch (err) {
        console.error("Error fetching admin data:", err);
        setAdminError("Impossible de charger les données administratives.");
      } finally {
        setLoadingAdminData(false);
      }
    };
    fetchAdminData();
  }, [user?.role, activeAcademicYearDetails, allTrimesters, selectedAdminClassId]);

  // Professor Dashboard Data Fetch (General Stats)
  useEffect(() => {
    if (user?.role !== 'professeur' || !user?.id || !activeAcademicYearDetails) {
      setLoadingProfessorData(false);
      return;
    }

    const fetchProfessorYearData = async () => {
      setLoadingProfessorData(true);
      setProfessorError(null);
      try {
        const professorId = user.id;
        const yearId = activeAcademicYearDetails.id;

        const affectationsRes = await axios.get<AffectationData[]>(`${API_BASE_URL}/affectations?professeurId=${professorId}&annee_scolaire_id=${yearId}&_expand=classe`);
        const affectations = affectationsRes.data;
        setProfessorAffectations(affectations);

        // 2. Derive Classes
        const uniqueClassesMap = new Map<number, ClasseData>();
        affectations.forEach(aff => {
          if (aff.classe && aff.classe.id) {
            uniqueClassesMap.set(aff.classe.id, aff.classe);
          }
        });
        const uniqueClasses = Array.from(uniqueClassesMap.values()).sort((a, b) => a.nom.localeCompare(b.nom));
        setProfessorClasses(uniqueClasses);
        setProfessorClassesCount(uniqueClasses.length);

        // 3. Fetch Inscriptions for all classes
        if (uniqueClasses.length > 0) {
          const classIdsQuery = uniqueClasses.map(c => `classeId=${c.id}`).join('&');
          const inscriptionsRes = await axios.get<InscriptionData[]>(`${API_BASE_URL}/inscriptions?${classIdsQuery}&anneeScolaireId=${yearId}`);
          setProfessorInscriptions(inscriptionsRes.data);
        } else {
          setProfessorInscriptions([]);
        }

        // 4. Fetch Schedule for the year
        
        const emploiDuTempsRes = await axios.get<EmploiDuTempsEntry[]>(`${API_BASE_URL}/emploi-du-temps?professeur_id=${professorId}&annee_academique_id=${yearId}`);
               setProfessorEmploiDuTemps(emploiDuTempsRes.data);

      } catch (err) {
                console.error("Error fetching professor year data:", err);
        setProfessorError("Impossible de charger les données annuelles du professeur.");
      } finally {
        setLoadingProfessorData(false);
      }
    };
    fetchProfessorYearData();
  }, [user?.id, user?.role, activeAcademicYearDetails]);
// Professor Dashboard - Calculate displayed stats based on filters
  useEffect(() => {
    // Don't run if data isn't ready
    if (loadingProfessorData) return;

    // --- Calculate Student Count ---
    let inscriptionsToCount = professorInscriptions;
    if (selectedClassId !== 'all') {
      inscriptionsToCount = professorInscriptions.filter(
        insc => insc.classeId === parseInt(selectedClassId)
      );
    }
    const uniqueStudentIds = new Set(inscriptionsToCount.map(insc => insc.utilisateurId));
    setProfessorStudentsCount(uniqueStudentIds.size);

    // --- Calculate Today's Courses ---
    const today = format(new Date(), 'EEEE', { locale: fr });
    let todayCourses = professorEmploiDuTemps.filter(
      entry => entry.jour.toLowerCase() === today.toLowerCase()
    );

    if (selectedClassId !== 'all') {
      todayCourses = todayCourses.filter(
        entry => entry.classe_id === parseInt(selectedClassId)
      );
    }
    setProfessorTodayCoursesCount(todayCourses.length);

  }, [selectedClassId, professorInscriptions, professorEmploiDuTemps, loadingProfessorData]);

  // Professor Dashboard Data Fetch (Student Tracking)
  useEffect(() => {
 if (user?.role !== 'professeur' || !user?.id || !activeAcademicYearDetails || allTrimesters.length === 0)
    {      setProfessorStudentTrackingData([]);
      return;
    }

    const fetchProfessorStudentTracking = async () => {
      setLoadingTrackingData(true);
      setProfessorError(null); 
      try {
        const professorId = user.id;
        const yearId = activeAcademicYearDetails.id;
                // Fetch all data needed for calculation
        const [
          affectationsRes,
          notesRes,
          evaluationsRes,
          coefficientsRes,
          inscriptionsRes,
          absencesRes,
        ] = await Promise.all([
          axios.get<AffectationData[]>(`${API_BASE_URL}/affectations?professeurId=${professorId}&annee_scolaire_id=${yearId}&_expand=classe&_expand=matiere`),
          axios.get<NoteApiData[]>(`${API_BASE_URL}/notes?_expand=evaluation`),
          axios.get<EvaluationApiData[]>(`${API_BASE_URL}/evaluations?anneeScolaire.id=${yearId}`),
          axios.get<Coefficient[]>(`${API_BASE_URL}/coefficientclasse`),
          axios.get<InscriptionData[]>(`${API_BASE_URL}/inscriptions?anneeScolaireId=${yearId}&_expand=utilisateur&_expand=classe`),
          axios.get<AbsenceAPI[]>(`${API_BASE_URL}/absences?annee_scolaire_id=${yearId}&_expand=etudiant&_expand=matiere`),
        ]);

        const professorAffectations = affectationsRes.data;
        const allNotes = notesRes.data;
        const allEvaluations = evaluationsRes.data;
        const allCoefficients = coefficientsRes.data;
        const allInscriptions = inscriptionsRes.data;
        const allAbsences = absencesRes.data;

        const professorClassIds = Array.from(new Set(professorAffectations.map(aff => aff.classe.id)));
              if (professorClassIds.length === 0) {
          setProfessorStudentTrackingData([]);
          return;
        }


        const studentsInProfessorClasses = allInscriptions.filter(insc => 
          insc.utilisateur?.role === 'eleve' && professorClassIds.includes(insc.classeId)
        );

        const termEvaluationMap: { [key: number]: { devoir1: string, devoir2: string, composition: string } } = {};
                const trimestersByName: { [key: string]: TrimestreData | undefined } = {};

        allTrimesters.forEach(t => {
                    trimestersByName[t.nom] = t;

          if (t.nom.includes('Trimestre')) {
            const termNum = parseInt(t.nom.replace('Trimestre ', ''));
            if (termNum === 1) termEvaluationMap[t.id] = { devoir1: 'Devoir 1', devoir2: 'Devoir 2', composition: 'Composition 1' };
            if (termNum === 2) termEvaluationMap[t.id] = { devoir1: 'Devoir 3', devoir2: 'Devoir 4', composition: 'Composition 2' };
            if (termNum === 3) termEvaluationMap[t.id] = { devoir1: 'Devoir 5', devoir2: 'Devoir 6', composition: 'Composition 3' };
          }
        });

        const studentTracking: ProfessorStudentTrackingItem[] = [];

        for (const studentInscription of studentsInProfessorClasses) {
                    if (!studentInscription.utilisateur) continue;

          const studentId = studentInscription.utilisateur.id;
          const studentName = `${studentInscription.utilisateur.prenom} ${studentInscription.utilisateur.nom}`;
           const studentClassName = studentInscription.classe?.nom || 'N/A';
          const studentClassId = studentInscription.classeId;
 // Get subjects taught by this professor for this student's class
          const professorSubjectsForClassIds = new Set(
            professorAffectations
              .filter(aff => aff.classe.id === studentClassId)
              .map(aff => aff.matiere.id)
          );
          const generalAveragesData: { [key: string]: { totalWeightedScore: number; totalCoefficient: number } } = {
            'Trimestre 1': { totalWeightedScore: 0, totalCoefficient: 0 },
            'Trimestre 2': { totalWeightedScore: 0, totalCoefficient: 0 },
            'Trimestre 3': { totalWeightedScore: 0, totalCoefficient: 0 },
          };

          for (const matiere of professorAffectations.filter(aff => aff.classe.id === studentClassId).map(aff => aff.matiere)) {
             const matiereId = matiere.id;
            const matiereCoefficient = allCoefficients.find(c => c.classe_id === studentClassId && c.matiere_id === matiereId)?.coefficient || 1;

            const studentNotesForSubject = allNotes.filter(note => {
              const evalId = note.evaluation?.id || note.evaluationId;
              const evaluation = allEvaluations.find(e => e.id === evalId);
              return (
                (note.etudiant_id === studentId || note.etudiant?.id === studentId) &&
                              evaluation?.matiere?.id === matiereId
  
              );
            });

          const term1Obj = trimestersByName['Trimestre 1'];
            const term2Obj = trimestersByName['Trimestre 2'];
            
            const compoT1NoteObj = studentNotesForSubject.find(n => {
              const evalId = n.evaluation?.id || n.evaluationId;
              const evaluation = allEvaluations.find(e => e.id === evalId);
              return term1Obj && evaluation?.trimestreId === term1Obj.id && evaluation?.type === termEvaluationMap[term1Obj.id]?.composition;
            });
            const compoT1Note = compoT1NoteObj ? compoT1NoteObj.note : null;

            const compoT2NoteObj = studentNotesForSubject.find(n => {
              const evalId = n.evaluation?.id || n.evaluationId;
              const evaluation = allEvaluations.find(e => e.id === evalId);
              return term2Obj && evaluation?.trimestreId === term2Obj.id && evaluation?.type === termEvaluationMap[term2Obj.id]?.composition;
            });
            const compoT2Note = compoT2NoteObj ? compoT2NoteObj.note : null;

            for (const trimester of allTrimesters) {
              if (!trimester.nom.startsWith('Trimestre') || !generalAveragesData[trimester.nom]) continue;

              const trimesterId = trimester.id;
              const termEvalTypes = termEvaluationMap[trimesterId];
              if (!termEvalTypes) continue;

              const notesForTrimester = studentNotesForSubject.filter(note => {
                const evalId = note.evaluation?.id || note.evaluationId;
                const evaluation = allEvaluations.find(e => e.id === evalId);
                return evaluation?.trimestreId === trimesterId || evaluation?.trimestre_id === trimesterId;
              });

              let devoir1Note: number | null = null;
              let devoir2Note: number | null = null;
              let compositionNote: number | null = null;

              notesForTrimester.forEach(note => {
                const evalId = note.evaluation?.id || note.evaluationId;
                const evaluation = allEvaluations.find(e => e.id === evalId);
                const evalType = evaluation?.type;
                if (evalType === termEvalTypes.devoir1) devoir1Note = note.note;
                if (evalType === termEvalTypes.devoir2) devoir2Note = note.note;
                if (evalType === termEvalTypes.composition) compositionNote = note.note;
              });

              let subjectAverage: number | null = null;
              if (devoir1Note !== null && devoir2Note !== null && compositionNote !== null) {
                const avgDevoirs = (devoir1Note + devoir2Note) / 2;
                const currentTrimestreNumero = parseInt(trimester.nom.replace('Trimestre ', ''));

                if (currentTrimestreNumero === 1) {
                  subjectAverage = (avgDevoirs * 3 + compositionNote) / 4;
                } else if (currentTrimestreNumero === 2) {
                  if (compoT1Note !== null) {
                    subjectAverage = (avgDevoirs * 3 + compositionNote + compoT1Note) / 5;
                  
                  }
                
                } else if (currentTrimestreNumero === 3) {

                  if (compoT1Note !== null && compoT2Note !== null) {
                    subjectAverage = (avgDevoirs * 3 + compositionNote + compoT1Note + compoT2Note) / 6;
                  }
                }
              }
                         if (subjectAverage !== null) {

                generalAveragesData[trimester.nom].totalWeightedScore += subjectAverage * matiereCoefficient;
                generalAveragesData[trimester.nom].totalCoefficient += matiereCoefficient;
              }

            
                      } // end trimester loop
          } // end subject loop

          const averageT1 = generalAveragesData['Trimestre 1'].totalCoefficient > 0
            ? generalAveragesData['Trimestre 1'].totalWeightedScore / generalAveragesData['Trimestre 1'].totalCoefficient
            : null;
          const averageT2 = generalAveragesData['Trimestre 2'].totalCoefficient > 0
            ? generalAveragesData['Trimestre 2'].totalWeightedScore / generalAveragesData['Trimestre 2'].totalCoefficient
            : null;
          const averageT3 = generalAveragesData['Trimestre 3'].totalCoefficient > 0
            ? generalAveragesData['Trimestre 3'].totalWeightedScore / generalAveragesData['Trimestre 3'].totalCoefficient
            : null;

          const evolutionT1_T2 = (averageT1 !== null && averageT2 !== null) ? averageT2 - averageT1 : null;
          const evolutionT2_T3 = (averageT2 !== null && averageT3 !== null) ? averageT3 - averageT2 : null;

           const studentUnjustifiedAbsences = allAbsences.filter(abs => 
           (abs.etudiant?.id === studentId || (abs as any).etudiant_id === studentId) && 
            (!abs.justification || abs.justification.trim() === '') &&
            abs.matiere && professorSubjectsForClassIds.has(abs.matiere.id)
          );


          const countAbsencesInTrimester = (trimester: TrimestreData | undefined) => {
            if (!trimester || !trimester.date_debut || !trimester.date_fin) return 0;
            
            try {
              const interval = {
                start: startOfDay(parseISO(trimester.date_debut)),
                end: endOfDay(parseISO(trimester.date_fin))
              };
              return studentUnjustifiedAbsences.filter(abs => {
                  const absenceDate = parseISO(abs.date);
                  return isWithinInterval(absenceDate, interval);
              }).length;
            } catch (e) {
              console.warn(`Could not parse dates for trimester ${trimester.nom} or its absences.`);
              return 0;
            }
          };

          const unjustifiedAbsencesT1 = countAbsencesInTrimester(trimestersByName['Trimestre 1']);
          const unjustifiedAbsencesT2 = countAbsencesInTrimester(trimestersByName['Trimestre 2']);
          const unjustifiedAbsencesT3 = countAbsencesInTrimester(trimestersByName['Trimestre 3']);


          studentTracking.push({
            studentId,
            studentName,
            className: studentClassName,
            averageT1: averageT1 ? parseFloat(averageT1.toFixed(2)) : null,
            averageT2: averageT2 ? parseFloat(averageT2.toFixed(2)) : null,
            averageT3: averageT3 ? parseFloat(averageT3.toFixed(2)) : null,
            evolutionT1_T2: evolutionT1_T2 ? parseFloat(evolutionT1_T2.toFixed(2)) : null,
            evolutionT2_T3: evolutionT2_T3 ? parseFloat(evolutionT2_T3.toFixed(2)) : null,
            unjustifiedAbsencesT1,
            unjustifiedAbsencesT2,
            unjustifiedAbsencesT3,
          });
          
        } // end student loop
        setProfessorStudentTrackingData(studentTracking);
      } catch (err) {
        console.error("Error fetching professor student tracking data:", err);
        setProfessorError("Impossible de charger le suivi des élèves.");
      } finally {
        setLoadingTrackingData(false);
      }
    };
    fetchProfessorStudentTracking();
  }, [user?.id, user?.role, activeAcademicYearDetails, allTrimesters]);


  // --- useEffect pour récupérer les dernières notes de l'élève ---
  useEffect(() => {
    // Ne rien faire si user ou user.id n'est pas encore défini.
    if (!user || !user.id) {
      setNotifiedNoteIds(new Set<string>()); // S'assurer que l'état est propre
      setLatestNotes([]);
      setLoadingNotes(false);
      return;
    }

    const storageKey = `notified_note_ids_${user.id}`; // Clé de stockage spécifique à l'utilisateur

    const storedNotifiedIds = localStorage.getItem(storageKey);
    let initialNotifiedIdsFromStorage = new Set<string>();
    if (storedNotifiedIds) {
      try {
        initialNotifiedIdsFromStorage = new Set(JSON.parse(storedNotifiedIds));
      } catch (e) {
        console.error("Failed to parse notified note IDs from localStorage", e);
      }
    }
    // Mettre à jour l'état React. Important pour les rendus suivants.
    setNotifiedNoteIds(initialNotifiedIdsFromStorage);

    const fetchLatestNotes = async () => {
      setLoadingNotes(true);
      setErrorNotes(null);
      if (user?.role !== 'eleve' || !user?.id) {
        setLatestNotes([]);
        setLoadingNotes(false);
        return;
      }

      try {
        const activeYearId = activeAcademicYearDetails?.id;

        if (!activeYearId) {
          console.warn("WARN: Academic year ID is not yet available for fetching notes.");
          setLoadingNotes(false);
          return;
        }

        const [notesResponse, evaluationsResponse, matieresResponse] = await Promise.all([
          axios.get<NoteApiData[]>(`${API_BASE_URL}/notes`),
          axios.get<EvaluationApiData[]>(`${API_BASE_URL}/evaluations`),
          axios.get<MatiereApiData[]>(`${API_BASE_URL}/matieres`),
        ]);

        const allNotes = notesResponse.data;
        const allEvaluations = evaluationsResponse.data;
        const allMatieres = matieresResponse.data;

        const studentNotes = allNotes.filter((note: NoteApiData) => {
          if (note.etudiant && typeof note.etudiant.id !== 'undefined') {
            return String(note.etudiant.id) === String(user.id);
          }
          if (typeof note.etudiant_id !== 'undefined') {
            return String(note.etudiant_id) === String(user.id);
          }
          return false;
        });

        const notesWithDetails: EnrichedNote[] = studentNotes
          .map((note: NoteApiData) => {
            const noteEvaluationId = note.evaluation?.id;
            if (!noteEvaluationId) return null;

            const evaluation = allEvaluations.find(
              (evalItem: EvaluationApiData) =>
                String(evalItem.id) === String(noteEvaluationId) &&
                (activeYearId ? String(evalItem.anneeScolaire?.id) === String(activeYearId) : true)
            );
            if (!evaluation) return null;

            const evaluationMatiereId = evaluation.matiere?.id;
            if (!evaluationMatiereId) return null;

            const matiere = allMatieres.find(
              (subItem: MatiereApiData) => String(subItem.id) === String(evaluationMatiereId)
            );
            if (!matiere) return null;

            const score = note.note !== undefined && note.note !== null ? note.note : null;
            const dateEval = evaluation.date_eval && evaluation.date_eval.trim() !== '' ? evaluation.date_eval : 'Date inconnue';

            return {
              id: note.id,
              evaluationId: evaluation.id.toString(),
              subject: matiere.nom,
              type: evaluation.type,
              score: score,
              date: dateEval,
            };
          })
          .filter(Boolean) as EnrichedNote[];

        const sortedLatestNotes = notesWithDetails
          .sort((a, b) => parseInt(b.evaluationId) - parseInt(a.evaluationId))
          .slice(0, 5);

        setLatestNotes(sortedLatestNotes);

        if (user?.role === 'eleve' && sortedLatestNotes.length > 0) {
          const idsKnownAtStartOfEffect = initialNotifiedIdsFromStorage;
          const newIdsAddedThisCycle = new Set<string>();

          sortedLatestNotes.forEach(note => {
            if (note.id && !idsKnownAtStartOfEffect.has(note.id)) {
              addNotification(
                `Nouvelle note en ${note.subject} (${note.type}): ${note.score !== null ? note.score + '/20' : 'N/A'}`,
                'grade',
                '/student/my-grades'
              );
              newIdsAddedThisCycle.add(note.id);
            }
          });

          if (newIdsAddedThisCycle.size > 0) {
            const allNotifiedIdsNow = new Set([...Array.from(idsKnownAtStartOfEffect), ...Array.from(newIdsAddedThisCycle)]);
            setNotifiedNoteIds(allNotifiedIdsNow);
            localStorage.setItem(storageKey, JSON.stringify(Array.from(allNotifiedIdsNow)));
          }
        }

      } catch (err) {
        console.error('ERROR during student notes fetch:', err);
        setErrorNotes(`Échec du chargement des notes récentes. Erreur : ${axios.isAxiosError(err) ? err.message : 'Erreur inconnue'}.`);
        setLatestNotes([]);
      } finally {
        setLoadingNotes(false);
      }
    };

    if (user.role === 'eleve') {
      fetchLatestNotes();
    } else {
      setLoadingNotes(false);
      setLatestNotes([]);
    }
  }, [user?.id, user?.role, addNotification, activeAcademicYearDetails]);

  // --- useEffect pour récupérer les absences de l'élève et notifier ---
  useEffect(() => {
    if (user?.role !== 'eleve' || !user?.id || !activeAcademicYearDetails) {
      return;
    }

    const studentId = user.id;
    const yearId = activeAcademicYearDetails.id;
    const storageKey = `${NOTIFIED_ABSENCE_IDS_KEY_PREFIX}${studentId}`;

    const fetchAndNotifyAbsences = async () => {
      try {
        const storedNotifiedIds = localStorage.getItem(storageKey);
        let notifiedAbsenceIdsSet = new Set<number>();
        if (storedNotifiedIds) {
          try {
            notifiedAbsenceIdsSet = new Set(JSON.parse(storedNotifiedIds).map(Number));
          } catch (e) {
            console.error("Failed to parse notified absence IDs from localStorage for dashboard", e);
          }
        }

        const params = new URLSearchParams({
          etudiant_id: String(studentId),
          annee_scolaire_id: String(yearId),
          date_debut: format(parseISO(activeAcademicYearDetails.date_debut), 'yyyy-MM-dd'),
          date_fin: format(parseISO(activeAcademicYearDetails.date_fin), 'yyyy-MM-dd'),
        });

        const response = await axios.get<AbsenceAPI[]>(`${API_BASE_URL}/absences?${params.toString()}`);

        if (response.data && response.data.length > 0) {
          const newAbsencesToNotify = new Set<number>();

          response.data.forEach(absence => {
            if (absence.id && !notifiedAbsenceIdsSet.has(absence.id)) {
              addNotification(
                `Nouvelle absence enregistrée le ${format(parseISO(absence.date), 'dd/MM/yyyy', { locale: fr })} en ${absence.matiere?.nom || 'N/A'} (${absence.heure_debut?.substring(0, 5)}-${absence.heure_fin?.substring(0, 5)}).`,
                'absence',
                '/student/my-attendance'
              );
              newAbsencesToNotify.add(absence.id);
            }
          });

          if (newAbsencesToNotify.size > 0) {
            const allNotifiedIdsNow = new Set([...Array.from(notifiedAbsenceIdsSet), ...Array.from(newAbsencesToNotify)]);
            localStorage.setItem(storageKey, JSON.stringify(Array.from(allNotifiedIdsNow)));
          }
        }
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          // No absences found, not an error for notifications.
        } else {
          console.error('ERROR during student absence fetch for dashboard notifications:', err);
        }
      }
    };

    fetchAndNotifyAbsences();
  }, [user?.id, user?.role, addNotification, activeAcademicYearDetails]);

  const renderDashboardContent = () => {
    switch (user?.role) {
      case 'admin':
        return (
          <>
<div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
  <div className="flex flex-col flex-1 min-w-[180px]">
    <label className="text-sm font-medium mb-1 text-gray-700">Année scolaire</label>
    <Select value={activeAcademicYearDetails?.libelle || ''} disabled>
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          <SelectValue placeholder="Année scolaire" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {activeAcademicYearDetails && (
          <SelectItem value={activeAcademicYearDetails.libelle}>
            {activeAcademicYearDetails.libelle}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  </div>
  <div className="flex flex-col flex-1 min-w-[180px]">
    <label className="text-sm font-medium mb-1 text-gray-700">Classe</label>
    <Select value={selectedAdminClassId} onValueChange={setSelectedAdminClassId}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Toutes les classes" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Toutes les classes</SelectItem>
        {allAdminClasses.map(cls => (
          <SelectItem key={cls.id} value={cls.id.toString()}>
            {cls.nom}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
</div>

            {loadingAdminData ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                <p className="mt-4 text-lg text-gray-600">Chargement des données administratives...</p>
              </div>
            ) : adminError ? (
              <div className="p-6 text-center text-red-500">
                <h2 className="text-xl font-semibold mb-2">Erreur de chargement</h2>
                <p>{adminError}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  {adminStats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <Card key={stat.name} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                              <p className="text-2xl font-bold">{stat.value}</p>
                            </div>
                            {Icon && (
                              <div className={`p-3 rounded-full ${stat.color} text-white`}>
                                <Icon className="h-6 w-6" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 

                </div>
              </>
            )}
          </>
        );

      case 'professeur':
        return (
          <>
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-xl font-semibold">Vue d'ensemble</h2>
              <div className="flex gap-4">
                <Select value={activeAcademicYearDetails?.libelle || ''} disabled>
                  <SelectTrigger className="w-[180px]">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      <SelectValue placeholder="Année scolaire" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {activeAcademicYearDetails && (
                      <SelectItem value={activeAcademicYearDetails.libelle}>
                        {activeAcademicYearDetails.libelle}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Choisir une classe" />
                  </SelectTrigger>
                 
  <SelectContent>
  <SelectItem value="all">Classe</SelectItem>
  {filteredProfessorClasses.map(cls => (
    <SelectItem key={cls.id} value={cls.id.toString()}>
      {cls.nom}
    </SelectItem>
  ))}
</SelectContent>
                </Select>
              </div>
            </div>
            {loadingProfessorData ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                <p className="mt-4 text-lg text-gray-600">Chargement des données du professeur...</p>
              </div>
            ) : professorError ? (
              <div className="p-6 text-center text-red-500">
                <h2 className="text-xl font-semibold mb-2">Erreur de chargement</h2>
                <p>{professorError}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-2">Mes Classes</h3>
<p className="text-3xl font-bold text-blue-600">
  {filteredProfessorClasses.length}
</p>                      <p className="text-sm text-gray-600">classes assignées</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-2">Élèves</h3>
                      <p className="text-3xl font-bold text-green-600">{professorStudentsCount !== null ? professorStudentsCount : 'N/A'}</p>
                      <p className="text-sm text-gray-600">élèves au total</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-2">Cours Aujourd'hui</h3>
                      <p className="text-3xl font-bold text-purple-600">{professorTodayCoursesCount !== null ? professorTodayCoursesCount : 'N/A'}</p>
                      <p className="text-sm text-gray-600">cours programmés</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  
                </div>

                <Card>
                  <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                      <CardTitle>Suivi Annuel des Élèves</CardTitle>
                      <CardDescription>Performance académique sur l'ensemble de l'année</CardDescription>
                    </div>

                   
                  </CardHeader>
                  <CardContent>
                    {selectedClassId === 'all' ? (
                      <div className="text-center py-8 text-gray-600">
                        Veuillez sélectionner une classe pour afficher le suivi annuel.
                      </div>
                    ) : loadingTrackingData ? (
                      <div className="flex items-center justify-center p-4 h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <span className="ml-2 text-gray-600">Chargement du suivi...</span>
                      </div>
                    ) : filteredStudentTrackingData.length === 0 ? (
                      <div className="text-center py-8 text-gray-600">
                        Aucune donnée de suivi à afficher pour cette classe.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-4 font-semibold">Élève</th>
                              <th className="text-center py-3 px-4 font-semibold">Moyenne T1</th>
                              <th className="text-center py-3 px-4 font-semibold">Moyenne T2</th>
                              <th className="text-center py-3 px-4 font-semibold">Moyenne T3</th>
                              <th className="text-center py-3 px-4 font-semibold">Absence T1</th>
                              <th className="text-center py-3 px-4 font-semibold">Absence T2</th>
                              <th className="text-center py-3 px-4 font-semibold">Absence T3</th>
                            </tr>
                          </thead>
                          <tbody>
                              {filteredStudentTrackingData.map((student) => (
                                <tr key={student.studentId} className="border-b hover:bg-gray-50">
                                  <td className="py-3 px-4">{student.studentName}</td>
                                  <td className="py-3 px-4 text-center">{student.averageT1 !== null ? student.averageT1.toFixed(2) : 'N/A'}</td>
                                  <td className="py-3 px-4 text-center">
                                    {student.averageT2 !== null ? student.averageT2.toFixed(2) : 'N/A'}
                                    {student.evolutionT1_T2 !== null && (
                                      <span className={cn("ml-2 text-xs font-semibold", student.evolutionT1_T2 >= 0 ? 'text-green-600' : 'text-red-600')}>({student.evolutionT1_T2 >= 0 ? '▲' : '▼'} {Math.abs(student.evolutionT1_T2).toFixed(2)})</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    {student.averageT3 !== null ? student.averageT3.toFixed(2) : 'N/A'}
                                    {student.evolutionT2_T3 !== null && (
                                      <span className={cn("ml-2 text-xs font-semibold", student.evolutionT2_T3 >= 0 ? 'text-green-600' : 'text-red-600')}>({student.evolutionT2_T3 >= 0 ? '▲' : '▼'} {Math.abs(student.evolutionT2_T3).toFixed(2)})</span>
                                    )}
                                  </td>
                                  <td className={cn("py-3 px-4 text-center font-bold", student.unjustifiedAbsencesT1 > 0 ? 'text-orange-600' : 'text-gray-700')}>{student.unjustifiedAbsencesT1}</td>
                                  <td className={cn("py-3 px-4 text-center font-bold", student.unjustifiedAbsencesT2 > 0 ? 'text-orange-600' : 'text-gray-700')}>{student.unjustifiedAbsencesT2}</td>
                                  <td className={cn("py-3 px-4 text-center font-bold", student.unjustifiedAbsencesT3 > 0 ? 'text-orange-600' : 'text-gray-700')}>{student.unjustifiedAbsencesT3}</td>
                                </tr>

                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

          </>
        );

      case 'eleve':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">Moyenne Générale</h3>
                  <p className="text-3xl font-bold text-blue-600">14.8</p>
                  <p className="text-sm text-gray-600">/20</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">Rang dans la Classe</h3>
                  <p className="text-3xl font-bold text-green-600">3ème</p>
                  <p className="text-sm text-gray-600">sur 28 élèves</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">Cours Aujourd'hui</h3>
                  <p className="text-3xl font-bold text-purple-600">6</p>
                  <p className="text-sm text-gray-600">cours programmés</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              

              <Card>
                <CardHeader>
                  <CardTitle>Dernières Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {loadingNotes && <p className="text-gray-600">Chargement des notes...</p>}
                    {errorNotes && <p className="text-red-500">{errorNotes}</p>}
                    {!loadingNotes && !errorNotes && latestNotes.length === 0 && (
                      <p className="text-gray-600">Aucune note récente disponible.</p>
                    )}
                    {!loadingNotes && !errorNotes && latestNotes.length > 0 && (
                      latestNotes.map((note: EnrichedNote, index: number) => (
                        <div
                          key={note.id}
                          className={cn(
                            "flex flex-col p-3 border rounded-lg shadow-sm transition-all duration-200",
                            index === 0 ? "bg-blue-50 border-blue-200 ring-2 ring-blue-300" : "bg-white hover:shadow-md"
                          )}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">
                              {note.type} de {note.subject}
                            </span>
                            <span className="font-bold text-xl text-blue-600">
                              {note.score !== null ? `${note.score}/20` : 'N/A'}
                            </span>
                          </div>
                          <span className={cn("text-xs mt-1", index === 0 ? "text-blue-700" : "text-gray-500")}>
                            {note.date !== 'Date inconnue'
                              ? format(parseISO(note.date), 'dd MMMM yyyy', { locale: fr })
                              : 'Date inconnue'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Tableau de Bord -{' '}
          {user?.role === 'admin' ? 'Administration' :
            user?.role === 'professeur' ? 'Professeur' : 'Élève'}
        </h1>
        <p className="text-gray-600">
          Bienvenue, <strong>{user?.prenom} {user?.nom}</strong>
        </p>
      </div>

      {renderDashboardContent()}
    </div>
  );
}
