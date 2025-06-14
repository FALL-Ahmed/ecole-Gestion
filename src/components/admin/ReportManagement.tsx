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
  matiere?: Matiere;
  classe_id: number;
  professeur_id: number;
  type: 'Devoir' | 'Composition';
  date_eval: string;
  trimestre: number;
  libelle: string;
  annee_scolaire_id: number;
}

interface Note {
  id: number;
  evaluation: { id: number; matiere?: Matiere };
  etudiant: { id: number; nom?: string; prenom?: string };
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
  absences?: number;
  totalElevesClasse?: number;
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
      matiere_id: cc.matiere?.id || cc.matiere_id,
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

    const transformedEvaluations = data.map((evalItem: any) => ({
      id: evalItem.id,
      matiere_id: evalItem.matiere?.id || evalItem.matiere_id,
      matiere: evalItem.matiere,
      classe_id: evalItem.classe_id,
      professeur_id: evalItem.professeur_id,
      type: evalItem.type.toLowerCase().includes('devoir') ? 'Devoir' : 'Composition',
      date_eval: evalItem.date_eval,
      trimestre: evalItem.trimestre,
      annee_scolaire_id: evalItem.annee_scolaire_id,
      libelle: evalItem.type
    }));

    return transformedEvaluations;
  } catch (error) {
    console.error(`Error fetching evaluations for class ${classeId}, trimestre ID ${trimestreId}, year ${anneeScolaireId}:`, error);
    toast({ title: "Erreur de chargement", description: "Impossible de charger les évaluations pour le trimestre.", variant: "destructive" });
    return [];
  }
};

const fetchNotesForEvaluations = async (evaluationIds: number[], etudiantId?: number): Promise<Note[]> => {
  if (evaluationIds.length === 0) return [];
  let url = `${API_BASE_URL}/notes?evaluationIds=${evaluationIds.join(',')}`;
  if (etudiantId) {
    url += `&etudiant_id=${etudiantId}`;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404 || response.status === 204) return [];
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching notes for evaluations ${evaluationIds}${etudiantId ? ` and student ${etudiantId}` : ''}:`, error);
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
      setIsLoading(true);
      fetchTrimestresByAnneeAcademique(anneeId).then((trimestresData) => {
        setTrimestres(trimestresData);
        if (!trimestresData.some(t => t.id.toString() === selectedTermId)) {
            setSelectedTermId('');
        }
      }).catch(error => {
          console.error("Failed to load trimestres:", error);
          setTrimestres([]);
          setSelectedTermId('');
      });

      fetchClasses(anneeId).then((classesData) => {
        setClasses(classesData);
        setSelectedClassId('');
      }).catch(error => {
          console.error("Failed to load classes:", error);
          setClasses([]);
          setSelectedClassId('');
      }).finally(() => setIsLoading(false));
    } else {
      setClasses([]);
      setTrimestres([]);
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
  }, [selectedAnneeAcademiqueId]);

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

  useEffect(() => {
    const classIdNum = parseInt(selectedClassId);
    const anneeAcademiqueIdNum = parseInt(selectedAnneeAcademiqueId);
    const trimestreIdNum = parseInt(selectedTermId);

    if (classIdNum && anneeAcademiqueIdNum && trimestreIdNum) {
      setIsLoading(true);
      fetchEvaluationsForClassAndTerm(classIdNum, trimestreIdNum, anneeAcademiqueIdNum)
        .then(async (evaluationsData) => {
          setAllEvaluations(evaluationsData);

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

  useEffect(() => {
    const canGenerateBulletins = eleves.length > 0 && matieres.length > 0 && coefficients.length > 0 &&
                                 selectedClassId && selectedTermId && selectedAnneeAcademiqueId;

    if (canGenerateBulletins) {
      const generatedBulletins: BulletinEleve[] = eleves.map(eleve => {
        const bulletinMatiereDetails: MatiereDetailBulletin[] = matieres.map(matiere => {
          const coefficient = coefficients.find(c => c.matiere_id === matiere.id)?.coefficient || 1;

          const evaluationsForMatiere = allEvaluations.filter(e => e.matiere_id === matiere.id);

          const eleveNotesForMatiere = allNotes.filter(note =>
            note.etudiant.id === eleve.id &&
            evaluationsForMatiere.some(evalItem => evalItem.id === note.evaluation.id)
          );

          const notesEvaluations: EvaluationDetailBulletin[] = [];
          let totalPointsDevoirs = 0;
          let countDevoirs = 0;
          let compositionNoteValue: number | null = null;

          dynamicEvaluationHeaders.forEach(headerLibelle => {
            const evalItemForHeader = evaluationsForMatiere.find(e => e.libelle === headerLibelle);
            const note = eleveNotesForMatiere.find(n => n.evaluation.id === evalItemForHeader?.id);
            const noteValue = note ? note.note : 0;

            notesEvaluations.push({
              id: evalItemForHeader?.id || 0,
              type: evalItemForHeader?.type || (headerLibelle.toLowerCase().includes('compo') ? 'Composition' : 'Devoir'),
              libelle: headerLibelle,
              note: note ? note.note : '00',
            });

            if (evalItemForHeader?.type === 'Devoir') {
              totalPointsDevoirs += noteValue;
              countDevoirs++;
            } else if (evalItemForHeader?.type === 'Composition') {
              compositionNoteValue = noteValue;
            }
          });

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

          const appreciation = "";

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

        // Ajout des informations supplémentaires pour le bulletin
        return {
          id: eleve.id,
          name: `${eleve.prenom} ${eleve.nom}`,
          avg: parseFloat(overallAvg.toFixed(2)).toString(),
          rank: '',
          teacherComment: "Ce commentaire est une appréciation générale du professeur principal. Il doit être récupéré de l'API.",
          principalComment: "Ce commentaire est une appréciation du directeur. Il doit être récupéré de l'API.",
          notesParMatiere: bulletinMatiereDetails,
          absences: 0, // À remplacer par les données réelles
          totalElevesClasse: eleves.length,
        };
      });

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
  };

  const exportReport = () => {
    if (!selectedReport) return;
    toast({
      title: "Export en PDF",
      description: `Le bulletin de ${selectedReport?.name} est en cours d'exportation en PDF.`,
    });
    setPreviewOpen(false);
  };

  const printReport = () => {
    if (!selectedReport) return;
    toast({
      title: "Impression",
      description: `Le bulletin de ${selectedReport?.name} est envoyé à l'imprimante.`,
    });
    window.print();
    setPreviewOpen(false);
  };

  const filteredBulletins = bulletins.filter(bulletin =>
    bulletin.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isFormComplete = selectedAnneeAcademiqueId && selectedClassId && selectedTermId;

  // Fonction pour déterminer la mention en fonction de la moyenne
  const getMention = (moyenne: number): string => {
    if (moyenne >= 16) return "Félicitations";
    if (moyenne >= 14) return "Très Bien";
    if (moyenne >= 12) return "Bien";
    if (moyenne >= 10) return "Assez Bien";
    if (moyenne >= 8) return "Encouragements";
    return "Avertissement";
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-6 border-b pb-4">Gestion des Bulletins Scolaires</h1>

      <Card className="mb-8 shadow-lg rounded-lg">
        <CardHeader className="bg-blue-600 text-white rounded-t-lg p-4">
          <CardTitle className="text-2xl font-bold">Sélection des Critères</CardTitle>
          <CardDescription className="text-blue-100">Choisissez l'année scolaire, la classe et le trimestre pour générer les bulletins.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label htmlFor="annee-select" className="text-sm font-medium text-gray-700">Année Scolaire</label>
              <Select onValueChange={setSelectedAnneeAcademiqueId} value={selectedAnneeAcademiqueId}>
                <SelectTrigger id="annee-select" className="border-gray-300 focus:border-blue-500 rounded-md">
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
                <SelectTrigger className="border-gray-300 focus:border-blue-500 rounded-md">
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
                disabled={!selectedAnneeAcademiqueId || trimestres.length === 0}
              >
                <SelectTrigger className="border-gray-300 focus:border-blue-500 rounded-md">
                  <SelectValue placeholder="Sélectionner un trimestre" />
                </SelectTrigger>
                <SelectContent>
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
              className="bg-green-600 hover:bg-green-700 text-white shadow-md px-6 py-3 text-base rounded-md"
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

          <Card className="shadow-lg rounded-lg">
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
                                className="text-blue-600 hover:bg-blue-50 rounded-md"
                              >
                                <Eye className="h-4 w-4 mr-1" /> Prévisualiser
                              </Button>
                              <Button variant="outline" size="sm" onClick={exportReport} className="text-purple-600 hover:bg-purple-50 rounded-md">
                                <FileDown className="h-4 w-4 mr-1" /> PDF
                              </Button>
                              <Button variant="outline" size="sm" onClick={printReport} className="text-red-600 hover:bg-red-50 rounded-md">
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
       

<DialogContent className="max-w-6xl overflow-y-auto max-h-[95vh] p-0 rounded-lg">
  <div className="bg-white p-8">
    {/* En-tête administratif */}
    <div className="grid grid-cols-3 gap-4 mb-8 text-xs">
      <div className="text-left">
        <p>République Islamique de Mauritanie</p>
        <p>Ministère de l'Éducation Nationale</p>
        <p>Direction des Examens et Concours</p>
      </div>
      <div className="text-center">
        <h2 className="text-3xl font-bold text-blue-800 mb-1">BULLETIN DE NOTES</h2>
        <p className="text-lg font-semibold">
          Année Scolaire: <span className="text-blue-700">
            {anneesAcademiques.find(a => a.id === parseInt(selectedAnneeAcademiqueId))?.libelle}
          </span>
        </p>
        <p className="text-lg font-semibold">
          Trimestre: <span className="text-blue-700">
            {trimestres.find(t => t.id === parseInt(selectedTermId))?.nom}
          </span>
        </p>
      </div>
      <div className="text-right text-xs" dir="rtl">
        <p>الجمهورية الإسلامية الموريتانية</p>
        <p>وزارة التهذيب الوطني</p>
        <p>مديرية الامتحانات والمباريات</p>
      </div>
    </div>

    {/* Informations élève */}
    {selectedReport && (
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p><span className="font-semibold">Nom de l'établissement:</span> <span className="font-bold text-blue-600">École Sources des Sciences</span></p>
            <p><span className="font-semibold">Nom de l'élève:</span> <span className="font-bold text-blue-600">{selectedReport.name}</span></p>
            <p><span className="font-semibold">Matricule:</span> <span className="font-mono">123456</span></p>
          </div>
          <div>
            <p><span className="font-semibold">Classe:</span> <span className="font-bold text-blue-600">{classes.find(c => c.id === parseInt(selectedClassId))?.nom}</span></p>
            <p><span className="font-semibold">Nombre d'élèves:</span> <span>{selectedReport.totalElevesClasse}</span></p>
            <p><span className="font-semibold">Absences:</span> <span>{selectedReport.absences} heures</span></p>
          </div>
        </div>
        <div className="border-t border-b border-gray-300 py-2 text-right text-sm">
          <span className="font-semibold">Date d'édition:</span> {new Date().toLocaleDateString('fr-FR')}
        </div>
      </div>
    )}

    {/* Tableau des notes */}
    <div className="mb-8 overflow-x-auto">
      <Table className="w-full border border-gray-300">
        <TableHeader className="bg-blue-100">
          <TableRow>
            <TableHead className="border border-gray-300 px-3 py-2 text-left font-bold min-w-[180px]">Matière</TableHead>
            <TableHead className="border border-gray-300 px-2 py-2 text-center font-bold w-16">Coeff</TableHead>
            {dynamicEvaluationHeaders.map((header) => (
              <TableHead key={header} className="border border-gray-300 px-2 py-2 text-center font-bold whitespace-nowrap">
                {header}
              </TableHead>
            ))}
            <TableHead className="border border-gray-300 px-3 py-2 text-center font-bold">Moy. Matière</TableHead>
            <TableHead className="border border-gray-300 px-3 py-2 text-left font-bold min-w-[180px]">Observation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {selectedReport?.notesParMatiere.map((matiere) => (
            <TableRow key={matiere.matiere} className="hover:bg-gray-50">
              <TableCell className="border border-gray-300 px-3 py-2 font-medium">{matiere.matiere}</TableCell>
              <TableCell className="border border-gray-300 px-2 py-2 text-center">{matiere.coefficient}</TableCell>
              {dynamicEvaluationHeaders.map((header) => {
                const note = matiere.notesEvaluations.find(n => n.libelle === header);
                return (
                  <TableCell key={header} className="border border-gray-300 px-2 py-2 text-center">
                    {note ? note.note : '00'}
                  </TableCell>
                );
              })}
              <TableCell className="border border-gray-300 px-3 py-2 text-center font-bold">
                {matiere.moyenneMatiere.toFixed(2)}
              </TableCell>
              <TableCell className="border border-gray-300 px-3 py-2 italic">
                {matiere.appreciation || '-'}
              </TableCell>
            </TableRow>
          ))}
          
          {/* Ligne des totaux */}
          {selectedReport && (
            <TableRow className="bg-gray-50">
              <TableCell className="border border-gray-300 px-3 py-2 font-bold" colSpan={2}>
                Totaux
              </TableCell>
              <TableCell className="border border-gray-300 px-2 py-2 text-center font-bold" colSpan={dynamicEvaluationHeaders.length}>
                {/* Espace vide pour les colonnes des notes */}
              </TableCell>
              <TableCell className="border border-gray-300 px-3 py-2 text-center font-bold text-blue-700">
                {selectedReport.avg}/20
              </TableCell>
              <TableCell className="border border-gray-300 px-3 py-2">
                {/* Espace vide pour les observations */}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>

    {/* Résumé et mentions */}
    {selectedReport && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          <h3 className="font-bold mb-2">Appréciation du Conseil de Classe:</h3>
          <p className="italic">{selectedReport.teacherComment}</p>
          <p className="text-right mt-4 text-sm">Signature du Professeur Principal</p>
        </div>
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          <h3 className="font-bold mb-2">Observations du Directeur:</h3>
          <p className="italic">{selectedReport.principalComment}</p>
          <p className="text-right mt-4 text-sm">Signature du Directeur</p>
        </div>
      </div>
    )}

    {/* Résultats finaux */}
    {selectedReport && (
      <div className="border border-gray-300 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="font-semibold">Moyenne Générale</p>
            <p className="text-xl font-bold text-blue-700">{selectedReport.avg}/20</p>
          </div>
          <div>
            <p className="font-semibold">Classement</p>
            <p className="text-xl font-bold">{selectedReport.rank}</p>
          </div>
          <div>
            <p className="font-semibold">Mention</p>
            <p className="text-xl font-bold">
              {getMention(parseFloat(selectedReport.avg))}
            </p>
          </div>
          <div>
            <p className="font-semibold">Décision du Conseil</p>
            <p className="text-xl font-bold">
              {parseFloat(selectedReport.avg) >= 10 ? "Admis(e)" : "Non Admis(e)"}
            </p>
          </div>
        </div>
      </div>
    )}

    {/* Pied de page */}
    <div className="text-center text-xs text-gray-500 mt-8">
      <p>Date d'édition: {new Date().toLocaleDateString('fr-FR')}</p>
      <p className="mt-2">Cachet et Signature de l'Administration</p>
      <p className="mt-4">École Sources des Sciences - BP 1234 Nouakchott - Tél: 00 00 00 00</p>
    </div>
  </div>

  {/* Boutons d'action */}
  <div className="bg-gray-100 px-6 py-4 flex justify-end gap-4 rounded-b-lg">
    <Button variant="outline" onClick={() => setPreviewOpen(false)}>
      Fermer
    </Button>
    <Button onClick={exportReport} className="bg-green-600 hover:bg-green-700">
      <FileDown className="mr-2 h-4 w-4" /> Exporter en PDF
    </Button>
    <Button onClick={printReport} className="bg-blue-600 hover:bg-blue-700">
      <Printer className="mr-2 h-4 w-4" /> Imprimer
    </Button>
  </div>
</DialogContent>
</Dialog>
    </div>
  );
}