import React, { useState, useEffect } from 'react';
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
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_URL}/api`;

export function StudentCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [viewType, setViewType] = useState<'overview' | 'materials' | 'chapters'>('overview');

  useEffect(() => {
    const fetchStudentCourses = async () => {
      if (!user || user.role !== 'eleve') {
        setIsLoading(false);
        setError("Vous devez être connecté en tant qu'élève pour voir vos cours.");
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
        if (!activeAnneeId) throw new Error("Année scolaire active non configurée.");

        const inscriptionsRes = await fetch(`${API_BASE_URL}/inscriptions?utilisateurId=${user.id}&anneeScolaireId=${activeAnneeId}`);
        if (!inscriptionsRes.ok) throw new Error("Impossible de charger l'inscription de l'élève.");
        const inscriptions: any[] = await inscriptionsRes.json();
        const studentInscription = inscriptions.find(insc => insc.actif);
        if (!studentInscription || !studentInscription.classe?.id) {
          throw new Error("Aucune inscription active trouvée pour cet élève.");
        }
        const studentClassId = studentInscription.classe.id;

        const [affectationsRes, matieresRes] = await Promise.all([
          fetch(`${API_BASE_URL}/affectations?classe_id=${studentClassId}&annee_scolaire_id=${activeAnneeId}`),
          fetch(`${API_BASE_URL}/matieres`)
        ]);

        if (!affectationsRes.ok) throw new Error("Impossible de charger les cours pour votre classe.");
        if (!matieresRes.ok) throw new Error("Impossible de charger la liste des matières.");

        const affectations: Affectation[] = await affectationsRes.json();
        const allMatieres: { id: number; nom: string }[] = await matieresRes.json();
        const allMatieresIds = new Set(allMatieres.map(m => m.id));

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
              teacher: `Prof. ${aff.professeur.nom}`,
              materials: Math.floor(Math.random() * 10),
              color: courseColors[uniqueCourses.size % courseColors.length],
            });
          }
        });
        setCourses(Array.from(uniqueCourses.values()));

      } catch (err: any) {
        console.log("ERROR: Error fetching student courses:", err);
        setError(err.message || "Impossible de charger vos cours.");
        toast({
          title: "Erreur",
          description: err.message || "Impossible de charger vos cours.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentCourses();
  }, [user]);

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
      <div className="p-6 flex flex-col items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="mt-4 text-lg text-gray-600">Chargement de vos cours...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        <h2 className="text-xl font-semibold mb-2">Erreur</h2>
        <p>{error}</p>
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
          className="p-6"
        >
          <div className="flex items-center mb-6">
            <Button variant="outline" onClick={handleBackToCourses} className="mr-4">
              ← Retour aux cours
            </Button>
            <h1 className="text-2xl font-bold">{selectedCourse.name} - Programme</h1>
          </div>

          <Tabs defaultValue="chapters" className="mb-6">
            <TabsList>
              <TabsTrigger value="chapters" onClick={() => setViewType('chapters')}>
                Chapitres et progression
              </TabsTrigger>
              <TabsTrigger value="materials" onClick={() => setViewType('materials')}>
                Supports de cours
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <ChapterProgress courseId={selectedCourse.id} />
        </motion.div>
      );
    }
  }

  return (
    <div className="p-6 pb-[env(safe-area-inset-bottom)]">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold mb-6"
      >
        Mes Cours
      </motion.h1>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="today">Aujourd'hui</TabsTrigger>
            <TabsTrigger value="materials">Avec documents</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Rechercher un cours..."
            className="pl-8"
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
              if (activeTab === 'today') {
                return true;
              }
              if (activeTab === 'materials') {
                return course.materials > 0;
              }
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
                <Card className="overflow-hidden shadow-md rounded-lg">
                  <div className={`h-2 ${course.color}`}></div>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                      <span>{course.name}</span>
                      <Badge>{course.materials} documents</Badge>
                    </CardTitle>
                    <CardDescription>{course.teacher}</CardDescription>
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
                      Voir le programme
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSelectedCourseId(course.id);
                        setViewType('materials');
                      }}
                    >
                      Voir les supports
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
          className="text-center py-12 bg-white rounded-lg shadow-sm"
        >
          <p className="text-gray-500">Aucun cours ne correspond à votre recherche</p>
          <Button
            variant="link"
            onClick={() => {
              setSearchQuery('');
              setActiveTab('all');
            }}
          >
            Réinitialiser les filtres
          </Button>
        </motion.div>
      )}
    </div>
  );
}
