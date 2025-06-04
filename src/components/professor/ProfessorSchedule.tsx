import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, BookOpen, CheckCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

// Données de l'emploi du temps
const scheduleData = {
  'Lundi': [
    { time: '08:00-09:00', class: '6ème A', subject: 'Mathématiques', room: '101', students: 24 },
    { time: '09:00-10:00', class: '5ème A', subject: 'Mathématiques', room: '101', students: 22 },
    { time: '10:15-11:15', class: '4ème B', subject: 'Mathématiques', room: '201', students: 20 },
    { time: '11:15-12:15', class: '3ème A', subject: 'Mathématiques', room: '201', students: 25 },
  ],
  'Mardi': [
    { time: '13:30-14:30', class: '6ème B', subject: 'Mathématiques', room: '102', students: 23 },
    { time: '14:30-15:30', class: '5ème B', subject: 'Mathématiques', room: '102', students: 21 },
  ],
  'Mercredi': [
    { time: '08:00-09:00', class: '3ème B', subject: 'Mathématiques', room: '201', students: 26 },
    { time: '09:00-10:00', class: '3ème B', subject: 'Mathématiques', room: '201', students: 26 },
  ],
  'Jeudi': [
    { time: '10:15-11:15', class: '6ème A', subject: 'Mathématiques', room: '101', students: 24 },
    { time: '11:15-12:15', class: '5ème A', subject: 'Mathématiques', room: '101', students: 22 },
    { time: '13:30-14:30', class: '4ème B', subject: 'Mathématiques', room: '201', students: 20 },
  ],
  'Vendredi': [
    { time: '08:00-09:00', class: '6ème B', subject: 'Mathématiques', room: '102', students: 23 },
    { time: '09:00-10:00', class: '5ème B', subject: 'Mathématiques', room: '102', students: 21 },
    { time: '10:15-11:15', class: '3ème A', subject: 'Mathématiques', room: '201', students: 25 },
  ]
};

const days = Object.keys(scheduleData);
const subjects = ['Mathématiques', 'Français', 'Histoire-Géographie', 'Sciences', 'Anglais', 'Espagnol'];

export function ProfessorSchedule() {
  const [selectedDay, setSelectedDay] = useState<string>(days[0]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showAttendance, setShowAttendance] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [attendanceData, setAttendanceData] = useState([]);

  // Calcul des statistiques
  const totalHours = Object.values(scheduleData).reduce((acc, daySchedule) => {
    return acc + daySchedule.length;
  }, 0);

  const uniqueClasses = new Set();
  Object.values(scheduleData).forEach(daySchedule => {
    daySchedule.forEach(session => {
      uniqueClasses.add(session.class);
    });
  });

  const handleSessionClick = (session) => {
    setSelectedSession(session);
    // Générer des données d'élèves fictives pour la démo
    const students = Array.from({ length: session.students }, (_, i) => ({
      id: i + 1,
      name: `Élève ${i + 1}`,
      present: true,
      justified: false
    }));
    setAttendanceData(students);
    setShowAttendance(true);
  };

  const handlePresentChange = (studentId, present) => {
    setAttendanceData(prevData => 
      prevData.map(student => 
        student.id === studentId 
          ? { ...student, present, justified: present ? false : student.justified } 
          : student
      )
    );
  };

  const handleJustifiedChange = (studentId, justified) => {
    setAttendanceData(prevData => 
      prevData.map(student => 
        student.id === studentId 
          ? { ...student, justified, present: justified ? false : student.present } 
          : student
      )
    );
  };

  const saveAttendance = () => {
    toast({
      title: "Présences enregistrées",
      description: `Les présences pour la classe ${selectedSession.class} du ${format(date, 'dd/MM/yyyy')} ont été sauvegardées.`,
    });
    setShowAttendance(false);
  };

  const absenceCount = attendanceData.filter(student => !student.present).length;
  const justifiedCount = attendanceData.filter(student => !student.present && student.justified).length;
  const unjustifiedCount = absenceCount - justifiedCount;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Mon Emploi du Temps</h1>

      {!showAttendance ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <StatCard 
              icon={<Clock className="h-6 w-6" />}
              title="Heures par semaine"
              value={totalHours}
              color="bg-blue-100 text-blue-600"
            />
            
            <StatCard 
              icon={<Users className="h-6 w-6" />}
              title="Classes enseignées"
              value={uniqueClasses.size}
              color="bg-purple-100 text-purple-600"
            />
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Vue hebdomadaire</CardTitle>
              <CardDescription>Votre planning de la semaine</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-6 gap-2 mb-2">
                    <div className="font-semibold text-gray-500"></div>
                    {days.map(day => (
                      <div 
                        key={day}
                        className={`font-semibold text-center py-2 rounded cursor-pointer ${
                          selectedDay === day ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'
                        }`}
                        onClick={() => setSelectedDay(day)}
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {['08:00-09:00', '09:00-10:00', '10:15-11:15', '11:15-12:15', '13:30-14:30', '14:30-15:30', '15:45-16:45'].map(timeSlot => (
                    <div key={timeSlot} className="grid grid-cols-6 gap-2 mb-2">
                      <div className="text-sm font-medium text-gray-500 py-2 flex items-center">
                        {timeSlot}
                      </div>
                      {days.map(day => {
                        const session = scheduleData[day]?.find(s => s.time === timeSlot);
                        
                        if (session) {
                          return (
                            <SessionCard 
                              key={`${day}-${timeSlot}`}
                              session={session}
                              isSelected={selectedDay === day}
                              onClick={() => handleSessionClick(session)}
                            />
                          );
                        }
                        
                        return (
                          <EmptySlot key={`${day}-${timeSlot}`} isSelected={selectedDay === day} />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Planning du {selectedDay}</CardTitle>
              <CardDescription>Détails de vos cours</CardDescription>
            </CardHeader>
            <CardContent>
              {scheduleData[selectedDay]?.length > 0 ? (
                <div className="space-y-4">
                  {scheduleData[selectedDay].map((session, index) => (
                    <SessionDetail 
                      key={index}
                      session={session}
                      onClick={() => handleSessionClick(session)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyDayMessage />
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="space-y-6">
          <Button 
            variant="outline" 
            onClick={() => setShowAttendance(false)}
            className="mb-4"
          >
            ← Retour à l'emploi du temps
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Gestion des Présences</CardTitle>
              <CardDescription>
                {selectedSession.class} - {selectedSession.subject} - {format(date, 'dd/MM/yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Classe</label>
                  <Select value={selectedSession.class} disabled>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={selectedSession.class}>
                        {selectedSession.class}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {date ? format(date, "dd/MM/yyyy") : "Choisir une date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarPicker
                        mode="single"
                        selected={date}
                        onSelect={(date) => date && setDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Matière</label>
                  <Select value={selectedSession.subject} disabled>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={selectedSession.subject}>
                        {selectedSession.subject}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Feuille de présence</CardTitle>
                  <CardDescription>
                    {selectedSession.students} élèves - {absenceCount} absents
                    {absenceCount > 0 && (
                      <span> ({justifiedCount} justifiés, {unjustifiedCount} non justifiés)</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Élève</TableHead>
                          <TableHead>Présent</TableHead>
                          <TableHead>Absence justifiée</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceData.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">
                              {student.name}
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={student.present}
                                onCheckedChange={(checked) => 
                                  handlePresentChange(student.id, checked === true)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={!student.present && student.justified}
                                disabled={student.present}
                                onCheckedChange={(checked) => 
                                  handleJustifiedChange(student.id, checked === true)
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={saveAttendance}>
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer les présences
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Composants enfants
function StatCard({ icon, title, value, color }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionCard({ session, isSelected, onClick }) {
  return (
    <div 
      className={`bg-blue-50 border border-blue-200 p-2 rounded ${
        isSelected ? 'ring-2 ring-blue-400' : ''
      } cursor-pointer hover:bg-blue-100 transition-colors`}
      onClick={onClick}
    >
      <p className="font-semibold text-blue-800">{session.subject}</p>
      <div className="flex items-center justify-between mt-1">
        <Badge variant="outline" className="bg-blue-50 text-xs">
          {session.class}
        </Badge>
        <span className="text-xs text-gray-600">Salle {session.room}</span>
      </div>
    </div>
  );
}

function EmptySlot({ isSelected }) {
  return (
    <div 
      className={`border border-dashed border-gray-300 p-2 rounded ${
        isSelected ? 'bg-gray-50' : ''
      }`}
    />
  );
}

function SessionDetail({ session, onClick }) {
  return (
    <div 
      className="flex items-center p-4 border rounded-lg bg-white hover:bg-blue-50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="w-16 text-center">
        <div className="text-sm font-semibold">{session.time.split('-')[0]}</div>
        <div className="text-xs text-gray-500">-</div>
        <div className="text-sm font-semibold">{session.time.split('-')[1]}</div>
      </div>
      <div className="ml-6 flex-1">
        <div className="font-semibold">{session.subject}</div>
        <div className="text-sm text-gray-600">Classe: {session.class}</div>
      </div>
      <div className="ml-6">
        <Badge variant="outline" className="bg-gray-50">
          Salle {session.room}
        </Badge>
      </div>
    </div>
  );
}

function EmptyDayMessage() {
  return (
    <div className="text-center py-8 text-gray-600">
      <p>Aucun cours prévu ce jour</p>
    </div>
  );
}