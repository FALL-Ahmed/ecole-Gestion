
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
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

const terms = ['Trimestre 1', 'Trimestre 2', 'Trimestre 3', 'Année entière'];

// Données d'absence
const absenceData = [
  { 
    date: '2023-09-15', 
    dayOfWeek: 'Vendredi',
    subject: 'Mathématiques',
    period: '08:00 - 09:00',
    teacher: 'M. Dubois',
    justified: true,
    justification: 'Rendez-vous médical',
  },
  { 
    date: '2023-10-03', 
    dayOfWeek: 'Mardi',
    subject: 'Français',
    period: '10:15 - 11:15',
    teacher: 'Mme Bernard',
    justified: true,
    justification: 'Maladie',
  },
  { 
    date: '2023-11-17', 
    dayOfWeek: 'Vendredi',
    subject: 'Histoire-Géographie',
    period: '13:30 - 14:30',
    teacher: 'M. Robert',
    justified: false,
    justification: '',
  },
  { 
    date: '2024-01-22', 
    dayOfWeek: 'Lundi',
    subject: 'Anglais',
    period: '09:00 - 10:00',
    teacher: 'Mme Petit',
    justified: true,
    justification: 'Problèmes familiaux',
  },
  { 
    date: '2024-02-08', 
    dayOfWeek: 'Jeudi',
    subject: 'Sciences',
    period: '10:15 - 11:15',
    teacher: 'M. Thomas',
    justified: false,
    justification: '',
  },
];

// Statistiques des absences
const attendanceStats = {
  daysTotal: 100, // jours d'école total sur l'année
  daysPresent: 95,
  daysAbsent: 5,
  daysJustified: 3,
  daysUnjustified: 2,
};

export function StudentAttendance() {
  const [selectedTerm, setSelectedTerm] = useState<string>('Année entière');
  const [date, setDate] = useState<Date>(new Date());

  const absencesByTerm = (term: string) => {
    if (term === 'Année entière') {
      return absenceData;
    }
    
    // Dans une vraie application, il faudrait filtrer par date selon le trimestre
    // Pour l'exemple, on retourne un sous-ensemble des données
    const filterMap = {
      'Trimestre 1': absenceData.slice(0, 2),
      'Trimestre 2': absenceData.slice(2, 3),
      'Trimestre 3': absenceData.slice(3),
    };
    
    return filterMap[term] || [];
  };

  const filteredAbsences = absencesByTerm(selectedTerm);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Mes Absences</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-2">Taux de présence</h3>
            <p className="text-3xl font-bold text-blue-600">{(attendanceStats.daysPresent / attendanceStats.daysTotal * 100).toFixed(1)}%</p>
            <p className="text-sm text-gray-600">{attendanceStats.daysPresent} jours sur {attendanceStats.daysTotal}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-2">Absences totales</h3>
            <p className="text-3xl font-bold text-amber-600">{attendanceStats.daysAbsent}</p>
            <p className="text-sm text-gray-600">jours d'absence</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-2">Absences non justifiées</h3>
            <p className="text-3xl font-bold text-red-600">{attendanceStats.daysUnjustified}</p>
            <p className="text-sm text-gray-600">jours sans justification</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>Sélectionnez la période et la date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Période</p>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner une période" />
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
            
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Date</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: fr }) : "Sélectionner une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des absences</CardTitle>
          <CardDescription>Liste de toutes vos absences</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAbsences.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Jour</TableHead>
                    <TableHead>Matière</TableHead>
                    <TableHead>Horaire</TableHead>
                    <TableHead>Professeur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Justification</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAbsences.map((absence, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {format(new Date(absence.date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{absence.dayOfWeek}</TableCell>
                      <TableCell>{absence.subject}</TableCell>
                      <TableCell>{absence.period}</TableCell>
                      <TableCell>{absence.teacher}</TableCell>
                      <TableCell>
                        {absence.justified ? (
                          <Badge className="bg-amber-500">Justifiée</Badge>
                        ) : (
                          <Badge className="bg-red-500">Non justifiée</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {absence.justification || 'Non fournie'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              <p>Aucune absence pour la période sélectionnée.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
