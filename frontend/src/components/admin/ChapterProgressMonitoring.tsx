import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, differenceInDays, isValid } from 'date-fns';
import { fr, ar } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import apiClient from '@/lib/apiClient';


// --- Type Definitions ---
export interface ChapterDisplay {
  id: number;
  titre: string;
  description: string;
  matiereId: number;
  classeId: number;
  dateDebutPrevue: string;
  dateFinPrevue: string;
  statut: 'planifié' | 'en_cours' | 'terminé';
  dateDebutReel?: string;
  dateFinReel?: string;
  className?: string;
  subjectName?: string;
}

export interface Matiere {
  id: number;
  nom: string;
  code?: string;
}

export interface Classe {
  id: number;
  nom: string;
  niveau?: string;
  annee_scolaire_id?: number;
}

interface AnneeScolaire {
  id: number;
  libelle: string;
  date_debut?: string;
  date_fin?: string;
}



interface AffectationApiResponse {
  id: number;
  professeur: { id: number; nom: string; prenom: string; email: string; role?: string };
  matiere: { id: number; nom: string; code?: string } | null;
  classe: { id: number; nom: string; niveau: string };
  annee_scolaire: { id: number; libelle: string; dateDebut: string; dateFin: string };
}

export function ChapterProgressMonitoring() {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const dateLocale = language === 'ar' ? ar : fr;
  const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-start">
    <span className="font-medium text-gray-600 dark:text-gray-300 after:content-[':'] after:mx-1">
      {label}
    </span>
    <span className="text-right font-semibold text-gray-800 dark:text-gray-100">
      {value}
    </span>
  </div>
);
const getStatusBadgeClasses = (status) => {
  // Normalisation du statut (supprime accents, espaces, underscores)
  const normalizedStatus = status
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/_/g, ' ') // Remplace les underscores par des espaces
    .trim();

  switch (normalizedStatus) {
    // Statut terminé/complété
    case 'termine':
    case 'completed':
    case 'fini':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
    
    // Statut en cours
    case 'en cours':
    case 'in progress':
    case 'progress':
      return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
    
    // Statut planifié
    case 'planifie':
    case 'planned':
    case 'a faire':
      return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
    
    // Statut en retard
    case 'retard':
    case 'late':
    case 'delayed':
      return 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800';
    
    // Statut par défaut/inconnu
    default:
      return 'bg-gray-50 text-gray-800 border-gray-200 dark:bg-gray-800/30 dark:text-gray-300 dark:border-gray-700';
  }
};
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

  // --- State for fetched data ---
  const [annees, setAnnees] = useState<AnneeScolaire[]>([]);
  const [allClasses, setAllClasses] = useState<Classe[]>([]);
  const [allMatieres, setAllMatieres] = useState<Matiere[]>([]);
  const [allProfessors, setAllProfessors] = useState<AffectationApiResponse['professeur'][]>([]);
  const [allAffectations, setAllAffectations] = useState<AffectationApiResponse[]>([]);
  const [chapters, setChapters] = useState<ChapterDisplay[]>([]);

  // --- State for filters ---
  const [selectedAnneeId, setSelectedAnneeId] = useState<string>('');
  const [selectedClasseId, setSelectedClasseId] = useState<string>('all');
  const [selectedMatiereId, setSelectedMatiereId] = useState<string>('all');

  // --- Loading State ---
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [isFetchingChapters, setIsFetchingChapters] = useState(false);

  // Helper function to format academic year display
  const formatAcademicYearDisplay = (annee: { libelle: string; date_debut?: string; date_fin?: string }): string => {
    if (!annee || !annee.date_debut || !annee.date_fin) {
      return annee.libelle || t.common.unknownYear;
    }
    const startYear = new Date(annee.date_debut).getFullYear();
    const endYear = new Date(annee.date_fin).getFullYear();
    return annee.libelle && annee.libelle.includes(String(startYear)) && annee.libelle.includes(String(endYear)) 
      ? annee.libelle 
      : `${annee.libelle || ''} (${startYear}-${endYear})`.trim();
  };

  const getStatusBadge = (statut: ChapterDisplay['statut']) => {
    switch (statut) {
      case 'planifié':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700">{t.common.status.planned}</Badge>;
      case 'en_cours':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">{t.common.status.inProgress}</Badge>;
      case 'terminé':
        return <Badge variant="outline" className="bg-green-50 text-green-700">{t.common.status.completed}</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (!isValid(date)) {
      console.warn("Invalid date string for formatting:", dateString);
      return t.common.invalidDate;
    }
    return format(date, 'dd MMM', { locale: dateLocale });
  };

  const calculateTimelineStatus = (chapter: ChapterDisplay) => {
    if (chapter.statut === 'terminé' && chapter.dateFinReel && chapter.dateFinPrevue) {
      const planned = new Date(chapter.dateFinPrevue);
      const actual = new Date(chapter.dateFinReel);

      if (!isValid(planned) || !isValid(actual)) {
        console.error("Invalid date for completed chapter timeline calculation:", chapter);
        return { status: 'error', label: t.common.invalidDate, class: 'bg-gray-50 text-gray-700' };
      }

      const diffDays = differenceInDays(actual, planned);

      if (diffDays <= 0) {
        return { status: 'on-time', label: t.common.onTime, class: 'bg-green-50 text-green-700' };
      } else if (diffDays <= 7) {
        return { status: 'slight-delay', label: t.common.slightDelay, class: 'bg-yellow-50 text-yellow-700' };
      } else {
        return { status: 'delayed', label: t.common.delayed, class: 'bg-red-50 text-red-700' };
      }
    }

    if (chapter.statut === 'en_cours' && chapter.dateFinPrevue) {
      const today = new Date();
      const endDate = new Date(chapter.dateFinPrevue);

      if (!isValid(endDate)) {
        console.error("Invalid end date for in-progress chapter timeline calculation:", chapter);
        return { status: 'error', label: t.common.invalidDate, class: 'bg-gray-50 text-gray-700' };
      }

      if (today > endDate) {
        return { status: 'overdue', label: t.common.overdue, class: 'bg-red-50 text-red-700' };
      }
    }
    return { status: 'on-track', label: t.common.status.inProgress, class: 'bg-blue-50 text-blue-700' };
  };

  // --- Fetch Initial Data ---
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingInitialData(true);
      try {
      const [anneesResponse, classesResponse, matieresResponse, usersResponse, affectationsResponse] = await Promise.all([
          apiClient.get('/annees-academiques'),
          apiClient.get('/classes'),
          apiClient.get('/matieres'),
          apiClient.get('/users'),
          apiClient.get('/affectations?include=professeur,matiere,classe,annee_scolaire'),
        ]);

              const anneesData = anneesResponse.data;
        const classesData = classesResponse.data;
        const matieresData = matieresResponse.data;
        const usersData = usersResponse.data;
        const affectationsData = affectationsResponse.data;



        setAnnees(anneesData);
        setAllClasses(classesData);
        setAllMatieres(matieresData);
        setAllAffectations(affectationsData);

        const professorUsers = usersData.filter(user => user.role === 'professeur');
        setAllProfessors(professorUsers);

        if (anneesData.length > 0) {
          const currentYear = new Date().getFullYear();
          const activeAnnee = anneesData.find(an =>
            an.date_debut && an.date_fin &&
            new Date(an.date_debut).getFullYear() <= currentYear &&
            new Date(an.date_fin).getFullYear() >= currentYear
          ) || anneesData[0];
          setSelectedAnneeId(String(activeAnnee.id));
        }

      } catch (error) {
        console.error('Error loading initial data:', error);
        toast({
          title: t.common.errorLoading,
          description: error instanceof Error 
            ? `${t.common.errorLoadingInitialData}: ${error.message}` 
            : t.common.unknownError,
          variant: 'destructive',
        });
      } finally {
        setIsLoadingInitialData(false);
      }
    };

    fetchInitialData();
  }, [t]);

  // --- Fetch Chapters based on Filters ---
  const fetchChapters = useCallback(async () => {
  if (!selectedAnneeId) {
    setChapters([]);
    return;
  }

  setIsFetchingChapters(true);
  try {
    const params = new URLSearchParams({ annee_scolaire_id: selectedAnneeId });
    
    if (selectedClasseId !== 'all') {
      params.append('classe_id', selectedClasseId);
    }
    
    if (selectedMatiereId !== 'all') {
          params.append('matiere_id', selectedMatiereId);
    }

    const response = await apiClient.get(`/chapitres?${params.toString()}`);
    
    const data: ChapterDisplay[] = response.data || [];
    
    // Filtrer une seconde fois côté client pour être sûr
    const filteredData = data.filter(ch => {
      const classe = allClasses.find(c => c.id === ch.classeId);
      return classe?.annee_scolaire_id?.toString() === selectedAnneeId;
    });

    const chaptersWithNames = filteredData.map(ch => {
      const classe = allClasses.find(c => c.id === ch.classeId);
      const matiere = allMatieres.find(m => m.id === ch.matiereId);
      return {
        ...ch,
        className: classe?.nom || t.common.unknownClass,
        subjectName: matiere ? matiere.nom : t.common.unknownSubject,
      };
    });

    setChapters(chaptersWithNames);
  }    catch (error: any) {
    if (error.response && (error.response.status === 404 || error.response.status === 204)) {
      setChapters([]); // No data found, not an error
    } else {
      console.error('Error fetching chapters:', error);
      toast({
        title: t.common.errorLoading,
        description: error.message 
          ? error.message 
          : t.common.errorLoadingChapters,
        variant: "destructive"
      });
      setChapters([]);
    
    }
  } finally {
    setIsFetchingChapters(false);
  }
}, [selectedAnneeId, selectedClasseId, selectedMatiereId, allClasses, allMatieres, t]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  // --- Filter Options for Selects ---
 const classesForSelectedAnnee = useMemo(() => {
  if (!selectedAnneeId) return [];
  return allClasses.filter(cls => 
    cls.annee_scolaire_id?.toString() === selectedAnneeId
  );
}, [allClasses, selectedAnneeId]);

  const matieresForSelectedAnneeAndClasse = useMemo(() => {
    if (!selectedAnneeId || selectedClasseId === 'all') return [];
    const relevantAffectations = allAffectations.filter(aff =>
      String(aff.annee_scolaire.id) === selectedAnneeId &&
      String(aff.classe.id) === selectedClasseId &&
      aff.matiere
    );
    const matiereIds = new Set(relevantAffectations.map(aff => aff.matiere!.id));
    return allMatieres.filter(matiere => matiereIds.has(matiere.id));
  }, [allMatieres, allAffectations, selectedAnneeId, selectedClasseId]);

  // --- Derived Data for Display ---
  const displayChapters = chapters;

  const teacherPerformanceData = useMemo(() => {
    if (displayChapters.length === 0 || allAffectations.length === 0 || allProfessors.length === 0) {
      return [];
    }

    const performanceMap = new Map<number, {
      id: number;
      name: string;
      subjects: Set<string>;
      classes: Set<string>;
      chaptersCompleted: number;
      chaptersTotal: number;
    }>();

    displayChapters.forEach(chapter => {
      const relevantAffectation = allAffectations.find(aff =>
        aff.classe.id === chapter.classeId &&
        aff.matiere?.id === chapter.matiereId &&
        String(aff.annee_scolaire.id) === selectedAnneeId
      );

      if (relevantAffectation?.professeur) {
        const prof = relevantAffectation.professeur;
        const profId = prof.id;

        if (!performanceMap.has(profId)) {
          performanceMap.set(profId, {
            id: profId,
            name: `${prof.prenom} ${prof.nom}`,
            subjects: new Set(),
            classes: new Set(),
            chaptersCompleted: 0,
            chaptersTotal: 0,
          });
        }

        const profStats = performanceMap.get(profId)!;
        profStats.subjects.add(chapter.subjectName || t.common.unknownSubject);
        profStats.classes.add(chapter.className || t.common.unknownClass);
        profStats.chaptersTotal++;
        if (chapter.statut === 'terminé') {
          profStats.chaptersCompleted++;
        }
      }
    });

    return Array.from(performanceMap.values()).map(stats => ({
      ...stats,
      subjects: Array.from(stats.subjects).map(s => translateSubject(s)).join(', '),
      classes: Array.from(stats.classes).join(', '),
    }));
  }, [displayChapters, allAffectations, selectedAnneeId, allProfessors, t, translateSubject]);

  // --- Calculations for Summary Cards ---
const calculateOverallProgress = () => {
  const filteredChapters = chapters; // déjà filtrés par fetchChapters
  const total = filteredChapters.length;
  if (total === 0) return 0;
  const completed = filteredChapters.filter(ch => ch.statut === 'terminé').length;
  return (completed / total) * 100;
};

const calculateTimelineAdherence = () => {
  const filteredChapters = chapters; // déjà filtrés par fetchChapters
  const completedChapters = filteredChapters.filter(ch => 
    ch.statut === 'terminé' && ch.dateFinReel && ch.dateFinPrevue
  );
  
  if (completedChapters.length === 0) return 100;

  const onTimeChapters = completedChapters.filter(ch => {
    const planned = new Date(ch.dateFinPrevue!);
    const actual = new Date(ch.dateFinReel!);
    return isValid(planned) && isValid(actual) && actual <= planned;
  }).length;
  
  return (onTimeChapters / completedChapters.length) * 100;
};
  // --- Handle Filter Changes ---
  const handleAnneeChange = (value: string) => {
    setSelectedAnneeId(value);
    setSelectedClasseId('all');
    setSelectedMatiereId('all');
  };

  const handleClasseChange = (value: string) => {
    setSelectedClasseId(value);
    setSelectedMatiereId('all');
  };

  if (isLoadingInitialData) {
    return (
      <div className={`flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
        <Loader2 className="h-16 w-16 animate-spin text-blue-500 mb-4" />
        <span className="text-2xl font-medium text-gray-700 dark:text-gray-300">
          {t.common.loadingInitialData}
        </span>
      </div>
    );
  }

  return (
    <div className={`p-6 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-bold mb-6 dark:text-white">
        {t.chapterMonitoring.title}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t.chapterMonitoring.chaptersToTrack}
                </p>
                <p className="text-2xl font-bold dark:text-white">
                  {displayChapters.length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full text-blue-600 dark:text-blue-300">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      <Card className="dark:bg-gray-800">
  <CardContent className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {t.chapterMonitoring.overallProgress}
        </p>
        <p className="text-2xl font-bold dark:text-white">
          {chapters.length > 0 ? Math.round(calculateOverallProgress()) : 0}%
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {chapters.length} {t.chapterMonitoring.chapters.toLowerCase()}
        </p>
      </div>
      <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full text-green-600 dark:text-green-300">
        <AlertCircle className="h-6 w-6" />
      </div>
    </div>
    <Progress 
      value={calculateOverallProgress()} 
      className="h-2 mt-4 bg-gray-200 dark:bg-gray-600" 
    />
  </CardContent>
</Card>
        <Card className="dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t.chapterMonitoring.scheduleAdherence}
                </p>
                <p className="text-2xl font-bold dark:text-white">
                  {Math.round(calculateTimelineAdherence())}%
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full text-orange-600 dark:text-orange-300">
                <Clock className="h-6 w-6" />
              </div>
            </div>
            <Progress value={calculateTimelineAdherence()}   className="h-2 mt-4 bg-gray-200 dark:bg-gray-600" 
 />
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6 dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-white">{t.common.filters}</CardTitle>
          <CardDescription>{t.chapterMonitoring.filterDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block dark:text-gray-300">
                {t.common.schoolYear}
              </label>
              <Select value={selectedAnneeId} onValueChange={handleAnneeChange} disabled={annees.length === 0}>
                <SelectTrigger className={isRTL ? 'text-right' : 'text-left'}>
                  <SelectValue placeholder={t.common.selectYear} />
                </SelectTrigger> 
                <SelectContent className={isRTL ? 'text-right' : 'text-left'}>
                  {annees.map(annee => (
                    <SelectItem key={annee.id} value={String(annee.id)}>
                      {formatAcademicYearDisplay(annee)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block dark:text-gray-300">
                {t.common.class}
              </label>
              <Select 
  value={selectedClasseId} 
  onValueChange={handleClasseChange} 
  disabled={!selectedAnneeId || classesForSelectedAnnee.length === 0}
>
  <SelectTrigger>
    <SelectValue placeholder={t.common.selectClass} />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">
      {t.common.allClasses} ({classesForSelectedAnnee.length})
    </SelectItem>
    {classesForSelectedAnnee.map(cls => (
      <SelectItem key={cls.id} value={String(cls.id)}>
        {cls.nom}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block dark:text-gray-300">
                {t.common.subject}
              </label>
              <Select 
                value={selectedMatiereId} 
                onValueChange={setSelectedMatiereId} 
                disabled={selectedClasseId === 'all' || matieresForSelectedAnneeAndClasse.length === 0}
              >
                <SelectTrigger className={isRTL ? 'text-right' : 'text-left'}>
                  <SelectValue placeholder={selectedClasseId === 'all' ? t.common.selectClass : t.common.allSubjects} />
                </SelectTrigger>
                <SelectContent className={isRTL ? 'text-right' : 'text-left'}>
                  <SelectItem value="all">{t.common.allSubjects}</SelectItem>
                  {matieresForSelectedAnneeAndClasse.map(matiere => (
                    <SelectItem key={matiere.id} value={String(matiere.id)}>{translateSubject(matiere.nom)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="teachers" className="space-y-4">
        
      <TabsList className="dark:bg-gray-800" dir={isRTL ? 'rtl' : 'ltr'}>
  <TabsTrigger value="teachers" className="dark:text-white">
    {t.common.teachers}
  </TabsTrigger>
  <TabsTrigger value="chapters" className="dark:text-white">
    {t.chapterMonitoring.chapters}
  </TabsTrigger>
</TabsList>

        <TabsContent value="chapters" className="space-y-4">
  <Card className="dark:bg-gray-800">
    <CardHeader>
      <CardTitle className="dark:text-white">
        {t.chapterMonitoring.chapterTracking}
      </CardTitle>
      <CardDescription>
        {t.chapterMonitoring.chapterTrackingDescription}
      </CardDescription>
    </CardHeader>
    <CardContent className="p-0">
      {isFetchingChapters ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-3" />
          <span className="text-lg text-gray-600 dark:text-gray-300">
            {t.common.loadingChapters}
          </span>
        </div>
      ) : displayChapters.length === 0 ? (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          {selectedAnneeId 
            ? t.chapterMonitoring.noChaptersFound 
            : t.chapterMonitoring.selectYearPrompt}
        </div>
      ) : (
        <>
          {/* Desktop View */}
          <div className={`hidden lg:block overflow-y-scroll overflow-x-auto h-[20vh] border rounded-lg dark:border-gray-700`} 
               dir={isRTL ? 'rtl' : 'ltr'}>
            <table className="w-full caption-bottom text-sm">
              <TableHeader className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                <TableRow>
                  <TableHead className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.common.chapter}
                  </TableHead>
                  <TableHead className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.common.class}
                  </TableHead>
                  <TableHead className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.common.subject}
                  </TableHead>
                  <TableHead className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.chapterMonitoring.planned}
                  </TableHead>
                  <TableHead className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.chapterMonitoring.actual}
                  </TableHead>
                  <TableHead className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.common.status.general}
                  </TableHead>
                  <TableHead className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.chapterMonitoring.schedule}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <tbody className="[&_tr:last-child]:border-0">
                {displayChapters.map((chapter) => {
                  const timelineStatus = calculateTimelineStatus(chapter);
                  return (
                    <TableRow key={chapter.id} className="dark:border-gray-700">
                      <TableCell className={`font-medium dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                        {chapter.titre}
                        <p className={`text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs ${isRTL ? 'text-right' : 'text-left'}`}>
                          {chapter.description}
                        </p>
                      </TableCell>
                      <TableCell className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                        {chapter.className || t.common.na}
                      </TableCell>
                      <TableCell className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                        {translateSubject(chapter.subjectName || '')}
                      </TableCell>
                      <TableCell className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                        {formatDate(chapter.dateDebutPrevue)} - {formatDate(chapter.dateFinPrevue)}
                      </TableCell>
                      <TableCell className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                        {chapter.dateDebutReel ? (
                          <>
                            {formatDate(chapter.dateDebutReel)}
                            {chapter.dateFinReel && ` - ${formatDate(chapter.dateFinReel)}`}
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                        {getStatusBadge(chapter.statut)}
                      </TableCell>
                      <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                        {chapter.statut !== 'planifié' && (
                          <Badge variant="outline" className={timelineStatus.class}>
                            {timelineStatus.label}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </tbody>
            </table>
          </div>

                  {/* Mobile View */}
<div
  className={`block lg:hidden space-y-5 p-4 ${isRTL ? 'text-right' : 'text-left'}`}
  dir={isRTL ? 'rtl' : 'ltr'}
>
  {displayChapters.map((chapter) => {
    const timelineStatus = calculateTimelineStatus(chapter);
    return (
      <Card
        key={chapter.id}
        className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 rounded-xl"
      >
        <CardHeader className="pb-2 border-b border-gray-100 dark:border-gray-700">
          {/* Inversion ici */}
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
            <CardTitle className="text-base font-bold text-blue-600 dark:text-blue-300 leading-snug">
              {chapter.titre}
            </CardTitle>
            
          </div>
          <div
  className={`flex items-center justify-between px-3 py-2 rounded-md ${
    isRTL ? 'flex-row-reverse' : 'flex-row'
  } bg-gray-50 dark:bg-gray-900 shadow-sm`}
>
  <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm whitespace-nowrap select-none">
    {t.common.status.general}
  </span>
  <span
  className={`inline-block px-3 py-1 rounded-full border text-sm font-semibold capitalize select-none ${getStatusBadgeClasses(chapter.statut)}`}
>
  {{
    'planifié': t.common.status.planned,
    'en_cours': t.common.status.inProgress,
    'terminé': t.common.status.completed
  }[chapter.statut] || chapter.statut}
</span>
</div>


          {chapter.description && (
            <CardDescription className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              {chapter.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-3 text-sm pt-3">
          <InfoRow label={t.common.class} value={chapter.className || t.common.na} />
          <InfoRow label={t.common.subject} value={translateSubject(chapter.subjectName || '')} />
          <InfoRow
            label={t.chapterMonitoring.planned}
            value={`${formatDate(chapter.dateDebutPrevue)} - ${formatDate(chapter.dateFinPrevue)}`}
          />
          <InfoRow
            label={t.chapterMonitoring.actual}
            value={
              chapter.dateDebutReel
                ? `${formatDate(chapter.dateDebutReel)} - ${formatDate(chapter.dateFinReel)}`
                : '-'
            }
          />

          {chapter.statut !== 'planifié' && (
            <div className="flex justify-between items-center pt-1">
              <span className="font-medium text-gray-600 dark:text-gray-300 after:content-[':'] after:mx-1">
                {t.chapterMonitoring.schedule}
              </span>
              <Badge
                variant="outline"
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${timelineStatus.class}`}
              >
                {timelineStatus.label}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  })}
</div>

                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

       <TabsContent value="teachers" className="space-y-4">
  <Card className="dark:bg-gray-800">
    <CardHeader>
      <CardTitle className="dark:text-white">
        {t.chapterMonitoring.teacherPerformance}
      </CardTitle>
      <CardDescription>
        {t.chapterMonitoring.teacherPerformanceDescription}
      </CardDescription>
    </CardHeader>
    <CardContent className="p-0">
      {isFetchingChapters ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-3" />
          <span className="text-lg text-gray-600 dark:text-gray-300">
            {t.common.loadingData}
          </span>
        </div>
      ) : teacherPerformanceData.length > 0 ? (
        <>
          {/* Desktop View */}
          <div className={`hidden lg:block overflow-y-scroll overflow-x-auto h-[20vh] border rounded-lg dark:border-gray-700`} 
               dir={isRTL ? 'rtl' : 'ltr'}>
            <table className="w-full caption-bottom text-sm">
              <TableHeader className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                <TableRow>
                  <TableHead className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.common.teacher}
                  </TableHead>
                  <TableHead className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.common.subjects}
                  </TableHead>
                  <TableHead className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.common.classes}
                  </TableHead>
                  <TableHead className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.chapterMonitoring.completedChapters}
                  </TableHead>
                  <TableHead className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.common.progress}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <tbody className="[&_tr:last-child]:border-0">
                {teacherPerformanceData.map((teacher) => (
                  <TableRow key={teacher.id} className="dark:border-gray-700">
                    <TableCell className={`font-medium dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                      {teacher.name}
                    </TableCell>
                    <TableCell className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                      {teacher.subjects}
                    </TableCell>
                    <TableCell className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                      {teacher.classes}
                    </TableCell>
                    <TableCell className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                      {teacher.chaptersCompleted} / {teacher.chaptersTotal}
                    </TableCell>
                    <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                      <div className={`flex items-center ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row justify-start'} space-x-2`}>
                        <Progress
                          value={teacher.chaptersTotal > 0 ? (teacher.chaptersCompleted / teacher.chaptersTotal) * 100 : 0}
  className="h-2 w-[100px] bg-gray-200 dark:bg-gray-600"
                        />
                        <span className="text-sm font-medium dark:text-white">
                          {teacher.chaptersTotal > 0 ? Math.round((teacher.chaptersCompleted / teacher.chaptersTotal) * 100) : 0}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </table>
          </div>

                  {/* Mobile View */}
<div
  className={`block lg:hidden space-y-5 p-4 ${isRTL ? 'text-right' : 'text-left'}`}
  dir={isRTL ? 'rtl' : 'ltr'}
>
  {teacherPerformanceData.map((teacher) => (
    <Card
      key={teacher.id}
      className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 rounded-xl"
    >
      <CardHeader className="pb-2 border-b border-gray-100 dark:border-gray-700">
        <CardTitle className="text-base font-bold text-blue-600 dark:text-blue-300 leading-snug">
          {teacher.name}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 text-sm pt-3">
        <InfoRow label={t.common.subjects} value={teacher.subjects} />
        <InfoRow label={t.common.classes} value={teacher.classes} />
        <InfoRow
          label={t.chapterMonitoring.completedChapters}
          value={`${teacher.chaptersCompleted} / ${teacher.chaptersTotal}`}
        />

        <div>
          <span className="font-medium text-gray-600 dark:text-gray-300 after:content-[':'] after:mx-1">
            {t.common.progress}
          </span>
          <div className="flex items-center gap-2 mt-2">
            <Progress
              value={teacher.chaptersTotal > 0 ? (teacher.chaptersCompleted / teacher.chaptersTotal) * 100 : 0}
              className="h-2 flex-1 bg-gray-200 dark:bg-gray-600 rounded-full"
            />
            <span className="text-xs font-medium dark:text-white">
              {teacher.chaptersTotal > 0
                ? Math.round((teacher.chaptersCompleted / teacher.chaptersTotal) * 100)
                : 0}
              %
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  ))}
</div>

                </>
              ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  {selectedAnneeId 
                    ? t.chapterMonitoring.noTeacherData 
                    : t.chapterMonitoring.selectYearPrompt}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ChapterProgressMonitoring;