
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash, Users } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  description: string;
  professor: string;
  level: string;
  studentsCount: number;
  status: 'active' | 'inactive';
}

export function CourseManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const mockCourses: Course[] = [
    {
      id: '1',
      name: 'Mathématiques',
      description: 'Cours de mathématiques niveau collège',
      professor: 'Prof. Dubois',
      level: '6ème',
      studentsCount: 28,
      status: 'active'
    },
    {
      id: '2',
      name: 'Français',
      description: 'Cours de français et littérature',
      professor: 'Prof. Moreau',
      level: '5ème',
      studentsCount: 25,
      status: 'active'
    },
    {
      id: '3',
      name: 'Histoire-Géographie',
      description: 'Cours d\'histoire et de géographie',
      professor: 'Prof. Bernard',
      level: '4ème',
      studentsCount: 22,
      status: 'active'
    },
    {
      id: '4',
      name: 'Sciences Physiques',
      description: 'Cours de physique et chimie',
      professor: 'Prof. Leroy',
      level: '3ème',
      studentsCount: 24,
      status: 'inactive'
    },
  ];

  const filteredCourses = mockCourses.filter(course =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.professor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.level.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6   pb-[env(safe-area-inset-bottom)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Gestion des Cours</h1>
        <p className="text-gray-600">Gérez les cours, matières et affectations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">12</p>
              <p className="text-sm text-gray-600">Cours actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">8</p>
              <p className="text-sm text-gray-600">Professeurs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">245</p>
              <p className="text-sm text-gray-600">Élèves inscrits</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">4</p>
              <p className="text-sm text-gray-600">Niveaux</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Liste des Cours</CardTitle>
              <CardDescription>
                Gérez les cours et les affectations aux professeurs
              </CardDescription>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau cours
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Rechercher par nom, professeur ou niveau..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matière</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Professeur</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Élèves</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{course.description}</TableCell>
                    <TableCell>{course.professor}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{course.level}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span>{course.studentsCount}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={course.status === 'active' ? 'default' : 'secondary'}>
                        {course.status === 'active' ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
