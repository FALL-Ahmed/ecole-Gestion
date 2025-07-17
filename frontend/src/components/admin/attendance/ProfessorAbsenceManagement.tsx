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
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Save, Loader2, BookOpen, User, Clock, Search } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { fr, ar } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@radix-ui/react-label';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_URL}/api`;

interface AnneeAcademique {
  id: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
}
interface ProfessorAbsenceTrackingProps {
  professeurs: Professeur[];
  t: any;
  language: string;
  selectedSchoolYearId: string;
  anneesAcademiques: AnneeAcademique[];
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

interface Professeur {
  id: number;
  nom: string;
  prenom: string;
}

interface EmploiDuTempsEntry {
  id: number;
  jour: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi';
  heure_debut: string;
  heure_fin: string;
  matiere: Matiere;
  professeur: Professeur;
  classe_id: number;
}

interface AbsenceRecord {
  id: number;
  professeur_id: number;
  professeur_nom?: string; // Ajoutez cette ligne
  classe_id: number;
  matiere_id: number;
  date: string;
  heure_debut: string | null;
  heure_fin: string | null;
  annee_scolaire_id: number;
  justification?: string;
  justified?: boolean;
}

interface DailyScheduleItem {
  emploi_du_temps_id: number;
  heure_debut: string;
  heure_fin: string;
  matiere: Matiere;
  professeur: Professeur;
  isAbsent: boolean;
  existingAbsenceId: number | null;
}

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

// Composant principal de gestion des absences
export function ProfessorAbsenceManagement() {
  const { t, language } = useLanguage();
  const dateFnsLocale = language === 'ar' ? ar : fr;

  // State
  const [anneesAcademiques, setAnneesAcademiques] = useState<AnneeAcademique[]>([]);
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState<string>('');
  const [classes, setClasses] = useState<Classe[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [dailySchedule, setDailySchedule] = useState<DailyScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Fetch initial data (years and classes)
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [yearsData, allClassesData, configResponse] = await Promise.all([
          fetchData(`${API_BASE_URL}/annees-academiques`),
          fetchData(`${API_BASE_URL}/classes`),
          fetch(`${API_BASE_URL}/configuration`)
        ]);

        setAnneesAcademiques(yearsData);

        let activeYearId: number | null = null;
        if (configResponse.ok) {
          const configData = await configResponse.json();
          activeYearId = configData?.annee_scolaire?.id;
        }

        const defaultYearId = getDefaultYearId(yearsData, activeYearId);
        if (defaultYearId) {
          setSelectedSchoolYearId(defaultYearId);
          const filteredClasses = allClassesData.filter(
            (cls: Classe) => cls.annee_scolaire_id === parseInt(defaultYearId, 10)
          );
          setClasses(filteredClasses);
        }
      } catch (error) {
        sonnerToast.error((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const getDefaultYearId = (yearsData: AnneeAcademique[], activeYearId: number | null): string | null => {
    if (activeYearId && yearsData.some(annee => annee.id === activeYearId)) {
      return activeYearId.toString();
    }
    if (yearsData.length > 0) {
      const sortedYears = [...yearsData].sort((a, b) => 
        new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime()
      );
      return sortedYears[0].id.toString();
    }
    return null;
  };

  // Fetch schedule and absences
  const fetchScheduleAndAbsences = useCallback(async () => {
    if (!selectedClassId || !date || !selectedSchoolYearId) {
      setDailySchedule([]);
      return;
    }

    // Find the selected academic year to check its end date
    const selectedYear = anneesAcademiques.find(
      (year) => year.id.toString() === selectedSchoolYearId
    );

    // If the selected date is after the end of the academic year, show no courses.
    if (selectedYear && selectedYear.date_fin && date > new Date(selectedYear.date_fin)) {
      setDailySchedule([]);
      setIsLoading(false); // Set loading to false as we are returning early
      return;
    }

    setIsLoading(true);
    try {
      const dayOfWeek = format(date, 'EEEE', { locale: fr }).charAt(0).toUpperCase() + format(date, 'EEEE', { locale: fr }).slice(1);
      const formattedDate = format(date, 'yyyy-MM-dd');

      const [allScheduleData, absencesData] = await Promise.all([
        fetchData(`${API_BASE_URL}/emploi-du-temps?classe_id=${selectedClassId}&annee_scolaire_id=${selectedSchoolYearId}`),
        fetchData(`${API_BASE_URL}/professor-absences?classe_id=${selectedClassId}&date_absence=${formattedDate}`)
      ]);

      const scheduleData = allScheduleData.filter((entry: EmploiDuTempsEntry) => entry.jour === dayOfWeek);

      const scheduleItems: DailyScheduleItem[] = scheduleData.map((entry: EmploiDuTempsEntry) => {
        const existingAbsence = absencesData.find((abs: AbsenceRecord) =>
          abs.professeur_id === entry.professeur.id &&
          abs.heure_debut === entry.heure_debut &&
          abs.heure_fin === entry.heure_fin
        );

        return {
          emploi_du_temps_id: entry.id,
          heure_debut: entry.heure_debut,
          heure_fin: entry.heure_fin,
          matiere: entry.matiere,
          professeur: entry.professeur,
          isAbsent: !!existingAbsence,
          existingAbsenceId: existingAbsence ? existingAbsence.id : null,
        };
      });

      setDailySchedule(scheduleItems.sort((a, b) => a.heure_debut.localeCompare(b.heure_debut)));
    } catch (error) {
      sonnerToast.error((error as Error).message);
      setDailySchedule([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId, date, selectedSchoolYearId, anneesAcademiques]);

  useEffect(() => {
    fetchScheduleAndAbsences();
  }, [fetchScheduleAndAbsences]);

  // Handlers
  const handleToggleAbsence = (emploiDuTempsId: number) => {
    setDailySchedule(prevSchedule =>
      prevSchedule.map(item =>
        item.emploi_du_temps_id === emploiDuTempsId
          ? { ...item, isAbsent: !item.isAbsent }
          : item
      )
    );
  };

  const handleSave = async () => {
    if (!selectedClassId || !date || !selectedSchoolYearId) {
      sonnerToast.error(t.attendance.errorSave);
      return;
    }

    setIsSaving(true);
    try {
      const absencesToCreate = dailySchedule
        .filter(item => item.isAbsent && !item.existingAbsenceId)
        .map(item => ({
          professeur_id: item.professeur.id,
          classe_id: parseInt(selectedClassId),
          matiere_id: item.matiere.id,
          date_absence: format(date, 'yyyy-MM-dd'),
          heure_debut: item.heure_debut,
          heure_fin: item.heure_fin,
          annee_scolaire_id: parseInt(selectedSchoolYearId),
        }));

      const absenceIdsToDelete = dailySchedule
        .filter(item => !item.isAbsent && item.existingAbsenceId)
        .map(item => item.existingAbsenceId) as number[];

      const payload = {
        creations: absencesToCreate,
        deletions: absenceIdsToDelete,
      };

      if (payload.creations.length === 0 && payload.deletions.length === 0) {
        sonnerToast.info(t.attendance.noChanges);
        return;
      }

     const response = await fetch(`${API_BASE_URL}/professor-absences/bulk`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  },
  body: JSON.stringify({
    date: format(date, 'yyyy-MM-dd'),
    annee_scolaire_id: parseInt(selectedSchoolYearId, 10),
    details: dailySchedule.map(item => ({
      professeur_id: item.professeur.id,
      present: !item.isAbsent,
      existingAbsenceId: item.existingAbsenceId,
      heure_debut: item.heure_debut,
      heure_fin: item.heure_fin
    }))
  }),
});

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t.attendance.errorSave);
      }

      sonnerToast.success(t.attendance.successSave);
      fetchScheduleAndAbsences();
    } catch (error) {
      sonnerToast.error((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const activeYear = anneesAcademiques.find(a => a.id.toString() === selectedSchoolYearId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.attendance.professorAbsenceTitle}</CardTitle>
        <CardDescription>{t.attendance.professorAbsenceDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/20">
          <div className="space-y-2">
            <Label>{t.common.schoolYear}</Label>
            <Input
              value={activeYear?.libelle || ''}
              disabled
              className="bg-gray-100 dark:bg-gray-700"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-select">{t.common.date}</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="date-select"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: dateFnsLocale }) : <span>{t.common.selectDate}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar 
                  mode="single" 
                  selected={date} 
                  onSelect={(d) => {
                    if (d) {
                      setDate(d);
                      setIsCalendarOpen(false);
                    }
                  }} 
                  initialFocus 
                  locale={dateFnsLocale}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="class-select">{t.common.class}</Label>
            <Select 
              onValueChange={setSelectedClassId} 
              value={selectedClassId} 
              disabled={isLoading}
            >
              <SelectTrigger id="class-select">
                <SelectValue placeholder={t.common.selectAClass} />
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
          
        </div>

        {/* Schedule Display */}
        <div className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !selectedClassId ? (
            <div className="text-center py-8 text-gray-500">
              {t.attendance.selectClassPrompt}
            </div>
          ) : dailySchedule.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t.attendance.noCoursesToday}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  {t.schedule.title} du {format(date, 'PPP', { locale: dateFnsLocale })}
                </CardTitle>
                <CardDescription>
                  {t.attendance.markAbsencesHere}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Desktop View */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">
                          <Clock className="inline-block h-4 w-4 mr-1" />
                          {t.common.hours}
                        </TableHead>
                        <TableHead>
                          <BookOpen className="inline-block h-4 w-4 mr-1" />
                          {t.common.subject}
                        </TableHead>
                        <TableHead>
                          <User className="inline-block h-4 w-4 mr-1" />
                          {t.common.professor}
                        </TableHead>
                        <TableHead className="text-center">
                          {t.attendance.absent}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailySchedule.map((item) => (
                        <TableRow 
                          key={item.emploi_du_temps_id} 
                          className={item.isAbsent ? 'bg-red-50 dark:bg-red-900/20' : ''}
                        >
                          <TableCell className="font-mono">
                            {item.heure_debut.substring(0, 5)} - {item.heure_fin.substring(0, 5)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.matiere.nom}
                          </TableCell>
                          <TableCell>
                            {item.professeur.prenom} {item.professeur.nom}
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={item.isAbsent}
                              onCheckedChange={() => handleToggleAbsence(item.emploi_du_temps_id)}
                              aria-label={`Marquer ${item.professeur.prenom} ${item.professeur.nom} comme absent`}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View */}
                <div className="block md:hidden space-y-3">
                  {dailySchedule.map((item) => (
                    <Card key={item.emploi_du_temps_id} className={cn("p-4 flex justify-between items-center", item.isAbsent ? 'bg-red-50 dark:bg-red-900/20' : 'bg-background')}>
                      <div>
                        <p className="font-bold">{item.matiere.nom}</p>
                        <p className="text-sm text-muted-foreground">{item.professeur.prenom} {item.professeur.nom}</p>
                        <p className="text-sm text-muted-foreground font-mono pt-1">
                          <Clock className="inline-block h-3 w-3 mr-1" />
                          {item.heure_debut.substring(0, 5)} - {item.heure_fin.substring(0, 5)}
                        </p>
                      </div>
                      <div className="flex flex-col items-center pl-4">
                        <Label htmlFor={`absence-check-${item.emploi_du_temps_id}`} className="text-xs mb-1">{t.attendance.absent}</Label>
                        <Checkbox
                          id={`absence-check-${item.emploi_du_temps_id}`}
                          checked={item.isAbsent}
                          onCheckedChange={() => handleToggleAbsence(item.emploi_du_temps_id)}
                          aria-label={`Marquer ${item.professeur.prenom} ${item.professeur.nom} comme absent`}
                          className="h-5 w-5"
                        />
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end mt-6">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {t.common.save}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Composant de suivi des absences
// Composant de suivi des absences
export function ProfessorAbsenceTracking({ 
  professeurs, 
  t, 
  language,
  
}: ProfessorAbsenceTrackingProps) {

  const dateFnsLocale = language === 'ar' ? ar : fr;
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [anneesAcademiques, setAnneesAcademiques] = useState<AnneeAcademique[]>([]);
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState<string>('');
  const [allAbsenceRecords, setAllAbsenceRecords] = useState<AbsenceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch academic years on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [yearsData, configResponse] = await Promise.all([
          fetchData(`${API_BASE_URL}/annees-academiques`),
          fetch(`${API_BASE_URL}/configuration`)
        ]);

        setAnneesAcademiques(yearsData);

        let activeYearId: number | null = null;
        if (configResponse.ok) {
          const configData = await configResponse.json();
          activeYearId = configData?.annee_scolaire?.id;
        }

        const defaultYearId = getDefaultYearId(yearsData, activeYearId);
        if (defaultYearId) {
          setSelectedSchoolYearId(defaultYearId);
        }
      } catch (error) {
        sonnerToast.error((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const getDefaultYearId = (yearsData: AnneeAcademique[], activeYearId: number | null): string | null => {
    if (activeYearId && yearsData.some(annee => annee.id === activeYearId)) {
      return activeYearId.toString();
    }
    if (yearsData.length > 0) {
      const sortedYears = [...yearsData].sort((a, b) => 
        new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime()
      );
      return sortedYears[0].id.toString();
    }
    return null;
  };

  // Fetch absences when filters change
  useEffect(() => {
    if (!selectedSchoolYearId || !startDate || !endDate) {
      setAllAbsenceRecords([]);
      return;
    }
    
    const fetchAbsences = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          annee_scolaire_id: selectedSchoolYearId,
          date_debut: format(startDate, 'yyyy-MM-dd'),
          date_fin: format(endDate, 'yyyy-MM-dd'),
        });

        const response = await fetchData(`${API_BASE_URL}/professor-absences?${params.toString()}`);

        const mappedData = response.map((item: any) => ({
          id: item.id,
          professeur_id: item.professeur_id || item.professeur?.id,
          professeur_nom: item.professeur
            ? `${item.professeur.prenom} ${item.professeur.nom}`
            : t.common.unknown,
          date: item.date,
          heure_debut: item.heure_debut,
          heure_fin: item.heure_fin,
          justified: !!item.justification,
          justification: item.justification || '',
        }));
        
        setAllAbsenceRecords(mappedData);
      } catch (error) {
        sonnerToast.error((error as Error).message);
        setAllAbsenceRecords([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAbsences();
  }, [selectedSchoolYearId, startDate, endDate, t, language]);

  const handleJustificationChange = (absenceId: number, justification: string) => {
    setAllAbsenceRecords(prevData =>
      prevData.map(record =>
        record.id === absenceId
          ? { ...record, justification }
          : record
      )
    );
  };

  const markAsJustified = async (absenceId: number) => {
    const recordToUpdate = allAbsenceRecords.find(r => r.id === absenceId);
    if (!recordToUpdate) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/professor-absences/${absenceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          justifie: true, 
          justification: recordToUpdate.justification 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t.attendance.errorSave);
      }
      
      setAllAbsenceRecords(prevData =>
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

  const filteredAbsenceRecords = allAbsenceRecords.filter(record => {
    const professeurNom = record.professeur_nom || '';
    return professeurNom.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const isFilterComplete = selectedSchoolYearId && startDate && endDate;
  const activeYear = anneesAcademiques.find(a => a.id.toString() === selectedSchoolYearId);
  const anneeScolaireSelectionnee = activeYear?.libelle || selectedSchoolYearId;

  return (
    <Card className={`shadow-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-gray-800 dark:text-white">
          {t.attendance.professorTrackingTitle}
        </CardTitle>
        <CardDescription className="dark:text-gray-300">
          {t.attendance.professorTrackingDescription?.replace('{year}', anneeScolaireSelectionnee) || ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Année scolaire */}
        <div className="space-y-2 mb-4">
          <Label>{t.common.schoolYear}</Label>
          <Input
            value={activeYear?.libelle || ''}
            disabled
            className="bg-gray-100 dark:bg-gray-700"
          />
        </div>

        {/* Filters */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 border rounded-lg bg-purple-50/50 dark:bg-gray-800/20 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
          <div className="space-y-2">
            <label htmlFor="filter-start-date-tracking" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.common.startDate}
            </label>
            <Popover open={isStartDatePickerOpen} onOpenChange={setIsStartDatePickerOpen}>
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
                  onSelect={(d) => {
                    if (d) {
                      setStartDate(d);
                      setIsStartDatePickerOpen(false);
                    }
                  }}
                  initialFocus
                  locale={dateFnsLocale}
                  className="pointer-events-auto dark:bg-gray-800"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label htmlFor="filter-end-date-tracking" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.common.endDate}
            </label>
            <Popover open={isEndDatePickerOpen} onOpenChange={setIsEndDatePickerOpen}>
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
                  onSelect={(d) => {
                    if (d) {
                      setEndDate(d);
                      setIsEndDatePickerOpen(false);
                    }
                  }}
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
                placeholder={t.attendance.searchProfessorPlaceholder}
                className={`pl-9 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white ${language === 'ar' ? 'text-right' : 'text-left'}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Results */}
        {isFilterComplete ? (
          <>
            <div className="mt-4">
              {isLoading ? (
                <p className="text-center text-gray-500 dark:text-gray-400">{t.common.loading}</p>
              ) : filteredAbsenceRecords.length > 0 ? ( 
                <>
                  {/* Desktop View */}
                  <div className="hidden lg:block overflow-auto max-h-[60vh]">
                    <Table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      <TableHeader className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className={`text-gray-700 dark:text-white ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                            {t.common.professor}
                          </TableHead>
                          <TableHead className={`text-gray-700 dark:text-white ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                            {t.common.date}
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
                              {record.professeur_nom || t.common.unknown}
                            </TableCell>
                            <TableCell className={`text-gray-700 dark:text-gray-300 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                              {record.date ? format(new Date(record.date.replace(/-/g, '/')), 'dd/MM/yyyy', { locale: dateFnsLocale }) : '-'}
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
                  <div className="block lg:hidden space-y-4">
                    {filteredAbsenceRecords.map((record) => (
                      <Card key={record.id} className={`p-4 bg-white dark:bg-gray-800 shadow-sm border ${record.justified ? 'border-green-200 dark:border-green-700' : 'border-red-200 dark:border-red-700'}`}>
                        <div className="flex justify-between items-start mb-3 gap-2">
                          <div>
                            <p className="font-bold text-base text-gray-800 dark:text-white">
                              {record.professeur_nom || t.common.unknown}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {record.date ? format(new Date(record.date.replace(/-/g, '/')), 'dd/MM/yyyy', { locale: dateFnsLocale }) : '-'}
                            </p>
                          </div>
                          {record.justified ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 border border-green-200 dark:border-green-700">
                              {t.attendance.justified}
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border border-red-200 dark:border-red-700">
                              {t.attendance.notJustified}
                            </Badge>
                          )}
                        </div>
      
                        <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                          <Label htmlFor={`justification-mobile-${record.id}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t.attendance.justification}:
                          </Label>
                          <Input 
                            id={`justification-mobile-${record.id}`}
                            placeholder={record.justified ? t.attendance.alreadyJustified : t.attendance.enterReason}
                            value={record.justification} 
                            onChange={(e) => handleJustificationChange(record.id, e.target.value)} 
                            disabled={record.justified} 
                            className="w-full text-sm bg-white dark:bg-gray-700/50 border-gray-300 dark:border-gray-600"
                          />
                          {!record.justified && (
                            <Button 
                              size="sm" 
                              onClick={() => markAsJustified(record.id)} 
                              disabled={!record.justification?.trim()} 
                              className="w-full bg-purple-600 dark:bg-purple-700 text-white hover:bg-purple-700 dark:hover:bg-purple-800 mt-2"
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
                    {t.attendance.noProfessorAbsenceFound}
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