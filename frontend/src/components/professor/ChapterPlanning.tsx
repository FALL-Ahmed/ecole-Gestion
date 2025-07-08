import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Calendar as CalendarIcon, Plus, CheckCircle, Edit, AlertCircle } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { fr, ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2 } from 'lucide-react';

// Types
export interface Chapter {
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
}

export interface ChapterDisplay extends Chapter {
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
}

interface AnneeScolaire {
  id: number;
  libelle: string;
  date_debut?: string;
  date_fin?: string;
}

interface AffectationApiResponse {
  id: number;
  professeur: { id: number; nom: string; prenom: string; email: string; };
  matiere: { id: number; nom: string; code?: string } | null;
  classe: { id: number; nom: string; niveau: string };
  annee_scolaire: { id: number; libelle: string; dateDebut: string; dateFin: string };
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_URL}/api`;

export function ChapterPlanning() {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const dateLocale = language === 'ar' ? ar : fr;
  const { user } = useAuth();
  
  const [activeAnneeScolaire, setActiveAnneeScolaire] = useState<AnneeScolaire | null>(null);
  const [selectedClasseId, setSelectedClasseId] = useState<number | null>(null);
  const [selectedMatiereId, setSelectedMatiereId] = useState<number | null>(null);
  const [currentSubjectName, setCurrentSubjectName] = useState<string | null>(null);
  const [allMatieres, setAllMatieres] = useState<Matiere[]>([]);
  const [professorClasses, setProfessorClasses] = useState<Classe[]>([]);
  const [chapters, setChapters] = useState<ChapterDisplay[]>([]);
  const [affectationsForActiveYear, setAffectationsForActiveYear] = useState<AffectationApiResponse[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<ChapterDisplay | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    classe_id: '' as number | '',
    matiere_id: '' as number | '',
    date_debut_prevue: '',
    date_fin_prevue: '',
  });

  // Helper functions
  const getStatusBadge = (statut: Chapter['statut']) => {
    switch (statut) {
      case 'planifié':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300">{t.common.status.planned}</Badge>;
      case 'en_cours':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300">{t.common.status.inProgress}</Badge>;
      case 'terminé':
        return <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300">{t.common.status.completed}</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: dateLocale });
  };

  const calculateProgress = (chapters: Chapter[]) => {
    const totalChapters = chapters.length;
    if (totalChapters === 0) return 0;
    const termineChapters = chapters.filter(ch => ch.statut === 'terminé').length;
    return (termineChapters / totalChapters) * 100;
  };

  // Fetch active academic year
  useEffect(() => {
    const fetchActiveYear = async () => {
      try {
        const configRes = await fetch(`${API_BASE_URL}/configuration`);
        if (!configRes.ok) throw new Error(t.common.missingConfig);
        
        const configData = await configRes.json();
        let fetchedAnneeScolaire: AnneeScolaire | null = null;
        
        if (Array.isArray(configData) && configData.length > 0) {
          fetchedAnneeScolaire = configData[0].annee_scolaire || { 
            id: configData[0].annee_academique_active_id, 
            libelle: t.common.activeYear 
          };
        } else if (configData && !Array.isArray(configData)) {
          fetchedAnneeScolaire = configData.annee_scolaire || { 
            id: configData.annee_academique_active_id, 
            libelle: t.common.activeYear 
          };
        }

        if (fetchedAnneeScolaire && fetchedAnneeScolaire.id) {
          setActiveAnneeScolaire(fetchedAnneeScolaire);
        } else {
          toast({ 
            title: t.common.error, 
            description: t.common.missingConfig, 
            variant: "destructive" 
          });
          setActiveAnneeScolaire(null);
        }
      } catch (error) {
        toast({ 
          title: t.common.loadingError, 
          description: error instanceof Error ? error.message : t.common.unknownError, 
          variant: "destructive" 
        });
        setActiveAnneeScolaire(null);
      }
    };
    
    fetchActiveYear();
  }, [t]);

  // Fetch all data for the active year
  useEffect(() => {
    setSelectedClasseId(null);
    setSelectedMatiereId(null);
    setCurrentSubjectName(null);
    setChapters([]);
    setProfessorClasses([]);
    setAllMatieres([]);
    setAffectationsForActiveYear([]);

    const fetchAllDataForYear = async () => {
      if (!activeAnneeScolaire || !activeAnneeScolaire.id) {
        setAffectationsForActiveYear([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [affectationsRes, matieresRes] = await Promise.all([
          fetch(`${API_BASE_URL}/affectations?annee_scolaire_id=${activeAnneeScolaire.id}`),
          fetch(`${API_BASE_URL}/matieres`)
        ]);

        if (!affectationsRes.ok) throw new Error(t.common.errorLoadingData('affectations', affectationsRes.statusText));
        if (!matieresRes.ok) throw new Error(t.common.errorLoadingData('matieres', matieresRes.statusText));

        const fetchedAffectations: AffectationApiResponse[] = await affectationsRes.json();
        const fetchedMatieres: Matiere[] = await matieresRes.json();

        const affectationsFilteredForActiveYear = fetchedAffectations.filter(
          aff => aff.annee_scolaire && aff.annee_scolaire.id === activeAnneeScolaire.id
        );
        
        setAffectationsForActiveYear(affectationsFilteredForActiveYear);
        setAllMatieres(fetchedMatieres);

      } catch (error) {
        toast({ 
          title: t.common.loadingError, 
          description: error instanceof Error ? error.message : t.common.unknownError, 
          variant: "destructive" 
        });
        setAffectationsForActiveYear([]);
        setAllMatieres([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (activeAnneeScolaire && activeAnneeScolaire.id) {
      fetchAllDataForYear();
    } else {
      setAffectationsForActiveYear([]);
      setAllMatieres([]);
      setIsLoading(false);
    }
  }, [activeAnneeScolaire, t]);

  // Derive professor classes
  const derivedProfessorClasses = useMemo(() => {
    if (!user || affectationsForActiveYear.length === 0) {
      return [];
    }
    const professorAffs = affectationsForActiveYear.filter(aff => aff.professeur.id === user.id);
    const uniqueClassesMap = new Map<number, Classe>();
    professorAffs.forEach(aff => {
      if (aff.classe) {
        uniqueClassesMap.set(aff.classe.id, aff.classe);
      }
    });
    return Array.from(uniqueClassesMap.values());
  }, [user, affectationsForActiveYear]);

  // Update professor classes state
  useEffect(() => {
    setProfessorClasses(derivedProfessorClasses);
  }, [derivedProfessorClasses]);

  // Auto-determine subject when class changes
  useEffect(() => {
    if (!selectedClasseId || !user || affectationsForActiveYear.length === 0) {
      setSelectedMatiereId(null);
      setCurrentSubjectName(null);
      return;
    }

    const affectationPourClasse = affectationsForActiveYear.find(
      aff => aff.classe.id === selectedClasseId && aff.professeur.id === user?.id && aff.matiere
    );

    if (affectationPourClasse && affectationPourClasse.matiere) {
      setSelectedMatiereId(affectationPourClasse.matiere.id);
      setCurrentSubjectName(affectationPourClasse.matiere.nom);
    } else {
      setSelectedMatiereId(null);
      setCurrentSubjectName(null);
      if (selectedClasseId) {
        toast({ 
          title: t.chapterPlanning.noSubject, 
          description: t.chapterPlanning.noSubjectForClass, 
          variant: "default" 
        });
      }
    }
  }, [selectedClasseId, user, affectationsForActiveYear, t]);

  // Fetch chapters
  const fetchChaptersCallback = useCallback(async () => {
    if (!user || !activeAnneeScolaire || !activeAnneeScolaire.id) {
      setChapters([]);
      return;
    }
    setIsLoading(true);
    try {
      let url = `${API_BASE_URL}/chapitres`;
      const queryParams = new URLSearchParams();
      if (selectedClasseId) queryParams.append('classe_id', selectedClasseId.toString());
      if (selectedMatiereId) queryParams.append('matiere_id', selectedMatiereId.toString());
      if (queryParams.toString()) url += `?${queryParams.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(t.common.errorLoadingChapters);
      
      const data: Chapter[] = await response.json();
      const chaptersWithNames: ChapterDisplay[] = data.map(ch => ({
        ...ch,
        id: Number(ch.id),
        matiereId: Number(ch.matiereId),
        classeId: Number(ch.classeId),
        className: derivedProfessorClasses.find(c => Number(c.id) === Number(ch.classeId))?.nom || t.common.unknownClass,
        subjectName: ch.description || t.common.noDetailsAvailable,
      }));
      
      setChapters(chaptersWithNames);
    } catch (error) {
      toast({ 
        title: t.common.error, 
        description: error instanceof Error ? error.message : t.common.errorLoadingChapters, 
        variant: "destructive" 
      });
      setChapters([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, activeAnneeScolaire, derivedProfessorClasses, allMatieres, selectedClasseId, selectedMatiereId, t]);

  useEffect(() => {
    fetchChaptersCallback();
  }, [fetchChaptersCallback, selectedClasseId, selectedMatiereId]);

  // Filter chapters
  const filteredChapters = useMemo(() => {
    if (!selectedClasseId || !selectedMatiereId) {
      return [];
    }

    const classeIdNum = Number(selectedClasseId);
    const matiereIdNum = Number(selectedMatiereId);

    return chapters.filter(chapter => {
      const chapterClasseIdNum = Number(chapter.classeId);
      const chapterMatiereIdNum = Number(chapter.matiereId);
      return chapterClasseIdNum === classeIdNum && chapterMatiereIdNum === matiereIdNum;
    });
  }, [chapters, selectedClasseId, selectedMatiereId]);

  // Dialog handlers
  const handleAddChapter = () => {
    setEditingChapter(null);
    setFormData({
      titre: '',
      description: '',
      classe_id: '',
      matiere_id: '',
      date_debut_prevue: '',
      date_fin_prevue: '',
    });
    setDialogOpen(true);
  };

  const handleEditChapter = (chapter: ChapterDisplay) => {
    setEditingChapter(chapter);
    setFormData({
      titre: chapter.titre,
      description: chapter.description,
      classe_id: Number(chapter.classeId),
      matiere_id: Number(chapter.matiereId),
      date_debut_prevue: chapter.dateDebutPrevue,
      date_fin_prevue: chapter.dateFinPrevue,
    });
    setDialogOpen(true);
  };

  const handleSaveChapter = async () => {
    if (!formData.classe_id || !formData.matiere_id) {
      toast({ 
        title: t.common.requiredFieldsErrorTitle, 
        description: t.chapterPlanning.classAndSubjectRequired, 
        variant: "destructive" 
      });
      return;
    }

    let payload: any = {
      titre: formData.titre,
      description: formData.description,
      classeId: Number(formData.classe_id),
      matiereId: Number(formData.matiere_id),
      dateDebutPrevue: formData.date_debut_prevue,
      dateFinPrevue: formData.date_fin_prevue,
    };

    setIsLoading(true);
    let url = `${API_BASE_URL}/chapitres`;
    let method = 'POST';

    if (editingChapter) {
      url += `/${editingChapter.id}`;
      method = 'PUT';
    } else {
      payload.statut = 'planifié';
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let backendError = t.chapterPlanning.saveError;
        try {
          const errorData = await response.json();
          if (errorData.message) {
            backendError = Array.isArray(errorData.message) 
              ? errorData.message.join(', ') 
              : errorData.message;
          } else if (typeof errorData === 'string') {
            backendError = errorData;
          }
        } catch (e) {
          const textError = await response.text();
          backendError = textError || response.statusText || backendError;
        }
        throw new Error(backendError);
      }
      
      await fetchChaptersCallback();
      toast({ 
        title: t.common.success, 
        description: editingChapter 
          ? t.chapterPlanning.chapterUpdated 
          : t.chapterPlanning.chapterAdded 
      });
      setDialogOpen(false);
    } catch (error) {
      toast({ 
        title: t.common.error, 
        description: error instanceof Error ? error.message : t.common.unknownError, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateChapterStatus = async (chapterId: number, statut: Chapter['statut']) => {
    setIsLoading(true);
    const chapterToUpdate = chapters.find(ch => ch.id === chapterId);
    if (!chapterToUpdate) return;

    const payload: {
      statut: Chapter['statut'];
      dateDebutReel?: string;
      dateFinReel?: string;
    } = {
      statut: statut,
    };
    const todayFormatted = format(new Date(), 'yyyy-MM-dd');

    if (statut === 'en_cours') {
      if (!chapterToUpdate.dateDebutReel) {
        payload.dateDebutReel = todayFormatted;
      }
    } else if (statut === 'terminé') {
      const isValidDatePrevue = chapterToUpdate.dateDebutPrevue && /^\d{4}-\d{2}-\d{2}$/.test(chapterToUpdate.dateDebutPrevue);
      payload.dateDebutReel = isValidDatePrevue ? chapterToUpdate.dateDebutPrevue : todayFormatted;
      if (!chapterToUpdate.dateFinReel) {
        payload.dateFinReel = todayFormatted;
      } 
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/chapitres/${chapterId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(t.chapterPlanning.statusUpdateFailed);

      await fetchChaptersCallback();
      toast({ 
        title: t.common.success, 
        description: t.chapterPlanning.statusUpdated 
      });
    } catch (error) {
      toast({ 
        title: t.common.error, 
        description: error instanceof Error ? error.message : t.chapterPlanning.statusUpdateError, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsInProgress = (chapterId: number) => updateChapterStatus(chapterId, 'en_cours');
  const handleMarkAsComplete = (chapterId: number) => updateChapterStatus(chapterId, 'terminé');

  const progress = calculateProgress(filteredChapters);

  // Auto-update matiere_id in form when classe_id changes
  useEffect(() => {
    if (dialogOpen && formData.classe_id && user && affectationsForActiveYear.length > 0) {
      const numericClasseId = Number(formData.classe_id);
      const affectation = affectationsForActiveYear.find(
        aff => aff.classe.id === numericClasseId && aff.professeur.id === user.id && aff.matiere
      );
      if (affectation && affectation.matiere) {
        setFormData(prev => ({ ...prev, matiere_id: affectation.matiere!.id }));
      } else {
        setFormData(prev => ({ ...prev, matiere_id: '' }));
      }
    } else if (dialogOpen && !formData.classe_id) {
      setFormData(prev => ({ ...prev, matiere_id: '' }));
    }
  }, [formData.classe_id, dialogOpen, user, affectationsForActiveYear]);

  // Derive subject name for dialog
  const dialogSubjectDisplayName = useMemo(() => {
    if (!formData.classe_id || !user || affectationsForActiveYear.length === 0) {
      return formData.classe_id ? t.chapterPlanning.subjectNotFound : t.common.selectClass;
    }
    const numericClasseId = Number(formData.classe_id);
    const affectation = affectationsForActiveYear.find(
      aff => aff.classe.id === numericClasseId && aff.professeur.id === user.id && aff.matiere
    );
    return affectation?.matiere?.nom || t.chapterPlanning.subjectNotFound;
  }, [formData.classe_id, user, affectationsForActiveYear, t]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-screen ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`p-6 min-h-[100dvh] pb-[env(safe-area-inset-bottom)] ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-bold mb-6 dark:text-white">{t.chapterPlanning.title}</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card className="dark:bg-gray-800">
          <CardContent className="p-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t.chapterPlanning.plannedChapters}
                </p>
                <p className="text-2xl font-bold dark:text-white">{filteredChapters.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                <CalendarIcon className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800">
          <CardContent className="p-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t.chapterPlanning.completedChapters}
                </p>
                <p className="text-2xl font-bold dark:text-white">
                  {filteredChapters.filter(ch => ch.statut === 'terminé').length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full text-green-600 dark:bg-green-900 dark:text-green-300">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800">
          <CardContent className="p-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t.common.progress}
                </p>
                <p className="text-2xl font-bold dark:text-white">{Math.round(progress)}%</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full text-purple-600 dark:bg-purple-900 dark:text-purple-300">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
            <Progress value={progress} className="h-2 mt-4 dark:bg-gray-700" />
          </CardContent>
        </Card>
      </div>

      {/* Filters Card */}
      <Card className="mb-6 dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-white">{t.common.filters}</CardTitle>
          <CardDescription>{t.chapterPlanning.filterDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-sm font-medium mb-1 block dark:text-gray-300">
                {t.common.schoolYear}
              </label>
              <Input
                type="text"
                value={activeAnneeScolaire?.libelle || t.common.loadingYear}
                disabled
                className="bg-gray-100 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block dark:text-gray-300">
                {t.chapterPlanning.filterByClass}
              </label>
              <Select
                value={selectedClasseId?.toString() || ""}
                onValueChange={(value) => {
                  setSelectedClasseId(value ? Number(value) : null);
                  setSelectedMatiereId(null);
                }}
                disabled={!activeAnneeScolaire || derivedProfessorClasses.length === 0}
              >
                <SelectTrigger className="dark:bg-gray-700 dark:text-white">
                  <SelectValue 
                    placeholder={!activeAnneeScolaire 
                      ? t.common.selectYear 
                      : derivedProfessorClasses.length === 0 
                        ? t.chapterPlanning.noAssignedClasses 
                        : t.common.selectClass} 
                  />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800">
                  {derivedProfessorClasses.map((cls) => (
                    <SelectItem 
                      key={cls.id} 
                      value={cls.id.toString()}
                      className="dark:hover:bg-gray-700"
                    >
                      {cls.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block dark:text-gray-300">
                {t.chapterPlanning.subjectAuto}
              </label>
              <Input
                type="text"
                value={
                  selectedClasseId
                    ? currentSubjectName || t.chapterPlanning.noSubjectForClass
                    : "-"
                }
                disabled
                className="bg-gray-100 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
     <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold dark:text-white">{t.chapterPlanning.chapterList}</h2>
     
  
  {/* Bouton - structure interne adaptée à la direction */}
  <Button 
    onClick={handleAddChapter} 
    disabled={!activeAnneeScolaire || professorClasses.length === 0 || isLoading}
  >
            {isRTL ? (
            <>
              {t.chapterPlanning.addChapter}
              <Plus className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              {t.chapterPlanning.addChapter}
            </>
          )}

  </Button>
</div>
      <Card className="dark:bg-gray-800">
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
             <TableHeader className="dark:bg-gray-700">
  <TableRow>
    {/* Colonnes normales */}
    <TableHead className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
      {t.common.title}
    </TableHead>
    <TableHead className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
      {t.common.class}
    </TableHead>
    <TableHead className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
      {t.chapterPlanning.plannedPeriod}
    </TableHead>
    <TableHead className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
      {t.chapterPlanning.actualPeriod}
    </TableHead>
    <TableHead className={`dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
      {t.common.status.general}
    </TableHead>
    
    {/* Colonne Actions - toujours alignée à droite en LTR, à gauche en RTL */}
    <TableHead className={`dark:text-white ${isRTL ? 'text-left' : 'text-right'}`}>
      {t.common.actions}
    </TableHead>
  </TableRow>
</TableHeader>
              <TableBody>
                {filteredChapters.length > 0 ? (
                  filteredChapters.map((chapter) => (
                    <TableRow key={chapter.id} className="dark:border-gray-700">
                      <TableCell className="font-medium dark:text-white">
                        <div>
                          {chapter.titre}
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {chapter.subjectName || currentSubjectName || t.common.unknownSubject}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="dark:text-white">
                        {chapter.className || t.common.unknownClass}
                      </TableCell>
                      <TableCell className="dark:text-white">
                        {formatDate(chapter.dateDebutPrevue)} - {formatDate(chapter.dateFinPrevue)}
                      </TableCell>
                      <TableCell className="dark:text-white">
                        {chapter.dateDebutReel ? (
                          <>
                            {formatDate(chapter.dateDebutReel)}
                            {chapter.dateFinReel && ` - ${formatDate(chapter.dateFinReel)}`}
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(chapter.statut)}</TableCell>
                      <TableCell className="text-right">
                        <div className={`flex justify-end gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditChapter(chapter)}
                            className="dark:border-gray-600 dark:text-white"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          {chapter.statut === 'planifié' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-800"
                              onClick={() => handleMarkAsInProgress(chapter.id)}
                            >
                              {t.chapterPlanning.start}
                            </Button>
                          )}
                          
                          {chapter.statut === 'en_cours' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900 dark:text-green-300 dark:border-green-800"
                              onClick={() => handleMarkAsComplete(chapter.id)}
                            >
                              {t.chapterPlanning.complete}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-gray-500 dark:text-gray-400">
                      {t.chapterPlanning.noChaptersFound}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4 p-4 min-h-[100dvh] pb-[env(safe-area-inset-bottom)">
            {filteredChapters.length > 0 ? (
              filteredChapters.map((chapter) => (
                <Card key={chapter.id} className="dark:bg-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg dark:text-white">{chapter.titre}</CardTitle>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {chapter.className || t.common.unknownClass}
                      </span>
                      {getStatusBadge(chapter.statut)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {t.chapterPlanning.plannedPeriod}
                      </p>
                      <p className="dark:text-white">
                        {formatDate(chapter.dateDebutPrevue)} - {formatDate(chapter.dateFinPrevue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {t.chapterPlanning.actualPeriod}
                      </p>
                      <p className="dark:text-white">
                        {chapter.dateDebutReel ? (
                          <>
                            {formatDate(chapter.dateDebutReel)}
                            {chapter.dateFinReel && ` - ${formatDate(chapter.dateFinReel)}`}
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {t.common.subject}
                      </p>
                      <p className="dark:text-white">
                        {chapter.subjectName || currentSubjectName || t.common.unknownSubject}
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditChapter(chapter)}
                      className="dark:border-gray-600 dark:text-white"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {chapter.statut === 'planifié' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-800"
                        onClick={() => handleMarkAsInProgress(chapter.id)}
                      >
                        {t.chapterPlanning.start}
                      </Button>
                    )}
                    {chapter.statut === 'en_cours' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900 dark:text-green-300 dark:border-green-800"
                        onClick={() => handleMarkAsComplete(chapter.id)}
                      >
                        {t.chapterPlanning.complete}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                {t.chapterPlanning.noChaptersFound}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Chapter Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">
              {editingChapter ? t.chapterPlanning.editChapter : t.chapterPlanning.addChapter}
            </DialogTitle>
            <DialogDescription className="dark:text-gray-300">
              {t.chapterPlanning.chapterDetails}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm font-medium dark:text-gray-300">
                {t.common.title}
              </label>
              <Input
                value={formData.titre}
                onChange={(e) => setFormData({...formData, titre: e.target.value})}
                placeholder={t.chapterPlanning.titlePlaceholder}
                className="dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm font-medium dark:text-gray-300">
                {t.common.description}
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder={t.chapterPlanning.descriptionPlaceholder}
                className="dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1 dark:text-gray-300">
                  {t.common.class}
                </label>
                <Select 
                  value={formData.classe_id?.toString() || ''}
                  onValueChange={(value) => setFormData({...formData, classe_id: value ? Number(value) : ''})}
                >
                  <SelectTrigger className="dark:bg-gray-700 dark:text-white dark:border-gray-600">
                    <SelectValue placeholder={t.common.selectClass} />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800">
                    {derivedProfessorClasses.map((cls) => (
                      <SelectItem 
                        key={cls.id} 
                        value={cls.id.toString()}
                        className="dark:hover:bg-gray-700"
                      >
                        {cls.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-1 dark:text-gray-300">
                  {t.common.subject}
                </label>
                <Input 
                  value={dialogSubjectDisplayName}
                  disabled
                  className="bg-gray-100 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1 dark:text-gray-300">
                  {t.common.startDate}
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                        !formData.date_debut_prevue && 'text-muted-foreground'
                      }`}
                    >
                      <CalendarIcon className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      {formData.date_debut_prevue ? (
                        formatDate(formData.date_debut_prevue)
                      ) : (
                        <span>{t.common.selectDate}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 dark:bg-gray-800" align={isRTL ? 'end' : 'start'}>
                    <Calendar
                      mode="single"
                      selected={formData.date_debut_prevue ? new Date(formData.date_debut_prevue) : undefined}
                      onSelect={(date) => date && setFormData({...formData, date_debut_prevue: format(date, 'yyyy-MM-dd')})}
                      initialFocus
                      className="dark:bg-gray-800"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-1 dark:text-gray-300">
                  {t.common.endDate}
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                        !formData.date_fin_prevue && 'text-muted-foreground'
                      }`}
                    >
                      <CalendarIcon className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      {formData.date_fin_prevue ? (
                        formatDate(formData.date_fin_prevue)
                      ) : (
                        <span>{t.common.selectDate}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 dark:bg-gray-800" align={isRTL ? 'end' : 'start'}>
                    <Calendar
                      mode="single"
                      selected={formData.date_fin_prevue ? new Date(formData.date_fin_prevue) : undefined}
                      onSelect={(date) => date && setFormData({...formData, date_fin_prevue: format(date, 'yyyy-MM-dd')})}
                      initialFocus
                      disabled={(date) => 
                        formData.date_debut_prevue ? date < new Date(formData.date_debut_prevue) : false
                      }
                      className="dark:bg-gray-800"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              className="dark:border-gray-600 dark:text-white"
            >
              {t.common.cancel}
            </Button>
            <Button 
              onClick={handleSaveChapter}
              disabled={
                !formData.titre ||
                !formData.classe_id ||
                !formData.matiere_id ||
                !formData.date_debut_prevue ||
                !formData.date_fin_prevue ||
                isLoading
              }
            >
              {isLoading ? (
                <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
              ) : editingChapter ? (
                t.common.update
              ) : (
                t.common.add
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ChapterPlanning;