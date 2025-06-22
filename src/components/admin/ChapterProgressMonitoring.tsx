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
import { fr } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// --- Type Definitions ---
// (These should ideally be in a shared types file if used across multiple components)

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
  // Added for display purposes:
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

const API_BASE_URL = 'http://localhost:3000/api';

// --- Helper Functions ---

const getStatusBadge = (statut: ChapterDisplay['statut']) => {
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

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (!isValid(date)) {
    console.warn("Invalid date string for formatting:", dateString);
    return 'Date invalide';
  }
  return format(date, 'dd MMM', { locale: fr });
};

const calculateTimelineStatus = (chapter: ChapterDisplay) => {
  if (chapter.statut === 'terminé' && chapter.dateFinReel && chapter.dateFinPrevue) {
    const planned = new Date(chapter.dateFinPrevue);
    const actual = new Date(chapter.dateFinReel);

    if (!isValid(planned) || !isValid(actual)) {
      console.error("Invalid date for completed chapter timeline calculation:", chapter);
      return { status: 'error', label: 'Date invalide', class: 'bg-gray-50 text-gray-700' };
    }

    const diffDays = differenceInDays(actual, planned);

    if (diffDays <= 0) {
      return { status: 'on-time', label: 'À temps', class: 'bg-green-50 text-green-700' };
    } else if (diffDays <= 7) {
      return { status: 'slight-delay', label: 'Léger retard', class: 'bg-yellow-50 text-yellow-700' };
    } else {
      return { status: 'delayed', label: 'En retard', class: 'bg-red-50 text-red-700' };
    }
  }

  if (chapter.statut === 'en_cours' && chapter.dateFinPrevue) {
    const today = new Date();
    const endDate = new Date(chapter.dateFinPrevue);

    if (!isValid(endDate)) {
      console.error("Invalid end date for in-progress chapter timeline calculation:", chapter);
      return { status: 'error', label: 'Date invalide', class: 'bg-gray-50 text-gray-700' };
    }

    if (today > endDate) {
      return { status: 'overdue', label: 'Dépassé', class: 'bg-red-50 text-red-700' };
    }
  }
  // Default status for 'planifié' or 'en_cours' not yet overdue
  return { status: 'on-track', label: 'En cours', class: 'bg-blue-50 text-blue-700' };
};

// --- Main Component ---
export function ChapterProgressMonitoring() {
  // --- State for fetched data ---
  const [annees, setAnnees] = useState<AnneeScolaire[]>([]);
  const [allClasses, setAllClasses] = useState<Classe[]>([]);
  const [allMatieres, setAllMatieres] = useState<Matiere[]>([]);
  const [allProfessors, setAllProfessors] = useState<AffectationApiResponse['professeur'][]>([]);
  const [allAffectations, setAllAffectations] = useState<AffectationApiResponse[]>([]);
  const [chapters, setChapters] = useState<ChapterDisplay[]>([]);

  // --- State for filters ---
  const [selectedAnneeId, setSelectedAnneeId] = useState<string>('');
  // Change initial state for class and matiere filters to 'all' instead of empty string
  const [selectedClasseId, setSelectedClasseId] = useState<string>('all');
  const [selectedMatiereId, setSelectedMatiereId] = useState<string>('all');

  // --- Loading State ---
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [isFetchingChapters, setIsFetchingChapters] = useState(false);


  // --- Fetch Initial Data (Years, All Classes, All Matieres, All Users, All Affectations) ---
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingInitialData(true);
      try {
        const [anneesRes, classesRes, matieresRes, usersRes, affectationsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/annees-academiques`),
          fetch(`${API_BASE_URL}/classes`),
          fetch(`${API_BASE_URL}/matieres`),
          fetch(`${API_BASE_URL}/users`),
          fetch(`${API_BASE_URL}/affectations?include=professeur,matiere,classe,annee_scolaire`),
        ]);

        const checkAndParseResponse = async (res: Response, name: string) => {
          if (!res.ok) {
            const errorBody = await res.text(); // Get raw text for better debugging
            throw new Error(`Failed to load ${name}: ${res.status} - ${errorBody}`);
          }
          return res.json();
        };

        const [anneesData, classesData, matieresData, usersData, affectationsData]:
          [AnneeScolaire[], Classe[], Matiere[], any[], AffectationApiResponse[]] = await Promise.all([
            checkAndParseResponse(anneesRes, 'academic years'),
            checkAndParseResponse(classesRes, 'classes'),
            checkAndParseResponse(matieresRes, 'subjects'),
            checkAndParseResponse(usersRes, 'users'),
            checkAndParseResponse(affectationsRes, 'assignments'),
          ]);

        setAnnees(anneesData);
        setAllClasses(classesData);
        setAllMatieres(matieresData);
        setAllAffectations(affectationsData);

        const professorUsers = usersData.filter(user => user.role === 'professeur');
        setAllProfessors(professorUsers);

        // Attempt to set the current or first academic year as default
        if (anneesData.length > 0) {
          const currentYear = new Date().getFullYear();
          const activeAnnee = anneesData.find(an =>
            an.date_debut && an.date_fin &&
            new Date(an.date_debut).getFullYear() <= currentYear &&
            new Date(an.date_fin).getFullYear() >= currentYear
          ) || anneesData[0]; // Fallback to first if no active year found
          setSelectedAnneeId(String(activeAnnee.id));
        }

      } catch (error) {
        console.error('🔥 Global error loading initial data:', error);
        toast({
          title: 'Erreur de chargement initial',
          description: error instanceof Error ? `Impossible de charger les données: ${error.message}` : 'Une erreur inconnue est survenue.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingInitialData(false);
      }
    };

    fetchInitialData();
  }, []);

  // --- Fetch Chapters based on Filters ---
  const fetchChapters = useCallback(async () => {
    if (!selectedAnneeId) {
      setChapters([]);
      // No toast here, as it's a valid state (no year selected)
      return;
    }

    setIsFetchingChapters(true);
    try {
      let url = `${API_BASE_URL}/chapitres?annee_scolaire_id=${selectedAnneeId}`;
      // Modify URL construction to handle 'all' value
      if (selectedClasseId !== 'all') url += `&classe_id=${selectedClasseId}`;
      if (selectedMatiereId !== 'all') url += `&matiere_id=${selectedMatiereId}`;

      const response = await fetch(url);
      if (!response.ok) {
        // Handle 404/204 as no content, not an error that needs a toast
        if (response.status === 404 || response.status === 204) {
          setChapters([]);
          return;
        }
        const errorText = await response.text();
        throw new Error(`Failed to fetch chapters: ${response.status} - ${errorText}`);
      }
      const data: ChapterDisplay[] = await response.json();

      const chaptersWithNames: ChapterDisplay[] = data.map(ch => {
        const classe = allClasses.find(c => c.id === ch.classeId);
        const matiere = allMatieres.find(m => m.id === ch.matiereId);
        return {
          ...ch,
          className: classe?.nom || 'Classe inconnue',
          subjectName: matiere?.nom || 'Matière inconnue',
        };
      });
      setChapters(chaptersWithNames);
    } catch (error) {
      console.error('🔥 Error fetching chapters:', error);
      toast({
        title: "Erreur de chargement des chapitres",
        description: error instanceof Error ? error.message : "Impossible de charger les chapitres.",
        variant: "destructive"
      });
      setChapters([]);
    } finally {
      setIsFetchingChapters(false);
    }
  }, [selectedAnneeId, selectedClasseId, selectedMatiereId, allClasses, allMatieres]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]); // Rerun when fetchChapters dependency changes (filters change)

  // --- Filter Options for Selects ---
  const classesForSelectedAnnee = useMemo(() => {
    if (!selectedAnneeId) return [];
    const filteredByAnnee = allClasses.filter(cls => String(cls.annee_scolaire_id) === selectedAnneeId);
    return filteredByAnnee;
  }, [allClasses, selectedAnneeId]);

  const matieresForSelectedAnneeAndClasse = useMemo(() => {
    if (!selectedAnneeId || selectedClasseId === 'all') return []; // If 'all classes' is selected, no specific matiere filter applies based on class.
    const relevantAffectations = allAffectations.filter(aff =>
      String(aff.annee_scolaire.id) === selectedAnneeId &&
      String(aff.classe.id) === selectedClasseId &&
      aff.matiere // Ensure matiere is not null
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
      // Find an affectation that matches the chapter's context (class, subject, academic year)
      const relevantAffectation = allAffectations.find(aff =>
        aff.classe.id === chapter.classeId &&
        aff.matiere?.id === chapter.matiereId &&
        String(aff.annee_scolaire.id) === selectedAnneeId
      );

      if (relevantAffectation && relevantAffectation.professeur) {
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
        profStats.subjects.add(chapter.subjectName || 'Matière inconnue');
        profStats.classes.add(chapter.className || 'Classe inconnue');
        profStats.chaptersTotal++;
        if (chapter.statut === 'terminé') {
          profStats.chaptersCompleted++;
        }
      }
    });

    return Array.from(performanceMap.values()).map(stats => ({
      ...stats,
      // Convert Sets to comma-separated strings for display
      subjects: Array.from(stats.subjects).join(', '),
      classes: Array.from(stats.classes).join(', '),
    }));
  }, [displayChapters, allAffectations, selectedAnneeId, allProfessors]);

  // --- Calculations for Summary Cards ---
  const calculateOverallProgress = () => {
    const total = displayChapters.length;
    if (total === 0) return 0;
    const completed = displayChapters.filter(ch => ch.statut === 'terminé').length;
    return (completed / total) * 100;
  };

  const calculateTimelineAdherence = () => {
    const completedChapters = displayChapters.filter(ch => ch.statut === 'terminé' && ch.dateFinReel && ch.dateFinPrevue);
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
    // Reset class and subject filters to 'all' when academic year changes
    setSelectedClasseId('all');
    setSelectedMatiereId('all');
  };

  const handleClasseChange = (value: string) => {
    setSelectedClasseId(value);
    // Reset subject filter to 'all' when class changes
    setSelectedMatiereId('all');
  };

  // --- Render Logic ---
  if (isLoadingInitialData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Loader2 className="h-16 w-16 animate-spin text-blue-500 mb-4" />
        <span className="text-2xl font-medium text-gray-700">Chargement des données initiales...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Suivi de l'Avancement des Enseignements</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Chapitres à suivre</p>
                <p className="text-2xl font-bold">{displayChapters.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Progression globale</p>
                <p className="text-2xl font-bold">{Math.round(calculateOverallProgress())}%</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full text-green-600">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
            <Progress value={calculateOverallProgress()} className="h-2 mt-4" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Respect du planning</p>
                <p className="text-2xl font-bold">{Math.round(calculateTimelineAdherence())}%</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full text-orange-600">
                <Clock className="h-6 w-6" />
              </div>
            </div>
            <Progress value={calculateTimelineAdherence()} className="h-2 mt-4" />
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>Sélectionnez les critères pour affiner la vue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Année Scolaire</label>
              <Select value={selectedAnneeId} onValueChange={handleAnneeChange} disabled={annees.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une année" />
                </SelectTrigger>
                <SelectContent>
                  {annees.map(annee => (
                    <SelectItem key={annee.id} value={String(annee.id)}>{annee.libelle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Classe</label>
              <Select value={selectedClasseId} onValueChange={handleClasseChange} disabled={!selectedAnneeId || classesForSelectedAnnee.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={!selectedAnneeId ? "Sélectionnez une année" : "Toutes les classes"} />
                </SelectTrigger>
                <SelectContent>
                  {/* Changed value from "" to "all" */}
                  <SelectItem value="all">Toutes les classes</SelectItem>
                  {classesForSelectedAnnee.map(cls => (
                    <SelectItem key={cls.id} value={String(cls.id)}>{cls.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Matière</label>
              <Select value={selectedMatiereId} onValueChange={setSelectedMatiereId} disabled={selectedClasseId === 'all' || matieresForSelectedAnneeAndClasse.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={selectedClasseId === 'all' ? "Sélectionnez une classe" : "Toutes les matières"} />
                </SelectTrigger>
                <SelectContent>
                  {/* Changed value from "" to "all" */}
                  <SelectItem value="all">Toutes les matières</SelectItem>
                  {matieresForSelectedAnneeAndClasse.map(matiere => (
                    <SelectItem key={matiere.id} value={String(matiere.id)}>{matiere.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="teachers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="teachers">Enseignants</TabsTrigger>
          <TabsTrigger value="chapters">Chapitres</TabsTrigger>
        </TabsList>

        <TabsContent value="chapters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Suivi des chapitres</CardTitle>
              <CardDescription>Progression détaillée de chaque chapitre</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isFetchingChapters ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-3" />
                  <span className="text-lg text-gray-600">Chargement des chapitres...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chapitre</TableHead>
                      <TableHead>Classe</TableHead>
                      <TableHead>Matière</TableHead>
                      <TableHead>Planifié</TableHead>
                      <TableHead>Réalisé</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Planning</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedAnneeId && displayChapters.length === 0 && !isFetchingChapters ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                          Aucun chapitre trouvé pour les filtres sélectionnés.
                        </TableCell>
                      </TableRow>
                    ) : !selectedAnneeId ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                          Veuillez sélectionner une année scolaire pour voir les chapitres.
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayChapters.map((chapter) => {
                        const timelineStatus = calculateTimelineStatus(chapter);
                        return (
                          <TableRow key={chapter.id}>
                            <TableCell className="font-medium">
                              {chapter.titre}
                              <p className="text-xs text-gray-500 truncate max-w-xs">{chapter.description}</p>
                            </TableCell>
                            <TableCell>{chapter.className || 'N/A'}</TableCell>
                            <TableCell>{chapter.subjectName || 'N/A'}</TableCell>
                            <TableCell>
                              {formatDate(chapter.dateDebutPrevue)} - {formatDate(chapter.dateFinPrevue)}
                            </TableCell>
                            <TableCell>
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
                            <TableCell>
                              {chapter.statut !== 'planifié' && (
                                <Badge variant="outline" className={timelineStatus.class}>
                                  {timelineStatus.label}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teachers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance des enseignants</CardTitle>
              <CardDescription>Suivi de l'avancement par enseignant pour les chapitres filtrés</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isFetchingChapters ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-3" />
                  <span className="text-lg text-gray-600">Chargement des données...</span>
                </div>
              ) : teacherPerformanceData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Enseignant</TableHead>
                      <TableHead>Matières</TableHead>
                      <TableHead>Classes</TableHead>
                      <TableHead>Chapitres terminés</TableHead>
                      <TableHead>Progression</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teacherPerformanceData.map((teacher) => (
                      <TableRow key={teacher.id}>
                        <TableCell className="font-medium">{teacher.name}</TableCell>
                        <TableCell>{teacher.subjects}</TableCell>
                        <TableCell>{teacher.classes}</TableCell>
                        <TableCell>{teacher.chaptersCompleted} / {teacher.chaptersTotal}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress
                              value={teacher.chaptersTotal > 0 ? (teacher.chaptersCompleted / teacher.chaptersTotal) * 100 : 0}
                              className="h-2 w-[100px]"
                            />
                            <span className="text-sm font-medium">
                              {teacher.chaptersTotal > 0 ? Math.round((teacher.chaptersCompleted / teacher.chaptersTotal) * 100) : 0}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  {selectedAnneeId ? "Aucune donnée de performance enseignant pour les filtres actuels." : "Veuillez sélectionner une année scolaire."}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}