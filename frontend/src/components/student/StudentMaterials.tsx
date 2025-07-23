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
import { FileIcon, FileText, Search, Download, Eye, ArrowLeft, Loader2, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/apiClient';

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

export function StudentMaterials({ initialCourseId, onBack }: StudentMaterialsProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [courses, setCourses] = useState<Course[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  const [selectedCourse, setSelectedCourse] = useState<string>(initialCourseId?.toString() || '');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [studentContext, setStudentContext] = useState<{ classId: number; anneeScolaireId: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-6 w-6 text-red-500 dark:text-red-400" />;
      case 'ppt':
        return <FileText className="h-6 w-6 text-orange-500 dark:text-orange-400" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-6 w-6 text-blue-500 dark:text-blue-400" />;
      default:
        return <FileIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />;
    }
  };

  const fetchStudentData = useCallback(async () => {
    if (!user || user.role !== 'eleve') {
      setError(t.common.accessDenied);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const configRes = await apiClient.get('/configuration');
      const configData: any | any[] = configRes.data;
      let activeAnneeId: number | undefined;

      if (Array.isArray(configData) && configData.length > 0) {
        activeAnneeId = configData[0].annee_academique_active_id || configData[0].annee_scolaire?.id;
      } else if (configData && !Array.isArray(configData)) {
        activeAnneeId = configData.annee_academique_active_id || configData.annee_scolaire?.id;
      }
      if (!activeAnneeId) throw new Error(t.common.missingYearConfig);

      const inscriptionsRes = await apiClient.get(`/inscriptions?utilisateurId=${user.id}&anneeScolaireId=${activeAnneeId}`);
      const inscriptions = inscriptionsRes.data;
      const studentInscription = inscriptions.find((insc: any) => insc.actif);
      if (!studentInscription || !studentInscription.classe?.id) {
        throw new Error(t.common.noActiveRegistration);
      }

      const studentClassId = studentInscription.classe.id;
      setStudentContext({ classId: studentClassId, anneeScolaireId: activeAnneeId });

      const affectationsRes = await apiClient.get(`/affectations?classe_id=${studentClassId}&annee_scolaire_id=${activeAnneeId}`);
      const affectations = affectationsRes.data;
      const uniqueCourses = new Map<number, Course>();
      affectations.forEach((aff: any) => {
        if (aff.matiere && !uniqueCourses.has(aff.matiere.id)) {
          uniqueCourses.set(aff.matiere.id, {
            id: aff.matiere.id,
            name: aff.matiere.nom,
          });
        }
      });
      setCourses(Array.from(uniqueCourses.values()));
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || t.common.errorLoadingData('materials', '');
      setError(errorMessage);
      toast({ 
        title: t.common.error, 
        description: errorMessage, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  useEffect(() => {
    if (!selectedCourse || !studentContext) {
      setChapters([]);
      setSelectedChapter('');
      return;
    }

    const fetchChaptersForCourse = async () => {
      setIsLoading(true);
      try {
        const { classId, anneeScolaireId } = studentContext;
        const url = `/chapitres?matiereId=${selectedCourse}&classeId=${classId}&annee_scolaire_id=${anneeScolaireId}`;
        const chaptersRes = await apiClient.get(url);

        const chaptersData = chaptersRes.data;
        const filteredChapters = chaptersData.filter((ch: any) => 
          String(ch.matiereId) === String(selectedCourse) &&
          String(ch.classeId) === String(classId)
        );
        setChapters(filteredChapters.map((ch: any) => ({ id: ch.id, titre: ch.titre })));
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || t.common.errorLoadingChapters;
        setError(errorMessage);
        setChapters([]);
        toast({
          title: t.common.error,
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchChaptersForCourse();
  }, [selectedCourse, studentContext, t]);

  const handleCourseChange = (course: string) => {
    setSelectedCourse(course);
    setSelectedChapter('');
  };

  const downloadDocument = (document: Document) => {
    toast({
      title: t.studentMaterials.downloading,
      description: `${t.studentMaterials.downloading} ${document.name}`,
    });
    // Implémentez ici la logique de téléchargement réel
  };

  const previewDocument = (document: Document) => {
    toast({
      title: t.studentMaterials.preview,
      description: `${t.studentMaterials.previewing} ${document.name}`,
    });
    // Implémentez ici la logique d'aperçuapi
  };

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
    return dateB.localeCompare(dateA); // Plus récent en premier
  });

  if (isLoading) {
    return (
      <div className={cn(
        "p-6 flex flex-col items-center justify-center h-64",
        language === 'ar' ? 'text-right' : 'text-left'
      )} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
          {t.common.loading}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(
        "p-6 text-center text-red-500",
        language === 'ar' ? 'text-right' : 'text-left'
      )} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <h2 className="text-xl font-semibold mb-2 dark:text-red-400">{t.common.error}</h2>
        <p className="dark:text-gray-300">{error}</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          {t.common.tryAgain}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "p-6",
      language === 'ar' ? 'text-right' : 'text-left'
    )} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className={cn(
  "flex items-center mb-6",
  language === 'ar' ? 'flex-row-reverse justify-between' : 'flex-row justify-between'
)} dir={language === 'ar' ? 'rtl' : 'ltr'}>
  {onBack && (
    <Button variant="ghost" onClick={onBack} className={cn(
      "flex items-center gap-2",
      language === 'ar' ? 'flex-row-reverse' : 'flex-row'
    )}>
      {language === 'ar' ? (
        <>
          <span>{t.common.back}</span>
          <ArrowLeft className="h-4 w-4" />
        </>
      ) : (
        <>
          <ArrowLeft className="h-4 w-4" />
          <span>{t.common.back}</span>
        </>
      )}
    </Button>
  )}
  <h1 className={cn(
    "text-2xl font-bold dark:text-white",
    language === 'ar' ? 'text-right' : 'text-left'
  )}>
    {t.studentMaterials.title}
  </h1>
</div>

      <Card className="mb-6 dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-white">{t.studentMaterials.filters}</CardTitle>
          <CardDescription className="dark:text-gray-300">
            {t.studentMaterials.filterDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-300">
                {t.studentMaterials.subject}
              </label>
              <Select value={selectedCourse} onValueChange={handleCourseChange}>
                <SelectTrigger className={language === 'ar' ? 'text-right' : 'text-left'}>
                  <SelectValue placeholder={t.studentMaterials.allSubjects} />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem 
                      key={course.id} 
                      value={course.id.toString()}
                      className={language === 'ar' ? 'text-right' : 'text-left'}
                    >
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-300">
                {t.studentMaterials.chapter}
              </label>
              <Select 
                value={selectedChapter} 
                onValueChange={setSelectedChapter}
                disabled={!selectedCourse}
              >
                <SelectTrigger className={language === 'ar' ? 'text-right' : 'text-left'}>
                  <SelectValue placeholder={t.studentMaterials.allChapters} />
                </SelectTrigger>
                <SelectContent>
                  {selectedCourse && chapters.map((chapter) => (
                    <SelectItem 
                      key={chapter.id} 
                      value={chapter.titre}
                      className={language === 'ar' ? 'text-right' : 'text-left'}
                    >
                      {chapter.titre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-300">
                {t.common.search}
              </label>
              <div className="relative">
                <Search className={cn(
                  "absolute top-2.5 h-4 w-4 text-gray-500",
                  language === 'ar' ? 'right-2' : 'left-2'
                )} />
                <Input
                  placeholder={t.common.search}
                  className={language === 'ar' ? 'pr-8' : 'pl-8'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

     <div className={cn(
  "flex flex-col md:flex-row justify-between items-center mb-4",
  language === 'ar' ? 'text-right' : 'text-left'
)} dir={language === 'ar' ? 'rtl' : 'ltr'}>
  <h2 className="text-lg font-medium mb-2 md:mb-0 dark:text-white">
    {sortedDocuments.length} {t.studentMaterials.documentsAvailable}
  </h2>
</div>

      {sortedDocuments.length > 0 ? (
        <Card className="dark:bg-gray-800">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-gray-700">
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="dark:text-white">{t.studentMaterials.name}</TableHead>
                  <TableHead className="dark:text-white">{t.studentMaterials.description}</TableHead>
                  <TableHead className="dark:text-white">{t.studentMaterials.subject}</TableHead>
                  <TableHead className="dark:text-white">{t.common.teacher}</TableHead>
                  <TableHead className="dark:text-white">{t.common.date}</TableHead>
                  <TableHead className={cn(
                    "text-right dark:text-white",
                    language === 'ar' ? 'text-left' : 'text-right'
                  )}>
                    {t.common.actions}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDocuments.map((document) => (
                  <TableRow key={document.id} className="dark:border-gray-700">
                    <TableCell>
                      {getFileIcon(document.type)}
                    </TableCell>
                    <TableCell className="font-medium dark:text-white">
                      {document.name}
                    </TableCell>
                    <TableCell className="max-w-xs truncate dark:text-gray-300">
                      {document.description}
                    </TableCell>
                    <TableCell className="dark:text-gray-300">
                      {document.subject}
                    </TableCell>
                    <TableCell className="dark:text-gray-300">
                      {document.teacher}
                    </TableCell>
                    <TableCell className="dark:text-gray-300">
                      {document.date}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right",
                      language === 'ar' ? 'text-left' : 'text-right'
                    )}>
                      <div className={cn(
                        "flex gap-2",
                        language === 'ar' ? 'flex-row-reverse justify-start' : 'justify-end'
                      )}>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => previewDocument(document)}
                          className="dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => downloadDocument(document)}
                          className="dark:text-gray-300 dark:hover:bg-gray-700"
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
        <div className={cn(
          "text-center py-12 bg-white rounded-lg shadow-sm dark:bg-gray-800",
        )}>
          <p className="text-gray-500 dark:text-gray-400">
            {t.studentMaterials.noDocumentsFound}
          </p>
          <Button 
            variant="link" 
            onClick={() => {
              setSelectedCourse(initialCourseId?.toString() || '');
              setSelectedChapter('');
              setSearchQuery('');
            }}
            className="dark:text-blue-400"
          >
            {t.common.resetFilters}
          </Button>
        </div>
      )}
    </div>
  );
}