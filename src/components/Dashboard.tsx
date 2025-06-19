import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/contexts/AuthContext'; // **Vérifiez bien ce chemin d'importation**
import { Users, BookOpen, GraduationCap, TrendingUp, Calendar as CalendarIcon } from 'lucide-react'; // **Assurez-vous que 'lucide-react' est installé**
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns'; // Pour formater les dates pour l'API et les notifications
import { fr } from 'date-fns/locale'; // Pour les dates en français
import axios from 'axios'; // Assurez-vous qu'axios est installé si vous l'utilisez réellement pour d'autres appels
import { useNotifications } from '@/contexts/NotificationContext'; // Importer le hook de notifications
import { cn } from '@/lib/utils';

// --- Interface Definitions for Type Safety ---

interface User {
  id: string;
  role: 'eleve' | 'professeur' | 'admin';
  nom: string;
}

interface NoteApiData {
  id: string;
  note: number | null; // Peut être null ou undefined
  etudiant?: { id: string }; // Structure où l'étudiant est un objet imbriqué
  etudiant_id?: string;      // Structure où l'ID de l'étudiant est directement sur la note
  evaluation?: { id: string };
}

interface EvaluationApiData {
  id: string;
  type: string;
  date_eval: string; // La date peut être une chaîne de caractères vide ou invalide
  matiere?: { id: string };
  anneeScolaire?: { id: string };
}

interface AnneeAcademiqueDetails { // Pour stocker les détails de l'année académique active
  id: string;
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

const API_BASE_URL_NOTIF = 'http://localhost:3000/api'; // Préfixe pour les appels API liés aux absences
const NOTIFIED_ABSENCE_IDS_KEY_PREFIX = 'notified_absence_ids_';

interface MatiereApiData {
  id: string;
  nom: string;
}

interface ConfigurationApiData {
  annee_scolaire?: { id: string };
}

// Structure enrichie pour l'affichage des notes
interface EnrichedNote {
  id: string;
  evaluationId: string; // Pour le tri par ordre d'ajout
  subject: string;
  type: string;
  score: number | null; // Peut être null si la note n'est pas présente
  date: string; // La date brute de l'évaluation
}

// --- Mock Data (à adapter si vous les fetcher réellement) ---
// (Les autres interfaces comme StudentPerformanceDataItem, StatsDataItem, etc. restent inchangées)

interface StudentPerformanceDataItem {
  month: string;
  moyenne: number;
}

interface StatsDataItem {
  name: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}

interface GradesByClassItem {
  class: string;
  moyenne: number;
}

interface StudentDistributionItem {
  name: string;
  value: number;
  color: string;
}


export function Dashboard() {
  const { user } = useAuth();
  const { addNotification } = useNotifications(); // Utiliser addNotification

  const [notifiedNoteIds, setNotifiedNoteIds] = useState<Set<string>>(new Set());
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('2023-2024');
  const [latestNotes, setLatestNotes] = useState<EnrichedNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState<boolean>(true);
  const [errorNotes, setErrorNotes] = useState<string | null>(null);
    const [currentAcademicYearDetails, setCurrentAcademicYearDetails] = useState<AnneeAcademiqueDetails | null>(null);


  const professorClasses = ['6ème A', '6ème B', '5ème A', '4ème B', '3ème A'];
  const academicYears = ['2022-2023', '2023-2024', '2024-2025'];

  const studentPerformanceData: { [key: string]: StudentPerformanceDataItem[] } = {
    '2022-2023': [
      { month: 'Sep', moyenne: 13.2 }, { month: 'Oct', moyenne: 13.8 },
      { month: 'Nov', moyenne: 13.5 }, { month: 'Dec', moyenne: 14.2 },
      { month: 'Jan', moyenne: 13.9 }, { month: 'Feb', moyenne: 14.3 },
    ],
    '2023-2024': [
      { month: 'Sep', moyenne: 13.5 }, { month: 'Oct', moyenne: 14.2 },
      { month: 'Nov', moyenne: 13.8 }, { month: 'Dec', moyenne: 15.0 },
      { month: 'Jan', moyenne: 14.3 }, { month: 'Feb', moyenne: 14.8 },
    ],
    '2024-2025': [
      { month: 'Sep', moyenne: 14.0 }, { month: 'Oct', moyenne: 14.5 },
      { month: 'Nov', moyenne: 14.2 }, { month: 'Dec', moyenne: 15.2 },
      { month: 'Jan', moyenne: 14.8 }, { month: 'Feb', moyenne: 15.1 },
    ]
  };

  const statsData: { [key: string]: StatsDataItem[] } = {
    '2022-2023': [
      { name: 'Élèves', value: 230, icon: Users, color: 'bg-blue-500' },
      { name: 'Professeurs', value: 16, icon: BookOpen, color: 'bg-green-500' },
      { name: 'Classes', value: 10, icon: GraduationCap, color: 'bg-purple-500' },
      { name: 'Taux de Réussite', value: '85%', icon: TrendingUp, color: 'bg-orange-500' }
    ],
    '2023-2024': [
      { name: 'Élèves', value: 245, icon: Users, color: 'bg-blue-500' },
      { name: 'Professeurs', value: 18, icon: BookOpen, color: 'bg-green-500' },
      { name: 'Classes', value: 12, icon: GraduationCap, color: 'bg-purple-500' },
      { name: 'Taux de Réussite', value: '87%', icon: TrendingUp, color: 'bg-orange-500' }
    ],
    '2024-2025': [
      { name: 'Élèves', value: 260, icon: Users, color: 'bg-blue-500' },
      { name: 'Professeurs', value: 20, icon: BookOpen, color: 'bg-green-500' },
      { name: 'Classes', value: 14, icon: GraduationCap, color: 'bg-purple-500' },
      { name: 'Taux de Réussite', value: '89%', icon: TrendingUp, color: 'bg-orange-500' }
    ]
  };

  const gradesByClass: { [key: string]: GradesByClassItem[] } = {
    '2022-2023': [
      { class: '6ème A', moyenne: 13.8 }, { class: '6ème B', moyenne: 13.5 },
      { class: '5ème A', moyenne: 14.7 }, { class: '5ème B', moyenne: 14.2 },
      { class: '4ème A', moyenne: 13.6 }, { class: '4ème B', moyenne: 14.3 },
    ],
    '2023-2024': [
      { class: '6ème A', moyenne: 14.2 }, { class: '6ème B', moyenne: 13.8 },
      { class: '5ème A', moyenne: 15.1 }, { class: '5ème B', moyenne: 14.5 },
      { class: '4ème A', moyenne: 13.9 }, { class: '4ème B', moyenne: 14.7 },
    ],
    '2024-2025': [
      { class: '6ème A', moyenne: 14.5 }, { class: '6ème B', moyenne: 14.2 },
      { class: '5ème A', moyenne: 15.4 }, { class: '5ème B', moyenne: 14.8 },
      { class: '4ème A', moyenne: 14.2 }, { class: '4ème B', moyenne: 15.0 },
    ]
  };

  const studentDistribution: { [key: string]: StudentDistributionItem[] } = {
    '2022-2023': [
      { name: '6ème', value: 65, color: '#8884d8' }, { name: '5ème', value: 60, color: '#82ca9d' },
      { name: '4ème', value: 55, color: '#ffc658' }, { name: '3ème', value: 50, color: '#ff7c7c' },
    ],
    '2023-2024': [
      { name: '6ème', value: 68, color: '#8884d8' }, { name: '5ème', value: 62, color: '#82ca9d' },
      { name: '4ème', value: 58, color: '#ffc658' }, { name: '3ème', value: 57, color: '#ff7c7c' },
    ],
    '2024-2025': [
      { name: '6ème', value: 70, color: '#8884d8' }, { name: '5ème', value: 65, color: '#82ca9d' },
      { name: '4ème', value: 60, color: '#ffc658' }, { name: '3ème', value: 65, color: '#ff7c7c' },
    ]
  };

  const filterDataByClass = (data: (GradesByClassItem | StudentDistributionItem)[]) => {
    if (selectedClass === 'all') return data;
    return data.filter(item =>
      ('class' in item && item.class === selectedClass) ||
      ('name' in item && item.name === selectedClass)
    );
  };

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
        console.log('--- NOTES FETCH SKIPPED (Not an "eleve" or missing ID) ---');
        setLatestNotes([]);
        setLoadingNotes(false);
        return;
      }

      console.log('--- STARTING STUDENT NOTES FETCH ---');
      console.log(`User: ${user.nom} (ID: ${user.id}, Role: ${user.role})`);

      try {
        // 1. Récupération de la configuration de l'année scolaire
        console.log('Fetching configuration from: http://localhost:3000/api/configuration');
        const configResponse = await axios.get<ConfigurationApiData>('http://localhost:3000/api/configuration');
        const activeYearId = configResponse.data?.annee_scolaire?.id;

        console.log('Config response data:', configResponse.data);

         if (!activeYearId) {
          console.warn("WARN: Academic year ID is UNDEFINED/NULL from configuration API. This might affect evaluation filtering.");
        } else {
          console.log(`Current active academic year ID: ${activeYearId}`);
          // Fetch details of the active academic year
          const yearDetailsResponse = await axios.get<AnneeAcademiqueDetails>(`${API_BASE_URL_NOTIF}/annees-academiques/${activeYearId}`);
          if (yearDetailsResponse.data) {
            setCurrentAcademicYearDetails(yearDetailsResponse.data);
          }
        }

        // 2. Récupération des données brutes (notes, évaluations, matières) en parallèle
        console.log('Fetching notes, evaluations, and subjects in parallel...');
        const [notesResponse, evaluationsResponse, matieresResponse] = await Promise.all([
          axios.get<NoteApiData[]>(`http://localhost:3000/api/notes`),
          axios.get<EvaluationApiData[]>(`http://localhost:3000/api/evaluations`),
          axios.get<MatiereApiData[]>(`http://localhost:3000/api/matieres`),
        ]);

        const allNotes = notesResponse.data;
        const allEvaluations = evaluationsResponse.data;
        const allMatieres = matieresResponse.data;

        console.log(`Fetched ${allNotes.length} notes, ${allEvaluations.length} evaluations, ${allMatieres.length} subjects.`);
        // Logs de débogage pour les données brutes
        // console.log('DEBUG: All Notes:', allNotes);
        // console.log('DEBUG: All Evaluations:', allEvaluations);
        // console.log('DEBUG: All Matieres:', allMatieres);

        // 3. Filtrage des notes pour l'élève connecté
        const studentNotes = allNotes.filter((note: NoteApiData) => {
          // Vérifier la structure note.etudiant.id
          if (note.etudiant && typeof note.etudiant.id !== 'undefined') {
            return String(note.etudiant.id) === String(user.id);
          }
          // Vérifier la structure note.etudiant_id (fallback)
          if (typeof note.etudiant_id !== 'undefined') {
            return String(note.etudiant_id) === String(user.id);
          }
          return false; // La note ne peut pas être associée à l'utilisateur
        });
        console.log(`Found ${studentNotes.length} notes for student ID: ${user.id}.`);
        // console.log('DEBUG: Student Notes:', studentNotes);


        // 4. Enrichissement des notes avec les détails d'évaluation et de matière
        const notesWithDetails: EnrichedNote[] = studentNotes
          .map((note: NoteApiData) => {
            const noteEvaluationId = note.evaluation?.id;

            if (!noteEvaluationId) {
              console.warn(`SKIP: Note ID ${note.id} is missing 'evaluation.id'.`, note);
              return null;
            }

            const evaluation = allEvaluations.find(
              (evalItem: EvaluationApiData) =>
                String(evalItem.id) === String(noteEvaluationId) &&
                // Filtrer par année scolaire UNIQUEMENT si currentAcademicYearId est défini
                (activeYearId ? String(evalItem.anneeScolaire?.id) === String(activeYearId) : true)
            );

            if (!evaluation) {
              console.warn(`SKIP: No evaluation found for note ID ${note.id} (Evaluation ID: ${noteEvaluationId}, Academic Year ID: ${currentAcademicYearDetails || 'N/A'}).`, { note, allEvaluations });
              return null;
            }

            const evaluationMatiereId = evaluation.matiere?.id;
            if (!evaluationMatiereId) {
              console.warn(`SKIP: Evaluation ID ${evaluation.id} is missing 'matiere.id'.`, evaluation);
              return null;
            }

            const matiere = allMatieres.find(
              (subItem: MatiereApiData) => String(subItem.id) === String(evaluationMatiereId)
            );

            if (!matiere) {
              console.warn(`SKIP: No subject found for evaluation ID ${evaluation.id} (Subject ID: ${evaluationMatiereId}).`, { evaluation, allMatieres });
              return null;
            }

            // Assigner la note et la date avec des valeurs par défaut si null/undefined
            const score = note.note !== undefined && note.note !== null ? note.note : null;
            const dateEval = evaluation.date_eval && evaluation.date_eval.trim() !== '' ? evaluation.date_eval : 'Date inconnue';

           

            console.log(`SUCCESS: Enriched Note for Note ID ${note.id}: Type='${evaluation.type}', Subject='${matiere.nom}', Score=${score}`);

            return {
              id: note.id,
              evaluationId: evaluation.id, // Utilisé pour le tri
              subject: matiere.nom,
              type: evaluation.type,
              score: score,
              date: dateEval,

              
             
            };
          })
          .filter(Boolean) as EnrichedNote[]; // Supprime les éléments `null`

        // 5. Tri par ID d'évaluation décroissant (pour les 5 dernières entrées)
        const sortedLatestNotes = notesWithDetails
          .sort((a, b) => {
            const idA = parseInt(a.evaluationId);
            const idB = parseInt(b.evaluationId);
            // Gérer les cas où les IDs ne sont pas des nombres valides
            if (isNaN(idA) || isNaN(idB)) {
                console.warn(`WARN: Cannot parse evaluationId for sorting. a.evaluationId: '${a.evaluationId}', b.evaluationId: '${b.evaluationId}'`);
                return 0; // Traiter comme égaux si non-numériques
            }
            return idB - idA; // Tri décroissant (plus grand ID = plus récent)
          })
          .slice(0, 5); // Prendre les 5 premières après le tri

        console.log('Final latest notes for display (sorted by evaluation ID, top 5):', sortedLatestNotes);
        setLatestNotes(sortedLatestNotes);

        // Logique de notification pour les nouvelles notes
        if (user?.role === 'eleve' && sortedLatestNotes.length > 0) {
          // Utiliser initialNotifiedIdsFromStorage comme base pour ce cycle de fetch.
          const idsKnownAtStartOfEffect = initialNotifiedIdsFromStorage;
          const newIdsAddedThisCycle = new Set<string>();

          sortedLatestNotes.forEach(note => {
            // Vérifier par rapport aux IDs connus au début de cet effet.
            if (note.id && !idsKnownAtStartOfEffect.has(note.id)) {
              addNotification(
                `Nouvelle note en ${note.subject} (${note.type}): ${note.score !== null ? note.score + '/20' : 'N/A'}`,
                'grade',
                '/student/my-grades' // Lien vers la page des notes
              );
              newIdsAddedThisCycle.add(note.id);
            }
          });

          if (newIdsAddedThisCycle.size > 0) {
            const allNotifiedIdsNow = new Set([...Array.from(idsKnownAtStartOfEffect), ...Array.from(newIdsAddedThisCycle)]);
            setNotifiedNoteIds(allNotifiedIdsNow); // Mettre à jour l'état React
            localStorage.setItem(storageKey, JSON.stringify(Array.from(allNotifiedIdsNow))); // Mettre à jour localStorage
          }
        }

      } catch (err) {
        console.error('ERROR during student notes fetch:', err);
        setErrorNotes(`Échec du chargement des notes récentes. Erreur : ${axios.isAxiosError(err) ? err.message : 'Erreur inconnue'}. Veuillez vérifier les journaux du serveur backend.`);
        setLatestNotes([]);
      } finally {
        setLoadingNotes(false);
      }
    };

    // Exécuter fetchLatestNotes seulement si c'est un élève (user.id est déjà garanti non-nul ici)
    if (user.role === 'eleve') {
        fetchLatestNotes();
    } else {
        setLoadingNotes(false);
        setLatestNotes([]); // S'assurer que les notes sont vides pour les autres rôles
    }
  // Dépendances : user.id et user.role pour s'assurer que l'effet se relance
  // si l'utilisateur connecté change. addNotification est stable.
  }, [user?.id, user?.role, addNotification]);
   // --- useEffect pour récupérer les absences de l'élève et notifier ---
  useEffect(() => {
    if (user?.role !== 'eleve' || !user?.id || !currentAcademicYearDetails) {
      return;
    }

    const studentId = user.id;
    const yearId = currentAcademicYearDetails.id;
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
          annee_scolaire_id: yearId,
          date_debut: format(new Date(currentAcademicYearDetails.date_debut), 'yyyy-MM-dd'),
          date_fin: format(new Date(currentAcademicYearDetails.date_fin), 'yyyy-MM-dd'),
        });

        const response = await axios.get<AbsenceAPI[]>(`${API_BASE_URL_NOTIF}/absences?${params.toString()}`);
        
        if (response.data && response.data.length > 0) {
          const newAbsencesToNotify = new Set<number>();

          response.data.forEach(absence => {
            if (absence.id && !notifiedAbsenceIdsSet.has(absence.id)) {
              addNotification(
                `Nouvelle absence enregistrée le ${format(new Date(absence.date), 'dd/MM/yyyy', { locale: fr })} en ${absence.matiere?.nom || 'N/A'} (${absence.heure_debut?.substring(0,5)}-${absence.heure_fin?.substring(0,5)}).`,
                'absence',
                '/student/my-attendance'
              );
              newAbsencesToNotify.add(absence.id);
            }
          });

          if (newAbsencesToNotify.size > 0) {
            const allNotifiedIdsNow = new Set([...Array.from(notifiedAbsenceIdsSet), ...Array.from(newAbsencesToNotify)]);
            localStorage.setItem(storageKey, JSON.stringify(Array.from(allNotifiedIdsNow)));
            // No need to call setNotifiedAbsenceIds here as Dashboard doesn't display absences directly
          }
        }
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          // No absences found, not an error for notifications.
        } else {
          console.error('ERROR during student absence fetch for dashboard notifications:', err);
          // Optionally, inform the user if fetching absences fails, though it's a background task.
          // toast({ title: "Erreur", description: "Impossible de vérifier les nouvelles absences.", variant: "default" });
        }
      }
    };

    fetchAndNotifyAbsences();
  }, [user?.id, user?.role, addNotification, currentAcademicYearDetails]);


  const renderDashboardContent = () => {
    switch (user?.role) {
      case 'admin':
        return (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Tableau de bord administratif</h2>
              <div className="flex gap-4">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[150px]">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      <SelectValue placeholder="Année scolaire" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Toutes les classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {professorClasses.map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {statsData[selectedYear].map((stat) => {
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
              <Card>
                <CardHeader>
                  <CardTitle>Moyennes par Classe</CardTitle>
                  <CardDescription>Performance académique par classe</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filterDataByClass(gradesByClass[selectedYear])}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="class" />
                      <YAxis domain={[0, 20]} />
                      <Tooltip />
                      <Bar dataKey="moyenne" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Répartition des Élèves</CardTitle>
                  <CardDescription>Distribution par niveau</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={studentDistribution[selectedYear]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {studentDistribution[selectedYear].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        );

      case 'professeur':
        return (
          <>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Vue d'overview</h2>
              <div className="flex gap-4">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[150px]">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      <SelectValue placeholder="Année scolaire" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Toutes les classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {professorClasses.map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">Mes Classes</h3>
                  <p className="text-3xl font-bold text-blue-600">5</p>
                  <p className="text-sm text-gray-600">classes assignées</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">Élèves</h3>
                  <p className="text-3xl font-bold text-green-600">127</p>
                  <p className="text-sm text-gray-600">élèves au total</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">Cours Aujourd'hui</h3>
                  <p className="text-3xl font-bold text-purple-600">6</p>
                  <p className="text-sm text-gray-600">heures de cours</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Emploi du Temps de la Semaine</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium">Mathématiques - {selectedClass === 'all' ? '6ème A' : selectedClass}</span>
                      <span className="text-sm text-gray-600">Lundi 08:00 - 09:00</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="font-medium">Mathématiques - {selectedClass === 'all' ? '5ème B' : selectedClass}</span>
                      <span className="text-sm text-gray-600">Lundi 10:00 - 11:00</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="font-medium">Mathématiques - {selectedClass === 'all' ? '4ème A' : selectedClass}</span>
                      <span className="text-sm text-gray-600">Mardi 14:00 - 15:00</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Évolution des Notes</CardTitle>
                  <CardDescription>Moyenne de la classe par mois</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={studentPerformanceData[selectedYear]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 20]} />
                      <Tooltip />
                      <Bar dataKey="moyenne" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Suivi des Élèves</CardTitle>
                <CardDescription>Performance académique des élèves</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Élève</th>
                        <th className="text-left py-3 px-4">Classe</th>
                        <th className="text-left py-3 px-4">Moyenne</th>
                        <th className="text-left py-3 px-4">Évolution</th>
                        <th className="text-left py-3 px-4">Absences</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">Alice Dupont</td>
                        <td className="py-3 px-4">6ème A</td>
                        <td className="py-3 px-4">15.2/20</td>
                        <td className="py-3 px-4 text-green-600">+1.3</td>
                        <td className="py-3 px-4">2</td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">Baptiste Martin</td>
                        <td className="py-3 px-4">6ème A</td>
                        <td className="py-3 px-4">14.8/20</td>
                        <td className="py-3 px-4 text-green-600">+0.7</td>
                        <td className="py-3 px-4">0</td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">Clara Bernard</td>
                        <td className="py-3 px-4">5ème B</td>
                        <td className="py-3 px-4">12.5/20</td>
                        <td className="py-3 px-4 text-red-600">-0.8</td>
                        <td className="py-3 px-4">3</td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">David Petit</td>
                        <td className="py-3 px-4">6ème B</td>
                        <td className="py-3 px-4">16.1/20</td>
                        <td className="py-3 px-4 text-green-600">+0.2</td>
                        <td className="py-3 px-4">1</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
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
                  <CardTitle>Prochains Cours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Mathématiques</p>
                        <p className="text-sm text-gray-600">Salle 201</p>
                      </div>
                      <span className="text-sm font-medium">08:00 - 09:00</span>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Français</p>
                        <p className="text-sm text-gray-600">Salle 105</p>
                      </div>
                      <span className="text-sm font-medium">09:00 - 10:00</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                            index === 0 ? "bg-blue-50 border-blue-200 ring-2 ring-blue-300" : "bg-white hover:shadow-md" // Style pour la note la plus récente
                          )}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">
                              {note.type} de {note.subject}
                            </span>
                            <span className="font-bold text-xl text-blue-600">
                              {/* Afficher la note ou "N/A" si null/undefined */}
                              {note.score !== null ? `${note.score}/20` : 'N/A'}
                            </span>
                          </div>
                          <span className={cn("text-xs mt-1", index === 0 ? "text-blue-700" : "text-gray-500")}>
                            {/* Afficher la date brute ou "Date inconnue" */}
                            
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
  Bienvenue, <strong>{user?.nom} {user?.prenom}</strong>
</p>

      </div>

      {renderDashboardContent()}
    </div>
  );
}