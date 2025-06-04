
import React, { useState, useEffect } from 'react';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { FileIcon, FileText, Search, Download, Eye, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface StudentMaterialsProps {
  initialCourse?: string;
  onBack?: () => void;
}

const courses = ['Mathématiques', 'Français', 'Histoire-Géographie', 'Anglais', 'Sciences', 'Espagnol', 'Arts Plastiques', 'EPS', 'Musique'];
const chapters = {
  'Mathématiques': ['Chapitre 1 - Nombres', 'Chapitre 2 - Géométrie', 'Chapitre 3 - Fractions', 'Chapitre 4 - Statistiques'],
  'Français': ['Chapitre 1 - Grammaire', 'Chapitre 2 - Conjugaison', 'Chapitre 3 - Orthographe', 'Chapitre 4 - Expression écrite'],
  'Histoire-Géographie': ['Chapitre 1 - Préhistoire', 'Chapitre 2 - Égypte ancienne', 'Chapitre 3 - Grèce antique', 'Chapitre 4 - Géographie mondiale'],
  'Anglais': ['Chapitre 1 - Grammaire de base', 'Chapitre 2 - Vocabulaire courant', 'Chapitre 3 - Temps verbaux', 'Chapitre 4 - Expression orale'],
  'Sciences': ['Chapitre 1 - Le corps humain', 'Chapitre 2 - Biodiversité', 'Chapitre 3 - Matière et matériaux', 'Chapitre 4 - Énergie'],
  'Espagnol': ['Chapitre 1 - Introduction', 'Chapitre 2 - Phrases simples', 'Chapitre 3 - Vocabulaire', 'Chapitre 4 - Conjugaison'],
  'Arts Plastiques': ['Chapitre 1 - Couleurs', 'Chapitre 2 - Formes', 'Chapitre 3 - Techniques de dessin', 'Chapitre 4 - Histoire de l\'art'],
  'EPS': ['Chapitre 1 - Sports collectifs', 'Chapitre 2 - Athlétisme', 'Chapitre 3 - Gymnastique', 'Chapitre 4 - Natation'],
  'Musique': ['Chapitre 1 - Notions de base', 'Chapitre 2 - Instruments', 'Chapitre 3 - Histoire de la musique', 'Chapitre 4 - Pratique vocale']
};

const documents = [
  { id: 1, name: 'Cours - Nombres entiers.pdf', subject: 'Mathématiques', chapter: 'Chapitre 1 - Nombres', type: 'pdf', size: '2.3 MB', date: '15/09/2023', teacher: 'M. Dubois', description: 'Cours sur les nombres entiers et les opérations de base' },
  { id: 2, name: 'Exercices - Chapitre 1.pdf', subject: 'Mathématiques', chapter: 'Chapitre 1 - Nombres', type: 'pdf', size: '1.7 MB', date: '18/09/2023', teacher: 'M. Dubois', description: 'Exercices de révision sur les opérations avec nombres entiers' },
  { id: 3, name: 'Correction DS1.pdf', subject: 'Mathématiques', chapter: 'Chapitre 1 - Nombres', type: 'pdf', size: '0.8 MB', date: '05/10/2023', teacher: 'M. Dubois', description: 'Correction du devoir surveillé n°1' },
  { id: 4, name: 'Présentation - Géométrie.pptx', subject: 'Mathématiques', chapter: 'Chapitre 2 - Géométrie', type: 'ppt', size: '5.1 MB', date: '12/10/2023', teacher: 'M. Dubois', description: 'Support de cours pour la leçon sur les figures géométriques' },
  { id: 5, name: 'Cours - Fractions.pdf', subject: 'Mathématiques', chapter: 'Chapitre 3 - Fractions', type: 'pdf', size: '1.8 MB', date: '15/11/2023', teacher: 'M. Dubois', description: 'Cours sur les fractions et les opérations avec fractions' },
  { id: 6, name: 'Grammaire de base.pdf', subject: 'Français', chapter: 'Chapitre 1 - Grammaire', type: 'pdf', size: '2.1 MB', date: '20/09/2023', teacher: 'Mme Bernard', description: 'Cours de grammaire française' },
  { id: 7, name: 'Histoire - La préhistoire.pdf', subject: 'Histoire-Géographie', chapter: 'Chapitre 1 - Préhistoire', type: 'pdf', size: '3.2 MB', date: '22/09/2023', teacher: 'M. Robert', description: 'Cours sur la préhistoire et les premiers hommes' },
  { id: 8, name: 'Le corps humain.pdf', subject: 'Sciences', chapter: 'Chapitre 1 - Le corps humain', type: 'pdf', size: '4.5 MB', date: '25/09/2023', teacher: 'M. Thomas', description: 'Anatomie et fonctionnement du corps humain' },
];

const getFileIcon = (type: string) => {
  switch (type) {
    case 'pdf':
      return <FileText className="h-6 w-6 text-red-500" />;
    case 'ppt':
      return <FileText className="h-6 w-6 text-orange-500" />;
    case 'doc':
    case 'docx':
      return <FileText className="h-6 w-6 text-blue-500" />;
    default:
      return <FileIcon className="h-6 w-6 text-gray-500" />;
  }
};

export function StudentMaterials({ initialCourse, onBack }: StudentMaterialsProps) {
  const [selectedCourse, setSelectedCourse] = useState<string>(initialCourse || '');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<string>('all');

  useEffect(() => {
    if (initialCourse && !selectedCourse) {
      setSelectedCourse(initialCourse);
    }
  }, [initialCourse, selectedCourse]);

  const handleCourseChange = (course: string) => {
    setSelectedCourse(course);
    setSelectedChapter('');
  };

  const downloadDocument = (document: any) => {
    toast({
      title: "Téléchargement",
      description: `Téléchargement de ${document.name} en cours...`,
    });
  };

  const previewDocument = (document: any) => {
    toast({
      title: "Aperçu",
      description: `Aperçu de ${document.name}`,
    });
  };

  const filteredDocuments = documents.filter(doc => {
    // Filtrer par matière si sélectionnée
    if (selectedCourse && doc.subject !== selectedCourse) return false;
    
    // Filtrer par chapitre si sélectionné
    if (selectedChapter && doc.chapter !== selectedChapter) return false;
    
    // Filtrer par recherche si texte saisi
    if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !doc.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    return true;
  });

  // Trier par date de publication (plus récent d'abord)
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    const dateA = a.date.split('/').reverse().join('');
    const dateB = b.date.split('/').reverse().join('');
    return viewMode === 'recent' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Documents de Cours</h1>
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux cours
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>Sélectionnez la matière et le chapitre</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Matière</label>
              <Select value={selectedCourse} onValueChange={handleCourseChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les matières" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course} value={course}>
                      {course}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Chapitre</label>
              <Select 
                value={selectedChapter} 
                onValueChange={setSelectedChapter}
                disabled={!selectedCourse}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les chapitres" />
                </SelectTrigger>
                <SelectContent>
                  {selectedCourse && chapters[selectedCourse]?.map((chapter) => (
                    <SelectItem key={chapter} value={chapter}>
                      {chapter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Recherche</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Rechercher..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <h2 className="text-lg font-medium mb-2 md:mb-0">
          {sortedDocuments.length} document(s) disponible(s)
        </h2>
        
        <Tabs defaultValue="all" value={viewMode} onValueChange={setViewMode} className="w-full md:w-auto">
          <TabsList>
            <TabsTrigger value="all">Par défaut</TabsTrigger>
            <TabsTrigger value="recent">Plus récents</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {sortedDocuments.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Matière</TableHead>
                  <TableHead>Professeur</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDocuments.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>
                      {getFileIcon(document.type)}
                    </TableCell>
                    <TableCell className="font-medium">{document.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{document.description}</TableCell>
                    <TableCell>{document.subject}</TableCell>
                    <TableCell>{document.teacher}</TableCell>
                    <TableCell>{document.date}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => previewDocument(document)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => downloadDocument(document)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <p className="text-gray-500">Aucun document ne correspond à votre recherche</p>
          <Button 
            variant="link" 
            onClick={() => {
              setSelectedCourse(initialCourse || '');
              setSelectedChapter('');
              setSearchQuery('');
            }}
          >
            Réinitialiser les filtres
          </Button>
        </div>
      )}
    </div>
  );
}
