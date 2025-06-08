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
  libelle: string; // Changed from 'annee' to 'libelle' based on your schema
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

interface CoefficientClasse {
  id: number;
  classe_id: number;
  matiere_id: number;
  coefficient: number;
  matiere: Matiere;
}

// Updated Eleve interface to reflect the student's data as needed in the frontend
// This 'id' must correspond to 'Note.etudiantId' and 'Inscription.utilisateurId'
interface Eleve {
  id: number; // This is the utilisateurId from the Inscription and user table
  nom: string; // The student's name from the user table
  prenom: string; // Added to store the student's first name
  classeId: number; // The class the student is inscribed in
  inscriptionId: number; // The ID of the inscription record itself (useful for some backend operations)
}

interface Evaluation {
  id: number;
  nom: string;
  type: 'homework' | 'exam';
  matiereId: number;
  classeId: number;
  professeur_id: number; // Added based on your schema
  date_eval: string;     // Added based on your schema
  trimestre: string;     // Already there
  annee_scolaire_id: number; // Added based on your schema
}

interface Note {
  id?: number;
  eleveId: number;       // This should be the 'utilisateurId'
  evaluationId: number;
  note: number;
}

// Interface for the temporary object during grade fetching
interface TempNoteData {
  eleveId: number; // Corresponds to utilisateurId
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
    // Corrected: Use 'annee_scolaire_id' in the query parameter to match your backend's expected filter
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
    const coefficientClasses: CoefficientClasse[] = await response.json();
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

// IMPORTANT: This function now assumes your backend's /api/inscriptions
// endpoint returns the 'utilisateur' (student) object directly nested within the inscription.
const fetchElevesByClasse = async (classeId: number, anneeScolaireId: number): Promise<Eleve[]> => {
  try {
    // Filter by both classeId and anneeScolaireId for precise inscriptions
    const response = await fetch(`${API_BASE_URL}/inscriptions?classeId=${classeId}&anneeScolaireId=${anneeScolaireId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const inscriptions = await response.json();

    // Map inscriptions to your Eleve interface.
    // Assumes each inscription object contains a 'utilisateur' object with 'id' and 'nom'.
    const elevesData: Eleve[] = inscriptions.map((inscription: any) => ({
      id: inscription.utilisateurId, // This must be the user/student ID
      nom: inscription.utilisateur?.nom || 'Nom Inconnu', // Safely access name
      prenom: inscription.utilisateur?.prenom || '', // Safely access first name
      classeId: inscription.classeId,
      inscriptionId: inscription.id, // Keep inscription ID for potential future use
    }));
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


const fetchEvaluations = async (classeId: number, matiereId: number, term: string, anneeAcademiqueId: number): Promise<Evaluation[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/evaluations?classeId=${classeId}&matiereId=${matiereId}&trimestre=${term}&anneeScolaireId=${anneeAcademiqueId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching evaluations for class ${classeId}, subject ${matiereId}, term ${term}, year ${anneeAcademiqueId}:`, error);
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
    const response = await fetch(`${API_BASE_URL}/notes?evaluationId=${evaluationId}&etudiantId=${eleveId}`); // Ensure backend uses 'etudiantId'
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // Assuming the backend returns an array if found, take the first one.
    // Or if it returns a single object directly. Adjust as per your backend.
    if (Array.isArray(data) && data.length > 0) {
        return data[0];
    } else if (data && typeof data === 'object') {
        return data; // If backend returns a single object
    }
    return null;
  } catch (error) {
    console.error(`Error fetching note for evaluation ${evaluationId}, student ${eleveId}:`, error);
    return null;
  }
};

const saveNote = async (noteData: Note): Promise<Note> => {
  try {
    const method = noteData.id ? 'PUT' : 'POST';
    const url = noteData.id ? `${API_BASE_URL}/notes/${noteData.id}` : `${API_BASE_URL}/notes`;

    const payload = {
        evaluation_id: noteData.evaluationId, // Ensure names match backend column names
        etudiant_id: noteData.eleveId,         // Ensure names match backend column names
        note: noteData.note
    };

    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), // Send the specific payload
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error saving note:", noteData, error);
    toast({
      title: "Erreur de sauvegarde",
      description: `Impossible de sauvegarder la note pour l'élève ${noteData.eleveId}. ${error.message}`,
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
  const terms = ['Trimestre 1', 'Trimestre 2', 'Trimestre 3']; // Matches `trimestre` in Evaluation schema

  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [gradeData, setGradeData] = useState<{ [eleveId: number]: { [evaluationId: number]: number | '' } }>({});

  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Fetch academic years on component mount
  useEffect(() => {
    const getAnnees = async () => {
      setLoading(true);
      const data = await fetchAnneesAcademiques();
      setAnneesAcademiques(data);
      // Optional: Auto-select the most recent or first year
      // if (data.length > 0) {
      //   setSelectedAnneeAcademiqueId(data[0].id.toString());
      // }
      setLoading(false);
    };
    getAnnees();
  }, []);

  // 2. Fetch classes when academic year changes
  useEffect(() => {
    const anneeId = parseInt(selectedAnneeAcademiqueId);
    if (anneeId) {
      setLoading(true);
      fetchClasses(anneeId)
        .then(data => {
          // Filtre explicitement les classes ici pour s'assurer de la correspondance avec l'année sélectionnée
          const filteredClasses = data.filter(
            (cls: Classe) => cls.annee_scolaire_id === anneeId
          );
          setClasses(filteredClasses);
          setSelectedClassId('');
          setMatieres([]);
          setSelectedMatiereId('');
          setEleves([]);
          setEvaluations([]);
          setGradeData({});
        })
        .finally(() => setLoading(false));
    } else {
      setClasses([]);
      setSelectedClassId('');
      setMatieres([]);
      setSelectedMatiereId('');
      setEleves([]);
      setEvaluations([]);
      setGradeData({});
    }
  }, [selectedAnneeAcademiqueId]);

  // 3. Fetch subjects (matières) and students when class AND academic year change
  // We need anneeAcademiqueId here for fetchElevesByClasse
  useEffect(() => {
    const classIdNum = parseInt(selectedClassId);
    const anneeAcademiqueIdNum = parseInt(selectedAnneeAcademiqueId);

    if (classIdNum && anneeAcademiqueIdNum) {
      setLoading(true);
      Promise.all([
        fetchMatieresByClasse(classIdNum),
        fetchElevesByClasse(classIdNum, anneeAcademiqueIdNum) // Pass anneeScolaireId
      ])
        .then(([matieresData, elevesData]) => {
          setMatieres(matieresData);
          setEleves(elevesData);
          // Reset dependent selections and data
          setSelectedMatiereId('');
          setEvaluations([]);
          setGradeData({});
        })
        .finally(() => setLoading(false));
    } else {
      setMatieres([]);
      setSelectedMatiereId('');
      setEleves([]);
      setEvaluations([]);
      setGradeData({});
    }
  }, [selectedClassId, selectedAnneeAcademiqueId]); // Depend on selectedAnneeAcademiqueId too

  // 4. Fetch evaluations and grades when class, subject, term, and students are ready
  useEffect(() => {
    const fetchAllGrades = async () => {
      const classIdNum = parseInt(selectedClassId);
      const matiereIdNum = parseInt(selectedMatiereId);
      const anneeAcademiqueIdNum = parseInt(selectedAnneeAcademiqueId);

      if (classIdNum && matiereIdNum && selectedTerm && eleves.length > 0 && anneeAcademiqueIdNum) {
        setLoading(true);
        try {
          // Pass anneeAcademiqueIdNum to fetchEvaluations
          const evals = await fetchEvaluations(classIdNum, matiereIdNum, selectedTerm, anneeAcademiqueIdNum);
          setEvaluations(evals);

          const initialGradeData: { [eleveId: number]: { [evaluationId: number]: number | '' } } = {};
          
          const notePromises = eleves.flatMap(eleve =>
            evals.map(async evaluation => {
              // eleve.id here is the 'utilisateurId' which corresponds to 'etudiantId' in Note table
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
          setLoading(false);
        }
      } else {
        setEvaluations([]);
        setGradeData({});
      }
    };
    fetchAllGrades();
  }, [selectedClassId, selectedMatiereId, selectedTerm, eleves, selectedAnneeAcademiqueId]); // Add selectedAnneeAcademiqueId to dependencies

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
    setIsSaving(true);
    let successCount = 0;
    let errorOccurred = false;

    const gradesToSave: Note[] = [];
    for (const eleveIdStr in gradeData) {
      const eleveId = parseInt(eleveIdStr); // This is the utilisateurId
      for (const evaluationIdStr in gradeData[eleveIdStr]) {
        const evaluationId = parseInt(evaluationIdStr);
        const noteValue = gradeData[eleveIdStr][evaluationIdStr];

        if (typeof noteValue === 'number' && !isNaN(noteValue) && noteValue >= 0 && noteValue <= 20) {
          // If you need to include a 'Note.id' for PUT operations, you'd fetch it here
          // or ensure `fetchNote` populates it in `gradeData`
          gradesToSave.push({ eleveId, evaluationId, note: noteValue });
        }
      }
    }

    const savePromises = gradesToSave.map(async (noteToSave) => {
      try {
        await saveNote(noteToSave);
        successCount++;
      } catch (error) {
        errorOccurred = true;
        // Error already toasted by saveNote
      }
    });

    await Promise.all(savePromises);

    if (!errorOccurred) {
      toast({
        title: "Notes sauvegardées",
        description: `Toutes les notes ont été enregistrées avec succès.`,
      });
    } else if (successCount > 0) {
      toast({
        title: "Notes sauvegardées (avec erreurs)",
        description: `Certaines notes ont été enregistrées, mais des erreurs sont survenues pour d'autres.`,
        variant: "default", // Changed to default for less aggressive warning
      });
    } else {
      toast({
        title: "Échec de la sauvegarde",
        description: "Aucune note n'a pu être enregistrée. Veuillez vérifier votre connexion et réessayer.",
        variant: "destructive",
      });
    }
    setIsSaving(false);
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
                <SelectTrigger id="annee-select" disabled={loading}>
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
              <Select onValueChange={setSelectedClassId} value={selectedClassId} disabled={!selectedAnneeAcademiqueId || loading || classes.length === 0}>
                <SelectTrigger id="classe-select">
                  <SelectValue placeholder={loading && selectedAnneeAcademiqueId ? "Chargement..." : "Sélectionner une classe"} />
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
              <Select onValueChange={setSelectedTerm} value={selectedTerm} disabled={!selectedClassId || loading}>
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
              <Select onValueChange={setSelectedMatiereId} value={selectedMatiereId} disabled={!selectedTerm || loading || matieres.length === 0}>
                <SelectTrigger id="matiere-select">
                  <SelectValue placeholder={loading && selectedClassId ? "Chargement..." : "Sélectionner une matière"} />
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
            {loading ? (
              <div className="text-center text-gray-500 py-8">Chargement des notes...</div>
            ) : eleves.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Aucun élève trouvé pour cette classe ou cette année scolaire.</div>
            ) : evaluations.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Aucune évaluation configurée pour cette matière et ce trimestre.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Élève</TableHead>
                      
                      <TableHead className="text-right min-w-[90px]">Note</TableHead>
                      

                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eleves.map((eleve) => (
                      <TableRow key={eleve.id}>
                        <TableCell className="font-medium">{eleve.nom} {eleve.prenom}</TableCell>
                       
                        {evaluations.map(evalItem => (
                          <TableCell className="text-right">
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
              <Button onClick={saveGrades} disabled={loading || isSaving || eleves.length === 0 || evaluations.length === 0}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Sauvegarde en cours..." : "Enregistrer les notes"}
              </Button>
              <Button variant="outline" onClick={generateReports} disabled={loading || isSaving || eleves.length === 0 || evaluations.length === 0}>
                <FileDown className="mr-2 h-4 w-4" />
                Générer les bulletins
              </Button>
              <Button variant="outline" onClick={printGrades} disabled={loading || isSaving || eleves.length === 0 || evaluations.length === 0}>
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