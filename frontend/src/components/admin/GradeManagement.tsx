import React, { useState, useEffect, useCallback } from 'react';
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
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, FileDown, Printer, Save, Info, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

// Define types for API data
interface AnneeAcademique {
  id: number;
  libelle: string;
  date_debut?: string;
  date_fin?: string;
}

interface Classe {
  id: number;
  nom: string;
  annee_scolaire_id: number;
}

interface Matiere {
  id: number;
  nom: string;
}

interface Evaluation {
  id: number;
  matiere_id: number;
  classe_id: number;
  professeur_id: number;
  type: string;
  date_eval: string;
  trimestre: number;
  annee_scolaire_id: number;
}

interface Eleve {
  id: number;
  nom: string;
  prenom: string;
  classeId: number;
  inscriptionId: number;
}

interface Note {
  id?: number;
  eleveId: number;
  evaluationId: number;
  note: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_URL}/api`;

const fetchAnneesAcademiques = async (): Promise<AnneeAcademique[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/annees-academiques`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching academic years:", error);
    toast({ title: "Erreur de chargement", description: "Impossible de charger les années académiques.", variant: "destructive" });
    return [];
  }
};

const fetchClasses = async (anneeAcademiqueId: number): Promise<Classe[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/classes?annee_scolaire_id=${anneeAcademiqueId}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching classes for year ${anneeAcademiqueId}:`, error);
    toast({ title: "Erreur de chargement", description: "Impossible de charger les classes pour l'année sélectionnée.", variant: "destructive" });
    return [];
  }
};

const fetchMatieresByClasse = async (classeId: number): Promise<Matiere[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/coefficientclasse?classeId=${classeId}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const coefficientClasses = await response.json();
    // Utiliser une Map pour dédoublonner les matières basées sur leur ID
    const matieresMap = new Map<number, Matiere>();
    coefficientClasses.forEach((cc: any) => {
      if (cc.matiere && cc.matiere.id) {
        matieresMap.set(cc.matiere.id, cc.matiere);
      }
    });
    return Array.from(matieresMap.values());
  } catch (error) {
    console.error(`Error fetching subjects for class ${classeId}:`, error);
    toast({ title: "Erreur de chargement", description: "Impossible de charger les matières pour la classe sélectionnée.", variant: "destructive" });
    return [];
  }
};

const fetchElevesByClasse = async (classeId: number, anneeScolaireId: number): Promise<Eleve[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/inscriptions?classeId=${classeId}&anneeScolaireId=${anneeScolaireId}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const inscriptions = await response.json();
    return inscriptions.map(inscription => ({
      id: inscription.utilisateur.id,
      nom: inscription.utilisateur.nom || 'Nom Inconnu',
      prenom: inscription.utilisateur.prenom || '',
      classeId: inscription.classe.id,
      inscriptionId: inscription.id,
    })).filter(Boolean);
  } catch (error) {
    console.error(`Error fetching students for class ${classeId} in year ${anneeScolaireId}:`, error);
    toast({ title: "Erreur de chargement", description: "Impossible de charger les élèves pour la classe sélectionnée.", variant: "destructive" });
    return [];
  }
};

const fetchEvaluations = async (classeId: number, matiereId: number, trimestreNum: number, anneeAcademiqueId: number): Promise<Evaluation[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/evaluations?classeId=${classeId}&matiereId=${matiereId}&trimestre=${trimestreNum}&anneeScolaireId=${anneeAcademiqueId}`
    );
    if (!response.ok) {
      if (response.status === 404 || response.status === 204) return [];
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Error fetching evaluations for class ${classeId}, subject ${matiereId}, trimestre ${trimestreNum}, year ${anneeAcademiqueId}:`, error);
    toast({ title: "Erreur de chargement", description: "Impossible de charger les évaluations pour la matière sélectionnée.", variant: "destructive" });
    return [];
  }
};

const fetchNote = async (evaluationId: number, eleveId: number): Promise<Note | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/notes?evaluation_id=${evaluationId}&etudiant_id=${eleveId}`);
    if (response.status === 404 || response.status === 204) return null;
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : data || null;
  } catch (error) {
    console.error(`Error fetching note for evaluation ${evaluationId}, student ${eleveId}:`, error);
    return null;
  }
};

const saveNote = async (noteData: Note): Promise<Note> => {
  try {
    const method = noteData.id ? 'PUT' : 'POST';
    const url = noteData.id ? `${API_BASE_URL}/notes/${noteData.id}` : `${API_BASE_URL}/notes`;
    const payload = { evaluation_id: noteData.evaluationId, etudiant_id: noteData.eleveId, note: noteData.note };
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error saving note:", noteData, error);
    toast({ title: "Erreur de sauvegarde", description: `Impossible de sauvegarder la note. ${error.message || 'Erreur inconnue.'}`, variant: "destructive" });
    throw error;
  }
};

export function GradeManagement() {
  const { t, language } = useLanguage();
  const [anneesAcademiques, setAnneesAcademiques] = useState<AnneeAcademique[]>([]);
  const [selectedAnneeAcademiqueId, setSelectedAnneeAcademiqueId] = useState<string>('');
  const [classes, setClasses] = useState<Classe[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [selectedMatiereId, setSelectedMatiereId] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [allEvaluations, setAllEvaluations] = useState<Evaluation[]>([]);
  const [gradeData, setGradeData] = useState<{ [eleveId: number]: { [evaluationId: number]: number | '' } }>({});
  const [isLoading, setIsLoading] = useState(false);

  const terms = [t.gradeManagement.term1, t.gradeManagement.term2, t.gradeManagement.term3];
  const trimestreMap = { 
    [t.gradeManagement.term1]: 4, 
    [t.gradeManagement.term2]: 5, 
    [t.gradeManagement.term3]: 6 
  };
  
  const formatAcademicYearDisplay = (annee: { libelle: string; date_debut?: string; date_fin?: string }): string => {
    if (!annee || !annee.date_debut || !annee.date_fin) {
      return annee.libelle || t.common.unknownYear;
    }
    const startYear = new Date(annee.date_debut).getFullYear();
    const endYear = new Date(annee.date_fin).getFullYear();
    return annee.libelle && annee.libelle.includes(String(startYear)) && annee.libelle.includes(String(endYear)) 
      ? annee.libelle 
      : `${annee.libelle || ''} (${startYear}-${endYear})`.trim();
  };

  const getEvaluationsForDisplay = useCallback(() => {
    if (!selectedTerm || allEvaluations.length === 0) {
      return [];
    }

    // Directly return the fetched evaluations, sorted.
    // Sorting logic: Devoirs first, then Compositions, then by number inside the name.
    return [...allEvaluations].sort((a, b) => {
      const typeA = a.type.toLowerCase();
      const typeB = b.type.toLowerCase();
      
      const isADevoir = typeA.includes('devoir');
      const isBDevoir = typeB.includes('devoir');
      
      if (isADevoir && !isBDevoir) return -1;
      if (!isADevoir && isBDevoir) return 1;

      // If both are devoirs or both are compositions, sort by number
      const numA = parseInt(typeA.replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(typeB.replace(/[^0-9]/g, ''), 10) || 0;
      
      return numA - numB;
    });
  }, [allEvaluations, selectedTerm]);

  useEffect(() => {
    const getAnnees = async () => {
      const data = await fetchAnneesAcademiques();
      setAnneesAcademiques(data);
    };
    getAnnees();
  }, []);

  useEffect(() => {
    const anneeId = parseInt(selectedAnneeAcademiqueId);
    if (anneeId) {
      fetchClasses(anneeId).then(data => {
        const filteredClasses = data.filter(cls => cls.annee_scolaire_id === anneeId);
        setClasses(filteredClasses);
        setSelectedClassId('');
        setMatieres([]);
        setSelectedMatiereId('');
        setSelectedTerm('');
        setEleves([]);
        setAllEvaluations([]);
        setGradeData({});
      });
    } else {
      setClasses([]);
      setSelectedClassId('');
      setMatieres([]);
      setSelectedMatiereId('');
      setSelectedTerm('');
      setEleves([]);
      setAllEvaluations([]);
      setGradeData({});
    }
  }, [selectedAnneeAcademiqueId]);

  useEffect(() => {
    const classIdNum = parseInt(selectedClassId);
    const anneeAcademiqueIdNum = parseInt(selectedAnneeAcademiqueId);

    if (classIdNum && anneeAcademiqueIdNum) {
      Promise.all([
        fetchMatieresByClasse(classIdNum),
        fetchElevesByClasse(classIdNum, anneeAcademiqueIdNum)
      ]).then(([matieresData, elevesData]) => {
        setMatieres(matieresData);
        setEleves(elevesData);
        setSelectedMatiereId('');
        setSelectedTerm('');
        setAllEvaluations([]);
        setGradeData({});
      });
    } else {
      setMatieres([]);
      setSelectedMatiereId('');
      setSelectedTerm('');
      setEleves([]);
      setAllEvaluations([]);
      setGradeData({});
    }
  }, [selectedClassId, selectedAnneeAcademiqueId]);

  useEffect(() => {
    const classIdNum = parseInt(selectedClassId);
    const matiereIdNum = parseInt(selectedMatiereId);
    const anneeAcademiqueIdNum = parseInt(selectedAnneeAcademiqueId);
    const trimestreNum = trimestreMap[selectedTerm];

    if (classIdNum && matiereIdNum && selectedTerm && anneeAcademiqueIdNum && trimestreNum) {
      const loadEvaluationsAndGrades = async () => {
        setIsLoading(true);
        try {
          const evals = await fetchEvaluations(classIdNum, matiereIdNum, trimestreNum, anneeAcademiqueIdNum);
          setAllEvaluations(evals);

          if (evals.length > 0) {
            const initialGradeData = {};
            const notePromises = eleves.flatMap(eleve =>
              evals.map(async evaluation => {
                const note = await fetchNote(evaluation.id, eleve.id);
                return { eleveId: eleve.id, evaluationId: evaluation.id, noteValue: note ? note.note : '' };
              })
            );
            const fetchedNotes = await Promise.all(notePromises);
            fetchedNotes.forEach(item => {
              if (!initialGradeData[item.eleveId]) {
                initialGradeData[item.eleveId] = {};
              }
              initialGradeData[item.eleveId][item.evaluationId] = item.noteValue;
            });
            setGradeData(initialGradeData);
          }
        } catch (error) {
          console.error("Failed to load evaluations or grades:", error);
          toast({
            title: t.common.error,
            description: t.gradeManagement.errorLoadingGrades,
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };
      loadEvaluationsAndGrades();
    } else {
      setAllEvaluations([]);
      setGradeData({});
    }
  }, [selectedClassId, selectedMatiereId, selectedTerm, selectedAnneeAcademiqueId, eleves, t]);

  const handleGradeChange = (eleveId: number, evaluationId: number, value: string) => {
    const numValue = parseFloat(value);
    if (value === '') {
setGradeData(prevData => ({
  ...prevData,
  [eleveId]: {
    ...prevData[eleveId],
    [evaluationId]: ''
  }
}));
      return;
    }
    if (isNaN(numValue) || numValue < 0 || numValue > 20) {
      toast({ title: t.common.error, description: t.gradeManagement.invalidGrade, variant: "destructive" });
      return;
    }
    setGradeData(prevData => ({ ...prevData, [eleveId]: { ...prevData[eleveId], [evaluationId]: numValue } }));
  };

  const saveGrades = async () => {
    const gradesToSave = [];
    for (const eleveIdStr in gradeData) {
      const eleveId = parseInt(eleveIdStr);
      for (const evaluationIdStr in gradeData[eleveIdStr]) {
        const evaluationId = parseInt(evaluationIdStr);
        const noteValue = gradeData[eleveIdStr][evaluationIdStr];
        if (typeof noteValue === 'number' && !isNaN(noteValue) && noteValue >= 0 && noteValue <= 20) {
          gradesToSave.push({ eleveId, evaluationId, note: noteValue });
        }
      }
    }

    try {
      await Promise.all(gradesToSave.map(async (noteToSave) => {
        const existingNote = await fetchNote(noteToSave.evaluationId, noteToSave.eleveId);
        if (existingNote && existingNote.id) {
          await saveNote({ ...noteToSave, id: existingNote.id });
        } else {
          await saveNote(noteToSave);
        }
      }));
      toast({ title: t.common.success, description: t.gradeManagement.successSave });
    } catch (error) {
      toast({ title: t.common.error, description: t.gradeManagement.errorSave, variant: "destructive" });
    }
  };


  const isFormComplete = selectedAnneeAcademiqueId && selectedClassId && selectedTerm && selectedMatiereId;
  const currentAnneeAcademique = anneesAcademiques.find(a => a.id.toString() === selectedAnneeAcademiqueId);
  const currentClasse = classes.find(c => c.id.toString() === selectedClassId)?.nom;
  const currentMatiere = matieres.find(m => m.id.toString() === selectedMatiereId)?.nom;
  const evaluationsToDisplay = getEvaluationsForDisplay();

  return (
    <div className="p-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-bold mb-6">{t.gradeManagement.title}</h1>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t.gradeManagement.selectionTitle}</CardTitle>
          <CardDescription>{t.gradeManagement.selectionDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label htmlFor="annee-select" className="text-sm font-medium">{t.common.schoolYear}</label>
              <Select onValueChange={setSelectedAnneeAcademiqueId} value={selectedAnneeAcademiqueId}>
                <SelectTrigger id="annee-select">
                  <SelectValue placeholder={t.common.selectAYear} />
                </SelectTrigger>
                <SelectContent>
                  {anneesAcademiques.map((annee) => (
                    <SelectItem key={annee.id} value={annee.id.toString()}>
                      {formatAcademicYearDisplay(annee)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="classe-select" className="text-sm font-medium">{t.common.class}</label>
              <Select onValueChange={setSelectedClassId} value={selectedClassId} disabled={!selectedAnneeAcademiqueId || classes.length === 0}>
                <SelectTrigger id="classe-select">
                  <SelectValue placeholder={t.common.selectAClass} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>{cls.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="term-select" className="text-sm font-medium">{t.common.trimester}</label>
              <Select onValueChange={setSelectedTerm} value={selectedTerm} disabled={!selectedClassId}>
                <SelectTrigger id="term-select">
                  <SelectValue placeholder={t.common.selectATrimester} />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((term) => (
                    <SelectItem key={term} value={term}>{term}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="matiere-select" className="text-sm font-medium">{t.common.subject}</label>
              <Select onValueChange={setSelectedMatiereId} value={selectedMatiereId} disabled={!selectedTerm || matieres.length === 0}>
                <SelectTrigger id="matiere-select">
                  <SelectValue placeholder={t.common.selectASubject} />
                </SelectTrigger>
                <SelectContent>
                  {matieres.map((matiere) => (
                    <SelectItem key={matiere.id} value={matiere.id.toString()}>{matiere.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isFormComplete ? (
        <Card>
          <CardHeader className="group px-6 py-5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-700/80 transition-colors duration-200">
  <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t.gradeManagement.gradesFor} <span className="text-indigo-600 dark:text-indigo-400 font-bold">{currentMatiere}</span>
          <span className="mx-1.5 text-gray-400 dark:text-gray-500">•</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">{currentClasse}</span>
        </h3>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">{selectedTerm}</span>
        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-700">
          {currentAnneeAcademique ? formatAcademicYearDisplay(currentAnneeAcademique) : ''}
        </span>
      </div>
    </div>
  </div>
</CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center text-gray-500 py-8">{t.common.loading}</div>
            ) : eleves.length === 0 ? (
              <div className="text-center text-gray-500 py-8">{t.gradeManagement.noStudents}</div>
            ) : evaluationsToDisplay.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                {t.gradeManagement.noEvaluations}
              </div>
            ) : (
              <>
                <div className="hidden lg:block overflow-x-auto">
                  <Table className="min-w-full">
  <TableHeader className="bg-gray-50 dark:bg-gray-800">
    <TableRow>
      <TableHead className="min-w-[150px] px-4 py-3 font-semibold text-left sticky left-0 bg-gray-50 dark:bg-gray-800 z-10">
        {t.common.student}
      </TableHead>
      {evaluationsToDisplay.map((evalItem) => (
        <TableHead 
          key={evalItem.id} 
          className="min-w-[100px] px-4 py-3 font-semibold text-center dark:text-gray-200"
          title={evalItem.type}
        >
          <div className="flex flex-col items-center">
            <span>{evalItem.type}</span>
            {evalItem.date_eval && (
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                {new Date(evalItem.date_eval).toLocaleDateString()}
              </span>
            )}
          </div>
        </TableHead>
      ))}
    </TableRow>
  </TableHeader>
  <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
    {eleves.map((eleve) => (
      <TableRow key={eleve.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
        <TableCell className="font-medium px-4 py-3 sticky left-0 bg-white dark:bg-gray-900 z-10 whitespace-nowrap dark:text-gray-200">
          {language === 'ar' ? `${eleve.prenom} ${eleve.nom}` : `${eleve.nom} ${eleve.prenom}`}
        </TableCell>
        {evaluationsToDisplay.map(evalItem => {
          const gradeValue = gradeData[eleve.id]?.[evalItem.id] ?? '';
          const isInvalid = gradeValue && (gradeValue < 0 || gradeValue > 20);
          return (
            <TableCell 
              key={`${eleve.id}-${evalItem.id}`} 
              className="px-4 py-2 text-center"
            >
              <div className="flex justify-center">
                <Input
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={gradeValue}
                  onChange={(e) => handleGradeChange(eleve.id, evalItem.id, e.target.value)}
                  className={`w-24 text-center px-3 py-2 rounded border ${
                    isInvalid 
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-300 hover:border-gray-400 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:border-gray-500 dark:focus:border-blue-400'
                  } focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors`}
                  aria-label={`${t.gradeManagement.gradeFor} ${eleve.prenom} ${eleve.nom} ${t.common.forLabel} ${evalItem.type}`}
                  aria-invalid={isInvalid}
                />
                {isInvalid && (<span className="sr-only">{t.gradeManagement.invalidGrade}</span>)}
              </div>
            </TableCell>
          );
        })}
      </TableRow>
    ))}
  </TableBody>
</Table>
                </div>

                <div className="block lg:hidden space-y-4 p-2">
  {eleves.map((eleve) => (
    <Card key={eleve.id} className="bg-white dark:bg-gray-800 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-blue-700 dark:text-blue-400">
          {language === 'ar' ? `${eleve.prenom} ${eleve.nom}` : `${eleve.nom} ${eleve.prenom}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {evaluationsToDisplay.map(evalItem => {
          const gradeValue = gradeData[eleve.id]?.[evalItem.id] ?? '';
          const isInvalid = gradeValue && (gradeValue < 0 || gradeValue > 20);
          return (
            <div key={evalItem.id} className="flex items-center justify-between gap-4">
              <Label htmlFor={`grade-${eleve.id}-${evalItem.id}`} className="text-sm text-gray-600 dark:text-gray-300">
                {evalItem.type}
              </Label>
              <Input
                id={`grade-${eleve.id}-${evalItem.id}`}
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={gradeValue}
                onChange={(e) => handleGradeChange(eleve.id, evalItem.id, e.target.value)}
                className={`w-24 text-center px-3 py-2 rounded border ${
                  isInvalid 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-300 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400'
                } focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors`}
                aria-label={`${t.gradeManagement.gradeFor} ${eleve.prenom} ${eleve.nom} ${t.common.forLabel} ${evalItem.type}`}
                aria-invalid={isInvalid}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  ))}
</div>

              </>
            )}
            
            {isFormComplete && evaluationsToDisplay.length > 0 && (
              <div className="flex justify-end gap-4 mt-6">
                
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center shadow-sm border border-gray-200 dark:border-gray-700">
    <p className="text-gray-500 dark:text-gray-400">{t.gradeManagement.selectPrompt}</p>
  </div>

      )}
    </div>
  );
}

export default GradeManagement;