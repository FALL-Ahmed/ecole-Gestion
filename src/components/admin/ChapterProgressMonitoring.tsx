import React, { useState } from 'react';
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
import { CheckCircle, AlertCircle, Clock, Search } from 'lucide-react';
import { Chapter } from '@/types/chapter';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

// Mock data - in a real app, this would come from an API
const mockChapters: Chapter[] = [
  {
    id: 1,
    title: 'Les nombres entiers',
    description: 'Opérations et propriétés des nombres entiers',
    subject: 'Mathématiques',
    class: '6ème A',
    plannedStartDate: '2023-09-05',
    plannedEndDate: '2023-09-25',
    actualStartDate: '2023-09-05',
    actualEndDate: '2023-09-20',
    status: 'completed',
    materials: 3
  },
  {
    id: 2,
    title: 'Fractions',
    description: 'Introduction aux fractions et opérations élémentaires',
    subject: 'Mathématiques',
    class: '6ème A',
    plannedStartDate: '2023-09-26',
    plannedEndDate: '2023-10-15',
    actualStartDate: '2023-09-21',
    status: 'in-progress',
    materials: 2
  },
  {
    id: 3,
    title: 'Géométrie plane',
    description: 'Figures géométriques de base et leurs propriétés',
    subject: 'Mathématiques',
    class: '6ème A',
    plannedStartDate: '2023-10-16',
    plannedEndDate: '2023-11-10',
    status: 'planned',
    materials: 0
  },
  // Other subjects
  {
    id: 4,
    title: 'Lecture et compréhension',
    description: 'Analyses de textes littéraires',
    subject: 'Français',
    class: '5ème B',
    plannedStartDate: '2023-09-05',
    plannedEndDate: '2023-09-30',
    actualStartDate: '2023-09-07',
    actualEndDate: '2023-10-02',
    status: 'completed',
    materials: 5
  },
  {
    id: 5,
    title: 'Renaissance et Humanisme',
    description: 'Contexte historique et culturel de la Renaissance',
    subject: 'Histoire-Géographie',
    class: '4ème A',
    plannedStartDate: '2023-09-12',
    plannedEndDate: '2023-10-10',
    actualStartDate: '2023-09-14',
    status: 'in-progress',
    materials: 4
  },
  {
    id: 6,
    title: 'Système solaire',
    description: 'Structure et composants du système solaire',
    subject: 'Sciences',
    class: '6ème B',
    plannedStartDate: '2023-09-18',
    plannedEndDate: '2023-10-20',
    status: 'planned',
    materials: 2
  }
];

// Mock teachers data
const teachersData = [
  { id: 1, name: 'Martin Dubois', subjects: ['Mathématiques'], classes: ['6ème A', '6ème B', '5ème A'], chaptersCompleted: 2, chaptersTotal: 4 },
  { id: 2, name: 'Sarah Lefebvre', subjects: ['Français'], classes: ['5ème B', '5ème A'], chaptersCompleted: 1, chaptersTotal: 3 },
  { id: 3, name: 'Paul Bernard', subjects: ['Histoire-Géographie'], classes: ['4ème A', '4ème B'], chaptersCompleted: 0, chaptersTotal: 2 },
  { id: 4, name: 'Claire Moreau', subjects: ['Sciences'], classes: ['6ème B', '3ème A'], chaptersCompleted: 0, chaptersTotal: 3 }
];

const getStatusBadge = (status: Chapter['status']) => {
  switch (status) {
    case 'planned':
      return <Badge variant="outline" className="bg-gray-50 text-gray-700">Planifié</Badge>;
    case 'in-progress':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700">En cours</Badge>;
    case 'completed':
      return <Badge variant="outline" className="bg-green-50 text-green-700">Terminé</Badge>;
    default:
      return null;
  }
};

const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'dd MMM yyyy', { locale: fr });
};

const calculateTimelineStatus = (chapter: Chapter) => {
  // For completed chapters
  if (chapter.status === 'completed' && chapter.actualEndDate && chapter.plannedEndDate) {
    const planned = new Date(chapter.plannedEndDate);
    const actual = new Date(chapter.actualEndDate);
    const diffDays = differenceInDays(actual, planned);
    
    if (diffDays <= 0) {
      return { status: 'on-time', label: 'À temps', class: 'bg-green-50 text-green-700' };
    } else if (diffDays <= 7) {
      return { status: 'slight-delay', label: 'Léger retard', class: 'bg-yellow-50 text-yellow-700' };
    } else {
      return { status: 'delayed', label: 'En retard', class: 'bg-red-50 text-red-700' };
    }
  }
  
  // For in-progress chapters
  if (chapter.status === 'in-progress') {
    const today = new Date();
    const endDate = new Date(chapter.plannedEndDate);
    if (today > endDate) {
      return { status: 'overdue', label: 'Dépassé', class: 'bg-red-50 text-red-700' };
    }
  }
  
  return { status: 'on-track', label: 'En cours', class: 'bg-blue-50 text-blue-700' };
};

export function ChapterProgressMonitoring() {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [chapters, setChapters] = useState(mockChapters);

  const filteredChapters = chapters.filter(chapter => {
    const matchesClass = selectedClass ? chapter.class === selectedClass : true;
    const matchesSubject = selectedSubject ? chapter.subject === selectedSubject : true;
    const matchesSearch = searchTerm 
      ? chapter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chapter.description.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    
    return matchesClass && matchesSubject && matchesSearch;
  });

  const calculateOverallProgress = () => {
    const total = filteredChapters.length;
    if (total === 0) return 0;
    
    const completed = filteredChapters.filter(ch => ch.status === 'completed').length;
    return (completed / total) * 100;
  };

  const calculateTimelineAdherence = () => {
    const completed = filteredChapters.filter(ch => ch.status === 'completed' && ch.actualEndDate);
    if (completed.length === 0) return 100;
    
    const onTime = completed.filter(ch => {
      if (!ch.actualEndDate || !ch.plannedEndDate) return false;
      return new Date(ch.actualEndDate) <= new Date(ch.plannedEndDate);
    }).length;
    
    return (onTime / completed.length) * 100;
  };

  const filteredTeachers = teachersData.filter(teacher => {
    if (selectedClass) {
      if (!teacher.classes.includes(selectedClass)) return false;
    }
    if (selectedSubject) {
      if (!teacher.subjects.includes(selectedSubject)) return false;
    }
    if (searchTerm) {
      if (!teacher.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Suivi de l'Avancement des Enseignements</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Chapitres à suivre</p>
                <p className="text-2xl font-bold">{filteredChapters.length}</p>
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
          <CardDescription>Affinez votre vue par classe ou matière</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Rechercher</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Classe</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les classes" />
                </SelectTrigger>
                <SelectContent>
  <SelectItem value="all">Toutes les classes</SelectItem>
  {['6ème A', '6ème B', '5ème A', '5ème B', '4ème A', '4ème B', '3ème A', '3ème B'].map(cls => (
    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
  ))}
</SelectContent>

              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Matière</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les matières" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les matières</SelectItem>
                  {['Mathématiques', 'Français', 'Histoire-Géographie', 'Sciences', 'Anglais'].map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="chapters" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chapters">Chapitres</TabsTrigger>
          <TabsTrigger value="teachers">Enseignants</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chapters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Suivi des chapitres</CardTitle>
              <CardDescription>Progression détaillée de chaque chapitre</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chapitre</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Matière</TableHead>
                    <TableHead>Planifié</TableHead>
                    <TableHead>Réalisé</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Planning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChapters.length > 0 ? (
                    filteredChapters.map((chapter) => {
                      const timelineStatus = calculateTimelineStatus(chapter);
                      return (
                        <TableRow key={chapter.id}>
                          <TableCell className="font-medium">
                            {chapter.title}
                            <p className="text-xs text-gray-500 truncate max-w-xs">{chapter.description}</p>
                          </TableCell>
                          <TableCell>{chapter.class}</TableCell>
                          <TableCell>{chapter.subject}</TableCell>
                          <TableCell>
                            {formatDate(chapter.plannedStartDate)} - {formatDate(chapter.plannedEndDate)}
                          </TableCell>
                          <TableCell>
                            {chapter.actualStartDate ? (
                              <>
                                {formatDate(chapter.actualStartDate)}
                                {chapter.actualEndDate && ` - ${formatDate(chapter.actualEndDate)}`}
                              </>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(chapter.status)}</TableCell>
                          <TableCell>
                            {chapter.status !== 'planned' && (
                              <Badge variant="outline" className={timelineStatus.class}>
                                {timelineStatus.label}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                        Aucun chapitre ne correspond aux critères de recherche
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="teachers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance des enseignants</CardTitle>
              <CardDescription>Suivi de l'avancement par enseignant</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
                  {filteredTeachers.length > 0 ? (
                    filteredTeachers.map((teacher) => (
                      <TableRow key={teacher.id}>
                        <TableCell className="font-medium">{teacher.name}</TableCell>
                        <TableCell>{teacher.subjects.join(', ')}</TableCell>
                        <TableCell>{teacher.classes.join(', ')}</TableCell>
                        <TableCell>{teacher.chaptersCompleted} / {teacher.chaptersTotal}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress 
                              value={(teacher.chaptersCompleted / teacher.chaptersTotal) * 100} 
                              className="h-2 w-[100px]" 
                            />
                            <span className="text-sm font-medium">
                              {Math.round((teacher.chaptersCompleted / teacher.chaptersTotal) * 100)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                        Aucun enseignant ne correspond aux critères de recherche
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
