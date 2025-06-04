
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
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const classes = ['6ème A', '6ème B', '5ème A', '5ème B', '4ème A', '4ème B', '3ème A', '3ème B'];
const subjects = ['Mathématiques', 'Français', 'Histoire-Géographie', 'Sciences', 'Anglais', 'Espagnol', 'Arts Plastiques', 'Musique', 'EPS'];

const students = [
  { id: 1, name: 'Alice Dupont', absences: [
    { date: '2025-05-15', subject: 'Mathématiques', justified: false, justification: '' },
    { date: '2025-05-10', subject: 'Français', justified: true, justification: 'Rendez-vous médical' }
  ]},
  { id: 2, name: 'Baptiste Martin', absences: [
    { date: '2025-05-12', subject: 'Sciences', justified: false, justification: '' }
  ]},
  { id: 3, name: 'Clara Bernard', absences: [
    { date: '2025-05-14', subject: 'Histoire-Géographie', justified: true, justification: 'Rendez-vous médical' },
    { date: '2025-05-20', subject: 'Anglais', justified: false, justification: '' }
  ]},
  { id: 4, name: 'David Petit', absences: [] },
  { id: 5, name: 'Emma Richard', absences: [
    { date: '2025-05-18', subject: 'EPS', justified: false, justification: '' }
  ]},
];

export function AttendanceManagement() {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [studentsData, setStudentsData] = useState(students);

  const handleJustificationChange = (studentId: number, absenceIndex: number, justification: string) => {
    setStudentsData(prevData => 
      prevData.map(student => 
        student.id === studentId 
          ? {
              ...student,
              absences: student.absences.map((absence, index) => 
                index === absenceIndex 
                  ? { ...absence, justification } 
                  : absence
              )
            } 
          : student
      )
    );
  };

  const markAsJustified = (studentId: number, absenceIndex: number) => {
    setStudentsData(prevData => 
      prevData.map(student => 
        student.id === studentId 
          ? {
              ...student,
              absences: student.absences.map((absence, index) => 
                index === absenceIndex 
                  ? { ...absence, justified: true } 
                  : absence
              )
            } 
          : student
      )
    );

    toast({
      title: "Absence justifiée",
      description: "L'absence a été marquée comme justifiée avec succès.",
    });
  };

  const filteredStudents = studentsData
    .filter(student => student.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(student => student.absences.length > 0);

  const isFormComplete = selectedClass && startDate && endDate;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Suivi des Absences</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>Visualisez les absences par classe et période</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Classe</label>
              <Select onValueChange={setSelectedClass} value={selectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Date de début</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Choisir une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Date de fin</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "Choisir une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {isFormComplete ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Rechercher un élève..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {filteredStudents.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Élève</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Matière</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Justification</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student) => (
                        student.absences.map((absence, absenceIndex) => (
                          <TableRow key={`${student.id}-${absenceIndex}`}>
                            <TableCell className="font-medium">
                              {student.name}
                            </TableCell>
                            <TableCell>
                              {format(new Date(absence.date), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell>
                              {absence.subject}
                            </TableCell>
                            <TableCell>
                              {absence.justified ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Justifiée
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  Non justifiée
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Motif de l'absence..."
                                value={absence.justification}
                                onChange={(e) => handleJustificationChange(student.id, absenceIndex, e.target.value)}
                                disabled={absence.justified}
                              />
                            </TableCell>
                            <TableCell>
                              {!absence.justified && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => markAsJustified(student.id, absenceIndex)}
                                >
                                  Justifier
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-white rounded-lg p-8 text-center shadow-sm">
              <p className="text-gray-500">Aucune absence trouvée pour cette classe sur la période sélectionnée.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg p-8 text-center shadow-sm">
          <p className="text-gray-500">Veuillez sélectionner une classe et une période pour visualiser les absences.</p>
        </div>
      )}
    </div>
  );
}
