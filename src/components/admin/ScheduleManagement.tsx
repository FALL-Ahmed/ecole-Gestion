
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

const classes = ['6ème A', '6ème B', '5ème A', '5ème B', '4ème A', '4ème B', '3ème A', '3ème B'];
const subjects = ['Mathématiques', 'Français', 'Histoire-Géographie', 'Sciences', 'Anglais', 'Espagnol', 'Arts Plastiques', 'Musique', 'EPS'];
const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const timeSlots = ['08:00-09:00', '09:00-10:00', '10:15-11:15', '11:15-12:15', '13:30-14:30', '14:30-15:30', '15:45-16:45', '16:45-17:45'];
const rooms = ['101', '102', '103', '104', '201', '202', '203', '204', 'Labo 1', 'Labo 2', 'Gymase'];
const teachers = ['M. Dubois', 'Mme Bernard', 'M. Robert', 'Mme Petit', 'M. Thomas', 'Mme Martin', 'M. Richard', 'Mme Laurent'];

// Données d'exemple pour l'emploi du temps
const scheduleData = {
  'Lundi': {
    '08:00-09:00': { class: '6ème A', subject: 'Mathématiques', teacher: 'M. Dubois', room: '101' },
    '09:00-10:00': { class: '6ème A', subject: 'Français', teacher: 'Mme Bernard', room: '101' },
    '10:15-11:15': { class: '6ème A', subject: 'Histoire-Géographie', teacher: 'M. Robert', room: '101' },
    '11:15-12:15': { class: '6ème A', subject: 'Anglais', teacher: 'Mme Petit', room: '101' },
  },
  'Mardi': {
    '08:00-09:00': { class: '6ème A', subject: 'Sciences', teacher: 'M. Thomas', room: 'Labo 1' },
    '09:00-10:00': { class: '6ème A', subject: 'Sciences', teacher: 'M. Thomas', room: 'Labo 1' },
    '10:15-11:15': { class: '6ème A', subject: 'Espagnol', teacher: 'Mme Laurent', room: '101' },
    '11:15-12:15': { class: '6ème A', subject: 'Arts Plastiques', teacher: 'Mme Martin', room: '201' },
  }
};

interface ScheduleItemProps {
  day: string;
  timeSlot: string;
  data?: {
    class: string;
    subject: string;
    teacher: string;
    room: string;
  };
  onAddClass: (day: string, timeSlot: string) => void;
}

const ScheduleItem: React.FC<ScheduleItemProps> = ({ day, timeSlot, data, onAddClass }) => {
  if (data) {
    return (
      <div className="bg-blue-50 border border-blue-200 p-2 rounded h-full flex flex-col justify-between">
        <p className="font-semibold text-blue-800">{data.subject}</p>
        <div className="text-xs text-gray-600 mt-1">
          <p>{data.teacher}</p>
          <p>Salle: {data.room}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="border border-dashed border-gray-300 p-2 rounded h-full flex items-center justify-center cursor-pointer hover:bg-gray-50"
      onClick={() => onAddClass(day, timeSlot)}
    >
      <span className="text-gray-400 text-sm">+ Ajouter</span>
    </div>
  );
};

export function ScheduleManagement() {
  const [selectedClass, setSelectedClass] = useState<string>('6ème A');
  const [scheduleView, setScheduleView] = useState<string>('class'); // 'class' ou 'teacher'
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [currentDay, setCurrentDay] = useState<string>('');
  const [currentTimeSlot, setCurrentTimeSlot] = useState<string>('');
  
  // Champs du formulaire modal
  const [formClass, setFormClass] = useState<string>('');
  const [formSubject, setFormSubject] = useState<string>('');
  const [formTeacher, setFormTeacher] = useState<string>('');
  const [formRoom, setFormRoom] = useState<string>('');

  const handleAddClass = (day: string, timeSlot: string) => {
    setCurrentDay(day);
    setCurrentTimeSlot(timeSlot);
    setFormClass(selectedClass);
    setFormSubject('');
    setFormTeacher('');
    setFormRoom('');
    setModalOpen(true);
  };

  const handleSaveSchedule = () => {
    toast({
      title: "Cours ajouté",
      description: `${formSubject} ajouté le ${currentDay} de ${currentTimeSlot} pour la classe ${formClass}.`,
    });
    setModalOpen(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Gestion des Emplois du Temps</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Options d'affichage</CardTitle>
          <CardDescription>Choisissez la vue et la classe ou le professeur</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Tabs value={scheduleView} onValueChange={setScheduleView} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="class">Vue par Classe</TabsTrigger>
                <TabsTrigger value="teacher">Vue par Professeur</TabsTrigger>
              </TabsList>
            </Tabs>
            
            {scheduleView === 'class' ? (
              <div className="max-w-md">
                <label className="text-sm font-medium block mb-2">Classe</label>
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
            ) : (
              <div className="max-w-md">
                <label className="text-sm font-medium block mb-2">Professeur</label>
                <Select onValueChange={setSelectedTeacher} value={selectedTeacher}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un professeur" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher} value={teacher}>
                        {teacher}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Emploi du Temps - {scheduleView === 'class' ? selectedClass : selectedTeacher}
          </CardTitle>
          <CardDescription>
            Semaine type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[100px_repeat(5,1fr)] gap-2 mb-2">
                <div className="font-semibold text-gray-500"></div>
                {days.map(day => (
                  <div key={day} className="font-semibold text-center py-2 bg-gray-100 rounded">
                    {day}
                  </div>
                ))}
              </div>
              
              {timeSlots.map(timeSlot => (
                <div key={timeSlot} className="grid grid-cols-[100px_repeat(5,1fr)] gap-2 mb-2">
                  <div className="text-sm font-medium text-gray-500 py-2 flex items-center">
                    {timeSlot}
                  </div>
                  {days.map(day => (
                    <div key={`${day}-${timeSlot}`} className="min-h-[80px]">
                      <ScheduleItem
                        day={day}
                        timeSlot={timeSlot}
                        data={scheduleData[day]?.[timeSlot]}
                        onAddClass={handleAddClass}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un cours</DialogTitle>
            <DialogDescription>
              {currentDay} {currentTimeSlot}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="class" className="text-right text-sm font-medium">
                Classe
              </label>
              <Select value={formClass} onValueChange={setFormClass} disabled={scheduleView === 'class'}>
                <SelectTrigger className="col-span-3">
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
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="subject" className="text-right text-sm font-medium">
                Matière
              </label>
              <Select value={formSubject} onValueChange={setFormSubject}>
                <SelectTrigger className="col-span-3">
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
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="teacher" className="text-right text-sm font-medium">
                Professeur
              </label>
              <Select value={formTeacher} onValueChange={setFormTeacher} disabled={scheduleView === 'teacher'}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Sélectionner un professeur" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher} value={teacher}>
                      {teacher}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="room" className="text-right text-sm font-medium">
                Salle
              </label>
              <Select value={formRoom} onValueChange={setFormRoom}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Sélectionner une salle" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room} value={room}>
                      {room}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button onClick={handleSaveSchedule} disabled={!formSubject || !formTeacher || !formRoom}>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
