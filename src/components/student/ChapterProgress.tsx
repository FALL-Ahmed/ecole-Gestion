
import React from 'react';
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

interface ChapterProgressProps {
  courseName: string;
}

// Example chapter data for a course
const getChaptersForCourse = (courseName: string) => {
  // In a real application, this would come from an API
  return [
    {
      id: 1,
      title: 'Les nombres entiers',
      description: 'Opérations et propriétés des nombres entiers',
      startDate: '5 septembre 2023',
      endDate: '20 septembre 2023',
      status: 'completed',
    },
    {
      id: 2,
      title: 'Fractions',
      description: 'Introduction aux fractions et opérations élémentaires',
      startDate: '21 septembre 2023',
      endDate: '15 octobre 2023',
      status: 'in-progress',
    },
    {
      id: 3,
      title: 'Géométrie plane',
      description: 'Figures géométriques de base et leurs propriétés',
      startDate: '16 octobre 2023',
      endDate: '10 novembre 2023',
      status: 'planned',
    },
    {
      id: 4,
      title: 'Proportionnalité',
      description: 'Concepts de proportionnalité et applications',
      startDate: '11 novembre 2023',
      endDate: '1 décembre 2023',
      status: 'planned',
    }
  ];
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'planned':
      return <Badge variant="outline" className="bg-gray-50 text-gray-700">À venir</Badge>;
    case 'in-progress':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700">En cours</Badge>;
    case 'completed':
      return <Badge variant="outline" className="bg-green-50 text-green-700">Terminé</Badge>;
    default:
      return null;
  }
};

export function ChapterProgress({ courseName }: ChapterProgressProps) {
  const chapters = getChaptersForCourse(courseName);
  
  const completedChapters = chapters.filter(ch => ch.status === 'completed').length;
  const totalChapters = chapters.length;
  const progress = (completedChapters / totalChapters) * 100;
  
  const currentChapter = chapters.find(ch => ch.status === 'in-progress');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Progression du cours</CardTitle>
          <CardDescription>Suivi des chapitres pour {courseName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-600">Chapitres terminés</p>
              <p className="text-2xl font-bold">{completedChapters} / {totalChapters}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-600">Progression globale</p>
              <p className="text-2xl font-bold">{Math.round(progress)}%</p>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
          
          {currentChapter && (
            <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-200">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">Chapitre actuel: {currentChapter.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{currentChapter.description}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Période: {currentChapter.startDate} - {currentChapter.endDate}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Programme du cours</CardTitle>
          <CardDescription>Liste des chapitres prévus</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {chapters.map((chapter) => (
              <li key={chapter.id} className="p-3 border rounded-md">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{chapter.title}</h3>
                      {getStatusBadge(chapter.status)}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {chapter.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {chapter.startDate} - {chapter.endDate}
                    </p>
                  </div>
                  {chapter.status === 'completed' && (
                    <div className="p-1 bg-green-100 rounded-full text-green-600">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
