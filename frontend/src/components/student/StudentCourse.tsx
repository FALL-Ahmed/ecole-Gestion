import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { StudentMaterials } from './StudentMaterials';
import { ChapterProgress } from './ChapterProgress';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Interfaces
interface Course {
  id: number;
  name: string;
  teacher: string;
  materials: number;
  color: string;
}

interface AnneeScolaire {
  id: number;
  libelle: string;
}

interface Configuration {
  annee_scolaire?: AnneeScolaire;
  annee_academique_active_id?: number;
}

interface Affectation {
  id: number;
  professeur: { id: number; nom: string; prenom: string };
  matiere: { id: number; nom: string };
  classe: { id: number };
  annee_scolaire: { id: number };
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_URL}/api`;

export function StudentCourses() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [viewType, setViewType] = useState<'overview' | 'materials' | 'chapters'>('overview');

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
    };
    return subjectMap[subjectName] || subjectName;
  }, [t]);

  useEffect(() => {
    const fetchStudentCourses = async () => {
      if (!user || user.role !== 'eleve') {
        setIsLoading(false);
        setError(t.common.teachersOnly);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const configRes = await fetch(`${API_BASE_URL}/configuration`);
        if (!configRes.ok) throw new Error(t.common.missingYearConfig);
        const configData: Configuration | Configuration[] = await configRes.json();
        let activeAnneeId: number | undefined;
        
        if (Array.isArray(configData) && configData.length > 0) {
          activeAnneeId = configData[0].annee_academique_active_id || configData[0].annee_scolaire?.id;
        } else if (configData && !Array.isArray(configData)) {
          activeAnneeId = configData.annee_academique_active_id || configData.annee_scolaire?.id;
        }
        
        if (!activeAnneeId) throw new Error(t.common.missingYearConfig);

        const inscriptionsRes = await fetch(`${API_BASE_URL}/inscriptions?utilisateurId=${user.id}&anneeScolaireId=${activeAnneeId}`);
        if (!inscriptionsRes.ok) throw new Error(t.common.errorLoadingEnrollments);
        const inscriptions: any[] = await inscriptionsRes.json();
        const studentInscription = inscriptions.find(insc => insc.actif);
        
        if (!studentInscription || !studentInscription.classe?.id) {
          throw new Error(t.common.noActiveRegistration);
        }
        
        const studentClassId = studentInscription.classe.id;

        const [affectationsRes, matieresRes] = await Promise.all([
          fetch(`${API_BASE_URL}/affectations?_expand=professeur&_expand=matiere&_expand=classe&_expand=annee_scolaire`),
          fetch(`${API_BASE_URL}/matieres`)
        ]);

        if (!affectationsRes.ok) throw new Error(t.common.errorLoadingData('affectations', affectationsRes.statusText));
        if (!matieresRes.ok) throw new Error(t.common.errorLoadingData('matières', matieresRes.statusText));

        const allAffectations: Affectation[] = await affectationsRes.json();
        const allMatieres: { id: number; nom: string }[] = await matieresRes.json();
        const allMatieresIds = new Set(allMatieres.map(m => m.id));

        const affectations = allAffectations.filter(aff => aff.classe?.id === studentClassId && aff.annee_scolaire?.id === activeAnneeId);

        const validAffectations = affectations.filter(aff => aff.matiere && allMatieresIds.has(aff.matiere.id));

        const uniqueCourses = new Map<number, Course>();

        const courseColors = [
          'bg-blue-500', 'bg-red-500', 'bg-amber-500', 'bg-purple-500',
          'bg-green-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500', 'bg-teal-500'
        ];

        validAffectations.forEach((aff) => {
          if (!uniqueCourses.has(aff.matiere.id)) {
            uniqueCourses.set(aff.matiere.id, {
              id: aff.matiere.id,
              name: aff.matiere.nom,
              teacher: `${t.common.teacher} ${aff.professeur.nom}`,
              materials: Math.floor(Math.random() * 10),
              color: courseColors[uniqueCourses.size % courseColors.length],
            });
          }
        });
        setCourses(Array.from(uniqueCourses.values()));

      } catch (err: any) {
        console.error("Error fetching student courses:", err);
        setError(err.message || t.common.errorLoadingData('courses', ''));
        toast({
          title: t.common.error,
          description: err.message || t.common.errorLoadingData('courses', ''),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentCourses();
  }, [user, t]);

  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.teacher.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBackToCourses = () => {
    setSelectedCourseId(null);
    setViewType('overview');
  };

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  if (isLoading) {
    return (
      <div className={`p-6 flex flex-col items-center justify-center h-64 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
          {t.common.loading}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 text-center ${language === 'ar' ? 'text-right' : 'text-left'}`}>
        <h2 className="text-xl font-semibold mb-2 text-red-500 dark:text-red-400">
          {t.common.error}
        </h2>
        <p className="text-gray-700 dark:text-gray-300">{error}</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          {t.common.tryAgain}
        </Button>
      </div>
    );
  }

  if (selectedCourse) {
    if (viewType === 'materials') {
      return <StudentMaterials initialCourseId={selectedCourse.id} onBack={handleBackToCourses} />;
    } else if (viewType === 'chapters') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`p-6 ${language === 'ar' ? 'text-right' : 'text-left'}`}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className={`flex items-center mb-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <Button 
              variant="outline" 
              onClick={handleBackToCourses} 
              className={language === 'ar' ? 'ml-4' : 'mr-4'}
            >
              {language === 'ar' ? `${t.common.close} →` : `← ${t.common.close}`}
            </Button>
            <h1 className="flex-grow text-2xl font-bold dark:text-white">
              {translateSubject(selectedCourse.name)} - {t.chapterProgress.title}
            </h1>
          </div>

          <Tabs defaultValue="chapters" className="mb-6">
            <TabsList className={language === 'ar' ? 'flex-row-reverse' : ''}>
              <TabsTrigger 
                value="chapters" 
                onClick={() => setViewType('chapters')}
                className={language === 'ar' ? 'ml-2' : 'mr-2'}
              >
                {t.chapterProgress.title}
              </TabsTrigger>
              <TabsTrigger 
                value="materials" 
                onClick={() => setViewType('materials')}
              >
                {t.studentMaterials.title}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <ChapterProgress courseId={selectedCourse.id} />
        </motion.div>
      );
    }
  }

  return (
    <div 
      className={`p-6 ${language === 'ar' ? 'text-right' : 'text-left'}`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold mb-6 dark:text-white"
      >
        {t.studentCourses.title}
      </motion.h1>

      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 ${language === 'ar' ? 'md:flex-row-reverse' : ''}`}>
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
         
        </Tabs>

        <div className={`relative w-full md:w-64 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
          <Search className={`absolute h-4 w-4 text-gray-500 ${language === 'ar' ? 'right-2' : 'left-2'} top-2.5`} />
          <Input
            placeholder={t.common.search}
            className={language === 'ar' ? 'pr-8' : 'pl-8'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <AnimatePresence>
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredCourses
            .filter(course => {
              if (activeTab === 'all') return true;
              if (activeTab === 'today') return true;
              if (activeTab === 'materials') return course.materials > 0;
              return true;
            })
            .map(course => (
              <motion.div
                key={course.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className="overflow-hidden shadow-md rounded-lg dark:bg-gray-800">
                  <div className={`h-2 ${course.color}`}></div>
                  <CardHeader>
                    <CardTitle className={`flex justify-between items-start ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                      <span className="dark:text-white">{translateSubject(course.name)}</span>
                      <Badge className={language === 'ar' ? 'ml-2' : 'mr-2'}>
                        {course.materials} {t.studentMaterials.documents}
                      </Badge>
                    </CardTitle>
                    <CardDescription className={language === 'ar' ? 'text-right' : 'text-left'}>
                      {course.teacher}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Additional content can be added here if needed */}
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSelectedCourseId(course.id);
                        setViewType('chapters');
                      }}
                    >
                      {t.chapterProgress.viewProgram}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSelectedCourseId(course.id);
                        setViewType('materials');
                      }}
                    >
                      {t.studentMaterials.viewMaterials}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
        </motion.div>
      </AnimatePresence>

      {filteredCourses.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 bg-white rounded-lg shadow-sm dark:bg-gray-800"
        >
          <p className="text-gray-500 dark:text-gray-400">
            {t.common.noDataAvailable}
          </p>
          <Button
            variant="link"
            onClick={() => {
              setSearchQuery('');
              setActiveTab('all');
            }}
            className="dark:text-blue-400"
          >
            {t.common.resetFilters}
          </Button>
        </motion.div>
      )}
    </div>
  );
}

export default StudentCourses;