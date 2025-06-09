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
import { FileDown, Printer, Save } from 'lucide-react';
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

// Interface for Evaluation updated to match your database schema
interface Evaluation {
  id: number;
  matiere_id: number;
  classe_id: number;
  professeur_id: number;
  type: string;          // Matches your 'type' column (e.g., "Devoir 5")
  date_eval: string;
  trimestre: number;     // Matches your 'trimestre' column (e.g., 6 for Trimestre 3)
  annee_scolaire_id: number;
}

interface Eleve {
  id: number; // This is the utilisateurId from the Inscription and user table
  nom: string; // The student's name from the user table
  prenom: string; // Added to store the student's first name
  classeId: number; // The class the student is inscribed in
  inscriptionId: number; // The ID of the inscription record itself
}

interface Note {
  id?: number; // Optional, for existing notes
  eleveId: number;
  evaluationId: number;
  note: number;
}

// Interface for the temporary object during grade fetching
interface TempNoteData {
  eleveId: number;
  evaluationId: number;
  noteValue: number | '';
}

// --- API Functions ---
const API_BASE_URL = 'http://localhost:3000/api'; // Centralize your API base URL

const fetchAnneesAcademiques = async (): Promise<AnneeAcademique[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/annees-academiques`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching academic years:", error);
    toast({
      title: "Erreur de chargement",
      description: "Impossible de charger les années académiques.",
      variant: "destructive",
    });
    return [];
  }
};

const fetchClasses = async (anneeAcademiqueId: number): Promise<Classe[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/classes?annee_scolaire_id=${anneeAcademiqueId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching classes for year ${anneeAcademiqueId}:`, error);
    toast({
      title: "Erreur de chargement",
      description: `Impossible de charger les classes pour l'année sélectionnée.`,
      variant: "destructive",
    });
    return [];
  }
};

const fetchMatieresByClasse = async (classeId: number): Promise<Matiere[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/coefficientclasse?classeId=${classeId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const coefficientClasses: any[] = await response.json(); // Use any for flexibility
    return coefficientClasses.map(cc => cc.matiere);
  } catch (error) {
    console.error(`Error fetching subjects for class ${classeId}:`, error);
    toast({
      title: "Erreur de chargement",
      description: `Impossible de charger les matières pour la classe sélectionnée.`,
      variant: "destructive",
    });
    return [];
  }
};

const fetchElevesByClasse = async (classeId: number, anneeScolaireId: number): Promise<Eleve[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/inscriptions?classeId=${classeId}&anneeScolaireId=${anneeScolaireId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const inscriptions = await response.json();

    const elevesData: Eleve[] = inscriptions.map((inscription: any) => {
      // MODIFICATION HERE: Check for inscription.utilisateur AND inscription.utilisateur.id
      if (!inscription.utilisateur || typeof inscription.utilisateur.id === 'undefined' || inscription.utilisateur.id === null) {
        console.warn("Inscription missing valid utilisateur object or ID:", inscription);
        return null; // Return null for invalid entries
      }
      return {
        id: inscription.utilisateur.id, // <-- CORRECTED: Get ID from nested utilisateur object
        nom: inscription.utilisateur.nom || 'Nom Inconnu',
        prenom: inscription.utilisateur.prenom || '',
        classeId: inscription.classe.id, // Ensure classeId is pulled from the nested classe object
        inscriptionId: inscription.id,
      };
    }).filter(Boolean) as Eleve[]; // Filter out nulls

    return elevesData;
  } catch (error) {
    console.error(`Error fetching students for class ${classeId} in year ${anneeScolaireId}:`, error);
    toast({
      title: "Erreur de chargement",
      description: `Impossible de charger les élèves pour la classe sélectionnée.`,
      variant: "destructive",
    });
    return [];
  }
};

const fetchEvaluations = async (classeId: number, matiereId: number, trimestreNum: number, anneeAcademiqueId: number): Promise<Evaluation[]> => {
  try {
    // Note: 'trimestreNum' is already the numeric value here
    const response = await fetch(`${API_BASE_URL}/evaluations?classe_id=${classeId}&matiere_id=${matiereId}&trimestre=${trimestreNum}&annee_scolaire_id=${anneeAcademiqueId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching evaluations for class ${classeId}, subject ${matiereId}, trimestre ${trimestreNum}, year ${anneeAcademiqueId}:`, error);
    toast({
      title: "Erreur de chargement",
      description: `Impossible de charger les évaluations.`,
      variant: "destructive",
    });
    return [];
  }
};

const fetchNote = async (evaluationId: number, eleveId: number): Promise<Note | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/notes?evaluation_id=${evaluationId}&etudiant_id=${eleveId}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // Assuming the backend returns an array if found, take the first one.
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    } else if (data && typeof data === 'object') {
      return data; // If backend returns a single object directly
    }
    return null;
  } catch (error) {
    console.error(`Error fetching note for evaluation ${evaluationId}, student ${eleveId}:`, error);
    // Don't toast here to avoid spamming for every missing note
    return null;
  }
};

const saveNote = async (noteData: Note): Promise<Note> => {
  try {
    const method = noteData.id ? 'PUT' : 'POST';
    const url = noteData.id ? `${API_BASE_URL}/notes/${noteData.id}` : `${API_BASE_URL}/notes`;

    const payload = {
      evaluation_id: noteData.evaluationId,
      etudiant_id: noteData.eleveId,
      note: noteData.note
    };

    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }
    return await response.json();
  } catch (error: any) { // Type 'any' for error to access .message
    console.error("Error saving note:", noteData, error);
    toast({
      title: "Erreur de sauvegarde",
      description: `Impossible de sauvegarder la note pour l'élève ${noteData.eleveId}. ${error.message || 'Erreur inconnue.'}`,
      variant: "destructive",
    });
    throw error;
  }
};
// --- End of API Functions ---

export function GradeManagement() {
  const [anneesAcademiques, setAnneesAcademiques] = useState<AnneeAcademique[]>([]);
  const [selectedAnneeAcademiqueId, setSelectedAnneeAcademiqueId] = useState<string>('');

  const [classes, setClasses] = useState<Classe[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [selectedMatiereId, setSelectedMatiereId] = useState<string>('');

  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const terms = ['Trimestre 1', 'Trimestre 2', 'Trimestre 3']; // Frontend display names

  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [allEvaluations, setAllEvaluations] = useState<Evaluation[]>([]); // Store all fetched evaluations
  const [gradeData, setGradeData] = useState<{ [eleveId: number]: { [evaluationId: number]: number | '' } }>({});

  // Removed loading and isSaving states
  // const [loading, setLoading] = useState(false);
  // const [isSaving, setIsSaving] = useState(false);

  // Map frontend term display names to backend numeric trimestre values
  const trimestreMap: { [key: string]: number } = {
    'Trimestre 1': 4, // IMPORTANT: Adjust these numbers to match your DB 'trimestre' column
    'Trimestre 2': 5,
    'Trimestre 3': 6, // Your sample data shows 6 and 7 for trimestre. Confirm what '7' means.
                      // For now, I'll use 4, 5, 6 as a common sequence.
                      // IMPORTANT: You MUST verify these numbers against your actual database.
  };

  // Map specific evaluation types to their expected names/types from DB, per term
  // This helps identify which evaluations are the "Devoir 1", "Devoir 2", "Composition 1" for display
  const termEvaluationTypeMap: { [key: string]: { devoir1: string, devoir2: string, composition: string } } = {
    'Trimestre 1': { devoir1: 'Devoir 1', devoir2: 'Devoir 2', composition: 'Composition 1' },
    'Trimestre 2': { devoir1: 'Devoir 3', devoir2: 'Devoir 4', composition: 'Composition 2' },
    'Trimestre 3': { devoir1: 'Devoir 5', devoir2: 'Devoir 6', composition: 'Composition 3' },
  };

  // Helper to get evaluation objects for the current term and their mapped names for display
  const getEvaluationsForDisplay = useCallback(() => {
    if (!selectedTerm || allEvaluations.length === 0) {
      return [];
    }

    const typeMapping = termEvaluationTypeMap[selectedTerm];
    if (!typeMapping) return [];

    const displayEvaluations: Evaluation[] = [];

    // Filter allEvaluations by their 'type' property matching the current term's expected types
    const devoir1Eval = allEvaluations.find(e => e.type === typeMapping.devoir1);
    const devoir2Eval = allEvaluations.find(e => e.type === typeMapping.devoir2);
    const compositionEval = allEvaluations.find(e => e.type === typeMapping.composition);

    if (devoir1Eval) displayEvaluations.push(devoir1Eval);
    if (devoir2Eval) displayEvaluations.push(devoir2Eval);
    if (compositionEval) displayEvaluations.push(compositionEval);

    return displayEvaluations;
  }, [allEvaluations, selectedTerm]);

  // 1. Fetch academic years on component mount
  useEffect(() => {
    const getAnnees = async () => {
      // setLoading(true); // Removed
      const data = await fetchAnneesAcademiques();
      setAnneesAcademiques(data);
      // setLoading(false); // Removed
    };
    getAnnees();
  }, []);

  // 2. Fetch classes when academic year changes
  useEffect(() => {
    const anneeId = parseInt(selectedAnneeAcademiqueId);
    if (anneeId) {
      // setLoading(true); // Removed
      fetchClasses(anneeId)
        .then(data => {
          const filteredClasses = data.filter(
            (cls: Classe) => cls.annee_scolaire_id === anneeId
          );
          setClasses(filteredClasses);
          // Reset dependent selections and data
          setSelectedClassId('');
          setMatieres([]);
          setSelectedMatiereId('');
          setEleves([]);
          setAllEvaluations([]);
          setGradeData({});
        })
        .finally(() => { /* setLoading(false); */ }); // Removed
    } else {
      setClasses([]);
      setSelectedClassId('');
      setMatieres([]);
      setSelectedMatiereId('');
      setEleves([]);
      setAllEvaluations([]);
      setGradeData({});
    }
  }, [selectedAnneeAcademiqueId]);

  // 3. Fetch subjects (matières) and students when class AND academic year change
  useEffect(() => {
    const classIdNum = parseInt(selectedClassId);
    const anneeAcademiqueIdNum = parseInt(selectedAnneeAcademiqueId);

    if (classIdNum && anneeAcademiqueIdNum) {
      // setLoading(true); // Removed
      Promise.all([
        fetchMatieresByClasse(classIdNum),
        fetchElevesByClasse(classIdNum, anneeAcademiqueIdNum)
      ])
        .then(([matieresData, elevesData]) => {
          setMatieres(matieresData);
          setEleves(elevesData);
          // Reset dependent selections and data
          setSelectedMatiereId('');
          setAllEvaluations([]);
          setGradeData({});
        })
        .finally(() => { /* setLoading(false); */ }); // Removed
    } else {
      setMatieres([]);
      setSelectedMatiereId('');
      setEleves([]);
      setAllEvaluations([]);
      setGradeData({});
    }
  }, [selectedClassId, selectedAnneeAcademiqueId]);

  // 4. Fetch evaluations and grades when class, subject, term, and students are ready
  useEffect(() => {
    const fetchAllGrades = async () => {
      const classIdNum = parseInt(selectedClassId);
      const matiereIdNum = parseInt(selectedMatiereId);
      const anneeAcademiqueIdNum = parseInt(selectedAnneeAcademiqueId);
      const trimestreNum = trimestreMap[selectedTerm]; // Get the numeric trimestre

      if (classIdNum && matiereIdNum && selectedTerm && eleves.length > 0 && anneeAcademiqueIdNum && trimestreNum) {
        // setLoading(true); // Removed
        try {
          const evals = await fetchEvaluations(classIdNum, matiereIdNum, trimestreNum, anneeAcademiqueIdNum);
          setAllEvaluations(evals); // Store all fetched evaluations

          const initialGradeData: { [eleveId: number]: { [evaluationId: number]: number | '' } } = {};

          // Only fetch notes for evaluations that match the expected types for display
          const evaluationsToLoadNotesFor = getEvaluationsForDisplay(); // Use the filtered list

          const notePromises = eleves.flatMap(eleve =>
            evaluationsToLoadNotesFor.map(async evaluation => {
              const note = await fetchNote(evaluation.id, eleve.id);
              return { eleveId: eleve.id, evaluationId: evaluation.id, noteValue: note ? note.note : '' } as TempNoteData;
            })
          );

          const fetchedNotes: TempNoteData[] = await Promise.all(notePromises);

          fetchedNotes.forEach(item => {
            if (!initialGradeData[item.eleveId]) {
              initialGradeData[item.eleveId] = {};
            }
            initialGradeData[item.eleveId][item.evaluationId] = item.noteValue;
          });

          setGradeData(initialGradeData);
        } catch (error) {
          console.error("Failed to fetch evaluations or grades:", error);
          toast({
            title: "Erreur",
            description: "Impossible de charger les notes. Veuillez réessayer.",
            variant: "destructive",
          });
        } finally {
          // setLoading(false); // Removed
        }
      } else {
        setAllEvaluations([]);
        setGradeData({});
      }
    };
    fetchAllGrades();
  }, [selectedClassId, selectedMatiereId, selectedTerm, eleves, selectedAnneeAcademiqueId, trimestreMap, getEvaluationsForDisplay]); // Add dependencies

  const handleGradeChange = (eleveId: number, evaluationId: number, value: string) => {
    const numValue = parseFloat(value);

    if (value === '') {
      setGradeData(prevData => ({
        ...prevData,
        [eleveId]: {
          ...prevData[eleveId],
          [evaluationId]: '',
        },
      }));
      return;
    }

    if (isNaN(numValue) || numValue < 0 || numValue > 20) {
      toast({
        title: "Saisie invalide",
        description: "Veuillez entrer une note entre 0 et 20.",
        variant: "destructive",
      });
      return;
    }

    setGradeData(prevData => ({
      ...prevData,
      [eleveId]: {
        ...prevData[eleveId],
        [evaluationId]: numValue,
      },
    }));
  };

  const saveGrades = async () => {
    // setIsSaving(true); // Removed
    let successCount = 0;
    let errorOccurred = false;

    const gradesToSave: Note[] = [];
    // Iterate over the gradeData which holds the current state of grades
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

    // Use Promise.allSettled to process all saves and collect outcomes
    const results = await Promise.allSettled(
      gradesToSave.map(async (noteToSave) => {
        // Attempt to find existing note by evaluationId and eleveId to determine if it's an update
        const existingNote = await fetchNote(noteToSave.evaluationId, noteToSave.eleveId);
        if (existingNote && existingNote.id) {
          // If existing note with ID, update it
          return await saveNote({ ...noteToSave, id: existingNote.id });
        } else {
          // Otherwise, create a new note
          return await saveNote(noteToSave);
        }
      })
    );

    // Process results to count successes and failures
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        errorOccurred = true;
        // The individual saveNote function already toasts errors
      }
    });

    if (!errorOccurred) {
      toast({
        title: "Notes sauvegardées",
        description: `Toutes les notes ont été enregistrées avec succès.`,
      });
    } else if (successCount > 0) {
      toast({
        title: "Notes sauvegardées (avec erreurs)",
        description: `Certaines notes ont été enregistrées, mais des erreurs sont survenues pour d'autres.`,
        variant: "default",
      });
    } else {
      toast({
        title: "Échec de la sauvegarde",
        description: "Aucune note n'a pu être enregistrée. Veuillez vérifier votre connexion et réessayer.",
        variant: "destructive",
      });
    }
    // setIsSaving(false); // Removed
  };

  const generateReports = () => {
    toast({
      title: "Génération des bulletins",
      description: `Les bulletins sont en cours de génération pour la classe sélectionnée.`,
    });
    // Implement report generation logic (e.g., API call to backend service)
  };

  const printGrades = () => {
    toast({
      title: "Impression",
      description: "Préparation de l'impression des notes...",
    });
    // Implement print logic (e.g., window.print() or PDF generation)
  };

  const isFormComplete = selectedAnneeAcademiqueId && selectedClassId && selectedTerm && selectedMatiereId;

  const currentAnneeAcademique = anneesAcademiques.find(a => a.id.toString() === selectedAnneeAcademiqueId)?.libelle;
  const currentClasse = classes.find(c => c.id.toString() === selectedClassId)?.nom;
  const currentMatiere = matieres.find(m => m.id.toString() === selectedMatiereId)?.nom;

  // Get the evaluations to display in the table based on the selected term
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
            {/* Année Scolaire Select */}
            <div className="space-y-2">
              <label htmlFor="annee-select" className="text-sm font-medium">Année Scolaire</label>
              <Select onValueChange={setSelectedAnneeAcademiqueId} value={selectedAnneeAcademiqueId}>
                <SelectTrigger id="annee-select"> {/* 'disabled={loading}' removed */}
                  <SelectValue placeholder="Sélectionner une année" />
                </SelectTrigger>
                <SelectContent>
                  {anneesAcademiques.map((annee) => (
                    <SelectItem key={annee.id} value={annee.id.toString()}>
                      {annee.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Classe Select */}
            <div className="space-y-2">
              <label htmlFor="classe-select" className="text-sm font-medium">Classe</label>
              <Select onValueChange={setSelectedClassId} value={selectedClassId} disabled={!selectedAnneeAcademiqueId || classes.length === 0}> {/* '|| loading' removed */}
                <SelectTrigger id="classe-select">
                  <SelectValue placeholder={"Sélectionner une classe"} /> {/* Conditional placeholder removed */}
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Trimestre Select */}
            <div className="space-y-2">
              <label htmlFor="term-select" className="text-sm font-medium">Trimestre</label>
              <Select onValueChange={setSelectedTerm} value={selectedTerm} disabled={!selectedClassId}> {/* '|| loading' removed */}
                <SelectTrigger id="term-select">
                  <SelectValue placeholder="Sélectionner un trimestre" />
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

            {/* Matière Select */}
            <div className="space-y-2">
              <label htmlFor="matiere-select" className="text-sm font-medium">Matière</label>
              <Select onValueChange={setSelectedMatiereId} value={selectedMatiereId} disabled={!selectedTerm || matieres.length === 0}> {/* '|| loading' removed */}
                <SelectTrigger id="matiere-select">
                  <SelectValue placeholder={"Sélectionner une matière"} /> {/* Conditional placeholder removed */}
                </SelectTrigger>
                <SelectContent>
                  {matieres.map((matiere) => (
                    <SelectItem key={matiere.id} value={matiere.id.toString()}>
                      {matiere.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade Display Card */}
      {isFormComplete ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Notes de **{currentMatiere}** - **{currentClasse}** - **{selectedTerm}** ({currentAnneeAcademique})
            </CardTitle>
            <CardDescription>
              Saisissez les notes des élèves (sur 20). Les champs vides signifient qu'aucune note n'a encore été saisie.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 'loading' check for display removed */}
            {eleves.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Aucun élève trouvé pour cette classe ou cette année scolaire.
              </div>
            ) : evaluationsToDisplay.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Aucune évaluation configurée pour cette matière et ce trimestre correspondant aux types attendus (Devoir, Composition).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Élève</TableHead>
                      {/* Dynamically generate evaluation columns based on termEvaluationTypeMap */}
                      {evaluationsToDisplay.map((evalItem) => (
                        <TableHead key={evalItem.id} className="text-right min-w-[90px]">
                          {evalItem.type} {/* Display the actual evaluation type from DB */}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eleves.map((eleve) => (
                      <TableRow key={eleve.id}>
                        <TableCell className="font-medium">{eleve.nom} {eleve.prenom}</TableCell>
                        {evaluationsToDisplay.map(evalItem => (
                          <TableCell key={`${eleve.id}-${evalItem.id}`} className="text-right">
                            <Input
                              type="number"
                              min="0"
                              max="20"
                              step="0.5"
                              value={gradeData[eleve.id]?.[evalItem.id] ?? ''}
                              onChange={(e) => handleGradeChange(eleve.id, evalItem.id, e.target.value)}
                              className="w-20 text-right ml-auto"
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-4">
              <Button onClick={saveGrades} disabled={eleves.length === 0 || evaluationsToDisplay.length === 0}> {/* 'loading || isSaving' removed */}
                <Save className="mr-2 h-4 w-4" />
                {"Enregistrer les notes"} {/* Conditional text removed */}
              </Button>
              <Button variant="outline" onClick={generateReports} disabled={eleves.length === 0 || evaluationsToDisplay.length === 0}> {/* 'loading || isSaving' removed */}
                <FileDown className="mr-2 h-4 w-4" />
                Générer les bulletins
              </Button>
              <Button variant="outline" onClick={printGrades} disabled={eleves.length === 0 || evaluationsToDisplay.length === 0}> {/* 'loading || isSaving' removed */}
                <Printer className="mr-2 h-4 w-4" />
                Imprimer
              </Button>
            </div>
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