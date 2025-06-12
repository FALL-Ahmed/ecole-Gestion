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
import { fr } from 'date-fns/locale';

// Mock des interfaces et des données
const API_BASE_URL = 'http://localhost:3000';

interface AnneeAcademique { id: number; libelle: string; date_debut: string; date_fin: string; }
interface Classe { id: number; nom: string; niveau: string; annee_scolaire_id: number; }
interface Matiere { id: number; nom: string; code?: string; }
interface User { id: number; nom: string; prenom: string; email: string; role: 'admin' | 'eleve' | 'professeur' | 'tuteur'; }
interface Affectation { id: number; professeur: User; matiere: Matiere; classe: Classe; annee_scolaire: AnneeAcademique; }
interface EmploiDuTempsEntry {
  id: number;
  jour: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi';
  heure_debut: string;
  heure_fin: string;
  classe_id: number;
  matiere_id: number;
  professeur_id: number;
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

const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
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
  let bgColor = 'bg-gradient-to-r from-blue-400 to-blue-500';
  let borderColor = 'border-blue-200';
  let textColor = 'text-white';
  let cursorStyle = 'cursor-pointer hover:shadow-lg transform hover:scale-105 transition-transform duration-200';

  if (scheduleMode === 'exception') {
    if (data && data.isException) {
      if (data.isCanceled) {
        bgColor = 'bg-gradient-to-r from-red-400 to-red-500';
        borderColor = 'border-red-200';
        textColor = 'text-white';
      } else if (data.exceptionType === 'jour_ferie') {
        bgColor = 'bg-gradient-to-r from-green-400 to-green-500';
        borderColor = 'border-green-200';
        textColor = 'text-white';
      } else {
        bgColor = 'bg-gradient-to-r from-yellow-400 to-yellow-500';
        borderColor = 'border-yellow-200';
        textColor = 'text-white';
      }
    } else if (data && !data.isException) {
      bgColor = 'bg-gradient-to-r from-blue-300 to-blue-400';
      borderColor = 'border-blue-300';
      textColor = 'text-white';
    } else {
      bgColor = 'bg-gradient-to-r from-gray-200 to-gray-300';
      borderColor = 'border-gray-300';
      textColor = 'text-gray-600';
    }
  } else {
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

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`${bgColor} ${borderColor} ${textColor} border rounded-lg p-4 h-full flex flex-col justify-between ${cursorStyle}`}
            onClick={() => onItemClick(day, date, timeSlot, data)}
          >
            {data ? (
              <>
                <p className="font-medium text-sm truncate">{data.subjectName}</p>
                <p className="text-xs mt-1 truncate">{data.teacherName}</p>
                {data.isException && (
                  <Badge
                    variant="outline"
                    className={`mt-1 text-xs w-fit ${
                      data.isCanceled ? 'bg-red-100 text-red-800' :
                      data.exceptionType === 'jour_ferie' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {data.exceptionType === 'annulation' ? 'Annulé' :
                     data.exceptionType === 'jour_ferie' ? 'Férié' :
                     data.exceptionType === 'remplacement_prof' ? 'Remplacement' :
                     data.exceptionType === 'deplacement_cours' ? 'Déplacé' : 'Événement'}
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
        <TooltipContent side="top" className="max-w-[200px] bg-white text-gray-800 border border-gray-200 shadow-lg">
          {data ? (
            <>
              <p className="font-semibold">{data.subjectName}</p>
              <p>{data.teacherName}</p>
              {data.isException && (
                <p className="text-xs mt-1">
                  {data.exceptionType === 'annulation' ? 'Cours annulé' :
                   data.exceptionType === 'jour_ferie' ? 'Jour férié' :
                   data.exceptionType === 'remplacement_prof' ? 'Remplacement' :
                   data.exceptionType === 'deplacement_cours' ? 'Cours déplacé' : 'Événement spécial'}
                </p>
              )}
            </>
          ) : (
            <p>Cliquez pour ajouter</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export function ScheduleManagement() {
  // États
  const [anneesAcademiques, setAnneesAcademiques] = useState<AnneeAcademique[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [emploisDuTemps, setEmploisDuTemps] = useState<EmploiDuTempsEntry[]>([]);
  const [exceptionsEmploisDuTemps, setExceptionsEmploisDuTemps] = useState<ExceptionEmploiDuTempsEntry[]>([]);

  const [selectedAnneeAcademiqueId, setSelectedAnneeAcademiqueId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [scheduleView, setScheduleView] = useState<string>('class');
  const [scheduleMode, setScheduleMode] = useState<ScheduleManagementMode>('base');

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editingBaseEntryId, setEditingBaseEntryId] = useState<number | null>(null);
  const [editingExceptionId, setEditingExceptionId] = useState<number | null>(null);

  const [currentDay, setCurrentDay] = useState<string>('');
  const [currentTimeSlot, setCurrentTimeSlot] = useState<string>('');
  const [currentModalDate, setCurrentModalDate] = useState<Date | null>(null);

  const [formMatiereId, setFormMatiereId] = useState<string>('');
  const [formProfesseurId, setFormProfesseurId] = useState<string>('');
  const [formExceptionType, setFormExceptionType] = useState<ExceptionType>('remplacement_prof');
  const [formMotif, setFormMotif] = useState<string>('');

  const [filteredMatieres, setFilteredMatieres] = useState<Matiere[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Navigation de la semaine
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handlePreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));

  const currentWeekDaysInfo = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  }).map(date => ({
    date,
    dayName: format(date, 'EEEE', { locale: fr }),
    dayNameCapitalized: format(date, 'EEEE', { locale: fr }).charAt(0).toUpperCase() + format(date, 'EEEE', { locale: fr }).slice(1),
  })).filter(dayInfo => days.includes(dayInfo.dayNameCapitalized));

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
          fetch(`${API_BASE_URL}/api/annees-academiques`).then(res => res.json()),
          fetch(`${API_BASE_URL}/api/classes`).then(res => res.json()),
          fetch(`${API_BASE_URL}/api/matieres`).then(res => res.json()),
          fetch(`${API_BASE_URL}/api/users`).then(res => res.json()),
          fetch(`${API_BASE_URL}/api/affectations`).then(res => res.json()),
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
          title: "Erreur de chargement",
          description: "Impossible de charger les données initiales.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

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
      let baseScheduleUrl = `${API_BASE_URL}/api/emploi-du-temps?annee_academique_id=${currentAnneeIdNum}`;
      if (scheduleView === 'class') baseScheduleUrl += `&classe_id=${currentClassIdNum}`;
      else baseScheduleUrl += `&professeur_id=${currentTeacherIdNum}`;

      const etdRes: EmploiDuTempsEntry[] = await fetch(baseScheduleUrl).then(res => res.json());
      setEmploisDuTemps(etdRes);

      const weekStartDate = format(currentWeekStart, 'yyyy-MM-dd');
      const weekEndDate = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      let exceptionsUrl = `${API_BASE_URL}/api/exception-emploi-du-temps?start_date=${weekStartDate}&end_date=${weekEndDate}`;

      if (scheduleView === 'class') exceptionsUrl += `&classe_id=${currentClassIdNum}`;
      else if (scheduleView === 'teacher') exceptionsUrl += `&professeur_id=${currentTeacherIdNum}`;

      const exceptionsRes: ExceptionEmploiDuTempsEntry[] = await fetch(exceptionsUrl).then(res => res.json());
      setExceptionsEmploisDuTemps(exceptionsRes);

    } catch (error) {
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger l'emploi du temps.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedAnneeAcademiqueId, selectedClassId, selectedTeacherId, scheduleView, currentWeekStart]);

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

  // Obtenir les données de l'emploi du temps pour un créneau spécifique
  const getScheduleItemData = (day: string, date: Date, timeSlot: string): ScheduleItemData | null => {
    const [startHourStr, endHourStr] = timeSlot.split('-');
    const heureDebutFormatted = format(parseISO(`2000-01-01T${startHourStr}:00`), 'HH:mm:ss');
    const heureFinFormatted = format(parseISO(`2000-01-01T${endHourStr}:00`), 'HH:mm:ss');

    const currentClassIdNum = parseInt(selectedClassId);
    const currentTeacherIdNum = parseInt(selectedTeacherId);

    // Vérifier les exceptions en premier
    const exception = exceptionsEmploisDuTemps.find(ex =>
      isSameDay(parseISO(ex.date_exception), date) &&
      ex.jour === day &&
      ex.heure_debut === heureDebutFormatted &&
      ex.heure_fin === heureFinFormatted &&
      (scheduleView === 'class' ? (ex.classe_id === null || ex.classe_id === currentClassIdNum) : (ex.professeur_id === null || ex.professeur_id === currentTeacherIdNum))
    );

    if (exception) {
      if (exception.type_exception === 'annulation') {
        return {
          subjectName: 'Cours Annulé',
          teacherName: `Motif: ${exception.motif || 'Non spécifié'}`,
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
          subjectName: 'Jour Férié',
          teacherName: `Motif: ${exception.motif || 'Non spécifié'}`,
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
      entry.jour === day &&
      entry.heure_debut === heureDebutFormatted &&
      entry.heure_fin === heureFinFormatted &&
      (scheduleView === 'class' ? entry.classe_id === currentClassIdNum : entry.professeur_id === currentTeacherIdNum)
    );

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
        title: "Action non permise",
        description: "L'ajout/modification de cours de base se fait via la vue par classe.",
        variant: "default",
      });
      return;
    }

       if (scheduleMode === 'base' && !existingData && (day === 'Dimanche')) {

      toast({
        title: "Action non permise",
        description: "L'ajout de cours de base n'est autorisé que du Lundi au Samedi.",
        variant: "default",
      });
      return;
    }

    setCurrentDay(day);
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

    if (!selectedClassIdNum || !formMatiereIdNum || !formProfesseurIdNum || !currentDay || !currentTimeSlot) {
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs requis.",
        variant: "destructive",
      });
      return;
    }

    const [startHourStr, endHourStr] = currentTimeSlot.split('-');
    const heureDebutFormatted = format(parseISO(`2000-01-01T${startHourStr}:00`), 'HH:mm:ss');
    const heureFinFormatted = format(parseISO(`2000-01-01T${endHourStr}:00`), 'HH:mm:ss');

    const payload = {
      jour: currentDay,
      heure_debut: heureDebutFormatted,
      heure_fin: heureFinFormatted,
      classe_id: selectedClassIdNum,
      matiere_id: formMatiereIdNum,
      professeur_id: formProfesseurIdNum,
      annee_academique_id: parseInt(selectedAnneeAcademiqueId)
    };

    setIsSaving(true);
    try {
      let response;
      if (modalMode === 'add') {
        response = await fetch(`${API_BASE_URL}/api/emploi-du-temps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        if (!editingBaseEntryId) throw new Error("ID d'entrée de base manquant.");
        response = await fetch(`${API_BASE_URL}/api/emploi-du-temps/${editingBaseEntryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) throw new Error(await response.text());

      toast({
        title: `Cours ${modalMode === 'add' ? 'ajouté' : 'mis à jour'} !`,
        description: "L'emploi du temps a été enregistré.",
      });
      await fetchEmploiDuTemps();

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Échec de l'enregistrement.",
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
      const response = await fetch(`${API_BASE_URL}/api/emploi-du-temps/${editingBaseEntryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error(await response.text());

      toast({
        title: "Cours supprimé !",
        description: "Le cours a été retiré de l'emploi du temps.",
      });
      await fetchEmploiDuTemps();

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la suppression.",
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
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs requis.",
        variant: "destructive",
      });
      return;
    }

    if ((formExceptionType === 'remplacement_prof' || formExceptionType === 'deplacement_cours' || formExceptionType === 'evenement_special') && (!formMatiereIdNum || !formProfesseurIdNum)) {
      toast({
        title: "Matière ou Professeur manquant",
        description: "La matière et le professeur sont obligatoires pour ce type d'événement.",
        variant: "destructive",
      });
      return;
    }

    if ((formExceptionType === 'annulation' || formExceptionType === 'jour_ferie' || formExceptionType === 'evenement_special') && !formMotif) {
      toast({
        title: "Motif manquant",
        description: "Un motif est requis pour ce type d'exception.",
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
      jour: currentDay,
      heure_debut: heureDebutFormatted,
      heure_fin: heureFinFormatted,
      classe_id: selectedClassIdNum,
      professeur_id: originalProfIdForException,
      type_exception: formExceptionType,
      nouvelle_matiere_id: (formExceptionType === 'annulation' || formExceptionType === 'jour_ferie') ? null : formMatiereIdNum,
      nouveau_professeur_id: (formExceptionType === 'annulation' || formExceptionType === 'jour_ferie') ? null : formProfesseurIdNum,
      nouvelle_heure_debut: formExceptionType === 'deplacement_cours' ? heureDebutFormatted : null,
      nouvelle_heure_fin: formExceptionType === 'deplacement_cours' ? heureFinFormatted : null,
      nouvelle_classe_id: formExceptionType === 'deplacement_cours' ? selectedClassIdNum : null,
      nouveau_jour: formExceptionType === 'deplacement_cours' ? currentDay : null,
      motif: formMotif || null,
    };

    setIsSaving(true);
    try {
      let response;
      if (modalMode === 'add') {
        response = await fetch(`${API_BASE_URL}/api/exception-emploi-du-temps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        if (!editingExceptionId) throw new Error("ID d'exception manquant.");
        response = await fetch(`${API_BASE_URL}/api/exception-emploi-du-temps/${editingExceptionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) throw new Error(await response.text());

      toast({
        title: `Exception ${modalMode === 'add' ? 'ajoutée' : 'mise à jour'} !`,
        description: "L'exception a été enregistrée.",
      });
      await fetchEmploiDuTemps();

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Échec de l'enregistrement.",
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
      const response = await fetch(`${API_BASE_URL}/api/exception-emploi-du-temps/${editingExceptionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error(await response.text());

      toast({
        title: "Exception supprimée !",
        description: "L'exception a été retirée.",
      });
      await fetchEmploiDuTemps();

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la suppression.",
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
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Gestion des Emplois du Temps</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePreviousWeek} className="bg-white">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium text-gray-700">
              Semaine du {format(currentWeekStart, 'dd MMMM yyyy', { locale: fr })}
            </span>
            <Button variant="outline" size="sm" onClick={handleNextWeek} className="bg-white">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Sélectionnez les paramètres d'affichage et de gestion</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Année Académique</label>
                <Select
                  value={selectedAnneeAcademiqueId}
                  onValueChange={setSelectedAnneeAcademiqueId}
                  disabled={isLoading}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Sélectionner une année" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {anneesAcademiques.map((annee) => (
                      <SelectItem key={annee.id} value={String(annee.id)}>
                        {annee.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Vue</label>
                <Tabs value={scheduleView} onValueChange={setScheduleView} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-white">
                    <TabsTrigger value="class">Par Classe</TabsTrigger>
                    <TabsTrigger value="teacher">Par Professeur</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {scheduleView === 'class' ? (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Classe</label>
                  <Select
                    value={selectedClassId}
                    onValueChange={setSelectedClassId}
                    disabled={isLoading || filteredClassesForSelect.length === 0}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Sélectionner une classe" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {filteredClassesForSelect.length > 0 ? (
                        filteredClassesForSelect.map((cls) => (
                          <SelectItem key={cls.id} value={String(cls.id)}>
                            {cls.nom}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-classes" disabled>
                          Aucune classe disponible
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Professeur</label>
                  <Select
                    value={selectedTeacherId}
                    onValueChange={setSelectedTeacherId}
                    disabled={isLoading || teachers.length === 0}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Sélectionner un professeur" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {teachers.length > 0 ? (
                        teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={String(teacher.id)}>
                            {`${teacher.prenom} ${teacher.nom}`}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-teachers" disabled>
                          Aucun professeur disponible
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Mode de Gestion</label>
                <Select
                  value={scheduleMode}
                  onValueChange={(value: ScheduleManagementMode) => setScheduleMode(value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Sélectionner un mode" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="base">Emploi du Temps de Base</SelectItem>
                    <SelectItem value="exception">Exceptions Ponctuelles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Emploi du Temps</CardTitle>
            <CardDescription>
              {scheduleMode === 'base'
                ? 'Gestion de l\'emploi du temps récurrent'
                : 'Gestion des exceptions ponctuelles'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-400px)] rounded-md border p-4 bg-white">
                <div className="grid grid-cols-[100px_repeat(6,1fr)] gap-2 mb-2">
                  <div className="font-semibold text-gray-500"></div>
                  {currentWeekDaysInfo.map((dayInfo, index) => (
                    <div key={index} className="font-semibold text-center py-2 bg-gray-100 rounded">
                      {dayInfo.dayNameCapitalized}
                      <div className="text-xs font-normal text-gray-500">
                        {format(dayInfo.date, 'dd/MM')}
                      </div>
                    </div>
                  ))}
                </div>

                {timeSlots.map((timeSlot) => (
                  <div key={timeSlot} className="grid grid-cols-[100px_repeat(6,1fr)] gap-2 mb-2">
                    <div className="text-sm font-medium text-gray-500 py-2 flex items-center">
                      {timeSlot}
                    </div>
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
                ))}
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-[600px] bg-white">
            <DialogHeader>
              <DialogTitle>
                {scheduleMode === 'base'
                  ? modalMode === 'add'
                    ? 'Ajouter un cours récurrent'
                    : 'Modifier un cours récurrent'
                  : modalMode === 'add'
                  ? 'Ajouter une exception ponctuelle'
                  : 'Modifier une exception ponctuelle'}
              </DialogTitle>
              <DialogDescription>
                {currentDay} {currentModalDate ? format(currentModalDate, 'dd/MM/yyyy', { locale: fr }) : ''} {currentTimeSlot} pour{' '}
                {scheduleView === 'class'
                  ? classes.find((c) => c.id === parseInt(selectedClassId))?.nom || 'la classe sélectionnée'
                  : teachers.find((t) => t.id === parseInt(selectedTeacherId))
                    ? `${teachers.find((t) => t.id === parseInt(selectedTeacherId))?.prenom} ${teachers.find((t) => t.id === parseInt(selectedTeacherId))?.nom}`
                    : 'le professeur sélectionné'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {scheduleMode === 'base' ? (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="matiere" className="text-right text-sm font-medium text-gray-700">
                      Matière
                    </label>
                    <Select
                      value={formMatiereId}
                      onValueChange={handleFormMatiereChange}
                      disabled={isSaving || scheduleView === 'teacher'}
                    >
                      <SelectTrigger className="col-span-3 bg-gray-50">
                        <SelectValue placeholder="Sélectionner une matière" />
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
                            Aucune matière disponible
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="professeur" className="text-right text-sm font-medium text-gray-700">
                      Professeur
                    </label>
                    <Select
                      value={formProfesseurId}
                      onValueChange={setFormProfesseurId}
                      disabled={isSaving || true}
                    >
                      <SelectTrigger className="col-span-3 bg-gray-50">
                        <SelectValue placeholder="Sélectionner un professeur" />
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
                            Sélectionnez une matière
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
                      Type d'exception
                    </label>
                    <Select
                      value={formExceptionType}
                      onValueChange={(value: ExceptionType) => setFormExceptionType(value)}
                      disabled={isSaving}
                    >
                      <SelectTrigger className="col-span-3 bg-gray-50">
                        <SelectValue placeholder="Sélectionner le type" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="remplacement_prof">Remplacement / Modification</SelectItem>
                        <SelectItem value="annulation">Annulation</SelectItem>
                        <SelectItem value="deplacement_cours">Déplacement / Ajout Ponctuel</SelectItem>
                        <SelectItem value="jour_ferie">Jour Férié</SelectItem>
                        <SelectItem value="evenement_special">Événement Spécial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formExceptionType !== 'annulation' && formExceptionType !== 'jour_ferie' && (
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="subject" className="text-right text-sm font-medium text-gray-700">
                          Matière (Nouvelle)
                        </label>
                        <Select
                          value={formMatiereId}
                          onValueChange={handleFormMatiereChange}
                          disabled={isSaving}
                        >
                          <SelectTrigger className="col-span-3 bg-gray-50">
                            <SelectValue placeholder="Sélectionner une matière" />
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
                                Aucune matière disponible
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="teacher" className="text-right text-sm font-medium text-gray-700">
                          Professeur (Nouveau)
                        </label>
                        <Select
                          value={formProfesseurId}
                          onValueChange={setFormProfesseurId}
                          disabled={isSaving || true}
                        >
                          <SelectTrigger className="col-span-3 bg-gray-50">
                            <SelectValue placeholder="Sélectionner un professeur" />
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
                                Sélectionnez une matière
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="motif" className="text-right text-sm font-medium text-gray-700">
                      Motif
                    </label>
                    <Textarea
                      id="motif"
                      value={formMotif}
                      onChange={(e) => setFormMotif(e.target.value)}
                      placeholder="Ex: Professeur en formation, Salle occupée, Jour férié..."
                      className="col-span-3 bg-gray-50"
                      disabled={isSaving}
                    />
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={isSaving} className="bg-gray-200">
                  Annuler
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
                      Supprimer
                    </Button>
                  )}
                  <Button
                    onClick={handleSaveBaseSchedule}
                    disabled={isSaving || !formMatiereId || !formProfesseurId}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {modalMode === 'add' ? 'Ajouter' : 'Enregistrer'}
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
                      Supprimer
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
                    {modalMode === 'add' ? 'Ajouter' : 'Enregistrer'}
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
