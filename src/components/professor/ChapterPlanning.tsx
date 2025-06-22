
import React, { useCallback, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Calendar as CalendarIcon, Plus, CheckCircle, Edit, Calendar as CalendarLucide, AlertCircle } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
// import { Chapter, ChapterDisplay, Matiere, Classe } from '@/types/chapter'; // Assuming this file exists

// Define types directly here or ensure your types/chapter.ts is updated
export interface Chapter {
  id: number;
  titre: string;
  description: string;
  matiereId: number; 
  classeId: number;
  dateDebutPrevue: string; // Changé en camelCase
  dateFinPrevue: string;   // Changé en camelCase
  
  statut: 'planifié' | 'en_cours' | 'terminé';
   // Si l'API renvoie également les dates réelles en camelCase:
  dateDebutReel?: string; // Changé en camelCase
  dateFinReel?: string;   // Changé en camelCase
}
  // professeur_id, annee_scolaire_id, date_debut_reel, date_fin_reel are removed based on new table structure


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

import { useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';


const API_BASE_URL = 'http://localhost:3000/api';
// Helper types (consider moving to a shared types file if used elsewhere)
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

const getStatusBadge = (statut: Chapter['statut']) => {
 
  switch (statut) {
    case 'planifié':
      return <Badge variant="outline" className="bg-gray-50 text-gray-700">Planifié</Badge>;
    case 'en_cours':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700">En cours</Badge>;
    case 'terminé':
      return <Badge variant="outline" className="bg-green-50 text-green-700">Terminé</Badge>;
    default:
      return null;
  }
};

const formatDate = (dateString: string) => {
if (!dateString) return '-';
  return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
};

const calculateProgress = (chapters: Chapter[]) => {
  const totalChapters = chapters.length;
  if (totalChapters === 0) return 0;
  
   const termineChapters = chapters.filter(ch => ch.statut === 'terminé').length;
  return (termineChapters / totalChapters) * 100;
};

export function ChapterPlanning() {
  const { user } = useAuth();
  const [activeAnneeScolaire, setActiveAnneeScolaire] = useState<AnneeScolaire | null>(null);

  const [selectedClasseId, setSelectedClasseId] = useState<number | null>(null);
  const [selectedMatiereId, setSelectedMatiereId] = useState<number | null>(null); // Sera défini automatiquement
  const [currentSubjectName, setCurrentSubjectName] = useState<string | null>(null); // Pour afficher le nom de la matière
  const [allMatieres, setAllMatieres] = useState<Matiere[]>([]);
  const [professorClasses, setProfessorClasses] = useState<Classe[]>([]);
  // const [professorMatieresForSelectedClass, setProfessorMatieresForSelectedClass] = useState<Matiere[]>([]); // Plus nécessaire pour un select
  const [chapters, setChapters] = useState<ChapterDisplay[]>([]);
  // State to store all affectations for the active academic year
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

  // 1. Fetch active academic year
  useEffect(() => {
    const fetchActiveYear = async () => {
      // setIsLoading(true); // Set loading true when starting any fetch sequence
      try {
        const configRes = await fetch(`${API_BASE_URL}/configuration`);
        if (!configRes.ok) throw new Error("Impossible de charger la configuration de l'année scolaire.");
        const configData = await configRes.json();
        
        let fetchedAnneeScolaire: AnneeScolaire | null = null;
        if (Array.isArray(configData) && configData.length > 0) {
            fetchedAnneeScolaire = configData[0].annee_scolaire || { id: configData[0].annee_academique_active_id, libelle: 'Année active (ID seulement)' };
        } else if (configData && !Array.isArray(configData)) {
            fetchedAnneeScolaire = configData.annee_scolaire || { id: configData.annee_academique_active_id, libelle: 'Année active (ID seulement)' };
        }

        if (fetchedAnneeScolaire && fetchedAnneeScolaire.id) {
          setActiveAnneeScolaire(fetchedAnneeScolaire);
        } else {
          toast({ title: "Erreur", description: "Année scolaire active non configurée.", variant: "destructive" });
          setActiveAnneeScolaire(null);
        }
      } catch (error) {
        toast({ title: "Erreur de chargement", description: (error as Error).message, variant: "destructive" });
        setActiveAnneeScolaire(null);
        // setIsLoading(false); // If this fails, subsequent fetches might not run, so set loading false
      }
      // Don't set isLoading to false here, let the dependent effect handle it
    };
    fetchActiveYear();
  }, []); // Runs once on mount

  // 2. Fetch ALL affectations for the active year, and all matieres
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
          fetch(`${API_BASE_URL}/matieres`) // Fetch all matieres
        ]);

        if (!affectationsRes.ok) throw new Error("Failed to fetch affectations for the year.");
        if (!matieresRes.ok) throw new Error("Failed to fetch matieres.");

        const fetchedAffectations: AffectationApiResponse[] = await affectationsRes.json();
        const fetchedMatieres: Matiere[] = await matieresRes.json();

 // Filtre client explicite pour s'assurer que seules les affectations de l'année active sont conservées
        const affectationsFilteredForActiveYear = fetchedAffectations.filter(
          aff => aff.annee_scolaire && aff.annee_scolaire.id === activeAnneeScolaire.id
        );
        setAffectationsForActiveYear(affectationsFilteredForActiveYear);
              setAllMatieres(fetchedMatieres);

      } catch (error) {
        toast({ title: "Erreur de chargement", description: (error as Error).message, variant: "destructive" });
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
  }, [activeAnneeScolaire]);

  // useMemo to derive professor-specific classes from affectationsForActiveYear
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

  // Update the professorClasses state when derivedProfessorClasses changes
  // This is useful if other parts of the component rely on professorClasses being a state.
  // Otherwise, derivedProfessorClasses can be used directly in JSX.
  useEffect(() => {
    setProfessorClasses(derivedProfessorClasses);
  }, [derivedProfessorClasses]);

  // Déterminer automatiquement la matière lorsque la classe sélectionnée change
  useEffect(() => {
    if (!selectedClasseId || !user || affectationsForActiveYear.length === 0) {
      setSelectedMatiereId(null);
      setCurrentSubjectName(null);
      return;
    }

    // Trouver l'affectation pour la classe sélectionnée et le professeur connecté
    const affectationPourClasse = affectationsForActiveYear.find(
      aff => aff.classe.id === selectedClasseId && aff.professeur.id === user?.id && aff.matiere
    );

    if (affectationPourClasse && affectationPourClasse.matiere) {
      setSelectedMatiereId(affectationPourClasse.matiere.id);
      setCurrentSubjectName(affectationPourClasse.matiere.nom);
    } else {
      setSelectedMatiereId(null);
      setCurrentSubjectName(null);
      if (selectedClasseId) { // Afficher un toast uniquement si une classe est sélectionnée mais aucune matière n'est trouvée
        toast({ title: "Aucune matière", description: "Aucune matière affectée à vous pour cette classe.", variant: "default" });
      }
    }
  }, [selectedClasseId, user, affectationsForActiveYear]);

  // Fetch Chapters
  const fetchChaptersCallback = useCallback(async () => {
    // Condition to fetch: user and activeAnneeScolaire must be set
    if (!user || !activeAnneeScolaire || !activeAnneeScolaire.id) {
      setChapters([]);
      return;
    }
    setIsLoading(true);
    try {
      // ATTENTION: La nouvelle structure de la table Chapitre ne permet plus de filtrer
      // directement par professeur_id et annee_scolaire_id.
      // Vous devez décider comment récupérer les chapitres pertinents.
      // Option 1: Récupérer par classe/matière si un filtre est actif
      // Option 2: Si aucun filtre, comment déterminer les chapitres du prof?
      // Pour l'instant, on récupère par classe_id et matiere_id si sélectionnés,
      // sinon, cela pourrait retourner beaucoup de chapitres ou nécessiter une autre logique.
      let url = `${API_BASE_URL}/chapitres`;
      const queryParams = new URLSearchParams();
      if (selectedClasseId) queryParams.append('classe_id', selectedClasseId.toString());
      if (selectedMatiereId) queryParams.append('matiere_id', selectedMatiereId.toString());
      // Vous pourriez vouloir ajouter professeur_id et annee_scolaire_id si vous modifiez le backend pour gérer cela via des jointures.
      if (queryParams.toString()) url += `?${queryParams.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch chapters for professor and year');
      const data: Chapter[] = await response.json();

      const chaptersWithNames: ChapterDisplay[] = data.map(ch => ({
  ...ch,
  id: Number(ch.id), // Juste pour être sûr
  matiereId: Number(ch.matiereId), // S'assurer que c'est un nombre
  classeId: Number(ch.classeId),   // S'assurer que c'est un nombre
  className: derivedProfessorClasses.find(c => Number(c.id) === Number(ch.classeId))?.nom || 'Classe inconnue',
  subjectName: ch.description || 'Description du chapitre non disponible', // Utiliser la description du chapitre ici
}));
setChapters(chaptersWithNames);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de charger les chapitres.", variant: "destructive" });
      setChapters([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, activeAnneeScolaire, derivedProfessorClasses, allMatieres, selectedClasseId, selectedMatiereId, toast]);

  useEffect(() => {
    fetchChaptersCallback();
  }, [fetchChaptersCallback, selectedClasseId, selectedMatiereId]); // Re-fetch if class/matiere filter changes

  // Dans ChapterPlanning.tsx

const filteredChapters = useMemo(() => {
  console.log('[filteredChapters Memo] Recalculating. selectedClasseId:', selectedClasseId, 'selectedMatiereId:', selectedMatiereId);
  console.log('[filteredChapters Memo] Current chapters state (before filter):', chapters);

  if (!selectedClasseId || !selectedMatiereId) {
    console.log('[filteredChapters Memo] No selected class or subject determined, returning empty array.');
    return [];
  }

  const classeIdNum = Number(selectedClasseId);
  const matiereIdNum = Number(selectedMatiereId);

  const result = chapters.filter(chapter => {
       const chapterClasseIdNum = Number(chapter.classeId);
    const chapterMatiereIdNum = Number(chapter.matiereId);


    // **AJOUTEZ CES LOGS POUR VÉRIFIER LES VALEURS DE COMPARAISON**
    console.log(`  -- Chapter ID ${chapter.id}:`);
    console.log(`     classe_id: ${chapterClasseIdNum} (Expected: ${classeIdNum}) -> Match: ${chapterClasseIdNum === classeIdNum}`);
    console.log(`     matiere_id: ${chapterMatiereIdNum} (Expected: ${matiereIdNum}) -> Match: ${chapterMatiereIdNum === matiereIdNum}`);
    console.log(`     Overall match for chapter ${chapter.id}: ${chapterClasseIdNum === classeIdNum && chapterMatiereIdNum === matiereIdNum}`);

    return chapterClasseIdNum === classeIdNum && chapterMatiereIdNum === matiereIdNum;
  });

  console.log('[filteredChapters Memo] Filtering result:', result);
  return result;
}, [chapters, selectedClasseId, selectedMatiereId]);

  const handleAddChapter = () => {
    setEditingChapter(null);
    setFormData({
      titre: '',
      description: '',
      classe_id: '', // Will be selected in dialog
      matiere_id: '', // Will be derived from dialog's classe_id
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
      classe_id: Number(chapter.classeId), // Utiliser chapter.classeId et assigner à classe_id
      matiere_id: Number(chapter.matiereId), // Utiliser chapter.matiereId et assigner à matiere_id
     
     date_debut_prevue: chapter.dateDebutPrevue,
      date_fin_prevue: chapter.dateFinPrevue,
    });

    setDialogOpen(true);
  };

const handleSaveChapter = async () => {
    if (!formData.classe_id || !formData.matiere_id) {
      toast({ title: "Erreur", description: "Classe et matière sont requises.", variant: "destructive" });
      return;
    }
    let payload: any = { // Rendre mutable et typer en 'any' pour ajouter des propriétés dynamiquement
     titre: formData.titre,
      description: formData.description,
      classeId: Number(formData.classe_id), // Changé de classe_id à classeId
      matiereId: Number(formData.matiere_id), // Changé de matiere_id à matiereId
      dateDebutPrevue: formData.date_debut_prevue, // Assurez-vous que ces clés correspondent si elles sont dans le DTO
      dateFinPrevue: formData.date_fin_prevue,   // Assurez-vous que ces clés correspondent si elles sont dans le DTO
    };
    console.log('Initial payload for save/update:', payload);


    setIsLoading(true);
    let url = `${API_BASE_URL}/chapitres`;
    let method = 'POST';
    let payloadToSend: any = { ...payload }; // Utiliser un nouveau nom pour éviter la confusion

    if (editingChapter) {
      url += `/${editingChapter.id}`;
      method = 'PUT';
       
    } else {
      // For new chapters, set default status
      // Type assertion might be needed if payload type is too loose
      payloadToSend.statut = 'planifié';
    }
    console.log('Final payload sent to API:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
               // Attempt to parse backend error message
        let backendError = `Échec de ${editingChapter ? 'la mise à jour' : 'l\'ajout'} du chapitre. Statut: ${response.status}`;
        try {
          const errorData = await response.json();
          // NestJS ValidationPipe often returns errors in errorData.message (an array or string)
          if (errorData.message) {
            if (Array.isArray(errorData.message)) {
              backendError = errorData.message.join(', ');
            } else {
              backendError = errorData.message;
            }
          } else if (typeof errorData === 'string') {
            backendError = errorData;
          }
        } catch (e) {
          // If response.json() fails, use the status text or default message
          const textError = await response.text(); // try to get text error if json fails
          backendError = textError || response.statusText || backendError;
        }
        throw new Error(backendError);
      }
      
      // Refresh chapters list
      await fetchChaptersCallback();
      toast({ title: `Chapitre ${editingChapter ? 'mis à jour' : 'ajouté'}`, description: "Opération réussie." });
      setDialogOpen(false);
    
   } catch (error) {
      toast({ title: "Erreur", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const updateChapterStatus = async (chapterId: number, statut: Chapter['statut']) => {
    setIsLoading(true);
    const chapterToUpdate = chapters.find(ch => ch.id === chapterId);
    if (!chapterToUpdate) return;

// Définir un type plus strict pour le payload, correspondant aux champs attendus par UpdateChapitreDto
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
      // Optionnel: si on repasse un chapitre de 'terminé' à 'en_cours', on pourrait vouloir effacer dateFinReel.
      // Si votre API gère la mise à null pour effacer un champ date :
      // if (chapterToUpdate.dateFinReel) {
      //   payload.dateFinReel = null; // Ou undefined, selon comment votre backend traite cela
      // }
    } else if (statut === 'terminé') {
      if (!chapterToUpdate.dateDebutReel) {
        // Si dateDebutPrevue est une chaîne valide au format YYYY-MM-DD, utilisez-la, sinon, date du jour.
        const isValidDatePrevue = chapterToUpdate.dateDebutPrevue && /^\d{4}-\d{2}-\d{2}$/.test(chapterToUpdate.dateDebutPrevue);
        payload.dateDebutReel = isValidDatePrevue ? chapterToUpdate.dateDebutPrevue : todayFormatted;
      }
      // Toujours mettre dateFinReel à aujourd'hui si elle n'est pas déjà définie ou si on la met à jour
      if (!chapterToUpdate.dateFinReel) { // ou si vous voulez toujours la mettre à jour lors du passage à 'terminé'
        payload.dateFinReel = todayFormatted;
      } 
  }

    try {
      const response = await fetch(`${API_BASE_URL}/chapitres/${chapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to update chapter status');

      // Refresh chapters list
      await fetchChaptersCallback();
      toast({ title: "Statut mis à jour", description: "Le statut du chapitre a été modifié." });
    } catch (error) {
  let errorMessage = "Impossible de mettre à jour le statut.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      // Si l'erreur vient du fetch et que la réponse n'est pas OK, essayez de lire le message du backend
      // Note: la logique de gestion d'erreur détaillée du backend est déjà dans handleSaveChapter,
      // vous pourriez vouloir la factoriser si nécessaire.
      toast({ title: "Erreur de mise à jour", description: errorMessage, variant: "destructive" });
        } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsInProgress = (chapterId: number) => updateChapterStatus(chapterId, 'en_cours');
  const handleMarkAsComplete = (chapterId: number) => updateChapterStatus(chapterId, 'terminé');


  const progress = calculateProgress(filteredChapters);
  
  // Auto-update matiere_id in form when classe_id in form changes (for the dialog)
  useEffect(() => {
    if (dialogOpen && formData.classe_id && user && affectationsForActiveYear.length > 0) {
      const numericClasseId = Number(formData.classe_id);
      const affectation = affectationsForActiveYear.find(
        aff => aff.classe.id === numericClasseId && aff.professeur.id === user.id && aff.matiere
      );
      if (affectation && affectation.matiere) {
        setFormData(prev => ({ ...prev, matiere_id: affectation.matiere!.id }));
      } else {
        setFormData(prev => ({ ...prev, matiere_id: '' })); // Reset if no subject found
      }
    } else if (dialogOpen && !formData.classe_id) {
        // If class is deselected in dialog, reset matiere_id
        setFormData(prev => ({ ...prev, matiere_id: '' }));
    }
  }, [formData.classe_id, dialogOpen, user, affectationsForActiveYear]);
  
   // Derive subject name specifically for the dialog based on formData.classe_id
  const dialogSubjectDisplayName = useMemo(() => {
    if (!formData.classe_id || !user || affectationsForActiveYear.length === 0) {
      return formData.classe_id ? 'Matière non trouvée pour cette classe' : 'Sélectionnez une classe';
    }
    const numericClasseId = Number(formData.classe_id);
    const affectation = affectationsForActiveYear.find(aff => aff.classe.id === numericClasseId && aff.professeur.id === user.id && aff.matiere);
    return affectation?.matiere?.nom || 'Matière non trouvée pour cette classe';
  }, [formData.classe_id, user, affectationsForActiveYear]);
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Planification des Chapitres</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Chapitres planifiés</p>
                <p className="text-2xl font-bold">{filteredChapters.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                <CalendarLucide className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Chapitres terminés</p>
                <p className="text-2xl font-bold">
                  {filteredChapters.filter(ch => ch.statut === 'terminé').length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full text-green-600">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Progression</p>
                <p className="text-2xl font-bold">{Math.round(progress)}%</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
            <Progress value={progress} className="h-2 mt-4" />
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>Sélectionnez une classe et une matière pour voir la planification</CardDescription>
        </CardHeader>
        <CardContent>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-sm font-medium mb-1 block">Année Scolaire</label>
              <Input
                type="text"
                value={activeAnneeScolaire?.libelle || 'Chargement...'}
                disabled
                className="bg-gray-100"
              />
            </div>            <div>
              <label className="text-sm font-medium mb-1 block">Filtrer par Classe</label>
              <Select
                value={selectedClasseId?.toString() || ""}
                onValueChange={(value) => {
                   setSelectedClasseId(value ? Number(value) : null);
                  setSelectedMatiereId(null); // Reset matiere when class changes
                }}
                disabled={!activeAnneeScolaire || derivedProfessorClasses.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!activeAnneeScolaire ? "Sélectionnez une année" : derivedProfessorClasses.length === 0 ? "Aucune classe affectée" : "Choisir une classe"} />
                </SelectTrigger>
                <SelectContent>
                  {derivedProfessorClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>{cls.nom}</SelectItem>
                  ))}
                </SelectContent>

              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Matière (Automatique)</label>
              <Input
                type="text"
                value={
                  selectedClasseId
                    ? currentSubjectName || "Aucune matière pour cette classe"
                    : "-"
                }
                disabled
                className="bg-gray-100"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Liste des chapitres</h2>
        <Button onClick={handleAddChapter} disabled={!activeAnneeScolaire || professorClasses.length === 0 || isLoading}>
          <Plus className="mr-2 h-4 w-4" /> {/* Use derivedProfessorClasses for disabling logic */}
          Ajouter un chapitre
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Période planifiée</TableHead>
                <TableHead>Période réelle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredChapters.length > 0 ? (
                filteredChapters.map((chapter) => (
                  <TableRow key={chapter.id}>
                    <TableCell className="font-medium">
                      <div>
                        {chapter.titre}
                        <p className="text-xs text-gray-500">{chapter.subjectName || currentSubjectName || 'Matière inconnue'}</p>
                      
                      </div>
                    </TableCell>
                    <TableCell>{chapter.className || 'Classe inconnue'}</TableCell>
                    <TableCell>
                     {formatDate(chapter.dateDebutPrevue)} - {formatDate(chapter.dateFinPrevue)}
                    </TableCell>
                    <TableCell>
                       {chapter.dateDebutReel ? (
                        <>
                          {formatDate(chapter.dateDebutReel)}
                          {chapter.dateFinReel && (chapter.dateFinReel && ` - ${formatDate(chapter.dateFinReel)}`)}
                        </>
                        ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(chapter.statut)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditChapter(chapter)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        {chapter.statut === 'planifié' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                            onClick={() => handleMarkAsInProgress(chapter.id)}
                          >
                            Démarrer
                          </Button>
                        )}
                        
                        {chapter.statut === 'en_cours' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            onClick={() => handleMarkAsComplete(chapter.id)}
                          >
                            Terminer
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                    Aucun chapitre trouvé pour les filtres sélectionnés
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingChapter ? 'Modifier le chapitre' : 'Ajouter un nouveau chapitre'}</DialogTitle>
            <DialogDescription>
              Définissez les détails et la planification du chapitre
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm font-medium">Titre du chapitre</label>
              <Input
               value={formData.titre}
                onChange={(e) => setFormData({...formData, titre: e.target.value})}
                
                placeholder="Ex: Nombres entiers et opérations"
              />
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Décrivez brièvement le contenu du chapitre"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Classe</label>
                <Select 
                   value={formData.classe_id?.toString() || ''}
                  onValueChange={(value) => setFormData({...formData, classe_id: value ? Number(value) : ''})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une classe" />
                  </SelectTrigger>
                  <SelectContent>
                    {derivedProfessorClasses.map((cls) => ( // Use derivedProfessorClasses
                      <SelectItem key={cls.id} value={cls.id.toString()}>{cls.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-1">Matière</label>
                
                <Input value={dialogSubjectDisplayName}
                  
                  disabled
                  className="bg-gray-100"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Date de début prévue</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.date_debut_prevue ? (
                        formatDate(formData.date_debut_prevue)
                      ) : (
                        <span>Sélectionner une date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date_debut_prevue ? new Date(formData.date_debut_prevue) : undefined}
                      onSelect={(date) => date && setFormData({...formData, date_debut_prevue: format(date, 'yyyy-MM-dd')})}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-1">Date de fin prévue</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                       {formData.date_fin_prevue ? (
                        formatDate(formData.date_fin_prevue)
                      ) : (
                        <span>Sélectionner une date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date_fin_prevue ? new Date(formData.date_fin_prevue) : undefined}
                      onSelect={(date) => date && setFormData({...formData, date_fin_prevue: format(date, 'yyyy-MM-dd')})}
                       initialFocus
                      disabled={(date) => 
                        formData.date_debut_prevue ? date < new Date(formData.date_debut_prevue) : false
                      }
                      className="pointer-events-auto"
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
            >
              Annuler
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
              {editingChapter ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
