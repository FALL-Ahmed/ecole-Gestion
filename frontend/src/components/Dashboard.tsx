import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { Users, BookOpen, GraduationCap, TrendingUp, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';
import { useNotifications } from '@/contexts/NotificationContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// Interfaces
interface UserData {
  id: number;
  role: 'eleve' | 'professeur' | 'admin';
  nom: string;
  prenom: string;
}

interface NoteApiData {
  id: string;
  note: number | null;
  etudiant?: { id: number };
  etudiant_id?: number;
  evaluation?: { id: number };
  evaluationId?: number;
}

interface EvaluationApiData {
  id: number;
  type: string;
  date_eval: string;
  matiere?: { id: number; nom: string };
  anneeScolaire?: { id: number };
  trimestreId?: number;
  trimestre_id?: number;
}

interface AnneeAcademiqueDetails {
  id: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
}

interface AbsenceAPI {
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
  id: number;
  nom: string;
  coefficient?: number;
}

interface ConfigurationApiData {
  annee_scolaire?: { id: number };
  annee_academique_active_id?: number;
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

interface EnrichedNote {
  id: string;
  evaluationId: string;
  subject: string;
  type: string;
  score: number | null;
  date: string;
}

interface StatsDataItem {
  name: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}

interface ProfessorStudentTrackingItem {
  studentId: number;
  studentName: string;
  className: string;
  averageT1: number | null;
  averageT2: number | null;
  averageT3: number | null;
  evolutionT1_T2: number | null;
  evolutionT2_T3: number | null;
  unjustifiedAbsencesT1: number;
  unjustifiedAbsencesT2: number;
  unjustifiedAbsencesT3: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_URL}/api`;
const NOTIFIED_ABSENCE_IDS_KEY_PREFIX = 'notified_absence_ids_';

export function Dashboard() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { t } = useLanguage();

  const [notifiedNoteIds, setNotifiedNoteIds] = useState<Set<string>>(new Set());
  const [latestNotes, setLatestNotes] = useState<EnrichedNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState<boolean>(true);
  const [errorNotes, setErrorNotes] = useState<string | null>(null);

  const [activeAcademicYearDetails, setActiveAcademicYearDetails] = useState<AnneeAcademiqueDetails | null>(null);
  const [adminStats, setAdminStats] = useState<StatsDataItem[]>([]);
  const [loadingAdminData, setLoadingAdminData] = useState(true);
  const [selectedAdminClassId, setSelectedAdminClassId] = useState<string>('all');
  const [allAdminClasses, setAllAdminClasses] = useState<ClasseData[]>([]);
  const [adminError, setAdminError] = useState<string | null>(null);

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
    () => professorClasses.filter(cls => cls.annee_scolaire_id === activeAcademicYearDetails?.id),
    [professorClasses, activeAcademicYearDetails]
  );

  const filteredStudentTrackingData = useMemo(() => {
    if (selectedClassId === 'all') {
      return [];
    }
    const selectedClass = filteredProfessorClasses.find(cls => cls.id.toString() === selectedClassId);
    if (!selectedClass) {
      return [];
    }
    return professorStudentTrackingData.filter(student => student.className === selectedClass.nom);
  }, [selectedClassId, professorStudentTrackingData, filteredProfessorClasses]);

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
      }
    };
    fetchInitialConfig();
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin' || !activeAcademicYearDetails) {
      setLoadingAdminData(false);
      return;
    }

    const fetchAdminData = async () => {
      setLoadingAdminData(true);
      setAdminError(null);
      try {
        const [usersRes, classesRes, inscriptionsRes, affectationsRes, notesRes, evaluationsRes, coefficientsRes, matieresRes] = await Promise.all([
          axios.get<UserData[]>(`${API_BASE_URL}/users`),
          axios.get<ClasseData[]>(`${API_BASE_URL}/classes`),
          axios.get<InscriptionData[]>(`${API_BASE_URL}/inscriptions?anneeScolaireId=${activeAcademicYearDetails.id}&_expand=classe&_expand=utilisateur`),
          axios.get<AffectationData[]>(`${API_BASE_URL}/affectations?annee_scolaire_id=${activeAcademicYearDetails.id}&_expand=professeur`),
          axios.get<NoteApiData[]>(`${API_BASE_URL}/notes?_expand=evaluation`),
          axios.get<EvaluationApiData[]>(`${API_BASE_URL}/evaluations?anneeScolaire.id=${activeAcademicYearDetails.id}`),
          axios.get<Coefficient[]>(`${API_BASE_URL}/coefficientclasse`),
          axios.get<MatiereApiData[]>(`${API_BASE_URL}/matieres`),
        ]);

        const allUsers = usersRes.data;
        const allClasses = classesRes.data;
        const allInscriptions = inscriptionsRes.data;
        const allAffectations = affectationsRes.data;
        const allNotes = notesRes.data;
        const allEvaluations = evaluationsRes.data;
        const allCoefficients = coefficientsRes.data;
        const allMatieres = matieresRes.data;

        const classesForCurrentYear = allClasses.filter(cls => cls.annee_scolaire_id === activeAcademicYearDetails.id);
        setAllAdminClasses(classesForCurrentYear);

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
        const totalClassesForYear = classesForCurrentYear.length;

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
          { name:  t.dashboard.stats.students, value: totalStudents, icon: Users, color: 'bg-blue-500' },
          { name: t.dashboard.stats.professors, value: totalProfessors, icon: BookOpen, color: 'bg-green-500' },
          { name: t.dashboard.stats.totalClasses, value: totalClassesForYear, icon: GraduationCap, color: 'bg-purple-500' },
          { name: t.dashboard.stats.successRate, value: `${successRate.toFixed(0)}%`, icon: TrendingUp, color: 'bg-orange-500' }
        ]);

      } catch (err) {
        console.error("Error fetching admin data:", err);
        setAdminError(t.dashboard.errorAdmin);
      } finally {
        setLoadingAdminData(false);
      }
    };
    fetchAdminData();
  }, [user?.role, activeAcademicYearDetails, allTrimesters, selectedAdminClassId, t]);

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

        const uniqueClassesMap = new Map<number, ClasseData>();
        affectations.forEach(aff => {
          if (aff.classe && aff.classe.id) {
            uniqueClassesMap.set(aff.classe.id, aff.classe);
          }
        });
        const uniqueClasses = Array.from(uniqueClassesMap.values()).sort((a, b) => a.nom.localeCompare(b.nom));
        setProfessorClasses(uniqueClasses);
        setProfessorClassesCount(uniqueClasses.length);

        if (uniqueClasses.length > 0) {
          const classIdsQuery = uniqueClasses.map(c => `classeId=${c.id}`).join('&');
          const inscriptionsRes = await axios.get<InscriptionData[]>(`${API_BASE_URL}/inscriptions?${classIdsQuery}&anneeScolaireId=${yearId}`);
          setProfessorInscriptions(inscriptionsRes.data);
        } else {
          setProfessorInscriptions([]);
        }

        const emploiDuTempsRes = await axios.get<EmploiDuTempsEntry[]>(`${API_BASE_URL}/emploi-du-temps?professeur_id=${professorId}&annee_academique_id=${yearId}`);
        setProfessorEmploiDuTemps(emploiDuTempsRes.data);

      } catch (err) {
        console.error("Error fetching professor year data:", err);
        setProfessorError(t.dashboard.professor.errorData);
      } finally {
        setLoadingProfessorData(false);
      }
    };
    fetchProfessorYearData();
  }, [user?.id, user?.role, activeAcademicYearDetails, t]);

  useEffect(() => {
    if (loadingProfessorData) return;

    let inscriptionsToCount = professorInscriptions;
    if (selectedClassId !== 'all') {
      inscriptionsToCount = professorInscriptions.filter(
        insc => insc.classeId === parseInt(selectedClassId)
      );
    }
    const uniqueStudentIds = new Set(inscriptionsToCount.map(insc => insc.utilisateurId));
    setProfessorStudentsCount(uniqueStudentIds.size);

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
  }, [selectedClassId, professorInscriptions, professorEmploiDuTemps, loadingProfessorData, fr]);

  useEffect(() => {
    if (user?.role !== 'professeur' || !user?.id || !activeAcademicYearDetails || allTrimesters.length === 0) {
      setProfessorStudentTrackingData([]);
      return;
    }

    const fetchProfessorStudentTracking = async () => {
      setLoadingTrackingData(true);
      setProfessorError(null);
      try {
        const professorId = user.id;
        const yearId = activeAcademicYearDetails.id;

        const [affectationsRes, notesRes, evaluationsRes, coefficientsRes, inscriptionsRes, absencesRes] = await Promise.all([
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
          const studentClassName = studentInscription.classe?.nom || t.common.na;
          const studentClassId = studentInscription.classeId;

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
            }
          }

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
        }

        setProfessorStudentTrackingData(studentTracking);
      } catch (err) {
        console.error("Error fetching professor student tracking data:", err);
        setProfessorError(t.dashboard.errorLoadingStudentTrackingData);
      } finally {
        setLoadingTrackingData(false);
      }
    };
    fetchProfessorStudentTracking();
  }, [user?.id, user?.role, activeAcademicYearDetails, allTrimesters, t]);

  useEffect(() => {
    if (!user || !user.id) {
      setNotifiedNoteIds(new Set<string>());
      setLatestNotes([]);
      setLoadingNotes(false);
      return;
    }

    const storageKey = `notified_note_ids_${user.id}`;

    const storedNotifiedIds = localStorage.getItem(storageKey);
    let initialNotifiedIdsFromStorage = new Set<string>();
    if (storedNotifiedIds) {
      try {
        initialNotifiedIdsFromStorage = new Set(JSON.parse(storedNotifiedIds));
      } catch (e) {
        console.error("Failed to parse notified note IDs from localStorage", e);
      }
    }
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
            const dateEval = evaluation.date_eval && evaluation.date_eval.trim() !== '' ? evaluation.date_eval : t.dashboard.student.unknownDate;

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
                `${t.dashboard.student.newGradeNotification} ${note.subject} (${note.type}): ${note.score !== null ? note.score + '/20' : t.common.na}`,
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
        setErrorNotes(`${t.dashboard.student.errorGrades}: ${axios.isAxiosError(err) ? err.message : t.common.unknownError}.`);
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
  }, [user?.id, user?.role, addNotification, activeAcademicYearDetails, t]);

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
                `${t.dashboard.student.newAbsenceNotification} ${format(parseISO(absence.date), 'dd/MM/yyyy', { locale: fr })} ${t.common.in} ${absence.matiere?.nom || t.common.na} (${absence.heure_debut?.substring(0, 5)}-${absence.heure_fin?.substring(0, 5)}).`,
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
  }, [user?.id, user?.role, addNotification, activeAcademicYearDetails, fr, t]);

  const renderDashboardContent = () => {
    switch (user?.role) {
      case 'admin':
        return (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
              <div className="flex flex-col flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-1 text-gray-700">{ t.common.schoolYear}</label>
                <Select value={activeAcademicYearDetails?.libelle || ''} disabled>
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      <SelectValue placeholder={ t.common.schoolYear} />
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
                <label className="text-sm font-medium mb-1 text-gray-700">{t.common.class}</label>
                <Select value={selectedAdminClassId} onValueChange={setSelectedAdminClassId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t.common.allClasses} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.common.allClasses}</SelectItem>
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
                <p className="mt-4 text-lg text-gray-600">{t.dashboard.loadingAdmin}</p>
              </div>
            ) : adminError ? (
              <div className="p-6 text-center text-red-500">
                <h2 className="text-xl font-semibold mb-2">{t.dashboard.loadingError}</h2>
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
              </>
            )}
          </>
        );

      case 'professeur':
        return (
          <>
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-xl font-semibold">{t.dashboard.professor.overview}</h2>
              <div className="flex gap-4">
                <Select value={activeAcademicYearDetails?.libelle || ''} disabled>
                  <SelectTrigger className="w-[180px]">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      <SelectValue placeholder={t.common.schoolYear} />
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
                    <SelectValue placeholder={t.dashboard.professor.chooseClass} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.common.class}</SelectItem>
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
                <p className="mt-4 text-lg text-gray-600">{t.dashboard.professor.loadingData}</p>
              </div>
            ) : professorError ? (
              <div className="p-6 text-center text-red-500">
                <h2 className="text-xl font-semibold mb-2">{t.dashboard.loadingError}</h2>
                <p>{professorError}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-2">{t.dashboard.professor.myClasses}</h3>
                      <p className="text-3xl font-bold text-blue-600">
                        {filteredProfessorClasses.length}
                      </p>
                      <p className="text-sm text-gray-600">{t.dashboard.professor.assignedClasses}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-2">{t.dashboard.stats.students}</h3>
                      <p className="text-3xl font-bold text-green-600">{professorStudentsCount !== null ? professorStudentsCount : t.common.na}</p>
                      <p className="text-sm text-gray-600">{t.dashboard.professor.totalStudents}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-2">{t.dashboard.professor.todayCourses}</h3>
                      <p className="text-3xl font-bold text-purple-600">{professorTodayCoursesCount !== null ? professorTodayCoursesCount : t.common.na}</p>
                      <p className="text-sm text-gray-600">{t.dashboard.professor.scheduledCourses}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                      <CardTitle>{t.dashboard.professor.annualTracking}</CardTitle>
                      <CardDescription>{t.dashboard.professor.annualTrackingDesc}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedClassId === 'all' ? (
                      <div className="text-center py-8 text-gray-600">
                        {t.dashboard.professor.selectClassToTrack}
                      </div>
                    ) : loadingTrackingData ? (
                      <div className="flex items-center justify-center p-4 h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <span className="ml-2 text-gray-600">{t.dashboard.professor.loadingTracking}</span>
                      </div>
                    ) : filteredStudentTrackingData.length === 0 ? (
                      <div className="text-center py-8 text-gray-600">
                        {t.dashboard.professor.noTrackingData}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
<th className="text-left py-3 px-4 font-semibold">{t.dashboard.stats.students}</th>
                              <th className="text-center py-3 px-4 font-semibold">{t.dashboard.professor.avgT1}</th>
                              <th className="text-center py-3 px-4 font-semibold">{t.dashboard.professor.avgT2}</th>
                              <th className="text-center py-3 px-4 font-semibold">{t.dashboard.professor.avgT3}</th>
                              <th className="text-center py-3 px-4 font-semibold">{t.dashboard.professor.absenceT1}</th>
                              <th className="text-center py-3 px-4 font-semibold">{t.dashboard.professor.absenceT2}</th>
                              <th className="text-center py-3 px-4 font-semibold">{t.dashboard.professor.absenceT3}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredStudentTrackingData.map((student) => (
                              <tr key={student.studentId} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4">{student.studentName}</td>
                                <td className="py-3 px-4 text-center">{student.averageT1 !== null ? student.averageT1.toFixed(2) : t.common.na}</td>
                                <td className="py-3 px-4 text-center">
                                  {student.averageT2 !== null ? student.averageT2.toFixed(2) : t.common.na}
                                  {student.evolutionT1_T2 !== null && (
                                    <span className={cn("ml-2 text-xs font-semibold", student.evolutionT1_T2 >= 0 ? 'text-green-600' : 'text-red-600')}>
                                      ({student.evolutionT1_T2 >= 0 ? '▲' : '▼'} {Math.abs(student.evolutionT1_T2).toFixed(2)})
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {student.averageT3 !== null ? student.averageT3.toFixed(2) : t.common.na}
                                  {student.evolutionT2_T3 !== null && (
                                    <span className={cn("ml-2 text-xs font-semibold", student.evolutionT2_T3 >= 0 ? 'text-green-600' : 'text-red-600')}>
                                      ({student.evolutionT2_T3 >= 0 ? '▲' : '▼'} {Math.abs(student.evolutionT2_T3).toFixed(2)})
                                    </span>
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
                  <h3 className="font-semibold text-lg mb-2">{t.dashboard.student.gpa}</h3>
                  <p className="text-3xl font-bold text-blue-600">14.8</p>
                  <p className="text-sm text-gray-600">/20</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">{t.dashboard.student.classRank}</h3>
                  <p className="text-3xl font-bold text-green-600">3ème</p>
                  <p className="text-sm text-gray-600">{t.dashboard.student.rankOutOf} 28 {t.dashboard.stats.students}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">{t.dashboard.professor.todayCourses}</h3>
                  <p className="text-3xl font-bold text-purple-600">6</p>
                  <p className="text-sm text-gray-600">{t.dashboard.professor.scheduledCourses}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t.dashboard.student.latestGrades}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {loadingNotes && <p className="text-gray-600">{t.dashboard.student.loadingGrades}</p>}
                    {errorNotes && <p className="text-red-500">{errorNotes}</p>}
                    {!loadingNotes && !errorNotes && latestNotes.length === 0 && (
                      <p className="text-gray-600">{t.dashboard.student.noRecentGrades}</p>
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
                              {note.type} {t.common.of} {note.subject}
                            </span>
                            <span className="font-bold text-xl text-blue-600">
                              {note.score !== null ? `${note.score}/20` : t.common.na}
                            </span>
                          </div>
                          <span className={cn("text-xs mt-1", index === 0 ? "text-blue-700" : "text-gray-500")}>
                            {note.date !== t.dashboard.student.unknownDate
                              ? format(parseISO(note.date), 'dd MMMM yyyy', { locale: fr })
                              : t.dashboard.student.unknownDate}
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {t.dashboard.title} - {user?.role === 'admin'
          ? t.dashboard.admin
          : user?.role === 'professeur'
          ? t.dashboard.professor.overview
          : t.dashboard.student.gpa}
      </h1>
      <p
        className="text-gray-600 dark:text-white"
        dangerouslySetInnerHTML={{
          __html: t.dashboard.welcome.replace('{user}', `<strong class="dark:text-white">${user?.prenom || ''} ${user?.nom || ''}</strong>`),
        }}
      />
    </div>
    {renderDashboardContent()}
  </div>
);

}