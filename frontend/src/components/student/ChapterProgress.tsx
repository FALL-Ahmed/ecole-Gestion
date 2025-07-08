import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { format, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChapterProgressProps {
  courseId: number;
}

interface ChapterDisplay {
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

interface Matiere {
  id: number;
  nom: string;
  code?: string;
}

interface Classe {
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

interface Inscription {
  id: number;
  utilisateurId: number;
  classeId: number;
  anneeScolaireId: number;
  actif: boolean;
  classe?: Classe;
  annee_scolaire?: AnneeScolaire;
}

interface Configuration {
  id: number;
  annee_scolaire?: AnneeScolaire;
  annee_academique_active_id?: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_URL}/api`;

const formatDisplayDate = (dateString?: string) => {
  if (!dateString) return '-';
  const date = parseISO(dateString);
  if (!isValid(date)) {
    console.log("WARN: Invalid date string for formatting:", dateString);
    return 'Date invalide';
  }
  return format(date, 'dd MMMM yyyy', { locale: fr });
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'planifié':
      return <Badge variant="outline" className="bg-gray-50 text-gray-700">À venir</Badge>;
    case 'en_cours':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700">En cours</Badge>;
    case 'terminé':
      return <Badge variant="outline" className="bg-green-50 text-green-700">Terminé</Badge>;
    default:
      return null;
  }
};

export function ChapterProgress({ courseId }: ChapterProgressProps) {
  const { user } = useAuth();
  const [chapters, setChapters] = useState<ChapterDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentClassId, setStudentClassId] = useState<number | null>(null);
  const [studentAnneeScolaireId, setStudentAnneeScolaireId] = useState<number | null>(null);
  const [allMatieres, setAllMatieres] = useState<Matiere[]>([]);
  const [allClasses, setAllClasses] = useState<Classe[]>([]);
  const [currentCourseName, setCurrentCourseName] = useState<string>('');

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user || !user.id || user.role !== 'eleve') {
        setError("Accès refusé : L'utilisateur n'est pas un élève ou l'ID est manquant.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const configRes = await fetch(`${API_BASE_URL}/configuration`);
        if (!configRes.ok) throw new Error("Impossible de charger la configuration de l'année scolaire.");

        const configData: Configuration | Configuration[] = await configRes.json();
        let activeAnneeId: number | undefined;

        if (Array.isArray(configData) && configData.length > 0) {
          activeAnneeId = configData[0].annee_academique_active_id || configData[0].annee_scolaire?.id;
        } else if (configData && !Array.isArray(configData)) {
          activeAnneeId = configData.annee_academique_active_id || configData.annee_scolaire?.id;
        }

        if (!activeAnneeId) {
          throw new Error("Année scolaire active non configurée.");
        }

        const inscriptionsRes = await fetch(`${API_BASE_URL}/inscriptions?utilisateurId=${user.id}&anneeScolaireId=${activeAnneeId}&_expand=classe&_expand=annee_scolaire`);
        if (!inscriptionsRes.ok) throw new Error("Impossible de charger l'inscription de l'élève.");

        const inscriptions: Inscription[] = await inscriptionsRes.json();
        const studentInscription = inscriptions.find(insc => insc.utilisateurId === user.id && insc.anneeScolaireId === activeAnneeId && insc.actif);

        if (!studentInscription || !studentInscription.classeId || !studentInscription.anneeScolaireId) {
          throw new Error("Aucune inscription active trouvée pour cet élève dans l'année académique actuelle.");
        }

        setStudentClassId(studentInscription.classeId);
        setStudentAnneeScolaireId(studentInscription.anneeScolaireId);

        const [matieresRes, classesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/matieres`).then(res => res.json()),
          fetch(`${API_BASE_URL}/classes`).then(res => res.json()),
        ]);

        setAllMatieres(matieresRes);
        setAllClasses(classesRes);
      } catch (err: any) {
        console.log('ERROR: Error fetching initial data:', err);
        setError(err.message || 'Une erreur est survenue lors du chargement des données initiales.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [user]);

  useEffect(() => {
    const fetchChapters = async () => {
      // Attendre que toutes les données initiales (classe, année, matières) soient prêtes.
      if (!studentClassId || !studentAnneeScolaireId || !courseId || allMatieres.length === 0) {
        setChapters([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const matiere = allMatieres.find(m => Number(m.id) === Number(courseId));
        if (!matiere) {
          toast({ title: "Information", description: `Matière (ID: ${courseId}) non trouvée.`, variant: "default" });
          setChapters([]);
          return;
        }
        setCurrentCourseName(matiere.nom);

        const url = `${API_BASE_URL}/chapitres?classeId=${studentClassId}&annee_scolaire_id=${studentAnneeScolaireId}&matiereId=${matiere.id}`;
        const response = await fetch(url);

        if (!response.ok) {
          if (response.status === 404 || response.status === 204) {
            setChapters([]);
            return;
          }
          const errorText = await response.text();
          throw new Error(`Failed to fetch chapters: ${response.status} - ${errorText}`);
        }

        const data: ChapterDisplay[] = await response.json();
        
        // Ajout d'un filtre côté client pour garantir que seuls les chapitres de la matière sélectionnée sont affichés.
        // C'est une sécurité au cas où l'API ne filtrerait pas correctement par matiereId.
        const filteredData = data.filter(ch => Number(ch.matiereId) === Number(courseId));

        const chaptersWithNames = filteredData.map(ch => {
          const classe = allClasses.find(c => c.id === ch.classeId);
          const subject = allMatieres.find(m => m.id === ch.matiereId);
          return { ...ch, className: classe?.nom || 'Classe inconnue', subjectName: subject?.nom || 'Matière inconnue' };
        });

        setChapters(chaptersWithNames);
      } catch (err: any) {
        console.log('ERROR: Error fetching chapters:', err);
        setError(err.message || "Impossible de charger les chapitres.");
        setChapters([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChapters();
  }, [studentClassId, studentAnneeScolaireId, courseId, allMatieres, allClasses]);

  const sortedChapters = useMemo(() => {
    const statusOrder = {
      'en_cours': 1,
      'planifié': 2,
      'terminé': 3
    };
    return [...chapters].sort((a, b) => {
      const orderA = statusOrder[a.statut] || 4;
      const orderB = statusOrder[b.statut] || 4;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      // Si les statuts sont identiques, trier par date de début
      try {
        const dateA = parseISO(a.dateDebutPrevue);
        const dateB = parseISO(b.dateDebutPrevue);
        if (isValid(dateA) && isValid(dateB)) {
          return dateA.getTime() - dateB.getTime();
        }
      } catch (e) {
        // Gérer les dates invalides si nécessaire
      }
      return 0;
    });
  }, [chapters]);

  const completedChapters = sortedChapters.filter(ch => ch.statut === 'terminé').length;
  const totalChapters = sortedChapters.length;
  const progress = totalChapters === 0 ? 0 : (completedChapters / totalChapters) * 100;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Progression du cours</CardTitle>
          <CardDescription>Suivi des chapitres pour {currentCourseName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">
                {completedChapters} sur {totalChapters} chapitres complétés
              </span>
              <span className="text-sm font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Programme du cours</CardTitle>
          <CardDescription>Liste des chapitres prévus</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Chargement des chapitres...</span>
            </div>
          ) : error ? (
            <div className="text-center p-4 text-red-500">
              <p>Erreur: {error}</p>
              <p className="text-sm">Veuillez réessayer ou contacter l'administrateur.</p>
            </div>
          ) : sortedChapters.length === 0 ? (
            <div className="text-center p-4 text-gray-500">
              <p>Aucun chapitre trouvé pour cette matière et cette période.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {sortedChapters.map((chapter) => (
                <li
                  key={chapter.id}
                  className={cn(
                    "p-4 border rounded-lg transition-all duration-300",
                    chapter.statut === 'en_cours' && "bg-blue-50 border-blue-200 shadow-md ring-2 ring-blue-100",
                    chapter.statut === 'terminé' && "bg-gray-50 opacity-70"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {chapter.statut === 'en_cours' && <Clock className="h-5 w-5 text-blue-600" />}
                        <h3 className="font-medium">{chapter.titre}</h3>
                        {getStatusBadge(chapter.statut)}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {chapter.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Période: {formatDisplayDate(chapter.dateDebutPrevue)} - {formatDisplayDate(chapter.dateFinPrevue)}
                      </p>
                    </div>
                    {chapter.statut === 'terminé' && (
                      <div className="p-1 bg-green-100 rounded-full text-green-600">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
