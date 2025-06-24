
import React, { useState } from 'react';
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
import { Search } from 'lucide-react';
import { StudentMaterials } from './StudentMaterials';
import { ChapterProgress } from './ChapterProgress';

// Données des cours
const courses = [
  {
    id: 1,
    name: 'Mathématiques',
    teacher: 'M. Dubois',
    description: 'Algèbre, géométrie et fonctions adaptées au niveau 6ème',
    materials: 5,
    nextSession: 'Lundi, 08:00',
    color: 'bg-blue-500'
  },
  {
    id: 2,
    name: 'Français',
    teacher: 'Mme Bernard',
    description: 'Grammaire, conjugaison, orthographe, expression écrite et lecture',
    materials: 8,
    nextSession: 'Lundi, 09:00',
    color: 'bg-red-500'
  },
  {
    id: 3,
    name: 'Histoire-Géographie',
    teacher: 'M. Robert',
    description: 'Histoire des civilisations anciennes et géographie des territoires',
    materials: 6,
    nextSession: 'Lundi, 10:15',
    color: 'bg-amber-500'
  },
  {
    id: 4,
    name: 'Anglais',
    teacher: 'Mme Petit',
    description: 'Apprentissage de la langue anglaise: vocabulaire et grammaire de base',
    materials: 4,
    nextSession: 'Lundi, 11:15',
    color: 'bg-purple-500'
  },
  {
    id: 5,
    name: 'Sciences',
    teacher: 'M. Thomas',
    description: 'Sciences de la vie et de la Terre, initiation à la physique-chimie',
    materials: 7,
    nextSession: 'Mardi, 08:00',
    color: 'bg-green-500'
  },
  {
    id: 6,
    name: 'Espagnol',
    teacher: 'Mme Laurent',
    description: 'Initiation à la langue espagnole et à la culture hispanique',
    materials: 3,
    nextSession: 'Mardi, 10:15',
    color: 'bg-pink-500'
  },
  {
    id: 7,
    name: 'Arts Plastiques',
    teacher: 'Mme Martin',
    description: 'Exploration des techniques artistiques et de l\'histoire de l\'art',
    materials: 2,
    nextSession: 'Mardi, 11:15',
    color: 'bg-indigo-500'
  },
  {
    id: 8,
    name: 'EPS',
    teacher: 'M. Richard',
    description: 'Éducation physique et sportive: sports collectifs et individuels',
    materials: 0,
    nextSession: 'Mercredi, 09:00',
    color: 'bg-orange-500'
  },
  {
    id: 9,
    name: 'Musique',
    teacher: 'Mme Garcia',
    description: 'Initiation au solfège, pratique vocale et découverte des instruments',
    materials: 1,
    nextSession: 'Jeudi, 09:00',
    color: 'bg-teal-500'
  },
];

export function StudentCourses() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'overview' | 'materials' | 'chapters'>('overview');
  
  const filteredCourses = courses.filter(course => 
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.teacher.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBackToCourses = () => {
    setSelectedCourse(null);
    setViewType('overview');
  };

  if (selectedCourse) {
    if (viewType === 'materials') {
      return <StudentMaterials initialCourse={selectedCourse} onBack={handleBackToCourses} />;
    } else if (viewType === 'chapters') {
      return (
        <div className="p-6">
          <div className="flex items-center mb-6">
            <Button variant="outline" onClick={handleBackToCourses} className="mr-4">
              ← Retour aux cours
            </Button>
            <h1 className="text-2xl font-bold">{selectedCourse} - Programme</h1>
          </div>
          
          <Tabs defaultValue="chapters" className="mb-6">
            <TabsList>
              <TabsTrigger 
                value="chapters" 
                onClick={() => setViewType('chapters')}
              >
                Chapitres et progression
              </TabsTrigger>
              <TabsTrigger 
                value="materials" 
                onClick={() => setViewType('materials')}
              >
                Supports de cours
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <ChapterProgress courseName={selectedCourse} />
        </div>
      );
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Mes Cours</h1>
      
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses
          .filter(course => {
            if (activeTab === 'all') return true;
            if (activeTab === 'today') {
              // Filtrer pour les cours d'aujourd'hui seulement
              const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long' }).charAt(0).toUpperCase() + 
                            new Date().toLocaleDateString('fr-FR', { weekday: 'long' }).slice(1);
              return course.nextSession.includes(today);
            }
            if (activeTab === 'materials') {
              // Filtrer pour les cours avec documents
              return course.materials > 0;
            }
            return true;
          })
          .map(course => (
            <Card key={course.id} className="overflow-hidden">
              <div className={`h-2 ${course.color}`}></div>
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span>{course.name}</span>
                  <Badge>{course.materials} documents</Badge>
                </CardTitle>
                <CardDescription>{course.teacher}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{course.description}</p>
                <div className="mt-4 bg-gray-50 p-2 rounded-md text-sm">
                  <p><span className="font-medium">Prochain cours:</span> {course.nextSession}</p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSelectedCourse(course.name);
                    setViewType('chapters');
                  }}
                >
                  Voir le programme
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSelectedCourse(course.name);
                    setViewType('materials');
                  }}
                >
                  Voir les supports
                </Button>
              </CardFooter>
            </Card>
          ))}
      </div>
      
      {filteredCourses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
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
        </div>
      )}
    </div>
  );
}
