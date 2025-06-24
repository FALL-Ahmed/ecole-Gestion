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
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileDown, Printer, Search, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// --- Définitions de types pour les données de l'API ---
interface AnneeAcademique {
  id: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
}

interface Classe {
  id: number;
  nom: string;
  annee_scolaire_id: number;
}

interface Eleve {
  id: number;
  nom: string;
  prenom: string;
  classeId: number;
  inscriptionId: number;
}

interface Matiere {
  id: number;
  nom: string;
}

interface CoefficientClasse {
  id: number;
  matiere_id: number;
  classe_id: number;
  coefficient: number;
}

interface Trimestre {
  id: number;
  annee_scolaire_id: number;
  nom: string;
  date_debut: string;
  date_fin: string;
}

interface Evaluation {
  id: number;
  matiere_id: number;
  classe_id: number;
  professeur_id: number;
  type: 'Devoir' | 'Composition';
  date_eval: string;
  trimestre: number; // Numéro du trimestre (clé étrangère vers la table trimestre)
  libelle: string; // Ce champ sera généré côté frontend
  annee_scolaire_id: number;
}

interface Note {
  id: number;
  evaluation_id: number;
  etudiant_id: number;
  note: number;
}

interface EvaluationDetailBulletin {
  id: number;
  type: 'Devoir' | 'Composition';
  libelle: string;
  note: number | '00';
}

interface MatiereDetailBulletin {
  matiere: string;
  coefficient: number;
  notesEvaluations: EvaluationDetailBulletin[];
  moyenneMatiere: number;
  appreciation: string;
}

interface BulletinEleve {
  id: number;
  name: string;
  avg: string;
  rank: string;
  teacherComment: string;
  principalComment: string;
  notesParMatiere: MatiereDetailBulletin[];
}

const API_BASE_URL = 'http://localhost:3000/api';

// --- Fonctions de récupération des données via API ---

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
    const response = await fetch(`${API_BASE_URL}/classes`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const allClasses = await response.json();
    return allClasses.filter((cls: Classe) => cls.annee_scolaire_id === anneeAcademiqueId);
  } catch (error) {
    console.error(`Error fetching classes for year ${anneeAcademiqueId}:`, error);
    toast({ title: "Erreur de chargement", description: "Impossible de charger les classes pour l'année sélectionnée.", variant: "destructive" });
    return [];
  }
};

const fetchElevesByClasse = async (classeId: number, anneeScolaireId: number): Promise<Eleve[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/inscriptions?classeId=${classeId}&anneeScolaireId=${anneeScolaireId}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const inscriptions = await response.json();
    return inscriptions
      .filter((inscription: any) => inscription.utilisateur?.role === 'eleve')
      .map((inscription: any) => ({
        id: inscription.utilisateur.id,
        nom: inscription.utilisateur.nom || 'Nom Inconnu',
        prenom: inscription.utilisateur.prenom || '',
        classeId: inscription.classe.id,
        inscriptionId: inscription.id,
      }));
  } catch (error) {
    console.error(`Error fetching students for class ${classeId} in year ${anneeScolaireId}:`, error);
    toast({ title: "Erreur de chargement", description: "Impossible de charger les élèves pour la classe sélectionnée.", variant: "destructive" });
    return [];
  }
};

const fetchMatieresAndCoefficientsByClasse = async (classeId: number): Promise<{ matieres: Matiere[], coefficients: CoefficientClasse[] }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/coefficientclasse?classeId=${classeId}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const coefficientClasses = await response.json();
    const matieres = coefficientClasses.map((cc: any) => cc.matiere).filter(Boolean);
    const coefficients = coefficientClasses.map((cc: any) => ({
      id: cc.id,
      matiere_id: cc.matiere_id,
      classe_id: cc.classe_id,
      coefficient: cc.coefficient,
    }));
    return { matieres, coefficients };
  } catch (error) {
    console.error(`Error fetching subjects and coefficients for class ${classeId}:`, error);
    toast({ title: "Erreur de chargement", description: "Impossible de charger les matières et coefficients pour la classe sélectionnée.", variant: "destructive" });
    return { matieres: [], coefficients: [] };
  }
};

const fetchTrimestresByAnneeAcademique = async (anneeAcademiqueId: number): Promise<Trimestre[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/trimestres?anneeScolaireId=${anneeAcademiqueId}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching trimestres for year ${anneeAcademiqueId}:`, error);
    toast({ title: "Erreur de chargement", description: "Impossible de charger les trimestres pour l'année sélectionnée.", variant: "destructive" });
    return [];
  }
};

const fetchEvaluationsForClassAndTerm = async (
  classeId: number,
  trimestreId: number,
  anneeScolaireId: number
): Promise<Evaluation[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/evaluations?classeId=${classeId}&trimestre=${trimestreId}&anneeScolaireId=${anneeScolaireId}`);
    if (!response.ok) {
        if (response.status === 404 || response.status === 204) return [];
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // --- Transformation clé ici pour ajouter le champ 'libelle' ---
    const transformedEvaluations = data.map((evalItem: any) => ({
      id: evalItem.id,
      matiere_id: evalItem.matiere_id,
      classe_id: evalItem.classe_id,
      professeur_id: evalItem.professeur_id,
      // Normaliser 'type' pour correspondre à l'interface ('Devoir' ou 'Composition')
      type: evalItem.type.toLowerCase().includes('devoir') ? 'Devoir' : 'Composition',
      date_eval: evalItem.date_eval,
      trimestre: evalItem.trimestre,
      annee_scolaire_id: evalItem.annee_scolaire_id,
      // Utiliser la valeur de 'type' de l'API pour le 'libelle'
      libelle: evalItem.type // e.g., "Devoir 5", "Composition 3"
    }));
    
    return transformedEvaluations;
  } catch (error) {
    console.error(`Error fetching evaluations for class ${classeId}, trimestre ID ${trimestreId}, year ${anneeScolaireId}:`, error);
    toast({ title: "Erreur de chargement", description: "Impossible de charger les évaluations pour le trimestre.", variant: "destructive" });
    return [];
  }
};

const fetchNotesForEvaluations = async (evaluationIds: number[]): Promise<Note[]> => {
    if (evaluationIds.length === 0) return [];
    try {
        const response = await fetch(`${API_BASE_URL}/notes?evaluationIds=${evaluationIds.join(',')}`);
        if (!response.ok) {
            if (response.status === 404 || response.status === 204) return [];
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching notes for evaluations ${evaluationIds}:`, error);
        toast({ title: "Erreur de chargement", description: "Impossible de charger les notes.", variant: "destructive" });
        return [];
    }
};

export function ReportManagement() {
  const [anneesAcademiques, setAnneesAcademiques] = useState<AnneeAcademique[]>([]);
  const [selectedAnneeAcademiqueId, setSelectedAnneeAcademiqueId] = useState<string>('');
  const [classes, setClasses] = useState<Classe[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [trimestres, setTrimestres] = useState<Trimestre[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [coefficients, setCoefficients] = useState<CoefficientClasse[]>([]);
  const [allEvaluations, setAllEvaluations] = useState<Evaluation[]>([]);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [bulletins, setBulletins] = useState<BulletinEleve[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<BulletinEleve | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dynamicEvaluationHeaders, setDynamicEvaluationHeaders] = useState<string[]>([]);


  // 1. Charger les années académiques au montage
  useEffect(() => {
    const getAnnees = async () => {
      const data = await fetchAnneesAcademiques();
      setAnneesAcademiques(data);
    };
    getAnnees();
  }, []);

  // 2. Charger les classes et les trimestres lorsque l'année académique change
  useEffect(() => {
    const anneeId = parseInt(selectedAnneeAcademiqueId);
    if (anneeId) {
      setIsLoading(true);
      // Charger les trimestres en premier, car ils sont liés directement à l'année
      fetchTrimestresByAnneeAcademique(anneeId).then((trimestresData) => {
        setTrimestres(trimestresData);
        // Réinitialiser le trimestre sélectionné si les nouveaux trimestres ne contiennent pas l'ancien ID
        if (!trimestresData.some(t => t.id.toString() === selectedTermId)) {
            setSelectedTermId('');
        }
      }).catch(error => {
          console.error("Failed to load trimestres:", error);
          setTrimestres([]);
          setSelectedTermId('');
      });

      // Charger les classes
      fetchClasses(anneeId).then((classesData) => {
        setClasses(classesData);
        setSelectedClassId(''); // Toujours réinitialiser la classe quand l'année change
      }).catch(error => {
          console.error("Failed to load classes:", error);
          setClasses([]);
          setSelectedClassId('');
      }).finally(() => setIsLoading(false)); // Finaliser le chargement après les deux fetches
    } else {
      // Réinitialiser tous les états si aucune année n'est sélectionnée
      setClasses([]);
      setTrimestres([]); // Vider les trimestres si pas d'année sélectionnée
      setSelectedClassId('');
      setSelectedTermId('');
      setEleves([]);
      setMatieres([]);
      setCoefficients([]);
      setAllEvaluations([]);
      setAllNotes([]);
      setBulletins([]);
      setDynamicEvaluationHeaders([]);
    }
  }, [selectedAnneeAcademiqueId]); // Dépend uniquement de l'année scolaire

  // 3. Charger les élèves, les matières et les coefficients lorsque la classe ou l'année académique change
  useEffect(() => {
    const classIdNum = parseInt(selectedClassId);
    const anneeAcademiqueIdNum = parseInt(selectedAnneeAcademiqueId);

    if (classIdNum && anneeAcademiqueIdNum) {
      setIsLoading(true);
      Promise.all([
        fetchElevesByClasse(classIdNum, anneeAcademiqueIdNum),
        fetchMatieresAndCoefficientsByClasse(classIdNum)
      ]).then(([elevesData, matieresCoeffData]) => {
        setEleves(elevesData);
        setMatieres(matieresCoeffData.matieres);
        setCoefficients(matieresCoeffData.coefficients);
      }).finally(() => setIsLoading(false));
    } else {
      setEleves([]);
      setMatieres([]);
      setCoefficients([]);
    }
  }, [selectedClassId, selectedAnneeAcademiqueId]);

  // 4. Charger les évaluations et les notes lorsque la classe, le trimestre ou l'année changent
  useEffect(() => {
    const classIdNum = parseInt(selectedClassId);
    const anneeAcademiqueIdNum = parseInt(selectedAnneeAcademiqueId);
    const trimestreIdNum = parseInt(selectedTermId);

    if (classIdNum && anneeAcademiqueIdNum && trimestreIdNum) {
      setIsLoading(true);
      fetchEvaluationsForClassAndTerm(classIdNum, trimestreIdNum, anneeAcademiqueIdNum)
        .then(async (evaluationsData) => {
          setAllEvaluations(evaluationsData);

          // Génération des headers dynamiques en utilisant le champ 'libelle'
          const devoirLabels = Array.from(new Set(
            evaluationsData.filter(e => e.type === 'Devoir').map(e => e.libelle)
          )).sort((a, b) => {
            const numA = parseInt(a.replace(/Devoir\s*/i, '')) || 0;
            const numB = parseInt(b.replace(/Devoir\s*/i, '')) || 0;
            return numA - numB;
          });

          const compositionLabels = Array.from(new Set(
            evaluationsData.filter(e => e.type === 'Composition').map(e => e.libelle)
          )).sort((a, b) => {
            const numA = parseInt(a.replace(/Composition\s*/i, '')) || 0;
            const numB = parseInt(b.replace(/Composition\s*/i, '')) || 0;
            return numA - numB;
          });

          const headers = [...devoirLabels, ...compositionLabels];
          setDynamicEvaluationHeaders(headers);

          const evaluationIds = evaluationsData.map(e => e.id);
          const notesData = await fetchNotesForEvaluations(evaluationIds);
          setAllNotes(notesData);
        })
        .catch(error => {
            console.error("Failed to load evaluations or notes:", error);
            toast({ title: "Erreur", description: "Impossible de charger les évaluations ou les notes.", variant: "destructive" });
        })
        .finally(() => setIsLoading(false));
    } else {
      setAllEvaluations([]);
      setAllNotes([]);
      setDynamicEvaluationHeaders([]);
    }
  }, [selectedClassId, selectedTermId, selectedAnneeAcademiqueId]);


  // 5. Générer les bulletins à chaque fois que les données sous-jacentes changent
  useEffect(() => {
    const canGenerateBulletins = eleves.length > 0 && matieres.length > 0 && coefficients.length > 0 &&
                                 selectedClassId && selectedTermId && selectedAnneeAcademiqueId;

    if (canGenerateBulletins) {
      const generatedBulletins: BulletinEleve[] = eleves.map(eleve => {
        const bulletinMatiereDetails: MatiereDetailBulletin[] = matieres.map(matiere => {
          const coefficient = coefficients.find(c => c.matiere_id === matiere.id)?.coefficient || 1;

          // Filtrer les évaluations par matière en utilisant le matiere_id
          const evaluationsForMatiere = allEvaluations.filter(e => e.matiere_id === matiere.id);
          
          const eleveNotesForMatiere = allNotes.filter(note =>
            note.etudiant_id === eleve.id && evaluationsForMatiere.some(evalItem => evalItem.id === note.evaluation_id)
          );
          console.log(`Notes for ${eleve.nom} ${eleve.prenom} in ${matiere.nom}:`, eleveNotesForMatiere);
          const notesEvaluations: EvaluationDetailBulletin[] = [];
          let totalPointsDevoirs = 0;
          let countDevoirs = 0;
          let compositionNoteValue: number | null = null;

          dynamicEvaluationHeaders.forEach(headerLibelle => {
            const evalItemForHeader = evaluationsForMatiere.find(e => e.libelle === headerLibelle);
            const note = eleveNotesForMatiere.find(n => n.evaluation_id === evalItemForHeader?.id);
            const noteValue = note ? note.note : 0; // Utilise 0 si la note n'est pas trouvée

            notesEvaluations.push({
              id: evalItemForHeader?.id || 0,
              type: evalItemForHeader?.type || (headerLibelle.toLowerCase().includes('compo') ? 'Composition' : 'Devoir'), // Fallback type
              libelle: headerLibelle,
              note: note ? note.note : '00', // Affiche '00' si pas de note, sinon la note
            });

            if (evalItemForHeader?.type === 'Devoir') {
              totalPointsDevoirs += noteValue;
              countDevoirs++;
            } else if (evalItemForHeader?.type === 'Composition') {
              compositionNoteValue = noteValue;
            }
          });

          // S'assurer que les notes sont triées selon l'ordre des headers dynamiques
          notesEvaluations.sort((a, b) => {
              const indexA = dynamicEvaluationHeaders.indexOf(a.libelle);
              const indexB = dynamicEvaluationHeaders.indexOf(b.libelle);
              return indexA - indexB;
          });

          let moyenneMatiere = 0;
          const avgDevoirs = countDevoirs > 0 ? totalPointsDevoirs / countDevoirs : 0;

          const WEIGHT_DEVOIRS = 0.4;
          const WEIGHT_COMPOSITION = 0.6;

          if (countDevoirs > 0 && compositionNoteValue !== null) {
              moyenneMatiere = (avgDevoirs * WEIGHT_DEVOIRS) + (compositionNoteValue * WEIGHT_COMPOSITION);
          } else if (countDevoirs > 0) {
              moyenneMatiere = avgDevoirs;
          } else if (compositionNoteValue !== null) {
              moyenneMatiere = compositionNoteValue;
          } else {
              moyenneMatiere = 0;
          }

          const appreciation = ""; // Logique d'appréciation à implémenter si besoin

          return {
            matiere: matiere.nom,
            coefficient: coefficient,
            notesEvaluations: notesEvaluations,
            moyenneMatiere: parseFloat(moyenneMatiere.toFixed(2)),
            appreciation: appreciation,
          };
        });

        let totalPointsGeneraux = 0;
        let totalCoefficients = 0;

        bulletinMatiereDetails.forEach(item => {
            totalPointsGeneraux += item.moyenneMatiere * item.coefficient;
            totalCoefficients += item.coefficient;
        });

        const overallAvg = totalCoefficients > 0 ? totalPointsGeneraux / totalCoefficients : 0;

        return {
          id: eleve.id,
          name: `${eleve.prenom} ${eleve.nom}`,
          avg: parseFloat(overallAvg.toFixed(2)).toString(),
          rank: '', // Le classement sera calculé après le map
          teacherComment: "Ce commentaire est une appréciation générale du professeur principal. Il doit être récupéré de l'API.",
          principalComment: "Ce commentaire est une appréciation du directeur. Il doit être récupéré de l'API.",
          notesParMatiere: bulletinMatiereDetails,
        };
      });

      // Calcul du classement après que toutes les moyennes générales soient disponibles
      generatedBulletins.sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg));
      generatedBulletins.forEach((bulletin, index) => {
        bulletin.rank = `${index + 1}/${generatedBulletins.length}`;
      });

      setBulletins(generatedBulletins);
    } else {
      setBulletins([]);
    }
  }, [eleves, matieres, coefficients, allEvaluations, allNotes, selectedClassId, selectedTermId, selectedAnneeAcademiqueId, dynamicEvaluationHeaders]);


  const handlePreviewReport = (bulletin: BulletinEleve) => {
    setSelectedReport(bulletin);
    setPreviewOpen(true);
  };

  const generateAllReports = () => {
    if (!isFormComplete || bulletins.length === 0) {
      toast({ title: "Action impossible", description: "Veuillez sélectionner l'année, la classe et le trimestre, et assurer que des bulletins sont disponibles.", variant: "destructive" });
      return;
    }
    toast({
      title: "Génération des bulletins",
      description: `Les bulletins de ${classes.find(c => c.id === parseInt(selectedClassId))?.nom} pour le ${trimestres.find(t => t.id === parseInt(selectedTermId))?.nom} sont en cours de génération en PDF.`,
    });
    // Logique de génération de PDF pour tous les bulletins ici
  };

  const exportReport = () => {
    if (!selectedReport) return;
    toast({
      title: "Export en PDF",
      description: `Le bulletin de ${selectedReport?.name} est en cours d'exportation en PDF.`,
    });
    setPreviewOpen(false);
    // Logique d'exportation PDF pour un bulletin spécifique ici
  };

  const printReport = () => {
    if (!selectedReport) return;
    toast({
      title: "Impression",
      description: `Le bulletin de ${selectedReport?.name} est envoyé à l'imprimante.`,
    });
    window.print(); // Ouvre la boîte de dialogue d'impression du navigateur
    setPreviewOpen(false);
  };

  const filteredBulletins = bulletins.filter(bulletin =>
    bulletin.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isFormComplete = selectedAnneeAcademiqueId && selectedClassId && selectedTermId;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-6 border-b pb-4">Gestion des Bulletins Scolaires</h1>

      <Card className="mb-8 shadow-lg">
        <CardHeader className="bg-blue-600 text-white rounded-t-lg p-4">
          <CardTitle className="text-2xl font-bold">Sélection des Critères</CardTitle>
          <CardDescription className="text-blue-100">Choisissez l'année scolaire, la classe et le trimestre pour générer les bulletins.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label htmlFor="annee-select" className="text-sm font-medium text-gray-700">Année Scolaire</label>
              <Select onValueChange={setSelectedAnneeAcademiqueId} value={selectedAnneeAcademiqueId}>
                <SelectTrigger id="annee-select" className="border-gray-300 focus:border-blue-500">
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
              <label className="text-sm font-medium text-gray-700">Classe</label>
              <Select
                onValueChange={setSelectedClassId}
                value={selectedClassId}
                disabled={!selectedAnneeAcademiqueId || classes.length === 0}
              >
                <SelectTrigger className="border-gray-300 focus:border-blue-500">
                  <SelectValue placeholder="Sélectionner une classe" />
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Trimestre</label>
              <Select
                onValueChange={setSelectedTermId}
                value={selectedTermId}
                // Les trimestres dépendent uniquement de l'année scolaire, pas de la classe
                disabled={!selectedAnneeAcademiqueId || trimestres.length === 0}
              >
                <SelectTrigger className="border-gray-300 focus:border-blue-500">
                  <SelectValue placeholder="Sélectionner un trimestre" />
                </SelectTrigger>
                <SelectContent>
                  {/* Assurez-vous que `trimestres` est bien vidé quand l'année change */}
                  {trimestres.map((trimestre) => (
                    <SelectItem key={trimestre.id} value={trimestre.id.toString()}>
                      {trimestre.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isFormComplete ? (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <Button
              onClick={generateAllReports}
              disabled={isLoading || bulletins.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white shadow-md px-6 py-3 text-base"
            >
              <FileDown className="mr-3 h-5 w-5" />
              Générer tous les bulletins (PDF)
            </Button>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Rechercher un élève..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <Card className="shadow-lg">
            <CardContent className="p-0">
              {isLoading && (selectedClassId && selectedTermId) ? (
                <div className="text-center text-gray-500 py-12 text-lg">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  Chargement des élèves, matières, évaluations et notes...
                </div>
              ) : filteredBulletins.length === 0 && searchQuery === '' && (selectedClassId && selectedTermId) ? (
                <div className="text-center text-gray-500 py-12 text-lg">
                  <p>Aucun élève trouvé ou aucune évaluation saisie pour la sélection actuelle.</p>
                  <p className="mt-2 text-sm">Vérifiez les données d'inscriptions ou que des évaluations/notes ont été saisies pour cette classe et ce trimestre.</p>
                </div>
              ) : filteredBulletins.length === 0 && searchQuery !== '' ? (
                <div className="text-center text-gray-500 py-12 text-lg">
                  <p>Aucun élève correspondant à votre recherche.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg">
                  <Table className="min-w-full divide-y divide-gray-200">
                    <TableHeader className="bg-gray-100">
                      <TableRow>
                        <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Élève</TableHead>
                        <TableHead className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Moyenne</TableHead>
                        <TableHead className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Classement</TableHead>
                        <TableHead className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">État</TableHead>
                        <TableHead className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-white divide-y divide-gray-200">
                      {filteredBulletins.map((bulletin) => (
                        <TableRow key={bulletin.id} className="hover:bg-gray-50 transition-colors duration-150">
                          <TableCell className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                            {bulletin.name}
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap text-center text-gray-700 font-semibold text-base">
                            {bulletin.avg}/20
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap text-center text-gray-700">
                            {bulletin.rank}
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap text-center">
                            <Badge className="bg-green-500 text-white text-xs font-medium px-2.5 py-0.5 rounded-full">Généré</Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePreviewReport(bulletin)}
                                className="text-blue-600 hover:bg-blue-50"
                              >
                                <Eye className="h-4 w-4 mr-1" /> Prévisualiser
                              </Button>
                              <Button variant="outline" size="sm" onClick={exportReport} className="text-purple-600 hover:bg-purple-50">
                                <FileDown className="h-4 w-4 mr-1" /> PDF
                              </Button>
                              <Button variant="outline" size="sm" onClick={printReport} className="text-red-600 hover:bg-red-50">
                                <Printer className="h-4 w-4 mr-1" /> Imprimer
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-10 text-center shadow-lg border border-gray-200">
          <p className="text-gray-600 text-lg font-medium">Veuillez sélectionner une **année scolaire**, une **classe** et un **trimestre** pour consulter les bulletins.</p>
          <p className="text-gray-400 text-sm mt-2">Utilisez les menus déroulants ci-dessus pour commencer.</p>
        </div>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl overflow-y-auto max-h-[95vh] p-8">
          <DialogHeader className="pb-6 border-b border-gray-200">
            <DialogTitle className="text-3xl font-extrabold text-center text-blue-700">Bulletin Scolaire</DialogTitle>
            <DialogDescription className="text-center text-lg mt-2 text-gray-700">
              <span className="font-semibold">{classes.find(c => c.id === parseInt(selectedClassId))?.nom}</span> - {trimestres.find(t => t.id === parseInt(selectedTermId))?.nom} - <span className="font-semibold">{anneesAcademiques.find(a => a.id === parseInt(selectedAnneeAcademiqueId))?.libelle}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="py-6 space-y-8">
              <div className="bg-white border-2 border-blue-200 p-8 rounded-xl shadow-lg">
                <div className="text-center mb-10">
                  <h2 className="text-4xl font-extrabold text-blue-800 mb-2">Sources des Sciences</h2>
                  <p className="text-2xl font-semibold text-gray-800">BULLETIN DE NOTES</p>
                  <p className="text-xl text-gray-600 mt-1">Année Académique: <span className="font-bold text-blue-700">{anneesAcademiques.find(a => a.id === parseInt(selectedAnneeAcademiqueId))?.libelle}</span></p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg mb-8 border-b pb-6 border-gray-200">
                  <p><span className="font-semibold text-gray-700">Élève:</span> <span className="text-blue-600 font-bold">{selectedReport.name}</span></p>
                  <p><span className="font-semibold text-gray-700">Classe:</span> <span className="text-blue-600 font-bold">{classes.find(c => c.id === parseInt(selectedClassId))?.nom}</span></p>
                  <p><span className="font-semibold text-gray-700">Trimestre:</span> <span className="text-blue-600 font-bold">{trimestres.find(t => t.id === parseInt(selectedTermId))?.nom}</span></p>
                  <p><span className="font-semibold text-gray-700">Date d'édition:</span> <span className="text-gray-600">{new Date().toLocaleDateString('fr-FR')}</span></p>
                </div>

                <div className="overflow-x-auto border border-gray-300 rounded-lg shadow-sm">
                  <Table className="w-full">
                    <TableHeader className="bg-blue-100">
                      <TableRow>
                        <TableHead className="px-4 py-2 text-left text-sm font-semibold text-gray-700 min-w-[150px]">Matière</TableHead>
                        <TableHead className="px-4 py-2 text-center text-sm font-semibold text-gray-700 min-w-[70px]">Coeff</TableHead>
                        {/* Headers dynamiques pour les évaluations (Devoirs, Compositions) */}
                        {dynamicEvaluationHeaders.map((header) => (
                          <TableHead key={header} className="px-4 py-2 text-center text-sm font-semibold text-gray-700 min-w-[100px]">
                            {header}
                          </TableHead>
                        ))}
                        <TableHead className="px-4 py-2 text-center text-sm font-semibold text-gray-700 min-w-[90px]">Moyenne</TableHead>
                        <TableHead className="px-4 py-2 text-left text-sm font-semibold text-gray-700 min-w-[150px]">Appréciation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-white divide-y divide-gray-100">
                      {selectedReport.notesParMatiere.map((matiereDetail, index) => (
                        <TableRow key={index}>
                          <TableCell className="px-4 py-3 font-medium text-gray-800">{matiereDetail.matiere}</TableCell>
                          <TableCell className="px-4 py-3 text-center">{matiereDetail.coefficient}</TableCell>
                          {/* Affichage des notes pour chaque évaluation */}
                          {dynamicEvaluationHeaders.map((headerLibelle) => {
                            const noteDetail = matiereDetail.notesEvaluations.find(n => n.libelle === headerLibelle);
                            return (
                              <TableCell key={`${matiereDetail.matiere}-${headerLibelle}`} className="px-4 py-3 text-center">
                                {noteDetail ? noteDetail.note : '00'}
                              </TableCell>
                            );
                          })}
                          <TableCell className="px-4 py-3 text-center font-semibold">{matiereDetail.moyenneMatiere.toFixed(2)}</TableCell>
                          <TableCell className="px-4 py-3 text-left italic text-gray-600">{matiereDetail.appreciation || '-'}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-blue-50 font-bold">
                        <TableCell colSpan={2} className="px-4 py-3 text-right text-base">Moyenne Générale</TableCell>
                        <TableCell colSpan={dynamicEvaluationHeaders.length + 1} className="px-4 py-3 text-center text-blue-700 text-lg">
                          {selectedReport.avg}/20
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center text-lg">{selectedReport.rank}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-8 space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Commentaire du Professeur Principal:</h3>
                    <p className="p-4 bg-gray-50 border border-gray-200 rounded-md text-gray-700 italic">
                      {selectedReport.teacherComment}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Commentaire du Directeur:</h3>
                    <p className="p-4 bg-gray-50 border border-gray-200 rounded-md text-gray-700 italic">
                      {selectedReport.principalComment}
                    </p>
                  </div>
                </div>

                <div className="mt-10 text-right text-gray-600 text-sm">
                  <p>Fait à Nouakchott, le {new Date().toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Button variant="outline" onClick={exportReport}>
              <FileDown className="h-4 w-4 mr-2" /> Exporter en PDF
            </Button>
            <Button onClick={printReport}>
              <Printer className="h-4 w-4 mr-2" /> Imprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}