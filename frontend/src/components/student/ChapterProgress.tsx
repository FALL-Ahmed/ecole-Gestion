import React, { useState, useEffect, useMemo } from 'react';
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
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { format, isValid, parseISO } from 'date-fns';
import { fr, ar } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import apiClient from '@/lib/apiClient';
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

export function ChapterProgress({ courseId }: ChapterProgressProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [chapters, setChapters] = useState<ChapterDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentClassId, setStudentClassId] = useState<number | null>(null);
  const [studentAnneeScolaireId, setStudentAnneeScolaireId] = useState<number | null>(null);
  const [allMatieres, setAllMatieres] = useState<Matiere[]>([]);
  const [allClasses, setAllClasses] = useState<Classe[]>([]);
  const [currentCourseName, setCurrentCourseName] = useState<string>('');

  const formatDisplayDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = parseISO(dateString);
    if (!isValid(date)) {
      console.log("WARN: Invalid date string for formatting:", dateString);
      return t.common.invalidDate;
    }
    return format(date, 'dd MMMM yyyy', { locale: language === 'ar' ? ar : fr });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planifié':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {t.chapterProgress.planned}
        </Badge>;
      case 'en_cours':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
          {t.chapterProgress.inProgress}
        </Badge>;
      case 'terminé':
        return <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200">
          {t.chapterProgress.completed}
        </Badge>;
      default:
        return null;
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user || !user.id || user.role !== 'eleve') {
        setError(t.common.accessDenied);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        const configRes = await apiClient.get('/configuration');
        const configData: Configuration | Configuration[] = configRes.data;
        let activeAnneeId: number | undefined;

        if (Array.isArray(configData) && configData.length > 0) {
          activeAnneeId = configData[0].annee_academique_active_id || configData[0].annee_scolaire?.id;
        } else if (configData && !Array.isArray(configData)) {
          activeAnneeId = configData.annee_academique_active_id || configData.annee_scolaire?.id;
        }

        if (!activeAnneeId) {
          throw new Error(t.common.missingYearConfig);
        }

        const inscriptionsRes = await apiClient.get(
          `/inscriptions?utilisateurId=${user.id}&anneeScolaireId=${activeAnneeId}&_expand=classe&_expand=annee_scolaire`
        );

        const inscriptions: Inscription[] = inscriptionsRes.data;
        const studentInscription = inscriptions.find(insc => 
          insc.utilisateurId === user.id && 
          insc.anneeScolaireId === activeAnneeId && 
          insc.actif
        );

        if (!studentInscription || !studentInscription.classeId || !studentInscription.anneeScolaireId) {
          throw new Error(t.common.noActiveRegistration);
        }

        setStudentClassId(studentInscription.classeId);
        setStudentAnneeScolaireId(studentInscription.anneeScolaireId);

        const [matieresResponse, classesResponse] = await Promise.all([
          apiClient.get('/matieres'),
          apiClient.get('/classes'),
        ]);

        setAllMatieres(matieresResponse.data);
        setAllClasses(classesResponse.data);
      } catch (err: any) {
        console.error('Error fetching initial data:', err);
        setError(err.response?.data?.message || err.message || t.common.errorLoadingInitialData);
        toast({
          title: t.common.error,
          description: err.message || t.common.errorLoadingInitialData,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [user, t]);

  useEffect(() => {
    const fetchChapters = async () => {
      if (!studentClassId || !studentAnneeScolaireId || !courseId || allMatieres.length === 0) {
        setChapters([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const matiere = allMatieres.find(m => Number(m.id) === Number(courseId));
        if (!matiere) {
          toast({ 
            title: t.common.information, 
            description: t.common.subjectNotFound, 
            variant: "default" 
          });
          setChapters([]);
          return;
        }
        setCurrentCourseName(matiere.nom);

        const url = `/chapitres?classeId=${studentClassId}&annee_scolaire_id=${studentAnneeScolaireId}&matiereId=${matiere.id}`;
        const response = await apiClient.get(url);

        const data: ChapterDisplay[] = response.data || [];
        const filteredData = data.filter(ch => 
          Number(ch.matiereId) === Number(courseId) &&
          Number(ch.classeId) === Number(studentClassId)
        );

        const chaptersWithNames = filteredData.map(ch => {
          const classe = allClasses.find(c => c.id === ch.classeId);
          const subject = allMatieres.find(m => m.id === ch.matiereId);
          return { 
            ...ch, 
            className: classe?.nom || t.common.unknownClass, 
            subjectName: subject?.nom || t.common.unknownSubject 
          };
        });

        setChapters(chaptersWithNames);
      } catch (err: any) {
        if (err.response && (err.response.status === 404 || err.response.status === 204)) {
          setChapters([]);
          return;
        }
        console.error('Error fetching chapters:', err);
        setError(err.response?.data?.message || err.message || t.common.errorLoadingChapters);
        setChapters([]);
        toast({
          title: t.common.error,
          description: err.response?.data?.message || err.message || t.common.errorLoadingChapters,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchChapters();
  }, [studentClassId, studentAnneeScolaireId, courseId, allMatieres, allClasses, t]);

  const sortedChapters = useMemo(() => {
    const statusOrder = {
      'en_cours': 1,
      'planifié': 2,
      'terminé': 3
    };
    return [...chapters].sort((a, b) => {
      const orderA = statusOrder[a.statut] || 4;
      const orderB = statusOrder[b.statut] || 4;
      if (orderA !== orderB) return orderA - orderB;
      
      try {
        const dateA = parseISO(a.dateDebutPrevue);
        const dateB = parseISO(b.dateDebutPrevue);
        if (isValid(dateA) && isValid(dateB)) {
          return dateA.getTime() - dateB.getTime();
        }
      } catch (e) {
        console.error("Error sorting dates:", e);
      }
      return 0;
    });
  }, [chapters]);

  const completedChapters = sortedChapters.filter(ch => ch.statut === 'terminé').length;
  const totalChapters = sortedChapters.length;
  const progress = totalChapters === 0 ? 0 : (completedChapters / totalChapters) * 100;

  return (
<div className={`space-y-6 ${language === 'ar' ? 'text-right' : 'text-left'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-white">{t.chapterProgress.courseProgress}</CardTitle>
          <CardDescription className="dark:text-gray-300">
            {t.chapterProgress.progressDescription} {currentCourseName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className={`flex justify-between mb-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {completedChapters} {t.common.of} {totalChapters} {t.chapterProgress.chaptersCompleted}
              </span>
              <span className="text-sm font-medium dark:text-white">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-white">{t.chapterProgress.courseProgram}</CardTitle>
          <CardDescription className="dark:text-gray-300">{t.chapterProgress.programDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className={`text-gray-600 dark:text-gray-300 ${language === 'ar' ? 'mr-2' : 'ml-2'}`}>
                {t.common.loading}
              </span>
            </div>
          ) : error ? (
            <div className={`text-center p-4 text-red-500 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
              <p>{t.common.error}: {error}</p>
              <p className="text-sm dark:text-gray-300">{t.common.tryAgainLater}</p>
            </div>
          ) : sortedChapters.length === 0 ? (
            <div className={`text-center p-4 text-gray-500 dark:text-gray-400 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
              <p>{t.chapterProgress.noChaptersFound}</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {sortedChapters.map((chapter) => (
                <li
                  key={chapter.id}
                  className={cn(
                    "p-4 border rounded-lg transition-all duration-300 dark:border-gray-700",
                    chapter.statut === 'en_cours' && "bg-blue-50 border-blue-200 shadow-md ring-2 ring-blue-100 dark:bg-blue-900/30 dark:border-blue-800",
                    chapter.statut === 'terminé' && "bg-gray-50 opacity-70 dark:bg-gray-700/30"
                  )}
                >
                  <div className={`flex items-start justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-grow ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse justify-end' : ''}`}>
                        {chapter.statut === 'en_cours' && <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                        <h3 className="font-medium dark:text-white">{chapter.titre}</h3>
                        {getStatusBadge(chapter.statut)}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 dark:text-gray-300">
                        {chapter.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-2 dark:text-gray-400">
                        {t.chapterProgress.period}: {formatDisplayDate(chapter.dateDebutPrevue)} - {formatDisplayDate(chapter.dateFinPrevue)}
                      </p>
                    </div>
                    {chapter.statut === 'terminé' && (
                      <div className="p-1 bg-green-100 rounded-full text-green-600 dark:bg-green-900 dark:text-green-300">
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