import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  User,
  School,
  ChevronRight,
  ChevronLeft,
  Loader2,
  RefreshCw,
  Home,
  Users,
  BookOpen,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  subWeeks,
  addWeeks,
  isValid,
  isToday,
  isAfter,
  isBefore,
  startOfDay,
  endOfDay,
  isWithinInterval,
  getDay,
} from 'date-fns';
import { fr, ar } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import apiClient from '@/lib/apiClient';

// Types for API Data
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
interface Matiere {
  id: number;
  nom: string;
  code?: string;
}
interface UserData {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: 'admin' | 'eleve' | 'professeur' | 'tuteur';
}
interface Inscription {
  id: number;
  date_inscription: string;
  actif: boolean;
  utilisateurId: number;
  classeId: number;
  anneeScolaireId: number;
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

interface ExceptionEmploiDuTempsEntry {
  id: number;
  date_exception: string;
  jour: string;
  heure_debut: string;
  heure_fin: string;
  classe_id: number | null;
  professeur_id: number | null;
  type_exception: 'annulation' | 'remplacement_prof' | 'deplacement_cours' | 'jour_ferie' | 'evenement_special';
  nouvelle_matiere_id: number | null;
  nouveau_professeur_id: number | null;
  nouvelle_heure_debut: string | null;
  nouvelle_heure_fin: string | null;
  nouveau_jour: string | null;
  nouvelle_classe_id: number | null;
  motif: string | null;
}

type DisplayCourse = {
  id: number;
  time: string;
  subject: string;
  teacher: string;
  room: string;
  color: string;
  duration: number;
  type: 'base' | 'exception';
  isCanceled: boolean;
  exceptionType?: 'annulation' | 'remplacement_prof' | 'deplacement_cours' | 'jour_ferie' | 'evenement_special';
  originalEntryId?: number;
};

interface StudentScheduleProps {
  userId?: number;
  blocId?: number;
}

type WeeklySchedule = {
  [day: string]: DisplayCourse[];
};

const getCourseColor = (subjectId: number) => {
  const colors = [
    'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700',
    'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700',
    'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700',
    'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700',
    'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700',
    'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-700',
    'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900/30 dark:text-pink-200 dark:border-pink-700',
    'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/30 dark:text-teal-200 dark:border-teal-700',
  ];
  return colors[subjectId % colors.length];
};

const CourseCard: React.FC<{ course: DisplayCourse; showFullDetails?: boolean }> = ({ 
  course, 
  showFullDetails = true 
}) => {
  const { t } = useLanguage();
  
  let bgColor = 'bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-700 dark:to-indigo-800';
  let textColor = 'text-white dark:text-gray-100';
  let borderColor = 'border-blue-300 dark:border-blue-500';
  let currentBadgeClasses = 'bg-white/30 text-white backdrop-blur-sm dark:bg-black/30';
  let iconToRender: React.ReactNode = <BookOpen className="h-4 w-4 text-white dark:text-gray-200" />;
  let currentSubjectTextClasses = "font-semibold";
  let cardSpecificClasses = "";
  let statusTextForBottomBadge = "";

  if (course.isCanceled) {
    bgColor = 'bg-gradient-to-br from-red-500 to-rose-600 dark:from-red-700 dark:to-rose-800';
    textColor = 'text-white dark:text-gray-100';
    borderColor = 'border-red-300 dark:border-red-500';
    currentBadgeClasses = 'bg-red-200/50 text-red-900 backdrop-blur-sm dark:bg-red-300/30 dark:text-red-100';
    iconToRender = <User className="h-4 w-4 text-red-100 dark:text-red-200" />;
    currentSubjectTextClasses += " italic line-through";
    cardSpecificClasses = "opacity-70";
    statusTextForBottomBadge = t.schedule.status.canceled;
  } else if (course.exceptionType === 'jour_ferie') {
    bgColor = 'bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-700 dark:to-emerald-800';
    textColor = 'text-white dark:text-gray-100';
    borderColor = 'border-green-300 dark:border-green-500';
    currentBadgeClasses = 'bg-green-200/50 text-green-900 backdrop-blur-sm dark:bg-green-300/30 dark:text-green-100';
    iconToRender = <Calendar className="h-4 w-4 text-green-100 dark:text-green-200" />;
    statusTextForBottomBadge = t.schedule.status.holiday;
  } else if (course.type === 'exception') {
    bgColor = 'bg-gradient-to-br from-yellow-400 to-orange-500 dark:from-yellow-600 dark:to-orange-700';
    textColor = 'text-gray-900 dark:text-gray-100';
    borderColor = 'border-orange-300 dark:border-orange-500';
    currentBadgeClasses = 'bg-yellow-200/50 text-orange-900 backdrop-blur-sm dark:bg-yellow-300/30 dark:text-orange-100';
    iconToRender = <RefreshCw className="h-4 w-4 text-yellow-900 dark:text-yellow-200" />;
    statusTextForBottomBadge = course.exceptionType === 'remplacement_prof' 
      ? t.schedule.status.replaced
      : course.exceptionType === 'deplacement_cours' 
        ? t.schedule.status.moved
        : t.schedule.status.special;
  }

  const finalCardClasses = cn(
    "p-2 rounded-lg border-l-4 relative overflow-hidden group",
    bgColor,
    textColor,
    borderColor,
    cardSpecificClasses,
    "transform transition-transform duration-200 hover:scale-[1.01]"
  );

  return (
    <div className={finalCardClasses}>
      <div className="flex justify-between items-center mb-1">
        <h3 className={cn("text-base leading-tight", currentSubjectTextClasses, textColor)}>
          {course.subject}
        </h3>
        <Badge variant="outline" className={cn("ml-2 text-xs", currentBadgeClasses)}>
          {course.time}
        </Badge>
      </div>
      {showFullDetails && (
        <div className={cn("mt-1 text-sm flex items-center gap-2", textColor)}>
          {React.cloneElement(iconToRender as React.ReactElement<any>, { 
            className: cn((iconToRender as React.ReactElement<any>).props.className, "opacity-80") 
          })}
          <span className="opacity-90">{course.teacher}</span>
        </div>
      )}
      {!showFullDetails && (
        <p className={cn("text-xs opacity-80 mt-1", textColor)}>{course.teacher}</p>
      )}
      {statusTextForBottomBadge && (
        <Badge
          variant="secondary"
          className={cn(
            "absolute bottom-1 right-1 px-2 py-0.5 text-xs font-semibold",
            course.isCanceled ? "bg-red-600/90 text-white" :
            course.exceptionType === 'jour_ferie' ? "bg-green-600/90 text-white" :
            "bg-yellow-500/90 text-gray-900 dark:text-gray-100"
          )}
        >
          {statusTextForBottomBadge}
        </Badge>
      )}
    </div>
  );
};

const EmptySlot: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-600 rounded-lg p-2 h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm italic">
      {t.schedule.noCoursesThisWeek}
    </div>
  );
};

export function StudentSchedule({ userId, blocId }: StudentScheduleProps) {
  const { t, language } = useLanguage();
  const currentLocale = language === 'ar' ? ar : fr;
  const isRTL = language === 'ar';
  const { user } = useAuth();
  const studentId = userId ?? user?.id;
  
  const translateSubject = useCallback((subjectName: string): string => {
    if (!subjectName) return t.common.unknownSubject;

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
      'Sciences Naturelles': t.schedule.subjects.naturalSciences,
      'Technologie/Informatique': t.schedule.subjects.technology,
    };
    return subjectMap[subjectName] || subjectName;
  }, [t]);

  const [studentClassId, setStudentClassId] = useState<number | null>(null);
  const [currentAnneeAcademique, setCurrentAnneeAcademique] = useState<AnneeAcademique | null>(null);
  const [allMatieres, setAllMatieres] = useState<Matiere[]>([]);
  const [allClasses, setAllClasses] = useState<Classe[]>([]);
  const [allProfessors, setAllProfessors] = useState<UserData[]>([]);
  const [baseScheduleEntries, setBaseScheduleEntries] = useState<EmploiDuTempsEntry[]>([]);
  const [exceptionEntries, setExceptionEntries] = useState<ExceptionEmploiDuTempsEntry[]>([]);
  const [processedWeeklySchedule, setProcessedWeeklySchedule] = useState<WeeklySchedule>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  const [currentTime, setCurrentTime] = useState(new Date());

  const timeSlotsForGrid = useMemo(() => [
    '08:00-10:00',
    '10:15-12:00',
    '12:15-14:00',
  ], []);

  const studentClassName = useMemo(() => 
    allClasses.find(c => c.id === studentClassId)?.nom || t.common.unknownClass, 
    [allClasses, studentClassId, t]
  );

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const currentWeekEnd = useMemo(() => endOfWeek(currentWeekStart, { weekStartsOn: 1 }), [currentWeekStart]);

  useEffect(() => {
    if (currentAnneeAcademique?.date_debut && currentAnneeAcademique?.date_fin) {
      const yearStartDate = startOfDay(parseISO(currentAnneeAcademique.date_debut));
      const yearEndDate = endOfDay(parseISO(currentAnneeAcademique.date_fin));
  
      if (isValid(yearStartDate) && isValid(yearEndDate)) {
        // If current week starts after the school year ends, jump to the last week of the school year
        if (isAfter(currentWeekStart, yearEndDate)) {
          setCurrentWeekStart(startOfWeek(yearEndDate, { weekStartsOn: 1 }));
        }
        // If current week ends before the school year starts, jump to the first week of the school year
        else if (isBefore(currentWeekEnd, yearStartDate)) {
          setCurrentWeekStart(startOfWeek(yearStartDate, { weekStartsOn: 1 }));
        }
      }
    }
  }, [currentAnneeAcademique, currentWeekStart]);

  const handlePreviousWeek = () => {
    if (currentAnneeAcademique?.date_debut) {
      const prevWeekStart = startOfWeek(subWeeks(currentWeekStart, 1), { weekStartsOn: 1 });
      const yearStartDate = startOfDay(parseISO(currentAnneeAcademique.date_debut));

      if (isValid(yearStartDate) && isBefore(endOfWeek(prevWeekStart, { weekStartsOn: 1 }), yearStartDate)) {
        toast({
          title: t.schedule.startOfYear,
          description: t.schedule.startOfYearDesc,
          variant: "default",
        });
        return;
      }
    }
    setCurrentWeekStart(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    if (currentAnneeAcademique?.date_fin) {
      const nextWeekStart = startOfWeek(addWeeks(currentWeekStart, 1), { weekStartsOn: 1 });
      const yearEndDate = endOfDay(parseISO(currentAnneeAcademique.date_fin));

      if (isValid(yearEndDate) && isAfter(nextWeekStart, yearEndDate)) {
        toast({
          title: t.schedule.endOfYear,
          description: t.schedule.endOfYearDesc,
          variant: "default",
        });
        return;
      }
    }
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  };
  const handleGoToToday = () => {
    let dateToJumpTo = new Date();
    if (currentAnneeAcademique?.date_fin) {
      const yearEndDate = endOfDay(parseISO(currentAnneeAcademique.date_fin));
      if (isValid(yearEndDate) && isAfter(dateToJumpTo, yearEndDate)) {
        dateToJumpTo = yearEndDate;
      }
    }
    setCurrentWeekStart(startOfWeek(dateToJumpTo, { weekStartsOn: 1 }));
  };

  const currentWeekDaysInfo = useMemo(() => {
    return eachDayOfInterval({
      start: currentWeekStart,
      end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
    }).map(date => {
      // Utiliser getDay() pour un index indépendant de la locale (0=Dim, 1=Lun, ...)
      const dayIndex = getDay(date);
      const englishDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayNameCapitalized = englishDayNames[dayIndex]; // C'est maintenant toujours le nom anglais, ex: "Monday"
      
      // Utiliser format() avec la locale actuelle pour l'affichage uniquement
      const dayNameDisplay = format(date, 'EEEE', { locale: currentLocale });
      const dayKey = dayNameCapitalized.toLowerCase() as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

      const dayOrderMap: { [key: string]: number } = {
        'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3, 'friday': 4, 'saturday': 5,
      };
      return {
        date,
        dayNameCapitalized: dayNameCapitalized,
        dayNameDisplay: t.schedule.days[dayKey] || dayNameDisplay,
        dayOrder: dayOrderMap[dayKey],
        isToday: isSameDay(date, new Date()),
      };
    }).filter(dayInfo => dayInfo.dayOrder !== undefined)
      .sort((a, b) => (isRTL ? b.dayOrder - a.dayOrder : a.dayOrder - b.dayOrder));
  }, [currentWeekStart, t, isRTL, currentLocale]);

  const displayedWeekStart = useMemo(() => {
    const originalStart = currentWeekStart;
    if (currentAnneeAcademique?.date_debut) {
      const yearStartDate = startOfDay(parseISO(currentAnneeAcademique.date_debut));
      if (isValid(yearStartDate) && isBefore(originalStart, yearStartDate)) {
        return yearStartDate;
      }
    }
    return originalStart;
  }, [currentWeekStart, currentAnneeAcademique]);

  const displayedWeekEnd = useMemo(() => {
    const originalEnd = currentWeekEnd;
    if (currentAnneeAcademique?.date_fin) {
      const yearEndDate = endOfDay(parseISO(currentAnneeAcademique.date_fin));
      if (isValid(yearEndDate) && isAfter(originalEnd, yearEndDate)) {
        return yearEndDate;
      }
    }
    return originalEnd;
  }, [currentWeekEnd, currentAnneeAcademique]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  
  useEffect(() => {
    const fetchStudentContextData = async () => {
      if (!studentId) {
        setError(t.common.accessDenied);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const apiParams = blocId ? { params: { blocId } } : {};

        const configRes = await apiClient.get('/configuration', apiParams);
        const configData: any | any[] = configRes.data;
        let activeAnneeId: number | undefined;

        if (Array.isArray(configData) && configData.length > 0) {
          activeAnneeId = configData[0].annee_academique_active_id || configData[0].annee_scolaire?.id;
        } else if (configData && !Array.isArray(configData)) {
          activeAnneeId = configData.annee_academique_active_id || configData.annee_scolaire?.id;
        }

        let anneePourRequete: AnneeAcademique | null = null;

        if (activeAnneeId) {
          const anneeDetailsRes = await apiClient.get(`/annees-academiques/${activeAnneeId}`, apiParams);
          anneePourRequete = anneeDetailsRes.data;
        } else {
          toast({
            title: t.common.configuration,
            description: t.common.missingConfig,
            variant: "default",
          });
          const anneesRes = await apiClient.get('/annees-academiques', apiParams);
          const allAnnees: AnneeAcademique[] = anneesRes.data;
          anneePourRequete = allAnnees.find((an: AnneeAcademique) =>
            new Date() >= parseISO(an.date_debut) && new Date() <= parseISO(an.date_fin)
          ) || null;

          if (!anneePourRequete) {
            const sortedAnnees = allAnnees.sort((a, b) => parseISO(b.date_fin).getTime() - parseISO(a.date_fin).getTime());
            anneePourRequete = sortedAnnees.length > 0 ? sortedAnnees[0] : null;
          }
        }

        if (!anneePourRequete) {
          throw new Error(t.common.missingYearConfig);
        }
        
        setCurrentAnneeAcademique(anneePourRequete);

        const inscriptionsRes = await apiClient.get(`/inscriptions?utilisateurId=${studentId}&annee_scolaire_id=${anneePourRequete.id}`, apiParams);
        const studentInscriptions: Inscription[] = inscriptionsRes.data;
        
        const studentInscription = studentInscriptions.find(inscription => inscription.actif === true);

        if (!studentInscription) {
          throw new Error(t.userManagement.noActiveRegistration);
        }
        
        setStudentClassId(studentInscription.classeId);
        
        const studentClassId = studentInscription.classeId;
        const anneeScolaireId = anneePourRequete.id;

        // Fetch affectations to get taught subjects
        const affectationsRes = await apiClient.get(`/affectations?classe_id=${studentClassId}&annee_scolaire_id=${anneeScolaireId}`, apiParams);
        const affectations = affectationsRes.data;
        
        const taughtMatieresMap = new Map<number, Matiere>();
        affectations.forEach((aff: any) => {
          if (aff.matiere && aff.matiere.id) {
            taughtMatieresMap.set(aff.matiere.id, aff.matiere);
          }
        });
        const taughtMatieres = Array.from(taughtMatieresMap.values());

        const [classesRes, usersRes] = await Promise.all([
          apiClient.get('/classes', apiParams),
          apiClient.get('/users', apiParams),
        ]);

        setAllMatieres(taughtMatieres);
        setAllClasses(classesRes.data);
        setAllProfessors(usersRes.data.filter((u: UserData) => u.role === 'professeur'));
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || t.common.errorLoadingInitialData;
        console.error(t.common.errorLoadingInitialData, err);
        toast({
          title: t.common.errorLoading,
          description: errorMessage,
          variant: "destructive",
        });
        setError(errorMessage);
      }
    };

    fetchStudentContextData();
  }, [studentId, t]);

  const fetchWeeklySchedule = useCallback(async () => {
    if (!studentClassId || !currentAnneeAcademique) return;

    setLoading(true);
    setError(null);

    const weekStartDate = format(currentWeekStart, 'yyyy-MM-dd');
    const weekEndDate = format(currentWeekEnd, 'yyyy-MM-dd');

    const apiParams = blocId ? { params: { blocId } } : {};

    try {
      const [scheduleRes, exceptionsRes] = await Promise.all([
        apiClient.get(`/emploi-du-temps?classe_id=${studentClassId}&annee_academique_id=${currentAnneeAcademique.id}`, apiParams),
        apiClient.get(`/exception-emploi-du-temps?classe_id=${studentClassId}&start_date=${weekStartDate}&end_date=${weekEndDate}`, apiParams),
      ]);

      setBaseScheduleEntries(scheduleRes.data);
      setExceptionEntries(exceptionsRes.data);

    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || t.schedule.errorLoading;
      console.error(t.schedule.errorLoading, err);
      toast({
        title: t.common.errorLoading,
        description: errorMessage,
        variant: "destructive",
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [studentClassId, currentAnneeAcademique, currentWeekStart, t, blocId]);

  useEffect(() => {
    fetchWeeklySchedule();
  }, [fetchWeeklySchedule]);

  const isSchoolYearActive = useMemo(() => {
    if (!currentAnneeAcademique?.date_debut || !currentAnneeAcademique?.date_fin) return false;
    const now = new Date();
    const startDate = parseISO(currentAnneeAcademique.date_debut);
    const endDate = endOfDay(parseISO(currentAnneeAcademique.date_fin));
    if (!isValid(startDate) || !isValid(endDate)) return false;

    return isWithinInterval(now, { start: startDate, end: endDate });
  }, [currentAnneeAcademique]);

  const memoizedProcessedWeeklySchedule = useMemo(() => {
    if (allMatieres.length === 0 || allProfessors.length === 0 || !isValid(currentWeekStart) || !isValid(currentWeekEnd)) {
      return {} as WeeklySchedule;
    }

    const weeklySchedule: WeeklySchedule = {};
    const englishDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    // Check if the current week is outside the academic year range
    if (currentAnneeAcademique) {
        const yearStartDate = startOfDay(parseISO(currentAnneeAcademique.date_debut));
        const yearEndDate = endOfDay(parseISO(currentAnneeAcademique.date_fin));
        if (!isValid(yearStartDate) || !isValid(yearEndDate) || 
            isAfter(currentWeekStart, yearEndDate) || 
            isBefore(currentWeekEnd, yearStartDate)) {
            return {} as WeeklySchedule; // Return empty schedule if week is out of bounds
        }
    }
    englishDays.forEach(day => {
      weeklySchedule[day] = [];
    });

    const dayMapping: { [key: string]: string } = {
      'Monday': 'Lundi', 'Tuesday': 'Mardi', 'Wednesday': 'Mercredi',
      'Thursday': 'Jeudi', 'Friday': 'Vendredi', 'Saturday': 'Samedi',
    };

    baseScheduleEntries.forEach(entry => {
      const matiere = allMatieres.find(m => m.id === entry.matiere_id);
      const professeur = allProfessors.find(p => p.id === entry.professeur_id);
      const englishDay = Object.keys(dayMapping).find(key => dayMapping[key] === entry.jour);

      if (matiere && professeur && englishDay && weeklySchedule[englishDay]) {
        const [startHour, startMin] = entry.heure_debut.split(':').map(Number);
        const [endHour, endMin] = entry.heure_fin.split(':').map(Number);
        const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);

          weeklySchedule[englishDay].push({
            id: entry.id,
            time: `${entry.heure_debut.substring(0, 5)}-${entry.heure_fin.substring(0, 5)}`,
            subject: translateSubject(matiere.nom),
            teacher: `${professeur.prenom} ${professeur.nom}`,
            color: getCourseColor(matiere.id),
            duration: duration,
            type: 'base',
            isCanceled: false,
            room: ''
          });
      }
    });

    exceptionEntries.forEach(exception => {
      const exceptionDate = parseISO(exception.date_exception);
      if (!isValid(exceptionDate)) return;

      const exceptionDayKey = format(exceptionDate, 'EEEE'); // "Monday"
      const exceptionDayName = exceptionDayKey.charAt(0).toUpperCase() + exceptionDayKey.slice(1);

      const appliesToCurrentWeekDay = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd }).some(day => isSameDay(day, exceptionDate));
      if (!appliesToCurrentWeekDay || !englishDays.includes(exceptionDayName)) return;

      const timeSlot = `${exception.heure_debut.substring(0, 5)}-${exception.heure_fin.substring(0, 5)}`;

      const baseCourseIndex = weeklySchedule[exceptionDayName]?.findIndex(course =>
        course.time === timeSlot && !course.isCanceled
      );
      const baseCourse = baseCourseIndex !== -1 ? weeklySchedule[exceptionDayName][baseCourseIndex] : undefined;

      const [startHour, startMin] = exception.heure_debut.split(':').map(Number);
      const [endHour, endMin] = exception.heure_fin.split(':').map(Number);
      const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);

      const newCourseData: DisplayCourse = {
        id: exception.id,
        time: timeSlot,
        subject: 'N/A',
        teacher: 'N/A',
        color: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600',
        duration: duration,
        type: 'exception',
        isCanceled: false,
        exceptionType: exception.type_exception,
        originalEntryId: baseCourse?.id,
        room: ''
      };

      switch (exception.type_exception) {
        case 'annulation':
          if (baseCourse) {
            baseCourse.isCanceled = true;
            baseCourse.exceptionType = 'annulation';
            baseCourse.subject = `${baseCourse.subject} (${t.schedule.status.canceled})`;
            baseCourse.teacher = `${t.schedule.reason}: ${exception.motif || t.common.unknown}`;
            baseCourse.color = 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700';
          } else {
            newCourseData.subject = `${t.schedule.status.canceled}: ${exception.motif || t.common.unknown}`;
            newCourseData.isCanceled = true;
            newCourseData.color = 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700';
            weeklySchedule[exceptionDayName]?.push(newCourseData);
          }
          break;
        case 'jour_ferie':
          weeklySchedule[exceptionDayName] = weeklySchedule[exceptionDayName].map(course => {
            if (course.time === timeSlot || (exception.heure_debut === '00:00:00' && exception.heure_fin === '23:59:59')) {
              return {
                ...course,
                isCanceled: false,
                exceptionType: 'jour_ferie',
                subject: t.schedule.exceptionTypes.jour_ferie,
                teacher: `${t.schedule.reason}: ${exception.motif || t.common.unknown}`,
                color: '',
              };
            }
            return course;
          });
          const existingHoliday = weeklySchedule[exceptionDayName].find(c =>
            c.exceptionType === 'jour_ferie' && c.time === timeSlot
          );
          if (!existingHoliday) {
            newCourseData.subject = `${t.schedule.exceptionTypes.jour_ferie}: ${exception.motif || t.common.unknown}`;
            newCourseData.color = 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700';
            newCourseData.teacher = 'N/A';
            weeklySchedule[exceptionDayName].push(newCourseData);
          }
          break;
        case 'remplacement_prof':
        case 'deplacement_cours':
        case 'evenement_special':
          const newMatiere = allMatieres.find(m => m.id === exception.nouvelle_matiere_id);
          const newProf = allProfessors.find(p => p.id === exception.nouveau_professeur_id);

          newCourseData.subject = newMatiere ? translateSubject(newMatiere.nom) : t.common.unknownSubject;
          newCourseData.teacher = newProf ? `${newProf.prenom} ${newProf.nom}` : t.common.unknownTeacher;
          newCourseData.color = 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700';

          if (baseCourseIndex !== -1 && weeklySchedule[exceptionDayName][baseCourseIndex]) {
            Object.assign(weeklySchedule[exceptionDayName][baseCourseIndex], newCourseData);
            weeklySchedule[exceptionDayName][baseCourseIndex].id = exception.id;
            weeklySchedule[exceptionDayName][baseCourseIndex].type = 'exception';
          } else if (weeklySchedule[exceptionDayName]) {
            weeklySchedule[exceptionDayName].push(newCourseData);
          }
          break;
        default:
          break;
      }
    });

    Object.keys(weeklySchedule).forEach(dayName => {
      weeklySchedule[dayName].sort((a, b) => {
        const timeA = parseISO(`2000-01-01T${a.time.split('-')[0]}:00`);
        const timeB = parseISO(`2000-01-01T${b.time.split('-')[0]}:00`);
        return timeA.getTime() - timeB.getTime();
      });
    });

    return weeklySchedule;
  }, [baseScheduleEntries, exceptionEntries, allMatieres, allProfessors, currentWeekStart, currentWeekEnd, t, currentLocale, translateSubject]);

  useEffect(() => {
    setProcessedWeeklySchedule(memoizedProcessedWeeklySchedule);
  }, [memoizedProcessedWeeklySchedule]);

  const todayFr = format(currentTime, 'EEEE', { locale: currentLocale })
    .charAt(0).toUpperCase() + format(currentTime, 'EEEE', { locale: currentLocale }).slice(1);
  const todayCourses = (isSchoolYearActive && processedWeeklySchedule[format(currentTime, 'EEEE')]) || [];

  const nextCourse = isSchoolYearActive ? todayCourses.find(course => {
    const [start] = course.time.split('-');
    const [hours, minutes] = start.split(':').map(Number);
    const courseTime = new Date();
    courseTime.setHours(hours, minutes, 0, 0);
    return courseTime > currentTime && !course.isCanceled;
  }) : undefined;

  const getTimeUntilNextCourse = () => {
    if (!nextCourse) return null;

    const [start] = nextCourse.time.split('-');
    const [hours, minutes] = start.split(':').map(Number);
    const courseTime = new Date();
    courseTime.setHours(hours, minutes, 0, 0);

    const diff = courseTime.getTime() - currentTime.getTime();
    const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
    const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { hours: hoursLeft, minutes: minutesLeft };
  };

  const timeUntilNext = getTimeUntilNextCourse();

  const getCurrentCourseProgress = () => {
    const currentCourse = isSchoolYearActive ? todayCourses.find(course => {
      const [start, end] = course.time.split('-');
      const [startHours, startMins] = start.split(':').map(Number);
      const [endHours, endMins] = end.split(':').map(Number);

      const startTime = new Date();
      startTime.setHours(startHours, startMins, 0, 0);

      const endTime = new Date();
      endTime.setHours(endHours, endMins, 0, 0);

      return currentTime >= startTime && currentTime < endTime && !course.isCanceled;
    }) : undefined;

    if (!currentCourse) return null;

    const [start, end] = currentCourse.time.split('-');
    const [startHours, startMins] = start.split(':').map(Number);
    const [endHours, endMins] = end.split(':').map(Number);

    const startTime = new Date();
    startTime.setHours(startHours, startMins, 0, 0);

    const endTime = new Date();
    endTime.setHours(endHours, endMins, 0, 0);

    const totalDuration = endTime.getTime() - startTime.getTime();
    const elapsed = currentTime.getTime() - startTime.getTime();
    const progress = (elapsed / totalDuration) * 100;

    return { course: currentCourse, progress };
  };

  const currentCourseProgress = getCurrentCourseProgress();

  const weeklyHours = Object.values(processedWeeklySchedule).reduce((total, dayCourses) => {
    return total + dayCourses.reduce((dayTotal, course) => dayTotal + (course.isCanceled ? 0 : course.duration), 0);
  }, 0) / 60;

  

  if (error) {
    return (
      <div className={`p-10 text-center bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-xl shadow-lg m-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <p className="font-extrabold text-3xl text-red-700 dark:text-red-200 mb-4">{t.common.errorLoading}</p>
        <p className="text-xl text-red-600 dark:text-red-300 mb-6">{error}</p>
        <Button 
          onClick={() => window.location.reload()} 
          className="bg-red-600 hover:bg-red-700 dark:bg-red-800 dark:hover:bg-red-900 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
        >
          <RefreshCw className="h-5 w-5 mr-2" /> {t.common.tryAgain}
        </Button>
      </div>
    );
  }

  return (
    <div className={`p-6 min-h-[100dvh] pb-[env(safe-area-inset-bottom)] ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <header className={`mb-6 flex flex-col md:flex-row justify-between items-center gap-4 mb-10 p-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight drop">
            {t.schedule.title}
            {studentClassName && studentClassName !== t.common.unknownClass && (
              <span className="text-2xl text-gray-500 dark:text-gray-400 ml-2 font-medium">
                ({studentClassName})
              </span>
            )}
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 mt-2">
            {format(currentTime, 'EEEE dd MMMM yyyy', { locale: currentLocale })}
          </p>
        </div>
       <div className={`flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2 bg-gray-50/50 dark:bg-gray-700/50 p-2 rounded-xl shadow-inner border border-gray-100 dark:border-gray-600 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
  {/* Contrôles de navigation */}
  <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
    <Button
      variant="ghost"
      size="icon"
      onClick={handlePreviousWeek}
      className="rounded-full shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-x-1 hover:bg-blue-100 dark:hover:bg-blue-900"
    >
      {isRTL ? <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" /> : <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />}
    </Button>
    
    <span className="font-extrabold text-lg md:text-xl text-gray-800 dark:text-white select-none mx-2 text-center min-w-[180px]">
      {format(displayedWeekStart, 'dd MMMM', { locale: currentLocale })} - {format(displayedWeekEnd, 'dd MMMM', { locale: currentLocale })}
    </span>
    
    <Button
      variant="ghost"
      size="icon"
      onClick={handleNextWeek}
      className="rounded-full shadow-md hover:shadow-lg transition-all duration-300 transform hover:translate-x-1 hover:bg-blue-100 dark:hover:bg-blue-900"
    >
      {isRTL ? <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" /> : <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />}
    </Button>
  </div>

  {/* Bouton "Semaine actuelle" - maintenant en dessous sur mobile */}
  <Button
    variant="default"
    size="sm"
    onClick={handleGoToToday}
    className={`bg-blue-600 hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-900 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 flex items-center w-full sm:w-auto justify-center mt-2 sm:mt-0 ${isRTL ? 'flex-row-reverse' : ''}`}
  >
    <Home className="h-4 w-4 mr-2" /> {t.schedule.weekNavigation}
  </Button>
</div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="h-full transition-all duration-300 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 text-2xl font-bold text-gray-800 dark:text-white ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <span>{t.schedule.today} ({todayFr})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayCourses.length > 0 ? (
              <div className="space-y-3">
                {todayCourses.map(course => (
                  <CourseCard key={course.id} course={course} showFullDetails={false} />
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 italic py-4">
                {t.schedule.noCoursesThisWeek}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="h-full transition-all duration-300 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 text-2xl font-bold text-gray-800 dark:text-white ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
              <span>{t.schedule.nextCourse}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextCourse && timeUntilNext ? (
              <div className="space-y-4">
                <CourseCard course={nextCourse} />
                <div className={`text-center text-lg text-gray-700 dark:text-gray-300 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.schedule.timeUntilNext}:
                  <span className="text-green-600 dark:text-green-400 font-extrabold ml-2">
                    {timeUntilNext.hours > 0 && `${timeUntilNext.hours}${t.common.hourse}`} {timeUntilNext.minutes}{t.common.minutes}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 italic py-4">
                {t.schedule.noNextCourseToday}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="h-full transition-all duration-300 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 text-2xl font-bold text-gray-800 dark:text-white ${isRTL ? 'flex-row-reverse' : ''}`}>
              <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <span>{t.schedule.currentCourse}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentCourseProgress ? (
              <div className="space-y-4">
                <CourseCard course={currentCourseProgress.course} />
                <div className="mt-4">
                  <p className={`text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.schedule.courseProgress}:
                  </p>
                  <Progress value={currentCourseProgress.progress} className="h-3" />
                  <p className={`text-sm text-gray-600 dark:text-gray-400 mt-1 ${isRTL ? 'text-left' : 'text-right'}`}>
                    {Math.round(currentCourseProgress.progress)}% {t.schedule.completed}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 italic py-4">
                {t.schedule.noCurrentCourse}
              </p>
            )}
          </CardContent>
          <CardFooter className="pt-4 flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <span>{t.schedule.totalWeeklyHours}:</span>
            <span className="font-semibold text-gray-800 dark:text-white">{weeklyHours.toFixed(1)}{t.common.hours}</span>
          </CardFooter>
        </Card>
      </div>

      <Card className="shadow-2xl border border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg">
        <CardHeader className="flex flex-row justify-between items-center dark:bg-gray-800/50">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            {t.schedule.weeklySchedule}
          </CardTitle>
          
        </CardHeader>
        <CardContent className="pt-6 px-6">
          <ScrollArea className="w-full h-[700px] rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-inner p-4">
            {/* Desktop View */}
            <div className="hidden 2xl:block min-w-[1200px]">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                  <tr>
                    <th className={`text-center font-extrabold text-xl text-gray-800 dark:text-white p-3 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10 shadow-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.common.hours}
                    </th>
                    {currentWeekDaysInfo.map(dayInfo => {
                      return (
                        <th
                          key={dayInfo.dayNameCapitalized}
                          className={cn(
                            "text-center font-extrabold text-xl p-3 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10 shadow-sm",
                            dayInfo.isToday ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-t-xl border-blue-200 dark:border-blue-700 shadow-lg' : '',
                            isRTL ? 'text-right' : 'text-left'
                          )}
                        >
                          {dayInfo.dayNameDisplay}
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                            {format(dayInfo.date, 'dd/MM', { locale: currentLocale })}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {timeSlotsForGrid.map(slot => {
                    const [startFull, endFull] = slot.split('-');
                    const startTime = startFull.substring(0, 5);
                    const endTime = endFull.substring(0, 5);
                    return (
                      <tr key={slot}>
                        <td className={`px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 z-10 border-r border-gray-200 dark:border-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                          {`${startTime}-${endTime}`}
                        </td>
                       {currentWeekDaysInfo.map((dayInfo) => {
                      const coursesInSlot = processedWeeklySchedule[dayInfo.dayNameCapitalized]?.filter(
                        
                            course => course.time === slot 
                          );
                          return (
                        <td key={`${dayInfo.dayNameCapitalized}-${slot}`} className="px-4 py-2 align-top">
                              {coursesInSlot && coursesInSlot.length > 0 ? (
                                <div className="space-y-1">
                                  {coursesInSlot.map(course => (
                                    <CourseCard key={course.id} course={course} showFullDetails={false} />
                                  ))}
                                </div>
                              ) : (
                                <EmptySlot />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

                   </div>

            {/* Mobile & Tablet View */}
            <div className="2xl:hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 min-h-[100dvh] pb-[env(safe-area-inset-bottom)]">
              {currentWeekDaysInfo.map(dayInfo => (
                <div key={dayInfo.dayNameCapitalized}>
                  <h3 className={cn(
                    "text-lg font-bold mb-3 sticky top-0 py-2 z-10 border-b text-center rounded-t-lg",
                    dayInfo.isToday 
                      ? 'bg-blue-600 text-white dark:bg-blue-800 shadow-md' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
                    'border-gray-200 dark:border-gray-600'
                  )}>
                    {dayInfo.dayNameDisplay}
                    <div className="text-sm font-medium opacity-90">
                      {format(dayInfo.date, 'dd MMM', { locale: currentLocale })}
                    </div>
                  </h3>
                  <div className="space-y-4 px-2">
                    {timeSlotsForGrid.map(slot => {
                      const coursesInSlot = processedWeeklySchedule[dayInfo.dayNameCapitalized]?.filter(
                        course => course.time === slot
                      );
                      return (
                        <div key={slot} className="flex flex-col gap-2">
                          <div className={`text-sm font-medium text-gray-500 dark:text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {slot.replace('-', ' - ')}
                          </div>
                          <div className="min-h-[80px]">
                            {coursesInSlot && coursesInSlot.length > 0 ? (
                              <div className="space-y-2">
                                {coursesInSlot.map(course => (
                                  <CourseCard key={course.id} course={course} showFullDetails={true} />
                                ))}
                              </div>
                            ) : (
                              <EmptySlot />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea> 
        </CardContent>
      </Card>
    </div>
  );
}