
import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Book, Users } from 'lucide-react';

const courses = [
  {
    id: 1,
    name: 'Mathématiques',
    classes: ['6ème A', '6ème B'],
    students: 56,
    nextSession: 'Lundi, 08:00 - 09:00',
    location: 'Salle 101'
  },
  {
    id: 2,
    name: 'Mathématiques',
    classes: ['5ème A'],
    students: 28,
    nextSession: 'Lundi, 10:15 - 11:15',
    location: 'Salle 201'
  },
  {
    id: 3,
    name: 'Mathématiques',
    classes: ['4ème B'],
    students: 26,
    nextSession: 'Mardi, 14:30 - 15:30',
    location: 'Salle 105'
  },
  {
    id: 4,
    name: 'Mathématiques',
    classes: ['3ème A', '3ème B'],
    students: 54,
    nextSession: 'Mercredi, 08:00 - 09:00',
    location: 'Salle 302'
  }
];

export function ProfessorCourses() {
  return (
    <div className="p-6 min-h-[100dvh]pb-[env(safe-area-inset-bottom)]">
      <h1 className="text-2xl font-bold mb-6">Mes Cours</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Nombre de cours</p>
                <p className="text-2xl font-bold">4</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                <Book className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total d'élèves</p>
                <p className="text-2xl font-bold">164</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full text-green-600">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Heures par semaine</p>
                <p className="text-2xl font-bold">18</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste de mes cours</CardTitle>
          <CardDescription>Détails des cours que vous enseignez</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matière</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead>Élèves</TableHead>
                <TableHead>Prochain cours</TableHead>
                <TableHead>Salle</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">{course.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {course.classes.map((cls) => (
                        <Badge variant="outline" key={cls} className="bg-blue-50 text-blue-600 border-blue-200">
                          {cls}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{course.students}</TableCell>
                  <TableCell>{course.nextSession}</TableCell>
                  <TableCell>{course.location}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      Détails
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
