
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Calendar as CalendarIcon, Plus, CheckCircle, Edit, Calendar as CalendarLucide, AlertCircle } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Chapter } from '@/types/chapter';

const courses = ['Mathématiques 6ème', 'Mathématiques 5ème', 'Mathématiques 4ème', 'Mathématiques 3ème'];
const classes = ['6ème A', '6ème B', '5ème A', '5ème B', '4ème A', '4ème B', '3ème A', '3ème B'];

// Demo data
const initialChapters: Chapter[] = [
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
  {
    id: 4,
    title: 'Proportionnalité',
    description: 'Concepts de proportionnalité et applications',
    subject: 'Mathématiques',
    class: '6ème A',
    plannedStartDate: '2023-11-11',
    plannedEndDate: '2023-12-01',
    status: 'planned',
    materials: 0
  }
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
  return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
};

const calculateProgress = (chapters: Chapter[]) => {
  const totalChapters = chapters.length;
  if (totalChapters === 0) return 0;
  
  const completedChapters = chapters.filter(ch => ch.status === 'completed').length;
  return (completedChapters / totalChapters) * 100;
};

export function ChapterPlanning() {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [filteredClass, setFilteredClass] = useState<string>('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    class: '',
    subject: '',
    plannedStartDate: '',
    plannedEndDate: '',
  });

  const filteredChapters = chapters.filter(chapter => {
    if (filteredClass && chapter.class !== filteredClass) return false;
    if (selectedClass && chapter.class !== selectedClass) return false;
    if (selectedSubject && !chapter.subject.includes(selectedSubject)) return false;
    return true;
  });

  const handleAddChapter = () => {
    setEditingChapter(null);
    setFormData({
      title: '',
      description: '',
      class: selectedClass || '',
      subject: selectedSubject || '',
      plannedStartDate: '',
      plannedEndDate: '',
    });
    setDialogOpen(true);
  };

  const handleEditChapter = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setFormData({
      title: chapter.title,
      description: chapter.description,
      class: chapter.class,
      subject: chapter.subject,
      plannedStartDate: chapter.plannedStartDate,
      plannedEndDate: chapter.plannedEndDate,
    });
    setDialogOpen(true);
  };

  const handleSaveChapter = () => {
    if (editingChapter) {
      // Update existing chapter
      setChapters(chapters.map(ch => 
        ch.id === editingChapter.id 
          ? { ...ch, ...formData } 
          : ch
      ));
      toast({
        title: "Chapitre mis à jour",
        description: "Les modifications ont été enregistrées.",
      });
    } else {
      // Add new chapter
      const newChapter: Chapter = {
        id: Date.now(),
        ...formData,
        status: 'planned',
        materials: 0
      };
      setChapters([...chapters, newChapter]);
      toast({
        title: "Chapitre ajouté",
        description: "Le nouveau chapitre a été planifié.",
      });
    }
    setDialogOpen(false);
  };

  const handleMarkAsInProgress = (chapterId: number) => {
    setChapters(chapters.map(ch => 
      ch.id === chapterId 
        ? { ...ch, status: 'in-progress', actualStartDate: format(new Date(), 'yyyy-MM-dd') } 
        : ch
    ));
    toast({
      title: "Chapitre démarré",
      description: "Le chapitre est maintenant en cours.",
    });
  };

  const handleMarkAsComplete = (chapterId: number) => {
    setChapters(chapters.map(ch => 
      ch.id === chapterId 
        ? { ...ch, status: 'completed', actualEndDate: format(new Date(), 'yyyy-MM-dd') } 
        : ch
    ));
    toast({
      title: "Chapitre terminé",
      description: "Le chapitre a été marqué comme terminé.",
    });
  };

  const progress = calculateProgress(filteredChapters);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Planification des Chapitres</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Chapitres planifiés</p>
                <p className="text-2xl font-bold">{filteredChapters.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                <CalendarLucide className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Chapitres terminés</p>
                <p className="text-2xl font-bold">
                  {filteredChapters.filter(ch => ch.status === 'completed').length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full text-green-600">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Progression</p>
                <p className="text-2xl font-bold">{Math.round(progress)}%</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
            <Progress value={progress} className="h-2 mt-4" />
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>Sélectionnez une classe et une matière pour voir la planification</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Classe</label>
              <Select value={filteredClass} onValueChange={setFilteredClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les classes</SelectItem>
                  {classes.map((cls) => (
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
                  {['Mathématiques', 'Français', 'Histoire-Géographie', 'Sciences', 'Anglais'].map((subject) => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Liste des chapitres</h2>
        <Button onClick={handleAddChapter}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un chapitre
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Période planifiée</TableHead>
                <TableHead>Période réelle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredChapters.length > 0 ? (
                filteredChapters.map((chapter) => (
                  <TableRow key={chapter.id}>
                    <TableCell className="font-medium">
                      <div>
                        {chapter.title}
                        <p className="text-xs text-gray-500">{chapter.subject}</p>
                      </div>
                    </TableCell>
                    <TableCell>{chapter.class}</TableCell>
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
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditChapter(chapter)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        {chapter.status === 'planned' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                            onClick={() => handleMarkAsInProgress(chapter.id)}
                          >
                            Démarrer
                          </Button>
                        )}
                        
                        {chapter.status === 'in-progress' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            onClick={() => handleMarkAsComplete(chapter.id)}
                          >
                            Terminer
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                    Aucun chapitre trouvé pour les filtres sélectionnés
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingChapter ? 'Modifier le chapitre' : 'Ajouter un nouveau chapitre'}</DialogTitle>
            <DialogDescription>
              Définissez les détails et la planification du chapitre
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm font-medium">Titre du chapitre</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Ex: Nombres entiers et opérations"
              />
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Décrivez brièvement le contenu du chapitre"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Classe</label>
                <Select 
                  value={formData.class}
                  onValueChange={(value) => setFormData({...formData, class: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une classe" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-1">Matière</label>
                <Select
                  value={formData.subject}
                  onValueChange={(value) => setFormData({...formData, subject: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une matière" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Mathématiques', 'Français', 'Histoire-Géographie', 'Sciences', 'Anglais'].map((subject) => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Date de début prévue</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.plannedStartDate ? (
                        formatDate(formData.plannedStartDate)
                      ) : (
                        <span>Sélectionner une date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.plannedStartDate ? new Date(formData.plannedStartDate) : undefined}
                      onSelect={(date) => date && setFormData({...formData, plannedStartDate: format(date, 'yyyy-MM-dd')})}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-1">Date de fin prévue</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.plannedEndDate ? (
                        formatDate(formData.plannedEndDate)
                      ) : (
                        <span>Sélectionner une date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.plannedEndDate ? new Date(formData.plannedEndDate) : undefined}
                      onSelect={(date) => date && setFormData({...formData, plannedEndDate: format(date, 'yyyy-MM-dd')})}
                      initialFocus
                      disabled={(date) => 
                        formData.plannedStartDate ? date < new Date(formData.plannedStartDate) : false
                      }
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleSaveChapter}
              disabled={
                !formData.title ||
                !formData.class ||
                !formData.subject ||
                !formData.plannedStartDate ||
                !formData.plannedEndDate
              }
            >
              {editingChapter ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
