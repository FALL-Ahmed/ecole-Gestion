
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
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileIcon, File, Trash, Upload, Download, FileText, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const courses = ['Mathématiques 6ème', 'Mathématiques 5ème', 'Mathématiques 4ème', 'Mathématiques 3ème'];
const chapters = ['Chapitre 1 - Nombres', 'Chapitre 2 - Géométrie', 'Chapitre 3 - Fractions', 'Chapitre 4 - Statistiques'];

const documents = [
  { id: 1, name: 'Cours - Nombres entiers.pdf', type: 'pdf', size: '2.3 MB', date: '15/09/2023', description: 'Cours sur les nombres entiers et les opérations de base' },
  { id: 2, name: 'Exercices - Chapitre 1.pdf', type: 'pdf', size: '1.7 MB', date: '18/09/2023', description: 'Exercices de révision sur les opérations avec nombres entiers' },
  { id: 3, name: 'Correction DS1.pdf', type: 'pdf', size: '0.8 MB', date: '05/10/2023', description: 'Correction du devoir surveillé n°1' },
  { id: 4, name: 'Présentation - Géométrie.pptx', type: 'ppt', size: '5.1 MB', date: '12/10/2023', description: 'Support de cours pour la leçon sur les figures géométriques' },
  { id: 5, name: 'Exemples supplémentaires.docx', type: 'doc', size: '0.5 MB', date: '20/10/2023', description: 'Exemples complémentaires pour les élèves en difficulté' },
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

export function CourseMaterials() {
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState<boolean>(false);
  const [documentsList, setDocumentsList] = useState(documents);

  const handleFileUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast({
      title: "Document téléversé",
      description: "Votre document a été ajouté avec succès.",
    });
    setUploadDialogOpen(false);
  };

  const deleteDocument = (id: number) => {
    setDocumentsList(documentsList.filter(doc => doc.id !== id));
    toast({
      title: "Document supprimé",
      description: "Le document a été supprimé avec succès.",
    });
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

  const isFormComplete = selectedCourse && selectedChapter;

  return (
    <div className="p-6 pb-[env(safe-area-inset-bottom)]">
      <h1 className="text-2xl font-bold mb-6">Supports de Cours</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Sélection</CardTitle>
          <CardDescription>Choisissez le cours et le chapitre</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cours</label>
              <Select onValueChange={setSelectedCourse} value={selectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un cours" />
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
              <Select onValueChange={setSelectedChapter} value={selectedChapter}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un chapitre" />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chapter) => (
                    <SelectItem key={chapter} value={chapter}>
                      {chapter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isFormComplete ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h2 className="text-lg font-medium">
                {selectedCourse} - {selectedChapter}
              </h2>
              <p className="text-sm text-gray-600">
                {documentsList.length} documents
              </p>
            </div>
            
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Ajouter un document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Téléverser un nouveau document</DialogTitle>
                  <DialogDescription>
                    Ajoutez un support de cours pour vos élèves
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="file">Fichier</Label>
                    <Input id="file" type="file" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du document</Label>
                    <Input id="name" placeholder="Exemple: Cours - Introduction" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Décrivez brièvement le contenu du document..."
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit">Téléverser</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <Tabs defaultValue="list" className="space-y-4">
            <TabsList>
              <TabsTrigger value="list">Liste</TabsTrigger>
              <TabsTrigger value="grid">Grille</TabsTrigger>
            </TabsList>
            
            <TabsContent value="list">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Taille</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documentsList.map((document) => (
                        <TableRow key={document.id}>
                          <TableCell>
                            {getFileIcon(document.type)}
                          </TableCell>
                          <TableCell className="font-medium">{document.name}</TableCell>
                          <TableCell className="max-w-xs truncate">{document.description}</TableCell>
                          <TableCell>{document.size}</TableCell>
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
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => deleteDocument(document.id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="grid">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {documentsList.map((document) => (
                  <Card key={document.id} className="overflow-hidden">
                    <div className="h-32 bg-gray-100 flex items-center justify-center">
                      {getFileIcon(document.type)}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium truncate" title={document.name}>{document.name}</h3>
                      <p className="text-xs text-gray-600 mt-1">{document.size} • {document.date}</p>
                      <div className="flex justify-between mt-4">
                        <Button variant="ghost" size="sm" onClick={() => previewDocument(document)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => downloadDocument(document)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteDocument(document.id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-8 text-center shadow-sm">
          <p className="text-gray-500">Veuillez sélectionner un cours et un chapitre pour voir les documents disponibles.</p>
        </div>
      )}
    </div>
  );
}
