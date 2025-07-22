import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Save, ChevronLeft, ChevronRight, Trash2, CalendarX, PlusCircle, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import { Locale } from 'date-fns';
import {
  format,
  parseISO,
  startOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  endOfWeek,
  isSameDay,
} from 'date-fns';
import { fr, ar } from 'date-fns/locale';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface AnneeAcademique { id: number; libelle: string; date_debut: string; date_fin: string; }
interface Classe { id: number; nom: string; niveau: string; annee_scolaire_id: number; }
interface Matiere { id: number; nom: string; code?: string; }
interface User { id: number; nom: string; prenom: string; email: string; role: 'admin' | 'eleve' | 'professeur' | 'tuteur'; }
type FrenchDay = 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi';

interface Affectation { id: number; professeur: User; matiere: Matiere; classe: Classe; annee_scolaire: AnneeAcademique; }
interface EmploiDuTempsEntry {
  id: number;
  jour: FrenchDay; // Toujours en français dans la base
  heure_debut: string;
  heure_fin: string;
  classe_id: number;
  matiere_id: number;
  professeur_id: number;
}
interface Trimestre {
  id: number;
  nom: string;
  date_debut: string;
  date_fin: string;
  anneeScolaire: {
    id: number;
  };
}
interface ExceptionEmploiDuTempsEntry {
  id: number;
  date_exception: string;
  jour: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi';
  heure_debut: string;
  heure_fin: string;
  classe_id: number | null;
  professeur_id: number | null;
  type_exception: 'annulation' | 'remplacement_prof' | 'deplacement_cours' | 'jour_ferie' | 'evenement_special';
  nouvelle_matiere_id: number | null;
  nouveau_professeur_id: number | null;
  nouvelle_heure_debut: string | null;
  nouvelle_heure_fin: string | null;
  nouveau_jour: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi' | null;
  nouvelle_classe_id: number | null;
  motif: string | null;
}

type ModalMode = 'add' | 'edit';
type ExceptionType = 'annulation' | 'remplacement_prof' | 'deplacement_cours' | 'jour_ferie' | 'evenement_special';
type ScheduleManagementMode = 'base' | 'exception';

const timeSlots = ['08:00-10:00', '10:15-12:00', '12:15-14:00'];

interface ScheduleItemData {
  subjectName: string;
  teacherName: string;
  isException?: boolean;
  isCanceled?: boolean;
  isBaseEntry: boolean;
  entryId: number;
  baseEntryId?: number;
  exceptionType?: ExceptionType;
}

interface ScheduleItemProps {
  day: string;
  date: Date;
  timeSlot: string;
  data?: ScheduleItemData;
  onItemClick: (day: string, date: Date, timeSlot: string, existingData?: ScheduleItemData) => void;
  scheduleMode: ScheduleManagementMode;
  scheduleView: string;
}

const ScheduleItem: React.FC<ScheduleItemProps> = ({ day, date, timeSlot, data, onItemClick, scheduleMode, scheduleView }) => {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  
 let bgColor = 'bg-gradient-to-r from-blue-400 to-blue-500 dark:from-blue-600 dark:to-blue-700';
let borderColor = 'border-blue-200 dark:border-blue-300';
let textColor = 'text-white';
  let cursorStyle = 'cursor-pointer hover:shadow-lg transform hover:scale-105 transition-transform duration-200';

  if (scheduleMode === 'exception') {
  if (data && data.isException) {
    if (data.isCanceled) {
      bgColor = 'bg-gradient-to-r from-red-400 to-red-500 dark:from-red-600 dark:to-red-700';
      borderColor = 'border-red-200 dark:border-red-300';
    } else if (data.exceptionType === 'jour_ferie') {
      bgColor = 'bg-gradient-to-r from-green-400 to-green-500 dark:from-green-600 dark:to-green-700';
      borderColor = 'border-green-200 dark:border-green-300';
    } else {
      bgColor = 'bg-gradient-to-r from-yellow-400 to-yellow-500 dark:from-yellow-600 dark:to-yellow-700';
      borderColor = 'border-yellow-200 dark:border-yellow-300';
    }
  } else if (data && !data.isException) {
    bgColor = 'bg-gradient-to-r from-blue-300 to-blue-400 dark:from-blue-500 dark:to-blue-600';
    borderColor = 'border-blue-300 dark:border-blue-400';
  } else {
    
  bgColor = 'bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600';
  borderColor = 'border-gray-300 dark:border-gray-600';
  textColor = 'text-gray-600 dark:text-gray-400';
}
}
 else {
    if (data) {
      bgColor = 'bg-gradient-to-r from-blue-400 to-blue-500';
      borderColor = 'border-blue-200';
      textColor = 'text-white';
    } else {
      bgColor = 'bg-gradient-to-r from-gray-200 to-gray-300';
      borderColor = 'border-gray-300';
      textColor = 'text-gray-600';
    }
  }

  if (scheduleMode === 'base' && scheduleView === 'teacher') {
    cursorStyle = 'cursor-not-allowed opacity-50';
  } else if (scheduleMode === 'base' && !data && (day === 'Dimanche')) {
    cursorStyle = 'cursor-not-allowed opacity-50';
  }

  const getSubjectDisplayName = (subjectName: string) => {
    const subjectTranslations: Record<string, string> = {
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
    return subjectTranslations[subjectName] || subjectName;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`${bgColor} ${borderColor} ${textColor} border rounded-lg p-4 h-full flex flex-col justify-between ${cursorStyle}`}
            onClick={() => onItemClick(day, date, timeSlot, data)}
            style={{ direction: isRTL ? 'rtl' : 'ltr' }}
          >
            {data ? (
              <>
                <p className="font-medium text-sm break-words">
                  {getSubjectDisplayName(data.subjectName)}
                </p>
                <p className="text-xs mt-1 break-words">{data.teacherName}</p>
                {data.isException && (
                  <Badge
                    variant="outline"
                    className={`mt-1 text-xs w-fit ${
                      data.isCanceled ? 'bg-red-100 text-red-800' :
                      data.exceptionType === 'jour_ferie' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {data.exceptionType === 'annulation' ? t.schedule.status.canceled :
                     data.exceptionType === 'jour_ferie' ? t.schedule.status.holiday :
                     data.exceptionType === 'remplacement_prof' ? t.schedule.status.replaced :
                     data.exceptionType === 'deplacement_cours' ? t.schedule.status.moved : 
                     t.schedule.status.special}
                  </Badge>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <PlusCircle className="h-4 w-4" />
              </div>
            )}
          </div>
        </TooltipTrigger>
<TooltipContent 
  side="top" 
  className="max-w-[200px] bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 shadow-lg">         {data ? (
            <>
              <p className="font-semibold">{getSubjectDisplayName(data.subjectName)}</p>
              <p>{data.teacherName}</p>
              {data.isException && (
                <p className="text-xs mt-1">
                  {data.exceptionType === 'annulation' ? t.schedule.exceptionTypes.annulation :
                   data.exceptionType === 'jour_ferie' ? t.schedule.exceptionTypes.jour_ferie :
                   data.exceptionType === 'remplacement_prof' ? t.schedule.exceptionTypes.remplacement_prof :
                   data.exceptionType === 'deplacement_cours' ? t.schedule.exceptionTypes.deplacement_cours : 
                   t.schedule.exceptionTypes.evenement_special}
                </p>
              )}
            </>
          ) : (
            <p>{t.common.add}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export function ScheduleManagement() {
  const { t, language } = useLanguage();
  const currentLocale = language === 'ar' ? ar : fr;
  const isRTL = language === 'ar';

  // États
  const [anneesAcademiques, setAnneesAcademiques] = useState<AnneeAcademique[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [emploisDuTemps, setEmploisDuTemps] = useState<EmploiDuTempsEntry[]>([]);
  const [exceptionsEmploisDuTemps, setExceptionsEmploisDuTemps] = useState<ExceptionEmploiDuTempsEntry[]>([]);
  const [trimestresAnnee, setTrimestresAnnee] = useState<Trimestre[]>([]);

  const [selectedAnneeAcademiqueId, setSelectedAnneeAcademiqueId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [scheduleView, setScheduleView] = useState<string>('class');
  const [scheduleMode, setScheduleMode] = useState<ScheduleManagementMode>('base');

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editingBaseEntryId, setEditingBaseEntryId] = useState<number | null>(null);
  const [editingExceptionId, setEditingExceptionId] = useState<number | null>(null);
const [currentModalDate, setCurrentModalDate] = useState<Date | null>(null);
  const [currentTimeSlot, setCurrentTimeSlot] = useState<string>('');

  const [formMatiereId, setFormMatiereId] = useState<string>('');
  const [formProfesseurId, setFormProfesseurId] = useState<string>('');
  const [formExceptionType, setFormExceptionType] = useState<ExceptionType>('remplacement_prof');
  const [formMotif, setFormMotif] = useState<string>('');

  const [filteredMatieres, setFilteredMatieres] = useState<Matiere[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const handleAnneeAcademiqueChange = (anneeId: string) => {
    setSelectedAnneeAcademiqueId(anneeId);
    // Réinitialiser la classe et le professeur pour forcer une nouvelle sélection
    // qui correspond à la nouvelle année.
    setSelectedClassId('');
    setSelectedTeacherId('');
    setEmploisDuTemps([]);
    setExceptionsEmploisDuTemps([]);
  };
  const convertToFrenchDay = (date: Date): FrenchDay => {
  const dayMap: Record<string, FrenchDay> = {
    'Monday': 'Lundi',
    'Tuesday': 'Mardi',
    'Wednesday': 'Mercredi',
    'Thursday': 'Jeudi',
    'Friday': 'Vendredi',
    'Saturday': 'Samedi'
  };
  const englishDay = format(date, 'EEEE');
  return dayMap[englishDay];
};

const getLocalizedDayName = (date: Date, locale: Locale): string => {
  return format(date, 'EEEE', { locale });
};
// Fonction helper pour formater l'affichage des années académiques
const formatAcademicYearDisplay = (annee: { libelle: string; date_debut: string; date_fin: string }): string => {
  if (!annee || !annee.date_debut || !annee.date_fin) {
    return annee?.libelle || t.common.unknownYear;
  }
  
  const startYear = new Date(annee.date_debut).getFullYear();
  const endYear = new Date(annee.date_fin).getFullYear();
  
  // Formatage selon la langue
  if (language === 'ar') {
    return annee.libelle || `${startYear}-${endYear}`;
  }
  
  return annee.libelle?.includes(String(startYear)) 
    ? annee.libelle 
    : `${annee.libelle || ''} (${startYear}-${endYear})`.trim();
};
  // Navigation de la semaine
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handlePreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));

  const getDayNames = () => {
    return [
        t.schedule.days.monday,
        t.schedule.days.tuesday,
        t.schedule.days.wednesday,
        t.schedule.days.thursday,
        t.schedule.days.friday,
        t.schedule.days.saturday
    ];
};

 const currentWeekDaysInfo = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  }).map(date => {
    // Using English day name for logic is more robust for keys.
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
        dayNameCapitalized: dayKey.charAt(0).toUpperCase() + dayKey.slice(1), // e.g., "Monday"
        dayNameDisplay: t.schedule.days[dayKey] || dayKey, // Translated name
        dayOrder: dayOrderMap[dayKey],
        isToday: isSameDay(date, new Date()),
    };
  }).filter(dayInfo => dayInfo.dayOrder !== undefined) // This will filter out Sunday
    .sort((a, b) => isRTL ? b.dayOrder - a.dayOrder : a.dayOrder - b.dayOrder);

  // Récupération des données initiales
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [
          anneesRes,
          classesRes,
          matieresRes,
          usersRes,
          affectationsRes,
        ] = await Promise.all([
          fetch(`${API_URL}/api/annees-academiques`).then(res => res.json()),
          fetch(`${API_URL}/api/classes`).then(res => res.json()),
          fetch(`${API_URL}/api/matieres`).then(res => res.json()),
          fetch(`${API_URL}/api/users`).then(res => res.json()),
          fetch(`${API_URL}/api/affectations`).then(res => res.json()),
        ]);

        setAnneesAcademiques(anneesRes);
        setClasses(classesRes);
        setMatieres(matieresRes);

        const teachersData = usersRes.filter((user: User) => user.role === 'professeur');
        setTeachers(teachersData);
        setAffectations(affectationsRes);

        if (anneesRes.length > 0) {
          setSelectedAnneeAcademiqueId(String(anneesRes[0].id));
          const initialClasses = classesRes.filter((cls: Classe) => cls.annee_scolaire_id === anneesRes[0].id);
          if (initialClasses.length > 0) setSelectedClassId(String(initialClasses[0].id));
        }

        if (teachersData.length > 0) setSelectedTeacherId(String(teachersData[0].id));

      } catch (error) {
        toast({
          title: t.common.error,
          description: t.schedule.errorLoading,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  
  // Récupération des trimestres de l'année sélectionnée
  useEffect(() => {
    if (selectedAnneeAcademiqueId) {
      const fetchTrimestres = async () => {
        try {
          const response = await fetch(`${API_URL}/api/trimestres?anneeScolaireId=${selectedAnneeAcademiqueId}`);
          if (!response.ok) {
            throw new Error('Failed to fetch trimesters');
          }
          const data = await response.json();
          setTrimestresAnnee(data);
        } catch (error) {
          console.error(error);
          toast({
            title: t.common.error,
            description: t.schedule.errorLoadingTerms,
            variant: "destructive",
          });
        }
      };
      fetchTrimestres();
    }
  }, [selectedAnneeAcademiqueId, t]);


  // Récupération des données de l'emploi du temps
  const fetchEmploiDuTemps = useCallback(async () => {
    const currentAnneeIdNum = parseInt(selectedAnneeAcademiqueId);
    const currentClassIdNum = parseInt(selectedClassId);
    const currentTeacherIdNum = parseInt(selectedTeacherId);

    if (isNaN(currentAnneeIdNum) ||
        (scheduleView === 'class' && isNaN(currentClassIdNum)) ||
        (scheduleView === 'teacher' && isNaN(currentTeacherIdNum))) {
      setEmploisDuTemps([]);
      setExceptionsEmploisDuTemps([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let baseScheduleUrl = `${API_URL}/api/emploi-du-temps?annee_scolaire_id=${currentAnneeIdNum}`;
      if (scheduleView === 'class') baseScheduleUrl += `&classe_id=${currentClassIdNum}`;
      else baseScheduleUrl += `&professeur_id=${currentTeacherIdNum}`;

      const etdRes: EmploiDuTempsEntry[] = await fetch(baseScheduleUrl).then(res => res.json());
      setEmploisDuTemps(etdRes);

      const weekStartDate = format(currentWeekStart, 'yyyy-MM-dd');
      const weekEndDate = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      // Ajout de annee_scolaire_id pour filtrer les exceptions par année également.
      // C'est crucial pour les exceptions globales comme les jours fériés.
      let exceptionsUrl = `${API_URL}/api/exception-emploi-du-temps?start_date=${weekStartDate}&end_date=${weekEndDate}&annee_scolaire_id=${currentAnneeIdNum}`;

      if (scheduleView === 'class' && !isNaN(currentClassIdNum)) {
        exceptionsUrl += `&classe_id=${currentClassIdNum}`;
      } else if (scheduleView === 'teacher' && !isNaN(currentTeacherIdNum)) {
        exceptionsUrl += `&professeur_id=${currentTeacherIdNum}`;
      }

      const exceptionsRes: ExceptionEmploiDuTempsEntry[] = await fetch(exceptionsUrl).then(res => res.json());
      setExceptionsEmploisDuTemps(exceptionsRes);

    } catch (error) {
      toast({
        title: t.common.error,
        description: t.schedule.errorLoading,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedAnneeAcademiqueId, selectedClassId, selectedTeacherId, scheduleView, currentWeekStart, t]);

  useEffect(() => {
    if (anneesAcademiques.length > 0) fetchEmploiDuTemps();
  }, [fetchEmploiDuTemps, anneesAcademiques.length]);

  // Filtrer les matières en fonction de la classe et de l'année
  useEffect(() => {
    const selectedClassIdNum = parseInt(selectedClassId);
    const selectedAnneeAcademiqueIdNum = parseInt(selectedAnneeAcademiqueId);

    if (!isNaN(selectedClassIdNum) && !isNaN(selectedAnneeAcademiqueIdNum)) {
      const matiereIdsForClass = affectations
        .filter(aff => aff.classe.id === selectedClassIdNum && aff.annee_scolaire.id === selectedAnneeAcademiqueIdNum)
        .map(aff => aff.matiere.id);

      setFilteredMatieres(matieres.filter(matiere => matiereIdsForClass.includes(matiere.id)));
    } else {
      setFilteredMatieres([]);
    }
  }, [selectedClassId, matieres, affectations, selectedAnneeAcademiqueId]);


   // Calculer la date de fin du troisième trimestre
  const finTroisiemeTrimestre = useMemo(() => {
    if (trimestresAnnee.length === 0) return null;

    // On cherche le trimestre dont le nom contient "3"
    const troisiemeTrimestre = trimestresAnnee.find(t => t.nom.includes('3'));
    
    if (troisiemeTrimestre) {
        return parseISO(troisiemeTrimestre.date_fin);
    }
    
    // Fallback: si aucun n'est nommé "Trimestre 3", on prend le dernier par date de fin
    const sortedTrimestres = [...trimestresAnnee].sort((a, b) => new Date(a.date_fin).getTime() - new Date(b.date_fin).getTime());
    return sortedTrimestres.length > 0 ? parseISO(sortedTrimestres[sortedTrimestres.length - 1].date_fin) : null;
  }, [trimestresAnnee]);


  // Obtenir les données de l'emploi du temps pour un créneau spécifique
  const getScheduleItemData = (day: string, date: Date, timeSlot: string): ScheduleItemData | null => {
    const dayMapping: { [key: string]: EmploiDuTempsEntry['jour'] } = {
      'Monday': 'Lundi',
      'Tuesday': 'Mardi',
      'Wednesday': 'Mercredi',
      'Thursday': 'Jeudi',
      'Friday': 'Vendredi',
      'Saturday': 'Samedi',
    };
    const frenchDay = dayMapping[day as keyof typeof dayMapping];

    const [startHourStr, endHourStr] = timeSlot.split('-');
    const heureDebutFormatted = format(parseISO(`2000-01-01T${startHourStr}:00`), 'HH:mm:ss');
    const heureFinFormatted = format(parseISO(`2000-01-01T${endHourStr}:00`), 'HH:mm:ss');

    const currentClassIdNum = parseInt(selectedClassId);
    const currentTeacherIdNum = parseInt(selectedTeacherId);

    // Vérifier les exceptions en premier
    const exception = exceptionsEmploisDuTemps.find(ex =>
      isSameDay(parseISO(ex.date_exception), date) &&
      ex.jour === frenchDay &&
      ex.heure_debut === heureDebutFormatted &&
      ex.heure_fin === heureFinFormatted &&
      (scheduleView === 'class' ? (ex.classe_id === null || ex.classe_id === currentClassIdNum) : (ex.professeur_id === null || ex.professeur_id === currentTeacherIdNum))
    );

    if (exception) {
       // Nouvelle logique : Ne pas afficher les exceptions après la fin de l'année scolaire
      if (finTroisiemeTrimestre && date > finTroisiemeTrimestre) {
        return null;
      }

      if (exception.type_exception === 'annulation') {
        return {
          subjectName: t.schedule.status.canceled,
          teacherName: `${t.schedule.reason}: ${exception.motif || t.common.unknown}`,
          isException: true,
          isCanceled: true,
          entryId: exception.id,
          isBaseEntry: false,
          exceptionType: exception.type_exception,
          baseEntryId: emploisDuTemps.find(base =>
            base.jour === day &&
            base.heure_debut === heureDebutFormatted &&
            base.heure_fin === heureFinFormatted &&
            (scheduleView === 'class' ? base.classe_id === currentClassIdNum : base.professeur_id === currentTeacherIdNum)
          )?.id
        };
      } else if (exception.type_exception === 'jour_ferie') {
        return {
          subjectName: t.schedule.exceptionTypes.jour_ferie,
          teacherName: `${t.schedule.reason}: ${exception.motif || t.common.unknown}`,
          isException: true,
          isCanceled: false,
          entryId: exception.id,
          isBaseEntry: false,
          exceptionType: exception.type_exception,
        };
      } else if (exception.nouvelle_matiere_id && exception.nouveau_professeur_id) {
        const matiere = matieres.find(m => m.id === exception.nouvelle_matiere_id);
        const teacher = teachers.find(t => t.id === exception.nouveau_professeur_id);
        if (matiere && teacher) {
          return {
            subjectName: matiere.nom,
            teacherName: `${teacher.prenom} ${teacher.nom}`,
            isException: true,
            isCanceled: false,
            entryId: exception.id,
            isBaseEntry: false,
            exceptionType: exception.type_exception,
            baseEntryId: emploisDuTemps.find(base =>
              base.jour === day &&
              base.heure_debut === heureDebutFormatted &&
              base.heure_fin === heureFinFormatted &&
              (scheduleView === 'class' ? base.classe_id === currentClassIdNum : base.professeur_id === currentTeacherIdNum)
            )?.id
          };
        }
      }
    }

    // Vérifier l'emploi du temps de base
    const baseEntry = emploisDuTemps.find(entry =>
      entry.jour === frenchDay &&
      entry.heure_debut === heureDebutFormatted &&
      entry.heure_fin === heureFinFormatted &&
      (scheduleView === 'class' ? entry.classe_id === currentClassIdNum : entry.professeur_id === currentTeacherIdNum)
    );

      // Nouvelle logique : Arrêter l'affichage des cours de base après la fin du 3ème trimestre
   if (baseEntry && finTroisiemeTrimestre && date > finTroisiemeTrimestre) {
      // Si la date du créneau est après la fin de l'année scolaire, ne pas afficher le cours de base, quel que soit le mode.
        return null;
    }
    
    if (baseEntry) {
      const matiere = matieres.find(m => m.id === baseEntry.matiere_id);
      const teacher = teachers.find(t => t.id === baseEntry.professeur_id);
      if (matiere && teacher) {
        return {
          subjectName: matiere.nom,
          teacherName: `${teacher.prenom} ${teacher.nom}`,
          isBaseEntry: true,
          entryId: baseEntry.id,
        };
      }
    }
    return null;
  };

  // Gérer le clic sur un élément de l'emploi du temps
  const handleItemClick = (day: string, date: Date, timeSlot: string, existingData?: ScheduleItemData) => {
    if (scheduleMode === 'base' && scheduleView === 'teacher') {
      toast({
        title: t.schedule.teacherViewNotAllowedTitle,
        description: t.schedule.teacherViewNotAllowed,
        variant: "default",
      });
      return;
    }

    if (scheduleMode === 'base' && !existingData && (day === 'Dimanche')) {
      toast({
        title: t.schedule.weekendNotAllowedTitle,
        description: t.schedule.weekendNotAllowed,
        variant: "default",
      });
      return;
    }
// Empêcher l'ajout de nouvelles entrées (base ou exception) après la fin de l'année scolaire.
    // On autorise le clic sur une entrée existante pour la modifier/supprimer, même si elle est hors date.
    if (!existingData && finTroisiemeTrimestre && date > finTroisiemeTrimestre) {
      toast({
        title: t.schedule.endOfYearTitle, // "Fin de l'année scolaire"
        description: t.schedule.endOfYearMessage, // "Impossible d'ajouter des cours ou exceptions après la fin du 3ème trimestre."
        variant: "default",
      });
      return;
    }
    setCurrentModalDate(date);
    setCurrentTimeSlot(timeSlot);
    setCurrentModalDate(date);

    // Réinitialiser le formulaire
    setFormMatiereId('');
    setFormProfesseurId('');
    setFormExceptionType('remplacement_prof');
    setFormMotif('');

    if (scheduleMode === 'base') {
      if (existingData && existingData.isBaseEntry) {
        setModalMode('edit');
        setEditingBaseEntryId(existingData.entryId);
        const entry = emploisDuTemps.find(e => e.id === existingData.entryId);
        if (entry) {
          setFormMatiereId(String(entry.matiere_id));
          setFormProfesseurId(String(entry.professeur_id));
        }
      } else {
        setModalMode('add');
        setEditingBaseEntryId(null);
      }
    } else {
      if (existingData && existingData.isException) {
        setModalMode('edit');
        setEditingExceptionId(existingData.entryId);
        setEditingBaseEntryId(existingData.baseEntryId || null);

        const exception = exceptionsEmploisDuTemps.find(ex => ex.id === existingData.entryId);
        if (exception) {
          setFormExceptionType(exception.type_exception);
          setFormMotif(exception.motif || '');
          setFormMatiereId(String(exception.nouvelle_matiere_id || ''));
          setFormProfesseurId(String(exception.nouveau_professeur_id || ''));
        }
      } else {
        setModalMode('add');
        setEditingExceptionId(null);
        setEditingBaseEntryId(existingData?.isBaseEntry ? existingData.entryId : null);
      }
    }
    setModalOpen(true);
  };

  // Gérer le changement de matière dans le formulaire
  const handleFormMatiereChange = (matiereId: string) => {
    setFormMatiereId(matiereId);
    const selectedMatiereIdNum = parseInt(matiereId);
    const selectedClasseIdNum = parseInt(selectedClassId);
    const selectedAnneeAcademiqueIdNum = parseInt(selectedAnneeAcademiqueId);

    const relevantAffectation = affectations.find(aff =>
      aff.matiere.id === selectedMatiereIdNum &&
      aff.classe.id === selectedClasseIdNum &&
      aff.annee_scolaire.id === selectedAnneeAcademiqueIdNum
    );

    setFormProfesseurId(relevantAffectation ? String(relevantAffectation.professeur.id) : '');
  };

  // Sauvegarder l'emploi du temps de base
  const handleSaveBaseSchedule = async () => {
  const selectedClassIdNum = parseInt(selectedClassId);
  const formMatiereIdNum = parseInt(formMatiereId);
  const formProfesseurIdNum = parseInt(formProfesseurId);

  if (!selectedClassIdNum || !formMatiereIdNum || !formProfesseurIdNum || !currentModalDate || !currentTimeSlot) {
    toast({
      title: t.common.requiredFieldsErrorTitle,
      description: t.common.requiredFieldsError,
      variant: "destructive",
    });
    return;
  }

  const [startHourStr, endHourStr] = currentTimeSlot.split('-');
  const heureDebutFormatted = format(parseISO(`2000-01-01T${startHourStr}:00`), 'HH:mm:ss');
  const heureFinFormatted = format(parseISO(`2000-01-01T${endHourStr}:00`), 'HH:mm:ss');

  // Conversion du jour en français pour l'API
  const frenchDays = {
    'Monday': 'Lundi',
    'Tuesday': 'Mardi',
    'Wednesday': 'Mercredi',
    'Thursday': 'Jeudi',
    'Friday': 'Vendredi',
    'Saturday': 'Samedi'
  };
  const englishDay = format(currentModalDate, 'EEEE'); // Récupère le jour en anglais
  const frenchDay = frenchDays[englishDay as keyof typeof frenchDays]; // Convertit en français

  const payload = {
    jour: frenchDay, // Envoi toujours en français à l'API
    heure_debut: heureDebutFormatted,
    heure_fin: heureFinFormatted,
    classe_id: selectedClassIdNum,
    matiere_id: formMatiereIdNum,
    professeur_id: formProfesseurIdNum,
    annee_academique_id: parseInt(selectedAnneeAcademiqueId)
  };

  setIsSaving(true);
  try {
    const token = localStorage.getItem('token');
    let response;
    if (modalMode === 'add') {
      response = await fetch(`${API_URL}/api/emploi-du-temps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    } else {
      if (!editingBaseEntryId) throw new Error(t.schedule.missingEntryId);
      response = await fetch(`${API_URL}/api/emploi-du-temps/${editingBaseEntryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    }

    if (!response.ok) throw new Error(await response.text());

    toast({
      title: t.schedule.successSaveTitle,
      description: t.schedule.successSaveDescription,
    });
    await fetchEmploiDuTemps();

  } catch (error: any) {
    toast({
      title: t.common.error,
      description: error.message || t.schedule.errorSave,
      variant: "destructive",
    });
  } finally {
    setIsSaving(false);
    setModalOpen(false);
  }
};

  // Supprimer l'emploi du temps de base
  const handleDeleteBaseSchedule = async () => {
    if (!editingBaseEntryId) return;

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/emploi-du-temps/${editingBaseEntryId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error(await response.text());

      toast({
        title: t.schedule.successDeleteTitle,
        description: t.schedule.successDeleteDescription,
      });
      await fetchEmploiDuTemps();

    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error.message || t.schedule.errorDelete,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setModalOpen(false);
    }
  };

  // Sauvegarder une exception
  const handleSaveException = async () => {
    const selectedClassIdNum = parseInt(selectedClassId);
    const formMatiereIdNum = formMatiereId ? parseInt(formMatiereId) : null;
    const formProfesseurIdNum = formProfesseurId ? parseInt(formProfesseurId) : null;

    if (!selectedClassIdNum || !currentModalDate) {
      toast({
        title: t.common.requiredFieldsErrorTitle,
        description: t.common.requiredFieldsError,
        variant: "destructive",
      });
      return;
    }

    if ((formExceptionType === 'remplacement_prof' || formExceptionType === 'deplacement_cours' || formExceptionType === 'evenement_special') && (!formMatiereIdNum || !formProfesseurIdNum)) {
      toast({
        title: t.schedule.missingSubjectOrTeacherTitle,
        description: t.schedule.missingSubjectOrTeacher,
        variant: "destructive",
      });
      return;
    }

    if ((formExceptionType === 'annulation' || formExceptionType === 'jour_ferie' || formExceptionType === 'evenement_special') && !formMotif) {
      toast({
        title: t.schedule.missingReasonTitle,
        description: t.schedule.missingReason,
        variant: "destructive",
      });
      return;
    }

    const [startHourStr, endHourStr] = currentTimeSlot.split('-');
    const heureDebutFormatted = format(parseISO(`2000-01-01T${startHourStr}:00`), 'HH:mm:ss');
    const heureFinFormatted = format(parseISO(`2000-01-01T${endHourStr}:00`), 'HH:mm:ss');
    const dateExceptionFormatted = format(currentModalDate, 'yyyy-MM-dd');

    let originalProfIdForException: number | null = null;
    if (editingBaseEntryId) {
      originalProfIdForException = emploisDuTemps.find(e => e.id === editingBaseEntryId)?.professeur_id || null;
    } else if (editingExceptionId) {
      originalProfIdForException = exceptionsEmploisDuTemps.find(e => e.id === editingExceptionId)?.professeur_id || null;
    }

    const payload = {
      date_exception: dateExceptionFormatted,
      jour: convertToFrenchDay(currentModalDate),
      heure_debut: heureDebutFormatted,
      heure_fin: heureFinFormatted,
      classe_id: selectedClassIdNum,
      professeur_id: originalProfIdForException,
      type_exception: formExceptionType,
      nouvelle_matiere_id: (formExceptionType === 'annulation' || formExceptionType === 'jour_ferie') ? null : formMatiereIdNum,
      nouveau_professeur_id: (formExceptionType === 'annulation' || formExceptionType === 'jour_ferie') ? null : formProfesseurIdNum,
      nouvelle_heure_debut: formExceptionType === 'deplacement_cours' ? heureDebutFormatted : null,
      nouvelle_heure_fin: formExceptionType === 'deplacement_cours' ? heureFinFormatted : null,
      nouvelle_classe_id: formExceptionType === 'deplacement_cours' ? selectedClassIdNum : null, // Assuming the class doesn't change for a moved course in this UI
      nouveau_jour: formExceptionType === 'deplacement_cours' ? convertToFrenchDay(currentModalDate) : null,
      motif: formMotif || null,
    };

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      let response;
      if (modalMode === 'add') {
        response = await fetch(`${API_URL}/api/exception-emploi-du-temps`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        if (!editingExceptionId) throw new Error(t.schedule.missingExceptionId);
        response = await fetch(`${API_URL}/api/exception-emploi-du-temps/${editingExceptionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) throw new Error(await response.text());

      toast({
        title: t.schedule.successSaveTitle,
        description: t.schedule.successSaveDescription,
      });
      await fetchEmploiDuTemps();

    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error.message || t.schedule.errorSave,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setModalOpen(false);
    }
  };

  // Supprimer une exception
  const handleDeleteException = async () => {
    if (!editingExceptionId) return;

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/exception-emploi-du-temps/${editingExceptionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error(await response.text());

      toast({
        title: t.schedule.successDeleteTitle,
        description: t.schedule.successDeleteDescription,
      });
      await fetchEmploiDuTemps();

    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error.message || t.schedule.errorDelete,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setModalOpen(false);
    }
  };

  // Filtrer les classes en fonction de l'année académique sélectionnée
  const filteredClassesForSelect = classes.filter(cls => cls.annee_scolaire_id === parseInt(selectedAnneeAcademiqueId));

  return (
<div className={`p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>      <div className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6" dir={isRTL ? 'rtl' : 'ltr'}>
          <h1 className="text-2xl font-bold mb-6">
            {t.schedule.title}
          </h1>
          <div className="flex items-center gap-2 dark:text-white">
  <Button variant="outline" size="sm" onClick={handlePreviousWeek} className="bg-white dark:bg-gray-800">
    {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
  </Button>
  <span className="font-medium text-gray-700 dark:text-white">
    {t.schedule.weekOf} {format(currentWeekStart, language === 'ar' ? 'dd MMMM yyyy' : 'dd MMMM yyyy', { locale: currentLocale })}
  </span>
  <Button variant="outline" size="sm" onClick={handleNextWeek} className="bg-white dark:bg-gray-800">
    {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
  </Button>
</div>
        </div>

<Card className="mb-6 shadow-lg dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
            <CardTitle>{t.schedule.configuration}</CardTitle>
            <CardDescription>{t.schedule.configDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 dark:text-white">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t.schoolManagement.schoolYears.title}</label>
                <Select
                  value={selectedAnneeAcademiqueId}
                  onValueChange={handleAnneeAcademiqueChange}
                  disabled={isLoading}
                >
<SelectTrigger className="bg-white dark:bg-gray-800 dark:border-gray-700">
                    <SelectValue placeholder={t.common.selectAYear} />
                  </SelectTrigger>
<SelectContent className="bg-white dark:bg-gray-800 dark:border-gray-700">
                    {anneesAcademiques.map((annee) => (
                      <SelectItem key={annee.id} value={String(annee.id)}>
                        {formatAcademicYearDisplay(annee)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t.common.view}</label>
                <Tabs value={scheduleView} onValueChange={setScheduleView} className="w-full">
<TabsList className="grid w-full grid-cols-2 bg-white dark:bg-gray-800">                    <TabsTrigger value="class">
                      {t.schedule.viewClass}
                    </TabsTrigger>
                    <TabsTrigger value="teacher">
                      {t.schedule.viewTeacher}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {scheduleView === 'class' ? (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t.common.class}</label>
                  <Select
                    value={selectedClassId}
                    onValueChange={setSelectedClassId}
                    disabled={isLoading || filteredClassesForSelect.length === 0}
                  >
<SelectTrigger className="bg-white dark:bg-gray-800 dark:border-gray-700">
                      <SelectValue placeholder={t.common.selectAClass} />
                    </SelectTrigger>
<SelectContent className="bg-white dark:bg-gray-800 dark:border-gray-700">
                      {filteredClassesForSelect.length > 0 ? (
                        filteredClassesForSelect.map((cls) => (
                          <SelectItem key={cls.id} value={String(cls.id)}>
                            {cls.nom}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-classes" disabled>
                          {t.common.noDataAvailable}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                 <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t.common.teacher}</label>
                  <Select
                    value={selectedTeacherId}
                    onValueChange={setSelectedTeacherId}
                    disabled={isLoading || teachers.length === 0}
                  >
<SelectTrigger className="bg-white dark:bg-gray-800 dark:border-gray-700">
                      <SelectValue placeholder={t.common.selectATeacher} />
                    </SelectTrigger>
<SelectContent className="bg-white dark:bg-gray-800 dark:border-gray-700">
                      {teachers.length > 0 ? (
                        teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={String(teacher.id)}>
                            {`${teacher.prenom} ${teacher.nom}`}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-teachers" disabled>
                          {t.common.noDataAvailable}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
               <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t.schedule.managementMode}</label>
                <Select
                  value={scheduleMode}
                  onValueChange={(value: ScheduleManagementMode) => setScheduleMode(value)}
                  disabled={isLoading}
                >
<SelectTrigger className="bg-white dark:bg-gray-800 dark:border-gray-700">
                    <SelectValue placeholder={t.common.selectAnOption} />
                  </SelectTrigger>
<SelectContent className="bg-white dark:bg-gray-800 dark:border-gray-700">
                    <SelectItem value="base">{t.schedule.baseSchedule}</SelectItem>
                    <SelectItem value="exception">{t.schedule.exceptions}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{t.schedule.title}</CardTitle>
            <CardDescription>
              {scheduleMode === 'base' ? t.schedule.baseScheduleDescription : t.schedule.exceptionsDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                {/* Desktop View: Grid */}
                <div className="hidden lg:block">
<ScrollArea className="h-[calc(100vh-400px)] rounded-md border p-4 bg-white dark:bg-gray-800 dark:border-gray-700">                    {/* En-tête des jours */}
                    {/* En-tête des jours */}
<div className={`grid ${isRTL ? 'grid-cols-[1fr_100px]' : 'grid-cols-[100px_1fr]'} gap-2 mb-2`}>
    {isRTL ? (
        <>
            <div className="grid grid-cols-6 gap-2">
                {currentWeekDaysInfo.map((dayInfo) => (
                    <div key={dayInfo.date.toISOString()}
className={`font-semibold text-center py-2 rounded-lg transition-colors ${dayInfo.isToday 
  ? 'bg-blue-600 text-white shadow' 
  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white'}`}                    >
                        {dayInfo.dayNameDisplay}
                        <div className={`text-xs font-normal ${dayInfo.isToday ? 'text-blue-100' : 'text-gray-500 dark:text-gray-300'}`}>
                            {format(dayInfo.date, 'dd/MM')}
                        </div>
                    </div>
                ))}
            </div>
            <div className="font-semibold text-gray-500"></div>
        </>
    ) : (
        <>
            <div className="font-semibold text-gray-500"></div>
            <div className="grid grid-cols-6 gap-2">
                {currentWeekDaysInfo.map((dayInfo) => (
                    <div key={dayInfo.date.toISOString()}
className={`font-semibold text-center py-2 rounded-lg transition-colors ${dayInfo.isToday ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}                    >
                        {dayInfo.dayNameDisplay}
                        <div className={`text-xs font-normal ${dayInfo.isToday ? 'text-blue-100' : 'text-gray-500'}`}>
                            {format(dayInfo.date, 'dd/MM')}
                        </div>
                    </div>
                ))}
            </div>
        </>
    )}
</div>

                    {/* Corps du tableau */}
                    {timeSlots.map((timeSlot) => (
                      <div key={timeSlot} className={`grid ${isRTL ? 'grid-cols-[1fr_100px]' : 'grid-cols-[100px_1fr]'} gap-2 mb-2`}>
                        {isRTL ? (
                          <>
                            <div className="grid grid-cols-6 gap-2">
                              {currentWeekDaysInfo.map((dayInfo) => (
                                <div key={`${dayInfo.dayNameCapitalized}-${timeSlot}`} 
                                     className="min-h-[100px]"
                                     style={{ direction: 'rtl' }}>
                                  <ScheduleItem
                                    day={dayInfo.dayNameCapitalized}
                                    date={dayInfo.date}
                                    timeSlot={timeSlot}
                                    data={getScheduleItemData(dayInfo.dayNameCapitalized, dayInfo.date, timeSlot)}
                                    onItemClick={handleItemClick}
                                    scheduleMode={scheduleMode}
                                    scheduleView={scheduleView}
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="text-sm font-medium text-gray-500 py-2 flex items-center justify-center">
                              {timeSlot}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-sm font-medium text-gray-500 py-2 flex items-center">
                              {timeSlot}
                            </div>
                            <div className="grid grid-cols-6 gap-2">
                              {currentWeekDaysInfo.map((dayInfo) => (
                                <div key={`${dayInfo.dayNameCapitalized}-${timeSlot}`} className="min-h-[100px]">
                                  <ScheduleItem
                                    day={dayInfo.dayNameCapitalized}
                                    date={dayInfo.date}
                                    timeSlot={timeSlot}
                                    data={getScheduleItemData(dayInfo.dayNameCapitalized, dayInfo.date, timeSlot)}
                                    onItemClick={handleItemClick}
                                    scheduleMode={scheduleMode}
                                    scheduleView={scheduleView}
                                  />
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </ScrollArea>
                </div>

                {/* Mobile View: List */}
<div className="block lg:hidden">
  <ScrollArea className="h-[calc(100vh-400px)] rounded-md border p-4 bg-white dark:bg-gray-800 dark:border-gray-700">
    {currentWeekDaysInfo.map((dayInfo) => (
      <div key={dayInfo.date.toISOString()} className="mb-6">
        {/* En-tête du jour centré avec texte en gras */}
        <h3 className={`
          text-lg font-semibold mb-3 sticky top-0 py-2 z-10 border-b
          ${dayInfo.isToday 
            ? 'bg-blue-600 text-white dark:bg-blue-700' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}
          border-gray-200 dark:border-gray-600
          text-center
        `}>
          <span className="font-bold">
            {dayInfo.dayNameDisplay} {/* Nom du jour */}
            <span className="opacity-80 mx-2">-</span> {/* Séparateur */}
            {format(dayInfo.date, 'dd/MM')} {/* Date formatée */}
          </span>
        </h3>

        {/* Créneaux horaires */}
        <div className="space-y-4">
          {timeSlots.map((timeSlot) => (
            <div key={timeSlot} className="flex flex-col gap-2">
              <div className={`text-sm font-medium text-gray-600 dark:text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}>
                {timeSlot}
              </div>
              <div className="min-h-[90px]">
                <ScheduleItem
                  day={dayInfo.dayNameCapitalized}
                  date={dayInfo.date}
                  timeSlot={timeSlot}
                  data={getScheduleItemData(dayInfo.dayNameCapitalized, dayInfo.date, timeSlot)}
                  onItemClick={handleItemClick}
                  scheduleMode={scheduleMode}
                  scheduleView={scheduleView}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </ScrollArea>
</div>
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-[600px] bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  <DialogHeader>
    <DialogTitle className="dark:text-white">
      {scheduleMode === 'base'
        ? modalMode === 'add'
          ? t.schedule.addBaseSchedule
          : t.schedule.editBaseSchedule
        : modalMode === 'add'
        ? t.schedule.addException
        : t.schedule.editException}
    </DialogTitle>
    <DialogDescription className="dark:text-gray-300">
      {currentModalDate ? format(currentModalDate, 'EEEE', { locale: currentLocale }) : ''}
      {currentModalDate ? format(currentModalDate, ' dd/MM/yyyy', { locale: currentLocale }) : ''}
      {currentTimeSlot} {t.common.forLabel}{' '}
      {scheduleView === 'class'
        ? classes.find((c) => c.id === parseInt(selectedClassId))?.nom || t.common.selectedClass
        : teachers.find((t) => t.id === parseInt(selectedTeacherId))
          ? `${teachers.find((t) => t.id === parseInt(selectedTeacherId))?.prenom} ${teachers.find((t) => t.id === parseInt(selectedTeacherId))?.nom}`
          : t.common.selectedTeacher}
    </DialogDescription>
  </DialogHeader>
            <div className="grid gap-4 py-4">
              {scheduleMode === 'base' ? (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
    <label htmlFor="matiere" className="text-right text-sm font-medium text-gray-700 dark:text-gray-300">
      {t.common.subject}
    </label>
    <Select
      onValueChange={handleFormMatiereChange}
      value={formMatiereId}
      disabled={isSaving}
    >
      <SelectTrigger className="col-span-3 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
        <SelectValue placeholder={t.common.selectASubject} />
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-gray-800 dark:border-gray-700">
        {filteredMatieres.map((matiere) => (
          <SelectItem 
            key={matiere.id} 
            value={String(matiere.id)}
            className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
          >
            {matiere.nom}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="professeur" className="text-right text-sm font-medium text-gray-700">
                      {t.common.teacher}
                    </label>
                    <Select
                      value={formProfesseurId}
                      onValueChange={setFormProfesseurId}
                      disabled={true}
                    >
                      <SelectTrigger className="col-span-3 bg-gray-50">
                        <SelectValue placeholder={t.common.selectATeacher} />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {formProfesseurId ? (
                          teachers
                            .filter((t) => String(t.id) === formProfesseurId)
                            .map((teacher) => (
                              <SelectItem key={teacher.id} value={String(teacher.id)}>
                                {`${teacher.prenom} ${teacher.nom}`}
                              </SelectItem>
                            ))
                        ) : (
                          <SelectItem value="no-professeur" disabled>
                            {t.schedule.selectSubjectFirst}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="exceptionType" className="text-right text-sm font-medium text-gray-700">
                      {t.schedule.exceptionType}
                    </label>
                    <Select
                      value={formExceptionType}
                      onValueChange={(value: ExceptionType) => setFormExceptionType(value)}
                      disabled={isSaving}
                    >
                      <SelectTrigger className="col-span-3 bg-gray-50">
                        <SelectValue placeholder={t.common.selectAnOption} />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="remplacement_prof">{t.schedule.exceptionTypes.remplacement_prof}</SelectItem>
                        <SelectItem value="annulation">{t.schedule.exceptionTypes.annulation}</SelectItem>
                        <SelectItem value="deplacement_cours">{t.schedule.exceptionTypes.deplacement_cours}</SelectItem>
                        <SelectItem value="jour_ferie">{t.schedule.exceptionTypes.jour_ferie}</SelectItem>
                        <SelectItem value="evenement_special">{t.schedule.exceptionTypes.evenement_special}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formExceptionType !== 'annulation' && formExceptionType !== 'jour_ferie' && (
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="subject" className="text-right text-sm font-medium text-gray-700">
                          {t.schedule.newSubject}
                        </label>
                        <Select
                          value={formMatiereId}
                          onValueChange={handleFormMatiereChange}
                          disabled={isSaving}
                        >
                          <SelectTrigger className="col-span-3 bg-gray-50">
                            <SelectValue placeholder={t.common.selectASubject} />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {filteredMatieres.length > 0 ? (
                              filteredMatieres.map((matiere) => (
                                <SelectItem key={matiere.id} value={String(matiere.id)}>
                                  {matiere.nom}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-matieres" disabled>
                                {t.common.noDataAvailable}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="teacher" className="text-right text-sm font-medium text-gray-700">
                          {t.schedule.newTeacher}
                        </label>
                        <Select
                          value={formProfesseurId}
                          onValueChange={setFormProfesseurId}
                          disabled={isSaving || true}
                        >
                          <SelectTrigger className="col-span-3 bg-gray-50">
                            <SelectValue placeholder={t.common.selectATeacher} />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {formProfesseurId ? (
                              teachers
                                .filter((t) => String(t.id) === formProfesseurId)
                                .map((teacher) => (
                                  <SelectItem key={teacher.id} value={String(teacher.id)}>
                                    {`${teacher.prenom} ${teacher.nom}`}
                                  </SelectItem>
                                ))
                            ) : (
                              <SelectItem value="no-professeur" disabled>
                                {t.schedule.selectSubjectFirst}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="motif" className="text-right text-sm font-medium text-gray-700">
                      {t.schedule.reason}
                    </label>
                    <Textarea
                      id="motif"
                      value={formMotif}
                      onChange={(e) => setFormMotif(e.target.value)}
                      placeholder={t.schedule.reasonPlaceholder}
className="col-span-3 bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
                      disabled={isSaving}
                    />
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={isSaving}       className="bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
>
                  {t.common.cancel}
                </Button>
              </DialogClose>
              {scheduleMode === 'base' ? (
                <>
                  {modalMode === 'edit' && (
                    <Button
                      variant="destructive"
                      onClick={handleDeleteBaseSchedule}
                      disabled={isSaving}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t.common.delete}
                    </Button>
                  )}
                  <Button
                    onClick={handleSaveBaseSchedule}
                    disabled={isSaving || !formMatiereId || !formProfesseurId}
    className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {modalMode === 'add' ? t.common.add : t.common.save}
                  </Button>
                </>
              ) : (
                <>
                  {modalMode === 'edit' && (
                    <Button
                      variant="destructive"
                      onClick={handleDeleteException}
                      disabled={isSaving}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t.common.delete}
                    </Button>
                  )}
                  <Button
                    onClick={handleSaveException}
                    disabled={
                      isSaving ||
                      ((formExceptionType === 'remplacement_prof' ||
                        formExceptionType === 'deplacement_cours' ||
                        formExceptionType === 'evenement_special') &&
                       (!formMatiereId || !formProfesseurId)) ||
                      ((formExceptionType === 'annulation' ||
                        formExceptionType === 'jour_ferie' ||
                        formExceptionType === 'evenement_special') &&
                       !formMotif)
                    }
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {modalMode === 'add' ? t.common.add : t.common.save}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}