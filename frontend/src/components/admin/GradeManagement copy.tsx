
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
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, Printer, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const students = [
  { id: 1, name: 'Alice Dupont', homework1: 15, homework2: 16, exam: 17 },
  { id: 2, name: 'Baptiste Martin', homework1: 14, homework2: 13, exam: 15 },
  { id: 3, name: 'Clara Bernard', homework1: 18, homework2: 17, exam: 19 },
  { id: 4, name: 'David Petit', homework1: 12, homework2: 14, exam: 13 },
  { id: 5, name: 'Emma Richard', homework1: 16, homework2: 15, exam: 14 },
];

const classes = ['6ème A', '6ème B', '5ème A', '5ème B', '4ème A', '4ème B', '3ème A', '3ème B'];
const terms = ['Trimestre 1', 'Trimestre 2', 'Trimestre 3'];
const subjects = ['Mathématiques', 'Français', 'Histoire-Géographie', 'Sciences', 'Anglais', 'Espagnol', 'Arts Plastiques', 'Musique', 'EPS'];

export function GradeManagement() {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [gradeData, setGradeData] = useState(students);

  const handleGradeChange = (studentId: number, field: string, value: string) => {
    const numValue = parseFloat(value);
    
    if (isNaN(numValue) || numValue < 0 || numValue > 20) {
      return;
    }
    
    setGradeData(prevData => 
      prevData.map(student => 
        student.id === studentId 
          ? { ...student, [field]: numValue } 
          : student
      )
    );
  };

  const calculateAverage = (homework1: number, homework2: number, exam: number) => {
    return ((homework1 + homework2) / 2 * 0.4 + exam * 0.6).toFixed(2);
  };

  const saveGrades = () => {
    toast({
      title: "Notes sauvegardées",
      description: `Les notes de ${selectedSubject} pour la classe ${selectedClass} ont été enregistrées.`,
    });
  };

  const generateReports = () => {
    toast({
      title: "Génération des bulletins",
      description: `Les bulletins de la classe ${selectedClass} sont en cours de génération.`,
    });
  };

  const isFormComplete = selectedClass && selectedTerm && selectedSubject;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Gestion des Notes</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Sélection</CardTitle>
          <CardDescription>Choisissez la classe, le trimestre et la matière</CardDescription>
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
              <label className="text-sm font-medium">Trimestre</label>
              <Select onValueChange={setSelectedTerm} value={selectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un trimestre" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((term) => (
                    <SelectItem key={term} value={term}>
                      {term}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Matière</label>
              <Select onValueChange={setSelectedSubject} value={selectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une matière" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isFormComplete ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Notes de {selectedSubject} - {selectedClass} - {selectedTerm}
            </CardTitle>
            <CardDescription>
              Saisissez les notes des élèves (sur 20)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead>Devoir 1</TableHead>
                    <TableHead>Devoir 2</TableHead>
                    <TableHead>Composition</TableHead>
                    <TableHead>Moyenne</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gradeData.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          value={student.homework1}
                          onChange={(e) => handleGradeChange(student.id, 'homework1', e.target.value)}
                          className="w-16 text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          value={student.homework2}
                          onChange={(e) => handleGradeChange(student.id, 'homework2', e.target.value)}
                          className="w-16 text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          value={student.exam}
                          onChange={(e) => handleGradeChange(student.id, 'exam', e.target.value)}
                          className="w-16 text-center"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {calculateAverage(student.homework1, student.homework2, student.exam)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-6 flex flex-wrap gap-4">
              <Button onClick={saveGrades}>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer les notes
              </Button>
              <Button variant="outline" onClick={generateReports}>
                <FileDown className="mr-2 h-4 w-4" />
                Générer les bulletins
              </Button>
              <Button variant="outline">
                <Printer className="mr-2 h-4 w-4" />
                Imprimer
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg p-8 text-center shadow-sm">
          <p className="text-gray-500">Veuillez sélectionner une classe, un trimestre et une matière pour voir les notes.</p>
        </div>
      )}
    </div>
  );
}
