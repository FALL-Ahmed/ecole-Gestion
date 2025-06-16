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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, FileDown, Printer, Save,  Info, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';


// Define types for API data
interface AnneeAcademique {
  id: number;
  libelle: string;
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

interface TempNoteData {
  eleveId: number;
  evaluationId: number;
  noteValue: number | '';
}

const API_BASE_URL = 'http://localhost:3000/api';

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
    return coefficientClasses.map(cc => cc.matiere);
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

  const terms = ['Trimestre 1', 'Trimestre 2', 'Trimestre 3'];
  const trimestreMap = { 'Trimestre 1': 4, 'Trimestre 2': 5, 'Trimestre 3': 6 };
  const termEvaluationTypeMap = {
    'Trimestre 1': { devoir1: 'Devoir 1', devoir2: 'Devoir 2', composition: 'Composition 1' },
    'Trimestre 2': { devoir1: 'Devoir 3', devoir2: 'Devoir 4', composition: 'Composition 2' },
    'Trimestre 3': { devoir1: 'Devoir 5', devoir2: 'Devoir 6', composition: 'Composition 3' },
  };

  const getEvaluationsForDisplay = useCallback(() => {
    // Retiré les console.log pour le code final, mais ils sont utiles pour le débogage
    // console.log("--- Début getEvaluationsForDisplay ---");
    // console.log("selectedTerm:", selectedTerm);
    // console.log("allEvaluations:", allEvaluations);

    if (!selectedTerm || allEvaluations.length === 0) {
      // console.log("Conditions initiales non remplies. Retourne tableau vide.");
      return [];
    }

    const typeMapping = termEvaluationTypeMap[selectedTerm];
    // console.log("typeMapping pour selectedTerm:", typeMapping);

    if (!typeMapping) {
      // console.log("Aucun typeMapping trouvé pour selectedTerm.");
      return [];
    }

    const displayEvaluations = [];
    const devoir1Eval = allEvaluations.find(e => {
      const match = e.type === typeMapping.devoir1;
      // if (match) console.log("Trouvé Devoir 1:", e);
      return match;
    });
    const devoir2Eval = allEvaluations.find(e => {
      const match = e.type === typeMapping.devoir2;
      // if (match) console.log("Trouvé Devoir 2:", e);
      return match;
    });
    const compositionEval = allEvaluations.find(e => {
      const match = e.type === typeMapping.composition;
      // if (match) console.log("Trouvé Composition:", e);
      return match;
    });

    if (devoir1Eval) displayEvaluations.push(devoir1Eval);
    if (devoir2Eval) displayEvaluations.push(devoir2Eval);
    if (compositionEval) displayEvaluations.push(compositionEval);

    // console.log("Evaluations à afficher:", displayEvaluations);
    // console.log("--- Fin getEvaluationsForDisplay ---");
    return displayEvaluations;
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
      console.log('Chargement des classes pour l\'année scolaire:', anneeId);
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
      console.log('Aucune année scolaire sélectionnée');
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
    console.log('Changement de classe ou d\'année scolaire:', classIdNum, anneeAcademiqueIdNum);

    if (classIdNum && anneeAcademiqueIdNum) {
      console.log('Chargement des matières et des élèves pour la classe:', classIdNum, 'et l\'année scolaire:', anneeAcademiqueIdNum);
      Promise.all([
        fetchMatieresByClasse(classIdNum),
        fetchElevesByClasse(classIdNum, anneeAcademiqueIdNum)
      ]).then(([matieresData, elevesData]) => {
        console.log('Matieres chargées:', matieresData);
        console.log('Élèves chargés:', elevesData);
        setMatieres(matieresData);
        setEleves(elevesData);
        setSelectedMatiereId('');
        setSelectedTerm('');
        setAllEvaluations([]);
        setGradeData({});
      });
    } else {
      console.log('Aucune classe ou année scolaire sélectionnée');
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

    console.log('Chargement des évaluations et des notes pour la classe:', classIdNum, 'la matière:', matiereIdNum, 'le trimestre:', trimestreNum, 'et l\'année scolaire:', anneeAcademiqueIdNum);

    if (classIdNum && matiereIdNum && selectedTerm && anneeAcademiqueIdNum && trimestreNum) {
      const loadEvaluationsAndGrades = async () => {
        setIsLoading(true);
        try {
          console.log('Chargement des évaluations...');
          const evals = await fetchEvaluations(classIdNum, matiereIdNum, trimestreNum, anneeAcademiqueIdNum);
          console.log('Évaluations chargées:', evals);
          setAllEvaluations(evals);

          const initialGradeData = {};
          const evaluationsToLoadNotesFor = evals.filter(e =>
            Object.values(termEvaluationTypeMap[selectedTerm] || {}).includes(e.type)
          );

          if (evaluationsToLoadNotesFor.length > 0) {
            console.log('Chargement des notes pour les évaluations:', evaluationsToLoadNotesFor);
            const notePromises = eleves.flatMap(eleve =>
              evaluationsToLoadNotesFor.map(async evaluation => {
                const note = await fetchNote(evaluation.id, eleve.id);
                console.log(`Note chargée pour l'élève ${eleve.id} et l'évaluation ${evaluation.id}:`, note);
                return { eleveId: eleve.id, evaluationId: evaluation.id, noteValue: note ? note.note : '' };
              })
            );
            const fetchedNotes = await Promise.all(notePromises);
            console.log('Notes chargées:', fetchedNotes);
            fetchedNotes.forEach(item => {
              if (!initialGradeData[item.eleveId]) {
                initialGradeData[item.eleveId] = {};
              }
              initialGradeData[item.eleveId][item.evaluationId] = item.noteValue;
            });
          }
          console.log('Données des notes initialisées:', initialGradeData);
          setGradeData(initialGradeData);
        } catch (error) {
          console.error("Échec du chargement des évaluations ou des notes:", error);
          toast({
            title: "Erreur",
            description: "Impossible de charger les notes. Veuillez réessayer.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };
      loadEvaluationsAndGrades();
    } else {
      console.log('Aucune classe, matière, trimestre ou année scolaire sélectionnée');
      setAllEvaluations([]);
      setGradeData({});
    }
  }, [selectedClassId, selectedMatiereId, selectedTerm, selectedAnneeAcademiqueId, eleves]);




  const handleGradeChange = (eleveId: number, evaluationId: number, value: string) => {
    const numValue = parseFloat(value);
    if (value === '') {
      setGradeData(prevData => ({ ...prevData, [eleveId]: { ...prevData[eleveId], [evaluationId]: '' } }));
      return;
    }
    if (isNaN(numValue) || numValue < 0 || numValue > 20) {
      toast({ title: "Saisie invalide", description: "Veuillez entrer une note entre 0 et 20.", variant: "destructive" });
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
      toast({ title: "Notes sauvegardées", description: "Toutes les notes ont été enregistrées avec succès." });
    } catch (error) {
      toast({ title: "Erreur de sauvegarde", description: "Une erreur est survenue lors de la sauvegarde des notes.", variant: "destructive" });
    }
  };

  const generateReports = () => toast({ title: "Génération des bulletins", description: "Les bulletins sont en cours de génération." });
  const printGrades = () => toast({ title: "Impression", description: "Préparation de l'impression des notes..." });

  const isFormComplete = selectedAnneeAcademiqueId && selectedClassId && selectedTerm && selectedMatiereId;
  const currentAnneeAcademique = anneesAcademiques.find(a => a.id.toString() === selectedAnneeAcademiqueId)?.libelle;
  const currentClasse = classes.find(c => c.id.toString() === selectedClassId)?.nom;
  const currentMatiere = matieres.find(m => m.id.toString() === selectedMatiereId)?.nom;
  const evaluationsToDisplay = getEvaluationsForDisplay();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Gestion des Notes</h1>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Sélection</CardTitle>
          <CardDescription>Choisissez l'année scolaire, la classe, le trimestre et la matière</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label htmlFor="annee-select" className="text-sm font-medium">Année Scolaire</label>
              <Select onValueChange={setSelectedAnneeAcademiqueId} value={selectedAnneeAcademiqueId}>
                <SelectTrigger id="annee-select">
                  <SelectValue placeholder="Sélectionner une année" />
                </SelectTrigger>
                <SelectContent>
                  {anneesAcademiques.map((annee) => (
                    <SelectItem key={annee.id} value={annee.id.toString()}>{annee.libelle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="classe-select" className="text-sm font-medium">Classe</label>
              <Select onValueChange={setSelectedClassId} value={selectedClassId} disabled={!selectedAnneeAcademiqueId || classes.length === 0}>
                <SelectTrigger id="classe-select">
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>{cls.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="term-select" className="text-sm font-medium">Trimestre</label>
              <Select onValueChange={setSelectedTerm} value={selectedTerm} disabled={!selectedClassId}>
                <SelectTrigger id="term-select">
                  <SelectValue placeholder="Sélectionner un trimestre" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((term) => (
                    <SelectItem key={term} value={term}>{term}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="matiere-select" className="text-sm font-medium">Matière</label>
              <Select onValueChange={setSelectedMatiereId} value={selectedMatiereId} disabled={!selectedTerm || matieres.length === 0}>
                <SelectTrigger id="matiere-select">
                  <SelectValue placeholder="Sélectionner une matière" />
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
         <CardHeader className="group px-6 py-5 bg-white/50 backdrop-blur-sm border-b border-gray-200 hover:bg-gray-50/80 transition-colors duration-200">
  <div className="flex flex-col gap-3">
    {/* Ligne supérieure avec titre et badge */}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-indigo-600 group-hover:text-indigo-700 transition-colors" />
        <h3 className="text-xl font-semibold text-gray-900">
          Les notes de <span className="text-indigo-600 font-bold">{currentMatiere}</span>
          <span className="mx-1.5 text-gray-400">•</span>
          <span className="font-medium text-gray-700">{currentClasse}</span>
        </h3>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">{selectedTerm}</span>
        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
          {currentAnneeAcademique}
        </span>
      </div>
    </div>

    {/* Ligne inférieure avec description */}
    <div className="flex flex-wrap items-center justify-between gap-2">
      
      
      
    </div>
  </div>
</CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center text-gray-500 py-8">Chargement des évaluations et des notes...</div>
            ) : eleves.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Aucun élève trouvé pour cette classe ou cette année scolaire.</div>
            ) : (
              // This is the crucial part that ensures the correct message is shown
              // only after loading is complete and students are present.
              evaluationsToDisplay.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Aucune évaluation configurée pour cette matière et ce trimestre correspondant aux types attendus (Devoir, Composition).
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
  <TableHeader className="bg-gray-50">
    <TableRow>
      <TableHead className="min-w-[150px] px-4 py-3 font-semibold text-left sticky left-0 bg-gray-50 z-10">
        Élève
      </TableHead>
      {evaluationsToDisplay.map((evalItem) => (
        <TableHead 
          key={evalItem.id} 
          className="min-w-[100px] px-4 py-3 font-semibold text-center"
          title={evalItem.description || evalItem.type}
        >
          <div className="flex flex-col items-center">
            <span>{evalItem.type}</span>
            {evalItem.date && (
              <span className="text-xs font-normal text-gray-500">
                {new Date(evalItem.date).toLocaleDateString()}
              </span>
            )}
          </div>
        </TableHead>
      ))}
    </TableRow>
  </TableHeader>
  
  <TableBody className="divide-y divide-gray-200">
    {eleves.map((eleve) => (
      <TableRow key={eleve.id} className="hover:bg-gray-50">
        <TableCell className="font-medium px-4 py-3 sticky left-0 bg-white z-10 whitespace-nowrap">
          {eleve.nom} {eleve.prenom}
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
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-300 hover:border-gray-400 focus:border-blue-500'
                  } focus:ring-2 focus:ring-blue-200 transition-colors`}
                  aria-label={`Note de ${eleve.prenom} ${eleve.nom} pour ${evalItem.type}`}
                  aria-invalid={isInvalid}
                />
                {isInvalid && (
                  <span className="sr-only">Note invalide, doit être entre 0 et 20</span>
                )}
              </div>
            </TableCell>
          );
        })}
      </TableRow>
    ))}
  </TableBody>
</Table>
                </div>
              )
            )}
            
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg p-8 text-center shadow-sm">
          <p className="text-gray-500">Veuillez sélectionner une année scolaire, une classe, un trimestre et une matière pour voir les notes.</p>
        </div>
      )}
    </div>
  );
}