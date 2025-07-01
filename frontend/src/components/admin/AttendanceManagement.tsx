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
import { CalendarIcon, Save, Search } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fr } from 'date-fns/locale';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_URL}/api`;

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

interface Utilisateur {
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
  nom: string;
  present: boolean;
  justified: boolean;
  justification: string;
  existingAbsenceId?: number | null;
}

interface AbsenceRecord {
  id: number;
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

interface EmploiDuTempsEntry {
  id: number;
  jour: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi' | 'Dimanche';
  heure_debut: string;
  heure_fin: string;
  classe_id: number;
  matiere_id: number;
  professeur_id: number;
}

const timeSlots = ["08:00-10:00", "10:15-12:00", "12:15-14:00"];

const fetchData = async (url: string) => {

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}. Response: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    sonnerToast.error((error as Error).message);
    return [];
  }
};

export function AttendanceManagement() {
  const [anneesAcademiques, setAnneesAcademiques] = useState<AnneeAcademique[]>([]);
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState<string>('');
  const [isLoadingYears, setIsLoadingYears] = useState(true);

  useEffect(() => {
    const fetchAnnees = async () => {
      setIsLoadingYears(true);
      try {
        const data = await fetchData(`${API_BASE_URL}/annees-academiques`);
        setAnneesAcademiques(data);

        try {
          const configResponse = await fetch(`${API_BASE_URL}/configuration`);
          if (configResponse.ok) {
            const configData = await configResponse.json();
            if (configData?.annee_scolaire?.id) {
              const configuredYearId = configData.annee_scolaire.id.toString();
              if (data.some(annee => annee.id.toString() === configuredYearId)) {
                setSelectedSchoolYearId(configuredYearId);
                return;
              }
            }
          } else if (configResponse.status !== 404) {
            console.warn("Warning: Unable to load current academic year configuration.", configResponse.statusText);
          }
        } catch (configError) {
          console.warn("Warning: Error loading academic year configuration.", configError);
        }

        if (data.length > 0) {
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
  <div className="bg-gray-50 w-full">
    <CardHeader className="pb-4">
      <CardTitle className="text-2xl font-bold text-gray-800">
        Gestion des Présences et Absences
      </CardTitle>
      <CardDescription>
        Gérez les présences quotidiennes des élèves et suivez leurs absences.
      </CardDescription>
    </CardHeader>

    {/* Onglets tout en haut */}
    <Tabs defaultValue="dailyAttendance" className="w-full px-2">
  <TabsList className="flex flex-row flex-wrap w-full gap-2 sm:gap-4 justify-center mb-4 sm:mb-8">
    <TabsTrigger value="dailyAttendance" className="flex-1 sm:flex-none">Enregistrer les Présences</TabsTrigger>
 <TabsTrigger
    value="absenceTracking"
className="flex-1 sm:flex-none border bg-gray-100 text-gray-800 shadow-md sm:border-0 sm:bg-transparent sm:text-inherit sm:shadow-none"
  >
    Suivi des Absences
  </TabsTrigger>  
  </TabsList>

      {/* Sélecteur d'année scolaire dans chaque tab */}
      <TabsContent value="dailyAttendance">
  <div className="flex items-center gap-4 mb-8 mt-14">{/* <-- passe de mb-6 à mb-8 */}
    <label htmlFor="school-year-select" className="font-semibold text-gray-700">
      Année Scolaire :
    </label>
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
  <ProfessorAttendance
    selectedSchoolYearId={selectedSchoolYearId}
    anneesAcademiques={anneesAcademiques}
  />
</TabsContent>
       <TabsContent value="absenceTracking">
  <div className="flex items-center gap-4 mb-6 mt-14">{/* <-- retire mt-4 */}
    <label htmlFor="school-year-select" className="font-semibold text-gray-700">
      Année Scolaire :
    </label>
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
  <AttendanceTracking
    selectedSchoolYearId={selectedSchoolYearId}
    anneesAcademiques={anneesAcademiques}
  />
</TabsContent>
    </Tabs>
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

  useEffect(() => {
    if (!selectedSchoolYearId) {
      setClasses([]);
      setSelectedClass('');
      return;
    }

    const fetchClasses = async () => {
      setIsLoadingClasses(true);
      try {
        const allClassesForYear = await fetchData(`${API_BASE_URL}/classes?annee_scolaire_id=${selectedSchoolYearId}`);
        const filteredClasses = allClassesForYear.filter((cls: Classe) => cls.annee_scolaire_id === parseInt(selectedSchoolYearId));
        setClasses(filteredClasses);
      } catch (error) {
        sonnerToast.error((error as Error).message);
      } finally {
        setIsLoadingClasses(false);
      }
    };
    fetchClasses();
    setSelectedClass('');
    setSelectedSubject('');
    setSelectedTimeSlot('');
    setAttendanceData([]);
  }, [selectedSchoolYearId]);

  useEffect(() => {
    if (!selectedClass || !selectedSchoolYearId || !date) {
      setMatieres([]);
      setSelectedSubject('');
      setAvailableSessions([]);
      setSelectedTimeSlot('');
      setAttendanceData([]);
      return;
    }

    const fetchMatieresForDay = async () => {
      setIsLoadingMatieres(true);
      setMatieres([]);
      setSelectedSubject('');

      try {
        const dayOfWeekName = format(date, 'EEEE', { locale: fr }).charAt(0).toUpperCase() + format(date, 'EEEE', { locale: fr }).slice(1);

        const matieresResponse = await fetchData(`${API_BASE_URL}/coefficientclasse?classeId=${selectedClass}`);
        const allClassMatieres = matieresResponse.map((cc: any) => cc.matiere).filter(Boolean);

        const emploiDuTempsResponse = await fetchData(`${API_BASE_URL}/emploi-du-temps?classe_id=${selectedClass}&annee_scolaire_id=${selectedSchoolYearId}`);
        const timetableEntriesForDay = emploiDuTempsResponse.filter((entry: EmploiDuTempsEntry) => entry.jour === dayOfWeekName);

        if (timetableEntriesForDay.length === 0) {
          setMatieres([]);
          sonnerToast.info(`Aucun cours programmé pour ${dayOfWeekName} dans cette classe.`);
          return;
        }

        const subjectIdsForDay = [...new Set(timetableEntriesForDay.map((entry: EmploiDuTempsEntry) => entry.matiere_id))];
        const subjectsScheduledToday = allClassMatieres.filter((matiere: Matiere) => subjectIdsForDay.includes(matiere.id));
        setMatieres(subjectsScheduledToday);

        if (subjectsScheduledToday.length === 1) {
          setSelectedSubject(subjectsScheduledToday[0].id.toString());
        }
      } catch (error) {
        sonnerToast.error((error as Error).message);
        setMatieres([]);
      } finally {
        setIsLoadingMatieres(false);
      }
    };

    fetchMatieresForDay();
  }, [selectedClass, selectedSchoolYearId, date]);

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
        const dayOfWeekName = format(date, 'EEEE', { locale: fr }).charAt(0).toUpperCase() + format(date, 'EEEE', { locale: fr }).slice(1);
        const response = await fetchData(`${API_BASE_URL}/emploi-du-temps?classe_id=${selectedClass}&matiere_id=${selectedSubject}&annee_scolaire_id=${selectedSchoolYearId}`);

        const sessionsForDay = response.filter((session: EmploiDuTempsEntry) =>
          session.jour === dayOfWeekName && session.matiere_id === parseInt(selectedSubject)
        );

        setAvailableSessions(sessionsForDay.map((s: EmploiDuTempsEntry) => ({ heure_debut: s.heure_debut, heure_fin: s.heure_fin })));

        if (sessionsForDay.length === 1) {
          const session = sessionsForDay[0];
          setSelectedTimeSlot(`${session.heure_debut.substring(0, 5)}-${session.heure_fin.substring(0, 5)}`);
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

  useEffect(() => {
    if (!selectedClass || !selectedSubject || !date || !selectedSchoolYearId || !selectedTimeSlot) {
      setAttendanceData([]);
      return;
    }
    const fetchStudentsAndAttendance = async () => {
      setIsLoadingStudents(true);
      try {
        const inscriptions = await fetchData(`${API_BASE_URL}/inscriptions?classeId=${selectedClass}&anneeScolaireId=${selectedSchoolYearId}`);
        const [heure_debut, heure_fin] = selectedTimeSlot.split('-');
        const absencesRes = await fetch(`${API_BASE_URL}/absences?date=${format(date, 'yyyy-MM-dd')}&classe_id=${selectedClass}&matiere_id=${selectedSubject}&annee_scolaire_id=${selectedSchoolYearId}&heure_debut=${heure_debut}:00&heure_fin=${heure_fin}:00`);
        let existingAbsences: AbsenceRecord[] = [];
        if (absencesRes.ok) {
          existingAbsences = await absencesRes.json();
        } else if (absencesRes.status !== 404) {
          console.warn("Error loading existing absences:", absencesRes.statusText);
        }

        const studentEntries = inscriptions.map((inscription: Inscription) => {
          const etudiant = inscription.utilisateur;
          const existingAbsence = existingAbsences.find((abs: AbsenceRecord) => abs.etudiant_id === etudiant.id);
          return {
            etudiant_id: etudiant.id,
            nom: `${etudiant.prenom} ${etudiant.nom}`,
            present: !existingAbsence,
            justified: !!existingAbsence?.justification,
            justification: existingAbsence?.justification || '',
            existingAbsenceId: existingAbsence?.id || null,
          };
        });
        setAttendanceData(studentEntries);
      } catch (error) {
        sonnerToast.error((error as Error).message);
        setAttendanceData([]);
      } finally {
        setIsLoadingStudents(false);
      }
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
      setSelectedClass('');
      setDate(new Date());
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
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 border rounded-lg bg-blue-50/50 dark:bg-gray-800/20">
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
                  const slot = `${session.heure_debut.substring(0, 5)}-${session.heure_fin.substring(0, 5)}`;
                  return (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isFormComplete ? (
          isLoadingStudents ? (
            <div className="text-center py-8">Chargement des élèves...</div>
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
                <CardContent className="p-4 md:p-6">
                  {attendanceData.length === 0 ? ( 
                    <p className="text-center text-gray-600 py-4">Aucun élève trouvé pour cette classe ou cette année scolaire.</p>
                  ) : (
                    <>
                      {/* Desktop View */}
                      <div className="hidden md:block overflow-auto max-h-[60vh]">
                        <Table className="min-w-full bg-white rounded-lg shadow-sm">
                          <TableHeader className="bg-gray-100 sticky top-0 z-10">
                            <TableRow>
                              <TableHead className="w-1/2 text-gray-700">Élève</TableHead>
                              <TableHead className="w-1/4 text-center text-gray-700">Présent(e)</TableHead>
                              <TableHead className="w-1/4 text-center text-gray-700">Absent(e)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
    {attendanceData.map((student) => (
      <TableRow key={student.etudiant_id} className="hover:bg-gray-50">
        <TableCell className="font-medium text-gray-800">{student.nom}</TableCell>
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
            checked={!student.present}
            disabled
            aria-label={`Marquer ${student.nom} comme absent`}
            className="w-5 h-5 border-2 border-red-400 data-[state=checked]:bg-red-500 data-[state=checked]:text-white"
          />
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
                        </Table>
                      </div>
                      {/* Mobile View */}
                      <div className="block md:hidden space-y-4">
                        {attendanceData.map((student) => (
                          <Card key={student.etudiant_id} className="p-4 bg-white shadow-sm">
                            <p className="font-semibold text-base text-gray-800 mb-3">{student.nom}</p>
<div className="flex flex-col gap-3 sm:flex-row">
                              <Button
                                variant={student.present ? 'default' : 'outline'}
                                onClick={() => handlePresentChange(student.etudiant_id, true)}
                                className={`justify-start gap-2 ${student.present ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-100'}`}
                              >
                                <Checkbox
                                  checked={student.present}
                                  onCheckedChange={(checked) => handlePresentChange(student.etudiant_id, checked === true)}
                                  className="border-white data-[state=checked]:bg-white data-[state=checked]:text-green-600"
                                />
                                <label className="font-medium">Présent(e)</label>
                              </Button>
                              <Button
                                variant={!student.present ? 'destructive' : 'outline'}
                                onClick={() => handlePresentChange(student.etudiant_id, false)}
                                className={`justify-start gap-2 ${!student.present ? '' : 'bg-gray-100'}`}
                              >
                                <Checkbox
                                  checked={!student.present}
                                  onCheckedChange={(checked) => handlePresentChange(student.etudiant_id, !checked)}
                                />
                                <label className="font-medium">Absent(e)</label>
                              </Button>
                            </div>
                           
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="mt-6 flex flex-col sm:flex-row justify-center sm:justify-end">
                    <Button onClick={saveAttendance} className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors" disabled={attendanceData.length === 0}>
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
              {selectedSubject && availableSessions.length === 0 && !isLoadingSessions && (
                <span className="block mt-2 text-orange-600">Aucune session de cours trouvée pour les filtres actuels.</span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AttendanceTrackingProps {
  selectedSchoolYearId: string;
  anneesAcademiques: AnneeAcademique[];
}

export function AttendanceTracking({ selectedSchoolYearId, anneesAcademiques }: AttendanceTrackingProps) {
  const [classes, setClasses] = useState<Classe[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [absenceRecords, setAbsenceRecords] = useState<AbsenceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);

  useEffect(() => {
    if (!selectedSchoolYearId) {
      setClasses([]);
      setSelectedClass('');
      return;
    }
    const fetchClassesData = async () => {
      setIsLoadingClasses(true);
      try {
        const allClassesForYear = await fetchData(`${API_BASE_URL}/classes?annee_scolaire_id=${selectedSchoolYearId}`);
        const filteredClasses = allClassesForYear.filter((cls: Classe) => cls.annee_scolaire_id === parseInt(selectedSchoolYearId));
        setClasses(filteredClasses);
      } catch (error) {
        sonnerToast.error((error as Error).message);
      } finally {
        setIsLoadingClasses(false);
      }
    };
    fetchClassesData();
    setSelectedClass('');
    setAbsenceRecords([]);
  }, [selectedSchoolYearId]);

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

        const response = await fetchData(`${API_BASE_URL}/absences?${params.toString()}`);

        const mappedData = response.map((item: any) => ({
          id: item.id,
          etudiant_id: item.etudiant_id || item.etudiant?.id,
          etudiant_nom: item.etudiant ? `${item.etudiant.prenom || ''} ${item.etudiant.nom || ''}`.trim() : 'Élève inconnu',
          etudiant_classe_nom: item.classe ? item.classe.nom : 'Classe inconnue',
          date: item.date,
          matiere_id: item.matiere_id || item.matiere?.id,
          matiere_nom: item.matiere ? item.matiere.nom : 'Matière inconnue',
          heure_debut: item.heure_debut,
          heure_fin: item.heure_fin,
          justified: !!item.justification,
          justification: item.justification || '',
        }));
        setAbsenceRecords(mappedData);
      } catch (error) {
        sonnerToast.error((error as Error).message);
        setAbsenceRecords([]);
      } finally {
        setIsLoading(false);
      }
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
        <CardTitle className="text-xl font-semibold text-gray-800">Consulter et Justifier les Absences</CardTitle>
        <CardDescription>Recherchez et gérez les absences des élèves par classe et période pour l'année {anneeScolaireSelectionnee}.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 p-4 border rounded-lg bg-purple-50/50 dark:bg-gray-800/20">
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
          <>
            <div className="flex justify-end my-4">
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

            <div className="mt-4">
              {isLoading ? (
                <p className="text-center text-gray-500">Chargement des données...</p>
              ) : filteredAbsenceRecords.length > 0 ? ( 
                <>
                  {/* Desktop View */}
                  <div className="hidden md:block overflow-auto max-h-[60vh]">
                    <Table className="min-w-full bg-white rounded-lg shadow-sm">
                      <TableHeader className="bg-gray-100 sticky top-0 z-10">
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
                            <TableCell className="font-medium text-gray-800">{record.etudiant_nom}</TableCell>
                            <TableCell className="text-gray-700">{record.etudiant_classe_nom}</TableCell>
                            <TableCell className="text-gray-700">{format(new Date(record.date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="text-gray-700">{record.matiere_nom}</TableCell>
                            <TableCell>
                              {record.justified ? (
                                <Badge className="bg-green-100 text-green-700 border-green-300 px-3 py-1 text-xs font-semibold">Justifiée</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700 border-red-300 px-3 py-1 text-xs font-semibold">Non justifiée</Badge>
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
                                <Button variant="secondary" size="sm" onClick={() => markAsJustified(record.id)} disabled={!record.justification?.trim()} className="bg-purple-100 text-purple-700 hover:bg-purple-200">
                                  Justifier
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mobile View */}
                  <div className="block md:hidden space-y-4">
                    {filteredAbsenceRecords.map((record) => (
                      <Card key={record.id} className="p-4 bg-white shadow-sm border">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-bold text-base text-gray-800">{record.etudiant_nom}</p>
                            <p className="text-sm text-gray-500">{record.etudiant_classe_nom}</p>
                          </div>
                          {record.justified ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200">Justifiée</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 border-red-200">Non justifiée</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600 mb-4 border-t pt-3">
                          <p><strong>Date:</strong></p><p>{format(new Date(record.date), 'dd/MM/yyyy')}</p>
                          <p><strong>Matière:</strong></p><p>{record.matiere_nom}</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Motif de la justification :</label>
                          <Input placeholder={record.justified ? "Absence déjà justifiée" : "Saisir le motif..."} value={record.justification} onChange={(e) => handleJustificationChange(record.id, e.target.value)} disabled={record.justified} className="w-full text-sm" />
                          {!record.justified && (
                            <Button size="sm" onClick={() => markAsJustified(record.id)} disabled={!record.justification?.trim()} className="w-full bg-purple-600 text-white hover:bg-purple-700">
                              Justifier l'absence
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-lg p-8 text-center shadow-inner border border-gray-200">
                  <p className="text-gray-600 text-lg font-medium">
                    Aucune absence trouvée pour les critères de recherche et l'année scolaire {anneeScolaireSelectionnee}.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg p-8 text-center shadow-inner border border-gray-200">
            <p className="text-gray-600 text-lg font-medium">
              Veuillez <span className="font-bold text-purple-600">sélectionner une classe, une date de début et une date de fin</span> pour visualiser les absences.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
