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
import { fr, ar } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

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
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Session expirée ou non autorisée. Veuillez vous reconnecter.');
      }
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}. Response: ${errorText}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : [];
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    sonnerToast.error((error as Error).message);
    return [];
  }
};

export function AttendanceManagement() {
  const { t, language } = useLanguage();
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
<div className={`bg-gray-50 dark:bg-gray-900 w-full  pb-[env(safe-area-inset-bottom)] ${language === 'ar' ? 'text-right' : 'text-left'}`}>      <CardHeader className="pb-4">
  <CardTitle className="text-2xl font-bold text-gray-800 dark:text-white">
          {t.attendance.title}
        </CardTitle>
        <CardDescription>
          {t.attendance.description}
        </CardDescription>
      </CardHeader>

      <Tabs defaultValue="dailyAttendance" className="w-full px-2">
<TabsList className="flex flex-row flex-wrap w-full gap-2 sm:gap-4 justify-center mb-4 sm:mb-8 bg-white dark:bg-gray-800">          <TabsTrigger value="dailyAttendance" className="flex-1 sm:flex-none">
            {t.attendance.tabs.record}
          </TabsTrigger>
          <TabsTrigger value="absenceTracking" className="flex-1 sm:flex-none dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">
            {t.attendance.tabs.tracking}
          </TabsTrigger>  
        </TabsList>

        <TabsContent value="dailyAttendance">
          <div className={`flex items-center gap-4 mb-8 mt-14 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <label htmlFor="school-year-select" className="font-semibold text-gray-700 dark:text-gray-300">
              {t.common.schoolYear} :
            </label>
            <Select onValueChange={setSelectedSchoolYearId} value={selectedSchoolYearId} disabled={isLoadingYears}>
<SelectTrigger id="school-year-select" className="w-[200px] bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">                <SelectValue placeholder={t.common.selectAYear} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 dark:border-gray-700">
                {anneesAcademiques.map((annee) => (
                  <SelectItem key={annee.id} value={annee.id.toString()} className="dark:hover:bg-gray-700">
                    {annee.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ProfessorAttendance
            selectedSchoolYearId={selectedSchoolYearId}
            anneesAcademiques={anneesAcademiques}
            t={t}
            language={language}
          />
        </TabsContent>
        
        <TabsContent value="absenceTracking">
          <div className={`flex items-center gap-4 mb-6 mt-14 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <label htmlFor="school-year-select"  className="font-semibold text-gray-700 dark:text-gray-300">
              {t.common.schoolYear} :
            </label>
            <Select onValueChange={setSelectedSchoolYearId} value={selectedSchoolYearId} disabled={isLoadingYears}>
<SelectTrigger id="school-year-select" className="w-[200px] bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">                <SelectValue placeholder={t.common.selectAYear} />
              </SelectTrigger>
    <SelectContent className="bg-white dark:bg-gray-800 dark:border-gray-700">
                {anneesAcademiques.map((annee) => (
                  <SelectItem key={annee.id} value={annee.id.toString()} className="dark:hover:bg-gray-700">
                    {annee.libelle}
                    
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AttendanceTracking
            selectedSchoolYearId={selectedSchoolYearId}
            anneesAcademiques={anneesAcademiques}
            t={t}
            language={language}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ProfessorAttendanceProps {
  selectedSchoolYearId: string;
  anneesAcademiques: AnneeAcademique[];
  t: any;
  language: string;
}

export function ProfessorAttendance({ selectedSchoolYearId, anneesAcademiques, t, language }: ProfessorAttendanceProps) {
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

  const dateFnsLocale = language === 'ar' ? ar : fr;

  const getTranslatedSubjectName = (subjectName: string): string => {
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
    };
    return subjectMap[subjectName] || subjectName;
  };

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
        // Toujours utiliser le nom du jour en français pour la logique de filtrage de l'API
        const dayOfWeekForLogic = format(date, 'EEEE', { locale: fr }).charAt(0).toUpperCase() + format(date, 'EEEE', { locale: fr }).slice(1);

        const matieresResponse: { matiere: Matiere }[] = await fetchData(`${API_BASE_URL}/coefficientclasse?classeId=${selectedClass}`);
        const allClassMatieres: Matiere[] = matieresResponse.map(cc => cc.matiere).filter((m): m is Matiere => !!m);

        const emploiDuTempsResponse: EmploiDuTempsEntry[] = await fetchData(`${API_BASE_URL}/emploi-du-temps?classe_id=${selectedClass}&annee_scolaire_id=${selectedSchoolYearId}`);
        const timetableEntriesForDay = emploiDuTempsResponse.filter((entry: EmploiDuTempsEntry) => entry.jour === dayOfWeekForLogic);

        if (timetableEntriesForDay.length === 0) {
          setMatieres([]);
          // sonnerToast.info(t.attendance.noSessionFound); // Peut être bruyant, commenté pour l'instant
          return;
        }

        const subjectIdsForDay = [...new Set(timetableEntriesForDay.map((entry: EmploiDuTempsEntry) => entry.matiere_id))];
        const subjectsScheduledTodayWithDuplicates = allClassMatieres.filter((matiere: Matiere) => subjectIdsForDay.includes(matiere.id));

        // Dédupliquer les matières pour éviter les doublons dans le menu déroulant
        const uniqueSubjects: Matiere[] = Array.from(new Map(subjectsScheduledTodayWithDuplicates.map(m => [m.id, m])).values());

        setMatieres(uniqueSubjects);

        // La sélection automatique de la matière est désactivée pour laisser le contrôle à l'utilisateur.
        // if (uniqueSubjects.length === 1) {
        //   setSelectedSubject(uniqueSubjects[0].id.toString());
        // }
      } catch (error) {
        sonnerToast.error((error as Error).message);
        setMatieres([]);
      } finally {
        setIsLoadingMatieres(false);
      }
    };

    fetchMatieresForDay();
  }, [selectedClass, selectedSchoolYearId, date, dateFnsLocale]);

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
        // Toujours utiliser le nom du jour en français pour la logique de filtrage de l'API
        const dayOfWeekForLogic = format(date, 'EEEE', { locale: fr }).charAt(0).toUpperCase() + format(date, 'EEEE', { locale: fr }).slice(1);
        const response = await fetchData(`${API_BASE_URL}/emploi-du-temps?classe_id=${selectedClass}&matiere_id=${selectedSubject}&annee_scolaire_id=${selectedSchoolYearId}`);

        const sessionsForDay = response.filter((session: EmploiDuTempsEntry) =>
          session.jour === dayOfWeekForLogic && session.matiere_id === parseInt(selectedSubject)
        );

        setAvailableSessions(sessionsForDay.map((s: EmploiDuTempsEntry) => ({ heure_debut: s.heure_debut, heure_fin: s.heure_fin })));

        if (sessionsForDay.length === 1) {
          const session = sessionsForDay[0];
          setSelectedTimeSlot(`${session.heure_debut.substring(0, 5)}-${session.heure_fin.substring(0, 5)}`);
        } else if (sessionsForDay.length === 0) {
          sonnerToast.info(t.attendance.noSessionFoundForSubject);
        }
      } catch (error) {
        sonnerToast.error((error as Error).message);
        setAvailableSessions([]);
      } finally {
        setIsLoadingSessions(false);
      }
    };
    fetchSessions();
  }, [date, selectedClass, selectedSubject, selectedSchoolYearId, dateFnsLocale]);

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

  const saveAttendance = async () => {
    if (!selectedClass || !selectedSubject || !selectedSchoolYearId || !date || !selectedTimeSlot) {
      sonnerToast.error(t.attendance.pleaseSelect);
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/absences/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t.attendance.errorSave);
      }
      sonnerToast.success(t.attendance.successSave);
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
<Card className={`shadow-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 ${language === 'ar' ? 'text-right' : 'text-left'}`}>      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-gray-800">
          {t.attendance.recordTitle}
        </CardTitle>
        <CardDescription>
          {t.attendance.recordDescription.replace('{year}', anneeScolaireSelectionnee)}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
<div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 border rounded-lg bg-blue-50/50 dark:bg-gray-800/20 ${language === 'ar' ? 'text-right' : 'text-left'}`}>          <div className="space-y-2">
<label htmlFor="select-class-daily" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.common.class}
            </label>
            <Select onValueChange={setSelectedClass} value={selectedClass} disabled={isLoadingClasses || !selectedSchoolYearId}>
 <SelectTrigger 
        id="select-class-daily" 
        className="bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      >                <SelectValue placeholder={t.common.selectAClass} />
              </SelectTrigger>
      <SelectContent className="bg-white dark:bg-gray-800 dark:border-gray-700">
                {classes.map((cls) => (
<SelectItem 
            key={cls.id} 
            value={cls.id.toString()}
            className="dark:hover:bg-gray-700"
          >                    {cls.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="select-date-daily" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.attendance.sessionDate}
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="select-date-daily"
                  variant={"outline"}
                  className={cn(
          "w-full justify-start text-left font-normal bg-white dark:bg-gray-700 dark:text-white",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy", { locale: dateFnsLocale }) : t.common.selectDate}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl shadow-lg">
  <Calendar
    mode="single"
    selected={date}
    onSelect={(d) => d && setDate(d)}
    className="p-3"
    classNames={{
      table: "w-full border-collapse", // s'assure que les jours s'affichent correctement
      head_row: "flex justify-between mb-2", // pour l'en-tête
      head_cell: "w-9 text-xs font-semibold text-center text-gray-500 dark:text-gray-400",
      row: "flex justify-between mb-1", // ligne de jours
      cell: "w-9 h-9 text-center", // taille uniforme
      day: "text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex items-center justify-center",
      day_selected:
        "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 font-semibold",
      day_today:
        "border border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400 font-medium",
    }}
  />
</PopoverContent>


            </Popover>
          </div>

          <div className="space-y-2">
<label htmlFor="select-subject-daily" className="text-sm font-medium text-gray-700 dark:text-gray-300">              {t.common.subject}
            </label>
            <Select onValueChange={setSelectedSubject} value={selectedSubject} disabled={isLoadingMatieres || !selectedClass}>
 <SelectTrigger id="select-subject-daily" className="bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">                <SelectValue placeholder={t.common.selectASubject} />
              </SelectTrigger>
    <SelectContent className="bg-white dark:bg-gray-800 dark:border-gray-700">
                {matieres.map((subject) => (
        <SelectItem key={subject.id} value={subject.id.toString()} className="dark:hover:bg-gray-700">
                    {getTranslatedSubjectName(subject.nom)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
<label htmlFor="select-timeslot-daily" className="text-sm font-medium text-gray-700 dark:text-gray-300">              {t.attendance.session}
            </label>
            <Select onValueChange={setSelectedTimeSlot} value={selectedTimeSlot} disabled={isLoadingSessions || !selectedSubject || availableSessions.length <= 1}>
  <SelectTrigger id="select-timeslot-daily" className="bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">                <SelectValue placeholder={isLoadingSessions ? t.common.loading : t.attendance.chooseSession} />
              </SelectTrigger>
    <SelectContent className="bg-white dark:bg-gray-800 dark:border-gray-700">
                {availableSessions.map((session, index) => {
                  const slot = `${session.heure_debut.substring(0, 5)}-${session.heure_fin.substring(0, 5)}`;
                  return (
          <SelectItem key={slot} value={slot} className="dark:hover:bg-gray-700">
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
            <div className="text-center py-8">{t.common.loading}</div>
          ) : (
            <div className="mt-6">
<Card className={cn(
  "border-2 border-dashed",
  absenceCount > 0 
    ? "border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20" 
    : "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
)}>                <CardHeader className="pb-3">
<CardTitle className={cn(
      "text-lg",
      absenceCount > 0 
        ? "text-orange-700 dark:text-orange-300" 
        : "text-green-700 dark:text-green-300"
    )}>                    {t.attendance.attendanceSheetFor}
                  </CardTitle>
<CardDescription className={cn(
      "font-semibold",
      absenceCount > 0 
        ? "text-orange-800 dark:text-orange-200" 
        : "text-green-800 dark:text-green-200"
    )}>                    {classes.find(c => c.id.toString() === selectedClass)?.nom} -
                    {getTranslatedSubjectName(matieres.find(m => m.id.toString() === selectedSubject)?.nom || '')} -
                    {format(date, 'dd/MM/yyyy', { locale: dateFnsLocale })} ({selectedTimeSlot}) 
<span className={cn(
        "ml-4 px-2 py-1 rounded-full text-xs font-bold",
        absenceCount > 0 
          ? "bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200" 
          : "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200"
      )}>                      {t.attendance.studentsCount.replace('{count}', attendanceData.length.toString())} | 
                      {t.attendance.absentCount.replace('{count}', absenceCount.toString())}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  {attendanceData.length === 0 ? ( 
                   <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
    {t.attendance.noStudentFound}
  </p>
                  ) : (
                    <>
                      {/* Desktop View */}
                      <div className="hidden md:block overflow-auto max-h-[60vh]">
<Table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm">
<TableHeader className={cn(
        "bg-gray-100 dark:bg-gray-700",
        absenceCount > 0 
          ? "bg-orange-50 dark:bg-orange-900/30" 
          : "bg-green-50 dark:bg-green-900/30"
      )}>                            <TableRow>
      <TableHead className="w-1/2 text-gray-700 dark:text-white">{t.common.student}</TableHead>
                              <TableHead className="w-1/4 text-center text-gray-700 dark:text-white">{t.attendance.present}</TableHead>
                              <TableHead className="w-1/4 text-center text-gray-700 dark:text-white">{t.attendance.absent}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {attendanceData.map((student) => (
                              <TableRow key={student.etudiant_id}  className={cn(
              "hover:bg-gray-50 dark:hover:bg-gray-700",
              !student.present && "bg-rose-50/50 dark:bg-rose-900/20"
            )}>
 <TableCell className="font-medium text-gray-800 dark:text-gray-100">
              {student.nom}
            </TableCell>
                                            <TableCell className="text-center bg-white dark:bg-gray-800">
                                  <Checkbox
                                    checked={student.present}
                                    onCheckedChange={(checked) => handlePresentChange(student.etudiant_id, checked === true)}
                                    aria-label={t.attendance.markPresent.replace('{name}', student.nom)}
className="w-5 h-5 border-2 border-blue-400 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white dark:border-blue-500 dark:data-[state=checked]:bg-blue-600"                                  />
                                </TableCell>
                                <TableCell className="text-center bg-white dark:bg-gray-800">
                                   <Checkbox
            checked={!student.present}
            disabled
            className={`
              w-5 h-5 border-2 
              ${!student.present 
                ? 'border-red-400 data-[state=checked]:bg-red-500 dark:border-red-500 dark:data-[state=checked]:bg-red-600' 
                : 'border-gray-300 dark:border-gray-500'}
            `}
          />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Mobile View */}
                      <div className="block md:hidden space-y-4  pb-[env(safe-area-inset-bottom)]">
                        {attendanceData.map((student) => (
                          <Card key={student.etudiant_id} className="p-4 bg-white dark:bg-gray-800 shadow-sm">
  <p className="font-semibold text-base text-gray-800 dark:text-white mb-3">{student.nom}</p>
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
                                <label className="font-medium">{t.attendance.present}</label>
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
                                <label className="font-medium">{t.attendance.absent}</label>
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                      
                      <div className="mt-6 flex flex-col sm:flex-row justify-center sm:justify-end">
                        <Button 
                          onClick={saveAttendance} 
className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-semibold rounded-lg shadow-md transition-colors"                          disabled={attendanceData.length === 0}
                        >
                          <Save className="mr-2 h-5 w-5" />
                          {t.attendance.saveSheet}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center shadow-inner border border-gray-200 dark:border-gray-700">
    <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
      {t.attendance.pleaseSelect}
      {selectedSubject && availableSessions.length > 1 && !selectedTimeSlot && (
        <span className="block mt-2 dark:text-gray-400">{t.attendance.multipleSessions}</span>
      )}
      {selectedSubject && availableSessions.length === 0 && !isLoadingSessions && (
        <span className="block mt-2 text-orange-600 dark:text-orange-400">{t.attendance.noSessionFound}</span>
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
  t: any;
  language: string;
}

export function AttendanceTracking({ selectedSchoolYearId, anneesAcademiques, t, language }: AttendanceTrackingProps) {
  const [classes, setClasses] = useState<Classe[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [absenceRecords, setAbsenceRecords] = useState<AbsenceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);

  const dateFnsLocale = language === 'ar' ? ar : fr;

  const getTranslatedSubjectName = (subjectName: string): string => {
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
    };
    return subjectMap[subjectName] || subjectName;
  };

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
          etudiant_nom: item.etudiant 
            ? (language === 'ar' 
                ? `${item.etudiant.prenom || ''} ${item.etudiant.nom || ''}`.trim() 
                : `${item.etudiant.nom || ''} ${item.etudiant.prenom || ''}`.trim()) 
            : t.common.unknown,
          etudiant_classe_nom: item.classe ? item.classe.nom : t.common.unknown,
          date: item.date,
          matiere_id: item.matiere_id || item.matiere?.id,
          matiere_nom: item.matiere ? getTranslatedSubjectName(item.matiere.nom) : t.common.unknown,
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
  }, [selectedClass, startDate, endDate, searchQuery, selectedSchoolYearId, t, language]);

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
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/absences/${absenceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ justifie: true, justification: recordToUpdate.justification }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t.attendance.errorSave);
      }
      setAbsenceRecords(prevData =>
        prevData.map(record =>
          record.id === absenceId
            ? { ...record, justified: true }
            : record
        )
      );
      sonnerToast.success(t.attendance.successSave);
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
<Card className={`shadow-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 ${language === 'ar' ? 'text-right' : 'text-left'}`}>      <CardHeader className="pb-4">
    <CardTitle className="text-xl font-semibold text-gray-800 dark:text-white">
          {t.attendance.trackingTitle}
        </CardTitle>
    <CardDescription className="dark:text-gray-300">
          {t.attendance.trackingDescription.replace('{year}', anneeScolaireSelectionnee)}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 border rounded-lg bg-purple-50/50 dark:bg-gray-800/20 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
          <div className="space-y-2">
            <label htmlFor="filter-class-tracking" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.common.class}
            </label>
            <Select onValueChange={setSelectedClass} value={selectedClass} disabled={isLoadingClasses || !selectedSchoolYearId}>
              <SelectTrigger id="filter-class-tracking" className="bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <SelectValue placeholder={t.common.selectAClass} />
              </SelectTrigger>
    <SelectContent className="bg-white dark:bg-gray-800 dark:border-gray-700">
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
<label htmlFor="filter-start-date-tracking" className="text-sm font-medium text-gray-700 dark:text-gray-300">              {t.common.startDate}
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="filter-start-date-tracking"
                  variant={"outline"}
                 className={cn(
          "w-full justify-start text-left font-normal bg-white dark:bg-gray-700 dark:text-white",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd/MM/yyyy", { locale: dateFnsLocale }) : t.common.selectDate}
                </Button>
              </PopoverTrigger>
    <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-800 border dark:border-gray-700">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(d) => d && setStartDate(d)}
                  initialFocus
                  locale={dateFnsLocale}
                          className="pointer-events-auto dark:bg-gray-800"

                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
<label htmlFor="filter-end-date-tracking" className="text-sm font-medium text-gray-700 dark:text-gray-300">              {t.common.endDate}
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="filter-end-date-tracking"
                  variant={"outline"}
                  className={cn(
          "w-full justify-start text-left font-normal bg-white dark:bg-gray-700 dark:text-white",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd/MM/yyyy", { locale: dateFnsLocale }) : t.common.selectDate}
                </Button>
              </PopoverTrigger>
    <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-800 border dark:border-gray-700">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(d) => d && setEndDate(d)}
                  initialFocus
                  locale={dateFnsLocale}
                          className="pointer-events-auto dark:bg-gray-800"

                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <label htmlFor="search-input-tracking" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.common.search}
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                id="search-input-tracking"
                placeholder={t.attendance.searchQueryPlaceholder}
                className={`pl-9 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white ${language === 'ar' ? 'text-right' : 'text-left'}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {isFilterComplete ? (
          <>
           
            <div className="mt-4">
              {isLoading ? (
          <p className="text-center text-gray-500 dark:text-gray-400">{t.common.loading}</p>
              ) : filteredAbsenceRecords.length > 0 ? ( 
                <>
                  {/* Desktop View */}
                  <div className="hidden md:block overflow-auto max-h-[60vh]">
<Table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm">
  <TableHeader className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
                        <TableRow>
                    <TableHead className={`text-gray-700 dark:text-white ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                      {t.common.student}
                    </TableHead>
                    <TableHead className={`text-gray-700 dark:text-white ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                      {t.common.class}
                    </TableHead>
                    <TableHead className={`text-gray-700 dark:text-white ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                      {t.common.date}
                    </TableHead>
                    <TableHead className={`text-gray-700 dark:text-white ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                      {t.common.subject}
                    </TableHead>
                    <TableHead className={`text-gray-700 dark:text-white ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                      {t.common.status.general}
                    </TableHead>
                    <TableHead className={`text-gray-700 dark:text-white min-w-[200px] ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                      {t.attendance.justification}
                    </TableHead>
                    <TableHead className={`text-gray-700 dark:text-white ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                      {t.common.actions}
                    </TableHead>
                  </TableRow>

                      </TableHeader>
                      <TableBody>
                  {filteredAbsenceRecords.map((record) => (
                    <TableRow key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <TableCell className={`font-medium text-gray-800 dark:text-gray-100 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                        {record.etudiant_nom}
                      </TableCell>
                      <TableCell className={`text-gray-700 dark:text-gray-300 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                        {record.etudiant_classe_nom}
                      </TableCell>
                      <TableCell className={`text-gray-700 dark:text-gray-300 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                        {record.date ? format(new Date(record.date.replace(/-/g, '/')), 'dd/MM/yyyy', { locale: dateFnsLocale }) : '-'}
                      </TableCell>
                      <TableCell className={`text-gray-700 dark:text-gray-300 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                        {record.matiere_nom}
                      </TableCell>
                      <TableCell className={language === 'ar' ? 'text-right' : 'text-left'}>
                        {record.justified ? (
                          <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700 px-3 py-1 text-xs font-semibold">
                            {t.attendance.justified}
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700 px-3 py-1 text-xs font-semibold">
                            {t.attendance.notJustified}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder={t.attendance.absenceReasonPlaceholder}
                          value={record.justification}
                          onChange={(e) => handleJustificationChange(record.id, e.target.value)}
                          disabled={record.justified}
                          className={`w-full text-gray-800 dark:text-white bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 ${language === 'ar' ? 'text-right' : 'text-left'}`}
                        />
                      </TableCell>
                      <TableCell className={language === 'ar' ? 'text-right' : 'text-left'}>
                        {!record.justified && (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => markAsJustified(record.id)} 
                            disabled={!record.justification?.trim()} 
                            className="bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-800"
                          >
                            {t.attendance.justify}
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
                 <Card key={record.id} className={`p-4 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 ${language === 'ar' ? 'text-right' : 'text-left'}`}>  <div className="flex justify-between items-start mb-3">
    <div>
       <p className="font-bold text-base text-gray-800 dark:text-white">{record.etudiant_nom}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{record.etudiant_classe_nom}</p>
   </div>
                    {record.justified ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {t.attendance.justified}
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        {t.attendance.notJustified}
                      </Badge>
                    )}
                  </div>
  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-300 mb-4 border-t border-gray-200 dark:border-gray-700 pt-3">
    <p><strong>{t.common.date}:</strong></p>
    <p>{record.date ? format(new Date(record.date), 'dd/MM/yyyy', { locale: dateFnsLocale }) : '-'}</p>
    <p><strong>{t.common.subject}:</strong></p>
    <p>{record.matiere_nom}</p>
  </div>
  
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {t.attendance.justification}:
    </label>
    <Input 
      placeholder={record.justified ? t.attendance.alreadyJustified : t.attendance.enterReason}
      value={record.justification} 
      onChange={(e) => handleJustificationChange(record.id, e.target.value)} 
      disabled={record.justified} 
      className="w-full text-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
    />
    {!record.justified && (
      <Button 
        size="sm" 
        onClick={() => markAsJustified(record.id)} 
        disabled={!record.justification?.trim()} 
        className="w-full bg-purple-600 dark:bg-purple-700 text-white hover:bg-purple-700 dark:hover:bg-purple-800"
      >
        {t.attendance.justifyAbsence}
      </Button>
    )}
  </div>
</Card>
                    ))}
                  </div>
                </>
              ) : (
               <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center shadow-inner border border-gray-200 dark:border-gray-700">
  <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
    {t.attendance.noAbsenceFound.replace('{year}', anneeScolaireSelectionnee)}
  </p>
</div>
              )}
            </div>
          </>
        ) : (
         
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center shadow-inner border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
              {t.attendance.pleaseSelectFilters}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AttendanceManagement;