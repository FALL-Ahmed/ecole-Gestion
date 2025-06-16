import React, { useState, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Save, Search } from 'lucide-react'; // Removed unused UserCheck, UserX
import { toast as sonnerToast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fr } from 'date-fns/locale';

const API_BASE_URL = 'http://localhost:3000/api';

// --- Interfaces pour les données API ---
interface AnneeAcademique {
  id: number;
  libelle: string;
}

interface Classe {
  id: number;
  nom: string;
  annee_scolaire_id: number;
}

interface Matiere {
  id: number;
  nom: string;
}

interface Utilisateur { // Utilisé pour l'élève dans l'inscription
  id: number;
  nom: string;
  prenom: string;
}

interface Inscription {
  id: number;
  utilisateur: Utilisateur;
  classe: Classe;
}

interface StudentAttendanceEntry {
  etudiant_id: number;
  nom: string; // prenom + nom
  present: boolean;
  justified: boolean;
  justification: string;
  existingAbsenceId?: number | null; // Pour savoir si on update ou crée une absence
}

interface AbsenceRecord {
  id: number; // ID de l'enregistrement d'absence
  etudiant_id: number;
  etudiant_nom: string;
  etudiant_classe_nom: string;
  date: string;
  matiere_id: number;
  matiere_nom: string;
  heure_debut?: string;
  heure_fin?: string;
  justified: boolean;
  justification: string;
}

// Interface pour correspondre à la structure des données de l'emploi du temps de base
interface EmploiDuTempsEntry {
  id: number;
  jour: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi' | 'Dimanche';
  heure_debut: string;
  heure_fin: string;
  classe_id: number;
  matiere_id: number;
  professeur_id: number;
}

const timeSlots = ["08:00-10:00", "10:15-12:00", "12:15-14:00"]; // Exemple

// --- Composant Principal de Gestion d'Absence avec choix de vue ---
export function AttendanceManagement() {
  const [anneesAcademiques, setAnneesAcademiques] = useState<AnneeAcademique[]>([]);
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState<string>('');
  const [isLoadingYears, setIsLoadingYears] = useState(true);

  useEffect(() => {
    const fetchAnnees = async () => {
      setIsLoadingYears(true);
      try {
        const response = await fetch(`${API_BASE_URL}/annees-academiques`);
        if (!response.ok) throw new Error("Impossible de charger la liste des années académiques.");
        const data: AnneeAcademique[] = await response.json();
        setAnneesAcademiques(data);
        // Essayer de charger l'année scolaire configurée
        try {
          const configResponse = await fetch(`${API_BASE_URL}/configuration`);
          if (configResponse.ok) {
            const configData = await configResponse.json();
            if (configData && configData.annee_scolaire && configData.annee_scolaire.id) {
              const configuredYearId = configData.annee_scolaire.id.toString();
              // Vérifier si l'année configurée existe dans la liste des années chargées
              if (data.some(annee => annee.id.toString() === configuredYearId)) {
                setSelectedSchoolYearId(configuredYearId);
                return; // Sortir si l'année configurée est trouvée et définie
              }
            }
          } else if (configResponse.status !== 404) { // Ne pas considérer 404 comme une erreur bloquante
            console.warn("Avertissement: Impossible de charger la configuration de l'année scolaire actuelle.", configResponse.statusText);
          }
        } catch (configError) {
          console.warn("Avertissement: Erreur lors du chargement de la configuration de l'année scolaire.", configError);
        }

        // Logique de fallback si aucune année configurée n'est trouvée ou valide
        if (data.length > 0) {
          // Essayer de trouver l'année actuelle ou la plus récente
          const currentYear = new Date().getFullYear();
          const defaultYear = data.find(a => a.libelle.startsWith(currentYear.toString())) || data[data.length - 1];
          setSelectedSchoolYearId(defaultYear.id.toString());
        }
      } catch (error) {
        sonnerToast.error((error as Error).message);
      } finally {
        setIsLoadingYears(false);
      }
    };
    fetchAnnees();
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-gray-800">Gestion des Présences et Absences</CardTitle>
        <CardDescription>Gérez les présences quotidiennes des élèves et suivez leurs absences.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6">
          <label htmlFor="school-year-select" className="font-semibold text-gray-700">Année Scolaire :</label>
          <Select onValueChange={setSelectedSchoolYearId} value={selectedSchoolYearId} disabled={isLoadingYears}>
            <SelectTrigger id="school-year-select" className="w-[200px] bg-white">
              <SelectValue placeholder="Sélectionner une année" />
            </SelectTrigger>
            <SelectContent>
              {anneesAcademiques.map((annee) => (
                <SelectItem key={annee.id} value={annee.id.toString()}>
                  {annee.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="dailyAttendance" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dailyAttendance">Enregistrer les Présences</TabsTrigger>
            <TabsTrigger value="absenceTracking">Suivi des Absences</TabsTrigger>
          </TabsList>

          <TabsContent value="dailyAttendance">
            <ProfessorAttendance
              selectedSchoolYearId={selectedSchoolYearId}
              anneesAcademiques={anneesAcademiques} // Pass down for display
            />
          </TabsContent>
          <TabsContent value="absenceTracking">
            <AttendanceTracking
              selectedSchoolYearId={selectedSchoolYearId}
              anneesAcademiques={anneesAcademiques} // Pass down for display
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </div>
  );
}

interface ProfessorAttendanceProps {
  selectedSchoolYearId: string;
  anneesAcademiques: AnneeAcademique[];
}

export function ProfessorAttendance({ selectedSchoolYearId, anneesAcademiques }: ProfessorAttendanceProps) {
  const [classes, setClasses] = useState<Classe[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [attendanceData, setAttendanceData] = useState<StudentAttendanceEntry[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingMatieres, setIsLoadingMatieres] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [availableSessions, setAvailableSessions] = useState<{ heure_debut: string, heure_fin: string }[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Fetch classes when school year changes
  useEffect(() => {
    if (!selectedSchoolYearId) {
      setClasses([]);
      setSelectedClass('');
      return;
    }

    const fetchClasses = async () => {
      setIsLoadingClasses(true);
      try {
        const response = await fetch(`${API_BASE_URL}/classes?annee_scolaire_id=${selectedSchoolYearId}`);
        if (!response.ok) throw new Error("Impossible de charger les classes.");
        const allClassesForYear: Classe[] = await response.json();
        // Filtrage explicite côté client pour s'assurer que seules les classes de l'année sélectionnée sont affichées.
        const filteredClasses = allClassesForYear.filter(cls => cls.annee_scolaire_id === parseInt(selectedSchoolYearId));
        setClasses(filteredClasses);
      } catch (error) {
        sonnerToast.error((error as Error).message);
      } finally {
        setIsLoadingClasses(false);
      }
    };
    fetchClasses();
    setSelectedClass(''); // Reset class on year change
    setSelectedSubject(''); // Cascade reset
    setSelectedTimeSlot('');
    setAttendanceData([]);
  }, [selectedSchoolYearId]);

  // Fetch matieres (could be dependent on class or all matieres)
  // Fetch matieres
  useEffect(() => {
    if (!selectedClass || !selectedSchoolYearId || !date) {
      setMatieres([]);
      setSelectedSubject('');
      // Cascading resets for dependent states
      setAvailableSessions([]);
      setSelectedTimeSlot('');
      setAttendanceData([]);
      return;
    }

    const fetchMatieresForDay = async () => {
      setIsLoadingMatieres(true);
      setMatieres([]); // Clear previous matieres
      setSelectedSubject(''); // Reset subject selection

      try {
        const dayOfWeekNameUncapitalized = format(date, 'EEEE', { locale: fr });
        const dayOfWeekName = dayOfWeekNameUncapitalized.charAt(0).toUpperCase() + dayOfWeekNameUncapitalized.slice(1);

        // 1. Fetch all subjects for the selected class
        const matieresResponse = await fetch(`${API_BASE_URL}/coefficientclasse?classeId=${selectedClass}`);
        if (!matieresResponse.ok) throw new Error("Impossible de charger les matières de la classe.");
        const coefficientClasses = await matieresResponse.json();
        const allClassMatieres: Matiere[] = coefficientClasses.map((cc: any) => cc.matiere).filter(Boolean);

        // 2. Fetch timetable entries for the selected class and school year
        const emploiDuTempsResponse = await fetch(`${API_BASE_URL}/emploi-du-temps?classe_id=${selectedClass}&annee_scolaire_id=${selectedSchoolYearId}`);
        if (!emploiDuTempsResponse.ok) {
          if (emploiDuTempsResponse.status === 404) {
            setMatieres([]);
            sonnerToast.info("Aucun emploi du temps de base trouvé pour cette classe et année scolaire.");
            return;
          }
          throw new Error("Impossible de charger l'emploi du temps.");
        }
        const allTimetableEntries: EmploiDuTempsEntry[] = await emploiDuTempsResponse.json();

        // 3. Filter timetable entries for the specific day of the week
        const timetableEntriesForDay = allTimetableEntries.filter(entry => entry.jour === dayOfWeekName);

        if (timetableEntriesForDay.length === 0) {
          setMatieres([]);
          sonnerToast.info(`Aucun cours programmé pour ${dayOfWeekName} dans cette classe.`);
          return;
        }

        const subjectIdsForDay = [...new Set(timetableEntriesForDay.map(entry => entry.matiere_id))];
        const subjectsScheduledToday = allClassMatieres.filter(matiere => subjectIdsForDay.includes(matiere.id));
        setMatieres(subjectsScheduledToday);

        if (subjectsScheduledToday.length === 1) {
          setSelectedSubject(subjectsScheduledToday[0].id.toString());
        }
      } catch (error) { sonnerToast.error((error as Error).message); setMatieres([]); }
      finally { setIsLoadingMatieres(false); }
    };

    fetchMatieresForDay();
    setSelectedTimeSlot('');
    setAvailableSessions([]);     
    setAttendanceData([]);
  }, [selectedClass, selectedSchoolYearId, date]);

  // Fetch sessions when date, class, or subject changes
  useEffect(() => {
    if (!date || !selectedClass || !selectedSubject || !selectedSchoolYearId) {
      setAvailableSessions([]);
      setSelectedTimeSlot('');
      setAttendanceData([]);
      return;
    }

    const fetchSessions = async () => {
      setIsLoadingSessions(true);
      setAvailableSessions([]);
      setSelectedTimeSlot(''); 
      setAttendanceData([]); 

      try {

         const dayOfWeekNameUncapitalized = format(date, 'EEEE', { locale: fr });
        const dayOfWeekName = dayOfWeekNameUncapitalized.charAt(0).toUpperCase() + dayOfWeekNameUncapitalized.slice(1);
        // 2. Appeler l'API pour obtenir TOUTES les sessions pour cette classe/matière/année
        //    (sans le paramètre date, car on va filtrer par jour nous-mêmes)
        const response = await fetch(`${API_BASE_URL}/emploi-du-temps?classe_id=${selectedClass}&matiere_id=${selectedSubject}&annee_scolaire_id=${selectedSchoolYearId}`);
                if (!response.ok) {
          if (response.status === 404) {
            setAvailableSessions([]);
            sonnerToast.info("Aucune session de cours (base) trouvée pour cette classe et matière.");
            return;
          }
         throw new Error("Impossible de charger les sessions de cours (base).");
        }

        const allClassSubjectSessions: EmploiDuTempsEntry[] = await response.json();

        // 3. Filtrer ces sessions par le jour de la semaine calculé
const sessionsForDay = allClassSubjectSessions.filter(session => 
          session.jour === dayOfWeekName && 
          session.matiere_id === parseInt(selectedSubject)
        );
        // 4. Mettre à jour l'état avec les sessions filtrées
        //    et s'assurer que availableSessions contient des objets avec heure_debut et heure_fin
        setAvailableSessions(sessionsForDay.map(s => ({ heure_debut: s.heure_debut, heure_fin: s.heure_fin })));

        if (sessionsForDay.length === 1) {
          const session = sessionsForDay[0];
          setSelectedTimeSlot(`${session.heure_debut.substring(0,5)}-${session.heure_fin.substring(0,5)}`);
        } else if (sessionsForDay.length === 0) {
          sonnerToast.info(`Aucune session de cours trouvée pour ${dayOfWeekName}, pour cette classe et matière.`);
        }
      } catch (error) {
        sonnerToast.error((error as Error).message);
        setAvailableSessions([]);
      } finally {
        setIsLoadingSessions(false);
      }
    };
    fetchSessions();
  }, [date, selectedClass, selectedSubject, selectedSchoolYearId]);

  // Fetch students and existing attendance when a timeslot is selected (or automatically set)
  useEffect(() => {
    if (!selectedClass || !selectedSubject || !date || !selectedSchoolYearId || !selectedTimeSlot) {
      setAttendanceData([]);
      return;
    }
    const fetchStudentsAndAttendance = async () => {
      setIsLoadingStudents(true);
      try {
        const inscriptionsRes = await fetch(`${API_BASE_URL}/inscriptions?classeId=${selectedClass}&anneeScolaireId=${selectedSchoolYearId}`);
        if (!inscriptionsRes.ok) throw new Error("Impossible de charger les élèves.");
        const inscriptions: Inscription[] = await inscriptionsRes.json();

        const [heure_debut, heure_fin] = selectedTimeSlot.split('-');
        const absencesRes = await fetch(`${API_BASE_URL}/absences?date=${format(date, 'yyyy-MM-dd')}&classe_id=${selectedClass}&matiere_id=${selectedSubject}&annee_scolaire_id=${selectedSchoolYearId}&heure_debut=${heure_debut}:00&heure_fin=${heure_fin}:00`);
        let existingAbsences: AbsenceRecord[] = [];
        if (absencesRes.ok) {
          existingAbsences = await absencesRes.json();
        } else if (absencesRes.status !== 404) {
          console.warn("Erreur lors du chargement des absences existantes:", absencesRes.statusText);
        }

        const studentEntries: StudentAttendanceEntry[] = inscriptions.map(inscription => {
          const etudiant = inscription.utilisateur;
          const existingAbsence = existingAbsences.find(abs => abs.etudiant_id === etudiant.id);
          return {
            etudiant_id: etudiant.id,
            nom: `${etudiant.prenom} ${etudiant.nom}`,
            present: !existingAbsence,
            justified: existingAbsence?.justified || false,
            justification: existingAbsence?.justification || '',
            existingAbsenceId: existingAbsence?.id || null,
          };
        });
        setAttendanceData(studentEntries);
      } catch (error) { sonnerToast.error((error as Error).message); setAttendanceData([]); }
      finally { setIsLoadingStudents(false); }
    };
    fetchStudentsAndAttendance();
  }, [selectedClass, selectedSubject, date, selectedSchoolYearId, selectedTimeSlot]);


  const handlePresentChange = (etudiant_id: number, present: boolean) => {
    setAttendanceData(prevData =>
      prevData.map(student =>
        student.etudiant_id === etudiant_id
          ? { ...student, present, justified: present ? false : student.justified }
          : student
      )
    );
  };

  const handleJustifiedChange = (etudiant_id: number, justified: boolean) => {
    setAttendanceData(prevData =>
      prevData.map(student =>
        student.etudiant_id === etudiant_id
          ? { ...student, justified, present: justified ? false : student.present }
          : student
      )
    );
  };

  const saveAttendance = async () => {
    if (!selectedClass || !selectedSubject || !selectedSchoolYearId || !date || !selectedTimeSlot) {
      sonnerToast.error("Veuillez compléter tous les champs de session.");
      return;
    }
    const [heure_debut, heure_fin] = selectedTimeSlot.split('-');
    const payload = {
      date: format(date, 'yyyy-MM-dd'),
      classe_id: parseInt(selectedClass),
      matiere_id: parseInt(selectedSubject),
      annee_scolaire_id: parseInt(selectedSchoolYearId),
      heure_debut: `${heure_debut}:00`,
      heure_fin: `${heure_fin}:00`,
      details: attendanceData.map(s => ({
        etudiant_id: s.etudiant_id,
        present: s.present,
        justifie: s.justified,
        justification: s.justification,
        existingAbsenceId: s.existingAbsenceId
      })),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/absences/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la sauvegarde des présences.");
      }
      sonnerToast.success("Présences enregistrées avec succès !");
      setSelectedClass(''); // Déclenchera les useEffect pour réinitialiser les champs dépendants
      setDate(new Date());    // Réinitialiser la date au jour actuel
    } catch (error) {
      sonnerToast.error((error as Error).message);
    }
  };

  const isFormComplete = selectedClass && selectedSubject && date && selectedTimeSlot;
  const absenceCount = attendanceData.filter(student => !student.present).length;
  const anneeScolaireSelectionnee = anneesAcademiques.find(a => a.id.toString() === selectedSchoolYearId)?.libelle || selectedSchoolYearId;

  return (
    <Card className="shadow-lg border border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-gray-800">Enregistrer les Présences du Jour</CardTitle>
        <CardDescription>Sélectionnez les détails de la séance et marquez la présence des élèves pour l'année {anneeScolaireSelectionnee}.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 p-4 border rounded-md bg-blue-50">
          <div className="space-y-2">
            <label htmlFor="select-class-daily" className="text-sm font-medium text-gray-700">Classe</label>
            <Select onValueChange={setSelectedClass} value={selectedClass} disabled={isLoadingClasses || !selectedSchoolYearId}>
              <SelectTrigger id="select-class-daily" className="bg-white">
                <SelectValue placeholder="Choisir une classe" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="select-date-daily" className="text-sm font-medium text-gray-700">Date de la séance</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="select-date-daily"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal bg-white",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy") : "Sélectionner une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label htmlFor="select-subject-daily" className="text-sm font-medium text-gray-700">Matière</label>
            <Select onValueChange={setSelectedSubject} value={selectedSubject} disabled={isLoadingMatieres || !selectedClass}>
              <SelectTrigger id="select-subject-daily" className="bg-white">
                <SelectValue placeholder="Choisir une matière" />
              </SelectTrigger>
              <SelectContent>
                {matieres.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id.toString()}>
                    {subject.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="select-timeslot-daily" className="text-sm font-medium text-gray-700">Session</label>
            <Select onValueChange={setSelectedTimeSlot} value={selectedTimeSlot} disabled={isLoadingSessions || !selectedSubject || availableSessions.length <= 1}>
              <SelectTrigger id="select-timeslot-daily" className="bg-white">
                <SelectValue placeholder={isLoadingSessions ? "Chargement..." : "Choisir une session"} />
              </SelectTrigger>
              <SelectContent>
               {availableSessions.map((session, index) => {
                  const slot = `${session.heure_debut.substring(0,5)}-${session.heure_fin.substring(0,5)}`;
                  return (<SelectItem key={index} value={slot}>
                    {slot}
                 
                </SelectItem>);
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isFormComplete ? (
          isLoadingStudents ? (
            <div className="text-center py-8">Chargement des élèves...</div>
          ) : isLoadingSessions ? (
            <div className="text-center py-8">Chargement des sessions...</div>
          ) : ( 
            <div className="mt-6">
              <Card className="border-2 border-dashed border-green-300 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-green-700">Feuille de présence pour :</CardTitle>
                  <CardDescription className="text-green-800 font-semibold">
                    {classes.find(c => c.id.toString() === selectedClass)?.nom} -
                    {matieres.find(m => m.id.toString() === selectedSubject)?.nom} -
                    {format(date, 'dd/MM/yyyy')} ({selectedTimeSlot})
                    <span className="ml-4 px-2 py-1 bg-green-200 text-green-900 rounded-full text-xs font-bold">
                      {attendanceData.length} élèves | {absenceCount} absents
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {attendanceData.length === 0 ? (
                    <p className="text-center text-gray-600 py-4">Aucun élève trouvé pour cette classe ou cette année scolaire.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table className="min-w-full bg-white rounded-lg shadow-sm">
                        <TableHeader className="bg-gray-100">
                          <TableRow>
                            <TableHead className="w-1/2 text-gray-700">Élève</TableHead>
                            <TableHead className="w-1/4 text-center text-gray-700">Présent</TableHead>
                            <TableHead className="w-1/4 text-center text-gray-700">Absent </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceData.map((student) => (
                            <TableRow key={student.etudiant_id} className="hover:bg-gray-50">
                              <TableCell className="font-medium text-gray-800">
                                {student.nom}
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={student.present}
                                  onCheckedChange={(checked) => handlePresentChange(student.etudiant_id, checked === true)}
                                  aria-label={`Marquer ${student.nom} comme présent`}
                                  className="w-5 h-5 border-2 border-blue-400 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white"
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={!student.present && student.justified}
                                  onCheckedChange={(checked) => handleJustifiedChange(student.etudiant_id, checked === true)}
                                  disabled={student.present}
                                  aria-label={`Marquer ${student.nom} comme absent justifié`}
                                  className="w-5 h-5 border-2 border-red-400 data-[state=checked]:bg-red-500 data-[state=checked]:text-white"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <Button onClick={saveAttendance} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors" disabled={attendanceData.length === 0}>
                      <Save className="mr-2 h-5 w-5" />
                      Enregistrer la Feuille
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        ) : (
          <div className="bg-white rounded-lg p-8 text-center shadow-inner border border-gray-200">
            <p className="text-gray-600 text-lg font-medium">
Veuillez <span className="font-bold text-blue-600">sélectionner une classe, une date et une matière</span>.
              {selectedSubject && availableSessions.length > 1 && !selectedTimeSlot && (
                <span className="block mt-2">Plusieurs sessions existent, veuillez <span className="font-bold text-blue-600">choisir une session</span>.</span>
              )}
               {selectedSubject && availableSessions.length === 0 && !isLoadingSessions && (<span className="block mt-2 text-orange-600">Aucune session de cours trouvée pour les filtres actuels.</span>)}            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Vue 2: Suivi et Justification des Absences ---
interface AttendanceTrackingProps {
  selectedSchoolYearId: string;
  anneesAcademiques: AnneeAcademique[];
}

export function AttendanceTracking({ selectedSchoolYearId, anneesAcademiques }: AttendanceTrackingProps) {
  const [classes, setClasses] = useState<Classe[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 30))); // Default to last 30 days
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [absenceRecords, setAbsenceRecords] = useState<AbsenceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);

  // Fetch classes
  useEffect(() => {
    if (!selectedSchoolYearId) {
      setClasses([]);
      setSelectedClass('');
      return;
    }
    const fetchClassesData = async () => {
      setIsLoadingClasses(true);
      try {
        const response = await fetch(`${API_BASE_URL}/classes?annee_scolaire_id=${selectedSchoolYearId}`);
        if (!response.ok) throw new Error("Impossible de charger les classes.");
        const allClassesForYear: Classe[] = await response.json();
        // Filtrage explicite côté client
        const filteredClasses = allClassesForYear.filter(cls => cls.annee_scolaire_id === parseInt(selectedSchoolYearId));
        setClasses(filteredClasses);      } catch (error) { sonnerToast.error((error as Error).message); }
      finally { setIsLoadingClasses(false); }
    };
    fetchClassesData();
    setSelectedClass(''); // Reset class on year change
    setAbsenceRecords([]);
  }, [selectedSchoolYearId]);

  // Fetch absences
  useEffect(() => {
    if (!selectedClass || !startDate || !endDate || !selectedSchoolYearId) {
      setAbsenceRecords([]);
      return;
    }
    const fetchAbsences = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          classe_id: selectedClass,
          annee_scolaire_id: selectedSchoolYearId,
          date_debut: format(startDate, 'yyyy-MM-dd'),
          date_fin: format(endDate, 'yyyy-MM-dd'),
        });
        if (searchQuery) params.append('search', searchQuery);

        const response = await fetch(`${API_BASE_URL}/absences?${params.toString()}`);
        if (!response.ok) {
          if (response.status === 404) {
            setAbsenceRecords([]); // No data found is not an error for display
            return;
          }
          throw new Error("Impossible de charger les absences.");
        }
        const data: AbsenceRecord[] = await response.json();
       // Transformation des données reçues de l'API pour correspondre à l'interface AbsenceRecord
        const mappedData = data.map((item: any) => ({
          id: item.id,
          etudiant_id: item.etudiant_id || item.etudiant?.id,
          etudiant_nom: item.etudiant ? `${item.etudiant.prenom || ''} ${item.etudiant.nom || ''}`.trim() : 'Élève inconnu',
          etudiant_classe_nom: item.classe ? item.classe.nom : 'Classe inconnue',
          date: item.date,
          matiere_id: item.matiere_id || item.matiere?.id,
          matiere_nom: item.matiere ? item.matiere.nom : 'Matière inconnue',
          heure_debut: item.heure_debut,
          heure_fin: item.heure_fin,
          justified: item.justified,
          justification: item.justification || '',
        }));
        setAbsenceRecords(mappedData);
      } catch (error) { sonnerToast.error((error as Error).message); setAbsenceRecords([]); }
      finally { setIsLoading(false); }
    };
    fetchAbsences();
  }, [selectedClass, startDate, endDate, searchQuery, selectedSchoolYearId]);


  const handleJustificationChange = (absenceId: number, justification: string) => {
    setAbsenceRecords(prevData =>
      prevData.map(record =>
        record.id === absenceId
          ? { ...record, justification }
          : record
      )
    );
  };

  const markAsJustified = async (absenceId: number) => {
    const recordToUpdate = absenceRecords.find(r => r.id === absenceId);
    if (!recordToUpdate) return;

    try {
      const response = await fetch(`${API_BASE_URL}/absences/${absenceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ justifie: true, justification: recordToUpdate.justification }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la justification de l'absence.");
      }
      setAbsenceRecords(prevData =>
        prevData.map(record =>
          record.id === absenceId
            ? { ...record, justified: true }
            : record
        )
      );
      sonnerToast.success("Absence justifiée avec succès !");
    } catch (error) {
      sonnerToast.error((error as Error).message);
    }
  };

  const filteredAbsenceRecords = absenceRecords.filter(record =>
    (record.etudiant_nom || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isFilterComplete = selectedClass && startDate && endDate;
  const anneeScolaireSelectionnee = anneesAcademiques.find(a => a.id.toString() === selectedSchoolYearId)?.libelle || selectedSchoolYearId;

  return (
    <Card className="shadow-lg border border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-gray-800">Consulter & Justifier les Absences</CardTitle>
        <CardDescription>Recherchez et gérez les absences des élèves par classe et période pour l'année {anneeScolaireSelectionnee}.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-4 border rounded-md bg-purple-50">
          <div className="space-y-2">
            <label htmlFor="filter-class-tracking" className="text-sm font-medium text-gray-700">Classe</label>
            <Select onValueChange={setSelectedClass} value={selectedClass} disabled={isLoadingClasses || !selectedSchoolYearId}>
              <SelectTrigger id="filter-class-tracking" className="bg-white">
                <SelectValue placeholder="Filtrer par classe" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="filter-start-date-tracking" className="text-sm font-medium text-gray-700">Date de début</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="filter-start-date-tracking"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal bg-white",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd/MM/yyyy") : "Sélectionner une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(d) => d && setStartDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label htmlFor="filter-end-date-tracking" className="text-sm font-medium text-gray-700">Date de fin</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="filter-end-date-tracking"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal bg-white",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd/MM/yyyy") : "Sélectionner une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(d) => d && setEndDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {isFilterComplete ? (
          isLoading ? (
            <div className="text-center py-8">Chargement des absences...</div>
          ) : (
            <div className="space-y-6 mt-6">
              <div className="flex justify-end">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Rechercher un élève..."
                    className="pl-9 bg-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {filteredAbsenceRecords.length > 0 ? (
                <Card className="shadow-md">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table className="min-w-full bg-white rounded-lg shadow-sm">
                        <TableHeader className="bg-gray-100">
                          <TableRow>
                            <TableHead className="text-gray-700">Élève</TableHead>
                            <TableHead className="text-gray-700">Classe</TableHead>
                            <TableHead className="text-gray-700">Date</TableHead>
                            <TableHead className="text-gray-700">Matière</TableHead>
                            <TableHead className="text-gray-700">Statut</TableHead>
                            <TableHead className="text-gray-700 min-w-[200px]">Justification</TableHead>
                            <TableHead className="text-gray-700">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAbsenceRecords.map((record) => (
                            <TableRow key={record.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium text-gray-800">
                                {record.etudiant_nom}
                              </TableCell>
                              <TableCell className="text-gray-700">{record.etudiant_classe_nom}</TableCell>
                              <TableCell className="text-gray-700">
                                {format(new Date(record.date), 'dd/MM/yyyy')}
                              </TableCell>
                              <TableCell className="text-gray-700">
                                {record.matiere_nom}
                              </TableCell>
                              <TableCell>
                                {record.justified ? (
                                  <Badge className="bg-green-100 text-green-700 border-green-300 px-3 py-1 text-xs font-semibold">
                                    Justifiée
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-100 text-red-700 border-red-300 px-3 py-1 text-xs font-semibold">
                                    Non justifiée
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  placeholder="Motif de l'absence..."
                                  value={record.justification}
                                  onChange={(e) => handleJustificationChange(record.id, e.target.value)}
                                  disabled={record.justified}
                                  className="w-full text-gray-800 bg-white"
                                />
                              </TableCell>
                              <TableCell>
                                {!record.justified && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => markAsJustified(record.id)}
                                    disabled={!record.justification?.trim()}
                                    className="bg-purple-100 text-purple-700 hover:bg-purple-200"
                                  >
                                    Justifier
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="bg-white rounded-lg p-8 text-center shadow-inner border border-gray-200">
                  <p className="text-gray-600 text-lg font-medium">
                  Aucune absence trouvée pour les critères de recherche et l'année scolaire {anneeScolaireSelectionnee}.
                  </p>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="bg-white rounded-lg p-8 text-center shadow-inner border border-gray-200">
            <p className="text-gray-600 text-lg font-medium">
+              Veuillez <span className="font-bold text-purple-600">sélectionner une classe, une date de début et une date de fin</span> pour visualiser les absences.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}