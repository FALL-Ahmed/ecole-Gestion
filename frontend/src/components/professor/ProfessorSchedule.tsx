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
import { fr } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

// API Configuration
const API_BASE_URL = 'http://localhost:3000';

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
const daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const SessionCard: React.FC<{ session: SessionDisplayData }> = ({ session }) => {
  let bgColor = 'bg-gradient-to-br from-blue-500 to-indigo-600';
  let textColor = 'text-white';
  let badgeClasses = 'bg-white/30 text-white backdrop-blur-sm';
  let icon = <BookOpen className="h-5 w-5 text-white" />;
  let cardClasses = 'relative overflow-hidden group';
  let border = 'border-l-4 border-blue-300';
  let statusText = '';
  let statusIcon = null;

  if (session.type === 'exception') {
    if (session.isCanceled) {
      bgColor = 'bg-gradient-to-br from-red-500 to-rose-600';
      badgeClasses = 'bg-red-200/50 text-red-900 backdrop-blur-sm';
      icon = <XCircle className="h-5 w-5 text-red-100" />;
      cardClasses += ' line-through opacity-70';
      border = 'border-l-4 border-red-300';
      statusText = 'Annulé';
      statusIcon = <XCircle className="h-4 w-4 mr-1" />;
    } else if (session.exceptionType === 'jour_ferie') {
      bgColor = 'bg-gradient-to-br from-green-500 to-emerald-600';
      badgeClasses = 'bg-green-200/50 text-green-900 backdrop-blur-sm';
      icon = <CalendarDays className="h-5 w-5 text-green-100" />;
      border = 'border-l-4 border-green-300';
      statusText = 'Férié';
      statusIcon = <CalendarDays className="h-4 w-4 mr-1" />;
    } else {
      bgColor = 'bg-gradient-to-br from-yellow-400 to-orange-500';
      badgeClasses = 'bg-yellow-200/50 text-orange-900 backdrop-blur-sm';
      textColor = 'text-gray-900';
      icon = <RefreshCw className="h-5 w-5 text-yellow-900" />;
      border = 'border-l-4 border-orange-300';
      statusText = session.exceptionType === 'remplacement_prof'
        ? 'Remplacement'
        : session.exceptionType === 'deplacement_cours'
          ? 'Déplacé'
          : 'Événement';
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

const EmptySlot: React.FC = () => (
  <div className="bg-gray-100 border border-dashed border-gray-300 rounded-lg p-3 h-full flex items-center justify-center text-gray-400 text-sm italic shadow-inner">
    Aucun cours
  </div>
);

const StatCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string | number;
  color: string;
}> = ({ icon, title, value, color }) => (
  <Card className="flex items-center p-5 border border-gray-100 rounded-xl bg-white transform transition-transform duration-300 hover:scale-[1.02]">
    <div className={`p-4 rounded-full mr-4 ${color} bg-opacity-30 flex items-center justify-center`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
  </Card>
);

export function ProfessorSchedule() {
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

  const handlePreviousWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
  const handleGoToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const currentWeekDaysInfo = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  }).map(date => ({
    date,
    dayName: format(date, 'EEEE', { locale: fr }),
    dayNameCapitalized: format(date, 'EEEE', { locale: fr }).charAt(0).toUpperCase() + format(date, 'EEEE', { locale: fr }).slice(1),
  })).filter(dayInfo => daysOfWeek.includes(dayInfo.dayNameCapitalized));

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      setError(null);
      try {
        const userString = localStorage.getItem('user');
        if (!userString) {
          setError("Informations d'utilisateur introuvables. Veuillez vous reconnecter.");
          setLoading(false);
          return;
        }
        const user: User = JSON.parse(userString);

        if (user.role !== 'professeur' || !user.id) {
          setError("Accès refusé : L'utilisateur n'est pas un professeur ou l'ID est manquant.");
          setLoading(false);
          return;
        }

        const profIdNum = typeof user.id === 'string' ? parseInt(user.id) : user.id;
        if (isNaN(profIdNum)) {
          setError("ID de professeur invalide.");
          setLoading(false);
          return;
        }

        setProfessorId(profIdNum);
        setProfessorName(`${user.prenom} ${user.nom}`);

        const [anneesRes, matieresRes, classesRes, usersRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/annees-academiques`).then(res => res.json()),
          fetch(`${API_BASE_URL}/api/matieres`).then(res => res.json()),
          fetch(`${API_BASE_URL}/api/classes`).then(res => res.json()),
          fetch(`${API_BASE_URL}/api/users`).then(res => res.json()),
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
        console.error("Erreur lors de l'initialisation des données:", err);
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger les données initiales.",
          variant: "destructive",
        });
        setError("Échec du chargement des données initiales. Veuillez réessayer.");
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  const fetchProfessorSchedule = useCallback(async () => {
    if (!professorId || !currentAnneeAcademique) {
      setScheduleData({});
      setExceptionsData([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const scheduleRes: EmploiDuTempsEntry[] = await fetch(
        `${API_BASE_URL}/api/emploi-du-temps?professeur_id=${professorId}&annee_academique_id=${currentAnneeAcademique.id}`
      ).then(res => res.json());

      const groupedSchedule: Record<string, EmploiDuTempsEntry[]> = {};
      daysOfWeek.forEach(day => {
        groupedSchedule[day] = scheduleRes.filter(entry => entry.jour === day);
      });
      setScheduleData(groupedSchedule);

      const weekStartDate = format(currentWeekStart, 'yyyy-MM-dd');
      const weekEndDate = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

      const exceptionsRes: ExceptionEmploiDuTempsEntry[] = await fetch(
        `${API_BASE_URL}/api/exception-emploi-du-temps?professeur_id=${professorId}&start_date=${weekStartDate}&end_date=${weekEndDate}`
      ).then(res => res.json());
      setExceptionsData(exceptionsRes);
    } catch (err) {
      console.error("Échec du chargement de l'emploi du temps:", err);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger votre emploi du temps.",
        variant: "destructive",
      });
      setError("Impossible de charger votre emploi du temps.");
    } finally {
      setLoading(false);
    }
  }, [professorId, currentAnneeAcademique, currentWeekStart]);

  useEffect(() => {
    if (professorId && currentAnneeAcademique) {
      fetchProfessorSchedule();
    }
  }, [fetchProfessorSchedule, professorId, currentAnneeAcademique]);

  const getSessionDisplayData = (day: string, date: Date, timeSlot: string): SessionDisplayData | null => {
    if (!currentAnneeAcademique) return null;

    const [startHourStr, endHourStr] = timeSlot.split('-');
    const heureDebutFormatted = format(parseISO(`2000-01-01T${startHourStr}`), 'HH:mm:ss');
    const heureFinFormatted = format(parseISO(`2000-01-01T${endHourStr}`), 'HH:mm:ss');

    const relevantException = exceptionsData.find(ex =>
      isSameDay(parseISO(ex.date_exception), date) &&
      ex.jour === day &&
      ex.heure_debut === heureDebutFormatted &&
      ex.heure_fin === heureFinFormatted &&
      (ex.professeur_id === professorId || ex.professeur_id === null)
    );

    if (relevantException) {
      if (relevantException.type_exception === 'annulation') {
        const baseEntryForCancellation = scheduleData[day]?.find(base =>
          base.heure_debut === heureDebutFormatted &&
          base.heure_fin === heureFinFormatted &&
          base.professeur_id === professorId
        );
        const className = baseEntryForCancellation ? allClasses.find(c => c.id === baseEntryForCancellation.classe_id)?.nom || 'N/A' : 'N/A';
        const subjectName = baseEntryForCancellation ? allMatieres.find(m => m.id === baseEntryForCancellation.matiere_id)?.nom || 'Cours Annulé' : 'Cours Annulé';
        return {
          id: relevantException.id,
          type: 'exception',
          subjectName: subjectName,
          className: className,
          teacherName: `Motif: ${relevantException.motif || 'Non spécifié'}`,
          isCanceled: true,
          exceptionType: relevantException.type_exception,
          originalBaseEntryId: baseEntryForCancellation?.id,
        };
      } else if (relevantException.type_exception === 'jour_ferie') {
        return {
          id: relevantException.id,
          type: 'exception',
          subjectName: 'Jour Férié',
          className: relevantException.classe_id ? allClasses.find(c => c.id === relevantException.classe_id)?.nom || 'N/A' : 'Toutes les classes',
          teacherName: `Motif: ${relevantException.motif || 'Non spécifié'}`,
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
          subjectName: matiere?.nom || 'Matière inconnue',
          className: classe?.nom || 'Classe inconnue',
          teacherName: prof ? `${prof.prenom} ${prof.nom}` : 'Prof. inconnu',
          isCanceled: false,
          exceptionType: relevantException.type_exception,
          originalBaseEntryId: relevantException.classe_id ? scheduleData[day]?.find(base =>
            base.heure_debut === heureDebutFormatted &&
            base.heure_fin === heureFinFormatted &&
            base.professeur_id === professorId &&
            base.classe_id === relevantException.classe_id
          )?.id : undefined,
        };
      }
    }

    const baseEntry = scheduleData[day]?.find(entry =>
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

  const uniqueClasses = new Set<string>();
  Object.values(scheduleData).forEach(daySchedule => {
    if (Array.isArray(daySchedule)) {
      daySchedule.forEach(session => {
        const classe = allClasses.find(c => c.id === session.classe_id);
        if (classe) uniqueClasses.add(classe.nom);
      });
    }
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100 animate-pulse-background">
        <Loader2 className="h-20 w-20 text-blue-600 animate-spin-slow drop-shadow-md" />
        <p className="mt-8 text-2xl font-semibold text-gray-800 animate-bounce-text">
          Chargement de votre emploi du temps...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center bg-red-100 border border-red-300 rounded-xl shadow-lg m-6">
        <p className="font-extrabold text-3xl text-red-700 mb-4">Erreur de chargement !</p>
        <p className="text-xl text-red-600 mb-6">{error}</p>
        <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105">
          <RefreshCw className="h-5 w-5 mr-2" /> Recharger la page
        </Button>
      </div>
    );
  }

  if (!professorId) {
    return (
      <div className="p-10 text-center bg-yellow-100 border border-yellow-300 rounded-xl shadow-lg m-6">
        <p className="font-extrabold text-3xl text-yellow-700 mb-4">Accès non autorisé</p>
        <p className="text-xl text-yellow-600 mb-6">Votre ID de professeur n'a pas été trouvé. Veuillez vous assurer que vous êtes connecté en tant que professeur.</p>
        <Button onClick={() => window.location.href = '/login'} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105">
          <Users className="h-5 w-5 mr-2" /> Aller à la page de connexion
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight drop">
          Emploi du Temps de <span className="text-blue-700">{professorName || "Professeur"}</span>
        </h1>
        <div className="flex items-center gap-3 bg-gray-50/50 p-3 rounded-xl">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreviousWeek}
            className="rounded-full shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-x-1 hover:bg-blue-100"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </Button>
          <span className="font-extrabold text-xl text-gray-800 select-none mx-2">
            {format(currentWeekStart, 'dd MMMM', { locale: fr })} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'dd MMMM', { locale: fr })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextWeek}
            className="rounded-full shadow-md hover:shadow-lg transition-all duration-300 transform hover:translate-x-1 hover:bg-blue-100"
          >
            <ChevronRight className="h-5 w-5 text-gray-700" />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleGoToToday}
            className="ml-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 flex items-center"
          >
            <CalendarCheck className="h-4 w-4 mr-2" /> Aujourd'hui
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <StatCard
          icon={<Clock className="h-8 w-8 text-blue-600" />}
          title="Créneaux par semaine"
          value={totalHours}
          color="bg-blue-100"
        />
        <StatCard
          icon={<Users className="h-8 w-8 text-purple-600" />}
          title="Classes enseignées"
          value={uniqueClasses.size}
          color="bg-purple-100"
        />
        <StatCard
          icon={<BarChart2 className="h-8 w-8 text-orange-600" />}
          title="Année Académique"
          value={currentAnneeAcademique?.libelle || "Non définie"}
          color="bg-orange-100"
        />
      </div>

      <Card className="shadow-2xl border border-gray-100 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-md">
        <CardHeader className="border-b border-gray-200 pb-5 pt-6 px-6 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="text-2xl font-bold text-gray-900 drop-shadow-sm">Votre Planning Hebdomadaire</CardTitle>
          <CardDescription className="text-lg text-gray-700 mt-2">Visualisez vos cours pour la semaine et les jours fériés.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 px-6">
          <ScrollArea className="w-full h-[700px] rounded-2xl border border-gray-200 bg-white shadow-inner p-4">
            <div className="min-w-[1200px] grid grid-cols-7 gap-4">
              <div className="font-bold text-gray-700 sticky left-0 top-0 bg-white z-20 p-3 border-b border-gray-200 text-base shadow-sm">Heure</div>
              {currentWeekDaysInfo.map(dayInfo => (
                <div key={dayInfo.dayNameCapitalized} className={cn(
                  "text-center font-extrabold text-xl text-gray-800 p-3 border-b border-gray-200 sticky top-0 bg-white z-10 shadow-sm",
                  isToday(dayInfo.date) ? 'text-blue-700 bg-blue-50 rounded-t-xl border-blue-200 shadow-lg' : ''
                )}>
                  {dayInfo.dayNameCapitalized}
                  <div className="text-sm font-medium text-gray-500 mt-1">{format(dayInfo.date, 'dd/MM')}</div>
                </div>
              ))}

              {timeSlots.map(timeSlot => (
                <React.Fragment key={timeSlot}>
                  <div className="text-base font-semibold text-gray-800 py-4 flex items-center sticky left-0 bg-white z-10 px-4 rounded-l-lg border-r border-gray-200 shadow-sm">
                    {timeSlot.substring(0, 5)} - {timeSlot.substring(timeSlot.length - 8, timeSlot.length - 3)}
                  </div>
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
                </React.Fragment>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
