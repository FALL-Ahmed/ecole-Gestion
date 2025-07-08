import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Users,
  BookOpen,
  Loader2,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  XCircle,
  CalendarDays,
  RefreshCw,
  CalendarCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { School } from 'lucide-react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  subWeeks,
  addWeeks,
  isToday,
} from 'date-fns';
import { fr, ar } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Interfaces
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
interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: 'admin' | 'eleve' | 'professeur' | 'tuteur';
}

interface EmploiDuTempsEntry {
  id: number;
  jour: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi';
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
  jour: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi';
  heure_debut: string;
  heure_fin: string;
  classe_id: number | null;
  professeur_id: number | null;
  type_exception:
    | 'annulation'
    | 'remplacement_prof'
    | 'deplacement_cours'
    | 'jour_ferie'
    | 'evenement_special';
  nouvelle_matiere_id: number | null;
  nouveau_professeur_id: number | null;
  nouvelle_heure_debut: string | null;
  nouvelle_heure_fin: string | null;
  nouveau_jour: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi' | null;
  nouvelle_classe_id: number | null;
  motif: string | null;
}

interface SessionDisplayData {
  id: number;
  type: 'base' | 'exception';
  subjectName: string;
  className: string;
  room?: string;
  teacherName: string;
  isCanceled: boolean;
  exceptionType?:
    | 'annulation'
    | 'remplacement_prof'
    | 'deplacement_cours'
    | 'jour_ferie'
    | 'evenement_special';
  originalBaseEntryId?: number;
}

const timeSlots = ['08:00:00-10:00:00', '10:15:00-12:00:00', '12:15:00-14:00:00'];

const SessionCard: React.FC<{ session: SessionDisplayData }> = ({ session }) => {
  const { t } = useLanguage();
  
  let bgColor = 'bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-700 dark:to-indigo-800';
  let textColor = 'text-white dark:text-gray-100';
  let badgeClasses = 'bg-white/30 text-white backdrop-blur-sm dark:bg-black/30';
  let icon = <BookOpen className="h-5 w-5 text-white dark:text-gray-200" />;
  let cardClasses = 'relative overflow-hidden group';
  let border = 'border-l-4 border-blue-300 dark:border-blue-500';
  let statusText = '';
  let statusIcon = null;

  if (session.type === 'exception') {
    if (session.isCanceled) {
      bgColor = 'bg-gradient-to-br from-red-500 to-rose-600 dark:from-red-700 dark:to-rose-800';
      badgeClasses = 'bg-red-200/50 text-red-900 backdrop-blur-sm dark:bg-red-300/30 dark:text-red-100';
      icon = <XCircle className="h-5 w-5 text-red-100 dark:text-red-200" />;
      cardClasses += ' line-through opacity-70';
      border = 'border-l-4 border-red-300 dark:border-red-500';
      statusText = t.schedule.status.canceled;
      statusIcon = <XCircle className="h-4 w-4 mr-1" />;
    } else if (session.exceptionType === 'jour_ferie') {
      bgColor = 'bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-700 dark:to-emerald-800';
      badgeClasses = 'bg-green-200/50 text-green-900 backdrop-blur-sm dark:bg-green-300/30 dark:text-green-100';
      icon = <CalendarDays className="h-5 w-5 text-green-100 dark:text-green-200" />;
      border = 'border-l-4 border-green-300 dark:border-green-500';
      statusText = t.schedule.status.holiday;
      statusIcon = <CalendarDays className="h-4 w-4 mr-1" />;
    } else {
      bgColor = 'bg-gradient-to-br from-yellow-400 to-orange-500 dark:from-yellow-600 dark:to-orange-700';
      badgeClasses = 'bg-yellow-200/50 text-orange-900 backdrop-blur-sm dark:bg-yellow-300/30 dark:text-orange-100';
      textColor = 'text-gray-900 dark:text-gray-100';
      icon = <RefreshCw className="h-5 w-5 text-yellow-900 dark:text-yellow-200" />;
      border = 'border-l-4 border-orange-300 dark:border-orange-500';
      statusText = session.exceptionType === 'remplacement_prof'
        ? t.schedule.status.replaced
        : session.exceptionType === 'deplacement_cours'
          ? t.schedule.status.moved
          : t.schedule.status.special;
      statusIcon = <RefreshCw className="h-4 w-4 mr-1" />;
    }
  }

  return (
    <div
      className={cn(
        'rounded-lg p-4 h-full flex flex-col justify-between shadow-lg relative cursor-default',
        bgColor,
        textColor,
        border,
        cardClasses,
        'transform transition-transform duration-300 group-hover:scale-[1.02] group-hover:shadow-xl'
      )}
    >
      <div className="flex flex-col">
        <p className={cn('text-base leading-tight mb-1 truncate text-shadow-sm', 'font-extrabold')}>
          {session.subjectName}
        </p>
        <p className="text-sm font-medium opacity-90 mb-2 truncate">
          {session.className}
        </p>
        {session.teacherName && (
          <p className="text-xs text-current opacity-80 mt-1 truncate">
            {session.teacherName}
          </p>
        )}
      </div>
      {session.type === 'exception' && (
        <Badge variant="outline" className={cn('mt-3 text-xs font-semibold w-fit', badgeClasses)}>
          {statusIcon}
          {statusText}
        </Badge>
      )}
    </div>
  );
};

const EmptySlot: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm italic shadow-inner">
      {t.schedule.noCoursesThisWeek}
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string | number;
  color: string;
}> = ({ icon, title, value, color }) => (
  <Card className="flex items-center p-5 border border-gray-100 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800">
    {/* Conteneur icône avec marge conditionnelle via CSS logical properties */}
    <div className="[margin-inline-end:1rem] p-4 rounded-full bg-opacity-30 flex items-center justify-center"
         style={{ backgroundColor: color }}>
      {icon}
    </div>
    
    <div className="text-start">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{value}</p>
    </div>
  </Card>
);
export function ProfessorSchedule() {
  const { t, language } = useLanguage();
  const currentLocale = language === 'ar' ? ar : fr;
  const isRTL = language === 'ar';
  const { user, isLoading: isAuthLoading } = useAuth();

  const [professorId, setProfessorId] = useState<number | null>(null);
  const [professorName, setProfessorName] = useState<string>('');
  const [currentAnneeAcademique, setCurrentAnneeAcademique] = useState<AnneeAcademique | null>(null);
  const [allMatieres, setAllMatieres] = useState<Matiere[]>([]);
  const [allClasses, setAllClasses] = useState<Classe[]>([]);
  const [allProfessors, setAllProfessors] = useState<User[]>([]);
  const [scheduleData, setScheduleData] = useState<Record<string, EmploiDuTempsEntry[]>>({});
  const [exceptionsData, setExceptionsData] = useState<ExceptionEmploiDuTempsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
const skeletonStyles = {
  header: "h-[72px]",
  stats: "h-[180px]",
  calendar: "min-h-[600px]"
};
  const handlePreviousWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
  const handleGoToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
 const daysOfWeek = useMemo(() => [
    t.schedule.days.monday,
    t.schedule.days.tuesday,
    t.schedule.days.wednesday,
    t.schedule.days.thursday,
    t.schedule.days.friday,
    t.schedule.days.saturday
  ], [t]);
  const currentWeekDaysInfo = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  }).map(date => {
    const dayKey = format(date, 'EEEE').toLowerCase() as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
    
    const dayOrderMap: { [key: string]: number } = {
      'monday': 0,
      'tuesday': 1,
      'wednesday': 2,
      'thursday': 3,
      'friday': 4,
      'saturday': 5,
    };
    
    return {
      date,
      dayNameCapitalized: dayKey.charAt(0).toUpperCase() + dayKey.slice(1),
      dayNameDisplay: t.schedule.days[dayKey] || dayKey,
      dayOrder: dayOrderMap[dayKey],
      isToday: isSameDay(date, new Date()),
    };
  }).filter(dayInfo => dayInfo.dayOrder !== undefined)
    .sort((a, b) => isRTL ? b.dayOrder - a.dayOrder : a.dayOrder - b.dayOrder);

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        if (!user || user.role !== 'professeur') {
          return;
        }

        const profIdNum = typeof user.id === 'string' ? parseInt(user.id) : user.id;
        if (isNaN(profIdNum)) {
          setError(t.common.invalidAssignment);
          return;
        }

        setProfessorId(profIdNum);
        setProfessorName(`${user.prenom} ${user.nom}`);

        const [anneesRes, matieresRes, classesRes, usersRes] = await Promise.all([
          fetch(`${API_URL}/api/annees-academiques`).then(res => res.json()),
          fetch(`${API_URL}/api/matieres`).then(res => res.json()),
          fetch(`${API_URL}/api/classes`).then(res => res.json()),
          fetch(`${API_URL}/api/users`).then(res => res.json()),
        ]);

        setAllMatieres(matieresRes);
        setAllClasses(classesRes);
        setAllProfessors(usersRes.filter((u: User) => u.role === 'professeur'));

        const currentYear = new Date().getFullYear();
        const activeAnnee = anneesRes.find((an: AnneeAcademique) =>
          new Date(an.date_debut).getFullYear() <= currentYear &&
          new Date(an.date_fin).getFullYear() >= currentYear
        ) || anneesRes[0];

        setCurrentAnneeAcademique(activeAnnee);
      } catch (err) {
        console.log('ERROR:', t.schedule.errorLoading, err);
        toast({
          title: t.common.error,
          description: t.schedule.errorLoading,
          variant: "destructive",
        });
        setError(t.schedule.errorLoading);
      }
    };

    initializeData();
  }, [t, user]);

  const fetchProfessorSchedule = useCallback(async () => {
    if (!professorId || !currentAnneeAcademique) {
      setScheduleData({});
      setExceptionsData([]);
      return;
    }

    setLoading(true); // Set loading for data fetching
    setError(null);

    try {
      const scheduleRes: EmploiDuTempsEntry[] = await fetch(
        `${API_URL}/api/emploi-du-temps?professeur_id=${professorId}&annee_academique_id=${currentAnneeAcademique.id}`
      ).then(res => res.json());

      // Utiliser une liste fixe de jours en français pour correspondre à la base de données
      const frenchDaysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const groupedSchedule: Record<string, EmploiDuTempsEntry[]> = {};
      frenchDaysOfWeek.forEach(day => {
        groupedSchedule[day] = scheduleRes.filter(entry => entry.jour === day) || [];
      });
      setScheduleData(groupedSchedule);

      const weekStartDate = format(currentWeekStart, 'yyyy-MM-dd');
      const weekEndDate = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

      const exceptionsRes: ExceptionEmploiDuTempsEntry[] = await fetch(
        `${API_URL}/api/exception-emploi-du-temps?professeur_id=${professorId}&start_date=${weekStartDate}&end_date=${weekEndDate}`
      ).then(res => res.json());
      setExceptionsData(exceptionsRes);
    } catch (err) {
      console.log('ERROR:', t.schedule.errorLoading, err);
      toast({
        title: t.common.error,
        description: t.schedule.errorLoading,
        variant: "destructive",
      });
      setError(t.schedule.errorLoading);
    } finally {
      setLoading(false);
    }
  }, [professorId, currentAnneeAcademique, currentWeekStart, t]);

  useEffect(() => {
    if (professorId && currentAnneeAcademique) {
      fetchProfessorSchedule();
    }
  }, [fetchProfessorSchedule, professorId, currentAnneeAcademique]);

  const getSessionDisplayData = (day: string, date: Date, timeSlot: string): SessionDisplayData | null => {
    if (!currentAnneeAcademique) return null;

    const dayMapping: { [key: string]: EmploiDuTempsEntry['jour'] } = {
      'Monday': 'Lundi',
      'Tuesday': 'Mardi',
      'Wednesday': 'Mercredi',
      'Thursday': 'Jeudi',
      'Friday': 'Vendredi',
      'Saturday': 'Samedi',
    };
    const frenchDay = dayMapping[day as keyof typeof dayMapping];
    if (!frenchDay) return null;

    const [startHourStr, endHourStr] = timeSlot.split('-');
    const heureDebutFormatted = format(parseISO(`2000-01-01T${startHourStr}`), 'HH:mm:ss');
    const heureFinFormatted = format(parseISO(`2000-01-01T${endHourStr}`), 'HH:mm:ss');

    const relevantException = exceptionsData.find(ex =>
      isSameDay(parseISO(ex.date_exception), date) &&
      ex.jour === frenchDay &&
      ex.heure_debut === heureDebutFormatted &&
      ex.heure_fin === heureFinFormatted &&
      (ex.professeur_id === professorId || ex.professeur_id === null)
    );

    if (relevantException) {
      if (relevantException.type_exception === 'annulation') {
        const baseEntryForCancellation = scheduleData[frenchDay]?.find(base =>
          base.heure_debut === heureDebutFormatted &&
          base.heure_fin === heureFinFormatted &&
          base.professeur_id === professorId
        );
        const className = baseEntryForCancellation ? allClasses.find(c => c.id === baseEntryForCancellation.classe_id)?.nom || 'N/A' : 'N/A';
        const subjectName = baseEntryForCancellation ? allMatieres.find(m => m.id === baseEntryForCancellation.matiere_id)?.nom || t.schedule.status.canceled : t.schedule.status.canceled;
        return {
          id: relevantException.id,
          type: 'exception',
          subjectName: subjectName,
          className: className,
          teacherName: `${t.schedule.reason}: ${relevantException.motif || t.common.unknown}`,
          isCanceled: true,
          exceptionType: relevantException.type_exception,
          originalBaseEntryId: baseEntryForCancellation?.id,
        };
      } else if (relevantException.type_exception === 'jour_ferie') {
        return {
          id: relevantException.id,
          type: 'exception',
          subjectName: t.schedule.exceptionTypes.jour_ferie,
          className: relevantException.classe_id ? allClasses.find(c => c.id === relevantException.classe_id)?.nom || 'N/A' : t.common.allClasses,
          teacherName: `${t.schedule.reason}: ${relevantException.motif || t.common.unknown}`,
          isCanceled: false,
          exceptionType: relevantException.type_exception,
        };
      } else {
        const matiere = allMatieres.find(m => m.id === relevantException.nouvelle_matiere_id);
        const prof = allProfessors.find(p => p.id === relevantException.nouveau_professeur_id);
        const classe = allClasses.find(c => c.id === relevantException.nouvelle_classe_id || relevantException.classe_id);

        return {
          id: relevantException.id,
          type: 'exception',
          subjectName: matiere?.nom || t.common.unknownSubject,
          className: classe?.nom || t.common.unknownClass,
          teacherName: prof ? `${prof.prenom} ${prof.nom}` : t.common.unknownTeacher,
          isCanceled: false,
          exceptionType: relevantException.type_exception,
          originalBaseEntryId: relevantException.classe_id ? scheduleData[frenchDay]?.find(base =>
            base.heure_debut === heureDebutFormatted &&
            base.heure_fin === heureFinFormatted &&
            base.professeur_id === professorId &&
            base.classe_id === relevantException.classe_id
          )?.id : undefined,
        };
      }
    }

    const baseEntry = scheduleData[frenchDay]?.find(entry =>
      entry.heure_debut === heureDebutFormatted &&
      entry.heure_fin === heureFinFormatted &&
      entry.professeur_id === professorId
    );

    if (baseEntry) {
      const matiere = allMatieres.find(m => m.id === baseEntry.matiere_id);
      const classe = allClasses.find(c => c.id === baseEntry.classe_id);
      const prof = allProfessors.find(p => p.id === baseEntry.professeur_id);

      if (matiere && classe && prof) {
        return {
          id: baseEntry.id,
          type: 'base',
          subjectName: matiere.nom,
          className: classe.nom,
          teacherName: `${prof.prenom} ${prof.nom}`,
          isCanceled: false,
        };
      }
    }

    return null;
  };

  const totalHours = Object.values(scheduleData).reduce((acc, daySchedule) => {
    if (!Array.isArray(daySchedule)) return acc;
    return acc + daySchedule.length;
  }, 0);

  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="h-20 w-20 text-blue-600 animate-spin-slow drop-shadow-md" />
        <p className="mt-8 text-2xl font-semibold text-gray-800 dark:text-gray-800">
          {t.common.loadingInitialData}
        </p>
      </div>
    );
  }

  const uniqueClasses = new Set<string>();
  Object.values(scheduleData).forEach(daySchedule => {
    if (Array.isArray(daySchedule)) {
      daySchedule.forEach(session => {
        const classe = allClasses.find(c => c.id === session.classe_id);
        if (classe) uniqueClasses.add(classe.nom);
      });
    }
  });

  if (!user || user.role !== 'professeur') {
    return (
      <div className="p-10 text-center bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-xl shadow-lg m-6">
        <p className="font-extrabold text-3xl text-yellow-700 dark:text-yellow-200 mb-4">{t.common.accessDenied}</p>
        <p className="text-xl text-yellow-600 dark:text-yellow-300 mb-6">{t.userManagement.teachersOnly}</p>
        <Button 
          onClick={() => window.location.href = '/login'} 
          className="bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-800 dark:hover:bg-yellow-900 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
        >
          <Users className="h-5 w-5 mr-2" /> {t.login.button}
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-xl shadow-lg m-6">
        <p className="font-extrabold text-3xl text-red-700 dark:text-red-200 mb-4">{t.common.error}</p>
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
    <div className={`min-h-screen p-6 md:p-4 bg-gray-50 dark:bg-gray-900 pb-[env(safe-area-inset-bottom)] ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 p-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
  <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight drop">
    {t.schedule.title} <span className="text-blue-700 dark:text-blue-400"></span>
  </h1>
  
  {/* Modifier cette partie pour la version mobile */}
  <div className={`flex flex-col ${isRTL ? 'items-end' : 'items-start'} w-full md:w-auto md:flex-row md:items-center gap-3 bg-gray-50/50 dark:bg-gray-700/50 p-3 rounded-xl`}>
    <div className="flex items-center gap-3 w-full justify-between md:justify-normal">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePreviousWeek}
        className="rounded-full shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-x-1 hover:bg-blue-100 dark:hover:bg-blue-900"
      >
        {isRTL ? <ChevronRight className="h-5 w-5 text-gray-700 dark:text-gray-300" /> : <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />}
      </Button>
      
      <span className="font-extrabold text-lg md:text-xl text-gray-800 dark:text-white select-none mx-2 text-center">
        {format(currentWeekStart, 'dd MMMM', { locale: currentLocale })} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'dd MMMM', { locale: currentLocale })}
      </span>
      
      <Button
        variant="outline"
        size="icon"
        onClick={handleNextWeek}
        className="rounded-full shadow-md hover:shadow-lg transition-all duration-300 transform hover:translate-x-1 hover:bg-blue-100 dark:hover:bg-blue-900"
      >
        {isRTL ? <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" /> : <ChevronRight className="h-5 w-5 text-gray-700 dark:text-gray-300" />}
      </Button>
    </div>
    
    <Button
      variant="default"
      size="sm"
      onClick={handleGoToToday}
      className={`mt-3 md:mt-0 md:ml-6 bg-blue-600 hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-900 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 flex items-center w-full md:w-auto justify-center`}
    >
      <CalendarCheck className="h-4 w-4 mr-2" /> {t.schedule.weekNavigation}
    </Button>
  </div>
</div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
  <StatCard
    icon={<Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />}
    title={t.dashboard.stats.weeklySlots}
    value={totalHours}
    color="bg-blue-100 dark:bg-blue-900/30"
  />
  <StatCard
    icon={<School className="h-8 w-8 text-purple-600 dark:text-purple-400" />}
    title={t.dashboard.stats.numberOfClasses}
    value={uniqueClasses.size}
    color="bg-purple-100 dark:bg-purple-900/30"
  />
  <StatCard
    icon={<BarChart2 className="h-8 w-8 text-orange-600 dark:text-orange-400" />}
    title={t.dashboard.stats.schoolYear}
    value={currentAnneeAcademique?.libelle || t.common.unknownYear}
    color="bg-orange-100 dark:bg-orange-900/30"
  />
</div>

      <Card className="shadow-2xl border border-gray-100 dark:border-gray-700 rounded-3xl overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-md">
        <CardHeader className="border-b border-gray-200 dark:border-gray-600 pb-5 pt-6 px-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white drop-shadow-sm">
            {t.schedule.currentSchedule}
          </CardTitle>
          
        </CardHeader>
        <CardContent className="pt-6 px-6">
          <ScrollArea className="w-full h-[700px] rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-inner p-4">
            {/* Desktop View */}
            <div className="hidden lg:block min-w-[1200px]">
              <div className={`grid ${isRTL ? 'grid-cols-[1fr_100px]' : 'grid-cols-[100px_1fr]'} gap-4 mb-4`}>
                {isRTL ? (
                  <>
                    <div className="grid grid-cols-6 gap-4">
                      {currentWeekDaysInfo.map(dayInfo => (
                        <div 
                          key={dayInfo.dayNameCapitalized} 
                          className={cn(
                            "text-center font-extrabold text-xl p-3 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-800 z-10 shadow-sm",
                            dayInfo.isToday ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-t-xl border-blue-200 dark:border-blue-700 shadow-lg' : 'text-gray-800 dark:text-gray-200',
                            isRTL ? 'text-right' : 'text-left'
                          )}
                        >
                          {dayInfo.dayNameDisplay}
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                            {format(dayInfo.date, 'dd/MM')}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="font-bold text-gray-700 dark:text-gray-300 sticky left-0 top-0 bg-white dark:bg-gray-800 z-20 p-3 border-b border-gray-200 dark:border-gray-600 text-base shadow-sm">
                      {t.common.hours}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-bold text-gray-700 dark:text-gray-300 sticky left-0 top-0 bg-white dark:bg-gray-800 z-20 p-3 border-b border-gray-200 dark:border-gray-600 text-base shadow-sm">
                      {t.common.hours}
                    </div>
                    <div className="grid grid-cols-6 gap-4">
                      {currentWeekDaysInfo.map(dayInfo => (
                        <div 
                          key={dayInfo.dayNameCapitalized} 
                          className={cn(
                            "text-center font-extrabold text-xl p-3 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-800 z-10 shadow-sm",
                            dayInfo.isToday ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-t-xl border-blue-200 dark:border-blue-700 shadow-lg' : 'text-gray-800 dark:text-gray-200'
                          )}
                        >
                          {dayInfo.dayNameDisplay}
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                            {format(dayInfo.date, 'dd/MM')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {timeSlots.map(timeSlot => (
                <React.Fragment key={timeSlot}>
                  <div className={`grid ${isRTL ? 'grid-cols-[1fr_100px]' : 'grid-cols-[100px_1fr]'} gap-4 mb-4`}>
                    {isRTL ? (
                      <>
                        <div className="grid grid-cols-6 gap-4">
                          {currentWeekDaysInfo.map(dayInfo => {
                            const sessionDisplayData = getSessionDisplayData(dayInfo.dayNameCapitalized, dayInfo.date, timeSlot);

                            return (
                              <div key={`${dayInfo.dayNameCapitalized}-${timeSlot}`} className="p-2">
                                {sessionDisplayData ? (
                                  <SessionCard session={sessionDisplayData} />
                                ) : (
                                  <EmptySlot />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-base font-semibold text-gray-800 dark:text-gray-200 py-4 flex items-center sticky left-0 bg-white dark:bg-gray-800 z-10 px-4 rounded-l-lg border-r border-gray-200 dark:border-gray-600 shadow-sm">
                          {timeSlot.substring(0, 5)} - {timeSlot.substring(timeSlot.length - 8, timeSlot.length - 3)}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-base font-semibold text-gray-800 dark:text-gray-200 py-4 flex items-center sticky left-0 bg-white dark:bg-gray-800 z-10 px-4 rounded-l-lg border-r border-gray-200 dark:border-gray-600 shadow-sm">
                          {timeSlot.substring(0, 5)} - {timeSlot.substring(timeSlot.length - 8, timeSlot.length - 3)}
                        </div>
                        <div className="grid grid-cols-6 gap-4">
                          {currentWeekDaysInfo.map(dayInfo => {
                            const sessionDisplayData = getSessionDisplayData(dayInfo.dayNameCapitalized, dayInfo.date, timeSlot);

                            return (
                              <div key={`${dayInfo.dayNameCapitalized}-${timeSlot}`} className="p-2">
                                {sessionDisplayData ? (
                                  <SessionCard session={sessionDisplayData} />
                                ) : (
                                  <EmptySlot />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </React.Fragment>
              ))}
            </div>

           {/* Mobile View */}
<div className="lg:hidden pb-[env(safe-area-inset-bottom)">
  {(isRTL ? [...currentWeekDaysInfo].reverse() : currentWeekDaysInfo).map(dayInfo => (
    <div key={dayInfo.dayNameCapitalized} className="mb-8">
      <div className={cn(
        "text-lg font-bold mb-4 sticky top-0 py-3 z-10 border-b",
        dayInfo.isToday 
          ? 'bg-blue-600 text-white dark:bg-blue-800' 
          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
        'border-gray-200 dark:border-gray-600 text-center'
      )}>
        {dayInfo.dayNameDisplay}
        <div className="text-sm font-medium">
          {format(dayInfo.date, 'dd/MM')}
        </div>
      </div>

      <div className="space-y-4">
        {timeSlots.map(timeSlot => {
          const sessionDisplayData = getSessionDisplayData(dayInfo.dayNameCapitalized, dayInfo.date, timeSlot);
          
          return (
            <div key={timeSlot} className="flex flex-col gap-2">
              <div className={`text-sm font-medium text-gray-600 dark:text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}>
                {timeSlot.substring(0, 5)} - {timeSlot.substring(timeSlot.length - 8, timeSlot.length - 3)}
              </div>
              <div className="min-h-[100px]">
                {sessionDisplayData ? (
                  <SessionCard session={sessionDisplayData} />
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