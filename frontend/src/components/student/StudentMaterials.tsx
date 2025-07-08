import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { FileIcon, FileText, Search, Download, Eye, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface StudentMaterialsProps {
  initialCourseId?: number;
  onBack?: () => void;
}

interface Course {
  id: number;
  name: string;
}

interface Chapter {
  id: number;
  titre: string;
}

interface Document {
  id: number;
  name: string;
  description: string;
  type: string;
  size: string;
  date: string;
  teacher: string;
  subject: string;
  chapter: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_URL}/api`;

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

export function StudentMaterials({ initialCourseId, onBack }: StudentMaterialsProps) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  const [selectedCourse, setSelectedCourse] = useState<string>(initialCourseId?.toString() || '');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<string>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chargement des matières et documents
  const fetchStudentData = useCallback(async () => {
    if (!user || user.role !== 'eleve') {
      setError("Accès non autorisé.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const configRes = await fetch(`${API_BASE_URL}/configuration`);
      const configData = await configRes.json();
      const activeAnneeId = configData?.annee_scolaire?.id || configData?.annee_academique_active_id;
      if (!activeAnneeId) throw new Error("Année scolaire active non configurée.");

      const inscriptionsRes = await fetch(`${API_BASE_URL}/inscriptions?utilisateurId=${user.id}&anneeScolaireId=${activeAnneeId}`);
      const inscriptions = await inscriptionsRes.json();
      const studentInscription = inscriptions.find((insc: any) => insc.actif);
      if (!studentInscription || !studentInscription.classe?.id) throw new Error("Inscription active introuvable.");
      const studentClassId = studentInscription.classe.id;

      const affectationsRes = await fetch(`${API_BASE_URL}/affectations?classe_id=${studentClassId}&annee_scolaire_id=${activeAnneeId}`);
      const affectations = await affectationsRes.json();
      const studentCourses = affectations.map((aff: any) => ({
        id: aff.matiere.id,
        name: aff.matiere.nom,
      }));
      setCourses(studentCourses);

      const documentsRes = await fetch(`${API_BASE_URL}/documents`);
      const allDocuments = await documentsRes.json();
      setDocuments(Array.isArray(allDocuments) ? allDocuments : []);
    } catch (err: any) {
      setError(err.message || "Impossible de charger les données.");
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  // Charger les chapitres quand une matière est sélectionnée
  useEffect(() => {
    if (!selectedCourse) {
      setChapters([]);
      setSelectedChapter('');
      return;
    }
    const fetchChaptersForCourse = async () => {
      try {
        const chaptersRes = await fetch(`${API_BASE_URL}/chapitres?matiereId=${selectedCourse}`);
        const chaptersData = await chaptersRes.json();
        setChapters(chaptersData.map((ch: any) => ({ id: ch.id, titre: ch.titre })));
      } catch (err) {
        setChapters([]);
      }
    };
    fetchChaptersForCourse();
  }, [selectedCourse]);

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

  // Filtrage local
  const filteredDocuments = documents.filter(doc => {
    if (selectedCourse && doc.subject !== courses.find(c => c.id.toString() === selectedCourse)?.name) return false;
    if (selectedChapter && doc.chapter !== selectedChapter) return false;
    if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !doc.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    const dateA = a.date.split('/').reverse().join('');
    const dateB = b.date.split('/').reverse().join('');
    return viewMode === 'recent' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
  });

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="mt-4 text-lg text-gray-600">Chargement des supports de cours...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        <h2 className="text-xl font-semibold mb-2">Erreur</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 pb-[env(safe-area-inset-bottom)]">
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
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.name}
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
                  {selectedCourse && chapters.map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.titre}>
                      {chapter.titre}
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
              setSelectedCourse(initialCourseId?.toString() || '');
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